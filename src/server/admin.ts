import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teachers } from "@/db/schema";

/** Every teacher's classes, for workspace admins. */
export function allClasses() {
  return db
    .select({
      id: classes.id,
      name: classes.name,
      subject: classes.subject,
      grade: classes.grade,
      teacherEmail: teachers.email,
      studentCount: count(students.id),
    })
    .from(classes)
    .leftJoin(teachers, eq(teachers.id, classes.ownerId))
    .leftJoin(students, eq(students.classId, classes.id))
    .groupBy(classes.id)
    .orderBy(asc(teachers.email), asc(classes.name));
}
