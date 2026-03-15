import React, { useState } from "react";
import { MessageSquare, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { subDays, addDays, format } from "date-fns";
import DatePicker from "@/components/ui-custom/DatePicker";

export default function TodayChatterStats({ payments, showAll = true, currentUser = null }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isToday = selectedDate === todayStr;

  const dayPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) === selectedDate
  );

  const chatterMap = {};
  dayPayments.forEach((p) => {
    const key = p.chatter_email || "unknown";
    const name = p.chatter_name || p.chatter_email || "Neznámý";
    if (!chatterMap[key]) chatterMap[key] = { name, total: 0, count: 0 };
    chatterMap[key].total += p.amount || 0;
    chatterMap[key].count += 1;
  });

  const allChatters = Object.values(chatterMap).sort((a, b) => b.total - a.total);
  // If not showing all, highlight current user's row but still show others dimmed
  const chatters = allChatters;
  const totalDay = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const prevDay = () => setSelectedDate(subDays(new Date(selectedDate), 1).toISOString().split("T")[0]);
  const nextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    if (next <= new Date()) setSelectedDate(next.toISOString().split("T")[0]);
  };

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white">Výkony chatterů</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevDay} className="w-7 h-7 rounded-lg border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="w-40">
            <DatePicker
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              max={todayStr} />

          </div>
          <button onClick={nextDay} disabled={isToday} className="w-7 h-7 rounded-lg border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="p-5 flex-1">

      {chatters.length === 0 ?
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">
            {isToday ? "Dnes zatím žádné platby" : `Pro ${format(new Date(selectedDate), "d. M. yyyy")} nejsou žádné platby`}
          </p>
        </div> :

        <>
          <div className="space-y-2 mb-4">
            {chatters.map((c) =>
            <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-bold text-[#C9A227]">
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
                  


                </div>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Celkem {isToday ? "dnes" : format(new Date(selectedDate), "d. M. yyyy")}</span>
            <span className="text-sm font-bold text-[#C9A227]">
              {totalDay.toLocaleString()} Kč
            </span>
          </div>
        </>
        }
      </div>
    </div>);

}