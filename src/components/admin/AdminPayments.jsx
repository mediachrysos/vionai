import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format } from "date-fns";
import DatePicker from "@/components/ui-custom/DatePicker";

const statusColors = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  failed: "bg-red-50 text-red-600 border-red-100",
  refunded: "bg-gray-50 text-gray-500 border-gray-200",
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
    if (!window.confirm("Opravdu smazat tuto platbu?")) return;
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat platby..." className="pl-10" />
        </div>
        <DatePicker
          value={dateFilter}
          onChange={setDateFilter}
          placeholder="Filtr dle data"
        />
        <span className="text-sm text-gray-500">{filtered.length} plateb · <strong>{total.toLocaleString()} Kč</strong></span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Načítám...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Zákazník</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Modelka</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Datum</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Stav</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-4 py-3">Částka</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {p.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{p.customer_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{p.model_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                      {p.payment_date ? format(new Date(p.payment_date), "d.M.yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColors[p.status] || statusColors.completed}>
                        {p.status || "completed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {(p.amount || 0).toLocaleString()} Kč
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p)}>
                          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-3.5 h-3.5 object-contain" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upravit platbu</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="relative">
              <Label>Zákazník</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Vyhledat zákazníka..."
                  className="pl-10"
                />
              </div>
              {showCustomerDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 50).map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-[#C9A227]">
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.email || "Bez emailu"}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-500">Žádný zákazník nenalezen</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Částka (Kč)</Label>
              <Input type="number" value={editForm.amount || ""} onChange={e => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Datum</Label>
              <DatePicker
                value={editForm.payment_date || ""}
                onChange={v => setEditForm(p => ({ ...p, payment_date: v }))}
              />
            </div>
            <div>
              <Label>Stav</Label>
              <Select value={editForm.status || "completed"} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Dokončeno</SelectItem>
                  <SelectItem value="pending">Čeká</SelectItem>
                  <SelectItem value="failed">Selhalo</SelectItem>
                  <SelectItem value="refunded">Vráceno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Poznámka</Label>
              <Input value={editForm.note || ""} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white">
                {saving ? "Ukládám..." : "Uložit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}