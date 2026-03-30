import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_ID = "appBbEXOQ2Dx4Fj9w";
const TABLE_NAME = "Zprávy";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;

function headers() {
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

  // List all records without filter (debug)
  if (action === "listAll") {
    const url = `${BASE_URL}?maxRecords=10`;
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();
    console.log("listAll response:", JSON.stringify(data).slice(0, 2000));
    return Response.json({ records: data.records || [], error: data.error });
  }

  // Fetch pending messages — filter where status = "čeká"
  if (action === "list") {
    // Try filtering by field named "status" with lowercase "čeká"
    const formula = `{status}="čeká"`;
    const url = `${BASE_URL}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=100`;
    console.log("Fetching URL:", url);
    const res = await fetch(url, { headers: headers() });
    const data = await res.json();
    console.log("list response status:", res.status);
    console.log("list response:", JSON.stringify(data).slice(0, 2000));
    return Response.json({ records: data.records || [], error: data.error });
  }

  // Update status
  if (action === "update") {
    const { recordId, status } = body;
    const res = await fetch(`${BASE_URL}/${recordId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ fields: { status: status } })
    });
    const data = await res.json();
    console.log("update response:", JSON.stringify(data).slice(0, 500));
    return Response.json({ record: data });
  }

  // Update with edited reply and approve
  if (action === "updateReply") {
    const { recordId, reply } = body;
    const res = await fetch(`${BASE_URL}/${recordId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ fields: { "Navrhovaná odpověď": reply, status: "schváleno" } })
    });
    const data = await res.json();
    return Response.json({ record: data });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});