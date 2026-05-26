"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import { useXP } from "@/components/ui/xp-notification";
import { Confetti } from "@/components/ui/confetti";
import { BookOpen, Brain, Dumbbell, Rocket, MessageCircle, Sparkles, CheckCircle, PartyPopper, History } from "lucide-react";

interface LessonSection {
  title: string;
  instructions: string;
  content: string;
  questions?: { question: string; hints: string[]; answer: string; explanation: string }[];
}

interface Lesson {
  title: string;
  focusSkill: string;
  warmup: LessonSection;
  miniLesson: LessonSection;
  guidedPractice: LessonSection;
  independentPractice: LessonSection;
  challenge: LessonSection;
  reflection: LessonSection;
}

export default function LearnPage() {
  const router = useRouter();
  const { currentStudent, apiRequest } = useAuth();
  const { awardXP } = useXP();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, { answer: string; isCorrect: boolean }[]>>({});

  const sections = lesson
    ? [
        { key: "warmup", icon: Sparkles, label: "Warmup", data: lesson.warmup },
        { key: "miniLesson", icon: BookOpen, label: "Mini Lesson", data: lesson.miniLesson },
        { key: "guidedPractice", icon: Brain, label: "Guided Practice", data: lesson.guidedPractice },
        { key: "independentPractice", icon: Dumbbell, label: "Independent Practice", data: lesson.independentPractice },
        { key: "challenge", icon: Rocket, label: "Challenge", data: lesson.challenge },
        { key: "reflection", icon: MessageCircle, label: "Reflection", data: lesson.reflection },
      ]
    : [];

  const generateLesson = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/lessons/generate", {
        method: "POST",
        body: JSON.stringify({ studentId: currentStudent?.id }),
      });
      setLesson(data.lesson);
      setLessonId(data.lessonId);
      setGenerated(true);
      setCurrentSection(0);
    } catch (err) {
      console.error("Generate lesson error:", err);
      // Use demo lesson for display
      setLesson(getDemoLesson());
      setLessonId("demo");
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const completeLesson = async () => {
    if (!lessonId || lessonId === "demo") {
      awardXP(50, "Lesson complete!");
      setCompleted(true);
      return;
    }

    try {
      const allResponses = Object.values(sectionAnswers).flat();
      await apiRequest("/api/lessons/complete", {
        method: "POST",
        body: JSON.stringify({
          lessonId,
          studentId: currentStudent?.id,
          responses: allResponses,
        }),
      });

      // Award XP
      awardXP(50, "Lesson complete!");
      const correctCount = allResponses.filter((r) => r.isCorrect).length;
      if (correctCount === allResponses.length && allResponses.length > 0) {
        awardXP(25, "Perfect lesson!");
      }

      setCompleted(true);
    } catch (err) {
      console.error("Complete lesson error:", err);
      setCompleted(true);
    }
  };

  const recordAnswer = (sectionKey: string, questionIndex: number, answer: string, correctAnswer: string) => {
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      awardXP(10, "Correct answer!");
    }
    setSectionAnswers((prev) => {
      const sectionData = prev[sectionKey] || [];
      const updated = [...sectionData];
      updated[questionIndex] = { answer, isCorrect };
      return { ...prev, [sectionKey]: updated };
    });
  };

  if (completed) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Confetti active={completed} />
        <Card className="animate-scale-in">
          <CardContent className="py-12">
            <PartyPopper className="h-16 w-16 text-amber-500 mx-auto mb-4 animate-confetti-pop" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lesson Complete! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Great work, {currentStudent?.name}! You finished today&apos;s lesson.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/tutor")}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask Tutor
              </Button>
              <Button onClick={() => { setGenerated(false); setCompleted(false); setSectionAnswers({}); }}>
                <BookOpen className="h-4 w-4 mr-2" />
                Next Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!generated) {
    return (
      <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Daily Learning Path</h1>
          <p className="text-gray-600">
            Hi {currentStudent?.name || "there"}! Ready for today&apos;s math adventure?
          </p>
        </div>

        <Card className="text-center">
          <CardContent className="py-8 sm:py-12">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Generate Today&apos;s Lesson
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
              Your personalized lesson will include a warmup, mini-lesson, practice problems, a challenge, and reflection.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={generateLesson} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Creating your lesson...
                  </>
                ) : (
                  "Start Today's Lesson"
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={() => router.push("/learn/history")}>
                <History className="h-4 w-4 mr-2" />
                Lesson History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lesson) return null;

  const current = sections[currentSection];
  const progress = ((currentSection + 1) / sections.length) * 100;
  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
          <Badge>{lesson.focusSkill}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => setCurrentSection(i)}
                className={`flex flex-col items-center gap-1 p-1 rounded transition-colors ${
                  i === currentSection ? "text-indigo-600" : i < currentSection ? "text-emerald-500" : "text-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] hidden sm:block">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {current && <current.icon className="h-5 w-5 text-indigo-600" />}
            <CardTitle>{current?.data.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 italic">{current?.data.instructions}</p>
          <Separator />
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{current?.data.content}</p>
          </div>

          {current?.data.questions && current.data.questions.length > 0 && (
            <div className="space-y-4 mt-6">
              <h4 className="font-medium text-gray-900">Practice Questions</h4>
              {current.data.questions.map((q, i) => (
                <QuestionCard
                  key={i}
                  question={q}
                  index={i}
                  onAnswer={(answer) => recordAnswer(current.key, i, answer, q.answer)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
          disabled={currentSection === 0}
        >
          Previous
        </Button>
        {isLastSection ? (
          <Button onClick={completeLesson} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Lesson
          </Button>
        ) : (
          <Button onClick={() => setCurrentSection((prev) => prev + 1)}>
            Next Section
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onAnswer,
}: {
  question: { question: string; hints: string[]; answer: string; explanation: string };
  index: number;
  onAnswer: (answer: string) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  const isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();

  const handleCheck = () => {
    setChecked(true);
    setShowAnswer(true);
    onAnswer(userAnswer);
  };

  return (
    <div className={`p-4 rounded-lg space-y-3 ${checked ? (isCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200") : "bg-gray-50"}`}>
      <p className="font-medium text-gray-900">
        {index + 1}. {question.question}
      </p>
      <input
        type="text"
        placeholder="Your answer..."
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !checked && handleCheck()}
        disabled={checked}
        className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-60"
      />
      <div className="flex gap-2">
        {!checked && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
            >
              💡 Hint
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCheck}
              disabled={!userAnswer.trim()}
            >
              ✓ Check
            </Button>
          </>
        )}
        {checked && (
          <span className={`text-sm font-medium ${isCorrect ? "text-emerald-700" : "text-amber-700"}`}>
            {isCorrect ? "✓ Correct!" : "Not quite — see explanation below"}
          </span>
        )}
      </div>
      {showHint && !checked && question.hints[0] && (
        <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">{question.hints[0]}</p>
      )}
      {showAnswer && (
        <div className="text-sm bg-white p-2 rounded border">
          <p className="font-medium text-gray-800">Answer: {question.answer}</p>
          <p className="text-gray-600 mt-1">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function getDemoLesson(): Lesson {
  return {
    title: "Understanding Fractions with Visual Models",
    focusSkill: "Fractions",
    warmup: {
      title: "Quick Review",
      instructions: "Let's warm up with some problems you already know!",
      content: "Before we dive into fractions, let's make sure we're comfortable with division — because fractions and division are closely connected!",
      questions: [
        { question: "What is 12 ÷ 4?", hints: ["Think: how many groups of 4 make 12?"], answer: "3", explanation: "12 ÷ 4 = 3 because 4 × 3 = 12" },
        { question: "What is 8 ÷ 2?", hints: ["Think: if you split 8 into 2 equal groups..."], answer: "4", explanation: "8 ÷ 2 = 4 because 2 × 4 = 8" },
      ],
    },
    miniLesson: {
      title: "What Are Fractions?",
      instructions: "Read through this explanation carefully. Take your time!",
      content: `A fraction represents a PART of a whole thing.\n\nThink of a pizza cut into equal slices:\n🍕 If you cut a pizza into 4 equal slices and eat 1 slice, you ate 1/4 of the pizza.\n\nThe bottom number (denominator) tells you how many EQUAL parts the whole is divided into.\nThe top number (numerator) tells you how many parts you're talking about.\n\nExample: 3/4 means "3 out of 4 equal parts"\n\nKey idea: The parts MUST be equal! If you cut a pizza into unequal slices, you can't use simple fractions to describe them.`,
      questions: [],
    },
    guidedPractice: {
      title: "Let's Practice Together",
      instructions: "Try these problems. Use the hints if you need them!",
      content: "Now let's practice identifying and working with fractions.",
      questions: [
        { question: "A pie is cut into 8 equal slices. You eat 3 slices. What fraction did you eat?", hints: ["The denominator is how many total slices", "The numerator is how many you ate"], answer: "3/8", explanation: "You ate 3 out of 8 equal slices, so the fraction is 3/8" },
        { question: "What fraction is shaded if 2 out of 5 equal parts are colored?", hints: ["Count the colored parts for the top number"], answer: "2/5", explanation: "2 parts are shaded out of 5 total equal parts = 2/5" },
        { question: "Which is bigger: 1/2 or 1/4?", hints: ["Think about pizza: would you rather have half or a quarter?"], answer: "1/2", explanation: "1/2 is bigger because when you divide something into fewer pieces, each piece is larger" },
      ],
    },
    independentPractice: {
      title: "Your Turn!",
      instructions: "Try these on your own. You've got this!",
      content: "Apply what you learned about fractions.",
      questions: [
        { question: "Write a fraction: 5 out of 10 equal parts", hints: ["Numerator/Denominator"], answer: "5/10", explanation: "5 parts out of 10 total = 5/10 (which also equals 1/2!)" },
        { question: "A chocolate bar has 6 equal pieces. You give away 2. What fraction do you have left?", hints: ["You started with 6 and gave away 2..."], answer: "4/6", explanation: "You have 4 pieces left out of 6 total = 4/6" },
        { question: "Is 3/4 more or less than 1/2?", hints: ["Half of 4 is 2, and 3 > 2"], answer: "more", explanation: "3/4 is more than 1/2 because 3 is more than half of 4" },
        { question: "What fraction of a week is 3 days?", hints: ["How many days are in a week?"], answer: "3/7", explanation: "A week has 7 days, so 3 days = 3/7 of a week" },
      ],
    },
    challenge: {
      title: "Challenge Problem",
      instructions: "This one's a stretch — give it your best shot!",
      content: "Let's see if you can apply fractions to a trickier situation.",
      questions: [
        { question: "Sam ate 2/8 of a pizza and Kim ate 3/8. What fraction did they eat together?", hints: ["Add the numerators when denominators are the same"], answer: "5/8", explanation: "2/8 + 3/8 = 5/8 eaten together." },
      ],
    },
    reflection: {
      title: "Reflection",
      instructions: "Take a moment to think about what you learned today.",
      content: `Great work today! Before you go, think about:\n\n• What's one new thing you learned about fractions?\n• Was there anything that felt tricky?\n• Can you think of a fraction you see in real life?\n\nRemember: fractions are just a way of talking about PARTS of things. You use them every day without even realizing it!`,
      questions: [],
    },
  };
}
