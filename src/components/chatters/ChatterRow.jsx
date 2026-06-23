import React, { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

function relTime(dateStr, createdDate) {
  const base = createdDate || dateStr;
  if (!base) return "—";
  const now = new Date();
  const d = new Date(base.includes("T") ? base : base + "T12:00:00");
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const today = now.toISOString().split("T")[0];
  const dStr = d.toISOString().split("T")[0];
  if (dStr === today) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (dStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusBadge(status) {
  const map = {
    top: { cls: "bg-emerald-950/50 text-emerald-400 border-emerald-700/30", label: "Top Performer" },
    stable: { cls: "bg-sky-950/50 text-sky-400 border-sky-700/30", label: "Stable" },
    below: { cls: "bg-amber-950/50 text-amber-400 border-amber-700/30", label: "Below Average" },
    new: { cls: "bg-purple-950/50 text-purple-400 border-purple-700/30", label: "New Chatter" },
    nodata: { cls: "bg-slate-800 text-slate-500 border-white/10", label: "No Data" },
  };
  return map[status] || map.nodata;
}

export default function ChatterRow({ chatter, payments, prevPayments, shifts, models, payouts, rank }) {
  const [expanded, setExpanded] = useState(false);
  const [chartRange, setChartRange] = useState(7);

  const email = chatter.email;
  const name = chatter.full_name || chatter.nickname || email;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const myPayments = payments.filter(p => p.chatter_email === email);
  const myPrevPayments = prevPayments.filter(p => p.chatter_email === email);
  const myShifts = shifts.filter(s => s.chatter_email === email);

  const revenue = myPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const prevRevenue = myPrevPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paymentCount = myPayments.length;
  const avgPayment = paymentCount > 0 ? Math.round(revenue / paymentCount) : 0;
  const shiftCount = myShifts.length;

  const trendPct = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  let status = "nodata";
  if (revenue > 0) {
    if (rank === 1) status = "top";
    else if (trendPct === null) status = "new";
    else if (trendPct >= 15) status = "top";
    else if (trendPct <= -20) status = "below";
    else status = "stable";
  }

  const badge = getStatusBadge(status);
  const assignedModels = models.filter(m => m.assigned_chatters?.includes(email));
  const myPayouts = payouts.filter(p => p.chatter_email === email);
  const latestPayout = myPayouts.sort((a, b) => (b.period || "").localeCompare(a.period || ""))[0];

  const chartData = Array.from({ length: chartRange }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (chartRange - 1 - i));
    const ds = d.toISOString().split("T")[0];
    const rev = myPayments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === ds)
      .reduce((s, p) => s + (p.amount || 0), 0);
    return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: rev };
  });

  const recentPmts = [...myPayments]
    .sort((a, b) => new Date(b.created_date || b.payment_date) - new Date(a.created_date || a.payment_date))
    .slice(0, 8);

  // Stats
  const byDay = {};
  myPayments.forEach(p => {
    const d = p.payment_date || p.created_date?.split("T")[0];
    if (d) byDay[d] = (byDay[d] || 0) + (p.amount || 0);
  });
  const dayEntries = Object.entries(byDay);
  const bestDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
  const worstDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => b[1] < a[1] ? b : a) : null;
  const avgPerShift = shiftCount > 0 && revenue > 0 ? Math.round(revenue / shiftCount) : null;

  return (
    <>
      <tr
        onClick={() => setExpanded(v => !v)}
        className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227] text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">{name}</p>
              <p className="text-[10px] text-slate-500">{email.split("@")[0]}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-white">{revenue.toLocaleString("cs-CZ")}</span>
          <span className="text-[10px] text-slate-500 ml-1">CZK</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs font-semibold text-slate-300">{paymentCount}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-slate-400">{avgPayment > 0 ? avgPayment.toLocaleString("cs-CZ") : "—"}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs text-slate-400">{shiftCount > 0 ? shiftCount : "—"}</span>
        </td>
        <td className="px-4 py-3 text-center">
          {avgPerShift ? (
            <div>
              <span className="text-xs text-slate-300">{avgPerShift.toLocaleString("cs-CZ")}</span>
              <p className="text-[9px] text-slate-600">/ shift</p>
            </div>
          ) : <span className="text-xs text-slate-600">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {trendPct === null ? (
            <span className="text-[10px] text-slate-600">—</span>
          ) : trendPct > 0 ? (
            <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-400">
              <TrendingUp className="w-3 h-3" />+{trendPct}%
            </span>
          ) : trendPct < 0 ? (
            <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-red-400">
              <TrendingDown className="w-3 h-3" />{trendPct}%
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <Minus className="w-3 h-3" />0%
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
        </td>
        <td className="px-3 py-3 text-center">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-600 group-hover:text-slate-400 transition-colors mx-auto">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="bg-[#161616] border-b border-white/5">
            <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* A: Assigned Models */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-3">Assigned Models</p>
                {assignedModels.length === 0 ? (
                  <p className="text-xs text-slate-600">No models assigned</p>
                ) : (
                  <div className="space-y-2">
                    {assignedModels.map(model => {
                      const mPmts = myPayments.filter(p => p.model_id === model.id || p.model_name === model.name);
                      const mRev = mPmts.reduce((s, p) => s + (p.amount || 0), 0);
                      const lastPmt = [...mPmts].sort((a, b) => new Date(b.created_date || b.payment_date) - new Date(a.created_date || a.payment_date))[0];
                      return (
                        <div key={model.id} className="flex items-center gap-3 bg-[#1e1e1e] rounded-lg px-3 py-2.5 border border-white/6">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 overflow-hidden">
                            {model.profile_photo
                              ? <img src={model.profile_photo} alt="" className="w-full h-full object-cover" />
                              : model.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200">{model.name}</p>
                            <p className="text-[10px] text-slate-500">{mPmts.length} pmts · {mRev.toLocaleString("cs-CZ")} CZK</p>
                          </div>
                          <p className="text-[10px] text-slate-500 flex-shrink-0">
                            {lastPmt ? relTime(lastPmt.payment_date, lastPmt.created_date) : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* B: Chart */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Revenue Over Time</p>
                  <div className="flex gap-1">
                    {[7, 30].map(r => (
                      <button key={r} onClick={e => { e.stopPropagation(); setChartRange(r); }}
                        className={`h-5 px-2 rounded text-[10px] font-medium transition-colors ${chartRange === r ? "bg-[#C9A227] text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {r}d
                      </button>
                    ))}
                  </div>
                </div>
                {revenue === 0 ? (
                  <p className="text-xs text-slate-600 py-4 text-center">No payments in this period</p>
                ) : (
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <Tooltip
                          contentStyle={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                          formatter={(v) => [`${v.toLocaleString("cs-CZ")} CZK`, "Revenue"]}
                        />
                        <Bar dataKey="revenue" fill="#C9A227" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {(bestDay || avgPerShift) && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                    {bestDay && (
                      <div className="bg-[#1e1e1e] rounded-lg px-2 py-1.5 border border-white/6">
                        <p className="text-slate-500">Best Day</p>
                        <p className="text-emerald-400 font-semibold">{bestDay[1].toLocaleString("cs-CZ")} CZK</p>
                      </div>
                    )}
                    {worstDay && bestDay && worstDay[0] !== bestDay[0] && (
                      <div className="bg-[#1e1e1e] rounded-lg px-2 py-1.5 border border-white/6">
                        <p className="text-slate-500">Weakest Day</p>
                        <p className="text-amber-400 font-semibold">{worstDay[1].toLocaleString("cs-CZ")} CZK</p>
                      </div>
                    )}
                    {avgPerShift && (
                      <div className="col-span-2 bg-[#1e1e1e] rounded-lg px-2 py-1.5 border border-white/6">
                        <p className="text-slate-500">Avg Revenue / Shift</p>
                        <p className="text-white font-semibold">{avgPerShift.toLocaleString("cs-CZ")} CZK</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* C+D: Recent Payments + Payout */}
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Recent Payments</p>
                  {recentPmts.length === 0 ? (
                    <p className="text-xs text-slate-600">No payments in this period</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentPmts.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-slate-300 truncate">{p.customer_name || "—"}</span>
                          <span className="text-slate-500 text-[10px] flex-shrink-0">{p.model_name || "—"}</span>
                          <span className="text-white font-semibold flex-shrink-0">{(p.amount || 0).toLocaleString("cs-CZ")} CZK</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Estimated Payout</p>
                  {latestPayout ? (
                    <div className="bg-[#1e1e1e] rounded-lg px-3 py-2 border border-white/6">
                      <p className="text-xs font-semibold text-slate-200">{latestPayout.amount?.toLocaleString("cs-CZ")} CZK</p>
                      <p className="text-[10px] text-slate-500">Period: {latestPayout.period || "—"}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">Payout calculation pending</p>
                  )}
                </div>

                <Link
                  to={`/ChatterDetail?id=${encodeURIComponent(email)}`}
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#C9A227] hover:text-[#f5d56e] transition-colors font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full Chatter Profile
                </Link>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}