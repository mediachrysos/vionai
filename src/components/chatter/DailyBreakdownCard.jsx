import React, { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { calcDailyPayout, getTierForRevenue, groupPaymentsByDate } from "./tierUtils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const STATUS_BADGE = {
  0: { label: "No payout", cls: "bg-gray-100 text-gray-500" },
  1: { label: "Hourly unlocked", cls: "bg-amber-50 text-[#C9A227] border border-[#e8d99a]" },
  2: { label: "5% unlocked", cls: "bg-amber-100 text-amber-700 border border-amber-300" },
  3: { label: "10% unlocked", cls: "bg-yellow-100 text-yellow-700 border border-yellow-400" },
};

export default function DailyBreakdownCard({ monthPayments, dailyGoalAmount, dailyGoalEnabled, hoursMap, tiers }) {
  const [expanded, setExpanded] = useState(true);
  const dayGroups = groupPaymentsByDate(monthPayments);

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] mb-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-5 pb-4"
      >
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#C9A227]" /> Přehled po dnech
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {dayGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Zatím žádná data</p>
          ) : (
            <div className="space-y-2">
              {dayGroups.map((day) => {
                const hours = hoursMap?.[day.date] || 0;
                const { payout } = calcDailyPayout(day.revenue, hours, tiers);
                const tier = getTierForRevenue(day.revenue, tiers);
                const goalPct = dailyGoalEnabled && dailyGoalAmount > 0 ? Math.round((day.revenue / dailyGoalAmount) * 100) : null;
                const targetHit = goalPct !== null && goalPct >= 100;
                const badge = STATUS_BADGE[tier.index];
                let dateLabel = day.date;
                try { dateLabel = format(new Date(day.date), "d. M. yyyy", { locale: cs }); } catch {}

                return (
                  <div key={day.date} className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 flex flex-wrap gap-3 items-center justify-between hover:border-[#e8d99a] transition-colors">
                    <div className="min-w-[80px]">
                      <p className="text-xs font-semibold text-gray-700">{dateLabel}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 flex-1">
                      <div>
                        <p className="text-[10px] text-gray-400">Revenue</p>
                        <p className="text-sm font-bold text-gray-900">{day.revenue.toLocaleString()} Kč</p>
                      </div>
                      {hours > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-400">Hodiny</p>
                          <p className="text-sm font-bold text-gray-700">{hours} h</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-400">Tier</p>
                        <p className="text-xs font-semibold text-[#C9A227]">{tier.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Payout</p>
                        <p className={`text-sm font-bold ${payout > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{Math.round(payout).toLocaleString()} Kč</p>
                      </div>
                      {goalPct !== null && (
                        <div>
                          <p className="text-[10px] text-gray-400">Cíl</p>
                          <p className={`text-xs font-semibold ${targetHit ? "text-emerald-600" : "text-rose-400"}`}>{goalPct}%</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      {targetHit && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Target hit ✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}