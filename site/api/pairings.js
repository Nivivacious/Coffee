// The "Your turn" board.
// GET ?voter=id            list pairings with vote counts
// POST {action:'add', voter, blr, nyc, line, name}
// POST {action:'vote', voter, key}      toggles a vote
// DELETE ?key=..           removes one (needs header x-admin-key = ADMIN_KEY)
const { redis, overLimit, clean, validId } = require('./_redis');
const PAIRS = 'tale:pairings';
const votesKey = (key) => `tale:votes:${key}`;

async function list(voter) {
  const flat = (await redis(['HGETALL', PAIRS]))[0] || [];
  const items = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { items.push({ key: flat[i], ...JSON.parse(flat[i + 1]) }); } catch (e) { /* skip a bad row */ }
  }
  if (!items.length) return [];
  const cmds = [];
  items.forEach((p) => { cmds.push(['SCARD', votesKey(p.key)]); cmds.push(['SISMEMBER', votesKey(p.key), voter || '-']); });
  const res = await redis(...cmds);
  return items.map((p, i) => ({ key: p.key, blr: p.blr, nyc: p.nyc, line: p.line, name: p.name, at: p.at, n: res[i * 2], mine: res[i * 2 + 1] === 1, by: p.by }))
    .sort((a, b) => b.n - a.n || String(b.at).localeCompare(String(a.at)))
    .slice(0, 200);
}
// Voter ids never leave the server.
const publicList = (items) => items.map(({ by, ...rest }) => rest);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const voter = validId(req.query.voter) ? req.query.voter : null;
      return res.status(200).json({ items: publicList(await list(voter)) });
    }
    if (req.method === 'DELETE') {
      if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
      const key = String(req.query.key || '');
      await redis(['HDEL', PAIRS, key], ['DEL', votesKey(key)]);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
    const body = req.body || {};
    if (!validId(body.voter)) return res.status(400).json({ error: 'voter' });

    if (body.action === 'add') {
      if (await overLimit(req, 'add', 5, 600)) return res.status(429).json({ error: 'slow down' });
      const p = { blr: clean(body.blr, 60), nyc: clean(body.nyc, 60), line: clean(body.line, 90), name: clean(body.name, 30), at: new Date().toISOString(), by: body.voter };
      if (!p.blr || !p.nyc) return res.status(400).json({ error: 'both sides' });
      const current = await list(body.voter);
      if (current.filter((x) => x.by === body.voter).length >= 3) return res.status(409).json({ error: 'three each' });
      const key = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await redis(['HSET', PAIRS, key, JSON.stringify(p)]);
      return res.status(200).json({ items: publicList(await list(body.voter)) });
    }

    if (body.action === 'vote') {
      if (await overLimit(req, 'vote', 40, 60)) return res.status(429).json({ error: 'slow down' });
      const key = String(body.key || '');
      const [exists, voted] = await redis(['HEXISTS', PAIRS, key], ['SISMEMBER', votesKey(key), body.voter]);
      if (!exists) return res.status(404).json({ error: 'gone' });
      await redis(voted ? ['SREM', votesKey(key), body.voter] : ['SADD', votesKey(key), body.voter]);
      return res.status(200).json({ items: publicList(await list(body.voter)) });
    }
    res.status(400).json({ error: 'action' });
  } catch (e) {
    res.status(503).json({ error: 'unavailable' });
  }
};
