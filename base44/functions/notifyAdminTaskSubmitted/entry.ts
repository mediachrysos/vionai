// This function is no longer used — notifications are handled via real-time entity subscription in the frontend Layout.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => {
  return Response.json({ ok: true });
});