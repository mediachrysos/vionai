import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, CheckCircle, XCircle, Users } from "lucide-react";

const statusConfig = {
  pending: { label: "Čeká na schválení", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Schváleno", color: "bg-green-100 text-green-700", icon: CheckCircle },
  blocked: { label: "Zablokováno", color: "bg-red-100 text-red-700", icon: XCircle },
};

const roleConfig = {
  admin: { label: "Admin", color: "bg-violet-100 text-violet-700" },
  user: { label: "Uživatel", color: "bg-blue-100 text-blue-700" },
  chatter: { label: "Chatter", color: "bg-indigo-100 text-indigo-700" },
};

export default function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role !== "admin") return;
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    const data = await base44.entities.User.list("-created_date", 100);
    setUsers(data);
    setLoading(false);
  };

  const updateUser = async (userId, changes) => {
    await base44.entities.User.update(userId, changes);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Přístup odepřen</h2>
          <p className="text-sm text-gray-500 mt-1">Tato stránka je pouze pro administrátory.</p>
        </div>
      </div>
    );
  }

  const pending = users.filter(u => u.account_status === "pending");
  const others = users.filter(u => u.account_status !== "pending");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Správa uživatelů</h1>
          <p className="text-sm text-gray-500">Schvalujte a spravujte přístup uživatelů</p>
        </div>
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Čeká na schválení ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map(u => (
              <UserRow key={u.id} user={u} onUpdate={updateUser} />
            ))}
          </div>
        </div>
      )}

      {/* All users */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800 text-sm">Všichni uživatelé ({others.length})</h2>
        </div>
        {loading ? (
          <div className="text-sm text-gray-400 py-8 text-center">Načítám...</div>
        ) : others.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center">Žádní uživatelé</div>
        ) : (
          <div className="space-y-2">
            {others.map(u => (
              <UserRow key={u.id} user={u} onUpdate={updateUser} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, onUpdate }) {
  const status = user.account_status || "pending";
  const role = user.role || "user";
  const statusCfg = statusConfig[status] || statusConfig.pending;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-indigo-500">
          {(user.full_name || user.email || "?")[0].toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{user.full_name || "—"}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
        <StatusIcon className="w-3 h-3" />
        {statusCfg.label}
      </span>

      {/* Role selector */}
      <Select value={role} onValueChange={(val) => onUpdate(user.id, { role: val })}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">Uživatel</SelectItem>
          <SelectItem value="chatter">Chatter</SelectItem>
        </SelectContent>
      </Select>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        {status !== "approved" && (
          <Button
            size="sm"
            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-3"
            onClick={() => onUpdate(user.id, { account_status: "approved" })}
          >
            Schválit
          </Button>
        )}
        {status !== "blocked" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50 px-3"
            onClick={() => onUpdate(user.id, { account_status: "blocked" })}
          >
            Blokovat
          </Button>
        )}
        {status === "blocked" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-3"
            onClick={() => onUpdate(user.id, { account_status: "approved" })}
          >
            Odblokovat
          </Button>
        )}
      </div>
    </div>
  );
}