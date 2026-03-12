import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const iconColors = [
  "bg-indigo-50 text-indigo-500",
  "bg-violet-50 text-violet-500",
  "bg-blue-50 text-blue-500",
  "bg-purple-50 text-purple-500",
  "bg-indigo-50 text-indigo-400",
];

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, colorIndex = 0 }) {
  const iconColor = iconColors[colorIndex % iconColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "bg-white rounded-2xl border border-gray-100/80 p-5 shadow-sm shadow-gray-100 hover:border-violet-100 hover:shadow-md hover:shadow-violet-50/60 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-md",
              trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
    </motion.div>
  );
}