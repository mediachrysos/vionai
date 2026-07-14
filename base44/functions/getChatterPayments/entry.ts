import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const chatterEmail = body.chatter_email;

    if (!chatterEmail) return Response.json({ error: 'chatter_email required' }, { status: 400 });

    // Only admins can query for other chatters; chatters can only query themselves
    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.email !== chatterEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to bypass RLS and get ONLY payments for this specific chatter
    const payments = await base44.asServiceRole.entities.Payment.filter(
      { chatter_email: chatterEmail },
      '-created_date',
      5000
    );

    return Response.json({ payments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});