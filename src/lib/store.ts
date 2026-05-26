// Legacy store utilities — kept for backward compatibility
// Prefer using the useAuth() hook from @/components/providers/auth-provider

"use client";

export function getStoredAuth(): { user: any; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  const stored = localStorage.getItem("mathpath_auth");
  if (!stored) return { user: null, token: null };
  try {
    return JSON.parse(stored);
  } catch {
    return { user: null, token: null };
  }
}

export function setStoredAuth(user: any, token: string | null) {
  if (typeof window === "undefined") return;
  if (user && token) {
    localStorage.setItem("mathpath_auth", JSON.stringify({ user, token }));
    document.cookie = `mathpath_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  } else {
    localStorage.removeItem("mathpath_auth");
    document.cookie = "mathpath_token=; path=/; max-age=0";
  }
}

export function getStoredStudent(): any {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("mathpath_student");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setStoredStudent(student: any) {
  if (typeof window === "undefined") return;
  if (student) {
    localStorage.setItem("mathpath_student", JSON.stringify(student));
  } else {
    localStorage.removeItem("mathpath_student");
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const { token } = getStoredAuth();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(endpoint, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
