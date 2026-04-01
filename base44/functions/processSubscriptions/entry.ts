import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (no user) and manual admin calls
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    isAdmin = !!user;
  } catch (_) {
    // Called from scheduler — no user context, proceed
  }

  const today = new Date();
  const todayDay = today.getDate();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const dateStr = `${monthStr}-${String(todayDay).padStart(2, "0")}`;

  // Get all active subscriptions
  const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ is_active: true });

  // Get existing wallet transactions this month to avoid duplicates
  const existingTxs = await base44.asServiceRole.entities.WalletTransaction.list("-transaction_date", 500);
  const thisMonthTxTitles = existingTxs
    .filter((t) => (t.transaction_date || "").startsWith(monthStr) && t.category === "Předplatné")
    .map((t) => t.title);

  const processed = [];
  const skipped = [];

  for (const sub of subscriptions) {
    const billingDay = parseInt(sub.billing_day) || 1;

    // Only process if today is the billing day
    if (todayDay !== billingDay) {
      skipped.push({ name: sub.name, reason: `billing_day=${billingDay}, today=${todayDay}` });
      continue;
    }

    const txTitle = `Předplatné – ${sub.name}`;

    // Skip if already deducted this month
    if (thisMonthTxTitles.includes(txTitle)) {
      skipped.push({ name: sub.name, reason: "already deducted this month" });
      continue;
    }

    // Create wallet transaction
    await base44.asServiceRole.entities.WalletTransaction.create({
      title: txTitle,
      amount: parseFloat(sub.amount) || 0,
      type: "expense",
      category: "Předplatné",
      account_id: sub.account_id || "",
      account_name: sub.account_name || "",
      transaction_date: dateStr,
      note: `Automaticky odečteno (scheduled)`,
    });

    // Update account balance
    if (sub.account_id) {
      const accounts = await base44.asServiceRole.entities.BankAccount.filter({ id: sub.account_id });
      const acc = accounts[0];
      if (acc) {
        await base44.asServiceRole.entities.BankAccount.update(sub.account_id, {
          balance: (acc.balance || 0) - (parseFloat(sub.amount) || 0),
        });
      }
    }

    processed.push(sub.name);
  }

  return Response.json({ processed, skipped, date: dateStr });
});