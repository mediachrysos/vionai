import React from "react";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

export default function PerformanceAlerts({ chatters, payments, shifts }) {
  const alerts = [];
  const today = new Date().toISOString().split("T")[0];

  chatters.forEach((chatter) => {
    const email = chatter.email;
    const name = chatter.nickname || chatter.full_name?.split(" ")[0] || email;

    const hasShiftToday = shifts.some((s) => s.chatter_email === email && s.date === today);
    const todayPayments = payments.filter((p) =>
    p.chatter_email === email &&
    (p.payment_date || p.created_date?.split("T")[0]) === today
    );

    // Shift today but no payments
    if (hasShiftToday && todayPayments.length === 0) {
      alerts.push({ level: "warning", text: `${name} has an active shift today but no payments recorded yet.` });
    }

    // Below 7-day average
    const last7Start = new Date();last7Start.setDate(last7Start.getDate() - 7);
    const last7Str = last7Start.toISOString().split("T")[0];
    const last7Pmts = payments.filter((p) => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return p.chatter_email === email && d >= last7Str && d < today;
    });
    const avg7 = last7Pmts.length > 0 ?
    last7Pmts.reduce((s, p) => s + (p.amount || 0), 0) / 7 :
    null;
    const todayRev = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

    if (avg7 !== null && avg7 > 500 && hasShiftToday && todayRev < avg7 * 0.5 && todayPayments.length > 0) {
      alerts.push({ level: "info", text: `${name} is below their 7-day average (${Math.round(avg7).toLocaleString()} CZK/day).` });
    }

    // Above average
    if (avg7 !== null && avg7 > 0 && todayRev > avg7 * 1.5 && todayPayments.length > 0) {
      alerts.push({ level: "success", text: `${name} is outperforming — ${todayRev.toLocaleString()} CZK today vs avg ${Math.round(avg7).toLocaleString()} CZK/day.` });
    }
  });

  if (alerts.length === 0) {
    return null;





  }

  const iconMap = {
    warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />,
    info: <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />,
    success: <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
  };
  const bgMap = {
    warning: "bg-amber-950/20 border-amber-700/20",
    info: "bg-sky-950/20 border-sky-700/20",
    success: "bg-emerald-950/20 border-emerald-700/20"
  };

  return (
    <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Performance Alerts</p>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((a, i) =>
        <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${bgMap[a.level]}`}>
            {iconMap[a.level]}
            <span className="text-xs text-slate-300 leading-relaxed">{a.text}</span>
          </div>
        )}
      </div>
    </div>);

}