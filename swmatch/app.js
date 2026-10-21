// swmatch page logic: library picker, match card, plain-language search, AI stylist.
(function () {
  'use strict';
  const S = window.Swmatch;
  const CAT = window.SWMATCH_CATALOG || { products: [], community: [] };
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : '—');

  const CATS = [
    { key: 'lipstick', label: 'Lipstick' },
    { key: 'blush', label: 'Blush' },
    { key: 'foundation', label: 'Foundation' },
    { key: 'highlighter', label: 'Highlighter' },
  ];
  const PAYOFF_WORD = { 1: 'Sheer', 2: 'Light', 3: 'Medium', 4: 'High', 5: 'Intense' };
  const COVER_WORD = { 1: 'Sheer', 2: 'Light', 3: 'Medium', 4: 'Medium-full', 5: 'Full' };

  // ---- flatten catalog ----
  const shades = [];
  const byId = new Map();
  const products = new Map();
  for (const p of CAT.products) {
    products.set(p.id, p);
    for (const s of p.shades) {
      const row = Object.assign({}, s, {
        productId: p.id, brand: p.brand, line: p.line, cat: p.cat, origin: p.origin, source: p.source,
        formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff, size: p.size,
      });
      shades.push(row);
      byId.set(row.id, row);
    }
  }
  const citedShade = new Map();
  const citedLine = new Map();
  for (const c of CAT.community || []) {
    if (c.shades) { citedShade.set(c.shades.join('|'), c); citedShade.set([c.shades[1], c.shades[0]].join('|'), c); }
    if (c.lines) { citedLine.set(c.lines.join('|'), c); citedLine.set([c.lines[1], c.lines[0]].join('|'), c); }
  }
  // Line-level pairings only count for shades that are already close in colour.
  const community = (a, b) => {
    const direct = citedShade.get(a.id + '|' + b.id);
    if (direct) return direct;
    const line = citedLine.get(a.productId + '|' + b.productId);
    if (line && S.deltaE2000(S.lab(a.hex), S.lab(b.hex)) < 6) return line;
    return null;
  };

  // ---- state ----
  const store = {
    get(k, d) { try { const v = localStorage.getItem('swmatch:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('swmatch:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const state = {
    cat: 'blush', origin: 'all', brand: null, brandFilter: '',
    shadeId: null, cheaperOnly: false, maxPrice: 0, dupeOrigin: 'all', skin: store.get('skin', ''),
    weights: {},
  };

  function defaultShade() {
    return shades.find((s) => s.brand === 'Rare Beauty' && s.name === 'Hope') || shades.find((s) => s.cat === 'blush') || shades[0];
  }

  // ---- library ----
  function renderTabs() {
    const counts = {};
    for (const s of shades) counts[s.cat] = (counts[s.cat] || 0) + 1;
    $('#tabs').innerHTML = CATS.map((c) => `<button type="button" data-cat="${c.key}" aria-pressed="${state.cat === c.key}">${c.label}<small>${counts[c.key] || 0} shades</small></button>`).join('');
  }

  function brandsFor(cat) {
    const m = new Map();
    for (const p of CAT.products) {
      if (p.cat !== cat) continue;
      if (state.origin !== 'all' && p.origin !== state.origin) continue;
      const e = m.get(p.brand) || { brand: p.brand, origin: p.origin, n: 0 };
      e.n += p.shades.length; m.set(p.brand, e);
    }
    return [...m.values()].sort((a, b) => a.brand.localeCompare(b.brand));
  }

  function renderBrands() {
    const f = state.brandFilter.trim().toLowerCase();
    const list = brandsFor(state.cat).filter((b) => !f || b.brand.toLowerCase().includes(f));
    if (state.brand && !list.some((b) => b.brand === state.brand)) state.brand = null;
    $('#brands').innerHTML = list.length
      ? list.map((b) => `<button type="button" class="chip" data-brand="${esc(b.brand)}" aria-pressed="${state.brand === b.brand}">${esc(b.brand)}${b.origin === 'IN' ? '<span class="flag">IN</span>' : ''}</button>`).join('')
      : '<span class="eyebrow">No brands match that filter.</span>';
  }

  function renderLines() {
    const el = $('#lines');
    if (!state.brand) {
      el.innerHTML = '<div class="empty">Pick a brand to see its shades, or use the search above.</div>';
      return;
    }
    const ps = CAT.products.filter((p) => p.cat === state.cat && p.brand === state.brand);
    el.innerHTML = ps.map((p) => {
      const price = p.shades.map((s) => s.price).filter(Boolean);
      const lo = Math.min(...price), hi = Math.max(...price);
      const priceTxt = price.length ? (lo === hi ? inr(lo) : `${inr(lo)}–${inr(hi)}`) : '';
      return `<div class="line"><h4>${esc(p.line)}</h4>
        <div class="meta">${esc(p.finish)} · ${esc(p.formula)}${priceTxt ? ' · ' + priceTxt : ''}${p.size ? ' · ' + esc(p.size) : ''}</div>
        <div class="dots">${p.shades.map((s) => `<button type="button" class="dot" data-shade="${esc(s.id)}" title="${esc(s.name)}" aria-label="${esc(s.name)}" aria-pressed="${state.shadeId === s.id}" style="background:${esc(s.hex)}"></button>`).join('')}</div>
      </div>`;
    }).join('');
  }

  // ---- match card ----
  function swatchHtml(s, cls) {
    return `<div class="smear fin-${esc(s.finish)} ${cls || ''}" style="--c:${esc(s.hex)}" role="img" aria-label="${esc(s.name)} swatch, ${esc(s.finish)} finish"></div>`;
  }

  function payoffWord(s) { return (s.cat === 'foundation' ? COVER_WORD : PAYOFF_WORD)[s.payoff] || 'Medium'; }

  function facts(s) {
    const fam = S.colourFamily(s.hex, s.cat);
    const parts = [
      `<span class="fact"><b>${esc(s.undertone)}</b> undertone</span>`,
      s.cat === 'foundation' ? `<span class="fact"><b>${esc(S.depthLabel(s.hex))}</b> depth</span>` : `<span class="fact"><b>${esc(fam)}</b></span>`,
      `<span class="fact"><b>${esc(s.finish)}</b> finish</span>`,
      `<span class="fact"><b>${esc(payoffWord(s))}</b> ${s.cat === 'foundation' ? 'coverage' : 'payoff'}</span>`,
      `<span class="fact">${esc(s.formula)}</span>`,
      `<span class="fact"><b>${inr(s.price)}</b>${s.size ? ' / ' + esc(s.size) : ''}</span>`,
      `<span class="fact hex">${esc(s.hex)}</span>`,
    ];
    return parts.join('');
  }

  function buyLinks(s) {
    return (s.where || []).map((w) => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.store)}</a>`).join('');
  }

  function renderMatch() {
    const el = $('#match');
    const src = byId.get(state.shadeId);
    if (!src) { el.innerHTML = '<div class="empty">Pick a shade from the library to see its dupes.</div>'; return; }

    const opts = {
      community, weights: state.weights, cheaperOnly: state.cheaperOnly,
      maxPrice: state.maxPrice || 0, origin: state.dupeOrigin, limit: 10, minScore: 50,
    };
    const dupes = S.findDupes(src, shades, opts);
    const maxSeen = Math.max(500, ...shades.filter((s) => s.cat === src.cat).map((s) => s.price || 0));
    const sourceNote = src.source === 'purplle'
      ? `Swatch colour ${src.hexSource === 'image' ? 'read from' : 'from'} Purplle's listing.`
      : 'Swatch colour compiled from brand and reviewer swatches.';

    el.innerHTML = `
      <div class="hero">
        ${swatchHtml(src)}
        <div>
          <div class="eyebrow">${esc(CATS.find((c) => c.key === src.cat).label)} · ${src.origin === 'IN' ? 'Indian brand' : 'International brand'}</div>
          <h2>${esc(src.name)}</h2>
          <div class="who">${esc(src.brand)} · ${esc(src.line)}</div>
          <div class="facts">${facts(src)}</div>
          <div class="buy">${buyLinks(src)}</div>
        </div>
      </div>

      <div class="controls">
        <label class="toggle"><input type="checkbox" id="cheaper" ${state.cheaperOnly ? 'checked' : ''}> Only cheaper than ${inr(src.price)}</label>
        <div class="field grow">
          <label for="maxPrice">Max price: <span class="mono" id="maxPriceOut">${state.maxPrice ? inr(state.maxPrice) : 'any'}</span></label>
          <input type="range" id="maxPrice" min="0" max="${Math.ceil(maxSeen / 100) * 100}" step="100" value="${state.maxPrice || 0}">
        </div>
        <div class="field">
          <label for="dupeOrigin">Dupe brands</label>
          <select id="dupeOrigin">
            <option value="all" ${state.dupeOrigin === 'all' ? 'selected' : ''}>Indian + international</option>
            <option value="IN" ${state.dupeOrigin === 'IN' ? 'selected' : ''}>Indian only</option>
            <option value="INTL" ${state.dupeOrigin === 'INTL' ? 'selected' : ''}>International only</option>
          </select>
        </div>
        ${src.cat !== 'foundation' ? `<div class="field">
          <label for="skin">Your skin</label>
          <select id="skin">
            <option value="">Not set</option>
            ${['fair', 'light', 'wheatish', 'dusky', 'deep'].map((k) => `<option value="${k}" ${state.skin === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>

      <div class="summary">
        <h3>${dupes.length ? `${dupes.length} dupe${dupes.length > 1 ? 's' : ''} for ${esc(src.name)}` : 'No dupes with these filters'}</h3>
        <p>${esc(sourceNote)}</p>
      </div>

      <div class="dupes">${dupes.length ? dupes.map((d, i) => dupeCard(src, d, i)).join('') : '<div class="empty">Nothing scores 50% or more with these filters. Loosen the price limit or include international brands.</div>'}</div>

      <div class="stylist" id="stylist">
        <div class="row">
          <h3>Ask the AI stylist about these matches</h3>
          <button type="button" id="askStylist" ${dupes.length ? '' : 'disabled'}>Get a verdict</button>
        </div>
        <div class="out" id="stylistOut"></div>
      </div>

      <details class="tune" id="tune">
        <summary>Tune the matching engine</summary>
        <div class="weights">${S.CRITERIA.map(([k, label]) => {
          const w = (state.weights[k] ?? S.WEIGHTS[src.cat][k]);
          return `<div class="field"><label for="w-${k}">${label} <span class="mono">${w}</span></label><input type="range" id="w-${k}" data-w="${k}" min="0" max="40" value="${w}"></div>`;
        }).join('')}<button type="button" id="resetW">Reset to ${esc(CATS.find((c) => c.key === src.cat).label.toLowerCase())} defaults</button></div>
      </details>`;
  }

  function dupeCard(src, d, i) {
    const s = d.shade;
    const v = S.verdict(d.score);
    const notes = S.explain(src, s, d, state.skin);
    const diff = src.price && s.price ? src.price - s.price : 0;
    const pct = src.price && s.price ? Math.round((diff / src.price) * 100) : 0;
    const bars = S.CRITERIA.filter(([k]) => k !== 'community').map(([k, label]) => {
      const val = Math.round(d.scores[k]);
      return `<div class="bar">${label}<span>${val}</span><div class="track"><div class="fill ${val >= 85 ? 'hi' : ''}" style="width:${val}%"></div></div></div>`;
    }).join('');
    const cite = d.cited ? (d.cited.url ? `<a class="tag cite" href="${esc(d.cited.url)}" target="_blank" rel="noopener">Cited: ${esc(d.cited.source)}</a>` : `<span class="tag cite">Cited: ${esc(d.cited.source)}</span>`) : '';
    return `<article class="dupe ${i === 0 && d.score >= 82 ? 'top' : ''}">
      <div>
        <div class="split" role="img" aria-label="${esc(src.name)} next to ${esc(s.name)}"><i style="background:${esc(src.hex)}"></i><i style="background:${esc(s.hex)}"></i></div>
        <div class="split-cap"><span>Yours</span><span>Dupe</span></div>
      </div>
      <div style="min-width:0">
        <h4>${esc(s.name)}</h4>
        <div class="by">${esc(s.brand)} · ${esc(s.line)}</div>
        <div class="tags">
          <span class="tag v-${v.key}">${v.label}</span>
          ${s.origin === 'IN' ? '<span class="tag in">Indian brand</span>' : ''}
          <span class="tag">${esc(s.undertone)}</span><span class="tag">${esc(s.finish)}</span><span class="tag">${esc(s.formula)}</span>
          ${s.rating ? `<span class="tag">★ ${Number(s.rating).toFixed(1)} (${s.ratingCount})</span>` : ''}
          ${cite}
        </div>
        <div class="price"><span class="now">${inr(s.price)}</span>${s.size ? `<span class="by">${esc(s.size)}</span>` : ''}
          ${diff > 0 ? `<span class="save">Save ${inr(diff)} (${pct}%)</span>` : diff < 0 ? `<span class="more">${inr(-diff)} more</span>` : ''}</div>
        <div class="bars">${bars}</div>
        <ul class="notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="buy">${buyLinks(s)}</div>
      </div>
      <div class="score"><div class="ring" style="--p:${d.score}"><b>${Math.round(d.score)}</b></div><small>% match</small></div>
    </article>`;
  }

  // ---- selection ----
  function selectShade(id, scroll) {
    const s = byId.get(id);
    if (!s) return;
    state.shadeId = id; state.cat = s.cat; state.brand = s.brand; state.weights = {};
    if (state.origin !== 'all' && s.origin !== state.origin) state.origin = 'all';
    renderAll();
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed */ }
    if (scroll) $('#match').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderAll() {
    renderTabs();
    document.querySelectorAll('#originSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.origin)));
    renderBrands(); renderLines(); renderMatch();
  }

  // ---- plain-language search ----
  const EXAMPLES = [
    'dupe for Rare Beauty Hope',
    'MAC Ruby Woo dupe under ₹600',
    'warm nude matte lipstick under ₹800',
    'foundation for dusky skin with warm undertone',
    'peachy blush from an Indian brand',
    'champagne highlighter',
  ];
  function renderExamples() {
    $('#examples').innerHTML = EXAMPLES.map((e) => `<button type="button" data-q="${esc(e)}">${esc(e)}</button>`).join('');
  }

  function runAsk(q) {
    const box = $('#askResults');
    if (!q.trim()) { box.innerHTML = ''; return; }
    const named = S.findNamedShade(q, shades);
    const parsed = S.parseQuery(q);
    if (named) {
      if (parsed.maxPrice) { state.maxPrice = parsed.maxPrice; }
      if (parsed.origin) state.dupeOrigin = parsed.origin;
      if (parsed.skin) state.skin = parsed.skin;
      box.innerHTML = `<div class="ask-panel"><h3>Matching ${esc(named.brand)} ${esc(named.name)}</h3><div class="parsed">${parsed.maxPrice ? `Showing dupes under ${inr(parsed.maxPrice)}. ` : ''}Scroll down for the full match card.</div></div>`;
      selectShade(named.id, true);
      return;
    }
    const r = S.search(q, shades, 12);
    const p = r.parsed;
    const bits = [p.cat, p.colour, p.finish, p.undertone && p.undertone + ' undertone', p.skin && p.skin + ' skin', p.maxPrice && 'under ' + inr(p.maxPrice), p.origin === 'IN' ? 'Indian brands' : p.origin === 'INTL' ? 'international brands' : ''].filter(Boolean);
    box.innerHTML = `<div class="ask-panel">
      <h3>${r.results.length ? 'Closest shades' : 'No shades matched'}</h3>
      <div class="parsed">${bits.length ? 'Understood: ' + esc(bits.join(' · ')) + '. ' : ''}Tap a shade to see its dupes.</div>
      <div class="mini-grid">${r.results.map(({ shade: s }) => `<button type="button" class="mini" data-shade="${esc(s.id)}"><span class="dot" style="background:${esc(s.hex)};flex:none"></span><span class="t"><b>${esc(s.name)}</b><span>${esc(s.brand)} · ${inr(s.price)}</span></span></button>`).join('')}</div>
    </div>`;
  }

  // ---- AI stylist (served by /api/ask on the deployed site) ----
  async function askStylist() {
    const src = byId.get(state.shadeId);
    const out = $('#stylistOut'), btn = $('#askStylist');
    if (!src || !btn) return;
    const dupes = S.findDupes(src, shades, { community, weights: state.weights, cheaperOnly: state.cheaperOnly, maxPrice: state.maxPrice || 0, origin: state.dupeOrigin, limit: 6, minScore: 50 });
    const pack = (s) => ({ brand: s.brand, line: s.line, shade: s.name, hex: s.hex, undertone: s.undertone, finish: s.finish, formula: s.formula, payoff: s.payoff, price_inr: s.price, origin: s.origin });
    btn.disabled = true; out.textContent = 'Thinking about your shade…';
    try {
      const r = await fetch('api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skin: state.skin || null,
          source: pack(src),
          candidates: dupes.map((d) => Object.assign(pack(d.shade), { match: Math.round(d.score), deltaE: Number(d.deltaE.toFixed(1)), scores: Object.fromEntries(Object.entries(d.scores).map(([k, v]) => [k, Math.round(v)])) })),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.answer) throw new Error(data.error || 'unavailable');
      out.textContent = data.answer;
    } catch (e) {
      const top = dupes[0];
      out.textContent = top
        ? `The AI stylist runs on the deployed swmatch site, so here is the engine's own read instead.\n\nBest match: ${top.shade.brand} ${top.shade.name} at ${Math.round(top.score)}%. ${S.explain(src, top.shade, top, state.skin).join(' ')}`
        : 'The AI stylist is not available here.';
    } finally { btn.disabled = false; }
  }

  // ---- method section ----
  function renderMethod() {
    const C = {
      colour: 'CIEDE2000 colour distance between the two swatches, the standard used in the cosmetics and paint industries. Under 2 is invisible to most eyes; over 8 is a different shade.',
      undertone: 'Warm, cool, neutral or olive. Taken from the brand where it says (W/C/N codes, "golden", "olive"), otherwise read from the swatch hue.',
      depth: 'Lightness gap (L*). For foundation it is labelled in Indian complexion terms, from Fair and Wheatish to Dusky and Deep, and weighted heavily.',
      intensity: 'Chroma gap: is it as vivid as the original, or more muted and dusty?',
      finish: 'Matte, soft-matte, satin, dewy, glossy, shimmer or metallic, scored by sheen and sparkle so matte to satin is a small step and matte to metallic is a big one.',
      payoff: 'Pigmentation (or coverage for foundation): how much colour one swipe gives.',
      formula: 'Bullet, crayon, liquid, cream, stick, powder or baked. Similar textures score closer.',
      community: 'A bonus when dupe sites or Indian beauty editors already pair the two. It never lowers a score.',
    };
    const w = S.WEIGHTS;
    $('#crit').innerHTML = S.CRITERIA.map(([k, label]) => `<div><h3>${label}<span>L ${w.lipstick[k]} · B ${w.blush[k]} · F ${w.foundation[k]} · H ${w.highlighter[k]}</span></h3><p>${C[k]}</p></div>`).join('');
    const nP = CAT.products.filter((p) => p.source === 'purplle').length;
    $('#fine').innerHTML = `
      <p>Numbers on each card are the default weights per category (L lipstick, B blush, F foundation, H highlighter). Change them under "Tune the matching engine" on any match card.</p>
      <p><b>Where the data comes from.</b> ${nP ? `${nP} ranges, with their shade swatch colours, prices and ratings, come from Purplle's public catalog${CAT.sources.purplle ? ` (fetched ${esc(CAT.sources.purplle)})` : ''}.` : ''} Prestige and international ranges that Purplle doesn't stock (MAC, Charlotte Tilbury, NARS, Rare Beauty, Fenty Beauty, Huda Beauty, Estée Lauder and others) are compiled by hand from brand and reviewer swatches, with approximate Indian prices. Nykaa, Tira and Myntra don't allow automated catalog reads, so swmatch links to their search for each shade instead.</p>
      <p><b>Screens lie a little.</b> Swatch colours on a phone are close, not exact. Check a shade in natural light or on your inner wrist before you buy, and treat prices as a guide: sales on Nykaa and Purplle change them weekly.</p>`;
    $('#foot').textContent = `${shades.length} shades · ${CAT.products.length} ranges · catalog built ${CAT.builtAt || ''}`;
  }

  // ---- events ----
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.cat) { state.cat = t.dataset.cat; state.brand = null; renderAll(); return; }
    if (t.dataset.brand) { state.brand = state.brand === t.dataset.brand ? null : t.dataset.brand; renderBrands(); renderLines(); return; }
    if (t.dataset.shade) { selectShade(t.dataset.shade, t.classList.contains('mini') || window.innerWidth < 960); return; }
    if (t.dataset.q) { $('#askInput').value = t.dataset.q; runAsk(t.dataset.q); return; }
    if (t.closest('#originSeg') && t.dataset.v) { state.origin = t.dataset.v; renderAll(); return; }
    if (t.id === 'askStylist') { askStylist(); return; }
    if (t.id === 'resetW') { state.weights = {}; renderMatch(); $('#tune').open = true; }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'brandFilter') { state.brandFilter = t.value; renderBrands(); }
    if (t.id === 'maxPrice') { $('#maxPriceOut').textContent = Number(t.value) ? inr(Number(t.value)) : 'any'; }
    if (t.dataset && t.dataset.w) { t.previousElementSibling.querySelector('span').textContent = t.value; }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'cheaper') { state.cheaperOnly = t.checked; renderMatch(); }
    if (t.id === 'maxPrice') { state.maxPrice = Number(t.value); renderMatch(); }
    if (t.id === 'dupeOrigin') { state.dupeOrigin = t.value; renderMatch(); }
    if (t.id === 'skin') { state.skin = t.value; store.set('skin', t.value); renderMatch(); }
    if (t.dataset && t.dataset.w) { state.weights[t.dataset.w] = Number(t.value); renderMatch(); $('#tune').open = true; }
  });
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); runAsk($('#askInput').value); });

  // ---- boot ----
  renderExamples();
  renderMethod();
  const fromHash = decodeURIComponent((location.hash || '').slice(1));
  const start = byId.get(fromHash) || defaultShade();
  if (start) selectShade(start.id, false); else renderAll();
})();
