import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
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
          <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    </motion.div>
  );
}