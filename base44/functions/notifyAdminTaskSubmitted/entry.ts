import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { designerName, designerEmail, dayName, taskLabel, taskDesc, submittedLink, weekStart } = await req.json();

    // Get all admin users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === "admin");

    const subject = `📬 New task submitted — ${designerName} · ${dayName}`;
    const body = `
Hello,

${designerName} (${designerEmail}) has submitted a task for review.

📅 Week: ${weekStart}
📆 Day: ${dayName}
🎯 Task: ${taskLabel}${taskDesc ? ` — ${taskDesc}` : ""}

🔗 Submitted link:
${submittedLink}

Please review it in the Social Media dashboard.

— Chrysos Platform
    `.trim();

    // Send email to all admins
    await Promise.all(
      admins.map(admin =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject,
          body,
        })
      )
    );

    return Response.json({ ok: true, sent: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});