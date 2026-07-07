"use client";

import { useState } from "react";
import { MessageSquare, Send, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { trackSprintEvent } from "@/lib/sprint-tracking";

const clarityOptions = [1, 2, 3, 4, 5];
const continueOptions = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Not yet" },
];

export function ParentFeedbackCard({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { apiRequest } = useAuth();
  const [clarityRating, setClarityRating] = useState(5);
  const [continueIntent, setContinueIntent] = useState<"yes" | "maybe" | "no">("yes");
  const [concern, setConcern] = useState("");
  const [quote, setQuote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest("/api/pilot/feedback", {
        method: "POST",
        body: JSON.stringify({
          studentId,
          clarityRating,
          continueIntent,
          concern,
          quote,
        }),
      });
      trackSprintEvent("parent_feedback_submitted", studentId);
      setSubmitted(true);
    } catch (err) {
      console.error("Pilot feedback failed:", err);
      setError("Feedback could not be saved yet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex items-center gap-3 p-6">
          <ThumbsUp className="h-5 w-5 text-emerald-700" />
          <div>
            <h2 className="font-semibold text-gray-950">Feedback captured</h2>
            <p className="text-sm text-gray-600">This is now part of the pilot evidence for {studentName}.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-emerald-700" />
          Parent Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">Was this report clear?</p>
          <div className="flex flex-wrap gap-2">
            {clarityOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant={clarityRating === option ? "default" : "outline"}
                size="sm"
                onClick={() => setClarityRating(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">Would you continue the sprint?</p>
          <div className="flex flex-wrap gap-2">
            {continueOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={continueIntent === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setContinueIntent(option.value as "yes" | "maybe" | "no")}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">What math concern brought you here?</p>
          <Textarea
            value={concern}
            onChange={(event) => setConcern(event.target.value)}
            placeholder="Example: Fractions turn into homework fights."
            rows={3}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">Optional quote for pilot evidence</p>
          <Textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            placeholder="Example: The report made the next step obvious."
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button onClick={submitFeedback} disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800">
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Saving..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
