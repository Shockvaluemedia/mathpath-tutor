"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, Brain, MessageCircle, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
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

  const overview = analytics?.overview;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-children">
        <StatCard icon={<Users className="h-5 w-5 text-indigo-500" />} label="Students" value={overview?.totalStudents || 0} />
        <StatCard icon={<BookOpen className="h-5 w-5 text-emerald-500" />} label="Lessons Done" value={overview?.totalLessonsCompleted || 0} />
        <StatCard icon={<MessageCircle className="h-5 w-5 text-purple-500" />} label="Tutor Sessions" value={overview?.totalTutorSessions || 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-amber-500" />} label="Active This Week" value={overview?.activeThisWeek || 0} />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <AdminLink
          href="/admin/skills"
          icon={<Brain className="h-6 w-6 text-indigo-600" />}
          title="Skill Map"
          description="Add, edit, and manage skills and prerequisites"
        />
        <AdminLink
          href="/admin/students"
          icon={<Users className="h-6 w-6 text-emerald-600" />}
          title="Students"
          description="View all students, search, and filter"
        />
        <AdminLink
          href="/admin/analytics"
          icon={<BarChart3 className="h-6 w-6 text-purple-600" />}
          title="Analytics"
          description="Usage metrics and skill gap analysis"
        />
      </div>

      {/* Grade Band Distribution */}
      {analytics?.gradeBandDistribution && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Students by Grade Band</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analytics.gradeBandDistribution.map((item: any) => (
                <div key={item.band} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                  <p className="text-xs text-gray-500">{item.band.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Skill Gaps */}
      {analytics?.topSkillGaps && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Skill Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topSkillGaps.map((gap: any) => (
                <div key={gap.skill} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <span className="text-sm font-medium text-gray-900">{gap.skill}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{gap.studentsStruggling} student{gap.studentsStruggling > 1 ? "s" : ""}</span>
                    <Badge variant="outline" className="text-xs">{gap.avgMastery}% avg</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
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

function AdminLink({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50 shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
