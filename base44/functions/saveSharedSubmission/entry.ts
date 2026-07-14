import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { week_start, day_key, day_name, designer_email, task_idx, link, action_type, admin_note, admin_link } = await req.json();

    if (!week_start || !day_key) {
      return Response.json({ error: 'week_start and day_key are required' }, { status: 400 });
    }

    // Fetch existing submission using service role to bypass RLS
    const existing = await base44.asServiceRole.entities.DaySubmission.filter({
      week_start,
      day_key,
      designer_email: designer_email || 'shared_graphic_space',
    });

    let submission = existing[0] || null;

    // --- Admin action: approve/reject/edit_requested ---
    if (action_type && user.role === 'admin') {
      if (!submission) return Response.json({ error: 'No submission found' }, { status: 404 });
      const taskSubs = [...(submission.task_submissions || [])];
      const idx = taskSubs.findIndex(t => t.task_idx === task_idx);
      const update = { status: action_type, admin_note: admin_note || '', reviewed_at: new Date().toISOString() };
      if (idx >= 0) taskSubs[idx] = { ...taskSubs[idx], ...update };
      await base44.asServiceRole.entities.DaySubmission.update(submission.id, { task_submissions: taskSubs });
      return Response.json({ ok: true });
    }

    // --- Admin link save ---
    if (admin_link !== undefined && user.role === 'admin') {
      if (!submission) {
        submission = await base44.asServiceRole.entities.DaySubmission.create({
          week_start, day_key, day_name: day_name || day_key,
          designer_email: designer_email || 'shared_graphic_space',
          task_submissions: [],
          admin_link,
        });
      } else {
        await base44.asServiceRole.entities.DaySubmission.update(submission.id, { admin_link });
      }
      return Response.json({ ok: true });
    }

    // --- Designer: submit link ---
    if (link !== undefined && task_idx !== undefined) {
      const taskSubs = [...(submission?.task_submissions || [])];
      const existing_idx = taskSubs.findIndex(t => t.task_idx === task_idx);
      const entry = {
        task_idx,
        submitted_link: link,
        status: 'submitted',
        admin_note: '',
        submitted_at: new Date().toISOString(),
      };
      if (existing_idx >= 0) taskSubs[existing_idx] = { ...taskSubs[existing_idx], ...entry };
      else taskSubs.push(entry);

      if (!submission) {
        await base44.asServiceRole.entities.DaySubmission.create({
          week_start, day_key, day_name: day_name || day_key,
          designer_email: designer_email || 'shared_graphic_space',
          task_submissions: taskSubs,
        });
      } else {
        await base44.asServiceRole.entities.DaySubmission.update(submission.id, { task_submissions: taskSubs });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});