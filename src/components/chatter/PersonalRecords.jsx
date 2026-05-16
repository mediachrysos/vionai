import React from "react";
import { Award } from "lucide-react";
import { calcDailyPayout, groupPaymentsByDate } from "./tierUtils";

export default function PersonalRecords({ allPayments, tiers, hoursMap }) {
  if (!allPayments || allPayments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#C9A227]" /> Osobní rekordy
        </h3>
        <p className="text-sm text-gray-400 text-center py-6">Zatím žádná data</p>
      </div>
    );
  }

  const dayGroups = groupPaymentsByDate(allPayments);

  let bestDayRevenue = 0, bestDayPayout = 0, bestMonth = "";
  let monthMap = {};

  dayGroups.forEach((day) => {
    const hours = hoursMap?.[day.date] || 0;
    const { payout } = calcDailyPayout(day.revenue, hours, tiers);
    if (day.revenue > bestDayRevenue) bestDayRevenue = day.revenue;
    if (payout > bestDayPayout) bestDayPayout = payout;
    const month = day.date.substring(0, 7);
    monthMap[month] = (monthMap[month] || 0) + day.revenue;
  });

  let bestMonthRevenue = 0;
  Object.entries(monthMap).forEach(([m, v]) => {
    if (v > bestMonthRevenue) { bestMonthRevenue = v; bestMonth = m; }
  });

  const highestPayment = Math.max(...allPayments.map(p => p.amount || 0));

  const records = [
    { label: "Best day revenue", value: `${bestDayRevenue.toLocaleString()} Kč`, icon: "📈" },
    { label: "Best day payout", value: `${Math.round(bestDayPayout).toLocaleString()} Kč`, icon: "💰" },
    { label: "Best month revenue", value: `${bestMonthRevenue.toLocaleString()} Kč`, sub: bestMonth, icon: "🏆" },
    { label: "Highest single payment", value: `${highestPayment.toLocaleString()} Kč`, icon: "⚡" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Award className="w-4 h-4 text-[#C9A227]" /> Osobní rekordy
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {records.map((r) => (
          <div key={r.label} className="bg-[#faf6e6] rounded-xl p-4 border border-[#e8d99a] flex flex-col gap-1">
            <span className="text-xl">{r.icon}</span>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{r.label}</p>
            <p className="text-base font-bold text-gray-900">{r.value}</p>
            {r.sub && <p className="text-[10px] text-gray-400">{r.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}