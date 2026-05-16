import React, { useState } from "react";
import { Sliders } from "lucide-react";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";

export default function PayoutSimulator({ todayRevenue, hoursWorked, monthRevenue, monthlyGoalAmount, monthlyGoalEnabled, tiers }) {
  const [extraRevenue, setExtraRevenue] = useState(0);
  const [extraHours, setExtraHours] = useState(0);

  const simRevenue = todayRevenue + (Number(extraRevenue) || 0);
  const simHours = hoursWorked + (Number(extraHours) || 0);
  const { payout: simPayout, basePay: simBase, commissionPay: simComm } = calcDailyPayout(simRevenue, simHours, tiers);
  const { payout: currentPayout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const simTier = getTierForRevenue(simRevenue, tiers);
  const simNext = getNextTier(simRevenue, tiers);
  const payoutDiff = simPayout - currentPayout;

  const getTip = () => {
    const nextT = getNextTier(todayRevenue, tiers);
    if (!nextT) return "Jsi na maximálním tieru. Každá další platba jde s 10% provizí.";
    const needed = nextT.min - todayRevenue;
    return `Přidej ${needed.toLocaleString()} Kč a odemkneš tier: ${nextT.name}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-[#C9A227]" /> Payout Simulator
      </h3>
      <p className="text-xs text-gray-400 mb-4">{getTip()}</p>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Přidám revenue (Kč)</label>
          <input
            type="number"
            min={0}
            value={extraRevenue}
            onChange={e => setExtraRevenue(e.target.value)}
            className="w-full h-9 border border-gray-200 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Celkem hodin dnes</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={extraHours}
            onChange={e => setExtraHours(e.target.value)}
            className="w-full h-9 border border-gray-200 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#faf6e6] rounded-xl p-3 border border-[#e8d99a]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Sim. revenue</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{simRevenue.toLocaleString()} Kč</p>
        </div>
        <div className={`rounded-xl p-3 border ${simTier.index > 0 ? "bg-amber-50 border-[#e8d99a]" : "bg-gray-50 border-gray-100"}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tier</p>
          <p className={`text-xs font-bold mt-0.5 ${simTier.index > 0 ? "text-[#C9A227]" : "text-gray-400"}`}>{simTier.name}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-[#e8d99a]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Sim. payout</p>
          <p className="text-base font-bold text-[#C9A227] mt-0.5">{Math.round(simPayout).toLocaleString()} Kč</p>
        </div>
        <div className={`rounded-xl p-3 border ${payoutDiff > 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Přidám</p>
          <p className={`text-base font-bold mt-0.5 ${payoutDiff > 0 ? "text-emerald-600" : "text-gray-400"}`}>+{Math.round(payoutDiff).toLocaleString()} Kč</p>
        </div>
      </div>

      {simNext && (
        <p className="text-xs text-[#A8841C] mt-3 font-medium">
          → Chybí ještě {Math.max(0, simNext.min - simRevenue).toLocaleString()} Kč do dalšího tieru: <span className="font-bold">{simNext.name}</span>
        </p>
      )}
      {!simNext && simRevenue > 0 && (
        <p className="text-xs text-emerald-600 mt-3 font-medium">✓ Nejvyšší tier odemčen — 10% provize z každé platby</p>
      )}
    </div>
  );
}