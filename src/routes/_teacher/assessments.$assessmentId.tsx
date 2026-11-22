import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
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
import { formatDate, num } from "@/client/lib/format";
import { deleteAssessment, getAssessment, saveMarks } from "@/serverFunctions/tracking";

export const Route = createFileRoute("/_teacher/assessments/$assessmentId")({
  loader: ({ params }) => getAssessment({ data: { id: params.assessmentId } }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const assessment = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const initial = () =>
    Object.fromEntries((assessment?.marks ?? []).map((m) => [m.studentId, m.score === null ? "" : String(m.score)]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setValues(initial()), [assessment]);
  if (!assessment) return <Missing />;

  async function save() {
    setPending(true);
    try {
      await saveMarks({
        data: {
          assessmentId: assessment!.id,
          marks: assessment!.marks.map((m) => ({
            studentId: m.studentId,
            score: values[m.studentId]?.trim() ? Number(values[m.studentId]) : null,
          })),
        },
      });
      await router.invalidate();
      toast.success("Marks saved");
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={assessment.title}
        description={`${assessment.className} · ${formatDate(assessment.date)} · out of ${num(assessment.maxScore)}`}
        backLink={
          <Link to="/classes/$classId/grades" params={{ classId: assessment.classId }} className="text-sm text-muted-foreground hover:text-foreground">
            ‹ Gradebook
          </Link>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleting(true)}>
              Delete
            </Button>
            <Button onClick={save} pending={pending}>
              Save marks
            </Button>
          </>
        }
      />
      {assessment.marks.length === 0 ? (
        <EmptyState title="No students in this class" />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-40">Mark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessment.marks.map((m) => (
                <TableRow key={m.studentId}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={assessment.maxScore}
                      step="0.5"
                      aria-label={`Mark for ${m.name}`}
                      value={values[m.studentId] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.studentId]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${assessment.title}?`}
          confirmLabel="Delete"
          destructive
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await deleteAssessment({ data: { id: assessment.id } });
              await navigate({ to: "/classes/$classId/grades", params: { classId: assessment.classId } });
            } catch (error) {
              toastError(error);
            }
          }}
        >
          Every mark entered for it is deleted.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
