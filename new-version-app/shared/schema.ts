import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // "student" | "parent"
  grade: text("grade"), // "9A3", "10B1", etc.
  subject: text("subject"), // "math", "physics", etc.
  points: integer("points").default(0),
  streak: integer("streak").default(0),
  level: integer("level").default(1),
  totalXP: integer("total_xp").default(0),
  achievements: text("achievements"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  knowledgeMap: text("knowledge_map").notNull(), // JSON string
  responses: text("responses"), // JSON array of per-item logs
  completedAt: timestamp("completed_at").defaultNow(),
});

export const learningPaths = pgTable("learning_paths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title"),
  subject: text("subject").notNull(),
  duration: integer("duration").notNull(), // in months
  topics: text("topics").notNull(), // JSON array
  priority: text("priority"), // "foundational-gaps" | "enrichment"
  progress: integer("progress").default(0),
  estimatedDuration: text("estimated_duration"), // "3 tuần", "2 tháng"
  status: text("status").default("active"), // "active" | "completed" | "paused"
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameScores = pgTable("game_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gameType: text("game_type"), // "quiz-master", "speed-math", etc.
  score: integer("score").notNull(),
  questionsAnswered: integer("questions_answered"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON array
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  completedAt: true,
});

export const insertLearningPathSchema = createInsertSchema(learningPaths).omit({
  id: true,
  createdAt: true,
});

export const insertGameScoreSchema = createInsertSchema(gameScores).omit({
  id: true,
  completedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type LearningPath = typeof learningPaths.$inferSelect;
export type InsertLearningPath = z.infer<typeof insertLearningPathSchema>;
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
