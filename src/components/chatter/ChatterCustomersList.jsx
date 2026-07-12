import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export default function ChatterCustomersList({ chatterEmail, assignedModelIds = [] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("last_payment");
  const [tab, setTab] = useState("customers");
  const [form, setForm] = useState({ full_name: "", model_id: assignedModelIds[0] || "" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const validModelIds = useMemo(() => assignedModelIds.filter((id) => id != null && id !== ""), [assignedModelIds]);

  const { data: allModels = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
  });

  const models = allModels.filter((m) => validModelIds.includes(m.id));
  const modelMap = useMemo(() => {
    const map = {};
    allModels.forEach((m) => {map[m.id] = m.name;});
    return map;
  }, [allModels]);

  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 1000),
    staleTime: 60000
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["chatter-customers", chatterEmail, validModelIds.join(",")],
    queryFn: async () => {
      const allCustomers = await base44.entities.Customer.list("-created_date", 5000);
      if (validModelIds.length === 0) return [];
      return allCustomers.filter((c) => c.assigned_models?.some((mid) => mid != null && validModelIds.includes(mid)));
    },
    enabled: !!chatterEmail,
    staleTime: 0
  });

  const customerStats = useMemo(() => {
    const stats = {};
    allPayments.forEach((p) => {
      if (!p.customer_id) return;
      if (validModelIds.length > 0 && !validModelIds.includes(p.model_id)) return;
      if (!stats[p.customer_id]) stats[p.customer_id] = { total: 0, lastDate: null, lastAmount: null, count: 0 };
      stats[p.customer_id].total += p.amount || 0;
      stats[p.customer_id].count += 1;
      if (!stats[p.customer_id].lastDate || p.payment_date > stats[p.customer_id].lastDate) {
        stats[p.customer_id].lastDate = p.payment_date;
        stats[p.customer_id].lastAmount = p.amount;
      }
    });
    return stats;
  }, [allPayments, validModelIds]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-customers"] });
      setForm({ full_name: "", model_id: validModelIds[0] || "" });
    }
  });

  const today = new Date();
  const todayDay = today.getDate();

  const paidCustomers = customers.filter((c) => (customerStats[c.id]?.count || 0) > 0);
  const pendingCustomers = customers.filter((c) => (customerStats[c.id]?.count || 0) === 0);

  const filtered = (tab === "customers" ? paidCustomers : pendingCustomers).filter((c) =>
  !search ||
  c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
  c.email?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const sa = customerStats[a.id] || {};
    const sb = customerStats[b.id] || {};
    if (sortBy === "most_paid") return (sb.total || 0) - (sa.total || 0);
    if (sortBy === "newest") return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    if (!sa.lastDate && !sb.lastDate) return 0;
    if (!sa.lastDate) return 1;
    if (!sb.lastDate) return -1;
    return sb.lastDate > sa.lastDate ? 1 : -1;
  });

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setTab("customers")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "customers" ? "bg-[#C9A227] text-white" : "text-slate-400 hover:text-slate-200"}`}>
            Customers ({paidCustomers.length})
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "pending" ? "bg-[#C9A227] text-white" : "text-slate-400 hover:text-slate-200"}`}>
            Pending ({pendingCustomers.length})
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs w-44 bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600" />
            
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 text-xs w-44 bg-white/5 border-white/10 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_payment">Last payment</SelectItem>
              <SelectItem value="most_paid">Most paid</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add form — always visible */}
      
























      

      {/* Table */}
      {isLoading ?
      <p className="text-xs text-slate-500 text-center py-8">Loading...</p> :
      filtered.length === 0 ?
      <p className="text-xs text-slate-500 text-center py-8">No customers yet</p> :

      <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-white/10 bg-[#1e1e1e] backdrop-blur-sm">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Model</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Pay Day</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Total / Payments</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
              const st = customerStats[c.id] || {};
              const daysSinceLast = st.lastDate ? Math.floor((Date.now() - new Date(st.lastDate)) / 86400000) : null;
              const isPayday = c.pay_day_of_month === todayDay;
              const mids = (c.assigned_models || []).filter((mid) => validModelIds.includes(mid));
              const modelNames = mids.map((mid) => modelMap[mid]).filter(Boolean);

              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/CustomerDetail?id=${c.id}`)}
                  className={`border-b cursor-pointer transition-colors ${isPayday ? "bg-[#C9A227]/10 border-[#C9A227]/20 hover:bg-[#C9A227]/15" : "border-white/5 hover:bg-white/5"}`}>
                  
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {isPayday && <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#C9A227] to-[#A8841C] -ml-1 flex-shrink-0" />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isPayday ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white" : "bg-white/10 text-slate-400"}`}>
                          {c.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isPayday ? "text-[#C9A227] font-semibold" : "text-slate-200"}`}>{c.full_name}</span>
                          {isPayday && <span className="text-[10px] font-bold text-[#C9A227] bg-[#C9A227]/15 border border-[#C9A227]/30 px-1.5 py-0.5 rounded-full">💰 payday</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {modelNames.length > 0 ?
                    <div className="flex flex-wrap gap-1">
                          {modelNames.map((n) => <span key={n} className="text-xs bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/20 rounded-md px-1.5 py-0.5">{n}</span>)}
                        </div> :
                    <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center hidden md:table-cell">
                      {c.pay_day_of_month ? <span className="text-sm font-medium text-slate-300">Day {c.pay_day_of_month}</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-sm font-semibold text-slate-200">{(st.total || 0).toLocaleString()} CZK</p>
                      <p className="text-xs text-slate-500">{st.count || 0}× payments</p>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                      {daysSinceLast !== null ?
                    <div>
                          <p className="text-xs font-medium text-slate-400">{st.lastAmount?.toLocaleString()} CZK</p>
                          <p className="text-xs text-slate-600">{daysSinceLast} days ago</p>
                        </div> :
                    <span className="text-xs text-slate-700">—</span>}
                    </td>
                  </tr>);

            })}
            </tbody>
          </table>
        </div>
      }
    </div>);

}