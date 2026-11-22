import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/client/components/AppShell";
import { FormField } from "@/client/components/FormField";
import { PageHeader } from "@/client/components/PageHeader";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
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
import { formatDate, pct, score } from "@/client/lib/format";

// Public: a family opens the link and enters the PIN the teacher gave them.
export const Route = createFileRoute("/family/$token")({
  head: () => ({ meta: [{ title: "Results" }, { name: "robots", content: "noindex" }] }),
  component: FamilyPage,
});

interface Results {
  student: { name: string; className: string };
  marks: { title: string; date: string; score: number; maxScore: number }[];
  worksheets: { title: string; score: number; maxScore: number; submittedAt: string }[];
  attendance: { present: number; late: number; absent: number; rate: number | null };
  average: number | null;
}

function FamilyPage() {
  const { token } = Route.useParams();
  const [pin, setPin] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function open(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as Results & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell backLink={false}>
      {!results ? (
        <>
          <PageHeader title="Student results" description="Enter the PIN from the teacher." />
          <form onSubmit={open} className="max-w-xs space-y-4">
            <FormField id="family-pin" label="PIN">
              <Input
                id="family-pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                required
                className="font-mono text-lg tracking-widest"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              />
            </FormField>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" pending={pending}>
              View results
            </Button>
          </form>
        </>
      ) : (
        <div data-testid="family-results" className="space-y-8">
          <PageHeader title={results.student.name} description={results.student.className} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-1">
                <div className="text-sm text-muted-foreground">Attendance</div>
                <div className="text-2xl font-semibold tabular-nums">{pct(results.attendance.rate)}</div>
                <div className="text-xs text-muted-foreground">
                  {results.attendance.present} present · {results.attendance.late} late · {results.attendance.absent} absent
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1">
                <div className="text-sm text-muted-foreground">Average mark</div>
                <div className="text-2xl font-semibold tabular-nums">{pct(results.average)}</div>
              </CardContent>
            </Card>
          </div>
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.marks.map((m, i) => (
                  <TableRow key={`m${i}`}>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{formatDate(m.date)}</TableCell>
                    <TableCell className="text-right tabular-nums">{score(m.score, m.maxScore)}</TableCell>
                  </TableRow>
                ))}
                {results.worksheets.map((w, i) => (
                  <TableRow key={`w${i}`}>
                    <TableCell>{w.title} (worksheet)</TableCell>
                    <TableCell>{formatDate(w.submittedAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{score(w.score, w.maxScore)}</TableCell>
                  </TableRow>
                ))}
                {results.marks.length + results.worksheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No marks yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableCard>
        </div>
      )}
    </AppShell>
  );
}
