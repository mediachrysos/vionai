import React, { useState, useEffect, useMemo } from "react";
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
    queryFn: async () => {const list = await base44.entities.Model.filter({ id });return list[0];},
    enabled: !!id
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["model-payments", id],
    queryFn: () => base44.entities.Payment.filter({ model_id: id }, "-created_date"),
    enabled: !!id
  });
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
    staleTime: 60000,
    enabled: !!id
  });

  // Derive unique customers from payments (assigned_models is an array, can't filter server-side)
  const customers = useMemo(() => {
    const seen = new Set();
    const result = [];
    payments.forEach(p => {
      if (p.customer_id && !seen.has(p.customer_id)) {
        seen.add(p.customer_id);
        const c = allCustomers.find(c => c.id === p.customer_id);
        if (c) result.push(c);
        else result.push({ id: p.customer_id, full_name: p.customer_name || "—" });
      }
    });
    return result;
  }, [payments, allCustomers]);
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Model.update(id, data),
    onSuccess: () => {qc.invalidateQueries({ queryKey: ["model", id] });setEditMode(false);}
  });

  useEffect(() => {
    if (model) setEditForm({ name: model.name, status: model.status, notes: model.notes || "", story: model.story || "", assigned_chatters: model.assigned_chatters || [], profile_photo: model.profile_photo || "" });
  }, [model]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm((prev) => ({ ...prev, profile_photo: file_url }));
    setUploading(false);
  };

  const toggleChatter = (email) => {
    setEditForm((prev) => ({
      ...prev,
      assigned_chatters: prev.assigned_chatters.includes(email) ?
      prev.assigned_chatters.filter((e) => e !== email) :
      [...prev.assigned_chatters, email]
    }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync(editForm);
  };

  if (!model) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <Link to={createPageUrl("Models")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#C9A227] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zpět na modelky
      </Link>

      {editMode ?
      <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-100">Upravit modelku</h2>
            <button onClick={() => setEditMode(false)} className="text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Profilová fotografie</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-amber-950/30 flex items-center justify-center border border-amber-700/30">
                  {editForm.profile_photo ?
                <img src={editForm.profile_photo} alt="foto" className="w-full h-full object-cover" /> :
                <Bot className="w-8 h-8 text-[#C9A227]" />}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    <div className="px-3 py-1.5 rounded-lg bg-amber-950/30 text-amber-300 text-xs font-medium border border-amber-700/30 hover:bg-amber-950/50 transition-colors">
                      {uploading ? "Nahrávám..." : "Nahrát fotku"}
                    </div>
                  </label>
                  {editForm.profile_photo &&
                <button onClick={() => setEditForm((prev) => ({ ...prev, profile_photo: "" }))} className="text-xs text-red-400 hover:text-red-600">Odebrat</button>
                }
                </div>
              </div>
            </div>

            <div>
              <Label>Jméno modelky *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Jméno modelky" />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="inactive">Neaktivní</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Interní poznámky</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Interní poznámky..." />
            </div>

            <div>
              <Label>Story modelky</Label>
              <Textarea value={editForm.story} onChange={(e) => setEditForm((prev) => ({ ...prev, story: e.target.value }))} rows={6} placeholder="Příběh, background, osobnostní rysy..." className="font-mono text-sm" />
            </div>

            <div>
              <Label>Přiřazení chatteři</Label>
              <p className="text-xs text-slate-500 mb-3">Klikni na chattera pro přiřazení / odebrání</p>
              <div className="flex flex-wrap gap-2">
                {users?.map((u) =>
              <button
                key={u.email}
                onClick={() => toggleChatter(u.email)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                editForm.assigned_chatters.includes(u.email) ?
                "bg-[#C9A227] text-white" :
                "bg-slate-800 text-slate-400 border border-white/10 hover:bg-slate-700"}`
                }>
                
                    {u.full_name} {editForm.assigned_chatters.includes(u.email) && <X className="w-3 h-3 inline ml-1" />}
                  </button>
              )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" onClick={() => setEditMode(false)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={!editForm.name || updateMutation.isPending} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
                {updateMutation.isPending ? "Ukládám..." : "Uložit"}
              </Button>
            </div>
          </div>
        </div> :

      <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-amber-950/30 flex items-center justify-center border border-amber-700/30">
              {model.profile_photo ?
            <img src={model.profile_photo} alt={model.name} className="w-full h-full object-cover" /> :
            <Bot className="w-7 h-7 text-[#C9A227]" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{model.name}</h1>
              

            
            </div>
          </div>
          {currentUser?.role === "admin" &&
        <Button onClick={() => setEditMode(true)} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
              Upravit
            </Button>
        }
        </div>
      }

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Celkové tržby</p>
          <p className="text-2xl font-bold text-[#C9A227] mt-1">{totalRevenue.toLocaleString()} Kč</p>
        </div>
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Platby</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{payments.length}</p>
        </div>
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Zákazníci</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{customers.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"> Zákazníci</h3>
          {customers.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Žádní zákazníci</p> :
          <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.map((c) =>
            <Link key={c.id} to={createPageUrl("CustomerDetail") + `?id=${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-950/40 flex items-center justify-center text-xs font-semibold text-[#C9A227]">{c.full_name?.[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">{c.full_name}</p>
                    <p className="text-xs text-slate-500">{c.email || "—"}</p>
                  </div>
                </Link>
            )}
            </div>
          }
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"> Poslední platby</h3>
          {payments.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Zatím žádné platby</p> :
          <div className="space-y-2 max-h-80 overflow-y-auto">
              {payments.slice(0, 10).map((p) =>
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-300">{p.customer_name || "Zákazník"}</p>
                    <p className="text-xs text-slate-500">{p.created_date ? format(new Date(p.created_date), "d. M. yyyy") : "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-200">{(p.amount || 0).toLocaleString()} Kč</span>
                </div>
            )}
            </div>
          }
        </div>
      </div>


    </div>);

}