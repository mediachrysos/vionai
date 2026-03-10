import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, CheckCircle, XCircle, Users, CreditCard, Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import AdminPayments from "../components/admin/AdminPayments";

const statusConfig = {
  pending: { label: "Čeká na schválení", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Schváleno", color: "bg-green-100 text-green-700", icon: CheckCircle },
  blocked: { label: "Zablokováno", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function AdminUsers({ currentUser }) {
  const [tab, setTab] = useState("users");
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Portál</h1>
          <p className="text-sm text-gray-500">Správa uživatelů, plateb a oprávnění</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "users" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Users className="w-4 h-4" /> Uživatelé
          {pending.length > 0 && <span className="bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pending.length}</span>}
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "payments" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <CreditCard className="w-4 h-4" /> Platby
        </button>
        <button
          onClick={() => setTab("add-model")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "add-model" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Přidat modelku
        </button>
        <button
          onClick={() => setTab("add-customer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "add-customer" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Přidat zákazníka
        </button>
        <button
          onClick={() => setTab("bank-accounts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "bank-accounts" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Účty
        </button>
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div>
          {pending.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-800 text-sm">Čeká na schválení ({pending.length})</h2>
              </div>
              <div className="space-y-2">
                {pending.map(u => <UserRow key={u.id} user={u} onUpdate={updateUser} />)}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Všichni uživatelé ({others.length})</h2>
            </div>
            {loading ? (
              <div className="text-sm text-gray-400 py-8 text-center">Načítám...</div>
            ) : (
              <div className="space-y-2">
                {others.map(u => <UserRow key={u.id} user={u} onUpdate={updateUser} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments tab */}
      {tab === "payments" && <AdminPayments currentUser={currentUser} />}

      {/* Add model tab */}
      {tab === "add-model" && <AddModelTab />}

      {/* Add customer tab */}
      {tab === "add-customer" && <AddCustomerTab users={users} />}
    </div>
  );
}

function UserRow({ user, onUpdate }) {
  const status = user.account_status || "pending";
  const role = user.role || "user";
  const statusCfg = statusConfig[status] || statusConfig.pending;
  const StatusIcon = statusCfg.icon;

  const avatarColors = ["from-indigo-400 to-violet-500", "from-pink-400 to-rose-500", "from-emerald-400 to-teal-500", "from-amber-400 to-orange-500", "from-blue-400 to-cyan-500"];
  const colorIndex = (user.full_name || user.email || "").charCodeAt(0) % avatarColors.length;

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow flex-wrap">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        <span className="text-sm font-bold text-white">
          {(user.full_name || user.email || "?")[0].toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name || "—"}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusCfg.color}`}>
        <StatusIcon className="w-3 h-3" />
        {statusCfg.label}
      </span>
      <Select value={role} onValueChange={(val) => onUpdate(user.id, { role: val })}>
        <SelectTrigger className="w-36 h-8 text-xs border-gray-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">👑 Admin</SelectItem>
          <SelectItem value="user">👤 Uživatel</SelectItem>
          <SelectItem value="chatter">💬 Chatter</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        {status !== "approved" && (
          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-lg font-semibold" onClick={() => onUpdate(user.id, { account_status: "approved" })}>
            Schválit
          </Button>
        )}
        {status !== "blocked" && (
          <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50 px-4 rounded-lg font-semibold" onClick={() => onUpdate(user.id, { account_status: "blocked" })}>
            Blokovat
          </Button>
        )}
        {status === "blocked" && (
          <Button size="sm" variant="outline" className="h-8 text-xs px-4 rounded-lg font-semibold" onClick={() => onUpdate(user.id, { account_status: "approved" })}>
            Odblokovat
          </Button>
        )}
      </div>
    </div>
  );
}

function AddModelTab() {
  const [form, setForm] = useState({ name: "", status: "active", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Model.create(form);
    setSaving(false);
    setDone(true);
    setForm({ name: "", status: "active", notes: "" });
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5">
          <h2 className="text-lg font-bold text-white">Přidat novou modelku</h2>
          <p className="text-violet-200 text-sm mt-0.5">Vytvořte nový profil modelky v systému</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Jméno *</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jméno modelky" className="h-10" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Status</label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">✅ Aktivní</SelectItem>
                <SelectItem value="inactive">⏸️ Neaktivní</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Poznámky</label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interní poznámka" className="h-10" />
          </div>
          <Button onClick={handleSave} disabled={!form.name || saving} className="bg-violet-600 hover:bg-violet-700 w-full h-10 font-semibold">
            {done ? "✓ Modelka vytvořena!" : saving ? "Ukládám..." : "Vytvořit modelku"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddCustomerTab({ users }) {
  const [form, setForm] = useState({ full_name: "", email: "", bank_name: "", bank_account_number: "", notes: "", status: "active", assigned_chatter: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Customer.create(form);
    setSaving(false);
    setDone(true);
    setForm({ full_name: "", email: "", bank_name: "", bank_account_number: "", notes: "", status: "active", assigned_chatter: "" });
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-5">
          <h2 className="text-lg font-bold text-white">Přidat nového zákazníka</h2>
          <p className="text-indigo-200 text-sm mt-0.5">Ručně zadejte údaje zákazníka do systému</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Celé jméno *</label>
            <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Jan Novák" className="h-10" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Email</label>
            <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jan@example.com" className="h-10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Název banky</label>
              <Input value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} className="h-10" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1.5">Číslo účtu</label>
              <Input value={form.bank_account_number} onChange={e => setForm(p => ({ ...p, bank_account_number: e.target.value }))} className="h-10" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Přiřazený chatter</label>
            <Select value={form.assigned_chatter} onValueChange={v => setForm(p => ({ ...p, assigned_chatter: v }))}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Vybrat chattera" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Poznámky</label>
            <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="h-10" />
          </div>
          <Button onClick={handleSave} disabled={!form.full_name || saving} className="bg-indigo-600 hover:bg-indigo-700 w-full h-10 font-semibold">
            {done ? "✓ Zákazník přidán!" : saving ? "Ukládám..." : "Vytvořit zákazníka"}
          </Button>
        </div>
      </div>
    </div>
  );
}