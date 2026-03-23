import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export default function OnboardingLinkModal({ open, onClose, models, users }) {
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [assignedChatter, setAssignedChatter] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(countdownRef.current);
  }, []);

  const reset = () => {
    clearInterval(countdownRef.current);
    setCountdown(null);
    setName("");
    setAssignedModel("");
    setAssignedChatter("");
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const token = generateToken();
    await base44.entities.CustomerOnboardingRequest.create({
      full_name: name.trim(),
      token,
      status: "pending",
      assigned_model: assignedModel || null,
      assigned_chatter: assignedChatter || null,
    });

    const pageUrl = createPageUrl("CustomerOnboarding");
    const base = window.location.origin;
    const link = `${base}${pageUrl}?token=${token}&name=${encodeURIComponent(name.trim())}`;
    setGeneratedLink(link);
    setLoading(false);
    startCountdown();
    // Auto-expire after 60s
    setTimeout(async () => {
      await base44.entities.CustomerOnboardingRequest.update(
        (await base44.entities.CustomerOnboardingRequest.filter({ token })).find(r => r.token === token)?.id,
        { status: "expired" }
      );
    }, 60000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        {/* Zlatá hlavička */}
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-6 py-4 flex items-center gap-3">
          <Link2 className="w-5 h-5 text-white/80" />
          <DialogTitle className="text-white text-lg font-semibold">
            Onboarding odkaz
          </DialogTitle>
        </div>

        <div className="px-6 py-5">
          {!generatedLink ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Celé jméno zákazníka *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jan Novák"
                  className="mt-1 focus-visible:ring-[#C9A227]"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Přiřazená modelka</Label>
                <Select value={assignedModel} onValueChange={setAssignedModel}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat (volitelné)" /></SelectTrigger>
                  <SelectContent>
                    {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Přiřazený chatter</Label>
                <Select value={assignedChatter} onValueChange={setAssignedChatter}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat (volitelné)" /></SelectTrigger>
                  <SelectContent>
                    {users?.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={handleClose}>Zrušit</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!name.trim() || loading}
                  className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generuji...</> : "Vygenerovat odkaz"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Odkaz úspěšně vygenerován</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Pošlete odkaz zákazníkovi <strong>{name}</strong> do chatu.</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Onboarding odkaz</p>
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                  <span className="text-xs text-gray-700 break-all font-mono leading-relaxed">{generatedLink}</span>
                </div>
                <Button
                  onClick={handleCopy}
                  variant={copied ? "outline" : "default"}
                  className={`w-full mt-2 ${copied ? "border-emerald-300 text-emerald-600" : "bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"}`}
                >
                  {copied ? <><Check className="w-4 h-4 mr-2" /> Zkopírováno!</> : <><Copy className="w-4 h-4 mr-2" /> Kopírovat odkaz</>}
                </Button>
              </div>

              <p className="text-xs text-gray-400 text-center">Po vyplnění formuláře zákazníkem se záznam automaticky uloží do databáze.</p>

              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <Button variant="outline" onClick={reset} className="flex-1">Nový odkaz</Button>
                <Button onClick={handleClose} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white">Zavřít</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}