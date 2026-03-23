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
    
    // Add DejaVuSans font for Czech character support
    try {
      const fontData = await fetch('https://cdn.jsdelivr.net/npm/dejavu-fonts@2.37.3/ttf/DejaVuSans.ttf').then(r => r.arrayBuffer());
      doc.addFont(fontData, 'DejaVu', 'normal');
      doc.setFont('DejaVu');
    } catch (e) {
      // Fallback if font loading fails
      doc.setFont('courier');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    // Header - Title and Company name side by side
    doc.setFontSize(28);
    doc.setTextColor(201, 162, 39);
    doc.text('FAKTURA', pageWidth - margin, y, { align: 'right' });

    doc.setFontSize(13);
    doc.setTextColor(51, 51, 51);
    doc.text(invoice.supplier_company_name || 'Dodavatel', margin, y);
    y += 12;

    // Company details
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (invoice.supplier_address) doc.text(invoice.supplier_address, margin, y), y += 5;
    if (invoice.supplier_ico) doc.text(`IČO: ${invoice.supplier_ico}`, margin, y), y += 5;
    if (invoice.supplier_dic) doc.text(`DIČ: ${invoice.supplier_dic}`, margin, y), y += 5;
    if (invoice.supplier_email) doc.text(`Email: ${invoice.supplier_email}`, margin, y), y += 5;
    if (invoice.supplier_phone) doc.text(`Tel: ${invoice.supplier_phone}`, margin, y), y += 5;
    y += 5;

    // Two-column layout: Invoice details (left) | Customer (right)
    const col1X = margin;
    const col2X = pageWidth / 2 + margin;
    const detailsValueX = col1X + 45;
    const col2ValueX = col2X + 40;

    // Left column - Invoice details
    const detailsY = y;
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    
    let detailsRowY = detailsY;
    doc.text('Číslo faktury:', col1X, detailsRowY);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.invoice_number || '', detailsValueX, detailsRowY);
    doc.setTextColor(51, 51, 51);
    detailsRowY += 6;

    doc.text('Datum vystavení:', col1X, detailsRowY);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.issue_date || '', detailsValueX, detailsRowY);
    doc.setTextColor(51, 51, 51);
    detailsRowY += 6;

    doc.text('Datum splatnosti:', col1X, detailsRowY);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.due_date || '', detailsValueX, detailsRowY);
    doc.setTextColor(51, 51, 51);
    detailsRowY += 6;

    doc.text('Datum plnění:', col1X, detailsRowY);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.taxable_supply_date || '', detailsValueX, detailsRowY);
    doc.setTextColor(51, 51, 51);
    detailsRowY += 6;

    doc.text('Způsob úhrady:', col1X, detailsRowY);
    doc.setTextColor(201, 162, 39);
    doc.text(invoice.payment_method || 'Bankovní převod', detailsValueX, detailsRowY);
    doc.setTextColor(51, 51, 51);

    // Right column - Customer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text('ODBĚRATEL:', col2X, detailsY);
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    let custY = detailsY + 6;
    doc.text(invoice.customer_name || 'Odběratel', col2X, custY);
    if (invoice.customer_email) {
      doc.setFontSize(8);
      custY += 5;
      doc.text(invoice.customer_email, col2X, custY);
    }

    y = Math.max(detailsRowY, custY) + 12;

    // Separator line
    doc.setDrawColor(201, 162, 39);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Items table
    const tableTop = y;
    const colHeaders = { desc: margin, qty: pageWidth * 0.65, price: pageWidth * 0.8, total: pageWidth - margin - 15 };
    
    // Header background
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, tableTop, pageWidth - 2 * margin, 7, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(201, 162, 39);
    doc.setFont(undefined, 'bold');
    doc.text('Popis', colHeaders.desc, tableTop + 5);
    doc.text('Ks', colHeaders.qty, tableTop + 5, { align: 'center' });
    doc.text('Jednotková cena', colHeaders.price, tableTop + 5, { align: 'right' });
    doc.text('Celkem', colHeaders.total, tableTop + 5, { align: 'right' });

    y = tableTop + 10;
    
    // Item row
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    
    doc.text(invoice.item_name || 'Služba', colHeaders.desc, y);
    doc.text(String(invoice.quantity || 1), colHeaders.qty, y, { align: 'center' });
    doc.text(`${(invoice.unit_price || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, colHeaders.price, y, { align: 'right' });
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, colHeaders.total, y, { align: 'right' });
    
    if (invoice.item_description) {
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(invoice.item_description, colHeaders.desc + 2, y);
    }

    y += 10;

    // Total box
    doc.setFillColor(250, 246, 230);
    doc.rect(pageWidth * 0.65, y - 2, pageWidth - (pageWidth * 0.65) - margin, 10, 'F');
    doc.setDrawColor(201, 162, 39);
    doc.rect(pageWidth * 0.65, y - 2, pageWidth - (pageWidth * 0.65) - margin, 10);

    doc.setFontSize(11);
    doc.setTextColor(201, 162, 39);
    doc.setFont(undefined, 'bold');
    doc.text('CELKEM:', pageWidth * 0.7, y + 4);
    doc.setTextColor(51, 51, 51);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} ${invoice.currency}`, pageWidth - margin - 3, y + 4, { align: 'right' });

    y += 15;

    // Note
    if (invoice.note) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'bold');
      doc.text('Poznámka:', margin, y);
      doc.setFont(undefined, 'normal');
      y += 4;
      doc.text(invoice.note, margin, y);
      y += 5;
    }

    // Footer
    y = pageHeight - 12;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Děkujeme za vaší obchodní vztah', margin, y);
    doc.text(`Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`, pageWidth - margin, y, { align: 'right' });

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