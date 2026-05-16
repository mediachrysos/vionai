import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
    const today = new Date().toISOString().split('T')[0];

    // Get all payouts for this chatter
    const payouts = await base44.entities.ChatterPayout.filter({ chatter_email: email });
    
    // Get today's notes
    const existingNotes = await base44.entities.ChatterNote.filter({ 
      chatter_email: email, 
      note_date: today 
    });

    // Build automatic note
    if (payouts.length > 0) {
      const autoNoteContent = `🎯 Výplaty: ${payouts.map(p => `${p.amount?.toLocaleString()} Kč (${p.period})`).join(", ")}`;
      
      // Check if automatic note already exists
      const hasAutoNote = existingNotes.some(n => n.content.includes('🎯 Výplaty:'));
      
      if (!hasAutoNote) {
        await base44.entities.ChatterNote.create({
          chatter_email: email,
          content: autoNoteContent,
          note_date: today
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});