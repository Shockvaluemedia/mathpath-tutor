"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { StudentSwitcher } from "@/components/layout/student-switcher";
import { XPBar } from "@/components/layout/xp-bar";
import { BookOpen, LayoutDashboard, MessageCircle, LogOut, Menu, X, Users, Brain, History, Trophy, RotateCcw, CreditCard, BarChart3, Compass, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = user.role === "PARENT"
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/students", label: "Students", icon: Users },
        { href: "/org", label: "Organization", icon: Building2 },
        { href: "/billing/plans", label: "Plans", icon: CreditCard },
      ]
    : user.role === "ADMIN"
    ? [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/skills", label: "Skills", icon: Brain },
        { href: "/admin/students", label: "Students", icon: Users },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      ]
    : [
        { href: "/domains", label: "Domains", icon: Compass },
        { href: "/learn", label: "Learn", icon: BookOpen },
        { href: "/review", label: "Review", icon: RotateCcw },
        { href: "/tutor", label: "Tutor", icon: MessageCircle },
        { href: "/achievements", label: "Achievements", icon: Trophy },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={user.role === "PARENT" ? "/dashboard" : "/learn"} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">MathPath</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <XPBar />
            <StudentSwitcher />
            <span className="text-sm text-gray-500">Hi, {user.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
