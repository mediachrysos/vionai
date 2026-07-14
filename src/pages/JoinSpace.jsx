import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock } from "lucide-react";

export default function JoinSpace() {
  const [status, setStatus] = useState("loading"); // loading | pending | already_in | error

  useEffect(() => {
    const init = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin("/JoinSpace");
        return;
      }
      const me = await base44.auth.me();
      if (me.space_id || me.account_status === "pending" || me.account_status === "active") {
        setStatus("already_in");
        return;
      }
      // Auto-register on waiting list — no code needed
      try {
        await base44.auth.updateMe({ account_status: "pending" });
        setStatus("pending");
      } catch {
        setStatus("error");
      }
    };
    init();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "already_in") {
    return (
      <FullPageCard>
        <StatusIcon icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-950/50 border-emerald-700/30" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Already registered</h2>
        <p className="text-slate-400 text-sm mb-6">Your account is already in the system.</p>
        <GoldButton onClick={() => window.location.replace("/Dashboard")}>Go to Dashboard →</GoldButton>
      </FullPageCard>
    );
  }

  if (status === "error") {
    return (
      <FullPageCard>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">Please try refreshing the page.</p>
        <GoldButton onClick={() => window.location.reload()}>Retry</GoldButton>
      </FullPageCard>
    );
  }

  // pending
  return (
    <FullPageCard>
      <StatusIcon icon={Clock} color="text-[#C9A227]" bg="bg-amber-950/50 border-amber-700/30" />
      <h2 className="text-xl font-bold text-slate-100 mb-2">You're on the waiting list!</h2>
      <p className="text-slate-400 text-sm mb-2">
        Your account is <span className="text-[#C9A227] font-semibold">pending approval</span> from an administrator.
      </p>
      <p className="text-xs text-slate-600">Once approved you'll have full access to the platform.</p>
    </FullPageCard>
  );
}

function FullPageCard({ children }) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl space-y-2">
        {children}
      </div>
    </div>
  );
}

function StatusIcon({ icon: Icon, color, bg }) {
  return (
    <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4 ${bg}`}>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
  );
}

function GoldButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold px-8 py-2.5 rounded-xl text-sm transition-all"
    >
      {children}
    </button>
  );
}