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
 * which of 10 game types best fits it:
 *   - quiz         : comprehension questions with 4 options + explanation
 *   - timeline     : put a sequence of events in the right order (text only)
 *   - poll         : a fun, no-wrong-answer opinion question
 *   - puzzle       : sliding/jigsaw puzzle using the story's own thumbnail
 *   - fillblank    : a real sentence from the story with a word blanked out
 *   - truefalse    : rapid-fire true/false statements, timed per statement
 *   - scramble     : unscramble a key word, shown next to one themed photo
 *   - guessnumber  : guess a striking numeric fact with higher/lower hints
 *   - oddoneout    : spot the fake statement among 3 true ones, per round
 *   - emojidecoder : guess what a short emoji clue represents
 * (whack-a-mole is intentionally excluded — it needs several correctly
 * labeled images sourced fresh each run, which is a lot of extra
 * Unsplash calls and failure surface for one game type. Memory Match
 * ("match") has been retired from this rotation too — it's still a fully
 * working type for any pre-existing games, just no longer generated.)
 *
 * Whether a created game goes live immediately or waits as a draft for
 * review in /admin/games depends on the site's "Auto-publish" toggle
 * (visible in /admin/games and /admin/stories) — the server applies it
 * automatically to every game this script creates.
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
 *   --type=quiz|timeline|poll|puzzle|fillblank|truefalse|scramble|guessnumber|oddoneout|emojidecoder
 *                    force this exact game type instead of letting Claude
 *                    choose — combine with --story and --dry-run to test
 *                    each type deterministically
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

const GAME_TYPES = ["quiz", "timeline", "poll", "puzzle", "fillblank", "truefalse", "scramble", "guessnumber", "oddoneout", "emojidecoder"];
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
const FORCE_TYPE = CLI_ARGS.type ? String(CLI_ARGS.type) : null;
if (FORCE_TYPE && !GAME_TYPES.includes(FORCE_TYPE)) {
  console.error(`--type must be one of: ${GAME_TYPES.join(", ")}`);
  process.exit(1);
}

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

// When each game type fits. Kept as a map (not one blob of text) so the
// prompt can offer Claude a REDUCED menu — see chooseAllowedTypes below.
const GAME_TYPE_GUIDE = {
  quiz: `"quiz": the story has clear facts a reader could be asked comprehension questions about. Needs 4-5 multiple choice questions.`,
  timeline: `"timeline": the story describes a sequence, process, or order of events (how something happens/happened step by step, or a history). Needs 4-6 events in their correct chronological/logical order.`,
  poll: `"poll": the story has a fun, opinion-based angle with no single right answer (e.g. "which of these would you rather..."). Needs 2-3 questions, each with 3-4 options.`,
  puzzle: `"puzzle": the story is strongly visual/atmospheric without a clean set of quizzable facts. This just reuses the story's photo as a sliding puzzle, so pick this when nothing else fits well.`,
  fillblank: `"fillblank": the story has strong individual sentences you could blank out a key word from to test close reading. Needs 4-5 sentences pulled/adapted from the story, each with one word replaced by "___", plus multiple choice options for the missing word.`,
  truefalse: `"truefalse": the story has several standalone claims that are genuinely SURPRISING to challenge — a kid should think "wait, really?" before answering. Nearly any story can technically be turned into true/false statements, which is exactly why this type gets overused; only pick it when the claims are fun to be tricked by, not merely when they are checkable. Needs 6-8 short true/false statements.`,
  scramble: `"scramble": the story has ONE especially strong, concrete, visually-recognizable noun (an animal, place, or object — not an abstract concept) that would make a fun "guess the picture" word puzzle. Needs just that one word plus a short kid-friendly clue.`,
  guessnumber: `"guessnumber": the story has ONE striking, guessable numeric fact (a count, speed, size, distance, age, etc). Needs the question, the exact numeric answer, and an optional unit.`,
  oddoneout: `"oddoneout": the story has enough real facts that you can write 4-statement rounds where 3 are true and 1 is a plausible-sounding made-up fact. Needs 3-5 rounds, each with exactly 4 statements and which index is the fake one.`,
  emojidecoder: `"emojidecoder": the story has concrete, visual nouns/concepts that can be represented as a short emoji sequence for the reader to guess. Needs 4-6 rounds, each an emoji clue plus 4 multiple choice options.`,
};

