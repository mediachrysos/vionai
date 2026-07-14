import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Use service role to bypass any potential RLS issues for non-admin users
    const accounts = await base44.asServiceRole.entities.BankAccount.list();
    const active = accounts.filter((a) => a.is_active !== false);
    return Response.json({ accounts: active });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});