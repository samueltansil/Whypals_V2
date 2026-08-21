#!/usr/bin/env node
/**
 * auto-weekly-games.mjs
 *
 * Runs once a week and creates 3 new games, each linked to a different
 * published story that doesn't have a game yet (games are linked to
 * stories by exact title match, per the existing "linkedStoryTitle" design).
 *
 * Story selection prefers the last 6 published stories (normally that
 * week's batch from auto-weekly-stories.mjs) — it picks 3 of THOSE at
 * random, as long as they don't already have a game. If fewer than 3 of
 * the last 6 are still gameless, it fills the rest from the wider pool of
 * any gameless published story. So: run it once after publishing this
 * week's 6 and it targets that batch; run it again any time after that
 * (once the recent 6 are all gamed) and it just picks randomly from
 * whatever published stories still don't have a game.
 *
 * NOTE: as of the publish-time auto-game hook in server/routes.ts, every
 * story now automatically gets exactly 1 game the moment YOU publish it —
 * this script is no longer the primary path for that. It's now mainly a
 * manual backfill tool: for older stories that predate that change, or to
 * add extra games on top whenever you feel like it ("node
 * scripts/auto-weekly-games.mjs" any time — it picks at random).
 *
 * For each story picked, Claude reads the actual story content and decides
 * which of 8 game types best fits it:
 *   - quiz      : comprehension questions with 4 options + explanation
 *   - timeline  : put a sequence of events in the right order (text only)
 *   - match     : memory-match pairs of related terms/facts (text only)
 *   - poll      : a fun, no-wrong-answer opinion question
 *   - puzzle    : sliding/jigsaw puzzle using the story's own thumbnail
 *   - fillblank : a real sentence from the story with a word blanked out
 *   - truefalse : rapid-fire true/false statements, timed per statement
 *   - scramble  : unscramble a key word, shown next to one themed photo
 * (whack-a-mole is intentionally excluded — it needs several correctly
 * labeled images sourced fresh each run, which is a lot of extra
 * Unsplash calls and failure surface for one game type.)
 *
 * All games are created with isActive: false (a draft, same review-first
 * pattern as the weekly stories) so nothing goes live without a look in
 * /admin/games first.
 *
 * Run manually:
 *   node scripts/auto-weekly-games.mjs
 *
 * Useful flags for testing:
 *   --count=1        only generate 1 game instead of 3
 *   --dry-run        do everything except the final POST /api/admin/games
 *                     (prints what would have been created)
 *   --story="Exact Story Title"
 *                    force a specific story instead of picking randomly
 *                    (bypasses the "no existing game yet" filter too)
 *
 * Uses the same .env.automation file as the other automation scripts
 * (project root).
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- tiny .env loader (same as the other automation scripts) ---
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, "..", ".env.automation"));

// --- config ---
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const WHYPALS_BASE_URL = process.env.WHYPALS_BASE_URL || "https://whypals.com";
const WHYPALS_ADMIN_PASSWORD = process.env.WHYPALS_ADMIN_PASSWORD;

const GAME_TYPES = ["quiz", "timeline", "match", "poll", "puzzle", "fillblank", "truefalse", "scramble"];
const DEFAULT_COUNT = 3;
const RECENT_POOL_SIZE = 6; // prefer picking from the last N published stories (this week's batch) before falling back to the wider pool

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Set it in .env.automation (project root) or export it before running.");
    process.exit(1);
  }
}
requireEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY);
requireEnv("UNSPLASH_ACCESS_KEY", UNSPLASH_ACCESS_KEY);
requireEnv("WHYPALS_ADMIN_PASSWORD", WHYPALS_ADMIN_PASSWORD);

// --- CLI args ---
// --count=N              : generate N games instead of the default 3
// --dry-run               : do everything except actually creating the game
// --story="Exact Title"   : force this one story (skips random selection
//                           and the "no game yet" filter)
const CLI_ARGS = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || true];
  })
);
const COUNT = CLI_ARGS.count ? parseInt(CLI_ARGS.count, 10) : DEFAULT_COUNT;
const DRY_RUN = !!CLI_ARGS["dry-run"];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// --- WhyPals API ---
async function adminLogin() {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: WHYPALS_ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.token;
}

async function fetchPublishedStories() {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/stories`);
  if (!res.ok) throw new Error(`Failed to fetch stories ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllGames(token) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/games`, {
    headers: { "x-admin-token": token },
  });
  if (!res.ok) throw new Error(`Failed to fetch games ${res.status}: ${await res.text()}`);
  return res.json();
}

async function findGameImage(searchTerm) {
  const query = encodeURIComponent(searchTerm);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=3&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;
  return `${photo.urls.raw}&w=1200&q=85&fit=max&auto=format`;
}

async function createGame(token, gamePayload) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/games`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(gamePayload),
  });
  if (!res.ok) throw new Error(`Create game failed ${res.status}: ${await res.text()}`);
  return res.json();
}

// --- Claude: pick the best game type for a story + generate its content ---
async function planGameForStory(story) {
  // Keep the prompt a reasonable size — the excerpt + a healthy chunk of
  // content is plenty of context without sending the whole article.
  const truncatedContent = story.content.length > 4000
    ? story.content.slice(0, 4000) + "..."
    : story.content;

  const prompt = `You help design mini-games for a kids' educational news platform called WhyPals (readers are ages 7-12). You'll be given one published story. Read it and decide which ONE of these 8 game types best fits its content, then generate the actual game content for that type.

Game types and when each fits well:
- "quiz": the story has clear facts a reader could be asked comprehension questions about. Needs 4-5 multiple choice questions.
- "timeline": the story describes a sequence, process, or order of events (how something happens/happened step by step, or a history). Needs 4-6 events in their correct chronological/logical order.
- "match": the story is full of distinct terms, names, or facts that naturally pair up (a word and its meaning, an animal and a trait, etc). Needs 4-6 pairs.
- "poll": the story has a fun, opinion-based angle with no single right answer (e.g. "which of these would you rather..."). Needs 2-3 questions, each with 3-4 options.
- "puzzle": the story is strongly visual/atmospheric without a clean set of quizzable facts. This just reuses the story's photo as a sliding puzzle, so pick this when nothing else fits well.
- "fillblank": the story has strong individual sentences you could blank out a key word from to test close reading. Needs 4-5 sentences pulled/adapted from the story, each with one word replaced by "___", plus multiple choice options for the missing word.
- "truefalse": the story has several standalone, clearly true or false factual claims you could quiz rapid-fire. Needs 6-8 short true/false statements.
- "scramble": the story has ONE especially strong, concrete, visually-recognizable noun (an animal, place, or object — not an abstract concept) that would make a fun "guess the picture" word puzzle. Needs just that one word plus a short kid-friendly clue.

Story title: ${story.title}
Story category: ${story.category.join(", ")}
Story content:
${truncatedContent}

Respond with ONLY valid JSON, no markdown fences, matching this exact shape (include ONLY the one config key that matches your chosen gameType — omit the other config keys entirely):
{
  "gameType": "quiz" | "timeline" | "match" | "poll" | "puzzle" | "fillblank" | "truefalse" | "scramble",
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
  "matchConfig": {
    "pairs": [
      { "id": "p1", "front": "...", "back": "..." }
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
  }
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(jsonText);
}

// --- turn Claude's plan into the exact config shape the DB/UI expects ---
async function buildConfig(plan, story) {
  switch (plan.gameType) {
    case "quiz":
      return plan.quizConfig;
    case "timeline":
      return plan.timelineConfig;
    case "match":
      return plan.matchConfig;
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
    default:
      throw new Error(`Unrecognized gameType from Claude: "${plan.gameType}"`);
  }
}

function validateConfig(gameType, config) {
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
    case "match":
      if (!Array.isArray(config.pairs) || config.pairs.length === 0) {
        throw new Error("match config missing pairs");
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
  }
}

async function main() {
  console.log(DRY_RUN ? "Running in --dry-run mode (nothing will be created).\n" : "");
  console.log("Logging into WhyPals admin...");
  const token = await adminLogin();

  console.log("Fetching published stories and existing games...");
  const [stories, games] = await Promise.all([
    fetchPublishedStories(),
    fetchAllGames(token),
  ]);

  let targetStories;
  if (CLI_ARGS.story) {
    const forced = stories.find((s) => s.title.trim() === String(CLI_ARGS.story).trim());
    if (!forced) {
      console.error(`No published story found with the exact title: "${CLI_ARGS.story}"`);
      process.exit(1);
    }
    targetStories = [forced];
    console.log(`Forcing story via --story: "${forced.title}"`);
  } else {
    const existingTitles = new Set(
      games.map((g) => (g.linkedStoryTitle || "").trim()).filter(Boolean)
    );
    const gameless = stories.filter((s) => !existingTitles.has(s.title.trim()));
    if (gameless.length === 0) {
      console.log("Every published story already has a game linked to it — nothing to do.");
      return;
    }

    // Prefer the most recently published stories (highest id = newest,
    // since ids are sequential) — this is normally this week's batch of 6.
    // Falls back to the wider gameless pool once those run out, so running
    // this again and again keeps finding more stories at random.
    const sortedByRecency = [...stories].sort((a, b) => b.id - a.id);
    const recentPool = sortedByRecency.slice(0, RECENT_POOL_SIZE);
    const recentGameless = recentPool.filter((s) => !existingTitles.has(s.title.trim()));
    const restGameless = gameless.filter((s) => !recentGameless.includes(s));

    const fromRecent = shuffle(recentGameless).slice(0, COUNT);
    const stillNeeded = COUNT - fromRecent.length;
    const fromRest = stillNeeded > 0 ? shuffle(restGameless).slice(0, stillNeeded) : [];

    targetStories = [...fromRecent, ...fromRest];
    console.log(
      `${recentGameless.length}/${recentPool.length} of the last ${RECENT_POOL_SIZE} stories have no game yet.`
    );
    console.log(
      `Picking ${fromRecent.length} from the recent batch` +
        (fromRest.length ? ` + ${fromRest.length} at random from older stories.` : ".")
    );
  }

  const created = [];
  for (const story of targetStories) {
    console.log(`\n[${story.title}] Asking Claude to design a game...`);
    let plan;
    try {
      plan = await planGameForStory(story);
    } catch (err) {
      console.warn(`[${story.title}] Failed to plan a game, skipping:`, err.message);
      continue;
    }

    let config;
    try {
      config = await buildConfig(plan, story);
      validateConfig(plan.gameType, config);
    } catch (err) {
      console.warn(`[${story.title}] Claude's output didn't match the expected shape, skipping:`, err.message);
      continue;
    }

    console.log(`[${story.title}] Chosen type: ${plan.gameType} — "${plan.title}"`);

    const payload = {
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
      isActive: false, // draft — review in /admin/games before switching on
      isFeatured: false,
    };

    if (DRY_RUN) {
      console.log(`[${story.title}] --dry-run set — not creating. Payload:`);
      console.log(JSON.stringify(payload, null, 2));
      created.push({ story: story.title, gameType: plan.gameType, title: plan.title, id: "(dry-run)" });
      continue;
    }

    try {
      const game = await createGame(token, payload);
      console.log(`[${story.title}] Created game ID ${game.id} (inactive — review before switching on)`);
      created.push({ story: story.title, gameType: plan.gameType, title: plan.title, id: game.id });
    } catch (err) {
      console.warn(`[${story.title}] Failed to create game:`, err.message);
    }
  }

  console.log(`\nDone! Created ${created.length} game(s):`);
  for (const c of created) {
    console.log(`  #${c.id} — "${c.title}" (${c.gameType}) linked to "${c.story}"`);
  }
  if (!DRY_RUN && created.length > 0) {
    console.log(`\nReview them at: ${WHYPALS_BASE_URL}/admin/games`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
