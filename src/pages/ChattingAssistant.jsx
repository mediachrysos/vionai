import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Pencil, RefreshCw, Bot, BotOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function EditModal({ record, onSave, onClose }) {
  const [reply, setReply] = useState(record.fields?.odpoved_ai || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(record.id, reply);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Upravit odpověď</h3>
        <p className="text-xs text-gray-400 mb-3">Sender ID: <span className="font-medium text-gray-600">{record.fields?.sender_id || record.id}</span></p>
        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 text-xs text-gray-500 border border-gray-100">
          <span className="font-medium text-gray-600">Zpráva:</span> {record.fields?.zprava_zakaznika || "—"}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 h-32"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Zrušit</Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
          >
            {saving ? "Ukládám..." : "Schválit upravenou"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChattingAssistant({ currentUser }) {
  const [botActive, setBotActive] = useState(true);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRecord, setEditRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke("airtableMessages", { action: "list" });
    setRecords(res.data?.records || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const setRecordLoading = (id, val) =>
    setActionLoading((prev) => ({ ...prev, [id]: val }));

  const handleApprove = async (record) => {
    setRecordLoading(record.id, true);
    await base44.functions.invoke("airtableMessages", {
      action: "update",
      recordId: record.id,
      status: "schváleno",
      sender_id: record.fields?.sender_id,
      odpoved_ai: record.fields?.odpoved_ai
    });
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setRecordLoading(record.id, false);
  };

  const handleReject = async (record) => {
    setRecordLoading(record.id, true);
    await base44.functions.invoke("airtableMessages", { action: "update", recordId: record.id, status: "zamítnuto" });
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setRecordLoading(record.id, false);
  };

  const handleEditSave = async (recordId, reply) => {
    await base44.functions.invoke("airtableMessages", { action: "updateReply", recordId, reply });
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chatting Assistant</h1>
            <p className="text-xs text-gray-400 mt-0.5">Správa zpráv čekajících na schválení</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMessages} className="gap-1.5 text-gray-500">
            <RefreshCw className="w-3.5 h-3.5" /> Obnovit
          </Button>
        </div>

        {/* Kill Switch */}
        <div
          className={`rounded-2xl border p-5 mb-6 flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm ${
            botActive
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
          onClick={() => setBotActive((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${botActive ? "bg-emerald-100" : "bg-red-100"}`}>
              {botActive
                ? <Bot className="w-6 h-6 text-emerald-600" />
                : <BotOff className="w-6 h-6 text-red-500" />
              }
            </div>
            <div>
              <p className={`text-sm font-bold ${botActive ? "text-emerald-700" : "text-red-600"}`}>
                {botActive ? "Bot aktivní" : "Bot zastaven"}
              </p>
              <p className="text-xs text-gray-400">
                {botActive ? "Bot automaticky zpracovává zprávy" : "Bot je pozastaven, žádné zprávy se neodesílají"}
              </p>
            </div>
          </div>
          {/* Toggle */}
          <div className={`w-14 h-7 rounded-full transition-colors duration-300 relative flex items-center px-1 ${botActive ? "bg-emerald-500" : "bg-red-400"}`}>
            <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${botActive ? "translate-x-7" : "translate-x-0"}`} />
          </div>
        </div>

        {/* Messages list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Zprávy čekající na schválení</h2>
            {!loading && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">
                {records.length} zpráv
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Načítám zprávy...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Check className="w-8 h-8 mb-2 text-emerald-300" />
              <p className="text-sm font-medium">Žádné zprávy čekající na schválení</p>
              <p className="text-xs text-gray-300 mt-1">Všechno je vyřízeno 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {records.map((record) => {
                const fields = record.fields || {};
                const busy = actionLoading[record.id];
                return (
                  <div key={record.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Sender */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-amber-700">
                              {fields.platforma === "facebook" ? "F" : "?"}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {fields.sender_id || record.id}
                          </span>
                          {fields.platforma && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                              {fields.platforma}
                            </span>
                          )}
                          {fields.cas && (
                            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                              {new Date(fields.cas).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>

                        {/* Customer message */}
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Zpráva zákazníka</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                            {fields.zprava_zakaznika || <span className="text-gray-300 italic">Bez obsahu</span>}
                          </p>
                        </div>

                        {/* AI reply */}
                        <div>
                          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Navrhovaná odpověď AI</p>
                          <p className="text-sm text-gray-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                            {fields.odpoved_ai || <span className="text-gray-300 italic">Bez návrhu</span>}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0 pt-1">
                        <button
                          disabled={busy}
                          onClick={() => handleApprove(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" /> Schválit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setEditRecord(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Upravit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => handleReject(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" /> Zamítnout
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editRecord && (
        <EditModal
          record={editRecord}
          onSave={handleEditSave}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
}