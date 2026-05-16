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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Poznámky</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setShowForm(v => !v); setCustomerSearch(""); setForm(emptyForm()); }}
          className="h-7 w-7 p-0 rounded-lg"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
          {/* Klient */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 block mb-1">Klient</label>
            <Input
              value={customerSearch}
              onChange={e => {
                setCustomerSearch(e.target.value);
                setForm(p => ({ ...p, customer_name: e.target.value }));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Vyhledat nebo napsat jméno..."
              className="h-8 text-sm"
            />
            {showDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => selectCustomer(c.full_name)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700"
                  >
                    {c.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datum */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Datum</label>
            <Input
              type="date"
              value={form.note_date}
              onChange={e => setForm(p => ({ ...p, note_date: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>

          {/* Poznámka */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Poznámka</label>
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Napište poznámku..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCustomerSearch(""); }} className="h-8 text-xs">Zrušit</Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.content.trim()}
              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
            >
              {createMutation.isPending ? "Ukládám..." : "Přidat"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>}
        {notes.map(n => (
          <div key={n.id} className="group relative rounded-xl border border-gray-100 bg-gray-50 hover:border-amber-200 p-3.5 transition-all">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800 truncate">
                {n.customer_name || <span className="text-xs text-gray-400 italic font-normal">Bez klienta</span>}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {n.note_date && (
                  <span className="text-[11px] text-gray-400">
                    {format(new Date(n.note_date), "d. MMM yyyy", { locale: cs })}
                  </span>
                )}
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {n.content && <p className="text-xs text-gray-600 leading-relaxed">{n.content}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}