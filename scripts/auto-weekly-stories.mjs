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
 *
 * Requires the "sharp" package for the banner text overlay:
 *   npm install sharp --legacy-peer-deps
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import sharp from "sharp";

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

// --- recent topic history (avoids repeats week over week) ---
const HISTORY_PATH = join(__dirname, "recent-topics.json");
const HISTORY_MAX = 60;

function loadRecentTitles() {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
    return Array.isArray(data.titles) ? data.titles : [];
  } catch {
    return [];
  }
}

function saveRecentTitles(existingTitles, newTitles) {
  const combined = [...existingTitles, ...newTitles].slice(-HISTORY_MAX);
  writeFileSync(HISTORY_PATH, JSON.stringify({ titles: combined }, null, 2));
}

// --- Claude: pick 3 distinct topics, one per given category, avoiding repeats ---
async function pickGeneralTopics(categories, recentTitles) {
  const avoidList = recentTitles.length
    ? `\n\nAvoid repeating or closely resembling any of these recently used story titles/topics:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
    : "";

  const prompt = `You help plan a kids' educational news platform called WhyPals.

Suggest exactly one distinct, specific, kid-friendly (ages 7-12) story topic for EACH of these categories, in this order: ${categories.join(", ")}. The 3 topics must be completely different from each other — no overlapping subjects (e.g. do not suggest "why leaves change color" for two different categories).${avoidList}

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "topics": [
    { "category": "${categories[0]}", "topic": "..." },
    { "category": "${categories[1]}", "topic": "..." },
    { "category": "${categories[2]}", "topic": "..." }
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
  return parsed.topics;
}

// --- Claude: pick 3 distinct angles under a theme ---
async function pickThemeAngles(theme, recentTitles) {
  const avoidList = recentTitles.length
    ? `\n\nAvoid repeating or closely resembling any of these recently used story titles/topics:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
    : "";

  const prompt = `You help plan a kids' educational news platform called WhyPals.

This week's theme is "${theme}". Suggest exactly 3 distinct, non-overlapping story angles/topics within this theme, suitable for kids ages 7-12. Each angle should be specific enough to write a full short story about (not vague), and each should also have a "bestFitCategory" — the single best match from this fixed list: Science, Nature, Sports, World, Fun.${avoidList}

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

async function updateBanner(token, id, updates) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/banners/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Update banner failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function createBanner(token, bannerPayload) {
  const res = await fetch(`${WHYPALS_BASE_URL}/api/banners`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(bannerPayload),
  });
  if (!res.ok) throw new Error(`Create banner failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function uploadBannerImage(token, buffer, mimeType) {
  const form = new FormData();
  const ext = mimeType.includes("png") ? "png" : "jpg";
  form.append("image", new Blob([buffer], { type: mimeType }), `banner.${ext}`);
  const res = await fetch(`${WHYPALS_BASE_URL}/api/admin/upload/banner`, {
    method: "POST",
    headers: { "x-admin-token": token },
    body: form,
  });
  if (!res.ok) throw new Error(`Banner upload failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.imageUrl;
}

// --- Pollinations.ai: generate a TEXT-FREE illustrated background ---
// Free, no API key, no billing. Open image models are unreliable at
// rendering legible text, so we never ask it to draw any — the headline
// is composited on afterward with real rendered text (see composeBannerImage).
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 630;

async function generateBannerBackground(theme) {
  const prompt = `Bright playful flat-vector cartoon illustration background for a kids educational website banner. Cute simple characters and objects representing the theme "${theme}". Cheerful colorful palette, rounded shapes, no photorealism, no watermark. Absolutely no text, no words, no letters, no writing, no typography anywhere in the image. Wide landscape composition with open space in the lower-middle area for a text overlay to be added later.`;

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${BANNER_WIDTH}&height=${BANNER_HEIGHT}&nologo=true&model=flux`;

  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "image/*" } });
      if (!res.ok) throw new Error(`Pollinations API error ${res.status}: ${await res.text()}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(`Pollinations did not return an image (got ${contentType || "unknown content-type"})`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
      console.warn(`[banner] Pollinations attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err.message);
    }
  }
  throw lastErr;
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Stamps the theme title onto the background as real, guaranteed-legible
// text (bold rounded font, dark outline, semi-transparent backing pill for
// contrast against any background) instead of relying on the AI model to
// draw it. Returns a PNG buffer.
async function composeBannerImage(backgroundBuffer, theme) {
  const fitted = await sharp(backgroundBuffer)
    .resize(BANNER_WIDTH, BANNER_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();

  // Rough width estimate to size the backing pill: ~0.6em per character at this weight/size.
  const fontSize = theme.length > 22 ? 56 : theme.length > 15 ? 68 : 84;
  const estTextWidth = theme.length * fontSize * 0.62;
  const pillWidth = Math.min(BANNER_WIDTH - 80, estTextWidth + 100);
  const pillHeight = fontSize + 60;
  const pillX = (BANNER_WIDTH - pillWidth) / 2;
  const pillY = BANNER_HEIGHT * 0.62 - pillHeight / 2;

  const svg = `
<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .headline {
      font-family: 'DejaVu Sans', Verdana, Arial, sans-serif;
      font-weight: 900;
      font-size: ${fontSize}px;
      fill: #FFFFFF;
      stroke: #1a3c6e;
      stroke-width: 8;
      paint-order: stroke fill;
    }
  </style>
  <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}"
        fill="#0f2a52" fill-opacity="0.35" />
  <text x="50%" y="${BANNER_HEIGHT * 0.62 + fontSize * 0.32}" text-anchor="middle" class="headline">${escapeXml(theme)}</text>
</svg>`;

  return sharp(fitted)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

// --- Local tracking of the last auto-created theme banner, so next week's
// run can deactivate it without touching any banners you manage by hand. ---
const LAST_BANNER_PATH = join(__dirname, ".last-theme-banner.json");

function loadLastBanner() {
  if (!existsSync(LAST_BANNER_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LAST_BANNER_PATH, "utf8"));
  } catch {
    return null;
  }
}

function saveLastBanner(bannerId, theme) {
  writeFileSync(LAST_BANNER_PATH, JSON.stringify({ bannerId, theme }, null, 2));
}

// Generates the theme banner, deactivates last week's auto-created banner
// (if any), and activates the new one. Never throws — a banner failure
// should never take down the story batch.
async function manageThemeBanner(token, theme) {
  try {
    console.log(`\n[banner] Generating background illustration for "${theme}"...`);
    const background = await generateBannerBackground(theme);

    console.log("[banner] Compositing headline text onto banner...");
    const finalImage = await composeBannerImage(background, theme);

    console.log("[banner] Uploading banner image...");
    const imageUrl = await uploadBannerImage(token, finalImage, "image/png");

    const last = loadLastBanner();
    if (last?.bannerId) {
      console.log(`[banner] Deactivating last week's auto-created banner (#${last.bannerId}, "${last.theme}")...`);
      try {
        await updateBanner(token, last.bannerId, { active: false });
      } catch (err) {
        console.warn("[banner] Failed to deactivate previous banner (continuing):", err.message);
      }
    }

    console.log("[banner] Creating new active banner...");
    const banner = await createBanner(token, {
      title: theme,
      imageUrl,
      active: true,
      order: 0,
    });

    saveLastBanner(banner.id, theme);
    console.log(`[banner] Done — banner #${banner.id} is now live for "${theme}".`);
  } catch (err) {
    console.warn("[banner] Theme banner generation failed (stories are unaffected):", err.message);
  }
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

  // Theme banner is independent of the story batch — do it first so a
  // banner failure/refusal never gets skipped due to an earlier crash.
  if (theme) {
    await manageThemeBanner(token, theme);
  }

  const recentTitles = loadRecentTitles();
  const created = [];
  const newTitles = [];

  // 3 general stories, 3 distinct random categories, topics picked together
  // in one call so they can't overlap with each other (or with recent history).
  const shuffled = [...NORMAL_CATEGORIES].sort(() => Math.random() - 0.5);
  const generalCategories = shuffled.slice(0, 3);
  console.log(`\nPicking 3 distinct general topics for: ${generalCategories.join(", ")}...`);
  const generalTopics = await pickGeneralTopics(generalCategories, recentTitles);
  for (const t of generalTopics) {
    const story = await buildAndPostStory({
      token,
      categories: [t.category],
      topicHint: t.topic,
      themeContext: undefined,
      label: `general/${t.category}`,
    });
    created.push(story);
    newTitles.push(story.title);
  }

  // 3 themed stories, if a theme is scheduled for today
  if (theme) {
    console.log(`\nPicking 3 angles for theme "${theme}"...`);
    const angles = await pickThemeAngles(theme, [...recentTitles, ...newTitles]);
    for (const angle of angles) {
      const story = await buildAndPostStory({
        token,
        categories: ["Weekly Theme", angle.bestFitCategory],
        topicHint: angle.topic,
        themeContext: theme,
        label: `theme/${angle.bestFitCategory}`,
      });
      created.push(story);
      newTitles.push(story.title);
    }
  }

  saveRecentTitles(recentTitles, newTitles);

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
