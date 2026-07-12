import React from "react";

export default function TodayPaymentsWidget({ payments }) {
  const today = new Date().toISOString().split("T")[0];

  const todayPayments = payments
    .filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const total = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  if (todayPayments.length === 0) return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-slate-200">Today's payments</h3>
        <span className="ml-auto text-xs font-bold text-emerald-400">0 CZK</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-slate-500">No payments today</p>
      </div>
    </div>
  );

  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-slate-200">Today's payments</h3>
        <span className="ml-auto text-xs font-bold text-emerald-400">{total.toLocaleString()} CZK</span>
      </div>

      {/* First 5 always visible */}
      <div className="divide-y divide-white/5">
        {todayPayments.slice(0, 5).map((p, i) => (
          <div key={p.id || i} className="px-4 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-xs font-bold text-[#C9A227] flex-shrink-0">
              {(p.customer_name || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{p.customer_name || "—"}</p>
              {p.model_name && <p className="text-xs text-slate-500 truncate">{p.model_name}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-100">{(p.amount || 0).toLocaleString()} CZK</p>
              <p className="text-[10px] text-slate-500">
                {p.created_date ? new Date(p.created_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Rest — scrollable */}
      {todayPayments.length > 5 && (
        <div className="overflow-y-auto max-h-48 divide-y divide-white/5 border-t border-white/10">
          {todayPayments.slice(5).map((p, i) => (
            <div key={p.id || i} className="px-4 py-2.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-xs font-bold text-[#C9A227] flex-shrink-0">
                {(p.customer_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{p.customer_name || "—"}</p>
                {p.model_name && <p className="text-xs text-slate-500 truncate">{p.model_name}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-100">{(p.amount || 0).toLocaleString()} CZK</p>
                <p className="text-[10px] text-slate-500">
                  {p.created_date ? new Date(p.created_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}