import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function CustomerFormModal({ open, onClose, onSave, customer, models, users, allCustomers }) {
  const [form, setForm] = useState({
    full_name: "", email: "", bank_name: "", bank_account_number: "",
    date_of_birth: "", assigned_model: "", assigned_chatter: "",
    notes: "", status: "active", tags: []
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
        notes: "", status: "active", tags: []
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
          <DialogTitle>{customer ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>

        {duplicate && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm">
              A similar customer exists: <strong>{duplicate.full_name}</strong> ({duplicate.email || duplicate.bank_account_number}).
              Consider using the existing record.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 mt-2">
          <div>
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bank_name} onChange={e => handleChange("bank_name", e.target.value)} />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input value={form.bank_account_number} onChange={e => handleChange("bank_account_number", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" value={form.date_of_birth} onChange={e => handleChange("date_of_birth", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assigned Model</Label>
              <Select value={form.assigned_model} onValueChange={v => handleChange("assigned_model", v)}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Chatter</Label>
              <Select value={form.assigned_chatter} onValueChange={v => handleChange("assigned_chatter", v)}>
                <SelectTrigger><SelectValue placeholder="Select chatter" /></SelectTrigger>
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.full_name || saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? "Saving..." : customer ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}