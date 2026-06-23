import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function KpiCard({ label, value, sub, trend, trendLabel, highlight = false }) {
  const trendIcon = trend > 0
    ? <TrendingUp className="w-3 h-3 text-emerald-400" />
    : trend < 0
    ? <TrendingDown className="w-3 h-3 text-red-400" />
    : <Minus className="w-3 h-3 text-slate-500" />;

  const trendColor = trend > 0 ? "text-emerald-400" : trend < 0 ? "text-red-400" : "text-slate-500";

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1.5 ${highlight ? "bg-[#C9A227]/10 border-[#C9A227]/30" : "bg-[#1e1e1e] border-white/8"}`}>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-xl font-bold leading-tight ${highlight ? "text-[#C9A227]" : "text-white"}`}>{value}</span>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
      {trendLabel && (
        <div className={`flex items-center gap-1 text-[10px] font-medium ${trendColor}`}>
          {trend !== null && trendIcon}
          {trendLabel}
        </div>
      )}
    </div>
  );
}