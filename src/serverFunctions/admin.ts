import { createServerFn } from "@tanstack/react-start";
import { isAdmin } from "@every-app/sdk/server";
import { allClasses } from "@/server/admin";
import { teacherMiddleware } from "./middleware";

export const getAdminOverview = createServerFn()
  .middleware([teacherMiddleware])
  .handler(async ({ context }) => {
    if (!isAdmin(context.user)) return { allowed: false as const };
    return { allowed: true as const, classes: await allClasses() };
  });

export const getViewer = createServerFn()
  .middleware([teacherMiddleware])
  .handler(({ context }) => ({ admin: isAdmin(context.user) }));
