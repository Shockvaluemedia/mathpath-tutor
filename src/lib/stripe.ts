import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    interval: null,
    features: [
      "1 student",
      "Diagnostic assessment",
      "3 lessons per week",
      "Basic skill profile",
    ],
    limits: {
      students: 1,
      lessonsPerWeek: 3,
      tutorMessages: 10,
      weeklyReports: false,
    },
  },
  GROWTH: {
    id: "growth",
    name: "Growth",
    priceMonthly: 1499, // $14.99
    priceYearly: 11988, // $119.88 ($9.99/mo)
    stripePriceMonthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY || "price_growth_monthly",
    stripePriceYearly: process.env.STRIPE_PRICE_GROWTH_YEARLY || "price_growth_yearly",
    features: [
      "Up to 3 students",
      "Unlimited lessons",
      "Unlimited tutor chat",
      "Weekly parent reports",
      "Spaced repetition reviews",
      "Full achievement system",
    ],
    limits: {
      students: 3,
      lessonsPerWeek: Infinity,
      tutorMessages: Infinity,
      weeklyReports: true,
    },
  },
  FAMILY: {
    id: "family",
    name: "Family",
    priceMonthly: 2499, // $24.99
    priceYearly: 19988, // $199.88 ($16.66/mo)
    stripePriceMonthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY || "price_family_monthly",
    stripePriceYearly: process.env.STRIPE_PRICE_FAMILY_YEARLY || "price_family_yearly",
    features: [
      "Unlimited students",
      "Everything in Growth",
      "Priority AI tutor",
      "PDF report exports",
      "Email notifications",
      "Early access to new features",
    ],
    limits: {
      students: Infinity,
      lessonsPerWeek: Infinity,
      tutorMessages: Infinity,
      weeklyReports: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(planId: string) {
  const plan = PLANS[planId.toUpperCase() as PlanId];
  return plan?.limits || PLANS.FREE.limits;
}
