import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/client/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { formatDate } from "@/client/lib/format";
import { getEditorContext } from "@/serverFunctions/classes";
import { getPlans } from "@/serverFunctions/plans";

const search = z.object({
  classId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/_teacher/plans/")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [plans, context] = await Promise.all([getPlans({ data: deps }), getEditorContext({ data: {} })]);
    return { plans, classes: context.classes };
  },
  component: PlansPage,
});

function PlansPage() {
  const { plans, classes } = Route.useLoaderData();
  const filter = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const filtered = Boolean(filter.classId || filter.date);
  return (
    <>
      <PageHeader
        title="Lesson plans"
        actions={
          <Button nativeButton={false} render={<Link to="/plans/new" />}>
            <Plus aria-hidden />
            New plan
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <FormField id="filter-class" label="Filter by class">
          <NativeSelect
            id="filter-class"
            value={filter.classId ?? ""}
            onChange={(e) => navigate({ search: (s) => ({ ...s, classId: e.target.value || undefined }) })}
          >
            <NativeSelectOption value="">All classes</NativeSelectOption>
            {classes.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="filter-date" label="Filter by date">
          <Input
            id="filter-date"
            type="date"
            className="w-44"
            value={filter.date ?? ""}
            onChange={(e) => navigate({ search: (s) => ({ ...s, date: e.target.value || undefined }) })}
          />
        </FormField>
        {filtered ? (
          <Button variant="ghost" onClick={() => navigate({ search: {} })}>
            Clear
          </Button>
        ) : null}
      </div>
      {plans.length === 0 ? (
        filtered ? (
          <EmptyState kind="filtered" title="No lesson plans match" />
        ) : (
          <EmptyState title="No lesson plans yet" description="Write a plan for a day's lesson and it will appear here." />
        )
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id} data-testid="plan-row">
                  <TableCell className="whitespace-nowrap">{formatDate(p.date)}</TableCell>
                  <TableCell className="font-medium">
                    <Link to="/plans/$planId" params={{ planId: p.id }} className="hover:underline">
                      {p.topic}
                    </Link>
                  </TableCell>
                  <TableCell>{p.className ?? "—"}</TableCell>
                  <TableCell>{p.subject}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.durationMinutes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </>
  );
}
