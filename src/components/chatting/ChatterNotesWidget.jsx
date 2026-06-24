import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, StickyNote, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const emptyForm = () => ({
  customer_name: "",
  note_date: new Date().toISOString().split("T")[0],
  content: "",
});

export default function ChatterNotesWidget({ chatterEmail, currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all notes by this chatter
  const { data: notes = [] } = useQuery({
    queryKey: ["chatterNotes", chatterEmail],
    queryFn: () => base44.entities.Note.filter({ author_email: chatterEmail }, "-created_date", 100),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });

  // Fetch models to find which models this chatter is assigned to
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });

  // Fetch customers — filter to only those on this chatter's models
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 1000),
    staleTime: 60000,
  });

  // Find model IDs assigned to this chatter (via assigned_model_ids on user OR assigned_chatters on model)
  const chatterModelIds = useMemo(() => {
    return models
      .filter(m => m.assigned_chatters?.includes(chatterEmail))
      .map(m => m.id);
  }, [models, chatterEmail]);

  // Filter customers: assigned_chatter matches OR their model is in chatterModelIds
  const myCustomers = useMemo(() => {
    return allCustomers.filter(c =>
      c.assigned_chatter === chatterEmail ||
      (c.assigned_model && chatterModelIds.includes(c.assigned_model))
    );
  }, [allCustomers, chatterEmail, chatterModelIds]);

  const filteredCustomers = useMemo(() => {
    const list = myCustomers;
    if (!customerSearch) return list.slice(0, 8);
    return list.filter(c => c.full_name?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
  }, [myCustomers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({
      ...data,
      author_email: chatterEmail,
      author_name: currentUser?.full_name || chatterEmail,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatterNotes", chatterEmail] });
      setShowForm(false);
      setForm(emptyForm());
      setCustomerSearch("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatterNotes", chatterEmail] }),
  });

  const selectCustomer = (name) => {
    setForm(p => ({ ...p, customer_name: name }));
    setCustomerSearch(name);
    setShowDropdown(false);
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My notes</span>
        <button
          onClick={() => { setShowForm(v => !v); setCustomerSearch(""); setForm(emptyForm()); }}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-3 space-y-2">
          <div className="relative">
            <Input
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setForm(p => ({ ...p, customer_name: e.target.value }));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Klient (volitelné)..."
              className="h-8 text-xs bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
            />
            {showDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => selectCustomer(c.full_name)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-slate-300"
                  >
                    {c.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Textarea
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Napište poznámku..."
            rows={3}
            className="text-xs resize-none bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600"
          />

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCustomerSearch(""); }} className="h-7 text-xs text-slate-500 hover:text-slate-300">Zrušit</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.content.trim()}
              className="h-7 text-xs bg-white/10 hover:bg-white/20 text-slate-200 border-0"
            >
              {createMutation.isPending ? "Ukládám..." : "Přidat"}
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto min-h-0">
        {notes.length === 0 && <p className="text-xs text-slate-600 text-center py-8">Zatím žádné poznámky</p>}
        {notes.map(n => (
          <div key={n.id} className="group relative rounded-xl bg-white/5 hover:bg-white/8 border border-white/5 hover:border-white/10 p-3 transition-all">
            <div className="flex items-center justify-between gap-2 mb-1">
              {n.customer_name
                ? <span className="text-xs font-medium text-slate-300 truncate">{n.customer_name}</span>
                : <span className="text-xs text-slate-600 italic">Bez klienta</span>
              }
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {n.note_date && (
                  <span className="text-[10px] text-slate-600">
                    {format(new Date(n.note_date), "d. MMM", { locale: cs })}
                  </span>
                )}
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            {n.content && <p className="text-xs text-slate-400 leading-relaxed">{n.content}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}