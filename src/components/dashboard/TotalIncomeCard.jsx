import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function TotalIncomeCard() {
  const { currency } = useWorkspace();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 5000),
  });

  const { data: walletTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 5000),
  });

  const totalIncome = useMemo(() => {
    const paymentIncome = payments
      .filter((p) => p.status !== "failed" && p.status !== "refunded")
      .reduce((s, p) => s + (p.amount || 0), 0);

    const manualIncome = walletTxs
      .filter((t) =>
        t.type === "income" &&
        t.category !== "Výplata Majitelé" &&
        t.category !== "Výplata" &&
        t.category !== "Payout" &&
        t.category !== "Firemní rezerva"
      )
      .reduce((s, t) => s + (t.amount || 0), 0);

    return paymentIncome + manualIncome;
  }, [payments, walletTxs]);

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5 mb-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total income</p>
      <p className="text-2xl font-bold text-emerald-400">
        {totalIncome.toLocaleString()} <span className="text-base font-medium text-slate-500">{currency}</span>
      </p>
    </div>
  );
}