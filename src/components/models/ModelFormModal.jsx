import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function ModelFormModal({ open, onClose, onSave, model, users }) {
  const [form, setForm] = useState({ name: "", status: "active", notes: "", assigned_chatters: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (model) setForm({ ...model, assigned_chatters: model.assigned_chatters || [] });
    else setForm({ name: "", status: "active", notes: "", assigned_chatters: [] });
  }, [model, open]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const toggleChatter = (email) => {
    setForm(prev => ({
      ...prev,
      assigned_chatters: prev.assigned_chatters.includes(email)
        ? prev.assigned_chatters.filter(e => e !== email)
        : [...prev.assigned_chatters, email]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{model ? "Upravit modelku" : "Přidat modelku"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Jméno modelky *</Label>
            <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Jméno modelky" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="inactive">Neaktivní</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Přiřazení chatteři</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {users?.map(u => (
                <Badge
                  key={u.email}
                  variant={form.assigned_chatters.includes(u.email) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggleChatter(u.email)}
                >
                  {u.full_name}
                  {form.assigned_chatters.includes(u.email) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Poznámky</Label>
            <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!form.name || saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Ukládám..." : model ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}