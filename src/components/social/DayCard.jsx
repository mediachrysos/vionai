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

export default function DayCard({ dayName, tasks = [], submission, onClick, isToday }) {
  const taskSubMap = {};
  (submission?.task_submissions || []).forEach(ts => { taskSubMap[ts.task_idx] = ts; });

  const allStatuses = tasks.map((_, i) => taskSubMap[i]?.status || "not_started");
  const hasAny = allStatuses.some(s => s !== "not_started");
  const done = allStatuses.filter(s => s === "approved").length;
  const total = tasks.length;
  const remaining = total - done;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-white",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-100" : "border-gray-200",
        hasAny && "border-amber-200"
      )}
    >
      <p className={cn("text-xs font-semibold uppercase tracking-wide mb-3", isToday ? "text-[#C9A227]" : "text-gray-400")}>
        {isToday ? "Today · " : ""}{dayName}
      </p>

      {tasks.length === 0 ? (
        <p className="text-xs text-gray-300 italic">No tasks</p>
      ) : (
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
      )}
    </button>
  );
}