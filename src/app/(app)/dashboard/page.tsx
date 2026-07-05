"use client";

import { useState, useEffect } from "react";
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
  Plus, BarChart3, Heart, RefreshCw
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
  latestReport: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, apiRequest } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [progressData, setProgressData] = useState<Record<string, StudentProgress>>({});
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
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
  };

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
  student: any;
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
