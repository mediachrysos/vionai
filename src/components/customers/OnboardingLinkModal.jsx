import React, { useState } from "react";
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

  const reset = () => {
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
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-500" />
            Vygenerovat onboarding odkaz
          </DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 mt-2">
            <div>
              <Label>Celé jméno zákazníka *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jan Novák"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Přiřazená modelka</Label>
              <Select value={assignedModel} onValueChange={setAssignedModel}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat (volitelné)" /></SelectTrigger>
                <SelectContent>
                  {models?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Přiřazený chatter</Label>
              <Select value={assignedChatter} onValueChange={setAssignedChatter}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat (volitelné)" /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Zrušit</Button>
              <Button
                onClick={handleGenerate}
                disabled={!name.trim() || loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generuji...</> : "Vygenerovat odkaz"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-500">
              Odkaz byl vygenerován. Pošlete ho zákazníkovi <strong>{name}</strong> do chatu.
              Po vyplnění formuláře se automaticky zobrazí v databázi zákazníků.
            </p>
            <div className="flex gap-2 items-center bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
              <span className="text-xs text-gray-600 flex-1 truncate">{generatedLink}</span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Nový odkaz</Button>
              <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">Hotovo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}