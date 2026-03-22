import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, StickyNote, Trash2, X, CreditCard, Building2, Bot } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const emptyForm = () => ({
  customer_name: "",
  note_date: new Date().toISOString().split("T")[0],
  amount: "",
  account: "",
  account_name: "",
  model_id: "",
  model_name: "",
  content: "",
});

export default function NotesWidget({ currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const { data: notes = [] } = useQuery({ queryKey: ["notes"], queryFn: () => base44.entities.Note.list("-created_date", 50) });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500) });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankAccounts"], queryFn: () => base44.entities.BankAccount.filter({ is_active: true }) });

  const isAdmin = currentUser?.role === "admin";

  const myModelIds = useMemo(() => {
    if (!currentUser?.email || isAdmin) return null;
    return models.filter(m => m.assigned_chatters?.includes(currentUser.email)).map(m => m.id);
  }, [models, currentUser, isAdmin]);

  const visibleNotes = useMemo(() => {
    if (isAdmin) return notes;
    return notes.filter(n => {
      if (!n.model_id) return n.author_email === currentUser?.email;
      return myModelIds?.includes(n.model_id);
    });
  }, [notes, isAdmin, myModelIds, currentUser]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 8);
    return customers.filter(c => c.full_name?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({
      ...data,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setShowForm(false);
      setForm(emptyForm());
      setCustomerSearch("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const handleModelChange = (id) => {
    const m = models.find(m => m.id === id);
    setForm(p => ({ ...p, model_id: id, model_name: m?.name || "" }));
  };

  const handleAccountChange = (id) => {
    if (id === "__manual__") { setForm(p => ({ ...p, account: "", account_name: "" })); return; }
    const acc = bankAccounts.find(a => a.id === id);
    setForm(p => ({ ...p, account: id, account_name: acc?.name || "" }));
  };

  const selectCustomer = (name) => {
    setForm(p => ({ ...p, customer_name: name }));
    setCustomerSearch(name);
    setShowCustomerDropdown(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Poznámky</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setShowForm(v => !v); setCustomerSearch(""); }} className="h-7 w-7 p-0 rounded-lg">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
          {/* Klient */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 block mb-1">Klient</label>
            <Input value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setForm(p => ({ ...p, customer_name: e.target.value })); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
              placeholder="Vyhledat nebo napsat jméno..." className="h-8 text-sm" />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => selectCustomer(c.full_name)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700">{c.full_name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Datum</label>
              <Input type="date" value={form.note_date} onChange={e => setForm(p => ({ ...p, note_date: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Částka (Kč)</label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Účet</label>
            <Select value={form.account || "__manual__"} onValueChange={handleAccountChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                <SelectItem value="__manual__">— Zadat ručně —</SelectItem>
              </SelectContent>
            </Select>
            {form.account === "" && (
              <Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))}
                placeholder="č. účtu nebo název" className="h-8 text-sm mt-1.5" />
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Modelka</label>
            <Select value={form.model_id} onValueChange={handleModelChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte modelku" /></SelectTrigger>
              <SelectContent>
                {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Poznámka</label>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Napište poznámku..." rows={2} className="text-sm resize-none" />
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCustomerSearch(""); }} className="h-8 text-xs">Zrušit</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              {createMutation.isPending ? "Ukládám..." : "Přidat"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {visibleNotes.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>}
        {visibleNotes.map(n => {
          const accountLabel = n.account_name || (bankAccounts.find(a => a.id === n.account)?.name) || n.account;
          return (
            <div key={n.id} className="group relative rounded-xl border border-gray-100 bg-gray-50 hover:border-amber-200 p-3.5 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-800 truncate">
                  {n.customer_name || <span className="text-xs text-gray-400 italic font-normal">Bez klienta</span>}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {n.note_date && <span className="text-[11px] text-gray-400">{format(new Date(n.note_date), "d. MMM yyyy", { locale: cs })}</span>}
                  <button onClick={() => deleteMutation.mutate(n.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {(n.amount || accountLabel || n.model_name) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {n.amount && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <CreditCard className="w-3 h-3" />{Number(n.amount).toLocaleString("cs-CZ")} Kč
                    </span>
                  )}
                  {accountLabel && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      <Building2 className="w-3 h-3" />{accountLabel}
                    </span>
                  )}
                  {n.model_name && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#faf6e6] text-[#A8841C]">
                      <Bot className="w-3 h-3" />{n.model_name}
                    </span>
                  )}
                </div>
              )}
              {n.content && <p className="text-xs text-gray-600 leading-relaxed">{n.content}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}