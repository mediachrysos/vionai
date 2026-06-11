import React from "react";

import { format } from "date-fns";

export default function TodayPaymentsWidget({ payments }) {
  const today = new Date().toISOString().split("T")[0];
  const todayPayments = payments.
  filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today).
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const total = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 rounded-xl w-9 h-9 flex items-center justify-center">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_2_jqior6.png" alt="" className="w-6 h-6 object-contain" />
          </div>
          <h3 className="text-sm font-semibold text-white">Dnešní platby</h3>
        </div>
        {todayPayments.length > 0 &&
        <span className="text-xs font-bold text-white bg-white/20 px-2 py-1 rounded-lg">
            {total.toLocaleString()} Kč
          </span>
        }
      </div>
      <div className="p-5">

      {todayPayments.length === 0 ?
        <p className="text-xs text-slate-500 text-center py-6">Dnes žádné platby</p> :

        <div className="space-y-2 max-h-[13.5rem] overflow-y-auto pr-1">
          {todayPayments.map((p) =>
          <div
            key={p.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
            
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-amber-300">
                  {p.customer_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    {p.customer_name || "—"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {p.model_name || p.chatter_name || "—"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-100">
                {(p.amount || 0).toLocaleString()} Kč
              </span>
            </div>
          )}
        </div>
        }
      </div>
    </div>);

}