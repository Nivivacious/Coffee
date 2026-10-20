/*
 * A Tale of Two Cities · card artwork.
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
    const stride = o.run ? 34 : 20, beat = o.run ? '0.5s' : '1s';
    const leg = (dir) => `<g transform="translate(0 -6.5)"><path d="M0,0 L0,6.5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>${ctx.a(spin(dir > 0 ? `${stride};${-stride};${stride}` : `${-stride};${stride};${-stride}`, beat))}</g>`;
    const arm = (dir) => `<g transform="translate(0 -12)"><path d="M0,0 L0,5" stroke="${c}" stroke-width="${sw * 0.8}" stroke-linecap="round"/>${ctx.a(spin(dir > 0 ? `${stride};${-stride};${stride}` : `${-stride};${stride};${-stride}`, beat))}</g>`;
    const lean = o.run ? ' transform="rotate(8)"' : '';
    return `<g${lean}>${leg(1)}${leg(-1)}<path d="M0,-6.5 L0,-12.6" stroke="${c}" stroke-width="${sw * 1.6}" stroke-linecap="round"/>${arm(-1)}${arm(1)}<circle cx="0" cy="-15" r="2.1" fill="${c}"/>${o.extra || ''}</g>`;
  }

  // Smooth in-out easing on every segment of a values list.
  function eased(count) {
    const kt = Array.from({ length: count }, (_, i) => f(i / (count - 1))).join(';');
    return ` calcMode="spline" keyTimes="${kt}" keySplines="${Array(count - 1).fill('0.45 0 0.55 1').join(';')}"`;
  }
  const nv = (v) => v.split(';').length;
  const easeLoop = (attr, values, dur, extra) => loop(attr, values, dur, eased(nv(values)) + (extra || ''));
  const easeMove = (values, dur, extra) => move(values, dur, eased(nv(values)) + (extra || ''));
  const easeSpin = (values, dur, extra) => spin(values, dur, eased(nv(values)) + (extra || ''));

  // A small bird with beating wings, centred on (0,0).
  function bird(ctx, color, flap, s) {
    const up = 'M-3.2,0 Q-1.6,-2.6 0,0 Q1.6,-2.6 3.2,0';
    const down = 'M-3.2,0 Q-1.6,1.6 0,0 Q1.6,1.6 3.2,0';
    return `<path d="${up}" transform="scale(${s || 1})" fill="none" stroke="${color}" stroke-width="0.7" stroke-linecap="round">${ctx.a(easeLoop('d', `${up};${down};${up}`, flap))}</path>`;
  }

  // Wisps that rise and fade: coffee steam, manholes, chimneys.
  function wisps(ctx, x, y, h, o) {
    o = Object.assign({ color: INK.ink, dur: 3, count: 4, sw: 0.6, spread: 4, op: 0.55 }, o);
    let s = '';
    for (let i = 0; i < o.count; i++) {
      const dx = o.count > 1 ? (i / (o.count - 1) - 0.5) * o.spread * 2 : 0;
      const d = `M${f(x + dx)},${y} c-3,${f(-h * 0.25)} 3,${f(-h * 0.45)} 0,${f(-h * 0.7)} s3,${f(-h * 0.2)} 0,${f(-h * 0.3)}`;
      const b = ` begin="-${f((o.dur / o.count) * i)}s"`;
      s += `<path d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.sw}" stroke-linecap="round" opacity="${ctx.still ? o.op : 0}">` +
        ctx.a(move(`0 6;${i % 2 ? 1.6 : -1.6} -2;0 -10`, o.dur + 's', b) +
          loop('opacity', `0;${o.op};${f(o.op * 0.6)};0`, o.dur + 's', b + ' keyTimes="0;0.3;0.7;1"')) + '</path>';
    }
    return s;
  }

  // A leaf that drifts down, turning, then fades. Hidden in the print frame.
  function fallingLeaf(ctx, x, y, drop, color, dur, begin) {
    if (ctx.still) return '';
    const b = ` begin="${begin}"`;
    return `<g transform="translate(${x} ${y})" opacity="0">
      ${loop('opacity', '0;1;1;0', dur, b + ' keyTimes="0;0.1;0.85;1"')}
      ${easeMove(`0 0;7 ${f(drop * 0.33)};-5 ${f(drop * 0.66)};3 ${drop}`, dur, b)}
      <path d="M0,-1.8 Q1.5,0 0,1.8 Q-1.5,0 0,-1.8 Z" fill="${color}" stroke="${INK.ink}" stroke-width="0.2">${spin('0;140;40;220', dur, b)}</path>
    </g>`;
  }

  // Rain hitting the ground along the top edge of the seam band.
  function splashes(ctx, seed, anim) {
    if (ctx.still) return '';
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < 12; i++) {
      const x = WIN.x + 6 + r() * (WIN.r - WIN.x - 12), d = f(r() * 0.8);
      s += `<path d="M${f(x - 1.6)},${WIN.b - 2.2} L${f(x)},${WIN.b - 0.4} L${f(x + 1.6)},${WIN.b - 2.2}" opacity="0">${loop('opacity', '0;0.9;0', '0.8s', ` begin="-${d}s"`)}</path>`;
    }
    return `<g fill="none" stroke="${INK.blue}" stroke-width="0.5" stroke-linecap="round">${anim || ''}${s}</g>`;
  }

  // A squirrel, ground contact at (0,0), facing right.
  function squirrel(color, stripes) {
    return `<g>
      <path d="M-3,-1 C-7.5,-1 -8.4,-6.4 -5.6,-9 C-4.8,-6.4 -4.2,-4.2 -2.6,-2.6 Z" fill="${color}"/>
      <path d="M-3.2,0 C-4.2,-3 -1.2,-5.2 2,-4.8 C4.2,-4.5 5.2,-3.2 4.8,-1.6 L5.8,-1.1 L4.6,0 Z" fill="${color}"/>
      ${stripes ? `<path d="M-2,-2.4 C0,-3.6 2,-3.8 4,-3.2 M-2.2,-1.4 C0,-2.4 2,-2.6 4,-2.1" stroke="${INK.paper}" stroke-width="0.35" fill="none"/>` : ''}
      <circle cx="3.6" cy="-3.6" r="0.4" fill="${INK.paper}"/>
    </g>`;
  }

  // ---------- vehicles (ground contact at y=0, facing right) ----------
  function wheel(ctx, x, dur) {
    return `<g transform="translate(${x} -6.6)"><circle r="6.6" fill="${INK.ink}"/><circle r="2.8" fill="${INK.paper}"/>` +
      `<g><path d="M-2.8,0 H2.8 M0,-2.8 V2.8" stroke="${INK.ink}" stroke-width="0.55"/>${ctx.a(spin('0;360', dur || '0.5s'))}</g>` +
      `<circle r="0.9" fill="${INK.ink}"/></g>`;
  }
  // Headlight cone, drawn behind the vehicle. Fades with `anim`.
  function beam(x, y, len, anim, still) {
    return `<path d="M${x},${y} L${x + len},${y - 9} L${x + len},${y + 13} Z" fill="${INK.yellow}" opacity="${still ? 0.32 : 0}">${anim || ''}</path>`;
  }
  function autoRickshaw(ctx, beamAnim) {
    const k = INK.ink;
    // Bubble canopy curving down to the rear, open side, narrow driver's cowl.
    const body = `
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
      <circle cx="36.6" cy="-22" r="2" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>`;
    return `<g>
      ${beam(37, -22, 54, beamAnim, ctx.still)}
      <ellipse cx="2" cy="0.4" rx="40" ry="1.5" fill="${k}" opacity="0.25"/>
      <g>${body}${ctx.a(easeMove('0 0;0 -0.8;0 0', '0.4s'))}</g>
      ${wheel(ctx, -24, '0.5s')}${wheel(ctx, 27, '0.5s')}
    </g>`;
  }
  function yellowCab(ctx, lightAnim, beamAnim) {
    const k = INK.ink;
    return `<g>
      ${beam(44, -16, 58, beamAnim, ctx.still)}
      <ellipse cx="1" cy="0.4" rx="44" ry="1.5" fill="${k}" opacity="0.25"/>
      <path d="M-42,-9 Q-42,-19.5 -36,-20.5 L-22,-22.5 Q-16,-34.5 -10,-35.5 L13,-35.5 Q19,-35.5 23,-30.5 L29.5,-22.5 L39.5,-20.8 Q44.5,-19.8 44.5,-14 L44.5,-9 Q44.5,-6 41.5,-6 L-39,-6 Q-42,-6 -42,-9 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
      <path d="M-18.3,-23.2 Q-13.3,-32.6 -9.2,-33.1 L-1,-33.1 L-1,-23.2 Z M2,-33.1 L12.4,-33.1 Q16.8,-33.1 19.7,-29.4 L24.3,-23.2 L2,-23.2 Z" fill="${k}" opacity="0.88"/>
      <path d="M-15,-31 L-11,-25 M6,-32 L10,-25" stroke="${INK.paper}" stroke-width="0.6" opacity="0.5"/>
      <path d="M0.5,-23 V-8.5 M-20,-23 V-8.5 M22,-21.5 V-8.5" stroke="${k}" stroke-width="0.35"/>
      <path d="M-40.5,-14.5 H43.5" stroke="${k}" stroke-width="0.35"/>
      <path d="M-14.5,-18 h3.5 M6,-18 h3.5" stroke="${k}" stroke-width="0.8" stroke-linecap="round"/>
      <text x="-9" y="-10.2" font-family="${FONT.sans}" font-size="3.4" font-weight="700" letter-spacing="0.4" fill="${k}">NYC TAXI</text>
      <g>
        <rect x="-8.5" y="-41" width="16" height="5.4" rx="1.1" fill="${INK.paper}" stroke="${k}" stroke-width="0.55"/>
        <text x="-0.5" y="-36.9" text-anchor="middle" font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${k}">5J17</text>
        <rect x="-8.5" y="-41" width="16" height="5.4" rx="1.1" fill="${k}" opacity="${ctx.still ? 1 : 0}">${lightAnim || ''}</rect>
      </g>
      ${wheel(ctx, -26, '0.5s')}${wheel(ctx, 29, '0.5s')}
      <path d="M41.5,-17.5 h2.6 v3 h-2.6 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
      <path d="M-42,-17 h2.4 v3 h-2.4 Z" fill="${INK.red}"/>
    </g>`;
  }
  // A dark car at night with headlights, facing right.
  function nightCar() {
    return `<g>
      <path d="M30,-9 L80,-18 L80,2 Z" fill="${INK.yellow}" opacity="0.28"/>
      <path d="M-28,-4 Q-28,-11 -22,-12 L-12,-13 Q-7,-20 -2,-20 L12,-20 Q17,-20 20,-15 L26,-12.5 Q30,-11.5 30,-7 L30,-4 Z" fill="${INK.ink}" stroke="${INK.paper}" stroke-width="0.35"/>
      <path d="M-9,-13 Q-6,-18 -2,-18.4 L4,-18.4 L4,-13 Z M6,-18.4 L11,-18.4 Q15,-18.4 17,-15 L18.6,-13 L6,-13 Z" fill="${INK.yellow}" opacity="0.5"/>
      <circle cx="-18" cy="-3.4" r="3.4" fill="${INK.ink}" stroke="${INK.paper}" stroke-width="0.35"/><circle cx="20" cy="-3.4" r="3.4" fill="${INK.ink}" stroke="${INK.paper}" stroke-width="0.35"/>
      <circle cx="29" cy="-8.4" r="1.3" fill="${INK.yellow}"/><rect x="-28.6" y="-9.6" width="1.6" height="2.4" fill="${INK.red}"/>
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
    const hour = side.hour || HOURS[def.rank] || '';
    const capText = side.caption + (hour ? ' · ' + hour : '');
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
        <rect x="${-(capText.length * 1.62 + 7)}" y="-4.6" width="${capText.length * 3.24 + 14}" height="7.6" rx="1" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/>
        <text text-anchor="middle" y="1.1" font-family="${FONT.micro}" font-size="4.3" font-weight="700" letter-spacing="0.75" fill="${k}">${esc(capText)}</text>
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
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} role="img" aria-labelledby="${p}-t${opts.desc ? ` ${p}-d` : ''}" data-card="${p}">${fonts}<title id="${p}-t">${esc(opts.title || '')}</title>${opts.desc ? `<desc id="${p}-d">${esc(opts.desc)}</desc>` : ''}${bleed ? `<rect x="${-bleed}" y="${-bleed}" width="${W + 2 * bleed}" height="${H + 2 * bleed}" fill="${INK.paper}"/>` : ''}`;
  }

  function mirroredCard(def, opts) {
    opts = opts || {};
    const p = def.id + (opts.uid || '');
    const ctx = makeCtx(p, opts);
    const art = def.draw(ctx);
    return svgOpen(p, Object.assign({ title: `${def.rankName} of ${SUIT_NAME[def.suit]}: ${def.title}`, desc: `${def.pair[0]} in Bengaluru and ${def.pair[1]} in New York. ${def.mechanism || ''} Hidden line: ${def.sentence.join(' ')}` }, opts)) +
      defs(p) + frame() +
      `<g>${half(ctx, def, art.top)}</g>` +
      `<g transform="rotate(180 ${CX} ${CY})">${half(ctx, def, art.bottom)}</g>` +
      seamLine() + (art.over || '') + '</svg>';
  }

  // Every card is one film loop. Each moving part repeats a whole number of
  // times per loop, so the film joins up without a seam, and the sound
  // engine (sound.js) can follow it by reading the SVG clock.
  const CYCLE = { ride: 12, park: 24, usual: 12, weather: 12, saint: 12, departure: 8, return: 8 };

  // ======================================================================
  // 8 of Clubs: The Ride Home. Auto-rickshaw x yellow cab, 6 PM, rain.
  // The auto and the cab share one road. Because the New York half is the
  // Bangalore half turned around, they always pass going the other way.
  // ======================================================================
  function drawRide(ctx) {
    const p = ctx.id, k = INK.ink;
    const T = '12s';
    // Rain eases off mid-loop and comes back; the cab's light follows it.
    const rainKey = ' keyTimes="0;0.42;0.5;0.79;0.92;1"';
    const rainOn = ctx.a(loop('opacity', '1;1;0;0;1;1', T, rainKey));
    const beamOn = ctx.a(loop('opacity', '0.34;0.34;0.1;0.1;0.34;0.34', T, rainKey));
    const lightOff = ctx.a(loop('opacity', '1;1;0;0;1;1', T, ' keyTimes="0;0.44;0.46;0.86;0.88;1"'));
    const drive = (inner) => `<g transform="translate(${CX} ${WIN.b})">${inner}${ctx.a(move('-200 0;200 0', T, ' begin="-6s"'))}</g>`;
    const rain = (seed) =>
      precip(ctx, { seed, step: 9, px: 4, py: 24, dx: 1.2, dy: 6, dur: '0.6s', color: INK.blue, sw: 0.45, opacity: 0.55, anim: rainOn }) +
      precip(ctx, { seed: seed + 1, step: 8, px: 5, py: 26, dx: 1.6, dy: 8, dur: '0.4s', color: INK.blue, sw: 0.75, anim: rainOn });
    const cables = `<g>${ctx.a(easeMove('0 0;0 1.4;0 0', '4s'))}<path d="M30,52 Q90,66 150,50 T260,58 M30,60 Q100,72 160,58 T260,66" fill="none" stroke="${k}" stroke-width="0.3"/></g>`;
    const glow = (x, y, w, h, begin) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK.yellow}" opacity="${ctx.still ? 1 : 0}">${ctx.a(easeLoop('opacity', '0;1;1;0', T, ` begin="${begin}"`))}</rect>`;

    const top = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.ink}" opacity="${ctx.still ? 0.06 : 0}">${ctx.a(loop('opacity', '0.06;0.06;0;0;0.06;0.06', T, rainKey))}</rect>
      ${cables}
      <path d="M150,167 V44 M146,48 H154" stroke="${k}" stroke-width="1.2"/>
      <g>${ctx.a(easeSpin('0 60 167;1.2 60 167;0 60 167;-1 60 167;0 60 167', '6s'))}
        <path d="${scallop(66, 92, 48, 20, 16, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(66, 92, 48, 20, 16, 5)}" fill="url(#${p}-leaf)"/>
      </g>
      <path d="M60,167 C62,140 64,122 58,108 M64,132 C70,120 80,112 92,106 M62,124 C54,114 46,110 40,108" fill="none" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="158" y="104" width="58" height="63" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M158,104 H216" stroke="${k}" stroke-width="1.4"/>
      <g transform="translate(196 92)"><rect x="-7" y="0" width="14" height="12" rx="2.5" fill="${k}"/><path d="M-7,4 H7 M-7,8 H7" stroke="${INK.paper}" stroke-width="0.35"/><rect x="-3" y="-1.6" width="6" height="2" rx="0.8" fill="${k}"/></g>
      <g fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.4"><rect x="166" y="113" width="10" height="13"/><rect x="186" y="113" width="10" height="13"/></g>
      ${glow(186, 113, 10, 13, '-2s')}
      <path d="M166,113 V126 M171,113 V126 M186,113 V126 M191,113 V126" stroke="${k}" stroke-width="0.3"/>
      <rect x="164" y="136" width="46" height="31" fill="url(#${p}-hatch)" stroke="${k}" stroke-width="0.5"/>
      <rect x="164" y="152" width="46" height="15" fill="${INK.yellow}" opacity="0.55"/>
      <rect x="166" y="129" width="42" height="9" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
      <text x="187" y="136.2" text-anchor="middle" font-family="${FONT.kn}" font-size="6.4" font-weight="700" fill="${INK.paper}">ಕಾಫಿ</text>
      ${wisps(ctx, 200, 150, 22, { dur: 3, count: 3, spread: 3, op: 0.45 })}
      ${rain(11)}
      ${splashes(ctx, 3, rainOn)}
      ${drive(autoRickshaw(ctx, beamOn))}`;

    const bottom = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="${INK.ink}" opacity="${ctx.still ? 0.06 : 0}">${ctx.a(loop('opacity', '0.06;0.06;0;0;0.06;0.06', T, rainKey))}</rect>
      <rect x="38" y="64" width="76" height="103" fill="${INK.red}" opacity="0.22"/>
      <rect x="38" y="64" width="76" height="103" fill="url(#${p}-brick)"/>
      <path d="M38,64 H114 V167" fill="none" stroke="${k}" stroke-width="0.6"/>
      <g fill="${INK.paper}" stroke="${k}" stroke-width="0.4">
        ${[74, 100, 126].map((y) => [46, 64, 82, 100].map((x) => `<rect x="${x}" y="${y}" width="9" height="13"/>`).join('')).join('')}
      </g>
      ${glow(46, 74, 9, 13, '0s')}${glow(82, 74, 9, 13, '-7s')}${glow(64, 100, 9, 13, '-3s')}${glow(100, 100, 9, 13, '-9s')}${glow(46, 126, 9, 13, '-5s')}${glow(82, 126, 9, 13, '-1s')}
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
      <path d="M200,167 V92 Q200,86 194,86 H186" fill="none" stroke="${k}" stroke-width="1.3"/>
      <path d="M180,84 h8 v4 h-8 Z" fill="${k}"/>
      <g transform="translate(200 120)"><rect x="-1" y="0" width="12" height="18" fill="${k}" opacity="0"/></g>
      <g transform="translate(150 112)"><rect x="-1" y="0" width="22" height="7" fill="${k}"/><path d="M2,3.5 H16 M13,1.5 L17,3.5 L13,5.5" stroke="${INK.paper}" stroke-width="0.8" fill="none"/><text x="5" y="5.6" font-family="${FONT.sans}" font-size="2.6" font-weight="700" fill="${INK.paper}">ONE WAY</text></g>
      <path d="M122,124 H170 L166,132 H126 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
      <path d="M130,124 L128,132 M138,124 L137,132 M146,124 V132 M154,124 L155,132 M162,124 L164,132" stroke="${INK.paper}" stroke-width="1.2"/>
      <rect x="126" y="132" width="40" height="35" fill="${INK.yellow}" fill-opacity="0.45" stroke="${k}" stroke-width="0.45"/>
      <g transform="translate(184 167)">
        <rect x="-3" y="-17" width="6" height="17" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <path d="M-3,-14 h6 v3 h-6 Z M-3,-8 h6 v3 h-6 Z" fill="${INK.red}"/>
      </g>
      ${wisps(ctx, 184, 148, 46, { color: INK.paper, sw: 3.2, dur: 4, count: 4, spread: 2.5, op: 0.95 })}
      ${wisps(ctx, 184, 148, 46, { color: k, sw: 0.3, dur: 4, count: 4, spread: 2.5, op: 0.35 })}
      ${rain(29)}
      ${splashes(ctx, 9, rainOn)}
      ${drive(yellowCab(ctx, lightOff, beamOn))}`;

    return {
      top: { city: 'blr', caption: 'RICHMOND ROAD', clause: 'The minute it rains,', art: top },
      bottom: { city: 'nyc', caption: 'SECOND AVENUE', clause: 'everyone is going the other way.', art: bottom }
    };
  }

  // ======================================================================
  // 2 of Hearts: Morning Walk. Cubbon Park x Central Park, 6 AM.
  // One trunk through the seam: a rain tree's umbrella above, an American
  // elm's vase below. The walker takes the loop once while the runner
  // laps it twice.
  // ======================================================================
  function drawPark(ctx) {
    const p = ctx.id, k = INK.ink;
    const swayT = ctx.a(easeSpin('0 125 167;1.4 125 167;0 125 167;-1.4 125 167;0 125 167', '12s'));
    const walk = (fig, dur, begin) => `<g transform="translate(${CX} ${WIN.b})">${fig}${ctx.a(move('-110 0;110 0', dur, ` begin="${begin}"`))}</g>`;
    const flock = (birds, dur, begin, y) => ctx.still ? '' :
      `<g transform="translate(0 ${y})">${move('250 0;0 -6;-40 -10', dur, ` begin="${begin}"`)}${birds}</g>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.16"/>
      <g transform="translate(186 64)">
        <g stroke="${INK.yellow}" stroke-width="0.7" opacity="0.7">${ctx.a(spin('0;360', '24s'))}
          ${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return `<path d="M${f(Math.cos(a) * 17)},${f(Math.sin(a) * 17)} L${f(Math.cos(a) * (i % 2 ? 24 : 30))},${f(Math.sin(a) * (i % 2 ? 24 : 30))}"/>`; }).join('')}
        </g>
        <circle r="13" fill="${INK.yellow}"/>
      </g>
      <g>${ctx.a(easeMove('0 0;5 0;0 0', '12s'))}<path d="M156,60 H216 M152,66 H216 M160,72 H216" stroke="${INK.paper}" stroke-width="0.8"/></g>
      <g fill="${INK.red}" stroke="${k}" stroke-width="0.35">
        <path d="M158,167 V138 H168 V128 L176,118 L184,128 V138 H194 V167 Z"/>
        <path d="M154,167 V128 L156.5,121 L159,128 V167 Z M193,167 V128 L195.5,121 L198,128 V167 Z"/>
      </g>
      <g fill="${INK.paper}"><path d="M172,150 v-6 a4,4 0 0 1 8,0 v6 Z"/><path d="M161,152 v-4 a2,2 0 0 1 4,0 v4 Z M187,152 v-4 a2,2 0 0 1 4,0 v4 Z"/></g>
      <g stroke="${INK.green}" stroke-width="1.3" stroke-linecap="round">${ctx.a(easeSpin('0 46 167;1.5 46 167;0 46 167', '6s'))}
        <path d="M42,167 C42,130 44,100 46,72 M48,167 C49,128 52,98 56,64 M54,167 C56,132 60,108 66,80 M37,167 C37,132 38,104 38,86"/>
        <path d="M46,80 l6,-4 M47,96 l-6,-3 M54,74 l6,-5 M56,92 l6,-3 M60,104 l6,-4 M45,112 l-6,-2" stroke-width="0.9"/>
      </g>
      <path d="M60,159 H92 M62,159 V167 M90,159 V167 M60,154 H92" stroke="${k}" stroke-width="0.9"/>
      <g transform="translate(70 154)">${squirrel(INK.kaapi, true)}${ctx.a(easeMove('0 0;0 -1.2;0 0;0 0', '3s'))}</g>
      <g>${swayT}
        <path d="M119.5,167 C122,150 121.5,136 116.5,124 L121,122 C124,132 126,132 129,122 L133.5,124 C128.5,136 128,150 130.5,167 Z" fill="${k}"/>
        <path d="M118,124 C110,114 96,108 82,104 M132,124 C140,114 154,108 168,104 M125,126 V104" fill="none" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="${scallop(125, 90, 66, 22, 22, 4.5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(125, 90, 66, 22, 22, 4.5)}" fill="url(#${p}-leaf)"/>
        <path d="M70,98 Q125,112 180,98" fill="none" stroke="${k}" stroke-width="0.4" opacity="0.6"/>
      </g>
      ${fallingLeaf(ctx, 92, 106, 58, INK.green, '8s', '0s')}${fallingLeaf(ctx, 150, 108, 56, INK.yellow, '8s', '-3s')}${fallingLeaf(ctx, 172, 102, 62, INK.green, '8s', '-6s')}
      ${flock(`<g transform="translate(0 0)">${bird(ctx, k, '0.4s', 1)}</g><g transform="translate(9 5)">${bird(ctx, k, '0.4s', 0.85)}</g>`, '12s', '-2s', 46)}
      ${walk(figure(ctx, { color: k }), '24s', '-12s')}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.10"/>
      <g fill="none" stroke="${k}" stroke-width="0.4" opacity="0.55">
        <path d="M158,167 V104 H210 V167"/><path d="M164,104 V78 H174 V104 M192,104 V78 H202 V104"/>
        <path d="M169,78 V70 M197,78 V70"/><circle cx="169" cy="74" r="3"/><circle cx="197" cy="74" r="3"/>
        <path d="M162,114 H206 M162,124 H206 M162,134 H206 M162,144 H206"/>
      </g>
      <g>${ctx.a(easeMove('0 0;-8 0;0 0', '12s'))}<path d="M30,146 H220 M40,152 H230 M24,158 H200" stroke="${INK.paper}" stroke-width="1.2" opacity="0.9"/></g>
      <g transform="translate(66 167)">
        <path d="M0,0 V-40" stroke="${k}" stroke-width="1.7"/>
        <path d="M-3.5,-40 h7 l-1.2,-8 h-4.6 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
        <circle cx="0" cy="-44" r="7" fill="${INK.yellow}" opacity="${ctx.still ? 0.2 : 0.2}">${ctx.a(easeLoop('opacity', '0.25;0.08;0.25', '6s'))}</circle>
        <path d="M-4,-48 h8 l-4,-3.5 Z" fill="${k}"/>
        <rect x="-3.8" y="-22" width="7.6" height="3.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/>
        <text y="-19.4" text-anchor="middle" font-family="${FONT.sans}" font-size="2.5" font-weight="700" fill="${k}">7203</text>
      </g>
      <path d="M150,160 H182 M152,160 V167 M180,160 V167 M150,155 H182" stroke="${k}" stroke-width="0.9"/>
      <g>${swayT}
        <path d="M120,167 C122,152 122,142 119,132 L131,132 C128,142 128,152 130,167 Z" fill="${k}"/>
        <path d="M121,134 C112,118 100,100 84,86 M124,134 C120,116 112,96 106,78 M126,134 C130,116 138,96 144,78 M129,134 C138,118 150,100 166,86" fill="none" stroke="${k}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="${scallop(125, 74, 70, 28, 24, 4)}" fill="${INK.green}" fill-opacity="0.82" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(125, 74, 70, 28, 24, 4)}" fill="url(#${p}-hatch)" opacity="0.5"/>
        <path d="M84,86 C96,100 106,104 125,104 C144,104 154,100 166,86" fill="none" stroke="${k}" stroke-width="0.4"/>
      </g>
      ${fallingLeaf(ctx, 100, 100, 64, INK.yellow, '8s', '-1s')}${fallingLeaf(ctx, 140, 104, 60, INK.yellow, '8s', '-5s')}
      ${ctx.still ? `<g transform="translate(96 167)">${squirrel(INK.ink, false)}</g>` : `<g transform="translate(${CX} ${WIN.b})">${move('120 0;-120 0', '12s', ' begin="-9s"')}<g transform="scale(-1 1)">${squirrel(INK.ink, false)}${easeMove('0 0;0 -2.4;0 0', '0.4s')}</g></g>`}
      ${flock(`<g>${bird(ctx, INK.blue, '0.3s', 1.1)}</g>`, '8s', '-1s', 52)}
      ${walk(figure(ctx, { color: k, run: true }), '12s', '-6s')}`;

    return {
      top: { city: 'blr', caption: 'CUBBON PARK', clause: 'Every loud city', art: top },
      bottom: { city: 'nyc', caption: 'CENTRAL PARK', clause: 'needs somewhere to whisper.', art: bottom }
    };
  }

  // ======================================================================
  // 3 of Hearts: The Usual. Darshini x diner, 8 AM.
  // The seam is the counter. A tumbler in its davara on one side, a
  // green-banded diner mug on the other, both already poured.
  // ======================================================================
  function drawUsual(ctx) {
    const p = ctx.id, k = INK.ink;
    const steel = `fill="${k}" fill-opacity="0.12" stroke="${k}" stroke-width="0.6"`;
    const froth = (cx, cy, rx, seed) => {
      const r = rng(seed); let s = '';
      for (let i = 0; i < 6; i++) {
        const x = cx - rx + r() * rx * 2, rr = f(0.5 + r() * 0.7), d = f(r() * 2);
        s += `<circle cx="${f(x)}" cy="${f(cy - 0.3 + r() * 0.6)}" r="${rr}" fill="${INK.paper}" stroke="${k}" stroke-width="0.2">${ctx.a(loop('r', `${rr};${f(rr * 0.3)};${rr}`, '2s', ` begin="-${d}s"`))}</circle>`;
      }
      return s;
    };
    // Ceiling fan seen from the side: the blade bar flips to read as turning.
    const fan = `<g transform="translate(194 30)">
        <path d="M0,-10 V3" stroke="${k}" stroke-width="0.8"/>
        <rect x="-3" y="2" width="6" height="3.4" rx="1.2" fill="${k}"/>
        <g transform="translate(0 4)"><path d="M-22,0 Q-11,-1.6 0,0 Q11,1.6 22,0" fill="none" stroke="${k}" stroke-width="1.4" stroke-linecap="round">${ctx.a(move('0 0', '1s'))}</path>${ctx.a(`<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;-1 1;1 1" dur="0.5s" repeatCount="indefinite"/>`)}</g>
      </g>`;
    const tube = (x, y, w) => `<g><rect x="${x}" y="${y}" width="${w}" height="3.4" rx="1.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="${x - 6}" y="${y - 5}" width="${w + 12}" height="13" rx="6" fill="${INK.yellow}" opacity="0.35">${ctx.a(loop('opacity', '0.35;0.35;0.05;0.35;0.08;0.35;0.35', '12s', ' keyTimes="0;0.3;0.31;0.32;0.33;0.34;1"'))}</rect></g>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.13"/>
      <rect x="38" y="128" width="174" height="39" fill="${INK.paper}"/>
      <path d="M38,128 H212 M38,141 H212 M38,154 H212 ${Array.from({ length: 13 }, (_, i) => `M${50 + i * 13},128 V167`).join(' ')}" stroke="${k}" stroke-width="0.25" opacity="0.6"/>
      ${fan}
      ${tube(128, 40, 32)}
      <rect x="46" y="44" width="72" height="62" fill="${INK.green}" stroke="${k}" stroke-width="0.7"/>
      <rect x="49" y="47" width="66" height="56" fill="none" stroke="${INK.paper}" stroke-width="0.35"/>
      <g font-family="${FONT.kn}" font-weight="700" fill="${INK.paper}" text-anchor="middle">
        <text x="82" y="63" font-size="9.5">ಇಡ್ಲಿ · ವಡೆ</text>
        <text x="82" y="78" font-size="9.5">ದೋಸೆ</text>
        <text x="82" y="94" font-size="9.5">ಕಾಫಿ</text>
      </g>
      <rect x="140" y="56" width="62" height="10" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
      <text x="171" y="63.3" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" letter-spacing="1" fill="${INK.paper}">SELF SERVICE</text>
      <g ${steel}><ellipse cx="186" cy="164" rx="15" ry="2.4"/><ellipse cx="186" cy="160.6" rx="15" ry="2.4"/><ellipse cx="186" cy="157.2" rx="15" ry="2.4"/><ellipse cx="186" cy="153.8" rx="15" ry="2.4"/></g>
      <path d="M178,152 L182,150 M190,152 L194,150" stroke="${INK.paper}" stroke-width="0.8"/>
      <path d="M102,150 L148,150 Q146,159 139,163.5 L137,167 L113,167 L111,163.5 Q104,159 102,150 Z" ${steel}/>
      <ellipse cx="125" cy="150" rx="23" ry="2.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M113.5,116 L136.5,116 L133,155 L117,155 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M128,118 L126.6,154 M131,118 L129.6,154 M134,118 L131.8,154" stroke="${k}" stroke-width="0.35" opacity="0.7"/>
      <path d="M117,120 L118.5,153" stroke="${INK.paper}" stroke-width="1.2"/>
      <path d="M116,122 L117.2,150" stroke="${INK.yellow}" stroke-width="0.8" opacity="0">${ctx.a(easeLoop('opacity', '0;0.9;0', '6s'))}</path>
      <ellipse cx="125" cy="116" rx="11.5" ry="2" fill="${INK.kaapi}" fill-opacity="0.35" stroke="${k}" stroke-width="0.7"/>
      <path d="${scallop(125, 116, 8, 1.1, 10, 0.6)}" fill="${INK.paper}" opacity="0.9"/>
      ${froth(125, 116, 7, 21)}
      ${wisps(ctx, 125, 110, 32, { dur: 3, count: 4 })}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.red}" opacity="0.07"/>
      <rect x="38" y="122" width="174" height="45" fill="url(#${p}-hatch)" opacity="0.35"/>
      <path d="M38,122 H212" stroke="${k}" stroke-width="0.6"/>
      <rect x="46" y="44" width="72" height="62" fill="${k}"/>
      <path d="M49,48 H115 M49,102 H115" stroke="${INK.paper}" stroke-width="0.3" stroke-dasharray="0.8 1.2"/>
      <g font-family="${FONT.sans}" font-weight="700" fill="${INK.paper}" letter-spacing="0.6" font-size="6">
        <text x="52" y="60">COFFEE</text><text x="52" y="72">EGGS ANY STYLE</text><text x="52" y="84">HOME FRIES</text><text x="52" y="96">PIE, À LA MODE</text>
      </g>
      <text x="171" y="64" text-anchor="middle" font-family="${FONT.sans}" font-size="14" font-weight="700" letter-spacing="1.5" fill="none" stroke="${INK.pink}" stroke-width="3" opacity="0.25">OPEN${ctx.a(loop('opacity', '0.25;0.25;0;0.25;0;0.25;0.25', '12s', ' keyTimes="0;0.7;0.71;0.73;0.75;0.77;1"'))}</text>
      <text x="171" y="64" text-anchor="middle" font-family="${FONT.sans}" font-size="14" font-weight="700" letter-spacing="1.5" fill="none" stroke="${INK.pink}" stroke-width="1">OPEN${ctx.a(loop('opacity', '1;1;0.15;1;0.25;1;1', '12s', ' keyTimes="0;0.7;0.71;0.73;0.75;0.77;1"'))}</text>
      <g transform="translate(186 167)">
        <path d="M-16,0 H16 M0,0 V-6 M-14,-6 H14" stroke="${k}" stroke-width="0.8"/>
        <path d="M-12,-7 L12,-7 L2,-16 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <path d="M-12,-7 L2,-16 L4,-14 L-9,-7 Z" fill="${INK.kaapi}" opacity="0.7"/>
        <path d="M-15,-6.5 C-15,-30 15,-30 15,-6.5" fill="${INK.blue}" fill-opacity="0.08" stroke="${k}" stroke-width="0.5"/>
        <path d="M-10,-12 C-10,-22 -2,-25 4,-25" fill="none" stroke="${INK.paper}" stroke-width="1">${ctx.a(easeLoop('opacity', '0.3;1;0.3', '6s'))}</path>
      </g>
      <g transform="translate(92 167)">
        <path d="M-5,0 V-16 Q-5,-18 -3,-18 H3 Q5,-18 5,-16 V0 Z" fill="${INK.paper}" fill-opacity="0.6" stroke="${k}" stroke-width="0.5"/>
        <path d="M-5,-10 H5 V0 H-5 Z" fill="${INK.paper}"/>
        <path d="M-4.4,-18 Q0,-23 4.4,-18 Z M0,-21 L5,-24" fill="${k}" stroke="${k}" stroke-width="0.6"/>
      </g>
      <ellipse cx="125" cy="164.6" rx="19" ry="2.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M137,134 C147,134 147,152 136,152" fill="none" stroke="${k}" stroke-width="3.2"/>
      <path d="M137,134 C147,134 147,152 136,152" fill="none" stroke="${INK.paper}" stroke-width="1.8"/>
      <path d="M112.5,128 L137.5,128 L136.5,159 Q136.5,163 132.5,163 L117.5,163 Q113.5,163 113.5,159 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
      <path d="M113,134 H137 M113.2,136.2 H136.8" stroke="${INK.green}" stroke-width="0.8"/>
      <path d="M131,131 L130.5,160" stroke="${k}" stroke-width="0.35" opacity="0.6"/>
      <ellipse cx="125" cy="128" rx="12.5" ry="2" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.7"/>
      <ellipse cx="125" cy="128" rx="5" ry="0.8" fill="none" stroke="${INK.paper}" stroke-width="0.35" opacity="0.6">${ctx.a(loop('rx', '2;10;2', '4s') + loop('opacity', '0.7;0;0.7', '4s'))}</ellipse>
      ${wisps(ctx, 125, 122, 32, { dur: 3, count: 4 })}`;

    return {
      top: { city: 'blr', caption: 'DARSHINI, JAYANAGAR', clause: "You don't order anymore.", art: top },
      bottom: { city: 'nyc', caption: 'DINER, ASTORIA', clause: 'You just nod.', art: bottom }
    };
  }

  // ======================================================================
  // 7 of Spades: Four O'Clock. The pre-monsoon storm x first snow, 4 PM.
  // Two doorways back to back across the seam: chappals on a step under a
  // mango-leaf thorana, snow boots on a brownstone stoop. Nobody has left.
  // ======================================================================
  function drawWeather(ctx) {
    const p = ctx.id, k = INK.ink;
    const ripple = (x, delay) => `<ellipse cx="${x}" cy="166" rx="1" ry="0.4" fill="none" stroke="${INK.blue}" stroke-width="0.5" opacity="0">${ctx.a(loop('rx', '1;9', '1.5s', ` begin="${delay}"`) + loop('ry', '0.4;1.9', '1.5s', ` begin="${delay}"`) + loop('opacity', '1;0', '1.5s', ` begin="${delay}"`))}</ellipse>`;
    let leaves = '';
    for (let i = 0; i < 7; i++) {
      const x = 106 + i * 6.3;
      leaves += `<path d="M${x},101 q-1.6,4 0,8 q1.6,-4 0,-8 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.25">${ctx.a(easeSpin(`0 ${x} 101;${i % 2 ? 8 : -8} ${x} 101;0 ${x} 101`, '2s', ` begin="-${f(i * 0.27)}s"`))}</path>`;
    }
    // Lightning at 6.0 s in the 12 s loop. Thunder follows in the sound.
    const flashKey = ' keyTimes="0;0.5;0.505;0.52;0.535;0.56;1"';

    const top = `
      <rect width="${W}" height="${H}" fill="${k}" opacity="0.2"/>
      <rect x="38" y="76" width="174" height="91" fill="${INK.paper}"/>
      <rect x="38" y="76" width="174" height="91" fill="url(#${p}-hatch)" opacity="0.35"/>
      <g>${ctx.a(easeMove('0 0;-10 0;0 0', '12s'))}<path d="${scallop(110, 34, 110, 22, 18, 7)}" fill="${k}" opacity="0.8"/></g>
      <rect width="${W}" height="${H}" fill="${INK.paper}" opacity="0">${ctx.a(loop('opacity', '0;0;0.55;0.1;0.4;0;0', '12s', flashKey))}</rect>
      <path d="M186,42 L178,62 L186,62 L176,84" fill="none" stroke="${INK.yellow}" stroke-width="1.6" stroke-linejoin="round" opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;0;1;0.2;1;0;0', '12s', flashKey))}</path>
      <path d="M30,62 L120,62 L132,80 L30,80 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
      <path d="${Array.from({ length: 11 }, (_, i) => `M${36 + i * 8},62 v18`).join(' ')}" stroke="${k}" stroke-width="0.35"/>
      <path d="M30,80 h102" stroke="${k}" stroke-width="0.4" stroke-dasharray="2 2"/>
      <g fill="${INK.blue}">${[48, 72, 96, 120].map((x, i) => `<ellipse cx="${x}" cy="82" rx="0.9" ry="1.6" opacity="0">${ctx.a(move('0 0;0 84', '1.2s', ` begin="${-i * 0.3}s"`) + loop('opacity', '1;1;0', '1.2s', ` begin="${-i * 0.3}s"`))}</ellipse>`).join('')}</g>
      <rect x="148" y="104" width="22" height="26" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.6"/>
      <path d="M152.4,104 V130 M156.8,104 V130 M161.2,104 V130 M165.6,104 V130 M148,117 H170" stroke="${k}" stroke-width="0.5"/>
      <rect x="102" y="98" width="46" height="69" fill="${k}"/>
      <rect x="106" y="102" width="38" height="59" fill="${INK.yellow}"/>
      <circle cx="132" cy="146" r="9" fill="${INK.paper}" opacity="0.35">${ctx.a(easeLoop('opacity', '0.35;0.15;0.4;0.2;0.35', '3s'))}</circle>
      <g transform="translate(132 152)">
        <path d="M-3,0 Q0,2.4 3,0 Z" fill="${INK.kaapi}"/>
        <path d="M0,-0.4 C-1.4,-2 -0.6,-3.8 0,-5 C0.6,-3.8 1.4,-2 0,-0.4 Z" fill="${INK.red}">${ctx.a(`<animateTransform attributeName="transform" type="scale" values="1 1;0.85 1.15;1.1 0.9;1 1" dur="0.6s" repeatCount="indefinite"/>`)}</path>
      </g>
      <path d="M106,102 L116,106 V157 L106,161 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>
      <path d="M100,99 H150" stroke="${k}" stroke-width="1"/>${leaves}
      <rect x="98" y="161" width="54" height="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
      <g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.35">
        <path d="M112,165.5 q-1,-2.6 4,-2.8 q5,0 4.4,2.8 Z"/><path d="M122,165.6 q-0.6,-2.6 4.4,-2.6 q5,0.2 4,2.6 Z"/>
      </g>
      <path d="M114,163.2 q2.2,-2.4 4.4,0 M124.4,163.2 q2.2,-2.4 4.4,0" fill="none" stroke="${k}" stroke-width="0.7"/>
      ${precip(ctx, { seed: 6, step: 8, px: 3, py: 20, dx: 1, dy: 6, dur: '0.6s', color: INK.blue, sw: 0.4, opacity: 0.5 })}
      ${precip(ctx, { seed: 7, step: 5, px: 4, py: 22, dx: 1.4, dy: 9, dur: '0.4s', color: INK.blue, sw: 0.65 })}
      ${splashes(ctx, 17)}
      ${ripple(56, '0s')}${ripple(84, '-0.5s')}${ripple(170, '-0.9s')}${ripple(196, '-0.3s')}`;

    const bottom = `
      <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.24"/>
      <g transform="translate(160 62)"><rect x="-4" y="-12" width="8" height="12" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/><path d="M-5,-12 h10" stroke="${INK.paper}" stroke-width="1.6"/></g>
      ${wisps(ctx, 160, 48, 26, { color: INK.paper, sw: 2.4, dur: 4, count: 3, spread: 2, op: 0.7 })}
      <rect x="38" y="62" width="174" height="105" fill="${INK.kaapi}" opacity="0.5"/>
      <rect x="38" y="62" width="174" height="105" fill="url(#${p}-hatch)" opacity="0.3"/>
      <path d="M38,62 H212" stroke="${k}" stroke-width="1.6"/>
      <path d="M38,60 H212" stroke="${INK.paper}" stroke-width="1.8"/>
      <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"><rect x="50" y="74" width="16" height="26"/><rect x="184" y="74" width="16" height="26"/></g>
      <g transform="translate(58 100)" fill="${k}">
        <path d="M-3,0 C-3.4,-3 -2.4,-5 0,-5 C2.4,-5 3.4,-3 3,0 Z"/><path d="M-2.2,-4.6 L-1.6,-7 L-0.6,-5 Z M2.2,-4.6 L1.6,-7 L0.6,-5 Z"/>
        <path d="M2.6,-0.4 C6,-0.4 6.4,-4 5,-6" fill="none" stroke="${k}" stroke-width="0.8" stroke-linecap="round">${ctx.a(easeSpin('0 2.6 -0.4;-18 2.6 -0.4;0 2.6 -0.4', '3s'))}</path>
      </g>
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
      <g fill="${k}"><path d="M112,142 v-8 h4 v5 q4,0 5,3 Z"/><path d="M127,142 v-8 h4 v5 q4,0 5,3 Z"/></g>
      <path d="M112,135.4 h4 M127,135.4 h4" stroke="${INK.red}" stroke-width="0.8"/>
      <circle cx="200" cy="40" r="14" fill="${INK.yellow}" opacity="0.28">${ctx.a(easeLoop('r', '13;16;13', '4s'))}</circle>
      <path d="M200,167 V44 M196,44 h8 l-1.4,-6 h-5.2 Z" stroke="${k}" stroke-width="1.2" fill="${INK.yellow}"/>
      <g>${ctx.a(easeMove('0 0;3 0;0 0;-3 0;0 0', '6s'))}
        ${precip(ctx, { kind: 'snow', seed: 40, step: 9, px: 2, py: 20, dur: '4s', color: INK.paper, sw: 0.4, opacity: 0.7 })}
        ${precip(ctx, { kind: 'snow', seed: 41, step: 12, px: 3, py: 26, dur: '3s', color: INK.paper, sw: 0.65 })}
      </g>`;

    return {
      top: { city: 'blr', caption: 'BASAVANAGUDI, APRIL', clause: 'Nobody leaves early', art: top },
      bottom: { city: 'nyc', caption: 'PARK SLOPE, DECEMBER', clause: 'in weather like this.', art: bottom }
    };
  }

  // ======================================================================
  // 10 of Clubs: Late on St Mark's. St. Mark's Road x St. Marks Place, 11 PM.
  // One signpost through the seam carries both street names.
  // ======================================================================
  function drawSaint(ctx) {
    const k = INK.ink;
    const stars = (seed) => {
      const r = rng(seed); let s = '';
      for (let i = 0; i < 26; i++) {
        const x = 40 + r() * 170, y = 34 + r() * 60, d = f(r() * 3);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.35 + r() * 0.4)}" fill="${INK.paper}">${ctx.a(easeLoop('opacity', '1;0.2;1', '3s', ` begin="-${d}s"`))}</circle>`;
      }
      return s;
    };
    const stroll = (dur, begin, color) => `<g transform="translate(${CX} ${WIN.b})">${figure(ctx, { color })}${ctx.a(move('-110 0;110 0', dur, ` begin="${begin}"`))}</g>`;
    const winLight = (x, y, w, h, i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK.yellow}">${ctx.a(easeLoop('opacity', '1;1;0.15;0.15;1', '12s', ` begin="-${f(i * 1.3)}s"`))}</rect>`;
    const car = (begin) => ctx.still ? '' : `<g transform="translate(${CX} 163)">${move('-170 0;170 0', '6s', ` begin="${begin}"`)}<g transform="scale(0.8)">${nightCar()}</g></g>`;
    const post = (label, plate, size) => `
      <path d="M125,167 V104" stroke="${INK.paper}" stroke-width="1.8"/>
      <path d="M125,97 l1.3,3.6 l3.6,1.3 l-3.6,1.3 l-1.3,3.6 l-1.3,-3.6 l-3.6,-1.3 l3.6,-1.3 Z" fill="${INK.red}"/>
      <rect x="100" y="110" width="50" height="10" rx="1" fill="${plate}" stroke="${INK.paper}" stroke-width="0.5"/>
      <text x="125" y="117.3" text-anchor="middle" font-family="${FONT.sans}" font-size="${size}" font-weight="700" letter-spacing="0.6" fill="${INK.paper}">${label}</text>`;
    const diner = (x, y, d) => `<g transform="translate(${x} ${y})">${ctx.a(easeMove('0 0;0 -1;0 0;0 0', '3s', ` begin="-${d}s"`))}<circle cx="0" cy="-12" r="3" fill="${k}"/><path d="M-5,0 q5,-9 10,0 Z" fill="${k}"/></g>`;

    const top = `
      <rect width="${W}" height="${H}" fill="${k}"/>
      ${stars(5)}
      <circle cx="196" cy="45" r="13" fill="${INK.paper}" opacity="0.08">${ctx.a(easeLoop('r', '12;15;12', '6s'))}</circle>
      <path d="M196,38 a8,8 0 1 0 6,13 a6.4,6.4 0 1 1 -6,-13 Z" fill="${INK.paper}"/>
      <g fill="${INK.blue}" fill-opacity="0.75" stroke="${INK.paper}" stroke-width="0.4">
        <path d="M58,96 A18,18 0 0 1 94,96 Z"/><rect x="73" y="70" width="6" height="8"/>
        <path d="M44,167 V112 H108 V167 Z"/><path d="M44,112 L76,98 L108,112 Z"/>
      </g>
      ${ctx.still ? '' : [0, 1].map((i) => `<ellipse cx="76" cy="66" rx="2" ry="1" fill="none" stroke="${INK.paper}" stroke-width="0.4" opacity="0">${loop('rx', '2;26;26', '12s', ` keyTimes="0;0.25;1" begin="${i * 0.6}s"`)}${loop('ry', '1;9;9', '12s', ` keyTimes="0;0.25;1" begin="${i * 0.6}s"`)}${loop('opacity', '0;0.8;0;0', '12s', ` keyTimes="0;0.02;0.25;1" begin="${i * 0.6}s"`)}</ellipse>`).join('')}
      <path d="M76,70 V62 M73,65 H79" stroke="${INK.paper}" stroke-width="0.6"/>
      <path d="M52,116 V167 M62,116 V167 M90,116 V167 M100,116 V167" stroke="${INK.paper}" stroke-width="0.9"/>
      <path d="M72,167 V146 a4,4 0 0 1 8,0 V167" fill="${INK.yellow}" opacity="0.9"/>
      <rect x="152" y="120" width="60" height="47" fill="${INK.paper}" fill-opacity="0.1" stroke="${INK.paper}" stroke-width="0.5"/>
      <path d="M150,120 H214 L210,128 H154 Z" fill="${INK.red}" stroke="${INK.paper}" stroke-width="0.4"/>
      <rect x="158" y="132" width="48" height="26" fill="${INK.yellow}"/>
      <rect x="152" y="158" width="60" height="9" fill="${INK.yellow}" opacity="0.18"/>
      ${diner(168, 158, 0)}${diner(190, 158, 1.2)}<rect x="176" y="150" width="6" height="8" fill="${k}"/>
      ${car('-1s')}
      ${post("ST. MARK'S ROAD", INK.blue, 4.6)}
      ${stroll('24s', '-6s', INK.paper)}${stroll('12s', '-2s', INK.paper)}`;

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
      <text x="181" y="160" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" letter-spacing="1" fill="none" stroke="${INK.pink}" stroke-width="0.8">BAR${ctx.a(loop('opacity', '1;1;0.2;1;1', '12s', ' keyTimes="0;0.6;0.61;0.63;1"'))}</text>
      ${wisps(ctx, 140, 166, 30, { color: INK.paper, sw: 2.6, dur: 4, count: 3, spread: 2, op: 0.5 })}
      ${car('-4s')}
      ${post('ST MARKS PL', INK.green, 5.4)}
      <rect x="111" y="122" width="28" height="7" rx="0.8" fill="${INK.green}" stroke="${INK.paper}" stroke-width="0.4"/>
      <text x="125" y="127.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.4" font-weight="700" fill="${INK.paper}">3 AV</text>
      ${stroll('12s', '-3s', INK.paper)}${stroll('24s', '-15s', INK.paper)}`;

    return {
      top: { city: 'blr', caption: "ST. MARK'S ROAD", clause: 'Same saint.', art: top },
      bottom: { city: 'nyc', caption: 'ST. MARKS PLACE', clause: 'Very different evenings.', art: bottom }
    };
  }

  // ======================================================================
  // Jokers: The Departure and The Return. The only cards with an "up".
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
    const curve = (a, b) => `M${s0[0]},${s0[1]} C${c1[0] + a},${c1[1]} ${c2[0] + b},${c2[1]} ${s1[0]},${s1[1]}`;
    const flowPath = curve(0, 0);
    // The stream wavers a little as the hand pours: three shapes, eased.
    const waver = ctx.a(easeLoop('d', `${curve(0, 0)};${curve(3, -3)};${curve(-2, 2.5)};${curve(0, 0)}`, '4s'));
    // Text must read upright, so on the Return it runs upstream, from the
    // davara back up to the cup.
    const textPath = dep ? flowPath : `M${s1[0]},${s1[1]} C${c2[0]},${c2[1]} ${c1[0]},${c1[1]} ${s0[0]},${s0[1]}`;
    const line = 'FUNNY HOW YOU CAN MISS TWO PLACES AT ONCE';
    const title = dep ? 'THE DEPARTURE' : 'THE RETURN';
    const numeral = dep ? 'I' : 'II';
    const milk = dep ? 1 : 0.72;
    const gapX = dep ? 158 : 92;

    const vessels = dep
      ? `<g>${ctx.a(easeSpin('0 84 82;2 84 82;0 84 82', '4s'))}${tumbler(84, 82, 122, 1.3)}</g>` + paperCup(160, 282, 0, 1.25)
      : `<g>${ctx.a(easeSpin('0 166 80;-2 166 80;0 166 80', '4s'))}${paperCup(166, 80, -122, 1.2)}</g>` + davara(90, 262, 1.2);
    const froth = (cx, cy, rx) => {
      const r = rng(dep ? 3 : 4); let s = '';
      for (let i = 0; i < 11; i++) {
        const x = cx - rx + r() * rx * 2, y = cy - 1 + r() * 2, rr = 0.8 + r() * 1.6, d = f(r() * 2);
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${INK.paper}" stroke="${k}" stroke-width="0.3">${ctx.a(loop('r', `${f(rr)};${f(rr * 0.4)};${f(rr)}`, '2s', ` begin="-${d}s"`))}</circle>`;
      }
      return s;
    };
    // Droplets kicked up where the stream lands.
    const drops = ctx.still ? '' : Array.from({ length: 6 }, (_, i) => {
      const dx = (i % 2 ? 1 : -1) * (4 + i * 1.6), h = 8 + (i % 3) * 3, b = ` begin="-${f(i * 0.17)}s"`;
      return `<circle cx="${s1[0]}" cy="${s1[1] - 2}" r="0.9" fill="${INK.kaapi}" opacity="0">${move(`0 0;${f(dx * 0.6)} ${-h};${dx} 2`, '1s', b)}${loop('opacity', '0;1;0', '1s', b)}</circle>`;
    }).join('');
    // Fine engraved rays behind the pour, centred on the middle of the stream.
    let rays = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, r0 = i % 2 ? 40 : 24;
      rays += `<path d="M${f(Math.cos(a) * r0)},${f(Math.sin(a) * r0)} L${f(Math.cos(a) * 260)},${f(Math.sin(a) * 260)}"/>`;
    }
    const startAnim = dep ? loop('startOffset', '-130;200', '8s') : loop('startOffset', '200;-130', '8s');

    return svgOpen(p, Object.assign({ title: `Joker: ${title[0] + title.slice(1).toLowerCase()}`, desc: dep ? 'A steel tumbler pours coffee down into a New York paper cup. The line Funny how you can miss two places at once runs inside the stream.' : 'A New York paper cup pours coffee back into a steel davara that already holds a little. The same line runs upstream.' }, opts)) + defs(p) + frame() +
      `<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.r - WIN.x}" height="${H - 2 * WIN.y}" rx="6" fill="${INK.yellow}" opacity="0.1"/>
      <g clip-path="url(#${p}-full)">
        <g transform="translate(${mx(140)} 170)"><g stroke="${INK.yellow}" stroke-width="0.6" opacity="0.55">${ctx.a(spin(dep ? '0;5' : '0;-5', '8s', ' accumulate="sum"'))}${rays}</g></g>
        <path d="M${WIN.x},${CY} H${gapX - 14} M${gapX + 14},${CY} H${WIN.r}" stroke="${INK.red}" stroke-width="0.6" opacity="0.55"/>
        ${vessels}
        <path d="${flowPath}" fill="none" stroke="${INK.kaapi}" stroke-opacity="${milk}" stroke-width="7.4" stroke-linecap="round">${waver}</path>
        <path d="${flowPath}" fill="none" stroke="${INK.paper}" stroke-width="0.6" stroke-dasharray="5 11" opacity="0.7">${waver}${ctx.a(loop('stroke-dashoffset', '32;0', '0.8s'))}</path>
        <path id="${p}-tp" d="${textPath}" fill="none"/>
        <text font-family="${FONT.micro}" font-size="4.3" font-weight="700" letter-spacing="0.5" fill="${INK.paper}" dy="1.5"><textPath href="#${p}-tp" startOffset="${dep ? 34 : 38}" textLength="128" lengthAdjust="spacing">${line}${ctx.a(startAnim)}</textPath></text>
        ${drops}
        ${dep ? froth(160, 253, 16) : froth(90, 263, 19)}
        ${dep ? wisps(ctx, 182, 246, 28, { dur: 4, count: 4 }) : wisps(ctx, 112, 256, 28, { dur: 4, count: 4 })}
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
      <text x="225" y="326" text-anchor="middle" font-family="${FONT.micro}" font-size="4.4" font-weight="700" letter-spacing="0.8" fill="${k}" opacity="0.7">${numeral}</text>
      </svg>`;
  }

  // ---------- registry ----------
  const CARDS = [
    { id: 'ride', rank: '8', rankName: 'Eight', suit: 'club', title: 'The Ride Home', draw: drawRide,
      pair: ['Auto-rickshaw', 'Yellow cab'],
      sentence: ['The minute it rains,', 'everyone is going the other way.'],
      why: 'Six o\'clock, first drop of rain, and every driver in both cities remembers somewhere else to be.',
      mechanism: 'One road, two lanes. They always pass going opposite ways. Rain arrives, the cab\'s light goes off. Classic.',
      sound: 'Rain, a putter, a hiss, two horns with opinions.' },
    { id: 'park', rank: '2', rankName: 'Two', suit: 'heart', title: 'Morning Walk', draw: drawPark,
      pair: ['Cubbon Park', 'Central Park'],
      sentence: ['Every loud city', 'needs somewhere to whisper.'],
      why: '6 AM regulars. Years of nodding. Zero names exchanged.',
      mechanism: 'One trunk, two crowns. The walker does one lap. The runner does two and pretends not to notice.',
      sound: 'A koel climbing the scale, a robin, a pigeon, footsteps at two speeds.' },
    { id: 'usual', rank: '3', rankName: 'Three', suit: 'heart', title: 'The Usual', draw: drawUsual,
      pair: ['Darshini', 'Diner'],
      sentence: ["You don't order anymore.", 'You just nod.'],
      why: 'Stand at a darshini or sit at a diner. Go often enough and they pour before you blink.',
      mechanism: 'The counter is the seam. Tumbler on one side, diner mug on the other, both already poured.',
      sound: 'Steel clinks, chatter, a fan, a spoon, the order bell, neon buzz.' },
    { id: 'weather', rank: '7', rankName: 'Seven', suit: 'spade', title: "Four O'Clock", draw: drawWeather,
      pair: ['The April storm', 'The first snow'],
      sentence: ['Nobody leaves early', 'in weather like this.'],
      why: 'April storm at four. December snow at dusk. Same verdict, one more cup.',
      mechanism: 'Two front doors, back to back. Chappals on one step, snow boots on the other. Nobody\'s moving them.',
      sound: 'Rain, thunder on cue, drips, wind, a radiator with something to say.' },
    { id: 'saint', rank: '10', rankName: 'Ten', suit: 'club', title: "Late on St Mark's", draw: drawSaint,
      pair: ["St. Mark's Road", 'St. Marks Place'],
      sentence: ['Same saint.', 'Very different evenings.'],
      why: 'Same saint, two cities. One got a cathedral. The other got the East Village at 11 PM.',
      mechanism: 'One signpost, two names. Blue says St. Mark\'s Road. Flip it and green says St Marks Pl.',
      sound: 'A church bell, crickets, a bar\'s bassline, a siren minding its own business.' }
  ];
  const JOKERS = [
    { id: 'departure', title: 'The Departure', variant: 'departure' },
    { id: 'return', title: 'The Return', variant: 'return' }
  ];
  // ---------- the back ----------
  // Pulli kolam lattice on kumkum, a chain border, and a small medallion
  // whose seam carries BLR one way up and NYC the other.
  function cardBack(opts) {
    opts = opts || {};
    const p = 'back' + (opts.uid || '');
    const k = INK.ink, pa = INK.paper, red = INK.red;
    let dots = '';
    for (let y = 36; y <= 314; y += 14) {
      for (let x = 34; x <= 216; x += 14) {
        const odd = ((x - 34) / 14 + (y - 36) / 14) % 2;
        dots += odd ? `<circle cx="${x}" cy="${y}" r="0.9" fill="${pa}"/>` : `<rect x="${x - 3.4}" y="${y - 3.4}" width="6.8" height="6.8" rx="2.2" transform="rotate(45 ${x} ${y})" fill="none" stroke="${pa}" stroke-width="0.55"/>`;
      }
    }
    const cx = CX, cy = CY;
    return svgOpen(p, Object.assign({ title: 'A Tale of Two Cities: card back' }, opts)) +
      `<defs>
        <pattern id="${p}-lat" width="14" height="14" patternUnits="userSpaceOnUse" x="34" y="36">
          <path d="M0,7 L7,0 L14,7 L7,14 Z" fill="none" stroke="${pa}" stroke-width="0.3" opacity="0.6"/>
        </pattern>
        <pattern id="${p}-chain" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.4" fill="none" stroke="${pa}" stroke-width="0.5"/><circle cx="0" cy="0" r="0.7" fill="${pa}"/><circle cx="8" cy="8" r="0.7" fill="${pa}"/><circle cx="0" cy="8" r="0.7" fill="${pa}"/><circle cx="8" cy="0" r="0.7" fill="${pa}"/>
        </pattern>
      </defs>
      ${frame()}
      <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="5" fill="${red}"/>
      <path fill-rule="evenodd" d="M16,21 Q16,16 21,16 H${W - 21} Q${W - 16},16 ${W - 16},21 V${H - 21} Q${W - 16},${H - 16} ${W - 21},${H - 16} H21 Q16,${H - 16} 16,${H - 21} Z M26,26 H${W - 26} V${H - 26} H26 Z" fill="url(#${p}-chain)"/>
      <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${pa}" stroke-width="0.6"/>
      <rect x="28.5" y="28.5" width="${W - 57}" height="${H - 57}" fill="none" stroke="${pa}" stroke-width="0.25"/>
      <rect x="29" y="29" width="${W - 58}" height="${H - 58}" fill="url(#${p}-lat)"/>
      ${dots}
      <circle cx="${cx}" cy="${cy}" r="34" fill="${red}" stroke="${pa}" stroke-width="0.6"/>
      <circle cx="${cx}" cy="${cy}" r="30" fill="${pa}"/>
      <circle cx="${cx}" cy="${cy}" r="27.5" fill="none" stroke="${k}" stroke-width="0.3"/>
      <path d="M${cx - 27},${cy} H${cx + 27}" stroke="${red}" stroke-width="0.7"/>
      <path d="M${cx - 2.6},${cy} l2.6,-2 l2.6,2 l-2.6,2 Z" fill="${red}"/>
      <g font-family="${FONT.display}" font-size="11" font-weight="500" fill="${k}" text-anchor="middle" letter-spacing="1.5">
        <text x="${cx}" y="${cy - 6}">BLR</text>
        <text x="${cx}" y="${cy - 6}" transform="rotate(180 ${cx} ${cy})">NYC</text>
      </g>
      <g font-family="${FONT.micro}" font-size="4" font-weight="700" fill="${k}" text-anchor="middle" letter-spacing="1.2" opacity="0.75">
        <text x="${cx}" y="${cy - 19}">A TALE OF</text>
        <text x="${cx}" y="${cy - 19}" transform="rotate(180 ${cx} ${cy})">TWO CITIES</text>
      </g>
      </svg>`;
  }

  // Suit files in deck/ add their cards through register(). Cards stay in
  // deck order: suit, then rank.
  const SUIT_ORDER = ['heart', 'diamond', 'club', 'spade'];
  const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_NAME = { A: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', J: 'Jack', Q: 'Queen', K: 'King' };
  const sortKey = (c) => SUIT_ORDER.indexOf(c.suit) * 100 + RANK_ORDER.indexOf(c.rank);
  function register(def) {
    if (!def.rankName) def.rankName = RANK_NAME[def.rank];
    const i = CARDS.findIndex((c) => c.id === def.id);
    if (i >= 0) CARDS.splice(i, 1);
    CARDS.push(def);
    CARDS.sort((a, b) => sortKey(a) - sortKey(b));
    CYCLE[def.id] = def.cycle || 12;
  }
  CARDS.sort((a, b) => sortKey(a) - sortKey(b));

  function render(id, opts) {
    if (id === 'back') return cardBack(opts);
    const j = JOKERS.find((x) => x.id === id);
    if (j) return joker(j.variant, opts);
    const def = CARDS.find((x) => x.id === id);
    if (!def) throw new Error('Unknown card: ' + id);
    return mirroredCard(def, opts);
  }

  // Drawing kit for the suit files.
  const kit = {
    W, H, CX, CY, WIN, f, rng, esc, scallop, loop, move, spin, eased, easeLoop, easeMove, easeSpin,
    precip, figure, bird, wisps, fallingLeaf, splashes, squirrel, wheel, beam,
    autoRickshaw, yellowCab, nightCar, tumbler, paperCup, davara
  };

  const api = { INK, FONT, HOURS, CARDS, JOKERS, SUIT_NAME, SUIT_ORDER, RANK_ORDER, CYCLE, render, register, kit, size: { w: W, h: H } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaleCards = api;
})(typeof window !== 'undefined' ? window : globalThis);
