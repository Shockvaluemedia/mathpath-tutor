"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { StudentStatusCard } from "@/components/dashboard/student-status-card";
import {
  TrendingUp, TrendingDown, Minus, Clock, BookOpen, Target,
  Plus, BarChart3, Heart, RefreshCw, Rocket, Brain, GitBranch, Lightbulb
} from "lucide-react";

interface StudentProgress {
  student: {
    id: string;
    name: string;
    age: number;
    grade: number;
    gradeBand: string;
    confidenceLevel: number;
  };
  stats: {
    lessonsCompletedThisWeek: number;
    totalLessons: number;
    timeSpentMinutes: number;
    masteredSkillsCount: number;
    avgConfidence: number;
    confidenceTrend: "improving" | "stable" | "declining";
    tutorSessionsThisWeek: number;
  };
  skills: {
    mastered: { name: string; domain: string; score: number }[];
    developing: { name: string; domain: string; score: number }[];
    weak: { name: string; domain: string; score: number }[];
  };
  recentLessons: {
    id: string;
    title: string;
    skillName: string;
    completed: boolean;
    date: string;
  }[];
  intelligence?: {
    sample: boolean;
    currentTarget: string;
    currentLearningLevel?: string;
    targetState: string;
    blocker: {
      skill: string;
      explanation: string;
      masteryProbability: number;
    };
    hypothesis: {
      name: string;
      status: "SUSPECTED" | "LIKELY" | "CONFIRMED" | "RESOLVING" | "RESOLVED";
      probability: number;
      evidenceCount: number;
    } | null;
    adaptation: {
      from: string;
      to: string;
      reason: string;
    };
    evidence: {
      assistedSuccesses: number;
      independentSuccesses: number;
      retention: string;
      transfer: string;
    };
    nextStep: string;
    masteryTrajectory?: string;
    confidenceTrajectory?: string;
    interventionStatus?: string;
    recommendedHumanActions?: string[];
  };
  latestReport: {
    progressSummary: string;
    recommendedNextSteps?: string[];
  } | null;
}

