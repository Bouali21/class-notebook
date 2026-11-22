import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ClipboardCheck, KeyRound, Plus, Printer, Sparkles, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { FormField } from "@/client/components/FormField";
import { Missing } from "@/client/components/Missing";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/client/components/ui/native-select";
import { Textarea } from "@/client/components/ui/textarea";
import { toastError } from "@/client/lib/errors";
import { LEVEL_LABELS } from "@/client/lib/format";
import type { Question, QuestionKind } from "@/db/schema";
import { draftQuestions } from "@/serverFunctions/ai";
import { getEditorContext } from "@/serverFunctions/classes";
import { deleteWorksheet, getWorksheet, saveWorksheet, setPublished } from "@/serverFunctions/worksheets";

export const Route = createFileRoute("/_teacher/worksheets/$worksheetId/")({
  loader: async ({ params }) => {
    const [sheet, context] = await Promise.all([
      getWorksheet({ data: { id: params.worksheetId } }),
      getEditorContext({ data: { ai: true } }),
    ]);
    return { sheet, ...context };
  },
  component: WorksheetPage,
});

const KIND_LABEL: Record<QuestionKind, string> = {
  choice: "Multiple choice",
  short: "Short answer",
  open: "Open response",
};

function newQuestion(kind: QuestionKind): Question {
  return {
    id: crypto.randomUUID(),
    kind,
    prompt: "",
    points: 1,
    choices: kind === "choice" ? ["", ""] : [],
    correctChoice: kind === "choice" ? 0 : null,
    expectedAnswer: "",
  };
}

function WorksheetPage() {
  const { sheet, classes, aiEnabled } = Route.useLoaderData();
  if (!sheet) return <Missing />;
  return <Editor key={sheet.id} sheet={sheet} classes={classes} aiEnabled={aiEnabled} />;
}

type Sheet = NonNullable<ReturnType<typeof Route.useLoaderData>["sheet"]>;

