import { 
  users, 
  stravaTokens, 
  activities,
  type User, 
  type InsertUser,
  type StravaToken,
  type InsertStravaToken,
  type Activity,
  type InsertActivity,
  type UpdateActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Strava token methods
  getStravaTokenByUserId(userId: number): Promise<StravaToken | undefined>;
  upsertStravaToken(token: InsertStravaToken): Promise<StravaToken>;
  updateStravaToken(userId: number, updates: Partial<InsertStravaToken>): Promise<StravaToken | undefined>;
  
  // Activity methods
  getActivitiesByUserId(userId: number): Promise<Activity[]>;
  getActivityByStravaId(stravaId: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, updates: UpdateActivity): Promise<Activity | undefined>;
  upsertActivity(activity: InsertActivity): Promise<Activity>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getStravaTokenByUserId(userId: number): Promise<StravaToken | undefined> {
    const [token] = await db
      .select()
      .from(stravaTokens)
      .where(eq(stravaTokens.userId, userId));
    return token || undefined;
  }

  async upsertStravaToken(token: InsertStravaToken): Promise<StravaToken> {
    const existing = await this.getStravaTokenByUserId(token.userId);
    
    if (existing) {
      const [updated] = await db
        .update(stravaTokens)
        .set({
          ...token,
          updatedAt: new Date(),
        })
        .where(eq(stravaTokens.userId, token.userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(stravaTokens)
        .values(token)
        .returning();
      return created;
    }
  }

  async updateStravaToken(userId: number, updates: Partial<InsertStravaToken>): Promise<StravaToken | undefined> {
    const [updated] = await db
      .update(stravaTokens)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(stravaTokens.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.startDate));
  }

  async getActivityByStravaId(stravaId: string): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.stravaId, stravaId));
    return activity || undefined;
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return created;
  }

  async updateActivity(id: number, updates: UpdateActivity): Promise<Activity | undefined> {
    const [updated] = await db
      .update(activities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, id))
      .returning();
    return updated || undefined;
  }

  async upsertActivity(activity: InsertActivity): Promise<Activity> {
    const existing = await this.getActivityByStravaId(activity.stravaId);
    
    if (existing) {
      const [updated] = await db
        .update(activities)
        .set({
          ...activity,
          updatedAt: new Date(),
        })
        .where(eq(activities.stravaId, activity.stravaId))
        .returning();
      return updated;
    } else {
      return await this.createActivity(activity);
    }
  }
}

export const storage = new DatabaseStorage();
