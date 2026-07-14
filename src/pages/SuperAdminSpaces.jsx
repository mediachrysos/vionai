import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, X, UserCheck } from "lucide-react";

export default function SuperAdminSpaces() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.User.list().then((u) => {
      setAllUsers(u);
      setPendingUsers(u.filter(usr => usr.account_status === "pending" && usr.role !== "admin"));
      setLoading(false);
    });
  }, []);

  const approveUser = async (user) => {
    await base44.entities.User.update(user.id, { account_status: "active" });
    setPendingUsers((p) => p.filter(u => u.id !== user.id));
  };

  const rejectUser = async (user) => {
    await base44.entities.User.update(user.id, { account_status: "blocked" });
    setPendingUsers((p) => p.filter(u => u.id !== user.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Platform Admin</h1>
          <p className="text-sm text-slate-500 mt-0.5">Waiting list & approval queue</p>
        </div>

        {/* Waiting list */}
        <div className="space-y-3">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-600 text-sm flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-slate-700" />
              All caught up — no pending users.
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Waiting for approval ({pendingUsers.length})
              </p>
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                      {(user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100">{user.full_name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => rejectUser(user)} className="h-8 px-3 text-xs font-semibold border border-red-900/40 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1">
                        <X className="w-3 h-3" /> Reject
                      </button>
                      <button onClick={() => approveUser(user)} className="h-8 px-3 text-xs font-semibold bg-emerald-950/50 border border-emerald-700/30 text-emerald-400 hover:bg-emerald-950/70 rounded-lg transition-colors flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  );
}