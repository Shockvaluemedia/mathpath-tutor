"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  MessageSquare,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import type { PilotParticipant, PilotSummary } from "@/lib/pilot";

const funnelLabels = [
  { key: "invited", label: "Invited" },
  { key: "diagnosticStarted", label: "Started" },
  { key: "diagnosticCompleted", label: "Diagnostic" },
  { key: "firstLesson", label: "Lesson" },
  { key: "threeSessions", label: "3 Sessions" },
  { key: "reportViewed", label: "Report" },
  { key: "feedbackReceived", label: "Feedback" },
] as const;

const actionPriorityRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

function actionHref(stage: PilotParticipant["operatorAction"]["stage"]) {
  if (stage === "report" || stage === "feedback" || stage === "continuation") {
    return "/sprint/report";
  }
  return "/sprint";
}

function priorityClass(priority: PilotParticipant["operatorAction"]["priority"]) {
  if (priority === "high") return "bg-rose-100 text-rose-800 hover:bg-rose-100";
  if (priority === "medium") return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  return "bg-slate-100 text-slate-700 hover:bg-slate-100";
}

export default function AdminPilotPage() {
  const { apiRequest } = useAuth();
  const [summary, setSummary] = useState<PilotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/pilot/summary");
      setSummary(data);
    } catch (err) {
      console.error("Pilot summary failed:", err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (participantId: string, message: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
        setCopiedActionId(participantId);
        window.setTimeout(() => setCopiedActionId(null), 1800);
        return;
      }
    } catch (err) {
      console.error("Copy pilot action failed:", err);
    }

    window.prompt("Copy this message:", message);
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex min-h-[320px] items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-emerald-700" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-950">Pilot data unavailable</h1>
            <p className="mt-2 text-sm text-gray-600">The control room could not load pilot evidence yet.</p>
            <Button className="mt-6" onClick={loadSummary}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proofReady = summary.participants.filter((participant) => participant.status === "proof_ready").length;
  const invitedProgress = Math.round((summary.overview.invited / summary.targetFamilies) * 100);
  const reportProgress = summary.overview.invited > 0
    ? Math.round((summary.overview.reportViewed / summary.overview.invited) * 100)
    : 0;
  const actionQueue = [...summary.participants].sort((a, b) => {
    const priorityDelta = actionPriorityRank[a.operatorAction.priority] - actionPriorityRank[b.operatorAction.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(a.invitedAt).getTime() - new Date(b.invitedAt).getTime();
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Pilot Launch Control
          </Badge>
          <h1 className="text-3xl font-bold text-gray-950">Math Recovery Sprint Pilot</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Track families from invite to proof report, capture parent feedback, and export the evidence needed for the next sales or funding conversation.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={loadSummary}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <a href="/api/pilot/summary?format=csv">
            <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5 text-emerald-700" />} label="Families Invited" value={`${summary.overview.invited}/${summary.targetFamilies}`} />
        <MetricCard icon={<ClipboardList className="h-5 w-5 text-sky-600" />} label="Diagnostics Done" value={summary.overview.diagnosticCompleted} />
        <MetricCard icon={<BarChart3 className="h-5 w-5 text-amber-600" />} label="Reports Viewed" value={`${summary.overview.reportViewed}`} />
        <MetricCard icon={<MessageSquare className="h-5 w-5 text-rose-600" />} label="Feedback Captured" value={summary.overview.feedbackReceived} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Operator Action Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionQueue.map((participant) => {
            const action = participant.operatorAction;
            return (
              <div key={participant.id} className="grid gap-4 rounded-md border bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={priorityClass(action.priority)}>{action.priority} priority</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {action.dueLabel}
                    </Badge>
                    <span className="text-sm font-medium text-gray-950">{participant.familyName}</span>
                    <span className="text-sm text-gray-500">{participant.studentName}, Grade {participant.grade}</span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-950">{action.label}</h2>
                  <p className="mt-2 max-w-4xl rounded-md bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    {action.message}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <Button variant="outline" onClick={() => copyMessage(participant.id, action.message)}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedActionId === participant.id ? "Copied" : "Copy Message"}
                  </Button>
                  <Link href={actionHref(action.stage)}>
                    <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
                      Open Follow-Up
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilot Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProgressLine label="Invite target" value={invitedProgress} detail={`${summary.overview.invited} of ${summary.targetFamilies} families`} />
            <ProgressLine label="Proof reports viewed" value={reportProgress} detail={`${summary.overview.reportViewed} reports viewed`} />
            <ProgressLine label="Proof-ready families" value={Math.round((proofReady / summary.targetFamilies) * 100)} detail={`${proofReady} ready for follow-up`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Operator Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.nextActions.map((action) => (
                <div key={action} className="flex items-start gap-2 rounded-md border bg-white p-3">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="text-sm text-gray-700">{action}</span>
                </div>
              ))}
              <Link href="/sprint">
                <Button variant="outline" className="mt-2">
                  <Send className="mr-2 h-4 w-4" />
                  Open Sprint Invite Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Pilot Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[820px] space-y-3">
              {summary.participants.map((participant) => (
                <ParticipantRow key={participant.id} participant={participant} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.feedback.length > 0 ? (
              summary.feedback.map((feedback) => (
                <div key={feedback.id} className="rounded-md border bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-950">{feedback.studentName}</p>
                    <Badge variant="outline">{feedback.continueIntent}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{feedback.concern}</p>
                  {feedback.quote && (
                    <p className="mt-3 border-l-2 border-emerald-500 pl-3 text-sm text-gray-700">
                      {feedback.quote}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No parent feedback captured yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tester Script Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p>Send the sprint link, ask the parent to complete the diagnostic with one learner, then schedule a check-in after the third session.</p>
            <p>Success signal: parent can name the first math gap, sees the report as clear, and says yes or maybe to continuing.</p>
            <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Script file: docs/pilot-tester-script.md
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-950">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressLine({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">{label}</span>
        <span className="text-gray-500">{detail}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

function ParticipantRow({ participant }: { participant: PilotParticipant }) {
  return (
    <div className="grid grid-cols-[180px_110px_repeat(7,92px)] items-center gap-2 rounded-md border bg-white p-3">
      <div>
        <p className="text-sm font-medium text-gray-950">{participant.familyName}</p>
        <p className="text-xs text-gray-500">{participant.studentName}, Grade {participant.grade}</p>
      </div>
      <Badge variant={participant.status === "proof_ready" ? "default" : "outline"} className="justify-center">
        {participant.status.replace(/_/g, " ")}
      </Badge>
      {funnelLabels.map((step) => (
        <div key={step.key} className="text-center">
          <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border bg-gray-50">
            {participant.funnel[step.key] ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-gray-300" />
            )}
          </div>
          <p className="text-[10px] text-gray-500">{step.label}</p>
        </div>
      ))}
    </div>
  );
}
