import React, { useState } from "react";
import ChatterRow from "./ChatterRow";

const SORT_OPTIONS = [
  { key: "revenue", label: "Revenue" },
  { key: "payments", label: "Payments" },
  { key: "revenuePerShift", label: "Rev / Shift" },
  { key: "shifts", label: "Shifts" },
];

export default function ChatterLeaderboardTable({ chatters, payments, prevPayments, shifts, models, payouts }) {
  const [sortKey, setSortKey] = useState("revenue");

  const enriched = chatters.map(chatter => {
    const myPmts = payments.filter(p => p.chatter_email === chatter.email);
    const myShifts = shifts.filter(s => s.chatter_email === chatter.email);
    const rev = myPmts.reduce((s, p) => s + (p.amount || 0), 0);
    const sc = myShifts.length;
    return { ...chatter, _rev: rev, _payments: myPmts.length, _shifts: sc, _rps: sc > 0 ? Math.round(rev / sc) : 0 };
  });

  const sorted = [...enriched].sort((a, b) => {
    if (sortKey === "revenue") return b._rev - a._rev;
    if (sortKey === "payments") return b._payments - a._payments;
    if (sortKey === "revenuePerShift") return b._rps - a._rps;
    if (sortKey === "shifts") return b._shifts - a._shifts;
    return 0;
  });

  return (
    <div className="bg-[#1e1e1e] border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Chatter Leaderboard</h3>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSortKey(opt.key)}
              className={`h-6 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${sortKey === opt.key ? "bg-[#C9A227] text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/6 bg-white/2">
              <th className="text-left px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Chatter</th>
              <th className="text-right px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Revenue</th>
              <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Pmts</th>
              <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Avg Pmt</th>
              <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Shifts</th>
              <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Rev / Shift</th>
              <th className="text-center px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Trend</th>
              <th className="text-left px-4 py-2.5 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-xs text-slate-600">No chatter data available</td>
              </tr>
            ) : sorted.map((chatter, i) => (
              <ChatterRow
                key={chatter.email}
                chatter={chatter}
                rank={i + 1}
                payments={payments}
                prevPayments={prevPayments}
                shifts={shifts}
                models={models}
                payouts={payouts}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}