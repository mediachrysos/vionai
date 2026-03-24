import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import InvoiceModal from "./InvoiceModal";

export default function PaymentInvoiceActions({ payment, onInvoiceCreated }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkInvoice = async () => {
      try {
        const invoices = await base44.entities.Invoice.filter({ related_payment_id: payment.id });
        if (isMounted && invoices && invoices.length > 0) {
          setInvoice(invoices[0]);
        }
        if (isMounted) setLoading(false);
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(checkInvoice, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
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
        className="text-xs h-8 border-[#e8d99a] text-[#A8841C] hover:bg-[#faf6e6]">
        
        <FileText className="mr-1 rounded-lg w-3 h-3 object-contain" />
        {creating ? "Vytvářím..." : "Vytvořit fakturu"}
      </Button>);

  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Faktura č. {invoice.invoice_number}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowModal(true)}
          className="text-xs h-7 text-[#C9A227] hover:bg-amber-50">
          
          Otevřít
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownloadPdf}
          className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
          
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774346884/hf_20260324_095708_c4eec87e-3ae9-4c0d-aa2b-e90b9b73f124_a9fzsz.jpg" alt="download" className="w-4 h-4 object-contain" />
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
        }} />
      
    </div>);

}