"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDomain } from "@/lib/domains";
import { READING_PROGRESS } from "@/lib/demo-domains/reading";
import { AI_LITERACY_PROGRESS } from "@/lib/demo-domains/ai-literacy";
import { Brain, TrendingUp, Target, ArrowRight, Play } from "lucide-react";

export default function DomainPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const domain = getDomain(slug);

  if (!domain) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-600">Domain not found.</p>
        <Button onClick={() => router.push("/domains")} className="mt-4">Back to Domains</Button>
      </div>
    );
  }

  // Get progress data for this domain
  const progress = slug === "reading" ? READING_PROGRESS
    : slug === "ai-literacy" ? AI_LITERACY_PROGRESS
    : null;

  const startLesson = () => {
    // Store active domain
    localStorage.setItem("mathpath_domain", slug);

    if (slug === "mathematics") {
      router.push("/learn");
    } else {
      router.push(`/domains/${slug}/learn`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Domain Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
          style={{ backgroundColor: `${domain.color}15` }}
        >
          {domain.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{domain.name}</h1>
          <p className="text-sm text-gray-500">{domain.tagline}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={startLesson}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${domain.color}15` }}>
              <Play className="h-6 w-6" style={{ color: domain.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Start Lesson</h3>
              <p className="text-xs text-gray-500">Continue your learning path</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push("/tutor")}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-50">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ask Tutor</h3>
              <p className="text-xs text-gray-500">Get help with {domain.name}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {progress && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{progress.stats.lessonsCompletedThisWeek}</p>
                <p className="text-xs text-gray-500">This Week</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-gray-900">{progress.stats.masteredSkillsCount}</p>
                <p className="text-xs text-gray-500">Mastered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold" style={{ color: domain.color }}>{progress.stats.avgConfidence}/10</p>
                <p className="text-xs text-gray-500">Confidence</p>
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: domain.color }} />
                Skill Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...progress.skills.developing, ...progress.skills.weak].slice(0, 5).map((skill) => (
                <div key={skill.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{skill.name}</span>
                    <span className="text-gray-500">{skill.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${skill.score}%`, backgroundColor: domain.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mastered */}
          {progress.skills.mastered.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Mastered Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {progress.skills.mastered.map((skill) => (
                    <Badge key={skill.name} className="bg-emerald-100 text-emerald-700">
                      ✓ {skill.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No progress yet */}
      {!progress && slug !== "mathematics" && (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-4xl mb-3">{domain.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Ready to start {domain.name}?</h2>
            <p className="text-sm text-gray-600 mb-4">Take a quick diagnostic to find your starting point.</p>
            <Button onClick={startLesson} style={{ backgroundColor: domain.color }}>
              Begin <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
