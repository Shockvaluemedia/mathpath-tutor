"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, Clock, ArrowLeft, Flame } from "lucide-react";

export default function LessonHistoryPage() {
  const router = useRouter();
  const { currentStudent, apiRequest } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [todayString] = useState(() => new Date().toDateString());
  const [yesterdayString] = useState(() => new Date(Date.now() - 86400000).toDateString());

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      if (!currentStudent) return;
      const data = await apiRequest(`/api/students/${currentStudent.id}/progress`);
      setLessons(data.recentLessons || []);

      // Calculate streak
      const completed = (data.recentLessons || []).filter((l: any) => l.completed);
      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < completed.length; i++) {
        const lessonDate = new Date(completed[i].date);
        const diffDays = Math.floor((today.getTime() - lessonDate.getTime()) / 86400000);
        if (diffDays <= i + 1) currentStreak++;
        else break;
      }
      setStreak(currentStreak);
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/learn")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lesson History</h1>
          <p className="text-sm text-gray-500">{currentStudent?.name}&apos;s learning journey</p>
        </div>
      </div>

      {/* Streak card */}
      <Card className="mb-6 border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Flame className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-900">{streak} day streak</p>
            <p className="text-sm text-amber-700">
              {streak > 0 ? "Keep it going! Consistency builds mastery." : "Complete a lesson today to start your streak!"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lessons list */}
      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : lessons.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No lessons yet</h2>
            <p className="text-gray-600 mb-6">Start your first lesson to see your history here.</p>
            <Button onClick={() => router.push("/learn")}>Start Learning</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const date = new Date(lesson.date);
            const lessonDateString = date.toDateString();
            const isToday = todayString === lessonDateString;
            const isYesterday = yesterdayString === lessonDateString;
            const dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

            return (
              <Card key={lesson.id} className={`transition-shadow hover:shadow-sm ${lesson.completed ? "" : "border-dashed"}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                    lesson.completed ? "bg-emerald-100" : "bg-gray-100"
                  }`}>
                    {lesson.completed ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{dateLabel}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {lesson.skillName}
                      </Badge>
                    </div>
                  </div>
                  <Badge
                    variant={lesson.completed ? "default" : "outline"}
                    className="text-xs shrink-0"
                  >
                    {lesson.completed ? "Done" : "In Progress"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
