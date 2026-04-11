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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-white",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-100" : "border-gray-200",
        hasAny && "border-amber-200"
      )}
    >
      <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", isToday ? "text-[#C9A227]" : "text-gray-400")}>
        {isToday ? "Today · " : ""}{dayName}
      </p>

      {tasks.length === 0 ? (
        <p className="text-xs text-gray-300 italic">No tasks</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task, i) => {
            const label = task.type === "custom" ? (task.customType || "Custom") : task.type;
            const colorClass = typeColors[task.type] || "bg-amber-100 text-amber-700";
            const st = allStatuses[i];
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>{label}</span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[st] || "bg-gray-300"}`} />
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}