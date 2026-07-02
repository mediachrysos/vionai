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
import DatePicker from "@/components/ui-custom/DatePicker";

const AD_SPEND_CATEGORY = "Facebook Ads";

const PRESET_CATEGORIES = ["Lawyer Payout", "Facebook Ads", "Software", "Transfer fee", "Bank fee", "Firemní rezerva"];

export default function WalletTransactionModal({ open, onClose, onSave, onTransfer, accounts }) {
  const [form, setForm] = useState({
    title: "", amount: "", type: "income", category: "", account_id: "", account_name: "",
    transaction_date: new Date().toISOString().split("T")[0], note: "", invoice_url: "", invoice_name: "",
    model_id: "", model_name: "", _payout: false,
  });
  const [transferForm, setTransferForm] = useState({ from_account_id: "", to_account_id: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], note: "" });
  const [mode, setMode] = useState("tx"); // "tx" | "transfer"
  const [saving, setSaving] = useState(false);
  const [categoryMode, setCategoryMode] = useState("select"); // "select" | "new"
  const [uploading, setUploading] = useState(false);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.filter({ status: "active" }),
  });

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
      setForm({ title: "", amount: "", type: "income", category: "", account_id: "", account_name: "", transaction_date: new Date().toISOString().split("T")[0], note: "", invoice_url: "", invoice_name: "", model_id: "", model_name: "", _payout: false });
      setTransferForm({ from_account_id: "", to_account_id: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], note: "" });
      setCategoryMode("select");
      setMode("tx");
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
    if (mode === "transfer") {
      await onTransfer({ ...transferForm, amount: parseFloat(transferForm.amount) || 0 });
    } else {
      await onSave({ ...form, amount: parseFloat(form.amount) || 0 });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-3">
          <DialogTitle className="text-white text-base font-semibold">Add transaction</DialogTitle>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setMode("tx")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "tx" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-gray-400 hover:text-gray-600"}`}
          >
            Transaction
          </button>
          <button
            onClick={() => setMode("transfer")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === "transfer" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-gray-400 hover:text-gray-600"}`}
          >
            Transfer between accounts
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
        {mode === "transfer" ? (
          <>
            <div>
              <Label className="text-xs text-gray-500">From account *</Label>
              <Select value={transferForm.from_account_id} onValueChange={v => setTransferForm(p => ({ ...p, from_account_id: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select source account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">To account *</Label>
              <Select value={transferForm.to_account_id} onValueChange={v => setTransferForm(p => ({ ...p, to_account_id: v }))}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select destination account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== transferForm.from_account_id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Amount (CZK) *</Label>
              <Input type="number" value={transferForm.amount} onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Date</Label>
              <div className="mt-1">
                <DatePicker value={transferForm.transaction_date} onChange={v => setTransferForm(p => ({ ...p, transaction_date: v }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Note</Label>
              <Textarea value={transferForm.note} onChange={e => setTransferForm(p => ({ ...p, note: e.target.value }))} rows={2} className="mt-1 text-sm resize-none" />
            </div>
          </>
        ) : (
          <>
          <div>
            <Label className="text-xs text-gray-500">Description *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Rent payment" className="mt-1 h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={form._payout ? "payout" : form.type} onValueChange={v => {
                setForm(p => ({
                  ...p,
                  type: v === "payout" ? "expense" : v,
                  category: v === "payout" ? "Payout" : (p.category === "Payout" ? "" : p.category),
                  _payout: v === "payout",
                }));
              }}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Amount (CZK) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="mt-1 h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Date</Label>
            <div className="mt-1">
              <DatePicker value={form.transaction_date} onChange={v => setForm(p => ({ ...p, transaction_date: v }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500">Account</Label>
            <Select value={form.account_id} onValueChange={handleAccountChange}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Category - smart select + new */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-gray-500">Category</Label>
              <button
                onClick={() => setCategoryMode(m => m === "select" ? "new" : "select")}
                className="text-xs text-[#C9A227] hover:underline"
              >
                {categoryMode === "select" ? "+ New category" : "← Select existing"}
              </button>
            </div>
            {categoryMode === "select" ? (
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
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
                placeholder="Enter new category..."
                className="h-8 text-sm"
                autoFocus
              />
            )}
          </div>

          {/* Model selection — only for Facebook Ads */}
          {form.category === AD_SPEND_CATEGORY && (
            <div>
              <Label className="text-xs text-gray-500">Model (for Ad Spend)</Label>
              <Select value={form.model_id} onValueChange={v => {
                const m = models.find(x => x.id === v);
                setForm(p => ({ ...p, model_id: v, model_name: m?.name || "" }));
              }}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice upload */}
          <div>
            <Label className="text-xs text-gray-500">Invoice (PDF or image)</Label>
            {form.invoice_url ? (
              <div className="mt-1 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <a href={form.invoice_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex-1 min-w-0 truncate block">
                  {form.invoice_name || "Invoice"}
                </a>
                <button onClick={() => setForm(p => ({ ...p, invoice_url: "", invoice_name: "" }))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-[#C9A227] cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{uploading ? "Uploading..." : "Click to upload invoice"}</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleInvoiceUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <div>
            <Label className="text-xs text-gray-500">Note</Label>
            <Textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={2} className="mt-1 text-sm resize-none" />
          </div>
          </>
        )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}
            disabled={mode === "transfer"
              ? (!transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount || saving)
              : (!form.title || !form.amount || saving)}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
            {saving ? "Saving..." : mode === "transfer" ? "Transfer" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}