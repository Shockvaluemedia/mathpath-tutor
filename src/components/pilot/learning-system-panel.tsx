import { AlertTriangle, Brain, Cpu, DollarSign, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EvaluationMetric, OperatorLearningSystemSnapshot } from "@/lib/learning/evaluation";

function formatMetric(metric: EvaluationMetric): string {
  if (metric.value === null) return metric.status === "PRICING_NOT_CONFIGURED" ? "Set pricing" : "Pending";
  if (metric.unit === "PERCENT") return `${Math.round(metric.value * 100)}%`;
  if (metric.unit === "USD") return `$${metric.value.toFixed(4)}`;
  if (metric.unit === "DAYS") return `${metric.value.toFixed(1)} days`;
  if (metric.unit === "COUNT" && !Number.isInteger(metric.value)) {
    return metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return metric.value.toLocaleString();
}

function label(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function LearningSystemPanel({ snapshot }: { snapshot: OperatorLearningSystemSnapshot }) {
  const overview = [
    ["Diagnostics", snapshot.overview.diagnosticCompletions],
    ["Activated", snapshot.overview.learnerActivations],
    ["Skills mastered", snapshot.overview.skillsMastered],
    ["Prerequisite gaps", snapshot.overview.prerequisiteGaps],
    ["Open misconceptions", snapshot.overview.unresolvedMisconceptions],
    ["Confidence risk", snapshot.overview.confidenceRiskLearners],
    ["Retention failures", snapshot.overview.retentionFailures],
    ["Intervention triggers", snapshot.overview.interventionTriggers],
    ["Tutor escalations", snapshot.overview.tutorEscalations],
  ] as const;

  return (
    <Card className="mb-6 border-sky-200">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Brain className="h-5 w-5 text-sky-700" /> Learning System Health</CardTitle>
          <div className="flex items-center gap-2">
            {snapshot.sample && <Badge variant="outline">Synthetic evaluation data</Badge>}
            <Badge variant="outline">{snapshot.evaluation.periodDays} days</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-3 xl:grid-cols-9">
          {overview.map(([name, value]) => (
            <div key={name} className="border-l-2 border-gray-200 pl-3">
              <p className="text-xl font-semibold text-gray-950">{value}</p>
              <p className="text-xs leading-4 text-gray-500">{name}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-950">Outcome scorecard</h3>
            <span className="text-xs text-gray-500">Every metric includes its current evidence status</span>
          </div>
          <div className="grid gap-x-8 lg:grid-cols-2">
            {snapshot.evaluation.metrics.map((metric) => (
              <div key={metric.key} className="grid grid-cols-[1fr_auto] gap-4 border-b border-gray-100 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{metric.label}</p>
                  <p className="mt-0.5 text-xs leading-4 text-gray-500">{metric.definition}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-950">{formatMetric(metric)}</p>
                  <p className="text-[11px] text-gray-500">{label(metric.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 border-t pt-5 lg:grid-cols-3">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-950"><GitCompareArrows className="h-4 w-4 text-emerald-700" /> Adaptive vs linear</h3>
            <div className="space-y-3">
              {snapshot.evaluation.variantComparison.length ? snapshot.evaluation.variantComparison.map((variant) => (
                <div key={variant.variant} className="border-b border-gray-100 pb-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{label(variant.variant)}</span><Badge variant="outline">n={variant.learnerCount}</Badge></div>
                  {variant.status === "MEASURED" ? (
                    <p className="mt-1 text-xs text-gray-600">Verified success {Math.round((variant.verifiedSuccessRate ?? 0) * 100)}% · mastery {(variant.masteredSkillsPerLearner ?? 0).toFixed(1)}/learner · retention {Math.round((variant.retentionRate ?? 0) * 100)}%</p>
                  ) : <p className="mt-1 text-xs text-gray-500">Insufficient cohort evidence; no outcome claim.</p>}
                </div>
              )) : <p className="text-xs text-gray-500">No experiment assignments yet.</p>}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-950"><Cpu className="h-4 w-4 text-indigo-700" /> Operation mix</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-600">Deterministic</dt><dd className="font-medium">{snapshot.evaluation.operations.deterministic}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">AI-generated</dt><dd className="font-medium">{snapshot.evaluation.operations.ai}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-600">Deterministic share</dt><dd className="font-medium">{snapshot.evaluation.operations.deterministicShare === null ? "Pending" : `${Math.round(snapshot.evaluation.operations.deterministicShare * 100)}%`}</dd></div>
            </dl>
            <h4 className="mb-2 mt-5 flex items-center gap-2 text-xs font-semibold text-gray-700"><DollarSign className="h-3.5 w-3.5" /> AI by operation</h4>
            <div className="space-y-2">
              {snapshot.aiByOperation.map((operation) => (
                <div key={operation.operationType} className="text-xs">
                  <div className="flex justify-between gap-3"><span className="text-gray-600">{label(operation.operationType)}</span><span className="font-medium">{operation.tokens.toLocaleString()} tokens</span></div>
                  <p className="text-gray-400">{operation.calls} calls · {operation.costUsd === null ? "pricing not set" : `$${operation.costUsd.toFixed(4)}`} · {Math.round(operation.successRate * 100)}% success</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-950"><AlertTriangle className="h-4 w-4 text-amber-600" /> Automated decision queue</h3>
            <div className="space-y-3">
              {snapshot.decisionQueue.length ? snapshot.decisionQueue.map((decision) => (
                <div key={decision.id} className="border-b border-gray-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-900">{decision.learnerName}</span><Badge variant="outline" className="text-[10px]">{label(decision.type)}</Badge></div>
                  <p className="mt-1 text-xs leading-4 text-gray-600">{decision.reason}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{decision.reasonCodes.map(label).join(" · ")}</p>
                </div>
              )) : <p className="text-xs text-gray-500">No triggered decisions in this period.</p>}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
