"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { BookOpen, Brain, Copy, Users } from "lucide-react";

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
  const [step, setStep] = useState(0); // 0 = intro, 1-3 = form steps, 4 = ready
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdStudentId, setCreatedStudentId] = useState("");
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
      setCreatedStudentId(data.student.id);

      setStep(4); // Show "ready" screen
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
        {step > 0 && step < 4 && (
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
        )}

        {/* Step 0: Introduction — explains what's about to happen */}
        {step === 0 && (
          <Card className="animate-fade-in-up">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-2xl">Let&apos;s set up your child&apos;s profile</CardTitle>
              <CardDescription className="text-base mt-2">
                This takes about 2 minutes. Here&apos;s what will happen:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <StepPreview
                  icon={<Users className="h-5 w-5 text-indigo-500" />}
                  title="1. You tell us about your child"
                  description="Name, age, grade, and what they find challenging (you do this part)"
                />
                <StepPreview
                  icon={<Brain className="h-5 w-5 text-purple-500" />}
                  title="2. Your child takes a short diagnostic"
                  description="15 minutes of adaptive questions to find their exact level"
                />
                <StepPreview
                  icon={<BookOpen className="h-5 w-5 text-emerald-500" />}
                  title="3. We build their personalized path"
                  description="Skill profile, daily lessons, and AI tutor — all customized"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-amber-800 font-medium">📋 Important</p>
                <p className="text-sm text-amber-700 mt-1">
                  You&apos;ll fill out the profile now. When it&apos;s time for the diagnostic,
                  <strong> your child will need to be present</strong> to answer the questions themselves.
                  You can start the diagnostic now or come back to it later.
                </p>
              </div>

              <Button className="w-full mt-4" size="lg" onClick={() => setStep(1)}>
                Let&apos;s Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle>About your child</CardTitle>
              <CardDescription>We&apos;ll use this to personalize their experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">First Name</Label>
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

        {/* Step 2: Confidence & challenges */}
        {step === 2 && (
          <Card className="animate-fade-in-up">
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Learning style */}
        {step === 3 && (
          <Card className="animate-fade-in-up">
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
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.learningStyle || loading}
                  className="flex-1"
                >
                  {loading ? "Setting up..." : "Save Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Ready — multiple delivery options */}
        {step === 4 && (
          <Card className="animate-scale-in">
            <CardHeader className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <CardTitle className="text-2xl">{form.name}&apos;s profile is ready!</CardTitle>
              <CardDescription className="text-base mt-2">
                Now {form.name} needs to take a short diagnostic. How would you like to start it?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DeliveryOption
                icon="📱"
                title="Send a link"
                description={`Text or email a link to ${form.name}'s device. They can start whenever they're ready.`}
                action={
                  <SendLinkButton studentId={createdStudentId} apiRequest={apiRequest} />
                }
              />

              <DeliveryOption
                icon="💻"
                title="Start on this device"
                description={`${form.name} is here now and can take the diagnostic on this device.`}
                action={
                  <Button className="w-full" variant="outline" onClick={() => router.push("/diagnostic")}>
                    Start Diagnostic Now
                  </Button>
                }
              />

              <DeliveryOption
                icon="⏰"
                title="Do it later"
                description="Save the profile and come back to the diagnostic another time."
                action={
                  <Button className="w-full" variant="ghost" onClick={() => router.push("/dashboard")}>
                    Go to Dashboard
                  </Button>
                }
              />

              <div className="pt-2">
                <p className="text-xs text-gray-400 text-center">
                  The diagnostic takes 10-15 minutes. {form.name}{" "}should answer the questions themselves — it&apos;s how we find their starting point.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepPreview({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function DeliveryOption({ icon, title, description, action }: { icon: string; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function SendLinkButton({ studentId, apiRequest }: { studentId: string; apiRequest: any }) {
  const [link, setLink] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateLink = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/diagnostic/link", {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
      setLink(data.link);
      setAccessCode(data.accessCode);
    } catch (caught) {
      setLink(null);
      setAccessCode(null);
      setError(caught instanceof Error ? caught.message : "Could not generate a link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyValue = async (value: string, target: "link" | "code") => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy automatically. Select the value and copy it manually.");
    }
  };

  if (!link) {
    return (
      <div className="space-y-2">
        <Button className="w-full" onClick={generateLink} disabled={loading || !studentId}>
          {loading ? "Generating..." : "Generate Link"}
        </Button>
        {error && <p className="text-xs text-red-600" aria-live="polite">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={link}
          readOnly
          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700 truncate"
        />
        <Button size="sm" variant="outline" onClick={() => copyValue(link, "link")}>
          {copied === "link" ? "Copied!" : "Copy"}
        </Button>
      </div>
      {accessCode && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2">
          <div>
            <p className="text-xs text-gray-500">Student access code</p>
            <p className="font-mono font-semibold tracking-wider text-gray-900">{accessCode}</p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => copyValue(accessCode, "code")}
            aria-label="Copy student access code"
            title="Copy student access code"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Send the link or access code. Generating another one replaces this credential.
      </p>
      {error && <p className="text-xs text-red-600" aria-live="polite">{error}</p>}
    </div>
  );
}
