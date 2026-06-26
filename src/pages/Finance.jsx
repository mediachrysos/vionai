import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import StatCard from "../components/ui-custom/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import FinanceSheetTable from "../components/finance/FinanceSheetTable";
import AdSpendROIWidget from "../components/finance/AdSpendROIWidget";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";
import LawyerPayoutCard from "../components/finance/LawyerPayoutCard";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function Finance({ currentUser }) {
  const { currency } = useWorkspace();
  const { showAll, toggle } = useChatterFilter();
  const isAdmin = currentUser?.role === "admin";
  const isLawyer = currentUser?.role === "lawyer";

  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500)
  });
  const { data: walletTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 500)
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list()
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["goalSettings"],
    queryFn: () => base44.entities.GoalSettings.list()
  });

  const goalSettings = goals[0];
  // Use same period as MonthlyGoalBar so numbers are consistent
  const periodStart = goalSettings?.goal_start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const periodEnd = goalSettings?.goal_end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models.filter((m) => m.assigned_chatters?.includes(currentUser.email)).map((m) => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  const filteredPayments = useMemo(() => {
    if (showAll || isAdmin) return payments;
    return payments.filter((p) =>
      p.chatter_email === currentUser?.email || myModelIds.includes(p.model_id)
    );
  }, [payments, showAll, isAdmin, currentUser, myModelIds]);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const todayRev = filteredPayments
    .filter(p => (p.payment_date || p.created_date?.split("T")[0]) === today)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const weekRev = filteredPayments
    .filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= weekAgo)
    .reduce((s, p) => s + (p.amount || 0), 0);

  // Goal period revenue — identical logic to MonthlyGoalBar (payments only, no wallet)
  const monthRev = filteredPayments
    .filter(p => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return d >= periodStart && d <= periodEnd;
    })
    .reduce((s, p) => s + (p.amount || 0), 0);

  const monthExpenses = expenses.filter(
    (e) => (e.expense_date || e.created_date?.split("T")[0]) >= periodStart &&
            (e.expense_date || e.created_date?.split("T")[0]) <= periodEnd
  );
  const monthWalletExpenses = walletTxs.filter(
    (t) => t.type === "expense" && t.category !== "Payout" &&
            (t.transaction_date || t.created_date?.split("T")[0]) >= periodStart &&
            (t.transaction_date || t.created_date?.split("T")[0]) <= periodEnd
  );
  const monthExpTotal =
    monthExpenses.reduce((s, e) => s + (e.amount || 0), 0) +
    monthWalletExpenses.reduce((s, t) => s + (t.amount || 0), 0);
  const monthNetProfit = monthRev - monthExpTotal;

  const totalRev = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExp =
    expenses.reduce((s, e) => s + (e.amount || 0), 0) +
    walletTxs.filter((t) => t.type === "expense" && t.category !== "Payout").reduce((s, t) => s + (t.amount || 0), 0);
  const totalNetProfit = totalRev - totalExp;

  // Lawyer sees only their payout card
  if (isLawyer) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <PageHeader title="Finance" subtitle="Your payout overview" />

        <div className="mt-6">
          <LawyerPayoutCard payments={payments} expenses={expenses} walletTxs={walletTxs} />
        </div>
      </div>);

  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <div className="flex items-start justify-between flex-wrap gap-2">
        <PageHeader title="Finance" subtitle="Revenue, expenses and profitability overview" goalCurrent={monthRev} goalTarget={100000} />
        {!isAdmin &&
        <div className="mt-1">
            <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
          </div>
        }
      </div>

      {/* Lawyer payout card — visible to admins */}
      <div className="mt-2">
        <LawyerPayoutCard payments={payments} expenses={expenses} walletTxs={walletTxs} />
      </div>

      <div className="mt-6">
        <RevenueChart payments={filteredPayments} />
      </div>

      <div className="mt-6">
        <AdSpendROIWidget />
      </div>

      <FinanceSheetTable currentUser={currentUser} showAll={showAll || isAdmin} myModelIds={myModelIds} />

    </div>);

}