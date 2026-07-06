"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { CheckCircle, AlertCircle, TrendingUp, Target, ArrowRight, Rocket } from "lucide-react";

interface SkillInfo {
  id: string;
  name: string;
  domain: string;
  masteryScore: number;
  confidenceScore: number;
  status: string;
}

interface SkillProfileData {
  estimatedLevel: string;
  gradeLevelComparison: string;
  masteredSkills: SkillInfo[];
  developingSkills: SkillInfo[];
  weakSkills: SkillInfo[];
  rootCauses: string[];
  recommendedStartingPoint: string;
}

export default function SkillProfilePage() {
  const router = useRouter();
  const { currentStudent, apiRequest } = useAuth();
  const [profile, setProfile] = useState<SkillProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Try to load from the student's progress endpoint
      if (currentStudent?.id) {
        const data = await apiRequest(`/api/students/${currentStudent.id}/progress`);
        if (data.skills) {
          setProfile({
            estimatedLevel: `Grade ${currentStudent.grade} level`,
            gradeLevelComparison: "Assessment complete — see details below",
            masteredSkills: data.skills.mastered.map((s: any, i: number) => ({
              id: `m-${i}`, name: s.name, domain: s.domain, masteryScore: s.score, confidenceScore: s.score, status: "MASTERED",
            })),
            developingSkills: data.skills.developing.map((s: any, i: number) => ({
              id: `d-${i}`, name: s.name, domain: s.domain, masteryScore: s.score, confidenceScore: s.score, status: "DEVELOPING",
            })),
            weakSkills: data.skills.weak.map((s: any, i: number) => ({
              id: `w-${i}`, name: s.name, domain: s.domain, masteryScore: s.score, confidenceScore: s.score, status: "NOT_STARTED",
            })),
            rootCauses: ["Assessment data is being analyzed"],
            recommendedStartingPoint: "Start with your daily lesson to begin building skills",
          });
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fall through to demo data
    }

    // Demo data for display
    setProfile({
      estimatedLevel: `Grade ${currentStudent?.grade || 5} level with some gaps in foundational skills`,
      gradeLevelComparison: "Slightly below grade level in some areas, on track in others",
      masteredSkills: [
        { id: "1", name: "Addition", domain: "Operations", masteryScore: 95, confidenceScore: 90, status: "MASTERED" },
        { id: "2", name: "Subtraction", domain: "Operations", masteryScore: 88, confidenceScore: 85, status: "MASTERED" },
        { id: "3", name: "Patterns", domain: "Algebra Readiness", masteryScore: 82, confidenceScore: 75, status: "MASTERED" },
      ],
      developingSkills: [
        { id: "4", name: "Multiplication", domain: "Operations", masteryScore: 65, confidenceScore: 55, status: "PRACTICING" },
        { id: "5", name: "Word Problems", domain: "Problem Solving", masteryScore: 50, confidenceScore: 40, status: "DEVELOPING" },
      ],
      weakSkills: [
        { id: "6", name: "Fractions", domain: "Number Sense", masteryScore: 25, confidenceScore: 20, status: "DEVELOPING" },
        { id: "7", name: "Division", domain: "Operations", masteryScore: 30, confidenceScore: 25, status: "NOT_STARTED" },
      ],
      rootCauses: [
        "Incomplete understanding of place value affecting division",
        "Fraction concepts not connected to visual/concrete models",
        "Word problem reading comprehension needs scaffolding",
      ],
      recommendedStartingPoint: "Begin with visual fraction models to build number sense, then connect to division concepts",
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Building your skill profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-8 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentStudent?.name}&apos;s Skill Profile
          </h1>
          <p className="text-gray-600">{profile.estimatedLevel}</p>
        </div>

        {/* Level Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Grade Level Comparison</h3>
            </div>
            <p className="text-gray-600">{profile.gradeLevelComparison}</p>
          </CardContent>
        </Card>

        {/* Mastered Skills */}
        {profile.masteredSkills.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Mastered Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.masteredSkills.map((skill) => (
                <SkillRow key={skill.id} skill={skill} color="emerald" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Developing Skills */}
        {profile.developingSkills.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Developing Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.developingSkills.map((skill) => (
                <SkillRow key={skill.id} skill={skill} color="amber" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Weak Skills */}
        {profile.weakSkills.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.weakSkills.map((skill) => (
                <SkillRow key={skill.id} skill={skill} color="rose" />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Root Causes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Why These Gaps Exist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {profile.rootCauses.map((cause, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">•</span>
                  <span className="text-gray-600 text-sm">{cause}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommended Starting Point */}
        <Card className="mb-8 border-indigo-200 bg-indigo-50/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">Recommended Starting Point</h3>
            <p className="text-indigo-700 text-sm">{profile.recommendedStartingPoint}</p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => router.push("/learn")}>
            Start First Lesson
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/sprint/report")}>
            <Rocket className="h-4 w-4 mr-2" />
            View Sprint Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function SkillRow({ skill, color }: { skill: SkillInfo; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900">{skill.name}</span>
          <span className="text-xs text-gray-500">{Math.round(skill.masteryScore)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colorMap[color]}`}
            style={{ width: `${skill.masteryScore}%` }}
          />
        </div>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {skill.domain}
      </Badge>
    </div>
  );
}
