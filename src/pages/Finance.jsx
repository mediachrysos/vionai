import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import StatCard from "../components/ui-custom/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import PageHeader from "../components/ui-custom/PageHeader";
import FinanceSheetTable from "../components/finance/FinanceSheetTable";

export default function Finance({ currentUser }) {
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500),
  });

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const todayPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) === today
  );
  const weekPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) >= weekAgo
  );
  const monthPayments = payments.filter(
    (p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart
  );

  const todayRev = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const weekRev = weekPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const monthExpenses = expenses.filter(
    (e) => (e.expense_date || e.created_date?.split("T")[0]) >= monthStart
  );
  const monthExpTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const monthNetProfit = monthRev - monthExpTotal;

  const totalRev = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalNetProfit = totalRev - totalExp;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Finance" subtitle="Přehled tržeb, výdajů a ziskovosti" goalCurrent={monthRev} goalTarget={100000} />

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
          subtitle={`${monthExpenses.length} záznamů`}
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

      <div className="mt-6">
        <RevenueChart payments={payments} />
      </div>

      <FinanceSheetTable />

    </div>
  );
}