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
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex flex-col gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Tržby</h3>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                activePreset === p.label
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-40">
            <DatePicker value={range.from} onChange={v => handleDateChange("from", v)} placeholder="Od" />
          </div>
          <span className="text-xs text-gray-400">–</span>
          <div className="w-40">
            <DatePicker value={range.to} onChange={v => handleDateChange("to", v)} placeholder="Do" />
          </div>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toLocaleString()} Kč`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #f3f4f6", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12, padding: "6px 10px" }}
              formatter={(v) => [`${v.toLocaleString()} Kč`, "Tržby"]}
              labelStyle={{ color: "#6b7280", fontWeight: 500 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}