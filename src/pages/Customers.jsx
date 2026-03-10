import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, UserCircle, ExternalLink, Link2, Download } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "../components/ui-custom/PageHeader";
import EmptyState from "../components/ui-custom/EmptyState";
import CustomerFormModal from "../components/customers/CustomerFormModal";
import OnboardingLinkModal from "../components/customers/OnboardingLinkModal";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-100",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  vip: "bg-amber-50 text-amber-700 border-amber-100",
  blocked: "bg-red-50 text-red-600 border-red-100",
};

export default function Customers({ currentUser }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const qc = useQueryClient();

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

  const filtered = customers.filter(c => {
    const matchSearch = !search || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Zákazníci" subtitle={`${customers.length} zákazníků celkem`}>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadXlsx} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="w-4 h-4 mr-2" /> Export .xlsx
          </Button>
          <Button variant="outline" onClick={() => setShowOnboarding(true)} className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Link2 className="w-4 h-4 mr-2" /> Onboarding odkaz
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm shadow-indigo-200">
            <Plus className="w-4 h-4 mr-2" /> Přidat zákazníka
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat zákazníky..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="active">Aktivní</SelectItem>
            <SelectItem value="inactive">Neaktivní</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="blocked">Blokovaný</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={UserCircle} title="Žádní zákazníci" description="Přidej prvního zákazníka a začni" actionLabel="Přidat zákazníka" onAction={() => setShowForm(true)} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Jméno</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Modelka</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Stav</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Utraceno</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
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
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">{c.email || "—"}</td>
                     <td className="px-5 py-3.5 text-sm text-gray-400 hidden lg:table-cell">{modelMap[c.assigned_model] || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={statusColors[c.status] || statusColors.active}>
                        {c.status || "active"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-medium text-gray-800">
                      ${(c.total_spent || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={createPageUrl("CustomerDetail") + `?id=${c.id}`} onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-4 h-4 text-gray-300 hover:text-gray-600" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
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