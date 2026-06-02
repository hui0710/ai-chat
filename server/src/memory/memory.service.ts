import { Injectable, OnModuleInit } from "@nestjs/common";
import * as Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const DB_DIR = path.resolve(__dirname, "../../../data");
const DB_FILE = path.join(DB_DIR, "memory.db");

export interface MoodEntry {
  date: string;
  score: number;
  tag: string | null;
}

interface UserRow {
  userId: string;
  facts: string;
  emotions: string;
  preferences: string;
  events: string;
  moodHistory: string;
  totalChats: number;
  firstChatDate: string;
  lastChatDate: string;
  lastMoodScore: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MemoryService implements OnModuleInit {
  private db: Database.Database;

  onModuleInit() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.db = new Database(DB_FILE);
    this.db.pragma("journal_mode = WAL");
    this.initTable();
  }

  private initTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        userId TEXT PRIMARY KEY,
        facts TEXT DEFAULT '[]',
        emotions TEXT DEFAULT '[]',
        preferences TEXT DEFAULT '[]',
        events TEXT DEFAULT '[]',
        moodHistory TEXT DEFAULT '[]',
        totalChats INTEGER DEFAULT 0,
        firstChatDate TEXT,
        lastChatDate TEXT,
        lastMoodScore INTEGER DEFAULT 5,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);
  }

  private parseJSON(str: string, fallback: any[] = []): any[] {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  getProfile(userId: string): UserRow | null {
    const stmt = this.db.prepare(
      "SELECT * FROM user_profiles WHERE userId = ?",
    );
    return (stmt.get(userId) as UserRow) || null;
  }

  getMemorySummary(userId: string) {
    const row = this.getProfile(userId);
    if (!row) return null;

    const now = new Date();
    const firstDate = new Date(row.firstChatDate);
    const daysSinceFirst = Math.max(
      1,
      Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const facts = this.parseJSON(row.facts).slice(-10);
    const emotions = this.parseJSON(row.emotions);
    const preferences = this.parseJSON(row.preferences).slice(-5);
    const events = this.parseJSON(row.events);
    const recentEmotions = emotions.slice(-5);
    const recentEvents = events.slice(-3);

    let lastMood = "平静";
    if (row.lastMoodScore <= 3) lastMood = "低落";
    else if (row.lastMoodScore <= 5) lastMood = "一般";
    else if (row.lastMoodScore <= 7) lastMood = "还不错";
    else lastMood = "很开心";

    const lastChatDate = new Date(row.lastChatDate);
    const hoursAgo = Math.floor(
      (now.getTime() - lastChatDate.getTime()) / (1000 * 60 * 60),
    );
    let lastChatTime = "刚刚";
    if (hoursAgo >= 24) lastChatTime = `${Math.floor(hoursAgo / 24)}天前`;
    else if (hoursAgo >= 1) lastChatTime = `${hoursAgo}小时前`;

    return {
      daysSinceFirst,
      totalChats: row.totalChats,
      facts,
      recentEmotions,
      preferences,
      recentEvents,
      lastChatTime,
      lastMood,
    };
  }

  updateProfile(
    userId: string,
    extraction: {
      facts?: string[];
      emotions?: string[];
      preferences?: string[];
      events?: string[];
      mood_score?: number;
    },
  ) {
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const existing = this.getProfile(userId);

    if (existing) {
      const facts = this.parseJSON(existing.facts);
      const emotions = this.parseJSON(existing.emotions);
      const preferences = this.parseJSON(existing.preferences);
      const events = this.parseJSON(existing.events);
      const moodHistory = this.parseJSON(existing.moodHistory) as MoodEntry[];

      if (extraction.facts?.length) {
        const merged = [...new Set([...facts, ...extraction.facts])].slice(-20);
        existing.facts = JSON.stringify(merged);
      }
      if (extraction.emotions?.length) {
        const merged = [...emotions, ...extraction.emotions].slice(-30);
        existing.emotions = JSON.stringify(merged);
      }
      if (extraction.preferences?.length) {
        const merged = [
          ...new Set([...preferences, ...extraction.preferences]),
        ].slice(-10);
        existing.preferences = JSON.stringify(merged);
      }
      if (extraction.events?.length) {
        const merged = [...events, ...extraction.events].slice(-20);
        existing.events = JSON.stringify(merged);
      }
      if (extraction.mood_score !== undefined) {
        const newHistory = [
          ...moodHistory,
          {
            date: today,
            score: extraction.mood_score,
            tag: extraction.emotions?.[0] || null,
          },
        ].slice(-60);
        existing.moodHistory = JSON.stringify(newHistory);
        existing.lastMoodScore = extraction.mood_score;
      }

      existing.totalChats += 1;
      existing.lastChatDate = today;
      existing.updatedAt = now;

      const stmt = this.db.prepare(`
        UPDATE user_profiles SET
          facts = ?, emotions = ?, preferences = ?, events = ?,
          moodHistory = ?, totalChats = ?, lastChatDate = ?,
          lastMoodScore = ?, updatedAt = ?
        WHERE userId = ?
      `);
      stmt.run(
        existing.facts,
        existing.emotions,
        existing.preferences,
        existing.events,
        existing.moodHistory,
        existing.totalChats,
        existing.lastChatDate,
        existing.lastMoodScore,
        now,
        userId,
      );
    } else {
      const newProfile = {
        userId,
        facts: JSON.stringify(extraction.facts || []),
        emotions: JSON.stringify(extraction.emotions || []),
        preferences: JSON.stringify(extraction.preferences || []),
        events: JSON.stringify(extraction.events || []),
        moodHistory: JSON.stringify(
          extraction.mood_score
            ? [{ date: today, score: extraction.mood_score, tag: null }]
            : [],
        ),
        totalChats: 1,
        firstChatDate: today,
        lastChatDate: today,
        lastMoodScore: extraction.mood_score || 5,
        createdAt: now,
        updatedAt: now,
      };
      const stmt = this.db.prepare(`
        INSERT INTO user_profiles
          (userId, facts, emotions, preferences, events, moodHistory, totalChats, firstChatDate, lastChatDate, lastMoodScore, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        newProfile.userId,
        newProfile.facts,
        newProfile.emotions,
        newProfile.preferences,
        newProfile.events,
        newProfile.moodHistory,
        newProfile.totalChats,
        newProfile.firstChatDate,
        newProfile.lastChatDate,
        newProfile.lastMoodScore,
        newProfile.createdAt,
        newProfile.updatedAt,
      );
    }
  }

  getMoodHistory(userId: string, days: number = 7): MoodEntry[] {
    const row = this.getProfile(userId);
    if (!row) return [];
    const history = this.parseJSON(row.moodHistory) as MoodEntry[];
    return history.slice(-days);
  }

  getAnniversary(
    userId: string,
  ): { days: number; isAnniversary: boolean } | null {
    const row = this.getProfile(userId);
    if (!row) return null;
    const firstDate = new Date(row.firstChatDate);
    const now = new Date();
    const days = Math.floor(
      (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const milestones = [7, 14, 30, 60, 90, 100, 180, 365];
    return { days, isAnniversary: milestones.includes(days) };
  }
}
