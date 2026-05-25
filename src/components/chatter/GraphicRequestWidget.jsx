import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paintbrush, Plus, X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRIORITY_CONFIG = {
  low: { label: "Nízká", color: "bg-gray-100 text-gray-500" },
  normal: { label: "Normální", color: "bg-blue-100 text-blue-600" },
  high: { label: "Vysoká", color: "bg-amber-100 text-amber-600" },
  urgent: { label: "Urgentní", color: "bg-red-100 text-red-600" },
};

const STATUS_CONFIG = {
  pending: { label: "Čeká", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Zpracovává se", color: "bg-blue-100 text-blue-700" },
  done: { label: "Hotovo", color: "bg-green-100 text-green-700" },
  rejected: { label: "Zamítnuto", color: "bg-red-100 text-red-600" },
};

export default function GraphicRequestWidget({ chatterEmail, chatterName, models = [] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    model_id: "",
    priority: "normal",
    reference_url: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["graphic-requests", chatterEmail],
    queryFn: () => base44.entities.GraphicRequest.filter({ chatter_email: chatterEmail }, "-created_date", 50),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const model = models.find((m) => m.id === data.model_id);
      return base44.entities.GraphicRequest.create({
        ...data,
        chatter_email: chatterEmail,
        chatter_name: chatterName || chatterEmail,
        model_name: model?.name || "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests", chatterEmail] });
      setForm({ title: "", description: "", model_id: "", priority: "normal", reference_url: "" });
      setShowForm(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await createMutation.mutateAsync(form);
    setSaving(false);
  };

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
            <Paintbrush className="w-4 h-4 text-violet-500" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Requesty pro grafika</span>
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <span className="bg-amber-100 text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {requests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm((v) => !v); }}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-full transition-colors font-medium"
          >
            <Plus className="w-3 h-3" /> Přidat
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50">
          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="px-5 py-4 bg-violet-50/40 border-b border-violet-100 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-violet-700">Nový request</p>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Název *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Co potřebuješ od grafika?"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Popis</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detailní popis..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Modelka</label>
                  <select
                    value={form.model_id}
                    onChange={(e) => setForm((p) => ({ ...p, model_id: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
                  >
                    <option value="">— žádná —</option>
                    {models.filter((m) => m.status === "active").map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Priorita</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
                  >
                    <option value="low">Nízká</option>
                    <option value="normal">Normální</option>
                    <option value="high">Vysoká</option>
                    <option value="urgent">Urgentní</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Reference URL</label>
                <input
                  value={form.reference_url}
                  onChange={(e) => setForm((p) => ({ ...p, reference_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Zrušit</button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="text-xs bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  {saving ? "Odesílám..." : "Odeslat request"}
                </button>
              </div>
            </form>
          )}

          {/* List */}
          {requests.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-400">
              <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Zatím žádné requesty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map((r) => {
                const pCfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.normal;
                const sCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                return (
                  <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        {r.model_name && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-[#e8d99a] px-1.5 py-0.5 rounded-full">{r.model_name}</span>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${pCfg.color}`}>{pCfg.label}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sCfg.color}`}>{sCfg.label}</span>
                        {r.admin_note && (
                          <span className="text-[10px] text-gray-500 italic">💬 {r.admin_note}</span>
                        )}
                        {r.result_url && (
                          <a href={r.result_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Výsledek
                          </a>
                        )}
                        {r.reference_url && (
                          <a href={r.reference_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> Reference
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5">
                      {r.created_date ? new Date(r.created_date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }) : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}