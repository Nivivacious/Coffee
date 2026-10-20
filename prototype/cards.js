/*
 * A Tale of Two Homes — card artwork.
 *
 * Every card is generated as SVG on a 250 x 350 grid (1 unit = 0.01 in, so
 * the card is exactly 2.5 x 3.5 in). A mirrored card is drawn as one "half"
 * per city; the New York half is the same half-template rotated 180 degrees
 * about the card centre, so rotational symmetry is exact by construction.
 *
 * Animation is SMIL, so exported .svg files move on their own. Every animated
 * element rests at its key pose when animation is stripped ({static: true}),
 * which is the frame used for print.
 *
 * Works in the browser (window.TaleCards) and in Node (module.exports).
 */
(function (root) {
  'use strict';

  // Ink set: seven spot colours on warm ivory stock, screen-print style.
  const INK = {
    paper: '#F4ECDC',
    ink: '#1E2233',
    red: '#D9412B',     // kumkum vermilion: red suits, the seam
    yellow: '#F2B330',  // marigold: auto hood and cab, shared by both cities
    green: '#2E7D5B',   // auto body, Cubbon and Central Park canopies
    blue: '#3B6EA8',    // monsoon, winter dusk, Hudson
    pink: '#E58A9B',    // neon, tabebuia blossom
    kaapi: '#7A4528'    // coffee, brownstone, wood
  };

  const FONT = {
    display: "'Bodoni Moda', 'Bodoni 72', Didot, serif",
    micro: "'Cormorant Garamond', Garamond, 'Times New Roman', serif",
    sans: "'Archivo Narrow', 'Arial Narrow', sans-serif",
    kn: "'Noto Sans Kannada', Tunga, sans-serif"
  };

  const W = 250, H = 350, CX = 125, CY = 175;
  // Art window of one half, in that half's own (upright) frame.
  const WIN = { x: 38, y: 20, r: 212, b: 167 };
  const BAND_B = 183;

  // Rank to hour of day: each suit, laid out 2 to 10, is one day.
  const HOURS = { 'A': 'DAWN', '2': '6 AM', '3': '8 AM', '4': '10 AM', '5': 'NOON',
    '6': '2 PM', '7': '4 PM', '8': '6 PM', '9': '8 PM', '10': '11 PM' };

  const CITY = {
    blr: { code: 'BLR', name: 'BENGALURU', coords: '12°58′N · 77°35′E' },
    nyc: { code: 'NYC', name: 'NEW YORK', coords: '40°42′N · 74°00′W' }
  };

  const PIPS = {
    heart: 'M0,5.6 C-1.2,4 -6,1.2 -6,-2 C-6,-5 -2.4,-6.4 0,-3.5 C2.4,-6.4 6,-5 6,-2 C6,1.2 1.2,4 0,5.6 Z',
    diamond: 'M0,-6.2 L4.3,0 L0,6.2 L-4.3,0 Z',
    spade: 'M0,-6.2 C1,-4 6,-1.6 6,1.6 C6,4.1 3,5 0.9,3.3 L1.9,6.2 L-1.9,6.2 L-0.9,3.3 C-3,5 -6,4.1 -6,1.6 C-6,-1.6 -1,-4 0,-6.2 Z',
    club: 'M0,-6 A2.7,2.7 0 1 1 0.01,-6 Z M-3,-0.6 A2.7,2.7 0 1 1 -2.99,-0.6 Z M3,-0.6 A2.7,2.7 0 1 1 3.01,-0.6 Z M-0.8,0.6 L-1.9,6.2 L1.9,6.2 L0.8,0.6 Z'
  };
  const SUIT_INK = { heart: INK.red, diamond: INK.red, club: INK.ink, spade: INK.ink };
  const SUIT_NAME = { heart: 'Hearts', diamond: 'Diamonds', club: 'Clubs', spade: 'Spades' };

  // ---------- small helpers ----------
  const f = (n) => Math.round(n * 100) / 100;
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function pip(suit, x, y, s) {
    return `<path d="${PIPS[suit]}" transform="translate(${x} ${y}) scale(${s})" fill="${SUIT_INK[suit]}"/>`;
  }
  // Scalloped blob: canopies, clouds, froth.
  function scallop(cx, cy, rx, ry, n, bulge, rot) {
    rot = rot || 0;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (i === 0) { d += `M${f(x)},${f(y)}`; continue; }
      const m = rot + ((i - 0.5) / n) * Math.PI * 2;
      const qx = cx + (rx + bulge) * Math.cos(m), qy = cy + (ry + bulge) * Math.sin(m);
      d += ` Q${f(qx)},${f(qy)} ${f(x)},${f(y)}`;
    }
    return d + ' Z';
  }

  // Animation context: ctx.a() drops animation markup for the static print frame.
  function makeCtx(id, opts) {
    return {
      id,
      still: !!opts.static,
      a(markup) { return this.still ? '' : markup; }
    };
  }
  const loop = (attr, values, dur, extra) =>
    `<animate attributeName="${attr}" values="${values}" dur="${dur}" repeatCount="indefinite"${extra || ''}/>`;
  const move = (values, dur, extra) =>
    `<animateTransform attributeName="transform" type="translate" additive="sum" values="${values}" dur="${dur}" repeatCount="indefinite"${extra || ''}/>`;
  const spin = (values, dur, extra) =>
    `<animateTransform attributeName="transform" type="rotate" additive="sum" values="${values}" dur="${dur}" repeatCount="indefinite"${extra || ''}/>`;

  // Falling streaks (rain) or flakes (snow). Drops sit on slanted columns and
  // the whole field moves by exactly one column period, so the loop is seamless.
  function precip(ctx, o) {
    const r = rng(o.seed);
    let s = '';
    for (let x = WIN.x - 50; x < WIN.r + 20; x += o.step) {
      const jx = x + r() * o.step * 0.9, jy = r() * o.py;
      for (let k = -2; k * o.py < (WIN.b - WIN.y) + o.py * 2; k++) {
        const px = jx + k * o.px, py = WIN.y + jy + k * o.py - o.py;
        if (o.kind === 'snow') {
          const rr = 0.9 + r() * 0.9;
          s += `<g transform="translate(${f(px)} ${f(py)})"><path d="M${-rr},0 H${rr} M${f(-rr / 2)},${f(-rr * 0.87)} L${f(rr / 2)},${f(rr * 0.87)} M${f(-rr / 2)},${f(rr * 0.87)} L${f(rr / 2)},${f(-rr * 0.87)}"/></g>`;
        } else {
          s += `<path d="M${f(px)},${f(py)} l${o.dx},${o.dy}"/>`;
        }
      }
    }
    return `<g stroke="${o.color}" stroke-width="${o.sw}" stroke-linecap="round" fill="none"${o.opacity != null ? ` opacity="${o.opacity}"` : ''}>${o.anim || ''}<g>${s}${ctx.a(move(`0 0;${o.px} ${o.py}`, o.dur))}</g></g>`;
  }

  // A walking or running figure, feet at (0,0), facing right. ~15 units tall.
  function figure(ctx, o) {
    const c = o.color || INK.ink, sw = 1.5;
    const stride = o.run ? 34 : 20, beat = o.run ? '0.5s' : '0.9s';
    const leg = (dir) => `<g transform="translate(0 -6.5)"><path d="M0,0 L0,6.5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>${ctx.a(spin(dir > 0 ? `${stride};${-stride};${stride}` : `${-stride};${stride};${-stride}`, beat))}</g>`;
    const arm = (dir) => `<g transform="translate(0 -12)"><path d="M0,0 L0,5" stroke="${c}" stroke-width="${sw * 0.8}" stroke-linecap="round"/>${ctx.a(spin(dir > 0 ? `${stride};${-stride};${stride}` : `${-stride};${stride};${-stride}`, beat))}</g>`;
    const lean = o.run ? ' transform="rotate(8)"' : '';
    return `<g${lean}>${leg(1)}${leg(-1)}<path d="M0,-6.5 L0,-12.6" stroke="${c}" stroke-width="${sw * 1.6}" stroke-linecap="round"/>${arm(-1)}${arm(1)}<circle cx="0" cy="-15" r="2.1" fill="${c}"/>${o.extra || ''}</g>`;
  }

  // ---------- vehicles (ground contact at y=0, facing right) ----------
  function wheel(x) {
    return `<g transform="translate(${x} -6.6)"><circle r="6.6" fill="${INK.ink}"/><circle r="2.6" fill="${INK.paper}"/><circle r="0.9" fill="${INK.ink}"/></g>`;
  }
  function autoRickshaw() {
    const k = INK.ink;
    // Bubble canopy curving down to the rear, open side, narrow driver's cowl.
    return `<g>
      <ellipse cx="2" cy="0.4" rx="40" ry="1.5" fill="${k}" opacity="0.25"/>
      <path d="M-38,-14 C-40,-38 -32,-54 -12,-54 L12,-54 Q21,-54 24,-47 L31,-28 L-38,-14 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
      <path d="M-24,-51 C-30,-44 -33,-34 -33.5,-22 M-6,-53.6 V-46" fill="none" stroke="${k}" stroke-width="0.35"/>
      <path d="M-29,-20 C-30,-35 -25,-46.5 -12,-46.5 L7,-46.5 L7,-20 Z" fill="${k}"/>
      <circle cx="-11" cy="-35.5" r="3.3" fill="none" stroke="${INK.paper}" stroke-width="0.6"/>
      <path d="M-16.5,-20 Q-16,-30.5 -11,-30.5 Q-6,-30.5 -5.5,-20" fill="none" stroke="${INK.paper}" stroke-width="0.6"/>
      <path d="M10.5,-46.5 L18.5,-46.5 Q20.3,-46.5 21.1,-44.6 L26.5,-29.5 L10.5,-29.5 Z" fill="${INK.blue}" fill-opacity="0.45" stroke="${k}" stroke-width="0.5"/>
      <circle cx="15" cy="-37.5" r="3.1" fill="${k}"/>
      <path d="M11.5,-29.5 Q15,-34 19,-29.5 Z" fill="${k}"/>
      <path d="M-39,-20 L7,-20 L9,-29.5 L31,-29.5 Q36,-29.5 36.5,-24 L37.5,-12 Q37.5,-6 32,-6 L-35,-6 Q-39.5,-6 -39.5,-11 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
      <path d="M-37.5,-14 L7,-14 M9,-17 L36.5,-17" stroke="${INK.paper}" stroke-width="0.6" opacity="0.8"/>
      <path d="M17,-6.4 A10,10 0 0 1 37,-6.4" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
      ${wheel(-24)}${wheel(27)}
      <circle cx="36.6" cy="-22" r="2" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
    </g>`;
  }
  function yellowCab(ctx, lightAnim) {
    const k = INK.ink;
    return `<g>
      <ellipse cx="1" cy="0.4" rx="44" ry="1.5" fill="${k}" opacity="0.25"/>
      <path d="M-42,-9 Q-42,-19.5 -36,-20.5 L-22,-22.5 Q-16,-34.5 -10,-35.5 L13,-35.5 Q19,-35.5 23,-30.5 L29.5,-22.5 L39.5,-20.8 Q44.5,-19.8 44.5,-14 L44.5,-9 Q44.5,-6 41.5,-6 L-39,-6 Q-42,-6 -42,-9 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
      <path d="M-18.3,-23.2 Q-13.3,-32.6 -9.2,-33.1 L-1,-33.1 L-1,-23.2 Z M2,-33.1 L12.4,-33.1 Q16.8,-33.1 19.7,-29.4 L24.3,-23.2 L2,-23.2 Z" fill="${k}" opacity="0.88"/>
      <path d="M0.5,-23 V-8.5 M-20,-23 V-8.5 M22,-21.5 V-8.5" stroke="${k}" stroke-width="0.35"/>
      <path d="M-40.5,-14.5 H43.5" stroke="${k}" stroke-width="0.35"/>
      <path d="M-14.5,-18 h3.5 M6,-18 h3.5" stroke="${k}" stroke-width="0.8" stroke-linecap="round"/>
      <text x="-9" y="-10.2" font-family="${FONT.sans}" font-size="3.4" font-weight="700" letter-spacing="0.4" fill="${k}">NYC TAXI</text>
      <g>
        <rect x="-8.5" y="-41" width="16" height="5.4" rx="1.1" fill="${INK.paper}" stroke="${k}" stroke-width="0.55"/>
        <text x="-0.5" y="-36.9" text-anchor="middle" font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${k}">5J17</text>
        <rect x="-8.5" y="-41" width="16" height="5.4" rx="1.1" fill="${k}" opacity="${ctx.still ? 1 : 0}">${lightAnim || ''}</rect>
      </g>
      ${wheel(-26)}${wheel(29)}
      <path d="M41.5,-17.5 h2.6 v3 h-2.6 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
      <path d="M-42,-17 h2.4 v3 h-2.4 Z" fill="${INK.red}"/>
    </g>`;
  }

  // ---------- card frame + halves ----------
  function defs(p) {
    return `<defs>
      <clipPath id="${p}-win"><path d="M${WIN.x},${WIN.b} V${WIN.y + 6} Q${WIN.x},${WIN.y} ${WIN.x + 6},${WIN.y} H${WIN.r - 6} Q${WIN.r},${WIN.y} ${WIN.r},${WIN.y + 6} V${WIN.b} Z"/></clipPath>
      <clipPath id="${p}-full"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.r - WIN.x}" height="${H - 2 * WIN.y}" rx="6"/></clipPath>
      <pattern id="${p}-hatch" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 V2.2" stroke="${INK.ink}" stroke-width="0.35"/></pattern>
      <pattern id="${p}-hatch-paper" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0,0 V2" stroke="${INK.paper}" stroke-width="0.3"/></pattern>
      <pattern id="${p}-leaf" width="5" height="4" patternUnits="userSpaceOnUse"><path d="M0.5,3 q1.5,-2.2 3,0" fill="none" stroke="${INK.ink}" stroke-width="0.3" opacity="0.55"/></pattern>
      <pattern id="${p}-brick" width="6" height="3.2" patternUnits="userSpaceOnUse"><path d="M0,3.2 H6 M3,0 V1.6 M0,1.6 H6 M0,1.6 V3.2" stroke="${INK.ink}" stroke-width="0.25" opacity="0.5"/></pattern>
    </defs>`;
  }

  function frame() {
    const k = INK.ink;
    const star = (x, y) => `<path d="M${x},${y - 2.2} L${x + 0.6},${y - 0.6} L${x + 2.2},${y} L${x + 0.6},${y + 0.6} L${x},${y + 2.2} L${x - 0.6},${y + 0.6} L${x - 2.2},${y} L${x - 0.6},${y - 0.6} Z" fill="${INK.red}"/>`;
    return `<rect width="${W}" height="${H}" rx="12" fill="${INK.paper}"/>
      <rect x="8.5" y="8.5" width="${W - 17}" height="${H - 17}" rx="7" fill="none" stroke="${k}" stroke-width="0.7"/>
      <rect x="11" y="11" width="${W - 22}" height="${H - 22}" rx="5" fill="none" stroke="${k}" stroke-width="0.22"/>
      ${star(11, 11)}${star(W - 11, 11)}${star(11, H - 11)}${star(W - 11, H - 11)}`;
  }

  // One half in its own upright frame: index, coordinates, caption, art, clause.
  function half(ctx, def, side) {
    const p = ctx.id, k = INK.ink;
    const city = CITY[side.city];
    const hour = HOURS[def.rank] || '';
    const clauseLen = side.clause.length * 3.75;
    let dots = '';
    for (let x = 42 + clauseLen + 5; x < WIN.r - 4; x += 3.2) dots += `<circle cx="${f(x)}" cy="171.6" r="0.42"/>`;
    return `
      <text x="25" y="41" text-anchor="middle" font-family="${FONT.display}" font-size="${def.rank.length > 1 ? 16 : 19}" font-weight="500" fill="${SUIT_INK[def.suit]}">${def.rank}</text>
      ${pip(def.suit, 25, 51, 0.85)}
      <text x="25" y="63" text-anchor="middle" font-family="${FONT.micro}" font-size="4.4" font-weight="700" letter-spacing="0.9" fill="${k}">${city.code}</text>
      <text transform="translate(225 ${WIN.y + 4}) rotate(90)" font-family="${FONT.micro}" font-size="4.1" font-weight="600" letter-spacing="0.75" fill="${k}" opacity="0.72">${city.name} · ${city.coords}</text>
      <g clip-path="url(#${p}-win)">${side.art}</g>
      <path d="M${WIN.x},${WIN.b} V${WIN.y + 6} Q${WIN.x},${WIN.y} ${WIN.x + 6},${WIN.y} H${WIN.r - 6} Q${WIN.r},${WIN.y} ${WIN.r},${WIN.y + 6} V${WIN.b}" fill="none" stroke="${k}" stroke-width="0.6"/>
      <g transform="translate(${CX} ${WIN.y + 7.5})">
        <rect x="${-(side.caption.length * 1.75 + 9)}" y="-4.6" width="${side.caption.length * 3.5 + 18}" height="7.6" rx="1" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/>
        <text text-anchor="middle" y="1.1" font-family="${FONT.micro}" font-size="4.3" font-weight="700" letter-spacing="0.75" fill="${k}">${esc(side.caption)}${hour ? ' · ' + hour : ''}</text>
      </g>
      <text x="42" y="173.3" font-family="${FONT.micro}" font-size="5" font-weight="600" letter-spacing="0.4" textLength="${f(clauseLen)}" lengthAdjust="spacingAndGlyphs" fill="${k}">${esc(side.clause.toUpperCase())}</text>
      <g fill="${k}" opacity="0.7">${dots}</g>`;
  }

  function seamLine() {
    return `<path d="M${WIN.x},${CY} H${WIN.r}" stroke="${INK.red}" stroke-width="0.6"/>
      <path d="M${WIN.x},${WIN.b} H${WIN.r} M${WIN.x},${BAND_B} H${WIN.r}" stroke="${INK.ink}" stroke-width="0.6"/>
      <path d="M${WIN.x - 2.6},${CY} l2.6,-2 l2.6,2 l-2.6,2 Z M${WIN.r - 2.6},${CY} l2.6,-2 l2.6,2 l-2.6,2 Z" fill="${INK.red}"/>`;
  }

  function svgOpen(p, opts) {
    const bleed = opts.bleed ? 12.5 : 0;
    const vb = `${-bleed} ${-bleed} ${W + 2 * bleed} ${H + 2 * bleed}`;
    const size = opts.size ? ` width="${opts.size.w}" height="${opts.size.h}"` : '';
    const fonts = opts.standalone
      ? `<style>@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400..700&amp;family=Cormorant+Garamond:wght@500;600;700&amp;family=Archivo+Narrow:wght@500;700&amp;family=Noto+Sans+Kannada:wght@500;700&amp;display=swap');</style>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} role="img" aria-labelledby="${p}-t" data-card="${p}">${fonts}<title id="${p}-t">${esc(opts.title || '')}</title>${bleed ? `<rect x="${-bleed}" y="${-bleed}" width="${W + 2 * bleed}" height="${H + 2 * bleed}" fill="${INK.paper}"/>` : ''}`;
  }

  function mirroredCard(def, opts) {
    opts = opts || {};
    const p = def.id + (opts.uid || '');
    const ctx = makeCtx(p, opts);
    const art = def.draw(ctx);
    return svgOpen(p, Object.assign({ title: `${def.rankName} of ${SUIT_NAME[def.suit]}: ${def.title}` }, opts)) +
      defs(p) + frame() +
      `<g>${half(ctx, def, art.top)}</g>` +
      `<g transform="rotate(180 ${CX} ${CY})">${half(ctx, def, art.bottom)}</g>` +
      seamLine() + (art.over || '') + '</svg>';
  }

  // ======================================================================
  // 8 of Clubs — The Ride Home. Auto-rickshaw x yellow cab, 6 PM, rain.
  // The auto and the cab share one road. Because the New York half is the
  // Bangalore half turned around, they always pass going the other way.
  // ======================================================================
  function drawRide(ctx) {
    const p = ctx.id, k = INK.ink;
    const T = '9s', B = ' begin="-4.5s"';
    const rainOn = ctx.a(loop('opacity', '0;0;1;1;0', T, ` keyTimes="0;0.3;0.42;0.92;1"${B}`));
    const lightOff = ctx.a(loop('opacity', '0;0;1;1;0', T, ` keyTimes="0;0.38;0.4;0.94;1"${B}`));
    const drive = (inner) => `<g transform="translate(${CX} ${WIN.b})">${inner}${ctx.a(move('-200 0;200 0', T, B))}</g>`;
    const rain = (seed) => precip(ctx, { seed, step: 7, px: 5, py: 26, dx: 1.6, dy: 8, dur: '0.45s', color: INK.blue, sw: 0.7, anim: rainOn });

    const top = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
      <path d="M30,52 Q90,66 150,50 T260,58 M30,60 Q100,72 160,58 T260,66" fill="none" stroke="${k}" stroke-width="0.3"/>
      <path d="M150,167 V44 M146,48 H154" stroke="${k}" stroke-width="1.2"/>
      <path d="${scallop(66, 92, 48, 20, 16, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
      <path d="${scallop(66, 92, 48, 20, 16, 5)}" fill="url(#${p}-leaf)"/>
      <path d="M60,167 C62,140 64,122 58,108 M64,132 C70,120 80,112 92,106 M62,124 C54,114 46,110 40,108" fill="none" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="158" y="104" width="58" height="63" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M158,104 H216" stroke="${k}" stroke-width="1.4"/>
      <g transform="translate(196 92)"><rect x="-7" y="0" width="14" height="12" rx="2.5" fill="${k}"/><path d="M-7,4 H7 M-7,8 H7" stroke="${INK.paper}" stroke-width="0.35"/><rect x="-3" y="-1.6" width="6" height="2" rx="0.8" fill="${k}"/></g>
      <g fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.4"><rect x="166" y="113" width="10" height="13"/><rect x="186" y="113" width="10" height="13"/></g>
      <path d="M166,113 V126 M171,113 V126 M186,113 V126 M191,113 V126" stroke="${k}" stroke-width="0.3"/>
      <rect x="164" y="136" width="46" height="31" fill="url(#${p}-hatch)" stroke="${k}" stroke-width="0.5"/>
      <rect x="166" y="129" width="42" height="9" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
      <text x="187" y="136.2" text-anchor="middle" font-family="${FONT.kn}" font-size="6.4" font-weight="700" fill="${INK.paper}">ಕಾಫಿ</text>
      ${rain(11)}
      ${drive(autoRickshaw())}`;

    const bottom = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
      <rect x="38" y="64" width="76" height="103" fill="${INK.red}" opacity="0.22"/>
      <rect x="38" y="64" width="76" height="103" fill="url(#${p}-brick)"/>
      <path d="M38,64 H114 V167" fill="none" stroke="${k}" stroke-width="0.6"/>
      <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.4">
        <rect x="46" y="74" width="9" height="13"/><rect x="64" y="74" width="9" height="13" fill="${INK.paper}"/><rect x="82" y="74" width="9" height="13"/><rect x="100" y="74" width="9" height="13" fill="${INK.paper}"/>
        <rect x="46" y="100" width="9" height="13" fill="${INK.paper}"/><rect x="64" y="100" width="9" height="13"/><rect x="82" y="100" width="9" height="13" fill="${INK.paper}"/><rect x="100" y="100" width="9" height="13"/>
        <rect x="46" y="126" width="9" height="13"/><rect x="64" y="126" width="9" height="13" fill="${INK.paper}"/><rect x="82" y="126" width="9" height="13"/><rect x="100" y="126" width="9" height="13" fill="${INK.paper}"/>
      </g>
      <g stroke="${k}" stroke-width="0.6" fill="none">
        <path d="M60,90 H96 M60,116 H96 M60,142 H96"/><path d="M60,90 V86 M96,90 V86 M60,116 V112 M96,116 V112 M60,142 V138 M96,142 V138" stroke-width="0.35"/>
        <path d="M66,90 L88,116 M66,116 L88,142" stroke-width="0.45"/>
      </g>
      <g transform="translate(76 40)">
        <path d="M-7,24 L-6,12 M7,24 L6,12 M0,24 V12 M-7,24 L7,18 M7,24 L-7,18" stroke="${k}" stroke-width="0.5"/>
        <rect x="-8" y="0" width="16" height="13" fill="${INK.kaapi}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5"/>
        <path d="M-8,4 H8 M-8,9 H8" stroke="${k}" stroke-width="0.6"/>
        <path d="M-9,0 L0,-8 L9,0 Z" fill="${k}"/>
      </g>
      <path d="M190,167 V92 Q190,86 184,86 H176" fill="none" stroke="${k}" stroke-width="1.3"/>
      <path d="M170,84 h8 v4 h-8 Z" fill="${k}"/>
      <g transform="translate(190 120)"><rect x="-1" y="0" width="22" height="7" fill="${k}"/><path d="M2,3.5 H16 M13,1.5 L17,3.5 L13,5.5" stroke="${INK.paper}" stroke-width="0.8" fill="none"/><text x="5" y="5.6" font-family="${FONT.sans}" font-size="2.6" font-weight="700" fill="${INK.paper}">ONE WAY</text></g>
      <path d="M122,124 H170 L166,132 H126 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
      <path d="M130,124 L128,132 M138,124 L137,132 M146,124 V132 M154,124 L155,132 M162,124 L164,132" stroke="${INK.paper}" stroke-width="1.2"/>
      <rect x="126" y="132" width="40" height="35" fill="${INK.yellow}" fill-opacity="0.35" stroke="${k}" stroke-width="0.45"/>
      ${rain(29)}
      ${drive(yellowCab(ctx, lightOff))}`;

    return {
      top: { city: 'blr', caption: 'RICHMOND ROAD', clause: 'The minute it rains,', art: top },
      bottom: { city: 'nyc', caption: 'SECOND AVENUE', clause: 'everyone is going the other way.', art: bottom }
    };
  }

  // ======================================================================
  // 2 of Hearts — Morning Walk. Cubbon Park x Central Park, 6 AM.
  // One trunk through the seam: a rain tree's umbrella above, an American
  // elm's vase below. The walkers share the loop at different speeds.
  // ======================================================================
  function drawPark(ctx) {
    const p = ctx.id, k = INK.ink;
    const sway = ctx.a(spin('0 125 167;1.4 125 167;0 125 167;-1.4 125 167;0 125 167', '8s'));
    const walk = (fig, dur, begin) => `<g transform="translate(${CX} ${WIN.b})">${fig}${ctx.a(move('-110 0;110 0', dur, ` begin="${begin}"`))}</g>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.16"/>
      <circle cx="186" cy="64" r="13" fill="${INK.yellow}"/>
      <path d="M160,60 H212 M156,66 H212 M164,72 H212" stroke="${INK.paper}" stroke-width="0.8"/>
      <g fill="${INK.red}" stroke="${k}" stroke-width="0.35">
        <path d="M158,167 V138 H168 V128 L176,118 L184,128 V138 H194 V167 Z"/>
        <path d="M154,167 V128 L156.5,121 L159,128 V167 Z M193,167 V128 L195.5,121 L198,128 V167 Z"/>
      </g>
      <g fill="${INK.paper}"><path d="M172,150 v-6 a4,4 0 0 1 8,0 v6 Z"/><path d="M161,152 v-4 a2,2 0 0 1 4,0 v4 Z M187,152 v-4 a2,2 0 0 1 4,0 v4 Z"/></g>
      <g stroke="${INK.green}" stroke-width="1.3" stroke-linecap="round">
        <path d="M42,167 C42,130 44,100 46,72 M48,167 C49,128 52,98 56,64 M54,167 C56,132 60,108 66,80 M37,167 C37,132 38,104 38,86"/>
      </g>
      <g stroke="${INK.green}" stroke-width="0.9" stroke-linecap="round"><path d="M46,80 l6,-4 M47,96 l-6,-3 M54,74 l6,-5 M56,92 l6,-3 M60,104 l6,-4 M45,112 l-6,-2"/></g>
      <path d="M60,159 H92 M62,159 V167 M90,159 V167 M60,154 H92" stroke="${k}" stroke-width="0.9"/>
      <g>${sway}
        <path d="M120,167 C122,150 122,136 117,124 M130,167 C128,150 128,136 133,124" fill="none" stroke="${k}" stroke-width="1"/>
        <path d="M119.5,167 C122,150 121.5,136 116.5,124 L121,122 C124,132 126,132 129,122 L133.5,124 C128.5,136 128,150 130.5,167 Z" fill="${k}"/>
        <path d="M118,124 C110,114 96,108 82,104 M132,124 C140,114 154,108 168,104 M125,126 V104" fill="none" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="${scallop(125, 90, 66, 22, 22, 4.5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(125, 90, 66, 22, 22, 4.5)}" fill="url(#${p}-leaf)"/>
        <path d="M70,98 Q125,112 180,98" fill="none" stroke="${k}" stroke-width="0.4" opacity="0.6"/>
      </g>
      ${walk(figure(ctx, { color: k }), '22s', '-11s')}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.10"/>
      <g fill="none" stroke="${k}" stroke-width="0.4" opacity="0.55">
        <path d="M158,167 V104 H210 V167"/><path d="M164,104 V78 H174 V104 M192,104 V78 H202 V104"/>
        <path d="M169,78 V70 M197,78 V70"/><circle cx="169" cy="74" r="3"/><circle cx="197" cy="74" r="3"/>
        <path d="M162,114 H206 M162,124 H206 M162,134 H206 M162,144 H206"/>
      </g>
      <path d="M40,148 H212 M40,154 H212" stroke="${INK.paper}" stroke-width="1.2"/>
      <g transform="translate(66 167)">
        <path d="M0,0 V-40" stroke="${k}" stroke-width="1.7"/>
        <path d="M-3.5,-40 h7 l-1.2,-8 h-4.6 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
        <path d="M-4,-48 h8 l-4,-3.5 Z" fill="${k}"/>
        <rect x="-3.8" y="-22" width="7.6" height="3.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/>
        <text y="-19.4" text-anchor="middle" font-family="${FONT.sans}" font-size="2.5" font-weight="700" fill="${k}">7203</text>
      </g>
      <path d="M150,160 H182 M152,160 V167 M180,160 V167 M150,155 H182" stroke="${k}" stroke-width="0.9"/>
      <g>${sway}
        <path d="M120,167 C122,152 122,142 119,132 L131,132 C128,142 128,152 130,167 Z" fill="${k}"/>
        <path d="M121,134 C112,118 100,100 84,86 M124,134 C120,116 112,96 106,78 M126,134 C130,116 138,96 144,78 M129,134 C138,118 150,100 166,86" fill="none" stroke="${k}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="${scallop(125, 74, 70, 28, 24, 4)}" fill="${INK.green}" fill-opacity="0.82" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(125, 74, 70, 28, 24, 4)}" fill="url(#${p}-hatch)" opacity="0.5"/>
        <path d="M84,86 C96,100 106,104 125,104 C144,104 154,100 166,86" fill="none" stroke="${k}" stroke-width="0.4"/>
      </g>
      ${walk(figure(ctx, { color: k, run: true }), '9s', '-4.5s')}`;

    return {
      top: { city: 'blr', caption: 'CUBBON PARK', clause: 'Every loud city', art: top },
      bottom: { city: 'nyc', caption: 'CENTRAL PARK', clause: 'needs somewhere to whisper.', art: bottom }
    };
  }

  // ======================================================================
  // 3 of Hearts — The Usual. Darshini x diner, 8 AM.
  // The seam is the counter. A tumbler in its davara on one side, a
  // green-banded diner mug on the other, both already poured.
  // ======================================================================
  function steam(ctx, x, y, h) {
    const wisp = (dx, delay) => `<path d="M${x + dx},${y} c-3,-${h * 0.25} 3,-${h * 0.45} 0,-${h * 0.7} s3,-${h * 0.2} 0,-${h * 0.3}" fill="none" stroke="${INK.ink}" stroke-width="0.6" stroke-linecap="round" opacity="0.55">${ctx.a(move(`0 4;0 -6`, '3s', ` begin="${delay}"`) + loop('opacity', '0;0.6;0', '3s', ` begin="${delay}"`))}</path>`;
    return wisp(-4, '0s') + wisp(0.5, '-1s') + wisp(5, '-2s');
  }
  function drawUsual(ctx) {
    const p = ctx.id, k = INK.ink;
    const steel = `fill="${k}" fill-opacity="0.12" stroke="${k}" stroke-width="0.6"`;
    const top = `
      <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.13"/>
      <rect x="38" y="128" width="174" height="39" fill="${INK.paper}"/>
      <path d="M38,128 H212 M38,141 H212 M38,154 H212 M50,128 V167 M63,128 V167 M76,128 V167 M89,128 V167 M102,128 V167 M115,128 V167 M128,128 V167 M141,128 V167 M154,128 V167 M167,128 V167 M180,128 V167 M193,128 V167 M206,128 V167" stroke="${k}" stroke-width="0.25" opacity="0.6"/>
      <g><rect x="132" y="36" width="64" height="3.4" rx="1.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="128" y="31" width="72" height="13" rx="6" fill="${INK.yellow}" opacity="0.35">${ctx.a(loop('opacity', '0.35;0.35;0.05;0.35;0.1;0.35;0.35', '5s', ' keyTimes="0;0.6;0.62;0.64;0.66;0.68;1"'))}</rect></g>
      <rect x="46" y="44" width="72" height="62" fill="${INK.green}" stroke="${k}" stroke-width="0.7"/>
      <rect x="49" y="47" width="66" height="56" fill="none" stroke="${INK.paper}" stroke-width="0.35"/>
      <g font-family="${FONT.kn}" font-weight="700" fill="${INK.paper}" text-anchor="middle">
        <text x="82" y="63" font-size="9.5">ಇಡ್ಲಿ · ವಡೆ</text>
        <text x="82" y="78" font-size="9.5">ದೋಸೆ</text>
        <text x="82" y="94" font-size="9.5">ಕಾಫಿ</text>
      </g>
      <rect x="140" y="54" width="62" height="10" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
      <text x="171" y="61.3" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" letter-spacing="1" fill="${INK.paper}">SELF SERVICE</text>
      <g ${steel}><ellipse cx="186" cy="164" rx="15" ry="2.4"/><ellipse cx="186" cy="160.6" rx="15" ry="2.4"/><ellipse cx="186" cy="157.2" rx="15" ry="2.4"/><ellipse cx="186" cy="153.8" rx="15" ry="2.4"/></g>
      <path d="M102,150 L148,150 Q146,159 139,163.5 L137,167 L113,167 L111,163.5 Q104,159 102,150 Z" ${steel}/>
      <ellipse cx="125" cy="150" rx="23" ry="2.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M113.5,116 L136.5,116 L133,155 L117,155 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M128,118 L126.6,154 M131,118 L129.6,154 M134,118 L131.8,154" stroke="${k}" stroke-width="0.35" opacity="0.7"/>
      <path d="M117,120 L118.5,153" stroke="${INK.paper}" stroke-width="1.2"/>
      <ellipse cx="125" cy="116" rx="11.5" ry="2" fill="${INK.kaapi}" fill-opacity="0.35" stroke="${k}" stroke-width="0.7"/>
      <path d="${scallop(125, 116, 8, 1.1, 10, 0.6)}" fill="${INK.paper}" opacity="0.9"/>
      ${steam(ctx, 125, 110, 30)}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.red}" opacity="0.07"/>
      <rect x="38" y="122" width="174" height="45" fill="url(#${p}-hatch)" opacity="0.35"/>
      <path d="M38,122 H212" stroke="${k}" stroke-width="0.6"/>
      <rect x="46" y="44" width="72" height="62" fill="${k}"/>
      <path d="M49,48 H115 M49,102 H115" stroke="${INK.paper}" stroke-width="0.3" stroke-dasharray="0.8 1.2"/>
      <g font-family="${FONT.sans}" font-weight="700" fill="${INK.paper}" letter-spacing="0.6">
        <text x="52" y="60" font-size="6">COFFEE</text><text x="112" y="60" font-size="6" text-anchor="end">·</text>
        <text x="52" y="72" font-size="6">EGGS ANY STYLE</text>
        <text x="52" y="84" font-size="6">HOME FRIES</text>
        <text x="52" y="96" font-size="6">PIE, À LA MODE</text>
      </g>
      <text x="171" y="64" text-anchor="middle" font-family="${FONT.sans}" font-size="14" font-weight="700" letter-spacing="1.5" fill="none" stroke="${INK.pink}" stroke-width="1">OPEN${ctx.a(loop('opacity', '1;1;0.2;1;0.3;1;1', '4s', ' keyTimes="0;0.7;0.72;0.74;0.76;0.78;1"'))}</text>
      <text x="171" y="64" text-anchor="middle" font-family="${FONT.sans}" font-size="14" font-weight="700" letter-spacing="1.5" fill="none" stroke="${INK.pink}" stroke-width="3" opacity="0.25">OPEN</text>
      <g transform="translate(186 167)">
        <path d="M-16,0 H16 M0,0 V-6 M-14,-6 H14" stroke="${k}" stroke-width="0.8"/>
        <path d="M-12,-7 L12,-7 L2,-16 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <path d="M-12,-7 L2,-16 L4,-14 L-9,-7 Z" fill="${INK.kaapi}" opacity="0.7"/>
        <path d="M-15,-6.5 C-15,-30 15,-30 15,-6.5" fill="${INK.blue}" fill-opacity="0.08" stroke="${k}" stroke-width="0.5"/>
        <path d="M-10,-12 C-10,-22 -2,-25 4,-25" fill="none" stroke="${INK.paper}" stroke-width="1"/>
      </g>
      <ellipse cx="125" cy="164.6" rx="19" ry="2.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M137,134 C147,134 147,152 136,152" fill="none" stroke="${k}" stroke-width="3.2"/>
      <path d="M137,134 C147,134 147,152 136,152" fill="none" stroke="${INK.paper}" stroke-width="1.8"/>
      <path d="M112.5,128 L137.5,128 L136.5,159 Q136.5,163 132.5,163 L117.5,163 Q113.5,163 113.5,159 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
      <path d="M113,134 H137 M113.2,136.2 H136.8" stroke="${INK.green}" stroke-width="0.8"/>
      <path d="M131,131 L130.5,160" stroke="${k}" stroke-width="0.35" opacity="0.6"/>
      <ellipse cx="125" cy="128" rx="12.5" ry="2" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.7"/>
      ${steam(ctx, 125, 122, 30)}`;

    return {
      top: { city: 'blr', caption: 'DARSHINI, JAYANAGAR', clause: "You don't order anymore.", art: top },
      bottom: { city: 'nyc', caption: 'DINER, ASTORIA', clause: 'You just nod.', art: bottom }
    };
  }

  // ======================================================================
  // 7 of Spades — Four O'Clock. The pre-monsoon storm x first snow, 4 PM.
  // Two doorways back to back across the seam: chappals on a step under a
  // mango-leaf thorana, snow boots on a brownstone stoop. Nobody has left.
  // ======================================================================
  function drawWeather(ctx) {
    const p = ctx.id, k = INK.ink;
    const ripple = (x, delay) => `<ellipse cx="${x}" cy="166" rx="1" ry="0.4" fill="none" stroke="${INK.blue}" stroke-width="0.5">${ctx.a(loop('rx', '1;8', '1.4s', ` begin="${delay}"`) + loop('ry', '0.4;1.8', '1.4s', ` begin="${delay}"`) + loop('opacity', '1;0', '1.4s', ` begin="${delay}"`))}</ellipse>`;
    let leaves = '';
    for (let i = 0; i < 7; i++) leaves += `<path d="M${106 + i * 6.3},101 q-1.6,4 0,8 q1.6,-4 0,-8 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.25"/>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${k}" opacity="0.2"/>
      <rect x="38" y="76" width="174" height="91" fill="${INK.paper}"/>
      <rect x="38" y="76" width="174" height="91" fill="url(#${p}-hatch)" opacity="0.35"/>
      <path d="${scallop(110, 34, 110, 22, 18, 7)}" fill="${k}" opacity="0.8"/>
      <path d="M186,42 L178,62 L186,62 L176,84" fill="none" stroke="${INK.yellow}" stroke-width="1.6" stroke-linejoin="round" opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;0;1;0;1;0;0', '6s', ' keyTimes="0;0.5;0.52;0.55;0.58;0.62;1"'))}</path>
      <path d="M30,62 L120,62 L132,80 L30,80 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
      <path d="M36,62 v18 M44,62 v18 M52,62 v18 M60,62 v18 M68,62 v18 M76,62 v18 M84,62 v18 M92,62 v18 M100,62 v18 M108,62 v18 M116,62 l2,18" stroke="${k}" stroke-width="0.35"/>
      <path d="M30,80 h102" stroke="${k}" stroke-width="0.4" stroke-dasharray="2 2"/>
      <g fill="${INK.blue}">${[48, 72, 96, 120].map((x, i) => `<ellipse cx="${x}" cy="82" rx="0.9" ry="1.6">${ctx.a(move('0 0;0 84', '1.1s', ` begin="${-i * 0.3}s"`) + loop('opacity', '1;1;0', '1.1s', ` begin="${-i * 0.3}s"`))}</ellipse>`).join('')}</g>
      <rect x="148" y="104" width="22" height="26" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.6"/>
      <path d="M152.4,104 V130 M156.8,104 V130 M161.2,104 V130 M165.6,104 V130 M148,117 H170" stroke="${k}" stroke-width="0.5"/>
      <rect x="102" y="98" width="46" height="69" fill="${k}"/>
      <rect x="106" y="102" width="38" height="59" fill="${INK.yellow}"/>
      <path d="M106,102 L116,106 V157 L106,161 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>
      <path d="M100,99 H150" stroke="${k}" stroke-width="1"/>${leaves}
      <rect x="98" y="161" width="54" height="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
      <g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.35">
        <path d="M112,165.5 q-1,-2.6 4,-2.8 q5,0 4.4,2.8 Z"/><path d="M122,165.6 q-0.6,-2.6 4.4,-2.6 q5,0.2 4,2.6 Z"/>
      </g>
      <path d="M114,163.2 q2.2,-2.4 4.4,0 M124.4,163.2 q2.2,-2.4 4.4,0" fill="none" stroke="${k}" stroke-width="0.7"/>
      ${precip(ctx, { seed: 7, step: 5, px: 4, py: 22, dx: 1.4, dy: 9, dur: '0.35s', color: INK.blue, sw: 0.65 })}
      ${ripple(56, '0s')}${ripple(84, '-0.5s')}${ripple(170, '-0.9s')}${ripple(196, '-0.3s')}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.24"/>
      <rect x="38" y="62" width="174" height="105" fill="${INK.kaapi}" opacity="0.5"/>
      <rect x="38" y="62" width="174" height="105" fill="url(#${p}-hatch)" opacity="0.3"/>
      <path d="M38,62 H212" stroke="${k}" stroke-width="1.6"/>
      <path d="M38,60 H212" stroke="${INK.paper}" stroke-width="1.8"/>
      <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"><rect x="50" y="74" width="16" height="26"/><rect x="184" y="74" width="16" height="26"/></g>
      <path d="M58,74 V100 M50,87 H66 M192,74 V100 M184,87 H200" stroke="${k}" stroke-width="0.4"/>
      <path d="M48,73 h20 M182,73 h20" stroke="${INK.paper}" stroke-width="1.6"/>
      <rect x="104" y="80" width="42" height="62" fill="${k}"/>
      <path d="M108,92 A17,12 0 0 1 142,92 Z" fill="${INK.yellow}"/>
      <rect x="108" y="94" width="16" height="46" fill="${INK.kaapi}" stroke="${INK.paper}" stroke-width="0.3"/>
      <rect x="126" y="94" width="16" height="46" fill="${INK.kaapi}" stroke="${INK.paper}" stroke-width="0.3"/>
      <rect x="111" y="98" width="10" height="16" fill="${INK.yellow}" opacity="0.85"/><rect x="129" y="98" width="10" height="16" fill="${INK.yellow}" opacity="0.85"/>
      <g fill="${INK.paper}" stroke="${k}" stroke-width="0.45">
        <rect x="98" y="142" width="54" height="5"/><rect x="92" y="147" width="66" height="6.5"/><rect x="86" y="153.5" width="78" height="6.5"/><rect x="80" y="160" width="90" height="7"/>
      </g>
      <path d="M98,142 q6,-1.6 12,0 q8,-1.4 16,0 q8,-1.6 16,0 q5,-1.2 10,0 M92,147 q10,-1.4 20,0 q12,-1.6 24,0 q11,-1.2 22,0" fill="none" stroke="${k}" stroke-width="0.3"/>
      <path d="M80,167 C80,150 86,142 98,138 M170,167 C170,150 164,142 152,138" fill="none" stroke="${k}" stroke-width="1"/>
      <path d="M81,150 q3,-1.6 6,-0.2 M166,150 q-3,-1.6 -6,-0.2" stroke="${INK.paper}" stroke-width="1.4" fill="none"/>
      <g fill="${k}">
        <path d="M112,142 v-8 h4 v5 q4,0 5,3 Z"/><path d="M127,142 v-8 h4 v5 q4,0 5,3 Z"/>
      </g>
      <path d="M112,135.4 h4 M127,135.4 h4" stroke="${INK.red}" stroke-width="0.8"/>
      <circle cx="200" cy="40" r="14" fill="${INK.yellow}" opacity="0.28"/>
      <path d="M200,167 V44 M196,44 h8 l-1.4,-6 h-5.2 Z" stroke="${k}" stroke-width="1.2" fill="${INK.yellow}"/>
      ${precip(ctx, { kind: 'snow', seed: 41, step: 8, px: 3, py: 20, dur: '3.4s', color: INK.paper, sw: 0.55 })}`;

    return {
      top: { city: 'blr', caption: 'BASAVANAGUDI, APRIL', clause: 'Nobody leaves early', art: top },
      bottom: { city: 'nyc', caption: 'PARK SLOPE, DECEMBER', clause: 'in weather like this.', art: bottom }
    };
  }

  // ======================================================================
  // 10 of Clubs — Late on St Mark's. St. Mark's Road x St. Marks Place, 11 PM.
  // One signpost through the seam carries both street names.
  // ======================================================================
  function drawSaint(ctx) {
    const p = ctx.id, k = INK.ink;
    const stars = (seed) => {
      const r = rng(seed); let s = '';
      for (let i = 0; i < 26; i++) {
        const x = 40 + r() * 170, y = 34 + r() * 60, d = (r() * 3).toFixed(2);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.35 + r() * 0.4)}" fill="${INK.paper}">${ctx.a(loop('opacity', '1;0.2;1', '3s', ` begin="-${d}s"`))}</circle>`;
      }
      return s;
    };
    const stroll = (dur, begin, color) => `<g transform="translate(${CX} ${WIN.b})">${figure(ctx, { color })}${ctx.a(move('-110 0;110 0', dur, ` begin="${begin}"`))}</g>`;
    const winLight = (x, y, w, h, i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK.yellow}">${ctx.a(loop('opacity', '1;1;0.15;0.15;1', '7s', ` keyTimes="0;${(0.2 + i * 0.07).toFixed(2)};${(0.22 + i * 0.07).toFixed(2)};${(0.4 + i * 0.05).toFixed(2)};1" begin="-${i}s"`))}</rect>`;
    const post = (label, plate, textFill, font, size) => `
      <path d="M125,167 V104" stroke="${INK.paper}" stroke-width="1.8"/>
      <path d="M125,97 l1.3,3.6 l3.6,1.3 l-3.6,1.3 l-1.3,3.6 l-1.3,-3.6 l-3.6,-1.3 l3.6,-1.3 Z" fill="${INK.red}"/>
      <rect x="100" y="110" width="50" height="10" rx="1" fill="${plate}" stroke="${INK.paper}" stroke-width="0.5"/>
      <text x="125" y="117.3" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="700" letter-spacing="0.6" fill="${textFill}">${label}</text>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${k}"/>
      ${stars(5)}
      <path d="M196,38 a8,8 0 1 0 6,13 a6.4,6.4 0 1 1 -6,-13 Z" fill="${INK.paper}"/>
      <g fill="${INK.blue}" fill-opacity="0.75" stroke="${INK.paper}" stroke-width="0.4">
        <path d="M58,96 A18,18 0 0 1 94,96 Z"/>
        <rect x="73" y="70" width="6" height="8"/>
        <path d="M44,167 V112 H108 V167 Z"/>
        <path d="M44,112 L76,98 L108,112 Z"/>
      </g>
      <path d="M76,70 V62 M73,65 H79" stroke="${INK.paper}" stroke-width="0.6"/>
      <path d="M52,116 V167 M62,116 V167 M90,116 V167 M100,116 V167" stroke="${INK.paper}" stroke-width="0.9"/>
      <path d="M72,167 V146 a4,4 0 0 1 8,0 V167" fill="${INK.yellow}" opacity="0.9"/>
      <rect x="152" y="120" width="60" height="47" fill="${INK.paper}" fill-opacity="0.1" stroke="${INK.paper}" stroke-width="0.5"/>
      <path d="M150,120 H214 L210,128 H154 Z" fill="${INK.red}" stroke="${INK.paper}" stroke-width="0.4"/>
      <rect x="158" y="132" width="48" height="26" fill="${INK.yellow}"/>
      <g fill="${k}"><circle cx="168" cy="146" r="3"/><path d="M163,158 q5,-9 10,0 Z"/><circle cx="190" cy="145" r="3"/><path d="M185,158 q5,-9 10,0 Z"/><rect x="176" y="150" width="6" height="8"/></g>
      ${post("ST. MARK'S ROAD", INK.blue, INK.paper, FONT.sans, 4.6)}
      ${stroll('26s', '-6s', INK.paper)}${stroll('31s', '-20s', INK.paper)}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${k}"/>
      ${stars(9)}
      <g fill="${INK.red}" fill-opacity="0.55" stroke="${INK.paper}" stroke-width="0.4">
        <path d="M38,167 V62 H100 V167 Z"/><path d="M150,167 V74 H212 V167 Z"/>
      </g>
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => winLight(46 + c * 18, 72 + r * 26, 9, 13, r * 3 + c)).join('')).join('')}
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => winLight(158 + c * 18, 84 + r * 24, 9, 12, r * 2 + c + 1)).join('')).join('')}
      <g stroke="${INK.paper}" stroke-width="0.5" fill="none">
        <path d="M58,90 H94 M58,116 H94 M58,142 H94 M64,90 L88,116 M64,116 L88,142"/>
        <path d="M170,100 H206 M170,124 H206 M176,100 L200,124"/>
      </g>
      <path d="M38,148 H100 M150,148 H212" stroke="${INK.green}" stroke-width="3"/>
      ${post('ST MARKS PL', INK.green, INK.paper, FONT.sans, 5.4)}
      <rect x="111" y="122" width="28" height="7" rx="0.8" fill="${INK.green}" stroke="${INK.paper}" stroke-width="0.4"/>
      <text x="125" y="127.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.4" font-weight="700" fill="${INK.paper}">3 AV</text>
      ${stroll('14s', '-3s', INK.paper)}${stroll('17s', '-11s', INK.paper)}`;

    return {
      top: { city: 'blr', caption: "ST. MARK'S ROAD", clause: 'Same saint.', art: top },
      bottom: { city: 'nyc', caption: 'ST. MARKS PLACE', clause: 'Very different evenings.', art: bottom }
    };
  }

  // ======================================================================
  // Jokers — The Departure and The Return. The only cards with an "up".
  // Coffee is pulled from one vessel to the other; the sentence travels
  // inside the stream. No rotation, a single index, a broken seam.
  // ======================================================================
  function tumbler(x, y, rot, sc) {
    const k = INK.ink;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc || 1})">
      <path d="M-11,-15 L11,-15 L8,15 L-8,15 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
      <path d="M3,-13 L2,14 M6,-13 L4.6,14 M9,-13 L7,14" stroke="${k}" stroke-width="0.35" opacity="0.7"/>
      <path d="M-7.5,-12 L-6,13" stroke="${INK.paper}" stroke-width="1.3"/>
      <path d="M-11.6,-15 H11.6" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/>
    </g>`;
  }
  function paperCup(x, y, rot, sc) {
    const k = INK.ink;
    let key = '';
    for (let i = 0; i < 6; i++) { const kx = -16 + i * 5.4; key += `M${f(kx)},-6 v-4 h3.6 v2.4 h-1.6`; }
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc || 1})">
      <path d="M-18,-24 L18,-24 L13,24 L-13,24 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.7"/>
      <path d="M-17.4,-18 H17.4 M-16.6,-4 H16.6" stroke="${INK.paper}" stroke-width="0.7"/>
      <path d="${key}" fill="none" stroke="${INK.paper}" stroke-width="0.7" transform="translate(0 -3)"/>
      <path d="M0,0 c-4,0 -5,3 -4,6 c-3,2 -3,8 1,12 h6 c4,-4 4,-10 1,-12 c1,-3 0,-6 -4,-6 Z" fill="${INK.paper}" transform="translate(0 0.5) scale(0.9)"/>
      <path d="M-4,4 q-3,0 -3,3 M4,4 q3,0 3,3" fill="none" stroke="${INK.paper}" stroke-width="0.6"/>
      <path d="M-14.6,14 H14.6 M-14,17 H14" stroke="${INK.paper}" stroke-width="0.5"/>
      <path d="M-19,-24 H19" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>
    </g>`;
  }
  function davara(x, y, sc) {
    const k = INK.ink;
    return `<g transform="translate(${x} ${y}) scale(${sc || 1})">
      <path d="M-26,0 L26,0 Q24,10 16,15 L14,19 L-14,19 L-16,15 Q-24,10 -26,0 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
      <path d="M8,2 Q7,10 4,17 M14,2 Q12,10 9,16 M19,2 Q17,8 13,14" fill="none" stroke="${k}" stroke-width="0.35" opacity="0.7"/>
      <ellipse cx="0" cy="0" rx="26" ry="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
      <ellipse cx="0" cy="0.6" rx="21" ry="2" fill="${INK.kaapi}" opacity="0.7"/>
    </g>`;
  }
  function joker(variant, opts) {
    opts = opts || {};
    const dep = variant === 'departure';
    const p = (dep ? 'dep' : 'ret') + (opts.uid || '');
    const ctx = makeCtx(p, opts);
    const k = INK.ink;
    // Stream geometry, from the pouring lip to the receiving vessel. The
    // Return is the Departure mirrored left to right.
    const mx = (x) => (dep ? x : W - x);
    const s0 = dep ? [101, 93] : [142, 95];
    const c1 = dep ? [128, 101] : [115, 103];
    const c2 = dep ? [157, 158] : [93, 160];
    const s1 = dep ? [160, 252] : [90, 262];
    const flowPath = `M${s0[0]},${s0[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${s1[0]},${s1[1]}`;
    // Text must read upright, so on the Return it runs upstream, from the
    // davara back up to the cup. Going back is the point of that card.
    const textPath = dep ? flowPath : `M${s1[0]},${s1[1]} C${c2[0]},${c2[1]} ${c1[0]},${c1[1]} ${s0[0]},${s0[1]}`;
    const line = 'FUNNY HOW YOU CAN MISS TWO PLACES AT ONCE';
    const title = dep ? 'THE DEPARTURE' : 'THE RETURN';
    const numeral = dep ? 'I' : 'II';
    const milk = dep ? 1 : 0.72;
    const gapX = dep ? 158 : 92;

    const vessels = dep
      ? tumbler(84, 82, 122, 1.3) + paperCup(160, 282, 0, 1.25)
      : paperCup(166, 80, -122, 1.2) + davara(90, 262, 1.2);
    const froth = (cx, cy, rx) => {
      const r = rng(dep ? 3 : 4); let s = '';
      for (let i = 0; i < 9; i++) {
        const x = cx - rx + r() * rx * 2, y = cy - 1 + r() * 2, rr = 0.8 + r() * 1.6, d = (r() * 1.2).toFixed(2);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${INK.paper}" stroke="${k}" stroke-width="0.3">${ctx.a(loop('r', `${f(rr)};${f(rr * 0.4)};${f(rr)}`, '1.2s', ` begin="-${d}s"`))}</circle>`;
      }
      return s;
    };
    const textLen = 128;
    // Fine engraved rays behind the pour, centred on the middle of the stream.
    let rays = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, r0 = i % 2 ? 40 : 24;
      rays += `<path d="M${f(mx(140) + Math.cos(a) * r0)},${f(170 + Math.sin(a) * r0)} L${f(mx(140) + Math.cos(a) * 260)},${f(170 + Math.sin(a) * 260)}"/>`;
    }
    const startAnim = dep
      ? loop('startOffset', '-130;200', '7s')
      : loop('startOffset', '200;-130', '7s');

    return svgOpen(p, Object.assign({ title: `Joker: ${title[0] + title.slice(1).toLowerCase()}` }, opts)) + defs(p) + frame() +
      `<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.r - WIN.x}" height="${H - 2 * WIN.y}" rx="6" fill="${INK.yellow}" opacity="0.1"/>
      <g clip-path="url(#${p}-full)">
        <path d="M${WIN.x},${CY} H${gapX - 14} M${gapX + 14},${CY} H${WIN.r}" stroke="${INK.red}" stroke-width="0.6" opacity="0.55"/>
        <g stroke="${INK.yellow}" stroke-width="0.6" opacity="0.55">${rays}</g>
        ${vessels}
        <path d="${flowPath}" fill="none" stroke="${INK.kaapi}" stroke-opacity="${milk}" stroke-width="7.4" stroke-linecap="round"/>
        <path d="${flowPath}" fill="none" stroke="${INK.paper}" stroke-width="0.6" stroke-dasharray="5 11" opacity="0.7">${ctx.a(loop('stroke-dashoffset', '32;0', '0.8s'))}</path>
        <path id="${p}-tp" d="${textPath}" fill="none"/>
        <text font-family="${FONT.micro}" font-size="4.3" font-weight="700" letter-spacing="0.5" fill="${INK.paper}" dy="1.5"><textPath href="#${p}-tp" startOffset="${dep ? 34 : 38}" textLength="${textLen}" lengthAdjust="spacing">${line}${ctx.a(startAnim)}</textPath></text>
        ${dep ? froth(160, 253, 16) : froth(90, 263, 19)}
        ${dep ? steam(ctx, 182, 246, 28) : steam(ctx, 112, 256, 28)}
      </g>
      <rect x="${WIN.x}" y="${WIN.y}" width="${WIN.r - WIN.x}" height="${H - 2 * WIN.y}" rx="6" fill="none" stroke="${k}" stroke-width="0.6"/>
      <g font-family="${FONT.display}" font-size="9.5" font-weight="500" fill="${INK.red}" text-anchor="middle">
        ${'JOKER'.split('').map((ch, i) => `<text x="25" y="${36 + i * 10.5}">${ch}</text>`).join('')}
      </g>
      <path d="M25,93 l1.4,3.6 l3.6,1.4 l-3.6,1.4 l-1.4,3.6 l-1.4,-3.6 l-3.6,-1.4 l3.6,-1.4 Z" fill="${INK.ink}"/>
      <g transform="translate(${dep ? 88 : 162} 316)">
        <rect x="-44" y="-8" width="88" height="13" rx="1" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <text text-anchor="middle" y="1.4" font-family="${FONT.display}" font-size="6.6" font-weight="500" letter-spacing="1.6" fill="${k}">${title}</text>
      </g>
      <text x="${dep ? 225 : 225}" y="326" text-anchor="middle" font-family="${FONT.micro}" font-size="4.4" font-weight="700" letter-spacing="0.8" fill="${k}" opacity="0.7">${numeral}</text>
      </svg>`;
  }

  // ---------- registry ----------
  const CARDS = [
    { id: 'ride', rank: '8', rankName: 'Eight', suit: 'club', title: 'The Ride Home', draw: drawRide,
      pair: ['Auto-rickshaw', 'Yellow cab'],
      sentence: ['The minute it rains,', 'everyone is going the other way.'],
      why: 'Both cities have the same moment: it starts to rain at rush hour and every ride in town is suddenly going somewhere else. The auto and the cab share one road, and because the card is rotationally symmetric, they always pass going the other way.',
      mechanism: 'One road through the seam. The auto drives along the top half, the cab along the bottom; they meet nose to tail at the centre line. When the rain starts, the cab\'s roof light goes dark.' },
    { id: 'park', rank: '2', rankName: 'Two', suit: 'heart', title: 'Morning Walk', draw: drawPark,
      pair: ['Cubbon Park', 'Central Park'],
      sentence: ['Every loud city', 'needs somewhere to whisper.'],
      why: 'Both parks are the quiet hour of a loud city. At 6 AM they belong to the same people: walkers, runners, the regulars who nod at each other and never learn names.',
      mechanism: 'One trunk passes through the seam. Above it, the flat umbrella of a rain tree; below it, the vase of an American elm. Both canopies sway on the same breath. The Bangalore walker takes the loop slowly; the New York runner laps them.' },
    { id: 'usual', rank: '3', rankName: 'Three', suit: 'heart', title: 'The Usual', draw: drawUsual,
      pair: ['Darshini', 'Diner'],
      sentence: ["You don't order anymore.", 'You just nod.'],
      why: 'The deepest kind of belonging is being known by the person behind the counter. In a darshini you stand, in a diner you sit, and after enough mornings nobody asks.',
      mechanism: 'The seam is the counter. A tumbler in its davara stands on one side, a green-banded diner mug on the other. The steam rises away from the shared counter in both directions.' },
    { id: 'weather', rank: '7', rankName: 'Seven', suit: 'spade', title: "Four O'Clock", draw: drawWeather,
      pair: ['The April storm', 'The first snow'],
      sentence: ['Nobody leaves early', 'in weather like this.'],
      why: 'Bangalore\'s weather signature is the sudden 4 PM storm before the monsoon; New York\'s is snow at dusk. Different weather, same permission to stay.',
      mechanism: 'Two doorways back to back across the seam. Chappals on the step under a mango-leaf thorana; snow boots on a brownstone stoop. Rain ripples one side, snow settles on the other.' },
    { id: 'saint', rank: '10', rankName: 'Ten', suit: 'club', title: "Late on St Mark's", draw: drawSaint,
      pair: ["St. Mark's Road", 'St. Marks Place'],
      sentence: ['Same saint.', 'Very different evenings.'],
      why: 'Both cities have a street named for the same saint, and both are where people go when the night isn\'t over yet. The coincidence gets the smile; the evenings get the feeling.',
      mechanism: 'One signpost stands on the seam. Its blade reads ST. MARK\'S ROAD one way up and ST MARKS PL the other. Strollers loop with nowhere to be.' }
  ];
  const JOKERS = [
    { id: 'departure', title: 'The Departure', variant: 'departure' },
    { id: 'return', title: 'The Return', variant: 'return' }
  ];

  function render(id, opts) {
    const j = JOKERS.find((x) => x.id === id);
    if (j) return joker(j.variant, opts);
    const def = CARDS.find((x) => x.id === id);
    if (!def) throw new Error('Unknown card: ' + id);
    return mirroredCard(def, opts);
  }

  const api = { INK, FONT, HOURS, CARDS, JOKERS, SUIT_NAME, render, size: { w: W, h: H } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaleCards = api;
})(typeof window !== 'undefined' ? window : globalThis);
