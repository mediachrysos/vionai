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
import OnboardingLinkForm from "../components/customers/OnboardingLinkForm";
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
  const [defaultModelSet, setDefaultModelSet] = useState(false);

  const { showAll, toggle } = useChatterFilter();
  const qc = useQueryClient();
  const isAdmin = currentUser?.role === "admin";
  const navigate = useNavigate();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
    staleTime: 0,
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
    models.forEach((mdl) => { m[mdl.id] = mdl.name; });
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
        ...dupes.flatMap((d) => d.assigned_models || []),
      ])];
      // Update primary with merged models and sum totals
      const mergedTotal = group.reduce((s, c) => s + (c.total_spent || 0), 0);
      const mergedCount = group.reduce((s, c) => s + (c.payment_count || 0), 0);
      await base44.entities.Customer.update(primary.id, {
        assigned_models: allModelIds,
        total_spent: mergedTotal,
        payment_count: mergedCount,
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
    ["Name", "Email", "Phone", "Bank", "Account Number", "Pay Day", "Total", "Payment Count"],
    ...customers
      .filter((c) => (customerStats[c.id]?.total || 0) > 0)
      .map((c) => {
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
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
          <div className="flex gap-2 flex-wrap items-end">
            <Button variant="outline" onClick={downloadXlsx} className="bg-background text-[#ebc624] px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-emerald-200 hover:bg-emerald-50">
              <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_20_hrhhn2.png" alt="" className="w-4 h-4 mr-2 object-contain" /> Export .xlsx
            </Button>
            {duplicateNames.size > 0 && (
              <Button
                onClick={handleMergeDuplicates}
                disabled={merging}
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-9"
              >
                {merging ? "Merging..." : `👥 Merge duplicates (${duplicateNames.size / 2 | 0}+)`}
              </Button>
            )}
            <OnboardingLinkForm models={models} />
          </div>
        </div>
        <p className="text-sm text-gray-500">{customers.length} customers total</p>
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

      <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Pay Day</th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Models</th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Total / Payments</th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Last payment</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                const merged = mergedStats[c.id];
                const st = merged ? { total: merged.total, lastDate: null, lastAmount: null } : (customerStats[c.id] || {});
                const rawSt = customerStats[c.id] || {};
                const displayTotal = merged ? merged.total : (rawSt.total || 0);
                const displayCount = merged ? merged.count : (customerPaymentCount[c.id] || 0);
                const daysSinceLast = rawSt.lastDate ? Math.floor((Date.now() - new Date(rawSt.lastDate)) / 86400000) : null;
                const isExpanded = expandedMerge === c.id;

                return (
                  <React.Fragment key={c.id}>
                  <motion.tr
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${c.pay_day_of_month === todayDay ? "text-amber-900 font-semibold" : "text-gray-800"}`}>{c.full_name}</span>
                            {c.pay_day_of_month === todayDay && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">💰 payday</span>
                            )}
                            {merged && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                👥 {merged.allIds.length}× duplicate
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm hidden md:table-cell">
                        {c.pay_day_of_month ?
                      <span className="text-sm font-medium text-gray-700">Day {c.pay_day_of_month}</span> :
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
                        <p className="text-sm font-semibold text-gray-800">{displayTotal.toLocaleString()} Kč</p>
                        <p className="text-xs text-gray-400">{displayCount}× payments</p>
                      </td>
                      <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                        {daysSinceLast !== null ?
                      <div>
                            <p className="text-xs font-medium text-gray-600">{rawSt.lastAmount?.toLocaleString()} Kč</p>
                            <p className="text-xs text-gray-400">{daysSinceLast} days ago</p>
                          </div> :
                      <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {merged && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedMerge(isExpanded ? null : c.id); }}
                              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center text-indigo-500 text-xs font-bold"
                              title="Show payments by model"
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          )}
                          <button
                            onClick={(e) => {e.stopPropagation();setEditing(c);setShowForm(true);}}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-amber-100 transition-colors flex items-center justify-center">
                            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-4 h-4 object-contain" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, c)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 transition-colors flex items-center justify-center">
                            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-4 h-4 object-contain" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    {/* Expanded: payments per model for duplicates */}
                    {merged && isExpanded && (
                      <tr className="bg-indigo-50/40 border-b border-indigo-100">
                        <td colSpan={6} className="px-8 py-3">
                          <p className="text-xs font-semibold text-indigo-600 mb-2">Payments by model (merged {merged.allIds.length} records with the same name):</p>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(merged.byModel).map(([modelName, data]) => (
                              <div key={modelName} className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg px-3 py-1.5">
                                <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">{modelName}</span>
                                <span className="text-sm font-bold text-gray-800">{data.total.toLocaleString()} Kč</span>
                                <span className="text-xs text-gray-400">{data.count}× payments</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
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
      


      
    </div>);

}