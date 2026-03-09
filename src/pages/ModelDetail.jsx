import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Bot, Pencil, Users, CreditCard, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import ModelFormModal from "../components/models/ModelFormModal";

export default function ModelDetail({ currentUser }) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const [showEdit, setShowEdit] = useState(false);
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
      <Link to={createPageUrl("Models")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center">
            <Bot className="w-7 h-7 text-purple-500" />
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
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Customers</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Linked Customers</CardTitle></CardHeader>
          <CardContent>
            {customers.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No customers linked</p> : (
              <div className="space-y-2">
                {customers.map(c => (
                  <Link key={c.id} to={createPageUrl("CustomerDetail") + `?id=${c.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600">{c.full_name?.[0]?.toUpperCase()}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.email || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No payments yet</p> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {payments.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.customer_name || "Customer"}</p>
                      <p className="text-xs text-slate-400">{p.created_date ? format(new Date(p.created_date), "MMM d, yyyy") : "—"}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">${(p.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ModelFormModal open={showEdit} onClose={() => setShowEdit(false)} onSave={updateMutation.mutateAsync} model={model} users={users} />
    </div>
  );
}