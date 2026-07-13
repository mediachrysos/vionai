import React from "react";

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
    <div className="bg-[#f3f3f4] rounded-2xl border border-black/5 shadow-sm p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2.5">Monthly Goal</p>
          <div className="h-2 bg-black/10 rounded-full overflow-hidden max-w-xs">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xl font-bold text-slate-800 tabular-nums">
            {monthRevenue.toLocaleString()} CZK
            <span className="text-sm font-normal text-slate-400"> / {monthlyGoalAmount.toLocaleString()} CZK</span>
          </p>
          <div className="w-10 h-10 rounded-full border-2 border-[#C9A227]/40 bg-[#C9A227]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-[#C9A227]">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap mt-4 pt-4 border-t border-black/5">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Remaining days </span>
          <span className="text-sm font-bold text-slate-700">{daysLeft}</span>
        </div>
        <span className="text-slate-300">|</span>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Daily needed </span>
          <span className={`text-sm font-bold ${avgNeeded > 0 ? "text-[#C9A227]" : "text-slate-700"}`}>{avgNeeded.toLocaleString()} CZK</span>
        </div>
        <span className="text-slate-300">|</span>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Remaining </span>
          <span className="text-sm font-bold text-slate-700">{remaining.toLocaleString()} CZK</span>
        </div>
      </div>
    </div>
  );
}