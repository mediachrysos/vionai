import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, RefreshCw, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function SubscriptionModal({ open, onClose, onSave, subscription, accounts }) {
  const fileRef = useRef();
  const [form, setForm] = useState(
    subscription
      ? { ...subscription }
      : { name: "", amount: "", billing_day: "", account_id: "", note: "", is_active: true, logo_url: "" }
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(
      subscription
        ? { ...subscription }
        : { name: "", amount: "", billing_day: "", account_id: "", note: "", is_active: true, logo_url: "" }
    );
  }, [subscription, open]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    const acc = accounts.find(a => a.id === form.account_id);
    await onSave({
      ...form,
      amount: parseFloat(form.amount) || 0,
      billing_day: parseInt(form.billing_day) || 1,
      account_name: acc?.name || "",
    });
    onClose();
  };

  const valid = form.name.trim() && form.amount && form.billing_day && form.account_id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-6 py-4">
          <DialogTitle className="text-white text-base font-semibold">
            {subscription ? "Upravit předplatné" : "Nové předplatné"}
          </DialogTitle>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Logo upload */}
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Logo</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-gray-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Nahrávám..." : "Nahrát logo"}
              </button>
              {form.logo_url && (
                <button type="button" onClick={() => setForm(f => ({ ...f, logo_url: "" }))} className="text-xs text-gray-400 hover:text-red-500">
                  Odebrat
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Název *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Netflix, Spotify..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cena (Kč) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Den odečtení (1–31) *</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.billing_day}
              onChange={e => setForm(f => ({ ...f, billing_day: e.target.value }))}
              placeholder="1"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Účet *</Label>
            <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat účet" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Poznámka</Label>
            <Input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Volitelná poznámka"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button
              disabled={!valid}
              onClick={handleSave}
              className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
            >
              Uložit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SubscriptionsSection({ accounts }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => base44.entities.Subscription.list("-created_date", 100),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.Subscription.update(editing.id, data);
      return base44.entities.Subscription.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Subscription.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Subscription.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  });

  const handleEdit = (sub) => { setEditing(sub); setShowModal(true); };
  const handleNew = () => { setEditing(null); setShowModal(true); };

  const totalMonthly = subscriptions.filter(s => s.is_active).reduce((s, sub) => s + (sub.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-500" />
            Předplatné (Subscriptions)
          </h3>
          {subscriptions.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Celkem měsíčně: <span className="font-semibold text-red-600">{totalMonthly.toLocaleString("cs-CZ")} Kč</span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={handleNew}
          className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
          <Plus className="w-3.5 h-3.5 mr-1" /> Přidat
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Žádné předplatné. Klikni na Přidat.</p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map(sub => (
            <div
              key={sub.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-opacity ${sub.is_active ? "border-gray-100 bg-gray-50/50" : "border-gray-100 bg-gray-50/20 opacity-50"}`}
            >
              {/* Logo or placeholder */}
              {sub.logo_url ? (
                <img src={sub.logo_url} alt={sub.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-300" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{sub.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {sub.billing_day}. každý měsíc
                  </span>
                  {sub.account_name && (
                    <span className="text-xs text-gray-400">· {sub.account_name}</span>
                  )}
                  {sub.note && (
                    <span className="text-xs text-gray-400 truncate">· {sub.note}</span>
                  )}
                </div>
              </div>

              <span className="text-sm font-semibold text-red-600 flex-shrink-0">
                -{(sub.amount || 0).toLocaleString("cs-CZ")} Kč
              </span>

              {/* Toggle — green = active, red = inactive */}
              <button
                onClick={() => toggleMutation.mutate({ id: sub.id, is_active: !sub.is_active })}
                className={`w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 relative ${sub.is_active ? "bg-emerald-500" : "bg-red-400"}`}
                title={sub.is_active ? "Deaktivovat" : "Aktivovat"}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${sub.is_active ? "translate-x-5" : "translate-x-1"}`} />
              </button>

              <button onClick={() => handleEdit(sub)} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => window.confirm(`Smazat "${sub.name}"?`) && deleteMutation.mutate(sub.id)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SubscriptionModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={saveMutation.mutateAsync}
        subscription={editing}
        accounts={accounts}
      />
    </div>
  );
}