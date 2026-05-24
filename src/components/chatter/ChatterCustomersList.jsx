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
  const [form, setForm] = useState({ full_name: "", model_id: assignedModelIds[0] || "" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const validModelIds = useMemo(() => assignedModelIds.filter(id => id != null && id !== ""), [assignedModelIds]);

  const { data: allModels = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
  });

  const models = allModels.filter(m => validModelIds.includes(m.id));
  const modelMap = useMemo(() => {
    const map = {};
    allModels.forEach(m => { map[m.id] = m.name; });
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
      return allCustomers.filter(c => {
        if (c.assigned_chatter === chatterEmail) return true;
        if (validModelIds.length > 0 && c.assigned_models?.some(mid => mid != null && validModelIds.includes(mid))) return true;
        return false;
      });
    },
    enabled: !!chatterEmail,
    staleTime: 0
  });

  const customerStats = useMemo(() => {
    const stats = {};
    allPayments.forEach(p => {
      if (!p.customer_id) return;
      if (!stats[p.customer_id]) stats[p.customer_id] = { total: 0, lastDate: null, lastAmount: null, count: 0 };
      stats[p.customer_id].total += p.amount || 0;
      stats[p.customer_id].count += 1;
      if (!stats[p.customer_id].lastDate || p.payment_date > stats[p.customer_id].lastDate) {
        stats[p.customer_id].lastDate = p.payment_date;
        stats[p.customer_id].lastAmount = p.amount;
      }
    });
    return stats;
  }, [allPayments]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-customers"] });
      setForm({ full_name: "", model_id: validModelIds[0] || "" });
    }
  });

  const today = new Date();
  const todayDay = today.getDate();

  const filtered = customers.filter(c =>
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
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-gray-800 text-sm">Zákazníci ({customers.length})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Hledat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs w-44"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_payment">Poslední platba</SelectItem>
              <SelectItem value="most_paid">Nejvíc zaplatil</SelectItem>
              <SelectItem value="newest">Nejnovější</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Add form — always visible */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <Input
          placeholder="Jméno *"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="h-8 text-xs"
        />
        <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Vybrat modelku *" />
          </SelectTrigger>
          <SelectContent>
            {models.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => saveMutation.mutate({ full_name: form.full_name, assigned_models: form.model_id ? [form.model_id] : [], assigned_chatter: chatterEmail })}
          disabled={!form.full_name || saveMutation.isPending}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
        >
          {saveMutation.isPending ? "..." : "Vytvořit odkaz"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-xs text-gray-400 text-center py-8">Načítám...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">Zatím žádní zákazníci</p>
      ) : (
        <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50/90 backdrop-blur-sm">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Jméno</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Modelka</th>
                <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Pay Day</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Celkem / Platby</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Poslední platba</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const st = customerStats[c.id] || {};
                const daysSinceLast = st.lastDate ? Math.floor((Date.now() - new Date(st.lastDate)) / 86400000) : null;
                const isPayday = c.pay_day_of_month === todayDay;
                const mids = c.assigned_models || [];
                const modelNames = mids.map(mid => modelMap[mid]).filter(Boolean);

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/CustomerDetail?id=${c.id}`)}
                    className={`border-b cursor-pointer transition-colors ${isPayday ? "bg-gradient-to-r from-amber-50 to-yellow-50/30 border-amber-100 hover:from-amber-100/70" : "border-gray-50 hover:bg-gray-50/60"}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {isPayday && <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#C9A227] to-[#A8841C] -ml-1 flex-shrink-0" />}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isPayday ? "bg-gradient-to-br from-[#C9A227] to-[#A8841C] text-white shadow-sm shadow-amber-200" : "bg-gray-100 text-gray-600"}`}>
                          {c.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isPayday ? "text-amber-900 font-semibold" : "text-gray-800"}`}>{c.full_name}</span>
                          {isPayday && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">💰 payday</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {modelNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {modelNames.map(n => <span key={n} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-1.5 py-0.5">{n}</span>)}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center hidden md:table-cell">
                      {c.pay_day_of_month ? <span className="text-sm font-medium text-gray-700">Day {c.pay_day_of_month}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-sm font-semibold text-gray-800">{(st.total || 0).toLocaleString()} Kč</p>
                      <p className="text-xs text-gray-400">{st.count || 0}× platby</p>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                      {daysSinceLast !== null ? (
                        <div>
                          <p className="text-xs font-medium text-gray-600">{st.lastAmount?.toLocaleString()} Kč</p>
                          <p className="text-xs text-gray-400">před {daysSinceLast} dny</p>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}