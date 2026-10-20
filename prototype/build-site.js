// Builds the standalone website in ../site from the claude.ai prototype.
// The cards, sound and copy are shared; the claude.ai-only parts (its
// database, downloads and comments) are swapped for plain web versions that
// talk to three small Vercel functions in site/api.
// Usage: node prototype/build-site.js
const fs = require('fs');
const path = require('path');

const src = __dirname;
const out = path.join(__dirname, '..', 'site');
fs.mkdirSync(path.join(out, 'deck'), { recursive: true });
fs.mkdirSync(path.join(out, 'print'), { recursive: true });

const copy = (from, to) => fs.copyFileSync(path.join(src, from), path.join(out, to || from));
['cards.js', 'sound.js', 'copy.js'].forEach((f) => copy(f));
['hearts', 'diamonds', 'clubs', 'spades'].forEach((f) => copy(`deck/${f}.js`));
fs.readdirSync(path.join(src, 'print')).forEach((f) => copy(`print/${f}`));
// Server functions, Vercel config, favicon and README live in site-extra.
const extra = path.join(src, 'site-extra');
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const from = path.join(dir, d.name), rel = path.relative(extra, from), to = path.join(out, rel);
    if (d.isDirectory()) { fs.mkdirSync(to, { recursive: true }); walk(from); } else fs.copyFileSync(from, to);
  });
})(extra);

let page = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const swap = (a, b) => {
  if (!page.includes(a)) throw new Error('build-site: anchor not found: ' + a.slice(0, 80));
  page = page.replace(a, b);
};

// The page's own head replaces the claude.ai skeleton.
swap('<title>A Tale of Two Cities</title>\n', '');
swap('<meta name="claude:viewport-fit-sides" content="cover">\n', '');

// Copy link uses the site's own address, and the address follows the card.
swap("    const ARTIFACT = 'https://claude.ai/artifact/UQW9ejggK1W4hsSihkDiDQ';", "    const ARTIFACT = location.origin + location.pathname;");
swap("      $('pos').textContent = `${all.indexOf(item) + 1} / ${all.length}`;\n      reveal(id);",
  "      $('pos').textContent = `${all.indexOf(item) + 1} / ${all.length}`;\n      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file view */ }\n      reveal(id);");
swap("'Link copied. It opens straight on this card for anyone you have shared the deck with.'", "'Link copied. It opens straight on this card.'");

// Downloads are ordinary downloads on the open web.
swap('    let dl = null;\n', `    const dl = {
      save: async ({ filename, data }) => {
        const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
        const a = document.createElement('a'); a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return { status: 'saved' };
      }
    };
`);

// Your turn gets an optional name.
swap('      <input id="pp-line" maxlength="90" placeholder="The hidden line, if you\'ve got one" aria-label="The hidden line">',
  '      <input id="pp-line" maxlength="90" placeholder="The hidden line, if you\'ve got one" aria-label="The hidden line">\n      <input id="pp-name" maxlength="30" placeholder="Your name (optional)" aria-label="Your name">');
swap('  .pp-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) auto;',
  '  .pp-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.8fr) auto;');

// A private feedback form replaces claude.ai comments.
swap('</div>\n\n<script src="cards.js"></script>', `  <dialog id="fb" aria-labelledby="fb-h">
    <form id="fb-form" class="fb">
      <span class="label">Local check</span>
      <h2 id="fb-h">What's off on <span id="fb-card"></span>?</h2>
      <p>Wrong bus colour? A joke only a tourist would make? Only the person who made the deck sees this.</p>
      <label class="field" for="fb-text">Your note<textarea id="fb-text" required minlength="3" maxlength="1000" rows="4" placeholder="Macha, BMTC buses haven't looked like that since 2009."></textarea></label>
      <label class="field" for="fb-contact">How to reach you (optional)<input id="fb-contact" maxlength="120" placeholder="Email, Instagram, carrier pigeon"></label>
      <div class="controls"><button type="submit" id="fb-send">Send it</button><button type="button" id="fb-cancel">Never mind</button></div>
      <p class="status" id="fb-status" role="status"></p>
    </form>
  </dialog>

</div>

<script src="cards.js"></script>`);
swap('  /* Toasts */', `  /* Local check dialog */
  dialog { background: var(--panel); color: var(--ivory); border: 1px solid var(--rule); border-radius: 3px; padding: 0; width: min(560px, calc(100vw - 32px)); }
  dialog::backdrop { background: rgba(10, 12, 18, 0.7); }
  .fb { display: grid; gap: 14px; padding: 24px; }
  .fb h2 { font-size: 28px; }
  textarea { font: inherit; font-size: 18px; color: var(--ivory); background: transparent; border: 1px solid var(--rule); border-radius: 2px; padding: 10px; resize: vertical; text-transform: none; letter-spacing: 0; }
  textarea:focus-visible { outline: none; border-color: var(--marigold); }

  /* Toasts */`);

