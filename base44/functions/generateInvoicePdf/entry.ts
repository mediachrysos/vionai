import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.0.0';

function stripDiacritics(str) {
  if (!str) return str;
  const map = { 'á':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i','ň':'n','ó':'o','ř':'r','š':'s','ť':'t','ú':'u','ů':'u','ý':'y','ž':'z','Á':'A','Č':'C','Ď':'D','É':'E','Ě':'E','Í':'I','Ň':'N','Ó':'O','Ř':'R','Š':'S','Ť':'T','Ú':'U','Ů':'U','Ý':'Y','Ž':'Z' };
  return str.replace(/[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, (c) => map[c] || c);
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

async function embedFont(doc) {
  const mirrors = [
    ['https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf', 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Bold.ttf'],
    ['https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Regular.ttf', 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Bold.ttf'],
  ];
  for (const [rUrl, bUrl] of mirrors) {
    try {
      const [r, b] = await Promise.all([fetch(rUrl), fetch(bUrl)]);
      if (!r.ok || !b.ok) continue;
      const [rBuf, bBuf] = await Promise.all([r.arrayBuffer(), b.arrayBuffer()]);
      if (rBuf.byteLength < 50000 || bBuf.byteLength < 50000) continue;
      doc.addFileToVFS('Roboto-Regular.ttf', bufToBase64(rBuf));
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Bold.ttf', bufToBase64(bBuf));
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      return true;
    } catch (_) { continue; }
  }
  return false;
}

async function tryLoadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 500) return null;
    const b64 = bufToBase64(buf);
    const fmt = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
    return { b64, fmt };
  } catch (_) { return null; }
}

function formatMoney(n) {
  const num = (n || 0).toFixed(2).replace('.', ',');
  // insert non-breaking space as thousands separator
  const parts = num.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return parts.join(',');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ error: 'invoice_id required' }, { status: 400 });

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    if (!invoices?.length) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    const invoice = invoices[0];

    // Fetch workspace logo
    const settings = await base44.asServiceRole.entities.WorkspaceSettings.list();
    const logoUrl = settings?.[0]?.logo_url || null;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Load font and logo in parallel
    const [roboto, logoData] = await Promise.all([embedFont(doc), tryLoadImage(logoUrl)]);
    const F = roboto ? 'Roboto' : 'helvetica';
    const t = roboto ? (s) => (s || '') : (s) => stripDiacritics(s || '');
    const curr = (n) => `${formatMoney(n)}\u00a0${t('Kč')}`;

    // ── Dimensions ────────────────────────────────────────────
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const L = 20;
    const R = W - 20;
    const MID = W / 2 + 5;

    // Colors
    const BLACK  = [28, 28, 32];
    const GRAY   = [130, 130, 138];
    const LGRAY  = [218, 218, 222];
    const DGRAY  = [80, 80, 88];
    const GOLD   = [180, 140, 30];

    const fn = (size, color = BLACK) => { doc.setFont(F, 'normal'); doc.setFontSize(size); doc.setTextColor(...color); };
    const fb = (size, color = BLACK) => { doc.setFont(F, 'bold');   doc.setFontSize(size); doc.setTextColor(...color); };
    const hline = (y, x1 = L, x2 = R, color = LGRAY, lw = 0.3) => {
      doc.setDrawColor(...color); doc.setLineWidth(lw); doc.line(x1, y, x2, y);
    };

    // ── HEADER ────────────────────────────────────────────────
    let y = 22;

    // Logo or company name (top-left)
    if (logoData) {
      // Fit logo in a 40×18 box top-left
      doc.addImage(logoData.b64, logoData.fmt, L, y - 12, 40, 18, undefined, 'FAST');
    } else {
      fb(13, GOLD);
      doc.text(t(invoice.supplier_company_name || ''), L, y);
    }

    // Invoice number block (top-right)
    fn(8, GRAY);
    doc.text(t('Faktura'), R, y - 8, { align: 'right' });
    fb(18, BLACK);
    doc.text(invoice.invoice_number || '', R, y, { align: 'right' });
    fn(8, GRAY);
    doc.text(t('DAŇOVÝ DOKLAD'), R, y + 6, { align: 'right' });

    // Thin header separator line
    y = 36;
    hline(y, L, R, LGRAY, 0.5);

    // ── DODAVATEL / ODBĚRATEL ─────────────────────────────────
    y = 46;

    // Short accent marks above labels (like "—")
    hline(y - 4, L, L + 10, DGRAY, 0.8);
    hline(y - 4, MID, MID + 10, DGRAY, 0.8);

    fn(7.5, GRAY);
    doc.text(t('DODAVATEL'), L, y);
    doc.text(t('ODBĚRATEL'), MID, y);

    y += 6;
    fb(11, BLACK);
    doc.text(t(invoice.supplier_company_name || ''), L, y);
    doc.text(t(invoice.customer_name || ''), MID, y);

    y += 5.5;
    fn(9, DGRAY);
    if (invoice.supplier_address) {
      const lines = doc.splitTextToSize(t(invoice.supplier_address), MID - L - 8);
      doc.text(lines, L, y);
    }
    if (invoice.customer_email) {
      fn(9, DGRAY);
      doc.text(invoice.customer_email, MID, y);
    }

    // IČO / DIČ
    let icoY = y + 10;
    fn(9, GRAY);
    if (invoice.supplier_ico) {
      doc.text(t('IČO'), L, icoY);
      fn(9, BLACK);
      doc.text(invoice.supplier_ico, L + 22, icoY);
      icoY += 5.5;
    }
    if (invoice.supplier_dic) {
      fn(9, GRAY);
      doc.text(t('DIČ'), L, icoY);
      fn(9, BLACK);
      doc.text(invoice.supplier_dic, L + 22, icoY);
      icoY += 5.5;
    }
    if (invoice.supplier_phone) {
      fn(9, GRAY);
      doc.text(t('Telefon'), L, icoY);
      fn(9, BLACK);
      doc.text(invoice.supplier_phone, L + 22, icoY);
      icoY += 5.5;
    }

    // ── PAYMENT DETAILS ───────────────────────────────────────
    y = Math.max(icoY, y + 28) + 6;
    hline(y, L, R, LGRAY, 0.4);
    y += 9;

    // Left group: bank / var symbol / payment method
    const C1 = L;
    const C2 = L + 38;
    const C3 = MID + 8;
    const C4 = R;

    const detailRow = (label, value, rowY, labelX, valX, valAlign = 'left') => {
      fn(8.5, GRAY); doc.text(t(label), labelX, rowY);
      fn(8.5, BLACK); doc.text(t(value || '—'), valX, rowY, { align: valAlign });
    };

    let dy = y;
    if (invoice.payment_method) {
      detailRow('Způsob platby', invoice.payment_method, dy, C1, C2);
    }
    dy += 5.5;

    // Right group: dates
    let ry = y;
    detailRow('Datum vystavení', invoice.issue_date || '', ry, C3, C4, 'right');
    ry += 5.5;
    if (invoice.due_date) {
      detailRow('Datum splatnosti', invoice.due_date, ry, C3, C4, 'right');
      ry += 5.5;
    }
    if (invoice.taxable_supply_date) {
      detailRow(t('Datum zdan. plnění'), invoice.taxable_supply_date, ry, C3, C4, 'right');
      ry += 5.5;
    }

    // ── ITEMS TABLE ───────────────────────────────────────────
    y = Math.max(dy, ry) + 10;
    hline(y, L, R, LGRAY, 0.4);
    y += 8;

    // Table header
    fn(7.5, GRAY);
    doc.text(t('POPIS SLUŽBY / ZBOŽÍ'), L, y);
    doc.text(t('CENA'), R, y, { align: 'right' });

    y += 3;
    hline(y, L, R, LGRAY, 0.3);
    y += 7;

    // Item row
    fb(10.5, BLACK);
    doc.text(t(invoice.item_name || 'Služba'), L, y);
    fb(10.5, BLACK);
    doc.text(curr(invoice.total_amount), R, y, { align: 'right' });

    if (invoice.item_description) {
      y += 5;
      fn(8.5, DGRAY);
      const dlines = doc.splitTextToSize(t(invoice.item_description), R - L - 50);
      doc.text(dlines, L, y);
      y += dlines.length * 4.5;
    }

    y += 8;
    hline(y, L, R, BLACK, 0.6);

    // ── TOTAL ─────────────────────────────────────────────────
    y += 10;
    fn(8.5, GRAY);
    doc.text(t('CELKEM K ÚHRADĚ'), R - 58, y, { align: 'right' });
    fb(18, GOLD);
    doc.text(curr(invoice.total_amount), R, y + 1, { align: 'right' });

    // ── NOTE ──────────────────────────────────────────────────
    if (invoice.note) {
      y += 18;
      hline(y, L, R, LGRAY, 0.3);
      y += 7;
      fn(7.5, GRAY); doc.text(t('Poznámka'), L, y);
      y += 5;
      fn(8.5, DGRAY);
      const nlines = doc.splitTextToSize(t(invoice.note), R - L);
      doc.text(nlines, L, y);
    }

    // ── FOOTER ────────────────────────────────────────────────
    hline(H - 18, L, R, LGRAY, 0.3);
    fn(7, GRAY);
    const footerParts = [invoice.supplier_company_name, invoice.supplier_address, invoice.supplier_ico ? `${t('IČO')}: ${invoice.supplier_ico}` : ''].filter(Boolean).map(t).join('  ·  ');
    doc.text(footerParts, L, H - 11);
    if (invoice.supplier_email) {
      fn(7, GRAY);
      doc.text(invoice.supplier_email, R, H - 11, { align: 'right' });
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