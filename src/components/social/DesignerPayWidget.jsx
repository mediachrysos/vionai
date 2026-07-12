import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, ChevronDown, ChevronUp, Edit2, Check, Gift, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

function minutesToHours(mins) {
  return Math.round(mins / 60 * 100) / 100;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DesignerPayWidget({ designerEmail, dashboard, isAdmin, onRateChange }) {
  const qc = useQueryClient();
  const [showPayouts, setShowPayouts] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [addingPayout, setAddingPayout] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [rateValue, setRateValue] = useState(String(dashboard?.hourly_rate ?? 35));
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("");
  const [addingBonus, setAddingBonus] = useState(false);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceMinutes, setBalanceMinutes] = useState("");

  const hourlyRate = dashboard?.hourly_rate ?? 35;

  const { data: sessions = [] } = useQuery({
    queryKey: ["allWorkSessions", designerEmail, dashboard?.id],
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id
    }),
    enabled: !!designerEmail && !!dashboard?.id,
    staleTime: 30000
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["designerPayouts", designerEmail, dashboard?.id],
    queryFn: () => base44.entities.DesignerPayout.filter({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id
    }),
    enabled: !!designerEmail && !!dashboard?.id,
    staleTime: 30000
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes_worked || 0), 0);
  const totalHours = minutesToHours(totalMinutes);
  const totalEarned = Math.round(totalHours * hourlyRate * 100) / 100;
  const totalPaid = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = Math.round((totalEarned - totalPaid) * 100) / 100;

  const handleAddPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingPayout(true);
    await base44.entities.DesignerPayout.create({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id,
      amount,
      period: getCurrentPeriod(),
      note: payoutNote
    });
    setPayoutAmount("");
    setPayoutNote("");
    setAddingPayout(false);
    qc.invalidateQueries({ queryKey: ["designerPayouts", designerEmail, dashboard?.id] });
  };

  const handleAddBonus = async () => {
    const amount = parseFloat(bonusAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAddingBonus(true);
    // Convert MAD amount to minutes based on hourly rate, so it shows up in "Earned"
    const minutes = Math.round(amount / hourlyRate * 60);
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.DesignerWorkSession.create({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id,
      date: today,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      is_active: false,
      minutes_worked: minutes,
      note: bonusNote || "Manual bonus"
    });
    setBonusAmount("");
    setBonusNote("");
    setAddingBonus(false);
    setShowBonusForm(false);
    qc.invalidateQueries({ queryKey: ["allWorkSessions", designerEmail, dashboard?.id] });
  };

  // Directly set total minutes worked by creating an adjustment session
  const handleBalanceSave = async () => {
    const targetMinutes = parseInt(balanceMinutes, 10);
    if (isNaN(targetMinutes) || targetMinutes < 0) return;
    const diff = targetMinutes - totalMinutes;
    const today = new Date().toISOString().split("T")[0];
    // Find or create an adjustment session
    const adjustSessions = sessions.filter((s) => s.note === "__balance_adjust__");
    if (adjustSessions.length > 0) {
      // Update the existing adjustment session
      const existing = adjustSessions[0];
      const newMins = (existing.minutes_worked || 0) + diff;
      await base44.entities.DesignerWorkSession.update(existing.id, {
        minutes_worked: newMins
      });
    } else {
      // Create a new adjustment session
      await base44.entities.DesignerWorkSession.create({
        designer_email: designerEmail,
        dashboard_id: dashboard?.id,
        date: today,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        is_active: false,
        minutes_worked: diff,
        note: "__balance_adjust__"
      });
    }
    setEditingBalance(false);
    setBalanceMinutes("");
    qc.invalidateQueries({ queryKey: ["allWorkSessions", designerEmail, dashboard?.id] });
  };

  const handleRateSave = async () => {
    const rate = parseFloat(rateValue);
    if (isNaN(rate) || rate < 0) return;
    await base44.entities.SocialDashboard.update(dashboard.id, { hourly_rate: rate });
    setEditingRate(false);
    onRateChange?.();
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          

          
          <span className="text-sm font-semibold text-slate-200">Salary</span>
        </div>

        {/* Rate */}
        {editingRate && isAdmin ?
        <div className="flex items-center gap-1.5">
            <Input
            value={rateValue}
            onChange={(e) => setRateValue(e.target.value)}
            className="h-7 text-xs w-16 px-2"
            type="number"
            min="0" />
          
            <span className="text-xs text-gray-400">MAD/h</span>
            <button onClick={handleRateSave} className="text-emerald-600 hover:text-emerald-800">
              <Check className="w-3.5 h-3.5" />
            </button>
          </div> :

        <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 bg-white/10 px-2.5 py-1 rounded-lg">
              {hourlyRate} MAD/h
            </span>
            {isAdmin &&
          <button
            onClick={() => {setEditingRate(true);setRateValue(String(hourlyRate));}}
            className="text-gray-300 hover:text-amber-500 transition-colors">
            
                <Edit2 className="w-3.5 h-3.5" />
              </button>
          }
          </div>
        }
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center bg-amber-950/30 rounded-xl px-2 py-3 gap-0.5 relative">
          <span className="text-[10px] text-amber-400/80 font-medium uppercase tracking-wide">Earned</span>
          {editingBalance ?
          <div className="flex items-center gap-1 mt-0.5">
              <Input
              value={balanceMinutes}
              onChange={(e) => setBalanceMinutes(e.target.value)}
              className="h-6 text-xs w-16 px-1.5 text-center"
              type="number"
              min="0"
              placeholder={String(totalMinutes)}
              autoFocus />
            
            </div> :

          <span className="text-base font-bold text-amber-300 tabular-nums">{totalEarned.toLocaleString()}</span>
          }
          {editingBalance ?
          <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] text-amber-600/60">min total</span>
              <button onClick={handleBalanceSave} className="text-emerald-600 hover:text-emerald-800">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingBalance(false)} className="text-gray-300 hover:text-gray-500">
                <X className="w-3 h-3" />
              </button>
            </div> :

          <span className="text-[10px] text-amber-400/60">{totalHours}h worked</span>
          }
          {isAdmin && !editingBalance &&
          <button
            onClick={() => {setEditingBalance(true);setBalanceMinutes(String(totalMinutes));}}
            className="absolute top-1.5 right-1.5 text-amber-300 hover:text-amber-600 transition-colors">
            
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          }
        </div>
        <div className="flex flex-col items-center bg-emerald-950/30 rounded-xl px-2 py-3 gap-0.5">
          <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wide">Paid out</span>
          <span className="text-base font-bold text-emerald-400 tabular-nums">{totalPaid.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-400/60">{payouts.length} payments</span>
        </div>
        <div className={`flex flex-col items-center rounded-xl px-2 py-3 gap-0.5 ${remaining > 0 ? "bg-rose-950/30" : "bg-white/5"}`}>
          <span className={`text-[10px] font-medium uppercase tracking-wide ${remaining > 0 ? "text-rose-400/80" : "text-slate-500/70"}`}>To pay</span>
          <span className={`text-base font-bold tabular-nums ${remaining > 0 ? "text-rose-400" : "text-slate-500"}`}>
            {remaining.toLocaleString()}
          </span>
          <span className={`text-[10px] ${remaining > 0 ? "text-rose-400/60" : "text-slate-500/60"}`}>MAD</span>
        </div>
      </div>

      {/* Admin: add payout */}
      {isAdmin &&
      <div className="flex flex-wrap gap-2 items-center border-t border-white/10 pt-3">
          <Input
          value={payoutAmount}
          onChange={(e) => setPayoutAmount(e.target.value)}
          placeholder="Amount (MAD)"
          type="number"
          min="0"
          className="h-8 text-xs w-28 flex-shrink-0" />
        
          <Input
          value={payoutNote}
          onChange={(e) => setPayoutNote(e.target.value)}
          placeholder="Note (optional)"
          className="h-8 text-xs flex-1 min-w-[100px]" />
        
          <button
          onClick={handleAddPayout}
          disabled={addingPayout || !payoutAmount}
          className="flex items-center gap-1 text-xs font-semibold bg-[#C9A227] hover:bg-[#A8841C] disabled:opacity-40 text-white px-3 h-8 rounded-lg flex-shrink-0 transition-colors">
          
            <Plus className="w-3.5 h-3.5" /> Pay
          </button>
        </div>
      }

      {/* Admin: add bonus to earned */}
      {isAdmin &&
      <div className="border-t border-white/10 pt-3">
          <button
          onClick={() => setShowBonusForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors">
          
            <Gift className="w-3.5 h-3.5" /> Add bonus to earned
          </button>
          {showBonusForm &&
        <div className="flex flex-wrap gap-2 items-center mt-2">
              <Input
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            placeholder="Amount (MAD)"
            type="number"
            min="0"
            className="h-8 text-xs w-28 flex-shrink-0" />
          
              <Input
            value={bonusNote}
            onChange={(e) => setBonusNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-8 text-xs flex-1 min-w-[100px]" />
          
              <button
            onClick={handleAddBonus}
            disabled={addingBonus || !bonusAmount}
            className="flex items-center gap-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white px-3 h-8 rounded-lg flex-shrink-0 transition-colors">
            
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
        }
        </div>
      }

      {/* Payout history */}
      {payouts.length > 0 &&
      <div>
          <button
          onClick={() => setShowPayouts((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          
            {showPayouts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Payout history ({payouts.length})
          </button>
          {showPayouts &&
        <div className="mt-2 space-y-1">
              {[...payouts].reverse().map((p) =>
          <div key={p.id} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2 gap-2">
                  <span className="text-slate-500 flex-shrink-0">{p.created_date?.split("T")[0] || p.period}</span>
                  {p.note && <span className="text-slate-500 truncate flex-1">{p.note}</span>}
                  <span className="font-semibold text-emerald-400">+{p.amount} MAD</span>
                  {isAdmin &&
            <button
              onClick={async () => {
                await base44.entities.DesignerPayout.delete(p.id);
                qc.invalidateQueries({ queryKey: ["designerPayouts", designerEmail, dashboard?.id] });
              }}
              className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
              
                      <X className="w-3 h-3" />
                    </button>
            }
                </div>
          )}
            </div>
        }
        </div>
      }
    </div>);

}