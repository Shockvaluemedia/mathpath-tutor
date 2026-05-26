"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import { Zap, Trophy } from "lucide-react";

interface XPEvent {
  id: string;
  amount: number;
  reason: string;
  badge?: { name: string; icon: string };
}

interface XPContextType {
  awardXP: (amount: number, reason: string) => void;
  awardBadge: (name: string, icon: string) => void;
}

const XPContext = createContext<XPContextType | undefined>(undefined);

export function XPProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<XPEvent[]>([]);

  const awardXP = useCallback((amount: number, reason: string) => {
    const id = Math.random().toString(36).slice(2);
    setEvents((prev) => [...prev, { id, amount, reason }]);
  }, []);

  const awardBadge = useCallback((name: string, icon: string) => {
    const id = Math.random().toString(36).slice(2);
    setEvents((prev) => [...prev, { id, amount: 0, reason: "", badge: { name, icon } }]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <XPContext.Provider value={{ awardXP, awardBadge }}>
      {children}
      <div className="fixed top-20 right-4 z-[90] space-y-2 pointer-events-none">
        {events.map((event) => (
          <XPPopup key={event.id} event={event} onDone={() => removeEvent(event.id)} />
        ))}
      </div>
    </XPContext.Provider>
  );
}

function XPPopup({ event, onDone }: { event: XPEvent; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (event.badge) {
    return (
      <div className="animate-in slide-in-from-right fade-in duration-300 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 shadow-lg">
        <Trophy className="h-5 w-5 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Badge Earned!</p>
          <p className="text-xs text-amber-700">{event.badge.icon} {event.badge.name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right fade-in duration-300 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 shadow-lg">
      <Zap className="h-4 w-4 text-indigo-500" />
      <span className="text-sm font-bold text-indigo-700">+{event.amount} XP</span>
      <span className="text-xs text-indigo-500">{event.reason}</span>
    </div>
  );
}

export function useXP() {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error("useXP must be used within an XPProvider");
  }
  return context;
}
