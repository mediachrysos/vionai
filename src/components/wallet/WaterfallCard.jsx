import React from "react";
import { TrendingDown, TrendingUp, Building2, User } from "lucide-react";

function Row({ label, value, sublabel, icon: Icon, color = "text-gray-900", bgColor = "bg-gray-50" }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${bgColor}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor === "bg-gray-50" ? "bg-white" : "bg-white/60"}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
      <p className={`text-base font-bold ${color}`}>{value.toLocaleString("cs-CZ")} Kč</p>
    </div>
  );
}

export default function WaterfallCard({ totalIncome, totalExpenses }) {
  const grossProfit = totalIncome - totalExpenses;
  const lawyerFee = grossProfit * 0.10;
  const afterLawyer = grossProfit - lawyerFee;
  const companyReserve = afterLawyer * 0.20;
  const afterReserve = afterLawyer - companyReserve;
  const ownerPayout = afterReserve * 0.50;

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Výpočet výplat (vodopád)</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Celkové příjmy</p>
              <p className="text-xs text-gray-400">Z plateb zákazníků</p>
            </div>
          </div>
          <p className="text-base font-bold text-emerald-700">{totalIncome.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Celkové výdaje</p>
              <p className="text-xs text-gray-400">Z evidence výdajů</p>
            </div>
          </div>
          <p className="text-base font-bold text-red-600">- {totalExpenses.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
              <span className="text-sm font-bold text-[#C9A227]">=</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">Hrubý zisk</p>
          </div>
          <p className="text-base font-bold text-[#C9A227]">{grossProfit.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Building2 className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Poplatek advokátovi</p>
              <p className="text-xs text-gray-400">10 % z hrubého zisku</p>
            </div>
          </div>
          <p className="text-base font-bold text-gray-700">- {lawyerFee.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Firemní rezerva</p>
              <p className="text-xs text-gray-400">20 % ze zbytku po advokátovi</p>
            </div>
          </div>
          <p className="text-base font-bold text-blue-600">- {companyReserve.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Výplata – Já</p>
              <p className="text-xs text-gray-400">50 % z čistého zisku</p>
            </div>
          </div>
          <p className="text-base font-bold text-emerald-700">{ownerPayout.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Výplata – Maty</p>
              <p className="text-xs text-gray-400">50 % z čistého zisku</p>
            </div>
          </div>
          <p className="text-base font-bold text-emerald-700">{ownerPayout.toLocaleString("cs-CZ")} Kč</p>
        </div>
      </div>
    </div>
  );
}