// swmatch page logic: hero compare slider, popular-swaps reel, category shelf, picker,
// match card, plain-language search, AI stylist, votes and the proof section.
(function () {
  'use strict';
  const S = window.Swmatch;
  const CAT = window.SWMATCH_CATALOG || { products: [], community: [], benchmarks: [] };
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : '—');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Purplle photos are stored as a path; the page asks the CDN for the width it shows.
  const photo = (s, w) => (!s || !s.image ? '' : /^(img\/|https?:)/.test(s.image) ? s.image
    : `https://media6.ppl-media.com/tr:w-${w || 240},c-at_max/static/img/product/${s.image}`);
  // Where to buy: the Purplle product page when we have it, otherwise a search on each store.
  function storesFor(s) {
    const q = encodeURIComponent(`${s.brand} ${s.line || ''} ${s.name}`.replace(/\s+/g, ' ').trim());
    const m = `${s.brand} ${s.line || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return [
      { store: 'Purplle', url: s.url || `https://www.purplle.com/search?q=${q}` },
      { store: 'Nykaa', url: `https://www.nykaa.com/search/result/?q=${q}` },
      { store: 'Tira', url: `https://www.tirabeauty.com/search?q=${q}` },
      { store: 'Myntra', url: `https://www.myntra.com/${m}` },
    ];
  }
  // Public-domain plates for categories with no product photos (credited in the footer).
  const PLATE = {
    serum: 'assets/archive/serum-lotus.jpg', moisturiser: 'assets/archive/moisturiser-peony.jpg',
    sunscreen: 'assets/archive/sunscreen-lily.jpg', highlighter: 'assets/archive/highlighter-bubble.jpg',
  };

  const CATS = {
    makeup: [
      { key: 'lipstick', label: 'Lipstick' }, { key: 'blush', label: 'Blush' },
      { key: 'foundation', label: 'Foundation' }, { key: 'highlighter', label: 'Highlighter' },
    ],
    skin: [
      { key: 'serum', label: 'Serum' }, { key: 'moisturiser', label: 'Moisturiser' }, { key: 'sunscreen', label: 'Sunscreen' },
    ],
  };
  const ALL_CATS = [...CATS.makeup, ...CATS.skin];
  const isSkin = (cat) => S.SKIN.has(cat);
  const PAYOFF_WORD = { 1: 'sheer', 2: 'light', 3: 'medium', 4: 'high', 5: 'intense' };
  const COVER_WORD = { 1: 'sheer', 2: 'light', 3: 'medium', 4: 'medium-full', 5: 'full' };

  // ---- flatten catalog ----
  const shades = [];
  const byId = new Map();
  for (const p of CAT.products) {
    for (const s of p.shades) {
      const row = Object.assign({}, s, {
        productId: p.id, brand: p.brand, line: p.line, cat: p.cat, origin: p.origin, source: p.source,
        formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff, size: s.size || p.size,
        image: s.image || p.image || null,
      });
      shades.push(row);
      byId.set(row.id, row);
    }
  }
  // You pick the one you love from high-end brands; dupes come from everyone.
  // High-end means the brand's typical price in that category sits at or above
  // the premium line for that category in India.
  const PREMIUM = { lipstick: 1500, blush: 1500, highlighter: 1500, foundation: 1800, serum: 1400, moisturiser: 1400, sunscreen: 1200 };
  const highEndProducts = new Set();
  {
    const byBrand = {};
    for (const s of shades) if (s.price) (byBrand[s.cat + '|' + s.brand] = byBrand[s.cat + '|' + s.brand] || []).push(s.price);
    const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    for (const p of CAT.products) {
      const prices = byBrand[p.cat + '|' + p.brand];
      if (p.origin !== 'IN' && prices && median(prices) >= (PREMIUM[p.cat] || 1500)) highEndProducts.add(p.id);
    }
  }
  const isHighEnd = (s) => highEndProducts.has(s.productId);
  const sources = shades.filter(isHighEnd);

  const citedShade = new Map(), citedLine = new Map();
  for (const c of CAT.community || []) {
    if (c.shades) { citedShade.set(c.shades.join('|'), c); citedShade.set([c.shades[1], c.shades[0]].join('|'), c); }
    if (c.lines) { citedLine.set(c.lines.join('|'), c); citedLine.set([c.lines[1], c.lines[0]].join('|'), c); }
  }
  // Pairs dupe sites or editors published (data/benchmarks.json) get a Verified mark.
  const published = new Map();
  for (const b of CAT.benchmarks || []) {
    const n = (x) => String(x).toLowerCase();
    const a = shades.find((s) => s.cat === b.cat && s.brand === b.src[0] && (n(s.name) === n(b.src[1]) || n(s.name).endsWith(' ' + n(b.src[1]))));
    const d = shades.find((s) => s.cat === b.cat && s.brand === b.dupe[0] && (n(s.name) === n(b.dupe[1]) || n(s.name).endsWith(' ' + n(b.dupe[1]))));
    if (a && d) { published.set(a.id + '|' + d.id, b); published.set(d.id + '|' + a.id, b); }
  }
  const verifiedBy = (src, s, d) => {
    const b = published.get(src.id + '|' + s.id);
    if (b) return b.source[0].toUpperCase() + b.source.slice(1);
    if (d && d.cited) return d.cited.source[0].toUpperCase() + d.cited.source.slice(1);
    return null;
  };
  // Line-level pairings only count for shades that are already close in colour.
  const community = (a, b) => {
    const direct = citedShade.get(a.id + '|' + b.id);
    if (direct) return direct;
    const line = citedLine.get(a.productId + '|' + b.productId);
    if (line && a.hex && b.hex && S.deltaE2000(S.lab(a.hex), S.lab(b.hex)) < 6) return line;
    return null;
  };

  // ---- state ----
  const store = {
    get(k, d) { try { const v = localStorage.getItem('swmatch:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('swmatch:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const state = {
    kind: 'makeup', cat: 'blush', brand: null, showAll: false,
    shadeId: null, cheaperOnly: false, maxPrice: 0, dupeOrigin: 'all', skin: store.get('skin', ''),
    weights: {},
  };

  // Findation-style confirmations, hidden when the vote API isn't there.
  let votesOn = true;
  const votes = {};
  const myVotes = store.get('votes', {});
  const votesFor = (src, cand) => (votes[src.id] || {})[cand.id] || null;
  async function loadVotes(srcId) {
    if (!votesOn || votes[srcId]) return;
    try {
      const r = await fetch('api/vote?src=' + encodeURIComponent(srcId));
      if (!r.ok) throw new Error();
      votes[srcId] = (await r.json()).votes || {};
      if (state.shadeId === srcId) renderMatch();
    } catch (e) { votesOn = false; if (state.shadeId === srcId) renderMatch(); }
  }
  async function castVote(srcId, dupeId, vote) {
    const key = srcId + '|' + dupeId;
    if (myVotes[key]) return;
    myVotes[key] = vote; store.set('votes', myVotes);
    votes[srcId] = votes[srcId] || {};
    const v = (votes[srcId][dupeId] = votes[srcId][dupeId] || { up: 0, down: 0 });
    v[vote > 0 ? 'up' : 'down']++;
    renderMatch();
    try { await fetch('api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: srcId, dupe: dupeId, vote }) }); } catch (e) { /* offline */ }
  }

  const dupeOpts = (extra) => Object.assign({
    community, votes: votesFor, weights: state.weights, cheaperOnly: state.cheaperOnly,
    maxPrice: state.maxPrice || 0, origin: state.dupeOrigin, limit: 10, minScore: 50,
  }, extra || {});

  // ---- product drawings, tinted with the real shade ----
  let gid = 0;
  const shadeOf = (hex, amt) => {
    const [r, g, b] = S.hexToRgb(hex).map((c) => Math.max(0, Math.min(255, Math.round(c * amt))));
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  };
  const tint = (hex, k) => '#' + S.hexToRgb(hex).map((c) => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('');
  // A soft, stable pastel per brand for skincare packaging.
  const pastel = (str) => {
    let h = 0; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return `hsl(${(h % 70) + 330} 70% 88%)`;
  };
  function art(cat, s) {
    const id = 'g' + (++gid);
    const hex = s && s.hex ? s.hex : '#E8B4A8';
    const dark = shadeOf(hex, 0.72), light = shadeOf(hex, 1.18);
    const sparkle = s && /shimmer|metallic|radiant/.test(s.finish || '')
      ? `<g fill="#fff" opacity=".85"><circle cx="24" cy="40" r=".9"/><circle cx="34" cy="46" r=".7"/><circle cx="29" cy="53" r=".8"/><circle cx="38" cy="38" r=".6"/><circle cx="21" cy="50" r=".6"/></g>` : '';
    const gold = `<linearGradient id="${id}m" x1="0" x2="1"><stop offset="0" stop-color="#8A6A3A"/><stop offset=".45" stop-color="#E9D29A"/><stop offset="1" stop-color="#7A5A2C"/></linearGradient>`;
    const ink = '#2B1519';
    const t = pastel(s && s.brand);
    switch (cat) {
      case 'lipstick':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><defs>${gold}<linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".35" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><path d="M21 40V17l18-9v32z" fill="url(#${id}b)"/><rect x="18" y="38" width="24" height="12" rx="2" fill="url(#${id}m)"/><rect x="16" y="49" width="28" height="33" rx="4" fill="${ink}"/><rect x="19" y="52" width="3" height="27" rx="1.5" fill="#fff" opacity=".18"/></svg>`;
      case 'blush':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><defs><radialGradient id="${id}p" cx=".35" cy=".3"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs><circle cx="30" cy="46" r="27" fill="${ink}"/><circle cx="30" cy="46" r="24" fill="#3A2226"/><circle cx="30" cy="46" r="19" fill="url(#${id}p)"/><path d="M19 40c6-6 16-6 22 0" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>${sparkle}</svg>`;
      case 'foundation':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><defs><linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".4" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect x="22" y="4" width="16" height="20" rx="3" fill="${ink}"/><rect x="25" y="22" width="10" height="6" fill="#C9B9B2"/><rect x="13" y="27" width="34" height="53" rx="8" fill="#fff" opacity=".55"/><rect x="16" y="34" width="28" height="43" rx="6" fill="url(#${id}f)"/><rect x="19" y="37" width="3" height="36" rx="1.5" fill="#fff" opacity=".35"/></svg>`;
      case 'highlighter':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><defs><linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".45" stop-color="${light}"/><stop offset=".55" stop-color="#fff"/><stop offset=".7" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><rect x="6" y="20" width="48" height="48" rx="10" fill="${ink}"/><rect x="11" y="25" width="38" height="38" rx="7" fill="url(#${id}h)"/>${sparkle}</svg>`;
      case 'serum':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><ellipse cx="30" cy="10" rx="7" ry="8" fill="${ink}"/><rect x="24" y="14" width="12" height="12" rx="2" fill="#C9A86A"/><rect x="14" y="26" width="32" height="54" rx="9" fill="#B8743A" opacity=".85"/><rect x="18" y="44" width="24" height="22" rx="3" fill="${t}"/><rect x="21" y="49" width="18" height="2.5" rx="1" fill="${ink}" opacity=".7"/><rect x="21" y="55" width="12" height="2" rx="1" fill="${ink}" opacity=".4"/><rect x="18" y="30" width="3" height="40" rx="1.5" fill="#fff" opacity=".35"/></svg>`;
      case 'moisturiser':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><rect x="7" y="26" width="46" height="14" rx="6" fill="${ink}"/><rect x="9" y="38" width="42" height="34" rx="9" fill="${t}"/><rect x="15" y="48" width="30" height="3" rx="1.5" fill="${ink}" opacity=".7"/><rect x="15" y="55" width="18" height="2.5" rx="1" fill="${ink}" opacity=".4"/><rect x="12" y="41" width="3" height="26" rx="1.5" fill="#fff" opacity=".5"/></svg>`;
      case 'sunscreen':
        return `<svg viewBox="0 0 60 84" aria-hidden="true"><path d="M16 6h28l-3 58H19z" fill="${t}"/><rect x="18" y="62" width="24" height="16" rx="3" fill="${ink}"/><rect x="20" y="20" width="20" height="3" rx="1.5" fill="${ink}" opacity=".7"/><rect x="22" y="27" width="16" height="9" rx="2" fill="#F8F3A6"/><text x="30" y="34" text-anchor="middle" font-size="6" font-weight="900" fill="${ink}" font-family="Nunito, sans-serif">SPF</text><rect x="19" y="8" width="3" height="50" rx="1.5" fill="#fff" opacity=".5"/></svg>`;
      default: return '';
    }
  }

  // ---- photography ----
  // Grey swatch textures (assets/tex, drawn by scripts/make_textures.py) tinted to
  // the exact shade, so every swatch shows product texture.
  // Retailer product photos where the catalog has one; the drawing shows otherwise.
  const pic = (s, cls, w) => (s && s.image
    ? `<div class="pic ${cls || ''}"><img src="${esc(photo(s, w))}" alt="" loading="lazy" data-fallback><div class="art">${art(s.cat, s)}</div></div>`
    : `<div class="pic nophoto ${cls || ''}"><div class="art">${art(s && s.cat, s)}</div></div>`);
  const TEX_FOR = { lipstick: 'smear', foundation: 'smear', blush: 'powder', highlighter: 'powder', serum: 'drop', moisturiser: 'cream', sunscreen: 'cream' };
  const tex = {};
  for (const k of ['smear', 'powder', 'cream', 'drop']) {
    const im = new Image();
    im.onload = () => { tex[k] = im; if (state.shadeId) renderMatch(); renderCompare(); };
    im.src = `assets/tex/${k}.png`;
  }
  const tintCache = new Map();
  // Multiply-and-screen tint: grey 128 maps to the shade, darker greys deepen it,
  // lighter greys lift it toward a highlight. Alpha comes from the texture.
  function tinted(s, sheer) {
    const kind = s.cat === 'blush' && /liquid|cream|stick|mousse|gel/.test(s.formula || '') ? 'smear' : TEX_FOR[s.cat] || 'smear';
    const hex = s.hex || (s.cat === 'serum' ? '#C98A3E' : '#F4EEE8');
    const key = kind + hex + (sheer || 1);
    if (tintCache.has(key)) return tintCache.get(key);
    const im = tex[kind];
    if (!im) return null;
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    let data;
    try { data = g.getImageData(0, 0, c.width, c.height); } catch (e) { return null; }
    const [R, G, B] = S.hexToRgb(hex);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const t = d[i] / 255;
      const f = (base) => (t < 0.5 ? base * t * 2 : base + (255 - base) * (t - 0.5) * 1.3);
      d[i] = f(R); d[i + 1] = f(G); d[i + 2] = f(B);
      d[i + 3] = d[i + 3] * (sheer || 1);
    }
    g.putImageData(data, 0, 0);
    const url = c.toDataURL('image/png');
    tintCache.set(key, url);
    return url;
  }
  function swatchImg(s, cls, sheer) {
    const url = tinted(s, sheer);
    return url ? `<img class="${cls || ''}" src="${url}" alt="">` : `<span class="${cls || ''} blob" style="background:${esc(s.hex || '#eee')}"></span>`;
  }

  // Photos that fail to load (or aren't shipped) fall back to the drawing underneath.
  document.addEventListener('error', (e) => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.hasAttribute('data-fallback')) return;
    const box = im.parentNode;
    im.remove();
    if (!box.querySelector('img')) box.classList.add('nophoto');
  }, true);

  // ---- shelf ----
  const DEFAULTS = {
    lipstick: ['MAC', 'Ruby Woo'], blush: ['Rare Beauty', 'Hope'], foundation: ['MAC', 'NC42'], highlighter: ['Charlotte Tilbury', '4 Medium'],
    serum: ['Paula\'s Choice', '10% Niacinamide Booster'], moisturiser: ['Clinique', 'Moisture Surge 100H Auto-Replenishing Hydrator'],
    sunscreen: ['La Roche-Posay', 'Anthelios UVMune 400 Invisible Fluid SPF 50+'],
  };
  const findShade = (cat, [brand, name]) => { const n = String(name || '').toLowerCase(); return shades.find((s) => s.cat === cat && s.brand === brand && (s.name.toLowerCase() === n || s.name.toLowerCase().endsWith(' ' + n))); };
  const defaultFor = (cat) => findShade(cat, DEFAULTS[cat] || []) || sources.find((s) => s.cat === cat);

  // Three well-reviewed products with photos for each category tile, each from a
  // different range and, for lip and cheek colour, a different colour family.
  const collage = {};
  for (const s of [...shades].sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0))) {
    if (!s.image) continue;
    const list = collage[s.cat] || (collage[s.cat] = []);
    const fam = s.hex ? S.colourFamily(s.hex, s.cat) : '';
    const spread = s.cat === 'lipstick' || s.cat === 'blush';
    if (list.length < 3 && !list.some((x) => x.productId === s.productId || (spread && x.fam === fam))) list.push(Object.assign({ fam }, s));
  }

  function renderShelf() {
    document.querySelectorAll('#kind button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
    const counts = {};
    for (const s of shades) counts[s.cat] = (counts[s.cat] || 0) + 1;
    const sel = byId.get(state.shadeId);
    $('#shelf').innerHTML = CATS[state.kind].map((c) => {
      const show = sel && sel.cat === c.key ? sel : defaultFor(c.key);
      const unit = isSkin(c.key) ? 'products' : 'shades';
      return `<button type="button" class="tile" data-cat="${c.key}" aria-pressed="${state.cat === c.key}">
        ${PLATE[c.key] ? `<div class="photo plate"><img src="${PLATE[c.key]}" alt="" loading="lazy" data-fallback><div class="art">${art(c.key, show)}</div></div>`
    : (collage[c.key] || []).length === 3
    ? `<div class="photo stack">${collage[c.key].map((x) => `<img src="${esc(photo(x, 360))}" alt="" loading="lazy" data-fallback>`).join('')}<div class="art">${art(c.key, show)}</div></div>`
    : `<div class="photo nophoto"><div class="art">${art(c.key, show)}</div></div>`}
        <div class="tmeta"><b>${c.label}</b><span>${(counts[c.key] || 0).toLocaleString('en-IN')} ${unit}</span></div></button>`;
    }).join('');
  }

  // ---- picker ----
  function brandsFor(cat) {
    const m = new Set();
    for (const p of CAT.products) if (p.cat === cat && highEndProducts.has(p.id)) m.add(p.brand);
    return [...m].sort((a, b) => a.localeCompare(b));
  }
  function renderBrands() {
    const list = brandsFor(state.cat);
    if (state.brand && !list.includes(state.brand)) state.brand = null;
    $('#brand').innerHTML = `<option value="">Pick a brand</option>` + list.map((b) => `<option value="${esc(b)}" ${state.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('');
  }
  // Colour families for the picker chips.
  const FAMILIES = ['Nudes', 'Pinks', 'Fuchsia', 'Reds', 'Corals', 'Berries', 'Purples', 'Browns'];
  const FAMILY_OF = { nude: 'Nudes', peach: 'Nudes', rose: 'Pinks', pink: 'Pinks', mauve: 'Pinks', fuchsia: 'Fuchsia', red: 'Reds', coral: 'Corals', orange: 'Corals', berry: 'Berries', plum: 'Berries', purple: 'Purples', brown: 'Browns', 'deep brown': 'Browns' };
  const FAMILY_HEX = { Nudes: '#C08B7C', Pinks: '#D98395', Fuchsia: '#D9286F', Reds: '#B8202D', Corals: '#EC6A48', Berries: '#87304E', Purples: '#6A3586', Browns: '#7E4A3A' };

  function renderLines() {
    const el = $('#lines');
    if (!state.brand) { el.innerHTML = ''; return; }
    const ps = CAT.products.filter((p) => p.cat === state.cat && p.brand === state.brand && highEndProducts.has(p.id));
    if (isSkin(state.cat)) {
      el.innerHTML = `<div class="line">${ps.map((p) => {
        const s = p.shades[0];
        return `<button type="button" class="prod" data-shade="${esc(s.id)}" aria-pressed="${state.shadeId === s.id}">${pic(byId.get(s.id), 'pthumb', 120)}<span>${esc(p.line)}<small>${inr(s.price)} · ${esc(s.size || '')}</small></span></button>`;
      }).join('')}</div>`;
      return;
    }
    const famOf = (s) => FAMILY_OF[S.colourFamily(s.hex, s.cat)] || 'Other';
    const fams = FAMILIES.filter((f) => ps.some((p) => p.shades.some((s) => famOf(s) === f)));
    if (state.family && !fams.includes(state.family)) state.family = null;
    const chips = ['lipstick', 'blush'].includes(state.cat) && fams.length > 1
      ? `<div class="fams" role="group" aria-label="Colour">${['All'].concat(fams).map((f) => `<button type="button" data-family="${f}" aria-pressed="${(state.family || 'All') === f}">${f === 'All' ? 'All' : `<i style="background:${FAMILY_HEX[f]}"></i>${f}`}</button>`).join('')}</div>` : '';
    el.innerHTML = chips + ps.map((p) => {
      const list = state.family ? p.shades.filter((s) => famOf(s) === state.family) : p.shades;
      if (!list.length) return '';
      const price = p.shades.map((s) => s.price).filter(Boolean);
      const lo = Math.min(...price), hi = Math.max(...price);
      const priceTxt = price.length ? (lo === hi ? inr(lo) : `${inr(lo)}–${inr(hi)}`) : '';
      return `<div class="line"><h4>${esc(p.line)} <span>${priceTxt}</span></h4><div class="dots">${list.map((s) => `<button type="button" class="dot" data-shade="${esc(s.id)}" title="${esc(s.name)}" aria-label="${esc(s.name)}" aria-pressed="${state.shadeId === s.id}" style="background:${esc(s.hex)}"></button>`).join('')}</div></div>`;
    }).join('');
  }

  // ---- match card ----
  const payoffWord = (s) => (s.cat === 'foundation' ? COVER_WORD : PAYOFF_WORD)[s.payoff] || 'medium';
  const pretty = (k) => k.replace(/\b(pca|ha|bha)\b/gi, (m) => m.toUpperCase()).replace(/^./, (c) => c.toUpperCase());

  function factsHtml(s) {
    if (isSkin(s.cat)) {
      const acts = Object.entries(s.actives || {}).map(([k, v]) => `<span class="fact act">${esc(pretty(k))}${v ? ' ' + v + '%' : ''}</span>`);
      const inci = (s.ingredients || []).map((x) => x.toLowerCase());
      const frag = inci.some((x) => /parfum|fragrance/.test(x));
      const bits = [s.texture, s.spf ? `SPF ${s.spf}${s.pa ? ' PA' + '+'.repeat(s.pa) : ''}` : null, frag ? 'has fragrance' : 'fragrance-free', `${inci.length} ingredients`].filter(Boolean);
      return acts.join('') + bits.map((b) => `<span class="fact">${esc(b)}</span>`).join('');
    }
    const bits = [`${s.undertone} undertone`, s.cat === 'foundation' ? S.depthLabel(s.hex).toLowerCase() + ' depth' : null, s.finish, s.formula, `${payoffWord(s)} ${s.cat === 'foundation' ? 'coverage' : 'payoff'}`].filter(Boolean);
    return bits.map((b) => `<span class="fact">${esc(b)}</span>`).join('');
  }

  // Indian skin tones for the swatch-on-skin view.
  const SKINS = [['fair', 'Fair', '#F2D6C2'], ['light', 'Light', '#E6BE9E'], ['wheatish', 'Wheatish', '#D2A07A'], ['tan', 'Medium-tan', '#B98059'], ['dusky', 'Dusky', '#93603F'], ['deep', 'Deep', '#5F3B27']];
  state.tone = store.get('tone', 'wheatish');

  function onSkin(src, dupes) {
    if (isSkin(src.cat) || !dupes.length) return '';
    const tone = SKINS.find((t) => t[0] === state.tone) || SKINS[2];
    const items = [{ s: src, label: 'Yours' }].concat(dupes.slice(0, 3).map((d, i) => ({ s: d.shade, label: `Dupe ${i + 1}` })));
    const sheer = (x) => Math.min(1, 0.55 + (x.payoff || 3) * 0.1);
    return `<div class="onskin">
      <div class="onskin-head"><b>Swatched on skin</b>
        <div class="tones" role="group" aria-label="Skin tone">${SKINS.map(([k, label, hex]) => `<button type="button" class="tone" data-tone="${k}" aria-pressed="${k === tone[0]}" title="${label}" aria-label="${label} skin" style="background:${hex}"></button>`).join('')}<span>${tone[1]}</span></div>
      </div>
      <div class="arm" style="--skin:${tone[2]}">${items.map((it) => `<figure>${swatchImg(it.s, 'sw', sheer(it.s))}<figcaption><b>${esc(it.label)}</b>${esc(it.s.brand)} ${esc(short(it.s.name))}</figcaption></figure>`).join('')}</div>
    </div>`;
  }

  let current = null;
  function renderMatch() {
    const el = $('#match');
    const src = byId.get(state.shadeId);
    if (!src) { el.innerHTML = '<div class="empty">Pick something you love to see its dupes.</div>'; return; }
    const all = S.findDupes(src, shades, dupeOpts());
    const dupes = state.showAll ? all : all.slice(0, 5);
    const unit = (S.unitPrice(src) || {}).unit || 'g';
    const strong = all.filter((d) => S.verdict(d.score, d.deltaE, src.cat).key !== 'vibe').map((d) => ({ d, u: S.unitPrice(d.shade) })).filter((x) => x.u && x.u.unit === unit);
    const bestValue = strong.length > 1 ? strong.sort((a, b) => a.u.value - b.u.value)[0].d.shade.id : null;
    const pill = (id, on, label) => `<button type="button" class="pill" id="${id}" aria-pressed="${on}">${label}</button>`;
    const crit = isSkin(src.cat) ? S.SKIN_CRITERIA : S.CRITERIA;
    const wts = isSkin(src.cat) ? S.SKIN_WEIGHTS[src.cat] : S.WEIGHTS[src.cat];

    const pickIdx = Math.min(state.pick || 0, Math.max(0, all.length - 1));
    current = { src, all, bestValue };
    el.innerHTML = `
      ${all.length ? faceoff(src, all[pickIdx], pickIdx, bestValue) : `<div class="fo-empty">${pic(src, 'mart', 480)}<div><div class="who">${esc(src.brand)}${isSkin(src.cat) ? '' : ' · ' + esc(src.line)}</div><h2>${esc(src.name)}</h2><p class="cite">Nothing close yet. Drop a filter below.</p></div></div>`}
      <div class="filters">
        ${pill('cheaper', state.cheaperOnly, `Under ${inr(src.price)}`)}
        ${pill('indianOnly', state.dupeOrigin === 'IN', 'Indian brands')}
        ${state.maxPrice ? pill('clearMax', true, `Under ${inr(state.maxPrice)} ×`) : ''}
        ${['lipstick', 'blush'].includes(src.cat) ? `<select id="skin" aria-label="Your skin tone">
          <option value="">Your skin tone</option>
          ${['fair', 'light', 'wheatish', 'dusky', 'deep'].map((k) => `<option value="${k}" ${state.skin === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)} skin</option>`).join('')}
        </select>` : ''}
      </div>
      ${all.length > 1 ? `<div class="dupes-head"><h3>More <em>dupes</em></h3><span>${all.length} found · tap one to compare</span></div>
      <div class="dupes">${dupes.map((d, i) => dupeCard(src, d, i, bestValue, i === pickIdx)).join('')}</div>` : ''}
      ${all.length > dupes.length ? `<button type="button" class="more" id="showAll">Show ${all.length - dupes.length} more</button>` : ''}
      ${onSkin(src, all)}
      <div class="extras">
        <div class="stylist"><button type="button" id="askStylist" ${all.length ? '' : 'disabled'}>Ask the stylist</button><div class="out" id="stylistOut"></div></div>
        <details class="tune" id="tune"><summary>Change what counts</summary>
          <div class="weights">${crit.filter(([k]) => wts[k] != null).map(([k, label]) => {
            const w = state.weights[k] ?? wts[k];
            return `<div class="field"><label for="w-${k}">${label} <span class="mono">${w}</span></label><input type="range" id="w-${k}" data-w="${k}" min="0" max="50" value="${w}"></div>`;
          }).join('')}<button type="button" id="resetW">Reset</button></div>
        </details>
      </div>`;
    animateIn(el);
  }

  const VERDICT = { twin: 'A true dupe', close: 'Very close', near: 'Similar', vibe: 'Same family' };
  // Four equal store buttons: Purplle opens the product page when we have it.
  const storesHtml = (s) => `<div class="stores" role="group" aria-label="Buy ${esc(s.brand + ' ' + s.name)}">${storesFor(s).map((w) => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.store)}<span aria-hidden="true">↗</span></a>`).join('')}</div>`;
  // The engine's criteria as a radar: each spoke is one score, 0 at the centre, 100 at the rim.
  function radar(src, d) {
    const crit = (isSkin(src.cat) ? S.SKIN_CRITERIA : S.CRITERIA).filter(([k]) => k !== 'community' && d.scores[k] != null);
    const n = crit.length, R = 78, cx = 120, cy = 112;
    if (n < 3) return '';
    const pt = (i, r) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const ring = (f) => crit.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(',')).join(' ');
    const poly = crit.map(([k], i) => pt(i, R * Math.max(0.04, d.scores[k] / 100)).map((v) => v.toFixed(1)).join(',')).join(' ');
    const labels = crit.map(([k, label], i) => {
      const [x, y] = pt(i, R + 18);
      const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
      return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}">${esc(label)} <tspan>${Math.round(d.scores[k])}</tspan></text>`;
    }).join('');
    return `<svg class="radar" viewBox="-44 -4 328 232" role="img" aria-label="Scores: ${crit.map(([k, l]) => `${l} ${Math.round(d.scores[k])}`).join(', ')}">
      ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon class="rg" points="${ring(f)}"/>`).join('')}
      ${crit.map((_, i) => { const [x, y] = pt(i, R); return `<line class="rs" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}
      <polygon class="rp" points="${poly}"/>${labels}</svg>`;
  }
  function faceoff(src, d, idx, bestValue) {
    const s = d.shade;
    const v = S.verdict(d.score, d.deltaE, src.cat);
    const diff = src.price && s.price ? src.price - s.price : 0;
    const pct = src.price && s.price ? Math.round((diff / src.price) * 100) : 0;
    const notes = S.explain(src, s, d, state.skin).slice(0, 3);
    const side = (x, role) => `<figure class="fo-side ${role}" style="--wash:${x.hex ? tint(x.hex, 0.8) : 'var(--sunk)'}">
        <div class="fo-photo">${x.image ? `<img src="${esc(photo(x, 480))}" alt="${esc(x.brand + ' ' + x.name)}" data-fallback>` : isSkin(x.cat) || !x.hex ? art(x.cat, x) : swatchImg(x, 'sw')}${x.hex ? `<span class="fo-dot" style="background:${esc(x.hex)}" aria-hidden="true"></span>` : ''}</div>
        <figcaption><span class="fo-role">${role === 'a' ? 'The original' : idx === 0 ? 'Best dupe' : `Dupe no. ${idx + 1}`}</span>
          <span class="fo-by">${esc(x.brand)}${isSkin(x.cat) ? '' : ' · ' + esc(x.line)}</span>
          <b class="fo-name">${esc(x.name)}</b>
          <span class="fo-price">${inr(x.price)}${x.size ? ` <small>${esc(x.size)}</small>` : ''}</span>
          ${role === 'b' && verifiedBy(src, x, d) ? `<span class="verified">Verified pair · ${esc(verifiedBy(src, x, d))}</span>` : ''}
          ${role === 'a' ? `<span class="facts">${factsHtml(x)}</span>` : `${diff > 0 ? `<span class="fo-save">You save <b data-count="${diff}" data-fmt="inr">${inr(diff)}</b> · ${pct}%</span>` : diff < 0 ? `<span class="fo-more">${inr(-diff)} more</span>` : ''}${storesHtml(x)}`}
        </figcaption></figure>`;
    return `<section class="faceoff rise" id="faceoff" aria-label="${esc(src.name)} compared with ${esc(s.name)}">
      ${side(src, 'a')}
      <div class="fo-mid">
        <div class="fo-score">${ring(d.score, v.label, 'big')}<em>${VERDICT[v.key] || v.label}</em></div>
        ${radar(src, d)}
        ${d.deltaE != null ? `<div class="sbar" aria-label="Colour gap ΔE ${d.deltaE.toFixed(1)}"><i style="background:${esc(src.hex)}"></i><i style="background:${esc(s.hex)}"></i><span>ΔE ${d.deltaE.toFixed(1)} · ${d.deltaE < 2 ? 'hard to tell apart' : d.deltaE < 5 ? 'close side by side' : 'visible difference'}</span></div>` : `<div class="sbar skin"><span>${d.skin.sharedCount} key ingredient${d.skin.sharedCount === 1 ? '' : 's'} in common</span></div>`}
        <ul class="fo-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        ${d.confidence.level !== 'high' ? `<p class="conf">${esc(d.confidence.note)}</p>` : ''}
      </div>
      ${side(s, 'b')}
    </section>`;
  }

  // The engine's verdict as a ring: the score fills it and counts up when it scrolls in.
  const ring = (score, label, cls) => `<div class="ring ${cls || ''}" style="--p:${Math.round(score)}" role="img" aria-label="${Math.round(score)}% match, ${esc(label)}"><b data-count="${Math.round(score)}">${Math.round(score)}</b><i>%</i></div>`;

  function dupeCard(src, d, i, bestValue, picked) {
    const s = d.shade;
    const v = S.verdict(d.score, d.deltaE, src.cat);
    const diff = src.price && s.price ? src.price - s.price : 0;
    const pct = src.price && s.price ? Math.round((diff / src.price) * 100) : 0;
    const mine = myVotes[src.id + '|' + s.id];
    const vc = d.votes || { up: 0, down: 0 };
    return `<article class="dupe ${picked ? 'picked' : ''}" style="--wash:${s.hex ? tint(s.hex, 0.84) : 'var(--sunk)'}">
      <button type="button" class="dpick" data-pick="${i}" aria-pressed="${picked}" aria-label="Compare ${esc(s.brand + ' ' + s.name)} with ${esc(src.name)}">
        <span class="dphoto">${s.image ? `<img src="${esc(photo(s, 480))}" alt="" loading="lazy" data-fallback>` : isSkin(s.cat) || !s.hex ? art(s.cat, s) : swatchImg(s, 'sw')}${s.hex ? `<i class="ddot" style="background:${esc(s.hex)}"></i>` : ''}${verifiedBy(src, s, d) ? '<span class="verified">Verified</span>' : ''}</span>
        <span class="dmeta">
          <span class="dby">${esc(s.brand)}</span>
          <b class="dname">${esc(s.name)}</b>
          <span class="dline">${inr(s.price)}${diff > 0 ? ` <em>−${pct}%</em>` : ''}${s.id === bestValue ? ' <small>Best value</small>' : ''}${s.origin === 'IN' ? ' <small>Indian</small>' : ''}</span>
        </span>
        <span class="dscore"><b>${Math.round(d.score)}</b><i>%</i><small>${esc(v.label)}</small></span>
      </button>
      ${votesOn ? `<div class="vote">Good match?
        <button type="button" data-vote="1" data-dupe="${esc(s.id)}" aria-pressed="${mine === 1}" ${mine ? 'disabled' : ''}>Yes${vc.up ? ' ' + vc.up : ''}</button>
        <button type="button" data-vote="-1" data-dupe="${esc(s.id)}" aria-pressed="${mine === -1}" ${mine ? 'disabled' : ''}>No${vc.down ? ' ' + vc.down : ''}</button></div>` : ''}
    </article>`;
  }

  // ---- hero compare slider ----
  // Hero pairs: international originals and Indian dupes that both have a real
  // product photo, strong matches with big savings, spread across categories and colours.
  const pairs = (() => {
    const out = [], want = { lipstick: 4, blush: 2, foundation: 2 };
    const cands = sources.filter((s) => s.image && s.price >= 450 && want[s.cat])
      .sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
    for (const src of cands) {
      if (!want[src.cat]) continue;
      const fam = S.colourFamily(src.hex, src.cat);
      if (out.some((p) => p.src.productId === src.productId || (p.src.cat === src.cat && S.colourFamily(p.src.hex, p.src.cat) === fam))) continue;
      const d = S.findDupes(src, shades, { community, cheaperOnly: true, origin: 'IN', limit: 3, minScore: 88 }).find((x) => x.shade.image && x.shade.price <= src.price * 0.6);
      if (!d || out.some((p) => p.dupe.productId === d.shade.productId)) continue;
      out.push({ src, dupe: d.shade, score: d.score });
      want[src.cat]--;
    }
    // Alternate categories so the slider doesn't show four lipsticks in a row.
    const by = (c) => out.filter((p) => p.src.cat === c);
    const mixed = [], lists = [by('lipstick'), by('blush'), by('foundation')];
    while (lists.some((l) => l.length)) for (const l of lists) if (l.length) mixed.push(l.shift());
    return mixed;
  })();
  let slide = 0, autoplay = !reduced, timer = null;
  const sideBg = (s) => (s.hex ? `radial-gradient(circle at 50% 38%, ${tint(s.hex, 0.82)}, ${tint(s.hex, 0.5)} 60%, ${tint(s.hex, 0.25)})` : `radial-gradient(circle at 50% 40%, #fff, ${pastel(s.brand)})`);
  const short = (x) => (x.length > 26 ? x.slice(0, 24) + '…' : x);

  function renderCompare() {
    const box = $('#compare');
    if (!box) return;
    if (!pairs.length) { box.hidden = true; return; }
    const p = pairs[slide];
    const save = p.src.price && p.dupe.price ? Math.round((1 - p.dupe.price / p.src.price) * 100) : 0;
    const side = (s) => `<div class="cmp-art">${s.image ? `<img class="cmp-photo" src="${esc(photo(s, 480))}" alt="${esc(s.brand + ' ' + s.name)}" data-fallback>` : art(s.cat, s)}</div>${s.hex ? `<span class="cmp-chip" style="background:${esc(s.hex)}" aria-hidden="true"></span>` : ''}`;
    const x = $('#cmpStage') ? $('#cmpStage').getAttribute('aria-valuenow') : 50;
    box.innerHTML = `
      <div class="cmp-stage" id="cmpStage" tabindex="0" role="slider" aria-label="Drag to compare ${esc(p.src.name)} with ${esc(p.dupe.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${x}" style="--x:${x}%; --a:${esc(tint(p.src.hex || '#F4D6D2', 0.78))}; --b:${esc(tint(p.dupe.hex || '#F4D6D2', 0.78))}">
        <div class="cmp-side cmp-a">${side(p.src)}<span class="cmp-tag">${esc(p.src.brand)} · ${inr(p.src.price)}</span></div>
        <div class="cmp-side cmp-b">${side(p.dupe)}<span class="cmp-tag">${esc(p.dupe.brand)} · ${inr(p.dupe.price)}</span></div>
        <div class="cmp-handle"><span></span></div>
      </div>
      <button type="button" class="cmp-card" data-shade="${esc(p.src.id)}">
        ${p.dupe.image ? `<img src="${esc(photo(p.dupe, 240))}" alt="" data-fallback>` : `<i style="background:${esc(p.dupe.hex || '#eee')}"></i>`}
        <span><small>The dupe</small><b>${esc(p.dupe.brand)} ${esc(short(p.dupe.name))}</b><em>${Math.round(p.score)}% match${save > 0 ? ` · ${save}% less` : ''}</em></span>
      </button>
      <div class="cmp-dots ${autoplay ? 'playing' : ''}">${pairs.map((q, i) => `<button type="button" data-slide="${i}" aria-label="${esc(q.src.brand + ' ' + q.src.name)}" aria-pressed="${i === slide}"></button>`).join('')}</div>`;
    if (!reduced && !$('#cmpStage').dataset.swept) sweep();
  }
  function setX(pct) {
    const st = $('#cmpStage');
    if (!st) return;
    const x = Math.max(4, Math.min(96, pct));
    st.style.setProperty('--x', x + '%');
    st.setAttribute('aria-valuenow', String(Math.round(x)));
  }
  function sweep() {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      setX(85 - 35 * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function startAuto() {
    clearInterval(timer);
    if (!autoplay || pairs.length < 2) return;
    timer = setInterval(() => {
      const box = $('#compare');
      if (box.matches(':hover') || box.contains(document.activeElement)) return;
      slide = (slide + 1) % pairs.length; renderCompare();
    }, 5200);
  }
  function stopAuto() { autoplay = false; clearInterval(timer); }
  let dragging = false;
  document.addEventListener('pointerdown', (e) => {
    const st = e.target.closest && e.target.closest('#cmpStage');
    if (!st) return;
    dragging = true; stopAuto();
    const r = st.getBoundingClientRect();
    setX(((e.clientX - r.left) / r.width) * 100);
  });
  document.addEventListener('pointermove', (e) => {
    if (dragging) {
      const st = $('#cmpStage'); const r = st.getBoundingClientRect();
      setX(((e.clientX - r.left) / r.width) * 100);
    }
    // A soft coral light follows the pointer across cards (mouse only).
    const card = e.pointerType === 'mouse' && e.target.closest ? e.target.closest('.dupe, .bpair, .tile') : null;
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
  });
  document.addEventListener('pointerup', () => { dragging = false; });
  document.addEventListener('keydown', (e) => {
    const st = e.target.closest && e.target.closest('#cmpStage');
    if (!st || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); stopAuto();
    setX(Number(st.getAttribute('aria-valuenow')) + (e.key === 'ArrowLeft' ? -5 : 5));
  });

  // ---- reel: a draggable, gently curved strip of original → dupe pairs ----
  const reelPicks = [];
  function renderReel() {
    for (const cat of ALL_CATS.map((c) => c.key)) {
      const list = sources.filter((s) => s.cat === cat && s.price > 1500);
      let n = 0;
      for (const src of list) {
        if (n >= (cat === 'lipstick' ? 6 : 3)) break;
        if (reelPicks.some((p) => p.src.productId === src.productId || (src.hex && p.src.hex && p.src.cat === cat && S.colourFamily(p.src.hex, cat) === S.colourFamily(src.hex, cat)))) continue;
        const d = S.findDupes(src, shades, { community, cheaperOnly: true, limit: 1, minScore: isSkin(cat) ? 62 : 84 })[0];
        if (d) { reelPicks.push({ src, dupe: d.shade, score: d.score }); n++; }
      }
    }
    const face = (s) => (s.hex && !isSkin(s.cat) ? `<span class="rs" style="--c:${esc(s.hex)}"></span>` : `<span class="rs plate" style="background-image:url(${PLATE[s.cat] || ''})"></span>`);
    const card = (p, copy) => {
      const save = p.src.price && p.dupe.price ? Math.round((1 - p.dupe.price / p.src.price) * 100) : 0;
      return `<button type="button" class="rcard" data-shade="${esc(p.src.id)}"${copy ? ' tabindex="-1"' : ''} aria-label="${esc(`${p.src.brand} ${p.src.name}, ${inr(p.src.price)}. Dupe: ${p.dupe.brand} ${p.dupe.name}, ${inr(p.dupe.price)}`)}">
        <span class="rtop">${[p.src, p.dupe].map((x) => (x.image ? `<span class="rph"><img src="${esc(photo(x, 240))}" alt="" loading="lazy" data-fallback>${x.hex ? `<i style="background:${esc(x.hex)}"></i>` : ''}</span>` : face(x))).join('')}</span>
        <span class="rtxt"><small>${esc(p.src.brand)} · <s>${inr(p.src.price)}</s></small><b>${esc(short(p.src.name))}</b>
        <small>→ ${esc(p.dupe.brand)} ${esc(short(p.dupe.name))}</small><em>${inr(p.dupe.price)}${save > 0 ? ` <i>−${save}%</i>` : ''}</em></span></button>`;
    };
    const track = $('#reelTrack');
    track.innerHTML = reelPicks.map(card).join('') + `<div class="reel-copy" aria-hidden="true">${reelPicks.map((p) => card(p, true)).join('')}</div>`;
    reelLoop();
  }
  // Drifts left on its own, follows a drag, coasts after release, and bends cards
  // away from the centre a little so it reads as a curved shelf.
  let reelX = 0, reelV = 0, reelDrag = null, reelMoved = 0, reelPaused = false;
  function reelLoop() {
    const track = $('#reelTrack'), view = $('#reel');
    if (!track || !view) return;
    const half = track.scrollWidth / 2;
    let last = performance.now();
    const cards = [...track.querySelectorAll('.rcard')];
    const frame = (t) => {
      const dt = Math.min(64, t - last); last = t;
      if (!reelDrag) {
        const drift = reduced || reelPaused || view.matches(':hover') || view.contains(document.activeElement) ? 0 : -0.03;
        reelV += (drift - reelV) * 0.04;
        reelX += reelV * dt;
      }
      if (reelX < -half) reelX += half; if (reelX > 0) reelX -= half;
      track.style.transform = `translate3d(${reelX}px,0,0)`;
      if (!reduced) {
        const mid = view.clientWidth / 2;
        for (const c of cards) {
          const r = c.offsetLeft + reelX + c.offsetWidth / 2 - mid;
          const k = Math.max(-1, Math.min(1, r / (mid + 200)));
          c.style.transform = `translateY(${(k * k * 18).toFixed(1)}px) rotate(${(k * 4).toFixed(2)}deg) scale(${(1 - k * k * 0.06).toFixed(3)})`;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    view.addEventListener('pointerdown', (e) => { reelDrag = { x: e.clientX, x0: reelX, t: performance.now() }; reelMoved = 0; reelV = 0; view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', (e) => {
      if (!reelDrag) return;
      const nx = reelDrag.x0 + (e.clientX - reelDrag.x);
      const now = performance.now();
      reelV = (nx - reelX) / Math.max(8, now - reelDrag.t); reelDrag.t = now;
      reelMoved += Math.abs(nx - reelX); reelX = nx;
    });
    const end = () => { reelDrag = null; };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
    // A drag is not a click.
    view.addEventListener('click', (e) => { if (reelMoved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);
    // Tabbing to a card brings it into view.
    view.addEventListener('focusin', (e) => {
      const c = e.target.closest && e.target.closest('.rcard');
      if (!c) return;
      const mid = view.clientWidth / 2;
      reelX = Math.min(0, mid - (c.offsetLeft + c.offsetWidth / 2));
    });
    $('#reelPause').addEventListener('click', (e) => {
      e.stopPropagation();
      reelPaused = !reelPaused;
      e.currentTarget.setAttribute('aria-pressed', String(reelPaused));
      e.currentTarget.textContent = reelPaused ? 'Play' : 'Pause';
    });
    view.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); reelX += e.key === 'ArrowLeft' ? 220 : -220; }
    });
  }

  // ---- grain ----
  function grain() {
    const c = $('#grain');
    if (!c || !c.getContext) return;
    c.width = 220; c.height = 220;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(220, 220);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    try {
      const div = document.createElement('div');
      div.className = 'grain';
      div.setAttribute('aria-hidden', 'true');
      div.style.backgroundImage = `url(${c.toDataURL()})`;
      div.style.backgroundSize = '220px';
      c.replaceWith(div);
    } catch (e) { /* keep the stretched canvas */ }
  }

  // ---- proof ----
  function renderProof() {
    const results = (CAT.benchmarks || []).map((p) => {
      const src = findShade(p.cat, p.src), dupe = findShade(p.cat, p.dupe);
      if (!src || !dupe) return null;
      const list = S.findDupes(src, shades, { limit: 5000, minScore: 0, perProduct: Infinity });
      const i = list.findIndex((d) => d.shade.id === dupe.id);
      const allowed = Math.max(p.rank, Math.ceil(list.length * 0.1));
      const score = i >= 0 ? list[i].score : 0;
      return { p, src, dupe, rank: i + 1, pool: list.length, pass: i >= 0 && i + 1 <= allowed && S.verdict(score, 0, p.cat).key !== 'vibe' };
    }).filter(Boolean);
    const found = results.filter((r) => r.pass).length;
    if (results.length) $('#proofTitle').innerHTML = `We found <em><b data-count="${found}">${found}</b> of ${results.length}</em> published dupes on our own.`;
    const sw = (s) => (s.hex ? `<i style="background:${esc(s.hex)}"></i>` : art(s.cat, s));
    $('#benchList').innerHTML = results.map((r) => `<button type="button" class="bpair ${r.pass ? '' : 'miss'}" data-shade="${esc(r.src.id)}">
      <span class="sw">${sw(r.src)}${sw(r.dupe)}</span>
      <span><b>${esc(r.src.brand)} ${esc(short(r.src.name))} → ${esc(r.dupe.brand)} ${esc(short(r.dupe.name))}</b><span>Paired by ${esc(r.p.source)}</span></span>
      <span class="res">#${r.rank} of ${r.pool}<small>${r.pass ? 'Found' : r.p.knownIssue ? 'Missed: chip colour' : 'Missed'}</small></span></button>`).join('');
    const C = [
      ['Colour', 'How far apart the swatches are (CIEDE2000), judged mostly on hue.'],
      ['Undertone', 'Warm, cool, neutral or olive. Brand’s word first, swatch second.'],
      ['Depth', 'How light or deep. Foundation uses Fair, Wheatish, Dusky and Deep.'],
      ['Finish', 'Matte to satin is a small jump. Matte to metallic isn’t.'],
      ['Payoff and formula', 'Colour per swipe. Bullet, crayon, liquid, cream or powder.'],
      ['Actives', 'Skincare: the same hero ingredient at a similar strength.'],
      ['What it does', 'Hydrating, barrier, soothing, exfoliating. Read from the ingredient list.'],
      ['Sun protection', 'Same UV filters, SPF and PA.'],
      ['Shoppers', 'Up when dupe sites or shoppers agree. Down when shoppers say no.'],
    ];
    if ($('#crit')) $('#crit').innerHTML = C.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('');
    $('#fine').innerHTML = `
      <p>Makeup labels: Dupe 88%+ with near-identical colour, Very similar 80%+, Similar 70%+. Skincare scores run lower, as on Skinsort: Dupe 85%+, Very similar 72%+, Similar 60%+.</p>
      <p>Shades and prices: Purplle. Prestige brands: our own swatch notes. Ingredients: INCIDecoder. Nykaa, Tira and Myntra block catalog reads, so we link to their search. Prices are a guide.</p>
      <p>Screens shift colour. Swatch it on your wrist before you buy.</p>`;
    $('#foot').textContent = `${shades.length.toLocaleString('en-IN')} shades and products · updated ${CAT.builtAt || ''}`;
  }

  // ---- explore by colour ----
  // Every shade in the category on one map: hue across, depth down. Hover to
  // read it, click to match it. Lines run from the picked shade to its dupes.
  let mapPts = [];
  function renderMap() {
    const sec = $('#explore');
    if (!sec) return;
    const sel = byId.get(state.shadeId);
    const cat = state.mapCat;
    const src = sel && sel.cat === cat ? sel : null;
    $('#mapCats').innerHTML = ALL_CATS.filter((c) => !isSkin(c.key)).map((c) => `<button type="button" data-mapcat="${c.key}" aria-pressed="${c.key === cat}">${c.label}</button>`).join('');
    renderMapSide(src, cat);
    $('#mapTitle').textContent = `Every ${ALL_CATS.find((c) => c.key === cat).label.toLowerCase()} shade, by colour`;
    const cv = $('#map');
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (!w) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const pool = shades.filter((s) => s.cat === cat && s.hex);
    const labs = pool.map((s) => S.lab(s.hex));
    const hues = labs.map((l) => { let x = S.hue(l); return x > 300 ? x - 360 : x; });
    // Scale to the 2nd-98th percentile so a few odd shades don't squash the rest; outliers sit on the edge.
    const pct = (arr, q) => { const v = [...arr].sort((x, y) => x - y); return v[Math.floor(q * (v.length - 1))]; };
    const hMin = pct(hues, 0.02), hMax = pct(hues, 0.98);
    const Ls = labs.map((l) => l[0]), lMin = pct(Ls, 0.02), lMax = pct(Ls, 0.98);
    const pad = 18;
    const fit = (v, lo, hi) => Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
    mapPts = pool.map((s, i) => ({ s, x: pad + fit(hues[i], hMin, hMax) * (w - pad * 2), y: pad + (1 - fit(Ls[i], lMin, lMax)) * (h - pad * 2) }));
    const dupeIds = src ? new Set(S.findDupes(src, shades, dupeOpts({ limit: 5 })).map((d) => d.shade.id)) : new Set();
    const me = src && mapPts.find((p) => p.s.id === src.id);
    for (const p of mapPts) {
      g.beginPath(); g.arc(p.x, p.y, isHighEnd(p.s) ? 4.4 : 3.2, 0, 7);
      g.fillStyle = p.s.hex; g.globalAlpha = dupeIds.size && !dupeIds.has(p.s.id) && p !== me ? 0.55 : 1; g.fill();
    }
    g.globalAlpha = 1;
    if (me) {
      for (const p of mapPts.filter((q) => dupeIds.has(q.s.id))) {
        g.beginPath(); g.moveTo(me.x, me.y); g.lineTo(p.x, p.y); g.strokeStyle = 'rgba(242,102,113,.7)'; g.lineWidth = 1.5; g.stroke();
        g.beginPath(); g.arc(p.x, p.y, 7, 0, 7); g.lineWidth = 2; g.strokeStyle = '#2B1519'; g.stroke();
      }
      g.beginPath(); g.arc(me.x, me.y, 10, 0, 7); g.lineWidth = 3; g.strokeStyle = '#F8F3A6'; g.stroke();
      g.beginPath(); g.arc(me.x, me.y, 13, 0, 7); g.lineWidth = 1.5; g.strokeStyle = '#2B1519'; g.stroke();
    }
  }
  function renderMapSide(src, cat) {
    const side = $('#mapSide');
    if (!src) {
      side.innerHTML = `<h3>Your shade</h3><p class="cite" style="margin:0">Click one of the bigger dots (high-end brands) to see its closest dupes here.</p>`;
      return;
    }
    const top = S.findDupes(src, shades, dupeOpts({ limit: 5 }));
    side.innerHTML = `<h3>Your shade</h3>
      <div class="me"><i style="background:${esc(src.hex)}"></i><div><b>${esc(src.name)}</b><span>${esc(src.brand)} · ${inr(src.price)}</span></div></div>
      <h3>Closest dupes</h3>
      ${top.map((d) => `<button type="button" class="mrow" data-goto="${esc(src.id)}">${pic(d.shade)}<div style="min-width:0"><b>${esc(d.shade.name)}</b><span>${esc(d.shade.brand)} · ${inr(d.shade.price)}</span></div><em>${Math.round(d.score)}%</em></button>`).join('') || '<p class="cite">Nothing close.</p>'}
      <button type="button" class="go" data-goto="${esc(src.id)}">See all dupes</button>`;
  }
  function nearest(e) {
    const cv = $('#map'); const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 14 * 14;
    for (const p of mapPts) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  }
  document.addEventListener('pointermove', (e) => {
    if (!e.target.closest || !e.target.closest('#map')) { const tip = $('#mapTip'); if (tip) tip.hidden = true; return; }
    const p = nearest(e), tip = $('#mapTip');
    if (!p) { tip.hidden = true; $('#map').style.cursor = 'default'; return; }
    tip.hidden = false;
    tip.style.left = p.x + 'px'; tip.style.top = p.y + 'px';
    tip.innerHTML = `<i style="background:${esc(p.s.hex)}"></i><b>${esc(p.s.name)}</b><span>${esc(p.s.brand)} · ${inr(p.s.price)}${p.s.origin === 'IN' ? ' · Indian' : ''}</span>`;
    $('#map').style.cursor = isHighEnd(p.s) ? 'pointer' : 'default';
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('#map')) return;
    const p = nearest(e);
    if (p && isHighEnd(p.s)) selectShade(p.s.id, false);
  });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderMap, 150); });

  // ---- selection ----
  function selectShade(id, scroll) {
    const s = byId.get(id);
    if (!s) return;
    state.shadeId = id; state.cat = s.cat; state.brand = s.brand; state.weights = {}; state.showAll = false; state.pick = 0;
    state.kind = isSkin(s.cat) ? 'skin' : 'makeup';
    if (!isSkin(s.cat)) state.mapCat = s.cat;
    if (document.startViewTransition && !reduced && state.started) document.startViewTransition(renderAll);
    else renderAll();
    state.started = true;
    loadVotes(id);
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed */ }
    if (scroll) $('#library').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  function renderAll() { renderShelf(); renderBrands(); renderLines(); renderMatch(); renderMap(); }

  // ---- plain-language search ----
  const EXAMPLES = ['MAC Candy Yum-Yum', 'Rare Beauty Hope', 'hot pink lipstick under ₹500', 'orange lipstick', 'Drunk Elephant Protini'];
  function runAsk(q) {
    const box = $('#askResults');
    if (!q.trim()) { box.innerHTML = ''; return; }
    const parsed = S.parseQuery(q);
    if (parsed.maxPrice) state.maxPrice = parsed.maxPrice;
    if (parsed.origin) state.dupeOrigin = parsed.origin;
    if (parsed.skin) state.skin = parsed.skin;
    const named = S.findNamedShade(q, sources) || S.findNamedShade(q, shades);
    if (named) { box.innerHTML = ''; selectShade(named.id, true); return; }
    // A colour or price search ("hot pink lipstick under ₹500") looks at every brand;
    // a name search sticks to the international shades you'd want a dupe for.
    const r = S.search(q, parsed.colour || parsed.maxPrice ? shades : sources, 8);
    box.innerHTML = `<div class="ask-panel"><h3>${r.results.length ? 'Pick one to match' : 'Nothing found. Try a brand or colour.'}</h3>
      <div class="mini-grid">${r.results.map(({ shade: s }) => `<button type="button" class="mini" data-shade="${esc(s.id)}">${pic(s, '', 120)}<span class="t"><b>${esc(s.name)}</b><span>${esc(s.brand)} · ${inr(s.price)}</span></span></button>`).join('')}</div></div>`;
  }

  // ---- AI stylist (served by /api/ask on the deployed site) ----
  async function askStylist() {
    const src = byId.get(state.shadeId);
    const out = $('#stylistOut'), btn = $('#askStylist');
    if (!src || !btn) return;
    const dupes = S.findDupes(src, shades, dupeOpts({ limit: 6 }));
    const pack = (s) => ({ brand: s.brand, line: s.line, shade: s.name, hex: s.hex || '#FFFFFF', undertone: s.undertone, finish: s.finish || s.texture, formula: s.formula || s.texture, payoff: s.payoff, price_inr: s.price, origin: s.origin });
    btn.disabled = true; out.textContent = 'Looking…';
    try {
      const r = await fetch('api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skin: state.skin || null, source: pack(src),
          candidates: dupes.map((d) => Object.assign(pack(d.shade), { match: Math.round(d.score), deltaE: d.deltaE == null ? null : Number(d.deltaE.toFixed(1)), compared: d.direction.join(', '), colour_confidence: d.confidence.level, scores: Object.fromEntries(Object.entries(d.scores).filter(([, v]) => v != null).map(([k, v]) => [k, Math.round(v)])) })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.answer) throw new Error(data.error || 'unavailable');
      out.textContent = data.answer;
    } catch (e) {
      const top = dupes[0];
      out.textContent = top
        ? `The stylist is offline here. Quick read: ${top.shade.brand} ${top.shade.name}, ${Math.round(top.score)}% match. ${S.explain(src, top.shade, top, state.skin).join(' ')}`
        : 'The stylist is offline here.';
    } finally { btn.disabled = false; }
  }

  // ---- shade peek: hover a dot to see the swatch and its closest cheaper dupe ----
  const peek = document.createElement('div');
  peek.id = 'peek'; peek.hidden = true;
  document.body.appendChild(peek);
  const peekCache = new Map();
  function showPeek(dot) {
    const s = byId.get(dot.dataset.shade);
    if (!s) return;
    if (!peekCache.has(s.id)) peekCache.set(s.id, S.findDupes(s, shades, { community, cheaperOnly: true, limit: 1, minScore: 70 })[0] || null);
    const d = peekCache.get(s.id);
    peek.innerHTML = `<div class="pk-sw">${swatchImg(s, 'sw')}</div>
      <b>${esc(s.name)}</b><span>${esc(s.undertone)} · ${esc(s.finish || '')} · ${inr(s.price)}</span>
      ${d ? `<div class="pk-d">${d.shade.image ? `<img src="${esc(photo(d.shade, 120))}" alt="">` : `<i style="background:${esc(d.shade.hex)}"></i>`}<span><b>${esc(d.shade.brand)} ${esc(short(d.shade.name))}</b>${Math.round(d.score)}% · ${inr(d.shade.price)}</span></div>` : '<div class="pk-d"><span>No cheaper twin yet</span></div>'}`;
    const r = dot.getBoundingClientRect();
    peek.hidden = false;
    const w = peek.offsetWidth;
    peek.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    peek.style.top = (r.top + window.scrollY - peek.offsetHeight - 10) + 'px';
  }
  document.addEventListener('pointerover', (e) => {
    const dot = e.target.closest && e.target.closest('.dot');
    if (dot && e.pointerType === 'mouse') showPeek(dot); else if (!dot) peek.hidden = true;
  });
  document.addEventListener('focusin', (e) => { if (e.target.classList && e.target.classList.contains('dot')) showPeek(e.target); else peek.hidden = true; });
  window.addEventListener('scroll', () => { peek.hidden = true; }, { passive: true });


  // ---- scoring tab: the engine, opened up ----
  const SEG = ['#F26671', '#C8404D', '#8E2F45', '#D98A5F', '#E9B07A', '#B35C77', '#6E3B4E', '#F2A3A9'];
  state.labW = {};
  state.labPair = null;
  function labPairs() {
    const out = [];
    if (current && current.all.length) {
      const d = current.all[Math.min(state.pick || 0, current.all.length - 1)];
      out.push({ src: current.src, cand: d.shade, label: 'Your face-off' });
    }
    for (const p of CAT.benchmarks || []) {
      const a = findShade(p.cat, p.src), b = findShade(p.cat, p.dupe);
      if (a && b) out.push({ src: a, cand: b, label: `Published pair · ${p.source}` });
    }
    return out;
  }
  function labScore(src, cand) {
    const skin = isSkin(src.cat);
    const base = skin ? S.SKIN_WEIGHTS[src.cat] : S.WEIGHTS[src.cat];
    const w = Object.assign({}, base, state.labW);
    const r = (skin ? S.compareSkin : S.compare)(src, cand, { community, weights: w });
    const used = (skin ? S.SKIN_CRITERIA : S.CRITERIA).filter(([k]) => k !== 'community' && r.scores[k] != null);
    const wsum = used.reduce((t, [k]) => t + (w[k] || 0), 0) || 1;
    const rows = used.map(([k, label], i) => ({ k, label, s: r.scores[k], w: w[k] || 0, base: base[k] || 0, pts: (r.scores[k] * (w[k] || 0)) / wsum, color: SEG[i % SEG.length] }));
    const raw = rows.reduce((t, x) => t + x.pts, 0);
    return { r, rows, raw, w, skin };
  }
  function renderScore() {
    const pairs = labPairs();
    if (!pairs.length) return;
    const pi = Math.min(state.labPair ?? 0, pairs.length - 1);
    const { src, cand } = pairs[pi];
    const { rows } = labScore(src, cand);
    const mini = (x, role) => `<figure class="lab-p"><span class="lab-ph" style="--wash:${x.hex ? tint(x.hex, 0.8) : 'var(--sunk)'}">${x.image ? `<img src="${esc(photo(x, 240))}" alt="" data-fallback>` : x.hex ? `<i style="background:${esc(x.hex)}"></i>` : art(x.cat, x)}</span><figcaption><small>${role}</small><b>${esc(x.brand)}</b><span>${esc(x.name)}</span></figcaption></figure>`;
    $('#lab').innerHTML = `
      <div class="lab-top">
        <label class="lab-pick">Compare <select id="labPick">${pairs.map((p, i) => `<option value="${i}" ${i === pi ? 'selected' : ''}>${esc(`${p.src.brand} ${p.src.name} → ${p.cand.brand} ${p.cand.name}`)} (${esc(p.label)})</option>`).join('')}</select></label>
        <button type="button" class="pill" id="labReset">Reset weights</button>
      </div>
      <div class="lab-grid">
        <div class="lab-pairbox">${mini(src, 'Original')}<span class="lab-vs">vs</span>${mini(cand, 'Dupe')}</div>
        <div class="lab-total"><div class="ring big" id="labRing" style="--p:0"><b id="labNum">0</b><i>%</i></div><em id="labVerdict"></em></div>
        <div class="lab-scale" aria-hidden="true"><span class="sc-track" style="${isSkin(src.cat) ? 'background:linear-gradient(90deg, var(--sunk) 0 60%, color-mix(in srgb, var(--coral) 45%, var(--sunk)) 60% 72%, var(--coral) 72% 85%, var(--accent) 85%)' : ''}">${(isSkin(src.cat) ? [60, 72, 85] : [70, 80, 88]).map((n) => `<i style="left:${n}%"></i>`).join('')}</span><span class="sc-marker" id="labMarker"></span>
          ${(isSkin(src.cat) ? [60, 72, 85] : [70, 80, 88]).map((n) => `<span class="sc-lab" style="left:${n}%">${n}</span>`).join('')}</div>
      </div>
      <div class="stack" id="labStack" role="img"></div>
      <div class="lab-rows">${rows.map((x) => `
        <div class="lab-row" data-k="${x.k}">
          <span class="lr-key" style="background:${x.color}"></span>
          <span class="lr-name">${x.label}</span>
          <span class="lr-score"><span class="lr-bar"><span style="width:${x.s}%"></span></span><b class="lr-s">${Math.round(x.s)}</b></span>
          <label class="lr-w">weight <input type="range" min="0" max="50" value="${x.w}" data-lw="${x.k}" aria-label="${x.label} weight"><output class="lr-wv">${x.w}</output></label>
          <span class="lr-pts">+<b>0</b></span>
        </div>`).join('')}</div>
      <p class="lab-rules" id="labRules"></p>`;
    updateLab();
  }
  function updateLab() {
    const pairs = labPairs();
    const pi = Math.min(state.labPair ?? 0, pairs.length - 1);
    const { src, cand } = pairs[pi];
    const { r, rows, raw, w } = labScore(src, cand);
    const v = S.verdict(r.score, r.deltaE, src.cat);
    $('#labNum').textContent = Math.round(r.score);
    $('#labRing').style.setProperty('--p', Math.round(r.score));
    $('#labVerdict').textContent = VERDICT[v.key] || v.label;
    $('#labMarker').style.left = Math.max(0, Math.min(100, r.score)) + '%';
    $('#labStack').innerHTML = rows.map((x) => `<span style="width:${x.pts}%;background:${x.color}" title="${x.label}: +${x.pts.toFixed(1)}"></span>`).join('') + `<span class="gap" style="width:${Math.max(0, 100 - raw)}%"></span>`;
    $('#labStack').setAttribute('aria-label', `Score parts: ${rows.map((x) => `${x.label} ${x.pts.toFixed(1)}`).join(', ')}`);
    for (const x of rows) {
      const row = document.querySelector(`.lab-row[data-k="${x.k}"]`);
      if (!row) continue;
      row.querySelector('.lr-pts b').textContent = x.pts.toFixed(1);
      row.querySelector('.lr-wv').textContent = w[x.k] || 0;
      row.classList.toggle('changed', (w[x.k] || 0) !== x.base);
    }
    const notes = [];
    const diff = Math.round((r.score - raw) * 10) / 10;
    if (Math.abs(diff) >= 0.1) notes.push(diff > 0 ? `+${diff} because dupe sites or shoppers already pair these two.` : r.deltaE != null && r.deltaE > 14 ? `Capped at 60: the colours are too far apart for packaging or finish to make up for it.` : `${diff} because shoppers mostly said this isn’t a match.`);
    if (!isSkin(src.cat) && r.score >= 88 && r.deltaE >= 2.5) notes.push(`Scores like a dupe, but a dupe also needs a colour gap under ΔE 2.5 (this one is ${r.deltaE.toFixed(1)}), so it’s called Very similar.`);
    notes.push(`Weighted sum of the parts: ${raw.toFixed(1)}. Final score: ${r.score.toFixed(1)}.`);
    $('#labRules').textContent = notes.join(' ');
  }
  function renderWeights() {
    const cats = [...CATS.makeup, ...CATS.skin];
    $('#catWeights').innerHTML = cats.map((c) => {
      const skin = isSkin(c.key);
      const w = (skin ? S.SKIN_WEIGHTS : S.WEIGHTS)[c.key];
      const crit = (skin ? S.SKIN_CRITERIA : S.CRITERIA).filter(([k]) => k !== 'community' && w[k] != null && !(k === 'ingredients' && !skin));
      const sum = crit.reduce((t, [k]) => t + w[k], 0);
      return `<div class="cw"><b>${c.label}</b><span class="stack thin">${crit.map(([k, label], i) => `<span style="width:${(w[k] / sum) * 100}%;background:${SEG[i % SEG.length]}" title="${label} ${Math.round((w[k] / sum) * 100)}%"></span>`).join('')}</span>
        <span class="cw-legend">${crit.slice().sort((a, b) => w[b[0]] - w[a[0]]).slice(0, 3).map(([k, label]) => `${label} ${Math.round((w[k] / sum) * 100)}%`).join(' · ')}</span></div>`;
    }).join('');
  }
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.lw) { state.labW[t.dataset.lw] = Number(t.value); updateLab(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'labPick') { state.labPair = Number(e.target.value); state.labW = {}; renderScore(); }
  });

  // ---- tabs ----
  state.mapCat = 'blush';
  function setView(v) {
    state.view = v;
    document.body.dataset.view = v;
    document.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== v; });
    document.querySelectorAll('.tabs [data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
    moveThumb();
    if (v === 'map') renderMap();
    if (v === 'score') { state.labPair = 0; state.labW = {}; renderScore(); renderWeights(); animateIn($('#scoring')); animateIn($('#proof')); }
    window.scrollTo(0, 0);
  }
  // The white thumb slides to the selected tab.
  function moveThumb() {
    const nav = $('.tabs'), on = nav && nav.querySelector('[aria-selected="true"]');
    if (!on) return;
    nav.style.setProperty('--tx', on.offsetLeft + 'px');
    nav.style.setProperty('--tw', on.offsetWidth + 'px');
  }
  addEventListener('resize', moveThumb);

  // ---- motion: scores count up and cards rise in as they scroll into view ----
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-count]').forEach(countUp);
    }
  }, { threshold: 0.2 }) : null;
  function countUp(el) {
    const to = Number(el.dataset.count);
    if (reduced || !to) { el.textContent = el.dataset.fmt === 'inr' ? inr(to) : to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      const n = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = el.dataset.fmt === 'inr' ? inr(n) : n;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = el.dataset.fmt === 'inr' ? '₹0' : '0';
    requestAnimationFrame(step);
  }
  function animateIn(root) {
    if (!root) return;
    const items = root.querySelectorAll('.dupe, .bpair, .rise');
    if (!io || reduced) { items.forEach((x) => x.classList.add('in')); return; }
    items.forEach((x, i) => { x.style.setProperty('--d', (i % 6) * 70 + 'ms'); io.observe(x); });
    // Never leave anything hidden: whatever hasn't scrolled in after a few seconds just shows.
    setTimeout(() => items.forEach((x) => { if (!x.classList.contains('in')) { x.classList.add('in'); x.querySelectorAll('[data-count]').forEach((c) => { c.textContent = c.dataset.fmt === 'inr' ? inr(Number(c.dataset.count)) : c.dataset.count; }); } }), 4000);
  }

  // ---- events ----
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.view) { setView(t.dataset.view); return; }
    if (t.dataset.pick) {
      state.pick = Number(t.dataset.pick);
      const go = () => { renderMatch(); $('#faceoff').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); };
      if (document.startViewTransition && !reduced) document.startViewTransition(go); else go();
      return;
    }
    if (t.dataset.family) { state.family = t.dataset.family === 'All' ? null : t.dataset.family; renderLines(); return; }
    if (t.dataset.mapcat) { state.mapCat = t.dataset.mapcat; renderMap(); return; }
    if (t.dataset.goto) { setView('find'); selectShade(t.dataset.goto, true); return; }
    if (t.classList.contains('bpair')) { setView('find'); selectShade(t.dataset.shade, true); return; }
    if (t.dataset.slide) { slide = Number(t.dataset.slide); stopAuto(); renderCompare(); return; }
    if (t.dataset.kind) { const d = defaultFor(CATS[t.dataset.kind][0].key); if (d) selectShade(d.id, false); return; }
    if (t.dataset.cat) { const cur = byId.get(state.shadeId); const pick = cur && cur.cat === t.dataset.cat ? cur : defaultFor(t.dataset.cat); if (pick) selectShade(pick.id, true); return; }
    if (t.dataset.shade) { selectShade(t.dataset.shade, t.classList.contains('mini') || t.classList.contains('cmp-card') || t.classList.contains('rcard') || window.innerWidth < 960); return; }
    if (t.dataset.q) { $('#askInput').value = t.dataset.q; runAsk(t.dataset.q); return; }
    if (t.dataset.tone) { state.tone = t.dataset.tone; store.set('tone', state.tone); renderMatch(); renderCompare(); return; }
    if (t.id === 'cheaper') { state.cheaperOnly = !state.cheaperOnly; state.pick = 0; renderMatch(); return; }
    if (t.id === 'indianOnly') { state.dupeOrigin = state.dupeOrigin === 'IN' ? 'all' : 'IN'; state.pick = 0; renderMatch(); return; }
    if (t.id === 'clearMax') { state.maxPrice = 0; renderMatch(); return; }
    if (t.id === 'showAll') { state.showAll = true; renderMatch(); return; }
    if (t.id === 'askStylist') { askStylist(); return; }
    if (t.dataset.vote) { castVote(state.shadeId, t.dataset.dupe, Number(t.dataset.vote)); return; }
    if (t.id === 'labReset') { state.labW = {}; renderScore(); return; }
    if (t.id === 'resetW') { state.weights = {}; renderMatch(); $('#tune').open = true; }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.w) t.previousElementSibling.querySelector('span').textContent = t.value;
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'brand') { state.brand = t.value || null; renderLines(); }
    if (t.id === 'skin') { state.skin = t.value; store.set('skin', t.value); renderMatch(); }
    if (t.dataset && t.dataset.w) { state.weights[t.dataset.w] = Number(t.value); renderMatch(); $('#tune').open = true; }
  });
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); runAsk($('#askInput').value); });

  // ---- boot ----
  $('#examples').innerHTML = EXAMPLES.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('');
  grain();
  renderCompare(); startAuto();
  renderReel();
  renderProof();
  setView('find');
  // Headings rise in word by word (text nodes only, so <em> keeps its style).
  function splitWords(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = '1';
    let i = 0;
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const sp = document.createElement('span'); sp.className = 'w'; sp.style.setProperty('--i', i++); sp.textContent = part; frag.appendChild(sp);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      }
    };
    walk(el);
  }
  document.querySelectorAll('.shelf-head h2, .sc-head h2, .explore-head h2').forEach(splitWords);
  animateIn($('.shelf-wrap'));
  // The search box types out example shades while it's empty and not in use.
  (function typeHints() {
    const input = $('#askInput');
    if (!input || reduced) return;
    const hints = ['MAC Ruby Woo', 'Rare Beauty Hope', 'NARS Orgasm', 'Charlotte Tilbury Pillow Talk', 'Clinique Moisture Surge', 'red lipstick under ₹600'];
    let h = 0, c = 0, dir = 1;
    setInterval(() => {
      if (document.activeElement === input || input.value) return;
      const word = hints[h];
      c += dir;
      if (c > word.length + 12) dir = -1;
      if (c <= 0) { dir = 1; c = 0; h = (h + 1) % hints.length; }
      input.placeholder = 'Try ' + word.slice(0, Math.max(0, Math.min(c, word.length)));
    }, 70);
  })();
  // The search button leans toward the pointer a little.
  (function magnet() {
    const btn = $('.ask button');
    if (!btn || reduced) return;
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < 90;
      btn.style.transform = near ? `translate(${(dx * 0.12).toFixed(1)}px, ${(dy * 0.18).toFixed(1)}px)` : '';
    }, { passive: true });
  })();
  const fromHash = byId.get(decodeURIComponent((location.hash || '').slice(1)));
  const start = fromHash && isHighEnd(fromHash) ? fromHash : defaultFor('blush');
  if (start) selectShade(start.id, false); else renderAll();
})();
