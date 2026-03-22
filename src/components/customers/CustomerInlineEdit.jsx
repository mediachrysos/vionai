import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Check, Loader2 } from "lucide-react";

export default function CustomerInlineEdit({ customer, models, onSave, onCancel }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      ...customer,
      assigned_models: customer.assigned_models || (customer.assigned_model ? [customer.assigned_model] : []),
    });
  }, [customer]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleModel = (modelId) => {
    setForm(prev => {
      const current = prev.assigned_models || [];
      return { ...prev, assigned_models: current.includes(modelId) ? current.filter(id => id !== modelId) : [...current, modelId] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs text-gray-400">Celé jméno</Label>
          <Input value={form.full_name || ""} onChange={e => set("full_name", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Email</Label>
          <Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Telefon</Label>
          <Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Název banky</Label>
          <Input value={form.bank_name || ""} onChange={e => set("bank_name", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Číslo účtu</Label>
          <Input value={form.bank_account_number || ""} onChange={e => set("bank_account_number", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Den výplaty (1–31)</Label>
          <Input
            type="number" min={1} max={31}
            value={form.pay_day_of_month || ""}
            onChange={e => set("pay_day_of_month", e.target.value ? parseInt(e.target.value) : "")}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Status</Label>
          <Select value={form.status || "active"} onValueChange={v => set("status", v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktivní</SelectItem>
              <SelectItem value="inactive">Neaktivní</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="blocked">Blokovaný</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-400">Přiřazené modelky</Label>
          <div className="mt-1 flex flex-wrap gap-1.5 p-2 border border-input rounded-md min-h-[34px]">
            {(form.assigned_models || []).map(id => {
              const m = models?.find(x => x.id === id);
              if (!m) return null;
              return (
                <Badge key={id} variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 flex items-center gap-1 text-xs">
                  {m.name}
                  <button onClick={() => toggleModel(id)}><X className="w-3 h-3" /></button>
                </Badge>
              );
            })}
            <Select onValueChange={toggleModel} value="">
              <SelectTrigger className="h-6 text-xs border-0 shadow-none p-0 pl-1 w-auto min-w-[120px]">
                <SelectValue placeholder="+ Přidat modelku" />
              </SelectTrigger>
              <SelectContent>
                {models?.filter(m => !(form.assigned_models || []).includes(m.id)).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-gray-400">Poznámky</Label>
          <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} className="mt-1 text-sm resize-none" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" size="sm" onClick={onCancel}>Zrušit</Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!form.full_name || saving}
          className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
        >
          {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Ukládám...</> : <><Check className="w-3.5 h-3.5 mr-1" /> Uložit</>}
        </Button>
      </div>
    </div>
  );
}