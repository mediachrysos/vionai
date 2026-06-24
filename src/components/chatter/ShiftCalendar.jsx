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
    staleTime: 15000
  });

  const shiftMap = {};
  shifts.forEach((s) => {shiftMap[s.date] = s;});

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
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center hidden">
          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <h3 className="text-xs font-bold text-slate-200">My shifts</h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 font-medium px-1 min-w-[180px] text-center">{formatWeekLabel(weekStart)}</span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors">
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
                <span className={`text-[10px] font-medium ${isToday ? "text-[#C9A227]" : "text-slate-500"}`}>{DAY_NAMES[i]}</span>
                <button
                  onClick={() => toggleDay(date)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${
                  isActive ?
                  "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white border-[#C9A227] shadow-sm" :
                  isToday ?
                  "border-[#C9A227] text-[#C9A227] bg-transparent" :
                  "border-white/10 text-slate-500 bg-white/5 hover:border-white/20"}`
                  }>
                  {new Date(date).getDate()}
                </button>
                {isActive &&
                <button
                  onClick={() => setEditingNote({ date, value: shift.note || "" })}
                  className="text-[9px] text-blue-400 hover:text-blue-300 truncate max-w-full px-0.5"
                  title={shift.note || "Add note"}>
                    {shift.note ? shift.note.slice(0, 8) + (shift.note.length > 8 ? "…" : "") : "+ note"}
                  </button>
                }
              </div>);
          })}
        </div>

        {/* Note editor */}
        {editingNote &&
        <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-slate-500 mb-2">Note for {new Date(editingNote.date).toLocaleDateString()}</p>
            <input
            className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A227] bg-white/5 text-slate-200 placeholder:text-slate-600"
            value={editingNote.value}
            onChange={(e) => setEditingNote((prev) => ({ ...prev, value: e.target.value }))}
            placeholder="E.g. morning shift, 8-16..."
            autoFocus />
            <div className="flex gap-2 mt-2">
              <button onClick={() => saveNote(editingNote.date, editingNote.value)} className="text-xs bg-[#C9A227] text-white px-3 py-1.5 rounded-lg hover:bg-[#A8841C] transition-colors">Save</button>
              <button onClick={() => setEditingNote(null)} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5">Cancel</button>
            </div>
          </div>
        }
      </div>
    </div>);

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
    staleTime: 15000
  });

  // map: email -> date -> shift
  const shiftMap = {};
  allShifts.forEach((s) => {
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
        date
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

  return null;






























































































}