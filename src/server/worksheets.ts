import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  classes,
  students,
  submissions,
  worksheets,
  type Question,
} from "@/db/schema";
import { NotFoundError, classStudents, requireClass } from "./classes";
import { totals } from "./codes";

export const LEVELS = ["support", "core", "extension"] as const;

const question = z
  .object({
    id: z.string().min(1).max(64),
    kind: z.enum(["choice", "short", "open"]),
    prompt: z.string().trim().max(2000),
    points: z.coerce.number().min(0).max(100),
    choices: z.array(z.string().trim().max(500)).max(8).default([]),
    correctChoice: z.number().int().min(0).nullable().default(null),
    expectedAnswer: z.string().trim().max(500).default(""),
  })
  .transform(
    (q): Question => ({
      ...q,
      choices: q.kind === "choice" ? q.choices : [],
      correctChoice: q.kind === "choice" ? q.correctChoice : null,
      expectedAnswer: q.kind === "short" ? q.expectedAnswer : "",
    }),
  );

export const createWorksheetInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  subject: z.string().trim().max(120).default(""),
  level: z.enum(LEVELS).default("core"),
});
export const saveWorksheetInput = createWorksheetInput.extend({
  id: z.string().uuid(),
  classId: z.string().uuid().nullable(),
  questions: z.array(question).max(100),
});
export const publishInput = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});
export const scoreInput = z.object({
  submissionId: z.string().uuid(),
  scores: z.record(z.string(), z.coerce.number().min(0)),
});

export function listWorksheets(ownerId: string) {
  return db
    .select({
      id: worksheets.id,
      title: worksheets.title,
      subject: worksheets.subject,
      level: worksheets.level,
      status: worksheets.status,
      className: classes.name,
    })
    .from(worksheets)
    .leftJoin(classes, eq(classes.id, worksheets.classId))
    .where(eq(worksheets.ownerId, ownerId))
    .orderBy(desc(worksheets.createdAt), asc(worksheets.id));
}

export async function getWorksheet(ownerId: string, worksheetId: string) {
  const [row] = await db
    .select({ sheet: worksheets, className: classes.name })
    .from(worksheets)
    .leftJoin(classes, eq(classes.id, worksheets.classId))
    .where(
      and(eq(worksheets.id, worksheetId), eq(worksheets.ownerId, ownerId)),
    );
  return row ? { ...row.sheet, className: row.className } : null;
}

export async function createWorksheet(
  ownerId: string,
  input: z.infer<typeof createWorksheetInput>,
) {
  const [row] = await db
    .insert(worksheets)
    .values({ id: crypto.randomUUID(), ownerId, ...input })
    .returning({ id: worksheets.id });
  return row!;
}

function publishProblem(sheet: {
  classId: string | null;
  questions: Question[];
}): string | null {
  if (!sheet.classId) return "Assign a class before publishing";
  if (sheet.questions.length === 0) return "Add a question before publishing";
  for (const [i, q] of sheet.questions.entries()) {
    if (!q.prompt) return `Question ${i + 1} has no text`;
    if (q.kind === "choice") {
      if (q.choices.filter(Boolean).length < 2)
        return `Question ${i + 1} needs at least two choices`;
      if (q.correctChoice === null || !q.choices[q.correctChoice])
        return `Question ${i + 1} needs a correct choice`;
    }
    if (q.kind === "short" && !q.expectedAnswer)
      return `Question ${i + 1} needs an expected answer`;
  }
  return null;
}

export async function saveWorksheet(
  ownerId: string,
  { id, ...input }: z.infer<typeof saveWorksheetInput>,
) {
  const current = await getWorksheet(ownerId, id);
  if (!current) throw new NotFoundError();
  if (input.classId) await requireClass(ownerId, input.classId);
  if (current.status === "published") {
    const problem = publishProblem(input);
    if (problem) throw new Error(problem);
  }
  await db
    .update(worksheets)
    .set(input)
    .where(and(eq(worksheets.id, id), eq(worksheets.ownerId, ownerId)));
}

