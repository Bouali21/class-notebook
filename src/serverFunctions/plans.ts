import { createServerFn } from "@tanstack/react-start";
import * as plans from "@/server/plans";
import { idInput } from "@/server/classes";
import { teacherMiddleware } from "./middleware";

export const getPlans = createServerFn()
  .middleware([teacherMiddleware])
  .validator((data: unknown) => plans.listPlansInput.parse(data ?? {}))
  .handler(({ data, context }) => plans.listPlans(context.user.id, data));

export const getPlan = createServerFn()
  .middleware([teacherMiddleware])
  .validator((data: unknown) => idInput.parse(data))
  .handler(({ data, context }) => plans.getPlan(context.user.id, data.id));

export const createPlan = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => plans.planInput.parse(data))
  .handler(({ data, context }) => plans.createPlan(context.user.id, data));

export const updatePlan = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => plans.updatePlanInput.parse(data))
  .handler(({ data, context }) => plans.updatePlan(context.user.id, data));

export const duplicatePlan = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => idInput.parse(data))
  .handler(({ data, context }) =>
    plans.duplicatePlan(context.user.id, data.id),
  );

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => idInput.parse(data))
  .handler(({ data, context }) => plans.deletePlan(context.user.id, data.id));
