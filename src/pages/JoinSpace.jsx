import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, KeyRound, Users, Clock } from "lucide-react";

// After auth redirect from Landing, auto-submit the stored invite code
export default function JoinSpace() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | success | pending | already_in

  const [autoJoining, setAutoJoining] = useState(true);

  useEffect(() => {
    const init = async () => {
      const pendingCode = sessionStorage.getItem("pending_invite_code");
      if (pendingCode) {
        sessionStorage.removeItem("pending_invite_code");
        setCode(pendingCode);
        setAutoJoining(false);
        processJoin(pendingCode);
        return;
      }
      // Always require the user to enter the invite code manually
      setAutoJoining(false);
    };
    init();
  }, []);

  const processJoin = async (inviteCode) => {
    const trimmed = (inviteCode || code).trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        sessionStorage.setItem("pending_invite_code", trimmed);
        base44.auth.redirectToLogin("/JoinSpace");
        return;
      }
      const me = await base44.auth.me();

      if (me.space_id) {
        setStatus("already_in");
        setLoading(false);
        return;
      }

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

      // Assign user to space, set pending status for admin approval
      await base44.auth.updateMe({
        space_id: space.id,
        account_status: "pending",
      });

      setStatus("pending");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processJoin(code);
  };

  if (status === "already_in") {
    return (
      <FullPageCard>
        <StatusIcon icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-950/50 border-emerald-700/30" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Already in a Space</h2>
        <p className="text-slate-400 text-sm mb-6">You are already a member of a workspace.</p>
        <GoldButton onClick={() => window.location.replace("/Dashboard")}>Go to Dashboard →</GoldButton>
      </FullPageCard>
    );
  }

  if (status === "pending") {
    return (
      <FullPageCard>
        <StatusIcon icon={Clock} color="text-[#C9A227]" bg="bg-amber-950/50 border-amber-700/30" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Request Sent!</h2>
        <p className="text-slate-400 text-sm mb-2">
          You've been added to the space. Your account is now <span className="text-[#C9A227] font-semibold">pending approval</span> from the admin.
        </p>
        <p className="text-xs text-slate-600">Once approved and assigned a role, you'll have full access.</p>
      </FullPageCard>
    );
  }

  if (autoJoining || loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Join a Space</h1>
          <p className="text-slate-500 text-sm mt-1">Enter the invite code from your team admin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> Invite Code *
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              maxLength={20}
              className="w-full h-12 bg-[#252525] border border-white/10 rounded-xl px-4 text-center text-lg font-mono font-bold tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C9A227]/50"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl disabled:opacity-40 transition-all"
          >
            {loading ? "Joining..." : "Join Space"}
          </button>

          <p className="text-center text-xs text-slate-600 mt-2">
            Want your own space?{" "}
            <a href="/RequestSpace" className="text-[#C9A227] hover:underline">Request access →</a>
          </p>
        </form>
      </div>
    </div>
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