import React from "react";
import { cn } from "@/lib/utils";

const statusConfig = {
  not_started: { label: "Not started", className: "bg-gray-100 text-gray-500" },
  submitted: { label: "Pending review", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-600" },
};

export default function DayCard({ dayName, dayShort, taskTitle, taskDesc, submission, onClick, isToday }) {
  const status = submission?.status || "not_started";
  const cfg = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        isToday ? "border-[#C9A227] shadow-sm shadow-amber-100" : "border-gray-200 bg-white",
        status === "approved" && "border-emerald-200 bg-emerald-50/30",
        status === "rejected" && "border-red-200 bg-red-50/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-wide mb-0.5", isToday ? "text-[#C9A227]" : "text-gray-400")}>
            {isToday ? "Today · " : ""}{dayName}
          </p>
          <p className="text-sm font-semibold text-gray-800 leading-snug">
            {taskTitle || <span className="text-gray-300 italic">No task assigned</span>}
          </p>
        </div>
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full flex-shrink-0", cfg.className)}>
          {cfg.label}
        </span>
      </div>
      {taskDesc && (
        <p className="text-xs text-gray-400 line-clamp-2">{taskDesc}</p>
      )}
      {status === "rejected" && submission?.admin_note && (
        <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1">
          ⚠ {submission.admin_note}
        </p>
      )}
    </button>
  );
}