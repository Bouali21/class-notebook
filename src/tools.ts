// The app's tools for AI clients, served by the Gateway at /mcp with the signed-in user.
import { defineTools } from "@every-app/sdk/server";
import { z } from "zod";
import { listClasses } from "@/server/classes";
import { listPlans, listPlansInput } from "@/server/plans";
import { listWorksheets } from "@/server/worksheets";

export const tools = defineTools({
  list_classes: {
    description: "List the user's classes with their student counts.",
    risk: "read",
    input: z.object({}).strict(),
    handler: (_input, { user }) => listClasses(user.id),
  },
  list_lesson_plans: {
    description: "List the user's lesson plans, optionally for one class id or one date (YYYY-MM-DD).",
    risk: "read",
    input: listPlansInput.strict(),
    handler: (input, { user }) => listPlans(user.id, input),
  },
  list_worksheets: {
    description: "List the user's worksheets with level, class and draft or published status.",
    risk: "read",
    input: z.object({}).strict(),
    handler: (_input, { user }) => listWorksheets(user.id),
  },
});
