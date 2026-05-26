import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export default function OnboardingLinkForm({ models = [] }) {
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const canGenerate = name.trim() && assignedModel && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.CustomerOnboardingRequest.create({
      full_name: name.trim(),
      token,
      status: "pending",
      assigned_model: assignedModel,
      assigned_chatter: null,
      expires_at: expiresAt
    });
    const link = `${window.location.origin}/CustomerOnboarding?token=${token}&name=${encodeURIComponent(name.trim())}`;
    navigator.clipboard.writeText(link);
    setLoading(false);
    setCopied(true);
    setName("");
    setAssignedModel("");
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-9 bg-gradient-to-br from-[#C9A227] to-[#A8841C] hover:shadow-lg text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Onboarding link
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Vygenerovat onboarding odkaz</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-2">Jméno zákazníka *</label>
              <Input
                placeholder="Zadej jméno..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            
            {models.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Vybrat modelku *</label>
                <Select value={assignedModel} onValueChange={setAssignedModel}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Vyber modelku..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="h-9 bg-gradient-to-br from-[#C9A227] to-[#A8841C] hover:shadow-lg disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generuji...
                </>
              ) : copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Zkopírováno!
                </>
              ) : (
                "Vygenerovat & zkopírovat"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}