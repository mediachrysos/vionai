import React, { useState } from "react";
import { MessageSquare, Plus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function CoachNotes({ notes, chatterEmail, onAdd, onDelete }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [noteIdx, setNoteIdx] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setText("");
    setSaving(false);
    setShowForm(false);
    setNoteIdx(0);
  };

  const safeIdx = Math.min(noteIdx, Math.max(0, notes.length - 1));
  const currentNote = notes[safeIdx];

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-sm font-semibold text-white">Moje poznámky</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
        {/* Add form */}
        {showForm && (
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAdd()}
              placeholder="Napište poznámku..."
              rows={2}
              autoFocus
              className="w-full text-sm rounded-lg border border-amber-200 bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setText(""); }}
                className="h-8 px-3 text-xs rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >Zrušit</button>
              <button
                onClick={handleAdd}
                disabled={!text.trim() || saving}
                className="h-8 px-4 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50"
              >{saving ? "Ukládám..." : "Přidat"}</button>
            </div>
          </div>
        )}

        {/* Notes carousel */}
        <div className="flex-1 flex flex-col min-h-0">
          {notes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>
          ) : (
            <div className="flex flex-col gap-2 flex-1">
              {/* Navigation */}
              {notes.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => setNoteIdx(i => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {safeIdx + 1} / {notes.length}
                  </span>
                  <button
                    onClick={() => setNoteIdx(i => Math.min(notes.length - 1, i + 1))}
                    disabled={safeIdx === notes.length - 1}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}

              {/* Single note card */}
              {currentNote && (() => {
                const isToday = currentNote.note_date === today;
                return (
                  <div className={`group relative rounded-2xl border p-4 flex-1 shadow-sm transition-all ${
                    isToday ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200" : "bg-white border-gray-100"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isToday ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"
                        }`}>
                          📝
                        </div>
                        {isToday
                          ? <span className="text-[10px] font-bold tracking-wide text-white bg-amber-500 rounded-full px-2.5 py-0.5">DNES</span>
                          : currentNote.note_date
                            ? <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                                {format(new Date(currentNote.note_date), "d. MMM yyyy", { locale: cs })}
                              </span>
                            : null}
                      </div>
                      <button
                        onClick={() => { onDelete(currentNote.id); setNoteIdx(i => Math.max(0, i - 1)); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className={`text-sm leading-relaxed mt-3 ${isToday ? "text-amber-800" : "text-gray-600"}`}>
                      {currentNote.content}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}