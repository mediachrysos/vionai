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
    <div className="bg-white rounded-2xl border border-gray-100 p-4 h-full flex flex-col">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
        🔗 Onboarding link
      </h3>
      <div className="flex flex-col gap-3 flex-1">
        <Input
          placeholder="Jméno zákazníka *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-sm"
        />
        {models.length > 0 && (
          <Select value={assignedModel} onValueChange={setAssignedModel}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Vybrat modelku *" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="mt-auto h-9 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : copied ? (
            <><Check className="w-4 h-4" /> Zkopírováno!</>
          ) : (
            "Vygenerovat & zkopírovat"
          )}
        </button>
      </div>
    </div>
  );









































}