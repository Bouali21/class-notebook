import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { FormField } from "@/client/components/FormField";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/client/components/ui/native-select";
import { Textarea } from "@/client/components/ui/textarea";
import { toastError } from "@/client/lib/errors";
import { draftPlan } from "@/serverFunctions/ai";

export const STAGES = ["Warm-up", "Presentation", "Practice", "Closure"];

export interface PlanFields {
  date: string;
  classId: string | null;
  subject: string;
  topic: string;
  durationMinutes: number;
  objectives: string;
  strategies: string;
  stages: { name: string; minutes: number; activity: string }[];
  materials: string;
  assessment: string;
  notes: string;
}

export function emptyPlan(date: string): PlanFields {
  return {
    date,
    classId: null,
    subject: "",
    topic: "",
    durationMinutes: 45,
    objectives: "",
    strategies: "",
    stages: STAGES.map((name) => ({ name, minutes: 0, activity: "" })),
    materials: "",
    assessment: "",
    notes: "",
  };
}

/** The four stages in order, whatever an older plan stored. */
function withStages(plan: PlanFields): PlanFields {
  return {
    ...plan,
    stages: STAGES.map(
      (name) => plan.stages.find((s) => s.name === name) ?? { name, minutes: 0, activity: "" },
    ),
  };
}

export function PlanForm({
  initial,
  classes,
  aiEnabled,
  onSubmit,
  actions,
}: {
  initial: PlanFields;
  classes: { id: string; name: string; grade?: string }[];
  aiEnabled: boolean;
  onSubmit: (plan: PlanFields) => Promise<void>;
  actions?: React.ReactNode;
}) {
  const [plan, setPlan] = useState(() => withStages(initial));
  const [pending, setPending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const set = <K extends keyof PlanFields>(key: K, value: PlanFields[K]) => setPlan((p) => ({ ...p, [key]: value }));
  const text = (key: "subject" | "topic" | "objectives" | "strategies" | "materials" | "assessment" | "notes") => ({
    id: `plan-${key}`,
    value: plan[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });
  const stageTotal = plan.stages.reduce((sum, s) => sum + (s.minutes || 0), 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await onSubmit(plan);
    } catch (error) {
      toastError(error);
    } finally {
      setPending(false);
    }
  }

  async function draft() {
    setDrafting(true);
    try {
      const grade = classes.find((c) => c.id === plan.classId)?.grade ?? "";
      const d = await draftPlan({
        data: { subject: plan.subject, grade, topic: plan.topic, durationMinutes: plan.durationMinutes },
      });
      setPlan((p) => ({ ...p, ...d }));
    } catch (error) {
      toastError(error);
    } finally {
      setDrafting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="plan-date" label="Date">
            <Input id="plan-date" type="date" required value={plan.date} onChange={(e) => set("date", e.target.value)} />
          </FormField>
          <FormField id="plan-class" label="Class">
            <NativeSelect
              id="plan-class"
              className="w-full"
              value={plan.classId ?? ""}
              onChange={(e) => set("classId", e.target.value || null)}
            >
              <NativeSelectOption value="">No class</NativeSelectOption>
              {classes.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="plan-subject" label="Subject">
            <Input {...text("subject")} />
          </FormField>
          <FormField id="plan-duration" label="Duration (minutes)">
            <Input
              id="plan-duration"
              type="number"
              min="1"
              max="600"
              required
              value={plan.durationMinutes}
              onChange={(e) => set("durationMinutes", Number(e.target.value))}
            />
          </FormField>
          <FormField id="plan-topic" label="Topic" className="space-y-1.5 sm:col-span-2">
            <div className="flex gap-2">
              <Input required className="flex-1" {...text("topic")} />
              {aiEnabled ? (
                <Button type="button" variant="outline" pending={drafting} onClick={draft}>
                  <Sparkles aria-hidden />
                  Draft with AI
                </Button>
              ) : null}
            </div>
          </FormField>
          <FormField id="plan-objectives" label="Learning objectives" className="space-y-1.5 sm:col-span-2">
            <Textarea rows={3} {...text("objectives")} />
          </FormField>
          <FormField id="plan-strategies" label="Teaching strategies" className="space-y-1.5 sm:col-span-2">
            <Textarea rows={2} {...text("strategies")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson stages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan.stages.map((stage, i) => (
            <div key={stage.name} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <FormField id={`stage-${i}-minutes`} label={`${stage.name} minutes`}>
                <Input
                  id={`stage-${i}-minutes`}
                  type="number"
                  min="0"
                  value={stage.minutes}
                  onChange={(e) =>
                    set("stages", plan.stages.map((s, j) => (j === i ? { ...s, minutes: Number(e.target.value) } : s)))
                  }
                />
              </FormField>
              <FormField id={`stage-${i}-activity`} label={`${stage.name} activity`}>
                <Textarea
                  id={`stage-${i}-activity`}
                  rows={2}
                  value={stage.activity}
                  onChange={(e) =>
                    set("stages", plan.stages.map((s, j) => (j === i ? { ...s, activity: e.target.value } : s)))
                  }
                />
              </FormField>
            </div>
          ))}
          <p className={stageTotal > plan.durationMinutes ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {stageTotal} of {plan.durationMinutes} minutes planned
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <FormField id="plan-materials" label="Materials">
            <Textarea rows={2} {...text("materials")} />
          </FormField>
          <FormField id="plan-assessment" label="Assessment">
            <Textarea rows={2} {...text("assessment")} />
          </FormField>
          <FormField id="plan-notes" label="Notes">
            <Textarea rows={2} {...text("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        {actions}
        <Button type="submit" pending={pending}>
          Save plan
        </Button>
      </div>
    </form>
  );
}
