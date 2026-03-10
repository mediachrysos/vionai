import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, Bot, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import StatCard from "../components/ui-custom/StatCard";
import RevenueChart from "../components/dashboard/RevenueChart";
import RevenueByModel from "../components/dashboard/RevenueByModel";
import LatestPayments from "../components/dashboard/LatestPayments";
import GoalWidget from "../components/dashboard/GoalWidget";
import QuickActions from "../components/dashboard/QuickActions";
import PageHeader from "../components/ui-custom/PageHeader";

export default function Dashboard({ currentUser }) {
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 100),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500),
  });

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const todayPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === today);
  const weekPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= weekAgo);
  const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);

  const todayRev = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const weekRev = weekPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const activeCustomers = customers.filter(c => c.status === "active").length;
  const activeModels = models.filter(m => m.status === "active").length;

  const monthExpenses = expenses.filter(e => (e.expense_date || e.created_date?.split("T")[0]) >= monthStart);
  const monthExpTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const monthNetProfit = monthRev - monthExpTotal;

  const totalRev = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalNetProfit = totalRev - totalExp;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 lg:p-8">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)"}} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Amira Media Portal</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Vítej zpět, {currentUser?.full_name?.split(" ")[0] || ""}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">Přehled tvého podnikání</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-indigo-100 text-xs font-medium">Aktivní zákazníci</p>
              <p className="text-white text-xl font-bold">{activeCustomers}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
              <p className="text-indigo-100 text-xs font-medium">Aktivní modelky</p>
              <p className="text-white text-xl font-bold">{activeModels}</p>
            </div>
          </div>
        </div>
      </div>

      <QuickActions />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <StatCard title="Dnes" value={`${todayRev.toLocaleString()} Kč`} icon={DollarSign} subtitle={`${todayPayments.length} plateb`} colorIndex={0} />
        <StatCard title="Tento týden" value={`${weekRev.toLocaleString()} Kč`} icon={CreditCard} subtitle={`${weekPayments.length} plateb`} colorIndex={1} />
        <StatCard title="Tržby (měsíc)" value={`${monthRev.toLocaleString()} Kč`} icon={DollarSign} subtitle={`${monthPayments.length} plateb`} colorIndex={2} />
        <StatCard title="Výdaje (měsíc)" value={`${monthExpTotal.toLocaleString()} Kč`} icon={TrendingDown} subtitle={`${monthExpenses.length} záznamů`} colorIndex={3} />
        <StatCard
          title="Čistý zisk"
          value={`${monthNetProfit.toLocaleString()} Kč`}
          icon={monthNetProfit >= 0 ? TrendingUp : TrendingDown}
          subtitle={`Celkem: ${totalNetProfit.toLocaleString()} Kč`}
          colorIndex={4}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <RevenueChart payments={payments} />
        </div>
        <GoalWidget monthlyRevenue={monthRev} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <RevenueByModel payments={payments} models={models} />
        <LatestPayments payments={payments} />
      </div>
    </div>
  );
}