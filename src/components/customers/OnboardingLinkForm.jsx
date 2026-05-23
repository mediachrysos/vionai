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

  return null;













































}