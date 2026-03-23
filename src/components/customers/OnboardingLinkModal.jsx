import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Link2, Loader2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

const EXPIRY_OPTIONS = [
  { label: "1 minuta", seconds: 60 },
  { label: "5 minut", seconds: 5 * 60 },
  { label: "15 minut", seconds: 15 * 60 },
  { label: "30 minut", seconds: 30 * 60 },
  { label: "1 hodina", seconds: 60 * 60 },
  { label: "12 hodin", seconds: 12 * 60 * 60 },
  { label: "24 hodin", seconds: 24 * 60 * 60 },
  { label: "48 hodin", seconds: 48 * 60 * 60 },
];

function formatCountdown(seconds) {
  if (seconds <= 0) return "Expirováno";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function OnboardingLinkModal({ open, onClose, models, users, onLinkCreated }) {
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [assignedChatter, setAssignedChatter] = useState("");
  const [expirySecs, setExpirySecs] = useState(12 * 60 * 60); // default 12h
  const [generatedLink, setGeneratedLink] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const expireTimeoutRef = useRef(null);

  const clearTimers = () => {
    clearInterval(countdownRef.current);
    clearTimeout(expireTimeoutRef.current);
  };

  const reset = () => {
    clearTimers();
    setName("");
    setAssignedModel("");
    setAssignedChatter("");
    setExpirySecs(12 * 60 * 60);
    setGeneratedLink(null);
    setRecordId(null);
    setCopied(false);
    setCountdown(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleGenerate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const token = generateToken();
    const record = await base44.entities.CustomerOnboardingRequest.create({
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
    setRecordId(record.id);
    setLoading(false);
    if (onLinkCreated) onLinkCreated();

    // Start countdown
    setCountdown(expirySecs);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-expire after chosen time
    expireTimeoutRef.current = setTimeout(async () => {
      await base44.entities.CustomerOnboardingRequest.update(record.id, { status: "expired" });
      if (onLinkCreated) onLinkCreated();
    }, expirySecs * 1000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = countdown === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
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
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Expirace odkazu
                </Label>
                <Select value={String(expirySecs)} onValueChange={v => setExpirySecs(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map(o => (
                      <SelectItem key={o.seconds} value={String(o.seconds)}>{o.label}</SelectItem>
                    ))}
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
            <div className="space-y-4">
              {isExpired ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Odkaz expiroval</p>
                    <p className="text-xs text-red-600 mt-0.5">Tento odkaz již není platný. Vytvořte nový.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Odkaz vygenerován</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Pošlete odkaz zákazníkovi <strong>{name}</strong> do chatu.</p>
                  </div>
                </div>
              )}

              {/* Countdown */}
              {countdown !== null && (
                <div className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 px-3 ${
                  isExpired ? "bg-red-50 text-red-600 border border-red-200"
                  : countdown < 300 ? "bg-orange-50 text-orange-600 border border-orange-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {isExpired ? "Odkaz expiroval" : `Expiruje za ${formatCountdown(countdown)}`}
                </div>
              )}

              {!isExpired && (
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
              )}

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