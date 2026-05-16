import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Shield, Clock, CheckCircle, XCircle, Building2, Plus, ChevronDown, ChevronUp, Camera, Lock, Unlock, X, Search, Bot, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LegalDocumentsEditor from "../components/admin/LegalDocumentsEditor";
import OnboardingLinkModal from "../components/customers/OnboardingLinkModal";
import OnboardingLinksList from "../components/customers/OnboardingLinksList";
import AdminPayments from "../components/admin/AdminPayments";

function GoalDatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T12:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-colors"
        >
          <img
            src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266696/Chrysos_icon_7_ubsz30.png"
            alt=""
            className="w-4 h-4 object-contain flex-shrink-0"
          />
          <span className={`flex-1 text-left ${selected ? "text-gray-800 font-medium" : "text-gray-400"}`}>
            {selected ? format(selected, "d. M. yyyy") : placeholder || "Vybrat datum"}
          </span>
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-gray-300 hover:text-gray-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <CalendarWidget
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

const statusConfig = {
  pending: { label: "Pending approval", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", icon: XCircle }
};

export default function AdminUsers({ currentUser: currentUserProp }) {
  const [currentUser, setCurrentUser] = useState(currentUserProp || null);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingRefresh, setOnboardingRefresh] = useState(0);
  const [dashboards, setDashboards] = useState([]);

  const [openSections, setOpenSections] = useState({ users: true, payments: false, models: false, customers: false, accounts: false, goal: false, legal: false, invoices: false });

  const toggle = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const loadUsers = async () => {
    const u = await base44.entities.User.list("-created_date", 100);
    setUsers(u);
  };

  useEffect(() => {
    if (currentUserProp) {
      setCurrentUser(currentUserProp);
    } else {
      base44.auth.me().then((me) => setCurrentUser(me)).catch(() => setCurrentUser(null));
    }
  }, [currentUserProp]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser?.role !== "admin") {setLoading(false);return;}
    // Small delay to avoid rate limit conflicts with layout-level fetches
    const timer = setTimeout(async () => {
      const [u, m, a, db] = await Promise.all([
        base44.entities.User.list("-created_date", 100),
        base44.entities.Model.list(),
        base44.entities.BankAccount.list("-created_date", 100),
        base44.entities.SocialDashboard.list("order", 50),
      ]);
      setUsers(u);
      setModels(m);
      setAccounts(a);
      setDashboards(db);
      setLoading(false);
    }, 600);

    const unsub = base44.entities.User.subscribe(() => loadUsers());
    return () => { clearTimeout(timer); unsub(); };
  }, [currentUser]);

  const updateUser = async (userId, changes) => {
    await base44.entities.User.update(userId, changes);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...changes } : u));
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Opravdu smazat účet uživatele "${userName}"? Tato akce je nevratná a uživatel se nebude moct přihlásit.`)) return;
    await base44.entities.User.delete(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>);
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">This page is for administrators only.</p>
        </div>
      </div>);
  }

  const pending = users.filter((u) => u.account_status === "pending");
  const others = users.filter((u) => u.account_status !== "pending");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center shadow-sm shadow-amber-200">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266698/Chrysos_icon_11_zdpyp3.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500">Manage users, payments and permissions</p>
        </div>
      </div>

      <Section
        label="Users"
        icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266698/Chrysos_icon_11_zdpyp3.png" alt="" className="w-5 h-5 object-contain" /></div>}
        badge={pending.length > 0 ? pending.length : null}
        open={openSections.users}
        onToggle={() => toggle("users")}>
        
        {loading ?
        <p className="text-sm text-gray-400 py-4 text-center">Loading...</p> :

        <>
            {pending.length > 0 &&
          <div className="mb-4">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pending approval ({pending.length})
                </p>
                <div className="space-y-2">
                  {pending.map((u) => <UserRow key={u.id} user={u} onUpdate={updateUser} onDelete={deleteUser} models={models} dashboards={dashboards} setDashboards={setDashboards} />)}
                </div>
              </div>
          }
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">All users ({others.length})</p>
            <div className="space-y-2">
              {others.map((u) => <UserRow key={u.id} user={u} onUpdate={updateUser} onDelete={deleteUser} models={models} dashboards={dashboards} setDashboards={setDashboards} />)}
            </div>
          </>
        }
      </Section>

      <Section label="Platby" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_2_jqior6.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.payments} onToggle={() => toggle("payments")}>
        <AdminPayments currentUser={currentUser} />
      </Section>

      <Section label="Modelky" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_10_cpk2ha.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.models} onToggle={() => toggle("models")}>
        <AddModelInline models={models} setModels={setModels} />
      </Section>

      <Section label="Přidat zákazníka" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774304766/Chrysos_icon_26_ybydei.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.customers} onToggle={() => toggle("customers")}>
        <AddCustomerInline users={users} onGenerateLink={() => setShowOnboardingModal(true)} />
        <OnboardingLinksList refreshTrigger={onboardingRefresh} models={models} />
      </Section>

      <OnboardingLinkModal
        open={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        models={models}
        users={users}
        onLinkCreated={() => setOnboardingRefresh((p) => p + 1)} />

      <Section label="Bankovní účty" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266696/Chrysos_icon_9_z1rvej.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.accounts} onToggle={() => toggle("accounts")}>
        <BankAccountsInline accounts={accounts} setAccounts={setAccounts} />
      </Section>

      <Section label="Měsíční cíl" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266696/Chrysos_icon_7_ubsz30.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.goal} onToggle={() => toggle("goal")}>
        <GoalSettingsInline />
      </Section>

      <Section label="Právní dokumenty (GDPR & Podmínky)" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774304766/Chrysos_icon_27_fagh7p.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.legal} onToggle={() => toggle("legal")}>
        <LegalDocumentsEditor />
      </Section>

      <Section label="Nastavení faktury" icon={<div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100"><img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_2_jqior6.png" alt="" className="w-5 h-5 object-contain" /></div>} open={openSections.invoices} onToggle={() => toggle("invoices")}>
        <InvoiceSettingsInline />
      </Section>
    </div>);
}

function Section({ label, icon, badge, open, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span className="text-gray-400">{icon}</span>
          {label}
          {badge &&
          <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">{badge}</span>
          }
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-gray-50">{children}</div>}
    </div>);
}

const PAGE_OPTIONS = [
{ page: "Dashboard", label: "Přehled" },
{ page: "ChatterPortal", label: "Můj přehled" },
{ page: "Customers", label: "Zákazníci" },
{ page: "Models", label: "Modelky" },
{ page: "Payments", label: "Platby" },
{ page: "Finance", label: "Finance" },
{ page: "Wallet", label: "Wallet" },
{ page: "CustomerScraper", label: "Customer Scraper" },
{ page: "SocialMediaContent", label: "Social Media" },
{ page: "Tasks", label: "Úkoly" },
{ page: "BusinessTimeline", label: "Timeline" },
{ page: "Expenses", label: "Výdaje" }];

function UserRow({ user, onUpdate, onDelete, models, dashboards = [], setDashboards }) {
  const [showPerms, setShowPerms] = useState(false);
  const [allowedPages, setAllowedPages] = useState(user.allowed_pages || []);
  const [assignedIds, setAssignedIds] = useState(user.assigned_model_ids || []);
  const status = user.account_status || "pending";
  const role = user.role || "user";
  const statusCfg = statusConfig[status] || statusConfig.pending;
  const StatusIcon = statusCfg.icon;
  const isAdmin = role === "admin";
  const isDesigner = role === "grafik";

  const assignedDashboard = dashboards.find(d => d.designer_email === user.email);

  const handleDashboardAssign = async (dashboardId) => {
    // Unassign from current dashboard if any
    if (assignedDashboard) {
      await base44.entities.SocialDashboard.update(assignedDashboard.id, {
        designer_email: "",
        designer_name: "",
      });
    }
    // Assign to new dashboard (if not "none")
    if (dashboardId && dashboardId !== "none") {
      await base44.entities.SocialDashboard.update(dashboardId, {
        designer_email: user.email,
        designer_name: user.full_name || user.email,
      });
    }
    // Refresh dashboards
    const updated = await base44.entities.SocialDashboard.list("order", 50);
    setDashboards(updated);
  };

  const toggleModel = (modelId) => {
    const next = assignedIds.includes(modelId) ?
    assignedIds.filter((id) => id !== modelId) :
    [...assignedIds, modelId];
    setAssignedIds(next);
    onUpdate(user.id, { assigned_model_ids: next });
  };

  const togglePage = (page) => {
    const next = allowedPages.includes(page) ?
    allowedPages.filter((p) => p !== page) :
    [...allowedPages, page];
    setAllowedPages(next);
    onUpdate(user.id, { allowed_pages: next });
  };

  return (
    <div className="flex flex-col gap-0 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 flex-wrap px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">{(user.full_name || user.email || "?")[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{user.full_name || "—"}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>
        <Select value={role} onValueChange={(val) => onUpdate(user.id, { role: val })}>
          <SelectTrigger className="w-32 h-8 text-xs border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">👑 Admin</SelectItem>
            <SelectItem value="chatter">💬 Chatter</SelectItem>
            <SelectItem value="lawyer">⚖️ Lawyer</SelectItem>
            <SelectItem value="grafik">🎨 Designer</SelectItem>
            <SelectItem value="user">👤 User</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {status !== "approved" &&
          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg"
          onClick={() => onUpdate(user.id, { account_status: "approved" })}>Approve</Button>
          }
          {!isAdmin &&
          <Button size="sm" variant="outline"
          onClick={() => setShowPerms((v) => !v)}
          className={`h-8 text-xs px-3 rounded-lg ${showPerms ? "bg-violet-50 border-violet-200 text-violet-700" : "border-gray-200 text-gray-500"}`}>
              {showPerms ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
              Permissions
            </Button>
          }
          <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50 px-3 rounded-lg"
          onClick={() => onDelete(user.id, user.full_name || user.email)}>
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3 h-3 mr-1 object-contain" /> Odstranit
          </Button>
        </div>
      </div>

      {showPerms && !isAdmin &&
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-gray-600">Section access</span>
            <span className="text-[10px] text-gray-400 ml-1">(empty = default by role)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAGE_OPTIONS.map(({ page, label }) => {
            const enabled = allowedPages.includes(page);
            return (
              <button key={page} onClick={() => togglePage(page)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              enabled ?
              "bg-violet-100 text-violet-700 border-violet-300" :
              "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"}`
              }>
                  {enabled ? "✓ " : ""}{label}
                </button>);
            })}
          </div>
          {allowedPages.length > 0 &&
        <button onClick={() => { setAllowedPages([]); onUpdate(user.id, { allowed_pages: [] }); }}
        className="mt-2 text-[11px] text-gray-400 hover:text-red-400 transition-colors underline">
              Reset to default
            </button>
        }
        </div>
      }

      {models.filter((m) => m.status === "active").length > 0 &&
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-t border-gray-100 bg-white/60">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Models:</span>
          {models.filter((m) => m.status === "active").map((m) => {
          const assigned = assignedIds.includes(m.id);
          return (
            <button key={m.id} onClick={() => toggleModel(m.id)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
            assigned ? "bg-amber-50 text-[#C9A227] border-[#e8d99a]" : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"}`
            }>
                {assigned ? "✓ " : ""}{m.name}
              </button>);
          })}
        </div>
      }

      {isDesigner && dashboards.length > 0 &&
        <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-t border-gray-100 bg-violet-50/40">
          <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Social Dashboard:</span>
          <select
            value={assignedDashboard?.id || "none"}
            onChange={e => handleDashboardAssign(e.target.value)}
            className="text-xs h-7 border border-gray-200 rounded-lg px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="none">— not assigned —</option>
            {dashboards.map(db => (
              <option key={db.id} value={db.id}>
                {db.name}{db.designer_email && db.designer_email !== user.email ? ` (${db.designer_name || db.designer_email})` : ""}
              </option>
            ))}
          </select>
          {assignedDashboard && (
            <span className="text-[10px] text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
              ✓ {assignedDashboard.name}
            </span>
          )}
        </div>
      }
    </div>);
}

