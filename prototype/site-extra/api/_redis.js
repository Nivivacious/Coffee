// Tiny Upstash Redis client over its REST API. No packages needed.
// Vercel's Upstash integration sets these variables for you.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...commands) {
  if (!URL_ || !TOKEN) throw Object.assign(new Error('Redis is not connected'), { code: 'NO_DB' });
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!r.ok) throw new Error(`Redis said ${r.status}`);
  const results = await r.json();
  return results.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

// True when this IP has gone over `max` requests in the last `seconds`.
async function overLimit(req, bucket, max, seconds) {
  const key = `tale:rl:${bucket}:${clientIp(req)}`;
  const [n] = await redis(['INCR', key], ['EXPIRE', key, seconds]);
  return n > max;
}

// Plain text only: no control characters, trimmed, capped.
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const validId = (v) => /^[A-Za-z0-9-]{8,64}$/.test(String(v || ''));

module.exports = { redis, overLimit, clean, validId };
