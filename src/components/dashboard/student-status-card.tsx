"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle, Clock, AlertCircle, Send, Copy, RefreshCw,
  BookOpen, Link2, Link2Off
} from "lucide-react";

interface StudentStatusProps {
  student: {
    id: string;
    name: string;
    grade: number;
    gradeBand?: string;
  };
  diagnosticStatus: "not_started" | "link_sent" | "in_progress" | "completed";
  lastActiveAt: string | null;
  lessonsCompleted: number;
  onRefresh?: () => void;
}

export function StudentStatusCard({ student, diagnosticStatus, lastActiveAt, lessonsCompleted }: StudentStatusProps) {
  const { apiRequest } = useAuth();
  const { toast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setGenerating(true);
    try {
      const data = await apiRequest("/api/diagnostic/link", {
        method: "POST",
        body: JSON.stringify({ studentId: student.id, studentName: student.name }),
      });
      setLink(data.link);
      setAccessCode(data.accessCode);
      toast("success", "Diagnostic link generated!");
    } catch (caught) {
      toast("error", caught instanceof Error ? caught.message : "Could not generate a diagnostic link.");
    } finally {
      setGenerating(false);
    }
  };

  const revokeLink = async () => {
    setRevoking(true);
    try {
      await apiRequest("/api/diagnostic/link", {
        method: "DELETE",
        body: JSON.stringify({ studentId: student.id }),
      });
      setLink(null);
      setAccessCode(null);
      toast("success", "Learner access revoked.");
    } catch (caught) {
      toast("error", caught instanceof Error ? caught.message : "Could not revoke learner access.");
    } finally {
      setRevoking(false);
    }
  };

  const copyLink = () => {
    if (!link) return;
    try {
      // Try modern clipboard API first (requires HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(() => {
          setCopied(true);
          toast("success", "Link copied! Send it to " + student.name);
          setTimeout(() => setCopied(false), 3000);
        });
        return;
      }
    } catch {}

    // Fallback: textarea select + execCommand (works on HTTP)
    try {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, link.length);
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast("success", "Link copied! Send it to " + student.name);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Last resort: prompt user to copy manually
      window.prompt("Copy this link:", link);
    }
  };

  const copyAccessCode = async () => {
    if (!accessCode) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(accessCode);
      } else {
        window.prompt("Copy this access code:", accessCode);
      }
      toast("success", "Access code copied!");
    } catch {
      window.prompt("Copy this access code:", accessCode);
    }
  };

  const statusConfig = {
    not_started: {
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      badge: <Badge className="bg-amber-100 text-amber-700 text-xs">Needs Diagnostic</Badge>,
      message: `${student.name} hasn't taken the diagnostic yet`,
      color: "border-amber-200 bg-amber-50/30",
    },
    link_sent: {
      icon: <Send className="h-5 w-5 text-blue-500" />,
      badge: <Badge className="bg-blue-100 text-blue-700 text-xs">Link Sent</Badge>,
      message: `Waiting for ${student.name} to start the diagnostic`,
      color: "border-blue-200 bg-blue-50/30",
    },
    in_progress: {
      icon: <Clock className="h-5 w-5 text-purple-500" />,
      badge: <Badge className="bg-purple-100 text-purple-700 text-xs">In Progress</Badge>,
      message: `${student.name} started the diagnostic but hasn't finished`,
      color: "border-purple-200 bg-purple-50/30",
    },
    completed: {
      icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
      badge: <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge>,
      message: `${student.name} is learning! ${lessonsCompleted} lessons completed`,
      color: "",
    },
  };

  const config = statusConfig[link ? "link_sent" : diagnosticStatus];

  return (
    <Card className={`transition-all ${config.color}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold text-lg">
              {student.name[0]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{student.name}</h3>
              <p className="text-xs text-gray-500">Grade {student.grade}</p>
            </div>
          </div>
          {config.badge}
        </div>

        {/* Status message */}
        <div className="flex items-center gap-2 mb-4">
          {config.icon}
          <p className="text-sm text-gray-700">{config.message}</p>
        </div>

        {/* Actions based on status */}
        {(diagnosticStatus === "not_started" || diagnosticStatus === "link_sent") && !link && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Send {student.name} a link so they can take the diagnostic on their own device:
            </p>
            <Button onClick={generateLink} disabled={generating} className="w-full" size="sm">
              <Link2 className="h-4 w-4 mr-2" />
              {generating ? "Generating..." : "Generate Diagnostic Link"}
            </Button>
          </div>
        )}

        {/* Link generated — show copy/share options */}
        {link && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex gap-2">
              <input
                type="text"
                value={link}
                readOnly
                className="flex-1 px-3 py-2 text-xs border rounded-lg bg-white text-gray-700 truncate"
              />
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {accessCode && (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2">
                <div>
                  <p className="text-xs text-gray-500">Student access code</p>
                  <p className="font-mono font-semibold tracking-wider text-gray-900">{accessCode}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={copyAccessCode}
                  aria-label="Copy student access code"
                  title="Copy student access code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="col-span-2 text-xs"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share && window.isSecureContext) {
                    navigator.share({ title: `${student.name}'s Math Diagnostic`, url: link! }).catch(() => copyLink());
                  } else {
                    copyLink();
                  }
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Share / Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={generateLink}
                disabled={generating || revoking}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {generating ? "Replacing..." : "New Link"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={revokeLink}
                disabled={revoking || generating}
              >
                <Link2Off className="h-3 w-3 mr-1" />
                {revoking ? "Revoking..." : "Revoke"}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              This credential expires in 7 days. A new link immediately replaces the old one.
            </p>
          </div>
        )}

        {/* In progress — encourage */}
        {diagnosticStatus === "in_progress" && !link && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Encourage {student.name} to finish — it only takes a few more minutes.
            </p>
            <Button size="sm" variant="outline" onClick={generateLink} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Reminder Link
            </Button>
          </div>
        )}

        {/* Completed — show quick stats */}
        {diagnosticStatus === "completed" && (
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {lessonsCompleted} lessons
            </span>
            {lastActiveAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last active: {formatRelative(lastActiveAt)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
