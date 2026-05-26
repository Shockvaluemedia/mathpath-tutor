"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Link2, BookOpen, Brain } from "lucide-react";

const SKILL_MAP = {
  EARLY_ELEMENTARY: [
    { id: "1", name: "Counting to 20", domain: "Number Sense", prerequisites: [], gradeMin: 0, gradeMax: 1 },
    { id: "2", name: "Number Recognition", domain: "Number Sense", prerequisites: ["1"], gradeMin: 0, gradeMax: 1 },
    { id: "3", name: "Addition (single digit)", domain: "Operations", prerequisites: ["1", "2"], gradeMin: 0, gradeMax: 2 },
    { id: "4", name: "Subtraction (single digit)", domain: "Operations", prerequisites: ["1", "2"], gradeMin: 0, gradeMax: 2 },
    { id: "5", name: "Patterns", domain: "Algebra Readiness", prerequisites: ["1"], gradeMin: 0, gradeMax: 2 },
    { id: "6", name: "Shapes", domain: "Geometry", prerequisites: [], gradeMin: 0, gradeMax: 2 },
    { id: "7", name: "Comparing Numbers", domain: "Number Sense", prerequisites: ["1", "2"], gradeMin: 0, gradeMax: 2 },
  ],
  ELEMENTARY: [
    { id: "8", name: "Multiplication", domain: "Operations", prerequisites: ["3"], gradeMin: 3, gradeMax: 5 },
    { id: "9", name: "Division", domain: "Operations", prerequisites: ["8"], gradeMin: 3, gradeMax: 5 },
    { id: "10", name: "Fractions", domain: "Number Sense", prerequisites: ["9"], gradeMin: 3, gradeMax: 5 },
    { id: "11", name: "Decimals", domain: "Number Sense", prerequisites: ["10"], gradeMin: 4, gradeMax: 5 },
    { id: "12", name: "Word Problems", domain: "Problem Solving", prerequisites: ["8", "9"], gradeMin: 3, gradeMax: 5 },
    { id: "13", name: "Place Value", domain: "Number Sense", prerequisites: ["2"], gradeMin: 3, gradeMax: 5 },
    { id: "14", name: "Measurement", domain: "Measurement", prerequisites: ["8"], gradeMin: 3, gradeMax: 5 },
  ],
  MIDDLE_SCHOOL: [
    { id: "15", name: "Pre-Algebra", domain: "Algebra", prerequisites: ["8", "9", "10"], gradeMin: 6, gradeMax: 8 },
    { id: "16", name: "Ratios & Proportions", domain: "Ratios", prerequisites: ["10", "11"], gradeMin: 6, gradeMax: 7 },
    { id: "17", name: "Integers", domain: "Number Sense", prerequisites: ["4"], gradeMin: 6, gradeMax: 7 },
    { id: "18", name: "Expressions", domain: "Algebra", prerequisites: ["15"], gradeMin: 6, gradeMax: 8 },
    { id: "19", name: "Equations", domain: "Algebra", prerequisites: ["18"], gradeMin: 7, gradeMax: 8 },
    { id: "20", name: "Percentages", domain: "Ratios", prerequisites: ["10", "11"], gradeMin: 6, gradeMax: 7 },
    { id: "21", name: "Coordinate Plane", domain: "Geometry", prerequisites: ["17"], gradeMin: 6, gradeMax: 8 },
  ],
  HIGH_SCHOOL: [
    { id: "22", name: "Linear Equations", domain: "Algebra", prerequisites: ["19"], gradeMin: 9, gradeMax: 10 },
    { id: "23", name: "Quadratics", domain: "Algebra", prerequisites: ["22"], gradeMin: 9, gradeMax: 10 },
    { id: "24", name: "Functions", domain: "Algebra", prerequisites: ["22"], gradeMin: 9, gradeMax: 11 },
    { id: "25", name: "Geometry Proofs", domain: "Geometry", prerequisites: ["21"], gradeMin: 9, gradeMax: 10 },
    { id: "26", name: "Trigonometry", domain: "Geometry", prerequisites: ["25"], gradeMin: 10, gradeMax: 11 },
    { id: "27", name: "Statistics", domain: "Data", prerequisites: ["16"], gradeMin: 9, gradeMax: 12 },
    { id: "28", name: "Probability", domain: "Data", prerequisites: ["10", "16"], gradeMin: 9, gradeMax: 12 },
  ],
};

export default function AdminSkillsPage() {
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState("EARLY_ELEMENTARY");

  const allSkills = Object.values(SKILL_MAP).flat();
  const filteredSkills = search
    ? allSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.domain.toLowerCase().includes(search.toLowerCase())
      )
    : (SKILL_MAP as any)[selectedTab] || [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skill Map</h1>
          <p className="text-gray-500">Manage skills, prerequisites, and grade bands</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by grade band */}
      {!search && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="EARLY_ELEMENTARY">K-2</TabsTrigger>
            <TabsTrigger value="ELEMENTARY">3-5</TabsTrigger>
            <TabsTrigger value="MIDDLE_SCHOOL">6-8</TabsTrigger>
            <TabsTrigger value="HIGH_SCHOOL">9-12</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Skills Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredSkills.map((skill: any) => (
          <Card key={skill.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-medium text-gray-900">{skill.name}</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {skill.domain}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Grades {skill.gradeMin}–{skill.gradeMax}</span>
                {skill.prerequisites.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {skill.prerequisites.length} prerequisite{skill.prerequisites.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {skill.prerequisites.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {skill.prerequisites.map((preId: string) => {
                    const pre = allSkills.find((s) => s.id === preId);
                    return pre ? (
                      <Badge key={preId} variant="secondary" className="text-xs">
                        {pre.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <Separator className="my-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{allSkills.length}</p>
            <p className="text-xs text-gray-500">Total Skills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">4</p>
            <p className="text-xs text-gray-500">Grade Bands</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">7</p>
            <p className="text-xs text-gray-500">Domains</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {allSkills.reduce((sum, s) => sum + s.prerequisites.length, 0)}
            </p>
            <p className="text-xs text-gray-500">Prerequisites</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
