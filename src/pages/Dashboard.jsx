import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TodayChatterStats from "../components/dashboard/TodayChatterStats";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import TodayPaymentsWidget from "../components/dashboard/TodayPaymentsWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import PaydayWidget from "../components/dashboard/PaydayWidget";
import ChatterDailyReport from "../components/dashboard/ChatterDailyReport.jsx";

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
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Payday alert */}
      <PaydayWidget customers={customers} models={models} currentUser={currentUser} />

      {/* Top section: Notes (left) + Today chatter stats (right) */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayNotesWidget currentUser={currentUser} />
        <TodayChatterStats payments={payments} />
      </div>

      {/* Daily chatter report with date picker */}
      <div className="mt-4">
        <ChatterDailyReport payments={payments} currentUser={currentUser} users={users} />
      </div>

      {/* Bottom section: Today payments + Recent customers */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayPaymentsWidget payments={payments} />
        <RecentCustomersWidget customers={customers} />
      </div>
    </div>
  );
}