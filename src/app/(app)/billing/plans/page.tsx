"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BarChart3, Check, FileText, MessageCircle, ShieldCheck, Sparkles, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

type BillingInterval = "monthly" | "yearly";

interface PricingPlan {
  id: "FREE" | "PILOT" | "GROWTH" | "FAMILY";
  billingId?: "FREE" | "GROWTH" | "FAMILY";
  name: string;
  eyebrow: string;
  description: string;
  priceMonthly: number;
  priceYearly?: number;
  priceNote: string;
  features: string[];
  cta: string;
  popular?: boolean;
  href?: string;
}

const PLANS: PricingPlan[] = [
  {
    id: "FREE",
    billingId: "FREE",
    name: "Starter Diagnostic",
    eyebrow: "Always free",
    description: "Find the first math gap and see whether MathPath is the right fit.",
    priceMonthly: 0,
    priceNote: "No card required",
    features: [
      "1 student profile",
      "Diagnostic assessment",
      "Basic skill profile",
      "3 lessons per week",
    ],
    cta: "Current Plan",
  },
  {
    id: "PILOT",
    name: "Math Recovery Sprint",
    eyebrow: "Best first step",
    description: "Run the 2-week proof loop before choosing a subscription.",
    priceMonthly: 0,
    priceNote: "Open during pilot",
    features: [
      "10-session sprint plan",
      "Before/after skill proof",
      "Parent clarity feedback",
      "CSV evidence for follow-up",
    ],
    cta: "Start Sprint",
    href: "/sprint",
    popular: true,
  },
  {
    id: "GROWTH",
    billingId: "GROWTH",
    name: "Growth",
    eyebrow: "Ongoing support",
    description: "Daily learning and tutor support for one household rhythm.",
    priceMonthly: 14.99,
    priceYearly: 9.99,
    priceNote: "per month",
    features: [
      "Up to 3 students",
      "Unlimited lessons",
      "Unlimited tutor chat",
      "Weekly parent reports",
      "Spaced repetition reviews",
      "Achievement tracking",
    ],
    cta: "Upgrade to Growth",
  },
  {
    id: "FAMILY",
    billingId: "FAMILY",
    name: "Family",
    eyebrow: "More learners",
    description: "For families who need broader coverage and reporting.",
    priceMonthly: 24.99,
    priceYearly: 16.66,
    priceNote: "per month",
    features: [
      "Unlimited students",
      "Everything in Growth",
      "Priority AI tutor",
      "PDF report exports",
      "Email notifications",
      "Early access to new features",
    ],
    cta: "Upgrade to Family",
  },
];

const proofMetrics = [
  { label: "Diagnostic", value: "15 min", icon: Target },
  { label: "Sprint", value: "2 weeks", icon: BarChart3 },
  { label: "Sessions", value: "10", icon: MessageCircle },
  { label: "Report", value: "Proof", icon: FileText },
];

export default function PlansPage() {
  const { user, apiRequest } = useAuth();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const currentPlanId = (user?.planId || "free").toUpperCase();

  const handleUpgrade = async (planId: "GROWTH" | "FAMILY") => {
    setLoading(planId);
    setCheckoutError(null);

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
        return;
      }

      setCheckoutError("Checkout did not return a payment link. Please try again.");
    } catch (err) {
      console.error("Checkout error:", err);
      setCheckoutError("Checkout is not available right now. The Sprint and free diagnostic are still available.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div>
          <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Proof first pricing
          </Badge>
          <h1 className="text-3xl font-bold text-gray-950 sm:text-4xl">
            Start with the math gap, then choose the support level.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            MathPath now starts with a clear recovery sprint: diagnose the gap, complete focused sessions, and review a parent-ready proof report before committing to ongoing support.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="font-semibold text-gray-950">Pilot path</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {proofMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-md border bg-gray-50 p-3">
                  <Icon className="mb-2 h-4 w-4 text-emerald-700" />
                  <p className="text-lg font-semibold text-gray-950">{metric.value}</p>
                  <p className="text-xs text-gray-500">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Choose a path</h2>
          <p className="text-sm text-gray-500">Use the sprint for proof, then upgrade when ongoing support is the right next step.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              interval === "monthly" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              interval === "yearly" ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Yearly
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              Save 33%
            </span>
          </button>
        </div>
      </div>

      {checkoutError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {checkoutError}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = Boolean(plan.billingId && currentPlanId === plan.billingId);
          const price = interval === "yearly" && plan.priceYearly != null ? plan.priceYearly : plan.priceMonthly;
          const yearlyTotal = plan.priceYearly != null ? plan.priceYearly * 12 : null;

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "border-emerald-300 ring-1 ring-emerald-200" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Recommended
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-6">
                <p className="text-xs font-semibold uppercase text-gray-500">{plan.eyebrow}</p>
                <CardTitle className="text-xl text-gray-950">{plan.name}</CardTitle>
                <p className="min-h-12 text-sm leading-6 text-gray-600">{plan.description}</p>
                <div className="pt-2">
                  <span className="text-4xl font-bold text-gray-950">
                    ${price === 0 ? "0" : price.toFixed(2)}
                  </span>
                  <span className="ml-1 text-sm text-gray-500">{plan.priceNote}</span>
                </div>
                {interval === "yearly" && yearlyTotal != null && (
                  <p className="text-xs text-emerald-700">
                    Billed annually at ${yearlyTotal.toFixed(0)}/year
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <PlanAction
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  loading={loading === plan.id}
                  onUpgrade={handleUpgrade}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <InfoPanel
          icon={<Target className="h-5 w-5 text-emerald-700" />}
          title="Start with proof"
          body="The Sprint is the fastest way to learn whether MathPath can make the student's next step obvious."
        />
        <InfoPanel
          icon={<Users className="h-5 w-5 text-sky-600" />}
          title="Upgrade when usage is real"
          body="Growth and Family are for ongoing lessons, tutor chat, reporting, and more learner coverage."
        />
        <InfoPanel
          icon={<FileText className="h-5 w-5 text-amber-600" />}
          title="Keep the evidence"
          body="Sprint reports and feedback stay useful for parent follow-up even before a subscription starts."
        />
      </div>
    </div>
  );
}

function PlanAction({
  plan,
  isCurrentPlan,
  loading,
  onUpgrade,
}: {
  plan: PricingPlan;
  isCurrentPlan: boolean;
  loading: boolean;
  onUpgrade: (planId: "GROWTH" | "FAMILY") => void;
}) {
  if (plan.href) {
    return (
      <Link href={plan.href}>
        <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
          {plan.cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    );
  }

  if (isCurrentPlan) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Current Plan
      </Button>
    );
  }

  if (plan.id === "FREE") {
    return (
      <Link href="/dashboard">
        <Button className="w-full" variant="outline">
          Use Free Plan
        </Button>
      </Link>
    );
  }

  const paidPlanId = plan.id === "GROWTH" || plan.id === "FAMILY" ? plan.id : null;

  if (!paidPlanId) {
    return null;
  }

  return (
    <Button
      className={paidPlanId === "GROWTH" ? "w-full bg-indigo-600 hover:bg-indigo-700" : "w-full"}
      disabled={loading}
      onClick={() => onUpgrade(paidPlanId)}
    >
      {loading ? "Opening checkout..." : plan.cta}
    </Button>
  );
}

function InfoPanel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-gray-950">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-gray-600">{body}</p>
    </div>
  );
}
