import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: varchar("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentVerificationRequests = pgTable("parent_verification_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  parentEmail: varchar("parent_email").notNull(),
  tokenHash: varchar("token_hash").notNull(),
  codeHash: varchar("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  privacyVersion: varchar("privacy_version", { length: 50 }),
  registrationData: jsonb("registration_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_parent_verification_token").on(table.tokenHash),
  index("idx_parent_verification_code").on(table.codeHash),
]);
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  points: integer("points").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isSubscribed: boolean("is_subscribed").default(false).notNull(),
  subscriptionPlan: varchar("subscription_plan"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  userRole: varchar("user_role", { length: 20 }),
  teacherVerificationStatus: varchar("teacher_verification_status", { length: 20 }).default("unverified"),
  verificationRequestedAt: timestamp("verification_requested_at"),
  bio: text("bio"),
  subjectsTaught: text("subjects_taught"),
  experienceYears: integer("experience_years"),
  reputationScore: integer("reputation_score").default(0),
  totalSales: integer("total_sales").default(0),
  badges: jsonb("badges"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  agreedToTerms: boolean("agreed_to_terms").default(false).notNull(),
  agreedToTermsAt: timestamp("agreed_to_terms_at"),
  marketingEmailsOptIn: boolean("marketing_emails_opt_in").default(false).notNull(),
  contentAlertsOptIn: boolean("content_alerts_opt_in").default(true).notNull(),
  teacherUpdatesOptIn: boolean("teacher_updates_opt_in").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const videos = pgTable("videos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: varchar("duration").notNull(),
  thumbnail: text("thumbnail").notNull(),
  videoUrl: text("video_url").notNull(),
  category: varchar("category").notNull(),
  views: integer("views").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  linkedStoryTitle: varchar("linked_story_title", { length: 255 }),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_videos_linked_title").on(table.linkedStoryTitle),
]);

export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  plan: varchar("plan").notNull(),
  status: varchar("status").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userActivity = pgTable("user_activity", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: varchar("date").notNull(),
  readingTimeSeconds: integer("reading_time_seconds").default(0).notNull(),
  watchingTimeSeconds: integer("watching_time_seconds").default(0).notNull(),
  playingTimeSeconds: integer("playing_time_seconds").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const r2VideoMetadata = pgTable("r2_video_metadata", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  r2Key: varchar("r2_key").unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stories = pgTable("stories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: jsonb("category").$type<string[]>().notNull(),
  thumbnail: text("thumbnail").notNull(),
  thumbnailCredit: text("thumbnail_credit"),
  views: integer("views").default(0).notNull(),
  readTime: varchar("read_time").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  authorId: varchar("author_id").references(() => users.id),
  // When true, publishing this story should NOT auto-generate a linked game —
  // set when an admin explicitly declined a game at creation time (e.g. the
  // "Generate from Topic" flow's "Also generate a game" switch, left off).
  skipAutoGame: boolean("skip_auto_game").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  subscriptions: many(subscriptions),
}));

export const videoRelations = relations(videos, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [videos.uploadedBy],
    references: [users.id],
  }),
}));

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertVideo = typeof videos.$inferInsert;
export type Video = typeof videos.$inferSelect;

export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertUserActivity = typeof userActivity.$inferInsert;
export type UserActivity = typeof userActivity.$inferSelect;

export type InsertR2VideoMetadata = typeof r2VideoMetadata.$inferInsert;
export type R2VideoMetadata = typeof r2VideoMetadata.$inferSelect;

export type InsertStory = typeof stories.$inferInsert;
export type Story = typeof stories.$inferSelect;

export const insertVideoSchema = createInsertSchema(videos).omit({
  createdAt: true,
});

export const updateVideoSchema = createInsertSchema(videos).omit({
  createdAt: true,
  uploadedBy: true,
  views: true,
}).partial();

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  createdAt: true,
});

export const insertR2VideoMetadataSchema = createInsertSchema(r2VideoMetadata).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  createdAt: true,
  updatedAt: true,
  views: true,
}).extend({
  category: z.array(z.string()),
});

export const updateStorySchema = createInsertSchema(stories).omit({
  createdAt: true,
  updatedAt: true,
  views: true,
}).partial().extend({
  category: z.array(z.string()).optional(),
});

