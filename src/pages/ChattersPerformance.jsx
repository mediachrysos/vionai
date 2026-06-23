import React, { useMemo, useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import ShiftOverviewWidget from "../components/dashboard/ShiftOverviewWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import KpiCard from "../components/chatters/KpiCard";
import PeriodSelector, { getPeriodDates } from "../components/chatters/PeriodSelector";
import PerformanceAlerts from "../components/chatters/PerformanceAlerts";
import RecentPaymentsPanel from "../components/chatters/RecentPaymentsPanel";
import ChatterLeaderboardTable from "../components/chatters/ChatterLeaderboardTable";

export default function ChattersPerformance({ currentUser }) {
  const [period, setPeriod] = useState({ key: "this_month" });

  const { data: payments = [] } = usePayments();
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
    staleTime: 60000,
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 120000,
  });
  const { data: allShifts = [] } = useQuery({
    queryKey: ["all-chatter-shifts"],
    queryFn: () => base44.entities.ChatterShift.list("-date", 2000),
    staleTime: 15000,
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts"],
    queryFn: () => base44.entities.ChatterPayout.list("-period", 500),
    staleTime: 60000,
  });

  const { start, end, prevStart, prevEnd } = getPeriodDates(period);

  const isAdmin = currentUser?.role === "admin";

  // Chatters: users with chatter role or allowed ChatterPortal
  const chatters = useMemo(() => users.filter(u => {
    const roles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return roles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  }), [users]);

  // Payments filtered by period
  const periodPayments = useMemo(() =>
    payments.filter(p => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return d && d >= start && d <= end;
    }), [payments, start, end]);

  const prevPayments = useMemo(() => {
    if (!prevStart || !prevEnd) return [];
    return payments.filter(p => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return d && d >= prevStart && d <= prevEnd;
    });
  }, [payments, prevStart, prevEnd]);

  // Shifts filtered by period
  const periodShifts = useMemo(() =>
    allShifts.filter(s => s.date >= start && s.date <= end),
    [allShifts, start, end]);

  // KPI numbers
  const totalRevenue = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const prevRevenue = prevPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const revTrendPct = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const activeChatters = chatters.filter(c =>
    periodShifts.some(s => s.chatter_email === c.email) ||
    periodPayments.some(p => p.chatter_email === c.email)
  );

  const totalPaymentCount = periodPayments.length;
  const revPerChatter = activeChatters.length > 0 ? Math.round(totalRevenue / activeChatters.length) : 0;

  const paydayCustomers = customers.filter(
    c => c.pay_day_of_month === new Date().getDate() && c.status !== "blocked" && c.status !== "inactive"
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Chatters Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">CEO dashboard — revenue, shifts, payouts</p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Revenue"
          value={totalRevenue.toLocaleString("cs-CZ") + " CZK"}
          highlight
          trend={revTrendPct}
          trendLabel={revTrendPct !== null ? `${revTrendPct > 0 ? "+" : ""}${revTrendPct}% vs prev period` : "No comparison data"}
        />
        <KpiCard
          label="Active Chatters"
          value={`${activeChatters.length} / ${chatters.length}`}
          sub="with shift or payment"
        />
        <KpiCard
          label="Total Payments"
          value={totalPaymentCount.toString()}
          sub={totalPaymentCount > 0 ? `avg ${Math.round(totalRevenue / totalPaymentCount).toLocaleString("cs-CZ")} CZK` : "No payments"}
        />
        <KpiCard
          label="Revenue / Chatter"
          value={activeChatters.length > 0 ? revPerChatter.toLocaleString("cs-CZ") + " CZK" : "—"}
          sub={activeChatters.length > 0 ? `across ${activeChatters.length} active` : "No active chatters"}
        />
      </div>

      {/* Notes + Alerts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <TodayNotesWidget currentUser={currentUser} paydayCustomers={paydayCustomers} models={models} />
        <PerformanceAlerts chatters={chatters} payments={payments} shifts={allShifts} periodDates={{ start, end }} />
      </div>

      {/* Chatter Leaderboard Table */}
      <ChatterLeaderboardTable
        chatters={chatters}
        payments={periodPayments}
        prevPayments={prevPayments}
        shifts={periodShifts}
        models={models}
        payouts={payouts}
      />

      {/* Recent Payments */}
      <RecentPaymentsPanel payments={payments} />

      {/* New Customers */}
      <RecentCustomersWidget customers={customers} />

      {/* Shift Calendar */}
      {isAdmin && <ShiftOverviewWidget users={users} />}
    </div>
  );
}