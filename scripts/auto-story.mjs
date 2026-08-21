#!/usr/bin/env node
/**
 * auto-story.mjs
 *
 * Generates a new WhyPals story using the Claude API, finds a matching
 * thumbnail via Unsplash, and posts it to the WhyPals admin API as a
 * DRAFT (isPublished: false) so it can be reviewed in the admin panel
 * before going live.
 *
 * Run manually:
 *   node scripts/auto-story.mjs
 *
 * Run for a specific topic/category:
 *   node scripts/auto-story.mjs --category=Science --topic="why the ocean is salty"
 *
 * Required environment variables (put these in a .env.automation file or
 * export them in the shell/cron environment — do NOT commit them):
 *   ANTHROPIC_API_KEY   - from console.anthropic.com
 *   UNSPLASH_ACCESS_KEY - from unsplash.com/developers (free)
 *   WHYPALS_BASE_URL    - e.g. https://whypals.com
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
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const WHYPALS_BASE_URL = process.env.WHYPALS_BASE_URL || "https://whypals.com";
const WHYPALS_ADMIN_PASSWORD = process.env.WHYPALS_ADMIN_PASSWORD;
 
const CATEGORIES = ["Science", "Nature", "Sports", "World", "Fun", "Weekly Theme"];
 
function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Set it in scripts/.env.automation (see .env.automation.example) or export it before running.");
    process.exit(1);
  }
}
requireEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY);
requireEnv("UNSPLASH_ACCESS_KEY", UNSPLASH_ACCESS_KEY);
requireEnv("WHYPALS_ADMIN_PASSWORD", WHYPALS_ADMIN_PASSWORD);
 
// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || true];
  })
);
 
function pickCategory() {
  if (args.category) return args.category;
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}
 
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
 
// --- 1. Generate the story with Claude ---
async function generateStory(category, topicHint) {
  const prompt = `You write short, engaging, age-appropriate news stories for kids (roughly ages 7-12) for an educational platform called WhyPals.
 
Write ONE new story for the category "${category}"${topicHint ? ` about: ${topicHint}` : ", picking any interesting, current, kid-friendly topic in that category"}.
 
Rules:
- Never invent fake facts about real named people, companies, or ongoing news events unless you are confident they're accurate and appropriate for children.
- Prefer evergreen "why does this happen" / "how does this work" science, nature, and world topics over breaking news, since you cannot verify today's headlines.
- Tone: warm, curious, simple vocabulary, short sentences, a sense of wonder. No violence, no scary content, no ads, no calls to buy anything.
- Length: 4-7 short paragraphs, separated by a blank line (double newline) between paragraphs. Do not use markdown formatting (no #, no **, no bullet lists) — plain paragraphs only.
- Also write a one-sentence "excerpt" (max 160 characters) that teases the story.
- Also suggest 2-3 short English keywords (max 2 words each) that describe a good stock photo to illustrate this story (for an Unsplash search) — things like "ocean waves" or "space rocket", not abstract concepts.
- Estimate a read time as "N min read" based on word count (about 200 words per minute).
 
Respond with ONLY valid JSON, no markdown code fences, in this exact shape:
{
  "title": "...",
  "excerpt": "...",
  "content": "paragraph one\\n\\nparagraph two\\n\\n...",
  "readTime": "5 min read",
  "imageSearchTerms": ["term1", "term2"]
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
    throw new Error(`Could not parse story JSON from Claude output:\n${text}`);
  }
  return parsed;
}
 
// --- 2. Find a thumbnail on Unsplash ---
async function findThumbnail(searchTerms) {
  const query = encodeURIComponent(searchTerms?.[0] || "kids learning");
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=5&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) {
    throw new Error(`Unsplash API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;
  return {
    url: photo.urls.regular,
    credit: `Photo by ${photo.user.name} on Unsplash`,
  };
}
 
// --- 3. Log in to the WhyPals admin API ---
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
 
// --- 4. Upload the thumbnail to WhyPals (proxies through to R2) ---
async function uploadThumbnail(token, imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download thumbnail image: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
 
  const form = new FormData();
  form.append("image", new Blob([buffer], { type: contentType }), "thumbnail.jpg");
 
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/upload/image`, {
    method: "POST",
    headers: { "x-admin-token": token },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Thumbnail upload failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.imageUrl;
}
 
// --- 5. Create the story as a draft ---
async function createStory(token, storyPayload) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/stories`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-token": token,
    },
    body: JSON.stringify(storyPayload),
  });
  if (!res.ok) {
    throw new Error(`Create story failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
 
// --- main ---
async function main() {
  const category = pickCategory();
  const topicHint = args.topic;
 
  console.log(`Generating a "${category}" story${topicHint ? ` about "${topicHint}"` : ""}...`);
  const story = await generateStory(category, topicHint);
  console.log(`Title: ${story.title}`);
 
  console.log("Finding a thumbnail on Unsplash...");
  const thumb = await findThumbnail(story.imageSearchTerms);
 
  console.log("Logging into WhyPals admin...");
  const token = await adminLogin();
 
  let thumbnailUrl = "";
  let thumbnailCredit = "";
  if (thumb) {
    console.log("Uploading thumbnail...");
    thumbnailUrl = await uploadThumbnail(token, thumb.url);
    thumbnailCredit = thumb.credit;
  } else {
    console.warn("No thumbnail found — story will be created without one; add one manually before publishing.");
  }
 
  const payload = {
    slug: `${slugify(story.title)}-${Date.now().toString().slice(-5)}`,
    title: story.title,
    excerpt: story.excerpt,
    content: story.content,
    category: [category],
    thumbnail: thumbnailUrl,
    thumbnailCredit,
    readTime: story.readTime || "4 min read",
    isFeatured: false,
    isPublished: false, // always create as a draft for human review
  };
 
  console.log("Creating draft story in WhyPals admin...");
  const created = await createStory(token, payload);
 
  console.log("\nDone! Draft story created:");
  console.log(`  ID: ${created.id}`);
  console.log(`  Title: ${created.title}`);
  console.log(`  Review it at: ${WHYPALS_BASE_URL}/admin/stories`);
}
 
main().catch((err) => {
  console.error("Failed to generate/post story:", err.message);
  process.exit(1);
});
 


