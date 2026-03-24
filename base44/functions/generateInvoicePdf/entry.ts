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

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const L = 15;
    const R = W - 15;
    const MID = W / 2;

    const setNormal = (size, color = [30, 30, 30]) => {
      doc.setFont(F, 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const setBold = (size, color = [30, 30, 30]) => {
      doc.setFont(F, 'bold');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const hline = (y, r = 220, g = 220, b = 220, w = 0.3) => {
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(w);
      doc.line(L, y, R, y);
    };

    // ── TOP: číslo faktury vpravo, datum vlevo ─────────────────
    let y = 24;
    setNormal(8, [150, 150, 150]);
    doc.text('FAKTURA', L, y - 4);
    setBold(20);
    doc.text(invoice.invoice_number || '', R, y, { align: 'right' });

    y += 6;
    hline(y);

    // ── DODAVATEL / ODBERATEL ─────────────────────────────────
    y += 10;
    setNormal(7.5, [150, 150, 150]);
    doc.text('DODAVATEL', L, y);
    doc.text('ODBERATEL', MID + 5, y);

    y += 6;
    setBold(10.5);
    doc.text(invoice.supplier_company_name || '', L, y);
    doc.text(invoice.customer_name || '', MID + 5, y);

    y += 6;
    setNormal(8.5, [80, 80, 80]);
    if (invoice.supplier_address) {
      const lines = doc.splitTextToSize(invoice.supplier_address, MID - L - 10);
      doc.text(lines, L, y);
      y += lines.length * 5;
    } else {
      y += 5;
    }

    if (invoice.customer_email) {
      setNormal(8.5, [80, 80, 80]);
      doc.text(invoice.customer_email, MID + 5, y - 5);
    }

    // ICO / DIC
    if (invoice.supplier_ico || invoice.supplier_dic) {
      y += 4;
      if (invoice.supplier_ico) {
        setNormal(8, [130, 130, 130]);
        doc.text('IČO', L, y);
        setNormal(8.5, [30, 30, 30]);
        doc.text(invoice.supplier_ico, L + 22, y);
        y += 5;
      }
      if (invoice.supplier_dic) {
        setNormal(8, [130, 130, 130]);
        doc.text('DIČ', L, y);
        setNormal(8.5, [30, 30, 30]);
        doc.text(invoice.supplier_dic, L + 22, y);
        y += 5;
      }
    }

    y += 8;
    hline(y);

    // ── PLATEBNÍ ÚDAJE ────────────────────────────────────────
    y += 10;

    const col1x = L;
    const col1vx = L + 42;
    const col2x = MID + 5;
    const col2vx = R;

    setNormal(8, [130, 130, 130]);
    doc.text('Způsob platby', col1x, y);
    doc.text('Datum vystavení', col2x, y);
    y += 5;
    setNormal(8.5, [30, 30, 30]);
    doc.text(invoice.payment_method || '—', col1vx, y - 5);
    doc.text(invoice.issue_date || '—', col2vx, y - 5, { align: 'right' });

    setNormal(8, [130, 130, 130]);
    doc.text('Datum splatnosti', col2x, y);
    setNormal(8.5, [30, 30, 30]);
    doc.text(invoice.due_date || '—', col2vx, y, { align: 'right' });
    y += 5;

    if (invoice.taxable_supply_date) {
      setNormal(8, [130, 130, 130]);
      doc.text('Datum zdanitelného plnění', col1x, y);
      setNormal(8.5, [30, 30, 30]);
      doc.text(invoice.taxable_supply_date, col1vx, y);
      y += 5;
    }

    y += 10;
    hline(y);

    // ── POLOŽKY hlavička ──────────────────────────────────────
    y += 8;
    setNormal(7.5, [150, 150, 150]);
    doc.text('POPIS SLUŽBY / ZBOŽÍ', L, y);
    doc.text('CELKEM', R, y, { align: 'right' });

    y += 4;
    hline(y, 200, 200, 200, 0.2);

    // ── POLOŽKA ───────────────────────────────────────────────
    y += 8;
    setBold(10);
    doc.text(invoice.item_name || 'Služba', L, y);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kč`, R, y, { align: 'right' });

    if (invoice.item_description) {
      y += 5;
      setNormal(8, [130, 130, 130]);
      const descLines = doc.splitTextToSize(invoice.item_description, R - L - 40);
      doc.text(descLines, L, y);
      y += descLines.length * 4;
    }

    y += 10;
    hline(y, 30, 30, 30, 0.5);

    // ── CELKEM ────────────────────────────────────────────────
    y += 9;
    setNormal(8, [130, 130, 130]);
    doc.text('CELKEM K ÚHRADĚ', R - 55, y, { align: 'right' });
    setBold(16);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')},00 Kč`, R, y + 1, { align: 'right' });

    // ── POZNÁMKA ──────────────────────────────────────────────
    if (invoice.note) {
      y += 18;
      hline(y, 230, 230, 230, 0.3);
      y += 7;
      setNormal(7.5, [150, 150, 150]);
      doc.text('POZNÁMKA', L, y);
      y += 5;
      setNormal(8.5, [80, 80, 80]);
      const noteLines = doc.splitTextToSize(invoice.note, R - L);
      doc.text(noteLines, L, y);
    }

    // ── FOOTER ────────────────────────────────────────────────
    hline(H - 18, 220, 220, 220, 0.3);
    setNormal(7, [170, 170, 170]);
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