import React, { useState } from "react";
import { TrendingDown, TrendingUp, Building2, User, ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];


function Row({ label, value, sublabel, icon: Icon, color = "text-gray-900", bgColor = "bg-gray-50", prefix = "" }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${bgColor}`}>
      <div className="flex items-center gap-3">
        

        
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
      <p className={`text-base font-bold ${color}`}>{prefix}{value.toLocaleString("cs-CZ")} Kč</p>
    </div>);

}

export default function WaterfallCard({ payments = [], expenses = [], walletTxs = [] }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else
    setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else
    setViewMonth((m) => m + 1);
  };

  // Filter data for selected month
  const monthPayments = payments.filter((p) => {
    const d = p.payment_date || p.created_date?.split("T")[0] || "";
    return d.startsWith(monthStr) && p.status !== "failed" && p.status !== "refunded";
  });

  const monthExpenses = expenses.filter((e) => {
    const d = e.expense_date || e.created_date?.split("T")[0] || "";
    return d.startsWith(monthStr);
  });

  const monthWalletTxs = walletTxs.filter((t) => {
    const d = t.transaction_date || t.created_date?.split("T")[0] || "";
    return d.startsWith(monthStr);
  });

  const totalIncome =
  monthPayments.reduce((s, p) => s + (p.amount || 0), 0) +
  monthWalletTxs.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpenses =
  monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
  monthWalletTxs.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const grossProfit = totalIncome - totalExpenses;
  const lawyerFee = Math.max(0, grossProfit) * 0.10;
  const afterLawyer = Math.max(0, grossProfit) - lawyerFee;
  const companyReserve = afterLawyer * 0.20;
  const afterReserve = afterLawyer - companyReserve;
  const ownerPayout = afterReserve * 0.50;

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
      {/* Header with month switcher */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Výpočet výplat</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-xs font-semibold text-gray-700 min-w-[110px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-3">
            

            
            <div>
              <p className="text-sm font-medium text-gray-800">Celkové příjmy</p>
              <p className="text-xs text-gray-400">Platby + manuální příjmy</p>
            </div>
          </div>
          <p className="text-base font-bold text-emerald-700">{totalIncome.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50">
          <div className="flex items-center gap-3">
            

            
            <div>
              <p className="text-sm font-medium text-gray-800">Celkové výdaje</p>
              <p className="text-xs text-gray-400">Výdaje + manuální výdaje</p>
            </div>
          </div>
          <p className="text-base font-bold text-red-600">- {totalExpenses.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50">
          <div className="flex items-center gap-3">
            

            
            <p className="text-sm font-semibold text-gray-800">Hrubý zisk</p>
          </div>
          <p className={`text-base font-bold ${grossProfit >= 0 ? "text-[#C9A227]" : "text-red-600"}`}>
            {grossProfit.toLocaleString("cs-CZ")} Kč
          </p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <Row label="Výplata PD" sublabel="10 % z hrubého zisku" icon={Building2} color="text-gray-700" bgColor="bg-gray-50" prefix="- " value={lawyerFee} />
        <Row label="Firemní rezerva" sublabel="20 % ze zbytku po advokátovi" icon={Building2} color="text-blue-600" bgColor="bg-gray-50" prefix="- " value={companyReserve} />

        <div className="border-t border-dashed border-gray-200 my-1" />

        <Row label="Výplata – Já" sublabel="50 % z čistého zisku" icon={User} color="text-emerald-600" bgColor="bg-emerald-50" value={ownerPayout} />
        <Row label="Výplata – Maty" sublabel="50 % z čistého zisku" icon={User} color="text-emerald-600" bgColor="bg-emerald-50" value={ownerPayout} />
      </div>
    </div>);

}