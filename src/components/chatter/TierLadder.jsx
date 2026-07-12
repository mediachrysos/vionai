import React from "react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";
import { Flame, Wallet, TrendingUp, Check } from "lucide-react";

export default function TierLadder({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers, email }) {
  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const microcopy = () => {
    if (!nextTier) return "🏆 Max tier reached — top rate on all payments";
    if (currentTier.index === 0) return `Missing ${missingToNext.toLocaleString()} to unlock hourly rate`;
    return `🔥 ${missingToNext.toLocaleString()} more to reach "${nextTier.name}"`;
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        

        
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-100">Today's performance</h3>
          <p className="text-[11px] text-[#C9A227] font-medium truncate">{microcopy()}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-slate-500" />
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">Chatted</p>
          </div>
          <p className="text-lg font-bold text-slate-100">{todayRevenue.toLocaleString()} <span className="text-xs font-medium text-slate-500">CZK</span></p>
        </div>
        <div className="rounded-xl p-3 bg-gradient-to-br from-[#C9A227]/10 to-[#C9A227]/[0.03] border border-[#C9A227]/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet className="w-3 h-3 text-[#C9A227]/70" />
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">Payout today</p>
          </div>
          <p className={`text-lg font-bold ${payout > 0 ? "text-[#C9A227]" : "text-slate-500"}`}>{Math.round(payout).toLocaleString()} <span className="text-xs font-medium opacity-70">CZK</span></p>
        </div>
      </div>

      {/* Tier steps — vertical timeline */}
      <div className="relative flex flex-col gap-1.5 flex-1">
        {tiers.map((tier, i) => {
          const isActive = currentTier.index === i;
          const isCompleted = currentTier.index > i;
          const isLast = i === tiers.length - 1;
          return (
            <div key={i} className="relative flex items-start gap-2.5">
              {/* Connecting line */}
              {!isLast &&
              <div
                className={`absolute left-[9px] top-5 w-px h-[calc(100%-4px)] ${
                isCompleted ? "bg-emerald-500/40" : "bg-white/10"}`
                } />

              }
              <div
                className={`relative w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5 ring-4 ring-[#1e1e1e] ${
                isActive ?
                "bg-[#C9A227] text-white" :
                isCompleted ?
                "bg-emerald-500 text-white" :
                "bg-white/10 text-slate-500"}`
                }>
                
                {isCompleted ? <Check className="w-2.5 h-2.5" /> : i + 1}
              </div>
              <div
                className={`flex-1 min-w-0 flex items-center justify-between gap-2 rounded-xl px-3 py-2 border transition-all ${
                isActive ?
                "border-[#C9A227]/40 bg-gradient-to-r from-[#C9A227]/[0.12] to-transparent" :
                isCompleted ?
                "border-emerald-500/20 bg-emerald-500/5" :
                "border-white/5 bg-white/[0.02]"}`
                }>
                
                <div className="min-w-0">
                  <p className={`text-[11.5px] font-semibold truncate ${isActive ? "text-[#C9A227]" : isCompleted ? "text-emerald-400" : "text-slate-400"}`}>{tier.name}</p>
                  <p className="text-[9px] text-slate-600 truncate">
                    {tier.max !== null && tier.max !== undefined ? `${tier.min.toLocaleString()}–${tier.max.toLocaleString()}` : `${tier.min.toLocaleString()}+`}
                    {tier.commission > 0 && ` · ${tier.commission}% commission`}
                  </p>
                </div>
                {isActive && <span className="flex-shrink-0 text-[8px] font-bold text-[#C9A227] bg-[#C9A227]/15 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
              </div>
            </div>);

        })}
      </div>

      {dailyGoalEnabled && dailyGoalAmount > 0 &&
      <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Daily goal</span>
            <span className="font-semibold text-[#C9A227]">{Math.min(100, Math.round(todayRevenue / dailyGoalAmount * 100))}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
            style={{ width: `${Math.min(100, todayRevenue / dailyGoalAmount * 100)}%` }} />
          
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>{todayRevenue.toLocaleString()}</span>
            <span>{dailyGoalAmount.toLocaleString()}</span>
          </div>
        </div>
      }
    </div>);

}