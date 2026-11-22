import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { getAdminOverview } from "@/serverFunctions/admin";

export const Route = createFileRoute("/_teacher/admin")({
  loader: () => getAdminOverview(),
  component: AdminPage,
});

function AdminPage() {
  const overview = Route.useLoaderData();
  if (!overview.allowed) {
    return (
      <div data-testid="admin-refused">
        <EmptyState kind="error" icon={ShieldAlert} title="Only workspace admins can open this page" />
      </div>
    );
  }
  return (
    <>
      <PageHeader title="All classes" />
      {overview.classes.length === 0 ? (
        <EmptyState title="No classes yet" />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.teacherEmail ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.subject}</TableCell>
                  <TableCell>{c.grade}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </>
  );
}
