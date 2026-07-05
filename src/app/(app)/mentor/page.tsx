"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Users, AlertTriangle, TrendingUp, Heart, BookOpen, ArrowRight } from "lucide-react";

export default function MentorDashboardPage() {
  const router = useRouter();
  const { apiRequest } = useAuth();
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearners();
  }, []);

  const loadLearners = async () => {
    try {
      const data = await apiRequest("/api/mentor/learners");
      setLearners(data.learners || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const needsAttention = learners.filter((l) => l.needsIntervention);
  const onTrack = learners.filter((l) => !l.needsIntervention);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mentor Dashboard</h1>
          <p className="text-sm text-gray-500">{learners.length} learners assigned to you</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/mentor/interventions")}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Interventions
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="h-5 w-5 text-indigo-500" />} label="Total Learners" value={learners.length} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Need Attention" value={needsAttention.length} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="On Track" value={onTrack.length} />
        <StatCard icon={<Heart className="h-5 w-5 text-rose-500" />} label="Avg Confidence" value={`${(learners.reduce((sum, l) => sum + (l.stats?.avgConfidence || l.confidenceLevel || 5), 0) / Math.max(learners.length, 1)).toFixed(1)}`} />
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Needs Attention ({needsAttention.length})
          </h2>
          <div className="space-y-3 stagger-children">
            {needsAttention.map((learner) => (
              <LearnerCard key={learner.id} learner={learner} urgent />
            ))}
          </div>
        </div>
      )}

      {/* On Track */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          On Track ({onTrack.length})
        </h2>
        <div className="space-y-3 stagger-children">
          {onTrack.map((learner) => (
            <LearnerCard key={learner.id} learner={learner} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LearnerCard({ learner, urgent = false }: { learner: any; urgent?: boolean }) {
  const router = useRouter();

  return (
    <Card className={`hover:shadow-md transition-shadow ${urgent ? "border-red-200 bg-red-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-white font-bold ${urgent ? "bg-gradient-to-br from-red-400 to-rose-500" : "bg-gradient-to-br from-indigo-400 to-purple-500"}`}>
              {learner.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{learner.name}</h3>
                {urgent && <Badge variant="destructive" className="text-xs">Needs Support</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>Age {learner.age} • Grade {learner.grade}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {learner.stats?.avgConfidence || learner.confidenceLevel}/10
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {learner.stats?.lessonsCompletedThisWeek || 0}/wk
                </span>
              </div>
              {learner.enrolledDomains && (
                <div className="flex gap-1 mt-1.5">
                  {learner.enrolledDomains.map((d: string) => (
                    <Badge key={d} variant="outline" className="text-[10px] py-0">{d}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {learner.skills?.weak?.length > 0 && (
              <div className="hidden sm:block text-right">
                <p className="text-xs text-gray-500">Weak skills</p>
                <p className="text-xs font-medium text-red-600">{learner.skills.weak.slice(0, 2).map((s: any) => s.name).join(", ")}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push(`/mentor/learner/${learner.id}`)}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">{icon}</div>
        <div>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
