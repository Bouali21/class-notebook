import { describe, expect, it } from "vitest";
import type { Question } from "@/db/schema";
import { gradeAnswers, newAccessCode, newPin, normalizeCode, totals } from "./codes";

const questions: Question[] = [
  { id: "a", kind: "choice", prompt: "", points: 2, choices: ["x", "y"], correctChoice: 1, expectedAnswer: "" },
  { id: "b", kind: "short", prompt: "", points: 1, choices: [], correctChoice: null, expectedAnswer: "Condensation" },
  { id: "c", kind: "open", prompt: "", points: 3, choices: [], correctChoice: null, expectedAnswer: "" },
];

describe("grading", () => {
  it("scores choice and short answers, trimmed and case-insensitive", () => {
    const g = gradeAnswers(questions, { a: 1, b: "  condensation ", c: "because" });
    expect(g).toMatchObject({ score: 3, maxScore: 6, pending: 1 });
  });
  it("gives nothing for wrong or missing answers", () => {
    const g = gradeAnswers(questions, { a: 0 });
    expect(g.score).toBe(0);
  });
  it("totals once open answers are scored", () => {
    const g = gradeAnswers(questions, { a: 1, b: "x", c: "y" });
    g.answers[2]!.score = 2;
    expect(totals(g.answers)).toEqual({ score: 4, pending: 0 });
  });
});

describe("codes", () => {
  it("makes six-character codes and six-digit PINs", () => {
    expect(newAccessCode()).toMatch(/^[A-Z2-9]{6}$/);
    expect(newPin()).toMatch(/^\d{6}$/);
    expect(normalizeCode(" ab12cd ")).toBe("AB12CD");
  });
});
