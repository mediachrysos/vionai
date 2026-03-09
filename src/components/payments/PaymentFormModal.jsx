import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const quickAmounts = [300, 500, 1000, 1500, 2000];

export default function PaymentFormModal({ open, onClose, onSave, customers, models, users, currentUser }) {
  const [form, setForm] = useState({
    customer_id: "", customer_name: "", amount: "", service_type: "",
    model_id: "", model_name: "", chatter_email: "", chatter_name: "",
    destination_account: "", payment_date: new Date().toISOString().split("T")[0],
    note: "", status: "completed"
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(prev => ({
        ...prev, customer_id: "", customer_name: "", amount: "",
        service_type: "", model_id: "", model_name: "",
        chatter_email: currentUser?.email || "", chatter_name: currentUser?.full_name || "",
        destination_account: "", payment_date: new Date().toISOString().split("T")[0],
        note: "", status: "completed"
      }));
      setCustomerSearch("");
    }
  }, [open, currentUser]);

  const filteredCustomers = customers.filter(c =>
    customerSearch && (
      c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
    )
  );

  const selectCustomer = (c) => {
    const modelMatch = models.find(m => m.id === c.assigned_model);
    setForm(prev => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.full_name,
      model_id: c.assigned_model || prev.model_id,
      model_name: modelMatch?.name || prev.model_name,
      chatter_email: c.assigned_chatter || prev.chatter_email,
    }));
    setCustomerSearch(c.full_name);
    setShowCustomerDropdown(false);
  };

  const handleModelChange = (modelId) => {
    const m = models.find(x => x.id === modelId);
    setForm(prev => ({ ...prev, model_id: modelId, model_name: m?.name || "" }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    await onSave(data);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Customer Search */}
          <div className="relative">
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => customerSearch && setShowCustomerDropdown(true)}
                placeholder="Search customer by name or email..."
                className="pl-10"
              />
            </div>
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">
                      {c.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.email || "No email"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Amount */}
          <div>
            <Label>Amount *</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickAmounts.map(a => (
                <button
                  key={a}
                  onClick={() => setForm(prev => ({ ...prev, amount: a.toString() }))}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    parseFloat(form.amount) === a
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                  )}
                >
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={form.amount}
              onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Custom amount"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Model</Label>
              <Select value={form.model_id} onValueChange={handleModelChange}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chatter</Label>
              <Select value={form.chatter_email} onValueChange={v => {
                const u = users.find(x => x.email === v);
                setForm(prev => ({ ...prev, chatter_email: v, chatter_name: u?.full_name || v }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select chatter" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Service Type</Label>
              <Input value={form.service_type} onChange={e => setForm(prev => ({ ...prev, service_type: e.target.value }))} placeholder="e.g. Chat session" />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={form.payment_date} onChange={e => setForm(prev => ({ ...prev, payment_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Destination Account</Label>
            <Input value={form.destination_account} onChange={e => setForm(prev => ({ ...prev, destination_account: e.target.value }))} placeholder="Bank account / payment destination" />
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.customer_id || !form.amount || saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Saving..." : "Add Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}