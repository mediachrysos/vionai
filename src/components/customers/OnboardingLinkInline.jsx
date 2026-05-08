import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

function createPageUrl(page) {
  return `/${page}`;
}

export default function OnboardingLinkInline({ models, onLinkCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 80);
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setName("");
    setAssignedModel("");
    setLink(null);
    setCopied(false);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!name.trim() || !assignedModel || loading) return;
    setLoading(true);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.CustomerOnboardingRequest.create({
      full_name: name.trim(),
      token,
      status: "pending",
      assigned_model: assignedModel,
      assigned_chatter: null,
      expires_at: expiresAt,
    });
    const generatedLink = `${window.location.origin}${createPageUrl("CustomerOnboarding")}?token=${token}&name=${encodeURIComponent(name.trim())}`;
    setLink(generatedLink);
    setLoading(false);
    if (onLinkCreated) onLinkCreated();
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleGenerate();
    if (e.key === "Escape") handleClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <Button
        onClick={() => setOpen(o => !o)}
        className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200"
      >
        <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_18_ifllg3.png" alt="" className="w-4 h-4 mr-2 object-contain" />
        Onboarding link
      </Button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-80 space-y-2.5"
          >
            {/* Close */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nový onboarding odkaz</p>
              <button onClick={handleClose} className="text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!link ? (
              <>
                <Input
                  ref={nameRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Jméno zákazníka..."
                  className="focus-visible:ring-[#C9A227] text-sm"
                />
                <Select value={assignedModel} onValueChange={setAssignedModel}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Vybrat modelku..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerate}
                  disabled={!name.trim() || !assignedModel || loading}
                  className="w-full bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white text-sm"
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generuji...</>
                    : "Vygenerovat ↵"}
                </Button>
              </>
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700">
                      {copied ? "Zkopírováno!" : "Vygenerováno a zkopírováno"}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 break-all font-mono leading-relaxed">{link}</p>
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    variant="outline"
                    className={`w-full text-xs ${copied ? "border-emerald-300 text-emerald-600" : ""}`}
                  >
                    {copied ? <><Check className="w-3 h-3 mr-1" /> Zkopírováno</> : <><Copy className="w-3 h-3 mr-1" /> Kopírovat znovu</>}
                  </Button>
                </div>
                <Button
                  onClick={() => { setName(""); setAssignedModel(""); setLink(null); setCopied(false); setTimeout(() => nameRef.current?.focus(), 50); }}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Nový odkaz
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}