function AddModelInline({ models, setModels }) {
  const [form, setForm] = useState({ name: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    base44.entities.Payment.list("-created_date", 5000).then(setPayments);
  }, []);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const created = await base44.entities.Model.create(form);
    setModels((prev) => [...prev, created]);
    setSaving(false);
    setDone(true);
    setForm({ name: "", status: "active" });
    setTimeout(() => setDone(false), 2000);
  };

  const handleDelete = async (e, m) => {
    e.preventDefault();
    if (!window.confirm(`Opravdu smazat modelku "${m.name}"?`)) return;
    await base44.entities.Model.delete(m.id);
    setModels((prev) => prev.filter(x => x.id !== m.id));
  };

  // Revenue per model
  const modelRevenue = {};
  const modelPaymentCount = {};
  payments.forEach((p) => {
    if (p.model_id) {
      modelRevenue[p.model_id] = (modelRevenue[p.model_id] || 0) + (p.amount || 0);
      modelPaymentCount[p.model_id] = (modelPaymentCount[p.model_id] || 0) + 1;
    }
  });

  const filtered = models.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Jméno *</label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jméno modelky" className="h-9" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={handleSave} disabled={!form.name || saving} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] h-9 w-full text-sm font-semibold whitespace-nowrap px-6 text-white">
            {done ? "✓ Přidáno!" : saving ? "..." : "Přidat modelku"}
          </Button>
        </div>
      </div>

      {/* Search */}
      {models.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat modelky..." className="pl-10 h-9" />
        </div>
      )}

      {/* Models list */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((m) => (
            <Link key={m.id} to={`${createPageUrl("ModelDetail")}?id=${m.id}`} className="group block">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 hover:border-[#e8d99a] hover:shadow-sm transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-50 flex items-center justify-center border border-[#e8d99a] flex-shrink-0">
                  {m.profile_photo
                    ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                    : <Bot className="w-5 h-5 text-[#C9A227]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === "active" ? "bg-amber-50 text-[#C9A227] border border-[#e8d99a]" : "bg-gray-100 text-gray-400"}`}>
                    {m.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-right mr-4">
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-sm font-semibold text-gray-900">{(modelRevenue[m.id] || 0).toLocaleString()} CZK</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-xs text-gray-400">Platby</p>
                  <p className="text-sm font-semibold text-gray-900">{modelPaymentCount[m.id] || 0}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#C9A227] transition-colors flex-shrink-0 mr-2" />
                <button onClick={(e) => handleDelete(e, m)} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
                  <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-4 h-4 object-contain" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCustomerInline({ users, onGenerateLink }) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Full name *</label>
        <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="John Smith" className="h-9" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
        <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jan@example.com" className="h-9" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Bank name</label>
        <Input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} className="h-9" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Account number</label>
        <Input value={form.bank_account_number} onChange={(e) => setForm((p) => ({ ...p, bank_account_number: e.target.value }))} className="h-9" />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Assigned chatter</label>
        <Select value={form.assigned_chatter} onValueChange={(v) => setForm((p) => ({ ...p, assigned_chatter: v }))}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select chatter" /></SelectTrigger>
          <SelectContent>
            {users.map((u) => <SelectItem key={u.email} value={u.email}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button onClick={handleSave} disabled={!form.full_name || saving} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] h-9 w-full text-sm font-semibold text-white">
          {done ? "✓ Added!" : saving ? "..." : "Create customer"}
        </Button>
      </div>
      <div className="col-span-2 flex items-center gap-2 pt-1">
        <div className="flex-1 border-t border-gray-100" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 border-t border-gray-100" />
      </div>
      <div className="col-span-2">
        <Button variant="outline" onClick={onGenerateLink} className="w-full h-9 text-sm border-[#e8d99a] text-[#A8841C] hover:bg-[#faf6e6]">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_18_ifllg3.png" alt="" className="w-4 h-4 mr-2 object-contain" /> Generate onboarding link
        </Button>
      </div>
    </div>);
}

function GoalSettingsInline() {
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goalId, setGoalId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    base44.entities.GoalSettings.list().then((list) => {
      if (list.length > 0) {
        setGoal(list[0].monthly_goal?.toString() || "100000");
        setStartDate(list[0].goal_start_date || "");
        setEndDate(list[0].goal_end_date || "");
        setGoalId(list[0].id);
      } else {
        setGoal("100000");
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const val = parseFloat(goal) || 100000;
    const data = { monthly_goal: val, goal_start_date: startDate, goal_end_date: endDate };
    if (goalId) {
      await base44.entities.GoalSettings.update(goalId, data);
    } else {
      const created = await base44.entities.GoalSettings.create({ ...data, label: "default" });
      setGoalId(created.id);
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="space-y-3 max-w-md">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Goal (CZK)</label>
        <Input
          type="number"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="100000"
          className="h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Period start</label>
          <GoalDatePicker value={startDate} onChange={setStartDate} placeholder="Select date" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Period end</label>
          <GoalDatePicker value={endDate} onChange={setEndDate} placeholder="Select date" />
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={!goal || saving}
        className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] h-9 text-sm font-semibold text-white px-5">
        {done ? "✓ Saved!" : saving ? "..." : "Save goal"}
      </Button>
    </div>);
}

function InvoiceSettingsInline() {
  const [settings, setSettings] = useState({
    company_name: "",
    company_address: "",
    ico: "",
    dic: "",
    email: "",
    phone: ""
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      const list = await base44.entities.InvoiceSettings.list();
      if (list && list.length > 0) {
        setSettings(list[0]);
        setSettingsId(list[0].id);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.InvoiceSettings.update(settingsId, settings);
      } else {
        const created = await base44.entities.InvoiceSettings.create(settings);
        setSettingsId(created.id);
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Company name *</label>
        <Input 
          value={settings.company_name || ""} 
          onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
          placeholder="Your Company Ltd."
          className="h-9" 
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Company address</label>
        <Input 
          value={settings.company_address || ""} 
          onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
          placeholder="Street 123, City"
          className="h-9" 
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">IČO</label>
          <Input 
            value={settings.ico || ""} 
            onChange={(e) => setSettings({ ...settings, ico: e.target.value })}
            placeholder="12345678"
            className="h-9" 
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">DIČ</label>
          <Input 
            value={settings.dic || ""} 
            onChange={(e) => setSettings({ ...settings, dic: e.target.value })}
            placeholder="CZ12345678"
            className="h-9" 
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
          <Input 
            type="email"
            value={settings.email || ""} 
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            placeholder="info@example.com"
            className="h-9" 
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
          <Input 
            value={settings.phone || ""} 
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="+420 123 456 789"
            className="h-9" 
          />
        </div>
      </div>
      <Button 
        onClick={handleSave}
        disabled={saving || !settings.company_name}
        className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] h-9 text-sm font-semibold text-white px-6"
      >
        {done ? "✓ Saved!" : saving ? "Saving..." : "Save settings"}
      </Button>
    </div>
  );
}

function BankAccountsInline({ accounts, setAccounts }) {
  const [form, setForm] = useState({ name: "", account_number: "", bank_name: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    const created = await base44.entities.BankAccount.create(form);
    setAccounts((prev) => [...prev, created]);
    setSaving(false);
    setDone(true);
    setForm({ name: "", account_number: "", bank_name: "", is_active: true });
    setTimeout(() => setDone(false), 2000);
  };

  const toggleActive = async (acc) => {
    await base44.entities.BankAccount.update(acc.id, { is_active: !acc.is_active });
    setAccounts((prev) => prev.map((a) => a.id === acc.id ? { ...a, is_active: !acc.is_active } : a));
  };

  const deleteAccount = async (id) => {
    if (!window.confirm("Delete account?")) return;
    await base44.entities.BankAccount.delete(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handlePhotoUpload = async (e, accId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(accId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.BankAccount.update(accId, { profile_photo: file_url });
    setAccounts((prev) => prev.map((a) => a.id === accId ? { ...a, profile_photo: file_url } : a));
    setUploadingId(null);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Name *</label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Main account" className="h-9" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Account number *</label>
          <Input value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} placeholder="123456/0100" className="h-9" />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSave} disabled={!form.name || !form.account_number || saving} className="bg-teal-600 hover:bg-teal-700 h-9 w-full text-sm font-semibold whitespace-nowrap px-6">
            <Plus className="w-3.5 h-3.5 mr-1" />
            {done ? "✓ Added!" : saving ? "..." : "Add account"}
          </Button>
        </div>
      </div>

      {accounts.length > 0 &&
      <div className="space-y-2">
          {accounts.map((a) =>
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50">
              <label className="relative cursor-pointer flex-shrink-0 group" title="Nahrát foto">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                  {a.profile_photo ?
              <img src={a.profile_photo} alt={a.name} className="w-full h-full object-cover" /> :
              <Building2 className="w-4 h-4 text-teal-500" />
              }
                </div>
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadingId === a.id ?
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> :
              <Camera className="w-3 h-3 text-white" />
              }
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, a.id)} disabled={uploadingId === a.id} />
              </label>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800">{a.name}</span>
                <span className="text-xs text-gray-400 ml-2">{a.account_number}{a.bank_name ? ` · ${a.bank_name}` : ""}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {a.is_active ? "Active" : "Inactive"}
              </span>
              <button onClick={() => toggleActive(a)} className="text-xs text-[#C9A227] hover:underline">{a.is_active ? "Deactivate" : "Activate"}</button>
              <button onClick={() => deleteAccount(a.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3.5 h-3.5 object-contain" />
              </button>
            </div>
        )}
        </div>
      }
    </div>);
}