// Merges the Purplle pull and the hand-compiled ranges into data/catalog.js,
// filling in what the matcher needs: formula, finish, payoff and undertone.
//
//   node scripts/build-catalog.js
const fs = require('fs');
const path = require('path');
const S = require('../engine.js');

const root = path.join(__dirname, '..');
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); } catch (e) { return null; } };
const raw = read('data/purplle-raw.json') || { products: [] };
const curated = read('data/curated.json');

// Brands that are Indian-owned or started in India.
const INDIAN = /^(iba|tnw|the natural wash|mattlook|swiss beauty|lakm|sugar|kay beauty|nykaa|swiss beauty|myglamm|manish malhotra|insight|faces canada|colorbar|plum|mamaearth|renee|blue heaven|ny bae|mars|lotus|elle 18|good vibes|recode|just herbs|kiro|earth rhythm|typsy|ruby'?s organics|pilgrim|hilary rhoda|cvb|lakme|biotique|chambor|coloressence|daily life forever52|forever52|matt look|half n half|pac|bella voste|gush|gush beauty|nybae|dot & key|minimalist|sugar pop|kica|swiss|derma co|alps goodness|be bodywise|fae beauty)/i;

// One spelling per brand, whichever source it came from.
const BRAND_CANON = {
  maybelline: 'Maybelline New York', 'maybelline new york': 'Maybelline New York', lakme: 'Lakmé', 'lakmé': 'Lakmé',
  sugar: 'SUGAR', 'sugar cosmetics': 'SUGAR', insight: 'Insight', 'insight cosmetics': 'Insight', mars: 'MARS',
  'faces canada': 'Faces Canada', 'ny bae': 'NY Bae', 'l.a. girl': 'L.A. Girl', kaja: 'KAJA', 'loreal paris': "L'Oréal Paris",
  "l'oreal paris": "L'Oréal Paris", "l'oréal paris": "L'Oréal Paris", 'swiss beauty': 'Swiss Beauty', 'kay beauty': 'Kay Beauty',
  'nykaa cosmetics': 'Nykaa Cosmetics', 'myglamm': 'MyGlamm', 'renee': 'RENEE', 'renee cosmetics': 'RENEE',
};
const canonBrand = (b) => BRAND_CANON[String(b || '').trim().toLowerCase()] || String(b || '').trim();

const slug = (s) => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function lineName(names, shadeNames, brand) {
  // Each variant is "<Brand> <Line> - <Shade>, <size> | marketing copy".
  // Strip the shade, size and brand from each and keep the most common result.
  const b = String(brand || '').toLowerCase();
  const prefixes = [b + ' cosmetics', b + ' new york', b + ' ny', b + ' natural makeup', b, 'maybelline new york', 'maybelline', "l'oreal paris", 'sugar cosmetics', 'faces canada', 'tnw the natural wash', 'daily life forever52'];
  const counts = new Map();
  names.forEach((n, i) => {
    let t = tidy(n).split('|')[0];
    const shade = tidy(shadeNames[i] || '').replace(/\s*\(.*\)\s*$/, '');
    if (shade) {
      const re = new RegExp(shade.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), 'i');
      t = t.replace(re, ' ');
    }
    t = t.replace(/\(.*?\)/g, ' ').replace(/\b\d+(\.\d+)?\s?(gm|g|ml|mg|gms|gram|grams)\b/gi, ' ')
      .replace(/\bfor women\b.*$/i, ' ').replace(/\b(shade|colou?r)\s*[a-z]?\d*\b/gi, ' ')
      .replace(/\s[-–,]\s.*$/, ' ').replace(/[-–,:]+\s*$/, ' ').replace(/\s+\d+\s*$/, ' ').replace(/\s+/g, ' ').trim();
    const lower = t.toLowerCase();
    for (const pre of prefixes) if (pre && lower.startsWith(pre + ' ')) { t = t.slice(pre.length + 1); break; }
    t = t.split(',')[0].replace(/\s+with\s+.*$/i, '').replace(/\s+\b[A-Z]{1,2}\d{1,3}\b.*$/, '');
    t = t.replace(/^(new york|ny)\s+/i, '').replace(/[\s\-–,.]+$/, '').trim();
    if (t.length >= 3) counts.set(t, (counts.get(t) || 0) + 1);
  });
  const best = [...counts.entries()].sort((a, b2) => b2[1] - a[1] || a[0].length - b2[0].length)[0];
  return best ? best[0] : brand;
}

