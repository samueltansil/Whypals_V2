import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { sendPasswordResetEmail, sendParentVerificationEmail } from "./email";
import { 
  insertVideoSchema, 
  updateVideoSchema, 
  insertStorySchema, 
  updateStorySchema, 
  insertStoryGameSchema, 
  updateStoryGameSchema, 
  insertCourseworkItemSchema, 
  updateCourseworkItemSchema,
  insertBannerSchema,
  insertQuestionSchema,
  updateQuestionSchema,
  type InsertVideo, 
  type InsertStory, 
  type InsertStoryGame, 
  type InsertCourseworkItem,
  type InsertBanner
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { listVideos, getVideoSignedUrl, getImageUploadUrl, getImageSignedUrl, uploadImageToR2, uploadFileToR2, getFileFromR2 } from "./r2";
import multer from "multer";

const BCRYPT_ROUNDS = 12;
const PRIVACY_POLICY_VERSION = "2026-01-04";

const MURF_API_KEY = process.env.MURF_API_KEY;
const MURF_VOICE_ID = process.env.MURF_VOICE_ID || "en-US-natalie";

// --- Shared audio pre-generation (used by the manual admin button AND
// automatic background generation on publish) ---

// Mirrors the paragraph-splitting logic in client/src/pages/story.tsx and
// client/src/pages/admin-stories.tsx so the same text hashes match the cache.
const AUDIO_IMAGE_TAG_REGEX = /\[IMAGE:([^\]|]+)(?:\|([^\]]*))?\]/g;
const AUDIO_FULL_IMAGE_TAG_REGEX = /^\[IMAGE:([^\]|]+)(?:\|([^\]]*))?\]$/;

function getAudioTextParagraphs(content: string): string[] {
  const rawParagraphs = content.split('\n\n');
  const textParagraphs: string[] = [];
  for (const p of rawParagraphs) {
    if (AUDIO_FULL_IMAGE_TAG_REGEX.test(p.trim())) continue;
    const cleaned = p.replace(AUDIO_IMAGE_TAG_REGEX, '').trim();
    if (cleaned.length > 0) textParagraphs.push(cleaned);
  }
  return textParagraphs;
}

// Generates (or re-generates) and caches audio + word-timing JSON in R2 for
// a single piece of text. Throws on failure — callers decide how to handle it.
async function generateAndCacheAudio(text: string): Promise<{ audioUrl: string; jsonUrl: string }> {
  if (!MURF_API_KEY) {
    throw new Error("Murf API key not configured");
  }

  const hash = createHash('md5').update(text).digest('hex');
  const audioKey = `tts/${hash}.mp3`;
  const jsonKey = `tts/${hash}.json`;

  const timestampsResponse = await fetch(`https://api.murf.ai/v1/speech/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': MURF_API_KEY,
    },
    body: JSON.stringify({
      text,
      voiceId: MURF_VOICE_ID,
      format: 'MP3',
      encodeAsBase64: true,
      rate: -25, // Very slow speed for kids
    }),
  });

  if (!timestampsResponse.ok) {
    const errorText = await timestampsResponse.text();
    let errorMessage = "Failed to generate speech from Murf AI";
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.errorMessage) errorMessage = errorJson.errorMessage;
    } catch (e) {
      // keep default message
    }
    throw new Error(errorMessage);
  }

  const data = await timestampsResponse.json();
  const wordDurations = data.wordDurations || [];
  const words = wordDurations.map((w: any) => ({
    word: w.word,
    start: w.startMs / 1000,
    end: w.endMs / 1000,
  }));

  const duration = data.audioLengthInSeconds || (words.length > 0 ? words[words.length - 1].end : 0);
  const metadata = { words, duration, hasWordTiming: words.length > 0, text };

  if (!data.encodedAudio) {
    throw new Error("No audio data received from Murf AI");
  }

  const audioBuffer = Buffer.from(data.encodedAudio, 'base64');
  const jsonBuffer = Buffer.from(JSON.stringify(metadata));

  await uploadFileToR2(audioBuffer, audioKey, 'audio/mpeg');
  await uploadFileToR2(jsonBuffer, jsonKey, 'application/json');

  return {
    audioUrl: `/api/text-to-speech/audio/${hash}`,
    jsonUrl: `/api/text-to-speech/json/${hash}`,
  };
}

// Fire-and-forget: pre-generates audio for every paragraph of a story in the
// background (small concurrency to avoid hammering the Murf API), so a story
// going live doesn't block on a minute of sequential TTS calls. Publishing
// the story is never delayed or failed by this — errors are just logged.
function preGenerateStoryAudioInBackground(storyId: number, content: string) {
  if (!MURF_API_KEY) {
    console.warn(`[audio] Skipping auto audio generation for story ${storyId}: MURF_API_KEY not configured`);
    return;
  }

  const paragraphs = getAudioTextParagraphs(content);
  if (paragraphs.length === 0) return;

  console.log(`[audio] Auto-generating audio for story ${storyId} (${paragraphs.length} paragraphs)...`);

  const CONCURRENCY = 3;
  let nextIndex = 0;
  let failures = 0;

  async function worker() {
    while (nextIndex < paragraphs.length) {
      const i = nextIndex++;
      try {
        await generateAndCacheAudio(paragraphs[i]);
      } catch (err: any) {
        failures++;
        console.error(`[audio] Story ${storyId} paragraph ${i + 1} failed:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, paragraphs.length) }, () => worker());
  Promise.all(workers).then(() => {
    const ok = paragraphs.length - failures;
    console.log(`[audio] Story ${storyId} audio generation finished: ${ok}/${paragraphs.length} paragraphs cached.`);
  });
}

// --- Auto-generate one game per newly-published story ---
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const UNSPLASH_ACCESS_KEY_FOR_GAMES = process.env.UNSPLASH_ACCESS_KEY;
const AUTO_GAME_TYPES = ["quiz", "timeline", "poll", "puzzle", "fillblank", "truefalse", "scramble", "guessnumber", "oddoneout", "emojidecoder"] as const;

