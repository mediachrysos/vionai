import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, ChevronDown, ChevronUp, X, Info } from "lucide-react";
import { Input } from "@/components/ui/input";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Výpočet výplaty dle pravidel:
 * 0–1999 Kč     = 0 Kč
 * 2000–4999 Kč  = 120 Kč/hod
 * 5000–9999 Kč  = 120 Kč/hod + 5 % z vychatované částky
 * 10000+ Kč     = 120 Kč/hod + 10 % z vychatované částky
 */
/**
 * Výpočet výplaty PER DEN:
 * < 2 000 Kč/den  → 0 Kč
 * 2 000–4 999 Kč  → 120 Kč/hod (bez hodin = 0)
 * 5 000–9 999 Kč  → 5 % z denní částky
 * 10 000+ Kč      → 10 % z denní částky
 */
function calcDayEarned(dayTotal) {
  if (dayTotal < 2000) return 0;
  if (dayTotal < 5000) return 0; // hodinová složka — počítá se zvlášť mimo widget
  if (dayTotal < 10000) return dayTotal * 0.05;
  return dayTotal * 0.10;
}

// Pro zobrazení celkového earned — počítá každý den zvlášť a sčítá
function calcMonthlyEarnedPerDay(monthPayments) {
  const byDay = {};
  for (const p of monthPayments) {
    const day = p.payment_date || p.created_date?.split("T")[0];
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + (p.amount || 0);
  }
  return Object.values(byDay).reduce((sum, dayTotal) => sum + calcDayEarned(dayTotal), 0);
}

function calcChatterEarned(totalChatted, hoursWorked) {
  if (totalChatted < 2000) return 0;
  const hourlyPart = hoursWorked * 120;
  if (totalChatted < 5000) return hourlyPart;
  if (totalChatted < 10000) return hourlyPart + totalChatted * 0.05;
  return hourlyPart + totalChatted * 0.10;
}

function getTierLabel(totalChatted) {
  if (totalChatted < 2000) return { label: "Pod minimem (< 2 000 Kč)", color: "text-gray-400" };
  if (totalChatted < 5000) return { label: "Tier 1 · 120 Kč/h", color: "text-blue-500" };
  if (totalChatted < 10000) return { label: "Tier 2 · 120 Kč/h + 5 %", color: "text-amber-500" };
  return { label: "Tier 3 · 120 Kč/h + 10 %", color: "text-emerald-600" };
}

export default function ChatterPayWidget({ chatterEmail, hoursWorked, totalChatted, monthPayments, isAdmin }) {
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
      ? calcMonthlyEarnedPerDay(monthPayments)
      : calcChatterEarned(totalChatted, hoursWorked)
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Banknote className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Výplata</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
          <button onClick={() => setShowInfo(v => !v)} className="text-gray-300 hover:text-gray-500">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info box */}
      {showInfo && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1 border border-gray-100">
          <p className="font-semibold text-gray-700 mb-1">Výpočet výplaty:</p>
          <p>0 – 1 999 Kč → 0 Kč</p>
          <p>2 000 – 4 999 Kč → 120 Kč/hod</p>
          <p>5 000 – 9 999 Kč → 120 Kč/hod + 5 % z vychatovaného</p>
          <p>10 000+ Kč → 120 Kč/hod + 10 % z vychatovaného</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-amber-50 rounded-xl px-2 py-3 gap-0.5">
          <span className="text-[10px] text-amber-700/70 font-medium uppercase tracking-wide">Earned</span>
          <span className="text-base font-bold text-amber-700 tabular-nums">{earned.toLocaleString()}</span>
          <span className="text-[10px] text-amber-600/60">Kč</span>
        </div>
        <div className="flex flex-col items-center bg-emerald-50 rounded-xl px-2 py-3 gap-0.5">
          <span className="text-[10px] text-emerald-700/70 font-medium uppercase tracking-wide">Paid out</span>
          <span className="text-base font-bold text-emerald-700 tabular-nums">{totalPaid.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-600/60">{payouts.length} výplat</span>
        </div>
        <div className={`flex flex-col items-center rounded-xl px-2 py-3 gap-0.5 ${remaining > 0 ? "bg-rose-50" : "bg-gray-50"}`}>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${remaining > 0 ? "text-rose-600/70" : "text-gray-500/70"}`}>To pay</span>
          <span className={`text-base font-bold tabular-nums ${remaining > 0 ? "text-rose-600" : "text-gray-400"}`}>
            {remaining.toLocaleString()}
          </span>
          <span className={`text-[10px] ${remaining > 0 ? "text-rose-500/60" : "text-gray-400/60"}`}>Kč</span>
        </div>
      </div>

      {/* Admin: add payout */}
      {isAdmin && (
        <div className="flex gap-2 items-center border-t border-gray-100 pt-3">
          <Input
            value={payoutAmount}
            onChange={e => setPayoutAmount(e.target.value)}
            placeholder="Částka (Kč)"
            type="number"
            min="0"
            className="h-8 text-xs w-28 flex-shrink-0"
          />
          <Input
            value={payoutNote}
            onChange={e => setPayoutNote(e.target.value)}
            placeholder="Poznámka (volitelné)"
            className="h-8 text-xs flex-1 min-w-0"
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
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPayouts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Historie výplat ({payouts.length})
          </button>
          {showPayouts && (
            <div className="mt-2 space-y-1">
              {[...payouts].reverse().map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 gap-2">
                  <span className="text-gray-400 flex-shrink-0">{p.created_date?.split("T")[0] || p.period}</span>
                  {p.note && <span className="text-gray-400 truncate flex-1">{p.note}</span>}
                  <span className="font-semibold text-emerald-700">+{p.amount.toLocaleString()} Kč</span>
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        await base44.entities.ChatterPayout.delete(p.id);
                        qc.invalidateQueries({ queryKey: ["chatterPayouts", chatterEmail] });
                      }}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
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