function inferFormula(t, cat) {
  if (/crayon|pencil/.test(t)) return 'crayon';
  if (/mousse/.test(t)) return 'mousse';
  if (/baked/.test(t)) return 'baked';
  if (/\b(stick|foundation stick|blush stick)\b/.test(t)) return 'stick';
  if (/powder|brick|compact|pressed|blusher palette|palette/.test(t)) return 'powder';
  if (/\b(gel|jelly|serum|water|tint|drops|liquid|fluid|lip cream|matte ink|lip paint|cushion)\b/.test(t)) return 'liquid';
  if (/\b(cream|creme|crème|balm)\b/.test(t)) return 'cream';
  return { lipstick: 'bullet', blush: 'powder', foundation: 'liquid', highlighter: 'powder' }[cat];
}

function inferFinish(t, cat, formula) {
  if (/metallic|chrome|foil|molten/.test(t)) return 'metallic';
  if (/glitter|shimmer|sparkle|strobe|pearl/.test(t)) return 'shimmer';
  if (/gloss|glass|vinyl|shine/.test(t)) return 'glossy';
  if (/dewy|juicy|glow|luminous|radiant|illuminat/.test(t)) return cat === 'foundation' ? 'radiant' : cat === 'highlighter' ? 'shimmer' : 'dewy';
  if (/satin|creamy|cream/.test(t) && !/matte/.test(t)) return 'satin';
  if (/soft matte|velvet|powder matte|creamy matte|semi matte|semi-matte|transfer.?proof/.test(t)) return 'soft-matte';
  if (/matte|matt/.test(t)) return 'matte';
  if (/natural|skin.?like|second skin/.test(t)) return 'natural';
  if (cat === 'highlighter') return 'shimmer';
  if (cat === 'foundation') return 'natural';
  if (cat === 'blush') return formula === 'powder' ? 'matte' : 'dewy';
  return formula === 'liquid' || formula === 'crayon' ? 'matte' : 'satin';
}

function inferPayoff(t, cat) {
  if (/full coverage|high coverage|highly pigmented|super pigmented|intense|ultra pigmented|bold|power/.test(t)) return 5;
  if (/sheer|tint|light coverage|lightweight coverage|skin tint|bb |cc /.test(t)) return 2;
  if (/medium coverage|buildable/.test(t)) return cat === 'foundation' ? 3 : 4;
  return cat === 'foundation' ? 3 : 4;
}

function stated(shadeName, cat) {
  const t = shadeName.toLowerCase();
  if (/olive/.test(t)) return 'olive';
  if (/golden|yellow|\bwarm\b|\bw\d|^w\d/.test(t)) return 'warm';
  if (/\bcool\b|\bc\d|^c\d|pink undertone|rosy/.test(t) && cat === 'foundation') return 'cool';
  if (/neutral|\bn\d|^n\d/.test(t) && cat === 'foundation') return 'neutral';
  return null;
}

const tier = (p) => (!p ? 'unknown' : p < 700 ? 'budget' : p <= 1800 ? 'mid' : 'luxe');
const where = (brand, line, shade) => {
  const q = encodeURIComponent(`${brand} ${line} ${shade}`.replace(/\s+/g, ' '));
  const m = slug(`${brand} ${line}`);
  return [
    { store: 'Nykaa', url: `https://www.nykaa.com/search/result/?q=${q}` },
    { store: 'Tira', url: `https://www.tirabeauty.com/search?q=${q}` },
    { store: 'Myntra', url: `https://www.myntra.com/${m}` },
  ];
};

const products = [];
const seen = new Set();

