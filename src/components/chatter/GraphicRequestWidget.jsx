import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Camera, ChevronDown, ChevronUp, ExternalLink, X, Plus, Trash2, CalendarDays } from "lucide-react";

const PRIORITY_CONFIG = {
  low: { label: "Low", bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" },
  normal: { label: "Normal", bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  high: { label: "High", bg: "bg-[#C9A227]/15", text: "text-[#C9A227]", border: "border-[#C9A227]/30" },
  urgent: { label: "Urgent", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" }
};

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  in_progress: { label: "In progress", bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  done: { label: "Done ✓", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  rejected: { label: "Rejected", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" }
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      isTomorrow: i === 1
    });
  }
  return days;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "Bez data";
  const today = todayStr();
  const tomorrow = (() => {const d = new Date();d.setDate(d.getDate() + 1);return d.toISOString().split("T")[0];})();
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "numeric" });
}

export default function GraphicRequestWidget({ chatterEmail, chatterName, models = [] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    content_type: "",
    title: "",
    description: "",
    model_id: "",
    priority: "normal",
    reference_url: "",
    request_date: todayStr()
  });

  const days = useMemo(() => getNextDays(14), []);

  // Live designer routing — pulled from actual SocialDashboard records, not hardcoded
  const { data: dashboards = [] } = useQuery({
    queryKey: ["socialDashboards"],
    queryFn: () => base44.entities.SocialDashboard.list("order", 50),
    staleTime: 30000
  });

  const designerMap = useMemo(() => {
    const map = {};
    dashboards.forEach((d) => {
      if (d.content_type && d.designer_email && !map[d.content_type]) {
        map[d.content_type] = { email: d.designer_email, name: d.designer_name || d.designer_email };
      }
    });
    return map;
  }, [dashboards]);

  const { data: rawRequests = [] } = useQuery({
    queryKey: ["graphic-requests", chatterEmail],
    queryFn: () => base44.entities.GraphicRequest.filter({ chatter_email: chatterEmail }, "-created_date", 50),
    enabled: !!chatterEmail,
    staleTime: 30000
  });

  // Extra safety — only ever show this chatter's own requests, never another chatter's,
  // and only for models this chatter is assigned to (or requests with no model set)
  const requests = useMemo(() => {
    const allowedModelIds = new Set(models.map((m) => m.id));
    return rawRequests.filter((r) =>
    r.chatter_email === chatterEmail && (!r.model_id || allowedModelIds.has(r.model_id))
    );
  }, [rawRequests, chatterEmail, models]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const model = models.find((m) => m.id === data.model_id);
      const designer = designerMap[data.content_type];
      return base44.entities.GraphicRequest.create({
        ...data,
        chatter_email: chatterEmail,
        chatter_name: chatterName || chatterEmail,
        model_name: model?.name || "",
        assigned_designer_email: designer?.email || "",
        assigned_designer_name: designer?.name || ""
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests", chatterEmail] });
      qc.invalidateQueries({ queryKey: ["graphic-requests-designer"] });
      setForm({ content_type: "", title: "", description: "", model_id: "", priority: "normal", reference_url: "", request_date: todayStr() });
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GraphicRequest.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["graphic-requests", chatterEmail] });
      qc.invalidateQueries({ queryKey: ["graphic-requests-designer"] });
      setDeletingId(null);
    }
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
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">

      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
        
        <div className="flex items-center gap-2.5">
          

          
          <span className="text-xs font-bold text-slate-200">Graphic requests</span>
          {pendingCount > 0 &&
          <span className="bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/30 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          }
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {e.stopPropagation();setShowForm((v) => !v);setExpanded(true);}}
            className="flex items-center gap-1 text-xs text-[#C9A227] hover:text-[#e8c84a] bg-[#C9A227]/10 hover:bg-[#C9A227]/20 border border-[#C9A227]/30 px-2.5 py-1 rounded-full transition-colors font-semibold">
            
            <Plus className="w-3 h-3" /> Add
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded &&
      <div className="border-t border-white/10 h-[420px] flex flex-col overflow-y-auto">

          {/* ── Form ── */}
          {showForm &&
        <form onSubmit={handleSubmit} className="px-5 py-4 bg-white/5 border-b border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#C9A227] uppercase tracking-wide">New request</p>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content type */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Content type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
              { type: "video", icon: Video, label: "Video" },
              { type: "photo", icon: Camera, label: "Photo" }].
              map(({ type, icon: TypeIcon, label }) => {
                const sub = designerMap[type]?.name ? `→ ${designerMap[type].name}` : "→ unassigned";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, content_type: type }))}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                    form.content_type === type ?
                    "border-[#C9A227] bg-[#C9A227]/10" :
                    "border-white/10 bg-white/5 hover:border-white/20"}`
                    }>
                
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    form.content_type === type ? "bg-[#C9A227]" : "bg-white/10"}`
                    }>
                        <TypeIcon className={`w-4 h-4 ${form.content_type === type ? "text-white" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${form.content_type === type ? "text-[#C9A227]" : "text-slate-400"}`}>{label}</p>
                        
                      </div>
                    </button>);
              })}
                </div>
              </div>

              {/* Day picker */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  <CalendarDays className="w-3 h-3 inline mr-1 opacity-60" />
                  Request date *
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {days.map((d) => {
                const selected = form.request_date === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, request_date: d.iso }))}
                    className={`flex-shrink-0 w-14 flex flex-col items-center justify-center px-1 py-2 rounded-xl border-2 transition-all ${
                    selected ?
                    "border-[#C9A227] bg-[#C9A227] text-white shadow-sm" :
                    "border-white/10 bg-white/5 hover:border-white/20 text-slate-400"}`
                    }>
                    
                        <span className={`text-[9px] font-semibold uppercase tracking-wide leading-tight text-center ${selected ? "text-white/80" : "text-slate-500"}`}>
                          {d.isToday ? "Today" : d.isTomorrow ? "Tomrw" : d.dayName}
                        </span>
                        <span className={`text-sm font-bold leading-tight ${selected ? "text-white" : "text-slate-300"}`}>
                          {d.dayNum}
                        </span>
                      </button>);

              })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Title *</label>
                <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="What do you need from the designer?"
              className="w-full h-9 px-3 text-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#C9A227] bg-white/5 text-slate-200 placeholder:text-slate-600" />
            
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Detailed description, format, length..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#C9A227] bg-white/5 text-slate-200 placeholder:text-slate-600 resize-none" />
            
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Model</label>
                  <select
                value={form.model_id}
                onChange={(e) => setForm((p) => ({ ...p, model_id: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#C9A227] bg-[#1a1a1a] text-slate-300">
                
                    <option value="">— none —</option>
                    {models.filter((m) => m.status === "active").map((m) =>
                <option key={m.id} value={m.id}>{m.name}</option>
                )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Priority</label>
                  <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#C9A227] bg-[#1a1a1a] text-slate-300">
                
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Reference URL</label>
                <input
              value={form.reference_url}
              onChange={(e) => setForm((p) => ({ ...p, reference_url: e.target.value }))}
              placeholder="https://..."
              className="w-full h-9 px-3 text-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#C9A227] bg-white/5 text-slate-200 placeholder:text-slate-600" />
            
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg">
                  Cancel
                </button>
                <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.content_type}
              className="text-xs bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] disabled:opacity-40 text-white px-5 py-1.5 rounded-lg font-semibold transition-all shadow-sm">
              
                  {saving ? "Sending..." : "Send request"}
                </button>
              </div>
            </form>
        }

          {/* ── List grouped by date ── */}
          {requests.length === 0 ?
        <div className="px-5 py-8 text-center text-slate-600">
              

          
              <p className="text-xs">No requests yet</p>
            </div> :

        <div>
              {sortedKeys.map((dateKey) =>
          <div key={dateKey}>
                  {/* Date group header */}
                  <div className="px-5 py-2 bg-white/5 border-y border-white/10 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-[#C9A227]" />
                    <span className="text-xs font-semibold text-slate-400">
                      {dateKey === "__no_date__" ? "No date" : formatDateLabel(dateKey)}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-600">
                      {grouped[dateKey].length} {grouped[dateKey].length === 1 ? "request" : "requests"}
                    </span>
                  </div>

                  <div className="px-3 py-2 space-y-2">
                    {grouped[dateKey].map((r) => {
                const pCfg = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.normal;
                const sCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                const isVideo = r.content_type === "video";
                const TypeIcon = isVideo ? Video : Camera;
                const isDeleting = deletingId === r.id;

                return (
                  <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-colors px-3.5 py-3 flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isVideo ? "bg-[#C9A227]/15 border border-[#C9A227]/30" : "bg-blue-500/15 border border-blue-500/30"}`
                    }>
                            <TypeIcon className={`w-4 h-4 ${isVideo ? "text-[#C9A227]" : "text-blue-400"}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-slate-100">{r.title}</p>
                              {r.assigned_designer_name &&
                        <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">→ {r.assigned_designer_name}</span>
                        }
                              {r.model_name &&
                        <span className="text-[10px] text-[#C9A227] bg-[#C9A227]/10 border border-[#C9A227]/30 px-1.5 py-0.5 rounded-full">{r.model_name}</span>
                        }
                            </div>

                            {r.description &&
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                      }

                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pCfg.bg} ${pCfg.text} ${pCfg.border}`}>{pCfg.label}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sCfg.bg} ${sCfg.text} ${sCfg.border}`}>{sCfg.label}</span>
                              {r.admin_note &&
                        <span className="text-[10px] text-slate-500 italic">💬 {r.admin_note}</span>
                        }
                              {r.result_url &&
                        <a href={r.result_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#C9A227] hover:underline flex items-center gap-0.5 font-medium">
                                  <ExternalLink className="w-2.5 h-2.5" /> Result
                                </a>
                        }
                              {r.reference_url &&
                        <a href={r.reference_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">
                                  <ExternalLink className="w-2.5 h-2.5" /> Ref
                                </a>
                        }
                            </div>
                          </div>

                          {/* Delete — only pending */}
                          {r.status === "pending" && (
                    isDeleting ?
                    <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        disabled={deleteMutation.isPending}
                        className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-full font-semibold transition-colors disabled:opacity-50">

                                  Delete
                                </button>
                                <button onClick={() => setDeletingId(null)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">
                                  Back
                                </button>
                              </div> :

                    <button
                      onClick={() => setDeletingId(r.id)}
                      className="flex-shrink-0 mt-0.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Smazat request">
                      
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>)

                    }
                        </div>);

              })}
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      }
    </div>);

}