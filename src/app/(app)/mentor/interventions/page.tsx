"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast";
import { CardSkeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Clock, Target, ListChecks, MessageSquare, Pause } from "lucide-react";

interface DecisionRecord {
  status: string;
  reasonCodes: string[];
  evidence: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  actions: string[];
  systemConfidence: number;
  evaluatedAt: string;
}

interface OutcomeRecord {
  id: string;
  metric: string;
  baselineValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  status: string;
  measuredAt: string;
}

interface InterventionRecord {
  id: string;
  learnerName: string;
  type: string;
  reason: string;
  status: string;
  startedAt: string;
  plan: { goals?: string[]; steps?: string[]; actions?: string[]; duration?: string; successCriteria?: string[]; outcomeTargets?: Array<{ metric: string; targetValue: number }> };
  progress?: { daysActive: number; goalsMetCount: number; totalGoals: number; notes: Array<{ date: string; note: string; author: string }> };
  latestDecision?: DecisionRecord | null;
  outcomeRecords?: OutcomeRecord[];
}

function displayLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown, metric = ""): string {
  if (typeof value === "number") {
    const percentageMetric = /mastery|rate|probability|systemConfidence|improvement/i.test(metric);
    return percentageMetric ? `${Math.round(value * 100)}%` : String(value);
  }
  return value === null || value === undefined ? "Not available" : String(value);
}

