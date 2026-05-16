import React from "react";
import { Banknote } from "lucide-react";
import { calcDailyPayout, groupPaymentsByDate } from "./tierUtils";

export default function MonthlyPayoutCard({
  monthPayments, totalPaidOut, monthlyBonusEnabled, monthlyBonusAmount,
  monthlyBonusConditionRevenue, hoursMap, tiers
}) {
  const dayGroups = groupPaymentsByDate(monthPayments);

  let totalBasePay = 0;
  let totalCommissionPay = 0;
  let totalRevenue = 0;

  dayGroups.forEach((day) => {
    const hours = hoursMap?.[day.date] || 0;
    const { basePay, commissionPay } = calcDailyPayout(day.revenue, hours, tiers);
    totalBasePay += basePay;
    totalCommissionPay += commissionPay;
    totalRevenue += day.revenue;
  });

  const bonusUnlocked = monthlyBonusEnabled && monthlyBonusAmount > 0 && totalRevenue >= monthlyBonusConditionRevenue;
  const estimatedPayout = totalBasePay + totalCommissionPay + (bonusUnlocked ? monthlyBonusAmount : 0);
  const toPay = Math.max(0, estimatedPayout - (totalPaidOut || 0));

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-sm p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">Výplata tento měsíc</h3>
      </div>

      {/* Revenue + breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-[#faf6e6] to-[#fffdf5] rounded-2xl p-4 border border-[#e8d99a]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Celková revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Kč</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Base pay (hodiny)</p>
          <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{Math.round(totalBasePay).toLocaleString()}</p>
          <p className="text-xs text-gray-400">Kč</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Provize (denní)</p>
          <p className="text-xl font-bold text-gray-800 mt-1 tabular-nums">{Math.round(totalCommissionPay).toLocaleString()}</p>
          <p className="text-xs text-gray-400">Kč</p>
        </div>
      </div>

      {/* Bonus */}
      {monthlyBonusEnabled && monthlyBonusAmount > 0 && (
        <div className={`rounded-xl p-3 mb-4 border flex items-center justify-between ${bonusUnlocked ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Měsíční bonus</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{monthlyBonusAmount.toLocaleString()} Kč</p>
          </div>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${bonusUnlocked ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
            {bonusUnlocked ? "✓ Odemčeno" : `Chybí ${(monthlyBonusConditionRevenue - totalRevenue).toLocaleString()} Kč`}
          </span>
        </div>
      )}

      {/* Summary: 3 big pillars */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 bg-amber-50 border border-[#e8d99a] text-center">
          <p className="text-[10px] text-amber-700/60 uppercase tracking-wide font-medium">Earned</p>
          <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{Math.round(estimatedPayout).toLocaleString()}</p>
          <p className="text-[10px] text-amber-600/60 mt-0.5">Kč</p>
        </div>
        <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-[10px] text-emerald-700/60 uppercase tracking-wide font-medium">Vyplaceno</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{(totalPaidOut || 0).toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600/60 mt-0.5">Kč</p>
        </div>
        <div className={`rounded-2xl p-4 border text-center ${toPay > 0 ? "bg-rose-50 border-rose-200" : "bg-gray-50 border-gray-100"}`}>
          <p className={`text-[10px] uppercase tracking-wide font-medium ${toPay > 0 ? "text-rose-600/70" : "text-gray-400"}`}>K výplatě</p>
          <p className={`text-xl font-bold mt-1 tabular-nums ${toPay > 0 ? "text-rose-600" : "text-gray-400"}`}>{Math.round(toPay).toLocaleString()}</p>
          <p className={`text-[10px] mt-0.5 ${toPay > 0 ? "text-rose-500/60" : "text-gray-400"}`}>Kč</p>
        </div>
      </div>
    </div>
  );
}