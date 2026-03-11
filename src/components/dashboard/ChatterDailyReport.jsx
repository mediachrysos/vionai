import React, { useState } from "react";
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { cs } from "date-fns/locale";

export default function ChatterDailyReport({ payments, currentUser, users }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const dayPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) === selectedDate
  );

  // Group by chatter
  const chatterMap = {};
  dayPayments.forEach((p) => {
    const key = p.chatter_email || "unknown";
    const name = p.chatter_name || p.chatter_email || "Neznámý";
    if (!chatterMap[key]) chatterMap[key] = { name, total: 0, count: 0 };
    chatterMap[key].total += p.amount || 0;
    chatterMap[key].count += 1;
  });

  const chatters = Object.values(chatterMap).sort((a, b) => b.total - a.total);
  const totalDay = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const prevDay = () => setSelectedDate(subDays(new Date(selectedDate), 1).toISOString().split("T")[0]);
  const nextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    if (next <= new Date()) setSelectedDate(next.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Denní výkony chatterů</h3>
        </div>
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
          <button onClick={nextDay} disabled={isToday} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {chatters.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          Pro {format(new Date(selectedDate), "d. MMMM yyyy", { locale: cs })} nejsou žádné platby
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {chatters.map((c, i) => {
              const pct = totalDay > 0 ? Math.round((c.total / totalDay) * 100) : 0;
              const colors = ["bg-indigo-100 text-indigo-700 border-indigo-200", "bg-violet-100 text-violet-700 border-violet-200", "bg-emerald-100 text-emerald-700 border-emerald-200", "bg-amber-100 text-amber-700 border-amber-200", "bg-rose-100 text-rose-700 border-rose-200"];
              const barColors = ["bg-indigo-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
              const color = colors[i % colors.length];
              const bar = barColors[i % barColors.length];
              return (
                <div key={c.name} className={`rounded-xl border p-3 ${color.split(" ").slice(-1)} bg-white border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${color}`}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 truncate">{c.name}</span>
                  </div>
                  <p className="text-base font-bold text-gray-900">{c.total.toLocaleString()} Kč</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{c.count} plateb</span>
                    <span className="text-[10px] font-semibold text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Celkem za {format(new Date(selectedDate), "d. M. yyyy")}</span>
            <span className="text-sm font-bold text-indigo-600">{totalDay.toLocaleString()} Kč</span>
          </div>
        </div>
      )}
    </div>
  );
}