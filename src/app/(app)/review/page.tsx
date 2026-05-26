"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers/auth-provider";
import { useXP } from "@/components/ui/xp-notification";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  RotateCcw, CheckCircle, AlertTriangle, Clock,
  ArrowRight, Sparkles, Brain
} from "lucide-react";

interface ReviewItem {
  skillId: string;
  skillName: string;
  domain: string;
  masteryScore: number;
  daysSinceReview: number;
  urgency: string;
  interval: number;
}

interface ReviewQuestion {
  skillId: string;
  skillName: string;
  question: string;
  hints: string[];
  answer: string;
  explanation: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const { currentStudent, apiRequest } = useAuth();
  const { awardXP } = useXP();
  const [schedule, setSchedule] = useState<{ items: ReviewItem[]; totalDue: number; overdueCount: number } | null>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [mode, setMode] = useState<"overview" | "reviewing" | "complete">("overview");
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; question: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReview();
  }, [currentStudent]);

  const loadReview = async () => {
    if (!currentStudent) return;
    try {
      const data = await apiRequest(`/api/students/${currentStudent.id}/review`);
      setSchedule(data.schedule);
      setQuestions(data.questions);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const startReview = () => {
    setMode("reviewing");
    setCurrentQ(0);
    setAnswer("");
    setShowResult(false);
    setResults([]);
  };

  const checkAnswer = () => {
    const q = questions[currentQ];
    const isCorrect = answer.trim().toLowerCase() === q.answer.trim().toLowerCase();
    setResults((prev) => [...prev, { correct: isCorrect, question: q.question }]);
    setShowResult(true);
    if (isCorrect) {
      awardXP(10, "Review correct!");
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setAnswer("");
      setShowResult(false);
    } else {
      setMode("complete");
      const correctCount = results.filter((r) => r.correct).length + (answer.trim().toLowerCase() === questions[currentQ]?.answer.trim().toLowerCase() ? 1 : 0);
      if (correctCount === questions.length) {
        awardXP(25, "Perfect review!");
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (mode === "complete") {
    const correctCount = results.filter((r) => r.correct).length;
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <Card>
          <CardContent className="py-10">
            <Sparkles className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Complete!</h2>
            <p className="text-gray-600 mb-4">
              You got {correctCount} out of {results.length} correct.
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${r.correct ? "bg-emerald-500" : "bg-red-400"}`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {correctCount === results.length
                ? "Perfect! Your memory is strong. 🧠"
                : correctCount >= results.length / 2
                ? "Good work! Keep reviewing to strengthen these skills."
                : "These skills need more practice. Try a lesson on them!"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/learn")}>
                Start Lesson
              </Button>
              <Button onClick={() => { setMode("overview"); loadReview(); }}>
                Back to Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "reviewing" && questions.length > 0) {
    const q = questions[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Review {currentQ + 1} of {questions.length}
            </span>
            <Badge variant="outline">{q.skillName}</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{q.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="text"
              placeholder="Your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !showResult && checkAnswer()}
              disabled={showResult}
              className="w-full px-4 py-3 border rounded-lg text-base disabled:opacity-60"
              autoFocus
            />

            {showResult && (
              <div className={`p-4 rounded-lg ${
                answer.trim().toLowerCase() === q.answer.trim().toLowerCase()
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                {answer.trim().toLowerCase() === q.answer.trim().toLowerCase() ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-emerald-800">Correct!</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-800">Not quite</span>
                    </div>
                    <p className="text-sm text-red-700">Answer: {q.answer}</p>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">{q.explanation}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {!showResult ? (
                <Button onClick={checkAnswer} disabled={!answer.trim()}>
                  Check Answer
                </Button>
              ) : (
                <Button onClick={nextQuestion}>
                  {currentQ < questions.length - 1 ? "Next" : "Finish Review"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview mode
  const dueItems = schedule?.items.filter((i) => i.urgency !== "stable") || [];
  const stableItems = schedule?.items.filter((i) => i.urgency === "stable") || [];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spaced Review</h1>
          <p className="text-sm text-gray-500">Keep your skills sharp with timed reviews</p>
        </div>
        {questions.length > 0 && (
          <Button onClick={startReview}>
            <Brain className="h-4 w-4 mr-2" />
            Start Review ({questions.length})
          </Button>
        )}
      </div>

      {/* Due for review */}
      {dueItems.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Due for Review ({dueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <UrgencyDot urgency={item.urgency} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.skillName}</p>
                    <p className="text-xs text-gray-500">
                      Last reviewed {item.daysSinceReview} day{item.daysSinceReview !== 1 ? "s" : ""} ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      item.urgency === "overdue" ? "border-red-300 text-red-700" :
                      item.urgency === "due-today" ? "border-amber-300 text-amber-700" :
                      "border-blue-300 text-blue-700"
                    }`}
                  >
                    {item.urgency === "overdue" ? "Overdue" :
                     item.urgency === "due-today" ? "Due today" : "Due soon"}
                  </Badge>
                  <span className="text-xs text-gray-400">{Math.round(item.masteryScore)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-emerald-900">All caught up!</p>
            <p className="text-sm text-emerald-700">No skills due for review right now. Keep learning!</p>
          </CardContent>
        </Card>
      )}

      {/* Stable skills */}
      {stableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              On Track ({stableItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stableItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-gray-700">{item.skillName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Review in {item.interval - item.daysSinceReview} day{(item.interval - item.daysSinceReview) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    overdue: "bg-red-500 animate-pulse",
    "due-today": "bg-amber-500",
    "due-soon": "bg-blue-400",
    stable: "bg-emerald-400",
  };
  return <div className={`h-2.5 w-2.5 rounded-full ${colors[urgency] || "bg-gray-300"}`} />;
}
