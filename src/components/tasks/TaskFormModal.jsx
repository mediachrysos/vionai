import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TaskFormModal({ open, onClose, onSave, task, users, currentUser }) {
  const [form, setForm] = useState({
    title: "", description: "", assignee: "", assignee_name: "",
    priority: "medium", status: "todo", due_date: "",
    related_customer_id: "", related_model_id: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) setForm({ ...task });
    else setForm({
      title: "", description: "", assignee: "", assignee_name: "",
      priority: "medium", status: "todo", due_date: "",
      related_customer_id: "", related_model_id: ""
    });
  }, [task, open]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{task ? "Upravit úkol" : "Přidat úkol"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Název *</Label>
            <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Název úkolu" />
          </div>
          <div>
            <Label>Popis</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Přiřadit</Label>
              <Select value={form.assignee} onValueChange={v => {
                const u = users?.find(x => x.email === v);
                setForm(prev => ({ ...prev, assignee: v, assignee_name: u?.full_name || v }));
              }}>
                <SelectTrigger><SelectValue placeholder="Přiřadit..." /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorita</Label>
              <Select value={form.priority} onValueChange={v => setForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Nízká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="high">Vysoká</SelectItem>
                  <SelectItem value="urgent">Urgentní</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stav</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">K vyřízení</SelectItem>
                  <SelectItem value="in_progress">Probíhá</SelectItem>
                  <SelectItem value="done">Hotovo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Termín</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!form.title || saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Ukládám..." : task ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}