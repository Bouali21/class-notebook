import { createFileRoute } from "@tanstack/react-router";
import { jsonError, noStore, readJson } from "@/server/http";
import { studentWorksheet, worksheetInput } from "@/server/student";

// Public: the questions of a published worksheet assigned to the student's class, without answers.
export const Route = createFileRoute("/api/student/worksheet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await readJson(request, worksheetInput);
        if (!input) return jsonError(400, "Bad request");
        const sheet = await studentWorksheet(input.code, input.worksheetId);
        if (!sheet) return jsonError(404, "Worksheet not found");
        return Response.json(sheet, { headers: noStore });
      },
    },
  },
});