interface StudentSummary {
  id: string;
  name: string;
  age: number;
  grade: number;
  gradeBand?: string;
  confidenceLevel?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, apiRequest } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [progressData, setProgressData] = useState<Record<string, StudentProgress>>({});
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const data = await apiRequest("/api/students");
      setStudents(data.students || []);

      // Load progress for each student
      for (const student of data.students || []) {
        try {
          const progress = await apiRequest(`/api/students/${student.id}/progress`);
          setProgressData((prev) => ({ ...prev, [student.id]: progress }));
        } catch {
          // Student might not have progress yet
        }
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    const timer = window.setTimeout(loadStudents, 0);
    return () => window.clearTimeout(timer);
  }, [loadStudents]);

  const generateReport = async (studentId: string) => {
    setGeneratingReport(studentId);
    try {
      await apiRequest("/api/reports/weekly", {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
      // Reload progress to get the new report
      const progress = await apiRequest(`/api/students/${studentId}/progress`);
      setProgressData((prev) => ({ ...prev, [studentId]: progress }));
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setGeneratingReport(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-500">Loading your data...</p>
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || "Parent"}</p>
        </div>
        <Button onClick={() => router.push("/onboarding")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {students.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-semibold mb-2">No students yet</h2>
            <p className="text-gray-600 mb-6">Add your first student to get started with personalized math tutoring.</p>
            <Button onClick={() => router.push("/onboarding")}>Add Your First Student</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Student Status Overview */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Students</h2>
            <div className="space-y-3">
              {students.map((student) => {
                const progress = progressData[student.id];
                const hasLessons = (progress?.stats?.totalLessons || 0) > 0;
                const diagnosticStatus = hasLessons ? "completed" as const
                  : progress?.stats?.lessonsCompletedThisWeek === 0 && !hasLessons ? "not_started" as const
                  : "not_started" as const;

                return (
                  <StudentStatusCard
                    key={student.id}
                    student={student}
                    diagnosticStatus={diagnosticStatus}
                    lastActiveAt={progress?.recentLessons?.[0]?.date || null}
                    lessonsCompleted={progress?.stats?.totalLessons || 0}
                  />
                );
              })}
            </div>
          </div>

          {/* Detailed Progress (only for students who have completed diagnostic) */}
          {students.filter((s) => {
            const p = progressData[s.id];
            return p && (p.stats?.totalLessons || 0) > 0;
          }).map((student) => (
            <StudentDashboard
              key={student.id}
              student={student}
              progress={progressData[student.id]}
              onGenerateReport={() => generateReport(student.id)}
              generatingReport={generatingReport === student.id}
            />
          ))}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

function StudentDashboard({
  student,
  progress,
  onGenerateReport,
  generatingReport,
}: {
  student: StudentSummary;
  progress?: StudentProgress;
  onGenerateReport: () => void;
  generatingReport: boolean;
}) {
  const stats = progress?.stats;
  const skills = progress?.skills;

  const TrendIcon = stats?.confidenceTrend === "improving"
    ? TrendingUp
    : stats?.confidenceTrend === "declining"
    ? TrendingDown
    : Minus;

  const trendColor = stats?.confidenceTrend === "improving"
    ? "text-emerald-600"
    : stats?.confidenceTrend === "declining"
    ? "text-rose-600"
    : "text-gray-500";

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-lg">
                {student.name?.[0] || "S"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{student.name}</h2>
                <p className="text-sm text-gray-500">
                  Age {student.age} • Grade {student.grade} • {student.gradeBand?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onGenerateReport} disabled={generatingReport}>
                {generatingReport ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-1" />
                )}
                {generatingReport ? "Generating..." : "Weekly Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-sky-500" />}
          label="Time This Week"
          value={`${stats?.timeSpentMinutes || 0} min`}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-emerald-500" />}
          label="Lessons Done"
          value={String(stats?.lessonsCompletedThisWeek || 0)}
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-amber-500" />}
          label="Skills Mastered"
          value={String(stats?.masteredSkillsCount || 0)}
        />
        <StatCard
          icon={<Heart className="h-5 w-5 text-rose-500" />}
          label="Confidence"
          value={`${stats?.avgConfidence || student.confidenceLevel}/10`}
        />
      </div>

      <SprintProofCard progress={progress} />

      {progress?.intelligence && (
        <LearnerIntelligencePanel intelligence={progress.intelligence} />
      )}

      {/* Progress & Skills */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Skill Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Skill Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skills?.developing && skills.developing.length > 0 ? (
              skills.developing.slice(0, 4).map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{skill.name}</span>
                    <span className="text-gray-900 font-medium">{Math.round(skill.score)}%</span>
                  </div>
                  <Progress value={skill.score} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Complete the diagnostic to see skill progress.</p>
            )}
            {skills?.weak && skills.weak.length > 0 && (
              <>
                <Separator />
                <p className="text-xs text-gray-500 font-medium">Needs attention:</p>
                {skills.weak.slice(0, 2).map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{skill.name}</span>
                      <span className="text-rose-600 font-medium">{Math.round(skill.score)}%</span>
                    </div>
                    <Progress value={skill.score} className="h-2" />
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Confidence Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Confidence & Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Confidence trend</span>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium capitalize">
                    {stats?.confidenceTrend || "stable"}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                {skills?.mastered && skills.mastered.length > 0 && (
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">Strengths: </span>
                    {skills.mastered.slice(0, 3).map((s) => s.name).join(", ")}
                  </p>
                )}
                {skills?.weak && skills.weak.length > 0 && (
                  <p className="text-gray-600">
                    <span className="font-medium text-gray-900">Focus areas: </span>
                    {skills.weak.slice(0, 3).map((s) => s.name).join(", ")}
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-medium text-gray-900">Tutor sessions: </span>
                  {stats?.tutorSessionsThisWeek || 0} this week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Lessons */}
      {progress?.recentLessons && progress.recentLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progress.recentLessons.slice(0, 5).map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                      <p className="text-xs text-gray-500">{lesson.skillName} • {new Date(lesson.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={lesson.completed ? "default" : "outline"} className="text-xs">
                    {lesson.completed ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Report */}
      {progress?.latestReport && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base">Latest Weekly Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">{progress.latestReport.progressSummary}</p>
            {progress.latestReport.recommendedNextSteps && (
              <div className="pt-2">
                <p className="text-sm font-medium text-gray-900 mb-1">Recommended next steps:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {(progress.latestReport.recommendedNextSteps as string[]).map((step: string, i: number) => (
                    <li key={i}>• {step}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LearnerIntelligencePanel({
  intelligence,
}: {
  intelligence: NonNullable<StudentProgress["intelligence"]>;
}) {
  const hypothesisLabel = intelligence.hypothesis?.status
    .toLowerCase()
    .replace("_", " ");

  return (
    <Card className="border-sky-200 bg-sky-50/30">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-sky-700" />
            What MathPath is learning
          </CardTitle>
          {intelligence.sample && (
            <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
              Sample learner intelligence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
              <Target className="h-4 w-4 text-emerald-600" />
              Current target
            </div>
            <p className="text-sm text-gray-800">{intelligence.currentTarget}</p>
            {intelligence.currentLearningLevel && (
              <p className="text-xs text-gray-600">{intelligence.currentLearningLevel}</p>
            )}
            <p className="text-xs text-gray-500">{intelligence.targetState}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
              <GitBranch className="h-4 w-4 text-amber-600" />
              What was getting in the way
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-800">{intelligence.blocker.skill}</span>
              <span className="font-medium text-amber-700">
                {Math.round(intelligence.blocker.masteryProbability * 100)}% mastery estimate
              </span>
            </div>
            <p className="text-xs leading-5 text-gray-600">{intelligence.blocker.explanation}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              What changed
            </div>
            <p className="text-sm text-gray-800">
              {intelligence.adaptation.from} to {intelligence.adaptation.to}
            </p>
            <p className="text-xs leading-5 text-gray-600">{intelligence.adaptation.reason}</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            {intelligence.hypothesis && (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Current hypothesis</p>
                  <p className="mt-1 text-sm text-gray-800">{intelligence.hypothesis.name}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {hypothesisLabel} · {Math.round(intelligence.hypothesis.probability * 100)}%
                </Badge>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Based on {intelligence.hypothesis?.evidenceCount ?? 0} matching evidence point{intelligence.hypothesis?.evidenceCount === 1 ? "" : "s"}; MathPath will keep checking before treating this as confirmed.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">With support</dt>
              <dd className="font-semibold text-gray-900">{intelligence.evidence.assistedSuccesses}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Independent</dt>
              <dd className="font-semibold text-gray-900">{intelligence.evidence.independentSuccesses}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Retention</dt>
              <dd className="mt-1 text-xs text-gray-700">{intelligence.evidence.retention}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Transfer</dt>
              <dd className="mt-1 text-xs text-gray-700">{intelligence.evidence.transfer}</dd>
            </div>
          </dl>
        </div>

        <div className="border-l-2 border-sky-500 pl-3">
          <p className="text-xs font-medium text-sky-900">What comes next</p>
          <p className="mt-1 text-sm text-gray-700">{intelligence.nextStep}</p>
        </div>

        {(intelligence.masteryTrajectory || intelligence.confidenceTrajectory || intelligence.interventionStatus) && (
          <>
            <Separator />
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Mastery trajectory</p>
                <p className="mt-1 text-sm text-gray-700">{intelligence.masteryTrajectory}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Confidence trajectory</p>
                <p className="mt-1 text-sm text-gray-700">{intelligence.confidenceTrajectory}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Intervention status</p>
                <p className="mt-1 text-sm text-gray-700">{intelligence.interventionStatus}</p>
              </div>
            </div>
          </>
        )}

        {intelligence.recommendedHumanActions && intelligence.recommendedHumanActions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500">Recommended human actions</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {intelligence.recommendedHumanActions.map((action) => (
                <li key={action}>• {action}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SprintProofCard({ progress }: { progress?: StudentProgress }) {
  const stats = progress?.stats;
  const sessionsCompleted = Math.min(
    10,
    Math.max(stats?.lessonsCompletedThisWeek || 0, 0) + Math.max(stats?.tutorSessionsThisWeek || 0, 0)
  );
  const sprintProgress = Math.round((sessionsCompleted / 10) * 100);
  const primaryFocus = progress?.skills?.weak?.[0]?.name || progress?.skills?.developing?.[0]?.name || "First focus skill";

  return (
    <Card className="border-emerald-200 bg-emerald-50/40">
      <CardContent className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-700" />
              <h3 className="font-semibold text-gray-950">2-Week Math Recovery Sprint</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {sessionsCompleted}/10 sessions complete. Current recovery focus: {primaryFocus}.
            </p>
            <div className="mt-3 max-w-xl">
              <Progress value={sprintProgress} className="h-2" />
            </div>
          </div>
          <Link href="/sprint/report">
            <Button className="w-full bg-emerald-700 hover:bg-emerald-800 lg:w-auto">
              View Sprint Report
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
