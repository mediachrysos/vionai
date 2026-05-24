import React from "react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";
import { Flame } from "lucide-react";
import WorkSessionWidget from "./WorkSessionWidget";

export default function TierLadder({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers, email }) {
  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const microcopy = () => {
    if (currentTier.index === 0) return `Chybí ${missingToNext.toLocaleString()} Kč do aktivace hodinovky`;
    if (currentTier.index === 1) return `🎉 Hodinovka odemčena — ${missingToNext.toLocaleString()} Kč do 5% provize`;
    if (currentTier.index === 2) return `🔥 5% provize aktivní — ${missingToNext.toLocaleString()} Kč do 10%`;
    return "🏆 Maximální tier — 10% provize z každé platby";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-sm p-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
          <Flame className="w-3 h-3 text-[#C9A227]" />
        </div>
        <h3 className="text-xs font-bold text-gray-800">Dnešní výkonnost</h3>
      </div>
      <p className="text-[10px] text-[#C9A227] font-medium mb-2.5 ml-8">{microcopy()}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Vychatováno</p>
          <p className="text-sm font-bold text-gray-900">{todayRevenue.toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">Payout dnes</p>
          <p className={`text-sm font-bold ${payout > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{Math.round(payout).toLocaleString()} Kč</p>
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
              "border-[#C9A227] bg-gradient-to-r from-[#faf6e6] to-[#fffdf5] shadow-[0_0_0_1px_#C9A22720]" :
              isCompleted ?
              "border-emerald-200 bg-emerald-50/40" :
              "border-gray-100 bg-gray-50/50"}`
              }>
              
              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
              isActive ? "bg-[#C9A227] text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"}`
              }>
                {isCompleted ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold ${isActive ? "text-[#A8841C]" : isCompleted ? "text-emerald-700" : "text-gray-400"}`}>{tier.name}</p>
                <p className="text-[9px] text-gray-400 truncate">
                  {tier.max !== null && tier.max !== undefined ? `${tier.min.toLocaleString()}–${tier.max.toLocaleString()} Kč` : `${tier.min.toLocaleString()}+ Kč`}
                  {tier.commission > 0 && ` · ${tier.commission}% provize`}
                </p>
              </div>
              {isActive && <span className="text-[8px] font-bold text-[#C9A227] bg-[#C9A227]/10 px-1 py-0.5 rounded-full">AKTIVNÍ</span>}
            </div>);

        })}
      </div>

      {dailyGoalEnabled && dailyGoalAmount > 0 &&
      <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Denní cíl</span>
            <span className="font-semibold">{Math.min(100, Math.round(todayRevenue / dailyGoalAmount * 100))}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
            style={{ width: `${Math.min(100, todayRevenue / dailyGoalAmount * 100)}%` }} />
          
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{todayRevenue.toLocaleString()} Kč</span>
            <span>{dailyGoalAmount.toLocaleString()} Kč</span>
          </div>
        </div>
      }
    </div>);

}