import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, Link2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export default function OnboardingLinkModal({ open, onClose, models, users, onLinkCreated }) {
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);

  // Auto-focus name input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  const reset = () => {
    setName("");
    setAssignedModel("");
    setGeneratedLink(null);
    setCopied(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!name.trim() || !assignedModel) return;
    setLoading(true);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h default
    await base44.entities.CustomerOnboardingRequest.create({
      full_name: name.trim(),
      token,
      status: "pending",
      assigned_model: assignedModel,
      assigned_chatter: null,
      expires_at: expiresAt,
    });

    const pageUrl = createPageUrl("CustomerOnboarding");
    const link = `${window.location.origin}${pageUrl}?token=${token}&name=${encodeURIComponent(name.trim())}`;
    setGeneratedLink(link);
    setLoading(false);
    if (onLinkCreated) onLinkCreated();

    // Auto-copy
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && name.trim() && assignedModel && !loading) {
      handleGenerate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center gap-2.5">
          <Link2 className="w-4 h-4 text-white/80" />
          <DialogTitle className="text-white text-base font-semibold">Nový onboarding odkaz</DialogTitle>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Name */}
          <Input
            ref={nameRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Celé jméno zákazníka..."
            className="focus-visible:ring-[#C9A227]"
          />

          {/* Model select */}
          <Select value={assignedModel} onValueChange={setAssignedModel}>
            <SelectTrigger>
              <SelectValue placeholder="Vybrat modelku..." />
            </SelectTrigger>
            <SelectContent>
              {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!name.trim() || !assignedModel || loading}
            className="w-full bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generuji...</>
              : "Vygenerovat odkaz"}
          </Button>

          {/* Generated link result */}
          {generatedLink && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  {copied ? "Zkopírováno do schránky!" : "Odkaz vygenerován"}
                </p>
              </div>
              <p className="text-[11px] text-gray-500 break-all font-mono leading-relaxed">{generatedLink}</p>
              <Button
                onClick={handleCopy}
                size="sm"
                variant="outline"
                className={`w-full text-xs ${copied ? "border-emerald-300 text-emerald-600" : ""}`}
              >
                {copied
                  ? <><Check className="w-3 h-3 mr-1" /> Zkopírováno</>
                  : <><Copy className="w-3 h-3 mr-1" /> Kopírovat znovu</>}
              </Button>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex gap-2 pt-1">
            {generatedLink && (
              <Button variant="outline" onClick={reset} className="flex-1 text-sm">Nový odkaz</Button>
            )}
            <Button onClick={handleClose} variant="outline" className="flex-1 text-sm">Zavřít</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}