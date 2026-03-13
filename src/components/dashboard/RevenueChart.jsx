import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DatePicker from "@/components/ui-custom/DatePicker";

const PRESETS = [
  { label: "Včera", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split("T")[0]; return { from: s, to: s }; } },
  { label: "Posledních 7 dní", getValue: () => { const to = new Date().toISOString().split("T")[0]; const from = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]; return { from, to }; } },
  { label: "Tento měsíc", getValue: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]; const to = now.toISOString().split("T")[0]; return { from, to }; } },
  { label: "Minulý měsíc", getValue: () => { const now = new Date(); const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]; const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]; return { from, to }; } },
  { label: "Posledních 30 dní", getValue: () => { const to = new Date().toISOString().split("T")[0]; const from = new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0]; return { from, to }; } },
];

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
  const [activePreset, setActivePreset] = useState("Posledních 7 dní");

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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Tržby</h3>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets */}
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                activePreset === p.label
                  ? "bg-[#C9A227] text-white border-[#C9A227] shadow-sm shadow-amber-200"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#C9A227] hover:text-[#C9A227]"
              }`}
            >
              {p.label}
            </button>
          ))}

          <span className="text-xs text-gray-300">|</span>

          {/* Custom range */}
          <div className="flex items-center gap-1.5">
            <div className="w-36">
              <DatePicker value={range.from} onChange={v => handleDateChange("from", v)} placeholder="Od" />
            </div>
            <span className="text-xs text-gray-400">–</span>
            <div className="w-36">
              <DatePicker value={range.to} onChange={v => handleDateChange("to", v)} placeholder="Do" />
            </div>
          </div>
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
            <CartesianGrid strokeDasharray="4 4" stroke="#f5f3ec" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a0a0a8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a0a0a8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toLocaleString()} Kč`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e8d99a", boxShadow: "0 8px 24px rgba(201,162,39,0.12)", fontSize: 12, padding: "8px 12px" }}
              formatter={(v) => [`${v.toLocaleString()} Kč`, "Tržby"]}
              labelStyle={{ color: "#A8841C", fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="url(#lineGrad)" strokeWidth={3} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#C9A227", strokeWidth: 2, stroke: "#fff" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}