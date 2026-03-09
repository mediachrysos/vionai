import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, Bot, CreditCard, ListTodo } from "lucide-react";
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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Welcome back, ${currentUser?.full_name?.split(" ")[0] || "there"}`}
        subtitle="Here's your business overview"
      />

      <QuickActions />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        <StatCard title="Today" value={`$${todayRev.toLocaleString()}`} icon={DollarSign} subtitle={`${todayPayments.length} payments`} />
        <StatCard title="This Week" value={`$${weekRev.toLocaleString()}`} icon={CreditCard} subtitle={`${weekPayments.length} payments`} />
        <StatCard title="This Month" value={`$${monthRev.toLocaleString()}`} icon={DollarSign} subtitle={`${monthPayments.length} payments`} />
        <StatCard title="Customers" value={activeCustomers} icon={Users} subtitle={`${customers.length} total`} />
        <StatCard title="Models" value={activeModels} icon={Bot} subtitle={`${models.length} total`} />
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