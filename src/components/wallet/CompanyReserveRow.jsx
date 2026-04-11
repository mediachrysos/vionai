import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";

export default function CompanyReserveRow({ monthStr, totalAllocated = 0 }) {
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
      qc.invalidateQueries({ queryKey: ["companyReserve", monthStr] });
      setAdding(false);
      setInputVal("");
      setNoteVal("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CompanyReserve.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companyReserve", monthStr] }),
  });

  const spent = reserveTxs
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + (tx.amount || 0), 0);

  const remaining = totalAllocated - spent;

  const handleAdd = () => {
    const amount = parseFloat(inputVal);
    if (!amount || amount <= 0) return;
    addMutation.mutate({ type: "expense", amount, month: monthStr, note: noteVal });
  };

  return (
    <div className="px-4 py-3 rounded-xl bg-blue-50 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Firemní rezerva</p>
          <p className="text-xs text-gray-400">20 % ze zbytku po advokátovi</p>
        </div>
        <p className="text-base font-bold text-blue-600">{totalAllocated.toLocaleString("cs-CZ")} Kč</p>
      </div>

      {reserveTxs.length > 0 && (
        <div className="space-y-1">
          {reserveTxs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">{tx.note || "Firemní výdaj"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">- {tx.amount.toLocaleString("cs-CZ")} Kč</span>
                <button onClick={() => deleteMutation.mutate(tx.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-1.5">
        <span className="text-xs font-medium text-gray-600">Zbývá v rezervě</span>
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
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            type="text"
            value={noteVal}
            onChange={(e) => setNoteVal(e.target.value)}
            placeholder="Poznámka (volitelné)..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={addMutation.isPending}
              className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setAdding(false); setInputVal(""); setNoteVal(""); }}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-3.5 h-3.5" />
          Přidat firemní výdaj
        </button>
      )}
    </div>
  );
}