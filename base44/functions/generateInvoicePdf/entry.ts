import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

async function embedFont(doc) {
  try {
    // Use jsDelivr CDN to get actual TTF files (not WOFF2)
    const [regRes, boldRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-400-normal.woff2'),
      fetch('https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-700-normal.woff2'),
    ]);

    // Try raw TTF from different source
    const [r2, b2] = await Promise.all([
      fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf'),
      fetch('https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf'),
    ]);

    if (!r2.ok || !b2.ok) return false;

    const [rBuf, bBuf] = await Promise.all([r2.arrayBuffer(), b2.arrayBuffer()]);

    // Convert to base64 in chunks to avoid stack overflow
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
  } catch (e) {
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
    const roboto = await embedFont(doc);
    const F = roboto ? 'Roboto' : 'helvetica';

    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const L = 15;   // left margin
    const R = W - 15; // right margin
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

    // ── HEADER BAR ────────────────────────────────────────────
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, W, 22, 'F');

    // Invoice number in header
    setNormal(9, [180, 180, 180]);
    doc.text('FAKTURA', L, 10);
    setBold(14, [255, 255, 255]);
    doc.text(invoice.invoice_number || '', L, 18);

    // Status badge on right
    setNormal(8, [200, 200, 200]);
    doc.text(new Date().toLocaleDateString('cs-CZ'), R, 14, { align: 'right' });

    // ── TWO COLUMNS: DODAVATEL / ODBERATEL ────────────────────
    let y = 36;

    // Column separators
    setNormal(7, [150, 150, 150]);
    doc.text('DODAVATEL', L, y);
    doc.text('ODBERATEL', MID + 5, y);

    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(L, y, MID - 5, y);
    doc.line(MID + 5, y, R, y);

    y += 7;
    setBold(10.5);
    doc.text(invoice.supplier_company_name || '', L, y);
    doc.text(invoice.customer_name || '', MID + 5, y);

    y += 6;
    setNormal(9, [80, 80, 80]);
    if (invoice.supplier_address) {
      const lines = doc.splitTextToSize(invoice.supplier_address, MID - L - 10);
      doc.text(lines, L, y);
      y += lines.length * 5 + 2;
    } else {
      y += 5;
    }

    if (invoice.customer_email) {
      setNormal(8.5, [100, 100, 100]);
      doc.text(invoice.customer_email, MID + 5, y - (invoice.supplier_address ? (doc.splitTextToSize(invoice.supplier_address, MID - L - 10).length * 5 + 2) : 5));
    }

    // ICO / DIC
    if (invoice.supplier_ico || invoice.supplier_dic) {
      doc.setDrawColor(235, 235, 235);
      doc.line(L, y, MID - 5, y);
      y += 5;

      if (invoice.supplier_ico) {
        setNormal(8, [130, 130, 130]);
        doc.text('IČO', L, y);
        setNormal(8, [30, 30, 30]);
        doc.text(invoice.supplier_ico, L + 22, y);
        y += 5;
      }
      if (invoice.supplier_dic) {
        setNormal(8, [130, 130, 130]);
        doc.text('DIČ', L, y);
        setNormal(8, [30, 30, 30]);
        doc.text(invoice.supplier_dic, L + 22, y);
        y += 5;
      }
    }

    y += 8;

    // ── INFO GRID ─────────────────────────────────────────────
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(L, y, R - L, 28, 2, 2, 'F');

    const col1x = L + 5;
    const col1vx = L + 45;
    const col2x = MID + 5;
    const col2vx = R - 5;
    let gy = y + 8;

    // Row 1
    setNormal(8, [130, 130, 130]);
    doc.text('Způsob platby', col1x, gy);
    doc.text('Datum vystavení', col2x, gy);
    gy += 5;
    setBold(8.5, [30, 30, 30]);
    doc.text(invoice.payment_method || '—', col1vx, gy - 5);
    doc.text(invoice.issue_date || '—', col2vx, gy - 5, { align: 'right' });

    // Row 2
    setNormal(8, [130, 130, 130]);
    doc.text('Datum splatnosti', col2x, gy);
    setBold(8.5, [30, 30, 30]);
    doc.text(invoice.due_date || '—', col2vx, gy, { align: 'right' });

    if (invoice.taxable_supply_date) {
      gy += 5;
      setNormal(8, [130, 130, 130]);
      doc.text('Datum zdanitelného plnění', col1x, gy);
      setBold(8.5, [30, 30, 30]);
      doc.text(invoice.taxable_supply_date, col1vx, gy);
    }

    y += 36;

    // ── ITEMS TABLE ───────────────────────────────────────────
    // Header
    doc.setFillColor(30, 30, 30);
    doc.rect(L, y, R - L, 8, 'F');
    setNormal(7.5, [200, 200, 200]);
    doc.text('POPIS SLUŽBY / ZBOŽÍ', L + 5, y + 5.5);
    doc.text('CELKEM', R - 5, y + 5.5, { align: 'right' });

    y += 8;

    // Item row
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(235, 235, 235);
    doc.rect(L, y, R - L, 14, 'S');

    setBold(10, [30, 30, 30]);
    doc.text(invoice.item_name || 'Služba', L + 5, y + 6);

    if (invoice.item_description) {
      setNormal(8, [130, 130, 130]);
      doc.text(invoice.item_description, L + 5, y + 11);
    }

    setBold(10, [30, 30, 30]);
    const priceStr = `${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kč`;
    doc.text(priceStr, R - 5, y + 6, { align: 'right' });

    y += 22;

    // ── TOTAL SECTION ─────────────────────────────────────────
    // Total box
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(MID + 5, y, R - MID - 5, 18, 2, 2, 'F');

    setNormal(8, [160, 160, 160]);
    doc.text('CELKEM K ÚHRADĚ', MID + 12, y + 7);
    setBold(14, [255, 255, 255]);
    const totalStr = `${(invoice.total_amount || 0).toLocaleString('cs-CZ')},00 Kč`;
    doc.text(totalStr, R - 8, y + 14, { align: 'right' });

    y += 26;

    // ── NOTE ──────────────────────────────────────────────────
    if (invoice.note) {
      setNormal(8, [130, 130, 130]);
      doc.text('Poznámka:', L, y);
      y += 5;
      setNormal(8.5, [60, 60, 60]);
      const noteLines = doc.splitTextToSize(invoice.note, R - L);
      doc.text(noteLines, L, y);
    }

    // ── FOOTER ────────────────────────────────────────────────
    doc.setFillColor(248, 248, 248);
    doc.rect(0, H - 16, W, 16, 'F');
    setNormal(7, [150, 150, 150]);
    doc.text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`, L, H - 7);
    if (invoice.supplier_ico) {
      doc.text('Fyzická osoba zapsaná v živnostenském rejstříku.', R, H - 7, { align: 'right' });
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