import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function RevenueByModel({ payments, models }) {
  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  const byModel = {};
  payments.forEach(p => {
    const name = p.model_name || modelMap[p.model_id] || "Unassigned";
    byModel[name] = (byModel[name] || 0) + (p.amount || 0);
  });

  const data = Object.entries(byModel)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Revenue by Model</h3>
      <div className="h-[220px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">No data yet</div>
        )}
      </div>
    </div>
  );
}