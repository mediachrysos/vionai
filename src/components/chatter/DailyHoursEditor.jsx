import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

export default function DailyHoursEditor({ email }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [value, setValue] = useState("");

  const { data: perf = [] } = useQuery({
    queryKey: ["chatter-daily-perf", email],
    queryFn: () => base44.entities.ChatterDailyPerformance.filter({ chatter_email: email }, "-date", 30),
    enabled: !!email,
    staleTime: 15000,
  });

  const startEdit = (p) => {
    setEditingId(p.id);
    setValue(String(p.hours_worked || 0));
  };

  const saveHours = async (p) => {
    const hours = parseFloat(value);
    if (isNaN(hours) || hours < 0) return;
    await base44.entities.ChatterDailyPerformance.update(p.id, { hours_worked: hours });
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["chatter-daily-perf", email] });
  };

  return (
    <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-slate-200 mb-4">Daily Hours Worked</h2>
      {perf.length === 0 ? (
        <p className="text-xs text-slate-600">No hours data available</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {perf.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#252525] border border-white/6">
              <p className="text-xs font-medium text-slate-200">
                {new Date(p.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              {editingId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                    className="w-16 h-7 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 outline-none"
                  />
                  <button onClick={() => saveHours(p)} className="w-6 h-6 rounded-lg bg-[#C9A227] hover:bg-[#A8841C] flex items-center justify-center text-white flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(p)} className="text-xs font-semibold text-slate-300 hover:text-[#C9A227] transition-colors">
                  {(p.hours_worked || 0).toFixed(2)}h
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}