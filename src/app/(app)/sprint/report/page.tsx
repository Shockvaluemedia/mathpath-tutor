"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  LineChart,
  RefreshCw,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { ParentFeedbackCard } from "@/components/pilot/parent-feedback-card";
import type { SprintReport } from "@/lib/sprint";
import { getSprintActivationSummary, trackSprintEvent } from "@/lib/sprint-tracking";

export default function SprintReportPage() {
  const { currentStudent, apiRequest, isLoading } = useAuth();
  const [report, setReport] = useState<SprintReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentId = currentStudent?.id ?? "demo-student-1";

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/sprint/report?studentId=${encodeURIComponent(studentId)}`);
      setReport(data.report);
      trackSprintEvent("sprint_report_viewed", studentId);
    } catch (err) {
      console.error("Sprint report load failed:", err);
      setError("Could not load the sprint report yet.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, studentId]);

  useEffect(() => {
    if (isLoading) return;
    loadReport();
  }, [isLoading, loadReport]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-emerald-700" />
            <p className="text-sm text-gray-600">Building the sprint proof report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-950">Sprint report unavailable</h1>
            <p className="mt-2 text-sm text-gray-600">{error ?? "The report could not be loaded."}</p>
            <Button className="mt-6" onClick={loadReport}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activation = getSprintActivationSummary(report.studentId);
  const sessionProgress = Math.round((report.sessionsCompleted / report.targetSessions) * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            {report.sprintName}
          </Badge>
          <h1 className="text-3xl font-bold text-gray-950">
            {report.studentName}&apos;s Sprint Proof Report
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            {report.periodLabel}. Built for parents to see what changed, what still needs attention, and what to do next.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={loadReport}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<ClipboardList className="h-5 w-5 text-emerald-700" />} label="Sessions" value={`${report.sessionsCompleted}/${report.targetSessions}`} />
        <MetricCard icon={<BookOpen className="h-5 w-5 text-sky-600" />} label="Practice Time" value={`${report.minutesCompleted} min`} />
        <MetricCard icon={<Target className="h-5 w-5 text-amber-600" />} label="Activation" value={`${report.activationRate}%`} />
        <MetricCard icon={<LineChart className="h-5 w-5 text-rose-600" />} label="Confidence" value={`${report.confidenceStart} to ${report.confidenceCurrent}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-emerald-700" />
              Before / After Skill Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {report.skillDeltas.map((skill) => (
              <div key={skill.name}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-950">{skill.name}</p>
                    <p className="text-xs text-gray-500">{skill.domain}</p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {skill.baseline}% to {skill.current}%
                  </p>
                </div>
                <div className="space-y-2">
                  <Progress value={skill.baseline} className="h-2 opacity-50" />
                  <Progress value={skill.current} className="h-2" />
                </div>
                <p className="mt-2 text-xs text-gray-500">Sprint target: {skill.target}%</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-gray-700">{report.diagnosticSummary}</p>
            <Separator />
            <p className="text-sm leading-6 text-gray-700">{report.parentSummary}</p>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-950">Proof points</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {report.proofPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilot Activation Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activation.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border bg-white p-3">
                <span className="text-sm text-gray-700">{item.label}</span>
                <Badge variant={item.complete ? "default" : "outline"}>
                  {item.complete ? "Done" : "Open"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">10-Session Sprint Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Sprint completion</span>
                <span className="font-medium text-gray-950">{sessionProgress}%</span>
              </div>
              <Progress value={sessionProgress} className="h-2" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {report.sessions.map((session) => (
                <div key={session.number} className="rounded-md border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-950">
                      {session.number}. {session.focus}
                    </p>
                    <Badge variant={session.status === "complete" ? "default" : "outline"}>
                      {session.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">{session.outcome}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Recommended Next Steps</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                {report.nextSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Link href="/learn">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
                  Continue Lesson
                </Button>
              </Link>
              <Link href="/tutor">
                <Button variant="outline" className="w-full">
                  Ask Tutor
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <ParentFeedbackCard studentId={report.studentId} studentName={report.studentName} />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-50">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
          <p className="text-xl font-semibold text-gray-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
