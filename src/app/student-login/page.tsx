"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { GraduationCap } from "lucide-react";

export default function StudentLoginPage() {
  const router = useRouter();
  const { setCurrentStudent } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, studentName: name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // Store auth
      localStorage.setItem("mathpath_auth", JSON.stringify({ user: data.user, token: data.token }));
      document.cookie = `mathpath_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // Set current student
      setCurrentStudent(data.student);

      // Students go straight to learn
      router.push("/learn");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <CardDescription>Enter your name and access code to start learning</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your First Name</Label>
              <Input
                id="name"
                placeholder="e.g., Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                placeholder="Enter your code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="text-lg tracking-wider text-center font-mono"
              />
              <p className="text-xs text-gray-500">Ask your parent for your access code</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? "Logging in..." : "Start Learning! 🚀"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-gray-500 mb-2">Are you a parent?</p>
            <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              Parent login →
            </Link>
          </div>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center">
              <span className="font-medium">Demo:</span> Enter any name (Alex or Maya) with any code
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
