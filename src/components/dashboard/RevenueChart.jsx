import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RangePicker, { PRESETS } from "./RangePicker";

function getDefaultRange() {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
  return { from, to };
}

function buildChartData(payments, from, to) {
  const days = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const total = payments
      .filter(p => (p.payment_date || p.created_date?.split("T")[0]) === dateStr)
      .reduce((s, p) => s + (p.amount || 0), 0);
    days.push({
      date: new Date(dateStr).toLocaleDateString("cs", { day: "numeric", month: "short" }),
      revenue: total,
    });
  }
  return days;
}

export default function RevenueChart({ payments }) {
  const [range, setRange] = useState(getDefaultRange());
  const [activePreset, setActivePreset] = useState("Last 7 days");

  const handlePreset = (preset) => {
    setRange(preset.getValue());
    setActivePreset(preset.label);
  };

  const handleDateChange = (key, val) => {
    setRange(prev => ({ ...prev, [key]: val }));
    setActivePreset(null);
  };

  const data = buildChartData(payments, range.from, range.to);

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Revenue</h3>

        <div className="flex items-center gap-2">
          <RangePicker range={range} activePreset={activePreset} onPreset={handlePreset} onDateChange={handleDateChange} />
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.20} />
                <stop offset="60%" stopColor="#e8c84a" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C9A227" />
                <stop offset="100%" stopColor="#e8c84a" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toLocaleString()}`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #333", background: "#1e1e1e", color: "#e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", fontSize: 12, padding: "8px 12px" }}
              formatter={(v) => [`${v.toLocaleString()}`, "Revenue"]}
              labelStyle={{ color: "#C9A227", fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="url(#lineGrad)" strokeWidth={3} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#C9A227", strokeWidth: 2, stroke: "#fff" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}