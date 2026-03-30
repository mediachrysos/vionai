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

  // Fetch pending messages — load all and filter server-side to avoid URL encoding issues with diacritics
  if (action === "list") {
    let allRecords = [];
    let offset = null;

    do {
      const url = `${BASE_URL}?maxRecords=100${offset ? `&offset=${offset}` : ""}`;
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (data.records) allRecords = allRecords.concat(data.records);
      offset = data.offset || null;
    } while (offset);

    // Filter server-side: only records where status is exactly "čeká"
    const pending = allRecords.filter(r => r.fields?.status === "čeká");
    console.log(`Total records: ${allRecords.length}, pending: ${pending.length}`);
    return Response.json({ records: pending });
  }

  // Helper: PATCH Airtable with retry (up to 3 attempts)
  async function patchAirtable(recordId, fields) {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${BASE_URL}/${recordId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ fields })
      });
      const data = await res.json();
      if (res.ok && !data.error) return data;
      console.log(`PATCH attempt ${i + 1} failed:`, JSON.stringify(data).slice(0, 300));
      if (i < 2) await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }

  // Approve: 1) PATCH Airtable to 'schváleno', 2) POST to n8n
  if (action === "approve") {
    const { recordId, sender_id, odpoved_ai } = body;

    // 1. Update Airtable status first
    const record = await patchAirtable(recordId, { status: "schváleno" });
    console.log("airtable patch result:", record ? "ok" : "failed");

    // 2. Send to n8n webhook
    const webhookRes = await fetch("https://chrysosmedia.app.n8n.cloud/webhook/40a8a7f4-3699-44a7-b63e-e9286b26cf98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id, text: odpoved_ai })
    });
    console.log("webhook status:", webhookRes.status);

    return Response.json({ record, webhookStatus: webhookRes.status });
  }

  // Reject — only update status
  if (action === "reject") {
    const { recordId } = body;
    const record = await patchAirtable(recordId, { status: "zamítnuto" });
    return Response.json({ record });
  }

  // Approve with edited reply: 1) PATCH Airtable, 2) POST to n8n with edited text
  if (action === "approveEdited") {
    const { recordId, sender_id, odpoved_ai } = body;

    // 1. Update Airtable with edited reply and status
    const record = await patchAirtable(recordId, { odpoved_ai: odpoved_ai, status: "schváleno" });
    console.log("airtable patch result (edited):", record ? "ok" : "failed");

    // 2. Send edited reply to n8n
    const webhookRes = await fetch("https://chrysosmedia.app.n8n.cloud/webhook/40a8a7f4-3699-44a7-b63e-e9286b26cf98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id, text: odpoved_ai })
    });
    console.log("webhook status (edited):", webhookRes.status);

    return Response.json({ record, webhookStatus: webhookRes.status });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});