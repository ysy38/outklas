import { boolean, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("learner"),
  targetScore: integer("target_score"),
  examDate: text("exam_date"),
  dailyMinutes: integer("daily_minutes"),
  priorScore: integer("prior_score"),
  estimatedLow: integer("estimated_low"),
  estimatedHigh: integer("estimated_high"),
  exam: text("exam").notNull().default("yds"),
  streak: integer("streak").notNull().default(0),
  lastMissionDate: text("last_mission_date"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stimuli = pgTable("stimuli", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
});

export const items = pgTable("items", {
  id: text("id").primaryKey(),
  slot: integer("slot"),
  section: text("section").notNull(),
  layout: text("layout").notNull(),
  direction: text("direction"),
  stem: text("stem").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: integer("difficulty").notNull(),
  status: text("status").notNull().default("draft"),
  stimulusId: text("stimulus_id"),
});

export const choices = pgTable("choices", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull(),
  position: integer("position").notNull(),
  body: text("body").notNull(),
  correct: boolean("correct").notNull(),
  distractorType: text("distractor_type"),
});

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
});

export const itemSkills = pgTable(
  "item_skills",
  {
    itemId: text("item_id").notNull(),
    skillId: text("skill_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.skillId] })],
);

export const vocabulary = pgTable("vocabulary", {
  id: text("id").primaryKey(),
  word: text("word").notNull(),
  meaningTr: text("meaning_tr").notNull(),
  partOfSpeech: text("part_of_speech").notNull(),
  example: text("example").notNull(),
});

export const vocabLinks = pgTable("vocab_links", {
  id: text("id").primaryKey(),
  fromId: text("from_id").notNull(),
  toId: text("to_id").notNull(),
  kind: text("kind").notNull(),
});

export const itemVocabulary = pgTable(
  "item_vocabulary",
  {
    itemId: text("item_id").notNull(),
    vocabularyId: text("vocabulary_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.vocabularyId] })],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id"),
  guestId: text("guest_id"),
  mode: text("mode").notNull(),
  exam: text("exam").notNull().default("yds"),
  status: text("status").notNull().default("active"),
  score: real("score"),
  correctCount: integer("correct_count"),
  wrongCount: integer("wrong_count"),
  blankCount: integer("blank_count"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
});

export const sessionItems = pgTable(
  "session_items",
  {
    sessionId: uuid("session_id").notNull(),
    itemId: text("item_id").notNull(),
    position: integer("position").notNull(),
    flagged: boolean("flagged").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.itemId] })],
);

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey(),
  sessionId: uuid("session_id").notNull(),
  profileId: uuid("profile_id"),
  itemId: text("item_id").notNull(),
  choiceId: text("choice_id"),
  correct: boolean("correct"),
  responseTimeMs: integer("response_time_ms").notNull().default(0),
  confidence: text("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mastery = pgTable(
  "mastery",
  {
    profileId: uuid("profile_id").notNull(),
    skillId: text("skill_id").notNull(),
    mastery: integer("mastery").notNull(),
    confidence: integer("confidence").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correctAttempts: integer("correct_attempts").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.skillId] })],
);

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  profileId: uuid("profile_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  step: integer("step").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  stabilityDays: real("stability_days").notNull().default(0),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id").notNull(),
  planDate: text("plan_date").notNull(),
  payload: jsonb("payload").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  profileId: uuid("profile_id").primaryKey(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id"),
  name: text("name").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
