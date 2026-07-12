import React from "react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";

export default function TierLadder({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers, email }) {
  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const microcopy = () => {
    if (!nextTier) return "Max tier reached — top rate on all payments";
    if (currentTier.index === 0) return `Missing ${missingToNext.toLocaleString()} to unlock hourly rate`;
    return `${missingToNext.toLocaleString()} more to reach "${nextTier.name}"`;
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Today's performance</h3>
        <p className="text-[11px] text-slate-500 mt-0.5">{microcopy()}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl px-3 py-2.5 bg-white/[0.03]">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Chatted</p>
          <p className="text-base font-semibold text-slate-100">{todayRevenue.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">CZK</span></p>
        </div>
        <div className="rounded-xl px-3 py-2.5 bg-white/[0.03]">
          <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Payout today</p>
          <p className={`text-base font-semibold ${payout > 0 ? "text-[#C9A227]" : "text-slate-500"}`}>{Math.round(payout).toLocaleString()} <span className="text-[11px] font-normal opacity-70">CZK</span></p>
        </div>
      </div>

      {/* Tier steps */}
      <div className="flex flex-col gap-1.5 flex-1">
        {tiers.map((tier, i) => {
          const isActive = currentTier.index === i;
          const isCompleted = currentTier.index > i;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
                isActive ? "bg-[#C9A227]/10" : "bg-white/[0.02]"
              }`}
            >
              <span className={`text-[10px] font-semibold w-4 text-center ${isActive ? "text-[#C9A227]" : isCompleted ? "text-slate-400" : "text-slate-600"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-[11.5px] font-medium truncate ${isActive ? "text-[#C9A227]" : "text-slate-400"}`}>{tier.name}</p>
                <p className="text-[9px] text-slate-600 truncate">
                  {tier.max !== null && tier.max !== undefined ? `${tier.min.toLocaleString()}–${tier.max.toLocaleString()}` : `${tier.min.toLocaleString()}+`}
                  {tier.commission > 0 && ` · ${tier.commission}% commission`}
                </p>
              </div>
              {isActive && <span className="flex-shrink-0 text-[8px] font-semibold text-[#C9A227] bg-[#C9A227]/15 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
            </div>
          );
        })}
      </div>

      {dailyGoalEnabled && dailyGoalAmount > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Daily goal</span>
            <span className="font-semibold text-[#C9A227]">{Math.min(100, Math.round((todayRevenue / dailyGoalAmount) * 100))}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A227] rounded-full transition-all"
              style={{ width: `${Math.min(100, (todayRevenue / dailyGoalAmount) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>{todayRevenue.toLocaleString()}</span>
            <span>{dailyGoalAmount.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}