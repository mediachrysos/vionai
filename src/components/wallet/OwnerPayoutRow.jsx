import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";

export default function OwnerPayoutRow({ owner, label, monthStr, totalDue, carryOver = 0 }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const { data: payouts = [] } = useQuery({
    queryKey: ["ownerPayouts", owner, monthStr],
    queryFn: () => base44.entities.OwnerPayout.filter({ owner, month: monthStr }),
  });

  const addMutation = useMutation({
    mutationFn: (amount) =>
      base44.entities.OwnerPayout.create({ owner, month: monthStr, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownerPayouts", owner, monthStr] });
      setAdding(false);
      setInputVal("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OwnerPayout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownerPayouts", owner, monthStr] }),
  });

  const paidOut = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const totalWithCarry = totalDue + carryOver;
  const remaining = totalWithCarry - paidOut;

  const handleAdd = () => {
    const val = parseFloat(inputVal);
    if (!val || val <= 0) return;
    addMutation.mutate(val);
  };

  return (
    <div className="px-4 py-3 rounded-xl bg-emerald-50 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Výplata – {label}</p>
          <p className="text-xs text-gray-400">50 % z čistého zisku</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-emerald-600">{totalDue.toLocaleString("cs-CZ")} Kč</p>

        </div>
      </div>

      {/* Paid out records */}
      {payouts.length > 0 && (
        <div className="space-y-1">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Vyplaceno</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">- {p.amount.toLocaleString("cs-CZ")} Kč</span>
                <button
                  onClick={() => deleteMutation.mutate(p.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remaining */}
      <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-1.5">
        <span className="text-xs font-medium text-gray-600">Zbývá vyplatit</span>
        <span className={`text-xs font-bold ${remaining > 0 ? "text-orange-500" : "text-emerald-600"}`}>
          {remaining.toLocaleString("cs-CZ")} Kč
        </span>
      </div>

      {/* Add payout */}
      {adding ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Částka..."
            className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-600"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setAdding(false); setInputVal(""); }}
            className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Přidat výplatu
        </button>
      )}
    </div>
  );
}