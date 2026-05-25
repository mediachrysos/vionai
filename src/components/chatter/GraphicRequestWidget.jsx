import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Camera, ChevronDown, ChevronUp, ExternalLink, X, Plus, Trash2, CalendarDays } from "lucide-react";

const DESIGNER_MAP = {
  video: { email: "mythzee2002@gmail.com", name: "Ishaq" },
  photo: { email: "soufiane00souissi@gmail.com", name: "Soufiane" },
};

const PRIORITY_CONFIG = {
  low:    { label: "Nízká",    bg: "bg-gray-100",  text: "text-gray-500" },
  normal: { label: "Normální", bg: "bg-blue-50",   text: "text-blue-600" },
  high:   { label: "Vysoká",   bg: "bg-amber-50",  text: "text-[#C9A227]" },
  urgent: { label: "Urgentní", bg: "bg-red-50",    text: "text-red-600" },
};

const STATUS_CONFIG = {
  pending:     { label: "Čeká",          bg: "bg-amber-50",  text: "text-amber-600" },
  in_progress: { label: "Zpracovává se", bg: "bg-blue-50",   text: "text-blue-600" },
  done:        { label: "Hotovo ✓",      bg: "bg-green-50",  text: "text-green-600" },
  rejected:    { label: "Zamítnuto",     bg: "bg-red-50",    text: "text-red-500" },
};

