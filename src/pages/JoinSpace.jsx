import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function JoinSpace() {
  const [status, setStatus] = useState("loading"); // loading | done | error

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin();
          return;
        }
        const me = await base44.auth.me();
        // Already active — go to dashboard
        if (me?.account_status === "active") {
          window.location.replace("/Dashboard");
          return;
        }
        // Already pending — just show the waiting screen
        if (me?.account_status === "pending") {
          setStatus("done");
          return;
        }
        // New user — set pending so admin can approve
        await base44.auth.updateMe({ account_status: "pending" });
        setStatus("done");
      } catch (e) {
        setStatus("error");
      }
    };
    init();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center p-8">
          <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-xs text-slate-500 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="text-center max-w-sm p-8">
        <div className="w-14 h-14 rounded-full bg-amber-950/50 border border-amber-700/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⏳</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-2">You're on the waiting list</h2>
        <p className="text-sm text-slate-400">Your account is pending approval by an administrator. You'll get access once approved.</p>
        <button
          onClick={() => base44.auth.logout()}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 underline"
        >
          Log out
        </button>
      </div>
    </div>
  );
}