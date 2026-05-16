import React from "react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";
import { Clock } from "lucide-react";

export default function TierLadder({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers }) {
  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const microcopy = () => {
    if (currentTier.index === 0) return `Ještě nejsi ve výplatním tieru. Chybí ti ${missingToNext.toLocaleString()} Kč do aktivace hodinovky.`;
    if (currentTier.index === 1) return `Hodinovka je odemčená 🎉 Chybí ti ${missingToNext.toLocaleString()} Kč do 5% provize.`;
    if (currentTier.index === 2) return `5% provize je odemčená 🔥 Chybí ti ${missingToNext.toLocaleString()} Kč do 10% provize.`;
    return "Nejvyšší denní tier odemčen 🏆 Každá další platba dnes jede s 10% provizí.";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#C9A227]" /> Dnešní výkonnost
      </h3>
      <p className="text-xs text-[#C9A227] font-medium mb-5">{microcopy()}</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Vychatováno</p>
          <p className="text-lg font-bold text-gray-900">{todayRevenue.toLocaleString()} Kč</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Odpracováno</p>
          <p className="text-lg font-bold text-gray-900">{hoursWorked} h</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Aktuální tier</p>
          <p className={`text-sm font-bold ${currentTier.index > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{currentTier.name}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Payout dnes</p>
          <p className={`text-lg font-bold ${payout > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{Math.round(payout).toLocaleString()} Kč</p>
        </div>
      </div>

      {/* Tier ladder */}
      <div className="flex flex-col sm:flex-row gap-2">
        {tiers.map((tier, i) => {
          const isActive = currentTier.index === i;
          const isCompleted = currentTier.index > i;
          const isNext = nextTier?.index === i;
          return (
            <div
              key={i}
              className={`flex-1 rounded-xl border p-3 transition-all ${
                isActive
                  ? "border-[#C9A227] bg-gradient-to-b from-[#faf6e6] to-[#fdf9ee] shadow-[0_0_0_2px_#C9A22720]"
                  : isCompleted
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-gray-100 bg-gray-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#C9A227]" : isCompleted ? "text-emerald-600" : "text-gray-400"}`}>
                  {isCompleted ? "✓ Done" : isActive ? "● Aktivní" : isNext ? "Další" : "Locked"}
                </span>
                {tier.max !== null && tier.max !== undefined ? (
                  <span className="text-[9px] text-gray-400">{tier.min.toLocaleString()}–{tier.max.toLocaleString()} Kč</span>
                ) : (
                  <span className="text-[9px] text-gray-400">{tier.min.toLocaleString()}+ Kč</span>
                )}
              </div>
              <p className={`text-xs font-semibold leading-snug ${isActive ? "text-[#A8841C]" : isCompleted ? "text-emerald-700" : "text-gray-500"}`}>{tier.name}</p>
              {tier.commission > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">{tier.commission}% provize</p>
              )}
            </div>
          );
        })}
      </div>

      {dailyGoalEnabled && dailyGoalAmount > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Denní cíl: {dailyGoalAmount.toLocaleString()} Kč</span>
            <span>{Math.min(100, Math.round((todayRevenue / dailyGoalAmount) * 100))}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
              style={{ width: `${Math.min(100, (todayRevenue / dailyGoalAmount) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}