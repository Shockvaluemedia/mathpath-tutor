"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "Get started with the basics",
    features: [
      "1 student",
      "Diagnostic assessment",
      "3 lessons per week",
      "Basic skill profile",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "GROWTH",
    name: "Growth",
    priceMonthly: 14.99,
    priceYearly: 9.99,
    description: "Unlimited learning for growing minds",
    features: [
      "Up to 3 students",
      "Unlimited lessons",
      "Unlimited tutor chat",
      "Weekly parent reports",
      "Spaced repetition reviews",
      "Full achievement system",
    ],
    cta: "Upgrade",
    popular: true,
  },
  {
    id: "FAMILY",
    name: "Family",
    priceMonthly: 24.99,
    priceYearly: 16.66,
    description: "Everything for the whole family",
    features: [
      "Unlimited students",
      "Everything in Growth",
      "Priority AI tutor",
      "PDF report exports",
      "Email notifications",
      "Early access to new features",
    ],
    cta: "Upgrade",
    popular: false,
  },
];

export default function PlansPage() {
  const { user, apiRequest } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const data = await apiRequest("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          planId,
          interval,
          userId: user?.id,
          email: user?.email,
        }),
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
        <p className="text-gray-600">Invest in your child&apos;s math confidence</p>

        {/* Interval toggle */}
        <div className="mt-6 inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === "yearly" ? "bg-white shadow text-gray-900" : "text-gray-500"
            }`}
          >
            Yearly
            <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-[10px]">Save 33%</Badge>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const isCurrentPlan = plan.id === "FREE"; // Simplified — check actual subscription

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "border-indigo-300 shadow-lg ring-1 ring-indigo-200" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 text-white">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-gray-500">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${price === 0 ? "0" : price.toFixed(2)}
                  </span>
                  {price > 0 && (
                    <span className="text-gray-500 text-sm">/month</span>
                  )}
                </div>
                {interval === "yearly" && price > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Billed annually (${(price * 12).toFixed(0)}/year)
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan || loading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loading === plan.id ? "Loading..." : isCurrentPlan ? "Current Plan" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">Common Questions</h2>
        <div className="space-y-4">
          <FaqItem
            q="Can I cancel anytime?"
            a="Yes! Cancel anytime from your account settings. You'll keep access until the end of your billing period."
          />
          <FaqItem
            q="What happens to my data if I downgrade?"
            a="Your data is never deleted. If you downgrade, you'll keep your progress but some features will be limited."
          />
          <FaqItem
            q="Is there a free trial?"
            a="The Free plan is always free! You can try the core features before upgrading. The diagnostic assessment is free for everyone."
          />
          <FaqItem
            q="Can I switch plans?"
            a="Yes, upgrade or downgrade anytime. Changes take effect immediately and billing is prorated."
          />
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="font-medium text-gray-900 text-sm">{q}</p>
      <p className="text-sm text-gray-600 mt-1">{a}</p>
    </div>
  );
}
