import React from "react";
import { usePayments } from "@/hooks/usePayments";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import DesignerPayoutAlert from "../components/dashboard/DesignerPayoutAlert";
import AnalyticsChart from "../components/dashboard/AnalyticsChart";

export default function Dashboard({ currentUser }) {
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
  const { data: adSpends = [] } = useQuery({
    queryKey: ["adSpends"],
    queryFn: () => base44.entities.AdSpend.list(),
    staleTime: 60000,
  });
  const { data: walletTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 5000),
    staleTime: 60000,
  });

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      {isAdmin && <DesignerPayoutAlert />}

      {/* Analytics chart */}
      <div className="mt-4">
        <AnalyticsChart payments={payments} adSpends={adSpends} models={models} walletTxs={walletTxs} />
      </div>
    </div>
  );
}