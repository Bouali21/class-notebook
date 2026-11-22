import type { AnswerResult, Question } from "@/db/schema";

// Letters and digits that can't be mistaken for one another when read aloud or printed.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % max;
}

export function newAccessCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function newPin(): string {
  return String(randomIndex(1_000_000)).padStart(6, "0");
}

export async function hashPin(token: string, pin: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${token}:${pin}`),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface Graded {
  answers: AnswerResult[];
  score: number;
  maxScore: number;
  pending: number;
}

/** Scores what can be scored now; open answers wait for the teacher. */
export function gradeAnswers(
  questions: Question[],
  given: Record<string, string | number | undefined>,
): Graded {
  let score = 0;
  let maxScore = 0;
  let pending = 0;
  const answers = questions.map((q): AnswerResult => {
    maxScore += q.points;
    const raw = given[q.id];
    const answer = raw === undefined || raw === null ? "" : String(raw);
    if (q.kind === "open") {
      pending += 1;
      return { questionId: q.id, answer, score: null };
    }
    const correct =
      q.kind === "choice"
        ? answer !== "" && Number(answer) === q.correctChoice
        : answer.trim().toLowerCase() ===
            q.expectedAnswer.trim().toLowerCase() &&
          q.expectedAnswer.trim() !== "";
    const got = correct ? q.points : 0;
    score += got;
    return { questionId: q.id, answer, score: got };
  });
  return { answers, score, maxScore, pending };
}

/** Totals after the teacher scores open answers. */
export function totals(answers: AnswerResult[]) {
  let score = 0;
  let pending = 0;
  for (const a of answers) {
    if (a.score === null) pending += 1;
    else score += a.score;
  }
  return { score, pending };
}

export function percent(score: number, max: number): number | null {
  return max > 0 ? (score / max) * 100 : null;
}
