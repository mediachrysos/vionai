import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, FileText, ScrollText } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function CustomerOnboarding() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const name = urlParams.get("name");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showGdpr, setShowGdpr] = useState(false);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [legalDocs, setLegalDocs] = useState({ gdpr: null, terms: null });

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    base44.functions.invoke("completeOnboarding", { token, check_only: true })
      .then(res => {
        const d = res.data;
        if (d?.expired) { setStatus("expired"); return; }
        if (d?.invalid) { setStatus("invalid"); return; }
        setStatus("idle");
      })
      .catch(() => setStatus("invalid"));

    base44.functions.invoke("completeOnboarding", { get_docs: true }).then(res => {
      const list = res.data?.docs || [];
      setLegalDocs({
        gdpr: list.find(d => d.key === "gdpr") || null,
        terms: list.find(d => d.key === "terms") || null,
      });
    }).catch(() => {});
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-14 h-14 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Odkaz expiroval</h2>
          <p className="text-sm text-gray-500">Platnost tohoto odkazu vypršela. Požádejte o nový odkaz.</p>
        </div>
      </div>
    );
  }

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
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="https://chrysos-media-website.base44.app" target="_blank" rel="noopener noreferrer" className="inline-block mb-3">
            <img
              src="https://res.cloudinary.com/drkudvyog/image/upload/v1774274896/hf_20260323_140153_38afd9a9-0561-418e-aa6f-da2f6f022bae_copy_cakidp.png"
              alt="Chrysos Media"
              className="w-48 h-48 object-contain mx-auto hover:opacity-90 transition-opacity"
            />
          </a>
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
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="flex items-start gap-3 p-3.5">
              <input
                type="checkbox"
                id="gdpr"
                checked={gdprAccepted}
                onChange={e => setGdprAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="gdpr" className="text-xs text-gray-600 leading-relaxed cursor-pointer flex-1">
                Souhlasím se zpracováním osobních údajů dle GDPR za účelem poskytování dohodnutých služeb.
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowGdpr(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Přečíst zásady ochrany osobních údajů
            </button>
          </div>

          {/* Terms */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="flex items-start gap-3 p-3.5">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-amber-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer flex-1">
                Souhlasím s obchodními podmínkami a podmínkami použití služby.
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Přečíst obchodní podmínky
            </button>
          </div>

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

      {/* Modals */}
      <DocumentModal
        open={showGdpr}
        onClose={() => setShowGdpr(false)}
        title={legalDocs.gdpr?.title || "Zásady ochrany osobních údajů"}
        content={legalDocs.gdpr?.content}
      />
      <DocumentModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title={legalDocs.terms?.title || "Obchodní podmínky"}
        content={legalDocs.terms?.content}
      />
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
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-6 mb-2 pb-1 border-b border-gray-200">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-4 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed my-2">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="text-sm text-gray-700 leading-relaxed">{children}</li>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              <p className="text-xs text-gray-400">Načítám dokument...</p>
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