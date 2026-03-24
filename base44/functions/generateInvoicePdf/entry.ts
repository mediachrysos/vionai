import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

async function embedFont(doc) {
  try {
    const [r2, b2] = await Promise.all([
      fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf'),
      fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf'),
    ]);
    if (!r2.ok || !b2.ok) return false;
    const [rBuf, bBuf] = await Promise.all([r2.arrayBuffer(), b2.arrayBuffer()]);
    const toBase64 = (buf) => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };
    doc.addFileToVFS('Roboto-Regular.ttf', toBase64(rBuf));
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', toBase64(bBuf));
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
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
    if (!invoices || invoices.length === 0) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    const invoice = invoices[0];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const roboto = await embedFont(doc);
    const F = roboto ? 'Roboto' : 'helvetica';

    const W = 210;
    const H = 297;
    const L = 20;        // left margin
    const R = 190;       // right margin
    const COL = 110;     // second column start

    // helpers
    const normal = (size, r = 30, g = 30, b = 30) => { doc.setFont(F, 'normal'); doc.setFontSize(size); doc.setTextColor(r, g, b); };
    const bold   = (size, r = 30, g = 30, b = 30) => { doc.setFont(F, 'bold');   doc.setFontSize(size); doc.setTextColor(r, g, b); };
    const line   = (x1, y1, x2, y2, r = 220, g = 220, b = 220, w = 0.3) => {
      doc.setDrawColor(r, g, b); doc.setLineWidth(w); doc.line(x1, y1, x2, y2);
    };

    // ── LOGO / COMPANY NAME (top-left) ────────────────────────
    let y = 22;
    bold(11);
    doc.text(invoice.supplier_company_name || '', L, y);

    // ── "FAKTURA" label + number (top-right) ─────────────────
    normal(8, 150, 150, 150);
    doc.text('FAKTURA', R, y - 5, { align: 'right' });
    bold(22, 30, 30, 30);
    doc.text(invoice.invoice_number || '', R, y + 4, { align: 'right' });

    y += 14;
    line(L, y, R, y, 230, 230, 230, 0.4);

    // ── DODAVATEL / ODBERATEL ─────────────────────────────────
    y += 10;
    normal(7.5, 160, 160, 160);
    doc.text('DODAVATEL', L, y);
    doc.text('ODBERATEL', COL, y);

    y += 6;
    bold(9.5);
    doc.text(invoice.supplier_company_name || '', L, y);
    doc.text(invoice.customer_name || '', COL, y);

    y += 5;
    normal(8.5, 90, 90, 90);
    if (invoice.supplier_address) {
      const lines = doc.splitTextToSize(invoice.supplier_address, COL - L - 8);
      doc.text(lines, L, y);
    }
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, COL, y);
    }

    y += 12;

    if (invoice.supplier_ico) {
      normal(8, 160, 160, 160);
      doc.text('IČO', L, y);
      normal(8.5, 50, 50, 50);
      doc.text(invoice.supplier_ico, L + 18, y);
    }
    if (invoice.supplier_dic) {
      normal(8, 160, 160, 160);
      doc.text('DIČ', L + 50, y);
      normal(8.5, 50, 50, 50);
      doc.text(invoice.supplier_dic, L + 68, y);
    }

    y += 16;
    line(L, y, R, y, 230, 230, 230, 0.4);

    // ── PLATEBNÍ ÚDAJE (4 řádky) ──────────────────────────────
    y += 10;

    const infoRow = (label, value, x, vx) => {
      normal(7.5, 160, 160, 160);
      doc.text(label, x, y);
      normal(8.5, 40, 40, 40);
      doc.text(value || '—', vx, y);
    };

    infoRow('Způsob platby',       invoice.payment_method || '—',        L,   L + 36);
    infoRow('Datum vystavení',     invoice.issue_date || '—',             COL, COL + 40);
    y += 7;
    if (invoice.taxable_supply_date) {
      infoRow('Datum zdan. plnění', invoice.taxable_supply_date,          L,   L + 36);
    }
    infoRow('Datum splatnosti',    invoice.due_date || '—',               COL, COL + 40);

    y += 16;
    line(L, y, R, y, 230, 230, 230, 0.4);

    // ── POLOŽKY – hlavička ────────────────────────────────────
    y += 8;
    normal(7, 160, 160, 160);
    doc.text('POPIS', L, y);
    doc.text('CELKEM', R, y, { align: 'right' });

    y += 3;
    line(L, y, R, y, 230, 230, 230, 0.3);

    // ── POLOŽKA ───────────────────────────────────────────────
    y += 8;
    bold(10);
    doc.text(invoice.item_name || 'Služba', L, y);
    bold(10);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kč`, R, y, { align: 'right' });

    if (invoice.item_description) {
      y += 5;
      normal(8, 130, 130, 130);
      const descLines = doc.splitTextToSize(invoice.item_description, R - L - 40);
      doc.text(descLines, L, y);
      y += descLines.length * 4;
    }

    y += 10;
    line(L, y, R, y, 200, 200, 200, 0.3);

    // ── MEZISOUČET ────────────────────────────────────────────
    y += 8;
    normal(8.5, 130, 130, 130);
    doc.text('Základ daně', R - 60, y, { align: 'right' });
    normal(8.5, 50, 50, 50);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kč`, R, y, { align: 'right' });

    y += 6;
    normal(8.5, 130, 130, 130);
    doc.text('DPH (0 %)', R - 60, y, { align: 'right' });
    normal(8.5, 50, 50, 50);
    doc.text('0 Kč', R, y, { align: 'right' });

    y += 8;
    line(R - 70, y, R, y, 30, 30, 30, 0.5);

    // ── CELKEM ────────────────────────────────────────────────
    y += 9;
    normal(8, 120, 120, 120);
    doc.text('CELKEM K ÚHRADĚ', R - 60, y, { align: 'right' });
    bold(16, 30, 30, 30);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')},00 Kč`, R, y + 1, { align: 'right' });

    // ── POZNÁMKA ──────────────────────────────────────────────
    if (invoice.note) {
      y += 20;
      line(L, y, R, y, 230, 230, 230, 0.3);
      y += 8;
      normal(7.5, 160, 160, 160);
      doc.text('POZNÁMKA', L, y);
      y += 5;
      normal(8.5, 80, 80, 80);
      const noteLines = doc.splitTextToSize(invoice.note, R - L);
      doc.text(noteLines, L, y);
    }

    // ── FOOTER ────────────────────────────────────────────────
    line(L, H - 18, R, H - 18, 230, 230, 230, 0.3);
    normal(7, 180, 180, 180);
    doc.text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`, L, H - 10);
    if (invoice.supplier_email) {
      doc.text(invoice.supplier_email, R, H - 10, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=faktura-${invoice.invoice_number}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});