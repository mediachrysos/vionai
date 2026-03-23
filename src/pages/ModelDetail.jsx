import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bot, X, Users, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";

export default function ModelDetail({ currentUser }) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const { data: model } = useQuery({
    queryKey: ["model", id],
    queryFn: async () => { const list = await base44.entities.Model.filter({ id }); return list[0]; },
    enabled: !!id,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["model-payments", id],
    queryFn: () => base44.entities.Payment.filter({ model_id: id }, "-created_date"),
    enabled: !!id,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["model-customers", id],
    queryFn: () => base44.entities.Customer.filter({ assigned_model: id }),
    enabled: !!id,
  });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Model.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["model", id] }); setShowEdit(false); },
  });

  if (!model) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <Link to={createPageUrl("Models")} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C9A227] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zpět na modelky
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-amber-50 flex items-center justify-center border border-[#e8d99a]">
            {model.profile_photo
              ? <img src={model.profile_photo} alt={model.name} className="w-full h-full object-cover" />
              : <Bot className="w-7 h-7 text-[#C9A227]" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{model.name}</h1>
            <Badge variant="outline" className={model.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>
              {model.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowEdit(true)}>
          <Pencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Celkové tržby</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalRevenue.toLocaleString()} Kč</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Platby</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Zákazníci</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-[#C9A227]" /> Zákazníci</h3>
          {customers.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Žádní zákazníci</p> : (
            <div className="space-y-2">
              {customers.map(c => (
                <Link key={c.id} to={createPageUrl("CustomerDetail") + `?id=${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#faf6e6]/50 hover:border-[#e8d99a]/50 border border-transparent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-xs font-semibold text-[#C9A227]">{c.full_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.email || "—"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#C9A227]" /> Poslední platby</h3>
          {payments.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Zatím žádné platby</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {payments.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#faf6e6]/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.customer_name || "Zákazník"}</p>
                    <p className="text-xs text-gray-400">{p.created_date ? format(new Date(p.created_date), "d. M. yyyy") : "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{(p.amount || 0).toLocaleString()} Kč</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModelFormModal open={showEdit} onClose={() => setShowEdit(false)} onSave={updateMutation.mutateAsync} model={model} users={users} />
    </div>
  );
}