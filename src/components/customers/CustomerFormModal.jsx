import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";

export default function CustomerFormModal({ open, onClose, onSave, customer, models, users, allCustomers }) {
  const [form, setForm] = useState({
    full_name: "", email: "", bank_name: "", bank_account_number: "",
    date_of_birth: "", assigned_model: "", assigned_chatter: "",
    notes: "", status: "active", tags: [], pay_day_of_month: ""
  });
  const [duplicate, setDuplicate] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({ ...customer });
    } else {
      setForm({
        full_name: "", email: "", bank_name: "", bank_account_number: "",
        date_of_birth: "", assigned_model: "", assigned_chatter: "",
        notes: "", status: "active", tags: [], pay_day_of_month: ""
      });
    }
    setDuplicate(null);
  }, [customer, open]);

  const checkDuplicate = (field, value) => {
    if (!value || customer) return;
    const match = allCustomers.find(c => {
      if (field === "email") return c.email?.toLowerCase() === value.toLowerCase();
      if (field === "bank_account_number") return c.bank_account_number === value;
      if (field === "full_name") return c.full_name?.toLowerCase() === value.toLowerCase();
      return false;
    });
    setDuplicate(match || null);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (["email", "bank_account_number", "full_name"].includes(field)) {
      checkDuplicate(field, value);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? "Upravit zákazníka" : "Přidat zákazníka"}</DialogTitle>
        </DialogHeader>

        {duplicate && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              Podobný zákazník již existuje: <strong>{duplicate.full_name}</strong> ({duplicate.email || duplicate.bank_account_number}).
              Zvažte použití stávajícího záznamu.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 mt-2">
          <div>
            <Label>Celé jméno *</Label>
            <Input value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="Jan Novák" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="jan@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Název banky</Label>
              <Input value={form.bank_name} onChange={e => handleChange("bank_name", e.target.value)} />
            </div>
            <div>
              <Label>Číslo účtu</Label>
              <Input value={form.bank_account_number} onChange={e => handleChange("bank_account_number", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Datum narození</Label>
              <DatePicker value={form.date_of_birth} onChange={v => handleChange("date_of_birth", v)} />
            </div>
            <div>
              <Label>Den výplaty (1–31)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.pay_day_of_month || ""}
                onChange={e => handleChange("pay_day_of_month", e.target.value ? parseInt(e.target.value) : "")}
                placeholder="např. 15"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Přiřazená modelka</Label>
              <Select value={form.assigned_model} onValueChange={v => handleChange("assigned_model", v)}>
                <SelectTrigger><SelectValue placeholder="Vybrat modelku" /></SelectTrigger>
                <SelectContent>
                  {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Přiřazený chatter</Label>
              <Select value={form.assigned_chatter} onValueChange={v => handleChange("assigned_chatter", v)}>
                <SelectTrigger><SelectValue placeholder="Vybrat chattera" /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => handleChange("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="inactive">Neaktivní</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="blocked">Blokovaný</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Poznámky</Label>
            <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!form.full_name || saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Ukládám..." : customer ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}