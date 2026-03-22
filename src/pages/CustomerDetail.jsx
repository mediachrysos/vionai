import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, CreditCard, Building, Pencil, Download, FileText, Upload, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import CustomerInlineEdit from "../components/customers/CustomerInlineEdit";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-50 text-slate-600",
  vip: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-600",
};

export default function CustomerDetail({ currentUser }) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const [showEdit, setShowEdit] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const list = await base44.entities.Customer.filter({ id });
      return list[0];
    },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: () => base44.entities.Payment.filter({ customer_id: id }, "-payment_date"),
    enabled: !!id,
  });

  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: allCustomers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer", id] }); setShowEdit(false); },
  });

  const handleInlineSave = async (data) => {
    await updateMutation.mutateAsync(data);
  };

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  const assignedModelNames = (customer?.assigned_models || (customer?.assigned_model ? [customer.assigned_model] : [])).map(mid => modelMap[mid]).filter(Boolean);

  if (!customer) return <div className="p-8 text-center text-slate-400">Načítám...</div>;

  const totalSpent = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const lastPayment = payments[0];

  // Export payments to CSV
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

  // Upload invoice for a payment
  const handleInvoiceUpload = async (e, paymentId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor(paymentId);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const existingInvoices = customer.invoices || [];
    await updateMutation.mutateAsync({
      invoices: [...existingInvoices, { payment_id: paymentId, file_url, file_name: file.name }]
    });
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
      <Link to={createPageUrl("Customers")} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#C9A227] mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zpět na zákazníky
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center text-xl font-bold text-[#C9A227]">
            {customer.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusColors[customer.status]}>{customer.status}</Badge>
              {customer.email && <span className="text-sm text-slate-400">{customer.email}</span>}
              {customer.phone && <span className="text-sm text-slate-400">{customer.phone}</span>}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowEdit(true)}>
          <Pencil className="w-4 h-4 mr-1" /> Upravit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Celkem utraceno</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{totalSpent.toLocaleString()} Kč</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Počet plateb</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Poslední platba</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {lastPayment ? `${(lastPayment.amount || 0).toLocaleString()} Kč` : "—"}
          </p>
          {lastPayment?.payment_date && <p className="text-xs text-gray-400">{format(new Date(lastPayment.payment_date), "d. M. yyyy")}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Den výplaty</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{customer.pay_day_of_month ? `${customer.pay_day_of_month}.` : "—"}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Info */}
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Detaily</h3>
            {!showEdit && (
              <button onClick={() => setShowEdit(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showEdit ? (
            <CustomerInlineEdit
              customer={customer}
              models={models}
              onSave={handleInlineSave}
              onCancel={() => setShowEdit(false)}
            />
          ) : (
            <div className="space-y-3">
              {customer.email && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /> {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" /> {customer.phone}
                </div>
              )}
              {customer.bank_name && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Building className="w-4 h-4 text-gray-400 flex-shrink-0" /> {customer.bank_name} — {customer.bank_account_number}
                </div>
              )}
              {assignedModelNames.length > 0 && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">Modelky</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedModelNames.map(name => (
                      <Badge key={name} variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 text-xs">{name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {customer.notes && (
                <div className="mt-3 p-3 bg-[#faf6e6] rounded-xl text-sm text-gray-600">{customer.notes}</div>
              )}
            </div>
          )}
        </div>

        {/* Payments + Invoices */}
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Platby a faktury</h3>
            <div className="flex gap-2">
              {(customer.invoices || []).length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadAllInvoices} className="h-7 text-xs px-2">
                  <Download className="w-3 h-3 mr-1" /> Faktury
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exportPayments} className="h-7 text-xs px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Download className="w-3 h-3 mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          {payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Zatím žádné platby</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {payments.map(p => {
                const invoice = (customer.invoices || []).find(inv => inv.payment_id === p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#faf6e6]/50 border border-transparent hover:border-[#e8d99a]/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{(p.amount || 0).toLocaleString()} Kč</p>
                        <p className="text-xs text-gray-400 truncate">
                          {p.model_name || "—"}
                          {p.service_type ? ` · ${p.service_type}` : ""}
                          {" · "}
                          {p.payment_date ? format(new Date(p.payment_date), "d. M. yyyy") : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {invoice ? (
                        <div className="flex items-center gap-1">
                          <a href={invoice.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline max-w-[80px] truncate">{invoice.file_name}</span>
                          </a>
                          <button onClick={() => removeInvoice(invoice.file_url)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={e => handleInvoiceUpload(e, p.id)}
                          />
                          <button
                            onClick={() => { fileInputRef.current.click(); setUploadingFor(p.id); }}
                            disabled={uploadingFor === p.id}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#C9A227] transition-colors"
                          >
                            {uploadingFor === p.id ? (
                              <span className="text-xs">Nahrávám...</span>
                            ) : (
                              <><Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Faktura</span></>
                            )}
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

      {/* hidden file inputs per payment — we use one shared input triggered programmatically */}
      {payments.map(p => (
        <input
          key={p.id}
          type="file"
          accept=".pdf"
          id={`file-input-${p.id}`}
          className="hidden"
          onChange={e => handleInvoiceUpload(e, p.id)}
        />
      ))}

      <CustomerFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={updateMutation.mutateAsync}
        customer={customer}
        models={models}
        users={users}
        allCustomers={allCustomers}
      />
    </div>
  );
}