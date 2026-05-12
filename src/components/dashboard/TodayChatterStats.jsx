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

  // Group by model
  const modelMap = {};
  dayPayments.forEach((p) => {
    const key = p.model_id || p.model_name || "unknown";
    const modelName = p.model_name || "Neznámá modelka";
    if (!modelMap[key]) modelMap[key] = { key, modelName, total: 0, chatters: new Set() };
    modelMap[key].total += p.amount || 0;
    if (p.chatter_name || p.chatter_email) {
      modelMap[key].chatters.add(p.chatter_name || p.chatter_email);
    }
  });

  const chatters = Object.values(modelMap).sort((a, b) => b.total - a.total);
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
          <div className="bg-white rounded-xl w-9 h-9 flex items-center justify-center shadow-sm">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_4_lyfexm.png" alt="" className="w-6 h-6 object-contain" />
          </div>
          <h3 className="text-sm font-semibold text-white">Výkony chatterů</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevDay} className="w-7 h-7 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="w-36">
            <DatePicker
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              max={todayStr}
              variant="ghost" />
          </div>
          <button onClick={nextDay} disabled={isToday} className="w-7 h-7 rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center disabled:opacity-30">
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
            {chatters.map((c) => {
              const chatterNames = [...c.chatters].join(", ");
              return (
                <div key={c.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-bold text-[#C9A227] flex-shrink-0">
                      {c.modelName[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-800 truncate block max-w-[140px]">
                        {c.modelName}
                      </span>
                      {chatterNames && (
                        <span className="text-[10px] text-gray-400 truncate block max-w-[140px]">
                          ({chatterNames})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-gray-900">
                      {c.total.toLocaleString()} Kč
                    </span>
                  </div>
                </div>
              );
            })}
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