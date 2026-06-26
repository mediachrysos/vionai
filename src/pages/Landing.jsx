import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";
import { Building2, Users, BarChart3, Shield, Zap, ArrowRight, KeyRound, CheckCircle, User, Mail, MessageSquare, X, ChevronLeft } from "lucide-react";

// ─── Unified Landing with Login + Register flow ───────────────────────────────

export default function Landing() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  // view: "home" | "register" | "join" | "request" | "success"
  const [view, setView] = useState("home");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    base44.auth.isAuthenticated().then((auth) => {
      if (auth) {
        // Logged in — redirect based on profile
        base44.auth.me().then((me) => {
          if (me?.space_id || me?.role === "admin") {
            window.location.replace("/Dashboard");
          } else {
            // Has account but no space — show join/request
            setCheckingAuth(false);
          }
        }).catch(() => window.location.replace("/Dashboard"));
      } else {
        setCheckingAuth(false);
      }
    });
  }, []);

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-slate-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-md">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-100 tracking-tight">ChatterOS</span>
        </div>
        <button
          onClick={() => base44.auth.redirectToLogin("/Dashboard")}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Sign in →
        </button>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6">
        {view === "home" && <HomeView setView={setView} setSuccessMsg={setSuccessMsg} />}
        {view === "register" && <RegisterChoiceView setView={setView} />}
        {view === "join" && <JoinSpaceView setView={setView} setSuccessMsg={setSuccessMsg} />}
        {view === "request" && <RequestSpaceView setView={setView} setSuccessMsg={setSuccessMsg} />}
        {view === "success" && <SuccessView message={successMsg} />}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center mt-12">
        <p className="text-xs text-slate-600">© 2026 ChatterOS · All rights reserved</p>
      </footer>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ setView }) {
  return (
    <section className="pt-20 pb-16 text-center">
      <div className="inline-flex items-center gap-2 bg-[#C9A227]/10 border border-[#C9A227]/20 rounded-full px-4 py-1.5 mb-8">
        <div className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-pulse" />
        <span className="text-xs font-semibold text-[#C9A227] tracking-wide uppercase">Agency Management Platform</span>
      </div>

      <h1 className="text-5xl font-bold text-slate-100 leading-tight mb-6">
        Manage your agency<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] to-[#e8c84a]">
          all in one place
        </span>
      </h1>

      <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
        Track revenue, manage your team of chatters and models, handle customer relationships,
        and monitor performance — built for modern content agencies.
      </p>

      {/* CTA Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-6">
        <button
          onClick={() => base44.auth.redirectToLogin("/Dashboard")}
          className="group relative bg-gradient-to-br from-[#C9A227]/10 to-[#A8841C]/5 border border-[#C9A227]/20 hover:border-[#C9A227]/50 rounded-2xl p-6 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.15)] hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center mb-4">
            <Zap className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1">Sign In</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Already have an account? Sign in to access your workspace.
          </p>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-5 right-5 transition-colors" />
        </button>

        <button
          onClick={() => setView("register")}
          className="group relative bg-[#1e1e1e] border border-white/10 hover:border-[#C9A227]/40 rounded-2xl p-6 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.1)] hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1">Register</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            New here? Create a workspace or join an existing team.
          </p>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-5 right-5 transition-colors" />
        </button>
      </div>

      {/* Feature strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto mt-16">
        {[
          { icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-700/20", title: "Revenue Tracking", desc: "Real-time dashboards, payment logging, monthly goals and model ROI." },
          { icon: Users, color: "text-violet-400", bg: "bg-violet-950/30 border-violet-700/20", title: "Team Management", desc: "Manage chatters, designers, models. Track shifts and daily performance." },
          { icon: Shield, color: "text-[#C9A227]", bg: "bg-amber-950/20 border-amber-700/20", title: "Role-based Access", desc: "Each team member sees only what they need. Admins stay in control." },
        ].map(({ icon: Icon, color, bg, title, desc }) => (
          <div key={title} className={`rounded-2xl border p-5 ${bg}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1.5">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Register Choice ───────────────────────────────────────────────────────────
function RegisterChoiceView({ setView }) {
  return (
    <section className="pt-20 pb-16 text-center">
      <BackButton onClick={() => setView("home")} />
      <h2 className="text-3xl font-bold text-slate-100 mb-3 mt-6">Get Started</h2>
      <p className="text-slate-400 text-sm mb-10">How would you like to join ChatterOS?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <button
          onClick={() => setView("request")}
          className="group relative bg-gradient-to-br from-[#C9A227]/10 to-[#A8841C]/5 border border-[#C9A227]/20 hover:border-[#C9A227]/50 rounded-2xl p-7 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.15)] hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center mb-4">
            <Building2 className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1.5">Create New Workspace</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Start your own agency space. Submit a request and we'll set it up for you.
          </p>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-6 right-6 transition-colors" />
        </button>

        <button
          onClick={() => setView("join")}
          className="group relative bg-[#1e1e1e] border border-white/10 hover:border-[#C9A227]/40 rounded-2xl p-7 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.1)] hover:-translate-y-0.5"
        >
          <div className="w-11 h-11 rounded-xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1.5">Join a Team</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Have an invite code from your admin? Enter it to request access to the team.
          </p>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-6 right-6 transition-colors" />
        </button>
      </div>
    </section>
  );
}

// ─── Join Space (with code) ────────────────────────────────────────────────────
function JoinSpaceView({ setView, setSuccessMsg }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [step, setStep] = useState(1); // 1 = enter code, 2 = confirm space + register

  const handleCheckCode = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const spaces = await base44.entities.Space.filter({ invite_code: trimmed });
      if (!spaces || spaces.length === 0) {
        setError("Invalid invite code. Please check and try again.");
        setLoading(false);
        return;
      }
      const space = spaces[0];
      if (space.status !== "active") {
        setError("This space is currently inactive. Contact the space owner.");
        setLoading(false);
        return;
      }
      setSpaceName(space.name);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAndJoin = async () => {
    // Redirect to login/register, after auth they'll be on JoinSpace page with code prefilled
    // We store the code in sessionStorage so JoinSpace page can auto-submit
    sessionStorage.setItem("pending_invite_code", code.trim().toUpperCase());
    base44.auth.redirectToLogin("/JoinSpace");
  };

  return (
    <section className="pt-20 pb-16 flex flex-col items-center">
      <BackButton onClick={() => setView("register")} />
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-xl mt-6">
        <div className="text-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center mx-auto mb-4 w-14 h-14">
            <KeyRound className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Join a Team</h2>
          <p className="text-slate-500 text-sm mt-1">Enter the invite code from your admin</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleCheckCode} className="space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              maxLength={20}
              className="w-full h-12 bg-[#252525] border border-white/10 rounded-xl px-4 text-center text-lg font-mono font-bold tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C9A227]/50"
            />
            {error && <p className="text-xs text-red-400 bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl disabled:opacity-40 transition-all"
            >
              {loading ? "Checking..." : "Verify Code"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Code verified!</p>
                <p className="text-xs text-slate-400">Team: <span className="text-slate-200 font-medium">{spaceName}</span></p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              You'll be asked to sign in or create an account. Once done, your request will be sent to the admin for approval.
            </p>
            <button
              onClick={handleRegisterAndJoin}
              className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl transition-all"
            >
              Continue to Sign In / Register →
            </button>
            <button onClick={() => setStep(1)} className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              ← Enter a different code
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Request New Space ─────────────────────────────────────────────────────────
function RequestSpaceView({ setView, setSuccessMsg }) {
  const [form, setForm] = useState({ full_name: "", email: "", company_name: "", message: "" });
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
      setSuccessMsg("Your request has been submitted! We'll review it and get back to you shortly.");
      setView("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs font-semibold text-slate-400 block mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full h-10 bg-[#252525] border border-white/10 rounded-lg px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C9A227]/50"
      />
    </div>
  );

  return (
    <section className="pt-20 pb-16 flex flex-col items-center">
      <BackButton onClick={() => setView("register")} />
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-xl mt-6">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Request a Workspace</h2>
          <p className="text-slate-500 text-sm mt-1">We'll review your request and set it up</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field("full_name", "Full name *", "text", "John Smith")}
          {field("email", "Email *", "email", "you@example.com")}
          {field("company_name", "Agency / Company name *", "text", "My Agency Ltd.")}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Message (optional)</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Tell us a bit about your use case..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-[#252525] text-slate-100 placeholder:text-slate-600 text-sm px-3 py-2 resize-none focus:outline-none focus:border-[#C9A227]/50"
            />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl disabled:opacity-40 transition-all"
          >
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── Success ───────────────────────────────────────────────────────────────────
function SuccessView({ message }) {
  return (
    <section className="pt-20 pb-16 flex flex-col items-center">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-700/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Request Submitted!</h2>
        <p className="text-slate-400 text-sm">{message}</p>
        <a href="/" className="inline-block mt-6 text-xs text-[#C9A227] hover:underline">← Back to home</a>
      </div>
    </section>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────────
function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors self-start"
    >
      <ChevronLeft className="w-3.5 h-3.5" /> Back
    </button>
  );
}