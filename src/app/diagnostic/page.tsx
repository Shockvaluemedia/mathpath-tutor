"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { Clock, Lightbulb, ChevronRight } from "lucide-react";
import { trackSprintEvent } from "@/lib/sprint-tracking";

interface Question {
  id: string;
  skillId: string;
  skillName: string;
  question: string;
  difficulty: number;
  hints: string[];
  correctAnswer: string;
  answerType: string;
  options?: string[];
}

function getNow() {
  return Date.now();
}

export default function DiagnosticPage() {
  const router = useRouter();
  const { currentStudent, apiRequest, isLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [confidence, setConfidence] = useState(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [responses, setResponses] = useState<Array<{ skillId: string; isCorrect: boolean; difficulty: number }>>([]);
  const startTimeRef = useRef<number>(0);
  const diagnosticStartedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!currentStudent) {
      router.push("/onboarding");
      return;
    }
    loadQuestions();
  }, [isLoading, currentStudent]);

  useEffect(() => {
    startTimeRef.current = getNow();
  }, [currentIndex]);

  const loadQuestions = async (previousResponses = responses) => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/diagnostic/generate", {
        method: "POST",
        body: JSON.stringify({
          studentId: currentStudent?.id,
          previousResponses: previousResponses.length > 0 ? previousResponses : undefined,
        }),
      });

      setQuestions(data.questions);
      if (data.assessmentId) setAssessmentId(data.assessmentId);
      if (!diagnosticStartedRef.current) {
        trackSprintEvent("diagnostic_started", currentStudent?.id);
        diagnosticStartedRef.current = true;
      }
      setCurrentIndex(0);
      setAnswer("");
      setHintsShown(0);
      setConfidence(5);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);

    const timeSpent = Math.round((getNow() - startTimeRef.current) / 1000);
    const currentQ = questions[currentIndex];

    try {
      const responseData = {
        questionId: currentQ.id,
        skillId: currentQ.skillId,
        question: currentQ.question,
        studentAnswer: answer,
        correctAnswer: currentQ.correctAnswer,
        isCorrect: answer.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase(),
        timeSpent,
        hintsUsed: hintsShown,
        confidenceRating: confidence,
      };

      await apiRequest("/api/diagnostic/submit", {
        method: "POST",
        body: JSON.stringify({
          assessmentId,
          studentId: currentStudent?.id,
          responses: [responseData],
        }),
      });

      const newResponses = [
        ...responses,
        { skillId: currentQ.skillId, isCorrect: responseData.isCorrect, difficulty: currentQ.difficulty },
      ];
      setResponses(newResponses);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnswer("");
        setHintsShown(0);
        setConfidence(5);
      } else if (newResponses.length < targetQuestionCount) {
        await loadQuestions(newResponses);
      } else {
        await completeAssessment();
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const completeAssessment = async () => {
    try {
      await apiRequest("/api/diagnostic/complete", {
        method: "POST",
        body: JSON.stringify({ assessmentId, studentId: currentStudent?.id }),
      });
      trackSprintEvent("diagnostic_completed", currentStudent?.id);
      setCompleted(true);
      setTimeout(() => router.push("/skill-profile"), 2000);
    } catch (err) {
      console.error("Complete error:", err);
      // Still navigate even if profile generation fails
      trackSprintEvent("diagnostic_completed", currentStudent?.id);
      setCompleted(true);
      setTimeout(() => router.push("/skill-profile"), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Preparing your diagnostic assessment...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Complete!</h2>
            <p className="text-gray-600">Great job! We&apos;re building your personalized skill profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const isDemoAssessment = assessmentId?.startsWith("demo-assessment-") ?? false;
  const targetQuestionCount = isDemoAssessment ? questions.length : 15;
  const questionNumber = Math.min(responses.length + 1, targetQuestionCount);
  const totalProgress = (responses.length / targetQuestionCount) * 100;
  const totalQuestionLabel = isDemoAssessment ? targetQuestionCount : "~15";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Question {questionNumber} of {totalQuestionLabel}
            </span>
            <Badge variant="outline">{currentQuestion.skillName}</Badge>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Question card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Answer input */}
            {currentQuestion.answerType === "multiple-choice" && currentQuestion.options ? (
              <div className="grid grid-cols-1 gap-2">
                {currentQuestion.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswer(option)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      answer === option
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {option}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="Type your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
                className="text-lg"
              />
            )}

            {/* Hints */}
            {hintsShown > 0 && (
              <div className="space-y-2">
                {currentQuestion.hints.slice(0, hintsShown).map((hint, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800">{hint}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Confidence slider */}
            <div className="pt-4 border-t">
              <label className="text-sm text-gray-500 block mb-2">
                How confident do you feel about your answer?
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Unsure</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-xs text-gray-400">Very sure</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHintsShown((prev) => Math.min(prev + 1, currentQuestion.hints.length))}
            disabled={hintsShown >= currentQuestion.hints.length}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            {hintsShown >= currentQuestion.hints.length ? "No more hints" : "Get a hint"}
          </Button>

          <Button onClick={handleSubmitAnswer} disabled={!answer.trim() || submitting}>
            {submitting ? "Checking..." : "Submit Answer"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
