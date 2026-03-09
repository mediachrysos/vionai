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
import EmptyState from "../components/ui-custom/EmptyState";
import ModelFormModal from "../components/models/ModelFormModal";

export default function Models({ currentUser }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get("action") === "new") setShowForm(true);
  }, []);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list("-created_date"),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.Model.update(editing.id, data);
      return base44.entities.Model.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["models"] }); setShowForm(false); setEditing(null); },
  });

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
      <PageHeader title="Models" subtitle={`${models.length} total models`}>
        {currentUser?.role === "admin" && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Model
          </Button>
        )}
      </PageHeader>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bot} title="No models found" actionLabel="Add Model" onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white rounded-xl border border-slate-200/60 p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => { setEditing(m); setShowForm(true); }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{m.name}</h3>
                    <Badge variant="outline" className={m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500"}>
                      {m.status}
                    </Badge>
                  </div>
                </div>
                <Link to={createPageUrl("ModelDetail") + `?id=${m.id}`} onClick={e => e.stopPropagation()}>
                  <ExternalLink className="w-4 h-4 text-slate-400 hover:text-indigo-500" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Revenue</p>
                  <p className="text-lg font-bold text-slate-900">${(modelRevenue[m.id] || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Payments</p>
                  <p className="text-lg font-bold text-slate-900">{modelPaymentCount[m.id] || 0}</p>
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