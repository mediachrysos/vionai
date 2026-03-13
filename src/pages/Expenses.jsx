import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Receipt, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import EmptyState from "../components/ui-custom/EmptyState";
import ExpenseFormModal from "../components/expenses/ExpenseFormModal";

const CATEGORY_COLORS = {
  marketing: "bg-pink-100 text-pink-700",
  software: "bg-blue-100 text-blue-700",
  salaries: "bg-purple-100 text-purple-700",
  infrastructure: "bg-orange-100 text-orange-700",
  taxes: "bg-red-100 text-red-700",
  other: "bg-slate-100 text-slate-600",
};

export default function Expenses({ currentUser }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => editing
      ? base44.entities.Expense.update(editing.id, data)
      : base44.entities.Expense.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const monthExpenses = expenses.filter(e => (e.expense_date || e.created_date?.split("T")[0]) >= monthStart);
  const monthTotal = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <MonthlyGoalBar />
      <PageHeader title="Výdaje" subtitle={`${totalFiltered.toLocaleString()} Kč zobrazeno · ${monthTotal.toLocaleString()} Kč tento měsíc`}>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
          <Plus className="w-4 h-4 mr-2" /> Zaznamenat výdaj
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat výdaje..." className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="salaries">Mzdy</SelectItem>
            <SelectItem value="infrastructure">Infrastruktura</SelectItem>
            <SelectItem value="taxes">Daně</SelectItem>
            <SelectItem value="other">Ostatní</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Žádné výdaje" actionLabel="Zaznamenat výdaj" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Název</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Kategorie</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Datum</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Propojená platba</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Částka</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const linked = e.linked_payment_id ? payments.find(p => p.id === e.linked_payment_id) : null;
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer" onClick={() => { setEditing(e); setShowForm(true); }}>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-800">{e.title}</p>
                        {e.note && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{e.note}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className={cn("text-xs capitalize", CATEGORY_COLORS[e.category])}>{e.category}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                         {e.expense_date ? format(new Date(e.expense_date), "d. M. yyyy") : "—"}
                       </td>
                       <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                         {linked ? <span className="text-gray-700 text-xs font-medium">{linked.customer_name} — {(linked.amount || 0).toLocaleString()} Kč</span> : "—"}
                       </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold text-red-600">-{(e.amount || 0).toLocaleString()} Kč</span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={ev => ev.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-red-500" onClick={() => deleteMutation.mutate(e.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-100">
                     <td colSpan={4} className="px-5 py-3 text-sm font-semibold text-gray-700">Celkem</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-red-600">-{totalFiltered.toLocaleString()} Kč</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <ExpenseFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveMutation.mutateAsync}
        expense={editing}
        payments={payments}
      />
    </div>
  );
}