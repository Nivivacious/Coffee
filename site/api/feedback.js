// "Spot something off?" notes. Stored in Redis, and emailed to you if you
// set RESEND_API_KEY and FEEDBACK_TO in Vercel. The address only ever lives
// in Vercel's environment settings, never in the site or the repo.
// POST {card, text, contact}
// GET  (header x-admin-key = ADMIN_KEY)   the latest 200 notes
const { redis, overLimit, clean } = require('./_redis');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
      const [rows] = await redis(['LRANGE', 'tale:feedback', 0, 199]);
      return res.status(200).json({ notes: (rows || []).map((r) => { try { return JSON.parse(r); } catch (e) { return { text: r }; } }) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
    const body = req.body || {};
    const note = { card: clean(body.card, 20), text: clean(body.text, 1000), contact: clean(body.contact, 120), at: new Date().toISOString() };
    if (note.text.length < 3) return res.status(400).json({ error: 'empty' });

    let stored = false, mailed = false;
    try {
      if (await overLimit(req, 'feedback', 5, 900)) return res.status(429).json({ error: 'slow down' });
      await redis(['LPUSH', 'tale:feedback', JSON.stringify(note)], ['LTRIM', 'tale:feedback', 0, 1999]);
      stored = true;
    } catch (e) { /* Redis not connected yet: email may still work */ }

    if (process.env.RESEND_API_KEY && process.env.FEEDBACK_TO) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.FEEDBACK_FROM || 'A Tale of Two Cities <onboarding@resend.dev>',
          to: [process.env.FEEDBACK_TO],
          subject: `Local check on ${note.card || 'a card'}`,
          text: `${note.text}\n\nCard: ${note.card}\nContact: ${note.contact || 'not given'}\nSent: ${note.at}`
        })
      });
      mailed = r.ok;
    }
    if (!stored && !mailed) return res.status(503).json({ error: 'unavailable' });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(503).json({ error: 'unavailable' });
  }
};
