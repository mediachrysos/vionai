import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, terms_accepted, check_only, get_docs, company } = body;

    // Get legal documents filtered by company (public, no token needed)
    if (get_docs) {
      const allDocs = await base44.asServiceRole.entities.LegalDocument.list();
      const targetCompany = company || "Chrysos Media";
      // Strict match — only docs for the exact company; fallback to Chrysos Media docs if none found
      let docs = allDocs.filter(d => (d.company || "Chrysos Media") === targetCompany);
      if (docs.length === 0) {
        docs = allDocs.filter(d => (d.company || "Chrysos Media") === "Chrysos Media");
      }
      return Response.json({ docs });
    }

    if (!token) {
      return Response.json({ error: "Chybí token." }, { status: 400 });
    }

    // Find the onboarding request by token
    const requests = await base44.asServiceRole.entities.CustomerOnboardingRequest.filter({ token });

    if (!requests || requests.length === 0) {
      if (check_only) return Response.json({ invalid: true });
      return Response.json({ error: "Odkaz je neplatný nebo již byl použit." }, { status: 404 });
    }

    const onboardingRequest = requests[0];

    // Check expiration
    if (onboardingRequest.expires_at && new Date(onboardingRequest.expires_at) < new Date()) {
      if (onboardingRequest.status === "pending") {
        await base44.asServiceRole.entities.CustomerOnboardingRequest.update(onboardingRequest.id, { status: "expired" });
      }
      if (check_only) return Response.json({ expired: true });
      return Response.json({ error: "Platnost odkazu vypršela." }, { status: 403 });
    }

    // Check status
    if (onboardingRequest.status !== "pending") {
      if (check_only) return Response.json({ invalid: true });
      return Response.json({ error: "Odkaz je neplatný nebo již byl použit." }, { status: 404 });
    }

    // check_only mode — validate and return company info
    if (check_only) return Response.json({ valid: true, company: onboardingRequest.company || "Chrysos Media" });

    if (!terms_accepted) {
      return Response.json({ error: "Chybí souhlas s podmínkami." }, { status: 400 });
    }

    // Check if customer with this name already exists
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ full_name: onboardingRequest.full_name });
    
    let customer;
    if (existingCustomers.length > 0) {
      customer = existingCustomers[0];
      const currentModels = customer.assigned_models || [];
      const newModelId = onboardingRequest.assigned_model;
      const updatedModels = newModelId && !currentModels.includes(newModelId)
        ? [...currentModels, newModelId]
        : currentModels;
      await base44.asServiceRole.entities.Customer.update(customer.id, {
        assigned_models: updatedModels,
        status: customer.status === "inactive" ? "active" : customer.status,
      });
    } else {
      customer = await base44.asServiceRole.entities.Customer.create({
        full_name: onboardingRequest.full_name,
        assigned_models: onboardingRequest.assigned_model ? [onboardingRequest.assigned_model] : [],
        assigned_chatter: onboardingRequest.assigned_chatter || null,
        status: "active",
      });
    }

    await base44.asServiceRole.entities.CustomerOnboardingRequest.update(onboardingRequest.id, {
      status: "completed",
      created_customer_id: customer.id,
    });

    return Response.json({ success: true, customer_id: customer.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});