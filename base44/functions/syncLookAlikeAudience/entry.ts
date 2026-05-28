import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Normalize phone: remove spaces, ensure starts with +
function normalizePhone(phone) {
  if (!phone) return null;
  const p = phone.replace(/\s+/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.match(/^[67]\d{8}$/)) return '+420' + p;  // 9-digit Czech without prefix
  return p;
}

// Normalize name to lowercase for comparison
function normalizeName(name) {
  return (name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated users and automation (service role)
    let base44Client = base44;
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {
      // Called from automation without user context — use service role
      isAutomation = true;
      base44Client = base44.asServiceRole;
    }

    const sr = base44.asServiceRole;

    // Fetch all customers with payment_count > 0 and a phone
    const allCustomers = await sr.entities.Customer.list('-created_date', 5000);
    const customersWithPhone = allCustomers.filter(c => 
      (c.payment_count || 0) > 0 && c.phone && c.phone.trim()
    );

    // Fetch all existing LA records
    const existing = await sr.entities.LookAlikeAudience.list('-created_date', 5000);

    // Build set of normalized phones and names already in LA
    const existingPhones = new Set(existing.map(e => normalizePhone(e.phone)).filter(Boolean));
    const existingNames = new Set(existing.map(e => 
      normalizeName(`${e.first_name} ${e.last_name}`)
    ));

    const toCreate = [];
    for (const c of customersWithPhone) {
      const normPhone = normalizePhone(c.phone);
      const parts = (c.full_name || '').trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const normName = normalizeName(c.full_name);

      // Skip if phone or full name already exists
      if (normPhone && existingPhones.has(normPhone)) continue;
      if (existingNames.has(normName)) continue;

      toCreate.push({
        first_name: firstName,
        last_name: lastName,
        phone: normPhone || c.phone.trim(),
        total_czk: c.total_spent || 0,
      });

      // Mark as seen to avoid duplicates within this batch
      if (normPhone) existingPhones.add(normPhone);
      existingNames.add(normName);
    }

    let created = 0;
    if (toCreate.length > 0) {
      // Bulk create in batches of 50
      for (let i = 0; i < toCreate.length; i += 50) {
        const batch = toCreate.slice(i, i + 50);
        await sr.entities.LookAlikeAudience.bulkCreate(batch);
        created += batch.length;
      }
    }

    return Response.json({ 
      success: true, 
      added: created,
      total_existing: existing.length,
      message: created > 0 ? `Přidáno ${created} nových kontaktů` : 'Vše je aktuální'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});