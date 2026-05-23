import React from "react";
import { Calendar } from "lucide-react";

export default function MonthlyPaceCard({ monthRevenue, monthlyGoalAmount, monthlyGoalEnabled }) {
  if (!monthlyGoalEnabled || !monthlyGoalAmount) {
    return null;












  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const remaining = Math.max(0, monthlyGoalAmount - monthRevenue);
  const avgNeeded = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const avgCurrent = dayOfMonth > 0 ? Math.round(monthRevenue / dayOfMonth) : 0;
  const expectedAtPace = avgCurrent * daysInMonth;
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
          <h3 className="text-xs font-bold text-gray-800">Měsíční target</h3>
        </div>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
        isAhead ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-500 border-rose-200"}`
        }>
          {isAhead ? `+${Math.abs(Math.round(paceGap)).toLocaleString()} Kč ahead` : `${Math.round(paceGap).toLocaleString()} Kč behind`}
        </span>
      </div>

      {/* Big progress */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{monthRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">z {monthlyGoalAmount.toLocaleString()} Kč cíle</p>
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
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Zbývá do cíle</p>
          <p className="text-[11px] font-bold text-gray-800 mt-0.5">{remaining.toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Zbývá dní</p>
          <p className="text-[11px] font-bold text-gray-800 mt-0.5">{daysLeft} dní</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Potřebuješ/den</p>
          <p className="text-[11px] font-bold text-[#C9A227] mt-0.5">{avgNeeded.toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">Aktuální průměr</p>
          <p className={`text-[11px] font-bold mt-0.5 ${avgCurrent >= avgNeeded ? "text-emerald-600" : "text-rose-500"}`}>
            {avgCurrent.toLocaleString()} Kč
          </p>
        </div>
      </div>
    </div>);

}