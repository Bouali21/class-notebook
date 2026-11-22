import { Link, createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { formatDate } from "@/client/lib/format";
import { getPlan } from "@/serverFunctions/plans";

export const Route = createFileRoute("/_teacher/plans/$planId/print")({
  loader: ({ params }) => getPlan({ data: { id: params.planId } }),
  component: PrintPlanPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <section className="space-y-1 break-inside-avoid">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="whitespace-pre-wrap">{children}</div>
    </section>
  );
}

function PrintPlanPage() {
  const plan = Route.useLoaderData();
  if (!plan) return <Missing />;
  return (
    <>
      <PageHeader
        title={plan.topic}
        description={[formatDate(plan.date), plan.className, plan.subject, `${plan.durationMinutes} minutes`]
          .filter(Boolean)
          .join(" · ")}
        backLink={
          <Link to="/plans/$planId" params={{ planId: plan.id }} className="text-sm text-muted-foreground hover:text-foreground print:hidden">
            ‹ Back to plan
          </Link>
        }
        actions={
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print
          </Button>
        }
      />
      <div className="space-y-6">
        <Section title="Learning objectives">{plan.objectives}</Section>
        <Section title="Teaching strategies">{plan.strategies}</Section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Lesson stages</h2>
          <ol className="divide-y divide-border rounded-lg border border-border">
            {plan.stages.map((s) => (
              <li key={s.name} className="grid grid-cols-[7rem_4rem_1fr] gap-3 p-3 break-inside-avoid">
                <span className="font-medium">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">{s.minutes} min</span>
                <span className="whitespace-pre-wrap">{s.activity}</span>
              </li>
            ))}
          </ol>
        </section>
        <Section title="Materials">{plan.materials}</Section>
        <Section title="Assessment">{plan.assessment}</Section>
        <Section title="Notes">{plan.notes}</Section>
      </div>
    </>
  );
}
