import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, StickyNote, Trash2, X } from "lucide-react";
import { format } from "date-fns";

export default function NotesWidget({ currentUser }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", note_date: new Date().toISOString().split("T")[0], content: "" });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.Note.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({ ...data, author_email: currentUser?.email, author_name: currentUser?.full_name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setShowForm(false); setForm({ customer_name: "", note_date: new Date().toISOString().split("T")[0], content: "" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const myNotes = currentUser?.role === "admin" ? notes : notes.filter(n => n.author_email === currentUser?.email);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Poznámky</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(v => !v)} className="h-7 w-7 p-0 rounded-lg">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Klient</label>
              <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Jméno klienta" className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Datum</label>
              <Input type="date" value={form.note_date} onChange={e => setForm(p => ({ ...p, note_date: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Poznámka *</label>
            <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Napište poznámku..." rows={3} className="text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-8 text-xs">Zrušit</Button>
            <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={!form.content || createMutation.isPending} className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
              {createMutation.isPending ? "Ukládám..." : "Přidat"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {myNotes.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>
        )}
        {myNotes.map(n => (
          <div key={n.id} className="group flex gap-3 p-3 rounded-lg bg-gray-50/70 hover:bg-amber-50/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {n.customer_name && <span className="text-xs font-semibold text-gray-700">{n.customer_name}</span>}
                {n.note_date && <span className="text-xs text-gray-400">{format(new Date(n.note_date), "d. M. yyyy")}</span>}
                {n.author_name && currentUser?.role === "admin" && <span className="text-xs text-indigo-400 ml-auto">{n.author_name}</span>}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{n.content}</p>
            </div>
            <button onClick={() => deleteMutation.mutate(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0 mt-0.5">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}