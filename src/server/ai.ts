import {
  aiBaseUrl,
  createGatewayFetch,
  integrationStatus,
  refusalFromError,
} from "@every-app/sdk/server";
import { env } from "cloudflare:workers";

const PROVIDER = "openrouter";
const MODEL = "openai/gpt-4o-mini";

/** Whether the optional AI drafting feature has its provider set up. */
export async function aiAvailable(): Promise<boolean> {
  try {
    const status = await integrationStatus({ env, provider: PROVIDER });
    return Boolean(status.configured);
  } catch {
    return false;
  }
}

export class AiUnavailableError extends Error {
  constructor() {
    super("AI drafting isn't set up");
  }
}

/** Asks the model for one JSON object. */
export async function draftJson(system: string, user: string): Promise<unknown> {
  const gatewayFetch = createGatewayFetch({ env });
  let response: Response;
  try {
    response = await gatewayFetch(`${aiBaseUrl(PROVIDER)}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (error) {
    if (refusalFromError(error)) throw new AiUnavailableError();
    throw error;
  }
  if (!response.ok) throw new AiUnavailableError();
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content.replace(/^```(json)?|```$/g, "").trim());
  } catch {
    throw new Error("The draft came back unreadable. Try again.");
  }
}
