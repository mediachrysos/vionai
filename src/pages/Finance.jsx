import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import StatCard from "../components/ui-custom/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import FinanceSheetTable from "../components/finance/FinanceSheetTable";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";
import LawyerPayoutCard from "../components/finance/LawyerPayoutCard";

export default function Finance({ currentUser }) {
  const { showAll, toggle } = useChatterFilter();
  const isAdmin = currentUser?.role === "admin";
  const isLawyer = currentUser?.role === "lawyer";

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500),
  });
  const { data: walletTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 200),
    enabled: isAdmin || isLawyer,
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });

  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models.filter(m => m.assigned_chatters?.includes(currentUser.email)).map(m => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  const filteredPayments = useMemo(() => {
    if (showAll || isAdmin) return payments;
    return payments.filter(p =>
      p.chatter_email === currentUser?.email || myModelIds.includes(p.model_id)
    );
  }, [payments, showAll, isAdmin, currentUser, myModelIds]);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const todayPayments = filteredPayments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) === today
  );
  const weekPayments = filteredPayments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) >= weekAgo
  );
  const monthPayments = filteredPayments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart
  );

  const todayRev = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const weekRev = weekPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const monthExpenses = expenses.filter(
    (e) => (e.expense_date || e.created_date?.split("T")[0]) >= monthStart
  );
  const monthWalletExpenses = walletTxs.filter(
    (t) => t.type === "expense" && t.category !== "Výplata" && t.type !== "transfer" && (t.transaction_date || t.created_date?.split("T")[0]) >= monthStart
  );
  const monthExpTotal =
    monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
    monthWalletExpenses.reduce((s, t) => s + (t.amount || 0), 0);
  const monthExpCount = monthExpenses.length + monthWalletExpenses.length;
  const monthNetProfit = monthRev - monthExpTotal;

  const totalRev = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExp =
    expenses.reduce((s, e) => s + (e.amount || 0), 0) +
    walletTxs.filter((t) => t.type === "expense" && t.category !== "Výplata" && t.type !== "transfer").reduce((s, t) => s + (t.amount || 0), 0);
  const totalNetProfit = totalRev - totalExp;

  // Lawyer sees only their payout card
  if (isLawyer) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <PageHeader title="Finance" subtitle="Váš přehled výplat" />
        <div className="mt-6">
          <LawyerPayoutCard payments={payments} expenses={expenses} walletTxs={walletTxs} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <div className="flex items-start justify-between flex-wrap gap-2">
        <PageHeader title="Finance" subtitle="Přehled tržeb, výdajů a ziskovosti" goalCurrent={monthRev} goalTarget={100000} />
        {!isAdmin && (
          <div className="mt-1">
            <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
        <StatCard
          title="Dnes"
          value={`${todayRev.toLocaleString()} Kč`}
          icon={DollarSign}
          subtitle={`${todayPayments.length} plateb`}
          colorIndex={0}
        />
        <StatCard
          title="Tento týden"
          value={`${weekRev.toLocaleString()} Kč`}
          icon={CreditCard}
          subtitle={`${weekPayments.length} plateb`}
          colorIndex={1}
        />
        <StatCard
          title="Tržby (měsíc)"
          value={`${monthRev.toLocaleString()} Kč`}
          icon={DollarSign}
          subtitle={`${monthPayments.length} plateb`}
          colorIndex={2}
        />
        <StatCard
          title="Výdaje (měsíc)"
          value={`${monthExpTotal.toLocaleString()} Kč`}
          icon={TrendingDown}
          subtitle={`${monthExpCount} záznamů`}
          colorIndex={3}
        />
        <StatCard
          title="Čistý zisk"
          value={`${monthNetProfit.toLocaleString()} Kč`}
          icon={monthNetProfit >= 0 ? TrendingUp : TrendingDown}
          subtitle={`Celkem: ${totalNetProfit.toLocaleString()} Kč`}
          colorIndex={4}
        />
      </div>

      {/* Lawyer payout card — visible to admins */}
      <div className="mt-6">
        <LawyerPayoutCard payments={payments} expenses={expenses} walletTxs={walletTxs} />
      </div>

      <div className="mt-6">
        <RevenueChart payments={filteredPayments} />
      </div>

      <FinanceSheetTable currentUser={currentUser} showAll={showAll || isAdmin} myModelIds={myModelIds} />

    </div>
  );
}