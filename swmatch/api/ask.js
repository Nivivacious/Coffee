// AI stylist for swmatch. The page sends the shade the visitor picked and the
// engine's top dupes with their scores; Claude turns that into a short,
// honest verdict an Indian shopper can act on. The engine stays the source of
// truth for the numbers: Claude only explains and ranks what it is given.
//
// Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
// POST { source, candidates[], skin }
const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM = `You are the stylist behind swmatch, an Indian makeup dupe finder.
You get one shade a shopper loves and up to six candidate dupes, each already scored by swmatch's matching engine
(colour distance as CIEDE2000 ΔE, undertone, depth, intensity, finish, payoff, formula; 0-100 each) with prices in rupees.

Write a short verdict in plain English for an Indian shopper:
- Name the best dupe overall and the best value pick if it is a different product, with the rupee saving.
- Say honestly how each pick differs (deeper, warmer, less pigmented, matte instead of dewy) and one practical tip to close the gap.
- If the shopper gave their skin tone (fair, light, wheatish, dusky, deep), say how the shade will read on it.
- If nothing is a close match (best under about 80), say so plainly instead of overselling.
- If a candidate's colour data confidence is low, tell them to check that swatch in person.
Use only the products you were given. Don't invent shades, prices or claims. No markdown headings; at most 130 words.`;

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const shadeOk = (s) => s && typeof s === 'object' && /^#[0-9A-Fa-f]{6}$/.test(String(s.hex || ''));

function describe(s) {
  return [
    `${clip(s.brand, 60)} ${clip(s.line, 80)}, shade "${clip(s.shade, 60)}" (${clip(s.hex, 7)})`,
    `undertone ${clip(s.undertone, 10)}, finish ${clip(s.finish, 12)}, ${clip(s.formula, 10)}, payoff ${Number(s.payoff) || '?'}/5`,
    `price ${s.price_inr ? '₹' + Math.round(Number(s.price_inr)) : 'unknown'}, ${s.origin === 'IN' ? 'Indian brand' : 'international brand'}`,
  ].join('; ');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'The AI stylist is not set up on this deployment yet.' });

  const body = req.body || {};
  const src = body.source;
  const cands = Array.isArray(body.candidates) ? body.candidates.filter(shadeOk).slice(0, 6) : [];
  if (!shadeOk(src) || !cands.length) return res.status(400).json({ error: 'Send the shade and at least one candidate.' });
  const skin = ['fair', 'light', 'wheatish', 'dusky', 'deep'].includes(body.skin) ? body.skin : null;

  const prompt = [
    `Shade they love: ${describe(src)}.`,
    skin ? `Their skin tone: ${skin}.` : 'They did not give a skin tone.',
    'Candidates from the engine, best first:',
    ...cands.map((c, i) => `${i + 1}. ${describe(c)}; match ${Number(c.match) || 0}%, ΔE ${Number(c.deltaE) || 0}; compared to the original: ${clip(c.compared, 120) || 'n/a'}; colour data confidence ${clip(c.colour_confidence, 8) || 'n/a'}; scores ${JSON.stringify(c.scores || {})}`),
  ].join('\n');

  try {
    const client = new Anthropic();
    const msg = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    if (msg.stop_reason === 'refusal') return res.status(502).json({ error: 'The stylist could not answer that one.' });
    const answer = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'The stylist returned an empty answer.' });
    res.status(200).json({ answer });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'The stylist is busy. Try again in a minute.' });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: 'The stylist is unavailable right now.' });
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
