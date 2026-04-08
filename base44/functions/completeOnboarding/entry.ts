import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, terms_accepted, check_only, get_docs } = await req.json();

    // Get legal documents (public, no token needed)
    if (get_docs) {
      const docs = await base44.asServiceRole.entities.LegalDocument.list();
      return Response.json({ docs });
    }

    if (!token) {
      return Response.json({ error: "Chybí token." }, { status: 400 });
    }

    // Find the onboarding request by token (any status for check_only)
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

    // check_only mode — just validate, don't create customer
    if (check_only) return Response.json({ valid: true });

    if (!terms_accepted) {
      return Response.json({ error: "Chybí souhlas s podmínkami." }, { status: 400 });
    }

    // Check if customer with this name already exists
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({ full_name: onboardingRequest.full_name });
    
    let customer;
    if (existingCustomers.length > 0) {
      // Use existing customer — just add the model if not already assigned
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
      // Create new customer
      customer = await base44.asServiceRole.entities.Customer.create({
        full_name: onboardingRequest.full_name,
        assigned_models: onboardingRequest.assigned_model ? [onboardingRequest.assigned_model] : [],
        assigned_chatter: onboardingRequest.assigned_chatter || null,
        status: "active",
      });
    }

    // Mark the onboarding request as completed
    await base44.asServiceRole.entities.CustomerOnboardingRequest.update(onboardingRequest.id, {
      status: "completed",
      created_customer_id: customer.id,
    });

    return Response.json({ success: true, customer_id: customer.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});