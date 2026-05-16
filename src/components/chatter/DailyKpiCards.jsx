import React from "react";
import { TrendingUp, Zap, Target, Wallet } from "lucide-react";
import { getTierForRevenue, getNextTier, calcDailyPayout } from "./tierUtils";

export default function DailyKpiCards({ todayRevenue, hoursWorked, dailyGoalAmount, dailyGoalEnabled, tiers }) {
  const tier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout, basePay, commissionPay } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;
  const goalPct = dailyGoalEnabled && dailyGoalAmount > 0 ? Math.min(100, Math.round(todayRevenue / dailyGoalAmount * 100)) : null;

  const cards = [
  {
    label: "Dnes vychatováno",
    value: todayRevenue.toLocaleString(),
    unit: "Kč",
    icon: TrendingUp,
    accent: "#C9A227",
    bg: "from-[#fffbee] to-white",
    border: "border-[#e8d99a]",
    sub: goalPct !== null ?
    <div className="mt-2">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Denní cíl</span><span>{goalPct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all" style={{ width: `${goalPct}%` }} />
          </div>
        </div> :

    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${tier.index > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
          {tier.index === 0 ? "Pod minimem" : tier.index === 1 ? "Tier 1 aktivní" : tier.index === 2 ? "Tier 2 aktivní" : "Max tier 🏆"}
        </span>

  },
  {
    label: "Aktuální tier",
    value: tier.name,
    unit: null,
    icon: Zap,
    accent: tier.index > 0 ? "#C9A227" : "#9ca3af",
    bg: tier.index > 0 ? "from-[#fffbee] to-white" : "from-gray-50 to-white",
    border: tier.index > 0 ? "border-[#e8d99a]" : "border-gray-200",
    sub: tier.index === 0 ?
    <p className="text-[10px] text-gray-400 mt-1">Aktivuje se od 2 000 Kč</p> :

    <div className="flex flex-wrap gap-1 mt-1">
          {tier.hourly > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{tier.hourly} Kč/h</span>}
          {tier.commission > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{tier.commission}% provize</span>}
        </div>

  },
  {
    label: "Další hranice",
    value: nextTier ? missingToNext.toLocaleString() : "MAX",
    unit: nextTier ? "Kč" : null,
    icon: Target,
    accent: "#6366f1",
    bg: "from-indigo-50/50 to-white",
    border: "border-indigo-100",
    sub: nextTier ?
    <div className="mt-2">
          <p className="text-[10px] text-gray-400 mb-1">do <span className="font-semibold text-indigo-500">{nextTier.name}</span></p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" style={{ width: `${Math.round(todayRevenue / nextTier.min * 100)}%` }} />
          </div>
        </div> :

    <p className="text-[10px] text-emerald-500 mt-1">Nejvyšší tier odemčen 🏆</p>

  },
  {
    label: "Dnešní výplata",
    value: Math.round(payout).toLocaleString(),
    unit: "Kč",
    icon: Wallet,
    accent: payout > 0 ? "#10b981" : "#9ca3af",
    bg: payout > 0 ? "from-emerald-50/60 to-white" : "from-gray-50 to-white",
    border: payout > 0 ? "border-emerald-200" : "border-gray-200",
    sub: payout > 0 ?
    <div className="space-y-0.5 mt-1">
          {basePay > 0 && <p className="text-[10px] text-gray-400">{hoursWorked}h × {tier.hourly} Kč = <span className="font-semibold text-gray-600">{Math.round(basePay).toLocaleString()} Kč</span></p>}
          {commissionPay > 0 && <p className="text-[10px] text-gray-400">{tier.commission}% provize = <span className="font-semibold text-gray-600">{Math.round(commissionPay).toLocaleString()} Kč</span></p>}
        </div> :

    <p className="text-[10px] text-gray-400 mt-1">Od 2 000 Kč/den</p>

  }];


  return null;
























}