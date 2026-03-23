import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Bot, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import EmptyState from "../components/ui-custom/EmptyState";
export default function Models({ currentUser }) {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list("-created_date"),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Model.create(data),
    onSuccess: (newModel) => {
      qc.invalidateQueries({ queryKey: ["models"] });
      window.location.href = `${createPageUrl("ModelDetail")}?id=${newModel.id}`;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Model.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });

  const handleDelete = (e, m) => {
    e.stopPropagation();
    if (window.confirm(`Opravdu smazat modelku "${m.name}"?`)) deleteMutation.mutate(m.id);
  };

  const handleCreateNew = async () => {
    const name = prompt("Jméno modelky:");
    if (name) createMutation.mutate({ name, status: "active" });
  };

  const filtered = models.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()));

  // Calc revenue per model
  const modelRevenue = {};
  const modelPaymentCount = {};
  payments.forEach(p => {
    if (p.model_id) {
      modelRevenue[p.model_id] = (modelRevenue[p.model_id] || 0) + (p.amount || 0);
      modelPaymentCount[p.model_id] = (modelPaymentCount[p.model_id] || 0) + 1;
    }
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <PageHeader title="Modelky" subtitle={`${models.length} modelek celkem`}>
        {currentUser?.role === "admin" && (
          <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
            <Plus className="w-4 h-4 mr-2" /> Přidat modelku
          </Button>
        )}
      </PageHeader>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat modelky..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bot} title="Žádné modelky" actionLabel="Přidat modelku" onAction={handleCreateNew} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <Link
              key={m.id}
              to={`${createPageUrl("ModelDetail")}?id=${m.id}`}
              className="group"
            >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 hover:border-[#e8d99a] hover:shadow-[0_8px_24px_rgba(201,162,39,0.09)] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-50 flex items-center justify-center border border-[#e8d99a]">
                    {m.profile_photo
                      ? <img src={m.profile_photo} alt={m.name} className="w-full h-full object-cover" />
                      : <Bot className="w-5 h-5 text-[#C9A227]" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{m.name}</h3>
                    <Badge variant="outline" className={m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100 text-xs" : "bg-gray-50 text-gray-400 border-gray-200 text-xs"}>
                      {m.status === "active" ? "Aktivní" : "Neaktivní"}
                    </Badge>
                  </div>
                </div>
                {currentUser?.role === "admin" && (
                     <button onClick={(e) => { e.preventDefault(); handleDelete(e, m); }} className="opacity-60 hover:opacity-100 transition-opacity">
                       <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-4 h-4 object-contain" />
                     </button>
                   )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Tržby</p>
                  <p className="text-lg font-semibold text-gray-900">{(modelRevenue[m.id] || 0).toLocaleString()} Kč</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Platby</p>
                  <p className="text-lg font-semibold text-gray-900">{modelPaymentCount[m.id] || 0}</p>
                </div>
              </div>
              {m.assigned_chatters?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.assigned_chatters.map(c => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <ModelFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveMutation.mutateAsync}
        model={editing}
        users={users}
      />
    </div>
  );
}