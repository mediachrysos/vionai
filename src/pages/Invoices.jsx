import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import EmptyState from "../components/ui-custom/EmptyState";
import InvoiceModal from "../components/invoices/InvoiceModal";

const statusColors = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  issued: "bg-blue-50 text-blue-700 border-blue-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelled: "bg-red-50 text-red-600 border-red-100",
};

export default function Invoices({ currentUser }) {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleDelete = (inv) => {
    if (window.confirm(`Opravdu chcete smazat fakturu č. ${inv.invoice_number}?`)) {
      deleteMutation.mutate(inv.id);
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      const response = await base44.functions.invoke('generateInvoicePdf', { invoice_id: invoice.id });
      const pdfUrl = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `faktura-${invoice.invoice_number}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (error) {
      alert('Chyba: ' + error.message);
    }
  };

  let filtered = invoices.filter(inv => 
    !search || 
    inv.invoice_number?.includes(search) || 
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Faktury" 
        subtitle={`${invoices.length} celkem`}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Hledat podle čísla faktury nebo zákazníka..." 
            className="pl-10" 
          />
        </div>
      </div>

      {filtered.length === 0 && !invoices.length ? (
        <EmptyState 
          icon={FileText} 
          title="Žádné faktury" 
          description="Faktury se vytváří automaticky z plateb"
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Žádné faktury neodpovídají vyhledávání</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Číslo faktury</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Zákazník</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Vystaveno</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Stav</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Částka</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, i) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <button 
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowModal(true);
                        }}
                        className="text-sm font-semibold text-[#C9A227] hover:text-[#A8841C]"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-800">
                      {inv.customer_name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                      {inv.issue_date ? format(new Date(inv.issue_date), "d. M. yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={statusColors[inv.status] || statusColors.draft}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900">
                      {(inv.total_amount || 0).toLocaleString()} {inv.currency}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleDownloadPdf(inv)}
                        className="text-gray-400 hover:text-[#C9A227] transition-colors inline-block"
                        title="Stáhnout PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inv)}
                        className="text-gray-300 hover:text-red-500 transition-colors inline-block ml-2"
                        title="Smazat"
                      >
                        <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-4 h-4 object-contain" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvoiceModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        invoice={selectedInvoice}
        onSave={() => {
          qc.invalidateQueries({ queryKey: ["invoices"] });
          setShowModal(false);
        }}
      />
    </div>
  );
}