import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white rounded-xl border border-slate-200/60 p-5 hover:shadow-md transition-shadow duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
              trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-indigo-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}