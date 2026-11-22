import type { ReactNode } from "react";
import { Label } from "@/client/components/ui/label";

/** A label above its control; `id` ties them together. */
export function FormField({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
