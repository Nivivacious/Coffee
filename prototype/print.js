// Print-ready PDFs: one per card plus the whole deck, each page 2.75 x 3.75 in
// (the 2.5 x 3.5 in card with 0.125 in bleed all round), fonts embedded.
// Usage: node prototype/print.js   (needs Playwright with Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const T = require('./cards.js');
for (const f of fs.readdirSync(path.join(__dirname, 'deck')).filter((n) => n.endsWith('.js') && n !== 'render.js').sort()) require(path.join(__dirname, 'deck', f));

require('./copy.js');
const out = path.join(__dirname, 'print');
fs.mkdirSync(out, { recursive: true });
const ids = ['back', ...T.CARDS.map((c) => c.id), ...T.JOKERS.map((j) => j.id)];
const FONTS = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..700&family=Cormorant+Garamond:wght@500;600;700&family=Archivo+Narrow:wght@500;700&family=Noto+Sans+Kannada:wght@500;700&display=swap';
const page = (svgs) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>@page { size: 2.75in 3.75in; margin: 0 } html, body { margin: 0 } .p { width: 2.75in; height: 3.75in; page-break-after: always; break-after: page } .p:last-child { page-break-after: auto; break-after: auto } svg { display: block; width: 2.75in; height: 3.75in }</style>
</head><body>${svgs.map((s) => `<div class="p">${s}</div>`).join('')}</body></html>`;

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  const pdf = async (svgs, file) => {
    await pg.setContent(page(svgs), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: file, width: '2.75in', height: '3.75in', printBackground: true, preferCSSPageSize: true });
  };
  const svgs = ids.map((id, i) => T.render(id, { static: true, bleed: true, uid: '-p' + i }));
  for (let i = 0; i < ids.length; i++) await pdf([svgs[i]], path.join(out, `${ids[i]}.pdf`));
  await pdf(svgs, path.join(out, 'a-tale-of-two-cities-deck.pdf'));
  await b.close();
  console.log(`Wrote ${ids.length + 1} PDFs to ${out}`);
})();
