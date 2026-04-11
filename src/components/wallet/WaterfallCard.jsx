import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OwnerPayoutRow from "./OwnerPayoutRow";
import CompanyReserveRow from "./CompanyReserveRow";

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
  monthWalletTxs.filter((t) => t.type === "expense" && t.category !== "Výplata" && t.type !== "transfer").reduce((s, t) => s + (t.amount || 0), 0);

  const grossProfit = totalIncome - totalExpenses;
  const lawyerFee = Math.max(0, grossProfit) * 0.10;
  const netProfit = grossProfit - lawyerFee;
  const companyReserve = netProfit * 0.20;
  const ownerPayout = netProfit * 0.40;

  // Load all data for carry-over calculations
  const { data: allCompanyReserveTxs = [] } = useQuery({
    queryKey: ["companyReserveAll"],
    queryFn: () => base44.entities.CompanyReserve.list(),
  });
  const { data: allLukyPayouts = [] } = useQuery({
    queryKey: ["ownerPayouts", "luky", "all"],
    queryFn: () => base44.entities.OwnerPayout.filter({ owner: "luky" }),
  });
  const { data: allMatyPayouts = [] } = useQuery({
    queryKey: ["ownerPayouts", "maty", "all"],
    queryFn: () => base44.entities.OwnerPayout.filter({ owner: "maty" }),
  });

  // Calculate how much was paid in previous months vs. what was owed
  // We only know ownerPayout for the CURRENT month here — for past months we sum up
  // all payments made and compare to totalDue passed in for those months.
  // Simplest: carryOver = (sum of all ownerPayout records for THIS month) - paidThisMonth
  // But we need past months' "totalDue" which we don't have.
  // Instead: carryOver = totalPaidOut for all months BEFORE this one subtracted from nothing
  // The real approach: for each previous month, carryOver accumulates (totalDue - paid).
  // Since we don't recalculate past totalDue here, we store carryOver as:
  // sum of all payouts marked in months < monthStr, subtracted from... we can't.
  //
  // PRACTICAL APPROACH: User adds payouts manually. If they didn't pay last month's full amount,
  // the remainder = last month totalDue - last month paid. We add that to this month's totalDue.
  // We'll calculate this by fetching payouts for previous months and summing what remains unpaid
  // compared to previous ownerPayout amounts stored in a simple way.
  //
  // SIMPLEST CORRECT APPROACH: track carryOver separately.
  // We'll compute: for all months BEFORE current, sum (ownerPayout_that_month - paid_that_month).
  // We don't have ownerPayout for past months in this component without recalculating everything.
  //
  // FINAL DECISION: We'll pass ALL historical data (payments, expenses, walletTxs) and compute
  // each past month's ownerPayout, then subtract what was actually paid.

  const computeMonthNetProfit = (mStr) => {
    const mp = payments.filter((p) => {
      const d = p.payment_date || p.created_date?.split("T")[0] || "";
      return d.startsWith(mStr) && p.status !== "failed" && p.status !== "refunded";
    });
    const me = expenses.filter((e) => {
      const d = e.expense_date || e.created_date?.split("T")[0] || "";
      return d.startsWith(mStr);
    });
    const mw = walletTxs.filter((t) => {
      const d = t.transaction_date || t.created_date?.split("T")[0] || "";
      return d.startsWith(mStr);
    });
    const inc = mp.reduce((s, p) => s + (p.amount || 0), 0) + mw.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const exp = me.reduce((s, e) => s + (e.amount || 0), 0) + mw.filter((t) => t.type === "expense" && t.category !== "Výplata" && t.type !== "transfer").reduce((s, t) => s + (t.amount || 0), 0);
    const gp = inc - exp;
    return gp - gp * 0.10; // netProfit
  };

  const computeMonthOwnerPayout = (mStr) => {
    const netP = Math.max(0, computeMonthNetProfit(mStr));
    return netP * 0.40;
  };

  // Get all unique months from data that are before current monthStr
  const allMonths = new Set([
    ...payments.map((p) => (p.payment_date || p.created_date?.split("T")[0] || "").slice(0, 7)),
    ...expenses.map((e) => (e.expense_date || e.created_date?.split("T")[0] || "").slice(0, 7)),
    ...walletTxs.map((t) => (t.transaction_date || t.created_date?.split("T")[0] || "").slice(0, 7)),
  ]);
  const pastMonths = [...allMonths].filter((m) => m && m < monthStr && m.length === 7);

  const reserveCarryOver = pastMonths.reduce((sum, m) => {
    const due = Math.max(0, computeMonthNetProfit(m)) * 0.20;
    const spent = allCompanyReserveTxs.filter((tx) => tx.month === m && tx.type === "expense").reduce((s, tx) => s + (tx.amount || 0), 0);
    return sum + Math.max(0, due - spent);
  }, 0);

  const lukyCarryOver = pastMonths.reduce((sum, m) => {
    const due = computeMonthOwnerPayout(m);
    const paid = allLukyPayouts.filter((p) => p.month === m).reduce((s, p) => s + (p.amount || 0), 0);
    return sum + Math.max(0, due - paid);
  }, 0);

  const matyCarryOver = pastMonths.reduce((sum, m) => {
    const due = computeMonthOwnerPayout(m);
    const paid = allMatyPayouts.filter((p) => p.month === m).reduce((s, p) => s + (p.amount || 0), 0);
    return sum + Math.max(0, due - paid);
  }, 0);

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

        <Row label="Výplata PD" sublabel="10 % z hrubého zisku" color="text-gray-700" bgColor="bg-gray-50" prefix="- " value={lawyerFee} />

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50">
          <p className="text-sm font-semibold text-gray-800">Čistý zisk</p>
          <p className={`text-base font-bold ${netProfit >= 0 ? "text-[#C9A227]" : "text-red-600"}`}>{netProfit.toLocaleString("cs-CZ")} Kč</p>
        </div>

        <div className="border-t border-dashed border-gray-200 my-1" />

        <CompanyReserveRow monthStr={monthStr} totalAllocated={companyReserve} carryOver={reserveCarryOver} />
        <OwnerPayoutRow owner="luky" label="Luky" monthStr={monthStr} totalDue={ownerPayout} carryOver={lukyCarryOver} />
        <OwnerPayoutRow owner="maty" label="Maty" monthStr={monthStr} totalDue={ownerPayout} carryOver={matyCarryOver} />
      </div>
    </div>);

}