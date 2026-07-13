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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-2.5">Monthly Goal</p>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C9A227]/70 transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <p className="text-lg font-semibold text-slate-700 tabular-nums whitespace-nowrap">
            {monthRevenue.toLocaleString()} CZK
            <span className="text-sm font-normal text-slate-400"> / {monthlyGoalAmount.toLocaleString()} CZK</span>
          </p>
          <div className="w-9 h-9 rounded-full border border-[#C9A227]/30 bg-[#C9A227]/5 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-[#C9A227]">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-3.5 border-t border-slate-100">
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Remaining days</p>
          <p className="text-sm font-semibold text-slate-600">{daysLeft}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Daily needed</p>
          <p className={`text-sm font-semibold ${avgNeeded > 0 ? "text-[#C9A227]" : "text-slate-600"}`}>{avgNeeded.toLocaleString()} CZK</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Remaining</p>
          <p className="text-sm font-semibold text-slate-600">{remaining.toLocaleString()} CZK</p>
        </div>
      </div>
    </div>
  );
}