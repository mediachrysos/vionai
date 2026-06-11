import React, { useState, useMemo } from "react";
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";

const PRESETS = [
  { label: "7 dní", days: 7 },
  { label: "14 dní", days: 14 },
  { label: "30 dní", days: 30 },
  { label: "90 dní", days: 90 },
  { label: "6 měsíců", days: 180 },
  { label: "12 měsíců", days: 365 },
];

function formatCZK(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return v.toLocaleString("cs-CZ");
}

function buildData(payments, from, to) {
  const days = [];
  const start = new Date(from);
  const end = new Date(to);
  const diffDays = Math.round((end - start) / 86400000);

  // For longer ranges group by week or month
  if (diffDays > 90) {
    // Group by month
    const months = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = 0;
    }
    payments.forEach(p => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (!pd || pd < from || pd > to) return;
      const key = pd.slice(0, 7);
      if (months[key] !== undefined) months[key] += p.amount || 0;
    });
    Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, revenue]) => {
      const d = new Date(key + "-01");
      days.push({
        date: d.toLocaleDateString("cs", { month: "short", year: "2-digit" }),
        revenue,
      });
    });
  } else if (diffDays > 30) {
    // Group by week
    const weeks = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.toISOString().split("T")[0];
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().split("T")[0];
      if (!weeks[key]) weeks[key] = 0;
    }
    payments.forEach(p => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (!pd || pd < from || pd > to) return;
      const d = new Date(pd);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().split("T")[0];
      if (weeks[key] !== undefined) weeks[key] += p.amount || 0;
    });
    Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, revenue]) => {
      const d = new Date(key);
      days.push({
        date: d.toLocaleDateString("cs", { day: "numeric", month: "short" }),
        revenue,
      });
    });
  } else {
    // Daily
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const total = payments
        .filter(p => (p.payment_date || p.created_date?.split("T")[0]) === dateStr)
        .reduce((s, p) => s + (p.amount || 0), 0);
      days.push({
        date: d.toLocaleDateString("cs", { day: "numeric", month: "short" }),
        revenue: total,
      });
    }
  }
  return days;
}

function StatMini({ label, value, change, sparkData }) {
  const isPos = change >= 0;
  return (
    <div className="flex-1 bg-gray-50 rounded-xl p-4 flex flex-col gap-1 min-w-[140px]">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPos ? "text-emerald-500" : "text-red-400"}`}>
        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPos ? "+" : ""}{change.toFixed(1)}%
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e8d99a] rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="text-[#A8841C] font-semibold mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#C9A227]" />
        <span className="text-gray-600">Tržby:</span>
        <span className="font-bold text-gray-900">{(payload[0]?.value || 0).toLocaleString("cs-CZ")} Kč</span>
      </div>
    </div>
  );
};

export default function AnalyticsChart({ payments = [] }) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [showPresets, setShowPresets] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const { from, to } = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    const toDate = new Date();
    const fromDate = new Date(Date.now() - (selectedDays - 1) * 86400000);
    return {
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
    };
  }, [selectedDays, useCustom, customFrom, customTo]);

  const data = useMemo(() => buildData(payments, from, to), [payments, from, to]);

  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.revenue, 0), [data]);

  // Compare to previous period
  const prevFrom = useMemo(() => {
    const diff = new Date(to) - new Date(from);
    return new Date(new Date(from) - diff).toISOString().split("T")[0];
  }, [from, to]);
  const prevTo = useMemo(() => new Date(new Date(from) - 86400000).toISOString().split("T")[0], [from]);
  const prevData = useMemo(() => buildData(payments, prevFrom, prevTo), [payments, prevFrom, prevTo]);
  const prevTotal = useMemo(() => prevData.reduce((s, d) => s + d.revenue, 0), [prevData]);
  const changePercent = prevTotal > 0 ? ((totalRevenue - prevTotal) / prevTotal) * 100 : 0;

  // Best day
  const bestDay = useMemo(() => data.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, null), [data]);

  // Avg per period unit
  const avg = data.length > 0 ? totalRevenue / data.length : 0;

  const activePresetLabel = useCustom
    ? `${customFrom} – ${customTo}`
    : PRESETS.find(p => p.days === selectedDays)?.label || `${selectedDays} dní`;

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Celkové tržby</p>
          <p className="text-3xl font-bold text-gray-900">{totalRevenue.toLocaleString("cs-CZ")} Kč</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(from).toLocaleDateString("cs", { day: "numeric", month: "short", year: "numeric" })}
            {" – "}
            {new Date(to).toLocaleDateString("cs", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* Period selector */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2 transition-colors"
          >
            {activePresetLabel}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showPresets && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-3 min-w-[220px]">
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {PRESETS.map(p => (
                  <button
                    key={p.days}
                    onClick={() => { setSelectedDays(p.days); setUseCustom(false); setShowPresets(false); }}
                    className={`text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                      !useCustom && selectedDays === p.days
                        ? "bg-[#C9A227] text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-[#C9A227]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs text-gray-400 font-medium">Vlastní rozmezí</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                  />
                </div>
                <button
                  onClick={() => { if (customFrom && customTo) { setUseCustom(true); setShowPresets(false); } }}
                  disabled={!customFrom || !customTo}
                  className="w-full text-xs font-medium bg-[#C9A227] text-white rounded-lg py-1.5 hover:bg-[#A8841C] disabled:opacity-40 transition-colors"
                >
                  Použít
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.25} />
                <stop offset="70%" stopColor="#e8c84a" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#C9A227" />
                <stop offset="100%" stopColor="#e8c84a" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#b0a98a" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#b0a98a" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCZK}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(201,162,39,0.06)" }} />
            <Bar dataKey="revenue" fill="#f5e9c2" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="url(#goldLine)"
              strokeWidth={2.5}
              fill="url(#goldGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#C9A227", strokeWidth: 2, stroke: "#fff" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 mt-5">
        <StatMini
          label="Změna oproti předchozímu období"
          value={`${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`}
          change={changePercent}
        />
        <div className="flex-1 bg-gray-50 rounded-xl p-4 min-w-[140px]">
          <p className="text-xs text-gray-400 font-medium">Průměr / den</p>
          <p className="text-xl font-bold text-gray-900">{Math.round(avg).toLocaleString("cs-CZ")} Kč</p>
        </div>
        <div className="flex-1 bg-amber-50 rounded-xl p-4 min-w-[140px]">
          <p className="text-xs text-[#A8841C] font-medium">Nejlepší den</p>
          <p className="text-xl font-bold text-[#C9A227]">{bestDay ? bestDay.revenue.toLocaleString("cs-CZ") : 0} Kč</p>
          <p className="text-xs text-amber-400">{bestDay?.date || "–"}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl p-4 min-w-[140px]">
          <p className="text-xs text-gray-400 font-medium">Předchozí období</p>
          <p className="text-xl font-bold text-gray-500">{prevTotal.toLocaleString("cs-CZ")} Kč</p>
        </div>
      </div>
    </div>
  );
}