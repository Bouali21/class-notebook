import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ClassTabs } from "@/client/components/ClassTabs";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
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
import { num, pct, score, today } from "@/client/lib/format";
import { createAssessment, getGradebook } from "@/serverFunctions/tracking";

export const Route = createFileRoute("/_teacher/classes/$classId/grades")({
  loader: ({ params }) => getGradebook({ data: { id: params.classId } }),
  component: GradebookPage,
});

function GradebookPage() {
  const book = Route.useLoaderData();
  const [creating, setCreating] = useState(false);
  if (!book) return <Missing />;
  const empty = book.assessments.length === 0 && book.worksheets.length === 0;
  return (
    <>
      <PageHeader
        title={book.class.name}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New assessment
          </Button>
        }
      />
      <ClassTabs classId={book.class.id} active="Gradebook" />
      {book.rows.length === 0 ? (
        <EmptyState title="No students in this class" />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {book.assessments.map((a) => (
                  <TableHead key={a.id} className="text-right">
                    <Link to="/assessments/$assessmentId" params={{ assessmentId: a.id }} className="hover:underline">
                      {a.title}
                    </Link>
                    <div className="text-xs font-normal">out of {num(a.maxScore)}</div>
                  </TableHead>
                ))}
                {book.worksheets.map((w) => (
                  <TableHead key={w.id} className="text-right">
                    <Link to="/worksheets/$worksheetId/results" params={{ worksheetId: w.id }} className="hover:underline">
                      {w.title}
                    </Link>
                    <div className="text-xs font-normal">worksheet</div>
                  </TableHead>
                ))}
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead className="text-right">Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {book.rows.map((r) => (
                <TableRow key={r.id} data-testid="gradebook-row">
                  <TableCell className="font-medium">
                    <Link to="/students/$studentId" params={{ studentId: r.id }} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  {book.assessments.map((a) => (
                    <TableCell key={a.id} className="text-right tabular-nums">
                      {r.marks[a.id] === undefined ? "—" : score(r.marks[a.id]!, a.maxScore)}
                    </TableCell>
                  ))}
                  {book.worksheets.map((w) => {
                    const s = r.worksheets[w.id];
                    return (
                      <TableCell key={w.id} className="text-right tabular-nums">
                        {s ? `${score(s.score, s.maxScore)}${s.pending ? " (to mark)" : ""}` : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right tabular-nums">{pct(r.attendanceRate)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{pct(r.average)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {empty && book.rows.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Create an assessment to enter marks.
        </p>
      ) : null}
      {creating ? <AssessmentDialog classId={book.class.id} onClose={() => setCreating(false)} /> : null}
    </>
  );
}

function AssessmentDialog({ classId, onClose }: { classId: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [maxScore, setMaxScore] = useState("10");
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createAssessment({ data: { classId, title, date, maxScore: Number(maxScore) } });
      onClose();
      await router.invalidate();
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
            <DialogTitle>New assessment</DialogTitle>
          </DialogHeader>
          <FormField id="assessment-title" label="Title">
            <Input id="assessment-title" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="assessment-date" label="Date">
              <Input id="assessment-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField id="assessment-max" label="Max score">
              <Input id="assessment-max" type="number" min="0.5" step="0.5" required value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Create assessment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
