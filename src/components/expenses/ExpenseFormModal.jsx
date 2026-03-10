import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["marketing", "software", "salaries", "infrastructure", "taxes", "other"];

const empty = { title: "", amount: "", category: "other", expense_date: "", linked_payment_id: "", note: "" };

export default function ExpenseFormModal({ open, onClose, onSave, expense, payments = [] }) {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm(expense ? { ...expense, amount: expense.amount || "" } : { ...empty, expense_date: new Date().toISOString().split("T")[0] });
  }, [open, expense]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Upravit výdaj" : "Zaznamenat výdaj"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Název *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="např. Meta Ads - Březen" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Částka *</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-1">
              <Label>Datum</Label>
              <Input type="date" value={form.expense_date} onChange={e => set("expense_date", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Kategorie</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Propojit s platbou (volitelné)</Label>
            <Select value={form.linked_payment_id || "none"} onValueChange={v => set("linked_payment_id", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Bez propojené platby" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Žádná —</SelectItem>
                {payments.slice(0, 50).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.customer_name || "Customer"} — ${p.amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Poznámka</Label>
            <Textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} placeholder="Volitelná poznámka..." />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {expense ? "Uložit změny" : "Zaznamenat"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}