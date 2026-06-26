import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, KeyRound, Users } from "lucide-react";

export default function JoinSpace() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [spaceName, setSpaceName] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      // Check if user is authenticated
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      const me = await base44.auth.me();

      // Find space by invite code
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

      // Check if user is already in a space
      if (me.space_id) {
        setError("You are already a member of a space.");
        setLoading(false);
        return;
      }

      // Assign user to this space
      await base44.auth.updateMe({ space_id: space.id });

      // Increment member count
      await base44.entities.Space.update(space.id, {
        member_count: (space.member_count || 0) + 1,
      });

      setSpaceName(space.name);
      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-700/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">You've joined!</h2>
          <p className="text-slate-400 text-sm mb-6">
            You are now a member of <span className="text-[#C9A227] font-semibold">{spaceName}</span>.
          </p>
          <Button
            onClick={() => window.location.replace("/")}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold px-8"
          >
            Go to Dashboard →
          </Button>
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
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Join a Space</h1>
          <p className="text-slate-500 text-sm mt-1">Enter the invite code from your team admin</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> Invite Code *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              maxLength={20}
              className="h-12 bg-[#252525] border-white/10 text-slate-100 placeholder:text-slate-600 text-center text-lg font-mono tracking-widest"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full h-11 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white font-semibold text-sm rounded-xl"
          >
            {loading ? "Checking..." : "Join Space"}
          </Button>

          <p className="text-center text-xs text-slate-600 mt-2">
            Want your own space?{" "}
            <a href="/RequestSpace" className="text-[#C9A227] hover:underline">Request access →</a>
          </p>
        </form>
      </div>
    </div>
  );
}