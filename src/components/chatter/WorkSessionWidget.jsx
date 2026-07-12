import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function WorkSessionWidget({ email, compact }) {
  const qc = useQueryClient();
  const [sessionTime, setSessionTime] = useState("00:00");
  const intervalRef = useRef(null);

  const today = new Date().toISOString().split("T")[0];

  // Load today's active session from DB
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["work-sessions-today", email, today],
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: email,
      date: today,
    }),
    enabled: !!email,
    staleTime: 10000,
  });

  const activeSession = sessions.find(s => s.is_active);
  const isWorking = !!activeSession;

  // Timer
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (activeSession?.started_at) {
      const tick = () => {
        const elapsed = Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const mins = Math.floor((elapsed % 3600) / 60);
        const secs = elapsed % 60;
        setSessionTime(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setSessionTime("00:00");
    }
    return () => clearInterval(intervalRef.current);
  }, [activeSession?.id, activeSession?.started_at]);

  const handleStart = async () => {
    await base44.entities.DesignerWorkSession.create({
      designer_email: email,
      dashboard_id: "chatter",
      date: today,
      started_at: new Date().toISOString(),
      is_active: true,
      minutes_worked: 0,
    });
    qc.invalidateQueries({ queryKey: ["work-sessions-today", email, today] });
  };

  const handleStop = async () => {
    if (!activeSession) return;
    const startedAt = new Date(activeSession.started_at);
    const totalMs = Date.now() - startedAt.getTime();
    const minutes = Math.floor(totalMs / 60000);
    // Round down to 15-min blocks
    const minutes15 = Math.floor(minutes / 15) * 15;

    await base44.entities.DesignerWorkSession.update(activeSession.id, {
      is_active: false,
      ended_at: new Date().toISOString(),
      minutes_worked: minutes15,
    });
    qc.invalidateQueries({ queryKey: ["work-sessions-today", email, today] });
  };

  const toggle = isWorking ? handleStop : handleStart;

  if (isLoading) return <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[#C9A227] animate-spin" />;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-base font-bold text-slate-100">{isWorking ? sessionTime : "00:00"}</p>
        <Button
          onClick={toggle}
          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all p-0 ${
            isWorking
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white"
          }`}
        >
          {isWorking ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Working?</p>
        <p className="text-xl font-bold text-slate-100 tabular-nums">{isWorking ? sessionTime : "00:00"}</p>
      </div>
      <Button
        onClick={toggle}
        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
          isWorking
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white"
        }`}
      >
        {isWorking ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
    </div>
  );
}