import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Clock, Copy, RefreshCw, Building2, Users, KeyRound } from "lucide-react";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += "-";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function SpacesAdmin() {
  const [requests, setRequests] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [reqs, sps] = await Promise.all([
      base44.entities.SpaceRequest.filter({ status: "pending" }),
      base44.entities.Space.list("-created_date", 100),
    ]);
    setRequests(reqs);
    setSpaces(sps);
    setLoading(false);
  };

  const approveRequest = async (req) => {
    const inviteCode = generateCode();
    // Create the space
    const space = await base44.entities.Space.create({
      name: req.company_name || req.full_name + "'s Space",
      owner_email: req.email,
      owner_name: req.full_name,
      invite_code: inviteCode,
      status: "active",
      member_count: 1,
    });
    // Update request
    await base44.entities.SpaceRequest.update(req.id, {
      status: "approved",
      created_space_id: space.id,
    });
    setRequests((p) => p.filter((r) => r.id !== req.id));
    setSpaces((p) => [space, ...p]);
  };

  const rejectRequest = async (req) => {
    if (!window.confirm(`Reject request from ${req.full_name}?`)) return;
    await base44.entities.SpaceRequest.update(req.id, { status: "rejected" });
    setRequests((p) => p.filter((r) => r.id !== req.id));
  };

  const toggleSpaceStatus = async (space) => {
    const newStatus = space.status === "active" ? "suspended" : "active";
    await base44.entities.Space.update(space.id, { status: newStatus });
    setSpaces((p) => p.map((s) => s.id === space.id ? { ...s, status: newStatus } : s));
  };

  const regenerateCode = async (space) => {
    if (!window.confirm("Regenerate invite code? The old code will stop working.")) return;
    const newCode = generateCode();
    await base44.entities.Space.update(space.id, { invite_code: newCode });
    setSpaces((p) => p.map((s) => s.id === space.id ? { ...s, invite_code: newCode } : s));
  };

  const createAdminSpace = async () => {
    const name = window.prompt("Space name (e.g. your agency name):");
    if (!name) return;
    const me = await base44.auth.me();
    const inviteCode = generateCode();
    const space = await base44.entities.Space.create({
      name,
      owner_email: me.email,
      owner_name: me.full_name,
      invite_code: inviteCode,
      status: "active",
      member_count: 1,
    });
    setSpaces((p) => [space, ...p]);
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending requests ({requests.length})
          </p>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="bg-amber-950/20 border border-amber-700/30 rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-950/50 border border-amber-700/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-amber-400">{(req.full_name || "?")[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{req.full_name}</p>
                  <p className="text-xs text-slate-400">{req.email} · <span className="text-[#C9A227]">{req.company_name}</span></p>
                  {req.message && <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveRequest(req)}
                    className="h-7 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button
                    onClick={() => rejectRequest(req)}
                    className="h-7 px-3 text-xs font-semibold border border-red-900/40 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-xs text-slate-600 italic">No pending space requests.</p>
      )}

      {/* Create Admin Space */}
      <div className="flex justify-end">
        <button
          onClick={createAdminSpace}
          className="h-8 px-4 text-xs font-semibold bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/20 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Building2 className="w-3 h-3" /> Create Admin Space
        </button>
      </div>

      {/* Active Spaces */}
      {spaces.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active spaces ({spaces.length})</p>
          <div className="space-y-2">
            {spaces.map((space) => (
              <div key={space.id} className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-white/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-100">{space.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      space.status === "active"
                        ? "bg-emerald-950/50 text-emerald-400 border-emerald-700/30"
                        : "bg-red-950/50 text-red-400 border-red-700/30"
                    }`}>
                      {space.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-slate-500">{space.owner_email}</p>
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Users className="w-3 h-3" /> {space.member_count || 0} members
                    </span>
                  </div>
                </div>

                {/* Invite code */}
                <div className="flex items-center gap-1.5 bg-[#252525] border border-white/10 rounded-lg px-3 py-1.5">
                  <KeyRound className="w-3 h-3 text-[#C9A227]" />
                  <span className="text-xs font-mono font-bold text-[#C9A227] tracking-widest">{space.invite_code}</span>
                  <button
                    onClick={() => copyCode(space.invite_code, space.id)}
                    className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Copy code"
                  >
                    {copiedId === space.id ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => regenerateCode(space)}
                    className="text-slate-500 hover:text-amber-400 transition-colors"
                    title="Regenerate code"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => toggleSpaceStatus(space)}
                  className={`h-7 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                    space.status === "active"
                      ? "border-red-900/40 text-red-400 hover:bg-red-950/30"
                      : "border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/30"
                  }`}
                >
                  {space.status === "active" ? "Suspend" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}