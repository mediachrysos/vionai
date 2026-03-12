import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, ScrollText } from "lucide-react";
export default function CustomerOnboarding() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const name = urlParams.get("name");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | invalid
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) setStatus("invalid");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted || !gdprAccepted) return;
    setStatus("loading");
    try {
      const res = await base44.functions.invoke("completeOnboarding", {
        token,
        terms_accepted: true,
      });
      if (res.data?.success) {
        setStatus("success");
      } else {
        setErrorMsg(res.data?.error || "Nepodařilo se odeslat formulář.");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err.message || "Nepodařilo se odeslat formulář.");
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 mx-auto mb-3 flex items-center justify-center">
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
          <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
            <input
              type="checkbox"
              id="gdpr"
              checked={gdprAccepted}
              onChange={e => setGdprAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="gdpr" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              Souhlasím se zpracováním osobních údajů dle GDPR za účelem poskytování dohodnutých služeb. Data nebudou předána třetím stranám.
            </label>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
            />
            <div className="flex-1">
              <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                Souhlasím s podmínkami chatovacích služeb a zásadami ochrany osobních údajů.{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                >
                  <ScrollText className="w-3 h-3" /> Přečíst
                </button>
              </label>
            </div>
          </div>

          {/* Terms modal */}
          <Dialog open={showTerms} onOpenChange={setShowTerms}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Podmínky chatovacích služeb</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-gray-700 space-y-4 leading-relaxed">
                <p>Tyto podmínky upravují používání chatovacích služeb poskytovaných naší společností.</p>
                <h4 className="font-semibold text-gray-900">1. Souhlas s podmínkami</h4>
                <p>Registrací a používáním našich služeb souhlasíte s těmito podmínkami v plném rozsahu. Pokud s podmínkami nesouhlasíte, nevyužívejte naše služby.</p>
                <h4 className="font-semibold text-gray-900">2. Věkové omezení</h4>
                <p>Naše služby jsou určeny výhradně pro osoby starší 18 let a 1 dne. Registrací potvrzujete, že splňujete tuto podmínku.</p>
                <h4 className="font-semibold text-gray-900">3. Ochrana osobních údajů</h4>
                <p>Vaše osobní údaje (jméno, datum narození, bankovní údaje) zpracováváme v souladu s GDPR výhradně za účelem poskytování dohodnutých služeb. Vaše data nepředáváme třetím stranám bez vašeho souhlasu.</p>
                <h4 className="font-semibold text-gray-900">4. Platební podmínky</h4>
                <p>Platby za služby jsou prováděny předem na základě vzájemné dohody. Veškeré transakce jsou zaznamenávány v systému.</p>
                <h4 className="font-semibold text-gray-900">5. Ukončení spolupráce</h4>
                <p>Obě strany mají právo kdykoliv ukončit spolupráci s přiměřenou výpovědní lhůtou. Veškeré dosud provedené platby jsou nevratné.</p>
                <h4 className="font-semibold text-gray-900">6. Kontakt</h4>
                <p>V případě dotazů nebo stížností nás kontaktujte prostřednictvím vámi přiděleného chattera.</p>
              </div>
              <div className="mt-4">
                <Button onClick={() => setShowTerms(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">Zavřít</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            type="submit"
            disabled={!termsAccepted || !gdprAccepted || status === "loading"}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
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