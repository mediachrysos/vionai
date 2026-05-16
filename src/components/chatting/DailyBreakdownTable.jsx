import React, { useState } from "react";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

function calcDayEarned(dayTotal) {
  if (dayTotal < 2000) return 0;
  if (dayTotal < 5000) return 0; // jen hodinová složka
  if (dayTotal < 10000) return dayTotal * 0.05;
  return dayTotal * 0.10;
}

function getTierBadge(dayTotal) {
  if (dayTotal < 2000) return { label: "–", cls: "text-gray-300" };
  if (dayTotal < 5000) return { label: "T1", cls: "text-blue-500" };
  if (dayTotal < 10000) return { label: "T2", cls: "text-amber-500" };
  return { label: "T3", cls: "text-emerald-600" };
}

export default function DailyBreakdownTable({ payments }) {
  const [open, setOpen] = useState(false);

  // Skupinování plateb po dnech
  const byDay = {};
  for (const p of payments) {
    const day = p.payment_date || p.created_date?.split("T")[0];
    if (!day) continue;
    if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
    byDay[day].total += p.amount || 0;
    byDay[day].count += 1;
  }

  const days = Object.entries(byDay)
    .map(([date, d]) => ({
      date,
      total: d.total,
      count: d.count,
      earned: Math.round(calcDayEarned(d.total)),
      tier: getTierBadge(d.total),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (days.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50/50 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C9A227]" />
          Přehled po dnech
          <span className="ml-1 text-xs font-normal text-gray-400">({days.length} dní)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-400 font-medium">Datum</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Plateb</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Vychatováno</th>
                  <th className="text-center py-2 text-gray-400 font-medium">Tier</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Výplata</th>
                </tr>
              </thead>
              <tbody>
                {days.map(d => (
                  <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 text-gray-600 font-medium">
                      {format(new Date(d.date), "d. M. yyyy")}
                    </td>
                    <td className="py-2.5 text-right text-gray-400">{d.count}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-800">
                      {d.total.toLocaleString()} Kč
                    </td>
                    <td className={`py-2.5 text-center font-bold ${d.tier.cls}`}>{d.tier.label}</td>
                    <td className="py-2.5 text-right">
                      {d.earned > 0 ? (
                        <span className="font-semibold text-amber-600">{d.earned.toLocaleString()} Kč</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}