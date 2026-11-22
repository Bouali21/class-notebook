import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { classes, lessonPlans } from "@/db/schema";
import { NotFoundError, requireClass } from "./classes";

export const STAGE_NAMES = ["Warm-up", "Presentation", "Practice", "Closure"];

const text = (max: number) => z.string().trim().max(max).default("");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const planInput = z.object({
  date,
  classId: z.string().uuid().nullable().default(null),
  subject: text(120),
  topic: z.string().trim().min(1, "Topic is required").max(200),
  durationMinutes: z.coerce.number().int().min(1).max(600).default(45),
  objectives: text(4000),
  strategies: text(4000),
  stages: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        minutes: z.coerce.number().int().min(0).max(600),
        activity: z.string().trim().max(4000),
      }),
    )
    .max(12)
    .default([]),
  materials: text(4000),
  assessment: text(4000),
  notes: text(4000),
});
export const updatePlanInput = planInput.extend({ id: z.string().uuid() });
export const listPlansInput = z.object({
  classId: z.string().uuid().optional(),
  date: date.optional(),
});

export type PlanInput = z.infer<typeof planInput>;

async function checkClass(ownerId: string, classId: string | null) {
  if (classId) await requireClass(ownerId, classId);
}

export function listPlans(
  ownerId: string,
  filter: z.infer<typeof listPlansInput>,
) {
  const where: SQL[] = [eq(lessonPlans.ownerId, ownerId)];
  if (filter.classId) where.push(eq(lessonPlans.classId, filter.classId));
  if (filter.date) where.push(eq(lessonPlans.date, filter.date));
  return db
    .select({
      id: lessonPlans.id,
      date: lessonPlans.date,
      topic: lessonPlans.topic,
      subject: lessonPlans.subject,
      durationMinutes: lessonPlans.durationMinutes,
      className: classes.name,
    })
    .from(lessonPlans)
    .leftJoin(classes, eq(classes.id, lessonPlans.classId))
    .where(and(...where))
    .orderBy(desc(lessonPlans.date), asc(lessonPlans.createdAt));
}

export async function getPlan(ownerId: string, planId: string) {
  const [row] = await db
    .select({ plan: lessonPlans, className: classes.name })
    .from(lessonPlans)
    .leftJoin(classes, eq(classes.id, lessonPlans.classId))
    .where(and(eq(lessonPlans.id, planId), eq(lessonPlans.ownerId, ownerId)));
  return row ? { ...row.plan, className: row.className } : null;
}

export async function createPlan(ownerId: string, input: PlanInput) {
  await checkClass(ownerId, input.classId);
  const [row] = await db
    .insert(lessonPlans)
    .values({ id: crypto.randomUUID(), ownerId, ...input })
    .returning({ id: lessonPlans.id });
  return row!;
}

export async function updatePlan(
  ownerId: string,
  { id, ...input }: z.infer<typeof updatePlanInput>,
) {
  await checkClass(ownerId, input.classId);
  const [row] = await db
    .update(lessonPlans)
    .set(input)
    .where(and(eq(lessonPlans.id, id), eq(lessonPlans.ownerId, ownerId)))
    .returning({ id: lessonPlans.id });
  if (!row) throw new NotFoundError();
  return row;
}

export async function duplicatePlan(ownerId: string, planId: string) {
  const plan = await getPlan(ownerId, planId);
  if (!plan) throw new NotFoundError();
  const { id: _id, createdAt: _c, className: _n, ownerId: _o, ...rest } = plan;
  const [row] = await db
    .insert(lessonPlans)
    .values({ ...rest, id: crypto.randomUUID(), ownerId })
    .returning({ id: lessonPlans.id });
  return row!;
}

export async function deletePlan(ownerId: string, planId: string) {
  const [row] = await db
    .delete(lessonPlans)
    .where(and(eq(lessonPlans.id, planId), eq(lessonPlans.ownerId, ownerId)))
    .returning({ id: lessonPlans.id });
  if (!row) throw new NotFoundError();
}
