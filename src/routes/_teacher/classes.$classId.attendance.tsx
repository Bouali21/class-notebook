import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ClassTabs } from "@/client/components/ClassTabs";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { Missing } from "@/client/components/Missing";
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
import { toastError } from "@/client/lib/errors";
import { today } from "@/client/lib/format";
import { getAttendance, saveAttendance } from "@/serverFunctions/tracking";

export const Route = createFileRoute("/_teacher/classes/$classId/attendance")({
  validateSearch: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ params, deps }) => {
    const date = deps.date ?? today();
    return { date, data: await getAttendance({ data: { classId: params.classId, date } }) };
  },
  component: AttendancePage,
});

type Status = "present" | "absent" | "late";
const STATUSES: { value: Status; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
];

function AttendancePage() {
  const { date, data } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const [entries, setEntries] = useState(data?.entries ?? []);
  const [pending, setPending] = useState(false);
  useEffect(() => setEntries(data?.entries ?? []), [data]);
  if (!data) return <Missing />;

  const update = (studentId: string, change: Partial<(typeof entries)[number]>) =>
    setEntries((list) => list.map((e) => (e.studentId === studentId ? { ...e, ...change } : e)));

  async function save() {
    setPending(true);
    try {
      await saveAttendance({
        data: {
          classId: data!.class.id,
          date,
          entries: entries.map(({ studentId, status, participation, note }) => ({ studentId, status, participation, note })),
        },
      });
      await router.invalidate();
      toast.success("Attendance saved");
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader title={data.class.name} />
      <ClassTabs classId={data.class.id} active="Attendance" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormField id="attendance-date" label="Date">
          <Input
            id="attendance-date"
            type="date"
            className="w-44"
            value={date}
            onChange={(e) => e.target.value && navigate({ search: { date: e.target.value } })}
          />
        </FormField>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEntries((list) => list.map((e) => ({ ...e, status: e.status ?? "present" })))}
          >
            Mark rest present
          </Button>
          <Button onClick={save} pending={pending} disabled={entries.length === 0}>
            Save attendance
          </Button>
        </div>
      </div>
      {entries.length === 0 ? (
        <EmptyState title="No students in this class" />
      ) : (
        <TableCard data-testid="attendance-table" data-date={date}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Participation</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.studentId} data-testid="attendance-row">
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" role="group" aria-label={`Status for ${e.name}`}>
                      {STATUSES.map((s) => (
                        <Button
                          key={s.value}
                          size="sm"
                          variant={e.status === s.value ? (s.value === "absent" ? "destructive" : "default") : "outline"}
                          aria-pressed={e.status === s.value}
                          onClick={() => update(e.studentId, { status: e.status === s.value ? null : s.value })}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      size="sm"
                      aria-label={`Participation for ${e.name}`}
                      value={e.participation === null ? "" : String(e.participation)}
                      onChange={(ev) =>
                        update(e.studentId, { participation: ev.target.value ? Number(ev.target.value) : null })
                      }
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <NativeSelectOption key={n} value={String(n)}>
                          {n} / 5
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="min-w-48">
                    <Input
                      aria-label={`Note for ${e.name}`}
                      value={e.note}
                      onChange={(ev) => update(e.studentId, { note: ev.target.value })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </>
  );
}
