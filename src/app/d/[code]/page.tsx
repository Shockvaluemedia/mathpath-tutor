"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Clock, Lightbulb, Heart, ArrowRight } from "lucide-react";

export default function DiagnosticLinkPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [started, setStarted] = useState(false);

  const startDiagnostic = async () => {
    let seededDemoStudent = false;
    try {
      const health = await fetch("/api/health").then((response) => response.json());
      if (health.demoMode) {
        localStorage.setItem("mathpath_student", JSON.stringify({
          id: "demo-student-1",
          name: "Alex",
          grade: 5,
          gradeBand: "ELEMENTARY",
        }));
        seededDemoStudent = true;
      }
    } catch {}

    setStarted(true);
    if (seededDemoStudent) {
      window.location.assign(`/diagnostic?code=${code}`);
      return;
    }

    router.push(`/diagnostic?code=${code}`);
  };

  // This page is the student-facing entry point from a shared link
  // No login required — the code authenticates them

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full animate-fade-in-up">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Hey there! 👋</CardTitle>
            <CardDescription className="text-base mt-2">
              Your parent/teacher set up a learning assessment for you. Let&apos;s find out what you already know!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <InfoRow icon={<Clock className="h-4 w-4 text-sky-500" />} text="Takes about 10-15 minutes" />
              <InfoRow icon={<Heart className="h-4 w-4 text-rose-500" />} text="This is NOT a test — there's no grade" />
              <InfoRow icon={<Lightbulb className="h-4 w-4 text-amber-500" />} text="It's okay to not know answers — that helps us help you!" />
              <InfoRow icon={<Brain className="h-4 w-4 text-purple-500" />} text="Use hints if you get stuck — that's smart, not cheating" />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                <strong>What happens:</strong> You&apos;ll answer some questions. They get easier or harder based on your answers. At the end, we&apos;ll know exactly how to help you learn best.
              </p>
            </div>

            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={startDiagnostic}
            >
              I&apos;m Ready — Let&apos;s Go!
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Access code: {code}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm shrink-0">
        {icon}
      </div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  );
}
