import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueChart({ payments }) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayPayments = payments.filter(p => p.payment_date === dateStr || (!p.payment_date && p.created_date?.startsWith(dateStr)));
    const total = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    last7Days.push({
      date: d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
      revenue: total,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue (Last 7 Days)</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last7Days}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}