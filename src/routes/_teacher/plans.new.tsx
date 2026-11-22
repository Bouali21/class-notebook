import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/client/components/PageHeader";
import { PlanForm, emptyPlan } from "@/client/components/PlanForm";
import { today } from "@/client/lib/format";
import { getEditorContext } from "@/serverFunctions/classes";
import { createPlan } from "@/serverFunctions/plans";

export const Route = createFileRoute("/_teacher/plans/new")({
  loader: () => getEditorContext({ data: { ai: true } }),
  component: NewPlanPage,
});

function NewPlanPage() {
  const { classes, aiEnabled } = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="New lesson plan" />
      <PlanForm
        initial={emptyPlan(today())}
        classes={classes}
        aiEnabled={aiEnabled}
        onSubmit={async (plan) => {
          const { id } = await createPlan({ data: plan });
          await navigate({ to: "/plans/$planId", params: { planId: id } });
        }}
      />
    </>
  );
}
