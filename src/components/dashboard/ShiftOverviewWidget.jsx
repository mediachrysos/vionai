import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${start.getDate()}. ${start.toLocaleString("cs-CZ", { month: "short" })} – ${end.getDate()}. ${end.toLocaleString("cs-CZ", { month: "short" })}`;
}

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export default function ShiftOverviewWidget({ users = [] }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [toggling, setToggling] = useState(null); // "email|date"
  const qc = useQueryClient();

  const chatters = users.filter(u => {
    const roles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return roles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const days = getWeekDates(weekStart);
  const today = new Date().toISOString().split("T")[0];

  const { data: allShifts = [] } = useQuery({
    queryKey: ["all-chatter-shifts"],
    queryFn: () => base44.entities.ChatterShift.list("-date", 2000),
    staleTime: 15000,
  });

  const handleToggle = async (chatter, date) => {
    const key = `${chatter.email}|${date}`;
    if (toggling === key) return;
    setToggling(key);
    const existing = allShifts.find(s => s.chatter_email === chatter.email && s.date === date);
    if (existing) {
      await base44.entities.ChatterShift.delete(existing.id);
    } else {
      await base44.entities.ChatterShift.create({
        chatter_email: chatter.email,
        chatter_name: chatter.nickname || chatter.full_name || chatter.email,
        date,
      });
    }
    qc.invalidateQueries({ queryKey: ["all-chatter-shifts"] });
    setToggling(null);
  };

  // map: email -> Set of dates
  const shiftMap = {};
  const noteMap = {};
  allShifts.forEach(s => {
    if (!shiftMap[s.chatter_email]) shiftMap[s.chatter_email] = {};
    shiftMap[s.chatter_email][s.date] = true;
    if (s.note) {
      if (!noteMap[s.chatter_email]) noteMap[s.chatter_email] = {};
      noteMap[s.chatter_email][s.date] = s.note;
    }
  });

  if (chatters.length === 0) return null;

  // Count total workers per day (for this week)
  const dayCounts = days.map(date =>
    chatters.filter(c => shiftMap[c.email]?.[date]).length
  );

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Směny chatterů</h3>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d.toISOString().split("T")[0]); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-medium px-1 min-w-[140px] text-center">{formatWeekLabel(weekStart)}</span>
          <button
            onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d.toISOString().split("T")[0]); }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-2 text-gray-500 font-medium w-28">Chatter</th>
              {days.map((date, i) => (
                <th key={date} className={`text-center px-2 py-2 font-medium ${date === today ? "text-[#C9A227]" : "text-gray-500"}`}>
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`text-[10px] mt-0.5 ${date === today ? "font-bold text-[#C9A227]" : "text-gray-400"}`}>
                    {new Date(date).getDate()}.
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chatters.map(chatter => (
              <tr key={chatter.email} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {(chatter.nickname || chatter.full_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-700 truncate max-w-[80px]">
                      {chatter.nickname || chatter.full_name?.split(" ")[0] || chatter.email?.split("@")[0]}
                    </span>
                  </div>
                </td>
                {days.map(date => {
                  const hasShift = !!shiftMap[chatter.email]?.[date];
                  const note = noteMap[chatter.email]?.[date];
                  const key = `${chatter.email}|${date}`;
                  const isToggling = toggling === key;
                  return (
                    <td key={date} className="px-1 py-2 text-center">
                      <button
                        onClick={() => handleToggle(chatter, date)}
                        disabled={!!toggling}
                        className="mx-auto block"
                        title={hasShift ? "Odebrat směnu" : "Přidat směnu"}
                      >
                        {hasShift ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-opacity ${isToggling ? "opacity-40" : "hover:opacity-80"} ${
                              date === today
                                ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white shadow-sm"
                                : "bg-emerald-100 text-emerald-600"
                            }`}>
                              <span className="text-[11px] font-bold">✓</span>
                            </div>
                            {note && (
                              <span className="text-[9px] text-gray-400 truncate max-w-[56px]" title={note}>{note.slice(0, 8)}{note.length > 8 ? "…" : ""}</span>
                            )}
                          </div>
                        ) : (
                          <div className={`w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 transition-colors ${isToggling ? "opacity-40" : ""}`} />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Summary row */}
            <tr className="bg-gray-50/70 border-t border-gray-100">
              <td className="px-4 py-1.5 text-[10px] text-gray-400 font-medium">Celkem</td>
              {dayCounts.map((count, i) => (
                <td key={i} className="text-center py-1.5">
                  <span className={`text-[10px] font-bold ${count > 0 ? "text-gray-600" : "text-gray-300"}`}>{count}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}