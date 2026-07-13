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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-sm p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            <Calendar className="w-3 h-3 text-blue-500" />
          </div>
          <h3 className="text-xs font-bold text-gray-800">Monthly target</h3>
        </div>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
        isAhead ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-500 border-rose-200"}`
        }>
          {isAhead ? `+${Math.abs(Math.round(paceGap)).toLocaleString()} ahead` : `${Math.round(paceGap).toLocaleString()} behind`}
        </span>
      </div>

      {/* Big progress */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{monthRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">of {monthlyGoalAmount.toLocaleString()} goal</p>
          </div>
          <p className="text-2xl font-bold text-[#C9A227]">{pct}%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
            style={{ width: `${pct}%` }} />
          
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 flex-1">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Remaining to goal</p>
          <p className="text-[11px] font-bold text-gray-800 mt-0.5">{remaining.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Days left</p>
          <p className="text-[11px] font-bold text-gray-800 mt-0.5">{daysLeft} days</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Needed/day</p>
          <p className="text-[11px] font-bold text-[#C9A227] mt-0.5">{avgNeeded.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Current average</p>
          <p className={`text-[11px] font-bold mt-0.5 ${avgCurrent >= avgNeeded ? "text-emerald-600" : "text-rose-500"}`}>
            {avgCurrent.toLocaleString()}
          </p>
        </div>
      </div>
    </div>);

}