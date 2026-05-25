import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Camera, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "pending",     label: "Čeká" },
  { value: "in_progress", label: "Zpracovává se" },
  { value: "done",        label: "Hotovo" },
  { value: "rejected",    label: "Zamítnuto" },
];

const STATUS_CONFIG = {
  pending:     { label: "Čeká",          bg: "bg-amber-50",  text: "text-amber-600" },
  in_progress: { label: "Zpracovává se", bg: "bg-blue-50",   text: "text-blue-600" },
  done:        { label: "Hotovo ✓",      bg: "bg-green-50",  text: "text-green-600" },
  rejected:    { label: "Zamítnuto",     bg: "bg-red-50",    text: "text-red-500" },
};

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",    bg: "bg-gray-100",  text: "text-gray-500" },
  normal: { label: "Normální", bg: "bg-blue-50",   text: "text-blue-600" },
  high:   { label: "Vysoká",   bg: "bg-amber-50",  text: "text-[#C9A227]" },
  urgent: { label: "Urgentní", bg: "bg-red-50",    text: "text-red-600" },
};

export default function GraphicRequestsPanel({ designerEmail, isAdmin }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: requests = [] } = useQuery({
    queryKey: ["graphic-requests-designer", designerEmail, isAdmin],
    queryFn: () => {
      if (isAdmin) return base44.entities.GraphicRequest.list("-created_date", 100);
      return base44.entities.GraphicRequest.filter({ assigned_designer_email: designerEmail }, "-created_date", 100);
    },
    enabled: !!designerEmail || isAdmin,
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GraphicRequest.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests-designer"] });
      qc.invalidateQueries({ queryKey: ["graphic-requests"] });
      setEditingId(null);
    },
  });

  const openEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ status: r.status, admin_note: r.admin_note || "", result_url: r.result_url || "" });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf6e6]/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#faf6e6] to-[#fdf3c8] flex items-center justify-center border border-[#e8d99a]">
            <img
              src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_17_kklr9x.png"
              alt=""
              className="w-5 h-5 object-contain"
            />
          </div>
          <span className="text-sm font-semibold text-gray-800">Requesty od chatterů</span>
          {pendingCount > 0 && (
            <span className="bg-[#faf6e6] text-[#C9A227] border border-[#e8d99a] text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount} nových
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-[#ececec]">
          {requests.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400">
              <p className="text-xs">Žádné requesty</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f5f5f5]">
              {requests.map((r) => {
                const sCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const pCfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.normal;
                const isVideo = r.content_type === "video";
                const TypeIcon = isVideo ? Video : Camera;
                const isEditing = editingId === r.id;

                return (
                  <div key={r.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isVideo ? "bg-[#faf6e6] border border-[#e8d99a]" : "bg-blue-50 border border-blue-100"
                      }`}>
                        <TypeIcon className={`w-4 h-4 ${isVideo ? "text-[#C9A227]" : "text-blue-400"}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                              {r.model_name && (
                                <span className="text-[10px] text-[#C9A227] bg-[#faf6e6] border border-[#e8d99a] px-1.5 py-0.5 rounded-full">
                                  {r.model_name}
                                </span>
                              )}
                              {isAdmin && r.chatter_name && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  od {r.chatter_name}
                                </span>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                              {r.reference_url && (
                                <a href={r.reference_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                                  <ExternalLink className="w-2.5 h-2.5" /> Reference
                                </a>
                              )}
                              {r.result_url && (
                                <a href={r.result_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] text-[#C9A227] hover:underline flex items-center gap-0.5 font-medium">
                                  <ExternalLink className="w-2.5 h-2.5" /> Výsledek
                                </a>
                              )}
                            </div>
                            {r.admin_note && !isEditing && (
                              <p className="text-xs text-gray-500 italic mt-1">💬 {r.admin_note}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-[10px] text-gray-300 whitespace-nowrap">
                              {r.created_date
                                ? new Date(r.created_date).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })
                                : ""}
                            </p>
                            <button
                              onClick={() => isEditing ? setEditingId(null) : openEdit(r)}
                              className="text-[10px] text-[#A8841C] hover:text-[#8a6c16] bg-[#faf6e6] hover:bg-[#fdf3c8] border border-[#e8d99a] px-2 py-0.5 rounded-full font-medium transition-colors"
                            >
                              {isEditing ? "Zrušit" : "Upravit"}
                            </button>
                          </div>
                        </div>

                        {/* Edit form */}
                        {isEditing && (
                          <div className="mt-3 space-y-2 bg-[#fdf9ee] rounded-xl p-3 border border-[#e8d99a]">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Stav</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                                  className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e8d99a] bg-white"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Poznámka</label>
                                <input
                                  value={editForm.admin_note}
                                  onChange={(e) => setEditForm((p) => ({ ...p, admin_note: e.target.value }))}
                                  placeholder="Zpráva pro chattera..."
                                  className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e8d99a] bg-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Odkaz na výsledek</label>
                              <input
                                value={editForm.result_url}
                                onChange={(e) => setEditForm((p) => ({ ...p, result_url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e8d99a] bg-white"
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => updateMutation.mutate({ id: r.id, data: editForm })}
                                disabled={updateMutation.isPending}
                                className="text-xs bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white px-4 py-1.5 rounded-lg font-semibold disabled:opacity-50 transition-all"
                              >
                                {updateMutation.isPending ? "Ukládám..." : "Uložit"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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