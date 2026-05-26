"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/providers/auth-provider";
import { Send, Bot, User, Sparkles, AlertTriangle } from "lucide-react";

interface Message {
  role: "student" | "tutor" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    frustrationDetected?: boolean;
    encouragement?: boolean;
    hintGiven?: boolean;
  };
}

export default function TutorPage() {
  const { currentStudent, apiRequest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "tutor",
        content: `Hi ${currentStudent?.name || "there"}! 👋 I'm your math tutor. I'm here to help you learn and grow — not just give you answers, but help you really understand math.\n\nWhat would you like to work on today? You can:\n• Ask me about something from your lesson\n• Tell me about a problem you're stuck on\n• Ask me to explain a concept\n• Just say "I need help" and we'll figure it out together!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [currentStudent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "student",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiRequest("/api/tutor/chat", {
        method: "POST",
        body: JSON.stringify({
          studentId: currentStudent?.id,
          sessionId,
          message: userMessage.content,
        }),
      });

      if (data.sessionId) setSessionId(data.sessionId);

      const tutorMessage: Message = {
        role: "tutor",
        content: data.response,
        timestamp: new Date().toISOString(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, tutorMessage]);
    } catch {
      const fallback: Message = {
        role: "tutor",
        content: "I'd love to help you with that! Can you tell me more about what part is confusing? Sometimes breaking a problem into smaller steps makes it much clearer. 🤔",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 h-[calc(100dvh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm sm:text-base">Math Tutor</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Here to guide, not just answer</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {currentStudent?.gradeBand?.replace(/_/g, " ") || "Adaptive"}
        </Badge>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 shrink-0">
                  <Bot className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3 sm:p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask me anything about math..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none text-sm sm:text-base"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              size="icon"
              className="shrink-0 h-11 w-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
            I&apos;ll guide you step by step — no judgment, just learning!
          </p>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isStudent = message.role === "student";

  return (
    <div className={`flex items-start gap-3 ${isStudent ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
          isStudent ? "bg-emerald-100" : "bg-indigo-100"
        }`}
      >
        {isStudent ? (
          <User className="h-4 w-4 text-emerald-600" />
        ) : (
          <Bot className="h-4 w-4 text-indigo-600" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isStudent
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.metadata?.frustrationDetected && (
          <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
            <AlertTriangle className="h-3 w-3" />
            <span>Taking it slow</span>
          </div>
        )}
        {message.metadata?.encouragement && (
          <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
            <Sparkles className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
