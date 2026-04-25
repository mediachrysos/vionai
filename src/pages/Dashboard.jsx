import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TodayChatterStats from "../components/dashboard/TodayChatterStats";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import TodayPaymentsWidget from "../components/dashboard/TodayPaymentsWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";
import DesignerPayoutAlert from "../components/dashboard/DesignerPayoutAlert";

export default function Dashboard({ currentUser }) {
  const { showAll, toggle } = useChatterFilter();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 60000,
  });
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

  // Models assigned to current user — from Model.assigned_chatters OR User.assigned_model_ids
  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models
      .filter(m => m.assigned_chatters?.includes(currentUser.email))
      .map(m => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  const isAdmin = currentUser?.role === "admin";

  // Filter payments & customers if not showing all (admins see all by default)
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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      {isAdmin && <DesignerPayoutAlert />}

      {/* Filter toggle — visible only for non-admins */}
      {!isAdmin && (
        <div className="flex justify-end mb-2">
          <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
        </div>
      )}

      {/* Top section: Notes (left) + Today chatter stats (right) */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayNotesWidget currentUser={currentUser} paydayCustomers={customers.filter(c => c.pay_day_of_month === new Date().getDate() && c.status !== "blocked" && c.status !== "inactive")} models={models} />
        <TodayChatterStats payments={filteredPayments} showAll={showAll || isAdmin} currentUser={currentUser} />
      </div>

      {/* Bottom section: Today payments + Recent customers */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayPaymentsWidget payments={filteredPayments} />
        <RecentCustomersWidget customers={filteredCustomers} />
      </div>
    </div>
  );
}