import { useState, type FormEvent } from "react";
import { FormField } from "@/client/components/FormField";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { toastError } from "@/client/lib/errors";

export interface ClassFields {
  name: string;
  subject: string;
  grade: string;
  schoolYear: string;
}

export function ClassDialog({
  title,
  submitLabel,
  initial,
  onSubmit,
  onClose,
}: {
  title: string;
  submitLabel: string;
  initial?: ClassFields;
  onSubmit: (fields: ClassFields) => Promise<void>;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<ClassFields>(
    initial ?? { name: "", subject: "", grade: "", schoolYear: "" },
  );
  const [pending, setPending] = useState(false);
  const set = (key: keyof ClassFields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await onSubmit(fields);
      onClose();
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <FormField id="class-name" label="Name">
            <Input id="class-name" required value={fields.name} onChange={set("name")} autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="class-subject" label="Subject">
              <Input id="class-subject" value={fields.subject} onChange={set("subject")} />
            </FormField>
            <FormField id="class-grade" label="Grade">
              <Input id="class-grade" value={fields.grade} onChange={set("grade")} />
            </FormField>
            <FormField id="class-year" label="School year">
              <Input id="class-year" value={fields.schoolYear} onChange={set("schoolYear")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
