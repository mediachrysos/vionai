import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function BonusPayoutForm({ email }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    setSaving(true);
    await base44.entities.ChatterPayout.create({
      chatter_email: email,
      amount: amt,
      period: getCurrentPeriod(),
      note: note || "Bonus",
    });
    setAmount("");
    setNote("");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["chatterPayouts"] });
  };

  return (
    <div className="flex gap-2 items-center mb-4">
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Bonus amount"
        type="number"
        min="0"
        className="h-8 text-xs w-32 flex-shrink-0 bg-white/5 border-white/10 text-slate-200"
      />
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="h-8 text-xs flex-1 min-w-0 bg-white/5 border-white/10 text-slate-200"
      />
      <button
        onClick={handleAdd}
        disabled={saving || !amount}
        className="flex items-center gap-1 text-xs font-semibold bg-[#C9A227] hover:bg-[#A8841C] disabled:opacity-40 text-white px-3 h-8 rounded-lg flex-shrink-0 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add bonus
      </button>
    </div>
  );
}