"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, BookOpen, Brain, TrendingUp, AlertCircle } from "lucide-react";

export default function AdminAnalyticsPage() {
  const { apiRequest } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await apiRequest("/api/admin/analytics");
      setAnalytics(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!analytics) return null;

  const { overview, weeklyActivity, topSkillGaps, gradeBandDistribution } = analytics;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Platform usage and learning insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Students" value={overview.totalStudents} icon={<Users className="h-5 w-5 text-indigo-500" />} />
        <MetricCard label="Avg Mastery" value={`${overview.avgMasteryScore}%`} icon={<Brain className="h-5 w-5 text-emerald-500" />} />
        <MetricCard label="Avg Confidence" value={`${overview.avgConfidence}/10`} icon={<TrendingUp className="h-5 w-5 text-amber-500" />} />
        <MetricCard label="Active This Week" value={overview.activeThisWeek} icon={<BookOpen className="h-5 w-5 text-purple-500" />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Weekly Activity */}
        {weeklyActivity && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Weekly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklyActivity.map((day: any) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-8">{day.day}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-indigo-400 rounded-l-full"
                          style={{ width: `${(day.lessons / 6) * 100}%` }}
                        />
                        <div
                          className="h-full bg-purple-300"
                          style={{ width: `${(day.tutorSessions / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {day.lessons}L / {day.tutorSessions}T
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  Lessons
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-purple-300" />
                  Tutor Sessions
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grade Band Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Grade Band Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gradeBandDistribution.map((item: any) => {
                const total = gradeBandDistribution.reduce((sum: number, i: any) => sum + i.count, 0);
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.band}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.band.replace(/_/g, " ")}</span>
                      <span className="text-gray-500">{item.count} ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Top Skill Gaps (Platform-wide)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topSkillGaps.map((gap: any) => (
              <div key={gap.skill} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{gap.skill}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {gap.studentsStruggling} struggling
                      </Badge>
                      <span className="text-xs text-gray-500">{gap.avgMastery}% avg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${gap.avgMastery}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            These skills have the lowest average mastery across all students. Consider adding more lesson content for these areas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
