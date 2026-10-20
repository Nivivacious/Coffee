// Writes every card to prototype/svg/:
//   <id>.svg        animated, 2.5 x 3.5 in, opens in any browser
//   <id>-print.svg  still print frame with 0.125 in bleed (2.75 x 3.75 in)
// Usage: node prototype/export.js
const fs = require('fs');
const path = require('path');
const T = require('./cards.js');

const out = path.join(__dirname, 'svg');
fs.mkdirSync(out, { recursive: true });
const ids = [...T.CARDS.map((c) => c.id), ...T.JOKERS.map((j) => j.id)];
for (const id of ids) {
  fs.writeFileSync(path.join(out, `${id}.svg`),
    T.render(id, { standalone: true, size: { w: '2.5in', h: '3.5in' } }));
  fs.writeFileSync(path.join(out, `${id}-print.svg`),
    T.render(id, { standalone: true, static: true, bleed: true, size: { w: '2.75in', h: '3.75in' } }));
}
console.log(`Wrote ${ids.length * 2} files to ${out}`);
