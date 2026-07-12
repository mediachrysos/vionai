import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Fallback: strip Czech diacritics so text never renders corrupted if the font can't be embedded
function stripDiacritics(str) {
  if (!str) return str;
  const map = { 'á':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i','ň':'n','ó':'o','ř':'r','š':'s','ť':'t','ú':'u','ů':'u','ý':'y','ž':'z',
    'Á':'A','Č':'C','Ď':'D','É':'E','Ě':'E','Í':'I','Ň':'N','Ó':'O','Ř':'R','Š':'S','Ť':'T','Ú':'U','Ů':'U','Ý':'Y','Ž':'Z' };
  return str.replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (c) => map[c] || c);
}

async function embedFont(doc) {
  try {
    const [r2, b2] = await Promise.all([
      fetch('https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf'),
      fetch('https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Bold.ttf'),
    ]);
    if (!r2.ok || !b2.ok) return false;
    const [rBuf, bBuf] = await Promise.all([r2.arrayBuffer(), b2.arrayBuffer()]);
    // Sanity check — a real Roboto TTF is well over 50KB; anything smaller means we got an error page, not a font
    if (rBuf.byteLength < 50000 || bBuf.byteLength < 50000) return false;
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
    // Only strip diacritics when we had to fall back to a font that can't render them
    const t = roboto ? (s) => s : (s) => stripDiacritics(s);

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const L = 20;
    const R = W - 20;
    const MID = W / 2 + 3;
    const GOLD = [180, 140, 30];
    const DARK = [35, 35, 40];
    const GRAY = [140, 140, 148];
    const LGRAY = [225, 225, 230];

    const setNormal = (size, color = DARK) => {
      doc.setFont(F, 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const setBold = (size, color = DARK) => {
      doc.setFont(F, 'bold');
      doc.setFontSize(size);
      doc.setTextColor(...color);
    };
    const hline = (y, color = LGRAY, w = 0.4) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(w);
      doc.line(L, y, R, y);
    };
    const label = (text, x, y, opts) => { setNormal(7.5, GRAY); doc.text(t(text), x, y, opts); };

    // ── HEADER ───────────────────────────────────────────────
    let y = 26;
    setBold(22, GOLD);
    doc.text('FAKTURA', L, y);
    setNormal(9, GRAY);
    doc.text(t('Číslo dokladu'), R, y - 10, { align: 'right' });
    setBold(13);
    doc.text(invoice.invoice_number || '', R, y, { align: 'right' });

    y += 8;
    hline(y, GOLD, 0.8);

    // ── DODAVATEL / ODBERATEL ─────────────────────────────────
    y += 12;
    label('DODAVATEL', L, y);
    label('ODBĚRATEL', MID, y);

    y += 6;
    setBold(11.5);
    doc.text(t(invoice.supplier_company_name || ''), L, y);
    doc.text(t(invoice.customer_name || ''), MID, y);
    const partiesTopY = y;

    let leftY = y + 6;
    setNormal(9, [90, 90, 96]);
    if (invoice.supplier_address) {
      const lines = doc.splitTextToSize(t(invoice.supplier_address), MID - L - 12);
      doc.text(lines, L, leftY);
      leftY += lines.length * 4.6;
    }
    if (invoice.supplier_ico) {
      leftY += 2;
      setNormal(8, GRAY);
      doc.text(t('IČO'), L, leftY);
      setNormal(9, DARK);
      doc.text(invoice.supplier_ico, L + 20, leftY);
      leftY += 4.8;
    }
    if (invoice.supplier_dic) {
      setNormal(8, GRAY);
      doc.text(t('DIČ'), L, leftY);
      setNormal(9, DARK);
      doc.text(invoice.supplier_dic, L + 20, leftY);
      leftY += 4.8;
    }

    let rightY = y + 6;
    setNormal(9, [90, 90, 96]);
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, MID, rightY);
      rightY += 4.6;
    }

    y = Math.max(leftY, rightY, partiesTopY + 10) + 8;
    hline(y);

    // ── PLATEBNÍ ÚDAJE ────────────────────────────────────────
    y += 11;
    const col1x = L;
    const col1vx = L + 45;
    const col2x = MID;
    const col2vx = R;

    label('Způsob platby', col1x, y);
    label('Datum vystavení', col2x, y);
    setNormal(9.5, DARK);
    doc.text(t(invoice.payment_method || '—'), col1vx, y);
    doc.text(invoice.issue_date || '—', col2vx, y, { align: 'right' });

    y += 7;
    if (invoice.taxable_supply_date) {
      label('Datum zdanitelného plnění', col1x, y);
      setNormal(9.5, DARK);
      doc.text(invoice.taxable_supply_date, col1vx, y);
    }
    label('Datum splatnosti', col2x, y);
    setNormal(9.5, DARK);
    doc.text(invoice.due_date || '—', col2vx, y, { align: 'right' });

    y += 12;
    hline(y);

    // ── POLOŽKY hlavička ──────────────────────────────────────
    y += 9;
    label('POPIS SLUŽBY / ZBOŽÍ', L, y);
    label('CELKEM', R, y, { align: 'right' });

    y += 4;
    hline(y, [210, 210, 216], 0.3);

    // ── POLOŽKA ───────────────────────────────────────────────
    y += 9;
    setBold(10.5);
    doc.text(t(invoice.item_name || 'Služba'), L, y);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')} Kč`, R, y, { align: 'right' });

    if (invoice.item_description) {
      y += 5.5;
      setNormal(8.5, GRAY);
      const descLines = doc.splitTextToSize(t(invoice.item_description), R - L - 45);
      doc.text(descLines, L, y);
      y += descLines.length * 4.2;
    }

    y += 10;
    hline(y, DARK, 0.6);

    // ── CELKEM ────────────────────────────────────────────────
    y += 11;
    setNormal(9, GRAY);
    doc.text(t('CELKEM K ÚHRADĚ'), R - 62, y, { align: 'right' });
    setBold(17, GOLD);
    doc.text(`${(invoice.total_amount || 0).toLocaleString('cs-CZ')},00 Kč`, R, y + 1, { align: 'right' });

    // ── POZNÁMKA ──────────────────────────────────────────────
    if (invoice.note) {
      y += 20;
      hline(y, LGRAY, 0.3);
      y += 7;
      label('POZNÁMKA', L, y);
      y += 5.5;
      setNormal(9, [90, 90, 96]);
      const noteLines = doc.splitTextToSize(t(invoice.note), R - L);
      doc.text(noteLines, L, y);
    }

    // ── FOOTER ────────────────────────────────────────────────
    hline(H - 18, LGRAY, 0.3);
    setNormal(7.5, GRAY);
    doc.text(t(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')}`), L, H - 10);
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