// Types that fit almost any story, so they win "which fits best?" by default
// and crowd out the more interesting formats if left unchecked.
const COMMON_TYPES = ["truefalse", "quiz"];

// How many of the most recent games to look at when balancing.
const BALANCE_WINDOW = 12;
// A type may not exceed this share of the recent window.
const MAX_TYPE_SHARE = 0.25;
// A type used in any of the last N games is skipped this round.
const COOLDOWN_GAMES = 3;
// Never narrow the menu below this many types — a starved menu produces
// worse games than a slightly repetitive one.
const MIN_MENU_SIZE = 5;

/**
 * Decide which game types Claude is allowed to choose from for this story.
 *
 * Claude picks the single best-fitting type per story with no memory of what
 * came before, and since practically every factual story CAN be turned into
 * true/false statements, that type wins on fit almost every time. Rather than
 * asking Claude to remember variety (which it has no way to know about), the
 * script reads what already exists and hands over a menu with the
 * over-represented types removed.
 *
 * Balances against real published games, so it self-corrects — no state file.
 */
// How many of the least-used types the "rare slot" may choose between. Small
// enough to guarantee an unusual format, big enough that Claude still has a
// real choice and isn't forced to jam a bad fit onto the story.
const RARE_MENU_SIZE = 5;

function chooseAllowedTypes(existingGames, chosenThisRun = [], opts = {}) {
  // Newest first; ids are sequential so the highest id is the newest game.
  const recent = [...existingGames]
    .sort((a, b) => b.id - a.id)
    .slice(0, BALANCE_WINDOW)
    .map((g) => g.gameType);

  const counts = {};
  for (const t of recent) counts[t] = (counts[t] || 0) + 1;

  const cooldown = new Set([
    ...recent.slice(0, COOLDOWN_GAMES),
    ...chosenThisRun, // never repeat a type inside one run either
  ]);

  const overCap = new Set(
    Object.entries(counts)
      .filter(([, n]) => recent.length > 0 && n / recent.length > MAX_TYPE_SHARE)
      .map(([t]) => t)
  );

  let allowed = GAME_TYPES.filter((t) => !cooldown.has(t) && !overCap.has(t));

  // If the rules starved the menu, add back the least-recently-used types
  // (rarest first) until it is usable again.
  if (allowed.length < MIN_MENU_SIZE) {
    const fallbackOrder = GAME_TYPES
      .filter((t) => !allowed.includes(t) && !chosenThisRun.includes(t))
      .sort((a, b) => (counts[a] || 0) - (counts[b] || 0));
    allowed = [...allowed, ...fallbackOrder].slice(0, Math.max(MIN_MENU_SIZE, allowed.length));
  }

  // The "rare slot". Removing over-used types stops any one format dominating,
  // but it does not actively surface the awkward formats (scramble,
  // guessnumber, emojidecoder) — those need a specific kind of story, so they
  // lose "which fits best?" to quiz or oddoneout nearly every time and would
  // stay invisible. Once per run, the menu is narrowed to the least-used types
  // only, which guarantees the unusual formats keep showing up.
  if (opts.rareOnly) {
    const rare = GAME_TYPES.filter((t) => !chosenThisRun.includes(t) && !COMMON_TYPES.includes(t))
      .sort((a, b) => (counts[a] || 0) - (counts[b] || 0))
      .slice(0, RARE_MENU_SIZE);
    if (rare.length) allowed = rare;
  }

  return { allowed, counts, recentCount: recent.length };
}

