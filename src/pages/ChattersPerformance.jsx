import React, { useMemo } from "react";
import { usePayments } from "@/hooks/usePayments";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TodayChatterStats from "../components/dashboard/TodayChatterStats";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import TodayPaymentsWidget from "../components/dashboard/TodayPaymentsWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import ShiftOverviewWidget from "../components/dashboard/ShiftOverviewWidget";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";

export default function ChattersPerformance({ currentUser }) {
  const { showAll, toggle } = useChatterFilter();

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

  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models
      .filter(m => m.assigned_chatters?.includes(currentUser.email))
      .map(m => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  const isAdmin = currentUser?.role === "admin";

  const filteredPayments = useMemo(() => {
    if (showAll || isAdmin) return payments;
    return payments.filter(p =>
      p.chatter_email === currentUser?.email ||
      myModelIds.includes(p.model_id)
    );
  }, [payments, showAll, isAdmin, currentUser, myModelIds]);

  const filteredCustomers = useMemo(() => {
    if (showAll || isAdmin) return customers;
    return customers.filter(c =>
      c.assigned_chatter === currentUser?.email ||
      myModelIds.includes(c.assigned_model)
    );
  }, [customers, showAll, isAdmin, currentUser, myModelIds]);

  const paydayCustomers = customers.filter(
    c => c.pay_day_of_month === new Date().getDate() && c.status !== "blocked" && c.status !== "inactive"
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Chatters Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Přehled výkonů, plateb, zákazníků a směn</p>
        </div>
        {!isAdmin && (
          <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
        )}
      </div>

      {/* Notes + Chatter stats */}
      <div className="grid lg:grid-cols-2 gap-4">
        <TodayNotesWidget currentUser={currentUser} paydayCustomers={paydayCustomers} models={models} />
        <TodayChatterStats payments={filteredPayments} showAll={showAll || isAdmin} currentUser={currentUser} />
      </div>

      {/* Today payments + Recent customers */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayPaymentsWidget payments={filteredPayments} />
        <RecentCustomersWidget customers={filteredCustomers} />
      </div>

      {/* Shift overview */}
      {isAdmin && (
        <div className="mt-4">
          <ShiftOverviewWidget users={users} />
        </div>
      )}
    </div>
  );
}