import React from "react";
import { cn } from "@/lib/utils";

const typeColors = {
  Reels: "bg-purple-950/50 text-purple-300",
  Post: "bg-blue-950/50 text-blue-300",
  Story: "bg-pink-950/50 text-pink-300",
};

const statusDot = {
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
  edit_requested: "bg-orange-400",
  submitted: "bg-amber-400",
  not_started: "bg-gray-300",
};

const priorityDot = {
  urgent: "🔴",
  high: "🟠",
};


export default function DayCard({ dayName, tasks = [], submission, onClick, isToday, isDraft, graphicRequests = [] }) {
  const taskSubMap = {};
  (submission?.task_submissions || []).forEach(ts => { taskSubMap[ts.task_idx] = ts; });

  const allStatuses = tasks.map((_, i) => taskSubMap[i]?.status || "not_started");
  const hasAny = allStatuses.some(s => s !== "not_started");
  const done = allStatuses.filter(s => s === "approved").length;
  const total = tasks.length;
  const remaining = total - done;
  const urgentCount = tasks.filter(t => t.priority === "urgent").length;
  const highCount = tasks.filter(t => t.priority === "high").length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-[#1e1e1e]",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-900/30" : "border-white/10",
        hasAny && "border-amber-700/40"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-[#C9A227]" : "text-slate-500")}>
          {isToday ? "Today · " : ""}{dayName}
        </p>
        {isDraft && tasks.length > 0 && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-700/30">NÁVRH</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-600 italic">No tasks</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-slate-100">{remaining}</span>
              <span className="text-xs text-slate-500 leading-tight">remaining<br/>tasks</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-600 font-semibold">{done}/{total}</span>
              <p className="text-[10px] text-slate-500">done</p>
            </div>
          </div>
          {(urgentCount > 0 || highCount > 0) && (
            <div className="flex gap-1 flex-wrap">
              {urgentCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 border border-red-700/30">
                  🔴 {urgentCount} urgent
                </span>
              )}
              {highCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-950/50 text-orange-400 border border-orange-700/30">
                  🟠 {highCount} high
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Graphic requests badge */}
      {graphicRequests.length > 0 && (
        <div className={cn("mt-2 flex gap-1 flex-wrap", tasks.length === 0 && "mt-0")}>
          {graphicRequests.filter(r => r.content_type === "video").length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#faf6e6] text-[#A8841C] border border-[#e8d99a]">
              🎬 {graphicRequests.filter(r => r.content_type === "video").length} video
            </span>
          )}
          {graphicRequests.filter(r => r.content_type === "photo").length > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              📷 {graphicRequests.filter(r => r.content_type === "photo").length} foto
            </span>
          )}
        </div>
      )}
    </button>
  );
}