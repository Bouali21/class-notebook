import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { toastError } from "@/client/lib/errors";
import { formatDateTime, num } from "@/client/lib/format";
import { getSubmission, scoreSubmission } from "@/serverFunctions/worksheets";

export const Route = createFileRoute("/_teacher/submissions/$submissionId")({
  loader: ({ params }) => getSubmission({ data: { id: params.submissionId } }),
  component: SubmissionPage,
});

function SubmissionPage() {
  const sub = Route.useLoaderData();
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (sub?.answers ?? []).filter((a) => a.score !== null).map((a) => [a.questionId, String(a.score)]),
    ),
  );
  const [pending, setPending] = useState(false);
  if (!sub) return <Missing />;
  const answers = new Map(sub.answers.map((a) => [a.questionId, a]));
  const hasOpen = sub.worksheet.questions.some((q) => q.kind === "open");

  async function save() {
    setPending(true);
    try {
      const open = sub!.worksheet.questions.filter((q) => q.kind === "open" && scores[q.id]?.trim());
      await scoreSubmission({
        data: {
          submissionId: sub!.id,
          scores: Object.fromEntries(open.map((q) => [q.id, Number(scores[q.id])])),
        },
      });
      await router.invalidate();
      toast.success("Scores saved");
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`${sub.studentName}: ${sub.worksheet.title}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>Handed in {formatDateTime(sub.submittedAt)}</span>
            <span>·</span>
            <span data-testid="submission-total" className="font-medium text-foreground tabular-nums">
              {num(sub.score)} / {num(sub.maxScore)}
            </span>
            {sub.pending ? <Badge variant="outline">{sub.pending} to mark</Badge> : null}
          </span>
        }
        backLink={
          <Link to="/worksheets/$worksheetId/results" params={{ worksheetId: sub.worksheet.id }} className="text-sm text-muted-foreground hover:text-foreground">
            ‹ All submissions
          </Link>
        }
        actions={
          hasOpen ? (
            <Button onClick={save} pending={pending}>
              Save scores
            </Button>
          ) : null
        }
      />
      <ol className="space-y-4">
        {sub.worksheet.questions.map((q, i) => {
          const a = answers.get(q.id);
          const given =
            q.kind === "choice" && a?.answer !== undefined && a.answer !== ""
              ? (q.choices[Number(a.answer)] ?? "")
              : (a?.answer ?? "");
          return (
            <Card key={q.id}>
              <CardContent className="space-y-2">
                <div className="flex justify-between gap-3">
                  <p className="font-medium whitespace-pre-wrap">
                    {i + 1}. {q.prompt}
                  </p>
                  <span className="shrink-0 text-sm text-muted-foreground">{num(q.points)} pts</span>
                </div>
                <p className="whitespace-pre-wrap rounded-md bg-muted p-2 text-sm">{given || "No answer"}</p>
                {q.kind === "open" ? (
                  <div className="flex items-center gap-2">
                    <label htmlFor={`score-${q.id}`} className="text-sm">
                      Score for question {i + 1}
                    </label>
                    <Input
                      id={`score-${q.id}`}
                      type="number"
                      min="0"
                      max={q.points}
                      step="0.5"
                      className="w-24"
                      value={scores[q.id] ?? ""}
                      onChange={(e) => setScores((s) => ({ ...s, [q.id]: e.target.value }))}
                    />
                    <span className="text-sm text-muted-foreground">of {num(q.points)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    {a?.score ? (
                      <Check className="size-4 text-primary" aria-hidden />
                    ) : (
                      <X className="size-4 text-destructive" aria-hidden />
                    )}
                    <span>
                      {a?.score ? "Correct" : "Incorrect"} · {num(a?.score ?? 0)} of {num(q.points)}
                    </span>
                    {!a?.score ? (
                      <span className="text-muted-foreground">
                        Expected: {q.kind === "choice" ? q.choices[q.correctChoice ?? -1] : q.expectedAnswer}
                      </span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </ol>
    </>
  );
}
