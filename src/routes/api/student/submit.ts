import { createFileRoute } from "@tanstack/react-router";
import { jsonError, noStore, readJson } from "@/server/http";
import { submitAnswers, submitInput } from "@/server/student";

// Public: one submission per student per worksheet, scored on the server.
export const Route = createFileRoute("/api/student/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await readJson(request, submitInput);
        if (!input) return jsonError(400, "Bad request");
        const outcome = await submitAnswers(input);
        if (outcome.kind === "not_found")
          return jsonError(404, "Worksheet not found");
        if (outcome.kind === "already_submitted")
          return jsonError(409, "You already handed this in");
        const { kind: _kind, ...result } = outcome;
        return Response.json(result, { status: 201, headers: noStore });
      },
    },
  },
});
