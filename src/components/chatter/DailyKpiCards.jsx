import React from "react";
import { TrendingUp, Zap, Target, DollarSign } from "lucide-react";
import { getTierForRevenue, getNextTier, calcDailyPayout } from "./tierUtils";

const BADGE_STYLES = {
  0: "bg-gray-100 text-gray-500",
  1: "bg-amber-50 text-[#C9A227] border border-[#e8d99a]",
  2: "bg-amber-100 text-amber-700 border border-amber-300",
  3: "bg-yellow-100 text-yellow-700 border border-yellow-400",
};

const BADGE_LABELS = ["Under 2k", "Hourly unlocked", "5% unlocked", "10% unlocked"];

export default function DailyKpiCards({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers }) {
  const tier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout, basePay, commissionPay } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;
  const goalPct = dailyGoalEnabled && dailyGoalAmount > 0 ? Math.min(100, Math.round((todayRevenue / dailyGoalAmount) * 100)) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* A: Dnes vychatováno */}
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Dnes vychatováno</span>
          <TrendingUp className="w-4 h-4 text-[#C9A227]" />
        </div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{todayRevenue.toLocaleString()} <span className="text-base font-semibold text-gray-400">Kč</span></div>
        <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[tier.index]}`}>{BADGE_LABELS[tier.index]}</span>
        {goalPct !== null && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Denní cíl</span><span>{goalPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* B: Aktuální tier */}
      <div className={`bg-white rounded-2xl border shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-2 ${tier.index > 0 ? "border-[#e8d99a]" : "border-[#ececec]"}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Aktuální tier</span>
          <Zap className="w-4 h-4 text-[#C9A227]" />
        </div>
        <div className={`text-xl font-bold tabular-nums leading-tight ${tier.index > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{tier.name}</div>
        {tier.index === 0 ? (
          <p className="text-[10px] text-gray-400 leading-snug">Výplata se aktivuje od 2 000 Kč</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tier.hourly > 0 && <span className="text-[10px] bg-amber-50 text-[#C9A227] border border-[#e8d99a] px-2 py-0.5 rounded-full font-semibold">{tier.hourly} Kč/h</span>}
            {tier.commission > 0 && <span className="text-[10px] bg-amber-50 text-[#C9A227] border border-[#e8d99a] px-2 py-0.5 rounded-full font-semibold">{tier.commission}% provize</span>}
          </div>
        )}
      </div>

      {/* C: Chybí do další hranice */}
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Další hranice</span>
          <Target className="w-4 h-4 text-[#C9A227]" />
        </div>
        {nextTier ? (
          <>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{missingToNext.toLocaleString()} <span className="text-base font-semibold text-gray-400">Kč</span></div>
            <p className="text-[10px] text-gray-500">do odemčení <span className="font-semibold text-[#C9A227]">{nextTier.name}</span></p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full" style={{ width: `${Math.round((todayRevenue / nextTier.min) * 100)}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="text-xl font-bold text-emerald-500">🏆 Max tier</div>
            <p className="text-[10px] text-gray-400">Nejvyšší denní tier odemčen</p>
          </>
        )}
      </div>

      {/* D: Dnešní odhadovaná výplata */}
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Dnešní výplata</span>
          <DollarSign className="w-4 h-4 text-[#C9A227]" />
        </div>
        <div className={`text-2xl font-bold tabular-nums ${payout > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{Math.round(payout).toLocaleString()} <span className="text-base font-semibold">Kč</span></div>
        {payout > 0 ? (
          <div className="space-y-0.5">
            {basePay > 0 && <p className="text-[10px] text-gray-400">{hoursWorked}h × {tier.hourly} Kč = <span className="font-semibold text-gray-600">{Math.round(basePay).toLocaleString()} Kč</span></p>}
            {commissionPay > 0 && <p className="text-[10px] text-gray-400">{tier.commission}% z {todayRevenue.toLocaleString()} Kč = <span className="font-semibold text-gray-600">{Math.round(commissionPay).toLocaleString()} Kč</span></p>}
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 leading-snug">Výplata se aktivuje od 2 000 Kč daily revenue.</p>
        )}
      </div>
    </div>
  );
}