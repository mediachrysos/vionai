import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OwnerPayoutRow from "./OwnerPayoutRow";
import CompanyReserveRow from "./CompanyReserveRow";

const MONTH_NAMES = [
"January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December"];


function Row({ label, value, sublabel, icon: Icon, color = "text-slate-200", bgColor = "bg-white/5", prefix = "" }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${bgColor}`}>
      <div className="flex items-center gap-3">
        

        
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
        </div>
      </div>
      <p className={`text-base font-bold ${color}`}>{prefix}{value.toLocaleString()}</p>
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
    queryKey: ["ownerPayouts", "luky"],
    queryFn: () => base44.entities.OwnerPayout.filter({ owner: "luky" }),
  });
  const { data: allMatyPayouts = [] } = useQuery({
    queryKey: ["ownerPayouts", "maty"],
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
    return gp - Math.max(0, gp) * 0.10; // netProfit
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
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
      {/* Header with month switcher */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Payout calculation</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <span className="text-xs font-semibold text-slate-300 min-w-[110px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Income */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-sm font-bold">↑</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-200">Total income</p>
              <p className="text-xs text-emerald-500/70">Payments + manual income</p>
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-300">{totalIncome.toLocaleString()}</p>
        </div>

        {/* Expenses */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <span className="text-red-400 text-sm font-bold">↓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-200">Total expenses</p>
              <p className="text-xs text-red-500/70">Expenses + manual expenses</p>
            </div>
          </div>
          <p className="text-lg font-bold text-red-300">− {totalExpenses.toLocaleString()}</p>
        </div>

        <div className="border-t border-dashed border-white/10 my-1" />

        {/* Gross profit */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 text-sm font-bold">=</span>
            </div>
            <p className="text-sm font-bold text-amber-200">Gross profit</p>
          </div>
          <p className={`text-lg font-bold ${grossProfit >= 0 ? "text-amber-300" : "text-red-400"}`}>
            {grossProfit.toLocaleString()}
          </p>
        </div>

        <div className="border-t border-dashed border-white/10 my-1" />

        <Row label="Lawyer payout" sublabel="10% of gross profit" color="text-slate-400" bgColor="bg-white/5" prefix="− " value={lawyerFee} />

        <div className="border-t border-dashed border-white/10 my-1" />

        {/* Net profit */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C9A227]/20 flex items-center justify-center">
              <span className="text-[#C9A227] text-sm font-bold">★</span>
            </div>
            <p className="text-sm font-bold text-[#e8c85a]">Net profit</p>
          </div>
          <p className={`text-lg font-bold ${netProfit >= 0 ? "text-[#C9A227]" : "text-red-400"}`}>{netProfit.toLocaleString()}</p>
        </div>

        <div className="border-t border-dashed border-white/10 my-1" />

        <CompanyReserveRow monthStr={monthStr} totalAllocated={companyReserve} carryOver={reserveCarryOver} />
        <OwnerPayoutRow owner="luky" label="Luky" monthStr={monthStr} totalDue={ownerPayout} carryOver={lukyCarryOver} />
        <OwnerPayoutRow owner="maty" label="Maty" monthStr={monthStr} totalDue={ownerPayout} carryOver={matyCarryOver} />
      </div>
    </div>);

}