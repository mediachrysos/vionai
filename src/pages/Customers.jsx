import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, UserCircle, ExternalLink, Link2, Download, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import EmptyState from "../components/ui-custom/EmptyState";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import OnboardingLinkModal from "../components/customers/OnboardingLinkModal";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  vip: "bg-amber-50 text-amber-700 border-amber-100",
  blocked: "bg-red-50 text-red-600 border-red-100",
};

export default function Customers({ currentUser }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_payment");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [modelFilter, setModelFilter] = useState("all");
  const qc = useQueryClient();
  const { showAll, toggle } = useChatterFilter();
  const isAdmin = currentUser?.role === "admin";

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get("action") === "new") setShowForm(true);
  }, []);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 2000),
  });

  // Build per-customer payment stats
  const customerStats = {};
  allPayments.forEach(p => {
    if (!p.customer_id) return;
    if (!customerStats[p.customer_id]) customerStats[p.customer_id] = { total: 0, lastDate: null, lastAmount: null };
    customerStats[p.customer_id].total += (p.amount || 0);
    const d = p.payment_date || p.created_date?.split("T")[0];
    if (!customerStats[p.customer_id].lastDate || d > customerStats[p.customer_id].lastDate) {
      customerStats[p.customer_id].lastDate = d;
      customerStats[p.customer_id].lastAmount = p.amount;
    }
  });

  const downloadXlsx = async () => {
    const { utils, writeFile } = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
    const rows = customers.map(c => {
      const s = customerStats[c.id] || {};
      return {
        "Jméno": c.full_name || "",
        "Email": c.email || "",
        "Telefon": c.phone || "",
        "Celkem (Kč)": s.total || 0,
        "Počet plateb": (allPayments.filter(p => p.customer_id === c.id).length),
        "Poslední platba": s.lastDate || "",
        "Poslední částka (Kč)": s.lastAmount || "",
        "Stav": c.status || "",
      };
    });
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Zákazníci");
    writeFile(wb, "zakaznici.xlsx");
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) {
        return base44.entities.Customer.update(editing.id, data);
      }
      return base44.entities.Customer.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const today = new Date();

  const filtered = customers.filter(c => {
    const matchSearch = !search || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const custModels = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
    const matchChatter = showAll || isAdmin ||
      c.assigned_chatter === currentUser?.email ||
      custModels.some(mid => myModelIds.includes(mid));
    const matchModel = modelFilter === "all" || custModels.includes(modelFilter);
    return matchSearch && matchChatter && matchModel;
  }).sort((a, b) => {
    const sa = customerStats[a.id] || {};
    const sb = customerStats[b.id] || {};
    if (sortBy === "most_paid") {
      return (sb.total || 0) - (sa.total || 0);
    }
    if (sortBy === "pay_day") {
      // Sort by who has payday soonest (relative to today's day of month)
      const todayDay = today.getDate();
      const daysUntil = (d) => {
        if (!d) return 999;
        const diff = d - todayDay;
        return diff >= 0 ? diff : diff + 31;
      };
      return daysUntil(a.pay_day_of_month) - daysUntil(b.pay_day_of_month);
    }
    // default: last_payment
    if (!sa.lastDate && !sb.lastDate) return 0;
    if (!sa.lastDate) return 1;
    if (!sb.lastDate) return -1;
    return sb.lastDate > sa.lastDate ? 1 : -1;
  });

  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models.filter(m => m.assigned_chatters?.includes(currentUser.email)).map(m => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  // Per-customer payment count from allPayments
  const customerPaymentCount = {};
  allPayments.forEach(p => {
    if (!p.customer_id) return;
    customerPaymentCount[p.customer_id] = (customerPaymentCount[p.customer_id] || 0) + 1;
  });

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <PageHeader title="Zákazníci" subtitle={`${customers.length} zákazníků celkem`}>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadXlsx} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="w-4 h-4 mr-2" /> Export .xlsx
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
                <Plus className="w-4 h-4 mr-2" /> Přidat zákazníka <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Přidat zákazníka
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowOnboarding(true)}>
                <Link2 className="w-4 h-4 mr-2" /> Onboarding odkaz
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat zákazníky..." className="pl-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="last_payment">Poslední platba</SelectItem>
            <SelectItem value="most_paid">Nejvyšší celková platba</SelectItem>
            <SelectItem value="pay_day">Nejbližší výplata</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Všechny modelky" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny modelky</SelectItem>
            {models.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isAdmin && (
          <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={UserCircle} title="Žádní zákazníci" description="Přidej prvního zákazníka a začni" actionLabel="Přidat zákazníka" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Jméno</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Den výplaty</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Modelky</th>

                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Celkem / Platby</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Poslední platba</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const st = customerStats[c.id] || {};
                  const daysSinceLast = st.lastDate ? Math.floor((Date.now() - new Date(st.lastDate)) / 86400000) : null;
                  return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => { setEditing(c); setShowForm(true); }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {c.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm hidden md:table-cell">
                      {c.pay_day_of_month
                        ? <span className="text-sm font-medium text-gray-700">{c.pay_day_of_month}. v měsíci</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm hidden lg:table-cell">
                       {(() => {
                         const mids = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
                         const names = mids.map(mid => modelMap[mid]).filter(Boolean);
                         return names.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                             {names.map(n => <span key={n} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-1.5 py-0.5">{n}</span>)}
                           </div>
                         ) : <span className="text-gray-300">—</span>;
                       })()}
                     </td>

                    <td className="px-5 py-3.5 text-right">
                       <p className="text-sm font-semibold text-gray-800">{(st.total || 0).toLocaleString()} Kč</p>
                       <p className="text-xs text-gray-400">{customerPaymentCount[c.id] || 0}× plateb</p>
                     </td>
                    <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                      {daysSinceLast !== null ? (
                        <div>
                          <p className="text-xs font-medium text-gray-600">{st.lastAmount?.toLocaleString()} Kč</p>
                          <p className="text-xs text-gray-400">před {daysSinceLast} dny</p>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={createPageUrl("CustomerDetail") + `?id=${c.id}`} onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-4 h-4 text-gray-300 hover:text-gray-600" />
                      </Link>
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveMutation.mutateAsync}
        customer={editing}
        models={models}
        users={users}
        allCustomers={customers}
      />

      <OnboardingLinkModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        models={models}
        users={users}
      />
    </div>
  );
}