import React from "react";
import { cn } from "@/lib/utils";

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
};

export default function DayCard({ dayName, tasks = [], submission, onClick, isToday }) {
  const hasSubmitted = !!submission?.submitted_link;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 bg-white",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-100" : "border-gray-200",
        hasSubmitted && "border-emerald-200"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", isToday ? "text-[#C9A227]" : "text-gray-400")}>
          {isToday ? "Today · " : ""}{dayName}
        </p>
        {hasSubmitted && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
            Submitted
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-gray-300 italic">No tasks</p>
      ) : (
        <div className="flex flex-wrap gap-1 mt-1">
          {tasks.map((task, i) => {
            const label = task.type === "custom" ? (task.customType || "Custom") : task.type;
            const colorClass = typeColors[task.type] || "bg-amber-100 text-amber-700";
            return (
              <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
                {label}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}