import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Search, Plus, UserCircle, Download, ChevronDown, Pencil, Trash2, Link2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import OnboardingLinkModal from "../components/customers/OnboardingLinkModal";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import PageHeader from "../components/ui-custom/PageHeader";
import EmptyState from "../components/ui-custom/EmptyState";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";

function createPageUrl(page) {
  return `/${page}`;
}

export default function Customers({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_payment");
  const [modelFilter, setModelFilter] = useState("all");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [defaultModelSet, setDefaultModelSet] = useState(false);

  const { showAll, toggle } = useChatterFilter();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === "admin";
  const navigate = useNavigate();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500)
  });
  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 1000)
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list()
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list()
  });

  // Aggregate stats per customer from payments
  const customerStats = useMemo(() => {
    const stats = {};
    allPayments.forEach((p) => {
      if (!p.customer_id) return;
      if (!stats[p.customer_id]) stats[p.customer_id] = { total: 0, lastDate: null, lastAmount: null };
      stats[p.customer_id].total += p.amount || 0;
      if (!stats[p.customer_id].lastDate || p.payment_date > stats[p.customer_id].lastDate) {
        stats[p.customer_id].lastDate = p.payment_date;
        stats[p.customer_id].lastAmount = p.amount;
      }
    });
    return stats;
  }, [allPayments]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] })
  });

  const handleDelete = (e, c) => {
    e.stopPropagation();
    if (window.confirm(`Opravdu smazat zákazníka "${c.full_name}"? Tato akce je nevratná.`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.Customer.update(data.id, data);
      }
      return base44.entities.Customer.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setEditing(null);
    }
  });

  const myModelIds = useMemo(() => {
    if (!currentUser?.email) return [];
    const fromModels = models.filter((m) => m.assigned_chatters?.includes(currentUser.email)).map((m) => m.id);
    const fromUser = currentUser?.assigned_model_ids || [];
    return [...new Set([...fromModels, ...fromUser])];
  }, [models, currentUser]);

  // Set default model filter to user's first assigned model (non-admin only)
  useEffect(() => {
    if (!defaultModelSet && !isAdmin && myModelIds.length > 0) {
      setModelFilter(myModelIds[0]);
      setDefaultModelSet(true);
    }
  }, [myModelIds, isAdmin, defaultModelSet]);

  const downloadXlsx = () => {
    const rows = [
    ["Jméno", "Email", "Telefon", "Banka", "Číslo účtu", "Den výplaty", "Celkem", "Počet plateb"],
    ...customers.map((c) => {
      const st = customerStats[c.id] || {};
      return [c.full_name, c.email, c.phone, c.bank_name, c.bank_account_number, c.pay_day_of_month, st.total || 0, allPayments.filter((p) => p.customer_id === c.id).length];
    })];

    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zakaznici.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date();
  const todayDay = today.getDate();

  const customerPaymentCount = {};
  allPayments.forEach((p) => {
    if (!p.customer_id) return;
    customerPaymentCount[p.customer_id] = (customerPaymentCount[p.customer_id] || 0) + 1;
  });

  const modelMap = {};
  models.forEach((m) => {modelMap[m.id] = m.name;});

  const filtered = customers.filter((c) => {
    const matchSearch = !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase());
    const custModels = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
    const matchChatter = showAll || isAdmin ||
    c.assigned_chatter === currentUser?.email ||
    custModels.some((mid) => myModelIds.includes(mid));
    const matchModel = modelFilter === "all" || custModels.includes(modelFilter);
    return matchSearch && matchChatter && matchModel;
  }).sort((a, b) => {
    // Payday customers always on top
    const aPayday = a.pay_day_of_month === todayDay;
    const bPayday = b.pay_day_of_month === todayDay;
    if (aPayday && !bPayday) return -1;
    if (!aPayday && bPayday) return 1;

    const sa = customerStats[a.id] || {};
    const sb = customerStats[b.id] || {};
    if (sortBy === "most_paid") {
      return (sb.total || 0) - (sa.total || 0);
    }
    if (sortBy === "pay_day") {
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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <PageHeader title="Zákazníci" subtitle={`${customers.length} zákazníků celkem`}>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadXlsx} className="bg-background text-[#ebc624] px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-emerald-200 hover:bg-emerald-50">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_20_hrhhn2.png" alt="" className="w-4 h-4 mr-2 object-contain" /> Export .xlsx
          </Button>
          <Button onClick={() => setShowOnboarding(true)} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_18_ifllg3.png" alt="" className="w-4 h-4 mr-2 object-contain" /> Onboarding odkaz
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_13_up9fpo.png" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat zákazníky..." className="pl-10" />
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
            {models.map((m) =>
            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            )}
          </SelectContent>
        </Select>
        {!isAdmin &&
        <ChatterFilterToggle showAll={showAll} onToggle={toggle} />
        }
      </div>

      {/* Table */}
      {filtered.length === 0 && !isLoading ?
      <EmptyState icon={UserCircle} title="Žádní zákazníci" description="Přidej prvního zákazníka a začni" actionLabel="Přidat zákazníka" onAction={() => setShowForm(true)} /> :

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
                    className={`border-b transition-colors cursor-pointer ${c.pay_day_of_month === todayDay ? "bg-gradient-to-r from-amber-50 to-yellow-50/30 border-amber-100 hover:from-amber-100/70 hover:to-yellow-50/50" : "border-gray-50 hover:bg-gray-50/60"}`}
                    onClick={() => navigate(`/CustomerDetail?id=${c.id}`)}>
                    
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {c.pay_day_of_month === todayDay && (
                            <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#C9A227] to-[#A8841C] -ml-1 flex-shrink-0" />
                          )}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.pay_day_of_month === todayDay ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-600"}`}>
                            {c.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${c.pay_day_of_month === todayDay ? "text-amber-900 font-semibold" : "text-gray-800"}`}>{c.full_name}</span>
                            {c.pay_day_of_month === todayDay && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">💰 výplata</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm hidden md:table-cell">
                        {c.pay_day_of_month ?
                      <span className="text-sm font-medium text-gray-700">{c.pay_day_of_month}. v měsíci</span> :
                      <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm hidden lg:table-cell">
                        {(() => {
                        const mids = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
                        const names = mids.map((mid) => modelMap[mid]).filter(Boolean);
                        return names.length > 0 ?
                        <div className="flex flex-wrap gap-1">
                              {names.map((n) => <span key={n} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-1.5 py-0.5">{n}</span>)}
                            </div> :
                        <span className="text-gray-300">—</span>;
                      })()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-sm font-semibold text-gray-800">{(st.total || 0).toLocaleString()} Kč</p>
                        <p className="text-xs text-gray-400">{customerPaymentCount[c.id] || 0}× plateb</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {daysSinceLast !== null ?
                      <div>
                            <p className="text-xs font-medium text-gray-600">{st.lastAmount?.toLocaleString()} Kč</p>
                            <p className="text-xs text-gray-400">před {daysSinceLast} dny</p>
                          </div> :
                      <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {e.stopPropagation();setEditing(c);setShowForm(true);}}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-5 h-5 object-contain" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, c)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 transition-colors">
                            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-5 h-5 object-contain" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>);

              })}
              </tbody>
            </table>
          </div>
        </div>
      }

      <CustomerFormModal
        open={showForm}
        onClose={() => {setShowForm(false);setEditing(null);}}
        onSave={saveMutation.mutateAsync}
        customer={editing}
        models={models}
        users={users}
        allCustomers={customers} />
      

      <OnboardingLinkModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        models={models}
        users={users} />
      
    </div>);

}