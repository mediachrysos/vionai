import React from "react";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  active: "bg-emerald-950/50 text-emerald-400 border-emerald-700/30",
  inactive: "bg-slate-800 text-slate-500 border-white/10",
  vip: "bg-amber-950/50 text-amber-300 border-amber-700/30",
  blocked: "bg-red-950/50 text-red-400 border-red-700/30"
};

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  vip: "VIP",
  blocked: "Blocked"
};

export default function RecentCustomersWidget({ customers }) {
  const recent = [...customers].
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center gap-2">
        <div className="bg-slate-900 rounded-xl w-9 h-9 flex items-center justify-center">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266700/Chrysos_icon_1_qefgru.png" alt="" className="w-6 h-6 object-contain" />
        </div>
        <h3 className="text-sm font-semibold text-white">New customers</h3>
      </div>
      <div className="p-5">
      {recent.length === 0 ?
        <p className="text-xs text-slate-500 text-center py-6">No customers</p> :

        <div className="space-y-2 max-h-[13.5rem] overflow-y-auto pr-1">
          {recent.map((c) =>
          <div
            key={c.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
            
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-300">
                  {c.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">{c.full_name}</p>
                  <p className="text-[11px] text-slate-500">
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