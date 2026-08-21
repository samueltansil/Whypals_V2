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
 * Also generates the weekly theme banner automatically: Claude picks the
 * best-fitting real photo from an Unsplash search for the theme, picks a
 * matching text color + gradient tint, and the headline is stamped on with
 * "sharp" (a real gradient scrim + drop shadow, not AI-drawn text) so it's
 * always legible. Requires the "sharp" package:
 *   npm install sharp --legacy-peer-deps
 *
 * Uses the same .env.automation file as auto-story.mjs (project root).
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

// --- CLI args (parsed once, used throughout) ---
// --date=YYYY-MM-DD     : pretend today is this date (for testing a specific week)
// --theme="Some Theme"  : force this week's theme instead of looking it up in weekly-themes.json
// --banner-only         : skip the 6 stories entirely, just (re)generate + activate the theme banner
const CLI_ARGS = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, "").split("=");
    return [k, rest.join("=") || true];
  })
);

function todayISO() {
  if (CLI_ARGS.date) return CLI_ARGS.date;
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function loadThemeForToday() {
  if (CLI_ARGS.theme) return CLI_ARGS.theme;

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
// Using the "raw" URL + explicit width/quality params gets Unsplash's
// original full-resolution source, resized server-side at high quality —
// noticeably sharper than the pre-downsampled "regular" (1080px) size.
function unsplashHiRes(photo, width) {
  return `${photo.urls.raw}&w=${width}&q=85&fit=max&auto=format`;
}

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
  return { url: unsplashHiRes(photo, 1600), credit: `Photo by ${photo.user.name} on Unsplash` };
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

// --- Banner: a real Unsplash photo + AI-picked photo/style + rendered headline ---
// Claude does two jobs here: (1) pick the best-fitting photo from a shortlist
// of real Unsplash search results, using their descriptions/colors — no
// AI-drawn art, so no garbled-text risk; (2) pick a text color + a scrim
// tint that suits that specific photo's mood, so the styling actually
// varies week to week instead of being one hardcoded look.
const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 630;

async function searchUnsplashCandidates(theme) {
  const query = encodeURIComponent(theme.replace(/\bweek\b/i, "").trim() || theme);
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=8&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) throw new Error(`Unsplash API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.results || []).map((p) => ({
    url: unsplashHiRes(p, 1600), // banner is 1200 wide but gets upscaled/zoomed on mobile — extra headroom keeps it sharp
    description: p.description || p.alt_description || "",
    color: p.color,
  }));
}

// --- Claude: pick the best candidate photo + a matching text style ---
async function pickBannerPhotoAndStyle(theme, candidates) {
  const listing = candidates
    .map((c, i) => `${i}: description="${c.description || "(none)"}", dominant color=${c.color || "unknown"}`)
    .join("\n");

  const prompt = `You are styling a hero banner image for a kids' educational website. This week's theme is "${theme}".

Here are real photo candidates found via Unsplash search (index: description, dominant color):
${listing}

Pick the single best photo for a wide banner background representing this theme (prefer clear, evocative, uncluttered photos — avoid ones with existing text/logos implied by the description, avoid close-up faces of real identifiable people). Then choose a text style for a bold headline that will sit over the BOTTOM portion of that photo on a dark gradient scrim:
- "textColor": a hex color for the headline text that will read clearly on a dark scrim (usually a bright white or warm cream, occasionally a bright accent color if it suits the theme)
- "scrimColor": a hex color for the gradient shadow behind the text, chosen to harmonize with the photo's dominant color (e.g. a deep navy for ocean photos, a warm deep brown for autumn/school photos) rather than always plain black

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{ "bestIndex": 0, "textColor": "#FFFFFF", "scrimColor": "#04203d" }`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? "";
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(jsonText);
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// The site displays this same 1200x630 image in very different crops:
// desktop shows most/all of it, but mobile puts it in a much narrower
// aspect-[4/3] box via object-cover AND applies an extra 110% CSS zoom
// just for banners — which together only show roughly the centered
// x:220-980, y:30-600 region of the original image. Anything outside that
// (like text anchored near the left edge) gets cropped off on mobile.
const MOBILE_SAFE_WIDTH = 760; // px, centered
const MOBILE_SAFE_MAX_TEXT_WIDTH = MOBILE_SAFE_WIDTH - 80; // margin inside the safe zone

// Composites a bold, VERTICALLY CENTERED headline over a soft horizontal
// gradient band (no boxed "pill" — a feathered dark band like a movie
// poster or blog hero image). The banner is cropped differently on mobile
// (horizontal crop, generous vertical range) vs. desktop (fixed-height,
// flexible-width container that crops vertically as the window widens) —
// so the ONLY zone safe for both is near the vertical center of the image.
// Text is sized to stay inside the mobile-safe horizontal zone above, and
// positioned at the vertical midpoint so it survives the desktop crop too.
async function composeBannerImage(photoBuffer, theme, style) {
  const fitted = await sharp(photoBuffer)
    .resize(BANNER_WIDTH, BANNER_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();

  // Shrink font size until the (roughly estimated) text width fits inside
  // the mobile-safe zone, so the headline survives the mobile crop+zoom.
  const CHAR_WIDTH_FACTOR = 0.62; // rough average glyph width as a fraction of font-size, for this bold font
  let fontSize = 92;
  while (
    fontSize > 32 &&
    theme.length * fontSize * CHAR_WIDTH_FACTOR > MOBILE_SAFE_MAX_TEXT_WIDTH
  ) {
    fontSize -= 2;
  }

  const textColor = /^#[0-9a-f]{6}$/i.test(style?.textColor || "") ? style.textColor : "#FFFFFF";
  const scrimColor = /^#[0-9a-f]{6}$/i.test(style?.scrimColor || "") ? style.scrimColor : "#04203d";

  const centerY = BANNER_HEIGHT / 2;

  const svg = `
<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${scrimColor}" stop-opacity="0"/>
      <stop offset="32%" stop-color="${scrimColor}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${scrimColor}" stop-opacity="0.72"/>
      <stop offset="68%" stop-color="${scrimColor}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${scrimColor}" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#band)" />
  <text x="50%" y="${centerY + fontSize * 0.32}" text-anchor="middle"
        font-family="'DejaVu Sans', Verdana, Arial, sans-serif" font-weight="900"
        font-size="${fontSize}" letter-spacing="1" fill="${textColor}" filter="url(#shadow)">${escapeXml(theme)}</text>
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
    console.log(`\n[banner] Searching Unsplash for candidate photos for "${theme}"...`);
    const candidates = await searchUnsplashCandidates(theme);
    if (candidates.length === 0) {
      console.warn("[banner] No Unsplash results for this theme — skipping banner.");
      return;
    }

    console.log(`[banner] Asking Claude to pick the best of ${candidates.length} photos + a matching style...`);
    const style = await pickBannerPhotoAndStyle(theme, candidates);
    const chosen = candidates[style.bestIndex] || candidates[0];
    console.log(`[banner] Picked photo #${style.bestIndex}, textColor=${style.textColor}, scrimColor=${style.scrimColor}`);

    const photoRes = await fetch(chosen.url);
    if (!photoRes.ok) throw new Error(`Failed to download chosen photo: ${photoRes.status}`);
    const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

    console.log("[banner] Compositing headline text onto banner...");
    const finalImage = await composeBannerImage(photoBuffer, theme, style);

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
  } else if (CLI_ARGS["banner-only"]) {
    console.warn("--banner-only set but no theme resolved — pass --theme=\"...\" too. Nothing to do.");
  }

  if (CLI_ARGS["banner-only"]) {
    console.log("\n--banner-only set — skipping story generation.");
    return;
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
