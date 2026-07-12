import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import WorkSessionWidget from "./WorkSessionWidget";
import { calcDailyPayout, getNextTier, getTierForRevenue } from "./tierUtils";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Sums monthly payout day-by-day. Hourly component only applies to today (we don't track past hours).
function calcMonthlyEarned(monthPayments, hoursWorked, tiers) {
  const today = new Date().toISOString().split("T")[0];
  const byDay = {};
  for (const p of monthPayments) {
    const day = p.payment_date || p.created_date?.split("T")[0];
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + (p.amount || 0);
  }
  let total = 0;
  for (const [day, revenue] of Object.entries(byDay)) {
    const hours = day === today ? hoursWorked || 0 : 0;
    const { payout } = calcDailyPayout(revenue, hours, tiers);
    total += payout;
  }
  return total;
}

export default function TierLadder({
  todayRevenue,
  hoursWorked,
  dailyGoalAmount,
  dailyGoalEnabled,
  tiers,
  email,
  monthPayments,
  isAdmin = false,
  showWorkSession = false,
}) {
  const qc = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [addingPayout, setAddingPayout] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);

  const currentTier = getTierForRevenue(todayRevenue, tiers);
  const nextTier = getNextTier(todayRevenue, tiers);
  const { payout } = calcDailyPayout(todayRevenue, hoursWorked, tiers);
  const missingToNext = nextTier ? Math.max(0, nextTier.min - todayRevenue) : 0;

  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000,
  });

  const earned = Math.round(
    monthPayments ? calcMonthlyEarned(monthPayments, hoursWorked, tiers) : payout
  );
  const totalPaid = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = earned - totalPaid;

  const handleAddPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingPayout(true);
    await base44.entities.ChatterPayout.create({
      chatter_email: email,
      amount,
      period: getCurrentPeriod(),
      note: payoutNote,
    });
    setPayoutAmount("");
    setPayoutNote("");
    setAddingPayout(false);
    qc.invalidateQueries({ queryKey: ["chatterPayouts", email] });
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Today's performance</h3>
      </div>

      {/* Today's stats — payout and working session grouped together */}
      <div className={`grid ${showWorkSession ? "grid-cols-2" : "grid-cols-1"} gap-2 mb-4`}>
        <div className="rounded-xl px-4 py-3.5 bg-white/[0.03] border border-white/5 flex flex-col justify-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Payout today</p>
          <p className={`text-2xl font-bold leading-none tabular-nums ${payout > 0 ? "text-[#C9A227]" : "text-slate-500"}`}>{Math.round(payout).toLocaleString()} <span className="text-xs font-normal opacity-70">CZK</span></p>
        </div>
        {showWorkSession && (
          <div className="rounded-xl px-4 py-3.5 bg-white/[0.03] border border-white/5 flex flex-col justify-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Working?</p>
            <WorkSessionWidget email={email} compact />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 flex-1">
        {/* Left half — tier ladder + daily goal */}
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Current tier</p>
          <div className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 bg-gradient-to-br from-[#C9A227] to-[#A8841C] shadow-md">
            <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white">
              {currentTier.index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-white">{currentTier.name}</p>
              <p className="text-[10px] text-white/75 truncate">
                {currentTier.max !== null && currentTier.max !== undefined ? `${currentTier.min.toLocaleString()}–${currentTier.max.toLocaleString()}` : `${currentTier.min.toLocaleString()}+`}
                {currentTier.commission > 0 && ` · ${currentTier.commission}% commission`}
              </p>
            </div>
            <span className="flex-shrink-0 text-[9px] font-bold text-white bg-white/20 px-2 py-1 rounded-full tracking-wide">ACTIVE</span>
          </div>

          {nextTier ? (
            <div className="w-full mt-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A227] rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, ((todayRevenue - currentTier.min) / (nextTier.min - currentTier.min)) * 100))}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                {missingToNext.toLocaleString()} more to reach "{nextTier.name}"
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 mt-3">Max tier reached — top rate on all payments</p>
          )}

          {dailyGoalEnabled && dailyGoalAmount > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Daily goal</span>
                <span className="font-semibold text-[#C9A227]">{Math.min(100, Math.round((todayRevenue / dailyGoalAmount) * 100))}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A227] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (todayRevenue / dailyGoalAmount) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>{todayRevenue.toLocaleString()}</span>
                <span>{dailyGoalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right half — monthly payout summary */}
        <div className="rounded-xl bg-white/[0.02] p-3 flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Monthly payout</p>
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="flex flex-col items-center text-center bg-gradient-to-br from-[#C9A227] to-[#A8841C] rounded-xl px-3 py-2.5 gap-1 shadow-md">
              <span className="text-[9px] text-white/80 font-semibold uppercase tracking-wider">Earned</span>
              <span className="text-base font-bold text-white tabular-nums">{earned.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-center text-center bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl px-3 py-2.5 gap-1 shadow-md">
              <span className="text-[9px] text-white/80 font-semibold uppercase tracking-wider">Paid out</span>
              <span className="text-base font-bold text-white tabular-nums">{totalPaid.toLocaleString()}</span>
            </div>
            <div className={`flex flex-col items-center text-center rounded-xl px-3 py-2.5 gap-1 shadow-md ${remaining > 0 ? "bg-gradient-to-br from-rose-500 to-rose-700" : "bg-white/5 border border-white/10"}`}>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${remaining > 0 ? "text-white/80" : "text-slate-500"}`}>To pay</span>
              <span className={`text-base font-bold tabular-nums ${remaining > 0 ? "text-white" : "text-slate-500"}`}>{remaining.toLocaleString()}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 items-center pt-3 mt-3 border-t border-white/10">
              <Input
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Amount"
                type="number"
                min="0"
                className="h-8 text-xs w-24 flex-shrink-0 bg-white/5 border-white/10 text-slate-200"
              />
              <Input
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Note (optional)"
                className="h-8 text-xs flex-1 min-w-0 bg-white/5 border-white/10 text-slate-200"
              />
              <button
                onClick={handleAddPayout}
                disabled={addingPayout || !payoutAmount}
                className="flex items-center gap-1 text-xs font-semibold bg-[#C9A227] hover:bg-[#A8841C] disabled:opacity-40 text-white px-3 h-8 rounded-lg flex-shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Pay
              </button>
            </div>
          )}

          {payouts.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowPayouts((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPayouts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Payout history ({payouts.length})
              </button>
              {showPayouts && (
                <div className="mt-2 space-y-1">
                  {[...payouts].reverse().map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2 gap-2">
                      <span className="text-slate-500 flex-shrink-0">{p.created_date?.split("T")[0] || p.period}</span>
                      {p.note && <span className="text-slate-500 truncate flex-1">{p.note}</span>}
                      <span className="font-semibold text-emerald-400">+{p.amount.toLocaleString()}</span>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            await base44.entities.ChatterPayout.delete(p.id);
                            qc.invalidateQueries({ queryKey: ["chatterPayouts", email] });
                          }}
                          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}