// Game templates linked to stories by title for scalability
export const storyGames = pgTable("story_games", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameType: varchar("game_type", { length: 50 }).notNull(), // puzzle, quiz, whack, timeline, poll, fillblank, truefalse, scramble, guessnumber, oddoneout, emojidecoder ("match" is a legacy type kept for old games only — no longer offered for new ones)
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  funFacts: text("fun_facts"),
  howToPlay: text("how_to_play"),
  linkedStoryTitle: varchar("linked_story_title", { length: 255 }),
  pointsReward: integer("points_reward").default(10).notNull(),
  config: jsonb("config").notNull(),
  category: jsonb("category").$type<string[]>().default([]).notNull(),
  backgroundMusicUrl: text("background_music_url"),
  soundEffectsEnabled: boolean("sound_effects_enabled").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  // ISO week tag (e.g. "2026-W34") set when a game is auto-featured, so a new
  // week's batch of auto-published games can replace the previous week's
  // featured batch without unfeaturing siblings created in the same run.
  featuredWeek: varchar("featured_week", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_story_games_linked_title").on(table.linkedStoryTitle),
  index("idx_story_games_game_type").on(table.gameType),
]);

export const pollVotes = pgTable("poll_votes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: integer("game_id").references(() => storyGames.id).notNull(),
  questionId: varchar("question_id").notNull(),
  optionIndex: integer("option_index").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_poll_votes_game").on(table.gameId),
  index("idx_poll_votes_user").on(table.userId),
]);

export type InsertStoryGame = typeof storyGames.$inferInsert;
export type StoryGame = typeof storyGames.$inferSelect;
export type InsertPollVote = typeof pollVotes.$inferInsert;
export type PollVote = typeof pollVotes.$inferSelect;

export const insertStoryGameSchema = createInsertSchema(storyGames).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.array(z.string()),
});

export const updateStoryGameSchema = createInsertSchema(storyGames).omit({
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  category: z.array(z.string()).optional(),
});

// Type definitions for game configs
export interface PuzzleGameConfig {
  imageUrl: string;
  gridSize: number; // 3x3, 4x4, etc.
  hintText?: string;
  winMessage?: string;
}

export interface MatchGameConfig {
  pairs: Array<{
    id: string;
    front: string; // text or image URL
    back: string; // matching text or image URL
  }>;
  winMessage?: string;
}

export interface QuizGameConfig {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  passingScore?: number;
  winMessage?: string;
}

export interface WhackGameConfig {
  targetImage: string;
  targetLabel: string;
  distractorImages: string[];
  distractorLabels: string[];
  backgroundImage?: string;
  holeOuterColor?: string;
  holeInnerColor?: string;
  duration: number; // seconds
  winMessage?: string;
}

export interface TimelineGameConfig {
  events: Array<{
    id: string;
    title: string;
    description?: string;
    image?: string;
    order: number;
  }>;
  winMessage?: string;
}

export interface PollGameConfig {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
  }>;
  winMessage?: string;
}

export interface FillBlankGameConfig {
  blanks: Array<{
    id: string;
    sentence: string; // the sentence with a blank shown as "___"
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  winMessage?: string;
}

export interface TrueFalseGameConfig {
  statements: Array<{
    id: string;
    statement: string;
    isTrue: boolean;
    explanation?: string;
  }>;
  secondsPerStatement?: number; // countdown per statement, default 8
  winMessage?: string;
}

export interface PictureScrambleGameConfig {
  imageUrl: string;
  word: string; // the word to unscramble, shown as scrambled letter tiles
  clue?: string;
  winMessage?: string;
}

export interface GuessNumberGameConfig {
  question: string; // e.g. "How many times per second can a woodpecker peck?"
  answer: number;
  unit?: string; // e.g. "pecks per second"
  maxGuesses?: number; // default 6
  funFactAfter?: string;
  winMessage?: string;
}

export interface OddOneOutGameConfig {
  rounds: Array<{
    id: string;
    statements: string[]; // exactly 4 — one of them (fakeIndex) is made up
    fakeIndex: number;
    explanation?: string;
  }>;
  winMessage?: string;
}

export interface EmojiDecoderGameConfig {
  rounds: Array<{
    id: string;
    emojiClue: string; // e.g. "🦔🌰❄️"
    options: string[];
    correctIndex: number;
    explanation?: string;
  }>;
  winMessage?: string;
}

// Teacher Coursework Marketplace
export const courseworkItems = pgTable("coursework_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teacherId: varchar("teacher_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  itemType: varchar("item_type", { length: 50 }).notNull(), // pdf_worksheet, unit_plan, lesson_bundle, homework_pack, reading_comprehension, project_assignment, video, quiz
  subject: varchar("subject", { length: 100 }),
  fileKey: varchar("file_key"), // R2 file key for uploaded files
  linkUrl: text("link_url"), // External link (YouTube, etc.)
  linkedArticleId: integer("linked_article_id").references(() => stories.id),
  price: integer("price").default(0).notNull(), // in cents
  salesCount: integer("sales_count").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_coursework_teacher").on(table.teacherId),
  index("idx_coursework_type").on(table.itemType),
  index("idx_coursework_subject").on(table.subject),
]);

