import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { CopyButton } from "@/client/components/CopyButton";
import { EmptyState } from "@/client/components/EmptyState";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
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
import { formatDate, formatDateTime, pct, score } from "@/client/lib/format";
import { getStudentSummary, publishFamilyLink, revokeFamilyLink } from "@/serverFunctions/tracking";

export const Route = createFileRoute("/_teacher/students/$studentId")({
  loader: ({ params }) => getStudentSummary({ data: { id: params.studentId } }),
  component: StudentPage,
});

const STATUS_LABEL = { present: "Present", absent: "Absent", late: "Late" } as const;

function StudentPage() {
  const summary = Route.useLoaderData();
  const router = useRouter();
  const [shared, setShared] = useState<{ url: string; pin: string } | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [pending, setPending] = useState(false);
  if (!summary) return <Missing />;
  const { student, family } = summary;

  async function share() {
    setPending(true);
    try {
      setShared(await publishFamilyLink({ data: { id: student.id } }));
      await router.invalidate();
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  async function revoke() {
    setPending(true);
    try {
      await revokeFamilyLink({ data: { id: student.id } });
      await router.invalidate();
      setRevoking(false);
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={student.name}
        description={student.className}
        backLink={
          <Link to="/classes/$classId" params={{ classId: student.classId }} className="text-sm text-muted-foreground hover:text-foreground">
            ‹ {student.className}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Attendance" testId="attendance-rate" value={pct(summary.attendance.rate)} />
        <Stat label="Average mark" testId="average-mark" value={pct(summary.average)} />
        <Stat
          label="Days recorded"
          value={String(summary.attendance.present + summary.attendance.late + summary.attendance.absent)}
          detail={`${summary.attendance.late} late · ${summary.attendance.absent} absent`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Family results</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" data-testid="family-status">
            {!family
              ? "Not shared"
              : family.lastViewedAt
                ? `Viewed ${family.viewCount} ${family.viewCount === 1 ? "time" : "times"}, last ${formatDateTime(family.lastViewedAt)}`
                : family.locked >= 5
                  ? "Locked after too many wrong PINs"
                  : `Shared ${formatDateTime(family.createdAt)}, not viewed yet`}
          </p>
          <div className="flex gap-2">
            {family ? (
              <>
                <Button variant="outline" onClick={() => setRevoking(true)}>
                  Revoke
                </Button>
                <Button variant="outline" pending={pending} onClick={share}>
                  New link and PIN
                </Button>
              </>
            ) : (
              <Button pending={pending} onClick={share}>
                <Share2 aria-hidden />
                Share with family
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Marks</h2>
        {summary.marks.length === 0 && summary.worksheets.length === 0 ? (
          <EmptyState title="No marks yet" size="sm" />
        ) : (
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.marks.map((m, i) => (
                  <TableRow key={`m${i}`}>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{formatDate(m.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{score(m.score, m.maxScore)}</TableCell>
                  </TableRow>
                ))}
                {summary.worksheets.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <Link to="/submissions/$submissionId" params={{ submissionId: w.id }} className="hover:underline">
                        {w.title}
                      </Link>{" "}
                      <Badge variant="outline">Worksheet</Badge>
                    </TableCell>
                    <TableCell>{formatDate(w.submittedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {score(w.score, w.maxScore)}
                      {w.pending ? " (to mark)" : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent notes</h2>
        {summary.notes.length === 0 ? (
          <EmptyState title="No notes yet" description="Notes and participation from attendance appear here." size="sm" />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {summary.notes.map((n) => (
              <li key={n.date} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
                <span className="text-muted-foreground">{formatDate(n.date)}</span>
                <Badge variant="outline">{STATUS_LABEL[n.status]}</Badge>
                {n.participation !== null ? <span>Participation {n.participation}/5</span> : null}
                {n.note ? <span>{n.note}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {shared ? (
        <Dialog open onOpenChange={(open) => !open && setShared(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share with {student.name}'s family</DialogTitle>
              <DialogDescription>
                Give the family both. The PIN is shown only once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Link</div>
                <div className="flex items-center gap-2">
                  <code data-testid="family-link" className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-sm">
                    {shared.url}
                  </code>
                  <CopyButton value={shared.url} successMessage="Link copied" label="Copy link" size="icon-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">PIN</div>
                <code data-testid="family-pin" className="font-mono text-2xl tracking-widest">
                  {shared.pin}
                </code>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {revoking ? (
        <ConfirmDialog
          title="Revoke the family link?"
          confirmLabel="Revoke"
          destructive
          pending={pending}
          onClose={() => setRevoking(false)}
          onConfirm={revoke}
        >
          The link and PIN stop working right away.
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function Stat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums" data-testid={testId}>
          {value}
        </div>
        {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
