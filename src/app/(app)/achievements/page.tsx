"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Flame, Star, Trophy, Target, Zap, Lock } from "lucide-react";
import { ALL_BADGES } from "@/lib/gamification";
import type { PlayerStats, Badge as BadgeType } from "@/lib/gamification";

export default function AchievementsPage() {
  const { currentStudent, apiRequest } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [currentStudent]);

  const loadStats = async () => {
    if (!currentStudent) return;
    try {
      const data = await apiRequest(`/api/students/${currentStudent.id}/gamification`);
      setStats(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!stats) return null;

  const earnedBadgeIds = stats.badges.map((b) => b.id);
  const lockedBadges = ALL_BADGES.filter((b) => !earnedBadgeIds.includes(b.id));
  const accuracy = stats.totalQuestions > 0
    ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
          {currentStudent?.name}&apos;s Achievements
        </h1>
        <p className="text-gray-500">Keep learning to unlock more!</p>
      </div>

      {/* Level & XP Card */}
      <Card className="mb-6 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Level {stats.level}</p>
              <p className="text-xl font-bold text-gray-900">{stats.levelName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{stats.xp} XP</p>
              <p className="text-xs text-gray-500">{stats.xpToNextLevel} XP to next level</p>
            </div>
          </div>
          <Progress value={stats.xpProgress} className="h-3" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">Level {stats.level}</span>
            <span className="text-xs text-gray-400">Level {stats.level + 1}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MiniStat icon={<Flame className="h-5 w-5 text-orange-500" />} value={`${stats.streak} days`} label="Streak" />
        <MiniStat icon={<Star className="h-5 w-5 text-amber-500" />} value={`${stats.badges.length}`} label="Badges" />
        <MiniStat icon={<Target className="h-5 w-5 text-emerald-500" />} value={`${accuracy}%`} label="Accuracy" />
        <MiniStat icon={<Zap className="h-5 w-5 text-purple-500" />} value={`${stats.totalLessons}`} label="Lessons" />
      </div>

      {/* Streak Card */}
      {stats.streak > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(Math.min(stats.streak, 7))].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <Flame className={`h-5 w-5 ${i < stats.streak ? "text-orange-500" : "text-gray-300"}`} />
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-900">{stats.streak}-day streak!</p>
              <p className="text-xs text-orange-700">
                {stats.streak >= stats.longestStreak
                  ? "This is your best streak ever! 🎉"
                  : `Best: ${stats.longestStreak} days. Keep going!`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earned Badges */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Earned Badges ({stats.badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.badges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Complete lessons and practice to earn your first badge!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} earned />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Locked Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            Locked ({lockedBadges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lockedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} earned={false} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col items-center text-center gap-1">
        {icon}
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function BadgeCard({ badge, earned }: { badge: BadgeType; earned: boolean }) {
  return (
    <div
      className={`p-3 rounded-lg border text-center transition-all ${
        earned
          ? "bg-white border-amber-200 shadow-sm"
          : "bg-gray-50 border-gray-200 opacity-50"
      }`}
    >
      <div className="text-2xl mb-1">{earned ? badge.icon : "🔒"}</div>
      <p className={`text-xs font-medium ${earned ? "text-gray-900" : "text-gray-500"}`}>
        {badge.name}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{badge.description}</p>
    </div>
  );
}
