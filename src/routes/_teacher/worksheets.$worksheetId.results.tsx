import { Link, createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/client/components/EmptyState";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatDateTime, num } from "@/client/lib/format";
import { getResults } from "@/serverFunctions/worksheets";

export const Route = createFileRoute("/_teacher/worksheets/$worksheetId/results")({
  loader: ({ params }) => getResults({ data: { id: params.worksheetId } }),
  component: ResultsPage,
});

function ResultsPage() {
  const results = Route.useLoaderData();
  if (!results) return <Missing />;
  const { worksheet, submissions, notSubmitted } = results;
  return (
    <>
      <PageHeader
        title={`${worksheet.title}: submissions`}
        description={worksheet.className ?? "Not assigned to a class"}
        backLink={
          <Link to="/worksheets/$worksheetId" params={{ worksheetId: worksheet.id }} className="text-sm text-muted-foreground hover:text-foreground">
            ‹ Back to worksheet
          </Link>
        }
      />
      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description={worksheet.status === "published" ? "Answers appear here as students hand them in." : "Publish the worksheet so students can answer it."}
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Handed in</TableHead>
                {worksheet.questions.map((q, i) => (
                  <TableHead key={q.id} className="text-right">
                    Q{i + 1}
                  </TableHead>
                ))}
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id} data-testid="submission-row">
                  <TableCell className="font-medium">
                    <Link to="/submissions/$submissionId" params={{ submissionId: s.id }} className="hover:underline">
                      {s.studentName}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(s.submittedAt)}</TableCell>
                  {worksheet.questions.map((q) => (
                    <TableCell key={q.id} className="text-right tabular-nums">
                      <QuestionCell results={s.results} questionId={q.id} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {num(s.score)} / {num(s.maxScore)}{" "}
                    {s.pending ? <Badge variant="outline">{s.pending} to mark</Badge> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Not handed in</h2>
        {notSubmitted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone in the class has handed it in.</p>
        ) : (
          <ul data-testid="not-submitted" className="flex flex-wrap gap-2">
            {notSubmitted.map((s) => (
              <li key={s.id}>
                <Badge variant="outline">{s.name}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function QuestionCell({ results, questionId }: { results: Record<string, number | null>; questionId: string }) {
  if (!(questionId in results)) return <>—</>;
  const v = results[questionId];
  return <>{v === null || v === undefined ? "…" : num(v)}</>;
}
