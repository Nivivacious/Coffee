// Prints where swmatch ranks each published dupe pair (community bonus off).
//   node scripts/benchmark.js
const S = require('../engine.js');
global.window = {};
require('../data/catalog.js');
const B = require('../data/benchmarks.json');
const shades = window.SWMATCH_CATALOG.products.flatMap((p) => p.shades.map((s) => Object.assign({}, s, {
  productId: p.id, brand: p.brand, line: p.line, cat: p.cat, origin: p.origin, source: p.source,
  formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff, size: s.size || p.size,
})));
const find = (cat, [brand, name]) => shades.find((s) => s.cat === cat && s.brand === brand && (s.name.toLowerCase() === name.toLowerCase() || s.name.toLowerCase().endsWith(' ' + name.toLowerCase())));

function rankOf(pair) {
  const src = find(pair.cat, pair.src), dupe = find(pair.cat, pair.dupe);
  if (!src || !dupe) return { missing: !src ? pair.src.join(' ') : pair.dupe.join(' ') };
  const list = S.findDupes(src, shades, { limit: 2000, minScore: 0, perProduct: Infinity });
  const i = list.findIndex((d) => d.shade.id === dupe.id);
  // Pass = labelled at least "Similar" and inside the top N, where N is the pair's
  // own bar or the top 10% of the category, whichever is larger.
  const allowed = Math.max(pair.rank, Math.ceil(list.length * 0.1));
  const score = i >= 0 ? list[i].score : null;
  return { rank: i + 1, score, allowed, pool: list.length, pass: i >= 0 && i + 1 <= allowed && S.verdict(score, 0, pair.cat).key !== 'vibe', top: list.slice(0, 3).map((d) => `${d.shade.brand} ${d.shade.name} ${d.score}`) };
}
module.exports = { rankOf, pairs: B.pairs };
if (require.main === module) {
  for (const p of B.pairs) {
    const r = rankOf(p);
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${p.src.join(' ')} -> ${p.dupe.join(' ')}: ${r.missing ? 'missing ' + r.missing : `#${r.rank} of ${r.pool} (${r.score}%), needs top ${r.allowed} and Similar+`}`);
    if (!r.pass && r.top) console.log('      top:', r.top.join(' | '));
  }
}
