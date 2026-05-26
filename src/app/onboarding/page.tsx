"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

const LEARNING_STYLES = [
  { id: "visual", label: "Visual", description: "Pictures, diagrams, colors" },
  { id: "step-by-step", label: "Step-by-Step", description: "Clear instructions, one thing at a time" },
  { id: "practice-heavy", label: "Practice Heavy", description: "Lots of problems to solve" },
  { id: "real-world", label: "Real World", description: "Examples from everyday life" },
];

const HARD_TOPICS = [
  "Fractions", "Decimals", "Word Problems", "Multiplication", "Division",
  "Algebra", "Geometry", "Percentages", "Negative Numbers", "Equations",
  "Ratios", "Graphing", "Statistics", "Measurement",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { apiRequest, setCurrentStudent } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    grade: "",
    schoolType: "",
    confidenceLevel: 5,
    learningStyle: "",
    hardTopics: [] as string[],
  });

  const handleTopicToggle = (topic: string) => {
    setForm((prev) => ({
      ...prev,
      hardTopics: prev.hardTopics.includes(topic)
        ? prev.hardTopics.filter((t) => t !== topic)
        : [...prev.hardTopics, topic],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/students", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          age: parseInt(form.age),
          grade: parseInt(form.grade),
          confidenceLevel: form.confidenceLevel,
          learningPreferences: {
            style: form.learningStyle,
            hardTopics: form.hardTopics,
            schoolType: form.schoolType,
          },
        }),
      });

      setCurrentStudent({
        id: data.student.id,
        name: data.student.name,
        grade: data.student.grade,
        gradeBand: data.student.gradeBand,
      });

      router.push("/diagnostic");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-12 px-4">
      <div className="mx-auto max-w-lg">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? "bg-indigo-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about your student</CardTitle>
              <CardDescription>We&apos;ll use this to personalize their learning experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student&apos;s First Name</Label>
                <Input
                  id="studentName"
                  placeholder="e.g., Alex"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min="5"
                    max="18"
                    placeholder="e.g., 10"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="12"
                    placeholder="e.g., 5"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolType">School Type (optional)</Label>
                <Input
                  id="schoolType"
                  placeholder="e.g., Public, Homeschool, Montessori"
                  value={form.schoolType}
                  onChange={(e) => setForm({ ...form, schoolType: e.target.value })}
                />
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => setStep(2)}
                disabled={!form.name || !form.age || !form.grade}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>How does {form.name} feel about math?</CardTitle>
              <CardDescription>This helps us set the right tone and pace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Math Confidence Level</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Low</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.confidenceLevel}
                    onChange={(e) => setForm({ ...form, confidenceLevel: parseInt(e.target.value) })}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-500">High</span>
                </div>
                <p className="text-center text-sm font-medium text-indigo-600">
                  {form.confidenceLevel}/10
                </p>
              </div>

              <div className="space-y-3">
                <Label>Topics that feel hard (select any that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {HARD_TOPICS.map((topic) => (
                    <Badge
                      key={topic}
                      variant={form.hardTopics.includes(topic) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => handleTopicToggle(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>How does {form.name} learn best?</CardTitle>
              <CardDescription>We&apos;ll adapt our teaching style to match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LEARNING_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setForm({ ...form, learningStyle: style.id })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      form.learningStyle === style.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-gray-900">{style.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{style.description}</p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.learningStyle || loading}
                  className="flex-1"
                >
                  {loading ? "Setting up..." : "Start Diagnostic"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
