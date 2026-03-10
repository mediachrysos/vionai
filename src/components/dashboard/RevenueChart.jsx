import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueChart({ payments }) {
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayPayments = payments.filter(
      p => p.payment_date === dateStr || (!p.payment_date && p.created_date?.startsWith(dateStr))
    );
    const total = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    last7Days.push({
      date: d.toLocaleDateString("cs", { weekday: "short", day: "numeric" }),
      revenue: total,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Tržby — posledních 7 dní</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last7Days} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #f3f4f6",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                fontSize: 12,
                padding: "6px 10px",
              }}
              formatter={(v) => [`$${v.toLocaleString()}`, "Tržby"]}
              labelStyle={{ color: "#6b7280", fontWeight: 500 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}