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

  // Home-print sheets: nine trimmed cards per page with crop marks, then a
  // page of backs, laid out mirror-wise so they line up when printed
  // double-sided (flip on the long edge).
  const faces = ids.filter((id) => id !== 'back').map((id, i) => T.render(id, { static: true, uid: '-h' + i }));
  for (const [fmt, pw, ph] of [['letter', 8.5, 11], ['a4', 8.27, 11.69]]) {
    const cw = 2.5, ch = 3.5, ox = (pw - 3 * cw) / 2, oy = (ph - 3 * ch) / 2;
    const marks = [];
    for (let i = 0; i <= 3; i++) {
      const x = ox + i * cw, y = oy + i * ch;
      marks.push(`<line x1="${x}" y1="0.05" x2="${x}" y2="${oy - 0.06}"/><line x1="${x}" y1="${oy + 3 * ch + 0.06}" x2="${x}" y2="${ph - 0.05}"/>`);
      marks.push(`<line x1="0.05" y1="${y}" x2="${ox - 0.06}" y2="${y}"/><line x1="${ox + 3 * cw + 0.06}" y1="${y}" x2="${pw - 0.05}" y2="${y}"/>`);
    }
    const sheet = (cells) => `<div class="s"><svg class="m" viewBox="0 0 ${pw} ${ph}" style="width:${pw}in;height:${ph}in"><g stroke="#1E2233" stroke-width="0.006">${marks.join('')}</g></svg>${cells.map((svg, i) => `<div class="c" style="left:${ox + (i % 3) * cw}in;top:${oy + Math.floor(i / 3) * ch}in">${svg}</div>`).join('')}</div>`;
    const pages = [];
    for (let i = 0; i < faces.length; i += 9) pages.push(sheet(faces.slice(i, i + 9)));
    pages.push(sheet(Array.from({ length: 9 }, (_, i) => T.render('back', { static: true, uid: '-hb' + fmt + i }))));
    const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>@page { size: ${pw}in ${ph}in; margin: 0 } html, body { margin: 0 } .s { position: relative; width: ${pw}in; height: ${ph}in; break-after: page; page-break-after: always; overflow: hidden } .s:last-child { break-after: auto; page-break-after: auto } .m { position: absolute; left: 0; top: 0 } .c { position: absolute; width: ${cw}in; height: ${ch}in } .c svg { display: block; width: ${cw}in; height: ${ch}in }</style></head><body>${pages.join('')}</body></html>`;
    await pg.setContent(html, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: path.join(out, `home-print-${fmt}.pdf`), width: `${pw}in`, height: `${ph}in`, printBackground: true, preferCSSPageSize: true });
  }
  await b.close();
  console.log(`Wrote ${ids.length + 3} PDFs to ${out}`);
})();
