import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WalletTransactionModal({ open, onClose, onSave, accounts }) {
  const [form, setForm] = useState({ title: "", amount: "", type: "income", category: "", account_id: "", account_name: "", transaction_date: new Date().toISOString().split("T")[0], note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ title: "", amount: "", type: "income", category: "", account_id: "", account_name: "", transaction_date: new Date().toISOString().split("T")[0], note: "" });
  }, [open]);

  const handleAccountChange = (id) => {
    const acc = accounts.find(a => a.id === id);
    setForm(p => ({ ...p, account_id: id, account_name: acc?.name || "" }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-3">
          <DialogTitle className="text-white text-base font-semibold">Přidat transakci</DialogTitle>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <Label className="text-xs text-gray-500">Popis *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="např. Výplata nájmu" className="mt-1 h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Typ</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Příjem</SelectItem>
                  <SelectItem value="expense">Výdaj</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Částka (Kč) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Datum</Label>
            <Input type="date" value={form.transaction_date} onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Účet</Label>
            <Select value={form.account_id} onValueChange={handleAccountChange}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Vyberte účet (volitelné)" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Kategorie</Label>
            <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="např. Marketing, Nájem..." className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Poznámka</Label>
            <Textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2} className="mt-1 text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>Zrušit</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!form.title || !form.amount || saving}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
            {saving ? "Ukládám..." : "Přidat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}