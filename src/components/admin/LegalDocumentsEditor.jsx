import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, CheckCircle, Plus, X, Building2, Bot } from "lucide-react";

const DOC_KEYS = [
  { key: "gdpr", label: "GDPR" },
  { key: "terms", label: "Terms" },
];

const COMPANY_ENUM = ["Chrysos Media", "Anza Media"];

export default function LegalDocumentsEditor() {
  const [docs, setDocs] = useState([]);
  const [models, setModels] = useState([]);
  const [companies, setCompanies] = useState(COMPANY_ENUM);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  const [activeCompany, setActiveCompany] = useState("Chrysos Media");
  const [activeDocKey, setActiveDocKey] = useState("gdpr");
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingModel, setSavingModel] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.LegalDocument.list(),
      base44.entities.Model.list(),
    ]).then(([docList, modelList]) => {
      const normalizedDocs = docList.map(d => ({ ...d, company: d.company || "Chrysos Media" }));
      setDocs(normalizedDocs);
      setModels(modelList);
      const fromData = [
        ...docList.map(d => d.company),
        ...modelList.map(m => m.company),
      ].filter(Boolean);
      const all = Array.from(new Set([...COMPANY_ENUM, ...fromData]));
      setCompanies(all);
    });
  }, []);

  useEffect(() => {
    const doc = docs.find(d => d.company === activeCompany && d.key === activeDocKey);
    setForm({ title: doc?.title || "", content: doc?.content || "" });
    setSaved(false);
  }, [activeCompany, activeDocKey, docs]);

  const handleSave = async () => {
    setSaving(true);
    const existing = docs.find(d => d.company === activeCompany && d.key === activeDocKey);
    let updated;
    if (existing) {
      await base44.entities.LegalDocument.update(existing.id, { ...form, company: activeCompany, key: activeDocKey });
      updated = docs.map(d => d.id === existing.id ? { ...d, ...form } : d);
    } else {
      const created = await base44.entities.LegalDocument.create({ key: activeDocKey, company: activeCompany, ...form });
      updated = [...docs, created];
    }
    setDocs(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddCompany = () => {
    const name = newCompanyName.trim();
    if (!name || companies.includes(name)) return;
    setCompanies(prev => [...prev, name]);
    setActiveCompany(name);
    setNewCompanyName("");
    setAddingCompany(false);
  };

  const handleToggleModel = async (model) => {
    setSavingModel(model.id);
    const newCompany = model.company === activeCompany ? null : activeCompany;
    await base44.entities.Model.update(model.id, { company: newCompany || "Chrysos Media" });
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, company: newCompany || "Chrysos Media" } : m));
    setSavingModel(null);
  };

  const companyModels = models.filter(m => m.company === activeCompany);
  const unassignedModels = models.filter(m => m.company !== activeCompany);

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Left panel */}
      <div className="w-60 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Companies</span>
          <button onClick={() => setAddingCompany(v => !v)} className="text-slate-500 hover:text-slate-300 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {addingCompany && (
          <div className="flex gap-1.5">
            <Input
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCompany()}
              placeholder="Company name..."
              className="h-8 text-xs flex-1"
              autoFocus
            />
            <Button onClick={handleAddCompany} disabled={!newCompanyName.trim()} className="h-8 px-2 bg-[#C9A227] hover:bg-[#A8841C] text-white">
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
            <button onClick={() => { setAddingCompany(false); setNewCompanyName(""); }} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {companies.map(company => (
          <button
            key={company}
            onClick={() => setActiveCompany(company)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              activeCompany === company
                ? "bg-amber-950/40 border-amber-700/50 text-amber-300"
                : "bg-[#252525] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{company}</span>
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5 pl-5">
              {models.filter(m => m.company === company).length} models
            </div>
          </button>
        ))}

        {/* Models for active company */}
        <div className="pt-3 border-t border-white/10">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Models — {activeCompany}
          </span>

          {companyModels.length === 0 && (
            <p className="text-xs text-slate-600 italic px-1">No models assigned</p>
          )}
          {companyModels.map(m => (
            <div key={m.id} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white/5 group transition-colors">
              <div className="w-6 h-6 rounded-lg overflow-hidden bg-amber-950/40 flex-shrink-0 flex items-center justify-center border border-amber-700/30">
                {m.profile_photo
                  ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                  : <Bot className="w-3 h-3 text-amber-500" />}
              </div>
              <span className="text-xs text-slate-300 flex-1 truncate">{m.name}</span>
              <button
                onClick={() => handleToggleModel(m)}
                disabled={savingModel === m.id}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {unassignedModels.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed border-white/10">
              <span className="text-[10px] text-slate-600 block mb-1">Add model:</span>
              {unassignedModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleToggleModel(m)}
                  disabled={savingModel === m.id}
                  className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-amber-950/20 w-full text-left transition-colors group"
                >
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-[#252525] flex-shrink-0 flex items-center justify-center border border-white/10">
                    {m.profile_photo
                      ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                      : <Bot className="w-3 h-3 text-slate-500" />}
                  </div>
                  <span className="text-xs text-slate-500 group-hover:text-amber-400 flex-1 truncate">{m.name}</span>
                  <Plus className="w-3 h-3 text-slate-600 group-hover:text-amber-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — document editor */}
      <div className="flex-1 space-y-3">
        {/* Doc type tabs */}
        <div className="flex gap-2">
          {DOC_KEYS.map(t => (
            <button key={t.key} onClick={() => setActiveDocKey(t.key)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 ${
                activeDocKey === t.key
                  ? "bg-[#252525] border-white/20 text-slate-200"
                  : "bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300"
              }`}>
              <FileText className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Document title</label>
          <Input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="h-9 text-sm"
            placeholder={`${activeCompany} — ${DOC_KEYS.find(d => d.key === activeDocKey)?.label}`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">
            Document content{" "}
            <span className="text-slate-600 font-normal">(Markdown: **bold**, # Heading, - bullet)</span>
          </label>
          <Textarea
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            rows={18}
            className="text-xs font-mono resize-y leading-relaxed"
            placeholder="Paste document content in Markdown format..."
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !form.content}
            className={`h-9 text-sm font-semibold px-5 ${
              saved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
            }`}>
            {saved ? (
              <><CheckCircle className="w-4 h-4 mr-1.5" /> Saved!</>
            ) : saving ? "Saving..." : (
              <><Save className="w-4 h-4 mr-1.5" /> Save document</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}