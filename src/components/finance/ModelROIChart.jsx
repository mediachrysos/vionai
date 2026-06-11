import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";

const COLORS = [
  "#C9A227", "#6366f1", "#10b981", "#ef4444", "#3b82f6",
  "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const RANGES = [
  { label: "30 dní", days: 30 },
  { label: "60 dní", days: 60 },
  { label: "90 dní", days: 90 },
  { label: "Vše", days: null },
];

export default function ModelROIChart({ payments, adSpends, models }) {
  const [range, setRange] = useState(30);

  const { chartData, modelNames } = useMemo(() => {
    if (!payments.length || !adSpends.length || !models.length) return { chartData: [], modelNames: [] };

    // Precompute first payment per (customer, model) — sorted ascending
    const firstPaymentByCustomerModel = {};
    [...payments]
      .sort((a, b) => {
        const da = a.payment_date || a.created_date?.split("T")[0] || "";
        const db = b.payment_date || b.created_date?.split("T")[0] || "";
        return da > db ? 1 : -1;
      })
      .forEach((p) => {
        if (!p.customer_id || !p.model_id) return;
        const key = `${p.customer_id}__${p.model_id}`;
        if (!firstPaymentByCustomerModel[key]) firstPaymentByCustomerModel[key] = p;
      });

    // Collect all unique dates from adSpends
    const allDates = [...new Set(adSpends.map((a) => a.date))].sort();

    // Filter by range
    const cutoff = range
      ? (() => { const d = new Date(); d.setDate(d.getDate() - range); return d.toISOString().split("T")[0]; })()
      : null;
    const dates = cutoff ? allDates.filter((d) => d >= cutoff) : allDates;

    const activeModels = models.filter((m) => {
      // Only show models that have at least one ad spend entry
      return adSpends.some((a) => a.model_id === m.id);
    });

    // For each date, compute ROI per model
    const newPairsByDate = {};
    Object.values(firstPaymentByCustomerModel).forEach((p) => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      if (!d) return;
      if (!newPairsByDate[d]) newPairsByDate[d] = {};
      if (!newPairsByDate[d][p.model_id]) newPairsByDate[d][p.model_id] = new Set();
      newPairsByDate[d][p.model_id].add(`${p.customer_id}__${p.model_id}`);
    });

    // Revenue per date per model from new customers
    const revenueByDateModel = {};
    payments.forEach((p) => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (!pd || !p.customer_id || !p.model_id) return;
      const pair = `${p.customer_id}__${p.model_id}`;
      // Check if this pair's first payment is on pd
      const fp = firstPaymentByCustomerModel[pair];
      if (!fp) return;
      const fpDate = fp.payment_date || fp.created_date?.split("T")[0];
      if (fpDate !== pd) return;
      if (!revenueByDateModel[pd]) revenueByDateModel[pd] = {};
      revenueByDateModel[pd][p.model_id] = (revenueByDateModel[pd][p.model_id] || 0) + (p.amount || 0);
    });

    // Ad spend per date per model
    const spendByDateModel = {};
    adSpends.forEach((a) => {
      if (!a.model_id) return;
      if (!spendByDateModel[a.date]) spendByDateModel[a.date] = {};
      spendByDateModel[a.date][a.model_id] = (spendByDateModel[a.date][a.model_id] || 0) + (a.amount || 0);
    });

    const chartData = dates.map((d) => {
      const point = { date: d };
      activeModels.forEach((m) => {
        const spend = spendByDateModel[d]?.[m.id] || 0;
        const revenue = revenueByDateModel[d]?.[m.id] || 0;
        point[m.id] = spend > 0 ? Math.round(((revenue - spend) / spend) * 100) : null;
      });
      return point;
    });

    return { chartData, modelNames: activeModels };
  }, [payments, adSpends, models, range]);

  if (!chartData.length) return null;

  const formatDate = (d) => {
    const dt = new Date(d);
    return `${dt.getDate()}.${dt.getMonth() + 1}.`;
  };

  return (
    <div className="mt-5 pt-5 border-t border-white/10">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-300">ROI v čase dle modelky</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                range === r.days
                  ? "bg-slate-200 text-slate-900"
                  : "bg-white/10 text-slate-400 hover:bg-white/20"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine y={0} stroke="#3f3f3f" strokeWidth={1.5} />
          <Tooltip
            formatter={(val, name) => {
              const model = modelNames.find((m) => m.id === name);
              return [val !== null ? `${val}%` : "—", model?.name || name];
            }}
            labelFormatter={formatDate}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #333", background: "#1e1e1e", color: "#e2e8f0" }}
          />
          <Legend
            formatter={(value) => {
              const model = modelNames.find((m) => m.id === value);
              return <span style={{ fontSize: 11 }}>{model?.name || value}</span>;
            }}
          />
          {modelNames.map((m, i) => (
            <Line
              key={m.id}
              type="monotone"
              dataKey={m.id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}