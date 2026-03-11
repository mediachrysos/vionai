import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, CreditCard, Filter, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import EmptyState from "../components/ui-custom/EmptyState";
import PaymentFormModal from "../components/payments/PaymentFormModal";
import CustomerFormModal from "../components/customers/CustomerFormModal";

const statusColors = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  failed: "bg-red-50 text-red-600 border-red-100",
  refunded: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function Payments({ currentUser }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const qc = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get("action") === "new") setShowForm(true);
  }, []);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500) });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payment.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleDelete = (p) => {
    if (window.confirm(`Opravdu chcete smazat platbu od "${p.customer_name || "?"}" (${(p.amount || 0).toLocaleString()} Kč)?`)) {
      deleteMutation.mutate(p.id);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.Payment.create(data);
      // Update customer totals
      if (data.customer_id) {
        const cust = customers.find(c => c.id === data.customer_id);
        if (cust) {
          await base44.entities.Customer.update(data.customer_id, {
            total_spent: (cust.total_spent || 0) + (data.amount || 0),
            payment_count: (cust.payment_count || 0) + 1,
          });
        }
      }
      return payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
    },
  });

  let filtered = payments.filter(p => {
    const matchSearch = !search ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.chatter_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.model_name?.toLowerCase().includes(search.toLowerCase());
    const matchModel = modelFilter === "all" || p.model_id === modelFilter;
    return matchSearch && matchModel;
  });

  if (sortBy === "highest") filtered.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  else if (sortBy === "lowest") filtered.sort((a, b) => (a.amount || 0) - (b.amount || 0));

  const totalAmount = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  const handleAddNewCustomer = (name) => {
    setNewCustomerName(name);
    setShowForm(false);
    setShowCustomerForm(true);
  };

  const handleCustomerSave = async (form) => {
    const newCust = await base44.entities.Customer.create(form);
    qc.invalidateQueries({ queryKey: ["customers"] });
    setShowCustomerForm(false);
    setShowForm(true);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Platby" subtitle={`${payments.length} celkem · ${totalAmount.toLocaleString()} Kč`}>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm shadow-indigo-200">
          <Plus className="w-4 h-4 mr-2" /> Přidat platbu
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat podle zákazníka, modelky, chattera..." className="pl-10" />
        </div>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny modelky</SelectItem>
            {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Nejnovější</SelectItem>
            <SelectItem value="highest">Nejvyšší</SelectItem>
            <SelectItem value="lowest">Nejnižší</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={CreditCard} title="Žádné platby" description="Přidej první platbu" actionLabel="Přidat platbu" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Zákazník</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Modelka</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Chatter</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Datum</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Stav</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Částka</th>
                  <th className="px-5 py-3"></th>
                  </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {p.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{p.customer_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">{p.model_name || "—"}</td>
                     <td className="px-5 py-3.5 text-sm text-gray-400 hidden lg:table-cell">{p.chatter_name || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                      {p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : p.created_date ? format(new Date(p.created_date), "MMM d") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={statusColors[p.status] || statusColors.completed}>
                        {p.status || "completed"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900">
                      {(p.amount || 0).toLocaleString()} Kč
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaymentFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={saveMutation.mutateAsync}
        onAddNewCustomer={handleAddNewCustomer}
        customers={customers}
        models={models}
        users={users}
        currentUser={currentUser}
      />

      <CustomerFormModal
        open={showCustomerForm}
        onClose={() => { setShowCustomerForm(false); setShowForm(true); }}
        onSave={handleCustomerSave}
        customer={{ full_name: newCustomerName }}
        models={models}
        users={users}
        allCustomers={customers}
      />
    </div>
  );
}