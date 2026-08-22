#!/usr/bin/env node
/**
 * seed-big-whys.mjs
 *
 * Auto-generates and publishes "Big Why" questions (the ones that show up
 * on /big-why) for your existing published stories.
 *
 * IMPORTANT rule this script enforces: each generated question must NOT be
 * something the story already answers in its own text. It has to either
 * (a) ask for clarification on something the story mentions but doesn't
 * fully explain, or (b) raise a related concept the story never covers.
 * Claude is given the story's full content and explicitly told to check its
 * own question against that text before answering — see GENERATE_PROMPT
 * below if you want to tighten/loosen that rule further.
 *
 * Run:
 *   node scripts/seed-big-whys.mjs
 *
 * Optional:
 *   node scripts/seed-big-whys.mjs --count=5          Only do the first 5 published stories (default: all of them)
 *   node scripts/seed-big-whys.mjs --story-id=42       Only do one specific story
 *
 * Required environment variables (same .env.automation as auto-story.mjs):
 *   ANTHROPIC_API_KEY      - from console.anthropic.com
 *   WHYPALS_BASE_URL       - e.g. https://whypals.com
 *   WHYPALS_ADMIN_PASSWORD - your admin panel password
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- tiny .env loader (no extra dependency needed) ---
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

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Set it in scripts/.env.automation (see .env.automation.example) or export it before running.");
    process.exit(1);
  }
}
requireEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY);
requireEnv("WHYPALS_ADMIN_PASSWORD", WHYPALS_ADMIN_PASSWORD);

// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || true];
  })
);

// --- 1. Log in to the WhyPals admin API ---
async function adminLogin() {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: WHYPALS_ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Admin login failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

// --- 2. Fetch published stories (full content included) ---
async function fetchPublishedStories() {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/stories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch stories ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchStoryById(id) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/stories/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch story #${id} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// --- 3. Ask Claude for one question+answer this story does NOT already cover ---
async function generateBigWhy(story) {
  const prompt = `You write "Big Why" questions for WhyPals, a news/learning site for kids ages 7-12. A "Big Why" is a follow-up question shown next to a story, meant to make a curious kid go "ooh, I wonder about that too!" — and then you answer it yourself.

THE ONE RULE THAT MATTERS MOST: your question must NOT be something this story already explains. Read the story below carefully first. Your question must do ONE of these two things:
1. Ask for clarification on something the story mentions or implies but does not actually explain (a term it uses without defining, a cause it states without saying why, a detail it glosses over).
2. Raise a related concept or "but what about..." angle that is naturally connected to the story's topic but that the story's text never touches on at all.

Before you finalize your answer, re-read the story text and double check: is the question you're about to ask already directly answered somewhere in it? If yes, throw it out and pick a different angle. Do not write a question whose answer is "the story already told you this."

Story title: ${story.title}
Story content:
${story.content}

Write:
- "question": one single, short, curious kid-voiced question (max ~15 words), phrased the way a real 7-12 year old would ask it out loud.
- "answer": a warm, accurate, kid-friendly answer, 2-4 short sentences, simple vocabulary, no markdown formatting.

Respond with ONLY valid JSON, no markdown code fences, in this exact shape:
{
  "question": "...",
  "answer": "..."
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
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Could not parse Big Why JSON from Claude output:\n${text}`);
  }
  if (!parsed.question || !parsed.answer) {
    throw new Error(`Claude response missing question/answer:\n${text}`);
  }
  return parsed;
}

// --- 4. Create the (unanswered) question ---
async function createQuestion(storyId, question) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/questions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storyId, question }),
  });
  if (!res.ok) {
    throw new Error(`Create question failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// --- 5. Answer + publish it ---
async function answerAndPublish(token, id, answer) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/questions/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-admin-token": token,
    },
    body: JSON.stringify({
      answer,
      isPublished: true,
      answeredAt: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Publish question failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// --- main ---
async function main() {
  console.log("Logging into WhyPals admin...");
  const token = await adminLogin();

  let targetStories;
  if (args["story-id"]) {
    console.log(`Fetching story #${args["story-id"]}...`);
    targetStories = [await fetchStoryById(parseInt(args["story-id"], 10))];
  } else {
    console.log("Fetching published stories...");
    const stories = await fetchPublishedStories();
    if (!stories.length) {
      console.error("No published stories found — publish at least one story first.");
      process.exit(1);
    }
    const count = args.count ? parseInt(args.count, 10) : stories.length;
    targetStories = stories.slice(0, count);
    console.log(`Generating a Big Why for ${targetStories.length} of ${stories.length} published stories.`);
  }

  console.log("");
  let ok = 0;
  for (const story of targetStories) {
    try {
      const { question, answer } = await generateBigWhy(story);
      const created = await createQuestion(story.id, question);
      await answerAndPublish(token, created.id, answer);
      console.log(`✓ [${story.title}]\n  Q: ${question}\n  A: ${answer}\n`);
      ok++;
    } catch (err) {
      console.error(`✗ [${story.title}] failed: ${err.message}\n`);
    }
  }

  console.log(`Done: ${ok}/${targetStories.length} published to /big-why.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
