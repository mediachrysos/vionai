import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getDaysInMonth, startOfMonth, getDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

const DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export default function DatePicker({ value, onChange, placeholder = "Vybrat datum", max }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewDate);
  // getDay returns 0=Sun, we want 0=Mon
  const firstDayOfWeek = (getDay(startOfMonth(viewDate)) + 6) % 7;

  const maxDate = max ? new Date(max) : null;

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

  const isDisabled = (day) => {
    if (!maxDate) return false;
    return new Date(year, month, day) > maxDate;
  };

  const displayValue = value
    ? format(new Date(value), "d. MMMM yyyy", { locale: cs })
    : null;

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
          "bg-white border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200",
          open && "border-indigo-400 ring-2 ring-indigo-100"
        )}
      >
        <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={displayValue ? "text-gray-800" : "text-gray-400"}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-72 left-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {format(viewDate, "LLLL yyyy", { locale: cs })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    disabled={isDisabled(day)}
                    className={cn(
                      "w-8 h-8 rounded-full text-sm font-medium transition-all",
                      isSelected(day) && "bg-indigo-600 text-white shadow-sm",
                      !isSelected(day) && isTodayDay(day) && "border-2 border-indigo-400 text-indigo-600",
                      !isSelected(day) && !isTodayDay(day) && !isDisabled(day) && "text-gray-700 hover:bg-indigo-50",
                      isDisabled(day) && "text-gray-300 cursor-not-allowed"
                    )}
                  >
                    {day}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Vymazat
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                if (!maxDate || t <= maxDate) {
                  const str = t.toISOString().split("T")[0];
                  onChange(str);
                  setViewDate(t);
                }
                setOpen(false);
              }}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Dnes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}