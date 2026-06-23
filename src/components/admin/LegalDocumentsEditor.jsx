import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

const COMPANIES = ["Chrysos Media", "Anza Media"];
const DOC_KEYS = [
  { key: "gdpr", label: "GDPR / Osobní údaje" },
  { key: "terms", label: "Obchodní podmínky" },
];

export default function LegalDocumentsEditor() {
  // All docs from DB: { company: { key: docObj } }
  const [allDocs, setAllDocs] = useState({});
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [activeCompany, setActiveCompany] = useState("Chrysos Media");
  const [activeDocKey, setActiveDocKey] = useState("gdpr");

  useEffect(() => {
    base44.entities.LegalDocument.list().then(list => {
      const byCompanyKey = {};
      for (const company of COMPANIES) {
        byCompanyKey[company] = {};
        const formEntry = {};
        for (const { key } of DOC_KEYS) {
          const doc = list.find(d => d.company === company && d.key === key) || null;
          byCompanyKey[company][key] = doc;
          formEntry[key] = { title: doc?.title || "", content: doc?.content || "" };
        }
        forms[company] = formEntry;
      }
      setAllDocs(byCompanyKey);
      setForms({ ...forms });
    });
  }, []);

  const handleSave = async (company, key) => {
    const saveKey = `${company}_${key}`;
    setSaving(p => ({ ...p, [saveKey]: true }));
    const form = forms[company]?.[key] || { title: "", content: "" };
    const existingDoc = allDocs[company]?.[key];
    let updatedDoc;
    if (existingDoc) {
      await base44.entities.LegalDocument.update(existingDoc.id, { ...form, company, key });
      updatedDoc = { ...existingDoc, ...form };
    } else {
      updatedDoc = await base44.entities.LegalDocument.create({ key, company, ...form });
    }
    setAllDocs(p => ({ ...p, [company]: { ...p[company], [key]: updatedDoc } }));
    setSaving(p => ({ ...p, [saveKey]: false }));
    setSaved(p => ({ ...p, [saveKey]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [saveKey]: false })), 2500);
  };

  const currentForm = forms[activeCompany]?.[activeDocKey] || { title: "", content: "" };
  const saveKey = `${activeCompany}_${activeDocKey}`;

  return (
    <div className="space-y-4">
      {/* Company selector */}
      <div className="flex gap-2">
        {COMPANIES.map(company => (
          <button key={company} onClick={() => setActiveCompany(company)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
              activeCompany === company
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}>
            {company}
          </button>
        ))}
      </div>

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

      {/* Editor */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Název dokumentu</label>
          <Input
            value={currentForm.title}
            onChange={e => setForms(p => ({
              ...p,
              [activeCompany]: { ...p[activeCompany], [activeDocKey]: { ...currentForm, title: e.target.value } }
            }))}
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
            value={currentForm.content}
            onChange={e => setForms(p => ({
              ...p,
              [activeCompany]: { ...p[activeCompany], [activeDocKey]: { ...currentForm, content: e.target.value } }
            }))}
            rows={20}
            className="text-xs font-mono resize-y leading-relaxed"
            placeholder="Zde vložte text dokumentu ve formátu Markdown..."
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => handleSave(activeCompany, activeDocKey)}
            disabled={saving[saveKey] || !currentForm.content}
            className={`h-9 text-sm font-semibold px-5 ${
              saved[saveKey]
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
            }`}>
            {saved[saveKey] ? (
              <><CheckCircle className="w-4 h-4 mr-1.5" /> Uloženo!</>
            ) : saving[saveKey] ? "Ukládám..." : (
              <><Save className="w-4 h-4 mr-1.5" /> Uložit dokument</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}