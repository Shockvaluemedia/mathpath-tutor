"use client";

import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  answerType: string;
  options?: string[];
}

interface DiagnosticDecision {
  action: "ASK" | "STOP";
  direction?: "START" | "UP" | "DOWN" | "LATERAL";
  stopDecision: {
    shouldStop: boolean;
    questionCount: number;
    estimatedProgress: number;
  };
}

function getNow() {
  return Date.now();
}

export default function DiagnosticPage() {
  return (
    <Suspense fallback={<DiagnosticLoading />}>
      <DiagnosticExperience />
    </Suspense>
  );
}

function DiagnosticExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentStudent, apiRequest, isLoading } = useAuth();
  const currentStudentId = currentStudent?.id;
  const phase = searchParams.get("phase") === "endline" ? "endline" : "baseline";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [hintsShown, setHintsShown] = useState(0);
  const [confidence, setConfidence] = useState(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [diagnosticDecision, setDiagnosticDecision] = useState<DiagnosticDecision | null>(null);
  const [responses, setResponses] = useState<Array<{ skillId: string; isCorrect: boolean; difficulty: number }>>([]);
  const startTimeRef = useRef<number>(0);
  const diagnosticStartedRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const assessmentIdRef = useRef<string | null>(null);

  const finalizeAssessment = useCallback(async (id: string | null = assessmentIdRef.current) => {
    if (!id) throw new Error("Assessment ID is not available");
    setCompletionError(null);
    try {
      await apiRequest("/api/diagnostic/complete", {
        method: "POST",
        body: JSON.stringify({ assessmentId: id, studentId: currentStudentId, phase }),
      });
      trackSprintEvent(phase === "endline" ? "endline_completed" : "diagnostic_completed", currentStudentId);
      setCompleted(true);
      setTimeout(() => router.push(phase === "endline" ? "/sprint/report" : "/skill-profile"), 2000);
    } catch (err) {
      console.error("Complete error:", err);
      setCompletionError("Your answers are saved, but the evidence could not be finalized yet.");
      throw err;
    }
  }, [apiRequest, currentStudentId, phase, router]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/diagnostic/generate", {
        method: "POST",
        body: JSON.stringify({
          studentId: currentStudentId,
          assessmentId: assessmentIdRef.current ?? undefined,
          phase,
        }),
      });

      setDiagnosticDecision(data.diagnosticDecision ?? null);
      if (data.assessmentId) {
        assessmentIdRef.current = data.assessmentId;
        setAssessmentId(data.assessmentId);
      }
      if (data.diagnosticDecision?.stopDecision?.shouldStop) {
        await finalizeAssessment(data.assessmentId);
        setQuestions([]);
        return;
      }
      setQuestions(data.questions);
      if (!diagnosticStartedRef.current) {
        trackSprintEvent(phase === "endline" ? "endline_started" : "diagnostic_started", currentStudentId);
        diagnosticStartedRef.current = true;
      }
      setCurrentIndex(0);
      startTimeRef.current = getNow();
      setAnswer("");
      setHintsShown(0);
      setConfidence(5);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, currentStudentId, finalizeAssessment, phase]);

  useEffect(() => {
    if (isLoading) return;
    if (!currentStudent) {
      router.push("/onboarding");
      return;
    }
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void loadQuestions();
  }, [isLoading, currentStudent, loadQuestions, router]);

  useEffect(() => {
    startTimeRef.current = getNow();
  }, [currentIndex]);

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
        timeSpent,
        hintsUsed: hintsShown,
        confidenceRating: confidence,
      };

      const submission = await apiRequest("/api/diagnostic/submit", {
        method: "POST",
        body: JSON.stringify({
          assessmentId,
          studentId: currentStudentId,
          responses: [responseData],
        }),
      });
      const evaluation = submission.evaluations?.[0];
      if (!evaluation || typeof evaluation.isCorrect !== "boolean") {
        throw new Error("Diagnostic response was not scored");
      }

      const newResponses = [
        ...responses,
        { skillId: currentQ.skillId, isCorrect: evaluation.isCorrect, difficulty: currentQ.difficulty },
      ];
      setResponses(newResponses);

      const isDemoAssessment = assessmentId?.startsWith("demo-assessment-") ?? false;
      if (isDemoAssessment && currentIndex >= questions.length - 1) {
        await finalizeAssessment(assessmentId);
      } else if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setAnswer("");
        setHintsShown(0);
        setConfidence(5);
      } else {
        await loadQuestions();
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const retryCompletion = async () => {
    setSubmitting(true);
    try {
      await finalizeAssessment(assessmentId);
    } catch {
      // The completion message remains visible for another retry.
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">
            {phase === "endline" ? "Preparing the endline skill check..." : "Preparing your diagnostic assessment..."}
          </p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {phase === "endline" ? "Endline Check Complete" : "Assessment Complete!"}
            </h2>
            <p className="text-gray-600">
              {phase === "endline"
                ? "Your measured sprint report is being prepared."
                : "Great job! We're building your personalized skill profile..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const isDemoAssessment = assessmentId?.startsWith("demo-assessment-") ?? false;
  const serverQuestionCount = diagnosticDecision?.stopDecision.questionCount ?? 0;
  const questionNumber = Math.max(responses.length, serverQuestionCount) + 1;
  const totalProgress = isDemoAssessment
    ? (responses.length / questions.length) * 100
    : (diagnosticDecision?.stopDecision.estimatedProgress ?? 0) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Question {questionNumber}
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

        {completionError && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {completionError} Please retry before leaving this check.
          </div>
        )}

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

          <Button
            onClick={completionError ? retryCompletion : handleSubmitAnswer}
            disabled={completionError ? submitting : !answer.trim() || submitting}
          >
            {submitting
              ? "Checking..."
              : completionError
                ? "Retry Completion"
                : "Submit Answer"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiagnosticLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Preparing the skill check...</p>
      </div>
    </div>
  );
}