async function findGameImage(searchTerm: string): Promise<string | null> {
  if (!UNSPLASH_ACCESS_KEY_FOR_GAMES) return null;
  const query = encodeURIComponent(searchTerm);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=3&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY_FOR_GAMES}` } }
  );
  if (!res.ok) return null;
  const data: any = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;
  return `${photo.urls.raw}&w=1200&q=85&fit=max&auto=format`;
}

async function planGameForStory(story: { title: string; category: string[]; content: string }): Promise<any> {
  const truncatedContent = story.content.length > 4000
    ? story.content.slice(0, 4000) + "..."
    : story.content;

  const prompt = `You help design mini-games for a kids' educational news platform called WhyPals (readers are ages 7-12). You'll be given one published story. Read it and decide which ONE of these 10 game types best fits its content, then generate the actual game content for that type.

Game types and when each fits well:
- "quiz": the story has clear facts a reader could be asked comprehension questions about. Needs 4-5 multiple choice questions.
- "timeline": the story describes a sequence, process, or order of events (how something happens/happened step by step, or a history). Needs 4-6 events in their correct chronological/logical order.
- "poll": the story has a fun, opinion-based angle with no single right answer (e.g. "which of these would you rather..."). Needs 2-3 questions, each with 3-4 options.
- "puzzle": the story is strongly visual/atmospheric without a clean set of quizzable facts. This just reuses the story's photo as a sliding puzzle, so pick this when nothing else fits well.
- "fillblank": the story has strong individual sentences you could blank out a key word from to test close reading. Needs 4-5 sentences pulled/adapted from the story, each with one word replaced by "___", plus multiple choice options for the missing word.
- "truefalse": the story has several standalone, clearly true or false factual claims you could quiz rapid-fire. Needs 6-8 short true/false statements.
- "scramble": the story has ONE especially strong, concrete, visually-recognizable noun (an animal, place, or object — not an abstract concept) that would make a fun "guess the picture" word puzzle. Needs just that one word plus a short kid-friendly clue.
- "guessnumber": the story has ONE striking, guessable numeric fact (a count, speed, size, distance, age, etc). Needs the question, the exact numeric answer, and an optional unit.
- "oddoneout": the story has enough real facts that you can write 4-statement rounds where 3 are true and 1 is a plausible-sounding made-up fact. Needs 3-5 rounds, each with exactly 4 statements and which index is the fake one.
- "emojidecoder": the story has concrete, visual nouns/concepts that can be represented as a short emoji sequence for the reader to guess. Needs 4-6 rounds, each an emoji clue plus 4 multiple choice options.

Story title: ${story.title}
Story category: ${story.category.join(", ")}
Story content:
${truncatedContent}

