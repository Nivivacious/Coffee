// swmatch page logic: hero compare slider, ticker, category shelf, picker,
// match card, plain-language search, AI stylist, votes and the proof section.
(function () {
  'use strict';
  const S = window.Swmatch;
  const CAT = window.SWMATCH_CATALOG || { products: [], community: [], benchmarks: [] };
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (n) => (n ? '₹' + Math.round(n).toLocaleString('en-IN') : '—');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      });
      shades.push(row);
      byId.set(row.id, row);
    }
  }
  // You pick the one you love from international brands; dupes come from everyone.
  const sources = shades.filter((s) => s.origin !== 'IN');

  const citedShade = new Map(), citedLine = new Map();
  for (const c of CAT.community || []) {
    if (c.shades) { citedShade.set(c.shades.join('|'), c); citedShade.set([c.shades[1], c.shades[0]].join('|'), c); }
    if (c.lines) { citedLine.set(c.lines.join('|'), c); citedLine.set([c.lines[1], c.lines[0]].join('|'), c); }
  }
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
    kind: 'all', cat: 'blush', brand: null, showAll: false,
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

  // ---- rendered shots (render.js), tinted with the real shade ----
  const R = window.SwRender;
  function shot(s, w, h, extra, seedFrom) {
    const url = R ? R.image(s, w, h, seedFrom) : null;
    const alt = esc(`${s.brand || ''} ${s.name || ''}`.trim());
    return url ? `<img src="${url}" alt="${alt}" width="${w / 2}" height="${h / 2}" ${extra || ''}>` : `<div class="ph" style="background:${R ? R.fallback(s) : '#1b1517'}" role="img" aria-label="${alt}"></div>`;
  }
  const short = (x) => (x.length > 26 ? x.slice(0, 24) + '…' : x);

  // ---- shelf ----
  const DEFAULTS = {
    lipstick: ['MAC', 'Ruby Woo'], blush: ['Rare Beauty', 'Hope'], foundation: ['MAC', 'NC42'], highlighter: ['Charlotte Tilbury', '4 Medium'],
    serum: ['The Ordinary', 'Niacinamide 10% + Zinc 1%'], moisturiser: ['Clinique', 'Moisture Surge 100H Auto-Replenishing Hydrator'],
    sunscreen: ['La Roche-Posay', 'Anthelios UVMune 400 Invisible Fluid SPF 50+'],
  };
  const findShade = (cat, [brand, name]) => { const n = String(name || '').toLowerCase(); return shades.find((s) => s.cat === cat && s.brand === brand && (s.name.toLowerCase() === n || s.name.toLowerCase().endsWith(' ' + n))); };
  const defaultFor = (cat) => findShade(cat, DEFAULTS[cat] || []) || sources.find((s) => s.cat === cat);

  function renderShelf() {
    document.querySelectorAll('#kind button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
    const counts = {};
    for (const s of shades) counts[s.cat] = (counts[s.cat] || 0) + 1;
    const sel = byId.get(state.shadeId);
    const list = state.kind === 'all' ? ALL_CATS : CATS[state.kind];
    $('#shelf').innerHTML = list.map((c) => {
      const show = sel && sel.cat === c.key ? sel : defaultFor(c.key);
      const unit = isSkin(c.key) ? 'formulas' : 'shades';
      return `<button type="button" class="card" data-cat="${c.key}" aria-pressed="${state.cat === c.key}">
        <div class="shot">${show ? shot(show, 640, 480, 'loading="lazy"') : ''}<em>${isSkin(c.key) ? 'Skincare' : 'Makeup'}</em></div>
        <div class="meta"><b>${c.label}</b><span>${(counts[c.key] || 0).toLocaleString('en-IN')} ${unit}</span></div></button>`;
    }).join('');
  }

  // ---- picker ----
  function brandsFor(cat) {
    const m = new Set();
    for (const p of CAT.products) if (p.cat === cat && p.origin !== 'IN') m.add(p.brand);
    return [...m].sort((a, b) => a.localeCompare(b));
  }
  function renderBrands() {
    const list = brandsFor(state.cat);
    if (state.brand && !list.includes(state.brand)) state.brand = null;
    $('#brand').innerHTML = `<option value="">Pick a brand</option>` + list.map((b) => `<option value="${esc(b)}" ${state.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('');
  }
  function renderLines() {
    const el = $('#lines');
    if (!state.brand) { el.innerHTML = ''; return; }
    const ps = CAT.products.filter((p) => p.cat === state.cat && p.brand === state.brand && p.origin !== 'IN');
    if (isSkin(state.cat)) {
      el.innerHTML = `<div class="line">${ps.map((p) => {
        const s = p.shades[0];
        return `<button type="button" class="prod" data-shade="${esc(s.id)}" aria-pressed="${state.shadeId === s.id}">${shot(Object.assign({ brand: p.brand, cat: p.cat }, s), 108, 84)}<span>${esc(p.line)}<small>${inr(s.price)} · ${esc(s.size || '')}</small></span></button>`;
      }).join('')}</div>`;
      return;
    }
    el.innerHTML = ps.map((p) => {
      const price = p.shades.map((s) => s.price).filter(Boolean);
      const lo = Math.min(...price), hi = Math.max(...price);
      const priceTxt = price.length ? (lo === hi ? inr(lo) : `${inr(lo)}–${inr(hi)}`) : '';
      return `<div class="line"><h4>${esc(p.line)}<span>${priceTxt}</span></h4><div class="dots">${p.shades.map((s) => `<button type="button" class="dot" data-shade="${esc(s.id)}" title="${esc(s.name)}" aria-label="${esc(s.name)}" aria-pressed="${state.shadeId === s.id}" style="background:${esc(s.hex)}"></button>`).join('')}</div></div>`;
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

  function renderMatch() {
    const el = $('#match');
    const src = byId.get(state.shadeId);
    if (!src) { el.innerHTML = '<div class="empty">Pick something you love to see its dupes.</div>'; return; }
    const all = S.findDupes(src, shades, dupeOpts());
    const dupes = state.showAll ? all : all.slice(0, 4);
    const unit = (S.unitPrice(src) || {}).unit || 'g';
    const strong = all.filter((d) => S.verdict(d.score, d.deltaE, src.cat).key !== 'vibe').map((d) => ({ d, u: S.unitPrice(d.shade) })).filter((x) => x.u && x.u.unit === unit);
    const bestValue = strong.length > 1 ? strong.sort((a, b) => a.u.value - b.u.value)[0].d.shade.id : null;
    const pill = (id, on, label) => `<button type="button" class="pill" id="${id}" aria-pressed="${on}">${label}</button>`;
    const crit = isSkin(src.cat) ? S.SKIN_CRITERIA : S.CRITERIA;
    const wts = isSkin(src.cat) ? S.SKIN_WEIGHTS[src.cat] : S.WEIGHTS[src.cat];

    el.innerHTML = `
      <div class="mhero">
        <div class="shot">${shot(src, 960, 720)}</div>
        <div class="info">
          <div class="who">${esc(src.brand)}${isSkin(src.cat) ? '' : ' · ' + esc(src.line)}</div>
          <h2>${esc(src.name)}</h2>
          <div class="facts">${factsHtml(src)}</div>
          <p class="cost">${inr(src.price)}${src.size ? ` <span>/ ${esc(src.size)}</span>` : ''}</p>
        </div>
      </div>
      <div class="filters">
        ${pill('cheaper', state.cheaperOnly, `Under ${inr(src.price)}`)}
        ${pill('indianOnly', state.dupeOrigin === 'IN', 'Indian brands')}
        ${state.maxPrice ? pill('clearMax', true, `Under ${inr(state.maxPrice)} ×`) : ''}
        ${['lipstick', 'blush'].includes(src.cat) ? `<select id="skin" aria-label="Your skin tone">
          <option value="">Your skin tone</option>
          ${['fair', 'light', 'wheatish', 'dusky', 'deep'].map((k) => `<option value="${k}" ${state.skin === k ? 'selected' : ''}>${k[0].toUpperCase() + k.slice(1)} skin</option>`).join('')}
        </select>` : ''}
        <span class="count">${all.length} match${all.length === 1 ? '' : 'es'}</span>
      </div>
      <div class="dupes">${dupes.length ? dupes.map((d, i) => dupeCard(src, d, i, bestValue)).join('') : '<div class="empty">Nothing close. Drop a filter.</div>'}</div>
      ${all.length > dupes.length ? `<button type="button" class="more" id="showAll">Show ${all.length - dupes.length} more</button>` : ''}
      <div class="extras">
        <div class="stylist"><button type="button" id="askStylist" ${all.length ? '' : 'disabled'}>Ask the stylist</button><div class="out" id="stylistOut"></div></div>
        <details class="tune" id="tune"><summary>Change what counts</summary>
          <div class="weights">${crit.filter(([k]) => wts[k] != null).map(([k, label]) => {
            const w = state.weights[k] ?? wts[k];
            return `<div class="field"><label for="w-${k}">${label} <span class="mono">${w}</span></label><input type="range" id="w-${k}" data-w="${k}" min="0" max="50" value="${w}"></div>`;
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
    const crit = isSkin(src.cat) ? S.SKIN_CRITERIA : S.CRITERIA;
    const bars = crit.filter(([k]) => k !== 'community' && d.scores[k] != null).map(([k, label]) => {
      const val = Math.round(d.scores[k]);
      return `<div class="bar">${label}<span>${val}</span><div class="track"><div class="fill ${val >= 85 ? 'hi' : ''}" style="width:${val}%"></div></div></div>`;
    }).join('');
    const where = s.where || [];
    const cite = d.cited ? `<p class="cite">${d.cited.url ? `<a href="${esc(d.cited.url)}" target="_blank" rel="noopener">${esc(d.cited.source)}</a>` : esc(d.cited.source[0].toUpperCase() + d.cited.source.slice(1))} picked this too.</p>` : '';
    const visual = `<div class="pair">${shot(src, 440, 340, 'loading="lazy"')}${shot(s, 440, 340, 'loading="lazy"', src)}<span class="tag l">Yours</span><span class="tag r">Dupe</span></div>`;
    const gap = d.deltaE != null ? `Colour gap ΔE ${d.deltaE.toFixed(1)}` : `${d.skin.sharedCount} ingredients in common`;
    return `<article class="dupe ${i === 0 && (v.key === 'twin' || v.key === 'close') ? 'top' : ''}">
      ${visual}
      <div class="dbody">
        <div class="head">
          <div style="min-width:0">
            <h4>${esc(s.name)}</h4>
            <div class="by">${esc(s.brand)}${isSkin(src.cat) ? '' : ' · ' + esc(s.line)}</div>
            <p class="dir">${d.direction.map(esc).join(' · ')}</p>
          </div>
          <div class="pct"><b>${Math.round(d.score)}%</b><span>${v.label}</span></div>
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
          <details class="why"><summary>Why ${Math.round(d.score)}%</summary><div class="bars">${bars}</div><p class="cite">${esc(gap)}${s.inciUrl ? ` · <a href="${esc(s.inciUrl)}" target="_blank" rel="noopener">Ingredient list</a>` : ''}</p>${d.confidence.level === 'medium' ? `<p class="conf">${esc(d.confidence.note)}</p>` : ''}</details>
        </div>
      </div>
    </article>`;
  }

  // ---- hero compare slider ----
  const FEATURED = [
    ['lipstick', ['MAC', 'Ruby Woo']], ['blush', ['Rare Beauty', 'Hope']], ['serum', ['The Ordinary', 'Niacinamide 10% + Zinc 1%']],
    ['blush', ['NARS', 'Orgasm']], ['lipstick', ['Charlotte Tilbury', 'Pillow Talk']], ['moisturiser', ['Clinique', 'Moisture Surge 100H Auto-Replenishing Hydrator']],
  ];
  const pairs = FEATURED.map(([cat, key]) => {
    const src = findShade(cat, key);
    if (!src) return null;
    const d = S.findDupes(src, shades, { community, cheaperOnly: true, limit: 1, minScore: 60 })[0];
    return d ? { src, dupe: d.shade, score: d.score } : null;
  }).filter(Boolean);
  let slide = 0, autoplay = !reduced, timer = null, liveA = null, liveB = null;

  function buildCompare() {
    const box = $('#compare');
    if (!pairs.length) { box.hidden = true; return; }
    box.innerHTML = `
      <div class="cmp-stage" id="cmpStage" tabindex="0" role="slider" aria-label="Drag to compare the original with its dupe" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" style="--x:50%">
        <div class="cmp-side cmp-a"><canvas id="cvA" aria-hidden="true"></canvas><div class="cmp-label" id="lbA"></div></div>
        <div class="cmp-side cmp-b"><canvas id="cvB" aria-hidden="true"></canvas><div class="cmp-label" id="lbB"></div></div>
        <div class="cmp-handle"></div><div class="cmp-knob">⟷</div>
        <div class="cmp-score" id="cmpScore"></div>
        <div class="cmp-dots">${pairs.map((_, i) => `<button type="button" data-slide="${i}" aria-label="Pair ${i + 1}"></button>`).join('')}</div>
      </div>`;
    liveA = R && R.live($('#cvA'));
    liveB = R && R.live($('#cvB'));
    renderCompare();
  }
  function renderCompare() {
    const p = pairs[slide];
    if (!p) return;
    const fill = (cv, live, s, seedFrom) => {
      if (live) { live.set(s, seedFrom); return; }
      const url = R && R.image(s, 1200, 520, seedFrom);
      if (url) cv.replaceWith(Object.assign(new Image(), { src: url, alt: '' }));
    };
    fill($('#cvA') || {}, liveA, p.src);
    fill($('#cvB') || {}, liveB, p.dupe, p.src);
    const save = p.src.price && p.dupe.price ? Math.round((1 - p.dupe.price / p.src.price) * 100) : 0;
    $('#lbA').innerHTML = `<small>Original</small><b>${esc(p.src.brand)} ${esc(short(p.src.name))}</b><span>${inr(p.src.price)}</span>`;
    $('#lbB').innerHTML = `<small>Dupe</small><b>${esc(p.dupe.brand)} ${esc(short(p.dupe.name))}</b><span>${inr(p.dupe.price)}</span>`;
    $('#cmpScore').innerHTML = `${Math.round(p.score)}% match${save > 0 ? ` <em>· ${save}% less</em>` : ''}`;
    document.querySelectorAll('.cmp-dots button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === slide)));
    $('#cmpStage').setAttribute('aria-label', `Drag to compare ${p.src.name} with ${p.dupe.name}`);
    if (!reduced) sweep();
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
    timer = setInterval(() => { slide = (slide + 1) % pairs.length; renderCompare(); }, 5200);
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
    // Gentle tilt on dupe cards, mouse only.
    const card = !reduced && e.pointerType === 'mouse' && e.target.closest ? e.target.closest('.dupe') : null;
    document.querySelectorAll('.dupe[data-tilt]').forEach((c) => { if (c !== card) { c.style.transform = ''; c.removeAttribute('data-tilt'); } });
    if (card) {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 2.2).toFixed(2)}deg) rotateY(${(x * 2.2).toFixed(2)}deg) translateY(-2px)`;
      card.setAttribute('data-tilt', '');
    }
  });
  document.addEventListener('pointerup', () => { dragging = false; });
  document.addEventListener('keydown', (e) => {
    const st = e.target.closest && e.target.closest('#cmpStage');
    if (!st || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); stopAuto();
    setX(Number(st.getAttribute('aria-valuenow')) + (e.key === 'ArrowLeft' ? -5 : 5));
  });

  // ---- ticker ----
  function renderTicker() {
    const picks = [];
    for (const cat of ALL_CATS.map((c) => c.key)) {
      const list = sources.filter((s) => s.cat === cat && s.price > 1500);
      let n = 0;
      for (const src of list) {
        if (n >= 3) break;
        if (picks.some((p) => p.src.productId === src.productId)) continue;
        const d = S.findDupes(src, shades, { community, cheaperOnly: true, limit: 1, minScore: isSkin(cat) ? 62 : 84 })[0];
        if (d) { picks.push({ src, dupe: d.shade }); n++; }
      }
    }
    const dot = (s) => `<i style="background:${s.hex ? esc(s.hex) : s.cat === 'serum' ? '#C98A3E' : '#EDE6DF'}"></i>`;
    const item = (p) => `<span class="mq">${dot(p.src)}${esc(p.src.brand)} ${esc(short(p.src.name))} <s>${inr(p.src.price)}</s> → ${dot(p.dupe)}${esc(p.dupe.brand)} ${esc(short(p.dupe.name))} <s>${inr(p.dupe.price)}</s></span>`;
    const html = picks.map(item).join('');
    $('#ticker').innerHTML = html + html;
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
    if (results.length) $('#bignum').textContent = `${found}/${results.length}`;
    const sw = (s, from) => shot(s, 128, 96, 'loading="lazy"', from);
    $('#benchList').innerHTML = results.map((r) => `<button type="button" class="bpair ${r.pass ? '' : 'miss'}" data-shade="${esc(r.src.id)}">
      <span class="sw">${sw(r.src)}${sw(r.dupe, r.src)}</span>
      <span><b>${esc(r.src.brand)} ${esc(short(r.src.name))} → ${esc(r.dupe.brand)} ${esc(short(r.dupe.name))}</b><span>Paired by ${esc(r.p.source)}</span></span>
      <span class="res">#${r.rank} of ${r.pool}<small>${r.pass ? 'Found' : r.p.knownIssue ? 'Missed: chip colour' : 'Missed'}</small></span></button>`).join('');
    const C = [
      ['Colour', 'How far apart the swatches are (CIEDE2000), judged mostly on hue.'],
      ['Undertone', 'Warm, cool, neutral or olive. Brand\'s word first, swatch second.'],
      ['Depth', 'How light or deep. Foundation uses Fair, Wheatish, Dusky and Deep.'],
      ['Finish', 'Matte to satin is a small jump. Matte to metallic isn\'t.'],
      ['Payoff and formula', 'Colour per swipe. Bullet, crayon, liquid, cream or powder.'],
      ['Actives', 'Skincare: the same hero ingredient at a similar strength.'],
      ['What it does', 'Hydrating, barrier, soothing, exfoliating. Read from the ingredient list.'],
      ['Sun protection', 'Same UV filters, SPF and PA.'],
      ['Shoppers', 'Up when dupe sites or shoppers agree. Down when shoppers say no.'],
    ];
    $('#crit').innerHTML = C.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('');
    const nSkin = shades.filter((x) => isSkin(x.cat)).length;
    $('#badgeText').textContent = `${(shades.length - nSkin).toLocaleString('en-IN')} shades · ${nSkin} formulas · priced in ₹`;
    $('#fine').innerHTML = `
      <p>Makeup labels: Dupe 88%+ with near-identical colour, Very similar 80%+, Similar 70%+. Skincare scores run lower, as on Skinsort: Dupe 85%+, Very similar 72%+, Similar 60%+.</p>
      <p>Shades and prices: Purplle. Prestige brands: our own swatch notes. Ingredients: INCIDecoder. Nykaa, Tira and Myntra block catalog reads, so we link to their search. Prices are a guide.</p>
      <p>Screens shift colour. Swatch it on your wrist before you buy.</p>`;
    $('#foot').textContent = `Catalog updated ${CAT.builtAt || ''}. Prices are a guide.`;
  }

  // ---- selection ----
  function selectShade(id, scroll) {
    const s = byId.get(id);
    if (!s) return;
    state.shadeId = id; state.cat = s.cat; state.brand = s.brand; state.weights = {}; state.showAll = false;
    if (state.kind !== 'all') state.kind = isSkin(s.cat) ? 'skin' : 'makeup';
    renderAll();
    loadVotes(id);
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed */ }
    if (scroll) $('#counter').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  function renderAll() { renderShelf(); renderBrands(); renderLines(); renderMatch(); }

  // ---- plain-language search ----
  const EXAMPLES = ['MAC Ruby Woo', 'Rare Beauty Hope', 'The Ordinary Niacinamide', 'red lipstick under ₹600'];
  function runAsk(q) {
    const box = $('#askResults');
    if (!q.trim()) { box.innerHTML = ''; return; }
    const parsed = S.parseQuery(q);
    if (parsed.maxPrice) state.maxPrice = parsed.maxPrice;
    if (parsed.origin) state.dupeOrigin = parsed.origin;
    if (parsed.skin) state.skin = parsed.skin;
    const named = S.findNamedShade(q, sources);
    if (named) { box.innerHTML = ''; selectShade(named.id, true); return; }
    const r = S.search(q, sources, 8);
    box.innerHTML = `<div class="ask-panel"><h3>${r.results.length ? 'Pick one to match' : 'Nothing found. Try a brand or colour.'}</h3>
      <div class="mini-grid">${r.results.map(({ shade: s }) => `<button type="button" class="mini" data-shade="${esc(s.id)}">${shot(s, 104, 80)}<span class="t"><b>${esc(s.name)}</b><span>${esc(s.brand)} · ${inr(s.price)}</span></span></button>`).join('')}</div></div>`;
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

  // ---- events ----
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.slide) { slide = Number(t.dataset.slide); stopAuto(); renderCompare(); return; }
    if (t.dataset.kind) { state.kind = t.dataset.kind; renderShelf(); return; }
    if (t.dataset.cat) { const cur = byId.get(state.shadeId); const pick = cur && cur.cat === t.dataset.cat ? cur : defaultFor(t.dataset.cat); if (pick) selectShade(pick.id, true); return; }
    if (t.dataset.shade) { selectShade(t.dataset.shade, t.classList.contains('mini') || t.classList.contains('bpair') || window.innerWidth < 960); return; }
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
  buildCompare(); startAuto();
  renderTicker();
  renderProof();
  const fromHash = byId.get(decodeURIComponent((location.hash || '').slice(1)));
  const start = fromHash && fromHash.origin !== 'IN' ? fromHash : defaultFor('blush');
  if (start) selectShade(start.id, false); else renderAll();
})();
