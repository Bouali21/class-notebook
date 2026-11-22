import type { z } from "zod";

/** The JSON body parsed by `schema`, or null for anything else. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T> | null> {
  if (Number(request.headers.get("content-length") ?? 0) > 200_000) return null;
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status, headers: noStore });
}

export const noStore = { "cache-control": "no-store" };
