import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all completed onboarding requests that have an assigned_model
    const completed = await base44.asServiceRole.entities.CustomerOnboardingRequest.filter({ status: "completed" });
    const withModel = completed.filter(r => r.assigned_model);

    const results = { fixed: 0, skipped: 0, errors: [] };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (const req of withModel) {
      await sleep(500);
      try {
        // Find customer by created_customer_id first, then fallback to full_name
        let customer = null;

        if (req.created_customer_id) {
          const byId = await base44.asServiceRole.entities.Customer.filter({ id: req.created_customer_id });
          customer = byId[0] || null;
        }

        if (!customer && req.full_name) {
          const byName = await base44.asServiceRole.entities.Customer.filter({ full_name: req.full_name });
          customer = byName[0] || null;
        }

        if (!customer) {
          results.skipped++;
          continue;
        }

        const currentModels = customer.assigned_models || [];
        if (currentModels.includes(req.assigned_model)) {
          results.skipped++;
          continue;
        }

        // Add the model
        await base44.asServiceRole.entities.Customer.update(customer.id, {
          assigned_models: [...currentModels, req.assigned_model],
        });

        // Also ensure created_customer_id is set on the onboarding request
        if (!req.created_customer_id) {
          await base44.asServiceRole.entities.CustomerOnboardingRequest.update(req.id, {
            created_customer_id: customer.id,
          });
        }

        results.fixed++;
      } catch (e) {
        results.errors.push({ request_id: req.id, error: e.message });
      }
    }

    return Response.json({ success: true, total: withModel.length, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});