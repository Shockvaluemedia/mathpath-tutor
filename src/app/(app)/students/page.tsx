"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { Plus, User, ChevronRight } from "lucide-react";

export default function StudentsPage() {
  const router = useRouter();
  const { apiRequest, setCurrentStudent } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await apiRequest("/api/students");
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = (student: any) => {
    setCurrentStudent({
      id: student.id,
      name: student.name,
      grade: student.grade,
      gradeBand: student.gradeBand,
    });
    router.push("/learn");
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Students</h1>
        <Button onClick={() => router.push("/onboarding")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : students.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No students yet</h2>
            <p className="text-gray-600 mb-6">Add a student to begin their math learning journey.</p>
            <Button onClick={() => router.push("/onboarding")}>Add Student</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {students.map((student) => (
            <Card
              key={student.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => selectStudent(student)}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold">
                    {student.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-500">
                      Age {student.age} • Grade {student.grade}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {student.gradeBand?.replace(/_/g, " ")}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