function Editor({ sheet, classes, aiEnabled }: { sheet: Sheet; classes: { id: string; name: string }[]; aiEnabled: boolean }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [title, setTitle] = useState(sheet.title);
  const [subject, setSubject] = useState(sheet.subject);
  const [level, setLevel] = useState(sheet.level);
  const [classId, setClassId] = useState<string | null>(sheet.classId);
  const [questions, setQuestions] = useState<Question[]>(sheet.questions);
  const [pending, setPending] = useState<"save" | "publish" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const published = sheet.status === "published";

  const update = (i: number, change: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...change } : q)));
  const move = (i: number, by: number) =>
    setQuestions((qs) => {
      const next = [...qs];
      const [q] = next.splice(i, 1);
      next.splice(i + by, 0, q!);
      return next;
    });

  const persist = () => saveWorksheet({ data: { id: sheet.id, title, subject, level, classId, questions } });

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setPending("save");
    try {
      await persist();
      await router.invalidate();
      toast.success("Worksheet saved");
    } catch (error) {
      toastError(error);
    } finally {
      setPending(null);
    }
  }

  async function togglePublished() {
    setPending("publish");
    try {
      if (!published) await persist();
      await setPublished({ data: { id: sheet.id, published: !published } });
      await router.invalidate();
      toast.success(published ? "Back to draft" : "Published");
    } catch (error) {
      toastError(error);
    } finally {
      setPending(null);
    }
  }

  const total = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <>
      <PageHeader
        title={sheet.title}
        description={
          <span className="inline-flex items-center gap-2">
            <Badge data-testid="worksheet-status" variant={published ? "default" : "outline"}>
              {published ? "Published" : "Draft"}
            </Badge>
            {sheet.className ? <span>{sheet.className}</span> : null}
          </span>
        }
        backLink={
          <Link to="/worksheets" className="text-sm text-muted-foreground hover:text-foreground">
            ‹ Worksheets
          </Link>
        }
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link to="/worksheets/$worksheetId/print" params={{ worksheetId: sheet.id }} />}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/worksheets/$worksheetId/key" params={{ worksheetId: sheet.id }} />}>
              <KeyRound aria-hidden />
              Answer key
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/worksheets/$worksheetId/results" params={{ worksheetId: sheet.id }} />}>
              <ClipboardCheck aria-hidden />
              Submissions
            </Button>
            <Button variant={published ? "outline" : "default"} pending={pending === "publish"} onClick={togglePublished}>
              {published ? "Unpublish" : "Publish"}
            </Button>
          </>
        }
      />
      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="ws-title" label="Title" className="space-y-1.5 sm:col-span-2">
              <Input id="ws-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormField>
            <FormField id="ws-subject" label="Subject">
              <Input id="ws-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </FormField>
            <FormField id="ws-level" label="Level">
              <NativeSelect id="ws-level" className="w-full" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="ws-class" label="Assigned class" className="space-y-1.5 sm:col-span-2">
              <NativeSelect id="ws-class" className="w-full" value={classId ?? ""} onChange={(e) => setClassId(e.target.value || null)}>
                <NativeSelectOption value="">Not assigned</NativeSelectOption>
                {classes.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Questions <span className="text-sm font-normal text-muted-foreground">· {total} points</span>
          </h2>
          {aiEnabled ? (
            <Button type="button" variant="outline" onClick={() => setDrafting(true)}>
              <Sparkles aria-hidden />
              Draft with AI
            </Button>
          ) : null}
        </div>

        {questions.map((q, i) => {
          const n = i + 1;
          return (
            <Card key={q.id} data-testid="question">
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{KIND_LABEL[q.kind]}</Badge>
                  <div className="flex items-center">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${n} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp aria-hidden />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${n} down`} disabled={i === questions.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown aria-hidden />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete question ${n}`} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                  <FormField id={`q-${q.id}`} label={`Question ${n}`}>
                    <Textarea id={`q-${q.id}`} rows={2} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
                  </FormField>
                  <FormField id={`q-${q.id}-points`} label={<span>Points<span className="sr-only"> for question {n}</span></span>}>
                    <Input
                      id={`q-${q.id}-points`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={q.points}
                      onChange={(e) => update(i, { points: Number(e.target.value) })}
                    />
                  </FormField>
                </div>
                {q.kind === "choice" ? (
                  <div className="space-y-2">
                    {q.choices.map((choice, c) => (
                      <div key={c} className="flex items-center gap-2">
                        <span className="w-6 text-sm text-muted-foreground">{String.fromCharCode(65 + c)}</span>
                        <Input
                          aria-label={`Question ${n} choice ${c + 1}`}
                          value={choice}
                          onChange={(e) => update(i, { choices: q.choices.map((x, k) => (k === c ? e.target.value : x)) })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove choice ${c + 1} from question ${n}`}
                          disabled={q.choices.length <= 2}
                          onClick={() =>
                            update(i, {
                              choices: q.choices.filter((_, k) => k !== c),
                              correctChoice:
                                q.correctChoice === c ? 0 : q.correctChoice !== null && q.correctChoice > c ? q.correctChoice - 1 : q.correctChoice,
                            })
                          }
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Add choice to question ${n}`}
                        disabled={q.choices.length >= 8}
                        onClick={() => update(i, { choices: [...q.choices, ""] })}
                      >
                        <Plus aria-hidden />
                        Add choice
                      </Button>
                      <FormField id={`q-${q.id}-correct`} label={<span>Correct choice<span className="sr-only"> for question {n}</span></span>}>
                        <NativeSelect
                          id={`q-${q.id}-correct`}
                          size="sm"
                          value={q.correctChoice === null ? "" : String(q.correctChoice)}
                          onChange={(e) => update(i, { correctChoice: Number(e.target.value) })}
                        >
                          {q.choices.map((_, c) => (
                            <NativeSelectOption key={c} value={String(c)}>
                              {`Choice ${c + 1}`}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </FormField>
                    </div>
                  </div>
                ) : null}
                {q.kind === "short" ? (
                  <FormField id={`q-${q.id}-expected`} label={<span>Expected answer<span className="sr-only"> for question {n}</span></span>}>
                    <Input id={`q-${q.id}-expected`} value={q.expectedAnswer} onChange={(e) => update(i, { expectedAnswer: e.target.value })} />
                  </FormField>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-2">
          {(["choice", "short", "open"] as const).map((kind) => (
            <Button key={kind} type="button" variant="outline" onClick={() => setQuestions((qs) => [...qs, newQuestion(kind)])}>
              <Plus aria-hidden />
              Add {KIND_LABEL[kind].toLowerCase()}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDeleting(true)}>
            Delete worksheet
          </Button>
          <Button type="submit" pending={pending === "save"}>
            Save worksheet
          </Button>
        </div>
      </form>
      {drafting ? (
        <DraftDialog
          subject={subject}
          level={level}
          initialTopic={title}
          onClose={() => setDrafting(false)}
          onDrafted={(qs) => setQuestions((current) => [...current, ...qs])}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${sheet.title}?`}
          confirmLabel="Delete"
          destructive
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            try {
              await deleteWorksheet({ data: { id: sheet.id } });
              await navigate({ to: "/worksheets" });
            } catch (error) {
              toastError(error);
            }
          }}
        >
          Students' submissions for it are deleted too.
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function DraftDialog({
  subject,
  level,
  initialTopic,
  onClose,
  onDrafted,
}: {
  subject: string;
  level: "support" | "core" | "extension";
  initialTopic: string;
  onClose: () => void;
  onDrafted: (questions: Question[]) => void;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      onDrafted(await draftQuestions({ data: { subject, topic, level } }));
      onClose();
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Draft questions</DialogTitle>
          </DialogHeader>
          <FormField id="draft-topic" label="Topic">
            <Input id="draft-topic" required value={topic} onChange={(e) => setTopic(e.target.value)} autoFocus />
          </FormField>
          <DialogFooter>
            <Button type="submit" pending={pending}>
              Draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
