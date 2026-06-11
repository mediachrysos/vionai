import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import confetti from "canvas-confetti";
import { usePayments } from "@/hooks/usePayments";


export default function MonthlyGoalBar() {
  const { data: payments = [] } = usePayments();

  const { data: goals = [] } = useQuery({
    queryKey: ["goalSettings"],
    queryFn: () => base44.entities.GoalSettings.list()
  });

  const goalSettings = goals[0];
  const goal = goalSettings?.monthly_goal || 100000;
  const periodStart = goalSettings?.goal_start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const periodEnd = goalSettings?.goal_end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

  const monthRev = payments.
  filter((p) => {
    const d = p.payment_date || p.created_date?.split("T")[0];
    return d >= periodStart && d <= periodEnd;
  }).
  reduce((s, p) => s + (p.amount || 0), 0);

  const pct = Math.min(100, Math.round(monthRev / goal * 100));
  const reached = monthRev >= goal;

  // Konfety + zvuk při splnění cíle
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (reached && !celebratedRef.current && goals.length > 0) {
      celebratedRef.current = true;
      // Konfety přes celou stránku
      const duration = 4000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: ["#C9A227", "#fff", "#A8841C", "#f5d56e"] });
        confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: ["#C9A227", "#fff", "#A8841C", "#f5d56e"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
      // Zvuk výhry
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

  // Zbývající dny a denní požadavek
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)) + 1);
  const remaining = Math.max(0, goal - monthRev);
  const dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0;

  return (
    <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] rounded-xl px-5 py-3 mb-6 shadow-sm shadow-amber-900/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-xl w-9 h-9 flex items-center justify-center">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266696/Chrysos_icon_7_ubsz30.png" alt="" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Měsíční cíl</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80">
            <span className="font-bold text-white">{monthRev.toLocaleString()} Kč</span>
            {" / "}
            {goal.toLocaleString()} Kč
          </span>
          {reached && <span className="text-xs font-bold text-white bg-white/25 px-2.5 py-0.5 rounded-full">🎉 Cíl splněn!</span>}
          <span className="text-xs font-bold text-white bg-white/25 px-2.5 py-0.5 rounded-full">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-white/25 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-700"
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
          <span className="text-sm">⏳</span>
          <span className="text-xs text-white/70">Zbývá</span>
          <span className="text-xs font-bold text-white">{daysLeft} dní</span>
        </div>
        {!reached && (
          <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
            <span className="text-sm">⚡</span>
            <span className="text-xs text-white/70">Denně</span>
            <span className="text-xs font-bold text-white">{dailyNeeded.toLocaleString()} Kč</span>
          </div>
        )}
        {reached && (
          <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1">
            <span className="text-sm">🚀</span>
            <span className="text-xs font-bold text-white">Jedeme dál! +{(monthRev - goal).toLocaleString()} Kč nad cíl</span>
          </div>
        )}
      </div>
    </div>);

}