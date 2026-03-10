import React from "react";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";

export default function LatestPayments({ payments }) {
  const recent = [...payments]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Poslední platby</h3>
      <div className="space-y-1">
        {recent.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Zatím žádné platby</p>
        )}
        {recent.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.customer_name || "Zákazník"}</p>
              <p className="text-xs text-gray-400">{p.model_name || "—"} · {p.created_date ? format(new Date(p.created_date), "d. M.") : "—"}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900">${(p.amount || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}