import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aiAvailable, AiUnavailableError, draftJson } from "@/server/ai";
import { STAGE_NAMES } from "@/server/plans";
import { teacherMiddleware } from "./middleware";

const str = z.string().catch("");

const planDraft = z.object({
  objectives: str,
  strategies: str,
  stages: z
    .array(z.object({ name: str, minutes: z.coerce.number().catch(0), activity: str }))
    .catch([]),
  materials: str,
  assessment: str,
});

export const draftPlan = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        subject: z.string().max(120),
        grade: z.string().max(40),
        topic: z.string().trim().min(1, "Enter a topic first").max(200),
        durationMinutes: z.number().int().min(1).max(600),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await aiAvailable())) throw new AiUnavailableError();
    const raw = await draftJson(
      `You help a school teacher plan one lesson. Reply with JSON: {"objectives": string, "strategies": string, "stages": [{"name": string, "minutes": number, "activity": string}], "materials": string, "assessment": string}. Use exactly these stages in order: ${STAGE_NAMES.join(", ")}. Minutes add up to the lesson length. Plain text, no markdown.`,
      `Subject: ${data.subject || "any"}. Grade: ${data.grade || "any"}. Topic: ${data.topic}. Lesson length: ${data.durationMinutes} minutes.`,
    );
    const draft = planDraft.parse(raw);
    return {
      ...draft,
      stages: STAGE_NAMES.map((name, i) => ({
        name,
        minutes: Math.max(0, Math.round(draft.stages[i]?.minutes ?? 0)),
        activity: draft.stages[i]?.activity ?? "",
      })),
    };
  });

const questionDraft = z.object({
  questions: z
    .array(
      z.object({
        kind: z.enum(["choice", "short", "open"]).catch("open"),
        prompt: str,
        points: z.coerce.number().catch(1),
        choices: z.array(z.string()).catch([]),
        correctChoice: z.coerce.number().int().nullable().catch(null),
        expectedAnswer: str,
      }),
    )
    .catch([]),
});

export const draftQuestions = createServerFn({ method: "POST" })
  .middleware([teacherMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        subject: z.string().max(120),
        topic: z.string().trim().min(1, "Enter a topic first").max(200),
        level: z.enum(["support", "core", "extension"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await aiAvailable())) throw new AiUnavailableError();
    const raw = await draftJson(
      `You write school worksheet questions. Reply with JSON: {"questions": [{"kind": "choice" | "short" | "open", "prompt": string, "points": number, "choices": string[], "correctChoice": number | null, "expectedAnswer": string}]}. Write 5 questions: 3 multiple choice with 3-4 choices and the 0-based index of the correct one, 1 short answer with a one- or two-word expected answer, 1 open response. Level "support" is simpler, "extension" more demanding.`,
      `Subject: ${data.subject || "any"}. Topic: ${data.topic}. Level: ${data.level}.`,
    );
    return questionDraft.parse(raw).questions.map((q) => ({
      id: crypto.randomUUID(),
      kind: q.kind,
      prompt: q.prompt,
      points: Math.max(0, Math.round(q.points)) || 1,
      choices: q.kind === "choice" ? q.choices.slice(0, 8) : [],
      correctChoice:
        q.kind === "choice" && q.correctChoice !== null && q.choices[q.correctChoice] !== undefined
          ? q.correctChoice
          : null,
      expectedAnswer: q.kind === "short" ? q.expectedAnswer : "",
    }));
  });
