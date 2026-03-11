import React from "react";
import { MessageSquare, TrendingUp } from "lucide-react";

export default function TodayChatterStats({ payments }) {
  const today = new Date().toISOString().split("T")[0];

  const todayPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) === today
  );

  // Group by chatter
  const chatterMap = {};
  todayPayments.forEach((p) => {
    const key = p.chatter_email || "unknown";
    const name = p.chatter_name || p.chatter_email || "Neznámý";
    if (!chatterMap[key]) {
      chatterMap[key] = { name, total: 0, count: 0 };
    }
    chatterMap[key].total += p.amount || 0;
    chatterMap[key].count += 1;
  });

  const chatters = Object.values(chatterMap).sort((a, b) => b.total - a.total);
  const totalToday = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Dnešní výkony</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
          {new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })}
        </span>
      </div>

      {chatters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">Dnes zatím žádné platby</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {chatters.map((c, i) => {
              const pct = totalToday > 0 ? (c.total / totalToday) * 100 : 0;
              const colors = [
                "bg-indigo-500",
                "bg-violet-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-rose-500",
              ];
              const barColor = colors[i % colors.length];
              return (
                <div key={c.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                        {c.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900">
                        {c.total.toLocaleString()} Kč
                      </span>
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({c.count}×)
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Celkem dnes</span>
            <span className="text-sm font-bold text-indigo-600">
              {totalToday.toLocaleString()} Kč
            </span>
          </div>
        </>
      )}
    </div>
  );
}