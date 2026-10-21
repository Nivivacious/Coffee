// swmatch matching engine. Pure functions, no DOM: runs in the browser and in Node tests.
//
// A dupe is scored on eight criteria, each 0-100, then blended with weights
// that depend on the category (undertone and depth matter most for
// foundation, finish matters most for highlighter):
//
//   colour      CIEDE2000 distance between the two swatches
//   undertone   warm / cool / neutral / olive compatibility
//   depth       lightness (L*) gap, which is how a shade reads on Indian skin
//   intensity   chroma gap: how vivid or muted the shade is
//   finish      matte → satin → dewy → shimmer → metallic
//   payoff      pigmentation (or coverage, for foundation)
//   formula     bullet, crayon, liquid, cream, powder, stick...
//   community   bonus when dupe sites and reviewers already pair them
(function (root) {
  'use strict';

  // ---- colour science -------------------------------------------------------

  function hexToRgb(hex) {
    const h = String(hex).replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }

  function rgbToLab([r, g, b]) {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
    const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [fx, fy, fz] = [f(X), f(Y), f(Z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }

  const lab = (hex) => rgbToLab(hexToRgb(hex));
  const chroma = ([, a, b]) => Math.hypot(a, b);
  const hue = ([, a, b]) => { const h = (Math.atan2(b, a) * 180) / Math.PI; return h < 0 ? h + 360 : h; };

  // CIEDE2000, after Sharma, Wu & Dalal (2005).
  function deltaE2000(l1, l2) {
    const [L1, a1, b1] = l1, [L2, a2, b2] = l2;
    const rad = Math.PI / 180, deg = 180 / Math.PI;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
    const Cm = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
    const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    const h = (b, a) => { if (b === 0 && a === 0) return 0; const x = Math.atan2(b, a) * deg; return x < 0 ? x + 360 : x; };
    const h1p = h(b1, a1p), h2p = h(b2, a2p);
    const dLp = L2 - L1, dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
      dhp = h2p - h1p;
      if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
    const Lpm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
    let hpm = h1p + h2p;
    if (C1p * C2p !== 0) {
      if (Math.abs(h1p - h2p) > 180) hpm += h1p + h2p < 360 ? 360 : -360;
      hpm /= 2;
    }
    const T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad)
      + 0.32 * Math.cos((3 * hpm + 6) * rad) - 0.2 * Math.cos((4 * hpm - 63) * rad);
    const dTheta = 30 * Math.exp(-Math.pow((hpm - 275) / 25, 2));
    const Rc = 2 * Math.sqrt(Math.pow(Cpm, 7) / (Math.pow(Cpm, 7) + Math.pow(25, 7)));
    const Sl = 1 + (0.015 * Math.pow(Lpm - 50, 2)) / Math.sqrt(20 + Math.pow(Lpm - 50, 2));
    const Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T;
    const Rt = -Math.sin(2 * dTheta * rad) * Rc;
    return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
  }

  // ---- reading a shade ---------------------------------------------------------

  // Undertone from the swatch itself, used when the brand doesn't state one.
  // Lip and cheek colours: bluer reds/pinks read cool, orange/brown/peach read warm.
  // Complexion colours: pinker beige reads cool, golden reads warm, low-chroma
  // greenish-gold reads olive (common in Indian skin).
  function inferUndertone(hex, cat) {
    const L = lab(hex), h = hue(L), C = chroma(L);
    if (cat === 'foundation') {
      if (h > 72 && C < 30 && L[1] < 11) return 'olive';
      if (h >= 62.5) return 'warm';
      if (h <= 57) return 'cool';
      return 'neutral';
    }
    if (cat === 'highlighter') {
      if (h >= 68) return 'warm';
      if (h <= 50) return 'cool';
      return 'neutral';
    }
    if (C < 12) return 'neutral';
    if (h < 27 || h > 330) return 'cool';
    if (h < 34) return 'neutral';
    return 'warm';
  }

  // Indian complexion vocabulary for depth, from L*.
  function depthLabel(hex) {
    const L = lab(hex)[0];
    if (L >= 82) return 'Fair';
    if (L >= 74) return 'Light';
    if (L >= 66) return 'Wheatish';
    if (L >= 57) return 'Medium-tan';
    if (L >= 46) return 'Dusky';
    return 'Deep';
  }

  // Plain colour family, used for search ("peachy", "mauve") and labels.
  function colourFamily(hex, cat) {
    const L = lab(hex), h = hue(L), C = chroma(L), Lv = L[0];
    if (cat === 'foundation') return depthLabel(hex);
    if (cat === 'highlighter') {
      if (h >= 75 && C > 25) return 'gold';
      if (h >= 68) return Lv > 80 ? 'champagne' : 'bronze';
      if (h <= 45) return 'pink pearl';
      return Lv > 78 ? 'pearl' : 'rose gold';
    }
    if (Lv < 30) return h < 20 || h > 330 ? 'plum' : 'deep brown';
    if (C < 18) return Lv > 55 ? 'nude' : 'brown';
    if (h < 8 || h > 330) return Lv < 45 ? 'berry' : 'pink';
    if (h < 22) return Lv < 42 ? 'berry' : C > 45 ? 'red' : Lv > 60 ? 'pink' : 'mauve';
    if (h < 35) return C > 48 ? 'red' : Lv > 62 ? 'pink' : Lv > 48 ? 'rose' : 'mauve';
    if (h < 48) return C > 50 ? (Lv > 55 ? 'coral' : 'red') : Lv > 60 ? 'peach' : 'nude';
    if (h < 65) return C > 40 ? (Lv > 55 ? 'peach' : 'orange') : Lv > 50 ? 'nude' : 'brown';
    return Lv > 55 ? 'nude' : 'brown';
  }

  // ---- criteria ----------------------------------------------------------------------

  const clamp = (x) => Math.max(0, Math.min(100, x));

  const UNDERTONE = {
    warm: { warm: 100, neutral: 65, olive: 70, cool: 15 },
    cool: { cool: 100, neutral: 65, olive: 30, warm: 15 },
    neutral: { neutral: 100, warm: 65, cool: 65, olive: 60 },
    olive: { olive: 100, warm: 70, neutral: 60, cool: 30 },
  };

  // Finish on two axes: sheen (flat → wet) and sparkle (none → foil).
  const FINISH = {
    matte: [0, 0], 'soft-matte': [1, 0], natural: [2, 0], satin: [2.5, 0], cream: [2.5, 0],
    radiant: [3.4, 0.3], dewy: [4, 0], glossy: [5, 0], shimmer: [3.5, 1], metallic: [4.5, 1.5],
  };

  const FORMULA_FAMILY = {
    bullet: 'solid', crayon: 'solid', stick: 'solid',
    liquid: 'fluid', gel: 'fluid', mousse: 'fluid',
    cream: 'cream', balm: 'cream',
    powder: 'powder', baked: 'powder',
  };
  const FORMULA_NEAR = {
    'solid|cream': 70, 'fluid|cream': 75, 'solid|fluid': 55, 'powder|cream': 35, 'powder|fluid': 30, 'powder|solid': 35,
  };

  function formulaScore(a, b) {
    if (a === b) return 100;
    const fa = FORMULA_FAMILY[a] || a, fb = FORMULA_FAMILY[b] || b;
    if (fa === fb) return 85;
    return FORMULA_NEAR[`${fa}|${fb}`] || FORMULA_NEAR[`${fb}|${fa}`] || 30;
  }

  function finishScore(a, b) {
    const pa = FINISH[a] || FINISH.satin, pb = FINISH[b] || FINISH.satin;
    return clamp(100 - Math.hypot(pa[0] - pb[0], (pa[1] - pb[1]) * 1.6) * 22);
  }

  // Default weights per category. Users can retune these in the page.
  const WEIGHTS = {
    lipstick: { colour: 34, undertone: 14, depth: 10, intensity: 8, finish: 12, payoff: 8, formula: 9, community: 5 },
    blush: { colour: 30, undertone: 14, depth: 10, intensity: 10, finish: 14, payoff: 10, formula: 7, community: 5 },
    foundation: { colour: 18, undertone: 24, depth: 24, intensity: 4, finish: 10, payoff: 10, formula: 5, community: 5 },
    highlighter: { colour: 24, undertone: 14, depth: 10, intensity: 6, finish: 24, payoff: 12, formula: 5, community: 5 },
  };

  const CRITERIA = [
    ['colour', 'Colour'], ['undertone', 'Undertone'], ['depth', 'Depth'], ['intensity', 'Intensity'],
    ['finish', 'Finish'], ['payoff', 'Payoff'], ['formula', 'Formula'], ['community', 'Community'],
  ];

  // How much a shade's colour data can be trusted. Retailer hex codes and
  // curated swatches score full; colours read off a product photo are noisier.
  const TRUST = { retailer: 1, curated: 1, image: 0.85 };

  function prepare(shade) {
    if (!shade._lab) shade._lab = lab(shade.hex);
    return shade._lab;
  }

  function compare(src, cand, opts) {
    const o = opts || {};
    const L1 = prepare(src), L2 = prepare(cand);
    const dE = deltaE2000(L1, L2);
    const dL = L2[0] - L1[0];
    const dC = chroma(L2) - chroma(L1);
    let dh = hue(L2) - hue(L1);
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;

    const s = {
      colour: clamp(100 - dE * 5.5) * (TRUST[cand.hexSource] || 1),
      undertone: (UNDERTONE[src.undertone] || UNDERTONE.neutral)[cand.undertone] ?? 60,
      depth: clamp(100 - Math.abs(dL) * (src.cat === 'foundation' ? 9 : 5)),
      intensity: clamp(100 - Math.abs(dC) * 3.2),
      finish: finishScore(src.finish, cand.finish),
      payoff: clamp(100 - Math.abs((cand.payoff || 3) - (src.payoff || 3)) * 28),
      formula: formulaScore(src.formula, cand.formula),
      community: 0,
    };
    const cited = o.community && o.community(src, cand);
    if (cited) s.community = 100;

    const w = Object.assign({}, WEIGHTS[src.cat] || WEIGHTS.lipstick, o.weights || {});
    // Community is a bonus, never a penalty: it only counts when present.
    let total = 0, sum = 0;
    for (const [k] of CRITERIA) {
      if (k === 'community') continue;
      total += s[k] * (w[k] || 0); sum += (w[k] || 0);
    }
    let score = sum ? total / sum : 0;
    if (cited) score = Math.min(100, score + (w.community || 0) * 0.6);
    // A big colour miss can't be rescued by matching packaging and finish.
    if (dE > 14) score = Math.min(score, 60);

    return { score: Math.round(score * 10) / 10, scores: s, deltaE: dE, dL, dC, dh, cited: cited || null };
  }

  function verdict(score) {
    if (score >= 90) return { key: 'twin', label: 'Twin' };
    if (score >= 82) return { key: 'close', label: 'Close dupe' };
    if (score >= 72) return { key: 'near', label: 'Near match' };
    return { key: 'vibe', label: 'Same family' };
  }

  // Plain-language notes about how a dupe differs, written the way a friend
  // at the counter would say it.
  function explain(src, cand, r, skin) {
    const notes = [];
    const dE = r.deltaE;
    if (dE < 2) notes.push(`Practically identical on swatch (ΔE ${dE.toFixed(1)}).`);
    else if (dE < 4) notes.push(`Very close; you'd only spot it side by side (ΔE ${dE.toFixed(1)}).`);
    else if (dE < 8) notes.push(`Same family, visibly different up close (ΔE ${dE.toFixed(1)}).`);
    else notes.push(`A different shade in the same direction (ΔE ${dE.toFixed(1)}).`);

    const tone = [];
    if (Math.abs(r.dL) >= 2.5) tone.push(r.dL > 0 ? 'lighter' : 'deeper');
    if (Math.abs(r.dh) >= 4 && src.cat !== 'foundation') tone.push(r.dh > 0 ? 'warmer' : 'cooler');
    if (Math.abs(r.dh) >= 3 && src.cat === 'foundation') tone.push(r.dh > 0 ? 'more golden' : 'pinker');
    if (Math.abs(r.dC) >= 5) tone.push(r.dC > 0 ? 'brighter' : 'more muted');
    if (tone.length) notes.push(`A touch ${tone.join(', ')}.`);

    if (src.undertone !== cand.undertone) notes.push(`Undertone shifts from ${src.undertone} to ${cand.undertone}.`);
    if (src.finish !== cand.finish) {
      const bridge = {
        'dewy>matte': 'tap a little balm or glow drops on top to get the dewy look back',
        'matte>dewy': 'set it with a dusting of powder if you want it flatter',
        'satin>matte': 'dab a clear balm in the centre for the satin sheen',
        'shimmer>matte': 'it won\'t give the same sparkle',
      }[`${src.finish}>${cand.finish}`];
      notes.push(`Finish is ${cand.finish} instead of ${src.finish}${bridge ? `; ${bridge}` : ''}.`);
    }
    const dp = (cand.payoff || 3) - (src.payoff || 3);
    if (dp <= -1) notes.push(src.cat === 'foundation' ? 'Lighter coverage; build a second layer where you need it.' : 'Less pigmented; build it up in two layers.');
    if (dp >= 1) notes.push(src.cat === 'foundation' ? 'Heavier coverage; use less.' : 'More pigmented; start with a lighter hand.');
    if (src.formula !== cand.formula) notes.push(`Comes as a ${cand.formula} rather than a ${src.formula}.`);

    if (skin && src.cat !== 'foundation') {
      const sk = { fair: 82, light: 74, wheatish: 66, dusky: 52, deep: 40 }[skin];
      const Lc = prepare(cand)[0];
      if (sk && Lc - sk > 2 && (src.cat === 'lipstick')) notes.push('On your skin tone this can read a little pale; a liner one shade deeper helps.');
      if (sk && src.cat === 'blush' && Lc > sk + 6 && sk < 60) notes.push('Light shades can look chalky on deeper skin; apply sheer and blend out.');
    }
    if (r.cited) notes.push(`Also paired by ${r.cited.source}.`);
    return notes;
  }

  function findDupes(src, pool, opts) {
    const o = Object.assign({ limit: 12, minScore: 55 }, opts);
    const out = [];
    for (const c of pool) {
      if (c.cat !== src.cat || c.productId === src.productId) continue;
      if (o.maxPrice && c.price && c.price > o.maxPrice) continue;
      if (o.cheaperOnly && src.price && c.price && c.price >= src.price) continue;
      if (o.origin && o.origin !== 'all' && c.origin !== o.origin) continue;
      const r = compare(src, c, o);
      if (r.score < o.minScore) continue;
      out.push(Object.assign({ shade: c }, r));
    }
    out.sort((a, b) => b.score - a.score || (a.shade.price || 1e9) - (b.shade.price || 1e9));
    // Keep at most two shades of the same product so one range can't crowd the list.
    const perProduct = {}, list = [];
    for (const r of out) {
      const k = r.shade.productId;
      perProduct[k] = (perProduct[k] || 0) + 1;
      if (perProduct[k] <= 2) list.push(r);
      if (list.length >= o.limit) break;
    }
    return list;
  }

  // ---- plain-language search ---------------------------------------------------

  const COLOUR_WORDS = {
    nude: '#B98274', 'brown nude': '#9A6551', mauve: '#A8676F', rose: '#C27078', pink: '#E38AA0', 'baby pink': '#EBA8B4',
    berry: '#8E3550', wine: '#6E2735', plum: '#6E2A40', red: '#B0202C', 'blue red': '#9C1F2E', 'orange red': '#C9372A',
    brick: '#9C4535', coral: '#E8735E', peach: '#F0A080', orange: '#D9622F', brown: '#86503E', chocolate: '#5E2A2B',
    terracotta: '#B5603E', fuchsia: '#C2246E', magenta: '#B0236A',
    gold: '#E0BE73', champagne: '#EBD3B4', bronze: '#B8865A', 'rose gold': '#E8B8A2', pearl: '#F0DED6',
  };
  const CAT_WORDS = {
    lipstick: /\b(lip|lips|lipstick|lipsticks|lip colou?r|crayon)\b/,
    blush: /\b(blush|blusher|cheek)\b/,
    foundation: /\b(foundation|base|complexion)\b/,
    highlighter: /\b(highlight|highlighter|illuminator|glow powder|strobe)\b/,
  };
  const FINISH_WORDS = { matte: /\bmatte\b/, dewy: /\bdewy\b/, satin: /\bsatin\b/, shimmer: /\bshimmer|sparkl/, metallic: /\bmetallic|chrome|foil/, glossy: /\bgloss/ };
  const SKIN_WORDS = { fair: /\bfair\b/, light: /\blight skin|light\b/, wheatish: /\bwheatish|medium\b/, dusky: /\bdusky|tan|brown skin\b/, deep: /\bdeep|dark\b/ };

  function parseQuery(q) {
    const t = ' ' + String(q || '').toLowerCase() + ' ';
    const out = {};
    for (const [k, re] of Object.entries(CAT_WORDS)) if (re.test(t)) { out.cat = k; break; }
    for (const [k, re] of Object.entries(FINISH_WORDS)) if (re.test(t)) { out.finish = k; break; }
    const words = Object.keys(COLOUR_WORDS).sort((a, b) => b.length - a.length);
    for (const w of words) if (t.includes(' ' + w) || t.includes(w + 'y ') || t.includes(w + 'ish')) { out.colour = w; break; }
    if (/\bwarm\b|golden|yellow undertone/.test(t)) out.undertone = 'warm';
    else if (/\bcool\b|pink undertone|blue undertone/.test(t)) out.undertone = 'cool';
    else if (/\bolive\b/.test(t)) out.undertone = 'olive';
    else if (/\bneutral\b/.test(t)) out.undertone = 'neutral';
    const price = t.match(/(?:under|below|less than|within|<)\s*(?:rs\.?|₹|inr)?\s*([0-9][0-9,]*)/);
    if (price) out.maxPrice = Number(price[1].replace(/,/g, ''));
    if (/\b(indian|desi|homegrown|made in india)\b/.test(t)) out.origin = 'IN';
    if (/\b(international|imported|global)\b/.test(t)) out.origin = 'INTL';
    if (/\b(dupe|alternative|similar|like|instead of|match)\b/.test(t)) out.wantsDupe = true;
    for (const [k, re] of Object.entries(SKIN_WORDS)) if (re.test(t) && /skin|tone|complexion/.test(t)) { out.skin = k; break; }
    return out;
  }

  // Finds a named shade in free text ("dupe for rare beauty hope").
  function findNamedShade(q, pool) {
    const t = String(q || '').toLowerCase();
    let best = null, bestScore = 0;
    for (const s of pool) {
      const shade = s.name.toLowerCase().replace(/^[0-9]+\s*/, '').replace(/\s*\(.*\)$/, '').trim();
      if (shade.length < 3) continue;
      const re = new RegExp(`\\b${shade.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!re.test(t)) continue;
      const brand = s.brand.toLowerCase();
      let score = shade.length;
      if (t.includes(brand) || brand.split(/\s+/).some((w) => w.length > 3 && t.includes(w))) score += 20;
      if (CAT_WORDS[s.cat] && CAT_WORDS[s.cat].test(' ' + t + ' ')) score += 5;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return bestScore >= 8 ? best : null;
  }

  function search(q, pool, limit) {
    const p = parseQuery(q);
    const target = p.colour ? lab(COLOUR_WORDS[p.colour]) : null;
    const res = [];
    for (const s of pool) {
      if (p.cat && s.cat !== p.cat) continue;
      if (p.maxPrice && s.price && s.price > p.maxPrice) continue;
      if (p.origin && s.origin !== p.origin) continue;
      let score = 50;
      if (target) score = clamp(100 - deltaE2000(target, prepare(s)) * 3.5);
      if (p.finish) score += s.finish === p.finish ? 15 : -10;
      if (p.undertone) score += s.undertone === p.undertone ? 12 : -6;
      if (p.skin && s.cat === 'foundation') score += depthLabel(s.hex).toLowerCase().startsWith(p.skin.slice(0, 4)) ? 20 : -10;
      score += Math.min(8, (s.rating || 0) * (Math.log10((s.ratingCount || 0) + 1)));
      res.push({ shade: s, score });
    }
    res.sort((a, b) => b.score - a.score);
    return { parsed: p, results: res.slice(0, limit || 12) };
  }

  const api = {
    hexToRgb, rgbToLab, lab, chroma, hue, deltaE2000, inferUndertone, depthLabel, colourFamily,
    compare, findDupes, explain, verdict, parseQuery, search, findNamedShade, WEIGHTS, CRITERIA, FINISH,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Swmatch = api;
})(typeof self !== 'undefined' ? self : this);
