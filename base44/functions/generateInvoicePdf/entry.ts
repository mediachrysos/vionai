import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

async function loadRobotoFont(doc) {
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxK.woff2'),
      fetch('https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmEU9fBBc4.woff2'),
    ]);
    if (!regularRes.ok || !boldRes.ok) return false;
    const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()]);
    const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
    doc.addFileToVFS('Roboto-Regular.ttf', toBase64(regularBuf));
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', toBase64(boldBuf));
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    return true;
  } catch (_) {
    return false;
  }
}

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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const robotoLoaded = await loadRobotoFont(doc);
    doc.setFont(robotoLoaded ? 'Roboto' : 'helvetica');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ml = 20; // margin left
    const mr = pageWidth - 20; // margin right
    const mid = pageWidth / 2;

    // ── TOP LINE ──────────────────────────────────────────────
    doc.setDrawColor(180, 180, 180);
    doc.line(mid + 5, 18, mr, 18);

    // ── TITLE: "Faktura XXXX" ─────────────────────────────────
    let ty = 27;
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    const fontName = robotoLoaded ? 'Roboto' : 'helvetica';
    doc.setFont(fontName, 'normal');
    doc.text('Faktura ', mid + 5, ty);
    const titleWidth = doc.getTextWidth('Faktura ');
    doc.setFont(fontName, 'bold');
    doc.text(invoice.invoice_number || '', mid + 5 + titleWidth, ty);
    doc.setFont(fontName, 'normal');

    // ── DODAVATEL / ODBERATEL labels ──────────────────────────
    let ly = 38;
    doc.setDrawColor(180, 180, 180);
    doc.line(ml, ly, ml + 10, ly);
    doc.line(mid + 5, ly, mid + 15, ly);

    ly += 5;
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('DODAVATEL', ml, ly);
    doc.text('ODBERATEL', mid + 5, ly);

    // ── DODAVATEL info ────────────────────────────────────────
    ly += 6;
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.setFont(undefined, 'bold');
    doc.text(invoice.supplier_company_name || '', ml, ly);

    doc.setFont(undefined, 'bold');
    doc.text(invoice.customer_name || '', mid + 5, ly);
    doc.setFont(undefined, 'normal');

    ly += 5;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, 'normal');

    if (invoice.supplier_address) {
      const lines = invoice.supplier_address.split('\n');
      for (const line of lines) {
        doc.text(line, ml, ly);
        ly += 5;
      }
    }

    if (invoice.customer_email) {
      doc.text(invoice.customer_email, mid + 5, ly - 5 * (invoice.supplier_address ? invoice.supplier_address.split('\n').length : 1));
    }

    ly += 4;

    // ── ICO / DIC row ─────────────────────────────────────────
    if (invoice.supplier_ico) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text('ICO', ml, ly);
      doc.setTextColor(20, 20, 20);
      doc.text(invoice.supplier_ico, ml + 30, ly);
      ly += 5;
    }
    if (invoice.supplier_dic) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text('DIC', ml, ly);
      doc.setTextColor(20, 20, 20);
      doc.text(invoice.supplier_dic, ml + 30, ly);
      ly += 5;
    }

    ly += 4;

    // ── PAYMENT DETAILS TABLE ─────────────────────────────────
    const labelX = ml;
    const valX = ml + 38;
    const dateLabX = mid + 5;
    const dateValX = mr;

    doc.setFontSize(8.5);

    // Row: Bankovni ucet / Datum vystaveni
    doc.setTextColor(100, 100, 100);
    doc.text('Bankovni ucet', labelX, ly);
    doc.setTextColor(20, 20, 20);
    doc.text(invoice.payment_method || '', valX, ly);

    doc.setTextColor(100, 100, 100);
    doc.text('Datum vystaveni', dateLabX, ly);
    doc.setTextColor(20, 20, 20);
    doc.text(invoice.issue_date || '', dateValX, ly, { align: 'right' });
    ly += 5.5;

    // Row: Datum splatnosti
    doc.setTextColor(100, 100, 100);
    doc.text('Datum splatnosti', dateLabX, ly);
    doc.setTextColor(20, 20, 20);
    doc.text(invoice.due_date || '', dateValX, ly, { align: 'right' });
    ly += 5.5;

    // Row: Zpusob platby
    if (invoice.taxable_supply_date) {
      doc.setTextColor(100, 100, 100);
      doc.text('Datum danoveho plneni', labelX, ly);
      doc.setTextColor(20, 20, 20);
      doc.text(invoice.taxable_supply_date, valX, ly);
      ly += 5.5;
    }

    ly += 8;

    // ── ITEMS TABLE ───────────────────────────────────────────
    doc.setDrawColor(200, 200, 200);
    doc.line(ml, ly, mr, ly);
    ly += 1;

    // Header row
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('CENA', mr, ly + 5, { align: 'right' });
    ly += 8;

    // Item row
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.item_name || 'Sluzba', ml, ly);
    const priceText = `${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kc`;
    doc.text(priceText, mr, ly, { align: 'right' });

    if (invoice.item_description) {
      ly += 5;
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(invoice.item_description, ml, ly);
    }

    ly += 10;

    // ── TOTAL LINE ────────────────────────────────────────────
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.6);
    doc.line(mid + 5, ly, mr, ly);
    doc.setLineWidth(0.2);
    ly += 8;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(20, 20, 20);
    const totalText = `${(invoice.total_amount || 0).toLocaleString('cs-CZ')},00 Kc`;
    doc.text(totalText, mr, ly, { align: 'right' });
    doc.setFont(undefined, 'normal');

    ly += 15;

    // ── NOTE ──────────────────────────────────────────────────
    if (invoice.note) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text(invoice.note, ml, ly);
      ly += 6;
    }

    // ── FOOTER ────────────────────────────────────────────────
    const footerY = pageHeight - 14;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    if (invoice.supplier_ico) {
      doc.text('Fyzicka osoba zapsana v zivnostenskem rejstriku.', ml, footerY);
    }
    doc.text(`Vygenerovano: ${new Date().toLocaleDateString('cs-CZ')}`, mr, footerY, { align: 'right' });

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