import React from "react";
import { cn } from "@/lib/utils";

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
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
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-white",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-100" : "border-gray-200",
        hasAny && "border-amber-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-[#C9A227]" : "text-gray-400")}>
          {isToday ? "Today · " : ""}{dayName}
        </p>
        {isDraft && tasks.length > 0 && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">NÁVRH</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-gray-300 italic">No tasks</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-gray-800">{remaining}</span>
              <span className="text-xs text-gray-400 leading-tight">remaining<br/>tasks</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-600 font-semibold">{done}/{total}</span>
              <p className="text-[10px] text-gray-400">done</p>
            </div>
          </div>
          {(urgentCount > 0 || highCount > 0) && (
            <div className="flex gap-1 flex-wrap">
              {urgentCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  🔴 {urgentCount} urgent
                </span>
              )}
              {highCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
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