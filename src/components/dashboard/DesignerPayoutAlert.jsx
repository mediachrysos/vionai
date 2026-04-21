import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote } from "lucide-react";

function minutesToHours(mins) {
  return Math.round((mins / 60) * 100) / 100;
}

export default function DesignerPayoutAlert() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const isPayday = dayOfMonth === 1 || dayOfMonth === 15;

  const { data: dashboards = [] } = useQuery({
    queryKey: ["socialDashboards"],
    queryFn: () => base44.entities.SocialDashboard.list("order", 50),
    staleTime: 60000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["allWorkSessionsAdmin"],
    queryFn: () => base44.entities.DesignerWorkSession.list(),
    staleTime: 60000,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["allDesignerPayoutsAdmin"],
    queryFn: () => base44.entities.DesignerPayout.list(),
    staleTime: 60000,
  });

  // Calculate remaining for each dashboard with an assigned designer
  const items = dashboards
    .filter(db => db.designer_email)
    .map(db => {
      const hourlyRate = db.hourly_rate ?? 35;
      const dbSessions = sessions.filter(s => s.dashboard_id === db.id && s.designer_email === db.designer_email);
      const dbPayouts = payouts.filter(p => p.dashboard_id === db.id && p.designer_email === db.designer_email);
      const totalMins = dbSessions.reduce((sum, s) => sum + (s.minutes_worked || 0), 0);
      const totalHours = minutesToHours(totalMins);
      const totalEarned = Math.round(totalHours * hourlyRate * 100) / 100;
      const totalPaid = dbPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = Math.round((totalEarned - totalPaid) * 100) / 100;
      return {
        name: db.designer_name || db.name,
        remaining,
        hourlyRate,
      };
    })
    .filter(item => item.remaining > 0);

  if (!isPayday || items.length === 0) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <Banknote className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800">💰 Payday! Designer payouts due</p>
          <p className="text-xs text-amber-600">{today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
              {item.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{item.name}</p>
              <p className="text-xs text-amber-700 font-bold">{item.remaining.toLocaleString()} MAD</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}