import { and, asc, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  assessments,
  attendance,
  classes,
  familyLinks,
  lessonPlans,
  marks,
  students,
  submissions,
  worksheets,
} from "@/db/schema";
import { newAccessCode } from "./codes";

const id = z.string().uuid();
const text = (max: number) => z.string().trim().max(max);

export const classInput = z.object({
  name: text(120).min(1, "Name is required"),
  subject: text(120).default(""),
  grade: text(40).default(""),
  schoolYear: text(40).default(""),
});
export const updateClassInput = classInput.extend({ id });
export const idInput = z.object({ id });
export const addStudentsInput = z.object({
  classId: id,
  names: z
    .array(text(120))
    .transform((names) => names.filter(Boolean))
    .pipe(z.array(z.string()).min(1, "Add at least one name").max(200)),
});
export const renameStudentInput = z.object({
  id,
  name: text(120).min(1, "Name is required"),
});

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
  }
}

export function listClasses(ownerId: string) {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      grade: classes.grade,
      schoolYear: classes.schoolYear,
      studentCount: count(students.id),
    })
    .from(classes)
    .leftJoin(students, eq(students.classId, classes.id))
    .where(eq(classes.ownerId, ownerId))
    .groupBy(classes.id)
    .orderBy(asc(classes.name));
}

/** The class when this teacher owns it, else null. */
export async function ownedClass(ownerId: string, classId: string) {
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)));
  return row ?? null;
}

export async function requireClass(ownerId: string, classId: string) {
  const row = await ownedClass(ownerId, classId);
  if (!row) throw new NotFoundError();
  return row;
}

export function classStudents(classId: string) {
  return db
    .select({
      id: students.id,
      name: students.name,
      accessCode: students.accessCode,
    })
    .from(students)
    .where(eq(students.classId, classId))
    .orderBy(asc(students.name), asc(students.id));
}

export async function getClass(ownerId: string, classId: string) {
  const row = await ownedClass(ownerId, classId);
  if (!row) return null;
  return { ...row, students: await classStudents(classId) };
}

export async function createClass(
  ownerId: string,
  input: z.infer<typeof classInput>,
) {
  const [row] = await db
    .insert(classes)
    .values({ id: crypto.randomUUID(), ownerId, ...input })
    .returning();
  return row!;
}

export async function updateClass(
  ownerId: string,
  { id: classId, ...change }: z.infer<typeof updateClassInput>,
) {
  const [row] = await db
    .update(classes)
    .set(change)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .returning();
  if (!row) throw new NotFoundError();
  return row;
}

/** Removes the class with its roster and everything recorded for it. */
export async function deleteClass(ownerId: string, classId: string) {
  await requireClass(ownerId, classId);
  const roster = db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, classId));
  const classAssessments = db
    .select({ id: assessments.id })
    .from(assessments)
    .where(eq(assessments.classId, classId));
  await db.batch([
    db.delete(marks).where(inArray(marks.assessmentId, classAssessments)),
    db.delete(assessments).where(eq(assessments.classId, classId)),
    db.delete(attendance).where(eq(attendance.classId, classId)),
    db.delete(submissions).where(inArray(submissions.studentId, roster)),
    db.delete(familyLinks).where(inArray(familyLinks.studentId, roster)),
    db.delete(students).where(eq(students.classId, classId)),
    db
      .update(worksheets)
      .set({ classId: null, status: "draft" })
      .where(
        and(eq(worksheets.classId, classId), eq(worksheets.ownerId, ownerId)),
      ),
    db
      .update(lessonPlans)
      .set({ classId: null })
      .where(
        and(
          eq(lessonPlans.classId, classId),
          eq(lessonPlans.ownerId, ownerId),
        ),
      ),
    db
      .delete(classes)
      .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId))),
  ]);
}

async function insertWithCodes(
  rows: { ownerId: string; classId: string; name: string }[],
) {
  // Codes are unique across the whole app; retry the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const values = rows.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        accessCode: newAccessCode(),
      }));
      await db.insert(students).values(values);
      return;
    } catch (error) {
      if (attempt === 4 || !String(error).includes("UNIQUE")) throw error;
    }
  }
}

export async function addStudents(
  ownerId: string,
  input: z.infer<typeof addStudentsInput>,
) {
  await requireClass(ownerId, input.classId);
  for (let i = 0; i < input.names.length; i += 20) {
    await insertWithCodes(
      input.names
        .slice(i, i + 20)
        .map((name) => ({ ownerId, classId: input.classId, name })),
    );
  }
}

export async function ownedStudent(ownerId: string, studentId: string) {
  const [row] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)));
  return row ?? null;
}

export async function renameStudent(
  ownerId: string,
  input: z.infer<typeof renameStudentInput>,
) {
  const [row] = await db
    .update(students)
    .set({ name: input.name })
    .where(and(eq(students.id, input.id), eq(students.ownerId, ownerId)))
    .returning({ id: students.id });
  if (!row) throw new NotFoundError();
}

export async function regenerateCode(ownerId: string, studentId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .update(students)
        .set({ accessCode: newAccessCode() })
        .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
        .returning({ accessCode: students.accessCode });
      if (!row) throw new NotFoundError();
      return row;
    } catch (error) {
      if (attempt === 4 || !String(error).includes("UNIQUE")) throw error;
    }
  }
  throw new NotFoundError();
}

export async function removeStudent(ownerId: string, studentId: string) {
  const student = await ownedStudent(ownerId, studentId);
  if (!student) throw new NotFoundError();
  await db.batch([
    db.delete(marks).where(eq(marks.studentId, studentId)),
    db.delete(attendance).where(eq(attendance.studentId, studentId)),
    db.delete(submissions).where(eq(submissions.studentId, studentId)),
    db.delete(familyLinks).where(eq(familyLinks.studentId, studentId)),
    db
      .delete(students)
      .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId))),
  ]);
}
