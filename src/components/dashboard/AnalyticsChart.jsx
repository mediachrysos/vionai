import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import { ChevronDown, Calendar, TrendingDown } from "lucide-react";

const PRESETS = [
  { label: "Posledních 7 dní", days: 7 },
  { label: "Posledních 14 dní", days: 14 },
  { label: "Posledních 30 dní", days: 30 },
  { label: "Posledních 90 dní", days: 90 },
  { label: "6 měsíců", days: 180 },
  { label: "12 měsíců", days: 365 },
];

function fmt(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M Kč`;
  if (v >= 1000) return `${Math.round(v / 1000)}K Kč`;
  return `${v.toLocaleString("cs-CZ")} Kč`;
}

function fmtShort(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return String(v);
}

function toDateStr(d) { return d.toISOString().split("T")[0]; }

function buildDailyData(payments, adSpends, from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const diffDays = Math.round((end - start) / 86400000);

  const bucket = {}; // key => { gross, adSpend }

  if (diffDays > 90) {
    // monthly
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!bucket[key]) bucket[key] = { gross: 0, adSpend: 0, label: d.toLocaleDateString("cs", { month: "short", year: "2-digit" }) };
    }
    payments.forEach(p => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (!pd || pd < from || pd > to) return;
      const key = pd.slice(0, 7);
      if (bucket[key]) bucket[key].gross += p.amount || 0;
    });
    adSpends.forEach(a => {
      const pd = a.date;
      if (!pd || pd < from || pd > to) return;
      const key = pd.slice(0, 7);
      if (bucket[key]) bucket[key].adSpend += a.amount || 0;
    });
    return Object.entries(bucket).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => ({
      date: v.label, gross: v.gross, net: Math.max(0, v.gross - v.adSpend)
    }));
  } else if (diffDays > 30) {
    // weekly
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ws = new Date(d);
      ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = toDateStr(ws);
      if (!bucket[key]) bucket[key] = { gross: 0, adSpend: 0, label: ws.toLocaleDateString("cs", { day: "numeric", month: "short" }) };
    }
    payments.forEach(p => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (!pd || pd < from || pd > to) return;
      const d = new Date(pd);
      const ws = new Date(d);
      ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = toDateStr(ws);
      if (bucket[key]) bucket[key].gross += p.amount || 0;
    });
    adSpends.forEach(a => {
      const pd = a.date;
      if (!pd || pd < from || pd > to) return;
      const d = new Date(pd);
      const ws = new Date(d);
      ws.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = toDateStr(ws);
      if (bucket[key]) bucket[key].adSpend += a.amount || 0;
    });
    return Object.entries(bucket).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => ({
      date: v.label, gross: v.gross, net: Math.max(0, v.gross - v.adSpend)
    }));
  } else {
    // daily
    const result = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toDateStr(d);
      const gross = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === dateStr).reduce((s, p) => s + (p.amount || 0), 0);
      const adSpend = adSpends.filter(a => a.date === dateStr).reduce((s, a) => s + (a.amount || 0), 0);
      result.push({
        date: d.toLocaleDateString("cs", { day: "numeric", month: "short" }),
        gross,
        net: Math.max(0, gross - adSpend),
      });
    }
    return result;
  }
}

const CustomTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload?.length) return null;
  const val = mode === "net" ? payload.find(p => p.dataKey === "net") : payload.find(p => p.dataKey === "gross");
  return (
    <div className="bg-[#252525] border border-white/10 rounded-xl shadow-2xl px-4 py-3 text-sm">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      <p className="font-bold text-white">{fmt(val?.value || 0)}</p>
      {payload.find(p => p.dataKey === "gross") && payload.find(p => p.dataKey === "net") && (
        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
          <p>Gross: {fmt(payload.find(p => p.dataKey === "gross")?.value || 0)}</p>
          <p>Net: {fmt(payload.find(p => p.dataKey === "net")?.value || 0)}</p>
        </div>
      )}
    </div>
  );
};

const MiniSparkline = ({ data, dataKey, color }) => (
  <ResponsiveContainer width="100%" height={50}>
    <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

export default function AnalyticsChart({ payments = [], adSpends = [], models = [] }) {
  const [selectedDays, setSelectedDays] = useState(30);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("all");
  const [chartMode, setChartMode] = useState("net"); // "net" | "gross"

  const { from, to } = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    const toDate = new Date();
    const fromDate = new Date(Date.now() - (selectedDays - 1) * 86400000);
    return { from: toDateStr(fromDate), to: toDateStr(toDate) };
  }, [selectedDays, useCustom, customFrom, customTo]);

  // Filter payments by model
  const filteredPayments = useMemo(() =>
    selectedModelId === "all" ? payments : payments.filter(p => p.model_id === selectedModelId),
    [payments, selectedModelId]
  );

  const filteredAdSpends = useMemo(() =>
    selectedModelId === "all" ? adSpends : adSpends.filter(a => a.model_id === selectedModelId),
    [adSpends, selectedModelId]
  );

  const data = useMemo(() => buildDailyData(filteredPayments, filteredAdSpends, from, to), [filteredPayments, filteredAdSpends, from, to]);

  const totalGross = useMemo(() => data.reduce((s, d) => s + d.gross, 0), [data]);
  const totalNet = useMemo(() => data.reduce((s, d) => s + d.net, 0), [data]);

  // This month stats
  const thisMonthFrom = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);
  const thisMonthData = useMemo(() => buildDailyData(filteredPayments, filteredAdSpends, thisMonthFrom, toDateStr(new Date())), [filteredPayments, filteredAdSpends, thisMonthFrom]);
  const thisMonthGross = useMemo(() => thisMonthData.reduce((s, d) => s + d.gross, 0), [thisMonthData]);
  const thisMonthNet = useMemo(() => thisMonthData.reduce((s, d) => s + d.net, 0), [thisMonthData]);

  // Previous period comparison for "this month"
  const prevMonthFrom = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return toDateStr(prev);
  }, []);
  const prevMonthTo = useMemo(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return toDateStr(last);
  }, []);
  const prevMonthData = useMemo(() => buildDailyData(filteredPayments, filteredAdSpends, prevMonthFrom, prevMonthTo), [filteredPayments, filteredAdSpends, prevMonthFrom, prevMonthTo]);
  const prevMonthGross = useMemo(() => prevMonthData.reduce((s, d) => s + d.gross, 0), [prevMonthData]);
  const monthDiff = thisMonthGross - prevMonthGross;

  const activePresetLabel = useCustom
    ? `${customFrom} – ${customTo}`
    : PRESETS.find(p => p.days === selectedDays)?.label || `${selectedDays} dní`;

  const selectedModel = models.find(m => m.id === selectedModelId);
  const dateRangeLabel = `${new Date(from).toLocaleDateString("cs", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(to).toLocaleDateString("cs", { day: "numeric", month: "short", year: "numeric" })}`;
  const thisMonthLabel = new Date().toLocaleDateString("cs", { month: "long", year: "numeric" });

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] p-5">
      {/* Top controls */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Period preset */}
        <div className="relative">
          <button
            onClick={() => { setShowPresetMenu(v => !v); setShowDateMenu(false); setShowModelMenu(false); }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
          >
            {activePresetLabel}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPresetMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#252525] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[190px]">
              {PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => { setSelectedDays(p.days); setUseCustom(false); setShowPresetMenu(false); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${
                    !useCustom && selectedDays === p.days ? "bg-[#C9A227] text-white font-medium" : "text-slate-300 hover:bg-slate-700/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range picker */}
        <div className="relative">
          <button
            onClick={() => { setShowDateMenu(v => !v); setShowPresetMenu(false); setShowModelMenu(false); }}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            {dateRangeLabel}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showDateMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#252525] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[240px]">
              <p className="text-xs text-slate-400 font-medium mb-2">Vlastní datum</p>
              <div className="flex gap-2 mb-2">
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="flex-1 text-xs border border-slate-600 bg-slate-700/50 text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C9A227]" />
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="flex-1 text-xs border border-slate-600 bg-slate-700/50 text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C9A227]" />
              </div>
              <button
                onClick={() => { if (customFrom && customTo) { setUseCustom(true); setShowDateMenu(false); } }}
                disabled={!customFrom || !customTo}
                className="w-full text-xs font-medium bg-[#C9A227] text-white rounded-lg py-1.5 hover:bg-[#A8841C] disabled:opacity-40 transition-colors"
              >
                Použít
              </button>
            </div>
          )}
        </div>

        {/* Model filter */}
        {models.length > 0 && (
          <div className="relative">
            <button
              onClick={() => { setShowModelMenu(v => !v); setShowPresetMenu(false); setShowDateMenu(false); }}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
            >
              {selectedModel ? selectedModel.name : "Všechny modely"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelMenu && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#252525] border border-white/10 rounded-xl shadow-2xl p-2 min-w-[180px] max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedModelId("all"); setShowModelMenu(false); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedModelId === "all" ? "bg-[#C9A227] text-white font-medium" : "text-slate-300 hover:bg-slate-700/50"}`}
                >
                  Všechny modely
                </button>
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModelId(m.id); setShowModelMenu(false); }}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-all ${selectedModelId === m.id ? "bg-[#C9A227] text-white font-medium" : "text-slate-300 hover:bg-slate-700/50"}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Earnings card */}
        <div className="bg-[#252525] rounded-xl p-4 border border-white/10">
          <p className="text-sm text-slate-400 font-medium mb-1">Earnings</p>
          <p className="text-2xl font-bold text-white">{fmt(totalGross)}</p>
          <p className="text-xs text-slate-500 mb-3">{dateRangeLabel}</p>
          <MiniSparkline data={data} dataKey="gross" color="#C9A227" />
        </div>

        {/* This month card */}
        <div className="bg-[#252525] rounded-xl p-4 border border-white/10">
          <p className="text-sm text-slate-400 font-medium mb-1">This month</p>
          <div className="flex items-start gap-2">
            <p className="text-2xl font-bold text-white">{fmt(thisMonthGross)}</p>
            {monthDiff !== 0 && (
              <span className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded-md ${monthDiff < 0 ? "bg-red-900/50 text-red-400" : "bg-emerald-900/50 text-emerald-400"}`}>
                {monthDiff < 0 ? "– " : "+ "}{Math.abs(monthDiff).toLocaleString("cs-CZ")} Kč
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">{thisMonthLabel}</p>
          <MiniSparkline data={thisMonthData} dataKey="gross" color="#C9A227" />
        </div>
      </div>

      {/* Earnings over time */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-sm font-semibold text-slate-200">Earnings over time</p>
          <div className="flex items-center gap-1 bg-slate-800 rounded-full p-1">
            <button
              onClick={() => setChartMode("net")}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${chartMode === "net" ? "bg-[#C9A227] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              Net
            </button>
            <button
              onClick={() => setChartMode("gross")}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${chartMode === "gross" ? "bg-[#C9A227] text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              Gross
            </button>
          </div>
        </div>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={44} />
              <Tooltip content={<CustomTooltip mode={chartMode} />} cursor={{ stroke: "#334155", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey={chartMode}
                stroke="#C9A227"
                strokeWidth={2}
                fill="url(#chartGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#C9A227", strokeWidth: 2, stroke: "#0F172A" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Net / Gross summary */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
          <div>
            <p className="text-xs text-slate-500">Gross (celkem)</p>
            <p className="text-sm font-bold text-slate-200">{fmt(totalGross)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net (po ad spend)</p>
            <p className="text-sm font-bold text-[#C9A227]">{fmt(totalNet)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}