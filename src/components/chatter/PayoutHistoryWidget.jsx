import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, X, Trash2 } from "lucide-react";

export default function PayoutHistoryWidget({ email, isAdminView = false }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ amount: "", period: "", note: "" });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: payouts = [] } = useQuery({
    queryKey: ["chatter-payouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }, "-created_date"),
    enabled: !!email
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let invoiceUrl = null;
      if (invoiceFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: invoiceFile });
        invoiceUrl = file_url;
      }
      return base44.entities.ChatterPayout.create({
        ...data,
        chatter_email: email,
        invoice_url: invoiceUrl
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-payouts", email] });
      setFormData({ amount: "", period: "", note: "" });
      setInvoiceFile(null);
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatterPayout.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-payouts", email] });
    }
  });

  const totalPaid = payouts.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-1">CELKEM VYPLACENO</p>
          <p className="text-2xl font-bold text-gray-900">{totalPaid.toLocaleString()} Kč</p>
        </div>
        {isAdminView && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-br from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white h-10 px-4 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Přidat výplatu
          </Button>
        )}
      </div>

      {showForm && isAdminView && (
        <div className="border-t border-gray-100 pt-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Částka (Kč)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="h-9"
            />
            <Input
              placeholder="Období (YYYY-MM)"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="h-9"
            />
          </div>
          <Input
            placeholder="Poznámka"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="h-9"
          />
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <Download className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{invoiceFile ? invoiceFile.name : "Nahrát fakturu"}</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.png"
              />
            </label>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={!formData.amount || saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-sm"
            >
              {saveMutation.isPending ? "..." : "Uložit"}
            </Button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ amount: "", period: "", note: "" });
                setInvoiceFile(null);
              }}
              className="text-gray-300 hover:text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {payouts.length > 0 ? (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{p.amount?.toLocaleString()} Kč</p>
                <p className="text-xs text-gray-400">{p.period} {p.note && `· ${p.note}`}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.invoice_url && (
                  <a
                    href={p.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C9A227] hover:text-[#A8841C] text-xs font-medium"
                  >
                    Faktura
                  </a>
                )}
                {isAdminView && (
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-4">Zatím žádné výplaty</p>
      )}
    </div>
  );
}