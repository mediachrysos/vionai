import React from "react";
import { DollarSign } from "lucide-react";
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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-[#C9A227]" /> Výplata tento měsíc
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-[#faf6e6] rounded-xl p-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Celková revenue</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{totalRevenue.toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Base pay (hodiny)</p>
          <p className="text-base font-bold text-gray-800 mt-0.5">{Math.round(totalBasePay).toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Provize (denní)</p>
          <p className="text-base font-bold text-gray-800 mt-0.5">{Math.round(totalCommissionPay).toLocaleString()} Kč</p>
        </div>
      </div>

      {monthlyBonusEnabled && monthlyBonusAmount > 0 && (
        <div className={`rounded-xl p-3 mb-4 border ${bonusUnlocked ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Měsíční bonus</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">{monthlyBonusAmount.toLocaleString()} Kč</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bonusUnlocked ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
              {bonusUnlocked ? "✓ Odemčeno" : `Chybí ${(monthlyBonusConditionRevenue - totalRevenue).toLocaleString()} Kč`}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Vyplaceno</p>
          <p className="text-base font-bold text-emerald-700 mt-0.5">{(totalPaidOut || 0).toLocaleString()} Kč</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 border border-[#e8d99a]">
          <p className="text-[10px] text-[#A8841C] uppercase tracking-wide">K výplatě</p>
          <p className="text-base font-bold text-[#C9A227] mt-0.5">{Math.round(toPay).toLocaleString()} Kč</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Odhad celkem</p>
          <p className="text-base font-bold text-gray-800 mt-0.5">{Math.round(estimatedPayout).toLocaleString()} Kč</p>
        </div>
      </div>
    </div>
  );
}