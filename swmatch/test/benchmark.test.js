// Published dupe pairs (data/benchmarks.json): swmatch has to find each one
// on its own, with the "dupe sites agree" bonus switched off.
const test = require('node:test');
const assert = require('node:assert');
const { rankOf, pairs } = require('../scripts/benchmark.js');
const S = require('../engine.js');

for (const p of pairs) {
  test(`${p.src.join(' ')} -> ${p.dupe.join(' ')} (${p.source})`, () => {
    const r = rankOf(p);
    assert.ok(!r.missing, `not in catalog: ${r.missing}`);
    if (p.knownIssue) {
      // Data problem, documented in benchmarks.json: still has to read as Similar.
      assert.notStrictEqual(S.verdict(r.score, 0, p.cat).key, 'vibe', `${r.score}%`);
      return;
    }
    assert.ok(r.pass, `#${r.rank} of ${r.pool} at ${r.score}%, needed top ${r.allowed}`);
  });
}
