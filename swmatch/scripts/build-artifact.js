// Bundles the site into one self-contained HTML body (scripts inlined, no
// <html>/<head> wrapper) for previewing as a single page.
//   node scripts/build-artifact.js <out.html> [--images <dir>] [--max 300]
// With --images, the product photos the page shows most (category tiles, then
// shades that turn up most often among top dupes) are downloaded into <dir>/img,
// the swatch textures are copied to <dir>/assets/tex, and every other shade
// falls back to its swatch. Hosts that block outside images need this.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const S = require('../engine.js');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const out = args[0];
if (!out) { console.error('usage: node scripts/build-artifact.js <out.html> [--images <dir>] [--max 300]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : d; };
const imgDir = opt('--images');
const max = Number(opt('--max', 300));

function loadCatalog() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data/catalog.js'), 'utf8'), ctx);
  return ctx.window.SWMATCH_CATALOG;
}

function pickImages(cat) {
  const shades = [];
  for (const p of cat.products) for (const s of p.shades) shades.push(Object.assign({}, s, { productId: p.id, brand: p.brand, cat: p.cat, origin: p.origin, formula: p.formula, finish: s.finish || p.finish, payoff: s.payoff || p.payoff, size: s.size || p.size }));
  const chosen = new Set();
  const seen = {};
  for (const s of [...shades].sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0))) {
    if (!s.image) continue;
    const l = seen[s.cat] || (seen[s.cat] = []);
    if (l.length < 3 && !l.includes(s.productId)) { l.push(s.productId); chosen.add(s.id); }
  }
  const hits = new Map();
  for (const src of shades.filter((s) => s.origin !== 'IN')) {
    S.findDupes(src, shades, { limit: 4, minScore: 60 }).forEach((d, i) => {
      if (d.shade.image) hits.set(d.shade.id, (hits.get(d.shade.id) || 0) + 4 - i);
    });
  }
  for (const [id] of [...hits].sort((a, b) => b[1] - a[1])) { if (chosen.size >= max) break; chosen.add(id); }
  return chosen;
}

// curl, so the download goes through whatever proxy the shell is set up for.
function download(url, file) {
  try { execFileSync('curl', ['-sfL', '--max-time', '20', '-o', file, url]); return true; } catch (e) { return false; }
}

(async () => {
  let catalogJs = fs.readFileSync(path.join(root, 'data/catalog.js'), 'utf8');
  const files = {};
  if (imgDir) {
    const cat = loadCatalog();
    const keep = pickImages(cat);
    fs.mkdirSync(path.join(imgDir, 'img'), { recursive: true });
    fs.mkdirSync(path.join(imgDir, 'assets/tex'), { recursive: true });
    // Product-level photos (ranges Purplle doesn't sell) are always kept.
    for (const p of cat.products) {
      if (!p.image) continue;
      const rel = `img/p-${p.id}.jpg`, file = path.join(imgDir, rel);
      if (fs.existsSync(file) || download(p.image, file)) { p.image = rel; files[rel] = file; } else p.image = null;
    }
    for (const p of cat.products) for (const s of p.shades) {
      if (!s.image) continue;
      if (!keep.has(s.id)) { s.image = null; continue; }
      const rel = `img/${s.id}.jpg`;
      const file = path.join(imgDir, rel);
      const url = /^https?:/.test(s.image) ? s.image.replace(/\/tr:[^/]+\//, '/tr:w-240,c-at_max/') : `https://media6.ppl-media.com/tr:w-240,c-at_max/static/img/product/${s.image}`;
      const ok = fs.existsSync(file) || download(url, file);
      if (ok) { s.image = rel; files[rel] = file; } else s.image = null;
    }
    for (const dir of ['assets/tex', 'assets/archive']) {
      fs.mkdirSync(path.join(imgDir, dir), { recursive: true });
      for (const t of fs.readdirSync(path.join(root, dir))) {
        fs.copyFileSync(path.join(root, dir, t), path.join(imgDir, dir, t));
        files[`${dir}/${t}`] = path.join(imgDir, dir, t);
      }
    }
    catalogJs = `window.SWMATCH_CATALOG = ${JSON.stringify(cat)};`;
    fs.writeFileSync(path.join(imgDir, 'files.json'), JSON.stringify(files, null, 1));
  }
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const code = (src) => (src === 'data/catalog.js' ? catalogJs : fs.readFileSync(path.join(root, src), 'utf8'));
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${code(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '').replace(/<link rel="icon"[^>]*>\s*/, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  fs.writeFileSync(out, head.trim() + '\n' + body.trim() + '\n');
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB', imgDir ? `+ ${Object.keys(files).length} files` : '');
})();
