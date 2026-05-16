import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_RULE = {
  is_active: true,
  daily_goal_enabled: false,
  daily_goal_amount: 5000,
  monthly_goal_enabled: false,
  monthly_goal_amount: 150000,
  monthly_bonus_enabled: false,
  monthly_bonus_amount: 0,
  monthly_bonus_condition_revenue: 0,
  notes: "",
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors ${checked ? "bg-[#C9A227]" : "bg-gray-200"}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </label>
  );
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
    staleTime: 60000,
  });

  const chatters = users.filter(u => {
    const roles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return roles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const { data: rules = [], refetch } = useQuery({
    queryKey: ["chatter-rules-admin", selectedEmail],
    queryFn: () => selectedEmail
      ? base44.entities.ChatterPerformanceRule.filter({ chatter_email: selectedEmail })
      : Promise.resolve([]),
    enabled: !!selectedEmail,
    staleTime: 30000,
  });

  useEffect(() => {
    if (rules.length > 0) {
      const active = rules.find(r => r.is_active) || rules[0];
      setForm({ ...DEFAULT_RULE, ...active });
    } else {
      setForm(DEFAULT_RULE);
    }
  }, [rules, selectedEmail]);

  const activeRule = rules.find(r => r.is_active);

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

  const field = (key, label, type = "number", min = 0) => (
    <div>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      <input
        type={type}
        min={min}
        value={form[key] ?? ""}
        onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className="w-full h-8 border border-gray-200 rounded-lg px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Settings className="w-4 h-4 text-[#C9A227]" />
          Nastavení výkonu chatterů (tiery, cíle, bonusy)
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-6 pt-2 border-t border-gray-50 space-y-5">
          {/* Chatter select */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Vyber chattera</label>
            <select
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
              className="w-full h-9 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30 bg-white"
            >
              <option value="">— Vyber chattera —</option>
              {chatters.map(c => (
                <option key={c.email} value={c.email}>{c.nickname || c.full_name} ({c.email})</option>
              ))}
            </select>
          </div>

          {selectedEmail && (
            <>
              {/* Daily goal */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <Toggle
                  checked={form.daily_goal_enabled}
                  onChange={v => setForm(f => ({ ...f, daily_goal_enabled: v }))}
                  label="Denní cíl zapnutý"
                />
                {form.daily_goal_enabled && field("daily_goal_amount", "Denní cíl (Kč)")}
              </div>

              {/* Monthly goal */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <Toggle
                  checked={form.monthly_goal_enabled}
                  onChange={v => setForm(f => ({ ...f, monthly_goal_enabled: v }))}
                  label="Měsíční cíl zapnutý"
                />
                {form.monthly_goal_enabled && field("monthly_goal_amount", "Měsíční cíl (Kč)")}
              </div>

              {/* Monthly bonus */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <Toggle
                  checked={form.monthly_bonus_enabled}
                  onChange={v => setForm(f => ({ ...f, monthly_bonus_enabled: v }))}
                  label="Měsíční bonus zapnutý"
                />
                {form.monthly_bonus_enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    {field("monthly_bonus_amount", "Bonus (Kč)")}
                    {field("monthly_bonus_condition_revenue", "Podmínka revenue (Kč)")}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Poznámka k pravidlům</label>
                <textarea
                  value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50 resize-none"
                />
              </div>

              {/* Info about tiers */}
              <div className="bg-[#faf6e6] rounded-xl border border-[#e8d99a] p-4">
                <p className="text-xs font-semibold text-[#A8841C] mb-2">Výplatní tiery (pevně dané)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { range: "0–1 999 Kč", rate: "0 Kč/h, 0% provize" },
                    { range: "2 000–4 999 Kč", rate: "120 Kč/h" },
                    { range: "5 000–9 999 Kč", rate: "120 Kč/h + 5%" },
                    { range: "10 000+ Kč", rate: "120 Kč/h + 10%" },
                  ].map(t => (
                    <div key={t.range} className="text-[10px]">
                      <span className="font-semibold text-gray-700">{t.range}</span>
                      <br /><span className="text-gray-500">{t.rate}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-9 bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white text-sm font-semibold rounded-xl hover:from-[#A8841C] hover:to-[#8a6c16] transition-all disabled:opacity-50"
              >
                {saved ? "✓ Uloženo!" : saving ? "Ukládám..." : "Uložit nastavení"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}