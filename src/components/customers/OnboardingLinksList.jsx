import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, XCircle, RefreshCw, Download } from "lucide-react";

const statusConfig = {
  pending: { label: "Aktivní", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Dokončeno", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  expired: { label: "Expirováno", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
    d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `před ${diff}s`;
  if (diff < 3600) return `před ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `před ${Math.floor(diff / 3600)}h`;
  return `před ${Math.floor(diff / 86400)}d`;
}

function formatCountdown(seconds) {
  if (seconds <= 0) return "Expirováno";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Countdown({ expiresAt, onExpired }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)));

  useEffect(() => {
    if (secs <= 0) { onExpired?.(); return; }
    const t = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) { clearInterval(t); onExpired?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const isLow = secs < 300;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
      secs <= 0 ? "bg-gray-100 text-gray-400" : isLow ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-700"
    }`}>
      <Clock className="w-3 h-3 flex-shrink-0" />
      {secs <= 0 ? "Expirováno" : formatCountdown(secs)}
    </span>
  );
}

export default function OnboardingLinksList({ refreshTrigger, models = [] }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const exportCsv = () => {
    const completed = links.filter(l => l.status === "completed");
    const rows = [["Jméno", "Datum potvrzení"], ...completed.map(l => [l.full_name, formatDate(l.updated_date)])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "onboarding_potvrzeni.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.CustomerOnboardingRequest.list("-created_date", 500);
    // Auto-mark expired ones based on expires_at
    const now = new Date();
    const toDelete = list.filter(l => l.status === "expired" || (l.status === "pending" && l.expires_at && new Date(l.expires_at) < now));
    await Promise.all(toDelete.map(l => base44.entities.CustomerOnboardingRequest.delete(l.id)));
    const remaining = list.filter(l => !toDelete.find(d => d.id === l.id));
    setLinks(remaining);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Smazat odkaz pro "${name}"? Odkaz přestane být platný.`)) return;
    await base44.entities.CustomerOnboardingRequest.update(id, { status: "expired" });
    await base44.entities.CustomerOnboardingRequest.delete(id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const markExpired = async (id) => {
    await base44.entities.CustomerOnboardingRequest.update(id, { status: "expired" });
    setLinks(prev => prev.map(l => l.id === id ? { ...l, status: "expired" } : l));
  };

  if (loading) return <p className="text-xs text-gray-400 py-2">Načítám...</p>;
  if (links.length === 0) return <p className="text-xs text-gray-400 py-2">Žádné onboarding odkazy.</p>;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historie odkazů ({links.length})</p>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Export do CSV">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {links.map(link => {
          const cfg = statusConfig[link.status] || statusConfig.expired;
          const Icon = cfg.icon;
          const isPending = link.status === "pending";
          const hasExpiry = isPending && link.expires_at;

          return (
            <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{link.full_name}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <p className="text-xs text-gray-400">{formatDateTime(link.created_date)}</p>
                  {link.assigned_model && (() => {
                    const m = models.find(x => x.id === link.assigned_model);
                    return m ? (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 font-medium">
                        {m.name}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {hasExpiry ? (
                <Countdown expiresAt={link.expires_at} onExpired={() => markExpired(link.id)} />
              ) : link.status === "completed" ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label} · {formatDate(link.updated_date)}
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              )}

              <button
                onClick={() => handleDelete(link.id, link.full_name)}
                className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                title="Smazat odkaz"
              >
                <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3.5 h-3.5 object-contain" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}