Respond with ONLY valid JSON, no markdown fences, matching this exact shape (include ONLY the one config key that matches your chosen gameType — omit the other config keys entirely):
{
  "gameType": "quiz" | "timeline" | "poll" | "puzzle" | "fillblank" | "truefalse" | "scramble" | "guessnumber" | "oddoneout" | "emojidecoder",
  "title": "a short, fun game title, e.g. 'Ocean Wave Quiz'",
  "description": "one upbeat sentence describing the game, aimed at a kid",
  "funFacts": "one or two extra fun facts related to the story, kid-friendly",
  "howToPlay": "one short sentence explaining how to play",
  "quizConfig": {
    "questions": [
      { "id": "q1", "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." }
    ],
    "passingScore": 3,
    "winMessage": "..."
  },
  "timelineConfig": {
    "events": [
      { "id": "e1", "title": "...", "description": "...", "order": 1 }
    ],
    "winMessage": "..."
  },
  "pollConfig": {
    "questions": [
      { "id": "pq1", "question": "...", "options": ["...", "...", "..."] }
    ],
    "winMessage": "..."
  },
  "puzzleConfig": {
    "gridSize": 3,
    "hintText": "...",
    "winMessage": "..."
  },
  "fillblankConfig": {
    "blanks": [
      { "id": "b1", "sentence": "Seahorses live in ___ water.", "options": ["salt", "fresh", "boiling", "frozen"], "correctIndex": 0, "explanation": "..." }
    ],
    "winMessage": "..."
  },
  "truefalseConfig": {
    "statements": [
      { "id": "s1", "statement": "...", "isTrue": true, "explanation": "..." }
    ],
    "secondsPerStatement": 8,
    "winMessage": "..."
  },
  "scrambleConfig": {
    "word": "SEAHORSE",
    "imageSearchTerm": "seahorse underwater",
    "clue": "This ocean animal's dads carry the babies!",
    "winMessage": "..."
  },
  "guessnumberConfig": {
    "question": "How many times per second can a woodpecker peck?",
    "answer": 20,
    "unit": "pecks per second",
    "maxGuesses": 6,
    "funFactAfter": "...",
    "winMessage": "..."
  },
  "oddoneoutConfig": {
    "rounds": [
      { "id": "r1", "statements": ["...", "...", "...", "..."], "fakeIndex": 2, "explanation": "..." }
    ],
    "winMessage": "..."
  },
  "emojidecoderConfig": {
    "rounds": [
      { "id": "r1", "emojiClue": "🦔🌰❄️", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." }
    ],
    "winMessage": "..."
  }
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(jsonText);
}

async function buildGameConfig(plan: any, story: { thumbnail: string }): Promise<any> {
  switch (plan.gameType) {
    case "quiz":
      return plan.quizConfig;
    case "timeline":
      return plan.timelineConfig;
    case "poll":
      return plan.pollConfig;
    case "puzzle":
      return {
        imageUrl: story.thumbnail,
        gridSize: plan.puzzleConfig?.gridSize && [3, 4].includes(plan.puzzleConfig.gridSize)
          ? plan.puzzleConfig.gridSize
          : 3,
        hintText: plan.puzzleConfig?.hintText || "",
        winMessage: plan.puzzleConfig?.winMessage || "Puzzle Complete!",
      };
    case "fillblank":
      return plan.fillblankConfig;
    case "truefalse":
      return plan.truefalseConfig;
    case "scramble": {
      const word = (plan.scrambleConfig?.word || "").toString().trim();
      const searchTerm = plan.scrambleConfig?.imageSearchTerm || word;
      const imageUrl = word ? await findGameImage(searchTerm) : null;
      if (!imageUrl) throw new Error("Could not find an image for the scramble word");
      return {
        imageUrl,
        word,
        clue: plan.scrambleConfig?.clue || "",
        winMessage: plan.scrambleConfig?.winMessage || "You got it!",
      };
    }
    case "guessnumber":
      return plan.guessnumberConfig;
    case "oddoneout":
      return plan.oddoneoutConfig;
    case "emojidecoder":
      return plan.emojidecoderConfig;
    default:
      throw new Error(`Unrecognized gameType from Claude: "${plan.gameType}"`);
  }
}

function validateGameConfig(gameType: string, config: any): void {
  if (!config || typeof config !== "object") throw new Error("Missing config object");
  switch (gameType) {
    case "quiz":
      if (!Array.isArray(config.questions) || config.questions.length === 0) {
        throw new Error("quiz config missing questions");
      }
      break;
    case "timeline":
      if (!Array.isArray(config.events) || config.events.length === 0) {
        throw new Error("timeline config missing events");
      }
      break;
    case "poll":
      if (!Array.isArray(config.questions) || config.questions.length === 0) {
        throw new Error("poll config missing questions");
      }
      break;
    case "puzzle":
      if (!config.imageUrl) throw new Error("puzzle config missing imageUrl");
      break;
    case "fillblank":
      if (!Array.isArray(config.blanks) || config.blanks.length === 0) {
        throw new Error("fillblank config missing blanks");
      }
      break;
    case "truefalse":
      if (!Array.isArray(config.statements) || config.statements.length === 0) {
        throw new Error("truefalse config missing statements");
      }
      break;
    case "scramble":
      if (!config.imageUrl || !config.word) throw new Error("scramble config missing imageUrl or word");
      break;
    case "guessnumber":
      if (!config.question || typeof config.answer !== "number") {
        throw new Error("guessnumber config missing question or answer");
      }
      break;
    case "oddoneout":
      if (!Array.isArray(config.rounds) || config.rounds.length === 0) {
        throw new Error("oddoneout config missing rounds");
      }
      break;
    case "emojidecoder":
      if (!Array.isArray(config.rounds) || config.rounds.length === 0) {
        throw new Error("emojidecoder config missing rounds");
      }
      break;
  }
}

function generateGameForStoryInBackground(story: { id: number; title: string; category: string[]; content: string; thumbnail: string }) {
  if (!ANTHROPIC_API_KEY) {
    console.warn(`[game] Skipping auto game generation for story ${story.id}: ANTHROPIC_API_KEY not configured`);
    return;
  }

  (async () => {
    try {
      const existingGames = await storage.getGamesByStoryTitle(story.title);
      if (existingGames.length > 0) {
        console.log(`[game] Story ${story.id} ("${story.title}") already has a game — skipping auto-generation.`);
        return;
      }

      console.log(`[game] Auto-generating a game for story ${story.id} ("${story.title}")...`);
      const plan = await planGameForStory(story);
      const config = await buildGameConfig(plan, story);
      validateGameConfig(plan.gameType, config);

      const settings = await storage.getAutomationSettings();

      let game = await storage.createGame({
        gameType: plan.gameType,
        title: plan.title,
        description: plan.description || "",
        thumbnail: story.thumbnail || null,
        funFacts: plan.funFacts || "",
        howToPlay: plan.howToPlay || "",
        linkedStoryTitle: story.title,
        pointsReward: 10,
        config,
        category: story.category,
        soundEffectsEnabled: true,
        isActive: settings.autoPublishEnabled,
        isFeatured: false,
      } as InsertStoryGame);

      if (settings.autoPublishEnabled) {
        game = await storage.autoFeatureGame(game.id);
        console.log(`[game] Story ${story.id}: created game #${game.id} "${plan.title}" (${plan.gameType}) — live & featured.`);
      } else {
        console.log(`[game] Story ${story.id}: created game #${game.id} "${plan.title}" (${plan.gameType}) — inactive, review in /admin/games.`);
      }
    } catch (err: any) {
      console.error(`[game] Auto game generation failed for story ${story.id}:`, err.message);
    }
  })();
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
let timestampsEndpointAvailable = true;
let timestampsLastChecked = 0;
const TIMESTAMPS_RETRY_INTERVAL = 5 * 60 * 1000; // Retry timestamps endpoint every 5 minutes

const adminSessions = new Map<string, { expiresAt: number }>();
const ADMIN_SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

function generateAdminToken(): string {
  return randomBytes(32).toString('hex');
}

async function isValidAdminSession(req: any): Promise<boolean> {
  console.log('[AuthDebug] isValidAdminSession called');
  // If we have an active user session, check if they are an admin
  if (req.session?.userId) {
    console.log('[AuthDebug] User session found:', req.session.userId);
    try {
      const user = await storage.getUser(req.session.userId);
      const ALLOWED_ADMIN_EMAILS = ["samueljuliustansil@gmail.com", "admin@whypals.com", "meixiu.low@gmail.com"];
      if (user) {
         console.log('[AuthDebug] User found:', user.email);
         if (user.email && ALLOWED_ADMIN_EMAILS.includes(user.email)) {
           console.log('[AuthDebug] User is admin');
           return true;
         } else {
           console.log('[AuthDebug] User is NOT admin');
         }
      } else {
        console.log('[AuthDebug] User not found in DB');
      }
    } catch (e) {
      console.error("Error verifying admin user session:", e);
    }
  } else {
    console.log('[AuthDebug] No user session found');
  }

  // Fallback to token-based auth (for backward compatibility or if session is missing but cookie exists)
  // Note: This is fragile if server restarts, so session-based is preferred.
  const token = req.headers['x-admin-token'] || req.cookies?.adminToken;
  console.log('[AuthDebug] Checking admin session. Token present:', !!token);
  
  if (!token) {
    // console.log('[AuthDebug] No admin token found in headers or cookies');
    return false;
  }
  
  const session = adminSessions.get(token);
  console.log('[AuthDebug] Token:', token.substring(0, 10) + '...', 'Session found:', !!session);
  
  if (!session) {
    console.log('[AuthDebug] Session not found in memory map');
    return false;
  }
  
  if (Date.now() > session.expiresAt) {
    console.log('[AuthDebug] Session expired');
    adminSessions.delete(token);
    return false;
  }
  
  return true;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get user ID from session (email/password auth)
function getUserIdFromRequest(req: any): string | null {
  if (req.session?.userId) {
    return req.session.userId;
  }
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/admin/login', async (req: any, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      if (password === ADMIN_PASSWORD) {
        const token = generateAdminToken();
        adminSessions.set(token, { expiresAt: Date.now() + ADMIN_SESSION_EXPIRY });
        
        res.cookie('adminToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: ADMIN_SESSION_EXPIRY,
          path: '/'
        });

        return res.json({ success: true, token });
      }
      return res.status(401).json({ message: "Invalid password" });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/admin/session', async (req: any, res) => {
    if (await isValidAdminSession(req)) {
      return res.json({ valid: true });
    }
    return res.status(401).json({ valid: false, message: "Session expired or invalid" });
  });

  // Admin: Teacher verification endpoints disabled
  app.get('/api/admin/teacher-verifications', async (req: any, res) => {
    if (!await isValidAdminSession(req)) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    return res.status(200).json([]);
  });

  app.post('/api/admin/teacher-verifications/:userId', async (req: any, res) => {
    if (!await isValidAdminSession(req)) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    return res.status(400).json({ message: "Teacher verification is disabled" });
  });

  // Email/Password Auth Endpoints
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      // If user doesn't exist, we still return success to prevent enumeration
      if (!user) {
        return res.json({ message: "If an account with that email exists, we have sent a password reset link." });
      }

      // Generate token
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Invalidate existing tokens
      await storage.deletePasswordResetTokensByUserId(user.id);

      // Store new token
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Send email
      if (user.email) {
          const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
          await sendPasswordResetEmail(user.email, token, origin);
      }

      res.json({ message: "If an account with that email exists, we have sent a password reset link." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const tokenHash = createHash('sha256').update(token).digest('hex');
      const resetToken = await storage.getPasswordResetToken(tokenHash);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(resetToken.id);
        return res.status(400).json({ message: "Token has expired" });
      }

      // Update password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await storage.updateUserPassword(resetToken.userId, passwordHash);

      // Delete token
      await storage.deletePasswordResetToken(resetToken.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const { email, parentEmail, password, confirmPassword, firstName, lastName, agreedToTerms } = req.body;
      
      if (!email || !parentEmail || !password || !confirmPassword) {
        return res.status(400).json({ message: "Email, parent or guardian email, password, and password confirmation are required" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      if (!emailRegex.test(parentEmail)) {
        return res.status(400).json({ message: "Please enter a valid parent or guardian email address" });
      }
      
      if (!agreedToTerms) {
        return res.status(400).json({ message: "You must agree to the Terms of Service and Privacy Policy" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const token = randomBytes(32).toString('hex');
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const codeHash = createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const registrationData = {
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        agreedToTerms: true,
        agreedToTermsAt: new Date(),
      };

      await storage.createParentVerificationRequest({
        parentEmail: parentEmail.toLowerCase(),
        tokenHash,
        codeHash,
        expiresAt,
        privacyVersion: PRIVACY_POLICY_VERSION,
        registrationData,
      });

      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      await sendParentVerificationEmail(parentEmail, code, token, origin);

      res.status(201).json({
        success: true,
        message: "Parent or guardian verification email sent.",
      });
    } catch (error) {
      console.error("Error starting registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/verify-parent', async (req: any, res) => {
    try {
      const { token, code } = req.body as { token?: string; code?: string };

      if (!token && !code) {
        return res.status(400).json({ message: "Verification token or code is required" });
      }

      const now = new Date();

      let request = null;
      if (token) {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        request = await storage.getParentVerificationRequestByTokenHash(tokenHash);
      } else if (code) {
        const codeHash = createHash('sha256').update(code).digest('hex');
        request = await storage.getParentVerificationRequestByCodeHash(codeHash);
      }

      if (!request) {
        return res.status(400).json({ message: "Invalid or expired verification" });
      }

      if (now > request.expiresAt) {
        return res.status(400).json({ message: "Verification has expired" });
      }

      const data = request.registrationData as {
        email: string;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        agreedToTerms: boolean;
        agreedToTermsAt: string | Date | null;
      };

      const existingUser = await storage.getUserByEmail(data.email);
      let user = existingUser;

      if (!user) {
        const agreedAt = data.agreedToTermsAt ? new Date(data.agreedToTermsAt) : new Date();

        user = await storage.upsertUser({
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          userRole: null,
          agreedToTerms: true,
          agreedToTermsAt: agreedAt,
          emailVerified: true,
        });
      }

      await storage.markParentVerificationAsUsed(request.id, now);

      res.json({
        success: true,
        message: "Parent or guardian email verified. You can now log in.",
      });
    } catch (error) {
      console.error("Error verifying parent email:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ message: "Your account has not been approved by email yet. Please ask your parent or guardian to check their email." });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      req.session.userId = user.id;
      req.session.authType = 'email';
      
      req.session.save((err: any) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          success: true, 
          user: { ...user, passwordHash: undefined },
          needsRoleSelection: !user.userRole
        });
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get('/api/auth/logout', async (req: any, res) => {
    try {
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.redirect('/login');
    }
  });

  app.patch('/api/auth/role', async (req: any, res) => {
    return res.status(400).json({ message: "Account roles are no longer supported" });
  });

  app.post('/api/auth/request-verification', async (req: any, res) => {
    return res.status(400).json({ message: "Teacher verification is disabled" });
  });

  app.get('/api/auth/me', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/videos', async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/videos/featured', async (req, res) => {
    try {
      const videos = await storage.getFeaturedVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      res.status(500).json({ message: "Failed to fetch featured videos" });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getVideoById(id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      await storage.incrementVideoViews(id);
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post('/api/videos', isAuthenticated, async (req: any, res) => {
    try {
      const result = insertVideoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }

      const userId = req.session.userId;
      const videoData = result.data as z.infer<typeof insertVideoSchema>;
      const video = await storage.createVideo({
        ...videoData,
        uploadedBy: userId,
      });
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.post('/api/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { plan } = req.body;

      if (!plan || !['basic', 'premium', 'family'].includes(plan)) {
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      const subscription = await storage.createSubscription({
        userId,
        plan,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const updatedUser = await storage.updateUserSubscription(userId, true, plan);

      res.json({ subscription, user: updatedUser });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.delete('/api/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      await storage.cancelSubscription(userId);
      const updatedUser = await storage.updateUserSubscription(userId, false);
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.get('/api/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const subscription = await storage.getUserSubscription(userId);
      res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get('/api/activity/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const activity = await storage.getTodayActivity(userId);
      res.json(activity || { readingTimeSeconds: 0, watchingTimeSeconds: 0, playingTimeSeconds: 0 });
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post('/api/activity/track', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { activityType, seconds } = req.body;
      
      if (!['reading', 'watching', 'playing'].includes(activityType)) {
        return res.status(400).json({ message: "Invalid activity type" });
      }
      if (typeof seconds !== 'number' || seconds < 0) {
        return res.status(400).json({ message: "Invalid seconds value" });
      }
      
      const activity = await storage.addActivityTime(userId, activityType, seconds);
      res.json(activity);
    } catch (error) {
      console.error("Error tracking activity:", error);
      res.status(500).json({ message: "Failed to track activity" });
    }
  });

  app.get('/api/points', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const points = await storage.getUserPoints(userId);
      res.json({ points });
    } catch (error) {
      console.error("Error fetching points:", error);
      res.status(500).json({ message: "Failed to fetch points" });
    }
  });

  app.post('/api/points/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { points } = req.body;
      
      if (typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ message: "Invalid points value" });
      }
      
      const user = await storage.addUserPoints(userId, points);
      res.json({ points: user.points });
    } catch (error) {
      console.error("Error adding points:", error);
      res.status(500).json({ message: "Failed to add points" });
    }
  });

  app.get('/api/r2/videos', isAuthenticated, async (req, res) => {
    try {
      const videos = await listVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error listing R2 videos:", error);
      res.status(500).json({ message: "Failed to list videos from storage" });
    }
  });

  app.get('/api/r2/videos/:key(*)', isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      if (!key) {
        return res.status(400).json({ message: "Video key is required" });
      }
      const signedUrl = await getVideoSignedUrl(key);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error getting video URL:", error);
      res.status(500).json({ message: "Failed to get video URL" });
    }
  });

  app.get('/api/r2/metadata', isAuthenticated, async (req, res) => {
    try {
      const metadata = await storage.getAllR2VideoMetadata();
      res.json(metadata);
    } catch (error) {
      console.error("Error fetching R2 metadata:", error);
      res.status(500).json({ message: "Failed to fetch video metadata" });
    }
  });

  app.get('/api/r2/metadata/:key(*)', isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      const metadata = await storage.getR2VideoMetadataByKey(key);
      res.json(metadata || null);
    } catch (error) {
      console.error("Error fetching R2 metadata:", error);
      res.status(500).json({ message: "Failed to fetch video metadata" });
    }
  });

  app.post('/api/r2/metadata', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { r2Key, title, description, category } = req.body;
      
      if (!r2Key || !title || !category) {
        return res.status(400).json({ message: "r2Key, title, and category are required" });
      }
      
      const metadata = await storage.upsertR2VideoMetadata({
        r2Key,
        title,
        description: description || null,
        category,
      });
      res.json(metadata);
    } catch (error) {
      console.error("Error saving R2 metadata:", error);
      res.status(500).json({ message: "Failed to save video metadata" });
    }
  });

  app.delete('/api/r2/metadata/:key(*)', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const key = req.params.key;
      await storage.deleteR2VideoMetadata(key);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting R2 metadata:", error);
      res.status(500).json({ message: "Failed to delete video metadata" });
    }
  });

  // Story routes - public
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getPublishedStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.get('/api/stories/featured', async (req, res) => {
    try {
      const stories = await storage.getFeaturedStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching featured stories:", error);
      res.status(500).json({ message: "Failed to fetch featured stories" });
    }
  });

  app.get('/api/stories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let story;

      if (isNaN(id)) {
        story = await storage.getStoryBySlug(req.params.id);
      } else {
        story = await storage.getStoryById(id);
      }

      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Increment views
      await storage.incrementStoryViews(story.id);

      res.json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  app.post('/api/stories/:id/view', async (req: any, res) => {
    try {
      const idParam = req.params.id;
      let storyId: number | undefined;
      const idNum = parseInt(idParam);
      if (isNaN(idNum)) {
        const story = await storage.getStoryBySlug(idParam);
        storyId = story?.id;
      } else {
        storyId = idNum;
      }
      if (!storyId) {
        return res.status(404).json({ message: "Story not found" });
      }
      const userId = getUserIdFromRequest(req);
      await storage.addStoryView(storyId, userId ?? undefined);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording story view:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  app.post('/api/stories/:id/read-aloud', async (req: any, res) => {
    try {
      const idParam = req.params.id;
      let storyId: number | undefined;
      const idNum = parseInt(idParam);
      if (isNaN(idNum)) {
        const story = await storage.getStoryBySlug(idParam);
        storyId = story?.id;
      } else {
        storyId = idNum;
      }
      if (!storyId) {
        return res.status(404).json({ message: "Story not found" });
      }
      const userId = getUserIdFromRequest(req);
      await storage.addStoryReaderPlay(storyId, userId ?? undefined);
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording reader play:", error);
      res.status(500).json({ message: "Failed to record reader play" });
    }
  });

  app.get('/api/admin/story-stats', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const excluded = ["samueljuliustansil@gmail.com", "meixiu.low@gmail.com"];
      const stats = await storage.getAllStoryStats(excluded);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching story stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Image upload for story thumbnails - admin only (server-side upload to avoid CORS)
  app.post('/api/admin/upload/image', upload.single('image'), async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { key } = await uploadImageToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'story-thumbnails'
      );
      
      const imageUrl = `/api/images/${key}`;
      res.json({ imageUrl, key });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      const message = error.message?.includes("configured") ? error.message : "Failed to upload image";
      res.status(500).json({ message });
    }
  });

  // Image upload for game images - admin only
  app.post('/api/admin/upload/game-image', upload.single('image'), async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { key } = await uploadImageToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'game-images'
      );
      
      const imageUrl = `/api/images/${key}`;
      res.json({ imageUrl, key });
    } catch (error: any) {
      console.error("Error uploading game image:", error);
      const message = error.message?.includes("configured") ? error.message : "Failed to upload image";
      res.status(500).json({ message });
    }
  });

  // Image upload for story content images - admin only
  app.post('/api/admin/upload/story-content-image', upload.single('image'), async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { key } = await uploadImageToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'story-content'
      );
      
      const imageUrl = `/api/images/${key}`;
      res.json({ imageUrl, key });
    } catch (error: any) {
      console.error("Error uploading story content image:", error);
      const message = error.message?.includes("configured") ? error.message : "Failed to upload image";
      res.status(500).json({ message });
    }
  });

  // Image upload for video thumbnails - admin only
  app.post('/api/admin/upload/video-thumbnail', upload.single('image'), async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { key } = await uploadImageToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'video-thumbnails'
      );
      
      const imageUrl = `/api/images/${key}`;
      res.json({ imageUrl, key });
    } catch (error: any) {
      console.error("Error uploading video thumbnail:", error);
      const message = error.message?.includes("configured") ? error.message : "Failed to upload image";
      res.status(500).json({ message });
    }
  });

  // Image upload for banners - admin only
  app.post('/api/admin/upload/banner', upload.single('image'), async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) return res.status(403).json({ message: "Admin access required" });
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const { key } = await uploadImageToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'banners');
      const imageUrl = `/api/images/${key}`;
      res.json({ imageUrl, key });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload banner image" });
    }
  });

  // Banners CRUD
  app.get('/api/banners', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) return res.status(403).json({ message: "Admin access required" });
      const banners = await storage.getBanners();
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  // Automation settings: on = new games/weekly theme story go live & featured
  // automatically; off = everything drops back to requiring manual review.
  app.get('/api/admin/settings/auto-publish', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const settings = await storage.getAutomationSettings();
      res.json({ enabled: settings.autoPublishEnabled });
    } catch (error) {
      console.error("Error fetching automation settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/admin/settings/auto-publish', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const enabled = !!req.body?.enabled;
      const settings = await storage.setAutoPublishEnabled(enabled);
      res.json({ enabled: settings.autoPublishEnabled });
    } catch (error) {
      console.error("Error updating automation settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get('/api/banners/active', async (req, res) => {
    try {
      const banners = await storage.getActiveBanners();
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active banners" });
    }
  });

  app.post('/api/banners', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) return res.status(403).json({ message: "Admin access required" });
      
      const result = insertBannerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: fromZodError(result.error).message 
        });
      }

      const banner = await storage.insertBanner(result.data as InsertBanner);
      res.json(banner);
    } catch (error) {
      console.error("Error creating banner:", error);
      res.status(500).json({ message: "Failed to create banner" });
    }
  });

  app.delete('/api/banners/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) return res.status(403).json({ message: "Admin access required" });
      const id = parseInt(req.params.id);
      await storage.deleteBanner(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  app.patch('/api/banners/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) return res.status(403).json({ message: "Admin access required" });
      const id = parseInt(req.params.id);
      const banner = await storage.updateBanner(id, req.body);
      res.json(banner);
    } catch (error) {
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  // Allowed image folders for access
  const ALLOWED_IMAGE_FOLDERS = ['story-thumbnails', 'game-images', 'story-content', 'video-thumbnails', 'banners'];

  app.get('/api/images/:key(*)', async (req, res) => {
    try {
      const key = req.params.key;
      const isAllowed = ALLOWED_IMAGE_FOLDERS.some(folder => key.startsWith(`${folder}/`));
      if (!isAllowed) {
        return res.status(403).json({ message: "Access denied" });
      }
      const signedUrl = await getImageSignedUrl(key);
      res.redirect(signedUrl);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  // Story routes - admin only
  app.get('/api/admin/stories', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const stories = await storage.getAllStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching admin stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post('/api/admin/stories', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = insertStorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const storyData = result.data as z.infer<typeof insertStorySchema>;
      const story = await storage.createStory({
        ...storyData,
        authorId: null,
        publishedAt: storyData.isPublished ? new Date() : null,
      });

      // Created already published (e.g. auto-publish flows) -> warm the audio cache in the background.
      if (story.isPublished) {
        preGenerateStoryAudioInBackground(story.id, story.content);
        generateGameForStoryInBackground(story);
      }

      res.status(201).json(story);
    } catch (error) {
      console.error("Error creating story:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  app.put('/api/admin/stories/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getStoryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Story not found" });
      }

      const result = updateStorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const storyUpdateData = result.data as z.infer<typeof updateStorySchema>;
      const updateData: any = { ...storyUpdateData };
      const isNewlyPublished = storyUpdateData.isPublished && !existing.isPublished;
      if (isNewlyPublished) {
        updateData.publishedAt = new Date();
      }

      const story = await storage.updateStory(id, updateData);

      // Story just went live -> warm the audio cache in the background instead
      // of making the admin manually click "Generate Audio" and wait, and
      // auto-generate one linked game (live/featured or draft, per the auto-publish setting).
      if (isNewlyPublished) {
        preGenerateStoryAudioInBackground(story.id, story.content);
        generateGameForStoryInBackground(story);
      }

      res.json(story);
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ message: "Failed to update story" });
    }
  });

  // Marks a story as THE featured story, unfeaturing whichever one held that
  // spot before (still published, just no longer featured). Used by the
  // weekly automation and available for manual use in /admin/stories too.
  app.post('/api/admin/stories/:id/feature', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const existing = await storage.getStoryById(id);
      if (!existing) {
        return res.status(404).json({ message: "Story not found" });
      }
      const story = await storage.featureStoryAndUnfeatureOthers(id);
      res.json(story);
    } catch (error) {
      console.error("Error featuring story:", error);
      res.status(500).json({ message: "Failed to feature story" });
    }
  });

  app.delete('/api/admin/stories/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteStory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ message: "Failed to delete story" });
    }
  });

  // Questions Routes (Big Why)
  app.get('/api/questions/published', async (_req, res) => {
    try {
      const questions = await storage.getPublishedQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching published questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/questions', async (req: any, res) => {
    try {
      const schema = z.object({
        storyId: z.number(),
        question: z.string().min(1),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const userId = req.session?.userId || null;
      const question = await storage.createQuestion({
        storyId: result.data.storyId,
        question: result.data.question,
        userId,
      });
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to submit question" });
    }
  });

  // Admin Question Routes
  app.get('/api/admin/questions', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const questions = await storage.getAllQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching admin questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.patch('/api/admin/questions/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const result = updateQuestionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const question = await storage.updateQuestion(id, result.data);
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.delete('/api/admin/questions/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Admin Video Routes
  app.get('/api/admin/videos', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching admin videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.post('/api/admin/videos', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = insertVideoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const videoData = result.data as z.infer<typeof insertVideoSchema>;
      const video = await storage.createVideo({
        ...videoData,
        uploadedBy: null,
      });
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(500).json({ message: "Failed to create video" });
    }
  });

  app.put('/api/admin/videos/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getVideoById(id);
      if (!existing) {
        return res.status(404).json({ message: "Video not found" });
      }

      const result = updateVideoSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const videoUpdateData = result.data as z.infer<typeof updateVideoSchema>;
      const video = await storage.updateVideo(id, videoUpdateData);
      res.json(video);
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ message: "Failed to update video" });
    }
  });

  app.delete('/api/admin/videos/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteVideo(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Admin Game Routes
  app.get('/api/games', async (req, res) => {
    try {
      const games = await storage.getActiveGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get('/api/games/featured', async (req, res) => {
    try {
      const games = await storage.getFeaturedGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching featured games:", error);
      res.status(500).json({ message: "Failed to fetch featured games" });
    }
  });

  app.get('/api/games/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const game = await storage.getGameById(id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.get('/api/games/by-story/:storyTitle', async (req, res) => {
    try {
      const storyTitle = decodeURIComponent(req.params.storyTitle);
      const games = await storage.getGamesByStoryTitle(storyTitle);
      res.json(games);
    } catch (error) {
      console.error("Error fetching games by story:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get('/api/admin/games', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.post('/api/admin/games', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const result = insertStoryGameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const gameData = result.data as z.infer<typeof insertStoryGameSchema>;

      // Automation scripts authenticate with the x-admin-token header; the
      // admin UI form uses the session cookie and sets isActive/isFeatured
      // explicitly via its own switches, so only override for scripts.
      const isAutomationRequest = !!req.headers['x-admin-token'];
      const settings = isAutomationRequest ? await storage.getAutomationSettings() : null;
      if (settings) {
        gameData.isActive = settings.autoPublishEnabled;
      }

      let game = await storage.createGame(gameData);
      if (settings?.autoPublishEnabled) {
        game = await storage.autoFeatureGame(game.id);
      }
      res.status(201).json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      const message = error instanceof Error ? error.message : "Failed to create game";
      res.status(500).json({ message });
    }
  });

  app.put('/api/admin/games/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const existing = await storage.getGameById(id);
      if (!existing) {
        return res.status(404).json({ message: "Game not found" });
      }

      const result = updateStoryGameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const gameData = result.data as z.infer<typeof updateStoryGameSchema>;
      const game = await storage.updateGame(id, gameData);
      res.json(game);
    } catch (error) {
      console.error("Error updating game:", error);
      const message = error instanceof Error ? error.message : "Failed to update game";
      res.status(500).json({ message });
    }
  });

  app.delete('/api/admin/games/:id', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteGame(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Points API for games
  app.post('/api/games/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { score } = req.body;
      const userId = req.session.userId;

      const game = await storage.getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const pointsEarned = Math.round((score / 100) * game.pointsReward);
      const user = await storage.addUserPoints(userId, pointsEarned);

      res.json({ 
        pointsEarned, 
        totalPoints: user.points,
        message: `You earned ${pointsEarned} points!`
      });
    } catch (error) {
      console.error("Error completing game:", error);
      res.status(500).json({ message: "Failed to record game completion" });
    }
  });

  // Poll Routes
  app.post('/api/games/:id/vote', async (req: any, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { questionId, optionIndex } = req.body;
      
      const vote = await storage.createPollVote({
        gameId,
        questionId,
        optionIndex,
        userId: req.session.userId || null,
      });
      
      res.json(vote);
    } catch (error) {
      console.error("Error submitting vote:", error);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  app.get('/api/games/:id/results', async (req: any, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const votes = await storage.getPollVotes(gameId);

      // Aggregate results
      const results: Record<string, Record<number, number>> = {};
      
      votes.forEach(vote => {
        if (!results[vote.questionId]) {
          results[vote.questionId] = {};
        }
        results[vote.questionId][vote.optionIndex] = (results[vote.questionId][vote.optionIndex] || 0) + 1;
      });
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching poll results:", error);
      res.status(500).json({ message: "Failed to fetch poll results" });
    }
  });

  app.post('/api/admin/generate-audio', async (req: any, res) => {
    try {
      if (!await isValidAdminSession(req)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const result = await generateAndCacheAudio(text);
      res.json({ success: true, cached: false, ...result });
    } catch (error: any) {
      console.error("Error generating speech:", error);
      res.status(500).json({ message: error.message || "Failed to generate speech" });
    }
  });

  // Public read-only endpoint that ONLY serves cached content
  app.post('/api/text-to-speech', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      // Generate hash of the text to find key
      const hash = createHash('md5').update(text).digest('hex');
      const audioKey = `tts/${hash}.mp3`;
      const jsonKey = `tts/${hash}.json`;

      // Check if exists
      const audioBuffer = await getFileFromR2(audioKey);
      const jsonBuffer = await getFileFromR2(jsonKey);

      if (!audioBuffer || !jsonBuffer) {
        // DO NOT GENERATE - Return 404
        return res.status(404).json({ message: "Audio not generated yet" });
      }

      const metadata = JSON.parse(jsonBuffer.toString());
      const audioBase64 = audioBuffer.toString('base64');

      res.json({
        audio: audioBase64,
        words: metadata.words,
        duration: metadata.duration,
        hasWordTiming: metadata.hasWordTiming
      });

    } catch (error) {
      console.error("Error retrieving speech:", error);
      res.status(500).json({ message: "Failed to retrieve speech" });
    }
  });

  // ========== TEACHER COURSEWORK MARKETPLACE ==========
  
  // Public marketplace routes
  app.get('/api/marketplace', async (req, res) => {
    try {
      const items = await storage.getPublishedCoursework();
      res.json(items);
    } catch (error) {
      console.error("Error fetching marketplace items:", error);
      res.status(500).json({ message: "Failed to fetch marketplace items" });
    }
  });

  app.get('/api/marketplace/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getCourseworkById(id);
      if (!item || !item.isPublished) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching marketplace item:", error);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  // Leaderboard - top teachers and products (placeholder data)
  app.get('/api/marketplace/leaderboard/teachers', async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers.slice(0, 10));
    } catch (error) {
      console.error("Error fetching teacher leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/marketplace/leaderboard/products', async (req, res) => {
    try {
      const items = await storage.getPublishedCoursework();
      const sorted = items.sort((a, b) => b.salesCount - a.salesCount);
      res.json(sorted.slice(0, 10));
    } catch (error) {
      console.error("Error fetching product leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Teacher profile routes
  app.get('/api/teachers', async (req, res) => {
    try {
      const teachers = await storage.getTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.get('/api/teachers/:id', async (req, res) => {
    try {
      const teacher = await storage.getTeacherById(req.params.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      const items = await storage.getCourseworkByTeacher(req.params.id);
      const publishedItems = items.filter(i => i.isPublished);
      res.json({ ...teacher, courseworkItems: publishedItems });
    } catch (error) {
      console.error("Error fetching teacher:", error);
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  // User role change (supports both auth methods)
  app.post('/api/user/role', async (req: any, res) => {
    return res.status(400).json({ message: "Account roles are no longer supported" });
  });

  // User profile update (supports both auth methods)
  app.patch('/api/user/profile', async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { firstName, lastName } = req.body;
      const user = await storage.updateUserProfile(userId, { firstName, lastName });
      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // User password change (supports both auth methods)
  app.post('/api/user/change-password', async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "Password change not available for this account type" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await storage.updateUserPassword(userId, newHash);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User notification preferences (supports both auth methods)
  app.patch('/api/user/notifications', async (req: any, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { marketingEmailsOptIn, contentAlertsOptIn, teacherUpdatesOptIn } = req.body;
      const user = await storage.updateUserNotifications(userId, {
        marketingEmailsOptIn,
        contentAlertsOptIn,
        teacherUpdatesOptIn,
      });
      res.json({ ...user, passwordHash: undefined });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Teacher profile update
  app.put('/api/teacher/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== 'teacher') {
        return res.status(403).json({ message: "Teacher access required" });
      }
      
      const { bio, subjectsTaught, experienceYears } = req.body;
      const updated = await storage.updateTeacherProfile(userId, {
        bio,
        subjectsTaught,
        experienceYears,
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating teacher profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Teacher coursework CRUD
  app.get('/api/teacher/coursework', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== 'teacher') {
        return res.status(403).json({ message: "Teacher access required" });
      }
      
      const items = await storage.getCourseworkByTeacher(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching teacher coursework:", error);
      res.status(500).json({ message: "Failed to fetch coursework" });
    }
  });

  app.post('/api/teacher/coursework', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.userRole !== 'teacher') {
        return res.status(403).json({ message: "Teacher access required" });
      }
      
      const result = insertCourseworkItemSchema.safeParse({ ...req.body, teacherId: userId });
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      const item = await storage.createCoursework(result.data as InsertCourseworkItem);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating coursework:", error);
      res.status(500).json({ message: "Failed to create coursework" });
    }
  });

  app.put('/api/teacher/coursework/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      
      if (!user || user.userRole !== 'teacher') {
        return res.status(403).json({ message: "Teacher access required" });
      }
      
      const existing = await storage.getCourseworkById(id);
      if (!existing || existing.teacherId !== userId) {
        return res.status(404).json({ message: "Coursework not found" });
      }
      
      const result = updateCourseworkItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      
      const item = await storage.updateCoursework(id, result.data as Partial<InsertCourseworkItem>);
      res.json(item);
    } catch (error) {
      console.error("Error updating coursework:", error);
      res.status(500).json({ message: "Failed to update coursework" });
    }
  });

  app.delete('/api/teacher/coursework/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const id = parseInt(req.params.id);
      
      if (!user || user.userRole !== 'teacher') {
        return res.status(403).json({ message: "Teacher access required" });
      }
      
      const existing = await storage.getCourseworkById(id);
      if (!existing || existing.teacherId !== userId) {
        return res.status(404).json({ message: "Coursework not found" });
      }
      
      await storage.deleteCoursework(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting coursework:", error);
      res.status(500).json({ message: "Failed to delete coursework" });
    }
  });

  return httpServer;
}