// --- Claude: pick the best game type for a story + generate its content ---
// Pass forceType to skip Claude's own judgment and require a specific type
// (used by --type=... for testing each type deterministically).
// Pass allowedTypes to restrict which types Claude may choose between.
async function planGameForStory(story, forceType, allowedTypes) {
  // Keep the prompt a reasonable size — the excerpt + a healthy chunk of
  // content is plenty of context without sending the whole article.
  const truncatedContent = story.content.length > 4000
    ? story.content.slice(0, 4000) + "..."
    : story.content;

  const menu = forceType
    ? [forceType]
    : (allowedTypes && allowedTypes.length ? allowedTypes : GAME_TYPES);

  const typeInstruction = forceType
    ? `You MUST use gameType "${forceType}" for this one — do not pick a different type, even if another would fit better. Just do your best to make it work well for this story.`
    : `Read it and decide which ONE of the ${menu.length} game types below best fits its content, then generate the actual game content for that type. These are the only types available for this story — other types exist but have been used too recently, so do not ask for them.`;

  const menuText = menu.map((t) => `- ${GAME_TYPE_GUIDE[t]}`).join("\n");
  const enumText = menu.map((t) => `"${t}"`).join(" | ");

  const prompt = `You help design mini-games for a kids' educational news platform called WhyPals (readers are ages 7-12). You'll be given one published story. ${typeInstruction}

Game types and when each fits well:
${menuText}

Story title: ${story.title}
Story category: ${story.category.join(", ")}
Story content:
${truncatedContent}

Respond with ONLY valid JSON, no markdown fences, matching this exact shape (include ONLY the one config key that matches your chosen gameType — omit the other config keys entirely):
{
  "gameType": ${enumText},
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
  const typesChosenThisRun = [];

  if (!FORCE_TYPE) {
    const { counts, recentCount } = chooseAllowedTypes(games);
    if (recentCount > 0) {
      const summary = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t} ${n}`)
        .join(", ");
      console.log(`\nLast ${recentCount} games by type: ${summary}`);
    }
  }

  for (const [index, story] of targetStories.entries()) {
    // Reserve the first game of every run for an unusual format.
    const rareOnly = !FORCE_TYPE && index === 0;
    const { allowed } = chooseAllowedTypes(games, typesChosenThisRun, { rareOnly });
    if (!FORCE_TYPE) {
      console.log(
        `\n[${story.title}] Types available this round${rareOnly ? " (rare slot)" : ""}: ${allowed.join(", ")}`
      );
    }
    console.log(`[${story.title}] Asking Claude to design a game...`);
    let plan;
    try {
      plan = await planGameForStory(story, FORCE_TYPE, allowed);
    } catch (err) {
      console.warn(`[${story.title}] Failed to plan a game, skipping:`, err.message);
      continue;
    }

    // Claude occasionally answers with a type that wasn't on the menu; treat
    // that as a failed plan rather than quietly letting the bias back in.
    if (!FORCE_TYPE && !allowed.includes(plan.gameType)) {
      console.warn(
        `[${story.title}] Claude picked "${plan.gameType}", which wasn't offered this round. Skipping.`
      );
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
      // The server overrides isActive/isFeatured for this request based on
      // the site's auto-publish setting (toggle in /admin) — these are just
      // the fallback/dry-run-preview values.
      isActive: false,
      isFeatured: false,
    };

    if (DRY_RUN) {
      console.log(`[${story.title}] --dry-run set — not creating. Payload:`);
      console.log(JSON.stringify(payload, null, 2));
      created.push({ story: story.title, gameType: plan.gameType, title: plan.title, id: "(dry-run)" });
      typesChosenThisRun.push(plan.gameType);
      continue;
    }

    try {
      const game = await createGame(token, payload);
      console.log(`[${story.title}] Created game ID ${game.id} (${game.isActive ? "live" : "inactive — review before switching on"})`);
      created.push({ story: story.title, gameType: plan.gameType, title: plan.title, id: game.id });
      typesChosenThisRun.push(plan.gameType);
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
