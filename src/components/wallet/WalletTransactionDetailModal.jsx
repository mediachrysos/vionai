import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, FileText, Upload, X, Download, Pencil, Save, Trash2 } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

const PRESET_CATEGORIES = ["Výplata Advokát", "Facebook Ads", "Software", "Poplatek za převod", "Bankovní poplatek"];

export default function WalletTransactionDetailModal({ open, onClose, transaction, accounts, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.filter({ status: "active" }),
  });

  useEffect(() => {
    if (transaction) {
      setForm({ ...transaction });
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [transaction]);

  if (!transaction) return null;

  const isExpense = transaction.id?.startsWith("exp_");
  const isWallet = transaction.source === "Wallet";
  const isEditable = isWallet || isExpense;
  const isIncome = (form.type || transaction.type) === "income";

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = { ...form, invoice_url: file_url, invoice_name: file.name };
    setForm(updated);
    if (!editing) {
      // Save immediately if not in edit mode
      await base44.entities.WalletTransaction.update(transaction.id, { invoice_url: file_url, invoice_name: file.name });
      onUpdate?.();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    if (isExpense) {
      const realId = transaction.id.replace("exp_", "");
      await base44.entities.Expense.update(realId, {
        title: form.title,
        amount: parseFloat(form.amount) || 0,
        expense_date: form.transaction_date,
        note: form.note,
        model_id: form.model_id || null,
        model_name: form.model_name || null,
      });
    } else {
      await base44.entities.WalletTransaction.update(transaction.id, {
        title: form.title,
        amount: parseFloat(form.amount) || 0,
        type: form.type,
        category: form.category,
        account_id: form.account_id,
        account_name: form.account_name,
        transaction_date: form.transaction_date,
        note: form.note,
        invoice_url: form.invoice_url,
        invoice_name: form.invoice_name,
      });
    }
    onUpdate?.();
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    if (isExpense) {
      await base44.entities.Expense.delete(transaction.id.replace("exp_", ""));
    } else if (isWallet) {
      await base44.entities.WalletTransaction.delete(transaction.id);
    }
    onDelete?.();
    onClose();
    setSaving(false);
  };

  const handleAccountChange = (id) => {
    const acc = accounts?.find(a => a.id === id);
    setForm(p => ({ ...p, account_id: id, account_name: acc?.name || "" }));
  };

  const displayDate = form.transaction_date
    ? format(new Date(form.transaction_date), "d. MMMM yyyy", { locale: cs })
    : form.created_date
      ? format(new Date(form.created_date), "d. MMMM yyyy", { locale: cs })
      : "—";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 ${isIncome ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : "bg-gradient-to-r from-red-500 to-red-600"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                {isIncome
                  ? <ArrowUpCircle className="w-5 h-5 text-white" />
                  : <ArrowDownCircle className="w-5 h-5 text-white" />
                }
              </div>
              <div>
                <DialogTitle className="text-white text-base font-semibold leading-tight">
                  {editing ? "Upravit transakci" : (form.title || transaction.title)}
                </DialogTitle>
                <p className="text-white/70 text-xs mt-0.5">{displayDate}</p>
              </div>
            </div>
            <p className="text-white text-xl font-bold">
              {isIncome ? "+" : "–"}{(parseFloat(form.amount) || 0).toLocaleString("cs-CZ")} Kč
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!editing ? (
            /* View mode */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1e1e1e] rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Typ</p>
                    <Badge className={isIncome ? "bg-emerald-950/50 text-emerald-400 border-emerald-700/30" : "bg-red-950/50 text-red-400 border-red-700/30"}>
                      {isIncome ? "Příjem" : "Výdaj"}
                    </Badge>
                  </div>
                  <div className="bg-[#1e1e1e] rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Kategorie</p>
                    <p className="text-sm font-medium text-slate-200">{form.category || "—"}</p>
                  </div>
              </div>

              {form.account_name && (
                <div className="bg-[#1e1e1e] rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-slate-500 mb-1">Účet</p>
                  <p className="text-sm font-medium text-slate-200">{form.account_name}</p>
                </div>
              )}

              {form.note && (
                <div className="bg-[#1e1e1e] rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-slate-500 mb-1">Poznámka</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{form.note}</p>
                </div>
              )}

              {/* Invoice section */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Faktura</p>
                {form.invoice_url ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-950/30 rounded-xl border border-blue-700/30">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-300 flex-1 truncate">{form.invoice_name || "Faktura"}</span>
                    <a
                      href={form.invoice_url}
                      download={form.invoice_name || "faktura"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 font-medium px-2 py-1 rounded-lg hover:bg-blue-900/50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Stáhnout
                    </a>
                    {isEditable && (
                      <button
                        onClick={() => setForm(p => ({ ...p, invoice_url: "", invoice_name: "" }))}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    </div>
                    ) : isEditable ? (
                    <label className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-white/10 hover:border-[#C9A227] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-500">{uploading ? "Nahrávám..." : "Nahrát fakturu"}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleInvoiceUpload} disabled={uploading} />
                  </label>
                ) : (
                  <p className="text-sm text-slate-500">Žádná faktura</p>
                )}
                </div>

                {form.source && (
                <div className="pt-1">
                  <Badge variant="outline" className="text-xs text-slate-500 border-white/10">Zdroj: {form.source}</Badge>
                </div>
                )}
            </>
          ) : (
            /* Edit mode */
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500">Popis *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="mt-1 h-8 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Typ</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Příjem</SelectItem>
                      <SelectItem value="expense">Výdaj</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Částka (Kč)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="mt-1 h-8 text-sm" />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Datum</Label>
                <div className="mt-1">
                  <DatePicker value={form.transaction_date} onChange={v => setForm(p => ({ ...p, transaction_date: v }))} />
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Kategorie</Label>
                <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="mt-1 h-8 text-sm" list="cats" />
                <datalist id="cats">
                  {PRESET_CATEGORIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {accounts?.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">Účet</Label>
                  <Select value={form.account_id || ""} onValueChange={handleAccountChange}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-500">Faktura</Label>
                {form.invoice_url ? (
                  <div className="mt-1 flex items-center gap-2 p-2 bg-blue-950/30 rounded-lg border border-blue-700/30">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-300 flex-1 truncate">{form.invoice_name || "Faktura"}</span>
                    <a href={form.invoice_url} download={form.invoice_name || "faktura"} target="_blank" rel="noreferrer">
                      <Download className="w-3.5 h-3.5 text-blue-400 hover:text-blue-300" />
                    </a>
                    <button onClick={() => setForm(p => ({ ...p, invoice_url: "", invoice_name: "" }))} className="text-slate-500 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 hover:border-[#C9A227] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">{uploading ? "Nahrávám..." : "Nahrát fakturu"}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleInvoiceUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              {isExpense && models.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">Modelka</Label>
                  <Select value={form.model_id || ""} onValueChange={v => {
                    const m = models.find(x => x.id === v);
                    setForm(p => ({ ...p, model_id: v, model_name: m?.name || "" }));
                  }}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Vyberte modelku" /></SelectTrigger>
                    <SelectContent>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-slate-500">Poznámka</Label>
                <Textarea value={form.note || ""} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={3} className="mt-1 text-sm resize-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 px-5 py-3 border-t border-white/10">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Zavřít</Button>
            {isEditable && !editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={saving}
                className={confirmDelete ? "border-red-400 text-red-600 hover:bg-red-50" : "text-gray-500 hover:text-red-500 hover:border-red-300"}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {confirmDelete ? "Opravdu smazat?" : "Smazat"}
              </Button>
            )}
          </div>
          {isEditable && (
            editing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...transaction }); setConfirmDelete(false); }}>Zrušit</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}
                  className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {saving ? "Ukládám..." : "Uložit"}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Upravit
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}