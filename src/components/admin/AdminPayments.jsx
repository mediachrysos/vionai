import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/components/ui-custom/DatePicker";

const statusColors = {
  completed: "bg-emerald-950/50 text-emerald-400 border-emerald-700/30",
  pending: "bg-amber-950/50 text-amber-400 border-amber-700/30",
  failed: "bg-red-950/50 text-red-400 border-red-700/30",
  refunded: "bg-slate-800 text-slate-400 border-white/10",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    loadPayments();
    base44.entities.Customer.list("-created_date", 9999).then(setCustomers);
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const data = await base44.entities.Payment.list("-created_date", 5000);
    setPayments(data);
    setLoading(false);
  };

  const handleEdit = (p) => {
    setEditing(p);
    setEditForm({ ...p });
    setCustomerSearch(p.customer_name || "");
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const selectCustomer = (c) => {
    setEditForm(prev => ({ ...prev, customer_id: c.id, customer_name: c.full_name }));
    setCustomerSearch(c.full_name);
    setShowCustomerDropdown(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Payment.update(editing.id, editForm);
    setPayments(prev => prev.map(p => p.id === editing.id ? { ...p, ...editForm } : p));
    setEditing(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    await base44.entities.Payment.delete(id);
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.model_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.chatter_name?.toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || (p.payment_date || p.created_date?.split("T")[0]) === dateFilter;
    return matchSearch && matchDate;
  });

  const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="pl-10 bg-[#1e1e1e] border-white/10 text-slate-200 placeholder:text-slate-600" />
        </div>
        <DatePicker value={dateFilter} onChange={setDateFilter} placeholder="Filter by date" />
        <span className="text-sm text-slate-500">
          {filtered.length} payments · <strong className="text-slate-200">{total.toLocaleString()} CZK</strong>
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500 py-8 text-center">Loading...</div>
      ) : (
        <div className="bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-[#252525]">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Model</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {p.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{p.customer_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{p.model_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
                      {p.payment_date ? format(new Date(p.payment_date), "d.M.yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusColors[p.status] || statusColors.completed}`}>
                        {p.status || "completed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-200">
                      {(p.amount || 0).toLocaleString()} CZK
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleEdit(p)}>
                          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-3.5 h-3.5 object-contain" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleDelete(p.id)}>
                          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3.5 h-3.5 object-contain" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md bg-[#1e1e1e] border-white/10">
          <DialogHeader><DialogTitle className="text-slate-100">Edit Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <Label className="text-slate-400">Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customer..."
                  className="pl-10"
                />
              </div>
              {showCustomerDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 50).map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-[#C9A227]">
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.email || "No email"}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-500">No customer found</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="text-slate-400">Amount (CZK)</Label>
              <Input type="number" value={editForm.amount || ""} onChange={e => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label className="text-slate-400">Date</Label>
              <DatePicker value={editForm.payment_date || ""} onChange={v => setEditForm(p => ({ ...p, payment_date: v }))} />
            </div>
            <div>
              <Label className="text-slate-400">Status</Label>
              <Select value={editForm.status || "completed"} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400">Note</Label>
              <Input value={editForm.note || ""} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} className="border-white/10 text-slate-400">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}