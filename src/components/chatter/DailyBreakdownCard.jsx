import React, { useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { calcDailyPayout, getTierForRevenue, groupPaymentsByDate } from "./tierUtils";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function DailyBreakdownCard({ monthPayments, dailyGoalAmount, dailyGoalEnabled, hoursMap, tiers }) {
  const [expanded, setExpanded] = useState(false);
  const dayGroups = groupPaymentsByDate(monthPayments);

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#C9A227]" /> Přehled po dnech (hodiny, tržba, výplata)
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {dayGroups.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">Zatím žádná data</p>
          ) : (
            <div className="space-y-2">
              {dayGroups.map((day) => {
                const hours = hoursMap?.[day.date] || 0;
                const { payout } = calcDailyPayout(day.revenue, hours, tiers);
                const tier = getTierForRevenue(day.revenue, tiers);
                const goalPct = dailyGoalEnabled && dailyGoalAmount > 0 ? Math.round((day.revenue / dailyGoalAmount) * 100) : null;
                let dateLabel = day.date;
                try { dateLabel = format(new Date(day.date), "d. M. yyyy", { locale: cs }); } catch {}

                return (
                  <div key={day.date} className="bg-white/[0.03] rounded-xl border border-white/5 p-3.5 flex flex-wrap gap-x-6 gap-y-1.5 items-center justify-between">
                    <p className="text-xs font-semibold text-slate-300 min-w-[85px]">{dateLabel}</p>

                    <div>
                      <p className="text-[10px] text-slate-500">Vychatováno</p>
                      <p className="text-sm font-bold text-slate-100">{day.revenue.toLocaleString()} Kč</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Hodiny</p>
                      <p className="text-sm font-bold text-slate-300">{hours ? `${hours}h` : "—"}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Tier</p>
                      <p className="text-xs font-semibold text-[#C9A227]">{tier.name}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Výplata</p>
                      <p className={`text-sm font-bold ${payout > 0 ? "text-[#C9A227]" : "text-slate-600"}`}>{Math.round(payout).toLocaleString()} Kč</p>
                    </div>

                    {goalPct !== null && (
                      <div>
                        <p className="text-[10px] text-slate-500">Cíl</p>
                        <p className={`text-xs font-semibold ${goalPct >= 100 ? "text-emerald-400" : "text-rose-400"}`}>{goalPct}%</p>
                      </div>
                    )}
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