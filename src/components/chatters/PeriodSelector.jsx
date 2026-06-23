import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
];

function subDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function startOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export function getPeriodDates(period) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period.key) {
    case "today":
      return { start: today, end: today, prevStart: subDays(today, 1), prevEnd: subDays(today, 1) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { start: y, end: y, prevStart: subDays(y, 1), prevEnd: subDays(y, 1) };
    }
    case "this_week": {
      const sw = startOfWeek(today);
      return { start: sw, end: today, prevStart: subDays(sw, 7), prevEnd: subDays(today, 7) };
    }
    case "last_week": {
      const thisWeekStart = startOfWeek(today);
      const lastEnd = subDays(thisWeekStart, 1);
      const lastStart = subDays(thisWeekStart, 7);
      return { start: lastStart, end: lastEnd, prevStart: subDays(lastStart, 7), prevEnd: subDays(lastEnd, 7) };
    }
    case "this_month": {
      const sm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const prevEnd = subDays(sm, 1);
      const prevStart = prevEnd.slice(0, 7) + "-01";
      return { start: sm, end: today, prevStart, prevEnd };
    }
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const s = d.toISOString().split("T")[0];
      const e = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      const pd = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const ps = pd.toISOString().split("T")[0];
      const pe = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split("T")[0];
      return { start: s, end: e, prevStart: ps, prevEnd: pe };
    }
    case "custom":
      return { start: period.customStart || today, end: period.customEnd || today, prevStart: null, prevEnd: null };
    default:
      return { start: today, end: today, prevStart: subDays(today, 1), prevEnd: subDays(today, 1) };
  }
}

export default function PeriodSelector({ period, onChange }) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const current = PRESETS.find(p => p.key === period.key) || { label: "Custom" };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-[#1e1e1e] border border-white/10 text-xs text-slate-300 hover:border-white/20 transition-colors"
      >
        {current.label}
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-1 min-w-[170px]">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => { onChange({ key: p.key }); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${period.key === p.key ? "bg-[#C9A227]/15 text-[#C9A227]" : "text-slate-300 hover:bg-white/5"}`}
            >
              {p.label}
            </button>
          ))}
          <div className="border-t border-white/10 mt-1 pt-1 px-3 pb-2 space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide pt-1">Custom Range</p>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="w-full h-7 rounded-lg bg-[#252525] border border-white/10 text-xs text-slate-300 px-2 outline-none" />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="w-full h-7 rounded-lg bg-[#252525] border border-white/10 text-xs text-slate-300 px-2 outline-none" />
            <button
              onClick={() => { if (customStart && customEnd) { onChange({ key: "custom", customStart, customEnd }); setOpen(false); } }}
              className="w-full h-7 rounded-lg bg-[#C9A227] text-white text-xs font-medium hover:bg-[#A8841C] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}