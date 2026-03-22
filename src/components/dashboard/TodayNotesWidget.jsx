import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, StickyNote, Trash2, X } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { format } from "date-fns";

const emptyForm = () => ({
  customer_name: "",
  note_date: new Date().toISOString().split("T")[0],
  amount: "",
  account: "",
  model_id: "",
  model_name: "",
  content: "",
});

export default function TodayNotesWidget({ currentUser }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.Note.list("-created_date", 100),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });

  const isAdmin = currentUser?.role === "admin";

  // Models assigned to current chatter
  const myModelIds = useMemo(() => {
    if (!currentUser?.email || isAdmin) return null; // null = no filter
    return models
      .filter(m => m.assigned_chatters?.includes(currentUser.email))
      .map(m => m.id);
  }, [models, currentUser, isAdmin]);

  // Visibility: admin sees all, chatter sees only notes for their assigned models (or no model set)
  const visibleNotes = useMemo(() => {
    if (isAdmin) return notes;
    return notes.filter(n => {
      if (!n.model_id) return n.author_email === currentUser?.email;
      return myModelIds?.includes(n.model_id);
    });
  }, [notes, isAdmin, myModelIds, currentUser]);

  const sortedNotes = useMemo(() => [...visibleNotes].sort((a, b) => {
    const aToday = a.note_date === today;
    const bToday = b.note_date === today;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  }), [visibleNotes, today]);

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.Note.create({
        ...data,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        author_email: currentUser?.email,
        author_name: currentUser?.full_name,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setShowForm(false);
      setForm(emptyForm());
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

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white">Poznámky</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowForm((v) => !v)}
          className="h-7 w-7 p-0 rounded-lg text-white hover:bg-white/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <div className="p-5 flex-1 overflow-hidden flex flex-col">
        {showForm && (
          <div className="mb-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2.5">
            {/* Row 1: Klient + Datum */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Klient</label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))}
                  placeholder="Jméno klienta"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Datum</label>
                <DatePicker
                  value={form.note_date}
                  onChange={(v) => setForm((p) => ({ ...p, note_date: v }))}
                />
              </div>
            </div>

            {/* Row 2: Částka + Účet */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Částka (Kč)</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Účet</label>
                <Input
                  value={form.account}
                  onChange={(e) => setForm((p) => ({ ...p, account: e.target.value }))}
                  placeholder="č. účtu nebo název"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Row 3: Modelka */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Modelka</label>
              <Select value={form.model_id} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Vyberte modelku" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Poznámka */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Poznámka *</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Napište poznámku..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">
                Zrušit
              </Button>
              <Button
                size="sm"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.content || createMutation.isPending}
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
              >
                {createMutation.isPending ? "Ukládám..." : "Přidat"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {sortedNotes.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>
          )}
          {sortedNotes.map((n) => {
            const isToday = n.note_date === today;
            return (
              <div
                key={n.id}
                className={`group flex gap-3 p-3 rounded-lg transition-colors ${
                  isToday
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-gray-50/70 hover:bg-amber-50/40"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {n.customer_name && (
                      <span className={`text-xs font-semibold ${isToday ? "text-amber-800" : "text-gray-700"}`}>
                        {n.customer_name}
                      </span>
                    )}
                    {isToday && (
                      <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full px-2 py-0.5">DNES</span>
                    )}
                    {n.note_date && !isToday && (
                      <span className="text-xs text-gray-400">{format(new Date(n.note_date), "d. M. yyyy")}</span>
                    )}
                    {n.model_name && (
                      <span className="text-xs text-[#C9A227] font-medium">{n.model_name}</span>
                    )}
                    {n.author_name && isAdmin && (
                      <span className="text-xs text-indigo-400 ml-auto">{n.author_name}</span>
                    )}
                  </div>
                  {(n.amount || n.account) && (
                    <div className="flex gap-3 text-xs text-gray-500 mb-0.5">
                      {n.amount && <span className="font-medium text-gray-700">{Number(n.amount).toLocaleString()} Kč</span>}
                      {n.account && <span>{n.account}</span>}
                    </div>
                  )}
                  <p className={`text-xs leading-relaxed ${isToday ? "text-amber-900" : "text-gray-600"}`}>
                    {n.content}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}