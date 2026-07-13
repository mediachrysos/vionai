import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

export default function OnboardingLinkForm({ models = [], currentUser }) {
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
    const selectedModel = models.find(m => m.id === assignedModel);
    const company = selectedModel?.company || "Chrysos Media";
    await base44.entities.CustomerOnboardingRequest.create({
      full_name: name.trim(),
      token,
      status: "pending",
      assigned_model: assignedModel,
      assigned_chatter: currentUser?.role === "admin" ? null : currentUser?.email || null,
      company,
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
    <div className="flex items-end gap-2 flex-wrap">
      <div className="min-w-44">
        <label className="text-xs font-semibold text-slate-500 block mb-1.5">Name *</label>
         <Input
           placeholder="Customer name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {models.length > 0 && (
        <div className="min-w-44">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Model *</label>
           <Select value={assignedModel} onValueChange={setAssignedModel}>
             <SelectTrigger className="h-9 text-sm">
               <SelectValue placeholder="Select model..." />
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
        className="h-9 bg-gradient-to-br from-[#C9A227] to-[#A8841C] hover:shadow-lg disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          "Generate & copy"
        )}
      </Button>
    </div>
  );
}