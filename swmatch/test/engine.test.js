const test = require('node:test');
const assert = require('node:assert');
const S = require('../engine.js');

global.window = {};
require('../data/catalog.js');
const CAT = window.SWMATCH_CATALOG;
const shades = CAT.products.flatMap((p) => p.shades.map((s) => Object.assign({}, s, {
  productId: p.id, brand: p.brand, line: p.line, cat: p.cat, origin: p.origin,
  formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff,
})));
const find = (brand, name) => shades.find((s) => s.brand === brand && s.name === name);

test('CIEDE2000 matches the Sharma et al. reference pairs', () => {
  const pairs = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 2.5, 0], [56, -27, -3], 31.903],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
  ];
  for (const [a, b, want] of pairs) assert.ok(Math.abs(S.deltaE2000(a, b) - want) < 1e-3, `${a} ${b}`);
});

test('undertone reading agrees with how the classics are described', () => {
  assert.strictEqual(S.inferUndertone('#9C1F2E', 'lipstick'), 'cool'); // MAC Ruby Woo, blue-red
  assert.strictEqual(S.inferUndertone('#D63A2C', 'lipstick'), 'warm'); // MAC Lady Danger, orange-red
  assert.strictEqual(S.inferUndertone('#B98257', 'foundation'), 'warm'); // MAC NC42, golden
});

test('Rare Beauty Hope gets plausible, cheaper dupes', () => {
  const hope = find('Rare Beauty', 'Hope');
  assert.ok(hope, 'Hope is in the catalog');
  const d = S.findDupes(hope, shades, { limit: 8 });
  assert.ok(d.length >= 3, 'at least three dupes');
  assert.ok(d.every((x) => x.shade.cat === 'blush'), 'only blushes');
  assert.ok(d.every((x) => x.shade.productId !== hope.productId), 'never its own range');
  assert.ok(d[0].score >= 75, `best score ${d[0].score}`);
  assert.ok(d[0].deltaE < 8, `best ΔE ${d[0].deltaE}`);
  const cheaper = S.findDupes(hope, shades, { cheaperOnly: true });
  assert.ok(cheaper.every((x) => x.shade.price < hope.price));
});

test('a shade is its own perfect match', () => {
  const s = find('MAC', 'Ruby Woo');
  const r = S.compare(s, Object.assign({}, s, { productId: 'other' }));
  assert.ok(r.score > 99, String(r.score));
});

test('big colour misses are capped no matter how well the rest matches', () => {
  const red = find('MAC', 'Ruby Woo'), nude = find('MAC', 'Honey Love');
  const r = S.compare(red, Object.assign({}, nude, { productId: 'other' }));
  assert.ok(r.score <= 60, String(r.score));
});

test('community pairings are a bonus, never a penalty', () => {
  const a = find('MAC', 'Ruby Woo'), b = Object.assign({}, find('MAC', 'Russian Red'), { productId: 'x' });
  const plain = S.compare(a, b).score;
  const cited = S.compare(a, b, { community: () => ({ source: 'test' }) }).score;
  assert.ok(cited >= plain);
});

test('plain-language search understands colour, finish, budget and origin', () => {
  const p = S.parseQuery('warm nude matte lipstick under ₹800 from an Indian brand');
  assert.deepStrictEqual([p.cat, p.colour, p.finish, p.undertone, p.maxPrice, p.origin], ['lipstick', 'nude', 'matte', 'warm', 800, 'IN']);
  const r = S.search('warm nude matte lipstick under ₹800', shades, 10).results;
  assert.ok(r.length > 0 && r.every((x) => x.shade.cat === 'lipstick' && (!x.shade.price || x.shade.price <= 800)));
});

test('named shades are found inside a question', () => {
  assert.strictEqual(S.findNamedShade('what is a dupe for rare beauty hope?', shades).name, 'Hope');
  assert.strictEqual(S.findNamedShade('mac ruby woo but cheaper', shades).name, 'Ruby Woo');
});

