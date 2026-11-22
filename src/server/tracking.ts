import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  assessments,
  attendance,
  classes,
  familyLinks,
  marks,
  students,
  submissions,
  worksheets,
} from "@/db/schema";
import {
  NotFoundError,
  classStudents,
  ownedClass,
  ownedStudent,
  requireClass,
} from "./classes";
import { percent } from "./codes";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const attendanceQuery = z.object({ classId: z.string().uuid(), date });
export const saveAttendanceInput = attendanceQuery.extend({
  entries: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["present", "absent", "late"]).nullable(),
        participation: z.number().int().min(1).max(5).nullable(),
        note: z.string().trim().max(1000),
      }),
    )
    .max(500),
});
export const assessmentInput = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  date,
  maxScore: z.coerce.number().positive("Max score must be above 0").max(10000),
});
export const saveMarksInput = z.object({
  assessmentId: z.string().uuid(),
  marks: z.array(
    z.object({
      studentId: z.string().uuid(),
      score: z.number().min(0).nullable(),
    }),
  ),
});

export async function getAttendance(
  ownerId: string,
  input: z.infer<typeof attendanceQuery>,
) {
  const cls = await ownedClass(ownerId, input.classId);
  if (!cls) return null;
  const [roster, rows] = await Promise.all([
    classStudents(cls.id),
    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.classId, cls.id),
          eq(attendance.date, input.date),
        ),
      ),
  ]);
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));
  return {
    class: { id: cls.id, name: cls.name },
    entries: roster.map((s) => {
      const r = byStudent.get(s.id);
      return {
        studentId: s.id,
        name: s.name,
        status: r?.status ?? null,
        participation: r?.participation ?? null,
        note: r?.note ?? "",
      };
    }),
  };
}

