import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, X } from "lucide-react";

const PRESET_CATEGORIES = ["Výplata Advokát", "Facebook Ads", "Software", "Poplatek za převod", "Bankovní poplatek"];

export default function WalletTransactionModal({ open, onClose, onSave, accounts }) {
  const [form, setForm] = useState({
    title: "", amount: "", type: "income", category: "", account_id: "", account_name: "",
    transaction_date: new Date().toISOString().split("T")[0], note: "", invoice_url: "", invoice_name: ""
  });
  const [saving, setSaving] = useState(false);
  const [categoryMode, setCategoryMode] = useState("select"); // "select" | "new"
  const [uploading, setUploading] = useState(false);

  // Load existing unique categories from WalletTransactions
  const { data: existingTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 200),
  });

  const existingCategories = useMemo(() => {
    const cats = new Set(PRESET_CATEGORIES);
    existingTxs.forEach(t => { if (t.category) cats.add(t.category); });
    return Array.from(cats).sort();
  }, [existingTxs]);

  useEffect(() => {
    if (open) {
      setForm({ title: "", amount: "", type: "income", category: "", account_id: "", account_name: "", transaction_date: new Date().toISOString().split("T")[0], note: "", invoice_url: "", invoice_name: "" });
      setCategoryMode("select");
    }
  }, [open]);

  const handleAccountChange = (id) => {
    const acc = accounts.find(a => a.id === id);
    setForm(p => ({ ...p, account_id: id, account_name: acc?.name || "" }));
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, invoice_url: file_url, invoice_name: file.name }));
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-3">
          <DialogTitle className="text-white text-base font-semibold">Přidat transakci</DialogTitle>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
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

          {/* Category - smart select + new */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-gray-500">Kategorie</Label>
              <button
                onClick={() => setCategoryMode(m => m === "select" ? "new" : "select")}
                className="text-xs text-[#C9A227] hover:underline"
              >
                {categoryMode === "select" ? "+ Nová kategorie" : "← Vybrat existující"}
              </button>
            </div>
            {categoryMode === "select" ? (
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte kategorii" /></SelectTrigger>
                <SelectContent>
                  {existingCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="Napište novou kategorii..."
                className="h-8 text-sm"
                autoFocus
              />
            )}
          </div>

          {/* Invoice upload */}
          <div>
            <Label className="text-xs text-gray-500">Faktura (PDF nebo obrázek)</Label>
            {form.invoice_url ? (
              <div className="mt-1 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <a href={form.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex-1 min-w-0 truncate block">
                  {form.invoice_name || "Faktura"}
                </a>
                <button onClick={() => setForm(p => ({ ...p, invoice_url: "", invoice_name: "" }))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-[#C9A227] cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{uploading ? "Nahrávám..." : "Klikněte pro nahrání faktury"}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleInvoiceUpload} disabled={uploading} />
              </label>
            )}
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