test('every catalog shade has the fields the engine needs', () => {
  for (const s of shades.filter((x) => !S.SKIN.has(x.cat))) {
    assert.match(s.hex, /^#[0-9A-F]{6}$/i, s.id);
    assert.ok(['warm', 'cool', 'neutral', 'olive'].includes(s.undertone), s.id);
    assert.ok(S.FINISH[s.finish], `${s.id} finish ${s.finish}`);
    assert.ok(s.payoff >= 1 && s.payoff <= 5, s.id);
  }
});

test('dupe tiers need a close colour, not just a high score', () => {
  assert.strictEqual(S.verdict(92, 1.8).label, 'Dupe');
  assert.strictEqual(S.verdict(92, 4).label, 'Very similar');
  assert.strictEqual(S.verdict(74, 6).label, 'Similar');
});

test('direction words describe how the dupe differs', () => {
  const src = { cat: 'lipstick', hex: '#B9776F', finish: 'matte', payoff: 4 };
  const deeper = { cat: 'lipstick', hex: '#9E5E57', finish: 'shimmer', payoff: 2, hexSource: 'retailer' };
  const r = S.compare(src, deeper);
  assert.ok(r.direction.includes('Darker'), r.direction.join());
  assert.ok(r.direction.includes('More shimmer'), r.direction.join());
  assert.ok(r.direction.includes('Sheerer'), r.direction.join());
});

test('ingredient overlap favours shared key ingredients early in the list', () => {
  const a = ['Water', 'Niacinamide', 'Glycerin', 'Zinc PCA'];
  assert.strictEqual(S.ingredientSimilarity(a, a), 100);
  assert.ok(S.ingredientSimilarity(a, ['Aqua', 'Niacinamide', 'Zinc PCA']) > S.ingredientSimilarity(a, ['Aqua', 'Glycerin', 'Panthenol']));
  assert.strictEqual(S.ingredientSimilarity(a, null), null);
});

test('confirmed votes lift a dupe and rejected ones sink it', () => {
  const a = find('MAC', 'Ruby Woo'), b = Object.assign({}, find('MAC', 'Russian Red'), { productId: 'x' });
  const base = S.compare(a, b).score;
  assert.ok(S.compare(a, b, { votes: () => ({ up: 5, down: 0 }) }).score > base);
  assert.ok(S.compare(a, b, { votes: () => ({ up: 0, down: 5 }) }).score < base);
  assert.strictEqual(S.compare(a, b, { votes: () => ({ up: 1, down: 0 }) }).score, base, 'one vote is not enough');
});

test('price per gram compares different pack sizes fairly', () => {
  assert.deepStrictEqual(S.unitPrice({ price: 700, size: '3.5 g' }), { value: 200, unit: 'g' });
  assert.strictEqual(S.unitPrice({ price: 700 }), null);
});

test('low-confidence colours are flagged', () => {
  assert.strictEqual(S.confidence({ hexSource: 'retailer' }, { hexSource: 'image' }).level, 'low');
  assert.strictEqual(S.confidence({ hexSource: 'retailer' }, { hexSource: 'retailer' }).level, 'high');
});

test('skincare entries carry ingredient lists', () => {
  const skin = shades.filter((x) => S.SKIN.has(x.cat));
  assert.ok(skin.length >= 40);
  for (const s of skin) assert.ok(s.ingredients.length >= 5, s.id);
});

test('a colour search is not mistaken for a shade name', () => {
  const pool = [{ brand: 'Elle18', name: '02 Pink', cat: 'blush' }, { brand: 'MAC', name: 'Candy Yum-Yum', cat: 'lipstick' }];
  assert.strictEqual(S.findNamedShade('hot pink lipstick under ₹500', pool), null);
  assert.strictEqual(S.findNamedShade('candy yum yum', pool).name, 'Candy Yum-Yum');
});

test('bright lip colours get their own families', () => {
  assert.strictEqual(S.colourFamily('#E5236F', 'lipstick'), 'fuchsia'); // MAC Candy Yum-Yum
  assert.strictEqual(S.colourFamily('#5E3586', 'lipstick'), 'purple'); // MAC Heroine
});
