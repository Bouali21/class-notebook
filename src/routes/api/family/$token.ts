import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openFamilyLink } from "@/server/family";
import { jsonError, noStore, readJson } from "@/server/http";

// Public: a family's read-only view of one student, behind the link's token and its PIN.
export const Route = createFileRoute("/api/family/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const input = await readJson(request, z.object({ pin: z.string().max(12) }));
        if (!input) return jsonError(400, "Enter the PIN");
        const outcome = await openFamilyLink(params.token, input.pin);
        switch (outcome.kind) {
          case "not_found":
            return jsonError(404, "This link no longer works. Ask the teacher for a new one.");
          case "locked":
            return jsonError(429, "Too many wrong PINs. Ask the teacher for a new link.");
          case "wrong_pin":
            return jsonError(401, "That PIN doesn't match.");
          case "ok":
            return Response.json(outcome.record, { headers: noStore });
        }
      },
    },
  },
});
