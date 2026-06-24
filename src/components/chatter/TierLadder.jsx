import React from "react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";
import { Flame } from "lucide-react";

export default function TierLadder({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers, email }) {
  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const microcopy = () => {
    if (currentTier.index === 0) return `Missing ${missingToNext.toLocaleString()} to unlock hourly rate`;
    if (currentTier.index === 1) return `🎉 Hourly rate unlocked — ${missingToNext.toLocaleString()} to 5% commission`;
    if (currentTier.index === 2) return `🔥 5% commission active — ${missingToNext.toLocaleString()} to 10%`;
    return "🏆 Max tier — 10% commission on all payments";
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        

        
        <h3 className="text-xs font-bold text-slate-200">Today's performance</h3>
      </div>
      <p className="text-[10px] text-[#C9A227] font-medium mb-2.5 ml-8">{microcopy()}</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">Chatted</p>
          <p className="text-sm font-bold text-slate-100">{todayRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">Payout dnes</p>
          <p className={`text-sm font-bold ${payout > 0 ? "text-[#C9A227]" : "text-slate-500"}`}>{Math.round(payout).toLocaleString()}</p>
        </div>
      </div>

      {/* Tier steps */}
      <div className="flex flex-col gap-1 flex-1">
        {tiers.map((tier, i) => {
          const isActive = currentTier.index === i;
          const isCompleted = currentTier.index > i;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-all ${
              isActive ?
              "border-[#C9A227]/50 bg-[#C9A227]/10" :
              isCompleted ?
              "border-emerald-500/30 bg-emerald-500/10" :
              "border-white/8 bg-white/5"}`
              }>
              
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
              isActive ? "bg-[#C9A227] text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-500"}`
              }>
                {isCompleted ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold ${isActive ? "text-[#C9A227]" : isCompleted ? "text-emerald-400" : "text-slate-500"}`}>{tier.name}</p>
                <p className="text-[9px] text-slate-600 truncate">
                  {tier.max !== null && tier.max !== undefined ?
                  `${tier.min.toLocaleString()}–${tier.max.toLocaleString()}` :
                  `${tier.min.toLocaleString()}+`}
                  {tier.commission > 0 && ` · ${tier.commission}% commission`}
                </p>
              </div>
              {isActive && <span className="text-[8px] font-bold text-[#C9A227] bg-[#C9A227]/15 px-1 py-0.5 rounded-full">ACTIVE</span>}
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