// Kits, palettes and multi-shade sets aren't single shades you can match.
const NOT_A_SHADE = /\b(kit|palette|set of|combo|duo|dual|trio|quad|multicolou?r|\d+\s*in\s*1|pack of|gift)\b/i;
const tidy = (s) => String(s || '').replace(/\u00c2|\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

for (const f of raw.products || []) {
  f.brand = canonBrand(f.brand);
  f.names = f.names.map(tidy);
  if (f.names.some((n) => NOT_A_SHADE.test(n))) continue;
  const line = lineName(f.names, f.shades.map((x) => x.name), f.brand);
  const text = (f.names.join(' ') + ' ' + line).toLowerCase();
  const formula = inferFormula(text, f.category);
  const finish = inferFinish(text, f.category, formula);
  const payoff = inferPayoff(text, f.category);
  const id = slug(`${f.brand}-${line}-${f.category}`);
  if (seen.has(id)) continue;
  seen.add(id);
  const shades = [];
  const names = new Set();
  for (const s of f.shades) {
    const name = tidy(s.name);
    if (!name || NOT_A_SHADE.test(name) || names.has(name.toLowerCase())) continue;
    names.add(name.toLowerCase());
    shades.push({
      id: slug(`${id}-${name}`), name, hex: s.hex, hexSource: s.hexSource,
      undertone: stated(name, f.category) || S.inferUndertone(s.hex, f.category), undertoneSource: stated(name, f.category) ? 'brand' : 'swatch',
      price: s.price || null, mrp: s.mrp || null, rating: s.rating || null, ratingCount: s.ratingCount || 0, inStock: s.inStock,
      where: [{ store: 'Purplle', url: s.url }].concat(where(f.brand, line, name).filter((w) => w.store !== 'Purplle')),
    });
  }
  if (!shades.length) continue;
  products.push({
    id, brand: f.brand, line, cat: f.category, formula, finish, payoff, source: 'purplle',
    origin: INDIAN.test(f.brand || '') ? 'IN' : 'INTL', shades,
  });
}


const firstWord = (b) => canonBrand(b).toLowerCase();
const purplleShadeNames = (brand, cat) => products.filter((p) => p.source === 'purplle' && p.cat === cat && firstWord(p.brand) === firstWord(brand))
  .flatMap((p) => p.shades.map((s) => s.name.toLowerCase()));
for (const c of curated.products) {
  c.brand = canonBrand(c.brand);
  if (c.fallback) {
    // Hand-entered stand-ins for popular shades; drop any Purplle already has.
    const have = purplleShadeNames(c.brand, c.cat);
    c.shades = c.shades.filter(([name]) => !have.some((n) => n.includes(name.toLowerCase())));
    if (!c.shades.length) continue;
  }
  const id = slug(`${c.brand}-${c.line}-${c.cat}`);
  if (seen.has(id)) continue;
  seen.add(id);
  products.push({
    id, brand: c.brand, line: c.line, cat: c.cat, formula: c.formula, finish: c.finish, payoff: c.payoff, source: 'curated',
    origin: c.origin || (INDIAN.test(c.brand) ? 'IN' : 'INTL'), size: c.size,
    shades: c.shades.map(([name, hex, undertone, payoff, finish]) => ({
      id: slug(`${id}-${name}`), name, hex, hexSource: 'curated', undertone, undertoneSource: 'brand', payoff, finish,
      price: c.price, mrp: c.price, rating: null, ratingCount: 0, inStock: true, where: where(c.brand, c.line, name).concat([{ store: 'Purplle', url: `https://www.purplle.com/search?q=${encodeURIComponent(`${c.brand} ${c.line} ${name}`)}` }]),
    })),
  });
}

// Resolve community pairs to shade ids.
function findShade(brand, shade, cat) {
  for (const p of products) {
    if (p.brand !== canonBrand(brand)) continue;
    if (cat && p.cat !== cat) continue;
    const s = p.shades.find((x) => x.name.toLowerCase() === shade.toLowerCase() || x.name.toLowerCase().endsWith(' ' + shade.toLowerCase()));
    if (s) return s.id;
  }
  return null;
}
const community = [];
for (const c of curated.community) {
  if (c.line) {
    const pa = products.find((p) => p.brand === canonBrand(c.a[0]) && p.line === c.a[1]);
    const pb = products.find((p) => p.brand === canonBrand(c.b[0]) && p.line === c.b[1]);
    if (pa && pb) community.push({ lines: [pa.id, pb.id], source: c.source, url: c.url || null });
    continue;
  }
  const a = findShade(c.a[0], c.a[1], c.a[2]), b = findShade(c.b[0], c.b[1], c.b[2]);
  if (a && b) community.push({ shades: [a, b], source: c.source, url: c.url || null });
  else console.warn('community pair not found:', c.a.join(' / '), '<>', c.b.join(' / '));
}

products.sort((a, b) => a.cat.localeCompare(b.cat) || a.brand.localeCompare(b.brand) || a.line.localeCompare(b.line));
const out = {
  builtAt: new Date().toISOString().slice(0, 10),
  sources: { purplle: raw.fetchedAt || null, curated: curated.note },
  products, community,
};
const counts = {};
for (const p of products) counts[p.cat] = (counts[p.cat] || 0) + p.shades.length;
fs.writeFileSync(path.join(root, 'data/catalog.js'), '// Generated by scripts/build-catalog.js. Edit the inputs, not this file.\nwindow.SWMATCH_CATALOG = ' + JSON.stringify(out) + ';\n');
console.log(`${products.length} products, ${Object.values(counts).reduce((a, b) => a + b, 0)} shades`, counts, `${community.length} community pairs`);
