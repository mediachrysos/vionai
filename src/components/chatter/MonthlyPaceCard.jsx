import React from "react";
import { Calendar } from "lucide-react";

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
  const avgCurrent = dayOfPeriod > 0 ? Math.round(monthRevenue / dayOfPeriod) : 0;
  const expectedAtPace = avgCurrent * totalDays;
  const paceGap = expectedAtPace - monthlyGoalAmount;
  const pct = Math.min(100, Math.round(monthRevenue / monthlyGoalAmount * 100));
  const isAhead = paceGap >= 0;

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
            <Calendar className="w-3 h-3 text-[#C9A227]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Monthly target</h3>
        </div>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
        isAhead ? "bg-emerald-950/30 text-emerald-400 border-emerald-700/30" : "bg-rose-950/30 text-rose-400 border-rose-700/30"}`
        }>
          {isAhead ? `+${Math.abs(Math.round(paceGap)).toLocaleString()} ahead` : `${Math.round(paceGap).toLocaleString()} behind`}
        </span>
      </div>

      {/* Big progress */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-lg font-bold text-slate-100 tabular-nums">{monthRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">of {monthlyGoalAmount.toLocaleString()} goal</p>
          </div>
          <p className="text-2xl font-bold text-[#C9A227]">{pct}%</p>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Remaining to goal</p>
          <p className="text-[11px] font-bold text-slate-100 mt-0.5">{remaining.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Days left</p>
          <p className="text-[11px] font-bold text-slate-100 mt-0.5">{daysLeft} days</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Needed/day</p>
          <p className="text-[11px] font-bold text-[#C9A227] mt-0.5">{avgNeeded.toLocaleString()}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Current average</p>
          <p className={`text-[11px] font-bold mt-0.5 ${avgCurrent >= avgNeeded ? "text-emerald-400" : "text-rose-400"}`}>
            {avgCurrent.toLocaleString()}
          </p>
        </div>
      </div>
    </div>);

}