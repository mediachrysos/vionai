import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";


export default function MonthlyGoalBar() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
    staleTime: 60000,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goalSettings"],
    queryFn: () => base44.entities.GoalSettings.list(),
  });

  const goal = goals[0]?.monthly_goal || 100000;

  const monthRev = payments
    .filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const pct = Math.min(100, Math.round((monthRev / goal) * 100));
  const reached = monthRev >= goal;

  return (
    <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] rounded-xl px-5 py-3 mb-6 shadow-sm shadow-amber-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266696/Chrysos_icon_7_ubsz30.png" alt="" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Měsíční cíl</span>
        </div>
        <div className="flex items-center gap-2">
          {reached ? (
            <span className="text-xs font-bold text-white bg-white/25 px-2.5 py-0.5 rounded-full">🎉 Cíl splněn!</span>
          ) : (
            <span className="text-xs text-white/80">
              <span className="font-bold text-white">{monthRev.toLocaleString()} Kč</span>
              {" / "}
              {goal.toLocaleString()} Kč
            </span>
          )}
          <span className="text-xs font-bold text-white bg-white/25 px-2.5 py-0.5 rounded-full">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-white/25 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-white transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}