import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Copy, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { PlanForm } from "@/client/components/PlanForm";
import { Button } from "@/client/components/ui/button";
import { toastError } from "@/client/lib/errors";
import { formatDate } from "@/client/lib/format";
import { getEditorContext } from "@/serverFunctions/classes";
import { deletePlan, duplicatePlan, getPlan, updatePlan } from "@/serverFunctions/plans";

export const Route = createFileRoute("/_teacher/plans/$planId/")({
  loader: async ({ params }) => {
    const [plan, context] = await Promise.all([
      getPlan({ data: { id: params.planId } }),
      getEditorContext({ data: { ai: true } }),
    ]);
    return { plan, ...context };
  },
  component: PlanPage,
});

function PlanPage() {
  const { plan, classes, aiEnabled } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  if (!plan) return <Missing />;

  async function duplicate() {
    setPending(true);
    try {
      const { id } = await duplicatePlan({ data: { id: plan!.id } });
      toast.success("Copy made");
      await navigate({ to: "/plans/$planId", params: { planId: id } });
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={plan.topic}
        description={[formatDate(plan.date), plan.className].filter(Boolean).join(" · ")}
        backLink={
          <Link to="/plans" className="text-sm text-muted-foreground hover:text-foreground">
            ‹ Lesson plans
          </Link>
        }
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/plans/$planId/print" params={{ planId: plan.id }} />}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button variant="outline" pending={pending} onClick={duplicate}>
              <Copy aria-hidden />
              Duplicate
            </Button>
          </>
        }
      />
      <PlanForm
        key={plan.id}
        initial={plan}
        classes={classes}
        aiEnabled={aiEnabled}
        onSubmit={async (fields) => {
          await updatePlan({ data: { id: plan.id, ...fields } });
          await router.invalidate();
          toast.success("Plan saved");
        }}
        actions={
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        }
      />
      {deleting ? (
        <ConfirmDialog
          title="Delete this lesson plan?"
          confirmLabel="Delete"
          destructive
          pending={pending}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            setPending(true);
            try {
              await deletePlan({ data: { id: plan.id } });
              await navigate({ to: "/plans" });
            } catch (error) {
              toastError(error);
              setPending(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
