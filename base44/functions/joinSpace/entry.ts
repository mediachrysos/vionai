import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const me = await base44.auth.me();
    const { invite_code } = await req.json();

    if (!invite_code || typeof invite_code !== 'string') {
      return Response.json({ error: "Missing invite code." }, { status: 400 });
    }

    const trimmed = invite_code.trim().toUpperCase();

    if (me.space_id) {
      return Response.json({ already_in: true });
    }

    // Use service role to read Space (RLS blocks non-admins)
    const spaces = await base44.asServiceRole.entities.Space.filter({ invite_code: trimmed });

    if (!spaces || spaces.length === 0) {
      return Response.json({ error: "Invalid invite code. Please check and try again." }, { status: 404 });
    }

    const space = spaces[0];
    if (space.status !== "active") {
      return Response.json({ error: "This space is currently inactive. Contact the space owner." }, { status: 403 });
    }

    // Update user via auth.updateMe (user-scoped)
    await base44.auth.updateMe({
      space_id: space.id,
      account_status: "pending",
    });

    return Response.json({ success: true, space_name: space.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});