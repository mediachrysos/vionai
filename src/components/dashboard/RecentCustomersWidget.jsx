import React from "react";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  vip: "bg-amber-50 text-amber-700 border-amber-100",
  blocked: "bg-red-50 text-red-600 border-red-100"
};

const statusLabels = {
  active: "Aktivní",
  inactive: "Neaktivní",
  vip: "VIP",
  blocked: "Blokovaný"
};

export default function RecentCustomersWidget({ customers }) {
  const recent = [...customers].
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden hidden">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center gap-2">
        <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266700/Chrysos_icon_1_qefgru.png" alt="" className="w-6 h-6 object-contain" />
        </div>
        <h3 className="text-sm font-semibold text-white">Noví zákazníci</h3>
      </div>
      <div className="p-5">
      {recent.length === 0 ?
        <p className="text-xs text-gray-400 text-center py-6">Žádní zákazníci</p> :

        <div className="space-y-2 max-h-[13.5rem] overflow-y-auto pr-1">
          {recent.map((c) =>
          <div
            key={c.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-bold text-[#C9A227]">
                  {c.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">{c.full_name}</p>
                  <p className="text-[11px] text-gray-400">
                    {c.created_date ?
                  format(new Date(c.created_date), "d. M. yyyy") :
                  "—"}
                  </p>
                </div>
              </div>
              <Badge
              variant="outline"
              className={`text-[10px] ${statusColors[c.status] || statusColors.active}`}>
              
                {statusLabels[c.status] || c.status}
              </Badge>
            </div>
          )}
        </div>
        }
      </div>
    </div>);

}