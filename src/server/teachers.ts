import { db } from "@/db";
import { teachers } from "@/db/schema";

/** The teacher's own row, keyed by the Gateway's user id, written on first sight. */
export async function ensureTeacher(user: { id: string; email: string }) {
  await db
    .insert(teachers)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({ target: teachers.id, set: { email: user.email } });
}
