import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { DEFAULT_TIERS } from "../chatter/tierUtils";

const DEFAULT_RULE = {
  is_active: true,
  daily_goal_enabled: false,
  daily_goal_amount: 5000,
  monthly_goal_enabled: false,
  monthly_goal_amount: 150000,
  monthly_goal_start_date: "",
  monthly_goal_end_date: "",
  monthly_bonus_enabled: false,
  monthly_bonus_amount: 0,
  monthly_bonus_condition_revenue: 0,
  custom_tiers: [],
  notes: ""
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors ${checked ? "bg-[#C9A227]" : "bg-white/10"}`}>
        
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </div>
      <span className="text-xs text-slate-400">{label}</span>
    </label>);

}

export default function ChatterRulesAdmin() {
  const [open, setOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [form, setForm] = useState(DEFAULT_RULE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users-chatters"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000
  });

  const chatters = users.filter((u) => {
    const roles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return roles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const { data: rules = [], refetch } = useQuery({
    queryKey: ["chatter-rules-admin", selectedEmail],
    queryFn: () => selectedEmail ?
    base44.entities.ChatterPerformanceRule.filter({ chatter_email: selectedEmail }) :
    Promise.resolve([]),
    enabled: !!selectedEmail,
    staleTime: 30000
  });

  useEffect(() => {
    if (rules.length > 0) {
      const active = rules.find((r) => r.is_active) || rules[0];
      const tiers = active.custom_tiers?.length > 0 ? active.custom_tiers : DEFAULT_TIERS.map((t) => ({ ...t }));
      setForm({ ...DEFAULT_RULE, ...active, custom_tiers: tiers });
    } else {
      setForm({ ...DEFAULT_RULE, custom_tiers: DEFAULT_TIERS.map((t) => ({ ...t })) });
    }
  }, [rules, selectedEmail]);

  const activeRule = rules.find((r) => r.is_active);

  const handleSave = async () => {
    if (!selectedEmail) return;
    setSaving(true);
    const data = { ...form, chatter_email: selectedEmail };
    if (activeRule) {
      await base44.entities.ChatterPerformanceRule.update(activeRule.id, data);
    } else {
      await base44.entities.ChatterPerformanceRule.create(data);
    }
    await refetch();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key, label, type = "number", min = 0) =>
  <div>
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
      <input
      type={type}
      min={min}
      value={form[key] ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
      className="w-full h-8 border border-white/10 rounded-lg px-2.5 text-sm bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
    
    </div>;


  const updateTier = (idx, key, value) => {
    setForm((f) => {
      const tiers = [...f.custom_tiers];
      tiers[idx] = { ...tiers[idx], [key]: key === "name" ? value : value === "" ? null : Number(value) };
      return { ...f, custom_tiers: tiers };
    });
  };

  const addTier = () => {
    setForm((f) => ({
      ...f,
      custom_tiers: [...f.custom_tiers, { name: "New tier", min: 0, max: null, hourly: 0, commission: 0 }]
    }));
  };

  const removeTier = (idx) => {
    setForm((f) => ({ ...f, custom_tiers: f.custom_tiers.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors group">
        
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-200">
          Chatter Performance Settings (tiers, goals, bonuses)
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open &&
      <div className="px-5 pb-6 pt-2 border-t border-white/10 space-y-5">
          {/* Chatter select */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Select chatter</label>
            <select
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
            className="w-full h-9 border border-white/10 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30 bg-[#252525] text-slate-200">
            
              <option value="">— Select chatter —</option>
              {chatters.map((c) =>
            <option key={c.email} value={c.email}>{c.nickname || c.full_name} ({c.email})</option>
            )}
            </select>
          </div>

          {selectedEmail &&
        <>
              {/* Daily goal */}
              <div className="p-4 bg-[#252525] rounded-xl border border-white/10 space-y-3">
                <Toggle
              checked={form.daily_goal_enabled}
              onChange={(v) => setForm((f) => ({ ...f, daily_goal_enabled: v }))}
              label="Daily goal enabled" />
            
                {form.daily_goal_enabled && field("daily_goal_amount", "Daily goal (CZK)")}
              </div>

              {/* Monthly goal */}
              <div className="p-4 bg-[#252525] rounded-xl border border-white/10 space-y-3">
                <Toggle
              checked={form.monthly_goal_enabled}
              onChange={(v) => setForm((f) => ({ ...f, monthly_goal_enabled: v }))}
              label="Monthly goal enabled" />
            
                {form.monthly_goal_enabled &&
            <>
                    {field("monthly_goal_amount", "Monthly goal (CZK)")}
                    <div className="grid grid-cols-2 gap-3">
                      {field("monthly_goal_start_date", "Period start", "date")}
                      {field("monthly_goal_end_date", "Period end", "date")}
                    </div>
                    <p className="text-[10px] text-slate-500">Leave empty to use the current calendar month.</p>
                  </>
            }
              </div>

              {/* Monthly bonus */}
              <div className="p-4 bg-[#252525] rounded-xl border border-white/10 space-y-3">
                <Toggle
              checked={form.monthly_bonus_enabled}
              onChange={(v) => setForm((f) => ({ ...f, monthly_bonus_enabled: v }))}
              label="Monthly bonus enabled" />
            
                {form.monthly_bonus_enabled &&
            <div className="grid grid-cols-2 gap-3">
                    {field("monthly_bonus_amount", "Bonus (CZK)")}
                    {field("monthly_bonus_condition_revenue", "Revenue condition (CZK)")}
                  </div>
            }
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Rule notes</label>
                <textarea
              value={form.notes || ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-white/10 rounded-lg px-2.5 py-2 text-sm bg-[#252525] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50 resize-none" />
            
              </div>

              {/* Editable payout tiers */}
              <div className="bg-amber-950/20 rounded-xl border border-amber-700/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-400">Payout tiers (editable)</p>
                  <button
                onClick={addTier}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                
                    <Plus className="w-3 h-3" /> Add tier
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] gap-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wide px-1">
                    <span>Name</span>
                    <span>Min (CZK)</span>
                    <span>Max (CZK)</span>
                    <span>Hourly</span>
                    <span>Commission %</span>
                    <span></span>
                  </div>
                  {form.custom_tiers.map((t, idx) =>
              <div key={idx} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] gap-2 items-center">
                      <input
                  value={t.name || ""}
                  onChange={(e) => updateTier(idx, "name", e.target.value)}
                  className="h-8 border border-white/10 rounded-lg px-2 text-xs bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
                
                      <input
                  type="number"
                  value={t.min ?? 0}
                  onChange={(e) => updateTier(idx, "min", e.target.value)}
                  className="h-8 border border-white/10 rounded-lg px-2 text-xs bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
                
                      <input
                  type="number"
                  placeholder="∞"
                  value={t.max ?? ""}
                  onChange={(e) => updateTier(idx, "max", e.target.value)}
                  className="h-8 border border-white/10 rounded-lg px-2 text-xs bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
                
                      <input
                  type="number"
                  value={t.hourly ?? 0}
                  onChange={(e) => updateTier(idx, "hourly", e.target.value)}
                  className="h-8 border border-white/10 rounded-lg px-2 text-xs bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
                
                      <input
                  type="number"
                  value={t.commission ?? 0}
                  onChange={(e) => updateTier(idx, "commission", e.target.value)}
                  className="h-8 border border-white/10 rounded-lg px-2 text-xs bg-[#1e1e1e] text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50" />
                
                      <button
                  onClick={() => removeTier(idx)}
                  className="text-slate-600 hover:text-red-400 transition-colors">
                  
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
              )}
                </div>
                <p className="text-[10px] text-slate-500">Tiers apply by daily revenue. Leave "Max" empty for the top tier (unlimited).</p>
              </div>

              <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-9 bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white text-sm font-semibold rounded-xl hover:from-[#A8841C] hover:to-[#8a6c16] transition-all disabled:opacity-50">
            
                {saved ? "✓ Saved!" : saving ? "Saving..." : "Save settings"}
              </button>
            </>
        }
        </div>
      }
    </div>);

}