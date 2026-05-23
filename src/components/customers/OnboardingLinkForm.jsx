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
      expires_at: expiresAt,
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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 flex flex-col h-full">
      <h3 className="text-sm font-bold text-gray-800 mb-4">Přidej nového zákazníka</h3>

      <div className="flex flex-col gap-3 flex-1">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGenerate()}
            placeholder="Jméno zákazníka..."
            className="h-9 flex-1 text-sm bg-white border-gray-200 focus:border-[#C9A227]"
          />
          <Select value={assignedModel} onValueChange={setAssignedModel}>
            <SelectTrigger className="h-9 w-40 text-sm border-gray-200">
              <SelectValue placeholder="Modelka..." />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`h-9 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm
            ${copied
              ? "bg-emerald-500 text-white"
              : canGenerate
                ? "bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white hover:from-[#A8841C] hover:to-[#8a6c16]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : copied
              ? <><Check className="w-3.5 h-3.5" /> Zkopírováno!</>
              : <>
                  <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_18_ifllg3.png" alt="" className="w-4 h-4 object-contain" />
                  Onboarding link
                </>
          }
        </button>
      </div>
    </div>
  );
}