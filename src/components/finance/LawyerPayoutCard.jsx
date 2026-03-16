import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Scale, Calculator, X } from "lucide-react";

const MONTH_NAMES = [
"Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
"Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];


function DetailRow({ label, sublabel, value, color = "text-gray-800", prefix = "", highlight = false }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${highlight ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <p className={`text-base font-bold ${color}`}>{prefix}{Math.abs(value).toLocaleString("cs-CZ")} Kč</p>
    </div>);

}

function LawyerDetailModal({ open, onClose, monthStr, monthName }) {
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: () => base44.entities.Payment.list("-payment_date", 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-expense_date", 500) });
  const { data: walletTxs = [] } = useQuery({ queryKey: ["walletTransactions"], queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 200) });

  const monthPayments = payments.filter((p) => {
    const d = p.payment_date || p.created_date?.split("T")[0] || "";
    return d.startsWith(monthStr) && p.status !== "failed" && p.status !== "refunded";
  });
  const monthExpenses = expenses.filter((e) => (e.expense_date || e.created_date?.split("T")[0] || "").startsWith(monthStr));
  const monthWallet = walletTxs.filter((t) => (t.transaction_date || t.created_date?.split("T")[0] || "").startsWith(monthStr));

  const totalIncome =
  monthPayments.reduce((s, p) => s + (p.amount || 0), 0) +
  monthWallet.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpenses =
  monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
  monthWallet.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const grossProfit = totalIncome - totalExpenses;
  const lawyerFee = Math.max(0, grossProfit) * 0.10;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-base font-semibold">Výplata pan D.</DialogTitle>
              <p className="text-white/60 text-xs">{monthName}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-1">Vzorec výpočtu</p>
            <p className="text-xs text-blue-700 font-mono">Výplata = (Příjmy − Výdaje) × 10 %</p>
          </div>

          <div className="border-b border-dashed border-gray-200 pb-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Podklady</p>
            <div className="space-y-2">
              <DetailRow label="Celkové příjmy" sublabel={`${monthPayments.length} plateb + wallet příjmy`} value={totalIncome} color="text-emerald-700" />
              <DetailRow label="Celkové výdaje" sublabel="Výdaje + wallet výdaje" value={totalExpenses} color="text-red-600" prefix="− " />
              <DetailRow label="Hrubý zisk" sublabel="Příjmy − Výdaje" value={grossProfit} color={grossProfit >= 0 ? "text-[#C9A227]" : "text-red-600"} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Výsledek</p>
            <DetailRow
              label="Výplata pan D."
              sublabel="10 % z hrubého zisku"
              value={lawyerFee}
              color="text-slate-800"
              highlight />

          </div>

          {grossProfit <= 0 &&
          <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100 text-xs text-red-600">
              Hrubý zisk je záporný nebo nulový — výplata se nevypočítává.
            </div>
          }
        </div>
      </DialogContent>
    </Dialog>);

}

export default function LawyerPayoutCard({ payments = [], expenses = [], walletTxs = [] }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showDetail, setShowDetail] = useState(false);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthName = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const prevMonth = () => {
    if (viewMonth === 0) {setViewMonth(11);setViewYear((y) => y - 1);} else
    setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {setViewMonth(0);setViewYear((y) => y + 1);} else
    setViewMonth((m) => m + 1);
  };

  const monthPayments = payments.filter((p) => {
    const d = p.payment_date || p.created_date?.split("T")[0] || "";
    return d.startsWith(monthStr) && p.status !== "failed" && p.status !== "refunded";
  });
  const monthExpenses = expenses.filter((e) => (e.expense_date || e.created_date?.split("T")[0] || "").startsWith(monthStr));
  const monthWallet = walletTxs.filter((t) => (t.transaction_date || t.created_date?.split("T")[0] || "").startsWith(monthStr));

  const totalIncome =
  monthPayments.reduce((s, p) => s + (p.amount || 0), 0) +
  monthWallet.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpenses =
  monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
  monthWallet.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  const grossProfit = totalIncome - totalExpenses;
  const lawyerFee = Math.max(0, grossProfit) * 0.10;

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] rounded-2xl shadow-lg shadow-amber-200/50 p-5 cursor-pointer hover:shadow-xl hover:shadow-amber-300/50 transition-all group">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Výplata pan D.</h3>
              
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={prevMonth} className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center">
              <ChevronLeft className="w-3.5 h-3.5 text-white/80" />
            </button>
            <span className="text-xs font-medium text-white min-w-[100px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Mini summary */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-white/70" />
              <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Příjmy</p>
            </div>
            <p className="text-sm font-bold text-white">{totalIncome.toLocaleString("cs-CZ")} Kč</p>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingDown className="w-3 h-3 text-white/70" />
              <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Výdaje</p>
            </div>
            <p className="text-sm font-bold text-white">{totalExpenses.toLocaleString("cs-CZ")} Kč</p>
          </div>
          {/* Payout highlight */}
          <div className="bg-white/25 rounded-xl px-3 py-2 flex flex-col justify-center">
            <div className="flex items-center gap-1 mb-0.5">
              <Calculator className="w-3 h-3 text-white/70" />
              <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Výplata</p>
            </div>
            <p className="text-sm font-bold text-white">{lawyerFee.toLocaleString("cs-CZ")} Kč</p>
          </div>
        </div>

        <p className="text-xs text-white/50 mt-1 text-center group-hover:text-white/80 transition-colors">
          Klikněte pro detail výpočtu →
        </p>
      </div>

      <LawyerDetailModal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        monthStr={monthStr}
        monthName={monthName} />

    </>);

}