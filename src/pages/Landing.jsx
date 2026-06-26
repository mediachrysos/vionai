import { base44 } from "@/api/base44Client";
import { useEffect, useState } from "react";
import { Building2, Users, BarChart3, Shield, Zap, ArrowRight, CheckCircle } from "lucide-react";

export default function Landing() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    base44.auth.isAuthenticated().then((auth) => {
      if (auth) window.location.replace("/Dashboard");
      else setCheckingAuth(false);
    });
  }, []);

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogin = () => {
    base44.auth.redirectToLogin("/Dashboard");
  };

  const handleJoinTeam = () => {
    base44.auth.redirectToLogin("/JoinSpace");
  };

  const handleRequestSpace = () => {
    window.location.href = "/RequestSpace";
  };

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
          onClick={handleLogin}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Sign in →
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
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
          and monitor performance — built for modern adult content agencies.
        </p>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-6">
          {/* Join team */}
          <button
            onClick={handleJoinTeam}
            className="group relative bg-[#1e1e1e] border border-white/10 hover:border-[#C9A227]/40 rounded-2xl p-6 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.1)] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Join a Team</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Have an invite code? Join your team's existing workspace.
            </p>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-5 right-5 transition-colors" />
          </button>

          {/* New workspace */}
          <button
            onClick={handleRequestSpace}
            className="group relative bg-gradient-to-br from-[#C9A227]/10 to-[#A8841C]/5 border border-[#C9A227]/20 hover:border-[#C9A227]/50 rounded-2xl p-6 text-left transition-all hover:shadow-[0_0_24px_rgba(201,162,39,0.15)] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-[#C9A227]" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Set Up New Workspace</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Start your own agency space. Request access from our team.
            </p>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-[#C9A227] absolute bottom-5 right-5 transition-colors" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Already have an account?{" "}
          <button onClick={handleLogin} className="text-[#C9A227] hover:underline">Sign in here</button>
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: BarChart3,
              color: "text-emerald-400",
              bg: "bg-emerald-950/30 border-emerald-700/20",
              title: "Revenue Tracking",
              desc: "Real-time dashboards, payment logging, monthly goals and model ROI — everything visible at a glance.",
            },
            {
              icon: Users,
              color: "text-violet-400",
              bg: "bg-violet-950/30 border-violet-700/20",
              title: "Team Management",
              desc: "Manage chatters, designers, and models. Assign permissions, track shifts and daily performance.",
            },
            {
              icon: Shield,
              color: "text-[#C9A227]",
              bg: "bg-amber-950/20 border-amber-700/20",
              title: "Role-based Access",
              desc: "Each team member sees only what they need. Admins stay in control of the full picture.",
            },
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-slate-600">© 2026 ChatterOS · All rights reserved</p>
      </footer>
    </div>
  );
}