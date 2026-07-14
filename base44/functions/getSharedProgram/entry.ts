import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { week_start } = await req.json();
    if (!week_start) return Response.json({ error: 'week_start required' }, { status: 400 });

    const programs = await base44.asServiceRole.entities.WeeklyProgram.filter({
      week_start,
      designer_email: "shared_graphic_space",
    });

    const submissions = await base44.asServiceRole.entities.DaySubmission.filter({
      week_start,
      designer_email: "shared_graphic_space",
    });

    return Response.json({ programs, submissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});