import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WalletAccountModal({ open, onClose, onSave, account }) {
  const [form, setForm] = useState({ name: "", description: "", balance: 0, currency: "CZK" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) setForm({ name: account.name, description: account.description || "", balance: account.balance || 0, currency: account.currency || "CZK" });
    else setForm({ name: "", description: "", balance: 0, currency: "CZK" });
  }, [account, open]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-3">
          <DialogTitle className="text-white text-base font-semibold">
            {account ? "Upravit účet" : "Přidat účet"}
          </DialogTitle>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label className="text-xs text-gray-500">Název účtu *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="např. Firemní účet" className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Popis</Label>
            <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Volitelný popis" className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Počáteční zůstatek (Kč)</Label>
            <Input type="number" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: parseFloat(e.target.value) || 0 }))} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>Zrušit</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!form.name || saving}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
            {saving ? "Ukládám..." : account ? "Uložit" : "Vytvořit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}