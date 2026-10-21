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
  function deltaE2000(l1, l2, kL = 1, kC = 1, kH = 1) {
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
    const l = dLp / (kL * Sl), c = dCp / (kC * Sc), hh = dHp / (kH * Sh);
    return Math.sqrt(l * l + c * c + hh * hh + Rt * c * hh);
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
    lipstick: { colour: 34, undertone: 14, depth: 10, intensity: 8, finish: 12, payoff: 8, formula: 9, ingredients: 8, community: 5 },
    blush: { colour: 30, undertone: 14, depth: 10, intensity: 10, finish: 14, payoff: 10, formula: 7, ingredients: 8, community: 5 },
    foundation: { colour: 18, undertone: 24, depth: 24, intensity: 4, finish: 10, payoff: 10, formula: 5, ingredients: 8, community: 5 },
    highlighter: { colour: 24, undertone: 14, depth: 10, intensity: 6, finish: 24, payoff: 12, formula: 5, ingredients: 8, community: 5 },
  };

  const CRITERIA = [
    ['colour', 'Colour'], ['undertone', 'Undertone'], ['depth', 'Depth'], ['intensity', 'Intensity'],
    ['finish', 'Finish'], ['payoff', 'Payoff'], ['formula', 'Formula'], ['ingredients', 'Ingredients'], ['community', 'Community'],
  ];

  // How much a shade's colour data can be trusted. Retailer hex codes and
  // curated swatches score full; colours read off a product photo are noisier.
  const TRUST = { retailer: 1, curated: 1, image: 0.85 };

  // Ingredient overlap, for when both products have an INCI list. Lists are
  // ordered by amount, so early ingredients weigh more; filler like water
  // and common preservatives count for little.
  const FILLER = /^(aqua|water|eau|glycerin|butylene glycol|propylene glycol|phenoxyethanol|ethylhexylglycerin|tocopherol|silica|mica|talc|parfum|fragrance|ci \d+|iron oxides?|titanium dioxide)$/;
  const normIng = (x) => String(x).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^aqua$|^eau$/, 'water');
  function ingredientSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return null;
    const weigh = (list) => {
      const m = new Map();
      // Past roughly the 15th ingredient most things are under 1% (the "1% line"),
      // so the tail counts for a fifth as much.
      list.map(normIng).filter(Boolean).forEach((x, i) => { if (!m.has(x)) m.set(x, (FILLER.test(x) ? 0.25 : 1) * (i < 15 ? 1 : 0.2) / Math.sqrt(i + 1)); });
      return m;
    };
    const A = weigh(a), B = weigh(b);
    // Half weighted Jaccard (shared weight over all weight), half coverage:
    // how much of the original's formula, weighted by position, the dupe contains.
    let min = 0, max = 0, covered = 0, own = 0;
    for (const k of new Set([...A.keys(), ...B.keys()])) {
      const x = A.get(k) || 0, y = B.get(k) || 0;
      min += Math.min(x, y); max += Math.max(x, y);
      own += x; if (x && y) covered += x;
    }
    if (!max) return null;
    return clamp(((min / max) * 0.5 + (covered / own) * 0.5) * 100);
  }

  // What a formula does, from its ingredients (Skinsort's "benefits"):
  // each ingredient adds its position weight to the jobs it does.
  const FUNCS = {
    humectant: /glycerin|hyaluron|butylene glycol|propanediol|panthenol|sodium pca|urea|betaine$|trehalose|aloe|sorbitol|pentylene glycol|honey|snail|glycereth|polyglutamic/,
    emollient: /squalane|caprylic|triglyceride|oil\b|butter|cetyl|cetearyl|stearyl alcohol|isononyl|palmitate|shea|jojoba|isopropyl|coco caprylate/,
    occlusive: /petrolatum|lanolin|wax|mineral oil|paraffin/,
    silicone: /dimethicone|siloxane|methicone|dimethiconol/,
    barrier: /ceramide|cholesterol|phytosphingosine|sphingo|linoleic|fatty acid/,
    soothing: /allantoin|centella|madecassoside|asiaticoside|bisabolol|oat|avena|glycyrrhiza|licorice|panthenol|green tea|camellia sinensis|sepicalm|beta glucan|chamomile|aloe|propolis|calendula/,
    antioxidant: /tocopher|ascorb|ferulic|resveratrol|camellia sinensis|ubiquinone|propolis|vitis|astaxanthin|carnosine/,
    brightening: /niacinamide|arbutin|ascorb|tranexamic|kojic|glycyrrhiza|licorice|azelaic/,
    exfoliant: /salicylic|glycolic|lactic acid|mandelic|gluconolactone|betaine salicylate|willow bark|polyhydroxy/,
    retinoid: /retin|bakuchiol/,
    peptide: /peptide|palmitoyl/,
    ferment: /ferment|lactobacillus|bifida|saccharomyces|galactomyces/,
    oilcontrol: /zinc pca|zinc gluconate|niacinamide|silica|kaolin|clay/,
  };
  function functionProfile(list) {
    const v = {};
    list.map(normIng).forEach((x, i) => {
      const w = 1 / Math.sqrt(i + 1);
      for (const [f, re] of Object.entries(FUNCS)) if (re.test(x)) v[f] = (v[f] || 0) + w;
    });
    return v;
  }
  function functionSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return null;
    const A = functionProfile(a), B = functionProfile(b);
    let dot = 0, na = 0, nb = 0;
    for (const f of Object.keys(FUNCS)) { const x = A[f] || 0, y = B[f] || 0; dot += x * y; na += x * x; nb += y * y; }
    return na && nb ? clamp((dot / Math.sqrt(na * nb)) * 100) : null;
  }

  function prepare(shade) {
    if (!shade._lab) shade._lab = lab(shade.hex);
    return shade._lab;
  }

  function compare(src, cand, opts) {
    const o = opts || {};
    const L1 = prepare(src), L2 = prepare(cand);
    // Swatch colours come from retailer chips and photos, and those disagree on
    // lightness by up to 10-20 L* and on saturation by ~20% for the same shade,
    // while hue holds within a few degrees. So for colour products, lightness
    // and chroma count for less (CIEDE2000's kL/kC factors). Foundation keeps
    // strict depth: there, depth is the whole point.
    const loose = src.cat !== 'foundation';
    const dE = deltaE2000(L1, L2);
    const dEmatch = loose ? deltaE2000(L1, L2, 2, 1.5, 1) : dE;
    const dL = L2[0] - L1[0];
    const dC = chroma(L2) - chroma(L1);
    let dh = hue(L2) - hue(L1);
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;

    const s = {
      colour: clamp(100 - dEmatch * 5.5) * (TRUST[cand.hexSource] || 1),
      undertone: (UNDERTONE[src.undertone] || UNDERTONE.neutral)[cand.undertone] ?? 60,
      depth: clamp(100 - Math.abs(dL) * (loose ? 2.5 : 9)),
      intensity: clamp(100 - Math.abs(dC) * (loose ? 2 : 3.2)),
      finish: finishScore(src.finish, cand.finish),
      payoff: clamp(100 - Math.abs((cand.payoff || 3) - (src.payoff || 3)) * 28),
      formula: formulaScore(src.formula, cand.formula),
      community: 0,
    };
    const ing = ingredientSimilarity(src.ingredients, cand.ingredients);
    if (ing != null) s.ingredients = ing;
    const cited = o.community && o.community(src, cand);
    // People confirming a match (Findation-style): needs a few votes, mostly yes.
    const v = o.votes && o.votes(src, cand);
    const confirmed = v && v.up >= 3 && v.up / (v.up + v.down) >= 0.7;
    if (cited || confirmed) s.community = 100;

    const w = Object.assign({}, WEIGHTS[src.cat] || WEIGHTS.lipstick, o.weights || {});
    // Community is a bonus, never a penalty: it only counts when present.
    let total = 0, sum = 0;
    for (const [k] of CRITERIA) {
      if (k === 'community' || s[k] == null) continue;
      total += s[k] * (w[k] || 0); sum += (w[k] || 0);
    }
    let score = sum ? total / sum : 0;
    if (cited || confirmed) score = Math.min(100, score + (w.community || 0) * 0.6);
    // People saying it doesn't match pulls it down, like a reported dupe on Temptalia.
    if (v && v.down >= 3 && v.down / (v.up + v.down) >= 0.7) score -= 6;
    // A big colour miss can't be rescued by matching packaging and finish.
    if (dEmatch > 14) score = Math.min(score, 60);

    return {
      score: Math.round(score * 10) / 10, scores: s, deltaE: dE, dL, dC, dh,
      cited: cited || null, votes: v || null,
      direction: direction(src, cand, dE, dL, dC, dh), confidence: confidence(src, cand),
    };
  }

  // Temptalia separates true dupes from "similar" shades. A dupe has to be
  // close in colour as well as score well overall.
  // Formula matches run lower than colour matches (Skinsort rates its own
  // published skincare dupes at 59-66%), so skincare gets its own cut-offs.
  function verdict(score, dE, cat) {
    if (SKIN.has(cat)) {
      if (score >= 85) return { key: 'twin', label: 'Dupe' };
      if (score >= 72) return { key: 'close', label: 'Very similar' };
      if (score >= 60) return { key: 'near', label: 'Similar' };
      return { key: 'vibe', label: 'Same family' };
    }
    if (score >= 88 && (dE == null || dE < 2.5)) return { key: 'twin', label: 'Dupe' };
    if (score >= 80) return { key: 'close', label: 'Very similar' };
    if (score >= 70) return { key: 'near', label: 'Similar' };
    return { key: 'vibe', label: 'Same family' };
  }

  // Short comparison words, the way swatch sites label a dupe: "Darker, warmer".
  function direction(src, cand, dE, dL, dC, dh) {
    if (dE < 1.5) return ['Identical'];
    const out = [];
    if (Math.abs(dL) >= 2) out.push(dL > 0 ? 'Lighter' : 'Darker');
    if (Math.abs(dh) >= 3) out.push(src.cat === 'foundation' ? (dh > 0 ? 'More golden' : 'Pinker') : (dh > 0 ? 'Warmer' : 'Cooler'));
    if (Math.abs(dC) >= 4) out.push(dC > 0 ? 'Brighter' : 'More muted');
    const sp = (f) => (FINISH[f] || FINISH.satin)[1], sh = (f) => (FINISH[f] || FINISH.satin)[0];
    if (sp(cand.finish) - sp(src.finish) >= 0.5) out.push('More shimmer');
    else if (sp(src.finish) - sp(cand.finish) >= 0.5) out.push('Less shimmer');
    else if (sh(cand.finish) - sh(src.finish) >= 1.5) out.push('Glossier');
    else if (sh(src.finish) - sh(cand.finish) >= 1.5) out.push('More matte');
    if ((cand.payoff || 3) - (src.payoff || 3) >= 1) out.push('More pigmented');
    if ((src.payoff || 3) - (cand.payoff || 3) >= 1) out.push('Sheerer');
    return out.length ? out : ['Near identical'];
  }

  // How much to trust the colour comparison (BeautyIQ-style low-confidence flag).
  function confidence(src, cand) {
    const rank = { retailer: 2, curated: 1, image: 0 };
    const r = Math.min(rank[src.hexSource] ?? 1, rank[cand.hexSource] ?? 1);
    if (r === 2) return { level: 'high', note: '' };
    if (r === 1) return { level: 'medium', note: 'One swatch is our estimate. Check it in store.' };
    return { level: 'low', note: 'Colour taken from a product photo. Check the swatch.' };
  }

  // Price per gram or ml, so different sizes compare fairly (Skinsort shows value too).
  function unitPrice(s) {
    const m = String(s.size || '').match(/([0-9]+(?:\.[0-9]+)?)\s*(g|gm|ml)\b/i);
    if (!s.price || !m || !Number(m[1])) return null;
    return { value: s.price / Number(m[1]), unit: /ml/i.test(m[2]) ? 'ml' : 'g' };
  }

  // Plain-language notes about how a dupe differs, written the way a friend
  // at the counter would say it.
  function explain(src, cand, r, skin) {
    if (SKIN.has(src.cat)) return explainSkin(src, cand, r);
    const notes = [];
    const dE = r.deltaE;
    if (dE < 2) notes.push('Same colour on the swatch.');
    else if (dE < 4) notes.push("Close. You'd only spot it side by side.");
    else if (dE < 8) notes.push('Same family, but you can see the difference.');
    else notes.push('Different shade, same direction.');


    if (src.undertone !== cand.undertone) notes.push(`Leans ${cand.undertone}, not ${src.undertone}.`);
    if (src.finish !== cand.finish) {
      const bridge = {
        'dewy>matte': 'pat balm on top for the dew',
        'matte>dewy': 'powder it down if you want it flat',
        'satin>matte': 'dab clear balm in the centre',
        'shimmer>matte': 'no sparkle, though',
      }[`${src.finish}>${cand.finish}`];
      notes.push(`${cand.finish[0].toUpperCase() + cand.finish.slice(1)}, not ${src.finish}${bridge ? `: ${bridge}` : ''}.`);
    }
    const dp = (cand.payoff || 3) - (src.payoff || 3);
    if (dp <= -1) notes.push(src.cat === 'foundation' ? 'Lighter coverage. Layer where you need it.' : 'Sheerer. Build it up in two layers.');
    if (dp >= 1) notes.push(src.cat === 'foundation' ? 'Fuller coverage. Use less.' : 'More pigment. Go easy.');
    if (src.formula !== cand.formula) notes.push(`A ${cand.formula}, not a ${src.formula}.`);

    if (skin && src.cat !== 'foundation') {
      const sk = { fair: 82, light: 74, wheatish: 66, dusky: 52, deep: 40 }[skin];
      const Lc = prepare(cand)[0];
      if (sk && Lc - sk > 2 && (src.cat === 'lipstick')) notes.push('May look pale on you. Line one shade deeper.');
      if (sk && src.cat === 'blush' && Lc > sk + 6 && sk < 60) notes.push('Can look chalky on deeper skin. Go sheer.');
    }
    return notes;
  }

  // ---- skincare ---------------------------------------------------------------
  // Skincare dupes are about the formula, the way Skinsort and Skinskool compare
  // them: the actives a product is sold on (and their strength), how much of the
  // ingredient list overlaps, what the formula does, and for sunscreen the UV
  // filters and SPF/PA.
  const SKIN = new Set(['serum', 'moisturiser', 'sunscreen']);
  const SKIN_WEIGHTS = {
    // Exact ingredient overlap between brands is low even for real dupes, so the
    // job the formula does (actives, function) carries most of the weight.
    serum: { actives: 45, function: 25, ingredients: 12, texture: 8, extras: 10, community: 5 },
    moisturiser: { actives: 20, function: 40, ingredients: 12, texture: 15, extras: 13, community: 5 },
    sunscreen: { filters: 30, protection: 25, function: 15, ingredients: 8, texture: 12, extras: 10, community: 5 },
  };
  const SKIN_CRITERIA = [
    ['actives', 'Actives'], ['ingredients', 'Ingredients'], ['function', 'What it does'], ['filters', 'UV filters'],
    ['protection', 'SPF / PA'], ['texture', 'Texture'], ['extras', 'Fragrance & alcohol'], ['community', 'Community'],
  ];
  const UV_FILTERS = {
    'zinc oxide': 'mineral', 'titanium dioxide': 'mineral',
    'avobenzone': 'chemical', 'butyl methoxydibenzoylmethane': 'chemical', 'octocrylene': 'chemical',
    'homosalate': 'chemical', 'octisalate': 'chemical', 'ethylhexyl salicylate': 'chemical', 'oxybenzone': 'chemical',
    'benzophenone 3': 'chemical', 'octinoxate': 'chemical', 'ethylhexyl methoxycinnamate': 'chemical',
    'bis ethylhexyloxyphenol methoxyphenyl triazine': 'chemical', 'bemotrizinol': 'chemical',
    'diethylamino hydroxybenzoyl hexyl benzoate': 'chemical', 'ethylhexyl triazone': 'chemical',
    'methylene bis benzotriazolyl tetramethylbutylphenol': 'chemical', 'drometrizole trisiloxane': 'chemical',
    'terephthalylidene dicamphor sulfonic acid': 'chemical', 'phenylbenzimidazole sulfonic acid': 'chemical',
    'polysilicone 15': 'chemical', 'diethylhexyl butamido triazone': 'chemical',
    'methoxypropylamino cyclohexenylidene ethoxyethylcyanoacetate': 'chemical',
  };
  const ALIAS = {
    'hyaluronic acid': 'sodium hyaluronate', 'vitamin c': 'ascorbic acid', 'l ascorbic acid': 'ascorbic acid',
    'bha': 'salicylic acid', 'vitamin e': 'tocopherol', 'zinc': 'zinc pca',
  };
  const canonIng = (x) => { const n = normIng(x).replace(/-/g, ' '); return ALIAS[n] || n; };

  function skinProfile(p) {
    if (p._skin) return p._skin;
    const inci = (p.ingredients || []).map(canonIng);
    const filters = inci.filter((x) => UV_FILTERS[x]);
    const actives = {};
    for (const [k, v] of Object.entries(p.actives || {})) actives[canonIng(k)] = v;
    p._skin = {
      inci, set: new Set(inci), actives, filters: new Set(filters),
      filterType: !filters.length ? null : filters.every((f) => UV_FILTERS[f] === 'mineral') ? 'mineral' : filters.some((f) => UV_FILTERS[f] === 'mineral') ? 'hybrid' : 'chemical',
      fragrance: inci.some((x) => /^(parfum|fragrance|aroma)$/.test(x) || /essential oil|limonene|linalool|citral|geraniol/.test(x)),
      alcohol: inci.some((x) => /^(alcohol denat|alcohol|sd alcohol)/.test(x)),
    };
    return p._skin;
  }

  const TEXTURE_NEAR = { 'gel|gel-cream': 75, 'cream|gel-cream': 75, 'fluid|lotion': 80, 'gel|fluid': 70, 'cream|lotion': 70, 'serum|gel': 70 };
  function textureScore(a, b) {
    if (!a || !b) return null;
    if (a === b) return 100;
    return TEXTURE_NEAR[`${a}|${b}`] || TEXTURE_NEAR[`${b}|${a}`] || 40;
  }

  const FAMILY = ['peptide', 'ferment', 'retinoid', 'exfoliant', 'barrier'];
  const pretty = (k) => k.replace(/\b(pca|ha|bha|aha)\b/g, (m) => m.toUpperCase());
  const cap = (x) => x[0].toUpperCase() + x.slice(1);

  function compareSkin(src, cand, o) {
    const A = skinProfile(src), B = skinProfile(cand);
    const s = {};
    const shared = [], missing = [], stronger = [], weaker = [];
    const names = Object.keys(A.actives);
    if (names.length) {
      let credit = 0;
      for (const k of names) {
        const a = A.actives[k], b = B.actives[k];
        if (b !== undefined || B.set.has(k)) {
          let c = b !== undefined ? 1 : 0.6;
          if (a && b) { c *= Math.sqrt(Math.min(a, b) / Math.max(a, b)); if (b > a * 1.2) stronger.push([k, a, b]); else if (b < a * 0.8) weaker.push([k, a, b]); }
          credit += c; shared.push([k, b ?? null]);
        } else {
          // A different ingredient that does the same specialist job (another
          // peptide, ferment, retinoid, acid or ceramide) earns half credit.
          const fam = FAMILY.find((f) => FUNCS[f].test(k));
          const alt = fam && B.inci.find((x) => FUNCS[fam].test(x));
          if (alt) { credit += 0.5; shared.push([alt, null]); } else missing.push(k);
        }
      }
      s.actives = clamp((credit / names.length) * 100);
    }
    s.ingredients = ingredientSimilarity(A.inci, B.inci);
    s.function = functionSimilarity(A.inci, B.inci);
    if (src.cat === 'sunscreen') {
      const u = new Set([...A.filters, ...B.filters]);
      let both = 0; for (const f of A.filters) if (B.filters.has(f)) both++;
      s.filters = u.size ? clamp((both / u.size) * 70 + (A.filterType === B.filterType ? 30 : 0)) : null;
      s.protection = clamp(100 - Math.abs((cand.spf || 0) - (src.spf || 0)) * 2 - Math.abs((cand.pa || 0) - (src.pa || 0)) * 15 - ((cand.spf || 0) < 30 ? 40 : 0));
    }
    s.texture = textureScore(src.texture, cand.texture);
    let extras = 100;
    if (!A.fragrance && B.fragrance) extras -= 50; else if (A.fragrance !== B.fragrance) extras -= 15;
    if (!A.alcohol && B.alcohol) extras -= 40; else if (A.alcohol !== B.alcohol) extras -= 10;
    s.extras = clamp(extras);

    const cited = o.community && o.community(src, cand);
    const v = o.votes && o.votes(src, cand);
    const confirmed = v && v.up >= 3 && v.up / (v.up + v.down) >= 0.7;
    s.community = cited || confirmed ? 100 : 0;

    const w = Object.assign({}, SKIN_WEIGHTS[src.cat], o.weights || {});
    let total = 0, sum = 0;
    for (const [k] of SKIN_CRITERIA) {
      if (k === 'community' || s[k] == null || !w[k]) continue;
      total += s[k] * w[k]; sum += w[k];
    }
    let score = sum ? total / sum : 0;
    if (cited || confirmed) score = Math.min(100, score + (w.community || 0) * 0.6);
    if (v && v.down >= 3 && v.down / (v.up + v.down) >= 0.7) score -= 6;
    // Missing the main active means it does a different job, however similar the base.
    if (names.length && missing.includes(names[0])) score = Math.min(score, 55);

    const direction = [];
    for (const [k, a, b] of stronger) direction.push(`Stronger ${pretty(k)} (${b}% vs ${a}%)`);
    for (const [k, a, b] of weaker) direction.push(`Gentler ${pretty(k)} (${b}% vs ${a}%)`);
    for (const k of missing) direction.push(`No ${pretty(k)}`);
    if (src.cat === 'sunscreen') {
      if ((cand.spf || 0) !== (src.spf || 0)) direction.push(`SPF ${cand.spf}`);
      if (B.filterType && B.filterType !== A.filterType) direction.push(`${cap(B.filterType)} filters`);
    }
    if (src.texture && cand.texture && src.texture !== cand.texture) direction.push(cap(cand.texture));
    if (B.fragrance && !A.fragrance) direction.push('Has fragrance');
    if (!B.fragrance && A.fragrance) direction.push('Fragrance-free');
    if (B.alcohol && !A.alcohol) direction.push('Has alcohol');

    return {
      score: Math.round(score * 10) / 10, scores: s, deltaE: null, cited: cited || null, votes: v || null,
      direction: direction.length ? direction : ['Near identical formula'],
      confidence: (cand.inciConfidence || 1) < 0.8 || (src.inciConfidence || 1) < 0.8
        ? { level: 'medium', note: 'Ingredient list matched by name. Check the label.' } : { level: 'high', note: '' },
      skin: { shared, missing, sharedCount: [...A.set].filter((x) => B.set.has(x)).length },
    };
  }

  function explainSkin(src, cand, r) {
    const notes = [];
    if (r.skin.shared.length) notes.push(`Shares ${r.skin.shared.map(([k, pct]) => pretty(k) + (pct ? ` ${pct}%` : '')).join(', ')}.`);
    const ing = r.scores.ingredients;
    if (ing != null) notes.push(ing >= 70 ? 'Near-identical formula.' : ing >= 45 ? `Similar base, ${r.skin.sharedCount} ingredients in common.` : `Different base, ${r.skin.sharedCount} ingredients in common.`);
    if (r.skin.missing.length) notes.push(`Missing ${r.skin.missing.map(pretty).join(', ')}.`);
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
      const r = SKIN.has(src.cat) ? compareSkin(src, c, o) : compare(src, c, o);
      if (r.score < o.minScore) continue;
      out.push(Object.assign({ shade: c }, r));
    }
    out.sort((a, b) => b.score - a.score || (a.shade.price || 1e9) - (b.shade.price || 1e9));
    // Keep at most two shades of the same product so one range can't crowd the list.
    const perProduct = {}, list = [];
    for (const r of out) {
      const k = r.shade.productId;
      perProduct[k] = (perProduct[k] || 0) + 1;
      if (perProduct[k] <= (o.perProduct || 2)) list.push(r);
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
    serum: /\b(serum|essence|ampoule|exfoliant|booster)\b/,
    moisturiser: /\b(moisturi[sz]er|moisturi[sz]ing|cream|gel cream|hydrator)\b/,
    sunscreen: /\b(sunscreen|sunblock|spf|sun gel|sun cream)\b/,
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
    if (bestScore >= 8) return best;
    // Token match for long names ("the ordinary niacinamide").
    const qt = new Set(t.match(/[a-z0-9]+/g) || []);
    for (const s of pool) {
      const bt = (s.brand.toLowerCase().match(/[a-z0-9]+/g) || []);
      if (!bt.every((w) => qt.has(w))) continue;
      const nt = (s.name.toLowerCase().match(/[a-z]{3,}/g) || []);
      if (!nt.length) continue;
      const hit = nt.filter((w) => qt.has(w)).length;
      const sc = hit / nt.length + hit * 0.05;
      if (hit && sc > bestScore) { bestScore = sc; best = s; }
    }
    return best && bestScore >= 0.2 ? best : null;
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
      if (target && s.hex) score = clamp(100 - deltaE2000(target, prepare(s)) * 3.5);
      else if (target) continue;
      if (!s.hex) {
        // Skincare: score on words shared with the product name and actives.
        const words = String(q).toLowerCase().match(/[a-z]{3,}/g) || [];
        const hay = (s.brand + ' ' + s.name + ' ' + Object.keys(s.actives || {}).join(' ')).toLowerCase();
        score = 40 + words.filter((w) => hay.includes(w)).length * 15;
      }
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
    compare, compareSkin, findDupes, explain, functionSimilarity, SKIN, SKIN_WEIGHTS, SKIN_CRITERIA, verdict, direction, confidence, unitPrice, ingredientSimilarity,
    parseQuery, search, findNamedShade, WEIGHTS, CRITERIA, FINISH,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Swmatch = api;
})(typeof self !== 'undefined' ? self : this);