export const banners = pgTable("banners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: text("image_url").notNull(),
  active: boolean("active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertBanner = typeof banners.$inferInsert;
export type Banner = typeof banners.$inferSelect;

// Single-row table (id is always 1) controlling whether weekly automation
// (auto-generated games, and the weekly theme story) goes live immediately
// or waits in a draft/inactive state for manual review in /admin.
export const automationSettings = pgTable("automation_settings", {
  id: integer("id").primaryKey().default(1),
  autoPublishEnabled: boolean("auto_publish_enabled").default(true).notNull(),
  // Site-wide "free access" switch (toggled from /admin/banners): when true,
  // the login/register pages show a friendly "not needed right now" message
  // instead of the real forms, the profile icon no longer links to login,
  // and games no longer require being logged in to play.
  freeAccessEnabled: boolean("free_access_enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AutomationSettings = typeof automationSettings.$inferSelect;

export const insertBannerSchema = createInsertSchema(banners).omit({
  createdAt: true,
});

export const courseworkItemsRelations = relations(courseworkItems, ({ one }) => ({
  teacher: one(users, {
    fields: [courseworkItems.teacherId],
    references: [users.id],
  }),
  linkedArticle: one(stories, {
    fields: [courseworkItems.linkedArticleId],
    references: [stories.id],
  }),
}));

export type InsertCourseworkItem = typeof courseworkItems.$inferInsert;
export type CourseworkItem = typeof courseworkItems.$inferSelect;

export const insertCourseworkItemSchema = createInsertSchema(courseworkItems).omit({
  createdAt: true,
  updatedAt: true,
  salesCount: true,
});

export const updateCourseworkItemSchema = createInsertSchema(courseworkItems).omit({
  createdAt: true,
  updatedAt: true,
  teacherId: true,
  salesCount: true,
}).partial();

// Coursework item types
export const COURSEWORK_TYPES = [
  { id: 'pdf_worksheet', label: 'PDF Worksheet' },
  { id: 'unit_plan', label: 'Unit Plan' },
  { id: 'lesson_bundle', label: 'Weekly Lesson Bundle' },
  { id: 'homework_pack', label: 'Homework Pack' },
  { id: 'reading_comprehension', label: 'Reading Comprehension Set' },
  { id: 'project_assignment', label: 'Project-Based Learning Assignment' },
  { id: 'video', label: 'Educational Video' },
  { id: 'quiz', label: 'Quiz (tied to NewsPals article)' },
] as const;

export const SUBJECTS = [
  'Math',
  'Science',
  'English',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Social Studies',
  'Technology',
  'Foreign Language',
  'Other',
] as const;

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export const storyViews = pgTable("story_views", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  userId: varchar("user_id"), // Optional user ID for tracking logged-in users
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const storyReaderPlays = pgTable("story_reader_plays", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  userId: varchar("user_id"), // Optional: if we want to track user (though current auth might be session-based or minimal)
  question: text("question").notNull(),
  answer: text("answer"),
  isPublished: boolean("is_published").default(false).notNull(),
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertQuestion = typeof questions.$inferInsert;
export type Question = typeof questions.$inferSelect;

export const insertQuestionSchema = createInsertSchema(questions).omit({
  createdAt: true,
  answer: true,
  isPublished: true,
  answeredAt: true,
});

export const updateQuestionSchema = createInsertSchema(questions, {
  answeredAt: z.union([z.string().pipe(z.coerce.date()), z.null()]),
}).omit({
  createdAt: true,
  storyId: true,
  userId: true,
}).partial();

export type InsertParentVerificationRequest = typeof parentVerificationRequests.$inferInsert;
export type ParentVerificationRequest = typeof parentVerificationRequests.$inferSelect;
