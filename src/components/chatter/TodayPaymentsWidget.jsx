import React from "react";
import { CreditCard } from "lucide-react";

export default function TodayPaymentsWidget({ payments }) {
  const today = new Date().toISOString().split("T")[0];

  const todayPayments = payments.
  filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today).
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); // nejnovější nahoře

  const total = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  if (todayPayments.length === 0) return null;

  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center hidden">
          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <h3 className="text-xs font-bold text-slate-200">Dnešní platby</h3>
        <span className="ml-auto text-xs font-bold text-emerald-400">{total.toLocaleString()} Kč</span>
      </div>
      <div className="divide-y divide-white/5">
        {todayPayments.map((p, i) =>
        <div key={p.id || i} className="px-4 py-2.5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-xs font-bold text-[#C9A227] flex-shrink-0">
              {(p.customer_name || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{p.customer_name || "—"}</p>
              {p.model_name && <p className="text-xs text-slate-500 truncate">{p.model_name}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-slate-100">{(p.amount || 0).toLocaleString()} Kč</p>
              <p className="text-[10px] text-slate-500">
                {p.created_date ? new Date(p.created_date).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>);

}