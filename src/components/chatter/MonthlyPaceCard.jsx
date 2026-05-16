import React from "react";
import { TrendingUp, Calendar } from "lucide-react";

export default function MonthlyPaceCard({ monthRevenue, monthlyGoalAmount, monthlyGoalEnabled }) {
  if (!monthlyGoalEnabled || !monthlyGoalAmount) {
    return (
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C9A227]" /> Měsíční target
        </h3>
        <p className="text-sm text-gray-400 py-4 text-center">Měsíční cíl zatím není nastavený.</p>
      </div>
    );
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
  const pct = Math.min(100, Math.round((monthRevenue / monthlyGoalAmount) * 100));

  const paceStatus = paceGap >= 0 ? "ahead" : "behind";
  const paceLabel = paceGap >= 0
    ? `+${Math.abs(Math.round(paceGap)).toLocaleString()} Kč ahead of pace`
    : `${Math.round(paceGap).toLocaleString()} Kč behind pace`;
  const paceBadge = paceStatus === "ahead"
    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
    : "bg-rose-50 text-rose-500 border border-rose-200";

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C9A227]" /> Měsíční target
        </h3>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${paceBadge}`}>{paceLabel}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{monthRevenue.toLocaleString()} Kč</span>
          <span>{monthlyGoalAmount.toLocaleString()} Kč</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 text-right mt-1">{pct}% cíle</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Zbývá do cíle</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{remaining.toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Zbývá dní</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{daysLeft} dní</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Potřebný průměr</p>
          <p className="text-sm font-bold text-[#C9A227] mt-0.5">{avgNeeded.toLocaleString()} Kč/den</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Aktuální průměr</p>
          <p className={`text-sm font-bold mt-0.5 ${avgCurrent >= avgNeeded ? "text-emerald-600" : "text-rose-500"}`}>{avgCurrent.toLocaleString()} Kč/den</p>
        </div>
      </div>
    </div>
  );
}