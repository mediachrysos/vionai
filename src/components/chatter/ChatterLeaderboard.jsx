import React from "react";
import { Users } from "lucide-react";
import { getTierForRevenue, groupPaymentsByDate, calcDailyPayout } from "./tierUtils";

export default function ChatterLeaderboard({ chatters, allPayments, currentUserEmail, tiers }) {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const rows = chatters.map((c) => {
    const payments = allPayments.filter(p => p.chatter_email === c.email);
    const todayPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === today);
    const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
    const todayRev = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const { payout: todayPayout } = calcDailyPayout(todayRev, 0, tiers);
    const tier = getTierForRevenue(todayRev, tiers);
    return { ...c, todayRev, monthRev, todayPayout, tier };
  }).sort((a, b) => b.monthRev - a.monthRev);

  const myRank = rows.findIndex(r => r.email === currentUserEmail) + 1;
  const leader = rows[0];

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-3 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#C9A227]" /> Leaderboard
        </h3>
        {myRank > 0 && (
          <span className="text-[9px] font-semibold text-[#C9A227] bg-amber-50 border border-[#e8d99a] px-2 py-0.5 rounded-full">
            Jsi #{myRank} z {rows.length}
          </span>
        )}
      </div>

      {myRank > 1 && leader && (
        <p className="text-[10px] text-gray-500 mb-2.5">
          Chybí ti <span className="font-semibold text-gray-800">{(leader.monthRev - (rows[myRank - 1]?.monthRev || 0)).toLocaleString()} Kč</span> na první místo
        </p>
      )}

      <div className="space-y-1.5">
        {rows.map((r, i) => {
          const isMe = r.email === currentUserEmail;
          return (
            <div
              key={r.email}
              className={`rounded-lg border p-2 flex items-center gap-2 transition-all ${
                isMe ? "border-[#C9A227] bg-[#faf6e6] shadow-[0_0_0_2px_#C9A22720]" : "border-gray-100 bg-gray-50/50"
              }`}
            >
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                i === 0 ? "bg-[#C9A227] text-white" : i === 1 ? "bg-gray-200 text-gray-700" : i === 2 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
              }`}>#{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {(r.nickname || r.full_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold ${isMe ? "text-[#A8841C]" : "text-gray-800"}`}>{r.nickname || r.full_name}{isMe && " (ty)"}</p>
                <p className="text-[9px] text-gray-400">{r.tier.name}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[9px] text-gray-400">Dnes</p>
                <p className="text-[10px] font-bold text-gray-700">{r.todayRev.toLocaleString()} Kč</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-400">Měsíc</p>
                <p className={`text-[11px] font-bold ${isMe ? "text-[#C9A227]" : "text-gray-800"}`}>{r.monthRev.toLocaleString()} Kč</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}