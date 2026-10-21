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
        formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff, size: s.size || p.size,
      });
      shades.push(row);
      byId.set(row.id, row);
    }
  }
  // You pick the shade you love from international brands; dupes come from everyone.
  const sources = shades.filter((s) => s.origin !== 'IN');

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
    cat: 'blush', brand: null, showAll: false,
    shadeId: null, cheaperOnly: false, maxPrice: 0, dupeOrigin: 'all', skin: store.get('skin', ''),
    weights: {},
  };
  // Findation-style confirmations: { [srcId]: { [dupeId]: {up, down} } }, null when votes are off.
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
    const v = ((votes[srcId] = votes[srcId] || {})[dupeId] = (votes[srcId] || {})[dupeId] || { up: 0, down: 0 });
    v[vote > 0 ? 'up' : 'down']++;
    renderMatch();
    try { await fetch('api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ src: srcId, dupe: dupeId, vote }) }); } catch (e) { /* offline */ }
  }

  function defaultShade() {
    return shades.find((s) => s.brand === 'Rare Beauty' && s.name === 'Hope') || shades.find((s) => s.cat === 'blush') || shades[0];
  }

  // ---- library ----
  function renderTabs() {
    const counts = {};
    for (const s of sources) counts[s.cat] = (counts[s.cat] || 0) + 1;
    $('#tabs').innerHTML = CATS.map((c) => `<button type="button" data-cat="${c.key}" aria-pressed="${state.cat === c.key}">${c.label}<small>${counts[c.key] || 0} shades</small></button>`).join('');
  }

  function brandsFor(cat) {
    const m = new Set();
    for (const p of CAT.products) if (p.cat === cat && p.origin !== 'IN') m.add(p.brand);
    return [...m].sort((a, b) => a.localeCompare(b));
  }

  function renderBrands() {
    const list = brandsFor(state.cat);
    if (state.brand && !list.includes(state.brand)) state.brand = null;
    $('#brand').innerHTML = `<option value="">Pick a brand</option>`
      + list.map((b) => `<option value="${esc(b)}" ${state.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('');
  }

  function renderLines() {
    const el = $('#lines');
    if (!state.brand) {
      el.innerHTML = '';
      return;
    }
    const ps = CAT.products.filter((p) => p.cat === state.cat && p.brand === state.brand && p.origin !== 'IN');
    el.innerHTML = ps.map((p) => {
      const price = p.shades.map((s) => s.price).filter(Boolean);
      const lo = Math.min(...price), hi = Math.max(...price);
      const priceTxt = price.length ? (lo === hi ? inr(lo) : `${inr(lo)}–${inr(hi)}`) : '';
      return `<div class="line"><h4>${esc(p.line)} <span>${priceTxt}</span></h4>
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
    const bits = [`${s.undertone} undertone`, s.cat === 'foundation' ? S.depthLabel(s.hex).toLowerCase() + ' depth' : null, s.finish, s.formula,
      `${payoffWord(s).toLowerCase()} ${s.cat === 'foundation' ? 'coverage' : 'payoff'}`].filter(Boolean);
    return esc(bits.join(' · '));
  }

  function buyLinks(s) {
    return (s.where || []).map((w) => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.store)}</a>`).join('');
  }

  function renderMatch() {
    const el = $('#match');
    const src = byId.get(state.shadeId);
    if (!src) { el.innerHTML = '<div class="empty">Pick a shade to see its dupes.</div>'; return; }

    const opts = {
      community, votes: votesFor, weights: state.weights, cheaperOnly: state.cheaperOnly,
      maxPrice: state.maxPrice || 0, origin: state.dupeOrigin, limit: 10, minScore: 50,
    };
    const all = S.findDupes(src, shades, opts);
    // Best value: the lowest price per gram/ml among the strong matches.
    // Only compare like with like: grams with grams, ml with ml (the original's unit when it has one).
    const unit = (S.unitPrice(src) || {}).unit || 'g';
    const strong = all.filter((d) => d.score >= 80).map((d) => ({ d, u: S.unitPrice(d.shade) })).filter((x) => x.u && x.u.unit === unit);
    const bestValue = strong.length > 1 ? strong.sort((a, b) => a.u.value - b.u.value)[0].d.shade.id : null;
    const dupes = state.showAll ? all : all.slice(0, 4);
    const pill = (id, on, label) => `<button type="button" class="pill" id="${id}" aria-pressed="${on}">${label}</button>`;

    el.innerHTML = `
      <div class="hero">
        ${swatchHtml(src)}
        <div>
          <div class="who">${esc(src.brand)} · ${esc(src.line)}</div>
          <h2>${esc(src.name)}</h2>
          <p class="facts">${facts(src)}</p>
          <p class="cost">${inr(src.price)}${src.size ? ` <span>${esc(src.size)}</span>` : ''}</p>
        </div>
      </div>

      <div class="filters">
        ${pill('cheaper', state.cheaperOnly, `Cheaper than ${inr(src.price)}`)}
        ${pill('indianOnly', state.dupeOrigin === 'IN', 'Indian brands')}
        ${state.maxPrice ? pill('clearMax', true, `Under ${inr(state.maxPrice)} ×`) : ''}
        ${src.cat !== 'foundation' ? `<select id="skin" aria-label="Your skin tone">
          <option value="">Your skin tone</option>
          ${['fair', 'light', 'wheatish', 'dusky', 'deep'].map((k) => `<option value="${k}" ${state.skin === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)} skin</option>`).join('')}
        </select>` : ''}
      </div>

      <div class="dupes">${dupes.length ? dupes.map((d, i) => dupeCard(src, d, i, bestValue)).join('') : '<div class="empty">Nothing close. Drop a filter.</div>'}</div>
      ${all.length > dupes.length ? `<button type="button" class="more" id="showAll">Show ${all.length - dupes.length} more</button>` : ''}

      <div class="extras">
        <div class="stylist">
          <button type="button" id="askStylist" ${all.length ? '' : 'disabled'}>Ask the stylist</button>
          <div class="out" id="stylistOut"></div>
        </div>
        <details class="tune" id="tune">
          <summary>Change what counts</summary>
          <div class="weights">${S.CRITERIA.map(([k, label]) => {
            const w = (state.weights[k] ?? S.WEIGHTS[src.cat][k]);
            return `<div class="field"><label for="w-${k}">${label} <span class="mono">${w}</span></label><input type="range" id="w-${k}" data-w="${k}" min="0" max="40" value="${w}"></div>`;
          }).join('')}<button type="button" id="resetW">Reset</button></div>
        </details>
      </div>`;
  }

  function dupeCard(src, d, i, bestValue) {
    const s = d.shade;
    const v = S.verdict(d.score, d.deltaE, src.cat);
    const u = S.unitPrice(s);
    const mine = myVotes[src.id + '|' + s.id];
    const vc = d.votes || { up: 0, down: 0 };
    const notes = S.explain(src, s, d, state.skin).slice(0, 3);
    const diff = src.price && s.price ? src.price - s.price : 0;
    const pct = src.price && s.price ? Math.round((diff / src.price) * 100) : 0;
    const bars = S.CRITERIA.filter(([k]) => k !== 'community' && d.scores[k] != null).map(([k, label]) => {
      const val = Math.round(d.scores[k]);
      return `<div class="bar">${label}<span>${val}</span><div class="track"><div class="fill ${val >= 85 ? 'hi' : ''}" style="width:${val}%"></div></div></div>`;
    }).join('');
    const where = s.where || [];
    const cite = d.cited ? `<p class="cite">${d.cited.url ? `<a href="${esc(d.cited.url)}" target="_blank" rel="noopener">${esc(d.cited.source)}</a>` : esc(d.cited.source[0].toUpperCase() + d.cited.source.slice(1))} picked this too.</p>` : '';
    return `<article class="dupe ${i === 0 && d.score >= 82 ? 'top' : ''}">
      <div class="split" role="img" aria-label="${esc(src.name)} next to ${esc(s.name)}"><i style="background:${esc(src.hex)}"></i><i style="background:${esc(s.hex)}"></i></div>
      <div class="body">
        <div class="head">
          <div>
            <h4>${esc(s.name)}</h4>
            <div class="by">${esc(s.brand)} · ${esc(s.line)}</div>
            <p class="dir">${d.direction.map(esc).join(' · ')}</p>
          </div>
          <div class="pct"><b>${Math.round(d.score)}%</b><span class="v-${v.key}">${v.label}</span></div>
        </div>
        <div class="price"><span class="now">${inr(s.price)}</span>${u ? `<span class="unit">${inr(u.value)}/${u.unit}</span>` : ''}${s.id === bestValue ? '<span class="value">Best value</span>' : ''}${diff > 0 ? `<span class="save">save ${pct}%</span>` : diff < 0 ? `<span class="more-cost">${inr(-diff)} more</span>` : ''}${s.origin === 'IN' ? '<span class="in">Indian brand</span>' : ''}</div>
        <ul class="notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        ${cite}
        ${d.confidence.level === 'low' ? `<p class="conf">${esc(d.confidence.note)}</p>` : ''}
        <div class="foot">
          ${where[0] ? `<a class="buy1" href="${esc(where[0].url)}" target="_blank" rel="noopener">Buy on ${esc(where[0].store)}</a>` : ''}
          ${where.slice(1).map((w) => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.store)}</a>`).join('')}
          ${votesOn ? `<span class="vote">Good match?
            <button type="button" data-vote="1" data-dupe="${esc(s.id)}" aria-pressed="${mine === 1}" ${mine ? 'disabled' : ''}>Yes${vc.up ? ' ' + vc.up : ''}</button>
            <button type="button" data-vote="-1" data-dupe="${esc(s.id)}" aria-pressed="${mine === -1}" ${mine ? 'disabled' : ''}>No${vc.down ? ' ' + vc.down : ''}</button></span>` : ''}
          <details class="why"><summary>Why ${Math.round(d.score)}%</summary><div class="bars">${bars}</div><p class="conf" style="color:var(--ink-2)">Colour gap ΔE ${d.deltaE.toFixed(1)}</p>${d.confidence.level === 'medium' ? `<p class="conf">${esc(d.confidence.note)}</p>` : ''}</details>
        </div>
      </div>
    </article>`;
  }

  // ---- selection ----
  function selectShade(id, scroll) {
    const s = byId.get(id);
    if (!s) return;
    state.shadeId = id; state.cat = s.cat; state.brand = s.brand; state.weights = {}; state.showAll = false;
    renderAll();
    loadVotes(id);
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed */ }
    if (scroll) $('#match').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderAll() {
    renderTabs();
    renderBrands(); renderLines(); renderMatch();
  }

  // ---- plain-language search ----
  const EXAMPLES = [
    'MAC Ruby Woo under ₹600',
    'warm nude matte lipstick',
    'foundation for dusky skin',
  ];
  function renderExamples() {
    $('#examples').innerHTML = EXAMPLES.map((e) => `<button type="button" data-q="${esc(e)}">${esc(e)}</button>`).join('');
  }

  function runAsk(q) {
    const box = $('#askResults');
    if (!q.trim()) { box.innerHTML = ''; return; }
    const named = S.findNamedShade(q, sources);
    const parsed = S.parseQuery(q);
    if (named) {
      if (parsed.maxPrice) { state.maxPrice = parsed.maxPrice; }
      if (parsed.origin) state.dupeOrigin = parsed.origin;
      if (parsed.skin) state.skin = parsed.skin;
      box.innerHTML = '';
      selectShade(named.id, true);
      return;
    }
    const r = S.search(q, sources, 12);
    const p = r.parsed;
    const bits = [p.cat, p.colour, p.finish, p.undertone && p.undertone + ' undertone', p.skin && p.skin + ' skin', p.maxPrice && 'under ' + inr(p.maxPrice), p.origin === 'IN' ? 'Indian brands' : p.origin === 'INTL' ? 'international brands' : ''].filter(Boolean);
    box.innerHTML = `<div class="ask-panel">
      <h3>${r.results.length ? 'Pick one' : 'No shades found. Try a brand or colour.'}</h3>
      ${bits.length ? `<div class="parsed">${esc(bits.join(' · '))}</div>` : ''}
      <div class="mini-grid">${r.results.map(({ shade: s }) => `<button type="button" class="mini" data-shade="${esc(s.id)}"><span class="dot" style="background:${esc(s.hex)};flex:none"></span><span class="t"><b>${esc(s.name)}</b><span>${esc(s.brand)} · ${inr(s.price)}</span></span></button>`).join('')}</div>
    </div>`;
  }

  // ---- AI stylist (served by /api/ask on the deployed site) ----
  async function askStylist() {
    const src = byId.get(state.shadeId);
    const out = $('#stylistOut'), btn = $('#askStylist');
    if (!src || !btn) return;
    const dupes = S.findDupes(src, shades, { community, votes: votesFor, weights: state.weights, cheaperOnly: state.cheaperOnly, maxPrice: state.maxPrice || 0, origin: state.dupeOrigin, limit: 6, minScore: 50 });
    const pack = (s) => ({ brand: s.brand, line: s.line, shade: s.name, hex: s.hex, undertone: s.undertone, finish: s.finish, formula: s.formula, payoff: s.payoff, price_inr: s.price, origin: s.origin });
    btn.disabled = true; out.textContent = 'Looking…';
    try {
      const r = await fetch('api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skin: state.skin || null,
          source: pack(src),
          candidates: dupes.map((d) => Object.assign(pack(d.shade), { match: Math.round(d.score), deltaE: Number(d.deltaE.toFixed(1)), compared: d.direction.join(', '), colour_confidence: d.confidence.level, scores: Object.fromEntries(Object.entries(d.scores).map(([k, v]) => [k, Math.round(v)])) })),
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

  // ---- method section ----
  function renderMethod() {
    const C = {
      colour: 'How far apart the swatches are (CIEDE2000). Under 2, you can\'t tell.',
      undertone: 'Warm, cool, neutral or olive. Brand\'s word first, swatch second.',
      depth: 'How light or deep. Foundation uses Fair, Wheatish, Dusky and Deep.',
      intensity: 'Bright or muted.',
      finish: 'Matte to satin is a small jump. Matte to metallic isn\'t.',
      payoff: 'Colour per swipe. Coverage, for foundation.',
      formula: 'Bullet, crayon, liquid, cream or powder.',
      ingredients: 'Skincare: how much of the formula overlaps. First ingredients count most.',
      community: 'Goes up when dupe sites or shoppers agree, down when shoppers say no.',
    };
    $('#crit').innerHTML = S.CRITERIA.map(([k, label]) => `<dt>${label}</dt><dd>${C[k]}</dd>`).join('');
    $('#fine').innerHTML = `
      <p>Dupe: 88% or more, and the colours are near-identical. Very similar: 80%+. Similar: 70%+.</p>
      <p>Shades and prices come from Purplle. Prestige brands use our own swatch notes and approximate ₹ prices. Nykaa, Tira and Myntra don't allow catalog reads, so we link to their search.</p>
      <p>Screens shift colour. Swatch it on your wrist before you buy.</p>`;
    $('#foot').textContent = `${shades.length.toLocaleString('en-IN')} shades · updated ${CAT.builtAt || ''}`;
  }

  // ---- events ----
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.cat) { state.cat = t.dataset.cat; state.brand = null; renderAll(); return; }
    if (t.dataset.shade) { selectShade(t.dataset.shade, t.classList.contains('mini') || window.innerWidth < 960); return; }
    if (t.dataset.q) { $('#askInput').value = t.dataset.q; runAsk(t.dataset.q); return; }
    if (t.id === 'cheaper') { state.cheaperOnly = !state.cheaperOnly; renderMatch(); return; }
    if (t.id === 'indianOnly') { state.dupeOrigin = state.dupeOrigin === 'IN' ? 'all' : 'IN'; renderMatch(); return; }
    if (t.id === 'clearMax') { state.maxPrice = 0; renderMatch(); return; }
    if (t.id === 'showAll') { state.showAll = true; renderMatch(); return; }
    if (t.id === 'askStylist') { askStylist(); return; }
    if (t.dataset.vote) { castVote(state.shadeId, t.dataset.dupe, Number(t.dataset.vote)); return; }
    if (t.id === 'resetW') { state.weights = {}; renderMatch(); $('#tune').open = true; }
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.w) { t.previousElementSibling.querySelector('span').textContent = t.value; }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'brand') { state.brand = t.value || null; renderLines(); }
    if (t.id === 'skin') { state.skin = t.value; store.set('skin', t.value); renderMatch(); }
    if (t.dataset && t.dataset.w) { state.weights[t.dataset.w] = Number(t.value); renderMatch(); $('#tune').open = true; }
  });
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); runAsk($('#askInput').value); });

  // ---- boot ----
  renderExamples();
  renderMethod();
  const fromHash = decodeURIComponent((location.hash || '').slice(1));
  const fromLink = byId.get(fromHash);
  const start = fromLink && fromLink.origin !== 'IN' ? fromLink : defaultShade();
  if (start) selectShade(start.id, false); else renderAll();
})();
