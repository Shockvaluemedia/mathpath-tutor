"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LineChart,
  MessageCircle,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trackSprintEvent } from "@/lib/sprint-tracking";

const sprintSteps = [
  {
    title: "15-minute diagnostic",
    detail: "Find the skill gaps and confidence blockers before assigning practice.",
    icon: ClipboardList,
  },
  {
    title: "10 focused sessions",
    detail: "Short lessons and tutor check-ins target the first recovery skill.",
    icon: CalendarDays,
  },
  {
    title: "Parent proof report",
    detail: "Show before, after, next focus, and measurable confidence movement.",
    icon: BarChart3,
  },
];

const pilotMetrics = [
  { label: "Target learner", value: "Grades 4-8" },
  { label: "Sprint length", value: "2 weeks" },
  { label: "Session goal", value: "10" },
  { label: "Proof moment", value: "Day 14" },
];

export default function SprintLandingPage() {
  useEffect(() => {
    trackSprintEvent("sprint_landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold">MathPath</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Start Sprint</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-14">
            <div className="flex flex-col justify-center">
              <Badge className="mb-5 w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">
                Pilot MVP for math recovery
              </Badge>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-gray-950 sm:text-5xl">
                Math Recovery Sprint
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                In 15 minutes, find the math gaps. In 2 weeks, show parents measurable progress in skills, confidence, and learning consistency.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
                    Start Diagnostic
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/sprint/report">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    View Sample Report
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-stone-50 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Sprint proof preview</p>
                  <h2 className="text-xl font-semibold text-gray-950">Alex, Grade 5</h2>
                </div>
                <Badge variant="outline">Day 8 of 14</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pilotMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-md border bg-white p-4">
                    <p className="text-xs font-medium uppercase text-gray-500">{metric.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-950">{metric.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-md border bg-white p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Fractions recovery</span>
                  <span className="text-emerald-700">28% to 46%</span>
                </div>
                <Progress value={46} className="h-2" />
                <p className="mt-3 text-sm text-gray-600">
                  First proof point: visual fraction models are moving before speed drills are added.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {sprintSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border bg-white p-6">
                  <Icon className="h-6 w-6 text-emerald-700" />
                  <h2 className="mt-4 text-lg font-semibold text-gray-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-y bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <Badge variant="outline" className="mb-4">What the pilot measures</Badge>
              <h2 className="text-2xl font-semibold text-gray-950">One loop, five activation signals</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                The sprint is designed to prove that a family can move from concern to diagnosis to practice to visible progress without waiting for a full school term.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Diagnostic completed", ClipboardList],
                ["First lesson started", Target],
                ["Three sessions completed", CheckCircle2],
                ["Tutor used for stuck moments", MessageCircle],
                ["Parent report generated", LineChart],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-md border bg-stone-50 p-4">
                  <Icon className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-medium text-gray-800">{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-gray-950">Ready for a controlled family pilot?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Start with one learner, one diagnostic, one recovery focus, and a report that makes the next decision obvious.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button className="w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
                Start Sprint
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full sm:w-auto">
                Back to MathPath
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
