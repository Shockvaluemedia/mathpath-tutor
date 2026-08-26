"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confetti } from "@/components/ui/confetti";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function BillingSuccessPage() {
  const router = useRouter();
  const [isSprint, setIsSprint] = useState(false);

  useEffect(() => {
    setIsSprint(new URLSearchParams(window.location.search).get("offer") === "sprint");
  }, []);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <Confetti active={true} />
      <Card className="animate-scale-in">
        <CardContent className="py-12">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4 animate-confetti-pop" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isSprint ? "Your Sprint is ready" : "You're all set!"}
          </h1>
          <p className="text-gray-600 mb-6">
            {isSprint
              ? "The founding-family checkout is complete. Start the first focused lesson and work toward the measured endline check."
              : "Your subscription is active. Your students now have unlimited access to personalized math tutoring."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/billing/plans")}>
              View Plan
            </Button>
            <Button onClick={() => router.push(isSprint ? "/learn" : "/dashboard")}>
              {isSprint ? "Start First Lesson" : "Go to Dashboard"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
