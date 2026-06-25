import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Building, CreditCard, Download, FileText, Upload, X, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import CustomerInlineEdit from "../components/customers/CustomerInlineEdit";

const STATUS_STYLES = {
  active:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  inactive: "bg-slate-500/15 text-slate-400 border border-slate-500/25",
  vip:      "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  blocked:  "bg-red-500/15 text-red-400 border border-red-500/25",
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CustomerDetail({ currentUser }) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => { const list = await base44.entities.Customer.filter({ id }); return list[0]; },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: () => base44.entities.Payment.filter({ customer_id: id }, "-payment_date"),
    enabled: !!id,
  });

  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const { data: onboardingRequests = [] } = useQuery({
    queryKey: ["onboarding-requests", id, customer?.full_name],
    queryFn: async () => {
      const byId = await base44.entities.CustomerOnboardingRequest.filter({ created_customer_id: id });
      if (byId.length > 0) return byId;
      if (customer?.full_name) {
        const byName = await base44.entities.CustomerOnboardingRequest.filter({ full_name: customer.full_name });
        return byName.filter(r => r.status === "completed");
      }
      return [];
    },
    enabled: !!id && !!customer,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer", id] }); setShowEdit(false); },
  });

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });
  const userMap = {};
  users.forEach(u => { userMap[u.email] = u.full_name || u.email; });

  const assignedModelNames = (customer?.assigned_models || []).map(mid => modelMap[mid]).filter(Boolean);

  if (!customer) return (
    <div className="h-full flex items-center justify-center text-slate-500 text-sm">Načítám...</div>
  );

  const totalSpent = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const lastPayment = payments[0];

  const exportPayments = () => {
    const rows = [
      ["Datum", "Částka (Kč)", "Modelka", "Typ služby", "Stav"],
      ...payments.map(p => [
        p.payment_date || p.created_date?.split("T")[0] || "",
        p.amount || 0,
        p.model_name || "",
        p.service_type || "",
        p.status || "completed",
      ])
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platby_${customer.full_name?.replace(/ /g, "_")}.csv`;
    a.click();
  };

  const handleInvoiceUpload = async (e, paymentId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor(paymentId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingInvoices = customer.invoices || [];
    await updateMutation.mutateAsync({ invoices: [...existingInvoices, { payment_id: paymentId, file_url, file_name: file.name }] });
    setUploadingFor(null);
    e.target.value = "";
  };

  const removeInvoice = async (fileUrl) => {
    const updated = (customer.invoices || []).filter(inv => inv.file_url !== fileUrl);
    await updateMutation.mutateAsync({ invoices: updated });
  };

  const downloadAllInvoices = () => {
    (customer.invoices || []).forEach(inv => {
      const a = document.createElement("a");
      a.href = inv.file_url;
      a.download = inv.file_name || "faktura.pdf";
      a.target = "_blank";
      a.click();
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Back */}
      <Link to={createPageUrl("Customers")} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#C9A227] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Zpět na zákazníky
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/25 flex items-center justify-center text-xl font-bold text-[#C9A227] flex-shrink-0">
          {customer.full_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-100 truncate">{customer.full_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[customer.status] || STATUS_STYLES.active}`}>
              {customer.status || "active"}
            </span>
            {customer.phone && <span className="text-xs text-slate-500">{customer.phone}</span>}
            {customer.email && <span className="text-xs text-slate-500">{customer.email}</span>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Celkem utraceno" value={`${totalSpent.toLocaleString()} Kč`} />
        <StatCard label="Počet plateb" value={payments.length} />
        <StatCard
          label="Poslední platba"
          value={lastPayment ? `${(lastPayment.amount || 0).toLocaleString()} Kč` : "—"}
          sub={lastPayment?.payment_date ? format(new Date(lastPayment.payment_date), "d. M. yyyy") : null}
        />
        <StatCard label="Den výplaty" value={customer.pay_day_of_month ? `${customer.pay_day_of_month}.` : "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Detail card */}
        <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Detaily</h3>
            {!showEdit && (
              <button onClick={() => setShowEdit(true)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#C9A227]/15 border border-white/8 hover:border-[#C9A227]/30 flex items-center justify-center transition-all">
                <Pencil className="w-3 h-3 text-slate-400 hover:text-[#C9A227]" />
              </button>
            )}
          </div>

          {showEdit ? (
            <CustomerInlineEdit
              customer={customer}
              models={models}
              onSave={(data) => updateMutation.mutateAsync(data)}
              onCancel={() => setShowEdit(false)}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className={`text-sm ${customer.email ? "text-slate-300" : "text-slate-600"}`}>{customer.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className={`text-sm ${customer.phone ? "text-slate-300" : "text-slate-600"}`}>{customer.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className={`text-sm ${customer.bank_name ? "text-slate-300" : "text-slate-600"}`}>
                  {customer.bank_name ? `${customer.bank_name} — ${customer.bank_account_number || "—"}` : "—"}
                </span>
              </div>
              {assignedModelNames.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-slate-600 text-sm mt-0.5 flex-shrink-0">🎭</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedModelNames.map(name => (
                      <span key={name} className="text-xs bg-[#C9A227]/10 border border-[#C9A227]/25 text-[#C9A227] rounded-full px-2 py-0.5">{name}</span>
                    ))}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div className="mt-2 p-3 bg-[#C9A227]/8 border border-[#C9A227]/15 rounded-lg text-sm text-slate-300">{customer.notes}</div>
              )}
            </div>
          )}
        </div>

        {/* Payments card */}
        <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Platby a faktury</h3>
            <div className="flex gap-2">
              {(customer.invoices || []).length > 0 && (
                <button onClick={downloadAllInvoices} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#C9A227] bg-white/5 hover:bg-[#C9A227]/10 border border-white/8 hover:border-[#C9A227]/25 rounded-lg px-2.5 py-1 transition-all">
                  <Download className="w-3 h-3" /> Faktury
                </button>
              )}
              <button onClick={exportPayments} className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-lg px-2.5 py-1 transition-all">
                <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_20_hrhhn2.png" alt="" className="w-3 h-3 object-contain" /> Export CSV
              </button>
            </div>
          </div>

          {payments.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">Zatím žádné platby</p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {payments.map(p => {
                const invoice = (customer.invoices || []).find(inv => inv.payment_id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/4 transition-colors group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{(p.amount || 0).toLocaleString()} Kč</p>
                        <p className="text-xs text-slate-500 truncate">
                          {[p.chatter_name || p.chatter_email, p.payment_date ? format(new Date(p.payment_date), "d. M. yyyy") : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {invoice ? (
                        <div className="flex items-center gap-1">
                          <a href={invoice.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#C9A227] hover:underline">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline max-w-[70px] truncate">{invoice.file_name}</span>
                          </a>
                          <button onClick={() => removeInvoice(invoice.file_url)} className="text-slate-600 hover:text-red-400 transition-colors ml-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={e => handleInvoiceUpload(e, p.id)} />
                          <button
                            onClick={() => { fileInputRef.current.click(); setUploadingFor(p.id); }}
                            disabled={uploadingFor === p.id}
                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-[#C9A227] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            {uploadingFor === p.id ? <span>Nahrávám...</span> : <><Upload className="w-3.5 h-3.5" /><span className="hidden sm:inline">Faktura</span></>}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Onboarding */}
      {onboardingRequests.length > 0 && (
        <div className="mt-4 bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Onboarding</h3>
          <div className="space-y-2">
            {onboardingRequests.map(req => (
              <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/6">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-sm">📋</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      req.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
                      req.status === "expired" ? "bg-red-500/15 text-red-400 border border-red-500/25" :
                      "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    }`}>
                      {req.status === "completed" ? "✅ Dokončeno" : req.status === "expired" ? "⌛ Expirováno" : "⏳ Čeká"}
                    </span>
                    {req.assigned_model && modelMap[req.assigned_model] && (
                      <span className="text-xs bg-[#C9A227]/10 text-[#C9A227] border border-[#C9A227]/20 rounded-full px-2 py-0.5">
                        {modelMap[req.assigned_model]}
                      </span>
                    )}
                    {req.assigned_chatter && (
                      <span className="text-xs text-slate-500">poslal: {userMap[req.assigned_chatter] || req.assigned_chatter}</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs text-slate-600 flex-wrap">
                    <span>Vytvořeno: {req.created_date ? format(new Date(req.created_date), "d. M. yyyy HH:mm") : "—"}</span>
                    {req.status === "completed" && req.updated_date && (
                      <span className="text-emerald-500 font-medium">Vyplněno: {format(new Date(req.updated_date), "d. M. yyyy HH:mm")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {payments.map(p => (
        <input key={p.id} type="file" accept=".pdf" id={`file-input-${p.id}`} className="hidden" onChange={e => handleInvoiceUpload(e, p.id)} />
      ))}
    </div>
  );
}