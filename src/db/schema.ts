import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`);

// One row per Gateway user (`user.id`), written the first time they open the app.
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: createdAt(),
});

export const classes = sqliteTable(
  "classes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    grade: text("grade").notNull().default(""),
    schoolYear: text("school_year").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("classes_owner_idx").on(t.ownerId)],
);

export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    classId: text("class_id").notNull(),
    name: text("name").notNull(),
    accessCode: text("access_code").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("students_code_idx").on(t.accessCode),
    index("students_class_idx").on(t.classId),
  ],
);

export interface LessonStage {
  name: string;
  minutes: number;
  activity: string;
}

export const lessonPlans = sqliteTable(
  "lesson_plans",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    classId: text("class_id"),
    date: text("date").notNull(),
    subject: text("subject").notNull().default(""),
    topic: text("topic").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(45),
    objectives: text("objectives").notNull().default(""),
    strategies: text("strategies").notNull().default(""),
    stages: text("stages", { mode: "json" })
      .$type<LessonStage[]>()
      .notNull()
      .default(sql`'[]'`),
    materials: text("materials").notNull().default(""),
    assessment: text("assessment").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("plans_owner_date_idx").on(t.ownerId, t.date)],
);

export type QuestionKind = "choice" | "short" | "open";

export interface Question {
  id: string;
  kind: QuestionKind;
  prompt: string;
  points: number;
  choices: string[];
  correctChoice: number | null;
  expectedAnswer: string;
}

export const worksheets = sqliteTable(
  "worksheets",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    classId: text("class_id"),
    title: text("title").notNull(),
    subject: text("subject").notNull().default(""),
    level: text("level", { enum: ["support", "core", "extension"] })
      .notNull()
      .default("core"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    questions: text("questions", { mode: "json" })
      .$type<Question[]>()
      .notNull()
      .default(sql`'[]'`),
    createdAt: createdAt(),
  },
  (t) => [
    index("worksheets_owner_idx").on(t.ownerId),
    index("worksheets_class_idx").on(t.classId),
  ],
);

export interface AnswerResult {
  questionId: string;
  answer: string;
  /** Null while an open answer waits for the teacher. */
  score: number | null;
}

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    worksheetId: text("worksheet_id").notNull(),
    studentId: text("student_id").notNull(),
    answers: text("answers", { mode: "json" })
      .$type<AnswerResult[]>()
      .notNull(),
    score: real("score").notNull().default(0),
    maxScore: real("max_score").notNull().default(0),
    pending: integer("pending").notNull().default(0),
    submittedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("submissions_once_idx").on(t.worksheetId, t.studentId),
    index("submissions_student_idx").on(t.studentId),
  ],
);

export const attendance = sqliteTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    studentId: text("student_id").notNull(),
    date: text("date").notNull(),
    status: text("status", { enum: ["present", "absent", "late"] }).notNull(),
    participation: integer("participation"),
    note: text("note").notNull().default(""),
  },
  (t) => [
    uniqueIndex("attendance_once_idx").on(t.studentId, t.date),
    index("attendance_class_date_idx").on(t.classId, t.date),
  ],
);

export const assessments = sqliteTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    maxScore: real("max_score").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("assessments_class_idx").on(t.classId)],
);

export const marks = sqliteTable(
  "marks",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id").notNull(),
    studentId: text("student_id").notNull(),
    score: real("score").notNull(),
  },
  (t) => [
    uniqueIndex("marks_once_idx").on(t.assessmentId, t.studentId),
    index("marks_student_idx").on(t.studentId),
  ],
);

// The family view of one student: an unguessable link plus a PIN kept only as a hash.
export const familyLinks = sqliteTable(
  "family_links",
  {
    studentId: text("student_id").primaryKey(),
    token: text("token").notNull(),
    pinHash: text("pin_hash").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    firstViewedAt: text("first_viewed_at"),
    lastViewedAt: text("last_viewed_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("family_links_token_idx").on(t.token)],
);
