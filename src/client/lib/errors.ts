import { toast } from "sonner";

/** A sentence for a failed server call: the first validation message, or the error's own. */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(message) as { message?: string }[];
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
  } catch {
    // not a validation error
  }
  return message || "Something went wrong";
}

export function toastError(error: unknown) {
  toast.error(errorMessage(error));
}
