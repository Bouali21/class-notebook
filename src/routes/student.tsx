import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { FormField } from "@/client/components/FormField";
import { PageHeader } from "@/client/components/PageHeader";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";
import { Textarea } from "@/client/components/ui/textarea";
import { num } from "@/client/lib/format";

// Public: students have no account. Their code travels with each request, never in a cookie.
export const Route = createFileRoute("/student")({
  head: () => ({ meta: [{ title: "Student worksheets" }] }),
  component: StudentPage,
});

interface Session {
  student: { name: string };
  className: string;
  worksheets: { id: string; title: string; subject: string; submitted: boolean }[];
}
interface Sheet {
  id: string;
  title: string;
  questions: { id: string; kind: "choice" | "short" | "open"; prompt: string; points: number; choices: string[] }[];
  result: Result | null;
}
interface Result {
  score: number;
  maxScore: number;
  pending: number;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

function StudentPage() {
  const [code, setCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function attempt(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  const refresh = () => post<Session>("/api/student/session", { code }).then(setSession);

  return (
    <AppShell backLink={false}>
      {!session ? (
        <>
          <PageHeader title="Worksheets" description="Enter the code your teacher gave you." />
          <form
            className="max-w-sm space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void attempt(refresh);
            }}
          >
            <FormField id="access-code" label="Access code">
              <Input
                id="access-code"
                required
                autoComplete="off"
                autoCapitalize="characters"
                className="font-mono text-lg tracking-widest uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </FormField>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" pending={pending}>
              Continue
            </Button>
          </form>
        </>
      ) : sheet ? (
        <Answer
          sheet={sheet}
          code={code}
          onBack={() => {
            setSheet(null);
            void attempt(refresh);
          }}
        />
      ) : (
        <>
          <PageHeader
            title={`Hi, ${session.student.name}`}
            description={session.className}
            actions={
              <Button
                variant="ghost"
                onClick={() => {
                  setSession(null);
                  setCode("");
                }}
              >
                Not you?
              </Button>
            }
          />
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {session.worksheets.length === 0 ? (
            <EmptyState title="No worksheets yet" description="When your teacher publishes one for your class, it shows up here." />
          ) : (
            <ul className="space-y-2">
              {session.worksheets.map((w) => (
                <li key={w.id}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full justify-between"
                    disabled={pending}
                    onClick={() =>
                      attempt(async () => setSheet(await post<Sheet>("/api/student/worksheet", { code, worksheetId: w.id })))
                    }
                  >
                    <span className="truncate">
                      {w.title}
                      {w.subject ? <span className="text-muted-foreground"> · {w.subject}</span> : null}
                    </span>
                    {w.submitted ? <Badge variant="outline">Handed in</Badge> : <ChevronRight aria-hidden />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AppShell>
  );
}

function Answer({ sheet, code, onBack }: { sheet: Sheet; code: string; onBack: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(sheet.result);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(answers).map(([id, v]) => {
          const q = sheet.questions.find((x) => x.id === id);
          return [id, q?.kind === "choice" ? Number(v) : v];
        }),
      );
      setResult(await post<Result>("/api/student/submit", { code, worksheetId: sheet.id, answers: payload }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  const back = (
    <Button variant="ghost" onClick={onBack}>
      ‹ My worksheets
    </Button>
  );

  if (result) {
    return (
      <>
        <PageHeader title={sheet.title} backLink={back} />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="size-10 text-primary" aria-hidden />
            <div className="text-lg font-semibold">Handed in</div>
            <div className="text-3xl font-semibold tabular-nums" data-testid="student-score">
              {num(result.score)} / {num(result.maxScore)}
            </div>
            {result.pending ? (
              <p className="text-sm text-muted-foreground">
                {result.pending === 1 ? "One answer is" : `${result.pending} answers are`} still to be marked by your teacher.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={sheet.title} backLink={back} />
      <form onSubmit={submit} className="space-y-4">
        {sheet.questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="space-y-3">
              <div className="flex justify-between gap-3">
                <Label htmlFor={`a-${q.id}`} id={`l-${q.id}`} className="text-base whitespace-pre-wrap">
                  {q.prompt}
                </Label>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {i + 1} · {num(q.points)} pts
                </span>
              </div>
              {q.kind === "choice" ? (
                <RadioGroup aria-labelledby={`l-${q.id}`} value={answers[q.id] ?? ""} onValueChange={(v) => set(q.id, String(v))}>
                  {q.choices.map((c, k) => (
                    <Label key={k} className="flex items-center gap-2 font-normal">
                      <RadioGroupItem value={String(k)} />
                      {c}
                    </Label>
                  ))}
                </RadioGroup>
              ) : q.kind === "short" ? (
                <Input id={`a-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
              ) : (
                <Textarea id={`a-${q.id}`} rows={4} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
              )}
            </CardContent>
          </Card>
        ))}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">You can hand in once.</span>
          <Button type="submit" pending={pending}>
            Submit answers
          </Button>
        </div>
      </form>
    </>
  );
}
