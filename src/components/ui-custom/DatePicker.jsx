import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDaysInMonth, startOfMonth, getDay, format } from "date-fns";
import { cs } from "date-fns/locale";

const DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

function getYearRange(centerYear) {
  const years = [];
  for (let y = centerYear + 5; y >= centerYear - 80; y--) years.push(y);
  return years;
}

export default function DatePicker({ value, onChange, placeholder = "Vybrat datum", max, variant = "default" }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfWeek = (getDay(startOfMonth(viewDate)) + 6) % 7;
  const maxDate = max ? new Date(max) : null;
  const years = getYearRange(year);

  const selectDay = (day) => {
    const d = new Date(year, month, day);
    if (maxDate && d > maxDate) return;
    const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(str);
    setOpen(false);
  };

  const isSelected = (day) => {
    if (!value) return false;
    const v = new Date(value);
    return v.getFullYear() === year && v.getMonth() === month && v.getDate() === day;
  };

  const isTodayDay = (day) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const isDisabled = (day) => maxDate ? new Date(year, month, day) > maxDate : false;

  const displayValue = value ? format(new Date(value), "d. MMMM yyyy", { locale: cs }) : null;

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none whitespace-nowrap",
          variant === "ghost"
            ? "bg-white/20 border-white/30 text-white hover:bg-white/30"
            : "bg-slate-800 border-white/10 text-slate-200 hover:border-[#C9A227]/50 focus:ring-2 focus:ring-amber-900/50",
          variant !== "ghost" && open && "border-[#C9A227]/60 ring-2 ring-amber-900/30"
        )}
      >
        <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_3_qncd5u.png" alt="" className="w-3.5 h-3.5 flex-shrink-0 object-contain" />
        <span className={cn("text-xs truncate", variant === "ghost" ? "text-white" : (displayValue ? "text-slate-200" : "text-slate-500"))}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div
          className="absolute z-[9999] bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-xl p-4 w-72 mt-1"
          style={{ left: "50%", transform: "translateX(-50%)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Month + Year selectors */}
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); }}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <select
              value={month}
              onChange={e => setViewDate(new Date(year, parseInt(e.target.value), 1))}
              onMouseDown={e => e.stopPropagation()}
              className="flex-1 text-xs font-semibold text-slate-200 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setViewDate(new Date(parseInt(e.target.value), month, 1))}
              onMouseDown={e => e.stopPropagation()}
              className="w-20 text-xs font-semibold text-slate-200 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); }}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-slate-500 py-1">{d}</div>)}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); selectDay(day); }}
                    disabled={isDisabled(day)}
                    className={cn(
                      "w-8 h-8 rounded-full text-sm font-medium transition-all",
                      isSelected(day) && "bg-[#C9A227] text-white shadow-sm",
                      !isSelected(day) && isTodayDay(day) && "border-2 border-[#C9A227] text-[#C9A227]",
                      !isSelected(day) && !isTodayDay(day) && !isDisabled(day) && "text-slate-300 hover:bg-white/10",
                      isDisabled(day) && "text-slate-700 cursor-not-allowed"
                    )}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-3 border-t border-white/10">
            <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setOpen(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Vymazat
            </button>
            <button type="button" onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              const t = new Date();
              if (!maxDate || t <= maxDate) { onChange(t.toISOString().split("T")[0]); setViewDate(t); }
              setOpen(false);
            }} className="text-xs text-[#C9A227] font-semibold hover:text-[#A8841C] transition-colors">
              Dnes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}