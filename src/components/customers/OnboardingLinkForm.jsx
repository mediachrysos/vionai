import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export default function OnboardingLinkForm({ models = [] }) {
  const [name, setName] = useState("");
  const [assignedModel, setAssignedModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">Jméno zákazníka *</label>
          <Input
            placeholder=""
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm" />
        </div>
        
        {models.length > 0 &&
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">Vybrat modelku *</label>
          <Select value={assignedModel} onValueChange={setAssignedModel}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) =>
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              )}
              </SelectContent>
            </Select>
        </div>
        }
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="h-8 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors bg-[#c09a24]">
          
          {loading ?
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
          copied ?
          <><Check className="w-3.5 h-3.5" /> Zkopírováno!</> :

          "Vygenerovat & zkopírovat"
          }
        </button>
      </div>
    </div>);










































}