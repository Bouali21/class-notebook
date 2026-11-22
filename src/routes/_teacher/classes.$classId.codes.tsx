import { Link, createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { useOrigin } from "@/client/hooks/useOrigin";
import { getClass } from "@/serverFunctions/classes";

export const Route = createFileRoute("/_teacher/classes/$classId/codes")({
  loader: ({ params }) => getClass({ data: { id: params.classId } }),
  component: CodesPage,
});

function CodesPage() {
  const cls = Route.useLoaderData();
  const origin = useOrigin();
  if (!cls) return <Missing />;
  return (
    <>
      <PageHeader
        title={`${cls.name}: access codes`}
        description={`Students open ${origin}/student and enter their code.`}
        backLink={
          <Link to="/classes/$classId" params={{ classId: cls.id }} className="text-sm text-muted-foreground hover:text-foreground print:hidden">
            ‹ Back to roster
          </Link>
        }
        actions={
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print
          </Button>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {cls.students.map((s) => (
          <li key={s.id} className="rounded-lg border border-dashed border-border p-4 break-inside-avoid">
            <div className="font-medium">{s.name}</div>
            <div className="mt-1 font-mono text-2xl tracking-widest">{s.accessCode}</div>
            <div className="mt-1 text-xs text-muted-foreground">{cls.name}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
