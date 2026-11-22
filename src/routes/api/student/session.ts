import { createFileRoute } from "@tanstack/react-router";
import { jsonError, noStore, readJson } from "@/server/http";
import { sessionInput, studentSession } from "@/server/student";

// Public (everyapp.config.ts): a student signs in with their access code alone.
export const Route = createFileRoute("/api/student/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await readJson(request, sessionInput);
        if (!input) return jsonError(400, "Enter your code");
        const session = await studentSession(input.code);
        if (!session) return jsonError(404, "That code doesn't match a student");
        return Response.json(session, { headers: noStore });
      },
    },
  },
});
