#!/usr/bin/env node
/**
 * auto-weekly-games.mjs
 *
 * Runs once a week and creates 3 new games, each linked to a different
 * published story that doesn't have a game yet (games are linked to
 * stories by exact title match, per the existing "linkedStoryTitle" design).
 *
 * For each of the 3 stories picked, Claude reads the actual story content
 * and decides which of 5 game types best fits it:
 *   - quiz     : comprehension questions with 4 options + explanation
 *   - timeline : put a sequence of events in the right order (text only)
 *   - match    : memory-match pairs of related terms/facts (text only)
 *   - poll     : a fun, no-wrong-answer opinion question
 *   - puzzle   : sliding/jigsaw puzzle using the story's own thumbnail
 * (whack-a-mole is intentionally excluded — it needs several correctly
 * labeled images sourced fresh each run, which is a lot of extra
 * Unsplash calls and failure surface for one of six game types.)
 *
 * All 3 games are created with isActive: false (a draft, same review-first
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
const WHYPALS_BASE_URL = process.env.WHYPALS_BASE_URL || "https://whypals.com";
const WHYPALS_ADMIN_PASSWORD = process.env.WHYPALS_ADMIN_PASSWORD;

const GAME_TYPES = ["quiz", "timeline", "match", "poll", "puzzle"];
const DEFAULT_COUNT = 3;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Set it in .env.automation (project root) or export it before running.");
    process.exit(1);
  }
}
requireEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY);
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

  const prompt = `You help design mini-games for a kids' educational news platform called WhyPals (readers are ages 7-12). You'll be given one published story. Read it and decide which ONE of these 5 game types best fits its content, then generate the actual game content for that type.

Game types and when each fits well:
- "quiz": the story has clear facts a reader could be asked comprehension questions about. Needs 4-5 multiple choice questions.
- "timeline": the story describes a sequence, process, or order of events (how something happens/happened step by step, or a history). Needs 4-6 events in their correct chronological/logical order.
- "match": the story is full of distinct terms, names, or facts that naturally pair up (a word and its meaning, an animal and a trait, etc). Needs 4-6 pairs.
- "poll": the story has a fun, opinion-based angle with no single right answer (e.g. "which of these would you rather..."). Needs 2-3 questions, each with 3-4 options.
- "puzzle": the story is strongly visual/atmospheric without a clean set of quizzable facts. This just reuses the story's photo as a sliding puzzle, so pick this when nothing else fits well.

Story title: ${story.title}
Story category: ${story.category.join(", ")}
Story content:
${truncatedContent}

Respond with ONLY valid JSON, no markdown fences, matching this exact shape (include ONLY the one config key that matches your chosen gameType — omit the other config keys entirely):
{
  "gameType": "quiz" | "timeline" | "match" | "poll" | "puzzle",
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
function buildConfig(plan, story) {
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
    const candidates = stories.filter((s) => !existingTitles.has(s.title.trim()));
    if (candidates.length === 0) {
      console.log("Every published story already has a game linked to it — nothing to do.");
      return;
    }
    targetStories = shuffle(candidates).slice(0, Math.min(COUNT, candidates.length));
    console.log(
      `${candidates.length} story(ies) have no game yet. Picking ${targetStories.length} at random.`
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
      config = buildConfig(plan, story);
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
