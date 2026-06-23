import React, { useMemo, useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
  if (dStr === today) return `Today at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (dStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ChatterDetail({ currentUser }) {
  const params = new URLSearchParams(window.location.search);
  const chatterId = params.get("id");

  const [chartRange, setChartRange] = useState(30);
  const [pmtSort, setPmtSort] = useState("newest");
  const [pmtModelFilter, setPmtModelFilter] = useState("all");

  const { data: payments = [] } = usePayments();
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), staleTime: 120000 });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list(), staleTime: 120000 });
  const { data: allShifts = [] } = useQuery({ queryKey: ["all-chatter-shifts"], queryFn: () => base44.entities.ChatterShift.list("-date", 2000), staleTime: 15000 });
  const { data: payouts = [] } = useQuery({ queryKey: ["chatterPayouts"], queryFn: () => base44.entities.ChatterPayout.list("-period", 500), staleTime: 60000 });

  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-500 text-sm">Access restricted to admins.</div>;
  }

  const chatter = users.find(u => u.email === chatterId);

  if (!chatterId || !chatter) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-slate-500 text-sm">Chatter not found.</p>
        <Link to="/ChattersPerformance" className="text-[#C9A227] text-sm hover:underline">← Back to Chatters Performance</Link>
      </div>
    );
  }

  const name = chatter.full_name || chatter.nickname || chatterId;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const myPayments = payments.filter(p => p.chatter_email === chatterId);
  const myShifts = allShifts.filter(s => s.chatter_email === chatterId);
  const myPayouts = payouts.filter(p => p.chatter_email === chatterId);
  const myModels = models.filter(m => m.assigned_chatters?.includes(chatterId));

  const revenue = myPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const latestPayout = [...myPayouts].sort((a, b) => (b.period || "").localeCompare(a.period || ""))[0];

  // Chart data
  const chartData = Array.from({ length: chartRange }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (chartRange - 1 - i));
    const ds = d.toISOString().split("T")[0];
    const rev = myPayments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === ds)
      .reduce((s, p) => s + (p.amount || 0), 0);
    return { date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: rev };
  });

  // Model breakdown
  const modelBreakdown = myModels.map(model => {
    const mPmts = myPayments.filter(p => p.model_id === model.id || p.model_name === model.name);
    const mRev = mPmts.reduce((s, p) => s + (p.amount || 0), 0);
    const lastPmt = [...mPmts].sort((a, b) => new Date(b.created_date || b.payment_date) - new Date(a.created_date || a.payment_date))[0];
    return { model, mPmts, mRev, lastPmt, pct: revenue > 0 ? Math.round((mRev / revenue) * 100) : 0 };
  }).sort((a, b) => b.mRev - a.mRev);

  // Payment history with filters
  const filteredPmts = myPayments
    .filter(p => pmtModelFilter === "all" || p.model_id === pmtModelFilter || p.model_name === pmtModelFilter)
    .sort((a, b) => pmtSort === "newest"
      ? new Date(b.created_date || b.payment_date) - new Date(a.created_date || a.payment_date)
      : (b.amount || 0) - (a.amount || 0)
    );

  const recentShifts = [...myShifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Back */}
      <Link to="/ChattersPerformance" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Chatters Performance
      </Link>

      {/* Profile Header */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#C9A227]/20 flex items-center justify-center text-[#C9A227] text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{chatterId}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full border ${chatter.account_status === "blocked" ? "bg-red-950/50 text-red-400 border-red-700/30" : "bg-emerald-950/50 text-emerald-400 border-emerald-700/30"}`}>
                {chatter.account_status === "blocked" ? "Inactive" : "Active"}
              </span>
              <span className="text-xs text-slate-500">{myModels.length} model{myModels.length !== 1 ? "s" : ""} assigned</span>
              {chatter.created_date && (
                <span className="text-xs text-slate-500">
                  Since {new Date(chatter.created_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
            {[
              { label: "Total Revenue", value: revenue.toLocaleString("cs-CZ") + " CZK" },
              { label: "Total Payments", value: myPayments.length.toString() },
              { label: "Shifts", value: myShifts.length.toString() },
              { label: "Last Payout", value: latestPayout ? latestPayout.amount?.toLocaleString("cs-CZ") + " CZK" : "—" },
            ].map(s => (
              <div key={s.label} className="bg-[#252525] rounded-xl px-4 py-2.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Performance Over Time</h2>
          <div className="flex gap-1">
            {[{ k: 7, l: "7 Days" }, { k: 30, l: "30 Days" }].map(r => (
              <button key={r.k} onClick={() => setChartRange(r.k)}
                className={`h-6 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${chartRange === r.k ? "bg-[#C9A227] text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                {r.l}
              </button>
            ))}
          </div>
        </div>
        {revenue === 0 ? (
          <p className="text-xs text-slate-600 py-8 text-center">No payments data available</p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} interval={Math.floor(chartRange / 8)} />
                <Tooltip
                  contentStyle={{ background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v.toLocaleString("cs-CZ")} CZK`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#C9A227" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Model Breakdown */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Model Breakdown</h2>
        {modelBreakdown.length === 0 ? (
          <p className="text-xs text-slate-600">No models assigned</p>
        ) : (
          <div className="space-y-3">
            {modelBreakdown.map(({ model, mPmts, mRev, lastPmt, pct }) => (
              <div key={model.id} className="flex items-center gap-4 p-3 bg-[#252525] rounded-xl border border-white/6">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 overflow-hidden flex-shrink-0">
                  {model.profile_photo
                    ? <img src={model.profile_photo} alt="" className="w-full h-full object-cover" />
                    : model.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-200">{model.name}</p>
                    <p className="text-xs font-bold text-white">{mRev.toLocaleString("cs-CZ")} CZK</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-500">{mPmts.length} payments</span>
                    <span className="text-[10px] text-slate-500">avg {mPmts.length > 0 ? Math.round(mRev / mPmts.length).toLocaleString("cs-CZ") : 0} CZK</span>
                    <span className="text-[10px] text-slate-500">{pct}% of total</span>
                  </div>
                  <div className="h-1 bg-white/8 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[#C9A227] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-500">Last payment</p>
                  <p className="text-[10px] text-slate-300">{lastPmt ? relTime(lastPmt.payment_date, lastPmt.created_date) : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shift History */}
        <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Shift History</h2>
          {recentShifts.length === 0 ? (
            <p className="text-xs text-slate-600">No shift data available</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {recentShifts.map(shift => {
                const today = new Date().toISOString().split("T")[0];
                const isToday = shift.date === today;
                const dayRev = myPayments
                  .filter(p => (p.payment_date || p.created_date?.split("T")[0]) === shift.date)
                  .reduce((s, p) => s + (p.amount || 0), 0);
                return (
                  <div key={shift.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${isToday ? "bg-amber-950/15 border-amber-700/20" : "bg-[#252525] border-white/6"}`}>
                    <div>
                      <p className="text-xs font-medium text-slate-200">
                        {new Date(shift.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      {shift.note && <p className="text-[10px] text-slate-500">{shift.note}</p>}
                    </div>
                    <div className="text-right">
                      {dayRev > 0 ? (
                        <p className="text-xs font-semibold text-emerald-400">{dayRev.toLocaleString("cs-CZ")} CZK</p>
                      ) : (
                        <p className="text-[10px] text-slate-600">No payments</p>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isToday ? "bg-amber-800/40 text-amber-300" : "bg-emerald-900/30 text-emerald-500"}`}>
                        {isToday ? "Active" : "Completed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Payment History</h2>
            <div className="flex items-center gap-1.5">
              <select value={pmtModelFilter} onChange={e => setPmtModelFilter(e.target.value)}
                className="h-6 px-2 rounded-lg bg-[#252525] border border-white/10 text-[10px] text-slate-300 outline-none">
                <option value="all">All Models</option>
                {myModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {[{ k: "newest", l: "Newest" }, { k: "amount", l: "Highest" }].map(f => (
                <button key={f.k} onClick={() => setPmtSort(f.k)}
                  className={`h-6 px-2 rounded-lg text-[10px] font-medium transition-colors ${pmtSort === f.k ? "bg-[#C9A227] text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
          {filteredPmts.length === 0 ? (
            <p className="text-xs text-slate-600">No payments found</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {filteredPmts.slice(0, 50).map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#252525] border border-white/6">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-300 flex-shrink-0">
                      {p.customer_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-200 truncate">{p.customer_name || "—"}</p>
                      <p className="text-[10px] text-slate-500">{p.model_name || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs font-bold text-white">{(p.amount || 0).toLocaleString("cs-CZ")} CZK</p>
                    <p className="text-[10px] text-slate-500">{relTime(p.payment_date, p.created_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Payout History</h2>
        {myPayouts.length === 0 ? (
          <p className="text-xs text-slate-600">Payout calculation pending</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...myPayouts]
              .sort((a, b) => (b.period || "").localeCompare(a.period || ""))
              .slice(0, 8)
              .map(po => (
                <div key={po.id} className="bg-[#252525] rounded-xl border border-white/6 px-4 py-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{po.period || "—"}</p>
                  <p className="text-sm font-bold text-white mt-1">{po.amount?.toLocaleString("cs-CZ")} CZK</p>
                  {po.note && <p className="text-[10px] text-slate-500 mt-1 truncate">{po.note}</p>}
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-700/20 rounded-full px-2 py-0.5 mt-1.5 inline-block">Paid</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}