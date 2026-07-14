"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  planId?: string;
}

interface Student {
  id: string;
  name: string;
  grade: number;
  gradeBand: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentStudent: Student | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginStudent: (code: string, studentName?: string) => Promise<Student>;
  logout: () => void;
  setCurrentStudent: (student: Student | null) => void;
  apiRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEFAULT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const LEARNER_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentStudent, setCurrentStudentState] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem("mathpath_auth");
      if (storedAuth) {
        const { user: storedUser, token: storedToken } = JSON.parse(storedAuth);
        setUser(storedUser);
        setToken(storedToken);
      }

      const storedStudent = localStorage.getItem("mathpath_student");
      if (storedStudent) {
        setCurrentStudentState(JSON.parse(storedStudent));
      }
    } catch {
      // Clear corrupted data
      localStorage.removeItem("mathpath_auth");
      localStorage.removeItem("mathpath_student");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist auth state
  const persistAuth = useCallback((
    newUser: User | null,
    newToken: string | null,
    maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS
  ) => {
    setUser(newUser);
    setToken(newToken);
    if (newUser && newToken) {
      localStorage.setItem("mathpath_auth", JSON.stringify({ user: newUser, token: newToken }));
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `mathpath_token=${newToken}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
      document.cookie = `mathpath_role=${newUser.role}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
    } else {
      localStorage.removeItem("mathpath_auth");
      document.cookie = "mathpath_token=; path=/; max-age=0";
      document.cookie = "mathpath_role=; path=/; max-age=0";
    }
  }, []);

  const setCurrentStudent = useCallback((student: Student | null) => {
    setCurrentStudentState(student);
    if (student) {
      localStorage.setItem("mathpath_student", JSON.stringify(student));
    } else {
      localStorage.removeItem("mathpath_student");
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    persistAuth(data.user, data.token);
  }, [persistAuth]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Signup failed");
    }

    persistAuth(data.user, data.token);
  }, [persistAuth]);

  const loginStudent = useCallback(async (code: string, studentName?: string) => {
    const response = await fetch("/api/auth/student-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, studentName }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Student login failed");
    }

    persistAuth(data.user, data.token, LEARNER_SESSION_MAX_AGE_SECONDS);
    setCurrentStudent(data.student);
    return data.student;
  }, [persistAuth, setCurrentStudent]);

  const logout = useCallback(() => {
    persistAuth(null, null);
    setCurrentStudent(null);
    router.push("/");
  }, [persistAuth, setCurrentStudent, router]);

  const apiRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, { ...options, headers });
    const data = await response.json();

    if (response.status === 401) {
      const loginPath = user?.role === "LEARNER" ? "/student-login" : "/login";
      persistAuth(null, null);
      router.push(loginPath);
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }, [token, user, persistAuth, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentStudent,
        isLoading,
        login,
        signup,
        loginStudent,
        logout,
        setCurrentStudent,
        apiRequest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
