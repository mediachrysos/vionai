import React, { useState, useEffect, useCallback } from "react";
import { usePayments } from "@/hooks/usePayments";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, CreditCard, Filter, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import EmptyState from "../components/ui-custom/EmptyState";
import PaymentFormModal from "../components/payments/PaymentFormModal";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import PaymentInvoiceActions from "../components/invoices/PaymentInvoiceActions";
import { useWorkspace } from "@/lib/WorkspaceContext";

const statusColors = {
  completed: "bg-emerald-950/50 text-emerald-400 border-emerald-700/30",
  pending: "bg-amber-950/50 text-amber-300 border-amber-700/30",
  failed: "bg-red-950/50 text-red-400 border-red-700/30",
  refunded: "bg-slate-800 text-slate-500 border-white/10",
};

export default function Payments({ currentUser }) {
  const { currency } = useWorkspace();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const qc = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get("action") === "new") setShowForm(true);
  }, []);

  const { data: payments = [], isLoading } = usePayments();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 5000), staleTime: 60 * 1000 });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankAccounts"], queryFn: () => base44.entities.BankAccount.filter({ is_active: true }) });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payment.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const handleDelete = (p) => {
    if (window.confirm(`Are you sure you want to delete the payment from "${p.customer_name || "?"}" (${(p.amount || 0).toLocaleString()} ${currency})?`)) {
      deleteMutation.mutate(p.id);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.Payment.create(data);
      if (data.customer_id) {
        const cust = customers.find(c => c.id === data.customer_id);
        if (cust) {
          const updates = {
            total_spent: (cust.total_spent || 0) + (data.amount || 0),
            payment_count: (cust.payment_count || 0) + 1,
          };
          if (data.service_type) {
            const entry = data.model_name ? `${data.model_name}: ${data.service_type}` : data.service_type;
            updates.sent_content = cust.sent_content ? `${cust.sent_content}\n${entry}` : entry;
          }
          await base44.entities.Customer.update(data.customer_id, updates);
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

  const updateMutation = useMutation({
    mutationFn: async (data) => base44.entities.Payment.update(editingPayment.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setEditingPayment(null);
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
      <MonthlyGoalBar />
      <PageHeader title="Payments" subtitle={`${payments.length} total · ${totalAmount.toLocaleString()} ${currency}`}>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
          <Plus className="w-4 h-4 mr-2" /> Add payment
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, model, chatter..." className="pl-10" />
        </div>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="highest">Highest</SelectItem>
            <SelectItem value="lowest">Lowest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={CreditCard} title="No payments" description="Add your first payment" actionLabel="Add payment" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-[#1e1e1e] rounded-xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Model</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Chatter</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Account</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Invoice</th>
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
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-amber-300">
                          {p.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{p.customer_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">{p.model_name || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 hidden lg:table-cell">{p.chatter_name || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 hidden md:table-cell">
                      {p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : p.created_date ? format(new Date(p.created_date), "MMM d") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-400 hidden lg:table-cell">
                      {p.account_name || bankAccounts.find(a => a.id === p.bank_account_id)?.name || <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={statusColors[p.status] || statusColors.completed}>
                        {p.status || "completed"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-slate-100">
                      {(p.amount || 0).toLocaleString()} {currency}
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentInvoiceActions payment={p} onInvoiceCreated={() => qc.invalidateQueries({ queryKey: ["invoices"] })} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPayment(p)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(p)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-5 h-5 object-contain" />
                        </Button>
                      </div>
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

      {/* Edit modal */}
      {editingPayment && (
        <PaymentFormModal
          open={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={updateMutation.mutateAsync}
          customers={customers}
          models={models}
          users={users}
          currentUser={currentUser}
          existingPayment={editingPayment}
        />
      )}

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