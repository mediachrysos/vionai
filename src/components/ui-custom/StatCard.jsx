import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const iconColors = [
"bg-amber-950/40 text-[#C9A227]",
"bg-amber-900/30 text-[#A8841C]",
"bg-amber-950/40 text-[#C9A227]",
"bg-amber-900/30 text-[#A8841C]",
"bg-amber-950/40 text-[#C9A227]"];


export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, colorIndex = 0 }) {
  const iconColor = iconColors[colorIndex % iconColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "bg-[#1e1e1e] rounded-2xl border border-white/10 p-5 shadow-[0_6px_20px_rgba(0,0,0,0.3)] hover:border-[#C9A227]/30 hover:shadow-[0_8px_24px_rgba(201,162,39,0.12)] transition-all duration-200",
        className
      )}>
      
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-bold text-[#C9A227] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {trend &&
          <div className={cn(
            "inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-md",
            trendUp ? "bg-emerald-950/50 text-emerald-400" : "bg-red-950/50 text-red-400"
          )}>
              {trendUp ? "↑" : "↓"} {trend}
            </div>
          }
        </div>
        



        
      </div>
    </motion.div>);

}