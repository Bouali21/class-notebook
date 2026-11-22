import { Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { LEVEL_LABELS, num } from "@/client/lib/format";
import type { Question } from "@/db/schema";

/** A worksheet laid out for paper, with or without its answers. */
export function WorksheetSheet({
  sheet,
  withAnswers,
}: {
  sheet: { id: string; title: string; subject: string; level: keyof typeof LEVEL_LABELS; className: string | null; questions: Question[] };
  withAnswers: boolean;
}) {
  const total = sheet.questions.reduce((s, q) => s + q.points, 0);
  return (
    <>
      <PageHeader
        title={withAnswers ? `${sheet.title}: answer key` : sheet.title}
        description={[sheet.subject, LEVEL_LABELS[sheet.level], sheet.className, `${num(total)} points`].filter(Boolean).join(" · ")}
        backLink={
          <Link to="/worksheets/$worksheetId" params={{ worksheetId: sheet.id }} className="text-sm text-muted-foreground hover:text-foreground print:hidden">
            ‹ Back to worksheet
          </Link>
        }
        actions={
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print
          </Button>
        }
      />
      {!withAnswers ? (
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="border-b border-border pb-1">Name</div>
          <div className="border-b border-border pb-1">Date</div>
        </div>
      ) : null}
      <ol className="space-y-6">
        {sheet.questions.map((q, i) => (
          <li key={q.id} className="space-y-2 break-inside-avoid">
            <div className="flex justify-between gap-3">
              <p className="font-medium whitespace-pre-wrap">
                {i + 1}. {q.prompt}
              </p>
              <span className="shrink-0 text-sm text-muted-foreground">
                {num(q.points)} {q.points === 1 ? "point" : "points"}
              </span>
            </div>
            {q.kind === "choice" ? (
              <ul className="space-y-1 pl-5">
                {q.choices.map((c, k) => (
                  <li key={k} className={withAnswers && k === q.correctChoice ? "font-semibold text-primary" : undefined}>
                    {String.fromCharCode(65 + k)}. {c}
                    {withAnswers && k === q.correctChoice ? " ✓" : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {q.kind === "short" ? (
              withAnswers ? (
                <p className="pl-5 font-semibold text-primary">{q.expectedAnswer}</p>
              ) : (
                <div className="ml-5 h-8 border-b border-border" />
              )
            ) : null}
            {q.kind === "open" ? (
              withAnswers ? (
                <p className="pl-5 text-sm text-muted-foreground">Marked by the teacher</p>
              ) : (
                <div className="ml-5 h-28 rounded-md border border-border" />
              )
            ) : null}
          </li>
        ))}
      </ol>
    </>
  );
}
