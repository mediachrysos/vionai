import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, ChevronDown, ChevronUp, X, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import WorkSessionWidget from "../chatter/WorkSessionWidget";
import { calcDailyPayout, DEFAULT_TIERS } from "../chatter/tierUtils";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Počítá earned správně per-den včetně hodinové složky
// Protože nemáme hodiny per-den, hodinovou složku pro minulé dny ignorujeme (neznáme hours)
// Pro dnešek se bere hoursWorked z props
function calcMonthlyEarned(monthPayments, hoursWorked) {
  const today = new Date().toISOString().split("T")[0];
  const byDay = {};
  for (const p of monthPayments) {
    const day = p.payment_date || p.created_date?.split("T")[0];
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + (p.amount || 0);
  }
  let total = 0;
  for (const [day, revenue] of Object.entries(byDay)) {
    const hours = day === today ? (hoursWorked || 0) : 0;
    const { payout } = calcDailyPayout(revenue, hours, DEFAULT_TIERS);
    total += payout;
  }
  return total;
}

function getTierLabel(todayRevenue) {
  if (todayRevenue < 2000) return { label: "Below minimum (< 2000)", color: "text-gray-400" };
  if (todayRevenue < 5000) return { label: "Tier 1 · 120/h", color: "text-blue-500" };
  if (todayRevenue < 10000) return { label: "Tier 2 · 120/h + 5%", color: "text-amber-500" };
  return { label: "Tier 3 · 120/h + 10%", color: "text-emerald-600" };
}

export default function ChatterPayWidget({ chatterEmail, hoursWorked, totalChatted, monthPayments, isAdmin, showWorkSession = false }) {
  const qc = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [addingPayout, setAddingPayout] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", chatterEmail],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: chatterEmail }),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });

  const earned = Math.round(
    monthPayments
      ? calcMonthlyEarned(monthPayments, hoursWorked)
      : calcDailyPayout(totalChatted, hoursWorked, DEFAULT_TIERS).payout
  );
  const totalPaid = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = earned - totalPaid;
  const tier = getTierLabel(totalChatted);

  const handleAddPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingPayout(true);
    await base44.entities.ChatterPayout.create({
      chatter_email: chatterEmail,
      amount,
      period: getCurrentPeriod(),
      note: payoutNote,
    });
    setPayoutAmount("");
    setPayoutNote("");
    setAddingPayout(false);
    qc.invalidateQueries({ queryKey: ["chatterPayouts", chatterEmail] });
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C9A227]/20 flex items-center justify-center">
            <Banknote className="w-3.5 h-3.5 text-[#C9A227]" />
          </div>
          <span className="text-sm font-semibold text-slate-200">Payout</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
          <button onClick={() => setShowInfo(v => !v)} className="text-slate-600 hover:text-slate-400">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info box */}
      {showInfo && (
        <div className="bg-white/5 rounded-xl p-3 text-xs text-slate-400 space-y-1 border border-white/10">
          <p className="font-semibold text-slate-300 mb-1">Payout calculation:</p>
          <p>0 – 1,999 → 0</p>
          <p>2,000 – 4,999 → 120/hour</p>
          <p>5,000 – 9,999 → 120/hour + 5% commission</p>
          <p>10,000+ → 120/hour + 10% commission</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-[#C9A227]/10 rounded-xl px-2 py-3 gap-0.5">
          <span className="text-[10px] text-[#C9A227]/70 font-medium uppercase tracking-wide">Earned</span>
          <span className="text-base font-bold text-[#C9A227] tabular-nums">{earned.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-center bg-emerald-500/10 rounded-xl px-2 py-3 gap-0.5">
          <span className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wide">Paid out</span>
          <span className="text-base font-bold text-emerald-400 tabular-nums">{totalPaid.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-500/60">{payouts.length} payouts</span>
        </div>
        <div className={`flex flex-col items-center rounded-xl px-2 py-3 gap-0.5 ${remaining > 0 ? "bg-rose-500/10" : "bg-white/5"}`}>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${remaining > 0 ? "text-rose-400/70" : "text-slate-500"}`}>To pay</span>
          <span className={`text-base font-bold tabular-nums ${remaining > 0 ? "text-rose-400" : "text-slate-500"}`}>
            {remaining.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Work session timer */}
      {showWorkSession && (
        <div className="flex flex-col items-center justify-center py-3 border-t border-white/10">
          <WorkSessionWidget email={chatterEmail} />
        </div>
      )}

      {/* Admin: add payout */}
      {isAdmin && (
        <div className="flex gap-2 items-center border-t border-white/10 pt-3">
          <Input
            value={payoutAmount}
            onChange={e => setPayoutAmount(e.target.value)}
            placeholder="Amount"
            type="number"
            min="0"
            className="h-8 text-xs w-28 flex-shrink-0 bg-white/5 border-white/10 text-slate-200"
          />
          <Input
            value={payoutNote}
            onChange={e => setPayoutNote(e.target.value)}
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

      {/* Payout history */}
      {payouts.length > 0 && (
        <div>
          <button
            onClick={() => setShowPayouts(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPayouts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Payout history ({payouts.length})
          </button>
          {showPayouts && (
            <div className="mt-2 space-y-1">
              {[...payouts].reverse().map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2 gap-2">
                  <span className="text-slate-500 flex-shrink-0">{p.created_date?.split("T")[0] || p.period}</span>
                  {p.note && <span className="text-slate-500 truncate flex-1">{p.note}</span>}
                  <span className="font-semibold text-emerald-400">+{p.amount.toLocaleString()}</span>
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        await base44.entities.ChatterPayout.delete(p.id);
                        qc.invalidateQueries({ queryKey: ["chatterPayouts", chatterEmail] });
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
  );
}