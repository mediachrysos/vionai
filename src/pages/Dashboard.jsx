import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import TodayChatterStats from "../components/dashboard/TodayChatterStats";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import TodayPaymentsWidget from "../components/dashboard/TodayPaymentsWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import PaydayWidget from "../components/dashboard/PaydayWidget";

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

  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const activeModels = models.filter((m) => m.status === "active").length;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 lg:p-8">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Amira Media Portal</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Vítej zpět, {currentUser?.full_name?.split(" ")[0] || ""}
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {new Date().toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
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

      {/* Payday alert */}
      <PaydayWidget customers={customers} />

      {/* Top section: Notes (left) + Today chatter stats (right) */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayNotesWidget currentUser={currentUser} />
        <TodayChatterStats payments={payments} />
      </div>

      {/* Bottom section: Today payments + Recent customers */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <TodayPaymentsWidget payments={payments} />
        <RecentCustomersWidget customers={customers} />
      </div>
    </div>
  );
}