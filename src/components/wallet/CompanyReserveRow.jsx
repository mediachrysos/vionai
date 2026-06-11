import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";

export default function CompanyReserveRow({ monthStr, totalAllocated = 0, carryOver = 0 }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [noteVal, setNoteVal] = useState("");

  const { data: reserveTxs = [] } = useQuery({
    queryKey: ["companyReserve", monthStr],
    queryFn: () => base44.entities.CompanyReserve.filter({ month: monthStr }),
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyReserve.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companyReserve"] });
      setAdding(false);
      setInputVal("");
      setNoteVal("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanyReserve.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companyReserve"] }),
  });

  const spent = reserveTxs
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + (tx.amount || 0), 0);

  const totalWithCarry = totalAllocated + carryOver;
  const remaining = totalWithCarry - spent;

  const handleAdd = () => {
    const amount = parseFloat(inputVal);
    if (!amount || amount <= 0) return;
    addMutation.mutate({ type: "expense", amount, month: monthStr, note: noteVal });
  };

  return (
    <div className="px-4 py-3 rounded-xl bg-blue-950/30 border border-blue-900/30 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">Firemní rezerva</p>
          <p className="text-xs text-slate-500">20 % ze zbytku po advokátovi</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-blue-600">{totalAllocated.toLocaleString("cs-CZ")} Kč</p>
          {carryOver > 0 && <p className="text-xs text-blue-400">+ {carryOver.toLocaleString("cs-CZ")} Kč z min. měsíce</p>}
        </div>
      </div>

      {reserveTxs.length > 0 && (
        <div className="space-y-1">
          {reserveTxs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-400">{tx.note || "Firemní výdaj"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">- {tx.amount.toLocaleString("cs-CZ")} Kč</span>
                <button onClick={() => deleteMutation.mutate(tx.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
        <span className="text-xs font-medium text-slate-400">Zbývá v rezervě</span>
        <span className={`text-xs font-bold ${remaining < 0 ? "text-red-500" : "text-blue-600"}`}>
          {remaining.toLocaleString("cs-CZ")} Kč
        </span>
      </div>

      {adding ? (
        <div className="flex flex-col gap-2">
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Částka..."
            className="text-xs bg-white/10 border border-white/20 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            type="text"
            value={noteVal}
            onChange={(e) => setNoteVal(e.target.value)}
            placeholder="Poznámka (volitelné)..."
            className="text-xs bg-white/10 border border-white/20 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={addMutation.isPending}
              className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setAdding(false); setInputVal(""); setNoteVal(""); }}
              className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:bg-white/20">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium">
          <Plus className="w-3.5 h-3.5" />
          Přidat firemní výdaj
        </button>
      )}
    </div>
  );
}