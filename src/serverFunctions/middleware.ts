import { createMiddleware } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { ensureTeacher } from "@/server/teachers";

/** The signed-in member, with their teacher row written on first sight. */
export const teacherMiddleware = createMiddleware({ type: "function" })
  .middleware([ensureUserMiddleware])
  .server(async ({ next, context }) => {
    await ensureTeacher(context.user);
    return next();
  });
