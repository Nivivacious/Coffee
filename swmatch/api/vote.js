// "Good match?" votes, so dupes people confirm rise and ones they reject
// sink (the way Findation learns from shades people actually wear).
// Stored in Upstash Redis; Vercel's Upstash integration sets the variables.
//   GET  /api/vote?src=<shade id>            -> { votes: { <dupe id>: { up, down } } }
//   POST /api/vote { src, dupe, vote: 1|-1 }  -> { ok: true }
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const validId = (v) => /^[a-z0-9-]{3,160}$/.test(String(v || ''));

async function redis(...commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`Redis said ${r.status}`);
  return (await r.json()).map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'Votes are not set up on this deployment.' });
  try {
    if (req.method === 'GET') {
      const src = String(req.query.src || '');
      if (!validId(src)) return res.status(400).json({ error: 'Unknown shade.' });
      const [flat] = await redis(['HGETALL', `swmatch:votes:${src}`]);
      const votes = {};
      for (let i = 0; flat && i < flat.length; i += 2) {
        const [dupe, dir] = flat[i].split('|');
        votes[dupe] = votes[dupe] || { up: 0, down: 0 };
        votes[dupe][dir === 'up' ? 'up' : 'down'] = Number(flat[i + 1]) || 0;
      }
      return res.status(200).json({ votes });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST.' });
    const { src, dupe, vote } = req.body || {};
    if (!validId(src) || !validId(dupe) || ![1, -1].includes(vote)) return res.status(400).json({ error: 'Send src, dupe and vote (1 or -1).' });
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    // One vote per person per pair per day, and at most 60 votes an hour.
    const [first, n] = await redis(
      ['SET', `swmatch:voted:${ip}:${src}:${dupe}`, '1', 'NX', 'EX', 86400],
      ['INCR', `swmatch:rl:${ip}`], ['EXPIRE', `swmatch:rl:${ip}`, 3600],
    );
    if (!first) return res.status(200).json({ ok: true, repeat: true });
    if (n > 60) return res.status(429).json({ error: 'Too many votes. Try again later.' });
    await redis(['HINCRBY', `swmatch:votes:${src}`, `${dupe}|${vote > 0 ? 'up' : 'down'}`, 1]);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(503).json({ error: 'Votes are unavailable right now.' });
  }
};