// Replace the claude.ai feedback, shared data and visitor code.
const start = page.indexOf('    // ---------- polish: local check through comments ----------');
const tail = "    if (reduce) { $('b-print').setAttribute('aria-pressed', 'true'); $('print-row').hidden = false; }";
const end = page.indexOf(tail);
if (start < 0 || end < 0) throw new Error('build-site: shared-data block not found');
const between = page.slice(start, end);
const keepFrom = between.indexOf('    async function savePdfTo(');
const keepTo = between.indexOf('    // Your turn: each person');
const keep = between.slice(keepFrom, keepTo).replace("The PDFs are in the repo under prototype/print.", 'Try again in a moment.');
page = page.slice(0, start) + `    // ---------- local check: a private note to the maker ----------
    const fb = $('fb');
    $('b-flag').addEventListener('click', () => {
      $('fb-card').textContent = all.find((x) => x.id === state.id).title;
      $('fb-status').textContent = '';
      if (fb.showModal) fb.showModal(); else fb.setAttribute('open', '');
      $('fb-text').focus();
    });
    $('fb-cancel').addEventListener('click', () => (fb.close ? fb.close() : fb.removeAttribute('open')));
    $('fb-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      $('fb-send').disabled = true;
      try {
        await api('/api/feedback', { card: state.id, text: $('fb-text').value, contact: $('fb-contact').value });
        $('fb-form').reset();
        fb.close ? fb.close() : fb.removeAttribute('open');
        toast('Thanks. A local fact-checker owes you a filter coffee.');
      } catch (err) {
        $('fb-status').textContent = err.status === 429 ? 'Easy, tiger. Try again in a few minutes.' : 'That did not send. Try again in a moment.';
      }
      $('fb-send').disabled = false;
    });

    // ---------- shared bits: visitors and Your turn, through small server functions ----------
    const anon = (() => {
      let id = store.get('anon', null);
      if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); store.set('anon', id); }
      return id;
    })();
    async function api(url, body) {
      const r = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error('api'), { status: r.status, data });
      return data;
    }
    function logVisit() { /* counted once on load */ }
    api('/api/visit', { id: anon }).then((d) => {
      if (!d.count) return;
      $('vcount').textContent = d.count.toLocaleString('en-IN');
      $('vword').textContent = d.count === 1 ? 'visitor' : 'visitors';
      $('visitors').hidden = false;
    }).catch(() => {});

${keep}
    let pairs = [];
    function renderPairings() {
      const list = $('pp-list');
      if (!pairs.length) { list.innerHTML = '<li class="pp-empty">Nothing here yet. Silk Board × the BQE is taken, sorry.</li>'; return; }
      list.innerHTML = '';
      pairs.forEach((r) => {
        const li = document.createElement('li');
        const pair = document.createElement('span'); pair.className = 'pp-pair';
        const a = document.createElement('span'); a.textContent = r.blr;
        const x = document.createElement('span'); x.className = 'x'; x.textContent = '×';
        const b = document.createElement('span'); b.textContent = r.nyc;
        pair.append(a, x, b);
        const meta = document.createElement('span'); meta.className = 'pp-meta';
        meta.textContent = \`\${r.line ? \`“\${r.line}” · \` : ''}from \${r.name || 'someone with taste'}\`;
        const v = document.createElement('button'); v.type = 'button'; v.className = 'pp-vote';
        v.setAttribute('aria-pressed', String(!!r.mine));
        v.setAttribute('aria-label', \`Vote for \${r.blr} and \${r.nyc}, \${r.n} votes\`);
        v.textContent = \`\${r.mine ? 'Voted' : 'Vote'} · \${r.n}\`;
        v.addEventListener('click', () => vote(r.key));
        li.append(pair, meta, v);
        list.appendChild(li);
      });
    }
    const boardDown = 'The pairing board is taking a nap. Try again later.';
    api('/api/pairings?voter=' + encodeURIComponent(anon)).then((d) => { pairs = d.items || []; renderPairings(); }).catch(() => { $('pp-status').textContent = boardDown; });
    async function vote(key) {
      try { const d = await api('/api/pairings', { action: 'vote', voter: anon, key }); pairs = d.items || pairs; renderPairings(); }
      catch (err) { $('pp-status').textContent = err.status === 429 ? 'Slow down, democracy takes a minute.' : 'That vote did not stick. Try again.'; }
    }
    $('pp-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { action: 'add', voter: anon, blr: $('pp-blr').value, nyc: $('pp-nyc').value, line: $('pp-line').value, name: $('pp-name').value };
      try {
        const d = await api('/api/pairings', body);
        pairs = d.items || pairs; renderPairings();
        $('pp-form').reset();
        $('pp-status').textContent = 'Added. May the votes be kind.';
      } catch (err) {
        $('pp-status').textContent = err.status === 409 ? 'Three each, so everyone gets a turn. Vote for someone else\\'s.'
          : err.status === 429 ? 'Easy. Try again in a minute.' : err.status === 400 ? 'Both sides need a name, and keep it short.' : boardDown;
      }
    });

` + page.slice(end);

// Wrap in a real document.
const fonts = page.match(/<link rel="preconnect"[\s\S]*?display=swap">\n/)[0];
page = page.replace(fonts, '');
const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>A Tale of Two Cities</title>
<meta name="description" content="52 playing cards about Bangalore and New York. For anyone whose phone shows two clocks.">
<meta name="theme-color" content="#12151f">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="A Tale of Two Cities">
<meta property="og:description" content="52 playing cards about Bangalore and New York. For anyone whose phone shows two clocks.">
<meta property="og:image" content="/og.png">
<meta name="twitter:card" content="summary_large_image">
${fonts}<style>html, body { margin: 0; } :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } img { max-width: 100%; }</style>
</head>
<body>
`;
page = head + page + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(out, 'index.html'), page);
console.log('Built', out);
