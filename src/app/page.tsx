import Link from "next/link";
import { BookOpen, Brain, TrendingUp, BarChart3, Target, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">MathPath Tutor</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/student-login">
              <Button variant="ghost" size="sm">Student</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
          Personalized math growth<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            from grade school to high school
          </span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          MathPath Tutor diagnoses your child&apos;s exact math level, identifies skill gaps,
          and creates a personalized daily learning path that builds mastery and confidence.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto text-base px-8">
              Start Diagnostic
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
              How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How MathPath Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Target className="h-6 w-6 text-indigo-600" />}
            title="Diagnose Skill Gaps"
            description="Our adaptive assessment pinpoints exactly where your child is — not just what grade they're in, but what specific skills need attention."
          />
          <FeatureCard
            icon={<Heart className="h-6 w-6 text-rose-500" />}
            title="Build Confidence"
            description="We start where your child can succeed and build up. No shame, no pressure — just steady growth and genuine encouragement."
          />
          <FeatureCard
            icon={<BookOpen className="h-6 w-6 text-emerald-600" />}
            title="Daily Adaptive Lessons"
            description="Each day brings a personalized lesson that meets your child exactly where they are, with the right level of challenge."
          />
          <FeatureCard
            icon={<Brain className="h-6 w-6 text-purple-600" />}
            title="AI Tutor That Teaches"
            description="Our tutor doesn't just give answers — it asks guiding questions, explains the 'why', and adapts to your child's learning style."
          />
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6 text-amber-600" />}
            title="Track Real Progress"
            description="See mastery grow over time. Not just grades — actual skill development, confidence trends, and learning milestones."
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-sky-600" />}
            title="Parent Dashboard"
            description="Weekly reports in plain language. Know exactly what your child is learning, where they're growing, and what comes next."
          />
        </div>
      </section>

      {/* Grade Bands */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Designed for Every Stage
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Teaching math to a 6-year-old is nothing like teaching a 16-year-old. MathPath adapts everything — language, examples, pacing, and encouragement — to your child&apos;s developmental stage.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GradeBandCard
              band="K–2"
              title="Early Elementary"
              description="Visual, encouraging, short lessons. Number sense, counting, patterns."
              color="from-pink-400 to-rose-500"
            />
            <GradeBandCard
              band="3–5"
              title="Elementary"
              description="Guided reasoning. Multiplication, fractions, word problems."
              color="from-amber-400 to-orange-500"
            />
            <GradeBandCard
              band="6–8"
              title="Middle School"
              description="Confidence recovery. Pre-algebra, ratios, equations."
              color="from-emerald-400 to-teal-500"
            />
            <GradeBandCard
              band="9–12"
              title="High School"
              description="Strategic and efficient. Algebra, geometry, SAT prep."
              color="from-indigo-400 to-purple-500"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to find your child&apos;s math path?
        </h2>
        <p className="text-gray-600 mb-8 max-w-lg mx-auto">
          Start with a free diagnostic assessment. In 15 minutes, you&apos;ll know exactly where your child stands and what to do next.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-base px-8">
            Start Free Diagnostic
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          © 2025 MathPath Tutor. Personalized math growth for every student.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function GradeBandCard({ band, title, description, color }: { band: string; title: string; description: string; color: string }) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-2 bg-gradient-to-r ${color}`} />
      <CardContent className="p-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Grades {band}</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}
