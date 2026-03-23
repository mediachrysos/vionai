import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, X } from "lucide-react";

export default function InvoiceModal({ open, onClose, invoice, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (invoice) {
      setForm(invoice);
    }
  }, [invoice]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Invoice.update(invoice.id, form);
      onSave();
      onClose();
    } catch (error) {
      alert('Chyba: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
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
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faktura č. {form.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier Info */}
          <div className="bg-amber-50 rounded-lg p-4 border border-[#e8d99a]">
            <p className="text-xs font-semibold text-gray-600 mb-2">DODAVATEL</p>
            <p className="text-sm font-semibold text-gray-800">{form.supplier_company_name}</p>
            <p className="text-xs text-gray-600">{form.supplier_address}</p>
            <p className="text-xs text-gray-600">IČO: {form.supplier_ico}</p>
            <p className="text-xs text-gray-600">DIČ: {form.supplier_dic}</p>
            <p className="text-xs text-gray-600">{form.supplier_email}</p>
            <p className="text-xs text-gray-600">{form.supplier_phone}</p>
          </div>

          {/* Customer */}
          <div>
            <Label>Jméno zákazníka</Label>
            <Input 
              value={form.customer_name || ''} 
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="mt-1" 
            />
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Číslo faktury</Label>
              <Input value={form.invoice_number || ''} disabled className="mt-1 bg-gray-50" />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={form.status || 'draft'} disabled className="mt-1 bg-gray-50" />
            </div>
            <div>
              <Label>Datum vystavení</Label>
              <Input 
                type="date"
                value={form.issue_date || ''} 
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div>
              <Label>Datum splatnosti</Label>
              <Input 
                type="date"
                value={form.due_date || ''} 
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div>
              <Label>Datum plnění</Label>
              <Input 
                type="date"
                value={form.taxable_supply_date || ''} 
                onChange={(e) => setForm({ ...form, taxable_supply_date: e.target.value })}
                className="mt-1" 
              />
            </div>
            <div>
              <Label>Měna</Label>
              <Input 
                value={form.currency || 'CZK'} 
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1" 
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Způsob úhrady</Label>
            <Input 
              value={form.payment_method || ''} 
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="mt-1" 
            />
          </div>

          {/* Item Details */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-3">Položka</p>
            <div className="space-y-3">
              <div>
                <Label>Název produktu/služby</Label>
                <Input 
                  value={form.item_name || ''} 
                  onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label>Popis</Label>
                <Textarea 
                  value={form.item_description || ''} 
                  onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                  rows={2}
                  className="mt-1" 
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Množství</Label>
                  <Input 
                    type="number"
                    value={form.quantity || 1} 
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label>Jednotková cena</Label>
                  <Input 
                    type="number"
                    value={form.unit_price || 0} 
                    onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) })}
                    className="mt-1" 
                  />
                </div>
                <div>
                  <Label>Celková cena</Label>
                  <Input 
                    type="number"
                    value={form.total_amount || 0} 
                    onChange={(e) => setForm({ ...form, total_amount: parseFloat(e.target.value) })}
                    className="mt-1" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <Label>Poznámka</Label>
            <Textarea 
              value={form.note || ''} 
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={2}
              className="mt-1" 
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleGeneratePdf}
              disabled={generating}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generuji PDF...' : 'Stáhnout PDF'}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16]"
            >
              {saving ? 'Ukládám...' : 'Uložit změny'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}