import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, Building2, Mail, User, MessageSquare } from "lucide-react";

export default function RequestSpace() {
  const [form, setForm] = useState({ full_name: "", email: "", company_name: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.company_name) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await base44.entities.SpaceRequest.create({ ...form, status: "pending" });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-700/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Request Submitted!</h2>
          <p className="text-slate-400 text-sm">
            Your request has been sent to the platform administrator. You'll be contacted once your space is approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Request a Space</h1>
          <p className="text-slate-500 text-sm mt-1">Apply for your own agency workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Full name *
            </label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="John Smith"
              className="h-10 bg-[#252525] border-white/10 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email *
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              className="h-10 bg-[#252525] border-white/10 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Agency / Company name *
            </label>
            <Input
              value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              placeholder="My Agency Ltd."
              className="h-10 bg-[#252525] border-white/10 text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Message (optional)
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Tell us a bit about your use case..."
              rows={3}
              className="w-full rounded-md border border-white/10 bg-[#252525] text-slate-100 placeholder:text-slate-600 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#C9A227]/50"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl"
          >
            {saving ? "Submitting..." : "Submit Request"}
          </Button>

          <p className="text-center text-xs text-slate-600 mt-2">
            Already have an invite code?{" "}
            <a href="/JoinSpace" className="text-[#C9A227] hover:underline">Join a space →</a>
          </p>
        </form>
      </div>
    </div>
  );
}