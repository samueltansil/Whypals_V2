#!/usr/bin/env node
/**
 * auto-weekly-stories.mjs
 *
 * Runs once a week (Friday) and creates 6 draft stories:
 *   - 3 "general" stories spread across your normal categories
 *     (Science, Nature, Sports, World, Fun)
 *   - 3 "themed" stories tagged with this week's Weekly Theme (looked up
 *     from scripts/weekly-themes.json by today's date), each also tagged
 *     with whichever normal category best fits its specific angle
 *
 * All 6 are created as DRAFTS (isPublished: false) for review in the admin
 * panel before going live — nothing is auto-published.
 *
 * Run manually:
 *   node scripts/auto-weekly-stories.mjs
 *
 * Uses the same .env.automation file as auto-story.mjs (project root).
 */
 
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
 
const __dirname = dirname(fileURLToPath(import.meta.url));
 
// --- tiny .env loader (same as auto-story.mjs) ---
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
 
const NORMAL_CATEGORIES = ["Science", "Nature", "Sports", "World", "Fun"];
 
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
 
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
 
function todayISO() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k, rest.join("=") || true];
    })
  );
  if (args.date) return args.date; // allow --date=YYYY-MM-DD for manual testing
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
 
function loadThemeForToday() {
  const path = join(__dirname, "weekly-themes.json");
  if (!existsSync(path)) {
    console.warn("No scripts/weekly-themes.json found — skipping themed stories.");
    return null;
  }
  const data = JSON.parse(readFileSync(path, "utf8"));
  const today = todayISO();
  const entry = (data.themes || []).find((t) => t.date === today);
  if (!entry) {
    console.warn(`No theme scheduled for ${today} in weekly-themes.json — skipping themed stories.`);
    return null;
  }
  return entry.theme;
}
 
// --- Claude: pick 3 distinct angles under a theme ---
async function pickThemeAngles(theme) {
  const prompt = `You help plan a kids' educational news platform called WhyPals.
 
This week's theme is "${theme}". Suggest exactly 3 distinct, non-overlapping story angles/topics within this theme, suitable for kids ages 7-12. Each angle should be specific enough to write a full short story about (not vague), and each should also have a "bestFitCategory" — the single best match from this fixed list: Science, Nature, Sports, World, Fun.
 
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "angles": [
    { "topic": "...", "bestFitCategory": "Science" },
    { "topic": "...", "bestFitCategory": "Nature" },
    { "topic": "...", "bestFitCategory": "World" }
  ]
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
 
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(jsonText);
  return parsed.angles;
}
 
// --- Claude: generate a full story ---
async function generateStory(categoryLabel, topicHint, themeContext) {
  const prompt = `You write short, engaging, age-appropriate news stories for kids (roughly ages 7-12) for an educational platform called WhyPals.
 
Write ONE new story for the category "${categoryLabel}"${topicHint ? ` about: ${topicHint}` : ", picking any interesting, current, kid-friendly topic in that category"}.${themeContext ? ` This story is part of this week's "${themeContext}" theme, so make sure it clearly connects to that theme.` : ""}
 
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
 
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(jsonText);
}
 
// --- Unsplash ---
async function findThumbnail(searchTerms) {
  const query = encodeURIComponent(searchTerms?.[0] || "kids learning");
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=5&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) throw new Error(`Unsplash API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;
  return { url: photo.urls.regular, credit: `Photo by ${photo.user.name} on Unsplash` };
}
 
// --- WhyPals admin API ---
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
  if (!res.ok) throw new Error(`Thumbnail upload failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.imageUrl;
}
 
async function createStory(token, storyPayload) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/stories`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(storyPayload),
  });
  if (!res.ok) throw new Error(`Create story failed ${res.status}: ${await res.text()}`);
  return res.json();
}
 
// --- one full story: generate -> thumbnail -> upload -> create draft ---
async function buildAndPostStory({ token, categories, topicHint, themeContext, label }) {
  console.log(`\n[${label}] Generating story...`);
  const story = await generateStory(categories[0], topicHint, themeContext);
  console.log(`[${label}] Title: ${story.title}`);
 
  let thumbnailUrl = "";
  let thumbnailCredit = "";
  try {
    const thumb = await findThumbnail(story.imageSearchTerms);
    if (thumb) {
      thumbnailUrl = await uploadThumbnail(token, thumb.url);
      thumbnailCredit = thumb.credit;
    }
  } catch (err) {
    console.warn(`[${label}] Thumbnail step failed, continuing without one:`, err.message);
  }
 
  const payload = {
    slug: `${slugify(story.title)}-${Date.now().toString().slice(-5)}`,
    title: story.title,
    excerpt: story.excerpt,
    content: story.content,
    category: categories,
    thumbnail: thumbnailUrl,
    thumbnailCredit,
    readTime: story.readTime || "4 min read",
    isFeatured: false,
    isPublished: false, // always create as a draft for human review
  };
 
  const created = await createStory(token, payload);
  console.log(`[${label}] Created draft ID ${created.id}`);
  return created;
}
 
async function main() {
  const today = todayISO();
  console.log(`Running weekly story batch for ${today}...`);
 
  const theme = loadThemeForToday();
  if (theme) {
    console.log(`This week's theme: "${theme}"`);
  }
 
  console.log("Logging into WhyPals admin...");
  const token = await adminLogin();
 
  const created = [];
 
  // 3 general stories, 3 distinct random categories
  const shuffled = [...NORMAL_CATEGORIES].sort(() => Math.random() - 0.5);
  const generalCategories = shuffled.slice(0, 3);
  for (const cat of generalCategories) {
    const story = await buildAndPostStory({
      token,
      categories: [cat],
      topicHint: undefined,
      themeContext: undefined,
      label: `general/${cat}`,
    });
    created.push(story);
  }
 
  // 3 themed stories, if a theme is scheduled for today
  if (theme) {
    console.log(`\nPicking 3 angles for theme "${theme}"...`);
    const angles = await pickThemeAngles(theme);
    for (const angle of angles) {
      const story = await buildAndPostStory({
        token,
        categories: ["Weekly Theme", angle.bestFitCategory],
        topicHint: angle.topic,
        themeContext: theme,
        label: `theme/${angle.bestFitCategory}`,
      });
      created.push(story);
    }
  }
 
  console.log(`\nDone! Created ${created.length} draft stories:`);
  for (const s of created) {
    console.log(`  #${s.id} — ${s.title} [${s.category.join(", ")}]`);
  }
  console.log(`\nReview them at: ${WHYPALS_BASE_URL}/admin/stories`);
}
 
main().catch((err) => {
  console.error("Weekly story batch failed:", err.message);
  process.exit(1);
});
 
