import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import confetti from "canvas-confetti";
import { usePayments } from "@/hooks/usePayments";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function MonthlyGoalBar() {
  const { currency } = useWorkspace();
  const { data: payments = [] } = usePayments();

  const { data: goals = [] } = useQuery({
    queryKey: ["goalSettings"],
    queryFn: () => base44.entities.GoalSettings.list()
  });

  const goalSettings = goals[0];
  const goal = goalSettings?.monthly_goal || 100000;
  const periodStart = goalSettings?.goal_start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const periodEnd = goalSettings?.goal_end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

  const monthRev = payments
    .filter((p) => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return d >= periodStart && d <= periodEnd;
    })
    .reduce((s, p) => s + (p.amount || 0), 0);

  const pct = Math.min(100, Math.round((monthRev / goal) * 100));
  const reached = monthRev >= goal;

  const celebratedRef = useRef(false);
  useEffect(() => {
    if (reached && !celebratedRef.current && goals.length > 0) {
      celebratedRef.current = true;
      const duration = 4000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: ["#C9A227", "#fff", "#A8841C", "#f5d56e"] });
        confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: ["#C9A227", "#fff", "#A8841C", "#f5d56e"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.4);
          osc.start(ctx.currentTime + i * 0.18);
          osc.stop(ctx.currentTime + i * 0.18 + 0.5);
        });
      } catch (_) {}
    }
  }, [reached, goals.length]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(periodEnd);
  endDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) + 1);
  const remaining = Math.max(0, goal - monthRev);
  const dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;
  const todayStr = today.toISOString().split("T")[0];
  const todayRev = payments
    .filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === todayStr)
    .reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="w-full bg-[#1a1a1a] border border-white/8 rounded-2xl px-6 py-4 mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Monthly Goal</span>
          {reached && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
              🎉 Reached!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-lg font-bold text-white">{monthRev.toLocaleString("cs-CZ")} {currency}</span>
            <span className="text-sm text-slate-500 ml-1">/ {goal.toLocaleString("cs-CZ")} {currency}</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-[#C9A227]/40 bg-[#C9A227]/10">
            <span className="text-xs font-bold text-[#C9A227]">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: reached
              ? "linear-gradient(90deg, #34d399, #10b981)"
              : "linear-gradient(90deg, #C9A227, #f5d56e)"
          }}
        />
      </div>

      {/* Bottom stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining days</span>
          <span className="text-xs font-semibold text-slate-200">{daysLeft}</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        {!reached ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Daily needed</span>
            <span className="text-xs font-semibold text-slate-200">{todayRev.toLocaleString("cs-CZ")} {currency}</span>
            <span className="text-xs text-slate-500">/</span>
            <span className="text-xs font-semibold text-[#C9A227]">{dailyNeeded.toLocaleString("cs-CZ")} {currency}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Above goal</span>
            <span className="text-xs font-semibold text-emerald-400">+{(monthRev - goal).toLocaleString("cs-CZ")} {currency}</span>
          </div>
        )}
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</span>
          <span className="text-xs font-semibold text-slate-200">{remaining.toLocaleString("cs-CZ")} {currency}</span>
        </div>
      </div>
    </div>
  );
}