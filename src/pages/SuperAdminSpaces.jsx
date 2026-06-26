import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Users, KeyRound, Copy, CheckCircle, RefreshCw, Plus, ChevronRight, Clock, X, UserCheck, AlertCircle } from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += "-";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function SuperAdminSpaces({ currentUser }) {
  const [spaces, setSpaces] = useState([]);
  const [spaceRequests, setSpaceRequests] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]); // users with space_id + account_status=pending
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [activeSpaceId, setActiveSpaceId] = useState(currentUser?.active_space_id || null);
  const [activeTab, setActiveTab] = useState("spaces"); // "spaces" | "requests" | "members"

  useEffect(() => {
    Promise.all([
      base44.entities.Space.list("-created_date", 100),
      base44.entities.SpaceRequest.filter({ status: "pending" }, "-created_date"),
      base44.entities.User.list(),
    ]).then(([s, sr, u]) => {
      setSpaces(s);
      setSpaceRequests(sr);
      setAllUsers(u);
      setPendingUsers(u.filter(usr => usr.space_id && usr.account_status === "pending"));
      setLoading(false);
    });
  }, []);

  // Real member count per space from User entity
  const memberCountFor = (spaceId) => allUsers.filter(u => u.space_id === spaceId).length;

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const regenerateCode = async (space) => {
    if (!window.confirm("Regenerate invite code? Old code stops working.")) return;
    const newCode = generateCode();
    await base44.entities.Space.update(space.id, { invite_code: newCode });
    setSpaces((p) => p.map((s) => s.id === space.id ? { ...s, invite_code: newCode } : s));
  };

  const toggleStatus = async (space) => {
    const newStatus = space.status === "active" ? "suspended" : "active";
    await base44.entities.Space.update(space.id, { status: newStatus });
    setSpaces((p) => p.map((s) => s.id === space.id ? { ...s, status: newStatus } : s));
  };

  const createSpace = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const space = await base44.entities.Space.create({
      name: newName.trim(),
      owner_email: newEmail.trim() || "",
      invite_code: generateCode(),
      status: "active",
      member_count: 0,
    });
    setSpaces((p) => [space, ...p]);
    setNewName("");
    setNewEmail("");
    setCreating(false);
  };

  const enterSpace = async (space) => {
    await base44.auth.updateMe({ active_space_id: space.id });
    setActiveSpaceId(space.id);
    window.location.replace("/Dashboard");
  };

  const exitSpaceView = async () => {
    await base44.auth.updateMe({ active_space_id: null });
    setActiveSpaceId(null);
    window.location.replace("/Dashboard");
  };

  // Approve SpaceRequest → create Space + notify
  const approveSpaceRequest = async (req) => {
    const code = generateCode();
    const space = await base44.entities.Space.create({
      name: req.company_name || req.full_name,
      owner_email: req.email,
      owner_name: req.full_name,
      invite_code: code,
      status: "active",
      member_count: 0,
    });
    await base44.entities.SpaceRequest.update(req.id, { status: "approved", created_space_id: space.id });
    setSpaceRequests((p) => p.filter(r => r.id !== req.id));
    setSpaces((p) => [space, ...p]);
  };

  const rejectSpaceRequest = async (req) => {
    await base44.entities.SpaceRequest.update(req.id, { status: "rejected" });
    setSpaceRequests((p) => p.filter(r => r.id !== req.id));
  };

  // Approve pending user → set account_status active, optionally set role
  const approveUser = async (user) => {
    await base44.auth.updateMe && null; // can't updateMe for other users
    // We update via User entity — set account_status active
    await base44.entities.User.update(user.id, { account_status: "active" });
    setPendingUsers((p) => p.filter(u => u.id !== user.id));
    setAllUsers((p) => p.map(u => u.id === user.id ? { ...u, account_status: "active" } : u));
  };

  const rejectUser = async (user) => {
    await base44.entities.User.update(user.id, { account_status: "blocked", space_id: null });
    setPendingUsers((p) => p.filter(u => u.id !== user.id));
    setAllUsers((p) => p.map(u => u.id === user.id ? { ...u, account_status: "blocked", space_id: null } : u));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
      </div>
    );
  }

  const pendingCount = spaceRequests.length + pendingUsers.length;

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Platform Admin</h1>
            <p className="text-sm text-slate-500 mt-0.5">All tenants & approval queue</p>
          </div>
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 h-9 px-4 text-sm font-semibold bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/20 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New Space
          </button>
        </div>

        {/* Active space banner */}
        {activeSpaceId && (
          <div className="bg-amber-950/30 border border-[#C9A227]/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C9A227] animate-pulse" />
              <span className="text-sm text-[#C9A227] font-semibold">
                Viewing: {spaces.find(s => s.id === activeSpaceId)?.name || "Unknown Space"}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">— Dashboard shows this space's data</span>
            </div>
            <button onClick={exitSpaceView} className="text-xs text-slate-400 hover:text-slate-200 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
              Exit Space View
            </button>
          </div>
        )}

        {/* Create Space Form */}
        {creating && (
          <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3">Create New Space</p>
            <form onSubmit={createSpace} className="flex items-center gap-3 flex-wrap">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Space / agency name"
                className="flex-1 min-w-[160px] h-9 bg-[#252525] border border-white/10 rounded-lg px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C9A227]/40" />
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Owner email (optional)"
                className="flex-1 min-w-[160px] h-9 bg-[#252525] border border-white/10 rounded-lg px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#C9A227]/40" />
              <button type="submit" disabled={!newName.trim()} className="h-9 px-4 text-sm font-semibold bg-[#C9A227] hover:bg-[#A8841C] text-white rounded-lg transition-colors disabled:opacity-40">Create</button>
              <button type="button" onClick={() => setCreating(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1e1e1e] border border-white/10 rounded-xl p-1">
          {[
            { key: "spaces", label: `Spaces (${spaces.length})` },
            { key: "requests", label: `Approval Queue`, badge: pendingCount },
          ].map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === key ? "bg-[#252525] text-slate-100" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Spaces Tab */}
        {activeTab === "spaces" && (
          <div className="space-y-3">
            {spaces.length === 0 && <div className="text-center py-16 text-slate-600 text-sm">No spaces yet.</div>}
            {spaces.map((space) => {
              const memberCount = memberCountFor(space.id);
              return (
                <div key={space.id} className={`bg-[#1e1e1e] border rounded-xl px-5 py-4 transition-all ${
                  activeSpaceId === space.id ? "border-[#C9A227]/40 shadow-[0_0_16px_rgba(201,162,39,0.1)]" : "border-white/10 hover:border-white/20"
                }`}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-100">{space.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          space.status === "active" ? "bg-emerald-950/50 text-emerald-400 border-emerald-700/30" : "bg-red-950/50 text-red-400 border-red-700/30"
                        }`}>{space.status}</span>
                        {activeSpaceId === space.id && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-950/50 text-[#C9A227] border border-[#C9A227]/30">active view</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {space.owner_email && <p className="text-xs text-slate-500">{space.owner_email}</p>}
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <Users className="w-3 h-3" /> {memberCount} member{memberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {/* Invite code */}
                    <div className="flex items-center gap-1.5 bg-[#252525] border border-white/10 rounded-lg px-3 py-2 flex-shrink-0">
                      <KeyRound className="w-3 h-3 text-[#C9A227]" />
                      <span className="text-xs font-mono font-bold text-[#C9A227] tracking-widest">{space.invite_code}</span>
                      <button onClick={() => copyCode(space.invite_code, space.id)} className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
                        {copiedId === space.id ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button onClick={() => regenerateCode(space)} className="text-slate-500 hover:text-amber-400 transition-colors">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleStatus(space)} className={`h-8 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                        space.status === "active" ? "border-red-900/40 text-red-400 hover:bg-red-950/30" : "border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/30"
                      }`}>
                        {space.status === "active" ? "Suspend" : "Activate"}
                      </button>
                      <button onClick={() => enterSpace(space)} className="h-8 px-3 text-xs font-semibold bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/20 rounded-lg transition-colors flex items-center gap-1">
                        Enter <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Approval Queue Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">

            {/* New Space Requests */}
            {spaceRequests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">New Workspace Requests</p>
                <div className="space-y-2">
                  {spaceRequests.map((req) => (
                    <div key={req.id} className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-4">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-xl bg-violet-950/50 border border-violet-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-100">{req.company_name}</p>
                          <p className="text-xs text-slate-400">{req.full_name} · {req.email}</p>
                          {req.message && <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>}
                          <p className="text-[10px] text-slate-600 mt-1">{new Date(req.created_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => rejectSpaceRequest(req)} className="h-8 px-3 text-xs font-semibold border border-red-900/40 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1">
                            <X className="w-3 h-3" /> Reject
                          </button>
                          <button onClick={() => approveSpaceRequest(req)} className="h-8 px-3 text-xs font-semibold bg-emerald-950/50 border border-emerald-700/30 text-emerald-400 hover:bg-emerald-950/70 rounded-lg transition-colors flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Team Members */}
            {pendingUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pending Team Members</p>
                <div className="space-y-2">
                  {pendingUsers.map((user) => {
                    const space = spaces.find(s => s.id === user.space_id);
                    return (
                      <div key={user.id} className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                            {(user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{user.full_name || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                            {space && (
                              <p className="text-xs text-slate-600 mt-0.5">→ <span className="text-slate-400">{space.name}</span></p>
                            )}
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
                    );
                  })}
                </div>
              </div>
            )}

            {pendingCount === 0 && (
              <div className="text-center py-16 text-slate-600 text-sm flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-slate-700" />
                All caught up — no pending requests.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}