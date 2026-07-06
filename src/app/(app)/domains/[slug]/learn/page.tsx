"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { useXP } from "@/components/ui/xp-notification";
import { Confetti } from "@/components/ui/confetti";
import { getDomain } from "@/lib/domains";
import { READING_DEMO_LESSON } from "@/lib/demo-domains/reading";
import { AI_LITERACY_DEMO_LESSON } from "@/lib/demo-domains/ai-literacy";
import { CheckCircle, PartyPopper, ArrowLeft } from "lucide-react";

export default function DomainLearnPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { currentStudent } = useAuth();
  const { awardXP } = useXP();

  const domain = getDomain(slug);
  const lesson = slug === "reading" ? READING_DEMO_LESSON
    : slug === "ai-literacy" ? AI_LITERACY_DEMO_LESSON
    : null;

  const [currentSection, setCurrentSection] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [, setAnswers] = useState<Record<string, { answer: string; correct: boolean }[]>>({});

  if (!domain || !lesson) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <p className="text-gray-600">Lesson not available for this domain yet.</p>
        <Button onClick={() => router.push("/domains")} className="mt-4">Back to Domains</Button>
      </div>
    );
  }

  const sections = lesson.sections;
  const current = sections[currentSection];
  const progress = ((currentSection + 1) / sections.length) * 100;
  const isLast = currentSection === sections.length - 1;

  const recordAnswer = (sectionKey: string, idx: number, answer: string, correctAnswer: string) => {
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    if (isCorrect) awardXP(10, "Correct!");
    setAnswers((prev) => {
      const section = prev[sectionKey] || [];
      const updated = [...section];
      updated[idx] = { answer, correct: isCorrect };
      return { ...prev, [sectionKey]: updated };
    });
  };

  const completeLesson = () => {
    awardXP(50, "Lesson complete!");
    setCompleted(true);
  };

  if (completed) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Confetti active={true} />
        <Card className="animate-scale-in">
          <CardContent className="py-12">
            <PartyPopper className="h-16 w-16 text-amber-500 mx-auto mb-4 animate-confetti-pop" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lesson Complete! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Great work on {domain.name}, {currentStudent?.name || "learner"}!
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push(`/domains/${slug}`)}>
                Back to {domain.name}
              </Button>
              <Button onClick={() => { setCompleted(false); setCurrentSection(0); setAnswers({}); }}>
                Next Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/domains/${slug}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">{lesson.title}</h1>
          </div>
          <Badge style={{ backgroundColor: `${domain.color}15`, color: domain.color }}>
            {domain.icon} {domain.name}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Section {currentSection + 1} of {sections.length}</span>
          <span>{current.title}</span>
        </div>
      </div>

      {/* Current Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{current.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 italic">{current.instructions}</p>
          <Separator />
          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
            {current.content}
          </div>

          {current.questions && current.questions.length > 0 && (
            <div className="space-y-4 mt-6">
              {current.questions.map((q, i) => (
                <QuestionBlock
                  key={i}
                  question={q}
                  index={i}
                  onAnswer={(ans) => recordAnswer(current.key, i, ans, q.answer)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSection((p) => Math.max(0, p - 1))}
          disabled={currentSection === 0}
        >
          Previous
        </Button>
        {isLast ? (
          <Button onClick={completeLesson} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Lesson
          </Button>
        ) : (
          <Button onClick={() => setCurrentSection((p) => p + 1)}>
            Next Section
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({ question, index, onAnswer }: {
  question: { question: string; hints: string[]; answer: string; explanation: string };
  index: number;
  onAnswer: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();

  const handleCheck = () => {
    setChecked(true);
    onAnswer(answer);
  };

  return (
    <div className={`p-4 rounded-lg space-y-3 ${checked ? (isCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200") : "bg-gray-50"}`}>
      <p className="font-medium text-gray-900 text-sm">{index + 1}. {question.question}</p>
      <input
        type="text"
        placeholder="Your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !checked && handleCheck()}
        disabled={checked}
        className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-60"
      />
      {!checked && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="text-xs">💡 Hint</Button>
          <Button variant="ghost" size="sm" onClick={handleCheck} disabled={!answer.trim()} className="text-xs">✓ Check</Button>
        </div>
      )}
      {checked && (
        <p className={`text-sm font-medium ${isCorrect ? "text-emerald-700" : "text-amber-700"}`}>
          {isCorrect ? "✓ Correct!" : `Not quite — Answer: ${question.answer}`}
        </p>
      )}
      {(showHint || checked) && question.hints[0] && !checked && (
        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">{question.hints[0]}</p>
      )}
      {checked && <p className="text-xs text-gray-600">{question.explanation}</p>}
    </div>
  );
}
