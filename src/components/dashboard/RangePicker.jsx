import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const PRESETS = [
  { label: "Yesterday", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split("T")[0]; return { from: s, to: s }; } },
  { label: "Last 7 days", getValue: () => { const to = new Date().toISOString().split("T")[0]; const from = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]; return { from, to }; } },
  { label: "This month", getValue: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]; const to = now.toISOString().split("T")[0]; return { from, to }; } },
  { label: "Last month", getValue: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]; const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]; return { from, to }; } },
  { label: "Last 30 days", getValue: () => { const to = new Date().toISOString().split("T")[0]; const from = new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0]; return { from, to }; } },
];

export { PRESETS };

export default function RangePicker({ range, activePreset, onPreset, onDateChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDate = (d) => d ? format(new Date(d), "d. M. yyyy", { locale: cs }) : "—";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${open ? "border-[#C9A227]/60 bg-[#252525]" : "border-white/10 bg-[#252525] hover:border-[#C9A227]/40"}`}
      >
        <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_3_qncd5u.png" alt="" className="w-4 h-4 object-contain" />
        <span className="text-slate-300 text-xs">
          {activePreset ? activePreset : `${formatDate(range.from)} – ${formatDate(range.to)}`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl p-4 w-64">
          {/* Presets */}
          <div className="flex flex-col gap-0.5 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => { onPreset(p); setOpen(false); }}
                className={`text-xs text-left px-3 py-2 rounded-lg transition-all ${
                  activePreset === p.label
                    ? "bg-[#C9A227] text-white font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-[#C9A227]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">Custom range</p>
            <div className="flex flex-col gap-2">
              <DatePicker value={range.from} onChange={v => { onDateChange("from", v); }} placeholder="Od" />
              <DatePicker value={range.to} onChange={v => { onDateChange("to", v); }} placeholder="Do" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}