import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function ChatterNotesWidget({ chatterEmail }) {
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ["chatterNotes", chatterEmail],
    queryFn: () => base44.entities.ChatterNote.filter({ chatter_email: chatterEmail }, "-created_date"),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    await base44.entities.ChatterNote.create({
      chatter_email: chatterEmail,
      content: newNote.trim(),
      note_date: new Date().toISOString().split("T")[0],
    });
    setNewNote("");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["chatterNotes", chatterEmail] });
  };

  const handleDelete = async (id) => {
    await base44.entities.ChatterNote.delete(id);
    qc.invalidateQueries({ queryKey: ["chatterNotes", chatterEmail] });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
          <StickyNote className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-gray-800">Poznámky</span>
      </div>

      {/* Add note */}
      <div className="flex flex-col gap-2">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Přidat poznámku..."
          className="text-sm resize-none h-20"
          onKeyDown={e => {
            if (e.key === "Enter" && e.ctrlKey) handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newNote.trim()}
          className="self-end flex items-center gap-1.5 text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Přidat
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">Zatím žádné poznámky</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{n.content}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {n.note_date ? format(new Date(n.note_date), "d. M. yyyy") : ""}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}