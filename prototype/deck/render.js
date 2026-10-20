// Renders cards to PNG for checking. Usage:
//   node prototype/deck/render.js <outDir> <id> [id...]   (add STILL=1 for the print frame)
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const T = require('../cards.js');
for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.js') && n !== 'render.js').sort()) {
  try { require(path.join(__dirname, f)); } catch (e) { console.log('skipped', f, '-', e.message.split('\n')[0]); }
}
const [out, ...ids] = process.argv.slice(2);
(async () => {
  const cards = ids.map((id) => `<div style="width:500px;height:700px">${T.render(id, { uid: '-r', static: !!process.env.STILL })}</div>`).join('');
  const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..700&family=Cormorant+Garamond:wght@500;600;700&family=Archivo+Narrow:wght@500;700&family=Noto+Sans+Kannada:wght@500;700&display=swap" rel="stylesheet"></head><body style="margin:0;background:#161a26;display:grid;grid-template-columns:repeat(4,500px);gap:20px;padding:20px">${cards}</body></html>`;
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 2100, height: 760 * Math.ceil(ids.length / 4) + 40 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.setContent(html); await pg.waitForTimeout(Number(process.env.WAIT || 2000));
  await pg.screenshot({ path: path.join(out, 'sheet.png') });
  const els = await pg.$$('body > div');
  for (let i = 0; i < ids.length; i++) await els[i].screenshot({ path: path.join(out, `${ids[i]}.png`) });
  if (errs.length) console.log('page errors:', errs);
  await b.close();
})();
