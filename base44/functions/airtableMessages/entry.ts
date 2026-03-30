import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_ID = "appBbEXOQ2Dx4Fj9w";
const TABLE = "Zprávy";
const API_URL = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;

function airtableHeaders() {
  return {
    "Authorization": `Bearer ${Deno.env.get("AIRTABLE_API_TOKEN")}`,
    "Content-Type": "application/json"
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // Fetch pending messages
  if (action === "list") {
    const url = `${API_URL}?filterByFormula=${encodeURIComponent('Status="čeká"')}&maxRecords=100`;
    const res = await fetch(url, { headers: airtableHeaders() });
    const data = await res.json();
    return Response.json({ records: data.records || [] });
  }

  // Update status
  if (action === "update") {
    const { recordId, status } = body;
    const res = await fetch(`${API_URL}/${recordId}`, {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields: { Status: status } })
    });
    const data = await res.json();
    return Response.json({ record: data });
  }

  // Update with edited reply
  if (action === "updateReply") {
    const { recordId, reply } = body;
    const res = await fetch(`${API_URL}/${recordId}`, {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields: { "Navrhovaná odpověď": reply, Status: "schváleno" } })
    });
    const data = await res.json();
    return Response.json({ record: data });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});