import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, ScrollText } from "lucide-react";

export default function CustomerOnboarding() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const name = urlParams.get("name");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error | invalid
  const [errorMsg, setErrorMsg] = useState("");
  const [dobError, setDobError] = useState("");

  useEffect(() => {
    if (!token) setStatus("invalid");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!termsAccepted) return;
    setStatus("loading");
    try {
      const res = await base44.functions.invoke("completeOnboarding", {
        token,
        date_of_birth: dateOfBirth,
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
          <p className="text-sm text-gray-500 mt-1">Prosím, vyplňte níže uvedené údaje pro dokončení registrace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pre-filled name */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Vaše jméno</Label>
            <div className="mt-1 px-3 py-2 rounded-md bg-gray-50 border border-gray-200 text-sm text-gray-800 font-medium">
              {name || "—"}
            </div>
          </div>

          {/* Date of birth */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Datum narození *</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
              Souhlasím s podmínkami chatovacích služeb a beru na vědomí, že mé osobní údaje budou zpracovány v souladu se zásadami ochrany osobních údajů.
            </label>
          </div>

          <Button
            type="submit"
            disabled={!dateOfBirth || !termsAccepted || status === "loading"}
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