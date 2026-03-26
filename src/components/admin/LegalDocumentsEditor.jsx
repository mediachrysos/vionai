import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function LegalDocumentsEditor() {
  const [docs, setDocs] = useState({ gdpr: null, terms: null });
  const [forms, setForms] = useState({ gdpr: { title: "", content: "" }, terms: { title: "", content: "" } });
  const [saving, setSaving] = useState({ gdpr: false, terms: false });
  const [saved, setSaved] = useState({ gdpr: false, terms: false });
  const [activeTab, setActiveTab] = useState("gdpr");

  useEffect(() => {
    base44.entities.LegalDocument.list().then(list => {
      const gdpr = list.find(d => d.key === "gdpr");
      const terms = list.find(d => d.key === "terms");
      setDocs({ gdpr, terms });
      setForms({
        gdpr: { title: gdpr?.title || "", content: gdpr?.content || "" },
        terms: { title: terms?.title || "", content: terms?.content || "" },
      });
    });
  }, []);

  const handleSave = async (key) => {
    setSaving(p => ({ ...p, [key]: true }));
    const form = forms[key];
    if (docs[key]) {
      await base44.entities.LegalDocument.update(docs[key].id, form);
      setDocs(p => ({ ...p, [key]: { ...p[key], ...form } }));
    } else {
      const created = await base44.entities.LegalDocument.create({ key, ...form });
      setDocs(p => ({ ...p, [key]: created }));
    }
    setSaving(p => ({ ...p, [key]: false }));
    setSaved(p => ({ ...p, [key]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2500);
  };

  const tabs = [
    { key: "gdpr", label: "GDPR / Osobní údaje" },
    { key: "terms", label: "Obchodní podmínky" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
              activeTab === t.key
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}>
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      {tabs.map(t => activeTab === t.key && (
        <div key={t.key} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Název dokumentu</label>
            <Input
              value={forms[t.key].title}
              onChange={e => setForms(p => ({ ...p, [t.key]: { ...p[t.key], title: e.target.value } }))}
              className="h-9 text-sm"
              placeholder="Název dokumentu"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Obsah dokumentu{" "}
              <span className="text-gray-400 font-normal">(podporuje Markdown: **tučně**, # Nadpis, - odrážka)</span>
            </label>
            <Textarea
              value={forms[t.key].content}
              onChange={e => setForms(p => ({ ...p, [t.key]: { ...p[t.key], content: e.target.value } }))}
              rows={20}
              className="text-xs font-mono resize-y leading-relaxed"
              placeholder="Zde vložte text dokumentu ve formátu Markdown..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => handleSave(t.key)}
              disabled={saving[t.key] || !forms[t.key].content}
              className={`h-9 text-sm font-semibold px-5 ${
                saved[t.key]
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
              }`}>
              {saved[t.key] ? (
                <><CheckCircle className="w-4 h-4 mr-1.5" /> Uloženo!</>
              ) : saving[t.key] ? "Ukládám..." : (
                <><Save className="w-4 h-4 mr-1.5" /> Uložit dokument</>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}