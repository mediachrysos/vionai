import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, ChevronDown, ChevronUp } from "lucide-react";

export default function OwnerPayoutRow({ owner, label, monthStr, totalDue, carryOver = 0 }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [expanded, setExpanded] = useState(false);

  const { data: payouts = [] } = useQuery({
    queryKey: ["ownerPayouts", owner, monthStr],
    queryFn: () => base44.entities.OwnerPayout.filter({ owner, month: monthStr }),
  });

  const addMutation = useMutation({
    mutationFn: (amount) =>
      base44.entities.OwnerPayout.create({ owner, month: monthStr, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ownerPayouts", owner] });
      setAdding(false);
      setInputVal("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OwnerPayout.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ownerPayouts", owner] }),
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
    <div className="px-4 py-3 rounded-xl bg-emerald-950/30 border border-emerald-900/30 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Výplata – {label}</p>
          <p className="text-xs text-slate-500">40 % ze zbytku po rezervě</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-emerald-400">{totalDue.toLocaleString("cs-CZ")} Kč</p>
          {carryOver > 0 && (
            <p className="text-xs text-orange-500 font-medium">+ {carryOver.toLocaleString("cs-CZ")} Kč přenos</p>
          )}
        </div>
      </div>

      {/* Collapsed summary row — clickable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between bg-white/5 hover:bg-white/8 rounded-lg px-3 py-2 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-xs font-medium text-slate-300">
            Vyplaceno {payouts.length > 0 ? `(${payouts.length}×)` : ""}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-300">
          {paidOut > 0 ? `− ${paidOut.toLocaleString("cs-CZ")} Kč` : "—"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-1 pl-1">
          {payouts.length === 0 && (
            <p className="text-xs text-slate-500 px-3 py-1">Zatím žádná výplata</p>
          )}
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-400">{p.note || "Výplata"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">− {p.amount.toLocaleString("cs-CZ")} Kč</span>
                <button
                  onClick={() => deleteMutation.mutate(p.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Add payout inline */}
          {adding ? (
            <div className="flex items-center gap-2 px-1 pt-1">
              <input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Částka..."
                className="flex-1 text-xs bg-white/10 border border-white/20 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:bg-white/20"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Přidat výplatu
            </button>
          )}
        </div>
      )}

      {/* Remaining */}
      <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
        <span className="text-xs font-medium text-slate-400">Zbývá vyplatit</span>
        <span className={`text-xs font-bold ${remaining > 0 ? "text-orange-500" : "text-emerald-400"}`}>
          {remaining.toLocaleString("cs-CZ")} Kč
        </span>
      </div>
    </div>
  );
}