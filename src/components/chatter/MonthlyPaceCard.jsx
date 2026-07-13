import React from "react";
import { Target } from "lucide-react";

export default function MonthlyPaceCard({ periodRevenue, periodStart, periodEnd, monthlyGoalAmount, monthlyGoalEnabled }) {
  if (!monthlyGoalEnabled || !monthlyGoalAmount || !periodStart || !periodEnd) {
    return null;
  }

  const monthRevenue = periodRevenue || 0;
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const today = new Date();
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const dayOfPeriod = Math.min(totalDays, Math.max(1, Math.round((today - start) / 86400000) + 1));
  const daysLeft = Math.max(0, totalDays - dayOfPeriod);
  const remaining = Math.max(0, monthlyGoalAmount - monthRevenue);
  const avgNeeded = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const pct = Math.min(100, Math.round(monthRevenue / monthlyGoalAmount * 100));

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/10 p-5 hover:border-violet-700/30 transition-colors">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-950/50 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Monthly goal</h3>
        <span className="ml-auto text-xs font-semibold bg-violet-950/50 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded-full">{pct}%</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-slate-100 tracking-tight">{monthRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">of {monthlyGoalAmount.toLocaleString()} monthly goal</p>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        {remaining > 0 && (
          <p className="text-xs text-slate-500">
            Remaining <span className="text-violet-400 font-medium">{remaining.toLocaleString()}</span>
            {daysLeft > 0 && <> · <span className="text-violet-400 font-medium">{avgNeeded.toLocaleString()}</span>/day for {daysLeft} days left</>}
          </p>
        )}
        {remaining === 0 && (
          <p className="text-xs text-emerald-400 font-medium">Goal reached! 🎉</p>
        )}
      </div>
    </div>
  );
}