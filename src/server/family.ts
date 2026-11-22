import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { familyLinks } from "@/db/schema";
import { NotFoundError, ownedStudent } from "./classes";
import { hashPin, newPin, newToken, sameText } from "./codes";
import { studentRecord } from "./tracking";

export const MAX_PIN_ATTEMPTS = 5;

/** A new link and PIN for the student's family; any earlier ones stop working. */
export async function publishFamilyLink(ownerId: string, studentId: string) {
  if (!(await ownedStudent(ownerId, studentId))) throw new NotFoundError();
  const token = newToken();
  const pin = newPin();
  const pinHash = await hashPin(token, pin);
  await db
    .insert(familyLinks)
    .values({ studentId, token, pinHash })
    .onConflictDoUpdate({
      target: familyLinks.studentId,
      set: {
        token,
        pinHash,
        failedAttempts: 0,
        viewCount: 0,
        firstViewedAt: null,
        lastViewedAt: null,
        createdAt: sql`(current_timestamp)`,
      },
    });
  return { token, pin };
}

export async function revokeFamilyLink(ownerId: string, studentId: string) {
  if (!(await ownedStudent(ownerId, studentId))) throw new NotFoundError();
  await db.delete(familyLinks).where(eq(familyLinks.studentId, studentId));
}

export type FamilyOutcome =
  | { kind: "not_found" }
  | { kind: "locked" }
  | { kind: "wrong_pin" }
  | { kind: "ok"; record: NonNullable<Awaited<ReturnType<typeof familyView>>> };

function familyView(record: Awaited<ReturnType<typeof studentRecord>>) {
  if (!record) return null;
  return {
    student: { name: record.student.name, className: record.student.className },
    marks: record.marks,
    worksheets: record.worksheets
      .filter((w) => w.pending === 0)
      .map(({ title, score, maxScore, submittedAt }) => ({
        title,
        score,
        maxScore,
        submittedAt,
      })),
    attendance: record.attendance,
    average: record.average,
  };
}

export async function openFamilyLink(
  token: string,
  pin: string,
): Promise<FamilyOutcome> {
  const [link] = await db
    .select()
    .from(familyLinks)
    .where(eq(familyLinks.token, token));
  if (!link) return { kind: "not_found" };
  if (link.failedAttempts >= MAX_PIN_ATTEMPTS) return { kind: "locked" };
  if (!sameText(await hashPin(token, pin.trim()), link.pinHash)) {
    await db
      .update(familyLinks)
      .set({ failedAttempts: sql`${familyLinks.failedAttempts} + 1` })
      .where(eq(familyLinks.token, token));
    return { kind: "wrong_pin" };
  }
  await db
    .update(familyLinks)
    .set({
      failedAttempts: 0,
      viewCount: sql`${familyLinks.viewCount} + 1`,
      firstViewedAt: sql`coalesce(${familyLinks.firstViewedAt}, current_timestamp)`,
      lastViewedAt: sql`current_timestamp`,
    })
    .where(eq(familyLinks.token, token));
  const view = familyView(await studentRecord(link.studentId));
  if (!view) return { kind: "not_found" };
  return { kind: "ok", record: view };
}
