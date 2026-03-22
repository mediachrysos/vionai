import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, ScrollText, FileText } from "lucide-react";

export default function CustomerOnboarding() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const name = urlParams.get("name");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showGdpr, setShowGdpr] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [legalDocs, setLegalDocs] = useState({ gdpr: null, terms: null });

  useEffect(() => {
    if (!token) setStatus("invalid");
    // Load legal documents
    base44.entities.LegalDocument.list().then(list => {
      setLegalDocs({
        gdpr: list.find(d => d.key === "gdpr") || null,
        terms: list.find(d => d.key === "terms") || null,
      });
    });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted || !gdprAccepted) return;
    setStatus("loading");
    const res = await base44.functions.invoke("completeOnboarding", { token, terms_accepted: true });
    if (res.data?.success) {
      setStatus("success");
    } else {
      setErrorMsg(res.data?.error || "Nepodařilo se odeslat formulář.");
      setStatus("error");
    }
  };

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Neplatný odkaz</h2>
          <p className="text-sm text-gray-500">Tento odkaz je neplatný nebo byl již použit.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Hotovo!</h2>
          <p className="text-sm text-gray-500">Vaše údaje byly úspěšně uloženy. Děkujeme.</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Chyba</h2>
          <p className="text-sm text-gray-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] mx-auto mb-3 flex items-center justify-center shadow-md shadow-amber-200">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Vítejte!</h1>
          <p className="text-sm text-gray-500 mt-1">Vyplňte údaje pro dokončení registrace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pre-filled name */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Vaše jméno</Label>
            <div className="mt-1 px-3 py-2 rounded-md bg-gray-50 border border-gray-200 text-sm text-gray-800 font-medium">
              {name || "—"}
            </div>
          </div>

          {/* GDPR */}
          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 border border-blue-100">
            <input
              type="checkbox"
              id="gdpr"
              checked={gdprAccepted}
              onChange={e => setGdprAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="gdpr" className="text-xs text-gray-600 leading-relaxed cursor-pointer flex-1">
              Souhlasím se zpracováním osobních údajů dle GDPR za účelem poskytování dohodnutých služeb.{" "}
              <button type="button" onClick={() => setShowGdpr(true)}
                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium">
                <FileText className="w-3 h-3" /> Přečíst zásady
              </button>
            </label>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-100">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer flex-1">
              Souhlasím s obchodními podmínkami a podmínkami použití služby.{" "}
              <button type="button" onClick={() => setShowTerms(true)}
                className="inline-flex items-center gap-0.5 text-amber-700 hover:text-amber-900 underline underline-offset-2 font-medium">
                <ScrollText className="w-3 h-3" /> Přečíst podmínky
              </button>
            </label>
          </div>

          {/* GDPR modal */}
          <DocumentModal
            open={showGdpr}
            onClose={() => setShowGdpr(false)}
            title={legalDocs.gdpr?.title || "Zásady ochrany osobních údajů"}
            content={legalDocs.gdpr?.content}
          />

          {/* Terms modal */}
          <DocumentModal
            open={showTerms}
            onClose={() => setShowTerms(false)}
            title={legalDocs.terms?.title || "Obchodní podmínky"}
            content={legalDocs.terms?.content}
          />

          <Button
            type="submit"
            disabled={!termsAccepted || !gdprAccepted || status === "loading"}
            className="w-full bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold shadow-sm shadow-amber-200"
          >
            {status === "loading" ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Odesílám...</>
            ) : "Potvrdit a odeslat"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function DocumentModal({ open, onClose, title, content }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {content ? (
            <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
              {content}
            </pre>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white">Zavřít</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}