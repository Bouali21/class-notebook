import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/client/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { toastError } from "@/client/lib/errors";
import { LEVEL_LABELS } from "@/client/lib/format";
import { createWorksheet, getWorksheets } from "@/serverFunctions/worksheets";

export const Route = createFileRoute("/_teacher/worksheets/")({
  loader: () => getWorksheets(),
  component: WorksheetsPage,
});

function WorksheetsPage() {
  const sheets = Route.useLoaderData();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Worksheets"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New worksheet
          </Button>
        }
      />
      {sheets.length === 0 ? (
        <EmptyState
          title="No worksheets yet"
          description="Build one, assign it to a class and publish it for students to answer."
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.map((w) => (
                <TableRow key={w.id} data-testid="worksheet-row">
                  <TableCell className="font-medium">
                    <Link to="/worksheets/$worksheetId" params={{ worksheetId: w.id }} className="hover:underline">
                      {w.title}
                    </Link>
                  </TableCell>
                  <TableCell>{w.subject}</TableCell>
                  <TableCell>{LEVEL_LABELS[w.level]}</TableCell>
                  <TableCell>{w.className ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === "published" ? "default" : "outline"}>
                      {w.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {creating ? <NewWorksheetDialog onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function NewWorksheetDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<"support" | "core" | "extension">("core");
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { id } = await createWorksheet({ data: { title, subject, level } });
      await navigate({ to: "/worksheets/$worksheetId", params: { worksheetId: id } });
    } catch (error) {
      toastError(error);
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New worksheet</DialogTitle>
          </DialogHeader>
          <FormField id="ws-title" label="Title">
            <Input id="ws-title" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="ws-subject" label="Subject">
              <Input id="ws-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </FormField>
            <FormField id="ws-level" label="Level">
              <NativeSelect id="ws-level" className="w-full" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Create worksheet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
