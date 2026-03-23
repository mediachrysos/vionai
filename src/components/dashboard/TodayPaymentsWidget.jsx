import React from "react";

import { format } from "date-fns";

export default function TodayPaymentsWidget({ payments }) {
  const today = new Date().toISOString().split("T")[0];
  const todayPayments = payments.
  filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today).
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const total = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center">
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
        <p className="text-xs text-gray-400 text-center py-6">Dnes žádné platby</p> :

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {todayPayments.map((p) =>
          <div
            key={p.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {p.customer_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">
                    {p.customer_name || "—"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {p.model_name || p.chatter_name || "—"}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-900">
                {(p.amount || 0).toLocaleString()} Kč
              </span>
            </div>
          )}
        </div>
        }
      </div>
    </div>);

}