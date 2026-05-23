import React from "react";
import { TrendingUp } from "lucide-react";

export default function StatsCard({ todayRevenue, hoursWorked, nextTierRevenue }) {
  const progressPercent = nextTierRevenue > 0 ? Math.min(todayRevenue / nextTierRevenue * 100, 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4 hidden">
      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#C9A227]" /> Dnes
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Výnos</p>
            <p className="text-lg font-bold text-gray-900">{todayRevenue.toLocaleString()} Kč</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Hodiny</p>
            <p className="text-lg font-bold text-gray-900">{hoursWorked.toFixed(1)} h</p>
          </div>
        </div>
      </div>
    </div>);

}