import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Pencil, Printer, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClassDialog } from "@/client/components/ClassDialog";
import { ClassTabs } from "@/client/components/ClassTabs";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Textarea } from "@/client/components/ui/textarea";
import { toastError } from "@/client/lib/errors";
import {
  addStudents,
  deleteClass,
  getClass,
  regenerateCode,
  removeStudent,
  renameStudent,
  updateClass,
} from "@/serverFunctions/classes";

export const Route = createFileRoute("/_teacher/classes/$classId/")({
  loader: ({ params }) => getClass({ data: { id: params.classId } }),
  component: ClassPage,
});

type Student = { id: string; name: string; accessCode: string };

function ClassPage() {
  const cls = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<
    | { kind: "add" }
    | { kind: "edit-class" }
    | { kind: "delete-class" }
    | { kind: "rename"; student: Student }
    | { kind: "remove"; student: Student }
    | null
  >(null);
  const [pending, setPending] = useState(false);
  if (!cls) return <Missing />;
  const close = () => setDialog(null);

  async function run(action: () => Promise<unknown>, done?: string) {
    setPending(true);
    try {
      await action();
      await router.invalidate();
      if (done) toast.success(done);
      close();
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  const meta = [cls.subject, cls.grade && `Grade ${cls.grade}`, cls.schoolYear]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={cls.name}
        description={meta || undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog({ kind: "edit-class" })}>
              <Pencil aria-hidden />
              Edit class
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/classes/$classId/codes" params={{ classId: cls.id }} />}>
              <Printer aria-hidden />
              Print codes
            </Button>
            <Button onClick={() => setDialog({ kind: "add" })}>
              <UserPlus aria-hidden />
              Add students
            </Button>
          </>
        }
      />
      <ClassTabs classId={cls.id} active="Roster" />
      {cls.students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add students to give each one an access code."
        />
      ) : (
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Access code</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cls.students.map((s) => (
                <TableRow key={s.id} data-testid="student-row">
                  <TableCell className="font-medium">
                    <Link to="/students/$studentId" params={{ studentId: s.id }} className="hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code data-testid="access-code" className="font-mono tracking-widest">
                      {s.accessCode}
                    </code>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${s.name}`}
                      onClick={() => setDialog({ kind: "rename", student: s })}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`New code for ${s.name}`}
                      title="New code"
                      onClick={() => run(() => regenerateCode({ data: { id: s.id } }), `New code for ${s.name}`)}
                    >
                      <RefreshCw aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${s.name}`}
                      onClick={() => setDialog({ kind: "remove", student: s })}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" className="text-destructive" onClick={() => setDialog({ kind: "delete-class" })}>
          Delete class
        </Button>
      </div>

      {dialog?.kind === "add" ? (
        <AddStudentsDialog
          pending={pending}
          onClose={close}
          onSubmit={(names) => run(() => addStudents({ data: { classId: cls.id, names } }))}
        />
      ) : null}
      {dialog?.kind === "rename" ? (
        <RenameDialog
          student={dialog.student}
          pending={pending}
          onClose={close}
          onSubmit={(name) => run(() => renameStudent({ data: { id: dialog.student.id, name } }))}
        />
      ) : null}
      {dialog?.kind === "remove" ? (
        <ConfirmDialog
          title={`Remove ${dialog.student.name}?`}
          confirmLabel="Remove"
          destructive
          pending={pending}
          onClose={close}
          onConfirm={() => run(() => removeStudent({ data: { id: dialog.student.id } }))}
        >
          Their attendance, marks and submitted worksheets are deleted too.
        </ConfirmDialog>
      ) : null}
      {dialog?.kind === "edit-class" ? (
        <ClassDialog
          title="Edit class"
          submitLabel="Save"
          initial={{ name: cls.name, subject: cls.subject, grade: cls.grade, schoolYear: cls.schoolYear }}
          onClose={close}
          onSubmit={async (fields) => {
            await updateClass({ data: { id: cls.id, ...fields } });
            await router.invalidate();
          }}
        />
      ) : null}
      {dialog?.kind === "delete-class" ? (
        <ConfirmDialog
          title={`Delete ${cls.name}?`}
          confirmLabel="Delete class"
          destructive
          pending={pending}
          onClose={close}
          onConfirm={() =>
            run(async () => {
              await deleteClass({ data: { id: cls.id } });
              await navigate({ to: "/" });
            })
          }
        >
          Its students, attendance, marks and submissions are deleted. Its lesson plans and worksheets stay.
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function AddStudentsDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (names: string[]) => void;
}) {
  const [text, setText] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(text.split(/\r?\n/).map((n) => n.trim()).filter(Boolean));
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add students</DialogTitle>
            <DialogDescription>One name per line.</DialogDescription>
          </DialogHeader>
          <FormField id="student-names" label="Names">
            <Textarea id="student-names" rows={8} required value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </FormField>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  student,
  pending,
  onClose,
  onSubmit,
}: {
  student: Student;
  pending: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(student.name);
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(name);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
          </DialogHeader>
          <FormField id="student-name" label="Name">
            <Input id="student-name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormField>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
