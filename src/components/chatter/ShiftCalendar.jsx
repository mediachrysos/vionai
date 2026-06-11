import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function getWeekDates(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${start.getDate()}. ${start.toLocaleString("cs-CZ", { month: "long" })} – ${end.getDate()}. ${end.toLocaleString("cs-CZ", { month: "long", year: "numeric" })}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Chatter's own shift picker (can only edit their own) ─────────────────
export function ChatterShiftPicker({ email, name }) {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [editingNote, setEditingNote] = useState(null); // { date, value }

  const days = getWeekDates(weekStart);

  const { data: shifts = [] } = useQuery({
    queryKey: ["chatter-shifts", email],
    queryFn: () => base44.entities.ChatterShift.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 15000,
  });

  const shiftMap = {};
  shifts.forEach(s => { shiftMap[s.date] = s; });

  const toggleDay = async (date) => {
    const existing = shiftMap[date];
    if (existing) {
      await base44.entities.ChatterShift.delete(existing.id);
    } else {
      await base44.entities.ChatterShift.create({ chatter_email: email, chatter_name: name || email, date });
    }
    qc.invalidateQueries({ queryKey: ["chatter-shifts", email] });
    qc.invalidateQueries({ queryKey: ["all-chatter-shifts"] });
  };

  const saveNote = async (date, note) => {
    const existing = shiftMap[date];
    if (existing) {
      await base44.entities.ChatterShift.update(existing.id, { note });
      qc.invalidateQueries({ queryKey: ["chatter-shifts", email] });
    }
    setEditingNote(null);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split("T")[0]);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <h3 className="text-xs font-bold text-gray-800">My shifts</h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-medium px-1 min-w-[180px] text-center">{formatWeekLabel(weekStart)}</span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date, i) => {
            const shift = shiftMap[date];
            const isToday = date === today;
            const isActive = !!shift;
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isToday ? "text-[#C9A227]" : "text-gray-400"}`}>{DAY_NAMES[i]}</span>
                <button
                  onClick={() => toggleDay(date)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white border-[#C9A227] shadow-sm"
                      : isToday
                      ? "border-[#C9A227] text-[#C9A227] bg-white"
                      : "border-gray-200 text-gray-400 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {new Date(date).getDate()}
                </button>
                {isActive && (
                  <button
                    onClick={() => setEditingNote({ date, value: shift.note || "" })}
                    className="text-[9px] text-blue-400 hover:text-blue-600 truncate max-w-full px-0.5"
                    title={shift.note || "Add note"}
                  >
                    {shift.note ? shift.note.slice(0, 8) + (shift.note.length > 8 ? "…" : "") : "+ note"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Note editor */}
        {editingNote && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Note for {new Date(editingNote.date).toLocaleDateString()}</p>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A227]"
              value={editingNote.value}
              onChange={e => setEditingNote(prev => ({ ...prev, value: e.target.value }))}
              placeholder="E.g. morning shift, 8-16..."
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveNote(editingNote.date, editingNote.value)} className="text-xs bg-[#C9A227] text-white px-3 py-1.5 rounded-lg hover:bg-[#A8841C] transition-colors">Save</button>
              <button onClick={() => setEditingNote(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin overview of all chatters' shifts ───────────────────────────────
export function AdminShiftCalendar({ chatters }) {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [editingShift, setEditingShift] = useState(null);

  const days = getWeekDates(weekStart);

  const { data: allShifts = [] } = useQuery({
    queryKey: ["all-chatter-shifts"],
    queryFn: () => base44.entities.ChatterShift.list("-date", 2000),
    staleTime: 15000,
  });

  // map: email -> date -> shift
  const shiftMap = {};
  allShifts.forEach(s => {
    if (!shiftMap[s.chatter_email]) shiftMap[s.chatter_email] = {};
    shiftMap[s.chatter_email][s.date] = s;
  });

  const toggleShift = async (chatter, date) => {
    const existing = shiftMap[chatter.email]?.[date];
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
  };

  const saveNote = async (shiftId, note) => {
    await base44.entities.ChatterShift.update(shiftId, { note });
    qc.invalidateQueries({ queryKey: ["all-chatter-shifts"] });
    setEditingShift(null);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">Shift calendar</h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d.toISOString().split("T")[0]); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 font-medium px-1 min-w-[200px] text-center">{formatWeekLabel(weekStart)}</span>
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d.toISOString().split("T")[0]); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-gray-500 font-medium w-28">Chatter</th>
              {days.map((date, i) => (
                <th key={date} className={`text-center px-2 py-2 font-medium ${date === today ? "text-[#C9A227]" : "text-gray-500"}`}>
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`text-[10px] ${date === today ? "font-bold text-[#C9A227]" : "text-gray-400"}`}>{new Date(date).getDate()}.</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chatters.map(chatter => (
              <tr key={chatter.email} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {(chatter.nickname || chatter.full_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-700 truncate max-w-[80px]">{chatter.nickname || chatter.full_name?.split(" ")[0]}</span>
                  </div>
                </td>
                {days.map(date => {
                  const shift = shiftMap[chatter.email]?.[date];
                  return (
                    <td key={date} className="px-1 py-2 text-center">
                      <button
                        onClick={() => toggleShift(chatter, date)}
                        title={shift?.note || ""}
                        className={`w-8 h-8 rounded-lg transition-all border mx-auto block ${
                          shift
                            ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white border-[#C9A227] shadow-sm"
                            : "border-gray-200 bg-gray-50 hover:border-gray-300"
                        }`}
                      >
                        {shift ? "✓" : ""}
                      </button>
                      {shift && (
                        <button
                          onClick={() => setEditingShift({ id: shift.id, date, chatterName: chatter.nickname || chatter.full_name, note: shift.note || "" })}
                          className="text-[9px] text-blue-400 hover:text-blue-600 mt-0.5 block mx-auto truncate max-w-[64px]"
                        >
                          {shift.note ? shift.note.slice(0, 8) + (shift.note.length > 8 ? "…" : "") : "+ note"}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note editor */}
      {editingShift && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Note: {editingShift.chatterName} · {new Date(editingShift.date).toLocaleDateString()}</p>
            <input
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A227]"
              value={editingShift.note}
              onChange={e => setEditingShift(prev => ({ ...prev, note: e.target.value }))}
              placeholder="E.g. morning shift, 8-16..."
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveNote(editingShift.id, editingShift.note)} className="text-xs bg-[#C9A227] text-white px-3 py-1.5 rounded-lg hover:bg-[#A8841C]">Save</button>
              <button onClick={() => setEditingShift(null)} className="text-xs text-gray-400 px-2 py-1.5">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}