import {
  users,
  videos,
  subscriptions,
  userActivity,
  r2VideoMetadata,
  stories,
  storyGames,
  courseworkItems,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type Subscription,
  type InsertSubscription,
  type UserActivity,
  type R2VideoMetadata,
  type InsertR2VideoMetadata,
  type Story,
  type InsertStory,
  type StoryGame,
  type InsertStoryGame,
  type CourseworkItem,
  type InsertCourseworkItem,
  banners,
  type Banner,
  type InsertBanner,
  automationSettings,
  type AutomationSettings,
  passwordResetTokens,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  storyViews,
  storyReaderPlays,
  questions,
  type Question,
  type InsertQuestion,
  parentVerificationRequests,
  type InsertParentVerificationRequest,
  type ParentVerificationRequest,
  pollVotes,
  type PollVote,
  type InsertPollVote,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, inArray, not, isNull } from "drizzle-orm";
import { getISOWeek, getISOWeekYear } from "date-fns";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, isSubscribed: boolean, plan?: string): Promise<User>;
  requestTeacherVerification(userId: string): Promise<User>;
  updateTeacherVerificationStatus(userId: string, status: string): Promise<User>;
  getPendingVerificationRequests(): Promise<User[]>;
  getUserPoints(userId: string): Promise<number>;
  addUserPoints(userId: string, points: number): Promise<User>;
  
  getAllVideos(): Promise<Video[]>;
  getVideoById(id: number): Promise<Video | undefined>;
  getFeaturedVideos(): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, video: Partial<InsertVideo>): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  incrementVideoViews(id: number): Promise<void>;
  
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  cancelSubscription(userId: string): Promise<void>;
  
  getTodayActivity(userId: string): Promise<UserActivity | undefined>;
  addActivityTime(userId: string, activityType: 'reading' | 'watching' | 'playing', seconds: number): Promise<UserActivity>;
  
  getAllR2VideoMetadata(): Promise<R2VideoMetadata[]>;
  getR2VideoMetadataByKey(r2Key: string): Promise<R2VideoMetadata | undefined>;
  upsertR2VideoMetadata(data: InsertR2VideoMetadata): Promise<R2VideoMetadata>;
  deleteR2VideoMetadata(r2Key: string): Promise<void>;
  
  getPublishedStories(): Promise<Story[]>;
  getAllStories(): Promise<Story[]>;
  getStoryById(id: number): Promise<Story | undefined>;
  getStoryBySlug(slug: string): Promise<Story | undefined>;
  getFeaturedStory(): Promise<Story | undefined>;
  getFeaturedStories(): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story>;
  deleteStory(id: number): Promise<void>;
  incrementStoryViews(id: number): Promise<void>;
  
  // Story Games
  getGamesByStoryTitle(storyTitle: string): Promise<StoryGame[]>;
  getGameById(id: number): Promise<StoryGame | undefined>;
  getAllGames(): Promise<StoryGame[]>;
  getActiveGames(): Promise<StoryGame[]>;
  getFeaturedGames(): Promise<StoryGame[]>;
  createGame(game: InsertStoryGame): Promise<StoryGame>;
  updateGame(id: number, game: Partial<InsertStoryGame>): Promise<StoryGame>;
  deleteGame(id: number): Promise<void>;
  
  // Polls
  createPollVote(vote: InsertPollVote): Promise<PollVote>;
  getPollVotes(gameId: number): Promise<PollVote[]>;

  // Coursework Marketplace
  getAllCoursework(): Promise<CourseworkItem[]>;
  getPublishedCoursework(): Promise<CourseworkItem[]>;
  getCourseworkById(id: number): Promise<CourseworkItem | undefined>;
  getCourseworkByTeacher(teacherId: string): Promise<CourseworkItem[]>;
  createCoursework(item: InsertCourseworkItem): Promise<CourseworkItem>;
  updateCoursework(id: number, item: Partial<InsertCourseworkItem>): Promise<CourseworkItem>;
  deleteCoursework(id: number): Promise<void>;

  // Questions
  createQuestion(question: InsertQuestion): Promise<Question>;
  getPublishedQuestions(): Promise<Question[]>;
  getAllQuestions(): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  updateQuestion(id: number, question: Partial<Question>): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  
  // Teacher Profile
  getTeachers(): Promise<User[]>;
  getTeacherById(id: string): Promise<User | undefined>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateTeacherProfile(userId: string, data: Partial<User>): Promise<User>;
  
  // User Profile & Settings
  updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  updateUserNotifications(userId: string, data: { marketingEmailsOptIn?: boolean; contentAlertsOptIn?: boolean; teacherUpdatesOptIn?: boolean }): Promise<User>;

  // Automation settings (weekly auto-publish on/off, free access mode)
  getAutomationSettings(): Promise<AutomationSettings>;
  setAutoPublishEnabled(enabled: boolean): Promise<AutomationSettings>;
  setFreeAccessEnabled(enabled: boolean): Promise<AutomationSettings>;
  autoFeatureGame(id: number): Promise<StoryGame>;
  featureStoryAndUnfeatureOthers(id: number): Promise<Story>;

  // Banners
  getBanners(): Promise<Banner[]>;
  getActiveBanners(): Promise<Banner[]>;
  insertBanner(banner: InsertBanner): Promise<Banner>;
  deleteBanner(id: number): Promise<void>;
  updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner>;

  // Password Reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(id: number): Promise<void>;
  deletePasswordResetTokensByUserId(userId: string): Promise<void>;

  addStoryView(storyId: number, userId?: string): Promise<void>;
  addStoryReaderPlay(storyId: number, userId?: string): Promise<void>;
  getAllStoryStats(excludedEmails: string[]): Promise<{ storyId: number; views: number; reads: number }[]>;

  // Parent/Guardian Email Verification
  createParentVerificationRequest(data: InsertParentVerificationRequest): Promise<ParentVerificationRequest>;
  getParentVerificationRequestByTokenHash(tokenHash: string): Promise<ParentVerificationRequest | undefined>;
  getParentVerificationRequestByCodeHash(codeHash: string): Promise<ParentVerificationRequest | undefined>;
  markParentVerificationAsUsed(id: number, verifiedAt: Date): Promise<ParentVerificationRequest>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, isSubscribed: boolean, plan?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isSubscribed,
        subscriptionPlan: plan,
        subscriptionStartDate: isSubscribed ? new Date() : null,
        subscriptionEndDate: isSubscribed ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserPoints(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.points ?? 0;
  }

  async addUserPoints(userId: string, points: number): Promise<User> {
    const existingUser = await this.getUser(userId);
    
    if (!existingUser) {
      throw new Error("User not found");
    }
    
    const [user] = await db
      .update(users)
      .set({
        points: sql`${users.points} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideoById(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async getFeaturedVideos(): Promise<Video[]> {
    // Return first 5 videos as featured (no isFeatured column)
    return await db.select().from(videos).orderBy(desc(videos.createdAt)).limit(5);
  }

  async createVideo(videoData: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(videoData).returning();
    return video;
  }

  async updateVideo(id: number, videoData: Partial<InsertVideo>): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set(videoData)
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  async incrementVideoViews(id: number): Promise<void> {
    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1` })
      .where(eq(videos.id, id));
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async cancelSubscription(userId: string): Promise<void> {
    await db
      .update(subscriptions)
      .set({ status: 'cancelled' })
      .where(eq(subscriptions.userId, userId));
  }

  async getTodayActivity(userId: string): Promise<UserActivity | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [activity] = await db
      .select()
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.date, today)));
    return activity;
  }

  async addActivityTime(userId: string, activityType: 'reading' | 'watching' | 'playing', seconds: number): Promise<UserActivity> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTodayActivity(userId);
    
    if (existing) {
      const updateData: Partial<UserActivity> = {};
      if (activityType === 'reading') {
        updateData.readingTimeSeconds = (existing.readingTimeSeconds || 0) + seconds;
      } else if (activityType === 'watching') {
        updateData.watchingTimeSeconds = (existing.watchingTimeSeconds || 0) + seconds;
      } else {
        updateData.playingTimeSeconds = (existing.playingTimeSeconds || 0) + seconds;
      }
      
      const [updated] = await db
        .update(userActivity)
        .set(updateData)
        .where(eq(userActivity.id, existing.id))
        .returning();
      return updated;
    } else {
      const insertData: any = {
        userId,
        date: today,
        readingTimeSeconds: activityType === 'reading' ? seconds : 0,
        watchingTimeSeconds: activityType === 'watching' ? seconds : 0,
        playingTimeSeconds: activityType === 'playing' ? seconds : 0,
      };
      
      const [created] = await db
        .insert(userActivity)
        .values(insertData)
        .returning();
      return created;
    }
  }

  async getAllR2VideoMetadata(): Promise<R2VideoMetadata[]> {
    return await db.select().from(r2VideoMetadata).orderBy(desc(r2VideoMetadata.createdAt));
  }

  async getR2VideoMetadataByKey(r2Key: string): Promise<R2VideoMetadata | undefined> {
    const [metadata] = await db.select().from(r2VideoMetadata).where(eq(r2VideoMetadata.r2Key, r2Key));
    return metadata;
  }

  async upsertR2VideoMetadata(data: InsertR2VideoMetadata): Promise<R2VideoMetadata> {
    const [metadata] = await db
      .insert(r2VideoMetadata)
      .values(data)
      .onConflictDoUpdate({
        target: r2VideoMetadata.r2Key,
        set: {
          title: data.title,
          description: data.description,
          category: data.category,
          updatedAt: new Date(),
        },
      })
      .returning();
    return metadata;
  }

  async deleteR2VideoMetadata(r2Key: string): Promise<void> {
    await db.delete(r2VideoMetadata).where(eq(r2VideoMetadata.r2Key, r2Key));
  }

  async getPublishedStories(): Promise<Story[]> {
    return await db
      .select()
      .from(stories)
      .where(eq(stories.isPublished, true))
      .orderBy(desc(stories.publishedAt));
  }

  async getAllStories(): Promise<Story[]> {
    return await db.select().from(stories).orderBy(desc(stories.createdAt));
  }

  async getStoryById(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }

  async getStoryBySlug(slug: string): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.slug, slug));
    return story;
  }

  async getFeaturedStory(): Promise<Story | undefined> {
    const [story] = await db
      .select()
      .from(stories)
      .where(and(eq(stories.isPublished, true), eq(stories.isFeatured, true)))
      .orderBy(desc(stories.publishedAt))
      .limit(1);
    return story;
  }

  async getFeaturedStories(): Promise<Story[]> {
    return await db
      .select()
      .from(stories)
      .where(and(eq(stories.isPublished, true), eq(stories.isFeatured, true)))
      .orderBy(desc(stories.publishedAt));
  }

  async createStory(storyData: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(storyData).returning();
    return story;
  }

  async updateStory(id: number, storyData: Partial<InsertStory>): Promise<Story> {
    const [story] = await db
      .update(stories)
      .set({ ...storyData, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return story;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  async incrementStoryViews(id: number): Promise<void> {
    await db
      .update(stories)
      .set({ views: sql`${stories.views} + 1` })
      .where(eq(stories.id, id));
  }

  // Story Games
  async getGamesByStoryTitle(storyTitle: string): Promise<StoryGame[]> {
    return await db
      .select()
      .from(storyGames)
      .where(eq(storyGames.linkedStoryTitle, storyTitle))
      .orderBy(desc(storyGames.createdAt));
  }

  async getGameById(id: number): Promise<StoryGame | undefined> {
    const [game] = await db.select().from(storyGames).where(eq(storyGames.id, id));
    return game;
  }

  async getAllGames(): Promise<StoryGame[]> {
    return await db.select().from(storyGames).orderBy(desc(storyGames.createdAt));
  }

  async getActiveGames(): Promise<StoryGame[]> {
    return await db
      .select()
      .from(storyGames)
      .where(eq(storyGames.isActive, true))
      .orderBy(desc(storyGames.createdAt));
  }

  async getFeaturedGames(): Promise<StoryGame[]> {
    return await db
      .select()
      .from(storyGames)
      .where(and(eq(storyGames.isActive, true), eq(storyGames.isFeatured, true)))
      .orderBy(desc(storyGames.createdAt));
  }

  async createGame(gameData: InsertStoryGame): Promise<StoryGame> {
    const [game] = await db.insert(storyGames).values(gameData).returning();
    return game;
  }

  // Automation settings — single row (id=1), created on first read if missing.
  async getAutomationSettings(): Promise<AutomationSettings> {
    const [existing] = await db.select().from(automationSettings).where(eq(automationSettings.id, 1));
    if (existing) return existing;
    const [created] = await db
      .insert(automationSettings)
      .values({ id: 1, autoPublishEnabled: true })
      .onConflictDoNothing()
      .returning();
    if (created) return created;
    // Lost a race with another request creating row 1 at the same time — just re-read it.
    const [row] = await db.select().from(automationSettings).where(eq(automationSettings.id, 1));
    return row;
  }

  async setAutoPublishEnabled(enabled: boolean): Promise<AutomationSettings> {
    await this.getAutomationSettings(); // make sure the row exists first
    const [updated] = await db
      .update(automationSettings)
      .set({ autoPublishEnabled: enabled, updatedAt: new Date() })
      .where(eq(automationSettings.id, 1))
      .returning();
    return updated;
  }

  async setFreeAccessEnabled(enabled: boolean): Promise<AutomationSettings> {
    await this.getAutomationSettings(); // make sure the row exists first
    const [updated] = await db
      .update(automationSettings)
      .set({ freeAccessEnabled: enabled, updatedAt: new Date() })
      .where(eq(automationSettings.id, 1))
      .returning();
    return updated;
  }

  // Marks a game live + featured, and unfeatures any featured game from an
  // earlier week's batch (games created in the SAME week stay featured
  // together, so a multi-story weekly run doesn't unfeature its own siblings).
  async autoFeatureGame(id: number): Promise<StoryGame> {
    const now = new Date();
    const weekTag = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
    await db
      .update(storyGames)
      .set({ isFeatured: false })
      .where(
        and(
          eq(storyGames.isFeatured, true),
          or(isNull(storyGames.featuredWeek), sql`${storyGames.featuredWeek} <> ${weekTag}`)
        )
      );
    const [game] = await db
      .update(storyGames)
      .set({ isActive: true, isFeatured: true, featuredWeek: weekTag, updatedAt: new Date() })
      .where(eq(storyGames.id, id))
      .returning();
    return game;
  }

  // Marks a story as the featured one, unfeaturing every other story that
  // was previously featured (only one story is ever "the" featured story).
  async featureStoryAndUnfeatureOthers(id: number): Promise<Story> {
    await db
      .update(stories)
      .set({ isFeatured: false })
      .where(and(eq(stories.isFeatured, true), not(eq(stories.id, id))));
    const [story] = await db
      .update(stories)
      .set({ isFeatured: true, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return story;
  }

  async updateGame(id: number, gameData: Partial<InsertStoryGame>): Promise<StoryGame> {
    const [game] = await db
      .update(storyGames)
      .set({ ...gameData, updatedAt: new Date() })
      .where(eq(storyGames.id, id))
      .returning();
    return game;
  }

  async deleteGame(id: number): Promise<void> {
    await db.delete(storyGames).where(eq(storyGames.id, id));
  }

  // Polls
  async createPollVote(vote: InsertPollVote): Promise<PollVote> {
    const [newVote] = await db.insert(pollVotes).values(vote).returning();
    return newVote;
  }

  async getPollVotes(gameId: number): Promise<PollVote[]> {
    return await db.select().from(pollVotes).where(eq(pollVotes.gameId, gameId));
  }

  // Coursework Marketplace
  async getAllCoursework(): Promise<CourseworkItem[]> {
    return await db.select().from(courseworkItems).orderBy(desc(courseworkItems.createdAt));
  }

  async getPublishedCoursework(): Promise<CourseworkItem[]> {
    return await db
      .select()
      .from(courseworkItems)
      .where(eq(courseworkItems.isPublished, true))
      .orderBy(desc(courseworkItems.createdAt));
  }

  async getCourseworkById(id: number): Promise<CourseworkItem | undefined> {
    const [item] = await db.select().from(courseworkItems).where(eq(courseworkItems.id, id));
    return item;
  }

  async getCourseworkByTeacher(teacherId: string): Promise<CourseworkItem[]> {
    return await db
      .select()
      .from(courseworkItems)
      .where(eq(courseworkItems.teacherId, teacherId))
      .orderBy(desc(courseworkItems.createdAt));
  }

  async createCoursework(item: InsertCourseworkItem): Promise<CourseworkItem> {
    const [coursework] = await db.insert(courseworkItems).values(item).returning();
    return coursework;
  }

  async updateCoursework(id: number, item: Partial<InsertCourseworkItem>): Promise<CourseworkItem> {
    const [coursework] = await db
      .update(courseworkItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(courseworkItems.id, id))
      .returning();
    return coursework;
  }

  async deleteCoursework(id: number): Promise<void> {
    await db.delete(courseworkItems).where(eq(courseworkItems.id, id));
  }

  // Teacher Profile
  async getTeachers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.userRole, 'teacher'))
      .orderBy(desc(users.totalSales));
  }

  async getTeacherById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.userRole, 'teacher')));
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ userRole: role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async requestTeacherVerification(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        teacherVerificationStatus: 'pending', 
        verificationRequestedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateTeacherVerificationStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        teacherVerificationStatus: status,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getPendingVerificationRequests(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.userRole, 'teacher'),
        eq(users.teacherVerificationStatus, 'pending')
      ))
      .orderBy(desc(users.verificationRequestedAt));
  }

  async updateTeacherProfile(userId: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        firstName: data.firstName,
        lastName: data.lastName,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  async updateUserNotifications(userId: string, data: { marketingEmailsOptIn?: boolean; contentAlertsOptIn?: boolean; teacherUpdatesOptIn?: boolean }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        marketingEmailsOptIn: data.marketingEmailsOptIn,
        contentAlertsOptIn: data.contentAlertsOptIn,
        teacherUpdatesOptIn: data.teacherUpdatesOptIn,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners).orderBy(desc(banners.createdAt));
  }

  async getActiveBanners(): Promise<Banner[]> {
    return await db.select().from(banners).where(eq(banners.active, true)).orderBy(desc(banners.createdAt));
  }

  async insertBanner(bannerData: InsertBanner): Promise<Banner> {
    const [banner] = await db.insert(banners).values(bannerData).returning();
    return banner;
  }

  async deleteBanner(id: number): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  async updateBanner(id: number, bannerData: Partial<InsertBanner>): Promise<Banner> {
    const [banner] = await db
      .update(banners)
      .set(bannerData)
      .where(eq(banners.id, id))
      .returning();
    return banner;
  }

  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db.insert(passwordResetTokens).values(tokenData).returning();
    return token;
  }

  async getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return token;
  }

  async deletePasswordResetToken(id: number): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
  }

  async deletePasswordResetTokensByUserId(userId: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  }

  async addStoryView(storyId: number, userId?: string): Promise<void> {
    await db.insert(storyViews).values({ storyId, userId });
  }

  async addStoryReaderPlay(storyId: number, userId?: string): Promise<void> {
    await db.insert(storyReaderPlays).values({ storyId, userId });
  }

  async getAllStoryStats(excludedEmails: string[]): Promise<{ storyId: number; views: number; reads: number }[]> {
    const viewsRows = await db
      .select({ storyId: storyViews.storyId, count: sql<number>`count(*)` })
      .from(storyViews)
      .leftJoin(users, eq(storyViews.userId, users.id))
      .where(or(isNull(users.email), not(inArray(users.email, excludedEmails))))
      .groupBy(storyViews.storyId);

    const readsRows = await db
      .select({ storyId: storyReaderPlays.storyId, count: sql<number>`count(*)` })
      .from(storyReaderPlays)
      .leftJoin(users, eq(storyReaderPlays.userId, users.id))
      .where(or(isNull(users.email), not(inArray(users.email, excludedEmails))))
      .groupBy(storyReaderPlays.storyId);

    const map = new Map<number, { views: number; reads: number }>();
    for (const r of viewsRows) {
      map.set(r.storyId, { views: r.count, reads: 0 });
    }
    for (const r of readsRows) {
      const existing = map.get(r.storyId) || { views: 0, reads: 0 };
      existing.reads = r.count;
      map.set(r.storyId, existing);
    }
    return Array.from(map.entries()).map(([storyId, s]) => ({ storyId, views: s.views, reads: s.reads }));
  }

  // Questions Implementation
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  async getPublishedQuestions(): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.isPublished, true))
      .orderBy(desc(questions.answeredAt));
  }

  async getAllQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(desc(questions.createdAt));
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async updateQuestion(id: number, questionData: Partial<Question>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set(questionData)
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async createParentVerificationRequest(data: InsertParentVerificationRequest): Promise<ParentVerificationRequest> {
    const [request] = await db.insert(parentVerificationRequests).values(data).returning();
    return request;
  }

  async getParentVerificationRequestByTokenHash(tokenHash: string): Promise<ParentVerificationRequest | undefined> {
    const [request] = await db
      .select()
      .from(parentVerificationRequests)
      .where(and(eq(parentVerificationRequests.tokenHash, tokenHash), isNull(parentVerificationRequests.verifiedAt)));
    return request;
  }

  async getParentVerificationRequestByCodeHash(codeHash: string): Promise<ParentVerificationRequest | undefined> {
    const [request] = await db
      .select()
      .from(parentVerificationRequests)
      .where(and(eq(parentVerificationRequests.codeHash, codeHash), isNull(parentVerificationRequests.verifiedAt)));
    return request;
  }

  async markParentVerificationAsUsed(id: number, verifiedAt: Date): Promise<ParentVerificationRequest> {
    const [request] = await db
      .update(parentVerificationRequests)
      .set({ verifiedAt })
      .where(eq(parentVerificationRequests.id, id))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
