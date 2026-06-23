import React, { useState } from "react";

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
  if (dStr === yesterday.toISOString().split("T")[0]) return `Yesterday at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "24h", label: "Last 24h" },
  { key: "week", label: "This Week" },
];

export default function RecentPaymentsPanel({ payments }) {
  const [filter, setFilter] = useState("today");

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];

  const filtered = payments.filter(p => {
    const dateStr = p.payment_date || p.created_date?.split("T")[0];
    if (filter === "today") return dateStr === todayStr;
    if (filter === "24h") return p.created_date && new Date(p.created_date) > new Date(now.getTime() - 86400000);
    if (filter === "week") return dateStr >= weekAgoStr;
    return true;
  }).sort((a, b) => new Date(b.created_date || b.payment_date) - new Date(a.created_date || a.payment_date));

  const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-[#1e1e1e] border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Recent Payments</h3>
          {filtered.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-0.5">{filtered.length} payments · {total.toLocaleString("cs-CZ")} CZK</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`h-6 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${filter === f.key ? "bg-[#C9A227] text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No payments in this period</p>
        ) : filtered.map(p => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0">
                {p.customer_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{p.customer_name || "—"}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {[p.chatter_name, p.model_name].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-xs font-bold text-white">{(p.amount || 0).toLocaleString("cs-CZ")} CZK</p>
              <p className="text-[10px] text-slate-500">{relTime(p.payment_date, p.created_date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}