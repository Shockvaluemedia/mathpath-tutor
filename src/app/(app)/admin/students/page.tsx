"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Search, Users, Clock } from "lucide-react";

export default function AdminStudentsPage() {
  const { apiRequest } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeBand, setGradeBand] = useState("all");

  useEffect(() => {
    loadStudents();
  }, [search, gradeBand]);

  const loadStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (gradeBand !== "all") params.set("gradeBand", gradeBand);
      const data = await apiRequest(`/api/admin/students?${params}`);
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
        <p className="text-sm text-gray-500">{students.length} students registered</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={gradeBand} onValueChange={setGradeBand}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="EARLY_ELEMENTARY">K-2</TabsTrigger>
            <TabsTrigger value="ELEMENTARY">3-5</TabsTrigger>
            <TabsTrigger value="MIDDLE_SCHOOL">6-8</TabsTrigger>
            <TabsTrigger value="HIGH_SCHOOL">9-12</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : students.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No students found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 stagger-children">
          {students.map((student) => (
            <Card key={student.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-sm">
                      {student.name[0]}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{student.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Age {student.age} • Grade {student.grade}</span>
                        <span>•</span>
                        <span>Parent: {student.parentName || "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {student.stats && (
                      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                        <span>{student.stats.lessonsCompletedThisWeek || 0} lessons/wk</span>
                        <span>{student.stats.masteredSkillsCount || 0} mastered</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {student.gradeBand?.replace(/_/g, " ")}
                    </Badge>
                    {student.lastActive && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatRelativeDate(student.lastActive)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