export default function InterventionsPage() {
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadInterventions = useCallback(async () => {
    try {
      const data = await apiRequest("/api/interventions");
      setInterventions(data.interventions || []);
    } catch {} finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const timer = window.setTimeout(loadInterventions, 0);
    return () => window.clearTimeout(timer);
  }, [loadInterventions]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/api/interventions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setInterventions((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i))
      );
      toast("success", `Intervention ${status}`);
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Unable to update intervention");
    }
  };

  const active = interventions.filter((i) => i.status === "active");
  const completed = interventions.filter((i) => i.status === "completed");

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Interventions</h1>
        <p className="text-sm text-gray-500">Active support plans for learners who need extra help</p>
      </div>

      {/* Active Interventions */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <Card className="text-center py-8 border-emerald-200 bg-emerald-50/30">
            <CardContent>
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-700">No active interventions. All learners are on track!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 stagger-children">
            {active.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                expanded={expandedId === intervention.id}
                onToggle={() => setExpandedId(expandedId === intervention.id ? null : intervention.id)}
                onComplete={() => updateStatus(intervention.id, "completed")}
                onPause={() => updateStatus(intervention.id, "paused")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Completed ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((intervention) => (
              <Card key={intervention.id} className="opacity-70">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{intervention.learnerName}</p>
                    <p className="text-xs text-gray-500">{intervention.type.replace(/_/g, " ")}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InterventionCard({
  intervention,
  expanded,
  onToggle,
  onComplete,
  onPause,
}: {
  intervention: InterventionRecord;
  expanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onPause: () => void;
}) {
  const plan = intervention.plan;
  const progress = intervention.progress;
  const achievedOutcomes = intervention.outcomeRecords?.filter((outcome) => outcome.status === "ACHIEVED").length ?? 0;
  const totalOutcomes = intervention.outcomeRecords?.length ?? 0;
  const goalProgress = progress?.totalGoals
    ? (progress.goalsMetCount / progress.totalGoals) * 100
    : totalOutcomes ? (achievedOutcomes / totalOutcomes) * 100 : 0;
  const steps = plan.steps ?? plan.actions ?? intervention.latestDecision?.actions ?? [];
  const notes = progress?.notes ?? [];

  const typeColors: Record<string, string> = {
    CONFIDENCE_RECOVERY: "bg-rose-100 text-rose-700",
    REMEDIATION: "bg-amber-100 text-amber-700",
    HUMAN_TUTOR_ESCALATION: "bg-red-100 text-red-700",
    PARENT_ENGAGEMENT: "bg-sky-100 text-sky-700",
    TUTORING: "bg-indigo-100 text-indigo-700",
    MENTORING: "bg-purple-100 text-purple-700",
    RESTORATIVE_COACHING: "bg-teal-100 text-teal-700",
  };

  return (
    <Card className="border-amber-200">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
              {intervention.learnerName?.[0] || "?"}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{intervention.learnerName}</h3>
              <Badge className={`text-xs ${typeColors[intervention.type] || "bg-gray-100 text-gray-700"}`}>
                {intervention.type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs text-gray-500">
              <p>{progress?.daysActive || 0} days active</p>
              <p>{progress?.goalsMetCount || 0}/{progress?.totalGoals || 0} goals met</p>
            </div>
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-gray-600 mb-3">{intervention.reason}</p>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(goalProgress)}%</span>
          </div>
          <Progress value={goalProgress} className="h-2" />
        </div>

        {/* Toggle details */}
        <Button variant="ghost" size="sm" onClick={onToggle} className="text-xs w-full">
          {expanded ? "Hide Details" : "Show Plan & Notes"}
        </Button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-4 animate-fade-in-up">
            <Separator />

            {/* Goals */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">
                <Target className="h-4 w-4 text-indigo-500" />
                Goals
              </h4>
              <ul className="space-y-1">
                {plan.goals?.map((goal: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${i < (progress?.goalsMetCount || 0) ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                      {i < (progress?.goalsMetCount || 0) && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    <span className={i < (progress?.goalsMetCount || 0) ? "line-through text-gray-400" : "text-gray-700"}>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Steps */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">
                <ListChecks className="h-4 w-4 text-purple-500" />
                Action Steps
              </h4>
              <ol className="space-y-1 list-decimal list-inside">
                {steps.map((step: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600">{step}</li>
                ))}
              </ol>
            </div>

            {intervention.latestDecision && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Trigger decision</h4>
                <div className="flex flex-wrap gap-2">
                  {intervention.latestDecision.reasonCodes.map((code) => (
                    <Badge key={code} variant="outline" className="text-xs">{displayLabel(code)}</Badge>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <dl className="space-y-1 text-xs">
                    <dt className="font-medium text-gray-700">Evidence</dt>
                    {Object.entries(intervention.latestDecision.evidence).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3"><dt className="text-gray-500">{displayLabel(key)}</dt><dd className="text-right text-gray-800">{displayValue(value, key)}</dd></div>
                    ))}
                  </dl>
                  <dl className="space-y-1 text-xs">
                    <dt className="font-medium text-gray-700">Thresholds</dt>
                    {Object.entries(intervention.latestDecision.thresholds).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3"><dt className="text-gray-500">{displayLabel(key)}</dt><dd className="text-right text-gray-800">{displayValue(value, key)}</dd></div>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {intervention.outcomeRecords && intervention.outcomeRecords.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">Measured outcomes</h4>
                <div className="space-y-2">
                  {intervention.outcomeRecords.map((outcome) => (
                    <div key={outcome.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 text-xs">
                      <span className="font-medium text-gray-700">{displayLabel(outcome.metric)}</span>
                      <span className="text-gray-600">{displayValue(outcome.baselineValue, outcome.metric)} to {displayValue(outcome.currentValue, outcome.metric)} · target {displayValue(outcome.targetValue, outcome.metric)}</span>
                      <Badge variant="outline" className="text-xs">{displayLabel(outcome.status)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duration & Criteria */}
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Duration: {plan.duration}</span>
            </div>

            {/* Notes */}
            {notes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 flex items-center gap-1 mb-2">
                  <MessageSquare className="h-4 w-4 text-sky-500" />
                  Progress Notes
                </h4>
                <div className="space-y-2">
                  {notes.map((note, i) => (
                    <div key={i} className="text-sm bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-700">{note.note}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(note.date).toLocaleDateString()} • {note.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={onPause}>
                <Pause className="h-3 w-3 mr-1" /> Pause
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete}>
                <CheckCircle className="h-3 w-3 mr-1" /> Mark Complete
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
