import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusConfig = {
  pending: { label: "Aktivní", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Dokončeno", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  expired: { label: "Expirováno", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `před ${diff}s`;
  if (diff < 3600) return `před ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `před ${Math.floor(diff / 3600)}h`;
  return `před ${Math.floor(diff / 86400)}d`;
}

export default function OnboardingLinksList({ refreshTrigger }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.CustomerOnboardingRequest.list("-created_date", 50);
    setLinks(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Smazat odkaz pro "${name}"? Odkaz přestane být platný.`)) return;
    await base44.entities.CustomerOnboardingRequest.update(id, { status: "expired" });
    await base44.entities.CustomerOnboardingRequest.delete(id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  if (loading) return <p className="text-xs text-gray-400 py-2">Načítám...</p>;
  if (links.length === 0) return <p className="text-xs text-gray-400 py-2">Žádné onboarding odkazy.</p>;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historie odkazů ({links.length})</p>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        {links.map(link => {
          const cfg = statusConfig[link.status] || statusConfig.expired;
          const Icon = cfg.icon;
          return (
            <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{link.full_name}</p>
                <p className="text-xs text-gray-400">{timeAgo(link.created_date)}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
              <button
                onClick={() => handleDelete(link.id, link.full_name)}
                className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                title="Smazat odkaz"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}