export async function saveAttendance(
  ownerId: string,
  input: z.infer<typeof saveAttendanceInput>,
) {
  await requireClass(ownerId, input.classId);
  const roster = new Set((await classStudents(input.classId)).map((s) => s.id));
  const statements = input.entries
    .filter((e) => roster.has(e.studentId))
    .map((e) =>
      e.status === null
        ? db
            .delete(attendance)
            .where(
              and(
                eq(attendance.studentId, e.studentId),
                eq(attendance.date, input.date),
              ),
            )
        : db
            .insert(attendance)
            .values({
              id: crypto.randomUUID(),
              classId: input.classId,
              studentId: e.studentId,
              date: input.date,
              status: e.status,
              participation: e.participation,
              note: e.note,
            })
            .onConflictDoUpdate({
              target: [attendance.studentId, attendance.date],
              set: {
                status: e.status,
                participation: e.participation,
                note: e.note,
                classId: input.classId,
              },
            }),
    );
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

export async function createAssessment(
  ownerId: string,
  input: z.infer<typeof assessmentInput>,
) {
  await requireClass(ownerId, input.classId);
  const [row] = await db
    .insert(assessments)
    .values({ id: crypto.randomUUID(), ...input })
    .returning({ id: assessments.id });
  return row!;
}

async function ownedAssessment(ownerId: string, assessmentId: string) {
  const [row] = await db
    .select({ assessment: assessments, className: classes.name })
    .from(assessments)
    .innerJoin(classes, eq(classes.id, assessments.classId))
    .where(
      and(eq(assessments.id, assessmentId), eq(classes.ownerId, ownerId)),
    );
  return row ?? null;
}

export async function getAssessment(ownerId: string, assessmentId: string) {
  const row = await ownedAssessment(ownerId, assessmentId);
  if (!row) return null;
  const roster = await classStudents(row.assessment.classId);
  const given = await db
    .select()
    .from(marks)
    .where(eq(marks.assessmentId, assessmentId));
  const byStudent = new Map(given.map((m) => [m.studentId, m.score]));
  return {
    ...row.assessment,
    className: row.className,
    marks: roster.map((s) => ({
      studentId: s.id,
      name: s.name,
      score: byStudent.get(s.id) ?? null,
    })),
  };
}

export async function saveMarks(
  ownerId: string,
  input: z.infer<typeof saveMarksInput>,
) {
  const row = await ownedAssessment(ownerId, input.assessmentId);
  if (!row) throw new NotFoundError();
  const roster = new Set(
    (await classStudents(row.assessment.classId)).map((s) => s.id),
  );
  const statements = input.marks
    .filter((m) => roster.has(m.studentId))
    .map((m) => {
      if (m.score !== null && m.score > row.assessment.maxScore)
        throw new Error(`A mark can't be more than ${row.assessment.maxScore}`);
      return m.score === null
        ? db
            .delete(marks)
            .where(
              and(
                eq(marks.assessmentId, input.assessmentId),
                eq(marks.studentId, m.studentId),
              ),
            )
        : db
            .insert(marks)
            .values({
              id: crypto.randomUUID(),
              assessmentId: input.assessmentId,
              studentId: m.studentId,
              score: m.score,
            })
            .onConflictDoUpdate({
              target: [marks.assessmentId, marks.studentId],
              set: { score: m.score },
            });
    });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

export async function deleteAssessment(ownerId: string, assessmentId: string) {
  const row = await ownedAssessment(ownerId, assessmentId);
  if (!row) throw new NotFoundError();
  await db.batch([
    db.delete(marks).where(eq(marks.assessmentId, assessmentId)),
    db.delete(assessments).where(eq(assessments.id, assessmentId)),
  ]);
}

function attendanceRate(statuses: string[]): number | null {
  if (statuses.length === 0) return null;
  return (
    (statuses.filter((s) => s !== "absent").length / statuses.length) * 100
  );
}

function average(values: (number | null)[]): number | null {
  const real = values.filter((v): v is number => v !== null);
  return real.length ? real.reduce((a, b) => a + b, 0) / real.length : null;
}

export async function gradebook(ownerId: string, classId: string) {
  const cls = await ownedClass(ownerId, classId);
  if (!cls) return null;
  const roster = await classStudents(classId);
  const ids = roster.map((s) => s.id);
  const [tests, sheets] = await Promise.all([
    db
      .select()
      .from(assessments)
      .where(eq(assessments.classId, classId))
      .orderBy(asc(assessments.date), asc(assessments.createdAt)),
    db
      .select({ id: worksheets.id, title: worksheets.title })
      .from(worksheets)
      .where(
        and(
          eq(worksheets.classId, classId),
          eq(worksheets.ownerId, ownerId),
          eq(worksheets.status, "published"),
        ),
      )
      .orderBy(asc(worksheets.createdAt)),
  ]);
  const [allMarks, allSubs, allAttendance] = ids.length
    ? await Promise.all([
        db.select().from(marks).where(inArray(marks.studentId, ids)),
        db
          .select()
          .from(submissions)
          .where(inArray(submissions.studentId, ids)),
        db
          .select({ studentId: attendance.studentId, status: attendance.status })
          .from(attendance)
          .where(eq(attendance.classId, classId)),
      ])
    : [[], [], []];
  const testMax = new Map(tests.map((t) => [t.id, t.maxScore]));
  return {
    class: { id: cls.id, name: cls.name },
    assessments: tests.map((t) => ({
      id: t.id,
      title: t.title,
      date: t.date,
      maxScore: t.maxScore,
    })),
    worksheets: sheets,
    rows: roster.map((s) => {
      const myMarks = allMarks.filter((m) => m.studentId === s.id);
      const mySubs = allSubs.filter((m) => m.studentId === s.id);
      const pcts = [
        ...myMarks.map((m) => percent(m.score, testMax.get(m.assessmentId) ?? 0)),
        ...mySubs
          .filter((m) => m.pending === 0 && sheets.some((w) => w.id === m.worksheetId))
          .map((m) => percent(m.score, m.maxScore)),
      ];
      return {
        id: s.id,
        name: s.name,
        marks: Object.fromEntries(myMarks.map((m) => [m.assessmentId, m.score])),
        worksheets: Object.fromEntries(
          mySubs.map((m) => [
            m.worksheetId,
            { score: m.score, maxScore: m.maxScore, pending: m.pending },
          ]),
        ),
        attendanceRate: attendanceRate(
          allAttendance.filter((a) => a.studentId === s.id).map((a) => a.status),
        ),
        average: average(pcts),
      };
    }),
  };
}

/** Everything recorded for one student; also what a family sees. */
export async function studentRecord(studentId: string) {
  const [student] = await db
    .select({
      id: students.id,
      name: students.name,
      classId: students.classId,
      className: classes.name,
    })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId));
  if (!student) return null;
  const [markRows, subRows, attRows] = await Promise.all([
    db
      .select({
        title: assessments.title,
        date: assessments.date,
        maxScore: assessments.maxScore,
        score: marks.score,
      })
      .from(marks)
      .innerJoin(assessments, eq(assessments.id, marks.assessmentId))
      .where(eq(marks.studentId, studentId))
      .orderBy(desc(assessments.date)),
    db
      .select({
        id: submissions.id,
        title: worksheets.title,
        score: submissions.score,
        maxScore: submissions.maxScore,
        pending: submissions.pending,
        submittedAt: submissions.submittedAt,
      })
      .from(submissions)
      .innerJoin(worksheets, eq(worksheets.id, submissions.worksheetId))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt)),
    db
      .select({
        date: attendance.date,
        status: attendance.status,
        participation: attendance.participation,
        note: attendance.note,
      })
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date)),
  ]);
  const graded = subRows.filter((s) => s.pending === 0);
  return {
    student,
    marks: markRows,
    worksheets: subRows,
    attendance: {
      present: attRows.filter((a) => a.status === "present").length,
      late: attRows.filter((a) => a.status === "late").length,
      absent: attRows.filter((a) => a.status === "absent").length,
      rate: attendanceRate(attRows.map((a) => a.status)),
    },
    average: average([
      ...markRows.map((m) => percent(m.score, m.maxScore)),
      ...graded.map((s) => percent(s.score, s.maxScore)),
    ]),
    notes: attRows
      .filter((a) => a.note || a.participation !== null)
      .slice(0, 10),
  };
}

export async function studentSummary(ownerId: string, studentId: string) {
  const owned = await ownedStudent(ownerId, studentId);
  if (!owned) return null;
  const record = await studentRecord(studentId);
  if (!record) return null;
  const [link] = await db
    .select({
      createdAt: familyLinks.createdAt,
      viewCount: familyLinks.viewCount,
      firstViewedAt: familyLinks.firstViewedAt,
      lastViewedAt: familyLinks.lastViewedAt,
      locked: familyLinks.failedAttempts,
    })
    .from(familyLinks)
    .where(eq(familyLinks.studentId, studentId));
  return { ...record, family: link ?? null };
}