const DAY_NAMES = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Generate next N days starting from today
function getNextDays(n = 14) {
  const days = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    days.push({
      iso,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return days;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "Bez data";
  const today = todayStr();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();
  if (dateStr === today) return "Dnes";
  if (dateStr === tomorrow) return "Zítra";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" });
}

export default function GraphicRequestWidget({ chatterEmail, chatterName, models = [] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    content_type: "",
    title: "",
    description: "",
    model_id: "",
    priority: "normal",
    reference_url: "",
    request_date: todayStr(),
  });

  const days = useMemo(() => getNextDays(14), []);

  const { data: requests = [] } = useQuery({
    queryKey: ["graphic-requests", chatterEmail],
    queryFn: () => base44.entities.GraphicRequest.filter({ chatter_email: chatterEmail }, "-created_date", 50),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const model = models.find((m) => m.id === data.model_id);
      const designer = DESIGNER_MAP[data.content_type];
      return base44.entities.GraphicRequest.create({
        ...data,
        chatter_email: chatterEmail,
        chatter_name: chatterName || chatterEmail,
        model_name: model?.name || "",
        assigned_designer_email: designer?.email || "",
        assigned_designer_name: designer?.name || "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests", chatterEmail] });
      qc.invalidateQueries({ queryKey: ["graphic-requests-designer"] });
      setForm({ content_type: "", title: "", description: "", model_id: "", priority: "normal", reference_url: "", request_date: todayStr() });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GraphicRequest.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests", chatterEmail] });
      qc.invalidateQueries({ queryKey: ["graphic-requests-designer"] });
      setDeletingId(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content_type) return;
    setSaving(true);
    await createMutation.mutateAsync(form);
    setSaving(false);
  };

  // Group requests by date
  const grouped = useMemo(() => {
    return requests.reduce((acc, r) => {
      const key = r.request_date || "__no_date__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [requests]);

  const sortedKeys = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      if (a === "__no_date__") return 1;
      if (b === "__no_date__") return -1;
      return a.localeCompare(b);
    });
  }, [grouped]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf6e6]/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#faf6e6] to-[#fdf3c8] flex items-center justify-center border border-[#e8d99a]">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_17_kklr9x.png" alt="" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Requesty pro grafika</span>
          {pendingCount > 0 && (
            <span className="bg-[#faf6e6] text-[#C9A227] border border-[#e8d99a] text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowForm((v) => !v); setExpanded(true); }}
            className="flex items-center gap-1 text-xs text-[#A8841C] hover:text-[#8a6c16] bg-[#faf6e6] hover:bg-[#fdf3c8] border border-[#e8d99a] px-2.5 py-1 rounded-full transition-colors font-semibold"
          >
            <Plus className="w-3 h-3" /> Přidat
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#ececec]">

          {/* ── Form ── */}
          {showForm && (
            <form onSubmit={handleSubmit} className="px-5 py-4 bg-[#fdf9ee] border-b border-[#e8d99a] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#A8841C] uppercase tracking-wide">Nový request</p>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content type */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Typ obsahu *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "video", icon: Video, label: "Video", sub: "→ Ishaq" },
                    { type: "photo", icon: Camera, label: "Fotografie", sub: "→ Soufiane" },
                  ].map(({ type, icon: Icon, label, sub }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, content_type: type }))}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        form.content_type === type
                          ? "border-[#C9A227] bg-[#faf6e6]"
                          : "border-gray-200 bg-white hover:border-[#e8d99a]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        form.content_type === type ? "bg-[#C9A227]" : "bg-gray-100"
                      }`}>
                        <Icon className={`w-4 h-4 ${form.content_type === type ? "text-white" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${form.content_type === type ? "text-[#A8841C]" : "text-gray-700"}`}>{label}</p>
                        <p className="text-[10px] text-gray-400">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day picker */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">
                  <CalendarDays className="w-3 h-3 inline mr-1 opacity-60" />
                  Datum požadavku *
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {days.map((d) => {
                    const selected = form.request_date === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, request_date: d.iso }))}
                        className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all ${
                          selected
                            ? "border-[#C9A227] bg-[#C9A227] text-white shadow-sm"
                            : "border-gray-200 bg-white hover:border-[#e8d99a] text-gray-600"
                        }`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${selected ? "text-white/80" : "text-gray-400"}`}>
                          {d.isToday ? "Dnes" : d.isTomorrow ? "Zítra" : d.dayName}
                        </span>
                        <span className={`text-sm font-bold leading-tight ${selected ? "text-white" : "text-gray-800"}`}>
                          {d.dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Název *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Co potřebuješ od grafika?"
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8d99a] bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Popis</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detailní popis, formát, délka..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8d99a] bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Modelka</label>
                  <select
                    value={form.model_id}
                    onChange={(e) => setForm((p) => ({ ...p, model_id: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8d99a] bg-white"
                  >
                    <option value="">— žádná —</option>
                    {models.filter((m) => m.status === "active").map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Priorita</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8d99a] bg-white"
                  >
                    <option value="low">Nízká</option>
                    <option value="normal">Normální</option>
                    <option value="high">Vysoká</option>
                    <option value="urgent">Urgentní</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Reference URL</label>
                <input
                  value={form.reference_url}
                  onChange={(e) => setForm((p) => ({ ...p, reference_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8d99a] bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg">
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.title.trim() || !form.content_type}
                  className="text-xs bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] disabled:opacity-40 text-white px-5 py-1.5 rounded-lg font-semibold transition-all shadow-sm"
                >
                  {saving ? "Odesílám..." : "Odeslat request"}
                </button>
              </div>
            </form>
          )}

          {/* ── List grouped by date ── */}
          {requests.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400">
              <div className="w-10 h-10 rounded-full bg-[#faf6e6] flex items-center justify-center mx-auto mb-2">
                <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_17_kklr9x.png" alt="" className="w-5 h-5 object-contain opacity-40" />
              </div>
              <p className="text-xs">Zatím žádné requesty</p>
            </div>
          ) : (
            <div>
              {sortedKeys.map((dateKey) => (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="px-5 py-2 bg-gray-50/60 border-y border-[#f0f0f0] flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span className="text-xs font-semibold text-gray-600">
                      {dateKey === "__no_date__" ? "Bez data" : formatDateLabel(dateKey)}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400">
                      {grouped[dateKey].length} {grouped[dateKey].length === 1 ? "request" : "requesty"}
                    </span>
                  </div>

                  <div className="divide-y divide-[#f5f5f5]">
                    {grouped[dateKey].map((r) => {
                      const pCfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.normal;
                      const sCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                      const isVideo = r.content_type === "video";
                      const TypeIcon = isVideo ? Video : Camera;
                      const isDeleting = deletingId === r.id;

                      return (
                        <div key={r.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isVideo ? "bg-[#faf6e6] border border-[#e8d99a]" : "bg-blue-50 border border-blue-100"
                          }`}>
                            <TypeIcon className={`w-4 h-4 ${isVideo ? "text-[#C9A227]" : "text-blue-400"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                              {r.assigned_designer_name && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">→ {r.assigned_designer_name}</span>
                              )}
                              {r.model_name && (
                                <span className="text-[10px] text-[#C9A227] bg-[#faf6e6] border border-[#e8d99a] px-1.5 py-0.5 rounded-full">{r.model_name}</span>
                              )}
                            </div>

                            {r.description && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.description}</p>
                            )}

                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                              {r.admin_note && (
                                <span className="text-[10px] text-gray-500 italic">💬 {r.admin_note}</span>
                              )}
                              {r.result_url && (
                                <a href={r.result_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#C9A227] hover:underline flex items-center gap-0.5 font-medium">
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

                          {/* Delete — only pending */}
                          {r.status === "pending" && (
                            isDeleting ? (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => deleteMutation.mutate(r.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-full font-semibold transition-colors disabled:opacity-50"
                                >
                                  Smazat
                                </button>
                                <button onClick={() => setDeletingId(null)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">
                                  Zpět
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(r.id)}
                                className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-red-400 transition-colors"
                                title="Smazat request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}