export async function setPublished(
  ownerId: string,
  input: z.infer<typeof publishInput>,
) {
  const sheet = await getWorksheet(ownerId, input.id);
  if (!sheet) throw new NotFoundError();
  if (input.published) {
    const problem = publishProblem(sheet);
    if (problem) throw new Error(problem);
  }
  await db
    .update(worksheets)
    .set({ status: input.published ? "published" : "draft" })
    .where(and(eq(worksheets.id, input.id), eq(worksheets.ownerId, ownerId)));
}

export async function deleteWorksheet(ownerId: string, worksheetId: string) {
  const sheet = await getWorksheet(ownerId, worksheetId);
  if (!sheet) throw new NotFoundError();
  await db.batch([
    db.delete(submissions).where(eq(submissions.worksheetId, worksheetId)),
    db
      .delete(worksheets)
      .where(
        and(eq(worksheets.id, worksheetId), eq(worksheets.ownerId, ownerId)),
      ),
  ]);
}

export async function worksheetResults(ownerId: string, worksheetId: string) {
  const sheet = await getWorksheet(ownerId, worksheetId);
  if (!sheet) return null;
  const roster = sheet.classId ? await classStudents(sheet.classId) : [];
  const rows = await db
    .select({
      id: submissions.id,
      studentId: submissions.studentId,
      studentName: students.name,
      score: submissions.score,
      maxScore: submissions.maxScore,
      pending: submissions.pending,
      submittedAt: submissions.submittedAt,
      answers: submissions.answers,
    })
    .from(submissions)
    .innerJoin(students, eq(students.id, submissions.studentId))
    .where(
      and(
        eq(submissions.worksheetId, worksheetId),
        eq(students.ownerId, ownerId),
      ),
    )
    .orderBy(asc(students.name));
  const done = new Set(rows.map((r) => r.studentId));
  return {
    worksheet: {
      id: sheet.id,
      title: sheet.title,
      className: sheet.className,
      status: sheet.status,
      questions: sheet.questions,
    },
    submissions: rows.map(({ answers, ...r }) => ({
      ...r,
      results: Object.fromEntries(answers.map((a) => [a.questionId, a.score])),
    })),
    notSubmitted: roster
      .filter((s) => !done.has(s.id))
      .map((s) => ({ id: s.id, name: s.name })),
  };
}

async function ownedSubmission(ownerId: string, submissionId: string) {
  const [row] = await db
    .select({
      submission: submissions,
      studentName: students.name,
      sheet: worksheets,
    })
    .from(submissions)
    .innerJoin(students, eq(students.id, submissions.studentId))
    .innerJoin(worksheets, eq(worksheets.id, submissions.worksheetId))
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(students.ownerId, ownerId),
        eq(worksheets.ownerId, ownerId),
      ),
    );
  return row ?? null;
}

export async function getSubmission(ownerId: string, submissionId: string) {
  const row = await ownedSubmission(ownerId, submissionId);
  if (!row) return null;
  return {
    id: row.submission.id,
    studentName: row.studentName,
    submittedAt: row.submission.submittedAt,
    score: row.submission.score,
    maxScore: row.submission.maxScore,
    pending: row.submission.pending,
    answers: row.submission.answers,
    worksheet: {
      id: row.sheet.id,
      title: row.sheet.title,
      questions: row.sheet.questions,
    },
  };
}

export async function scoreSubmission(
  ownerId: string,
  input: z.infer<typeof scoreInput>,
) {
  const row = await ownedSubmission(ownerId, input.submissionId);
  if (!row) throw new NotFoundError();
  const byId = new Map(row.sheet.questions.map((q) => [q.id, q]));
  const answers = row.submission.answers.map((a) => {
    const q = byId.get(a.questionId);
    const given = input.scores[a.questionId];
    if (!q || q.kind !== "open" || given === undefined) return a;
    if (given > q.points)
      throw new Error(`A score can't be more than ${q.points}`);
    return { ...a, score: given };
  });
  const { score, pending } = totals(answers);
  await db
    .update(submissions)
    .set({ answers, score, pending })
    .where(eq(submissions.id, input.submissionId));
  return { score, pending, maxScore: row.submission.maxScore };
}
