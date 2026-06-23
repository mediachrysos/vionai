import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, CheckCircle, Plus, X, Building2, Bot } from "lucide-react";

const DOC_KEYS = [
  { key: "gdpr", label: "GDPR" },
  { key: "terms", label: "Obch. podmínky" },
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
      setDocs(docList);
      setModels(modelList);
      // Collect all unique companies from docs + models + defaults
      const fromData = [
        ...docList.map(d => d.company),
        ...modelList.map(m => m.company),
      ].filter(Boolean);
      const all = Array.from(new Set([...COMPANY_ENUM, ...fromData]));
      setCompanies(all);
    });
  }, []);

  // Sync form when company/docKey changes
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
  const currentDoc = docs.find(d => d.company === activeCompany && d.key === activeDocKey);

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Left panel — companies + models */}
      <div className="w-64 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Firmy</span>
          <button onClick={() => setAddingCompany(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {addingCompany && (
          <div className="flex gap-1.5">
            <Input
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCompany()}
              placeholder="Název firmy..."
              className="h-8 text-xs flex-1"
              autoFocus
            />
            <Button onClick={handleAddCompany} disabled={!newCompanyName.trim()} className="h-8 px-2 bg-[#C9A227] hover:bg-[#A8841C] text-white">
              <CheckCircle className="w-3.5 h-3.5" />
            </Button>
            <button onClick={() => { setAddingCompany(false); setNewCompanyName(""); }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {companies.map(company => (
          <button
            key={company}
            onClick={() => setActiveCompany(company)}
            className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              activeCompany === company
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{company}</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 pl-5">
              {models.filter(m => m.company === company).length} modelek
            </div>
          </button>
        ))}

        {/* Models for active company */}
        <div className="pt-2 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Modelky — {activeCompany}</span>

          {companyModels.length === 0 && (
            <p className="text-xs text-gray-400 italic px-1">Žádné modelky přiřazeny</p>
          )}
          {companyModels.map(m => (
            <div key={m.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 group">
              <div className="w-6 h-6 rounded overflow-hidden bg-amber-50 flex-shrink-0 flex items-center justify-center border border-amber-100">
                {m.profile_photo
                  ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                  : <Bot className="w-3 h-3 text-amber-400" />}
              </div>
              <span className="text-xs text-gray-700 flex-1 truncate">{m.name}</span>
              <button
                onClick={() => handleToggleModel(m)}
                disabled={savingModel === m.id}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {unassignedModels.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
              <span className="text-[10px] text-gray-400 block mb-1">Přidat modelku:</span>
              {unassignedModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleToggleModel(m)}
                  disabled={savingModel === m.id}
                  className="flex items-center gap-2 py-1 px-1 rounded hover:bg-amber-50 w-full text-left transition-colors group"
                >
                  <div className="w-6 h-6 rounded overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200">
                    {m.profile_photo
                      ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                      : <Bot className="w-3 h-3 text-gray-400" />}
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-amber-700 flex-1 truncate">{m.name}</span>
                  <Plus className="w-3 h-3 text-gray-300 group-hover:text-amber-500 flex-shrink-0" />
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
              className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
                activeDocKey === t.key
                  ? "bg-slate-100 border-slate-300 text-slate-700"
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
              }`}>
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Název dokumentu</label>
          <Input
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="h-9 text-sm"
            placeholder={`${activeCompany} — ${DOC_KEYS.find(d => d.key === activeDocKey)?.label}`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Obsah dokumentu{" "}
            <span className="text-gray-400 font-normal">(podporuje Markdown: **tučně**, # Nadpis, - odrážka)</span>
          </label>
          <Textarea
            value={form.content}
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            rows={18}
            className="text-xs font-mono resize-y leading-relaxed"
            placeholder="Zde vložte text dokumentu ve formátu Markdown..."
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
              <><CheckCircle className="w-4 h-4 mr-1.5" /> Uloženo!</>
            ) : saving ? "Ukládám..." : (
              <><Save className="w-4 h-4 mr-1.5" /> Uložit dokument</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}