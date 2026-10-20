// Renders site-extra/og.png, the 1200x630 link preview.
const path = require('path');
const fs = require('fs');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const T = require('./cards.js');
for (const f of ['hearts', 'diamonds', 'clubs', 'spades']) require(`./deck/${f}.js`);
require('./copy.js');
(async () => {
  const cards = ['park', 'ride', 'usual'].map((id, i) => `<div class="c c${i}">${T.render(id, { static: true, uid: '-og' + i })}</div>`).join('');
  const html = `<html><head><link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Archivo+Narrow:wght@700&family=Noto+Sans+Kannada:wght@700&display=swap" rel="stylesheet">
  <style>body{margin:0;width:1200px;height:630px;background:#12151f;color:#f4ecdc;font-family:'Cormorant Garamond',serif;position:relative;overflow:hidden}
  .t{position:absolute;left:70px;top:150px;width:560px}.k{font:700 18px 'Archivo Narrow',sans-serif;letter-spacing:.16em;color:#a8a294;text-transform:uppercase}
  h1{font:500 70px/1 'Bodoni Moda',serif;margin:18px 0}h1 em{color:#f2b330}p{font-style:italic;font-size:32px;color:#a8a294;margin:0}
  .c{position:absolute;width:250px;height:350px;border-radius:12px;box-shadow:0 30px 60px -20px #000}.c svg{width:100%;height:100%;display:block}
  .c0{left:640px;top:150px;transform:rotate(-10deg)}.c1{left:780px;top:120px;transform:rotate(2deg);z-index:2}.c2{left:920px;top:150px;transform:rotate(12deg)}</style></head>
  <body><div class="t"><div class="k">52 cards · 2 Jokers · Bengaluru × New York</div><h1>A Tale of <em>Two</em> Cities</h1><p>For anyone whose phone shows two clocks.</p></div>${cards}</body></html>`;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await pg.setContent(html, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(__dirname, 'site-extra', 'og.png') }); await b.close();
  console.log('og.png written');
})();
