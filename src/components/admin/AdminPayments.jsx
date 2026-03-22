import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const data = await base44.entities.Payment.list("-created_date", 500);
    setPayments(data);
    setLoading(false);
  };

  const handleEdit = (p) => {
    setEditing(p);
    setEditForm({ ...p });
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
        <Input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="w-40 h-9 text-sm"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="text-xs text-gray-400 hover:text-gray-600 underline">Zrušit filtr</button>
        )}
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
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
            <div>
              <Label>Zákazník</Label>
              <Input value={editForm.customer_name || ""} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} />
            </div>
            <div>
              <Label>Částka (Kč)</Label>
              <Input type="number" value={editForm.amount || ""} onChange={e => setEditForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={editForm.payment_date || ""} onChange={e => setEditForm(p => ({ ...p, payment_date: e.target.value }))} />
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