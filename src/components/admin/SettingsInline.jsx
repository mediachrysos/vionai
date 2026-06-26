import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, Upload, Building2, DollarSign, Layers, Link } from "lucide-react";
import { applyBrandColor } from "@/lib/WorkspaceContext";

const CURRENCIES = ["CZK", "EUR", "USD", "GBP", "PLN", "HUF", "RON", "MAD"];

const SubSection = ({ icon: Icon, title, children }) => (
  <div className="bg-[#252525] border border-white/10 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-[#C9A227]" />
      </div>
      <h3 className="text-xs font-semibold text-slate-300">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#C9A227]/40";

export default function SettingsInline() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingOnbLogo, setUploadingOnbLogo] = useState(false);

  useEffect(() => {
    base44.entities.WorkspaceSettings.list().then((list) => {
      if (list.length > 0) {
        setSettingsId(list[0].id);
        setSettings(list[0]);
      } else {
        setSettings({
          company_name: "", logo_url: "", brand_color: "#C9A227",
          currency: "CZK", commission_percentage: 30, monthly_goal: 0,
          has_graphic_space: false, onboarding_logo_url: "", onboarding_company_name: "",
        });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (settingsId) {
      await base44.entities.WorkspaceSettings.update(settingsId, settings);
    } else {
      const created = await base44.entities.WorkspaceSettings.create(settings);
      setSettingsId(created.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (field === "logo_url") setUploadingLogo(true);
    else setUploadingOnbLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSettings(s => ({ ...s, [field]: file_url }));
    if (field === "logo_url") setUploadingLogo(false);
    else setUploadingOnbLogo(false);
  };

  const set = (field, value) => {
    setSettings(s => ({ ...s, [field]: value }));
    if (field === "brand_color" && value && value.length === 7) {
      applyBrandColor(value);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branding */}
        <SubSection icon={Building2} title="Branding">
          <Field label="Company name">
            <input className={inputCls} value={settings.company_name || ""} onChange={e => set("company_name", e.target.value)} placeholder="My Modeling Agency" />
          </Field>
          <Field label="Company logo">
            <div className="flex items-center gap-2 flex-wrap">
              {settings.logo_url && (
                <img src={settings.logo_url} alt="logo" className="h-9 w-9 object-contain rounded-lg border border-white/10 bg-[#1e1e1e] p-1" />
              )}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e1e1e] border border-white/10 text-xs text-slate-400 cursor-pointer hover:border-[#C9A227]/40 transition-colors">
                <Upload className="w-3 h-3" />
                {uploadingLogo ? "Uploading..." : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, "logo_url")} />
              </label>
              {settings.logo_url && <button onClick={() => set("logo_url", "")} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
            </div>
          </Field>
          <Field label="Brand color">
            <div className="flex items-center gap-2">
              <input type="color" value={settings.brand_color || "#C9A227"} onChange={e => set("brand_color", e.target.value)} className="w-9 h-9 rounded-lg border border-white/10 bg-[#1e1e1e] cursor-pointer p-1 flex-shrink-0" />
              <input className={inputCls} value={settings.brand_color || ""} onChange={e => set("brand_color", e.target.value)} placeholder="#C9A227" />
            </div>
          </Field>
        </SubSection>

        {/* Finance */}
        <SubSection icon={DollarSign} title="Finance & Goals">
          <Field label="Currency">
            <select className={inputCls} value={settings.currency || "CZK"} onChange={e => set("currency", e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Default commission (%)">
            <input type="number" className={inputCls} value={settings.commission_percentage ?? 30} onChange={e => set("commission_percentage", parseFloat(e.target.value))} min={0} max={100} />
          </Field>
          <Field label="Monthly revenue goal">
            <input type="number" className={inputCls} value={settings.monthly_goal ?? 0} onChange={e => set("monthly_goal", parseFloat(e.target.value))} min={0} />
          </Field>
        </SubSection>

        {/* Modules */}
        <SubSection icon={Layers} title="Modules">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set("has_graphic_space", !settings.has_graphic_space)} className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${settings.has_graphic_space ? "bg-[#C9A227]" : "bg-white/10"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.has_graphic_space ? "left-[22px]" : "left-0.5"}`} />
            </div>
            <span className="text-sm text-slate-300">Enable Graphic Space module</span>
          </label>
        </SubSection>

        {/* Onboarding */}
        <SubSection icon={Link} title="Customer Onboarding Link">
          <Field label="Company name in onboarding">
            <input className={inputCls} value={settings.onboarding_company_name || ""} onChange={e => set("onboarding_company_name", e.target.value)} placeholder="Same as main" />
          </Field>
          <Field label="Onboarding logo (optional)">
            <div className="flex items-center gap-2 flex-wrap">
              {settings.onboarding_logo_url && (
                <img src={settings.onboarding_logo_url} alt="onb logo" className="h-9 w-9 object-contain rounded-lg border border-white/10 bg-[#1e1e1e] p-1" />
              )}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e1e1e] border border-white/10 text-xs text-slate-400 cursor-pointer hover:border-[#C9A227]/40 transition-colors">
                <Upload className="w-3 h-3" />
                {uploadingOnbLogo ? "Uploading..." : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, "onboarding_logo_url")} />
              </label>
              {settings.onboarding_logo_url && <button onClick={() => set("onboarding_logo_url", "")} className="text-xs text-red-400 hover:text-red-300">Remove</button>}
            </div>
          </Field>
        </SubSection>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A227] hover:bg-[#A8841C] text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}