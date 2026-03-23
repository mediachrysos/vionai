import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, terms_accepted, check_only } = await req.json();

    if (!token) {
      return Response.json({ error: "Chybí token." }, { status: 400 });
    }

    // Find the onboarding request by token (any status for check_only)
    const requests = await base44.asServiceRole.entities.CustomerOnboardingRequest.filter({ token });

    if (!requests || requests.length === 0) {
      return Response.json({ error: "Odkaz je neplatný nebo již byl použit." }, { status: 404 });
    }

    const onboardingRequest = requests[0];

    // Check expiration
    if (onboardingRequest.expires_at && new Date(onboardingRequest.expires_at) < new Date()) {
      await base44.asServiceRole.entities.CustomerOnboardingRequest.update(onboardingRequest.id, { status: "expired" });
      return Response.json({ error: "Platnost odkazu vypršela." }, { status: 403 });
    }

    // Create the customer
    const customer = await base44.asServiceRole.entities.Customer.create({
      full_name: onboardingRequest.full_name,
      assigned_model: onboardingRequest.assigned_model || null,
      assigned_chatter: onboardingRequest.assigned_chatter || null,
      status: "active",
    });

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