"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudentOption {
  id: string;
  name: string;
  grade: number;
  gradeBand: string;
}

export function StudentSwitcher() {
  const { currentStudent, setCurrentStudent, apiRequest, user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) loadStudents();
  }, [user]);

  const loadStudents = async () => {
    try {
      const data = await apiRequest("/api/students");
      setStudents(
        (data.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          gradeBand: s.gradeBand,
        }))
      );
    } catch {
      // Ignore
    }
  };

  const handleSelect = (student: StudentOption) => {
    setCurrentStudent(student);
    setOpen(false);
  };

  if (!currentStudent && students.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        aria-label="Switch student"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
          {currentStudent?.name?.[0] || "?"}
        </div>
        <span className="hidden sm:inline text-gray-700 font-medium max-w-[100px] truncate">
          {currentStudent?.name || "Select student"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-white shadow-lg py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Students
            </div>
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelect(student)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                  {student.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">Grade {student.grade}</p>
                </div>
                {currentStudent?.id === student.id && (
                  <Check className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            ))}
            <div className="border-t mt-1 pt-1">
              <button
                onClick={() => { setOpen(false); router.push("/onboarding"); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Add student
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
