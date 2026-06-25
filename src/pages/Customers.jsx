import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Search, Plus, UserCircle, Download, ChevronDown, Pencil, Trash2, Link2, RefreshCw, ScanSearch, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import OnboardingLinkForm from "../components/customers/OnboardingLinkForm";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import PageHeader from "../components/ui-custom/PageHeader";
import EmptyState from "../components/ui-custom/EmptyState";
import ChatterFilterToggle, { useChatterFilter } from "../components/ui-custom/ChatterFilterToggle";

function createPageUrl(page) {
  return `/${page}`;
}

export default function Customers({ currentUser }) {
  const [activeTab, setActiveTab] = useState("customers");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_payment");
  const [modelFilter, setModelFilter] = useState("all");
  const [defaultModelSet, setDefaultModelSet] = useState(false);

  const { showAll, toggle } = useChatterFilter();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === "admin";
  const navigate = useNavigate();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
    staleTime: 0
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

  const modelMap = useMemo(() => {
    const m = {};
    models.forEach((mdl) => {m[mdl.id] = mdl.name;});
    return m;
  }, [models]);

  // Detect duplicate names — group customers by normalized full_name
  const duplicateNames = useMemo(() => {
    const nameGroups = {};
    customers.forEach((c) => {
      const key = c.full_name?.trim().toLowerCase();
      if (!key) return;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(c.id);
    });
    // Only names with 2+ customers
    const dupes = new Set();
    Object.values(nameGroups).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => dupes.add(id));
    });
    return dupes;
  }, [customers]);

  // For duplicates: compute merged stats (sum across all customers with same name) + payments per model
  const mergedStats = useMemo(() => {
    const nameGroups = {};
    customers.forEach((c) => {
      const key = c.full_name?.trim().toLowerCase();
      if (!key) return;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(c);
    });
    const result = {};
    Object.entries(nameGroups).forEach(([key, custs]) => {
      if (custs.length < 2) return;
      const allIds = custs.map((c) => c.id);
      const payments = allPayments.filter((p) => allIds.includes(p.customer_id));
      const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const count = payments.length;
      // Per model breakdown
      const byModel = {};
      payments.forEach((p) => {
        const mname = p.model_name || modelMap[p.model_id] || "Bez modelky";
        if (!byModel[mname]) byModel[mname] = { total: 0, count: 0 };
        byModel[mname].total += p.amount || 0;
        byModel[mname].count += 1;
      });
      allIds.forEach((id) => {
        result[id] = { total, count, byModel, allIds, isPrimary: allIds[0] === id };
      });
    });
    return result;
  }, [customers, allPayments, modelMap]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] })
  });

  // --- Pending customers (completed onboarding but no payments) ---
  const { data: onboardingRequests = [] } = useQuery({
    queryKey: ["onboarding-requests"],
    queryFn: () => base44.entities.CustomerOnboardingRequest.filter({ status: "completed" })
  });

  const customerIdsWithPayments = useMemo(() => new Set(allPayments.map((p) => p.customer_id).filter(Boolean)), [allPayments]);

  const pendingCustomers = useMemo(() => {
    return customers.filter((c) => !customerIdsWithPayments.has(c.id));
  }, [customers, customerIdsWithPayments]);

  // --- Look-alike Audience state & logic ---
  const [laSearch, setLaSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  const { data: audience = [], isLoading: laLoading } = useQuery({
    queryKey: ["look-alike-audience"],
    queryFn: () => base44.entities.LookAlikeAudience.list("-total_czk", 5000)
  });

  const paymentTotals = useMemo(() => {
    const map = {};
    allPayments.forEach((p) => {
      if (!p.customer_name) return;
      const key = p.customer_name.trim().toLowerCase();
      map[key] = (map[key] || 0) + (p.amount || 0);
    });
    return map;
  }, [allPayments]);

  const filteredAudience = useMemo(() => {
    const q = laSearch.toLowerCase();
    return audience.filter((a) => {
      const fullName = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
      return !q || fullName.includes(q) || (a.phone || "").includes(q);
    });
  }, [audience, laSearch]);

  const getAudienceTotal = (a) => {
    const key = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
    const keyRev = `${a.last_name || ""} ${a.first_name || ""}`.trim().toLowerCase();
    const fromPayments = paymentTotals[key] || paymentTotals[keyRev] || 0;
    return fromPayments > 0 ? fromPayments : a.total_czk || 0;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncLookAlikeAudience", {});
      toast.success(res.data?.message || "Synced");
      qc.invalidateQueries({ queryKey: ["look-alike-audience"] });
    } catch (e) {
      toast.error("Sync error");
    } finally {
      setSyncing(false);
    }
  };

  const downloadAudienceCsv = () => {
    const rows = [
    ["No.", "First name", "Last name", "Phone", "Total (CZK)"],
    ...filteredAudience.map((a, i) => [i + 1, a.first_name || "", a.last_name || "", a.phone || "", getAudienceTotal(a)])];

    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;a.download = "look-alike-audience.csv";a.click();
    URL.revokeObjectURL(url);
  };
  // --- end Look-alike ---

  const [merging, setMerging] = useState(false);

  const handleMergeDuplicates = async () => {
    // Group customers by normalized name
    const nameGroups = {};
    customers.forEach((c) => {
      const key = c.full_name?.trim().toLowerCase();
      if (!key) return;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(c);
    });

    const groups = Object.values(nameGroups).filter((g) => g.length > 1);
    if (groups.length === 0) return alert("No duplicates to merge.");

    const totalDupes = groups.reduce((s, g) => s + g.length - 1, 0);
    if (!window.confirm(`Merge ${groups.length} duplicate groups (${totalDupes} records will be deleted)? All payments will be moved to the primary record.`)) return;

    setMerging(true);
    for (const group of groups) {
      // Primary = first (oldest by position), rest are duplicates
      const [primary, ...dupes] = group;
      // Merge assigned_models from all duplicates into primary
      const allModelIds = [...new Set([
      ...(primary.assigned_models || []),
      ...dupes.flatMap((d) => d.assigned_models || [])]
      )];
      // Update primary with merged models and sum totals
      const mergedTotal = group.reduce((s, c) => s + (c.total_spent || 0), 0);
      const mergedCount = group.reduce((s, c) => s + (c.payment_count || 0), 0);
      await base44.entities.Customer.update(primary.id, {
        assigned_models: allModelIds,
        total_spent: mergedTotal,
        payment_count: mergedCount
      });
      // Reassign all payments from dupes to primary
      for (const dupe of dupes) {
        const dupePayments = allPayments.filter((p) => p.customer_id === dupe.id);
        for (const p of dupePayments) {
          await base44.entities.Payment.update(p.id, { customer_id: primary.id, customer_name: primary.full_name });
        }
        await base44.entities.Customer.delete(dupe.id);
      }
    }
    setMerging(false);
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    alert(`Done! Merged ${groups.length} duplicate groups.`);
  };

  const handleDelete = (e, c) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete customer "${c.full_name}"? This action cannot be undone.`)) {
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
    ["Name", "Email", "Phone", "Bank", "Account Number", "Pay Day", "Total", "Payments"],
    ...customers.
    filter((c) => (customerStats[c.id]?.total || 0) > 0).
    map((c) => {
      const st = customerStats[c.id] || {};
      return [c.full_name, c.email, c.phone, c.bank_name, c.bank_account_number, c.pay_day_of_month, st.total || 0, allPayments.filter((p) => p.customer_id === c.id).length];
    })];

    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [expandedMerge, setExpandedMerge] = useState(null);

  const today = new Date();
  const todayDay = today.getDate();

  const customerPaymentCount = {};
  allPayments.forEach((p) => {
    if (!p.customer_id) return;
    customerPaymentCount[p.customer_id] = (customerPaymentCount[p.customer_id] || 0) + 1;
  });

  // Filter out non-primary duplicates (show only first of each name group)
  const filtered = customers.filter((c) => {
    if (!customerIdsWithPayments.has(c.id)) return false; // only paying customers
    const merged = mergedStats[c.id];
    if (merged && !merged.isPrimary) return false;
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit border border-white/10">
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "customers" ? "bg-[#C9A227] text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          
          <UserCircle className="w-4 h-4" /> Customers
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "pending" ? "bg-[#C9A227] text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          
          <Clock className="w-4 h-4" /> Pending
          {pendingCustomers.length > 0 &&
          <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center hidden">{pendingCustomers.length}</span>
          }
        </button>
        <button
          onClick={() => setActiveTab("lookalike")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "lookalike" ? "bg-[#C9A227] text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          
          <ScanSearch className="w-4 h-4" /> Look-alike Audience
        </button>
      </div>

      {activeTab === "pending" &&
      <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Pending customers</h2>
              <p className="text-sm text-slate-500 mt-0.5">{pendingCustomers.length} zákazníků potvrdilo onboarding, ale zatím neposlali žádné peníze</p>
            </div>
          </div>
          {pendingCustomers.length === 0 ?
        <div className="text-center py-16 text-slate-500 text-sm">Všichni zákazníci už platili 🎉</div> :

        <div className="bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Jméno</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Email</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Modelky</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Přidán</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCustomers.map((c, i) => {
                const mids = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
                const modelNames = mids.map((mid) => modelMap[mid]).filter(Boolean);
                const daysSince = c.created_date ? Math.floor((Date.now() - new Date(c.created_date)) / 86400000) : null;
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/CustomerDetail?id=${c.id}`)}>
                    
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-900/40 border border-amber-700/30 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
                              {c.full_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium text-slate-200">{c.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">{c.email || "—"}</td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          {modelNames.length > 0 ?
                      <div className="flex flex-wrap gap-1">
                              {modelNames.map((n) => <span key={n} className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/30 rounded-md px-1.5 py-0.5">{n}</span>)}
                            </div> :
                      <span className="text-slate-600 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell">
                          {daysSince !== null ? `před ${daysSince} dny` : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                          onClick={(e) => {e.stopPropagation();setEditing(c);setShowForm(true);}}
                          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-amber-900/40 transition-colors flex items-center justify-center">
                          
                              <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-4 h-4 object-contain" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>);

              })}
                </tbody>
              </table>
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
        
        </div>
      }

      {activeTab === "lookalike" &&
      <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-500">{audience.length} contacts</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSync} disabled={syncing} className="border-white/10 text-slate-300 hover:bg-white/5 gap-2">
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sync
              </Button>
              <Button variant="outline" onClick={downloadAudienceCsv} className="border-white/10 text-slate-300 hover:bg-white/5 gap-2">
                <Download className="w-4 h-4" /> Export .csv
              </Button>
            </div>
          </div>
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={laSearch} onChange={(e) => setLaSearch(e.target.value)} placeholder="Search name or phone..." className="pl-10" />
          </div>
          <div className="bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 w-12">#</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">First name</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Last name</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Phone</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Total (CZK)</th>
                  </tr>
                </thead>
                <tbody>
                  {laLoading ?
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Načítám...</td></tr> :
                filteredAudience.length === 0 ?
                <tr><td colSpan={5} className="text-center py-12 text-slate-500 text-sm">No records</td></tr> :
                filteredAudience.map((a, i) => {
                  const total = getAudienceTotal(a);
                  const key = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
                  const keyRev = `${a.last_name || ""} ${a.first_name || ""}`.trim().toLowerCase();
                  const isFromDB = (paymentTotals[key] || paymentTotals[keyRev] || 0) > 0;
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3.5 text-sm text-slate-500">{i + 1}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{a.first_name}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{a.last_name}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{a.phone || "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`text-sm font-semibold ${isFromDB ? "text-emerald-400" : "text-slate-300"}`}>
                            {total > 0 ? `${total.toLocaleString()} CZK` : "—"}
                          </span>
                          {isFromDB && <span className="ml-1.5 text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-700/30 rounded px-1 py-0.5">live</span>}
                        </td>
                      </tr>);

                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      {activeTab === "customers" && <>
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-100">Customers</h1>
          <div className="flex gap-2 flex-wrap items-end">
            

              
            {duplicateNames.size > 0 &&
              <Button
                onClick={handleMergeDuplicates}
                disabled={merging}
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-9">
                
                {merging ? "Merging..." : `👥 Merge duplicates (${duplicateNames.size / 2 | 0}+)`}
              </Button>
              }
            <OnboardingLinkForm models={models} />
          </div>
        </div>
        <p className="text-sm text-slate-500">{filtered.length} customers total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_13_up9fpo.png" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="pl-10" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="last_payment">Last payment</SelectItem>
            <SelectItem value="most_paid">Highest total</SelectItem>
            <SelectItem value="pay_day">Nearest pay day</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All models" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
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
        <EmptyState icon={UserCircle} title="No customers" description="Add your first customer to get started" actionLabel="Add customer" onAction={() => setShowForm(true)} /> :

        <div className="bg-[#1e1e1e] rounded-xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Pay Day</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Models</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Total / Payments</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Last payment</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const merged = mergedStats[c.id];
                  const st = merged ? { total: merged.total, lastDate: null, lastAmount: null } : customerStats[c.id] || {};
                  const rawSt = customerStats[c.id] || {};
                  const displayTotal = merged ? merged.total : rawSt.total || 0;
                  const displayCount = merged ? merged.count : customerPaymentCount[c.id] || 0;
                  const daysSinceLast = rawSt.lastDate ? Math.floor((Date.now() - new Date(rawSt.lastDate)) / 86400000) : null;
                  const isExpanded = expandedMerge === c.id;

                  return (
                    <React.Fragment key={c.id}>
                  <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={`border-b transition-all cursor-pointer group ${c.pay_day_of_month === todayDay ? "bg-gradient-to-r from-amber-900/20 to-yellow-900/10 border-amber-800/30 hover:from-amber-900/30" : "border-slate-700/30 hover:border-[#C9A227]/40 hover:shadow-[inset_3px_0_0_0_#C9A227]"}`}
                        onClick={() => navigate(`/CustomerDetail?id=${c.id}`)}>
                    
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {c.pay_day_of_month === todayDay &&
                            <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#C9A227] to-[#A8841C] -ml-1 flex-shrink-0" />
                            }
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.pay_day_of_month === todayDay ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white shadow-sm shadow-amber-200" : "bg-slate-700 text-slate-300"}`}>
                            {c.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${c.pay_day_of_month === todayDay ? "text-amber-300 font-semibold" : "text-slate-200"}`}>{c.full_name}</span>
                            {c.pay_day_of_month === todayDay &&
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-900/40 border border-amber-700/30 px-1.5 py-0.5 rounded-full">💰 payday</span>
                              }
                            {merged &&
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-700/30 px-1.5 py-0.5 rounded-full">
                                👥 {merged.allIds.length}× duplicate
                              </span>
                              }
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm hidden md:table-cell">
                        {c.pay_day_of_month ?
                          <span className="text-sm font-medium text-slate-300">Day {c.pay_day_of_month}</span> :
                          <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm hidden lg:table-cell">
                        {(() => {
                            const mids = c.assigned_models || (c.assigned_model ? [c.assigned_model] : []);
                            const names = mids.map((mid) => modelMap[mid]).filter(Boolean);
                            return names.length > 0 ?
                            <div className="flex flex-wrap gap-1.5">
                              {names.map((n) => (
                                <span key={n} className="inline-flex items-center text-xs font-medium bg-[#C9A227]/15 text-[#C9A227] border border-[#C9A227]/30 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                                  {n}
                                </span>
                              ))}
                            </div> :
                            <span className="text-slate-600">—</span>;
                          })()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-sm font-semibold text-slate-200">{displayTotal.toLocaleString()} CZK</p>
                        <p className="text-xs text-slate-500">{displayCount}× payments</p>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                        {daysSinceLast !== null ?
                          <div>
                             <p className="text-xs font-medium text-slate-300">{rawSt.lastAmount?.toLocaleString()} CZK</p>
                            <p className="text-xs text-slate-500">{daysSinceLast} days ago</p>
                          </div> :
                          <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {merged &&
                            <button
                              onClick={(e) => {e.stopPropagation();setExpandedMerge(isExpanded ? null : c.id);}}
                              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center text-indigo-500 text-xs font-bold"
                              title="Show payments by model">
                              
                              {isExpanded ? "▲" : "▼"}
                            </button>
                            }
                          <button
                              onClick={(e) => {e.stopPropagation();setEditing(c);setShowForm(true);}}
                              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-amber-900/40 transition-colors flex items-center justify-center">
                            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-4 h-4 object-contain" />
                          </button>
                          <button
                              onClick={(e) => handleDelete(e, c)}
                              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-900/40 transition-colors flex items-center justify-center">
                           <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-4 h-4 object-contain" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {/* Expanded: payments per model for duplicates */}
                    {merged && isExpanded &&
                      <tr className="bg-indigo-950/20 border-b border-indigo-700/20">
                        <td colSpan={6} className="px-8 py-3">
                          <p className="text-xs font-semibold text-indigo-300 mb-2">Payments by model (merged {merged.allIds.length} duplicate records):</p>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(merged.byModel).map(([modelName, data]) =>
                            <div key={modelName} className="flex items-center gap-2 bg-[#1e1e1e] border border-white/10 rounded-lg px-3 py-1.5">
                                <span className="text-xs font-medium text-amber-300 bg-amber-900/30 border border-amber-700/30 rounded px-1.5 py-0.5">{modelName}</span>
                                <span className="text-sm font-bold text-slate-200">{data.total.toLocaleString()} CZK
</span>
                                <span className="text-xs text-slate-500">{data.count}× payments</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      }
                  </React.Fragment>);

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
      </>}
    </div>);


}