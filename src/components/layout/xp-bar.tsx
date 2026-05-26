"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Zap } from "lucide-react";
import Link from "next/link";

export function XPBar() {
  const { currentStudent, apiRequest, user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [levelName, setLevelName] = useState("");

  useEffect(() => {
    if (currentStudent && user?.role === "PARENT") return; // Don't show for parents
    if (currentStudent) loadXP();
  }, [currentStudent]);

  const loadXP = async () => {
    try {
      const data = await apiRequest(`/api/students/${currentStudent?.id}/gamification`);
      setXp(data.xp);
      setLevel(data.level);
      setProgress(data.xpProgress);
      setLevelName(data.levelName);
    } catch {
      // Ignore
    }
  };

  if (!currentStudent || user?.role === "PARENT") return null;

  return (
    <Link href="/achievements" className="flex items-center gap-2 group">
      <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 group-hover:bg-indigo-100 transition-colors">
        <Zap className="h-3.5 w-3.5 text-indigo-500" />
        <span className="text-xs font-bold text-indigo-700">{xp}</span>
        <div className="hidden sm:flex items-center gap-1">
          <div className="w-12 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-indigo-500">Lv{level}</span>
        </div>
      </div>
    </Link>
  );
}
