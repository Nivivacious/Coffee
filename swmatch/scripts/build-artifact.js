// Bundles the site into one self-contained HTML body (scripts inlined, no
// <html>/<head> wrapper) for previewing as a single page.
//   node scripts/build-artifact.js <out.html>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2];
if (!out) { console.error('usage: node scripts/build-artifact.js <out.html>'); process.exit(1); }

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = (src) => `<script>\n${fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`;
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => inline(src));
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '').replace(/<link rel="icon"[^>]*>\s*/, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
fs.writeFileSync(out, head.trim() + '\n' + body.trim() + '\n');
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
