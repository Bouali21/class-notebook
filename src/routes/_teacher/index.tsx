import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ClassDialog } from "@/client/components/ClassDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { createClass, getClasses } from "@/serverFunctions/classes";

export const Route = createFileRoute("/_teacher/")({
  loader: () => getClasses(),
  component: ClassesPage,
});

function ClassesPage() {
  const classes = Route.useLoaderData();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New class
          </Button>
        }
      />
      {classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Create a class, then add your students to it."
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>School year</TableHead>
                <TableHead className="text-right">Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id} data-testid="class-row">
                  <TableCell className="font-medium">
                    <Link to="/classes/$classId" params={{ classId: c.id }} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.subject}</TableCell>
                  <TableCell>{c.grade}</TableCell>
                  <TableCell>{c.schoolYear}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.studentCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {creating ? (
        <ClassDialog
          title="New class"
          submitLabel="Create class"
          onClose={() => setCreating(false)}
          onSubmit={async (fields) => {
            await createClass({ data: fields });
            await router.invalidate();
          }}
        />
      ) : null}
    </>
  );
}
