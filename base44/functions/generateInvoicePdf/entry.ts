import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id required' }, { status: 400 });
    }

    const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
    if (!invoices || invoices.length === 0) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // Header - Company info
    doc.setFontSize(24);
    doc.setTextColor(201, 162, 39); // Gold color
    doc.text('FAKTURA', pageWidth - 20, y, { align: 'right' });

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51); // Dark gray
    doc.text(invoice.supplier_company_name || 'Dodavatel', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.supplier_address || '', 20, y);
    y += 5;
    doc.text(`IČO: ${invoice.supplier_ico || ''}`, 20, y);
    y += 5;
    doc.text(`DIČ: ${invoice.supplier_dic || ''}`, 20, y);
    y += 5;
    doc.text(`Email: ${invoice.supplier_email || ''}`, 20, y);
    y += 5;
    doc.text(`Telefon: ${invoice.supplier_phone || ''}`, 20, y);
    y += 12;

    // Invoice details section
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    
    const invoiceDetailsX = 20;
    const invoiceDetailsValueX = 80;
    
    doc.text('Číslo faktury:', invoiceDetailsX, y);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.invoice_number || '', invoiceDetailsValueX, y);
    doc.setTextColor(51, 51, 51);
    y += 6;

    doc.text('Datum vystavení:', invoiceDetailsX, y);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.issue_date || '', invoiceDetailsValueX, y);
    doc.setTextColor(51, 51, 51);
    y += 6;

    doc.text('Datum splatnosti:', invoiceDetailsX, y);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.due_date || '', invoiceDetailsValueX, y);
    doc.setTextColor(51, 51, 51);
    y += 6;

    doc.text('Datum plnění:', invoiceDetailsX, y);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.taxable_supply_date || '', invoiceDetailsValueX, y);
    doc.setTextColor(51, 51, 51);
    y += 6;

    doc.text('Způsob úhrady:', invoiceDetailsX, y);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.payment_method || '', invoiceDetailsValueX, y);
    y += 12;

    // Customer section
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('ODBĚRATEL:', 20, y);
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    y += 6;
    doc.text(invoice.customer_name || 'Odběratel', 20, y);
    if (invoice.customer_email) {
      y += 5;
      doc.setFontSize(9);
      doc.text(invoice.customer_email, 20, y);
    }
    y += 10;

    // Items table
    doc.setFontSize(9);
    doc.setTextColor(201, 162, 39);
    
    const tableTop = y;
    const colX = { name: 20, description: 70, qty: 130, unitPrice: 155, total: 180 };
    
    // Table header
    doc.rect(20, tableTop, pageWidth - 40, 7);
    doc.text('Popis', colX.name, tableTop + 5);
    doc.text('Ks', colX.qty, tableTop + 5);
    doc.text('Jednotková cena', colX.unitPrice, tableTop + 5);
    doc.text('Celkem', colX.total, tableTop + 5);
    
    y = tableTop + 10;
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9);
    
    // Item name
    doc.text(invoice.item_name || '', colX.name, y);
    doc.text(String(invoice.quantity || 1), colX.qty, y);
    doc.text(`${(invoice.unit_price || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, colX.unitPrice, y);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, colX.total, y);
    y += 7;
    
    // Item description
    if (invoice.item_description) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(invoice.item_description, colX.description, y);
      y += 5;
    }
    
    y += 5;
    
    // Total section
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.rect(130, y - 2, pageWidth - 150, 10);
    doc.setTextColor(201, 162, 39);
    doc.text('CELKEM:', 135, y + 3);
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, pageWidth - 25, y + 3, { align: 'right' });
    
    y += 15;
    
    // Note
    if (invoice.note) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Poznámka:', 20, y);
      y += 5;
      doc.text(invoice.note, 20, y);
    }

    // Footer
    y = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Děkujeme za vaší obchodní vztah', 20, y);
    doc.text(`Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`, pageWidth - 20, y, { align: 'right' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=faktura-${invoice.invoice_number}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});