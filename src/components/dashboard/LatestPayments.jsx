import React from "react";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function LatestPayments({ payments }) {
  const recent = [...payments]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Poslední platby</h3>
      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">Zatím žádné platby</p>
        )}
        {recent.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{p.customer_name || "Customer"}</p>
              <p className="text-xs text-slate-400">{p.model_name || "—"} · {p.created_date ? format(new Date(p.created_date), "MMM d") : "—"}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900">${(p.amount || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}