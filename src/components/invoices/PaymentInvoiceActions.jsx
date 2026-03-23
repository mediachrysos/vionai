import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Download, AlertCircle } from "lucide-react";
import InvoiceModal from "./InvoiceModal";

export default function PaymentInvoiceActions({ payment, onInvoiceCreated }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkInvoice = async () => {
      const invoices = await base44.entities.Invoice.filter({ related_payment_id: payment.id });
      if (invoices && invoices.length > 0) {
        setInvoice(invoices[0]);
      }
      setLoading(false);
    };
    checkInvoice();
  }, [payment.id]);

  const handleCreateInvoice = async () => {
    setCreating(true);
    try {
      const response = await base44.functions.invoke('createInvoiceFromPayment', { payment_id: payment.id });
      if (response.data.error) {
        alert(response.data.error);
      } else {
        setInvoice(response.data.invoice);
        onInvoiceCreated?.();
      }
    } catch (error) {
      alert('Chyba: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadPdf = async () => {
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

  if (loading) {
    return <span className="text-xs text-gray-300">Načítám...</span>;
  }

  if (!invoice) {
    return (
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleCreateInvoice}
        disabled={creating}
        className="text-xs h-8 border-[#e8d99a] text-[#A8841C] hover:bg-[#faf6e6]"
      >
        <FileText className="w-3 h-3 mr-1" />
        {creating ? "Vytvářím..." : "Vytvořit fakturu"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Faktura č. {invoice.invoice_number}</span>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => setShowModal(true)}
          className="text-xs h-7 text-[#C9A227] hover:bg-amber-50"
        >
          Otevřít
        </Button>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={handleDownloadPdf}
          className="text-xs h-7 text-gray-400 hover:text-gray-600"
        >
          <Download className="w-3 h-3" />
        </Button>
      </div>
      <InvoiceModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        invoice={invoice}
        onSave={() => {
          const reloadInvoice = async () => {
            const invoices = await base44.entities.Invoice.filter({ id: invoice.id });
            if (invoices && invoices.length > 0) {
              setInvoice(invoices[0]);
            }
          };
          reloadInvoice();
        }}
      />
    </div>
  );
}