import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import * as tracking from "@/server/tracking";
import * as family from "@/server/family";
import { idInput } from "@/server/classes";
import { teacherMiddleware } from "./middleware";

const byId = (data: unknown) => idInput.parse(data);

export const getAttendance = createServerFn()
  .middleware([teacherMiddleware])
  .validator((data: unknown) => tracking.attendanceQuery.parse(data))
  .handler(({ data, context }) =>
    tracking.getAttendance(context.user.id, data),
  );

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => tracking.saveAttendanceInput.parse(data))
  .handler(({ data, context }) =>
    tracking.saveAttendance(context.user.id, data),
  );

export const getGradebook = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    tracking.gradebook(context.user.id, data.id),
  );

export const createAssessment = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => tracking.assessmentInput.parse(data))
  .handler(({ data, context }) =>
    tracking.createAssessment(context.user.id, data),
  );

export const getAssessment = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    tracking.getAssessment(context.user.id, data.id),
  );

export const saveMarks = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) => tracking.saveMarksInput.parse(data))
  .handler(({ data, context }) => tracking.saveMarks(context.user.id, data));

export const deleteAssessment = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    tracking.deleteAssessment(context.user.id, data.id),
  );

export const getStudentSummary = createServerFn()
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    tracking.studentSummary(context.user.id, data.id),
  );

/** A fresh family link and PIN; the PIN is shown this once. */
export const publishFamilyLink = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(async ({ data, context }) => {
    const { token, pin } = await family.publishFamilyLink(
      context.user.id,
      data.id,
    );
    const origin = new URL(getRequest().url).origin;
    return { url: `${origin}/family/${token}`, pin };
  });

export const revokeFamilyLink = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator(byId)
  .handler(({ data, context }) =>
    family.revokeFamilyLink(context.user.id, data.id),
  );
