import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";

export default function ShiftEditRow({ shift, dayRev, isToday }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState(shift.start_time || "");
  const [endTime, setEndTime] = useState(shift.end_time || "");
  const [note, setNote] = useState(shift.note || "");
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["all-chatter-shifts"] });
    qc.invalidateQueries({ queryKey: ["chatter-shifts", shift.chatter_email] });
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ChatterShift.update(shift.id, { start_time: startTime, end_time: endTime, note });
    setSaving(false);
    setEditing(false);
    invalidate();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this shift?")) return;
    await base44.entities.ChatterShift.delete(shift.id);
    invalidate();
  };

  if (editing) {
    return (
      <div className="px-3 py-2.5 rounded-lg border bg-[#252525] border-white/6 space-y-2">
        <p className="text-xs font-medium text-slate-200">
          {new Date(shift.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </p>
        <div className="flex items-center gap-2">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 outline-none" />
          <span className="text-slate-600 text-xs">–</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 outline-none" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note"
          className="w-full h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 outline-none placeholder:text-slate-600" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="text-xs bg-[#C9A227] hover:bg-[#A8841C] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${isToday ? "bg-amber-950/15 border-amber-700/20" : "bg-[#252525] border-white/6"}`}>
      <div>
        <p className="text-xs font-medium text-slate-200">
          {new Date(shift.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </p>
        <p className="text-[10px] text-slate-500">
          {shift.start_time || shift.end_time ? `${shift.start_time || "?"} – ${shift.end_time || "?"}` : "No time set"}
        </p>
        {shift.note && <p className="text-[10px] text-slate-500">{shift.note}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          {dayRev > 0 ? (
            <p className="text-xs font-semibold text-emerald-400">{dayRev.toLocaleString("cs-CZ")} CZK</p>
          ) : (
            <p className="text-[10px] text-slate-600">No payments</p>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isToday ? "bg-amber-800/40 text-amber-300" : "bg-emerald-900/30 text-emerald-500"}`}>
            {isToday ? "Active" : "Completed"}
          </span>
        </div>
        <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={handleDelete} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-900/40 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}