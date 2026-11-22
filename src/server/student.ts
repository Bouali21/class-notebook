// What a student reaches with nothing but their access code.
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { classes, students, submissions, worksheets } from "@/db/schema";
import { gradeAnswers, normalizeCode } from "./codes";

export const sessionInput = z.object({ code: z.string().max(20) });
export const worksheetInput = sessionInput.extend({
  worksheetId: z.string().max(64),
});
export const submitInput = worksheetInput.extend({
  answers: z.record(z.string(), z.union([z.string().max(5000), z.number()])),
});

async function studentByCode(code: string) {
  const [row] = await db
    .select({
      id: students.id,
      name: students.name,
      classId: students.classId,
      className: classes.name,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.accessCode, normalizeCode(code)));
  return row ?? null;
}

async function assignedSheet(classId: string, worksheetId: string) {
  const [sheet] = await db
    .select()
    .from(worksheets)
    .where(
      and(
        eq(worksheets.id, worksheetId),
        eq(worksheets.classId, classId),
        eq(worksheets.status, "published"),
      ),
    );
  return sheet ?? null;
}

async function existing(worksheetId: string, studentId: string) {
  const [row] = await db
    .select({
      score: submissions.score,
      maxScore: submissions.maxScore,
      pending: submissions.pending,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.worksheetId, worksheetId),
        eq(submissions.studentId, studentId),
      ),
    );
  return row ?? null;
}

export async function studentSession(code: string) {
  const student = await studentByCode(code);
  if (!student) return null;
  const sheets = await db
    .select({
      id: worksheets.id,
      title: worksheets.title,
      subject: worksheets.subject,
      submitted: submissions.id,
    })
    .from(worksheets)
    .leftJoin(
      submissions,
      and(
        eq(submissions.worksheetId, worksheets.id),
        eq(submissions.studentId, student.id),
      ),
    )
    .where(
      and(
        eq(worksheets.classId, student.classId),
        eq(worksheets.status, "published"),
      ),
    )
    .orderBy(asc(worksheets.title));
  return {
    student: { name: student.name },
    className: student.className,
    worksheets: sheets.map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      submitted: s.submitted !== null,
    })),
  };
}

/** The questions without their answers. */
export async function studentWorksheet(code: string, worksheetId: string) {
  const student = await studentByCode(code);
  if (!student) return null;
  const sheet = await assignedSheet(student.classId, worksheetId);
  if (!sheet) return null;
  return {
    id: sheet.id,
    title: sheet.title,
    subject: sheet.subject,
    questions: sheet.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      points: q.points,
      choices: q.choices,
    })),
    result: await existing(sheet.id, student.id),
  };
}

export type SubmitOutcome =
  | { kind: "not_found" }
  | { kind: "already_submitted" }
  | { kind: "ok"; score: number; maxScore: number; pending: number };

export async function submitAnswers(
  input: z.infer<typeof submitInput>,
): Promise<SubmitOutcome> {
  const student = await studentByCode(input.code);
  if (!student) return { kind: "not_found" };
  const sheet = await assignedSheet(student.classId, input.worksheetId);
  if (!sheet) return { kind: "not_found" };
  const graded = gradeAnswers(sheet.questions, input.answers);
  const inserted = await db
    .insert(submissions)
    .values({
      id: crypto.randomUUID(),
      worksheetId: sheet.id,
      studentId: student.id,
      answers: graded.answers,
      score: graded.score,
      maxScore: graded.maxScore,
      pending: graded.pending,
    })
    .onConflictDoNothing()
    .returning({ id: submissions.id });
  if (inserted.length === 0) return { kind: "already_submitted" };
  return {
    kind: "ok",
    score: graded.score,
    maxScore: graded.maxScore,
    pending: graded.pending,
  };
}
