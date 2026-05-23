import React from "react";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function CoachNotes({ notes, chatterEmail, onAdd, onDelete }) {
  const [text, setTextState] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setTextState("");
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 flex flex-col h-full">
      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-[#C9A227]" /> Moje poznámky
      </h3>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={e => setTextState(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Přidej si poznámku..."
          className="flex-1 h-9 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
        />
        <button
          onClick={handleAdd}
          disabled={!text.trim() || saving}
          className="h-9 px-4 bg-[#C9A227] hover:bg-[#A8841C] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >{saving ? "..." : "Přidat"}</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Zatím žádné poznámky</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start gap-3 bg-[#faf6e6] rounded-xl border border-[#e8d99a] p-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-snug">{n.content}</p>
                  {n.note_date && <p className="text-[10px] text-gray-400 mt-1">{n.note_date}</p>}
                </div>
                <button
                  onClick={() => onDelete(n.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}