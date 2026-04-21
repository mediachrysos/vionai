import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, ChevronDown, ChevronUp, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function minutesToHours(mins) {
  return Math.round((mins / 60) * 100) / 100;
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

  const hourlyRate = dashboard?.hourly_rate ?? 35;

  // Fetch all work sessions for this designer/dashboard
  const { data: sessions = [] } = useQuery({
    queryKey: ["allWorkSessions", designerEmail, dashboard?.id],
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id,
    }),
    enabled: !!designerEmail && !!dashboard?.id,
    staleTime: 30000,
  });

  // Fetch payouts
  const { data: payouts = [] } = useQuery({
    queryKey: ["designerPayouts", designerEmail, dashboard?.id],
    queryFn: () => base44.entities.DesignerPayout.filter({
      designer_email: designerEmail,
      dashboard_id: dashboard?.id,
    }),
    enabled: !!designerEmail && !!dashboard?.id,
    staleTime: 30000,
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
      note: payoutNote,
    });
    setPayoutAmount("");
    setPayoutNote("");
    setAddingPayout(false);
    qc.invalidateQueries({ queryKey: ["designerPayouts", designerEmail, dashboard?.id] });
  };

  const handleRateSave = async () => {
    const rate = parseFloat(rateValue);
    if (isNaN(rate) || rate < 0) return;
    await base44.entities.SocialDashboard.update(dashboard.id, { hourly_rate: rate });
    setEditingRate(false);
    onRateChange?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Salary</span>
        </div>
        {/* Hourly rate */}
        <div className="flex items-center gap-1.5">
          {editingRate && isAdmin ? (
            <>
              <Input
                value={rateValue}
                onChange={e => setRateValue(e.target.value)}
                className="h-7 text-xs w-16"
                type="number"
                min="0"
              />
              <span className="text-xs text-gray-400">MAD/h</span>
              <button onClick={handleRateSave} className="text-emerald-600 hover:text-emerald-800">
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {hourlyRate} MAD/h
              </span>
              {isAdmin && (
                <button onClick={() => { setEditingRate(true); setRateValue(String(hourlyRate)); }} className="text-gray-300 hover:text-amber-500">
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Earned</p>
          <p className="text-sm font-bold text-amber-700">{totalEarned.toLocaleString()} MAD</p>
          <p className="text-[10px] text-gray-400">{totalHours}h worked</p>
        </div>
        <div className="text-center bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Paid out</p>
          <p className="text-sm font-bold text-emerald-700">{totalPaid.toLocaleString()} MAD</p>
          <p className="text-[10px] text-gray-400">{payouts.length} payments</p>
        </div>
        <div className={`text-center rounded-xl p-3 ${remaining > 0 ? "bg-rose-50" : "bg-gray-50"}`}>
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className={`text-sm font-bold ${remaining > 0 ? "text-rose-600" : "text-gray-400"}`}>
            {remaining.toLocaleString()} MAD
          </p>
          <p className="text-[10px] text-gray-400">to pay</p>
        </div>
      </div>

      {/* Admin: add payout */}
      {isAdmin && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-500">Record payout</p>
          <div className="flex gap-2">
            <Input
              value={payoutAmount}
              onChange={e => setPayoutAmount(e.target.value)}
              placeholder="Amount (MAD)"
              type="number"
              min="0"
              className="h-8 text-xs flex-1"
            />
            <Input
              value={payoutNote}
              onChange={e => setPayoutNote(e.target.value)}
              placeholder="Note (optional)"
              className="h-8 text-xs flex-1"
            />
            <Button
              onClick={handleAddPayout}
              disabled={addingPayout || !payoutAmount}
              size="sm"
              className="bg-[#C9A227] hover:bg-[#A8841C] text-white h-8 gap-1 flex-shrink-0"
            >
              <Plus className="w-3 h-3" /> Pay
            </Button>
          </div>
        </div>
      )}

      {/* Payout history */}
      {payouts.length > 0 && (
        <div>
          <button
            onClick={() => setShowPayouts(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            {showPayouts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Payout history ({payouts.length})
          </button>
          {showPayouts && (
            <div className="mt-2 space-y-1">
              {[...payouts].reverse().map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="text-gray-400">{p.created_date?.split("T")[0] || p.period}</span>
                  <span>{p.note && <span className="text-gray-400 mr-2">{p.note}</span>}</span>
                  <span className="font-semibold text-emerald-700">+{p.amount} MAD</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}