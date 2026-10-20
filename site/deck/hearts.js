// Hearts: Belonging. Regulars, rituals, people who know your order.
// The 2 (Morning Walk) and 3 (The Usual) live in cards.js.
(function (root) {
  'use strict';
  const T = root.TaleCards || require('../cards.js');
  const { INK, FONT } = T;
  const { W, H, CX, WIN, f, rng, scallop, loop, move, spin, easeLoop, easeMove, easeSpin,
    wisps, figure, bird, paperCup, fallingLeaf } = T.kit;
  const k = INK.ink;

  // ---------- shared bits for this suit ----------
  const bg = (c, o) => `<rect width="${W}" height="${H}" fill="${c}" opacity="${o}"/>`;
  // Custom-timed move: hold, then ease. kt like "0;0.5;1".
  const holdMove = (values, dur, kt, extra) => move(values, dur,
    ` calcMode="spline" keyTimes="${kt}" keySplines="${kt.split(';').slice(1).map(() => '0.45 0 0.55 1').join(';')}"${extra || ''}`);

  // A standing person, feet at (x,y), about 16 units tall at s = 1.
  function person(x, y, c, o) {
    o = o || {};
    const s = o.s || 1, d = o.dir || 1, sh = o.shirt || c;
    const body = o.dress
      ? `<path d="M-1.5,-12.8 Q0,-13.4 1.5,-12.8 L3.3,0 L-3.3,0 Z" fill="${o.dress}"/>`
      : `<path d="M-1.1,0 L-0.8,-6.6 M1.1,0 L0.8,-6.6" stroke="${o.legs || c}" stroke-width="1.5" stroke-linecap="round"/>` +
        `<path d="M0,-6.4 V-12.4" stroke="${sh}" stroke-width="2.7" stroke-linecap="round"/>`;
    const arms = o.arms != null ? o.arms
      : `<path d="M0,-12 L1.5,-7.2 M0,-12 L-1.5,-7.2" stroke="${o.dress || sh}" stroke-width="1.1" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) scale(${f(d * s)} ${s})">${body}${arms}<circle cy="-15" r="2.1" fill="${c}"/>${o.extra || ''}</g>`;
  }
  // A seated person, seat at (x,y), facing right for dir = 1.
  function seated(x, y, c, o) {
    o = o || {};
    const s = o.s || 1, d = o.dir || 1, L = o.leg == null ? 6 : o.leg, sh = o.shirt || c;
    return `<g transform="translate(${x} ${y}) scale(${f(d * s)} ${s})">
      ${o.outline ? `<path d="M0,0 H5 L5.4,${L}" fill="none" stroke="${k}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M0,-0.6 V-6.4" stroke="${k}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
      <path d="M0,0 H5 L5.4,${L}" fill="none" stroke="${o.legs || c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M0,-0.6 V-6.4" stroke="${sh}" stroke-width="2.7" stroke-linecap="round"/>
      ${o.arms != null ? o.arms : `<path d="M0.2,-6 L3.4,-2.8 L5.8,-3.6" fill="none" stroke="${sh}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`}
      <circle cx="0.3" cy="-9" r="2.1" fill="${c}"/>${o.extra || ''}</g>`;
  }
  // A standing bird (pigeon, crow), feet at (0,0), facing right.
  function perch(c, op) {
    return `<g>
      <path d="M-6,-3.4 Q-3,-6.6 1.6,-5.6 Q3,-7.8 4.8,-7 L6.6,-6.2 L4.9,-5.6 Q4.6,-2 0.6,-1.6 Q-3.4,-1.4 -6,-3.4 Z" fill="${c}" ${op != null ? `fill-opacity="${op}"` : ''} stroke="${k}" stroke-width="0.35"/>
      <path d="M-6,-3.4 L-8.6,-2.6 L-7.4,-4.4 Z" fill="${c}"/>
      <path d="M-0.4,-1.6 L-0.8,0 M1.2,-1.6 L1.4,0" stroke="${k}" stroke-width="0.4"/>
      <circle cx="4.4" cy="-6.6" r="0.35" fill="${INK.paper}"/>
    </g>`;
  }
  // Mangalore-tile roof between two eaves and a ridge.
  function tileRoof(x0, x1, yEave, rx0, rx1, yRidge, color) {
    let lines = '';
    for (let y = yRidge + 7; y < yEave; y += 7) {
      const t = (y - yRidge) / (yEave - yRidge);
      const a = rx0 + (x0 - rx0) * t, b = rx1 + (x1 - rx1) * t;
      lines += `M${f(a)},${y} H${f(b)} `;
      for (let x = a + 3; x < b - 2; x += 5) lines += `M${f(x)},${y} v-6.6 `;
    }
    return `<path d="M${x0},${yEave} L${rx0},${yRidge} H${rx1} L${x1},${yEave} Z" fill="${color}" stroke="${k}" stroke-width="0.5" stroke-linejoin="round"/>
      <path d="${lines}" stroke="${k}" stroke-width="0.3" opacity="0.55"/>
      <path d="M${rx0},${yRidge} H${rx1}" stroke="${k}" stroke-width="1.3"/>
      <path d="M${x0 - 1},${yEave} H${x1 + 1}" stroke="${k}" stroke-width="0.9"/>`;
  }
  // A simple window with bars.
  function barWin(x, y, w, h, o) {
    o = o || {};
    let bars = '';
    for (let i = 1; i < (o.n || 4); i++) bars += `M${f(x + (w * i) / (o.n || 4))},${y} V${y + h} `;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || INK.blue}" fill-opacity="${o.op == null ? 0.3 : o.op}" stroke="${k}" stroke-width="0.5"/>
      <path d="${bars}" stroke="${k}" stroke-width="${o.bw || 0.45}"/>
      ${o.frame ? `<rect x="${x - 1.4}" y="${y - 1.4}" width="${w + 2.8}" height="${h + 2.8}" fill="none" stroke="${o.frame}" stroke-width="1.4"/>` : ''}`;
  }
  // A small steel tumbler at (x, base y).
  const miniTumbler = (x, y) => `<path d="M${x - 2.4},${y - 6} H${x + 2.4} L${x + 1.8},${y} H${x - 1.8} Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><path d="M${x - 2.7},${y - 6} H${x + 2.7}" stroke="${k}" stroke-width="0.7"/>`;

  // ======================================================================
  // A of Hearts: The Step. Jagali katte x Brooklyn stoop, dawn.
  // ======================================================================
  T.register({
    id: 'h-a', rank: 'A', suit: 'heart', title: 'The Step',
    pair: ['Jagali katte', 'Brooklyn stoop'],
    sentence: ['Every house needs a step', 'that belongs to the street.'],
    why: 'Before the coffee is poured, before the paper lands, somebody is already on the step.',
    mechanism: 'Two steps meet at the seam. A stone katte flanks one door. A stoop climbs to the other.',
    sound: 'Crows at dawn, a newspaper slap, pigeons, the first tumbler set down.',
    draw(ctx) {
      const p = ctx.id;
      const fronds = [[-34, 6], [-26, 16], [-12, 20], [6, 18], [20, 12], [30, 2], [-18, -10], [14, -12]].map(([dx, dy]) =>
        `<path d="M0,0 Q${f(dx * 0.5)},${f(dy - 9)} ${dx},${dy}" fill="none" stroke="${INK.green}" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M0,0 Q${f(dx * 0.5)},${f(dy - 9)} ${dx},${dy}" fill="none" stroke="${k}" stroke-width="0.3"/>`).join('');
      const crowHop = ctx.a(holdMove('0 0;0 0;-4 -4;-8 0;-8 0;-4 -4;0 0', '6s', '0;0.3;0.38;0.46;0.8;0.88;1'));

      const top = `
        ${bg(INK.yellow, 0.16)}
        <rect width="${W}" height="70" fill="${INK.pink}" opacity="0.14"/>
        <g transform="translate(182 54)">
          <circle r="16" fill="${INK.yellow}" opacity="0.3">${ctx.a(easeLoop('r', '15;19;15', '6s'))}</circle>
          <circle r="11" fill="${INK.yellow}"/>
        </g>
        <path d="M200,64 H222 M190,70 H222" stroke="${INK.paper}" stroke-width="1"/>
        <g>${ctx.a(easeSpin('0 50 167;1.2 50 167;0 50 167;-0.8 50 167;0 50 167', '12s'))}
          <path d="M46,167 C46,130 50,90 58,50" fill="none" stroke="${INK.kaapi}" stroke-width="3"/>
          <path d="M47,150 h3 M47.6,130 h3 M49,110 h3 M51.6,90 h3 M54.6,70 h3" stroke="${k}" stroke-width="0.4"/>
          <g transform="translate(58 50)">${fronds}<circle r="2.4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3"/></g>
        </g>
        ${tileRoof(56, 194, 96, 80, 170, 66, INK.red)}
        <rect x="62" y="96" width="126" height="71" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="62" y="96" width="126" height="71" fill="${INK.yellow}" opacity="0.28"/>
        <path d="M62,100 H188" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        ${barWin(72, 108, 24, 28, { n: 5, frame: INK.kaapi })}
        ${barWin(154, 108, 24, 28, { n: 5, frame: INK.kaapi })}
        <rect x="64" y="107" width="6" height="30" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/><rect x="180" y="107" width="6" height="30" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
        <rect x="105" y="96" width="40" height="6" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <rect x="109" y="102" width="32" height="50" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
        <path d="M125,104 V152 M112,106 h10 v20 h-10 Z M128,106 h10 v20 h-10 Z M112,130 h10 v18 h-10 Z M128,130 h10 v18 h-10 Z" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g fill="${INK.yellow}">${[110, 120, 140, 150].map((y) => `<circle cx="117" cy="${y - 2}" r="0.7"/><circle cx="133" cy="${y - 2}" r="0.7"/>`).join('')}</g>
        <g fill="${INK.green}" stroke="${k}" stroke-width="0.25">${Array.from({ length: 6 }, (_, i) => `<path d="M${112 + i * 5.2},102 q-1.4,3.6 0,7 q1.4,-3.4 0,-7 Z"/>`).join('')}</g>
        <path d="M109,102 H141" stroke="${k}" stroke-width="0.6"/>
        <g stroke="${k}" stroke-width="0.5">
          <rect x="62" y="151" width="45" height="16" fill="${INK.red}" fill-opacity="0.35"/><rect x="143" y="151" width="45" height="16" fill="${INK.red}" fill-opacity="0.35"/>
          <rect x="60" y="148.5" width="49" height="3.2" fill="${INK.paper}"/><rect x="141" y="148.5" width="49" height="3.2" fill="${INK.paper}"/>
          <rect x="110" y="152" width="30" height="7.5" fill="${INK.paper}"/><rect x="106" y="159.5" width="38" height="7.5" fill="${INK.paper}"/>
        </g>
        <rect x="62" y="151.7" width="45" height="15.3" fill="url(#${p}-hatch)" opacity="0.35"/><rect x="143" y="151.7" width="45" height="15.3" fill="url(#${p}-hatch)" opacity="0.35"/>
        ${seated(84, 148.5, k, { s: 1.6, leg: 11, shirt: INK.paper, legs: INK.paper, outline: true,
          arms: `<path d="M0.2,-6 L3.4,-3.4" stroke="${k}" stroke-width="1.1" stroke-linecap="round"/><rect x="2.6" y="-8.6" width="6" height="7.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4" transform="rotate(-8 5.6 -5)"/><path d="M3.6,-7 h4 M3.6,-5.4 h4 M3.6,-3.8 h3" stroke="${k}" stroke-width="0.25" transform="rotate(-8 5.6 -5)"/>` })}
        ${miniTumbler(101, 148.5)}
        ${wisps(ctx, 101, 141, 16, { dur: 3, count: 3, spread: 1.6, op: 0.5 })}
        <g transform="translate(176 148.5)">${perch(k)}${crowHop}</g>
        <ellipse cx="125" cy="158.4" rx="10" ry="0.9" fill="none" stroke="${INK.red}" stroke-width="0.5" stroke-dasharray="1 1.2"/>`;

      const steps = Array.from({ length: 6 }, (_, i) => {
        const y = 117 + i * 8.33, x = 100 - (i + 1) * 4, w = 50 + (i + 1) * 8;
        return `<rect x="${x}" y="${f(y)}" width="${w}" height="8.33" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.45"/><path d="M${x + 0.5},${f(y + 0.7)} H${x + w - 0.5}" stroke="${INK.paper}" stroke-width="0.6" opacity="0.6"/>`;
      }).join('');
      const balusters = (side) => Array.from({ length: 7 }, (_, i) => {
        const t = (i + 0.5) / 7, x = side > 0 ? 150 + t * 26 : 100 - t * 26, y = 110 + t * 40;
        return `M${f(x)},${f(y)} V${f(117 + t * 46)}`;
      }).join(' ');
      const peck = ctx.a(holdMove('0 0;0 0;3 0;3 0;6 0;6 0;0 0', '6s', '0;0.2;0.3;0.5;0.6;0.85;1'));
      const glow = (x, y, w, h, b) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK.yellow}" opacity="${ctx.still ? 0.85 : 0}">${ctx.a(easeLoop('opacity', '0.85;0.85;0;0;0.85', '12s', ` begin="${b}"`))}</rect>`;
      const bottom = `
        ${bg(INK.blue, 0.13)}
        <rect width="${W}" height="60" fill="${INK.pink}" opacity="0.14"/>
        <rect x="38" y="36" width="174" height="131" fill="${INK.kaapi}" opacity="0.5"/>
        <rect x="38" y="36" width="174" height="131" fill="url(#${p}-hatch)" opacity="0.22"/>
        <rect x="38" y="34" width="174" height="7" fill="${k}"/>
        <path d="${Array.from({ length: 30 }, (_, i) => `M${40 + i * 6},41 v2.4`).join(' ')}" stroke="${k}" stroke-width="2"/>
        ${[50, 176].map((x) => `<rect x="${x}" y="58" width="24" height="40" fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/>${glow(x + 1, 59, 22, 18, x > 100 ? '-6s' : '0s')}<path d="M${x},78 H${x + 24} M${x + 12},58 V98" stroke="${k}" stroke-width="0.6"/><rect x="${x - 2}" y="54" width="28" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>`).join('')}
        ${barWin(46, 132, 22, 16, { n: 6, op: 0.25, bw: 0.7 })}
        <path d="M112,112 V76 A13,13 0 0 1 138,76 V112 Z" fill="${k}"/>
        <path d="M114.5,78 A10.5,10.5 0 0 1 135.5,78 Z" fill="${INK.yellow}" opacity="0.8"/>
        <rect x="114.5" y="80" width="10" height="32" fill="${INK.kaapi}" stroke="${INK.paper}" stroke-width="0.3"/><rect x="125.5" y="80" width="10" height="32" fill="${INK.kaapi}" stroke="${INK.paper}" stroke-width="0.3"/>
        <rect x="117" y="84" width="5" height="12" fill="none" stroke="${k}" stroke-width="0.4"/><rect x="128" y="84" width="5" height="12" fill="none" stroke="${k}" stroke-width="0.4"/>
        <rect x="98" y="112" width="54" height="5" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.45"/>
        ${steps}
        <path d="M100,108 C92,118 82,138 74,152 M150,108 C158,118 168,138 176,152" fill="none" stroke="${k}" stroke-width="1.1"/>
        <path d="${balusters(-1)} ${balusters(1)}" stroke="${k}" stroke-width="0.4"/>
        <g fill="${k}"><rect x="71" y="150" width="5" height="17"/><rect x="174" y="150" width="5" height="17"/><circle cx="73.5" cy="149" r="2.6"/><circle cx="176.5" cy="149" r="2.6"/></g>
        <g transform="translate(196 167)"><rect x="-6" y="-17" width="12" height="17" fill="${k}" fill-opacity="0.25" stroke="${k}" stroke-width="0.5"/><rect x="-7" y="-19" width="14" height="2.6" rx="1" fill="${k}" fill-opacity="0.5"/><path d="M-3,-14 V-3 M0,-14 V-3 M3,-14 V-3" stroke="${k}" stroke-width="0.35"/></g>
        ${seated(113, 133.7, k, { s: 1.6, leg: 5.4, shirt: INK.red,
          arms: `<path d="M0.2,-6 L3.4,-2.8 L5,-4.4" fill="none" stroke="${INK.red}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2,-7 L6.6,-7 L6.2,-3.6 L4.6,-3.6 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.3"/>` })}
        ${wisps(ctx, 122, 125, 14, { dur: 3, count: 3, spread: 1.4, op: 0.5 })}
        <g transform="translate(150 158.6)">${perch(k, 0.45)}${peck}</g>`;

      return {
        top: { city: 'blr', caption: 'BASAVANAGUDI', clause: 'Every house needs a step', art: top },
        bottom: { city: 'nyc', caption: 'BED-STUY', clause: 'that belongs to the street.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 4 of Hearts: Sunday Queue. Donne biryani x bagels, 10 AM.
  // ======================================================================
  function queue(ctx, clipId, c) {
    // Identical people shuffle one place forward every 4 s; the front one
    // fades as it reaches the counter, so the loop never shows a join.
    const shuffle = (extra) => ctx.a(holdMove('0 0;0 0;14 0', '4s', '0;0.55;1', extra || ''));
    const one = (x, last) => `<g transform="translate(${x} 167)"${last ? '' : ''}>${person(0, 0, c, { s: 2 })}${last ? ctx.a(`<animate attributeName="opacity" values="1;1;0" dur="4s" keyTimes="0;0.55;1" repeatCount="indefinite"/>`) : ''}</g>`;
    return `<g clip-path="url(#${clipId})"><g>${shuffle()}${[24, 38, 52, 66].map((x) => one(x)).join('')}${one(80, true)}</g></g>`;
  }
  T.register({
    id: 'h-4', rank: '4', suit: 'heart', title: 'Sunday Queue',
    pair: ['Donne biryani', 'Sunday bagels'],
    sentence: ['Nobody queues for food.', 'Everybody queues for Sunday.'],
    why: 'Nobody waits forty minutes for breakfast. Except on Sunday, when waiting is the point.',
    mechanism: 'Two queues shuffle toward the seam. Biryani handi on one counter, a basket of bagels on the other.',
    sound: 'Shuffling feet, a ladle on copper, a bagel slicer, saved spots.',
    draw(ctx) {
      const p = ctx.id;
      const clip = (id) => `<clipPath id="${id}"><rect x="0" y="0" width="95" height="${H}"/></clipPath>`;
      const counter = (front) => `
        <rect x="98" y="148" width="54" height="19" fill="${front}" stroke="${k}" stroke-width="0.5"/>
        <rect x="96" y="145" width="58" height="3.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>`;
      const server = (x, tool) => `${person(x, 167, k, { s: 2.1, dir: -1, shirt: INK.paper,
        arms: `<g>${ctx.a(easeSpin('0 0 -12;-14 0 -12;0 0 -12', '2s'))}<path d="M0,-12 L4,-8.6 L7,-9.4" fill="none" stroke="${k}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>${tool}</g>` })}`;

      const top = `
        <defs>${clip(`${p}-qt`)}</defs>
        ${bg(INK.yellow, 0.16)}
        <rect x="38" y="38" width="174" height="62" fill="${INK.green}" opacity="0.28"/>
        <rect x="38" y="38" width="174" height="62" fill="url(#${p}-hatch)" opacity="0.12"/>
        ${barWin(52, 48, 18, 20, { n: 4, op: 0.3 })}${barWin(80, 48, 18, 20, { n: 4, op: 0.3 })}
        <rect x="140" y="52" width="60" height="11" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <text x="170" y="59.8" text-anchor="middle" font-family="${FONT.sans}" font-size="5" font-weight="700" letter-spacing="0.6" fill="${k}">SUNDAY SPECIAL</text>
        <rect x="46" y="74" width="158" height="18" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
        <rect x="48.5" y="76.5" width="153" height="13" fill="none" stroke="${INK.paper}" stroke-width="0.35"/>
        <text x="125" y="86.6" text-anchor="middle" font-family="${FONT.sans}" font-size="9" font-weight="700" letter-spacing="1.4" fill="${INK.paper}">DONNE BIRYANI</text>
        <rect x="38" y="100" width="174" height="67" fill="${k}" opacity="0.72"/>
        <path d="M38,100 H212 M38,102.6 H212 M38,105.2 H212" stroke="${INK.paper}" stroke-width="0.35" opacity="0.6"/>
        <rect x="150" y="112" width="34" height="2.6" rx="1.2" fill="${INK.paper}"/>
        <rect x="144" y="108" width="46" height="11" rx="5" fill="${INK.yellow}" opacity="0.25"/>
        ${server(148, `<path d="M7,-9.4 L12,-5 M11,-6 a1.6,1.6 0 1 0 2.4,2" fill="none" stroke="${k}" stroke-width="0.8"/>`)}
        ${counter(INK.green)}
        <g transform="translate(128 145)">
          <path d="M-17,0 Q-22,-10 -14,-18 L14,-18 Q22,-10 17,0 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
          <path d="M-12,-14 Q-15,-8 -12,-3" fill="none" stroke="${INK.yellow}" stroke-width="0.9" opacity="0.7"/>
          <ellipse cy="-18" rx="14.5" ry="2.6" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
          <path d="M-14,-18.6 Q0,-24 14,-18.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <path d="M-14,-18.6 Q0,-16 14,-18.6" fill="none" stroke="${INK.yellow}" stroke-width="1.3"/>
        </g>
        ${wisps(ctx, 128, 122, 26, { dur: 3, count: 4, spread: 5, op: 0.55, sw: 0.7 })}
        <g fill="${INK.green}" stroke="${k}" stroke-width="0.35">${[0, 1, 2, 3].map((i) => `<path d="M100,${145 - i * 2.4} h10 l-1.6,-3.2 h-6.8 Z"/>`).join('')}</g>
        ${queue(ctx, `${p}-qt`, k)}
        ${person(92, 167, k, { s: 2, arms: `<path d="M0,-12 L3,-10 L4.4,-12.6" fill="none" stroke="${k}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.6,-14.6 h4 l-0.8,1.8 h-2.4 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.2"/>` })}
        ${person(186, 167, k, { s: 2, dir: -1, shirt: INK.blue, arms: `<path d="M0,-12 L2.6,-9 L2.4,-13.4" fill="none" stroke="${INK.blue}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.8,-15 h3.6 l-0.7,1.6 h-2.2 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.2"/>` })}
        <g transform="translate(176 100)">${perch(k)}${ctx.a(holdMove('0 0;0 0;5 -3;10 0;10 0;5 -3;0 0', '6s', '0;0.3;0.38;0.46;0.8;0.88;1'))}</g>`;

      const bagels = [[-10, -2], [0, -1], [10, -2], [-5, -6], [6, -6.4], [0, -10.4]].map(([x, y]) =>
        `<g transform="translate(${x} ${y})"><ellipse rx="5.6" ry="3.2" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/><ellipse rx="5.6" ry="3.2" fill="${INK.kaapi}" opacity="0.4"/><ellipse rx="1.6" ry="0.9" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/><path d="M-3,-1.4 h0.5 M2,-2 h0.5 M-1,1.4 h0.5 M3,0.6 h0.5" stroke="${k}" stroke-width="0.4"/></g>`).join('');
      const bottom = `
        <defs>${clip(`${p}-qb`)}</defs>
        ${bg(INK.blue, 0.12)}
        <rect x="38" y="30" width="174" height="44" fill="${INK.red}" opacity="0.3"/>
        <rect x="38" y="30" width="174" height="44" fill="url(#${p}-brick)"/>
        ${[52, 82, 156, 186].map((x) => `<rect x="${x}" y="40" width="14" height="22" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.45"/><path d="M${x},51 h14" stroke="${k}" stroke-width="0.45"/><rect x="${x - 1.5}" y="37" width="17" height="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/>`).join('')}
        <path d="M34,72 H216 L212,86 H38 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
        <path d="${Array.from({ length: 15 }, (_, i) => `M${38 + i * 12.4},86 q6.2,5 12.4,0`).join(' ')}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <text x="125" y="82.6" text-anchor="middle" font-family="${FONT.sans}" font-size="7.6" font-weight="700" letter-spacing="2" fill="${INK.paper}">BAGELS · SMOKED FISH</text>
        <rect x="38" y="91" width="174" height="76" fill="${INK.yellow}" opacity="0.22"/>
        <rect x="38" y="91" width="174" height="76" fill="url(#${p}-hatch)" opacity="0.18"/>
        <g stroke="${k}" stroke-width="0.4">${[160, 184].map((x) => `<rect x="${x}" y="102" width="20" height="10" fill="${INK.paper}"/><rect x="${x}" y="116" width="20" height="10" fill="${INK.paper}"/>`).join('')}</g>
        <g fill="${INK.kaapi}" opacity="0.6">${[160, 184].map((x) => [0, 1, 2].map((i) => `<ellipse cx="${x + 4 + i * 6}" cy="108" rx="2.6" ry="1.5"/><ellipse cx="${x + 4 + i * 6}" cy="122" rx="2.6" ry="1.5"/>`).join('')).join('')}</g>
        ${server(150, `<path d="M7,-9.4 L12,-7 M7,-9.4 L12,-8.6" stroke="${k}" stroke-width="0.6"/>`)}
        ${counter(INK.paper)}
        <rect x="98" y="148" width="54" height="19" fill="url(#${p}-hatch)" opacity="0.3"/>
        <g transform="translate(125 145)">
          <path d="M-16,0 L-18,-8 H18 L16,0 Z" fill="none" stroke="${k}" stroke-width="0.6"/>
          <path d="M-12,0 L-13.4,-8 M-6,0 L-6.6,-8 M0,0 V-8 M6,0 L6.6,-8 M12,0 L13.4,-8 M-17,-4 H17" stroke="${k}" stroke-width="0.35"/>
          <g transform="translate(0 -7)">${bagels}</g>
          <path d="M9,-14 V-24" stroke="${k}" stroke-width="0.4"/>
          <rect x="9" y="-26.4" width="22" height="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/>
          <text x="20" y="-22.2" text-anchor="middle" font-family="${FONT.sans}" font-size="3.3" font-weight="700" fill="${k}">EVERYTHING</text>
        </g>
        ${queue(ctx, `${p}-qb`, k)}
        ${person(92, 167, k, { s: 2, shirt: INK.red, arms: `<path d="M0,-12 L3,-9.6 L5,-9.6" fill="none" stroke="${INK.red}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>` })}
        ${person(190, 167, k, { s: 2, dir: -1, shirt: INK.green, arms: `<path d="M0,-12 L1.8,-7" stroke="${INK.green}" stroke-width="1.1" stroke-linecap="round"/><path d="M0.2,-7.4 h3.6 v5 h-3.6 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.25"/>` })}
        <g transform="translate(66 72)">${perch(k, 0.45)}${ctx.a(holdMove('0 0;0 0;4 0;4 0;0 0', '6s', '0;0.4;0.5;0.85;1'))}</g>`;

      return {
        top: { city: 'blr', caption: 'SHIVAJINAGAR', clause: 'Nobody queues for food.', art: top },
        bottom: { city: 'nyc', caption: 'UPPER WEST SIDE', clause: 'Everybody queues for Sunday.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 5 of Hearts: Flowers for No Reason. Mallige x bucket flowers, noon.
  // ======================================================================
  T.register({
    id: 'h-5', rank: '5', suit: 'heart', title: 'Flowers for No Reason',
    pair: ['Mallige by the arm', 'Deli bucket flowers'],
    sentence: ['Somebody is buying flowers', 'for no particular reason.'],
    why: 'Jasmine by the arm, tulips by the bucket. Nobody needs a reason. Everybody has one.',
    mechanism: 'A round basket meets a row of buckets. She measures jasmine to the elbow. He leaves with tulips.',
    sound: 'Haggling, a scale clinking, kraft paper rustle, the deli door chime.',
    draw(ctx) {
      const p = ctx.id;
      const jasmine = (x0, y0, x1, y1, n, r) => Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        return `<circle cx="${f(x0 + (x1 - x0) * t)}" cy="${f(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 1.2)}" r="${r}" fill="${INK.paper}" stroke="${k}" stroke-width="0.25"/>`;
      }).join('');
      const garland = (x, len, col, b) => `<g>${ctx.a(easeSpin(`0 ${x} 72;3 ${x} 72;0 ${x} 72;-3 ${x} 72;0 ${x} 72`, '4s', ` begin="${b}"`))}
          ${Array.from({ length: Math.floor(len / 2.6) }, (_, i) => `<circle cx="${x}" cy="${f(74 + i * 2.6)}" r="1.4" fill="${col}" stroke="${k}" stroke-width="0.22"/>`).join('')}</g>`;
      // Measuring arm: lifts the string to arm's length and back.
      const arm = `<g transform="translate(131 127)">${ctx.a(easeSpin('0;-16;-16;0;0', '4s'))}
          <path d="M0,0 L11,4 L22,2" fill="none" stroke="${INK.kaapi}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${jasmine(-8, 9, 22, 1.6, 12, 1.2)}
        </g>`;
      const scale = `<g transform="translate(74 64)">
          <path d="M0,-30 V0" stroke="${k}" stroke-width="0.4"/>
          <g>${ctx.a(easeSpin('0;6;0;-6;0', '6s'))}
            <path d="M-12,0 H12" stroke="${k}" stroke-width="1"/>
            <path d="M-12,0 L-16,12 M-12,0 L-8,12 M12,0 L8,12 M12,0 L16,12" stroke="${k}" stroke-width="0.3"/>
            <path d="M-17,12 Q-12,15 -7,12 Z M7,12 Q12,15 17,12 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
          </g>
        </g>`;

      const top = `
        ${bg(INK.yellow, 0.18)}
        <rect x="38" y="42" width="174" height="125" fill="${INK.red}" opacity="0.12"/>
        ${[48, 196].map((x) => `<rect x="${x}" y="50" width="7" height="117" fill="${INK.red}" fill-opacity="0.7" stroke="${k}" stroke-width="0.45"/><rect x="${x - 2}" y="48" width="11" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>`).join('')}
        <path d="M30,30 H220 V42 Q125,64 30,42 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
        <path d="M70,42 Q74,50 78,53 M170,42 Q166,50 160,53" stroke="${INK.paper}" stroke-width="0.4" fill="none" opacity="0.6"/>
        <path d="M84,72 H186" stroke="${INK.kaapi}" stroke-width="1.6" stroke-linecap="round"/>
        ${garland(92, 34, INK.paper, '0s')}${garland(102, 28, INK.yellow, '-1s')}${garland(112, 38, INK.paper, '-2s')}
        ${garland(158, 36, INK.paper, '-0.5s')}${garland(168, 26, INK.red, '-1.5s')}${garland(178, 32, INK.paper, '-2.5s')}
        ${scale}
        <circle cx="125" cy="113.6" r="4" fill="${k}"/>
        <circle cx="125" cy="117.4" r="2.2" fill="${k}"/><path d="M122.6,118.6 Q125,121.4 127.4,118.6" fill="none" stroke="${INK.paper}" stroke-width="1" stroke-dasharray="0.9 0.5"/>
        <path d="M117,123 Q125,119 133,123 L138,150 H112 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="M120,121 L134,150" stroke="${INK.red}" stroke-width="2.2"/>
        <path d="M119,123 L114,134 L118,136" fill="none" stroke="${INK.kaapi}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${arm}
        <path d="M90,150 L160,150 L153,167 L97,167 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.6"/>
        <path d="M90,150 L160,150 L153,167 L97,167 Z" fill="url(#${p}-hatch)" opacity="0.45"/>
        <path d="M92,156 H158 M94.5,161.5 H155.5" stroke="${k}" stroke-width="0.4"/>
        <path d="${scallop(110, 148, 16, 4.6, 12, 1.6)}" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <path d="M98,148 q12,-5 24,0 M101,146 q9,-3.4 18,0" fill="none" stroke="${k}" stroke-width="0.3"/>
        <path d="${scallop(140, 148.4, 13, 4, 10, 1.6)}" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <path d="${scallop(140, 148.4, 13, 4, 10, 1.6)}" fill="${INK.red}" opacity="0.35"/>
        <g fill="${INK.red}" stroke="${k}" stroke-width="0.25"><circle cx="125" cy="144" r="2"/><circle cx="128.6" cy="145.4" r="1.8"/><circle cx="122" cy="146" r="1.7"/></g>
        <ellipse cx="125" cy="150" rx="35" ry="2.2" fill="none" stroke="${k}" stroke-width="0.9"/>
        ${person(184, 167, k, { s: 2.1, dir: -1, dress: INK.pink, extra: `<path d="M-1.6,-11.4 L-3.4,-6 L-2.6,-2" fill="none" stroke="${INK.pink}" stroke-width="1.1" stroke-linecap="round"/><path d="M-4.4,-4 h3.4 l-0.4,4 h-2.6 Z" fill="${INK.blue}" fill-opacity="0.6" stroke="${k}" stroke-width="0.2"/>` })}`;

      const bouquet = (x, y, col, kind, b) => {
        const heads = kind === 'sun'
          ? `<circle cx="0" cy="-15" r="4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/><circle cx="0" cy="-15" r="1.6" fill="${INK.kaapi}"/>`
          : [[-3, -15], [0, -17], [3, -15]].map(([hx, hy]) => kind === 'tulip'
            ? `<path d="M${hx - 1.6},${hy} q0,-3.4 1.6,-3.6 q1.6,0.2 1.6,3.6 q-1.6,1.4 -3.2,0 Z" fill="${col}" stroke="${k}" stroke-width="0.25"/>`
            : `<circle cx="${hx}" cy="${hy - 1}" r="2" fill="${col}" stroke="${k}" stroke-width="0.25"/>`).join('');
        return `<g transform="translate(${x} ${y}) scale(1.45)"><g>${ctx.a(easeSpin('0 0 0;3 0 0;0 0 0;-2 0 0;0 0 0', '4s', ` begin="${b}"`))}
          <path d="M-2.4,-2 L-4,-13 M0,-2 V-14 M2.4,-2 L4,-13" stroke="${INK.green}" stroke-width="0.6"/>${heads}
          <path d="M-5.4,-1 L-7,-11 L0,-6 L7,-11 L5.4,-1 Z" fill="${INK.kaapi}" fill-opacity="0.55" stroke="${k}" stroke-width="0.3"/></g></g>`;
      };
      const bucket = (x, y) => `<path d="M${x - 7},${y} L${x - 5.6},${y + 13} H${x + 5.6} L${x + 7},${y} Z" fill="${k}" fill-opacity="0.18" stroke="${k}" stroke-width="0.5"/><path d="M${x - 7.4},${y} H${x + 7.4}" stroke="${k}" stroke-width="0.9"/><path d="M${x - 6},${y + 5} H${x + 6}" stroke="${k}" stroke-width="0.3"/>`;
      const walker = ctx.still ? '' : `<g transform="translate(${CX} 167)">${move('-120 0;120 0', '12s', ' begin="-9s"')}${figure(ctx, { color: k, extra: `<g transform="translate(2.6 -9) rotate(24)"><path d="M0,0 L-2,-6 L2,-6 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.2"/><circle cx="-1" cy="-6.6" r="1" fill="${INK.red}"/><circle cx="1" cy="-7" r="1" fill="${INK.pink}"/></g>` })}</g>`;
      const bottom = `
        ${bg(INK.blue, 0.11)}
        <rect x="38" y="34" width="174" height="20" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <text x="125" y="47.6" text-anchor="middle" font-family="${FONT.sans}" font-size="9" font-weight="700" letter-spacing="1.6" fill="${INK.paper}">DELI · GROCERY</text>
        <path d="M36,56 H214 L210,68 H40 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 15 }, (_, i) => `M${46 + i * 12},56 l-1,12 h6 l1,-12 Z`).join(' ')}" fill="${INK.green}"/>
        <rect x="38" y="68" width="174" height="99" fill="${k}" opacity="0.08"/>
        <rect x="44" y="74" width="62" height="58" fill="${INK.blue}" fill-opacity="0.22" stroke="${k}" stroke-width="0.6"/>
        <rect x="144" y="74" width="62" height="58" fill="${INK.blue}" fill-opacity="0.22" stroke="${k}" stroke-width="0.6"/>
        <g stroke="${k}" stroke-width="0.35">${[88, 102, 116].map((y) => `<path d="M46,${y} H104 M146,${y} H204"/>`).join('')}</g>
        <g>${[50, 58, 66, 74, 82, 90, 98].map((x, i) => `<rect x="${x}" y="${80 + (i % 2)}" width="5" height="7" fill="${[INK.red, INK.yellow, INK.green, INK.blue][i % 4]}" opacity="0.7"/>`).join('')}${[150, 158, 166, 174, 182, 190, 198].map((x, i) => `<rect x="${x}" y="${94 + (i % 2)}" width="5" height="7" fill="${[INK.yellow, INK.blue, INK.red, INK.green][i % 4]}" opacity="0.7"/>`).join('')}</g>
        <text x="175" y="124" text-anchor="middle" font-family="${FONT.sans}" font-size="8" font-weight="700" letter-spacing="1" fill="none" stroke="${INK.pink}" stroke-width="0.8">OPEN 24 HRS${ctx.a(loop('opacity', '1;1;0.2;1;1', '12s', ' keyTimes="0;0.4;0.41;0.43;1"'))}</text>
        <rect x="108" y="74" width="34" height="76" fill="${k}" fill-opacity="0.25" stroke="${k}" stroke-width="0.5"/>
        <rect x="88" y="136" width="74" height="6" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.45"/>
        <path d="M90,142 V167 M160,142 V167" stroke="${k}" stroke-width="1"/>
        ${bouquet(112, 127, INK.red, 'tulip', '0s')}${bouquet(125, 127, INK.yellow, 'sun', '-1s')}${bouquet(138, 127, INK.pink, 'rose', '-2s')}
        ${bucket(112, 123)}${bucket(125, 123)}${bucket(138, 123)}
        ${bouquet(100, 158, INK.pink, 'tulip', '-0.5s')}${bouquet(117, 158, INK.red, 'rose', '-1.5s')}${bouquet(133, 158, INK.yellow, 'tulip', '-2.5s')}${bouquet(150, 158, INK.paper, 'rose', '-3s')}
        ${bucket(100, 154)}${bucket(117, 154)}${bucket(133, 154)}${bucket(150, 154)}
        <g transform="translate(176 150)"><path d="M0,0 V17" stroke="${k}" stroke-width="0.5"/><rect x="-9" y="-7" width="18" height="8" fill="${INK.kaapi}" fill-opacity="0.45" stroke="${k}" stroke-width="0.4" transform="rotate(-4)"/><text x="0" y="-1.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.6" font-weight="700" fill="${k}" transform="rotate(-4)">$12.99</text></g>
        ${walker}`;

      return {
        top: { city: 'blr', caption: 'MALLESHWARAM', clause: 'Somebody is buying flowers', art: top },
        bottom: { city: 'nyc', caption: 'COBBLE HILL', clause: 'for no particular reason.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 6 of Hearts: Packed Lunch. Steel tiffin x brown paper bag, 2 PM.
  // ======================================================================
  // Wall clock stuck at two o'clock; the minute hand laps once per loop.
  function clock(ctx, x, y, r) {
    let ticks = '';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ticks += `M${f(Math.cos(a) * r * 0.78)},${f(Math.sin(a) * r * 0.78)} L${f(Math.cos(a) * r * 0.92)},${f(Math.sin(a) * r * 0.92)} `; }
    return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${INK.paper}" stroke="${k}" stroke-width="0.9"/><path d="${ticks}" stroke="${k}" stroke-width="0.4"/>
      <path d="M0,0 L${f(r * 0.42)},${f(-r * 0.24)}" stroke="${k}" stroke-width="1" stroke-linecap="round"/>
      <path d="M0,0 V${f(-r * 0.72)}" stroke="${INK.red}" stroke-width="0.6" stroke-linecap="round">${ctx.a(spin('0;360', '12s'))}</path><circle r="0.8" fill="${k}"/></g>`;
  }
  function deskScene(ctx, p, front) {
    return `<rect x="38" y="130" width="174" height="10" fill="${INK.paper}"/>
      <path d="M38,130 H212" stroke="${k}" stroke-width="0.6"/>
      <rect x="34" y="140" width="182" height="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
      <rect x="38" y="144" width="174" height="23" fill="${front}" opacity="0.55"/>
      <rect x="38" y="144" width="174" height="23" fill="url(#${p}-hatch)" opacity="0.2"/>
      <path d="M100,144 V167 M150,144 V167" stroke="${k}" stroke-width="0.4"/>
      <g transform="translate(152 0)">
        <rect x="2" y="111" width="40" height="27" rx="1.4" fill="${k}"/>
        <rect x="4.4" y="113.4" width="35.2" height="22" fill="${INK.blue}" opacity="0.55"/>
        <path d="M8,118 h18 M8,122 h26 M8,126 h14 M8,130 h22" stroke="${INK.paper}" stroke-width="0.7" opacity="0.8"/>
        <path d="M-2,141 L2,137.6 H42 L46,141 Z" fill="${k}" fill-opacity="0.75"/>
        <rect x="33" y="108" width="9" height="9" fill="${INK.yellow}" stroke="${k}" stroke-width="0.3" transform="rotate(8 37 112)"/>
      </g>
      <g transform="translate(72 140)">
        <rect x="-1" y="-2.6" width="20" height="2.6" rx="0.8" fill="${k}"/>
        <ellipse cx="9" cy="-3.4" rx="12" ry="3" fill="${INK.yellow}" opacity="${ctx.still ? 0.5 : 0}">${ctx.a(loop('opacity', '0;0;0.6;0;0.6;0;0', '6s', ' keyTimes="0;0.6;0.65;0.7;0.75;0.8;1"'))}</ellipse>
        <g>${ctx.a(move('0 0;0 0;0.6 0;-0.6 0;0.6 0;0 0;0 0', '6s', ' keyTimes="0;0.6;0.65;0.7;0.75;0.8;1"'))}<rect x="0" y="-2.2" width="18" height="1.8" rx="0.6" fill="${INK.blue}" opacity="0.8"/></g>
      </g>
      <rect x="90" y="26" width="12" height="104" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      ${clock(ctx, 96, 50, 9)}`;
  }
  T.register({
    id: 'h-6', rank: '6', suit: 'heart', title: 'Packed Lunch',
    pair: ['Steel tiffin carrier', 'Brown paper bag'],
    sentence: ['Packed by someone', "who worried you'd skip lunch."],
    why: 'Two o\'clock. You forgot lunch. Somebody at home saw that coming at seven this morning.',
    mechanism: 'Same desk, same clock. A steel tiffin above, a brown bag below. The phone buzzes in both.',
    sound: 'Keyboards, a tiffin latch, paper crinkle, one phone buzzing twice.',
    draw(ctx) {
      const p = ctx.id;
      const train = `<g transform="translate(${ctx.still ? 96 : 0} 0)">${ctx.a(move('-90 0;260 0', '6s', ' begin="-1s"'))}
          <rect x="0" y="89" width="72" height="11" rx="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <path d="M1,96.6 H71" stroke="${INK.pink}" stroke-width="2"/>
          <path d="${Array.from({ length: 8 }, (_, i) => `M${5 + i * 8.4},91.4 h5 v3.4 h-5 Z`).join(' ')}" fill="${k}" opacity="0.7"/>
          <path d="M24,89 v11 M48,89 v11" stroke="${k}" stroke-width="0.4"/></g>`;
      const crane = `<g stroke="${k}" stroke-width="0.4" fill="none">
          <path d="M114,130 V36 M119,130 V36"/>
          <path d="${Array.from({ length: 15 }, (_, i) => `M114,${130 - i * 6.4} L119,${130 - (i + 1) * 6.4}`).join(' ')}"/>
          <path d="M98,36 H208 M98,32 H208 M116.5,26 L98,32 M116.5,26 L150,32"/>
        </g>
        <rect x="96" y="36" width="8" height="6" fill="${k}"/>
        <g>${ctx.a(easeMove('0 0;36 0;36 0;0 0', '12s'))}
          <rect x="150" y="35" width="6" height="2.6" fill="${k}"/><path d="M153,37 V66" stroke="${k}" stroke-width="0.35"/>
          <path d="M151,66 h4 l-1,3 q-1,1.6 -2,0" fill="none" stroke="${k}" stroke-width="0.6"/>
          <rect x="140" y="70" width="26" height="3" fill="${INK.red}" stroke="${k}" stroke-width="0.35"/>
        </g>`;
      const tiers = [0, 1, 2].map((i) => {
        const y = 129 - i * 11;
        return `<rect x="110" y="${y}" width="30" height="11" rx="1.8" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/><rect x="110" y="${y}" width="30" height="11" rx="1.8" fill="${k}" opacity="0.1"/><path d="M109.4,${y + 1.5} H140.6" stroke="${k}" stroke-width="1"/>`;
      }).join('');

      const top = `
        ${bg(INK.blue, 0.08)}
        <rect x="38" y="20" width="174" height="110" fill="${INK.blue}" opacity="0.16"/>
        <rect x="160" y="42" width="44" height="88" fill="${INK.blue}" fill-opacity="0.45" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 14 }, (_, i) => `M160,${48 + i * 6} H204`).join(' ')} M171,42 V130 M182,42 V130 M193,42 V130" stroke="${INK.paper}" stroke-width="0.4" opacity="0.6"/>
        <rect x="42" y="62" width="40" height="68" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 10 }, (_, i) => `M46,${68 + i * 6} h32`).join(' ')}" stroke="${INK.blue}" stroke-width="2.4" opacity="0.4"/>
        ${crane}
        <rect x="38" y="100" width="174" height="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.5"><rect x="62" y="106" width="7" height="24"/><rect x="140" y="106" width="7" height="24"/><rect x="196" y="106" width="7" height="24"/></g>
        ${train}
        ${deskScene(ctx, p, INK.kaapi)}
        <path d="M107.6,138.6 V103 M142.4,138.6 V103 M106,138.6 h5 M144,138.6 h-5" stroke="${k}" stroke-width="1"/>
        ${tiers}
        <path d="M111,107 Q125,100 139,107 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M107.6,103 Q107.6,91 125,91 Q142.4,91 142.4,103" fill="none" stroke="${k}" stroke-width="1.5"/>
        <rect x="122.4" y="100.4" width="5.2" height="3.6" fill="${k}"/>
        <path d="M114.6,110 V138" stroke="${INK.paper}" stroke-width="1.5" opacity="0.8"/>
        ${wisps(ctx, 125, 99, 18, { dur: 3, count: 3, spread: 3, op: 0.45 })}
        ${miniTumbler(103, 140)}`;

      const bottom = `
        ${bg(INK.red, 0.06)}
        <rect x="38" y="20" width="174" height="110" fill="${INK.blue}" opacity="0.14"/>
        <path d="M42,130 V72 H50 V60 H58 V48 H72 V60 H80 V72 H88 V130 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 9 }, (_, i) => `M46,${78 + i * 6} h38`).join(' ')} M60,52 v8 M66,52 v8" stroke="${k}" stroke-width="0.35" opacity="0.6"/>
        <rect x="158" y="36" width="48" height="94" fill="${INK.kaapi}" fill-opacity="0.45" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.yellow}" opacity="0.7">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${162 + c * 11}" y="${41 + r * 8}" width="6" height="4"/>`).join('')).join('')}</g>
        <rect x="104" y="98" width="50" height="32" fill="${INK.red}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/>
        <rect x="104" y="98" width="50" height="32" fill="url(#${p}-brick)"/>
        <g transform="translate(136 98)">
          <path d="M-6,0 L-5,-8 M6,0 L5,-8 M-6,0 L6,-5 M6,0 L-6,-5" stroke="${k}" stroke-width="0.45"/>
          <rect x="-7" y="-19" width="14" height="11" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.45"/><path d="M-7,-15 H7 M-7,-11 H7" stroke="${k}" stroke-width="0.5"/>
          <path d="M-8,-19 L0,-26 L8,-19 Z" fill="${k}"/>
        </g>
        <g transform="translate(176 129)">${perch(k, 0.45)}${ctx.a(holdMove('0 0;0 0;-6 0;-6 0;0 0', '6s', '0;0.3;0.45;0.8;1'))}</g>
        ${deskScene(ctx, p, INK.kaapi)}
        <path d="M110.6,140 L112.2,106 H137.8 L139.4,140 Z" fill="${INK.kaapi}" fill-opacity="0.65" stroke="${k}" stroke-width="0.6"/>
        <path d="M116.4,106 L117,140 M133.6,106 L133,140" stroke="${k}" stroke-width="0.3"/>
        <path d="M112.2,106 l2.56,-1.8 l2.56,1.8 l2.56,-1.8 l2.56,1.8 l2.56,-1.8 l2.56,1.8 l2.56,-1.8 l2.56,1.8 l2.56,-1.8 l2.56,1.8 V97 H112.2 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <path d="M112.2,101 H137.8" stroke="${k}" stroke-width="0.35"/>
        <g transform="rotate(-6 125 126)">
          <rect x="119" y="120" width="12" height="11" fill="${INK.yellow}" stroke="${k}" stroke-width="0.3"/>
          <path d="M0,5.6 C-1.2,4 -6,1.2 -6,-2 C-6,-5 -2.4,-6.4 0,-3.5 C2.4,-6.4 6,-5 6,-2 C6,1.2 1.2,4 0,5.6 Z" transform="translate(125 125.6) scale(0.55)" fill="none" stroke="${INK.red}" stroke-width="1.2"/>
        </g>
        <g transform="translate(146 140)"><circle cy="-5" r="5" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/><path d="M0,-9.6 q0.4,-2 1.6,-2.8" stroke="${k}" stroke-width="0.6" fill="none"/><path d="M1,-10.6 q3,-1.6 4,0.6 q-2.6,1 -4,-0.6 Z" fill="${INK.green}"/><path d="M-2.6,-7 q-0.6,1.6 0,3" stroke="${INK.paper}" stroke-width="0.7" fill="none"/></g>`;

      return {
        top: { city: 'blr', caption: 'WHITEFIELD', clause: 'Packed by someone', art: top },
        bottom: { city: 'nyc', caption: 'MIDTOWN', clause: "who worried you'd skip lunch.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 7 of Hearts: Group Chat. Apartment association x co-op chat, 4 PM.
  // One phone runs through the seam; a chat fills up at each end.
  // ======================================================================
  function phone(ctx, accent, seed) {
    const bubbles = [
      { x: 107, y: 111, w: 24, h: 8, l: 1 }, { x: 117, y: 121, w: 26, h: 8, l: 0 },
      { x: 107, y: 131, w: 21, h: 14, l: 1, parcel: 1 }, { x: 119, y: 148, w: 24, h: 8, l: 0 },
      { x: 107, y: 158, w: 15, h: 7, l: 1, dots: 1 }
    ];
    const body = bubbles.map((b, i) => {
      const t = f(0.04 + i * 0.12);
      const show = ctx.a(loop('opacity', '0;0;1;1;0', '12s', ` keyTimes="0;${t};${f(+t + 0.02)};0.95;1"`));
      let inner = '';
      if (b.parcel) inner = `<rect x="${b.x + 5}" y="${b.y + 3}" width="10" height="8" fill="${INK.kaapi}" fill-opacity="0.7" stroke="${k}" stroke-width="0.35"/><path d="M${b.x + 10},${b.y + 3} V${b.y + 11} M${b.x + 5},${b.y + 5.4} H${b.x + 15}" stroke="${INK.yellow}" stroke-width="0.7"/>`;
      else if (b.dots) inner = [0, 1, 2].map((j) => `<circle cx="${b.x + 4 + j * 3.4}" cy="${b.y + 3.5}" r="0.9" fill="${k}" opacity="0.5">${ctx.a(easeLoop('opacity', '0.2;0.8;0.2', '1.2s', ` begin="-${f(j * 0.3)}s"`))}</circle>`).join('');
      else inner = `<path d="M${b.x + 2.6},${b.y + 2.8} h${b.w - 5.2} M${b.x + 2.6},${b.y + 5.4} h${b.w - 10}" stroke="${k}" stroke-width="0.6" opacity="0.45"/>`;
      return `<g opacity="${ctx.still ? 1 : 0}">${show}<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="2.6" fill="${b.l ? k : accent}" fill-opacity="${b.l ? 0.1 : 0.4}"/>${inner}</g>`;
    }).join('');
    return `<g>${ctx.a(move('0 0;0 0;0.7 0;-0.7 0;0.7 0;0 0;0 0', '3s', ' keyTimes="0;0.7;0.75;0.8;0.85;0.9;1"'))}
      <path d="M100,178 V95 Q100,86 109,86 H141 Q150,86 150,95 V178 Z" fill="${k}"/>
      <rect x="104" y="96" width="42" height="82" rx="2" fill="${INK.paper}"/>
      <rect x="119" y="89" width="12" height="2.4" rx="1.2" fill="${INK.paper}" opacity="0.35"/>
      <rect x="104" y="96" width="42" height="11" fill="${accent}"/>
      <circle cx="110" cy="101.5" r="3" fill="${INK.paper}"/><path d="M108.4,102.6 l1.6,-2 l1.6,2 Z" fill="${accent}"/>
      <path d="M116,100 h17 M116,103.4 h11" stroke="${INK.paper}" stroke-width="0.8"/>
      ${body}</g>`;
  }
  function blockFloors(x, w, y0, n, fill, ctx, p, balcony) {
    let s = `<rect x="${x}" y="${y0}" width="${w}" height="${167 - y0}" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><rect x="${x}" y="${y0}" width="${w}" height="${167 - y0}" fill="${fill}" opacity="0.32"/>`;
    const fh = (167 - y0) / n;
    for (let i = 0; i < n; i++) {
      const y = y0 + i * fh;
      s += `<rect x="${x + 6}" y="${f(y + 4)}" width="${w - 30}" height="${f(fh - 12)}" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.4"/>`;
      s += `<rect x="${x + w - 18}" y="${f(y + 4)}" width="12" height="${f(fh - 8)}" fill="${INK.kaapi}" fill-opacity="0.6" stroke="${k}" stroke-width="0.4"/>`;
      if (balcony) s += `<rect x="${x + 3}" y="${f(y + fh - 9)}" width="${w - 6}" height="7" fill="none" stroke="${k}" stroke-width="0.6"/><path d="${Array.from({ length: Math.floor((w - 6) / 3) }, (_, j) => `M${x + 4.5 + j * 3},${f(y + fh - 9)} v7`).join(' ')}" stroke="${k}" stroke-width="0.3"/>`;
      s += `<path d="M${x},${f(y + fh)} H${x + w}" stroke="${k}" stroke-width="0.6"/>`;
    }
    return s;
  }
  T.register({
    id: 'h-7', rank: '7', suit: 'heart', title: 'Group Chat',
    pair: ['Apartment association group', 'Co-op building chat'],
    sentence: ['Forty neighbours,', 'one missing parcel.'],
    why: 'Two hundred messages about one parcel. Security had it the whole time.',
    mechanism: 'One phone runs through the seam. The chat fills at both ends. The parcel shows up in both.',
    sound: 'Pings, more pings, a scooter horn, somebody typing for far too long.',
    draw(ctx) {
      const p = ctx.id;
      const scooter = `<g transform="translate(58 167)">
          <path d="M-20,-27 h14 v12 h-14 Z" fill="${INK.kaapi}" fill-opacity="0.75" stroke="${k}" stroke-width="0.45"/><path d="M-13,-27 v12 M-20,-22 h14" stroke="${INK.yellow}" stroke-width="0.9"/>
          <path d="M-18,-7 Q-17,-14 -6,-15 L7,-15 L11,-8 L-2,-7 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
          <path d="M8,-14 L13,-25 M10,-25 h7" stroke="${k}" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M9,-9 L16,-5 Q18,-11 13,-15 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
          <circle cx="-12" cy="-5" r="5" fill="${k}"/><circle cx="-12" cy="-5" r="1.8" fill="${INK.paper}"/><circle cx="14" cy="-5" r="5" fill="${k}"/><circle cx="14" cy="-5" r="1.8" fill="${INK.paper}"/>
        </g>
        ${person(88, 167, k, { s: 2, dir: -1, shirt: INK.yellow, arms: `<path d="M0,-12 L2.6,-9.6 L2.2,-13" fill="none" stroke="${INK.yellow}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><rect x="1.2" y="-15.6" width="2" height="3.2" fill="${k}"/>` })}`;
      const watcher = (x, y, c) => `<circle cx="${x}" cy="${y - 9}" r="3.4" fill="${k}"/><path d="M${x - 4},${y} V${y - 4} Q${x},${y - 7} ${x + 4},${y - 4} V${y} Z" fill="${c}"/><rect x="${x + 2}" y="${y - 7}" width="2.2" height="3.4" fill="${k}"/><circle cx="${x + 3}" cy="${y - 6}" r="3.6" fill="${INK.yellow}" opacity="0.35">${ctx.a(easeLoop('opacity', '0.4;0.1;0.4', '3s'))}</circle>`;

      const top = `
        ${bg(INK.yellow, 0.16)}
        ${blockFloors(38, 58, 44, 4, INK.pink, ctx, p, true)}
        ${blockFloors(154, 58, 52, 4, INK.yellow, ctx, p, true)}
        <g transform="translate(50 44)"><rect x="0" y="-12" width="12" height="12" rx="1.6" fill="${k}"/><path d="M0,-8 h12 M0,-4 h12" stroke="${INK.paper}" stroke-width="0.3"/><rect x="3" y="-14" width="6" height="2" fill="${k}"/></g>
        <g transform="translate(196 52)"><path d="M-6,-2 a7,7 0 0 1 10,-8 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><path d="M-1,-6 L3,-10 M-1,0 V-6" stroke="${k}" stroke-width="0.5"/></g>
        <g>${ctx.a(easeSpin('0 172 104;4 172 104;0 172 104;-4 172 104;0 172 104', '4s'))}<path d="M164,104 h6 v8 h-6 Z" fill="${INK.red}"/><path d="M174,104 h8 v10 h-8 Z" fill="${INK.green}"/><path d="M186,104 h5 v6 h-5 Z" fill="${INK.blue}"/></g>
        ${watcher(176, 136.6, INK.green)}
        ${watcher(76, 84.4, INK.red)}
        ${scooter}
        ${phone(ctx, INK.green, 1)}`;

      const coop = (x, w) => `<rect x="${x}" y="58" width="${w}" height="109" fill="${INK.red}" fill-opacity="0.38" stroke="${k}" stroke-width="0.5"/>
        <rect x="${x}" y="58" width="${w}" height="109" fill="url(#${p}-brick)"/>
        <path d="M${x - 2},58 L${x + w / 2},40 L${x + w + 2},58 Z" fill="${k}" fill-opacity="0.75"/>
        <rect x="${x + w / 2 - 4}" y="46" width="8" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        ${[68, 92, 116].map((y) => [x + 8, x + w - 22].map((wx) => `<rect x="${wx}" y="${y}" width="14" height="16" fill="${INK.blue}" fill-opacity="0.28" stroke="${INK.paper}" stroke-width="1.2"/><path d="M${wx},${y + 8} h14 M${wx + 7},${y} v16" stroke="${INK.paper}" stroke-width="0.6"/>`).join('')).join('')}`;
      const bottom = `
        ${bg(INK.blue, 0.13)}
        ${coop(38, 56)}${coop(156, 56)}
        <g transform="translate(63 92)">${watcher(0, 14, INK.blue)}</g>
        <path d="${scallop(66, 160, 30, 9, 12, 3)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(66, 160, 30, 9, 12, 3)}" fill="url(#${p}-leaf)"/>
        <path d="${scallop(186, 160, 28, 9, 12, 3)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(186, 160, 28, 9, 12, 3)}" fill="url(#${p}-leaf)"/>
        <g transform="translate(74 156) rotate(-10)"><rect x="-8" y="-6" width="16" height="11" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/><path d="M0,-6 V5 M-8,-2 H8" stroke="${INK.yellow}" stroke-width="1"/></g>
        <path d="M60,150 l3,4 M84,148 l-2,5" stroke="${INK.green}" stroke-width="1.6" stroke-linecap="round"/>
        <g transform="translate(176 58)">${perch(k, 0.45)}${ctx.a(holdMove('0 0;0 0;5 0;5 0;0 0', '6s', '0;0.5;0.6;0.9;1'))}</g>
        ${phone(ctx, INK.blue, 2)}`;

      return {
        top: { city: 'blr', caption: 'HSR LAYOUT', clause: 'Forty neighbours,', art: top },
        bottom: { city: 'nyc', caption: 'JACKSON HEIGHTS', clause: 'one missing parcel.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 8 of Hearts: Roof at Six. Terrace x tar beach, 6 PM.
  // A black plastic tank and a wooden water tower meet at the seam.
  // ======================================================================
  T.register({
    id: 'h-8', rank: '8', suit: 'heart', title: 'Roof at Six',
    pair: ['Bangalore terrace', 'Tar beach'],
    sentence: ['Every building has a roof', 'where the evening goes.'],
    why: 'Six o\'clock. Clothes come down off the line, everybody else goes up.',
    mechanism: 'A black water tank and a wooden water tower share the seam. Crows go home, pigeons go round.',
    sound: 'Crows heading home, a pressure cooker, pigeon wings, a far radio.',
    draw(ctx) {
      const p = ctx.id;
      const lineY = (x) => { const t = (x - 50) / 154; return (1 - t) * (1 - t) * 92 + 2 * t * (1 - t) * 106 + t * t * 92; };
      const cloth = (x, w, h, col, b, extra) => { const y = f(lineY(x)); return `<g>${ctx.a(easeSpin(`0 ${x} ${y};5 ${x} ${y};0 ${x} ${y};-4 ${x} ${y};0 ${x} ${y}`, '4s', ` begin="${b}"`))}<rect x="${f(x - w / 2)}" y="${y}" width="${w}" height="${h}" fill="${col}" stroke="${k}" stroke-width="0.4"/>${extra || ''}<path d="M${f(x - w / 2 + 1)},${y} v-1.4 M${f(x + w / 2 - 1)},${y} v-1.4" stroke="${k}" stroke-width="0.5"/></g>`; };
      const crows = ctx.still ? `<g transform="translate(150 52)">${bird(ctx, k, '0.4s', 1)}<g transform="translate(9 4)">${bird(ctx, k, '0.4s', 0.8)}</g><g transform="translate(-8 6)">${bird(ctx, k, '0.4s', 0.9)}</g></g>`
        : `<g transform="translate(0 52)">${move('260 0;-20 -8', '12s', ' begin="-4s"')}${bird(ctx, k, '0.4s', 1)}<g transform="translate(9 4)">${bird(ctx, k, '0.4s', 0.8)}</g><g transform="translate(-8 6)">${bird(ctx, k, '0.5s', 0.9)}</g></g>`;
      const parapet = (fill, pat) => `<rect x="38" y="140" width="174" height="27" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="140" width="174" height="27" fill="${fill}" opacity="0.4"/>${pat ? `<rect x="38" y="140" width="174" height="27" fill="url(#${p}-${pat})"/>` : ''}
        <rect x="35" y="136.6" width="180" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>`;

      const top = `
        ${bg(INK.pink, 0.22)}
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.14"/>
        <g transform="translate(70 104)"><circle r="20" fill="${INK.yellow}" opacity="0.3">${ctx.a(easeLoop('r', '19;24;19', '6s'))}</circle><circle r="14" fill="${INK.yellow}"/></g>
        <path d="M150,70 H214 M160,76 H214" stroke="${INK.paper}" stroke-width="0.9"/>
        <g stroke="${k}" stroke-width="0.3">${['M38,140 V120 H62 V114 H70 V120 H92 V140 Z', 'M156,140 V112 H186 V126 H212 V140 Z'].map((d) => `<path d="${d}" fill="${INK.paper}"/><path d="${d}" fill="${INK.kaapi}" fill-opacity="0.35"/>`).join('')}</g>
        <g transform="translate(200 140)" fill="none" stroke="${k}" stroke-width="1.2"><path d="M0,0 C1,-20 -2,-34 -6,-46"/></g>
        <g transform="translate(194 94)" stroke="${INK.green}" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M0,0 q-10,0 -16,8 M0,0 q8,-2 14,6 M0,0 q-6,-6 -12,-4 M0,0 q4,-8 12,-8 M0,0 q0,8 -4,14"/></g>
        ${crows}
        <path d="M50,92 V137 M204,92 V137" stroke="${k}" stroke-width="1"/>
        <path d="M50,92 Q127,120 204,92" fill="none" stroke="${k}" stroke-width="0.4"/>
        ${cloth(62, 10, 14, INK.blue, '0s', `<path d="M57,${f(lineY(62) + 4)} h10" stroke="${INK.paper}" stroke-width="0.4"/>`)}
        ${cloth(80, 9, 34, INK.red, '-1s', `<rect x="75.5" y="${f(lineY(80) + 28)}" width="9" height="4" fill="${INK.yellow}"/>`)}
        ${cloth(94, 8, 12, INK.paper, '-2s')}
        ${cloth(160, 10, 16, INK.yellow, '-0.5s', `<path d="M155,${f(lineY(160) + 13)} h10" stroke="${INK.red}" stroke-width="0.8"/>`)}
        ${cloth(176, 9, 20, INK.green, '-1.5s')}
        ${cloth(190, 6, 8, INK.pink, '-2.5s')}
        <rect x="108" y="126" width="34" height="12" fill="${INK.red}" fill-opacity="0.45" stroke="${k}" stroke-width="0.5"/>
        <rect x="108" y="126" width="34" height="12" fill="url(#${p}-brick)"/>
        <path d="M108,126 V96 Q108,88 125,88 Q142,88 142,96 V126 Z" fill="${k}"/>
        <path d="M108,100 H142 M108,108 H142 M108,116 H142" stroke="${INK.paper}" stroke-width="0.4" opacity="0.4"/>
        <ellipse cx="125" cy="89.6" rx="7" ry="2" fill="${k}" stroke="${INK.paper}" stroke-width="0.4"/>
        <path d="M112,98 V122" stroke="${INK.paper}" stroke-width="1" opacity="0.3"/>
        <path d="M142,118 H148 V137" fill="none" stroke="${k}" stroke-width="1.2"/>
        ${person(88, 151, k, { s: 2.1, dress: INK.green, extra: `<path d="M1,-12 L3.4,-9 L4.6,-11.4" fill="none" stroke="${INK.green}" stroke-width="1.1" stroke-linecap="round"/><path d="M3.8,-13.6 h2 l-0.3,2.4 h-1.4 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.2"/>` })}
        ${parapet(INK.yellow, null)}
        <g fill="${k}" opacity="0.4">${Array.from({ length: 14 }, (_, i) => `<rect x="${f(44 + i * 12.2)}" y="147" width="5" height="9" rx="2.4"/>`).join('')}</g>
        <path d="M38,160 H212" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        <g transform="translate(184 136.6)">
          <path d="M-6,0 L-7,-8 H7 L6,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/><path d="M-7.6,-8 H7.6" stroke="${k}" stroke-width="0.9"/>
          <g>${ctx.a(easeSpin('0 0 -8;4 0 -8;0 0 -8;-3 0 -8;0 0 -8', '6s'))}
          <path d="M0,-8 V-20 M0,-14 L-4,-17 M0,-16 L4,-20 M0,-12 L4,-14" stroke="${INK.green}" stroke-width="0.6"/>
          ${[[-4, -17], [4, -20], [4, -14], [0, -21], [-2.6, -12.6], [1.6, -18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${INK.green}" stroke="${k}" stroke-width="0.25"/>`).join('')}</g>
        </g>`;

      const flock = ctx.still
        ? [[60, 58], [72, 52], [84, 60], [176, 50], [188, 56]].map(([x, y]) => `<g transform="translate(${x} ${y})">${bird(ctx, k, '0.3s', 1)}</g>`).join('')
        : `<g transform="translate(125 58)">${move('-56 6;0 14;56 6;0 -6;-56 6', '6s')}${[[0, 0], [7, -4], [-6, 3], [4, 5], [-3, -5]].map(([x, y], i) => `<g transform="translate(${x} ${y})">${bird(ctx, i % 2 ? INK.ink : INK.paper, i % 2 ? '0.4s' : '0.5s', 1)}</g>`).join('')}</g>`;
      const flag = ctx.a(easeLoop('d', 'M0,0 Q5,-2 10,0 L10,7 Q5,5 0,7 Z;M0,0 Q5,2 10,0 L10,7 Q5,9 0,7 Z;M0,0 Q5,-2 10,0 L10,7 Q5,5 0,7 Z', '1.2s'));
      const bottom = `
        ${bg(INK.blue, 0.18)}
        <rect width="${W}" height="80" fill="${INK.pink}" opacity="0.16"/>
        <circle cx="186" cy="130" r="16" fill="${INK.red}" opacity="0.3"/>
        <g fill="${INK.kaapi}" fill-opacity="0.4" stroke="${k}" stroke-width="0.3"><path d="M150,140 V118 H212 V140 Z"/><path d="M146,118 H214 V115 H146 Z" fill-opacity="0.7"/><path d="M38,140 V124 H96 V140 Z"/></g>
        ${flock}
        <g transform="translate(80 112)">
          <path d="M0,0 V-42" stroke="${k}" stroke-width="0.8"/>
          <g transform="translate(0 -42)"><path d="M0,0 Q5,-2 10,0 L10,7 Q5,5 0,7 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.3">${flag}</path></g>
        </g>
        ${person(74, 140, k, { s: 2.1, shirt: INK.yellow, arms: `<path d="M0,-12 L2.6,-15 L3,-19" fill="none" stroke="${INK.yellow}" stroke-width="1.1" stroke-linecap="round"/>` })}
        <rect x="42" y="112" width="34" height="25" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="42" y="112" width="34" height="25" fill="url(#${p}-hatch)" opacity="0.6"/>
        <path d="M38,113 L59,102 L80,113 Z" fill="${k}" fill-opacity="0.75"/>
        <rect x="54" y="124" width="8" height="10" fill="${k}" opacity="0.6"/>
        <g stroke="${k}" stroke-width="0.7" fill="none"><path d="M110,137 L113,118 M140,137 L137,118 M125,137 V118 M111.6,128 L138.4,128 M113,118 L138,128 M137,118 L112,128"/></g>
        <rect x="106" y="116" width="38" height="3" fill="${k}"/>
        <path d="M110,116 L111.4,84 H138.6 L140,116 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
        <path d="M116,86 L115.6,115 M122,86 V115 M128,86 V115 M134,86 L134.4,115" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        <path d="M111.2,90 H138.8 M110.9,98 H139.1 M110.6,106 H139.4 M110.3,112 H139.7" stroke="${k}" stroke-width="0.8"/>
        <path d="M108,85 L125,70 L142,85 Z" fill="${k}"/>
        <circle cx="125" cy="69" r="1.4" fill="${k}"/>
        <path d="M144,137 V86 M147,137 V86 M144,${Array.from({ length: 10 }, (_, i) => `${92 + i * 5} H147 M144,`).join('')}137" stroke="${k}" stroke-width="0.35"/>
        ${parapet(INK.red, 'brick')}
        <g transform="translate(186 136.6)">
          <rect x="-11" y="-8" width="22" height="8" rx="1.2" fill="${k}"/>
          <circle cx="-6" cy="-4" r="2.6" fill="${INK.paper}"/><circle cx="6" cy="-4" r="2.6" fill="${INK.paper}"/>
          <circle cx="-6" cy="-4" r="1.2" fill="${k}">${ctx.a(easeLoop('r', '1.2;1.7;1.2', '0.5s'))}</circle><circle cx="6" cy="-4" r="1.2" fill="${k}">${ctx.a(easeLoop('r', '1.2;1.7;1.2', '0.5s'))}</circle>
          <path d="M-8,-8 Q0,-14 8,-8" fill="none" stroke="${k}" stroke-width="0.7"/>
        </g>`;

      return {
        top: { city: 'blr', caption: 'JAYANAGAR', clause: 'Every building has a roof', art: top },
        bottom: { city: 'nyc', caption: 'HARLEM', clause: 'where the evening goes.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 9 of Hearts: Somebody Cries. Kalyana mantapa x City Hall, 8 PM.
  // ======================================================================
  function tear(ctx, x, y, b) {
    return `<ellipse cx="${x}" cy="${y}" rx="0.7" ry="1.1" fill="${INK.blue}" opacity="${ctx.still ? 1 : 0}">${ctx.a(move('0 0;0 0;0 9', '3s', ` keyTimes="0;0.3;1" begin="${b}"`) + loop('opacity', '0;1;1;0', '3s', ` keyTimes="0;0.3;0.8;1" begin="${b}"`))}</ellipse>`;
  }
  function falling(ctx, seed, n, colors, x0, x1, y0, drop, dur) {
    if (ctx.still) return '';
    const r = rng(seed);
    return Array.from({ length: n }, () => {
      const x = f(x0 + r() * (x1 - x0)), y = f(y0 + r() * 10), b = ` begin="-${f(r() * dur)}s"`, c = colors[Math.floor(r() * colors.length)];
      return `<rect x="${x}" y="${y}" width="1.4" height="1.4" fill="${c}" opacity="0">${move(`0 0;${f((r() - 0.5) * 6)} ${drop}`, dur + 's', b)}${spin('0;180', dur + 's', b)}${loop('opacity', '0;1;1;0', dur + 's', ' keyTimes="0;0.1;0.8;1"' + b)}</rect>`;
    }).join('');
  }
  T.register({
    id: 'h-9', rank: '9', suit: 'heart', title: 'Somebody Cries',
    pair: ['Kalyana mantapa wedding', 'City Hall wedding'],
    sentence: ['Nine hundred guests or two witnesses,', "somebody's mother cries."],
    why: 'Nine hundred guests or two. Either way, somebody packed the tissues.',
    mechanism: 'Two couples, back to back across the seam. One tear falls in each city, right on cue.',
    sound: 'Nadaswaram, a thavil, a hushed crowd, a clerk\'s stamp, one big sniffle.',
    draw(ctx) {
      const p = ctx.id;
      const marigolds = (x, len, b) => `<g>${ctx.a(easeSpin(`0 ${x} 30;2 ${x} 30;0 ${x} 30;-2 ${x} 30;0 ${x} 30`, '6s', ` begin="${b}"`))}${Array.from({ length: Math.floor(len / 3) }, (_, i) => `<circle cx="${x}" cy="${32 + i * 3}" r="1.6" fill="${i % 4 === 3 ? INK.red : INK.yellow}" stroke="${k}" stroke-width="0.2"/>`).join('')}</g>`;
      const swag = (xa, xb, y, dip) => { let s = ''; for (let i = 0; i <= 12; i++) { const t = i / 12; s += `<circle cx="${f(xa + (xb - xa) * t)}" cy="${f(y + Math.sin(t * Math.PI) * dip)}" r="1.7" fill="${i % 3 ? INK.yellow : INK.red}" stroke="${k}" stroke-width="0.2"/>`; } return s; };
      const banana = (x, flip) => `<g transform="translate(${x} 0) scale(${flip} 1)">
          <path d="M-3,167 V64 M3,167 V64" stroke="${k}" stroke-width="0.4"/><rect x="-3" y="64" width="6" height="103" fill="${INK.green}"/><path d="M-1,70 V160 M1.4,70 V160" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
          <path d="M0,66 C10,50 22,48 30,52 C22,58 12,60 0,66 Z M0,66 C-4,48 2,32 10,26 C10,40 6,54 0,66 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
          <path d="M0,66 C18,52 22,50 30,52 M0,66 C4,48 8,34 10,26" fill="none" stroke="${k}" stroke-width="0.3"/>
          <path d="M3,74 q8,4 6,14 q-6,-2 -6,-14 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/>
          <path d="M-3.4,120 H3.4 M-3.4,123 H3.4" stroke="${INK.paper}" stroke-width="0.8"/>
        </g>`;
      let crowd = '';
      for (let row = 0; row < 2; row++) for (let x = 40 + row * 4; x < 212; x += 8.4) {
        const y = 160 + row * 6, c = (Math.floor(x) + row) % 3 === 0 ? INK.kaapi : k;
        crowd += `<path d="M${f(x - 4)},${y + 8} Q${f(x - 4)},${y + 1} ${f(x)},${y + 1} Q${f(x + 4)},${y + 1} ${f(x + 4)},${y + 8} Z" fill="${row ? k : INK.red}" fill-opacity="${row ? 0.85 : 0.6}"/><circle cx="${f(x)}" cy="${y - 2}" r="3" fill="${c}"/>`;
      }
      const top = `
        ${bg(INK.red, 0.14)}
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.12"/>
        <rect x="38" y="20" width="174" height="128" fill="${INK.red}" opacity="0.18"/>
        ${[56, 62, 68, 182, 188, 194].map((x, i) => marigolds(x, i % 2 ? 72 : 90, `-${i * 0.7}s`)).join('')}
        ${swag(40, 84, 32, 8)}${swag(84, 166, 32, 10)}${swag(166, 210, 32, 8)}
        <rect x="86" y="146" width="78" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M86,148.6 H164" stroke="${INK.red}" stroke-width="0.8"/>
        ${[94, 156].map((x) => `<rect x="${x - 3}" y="78" width="6" height="68" fill="${INK.yellow}" stroke="${k}" stroke-width="0.45"/><path d="M${x - 3},90 h6 M${x - 3},110 h6 M${x - 3},130 h6" stroke="${INK.red}" stroke-width="1.6"/>`).join('')}
        <path d="M86,80 Q125,46 164,80 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
        <path d="M94,76 Q125,52 156,76" fill="none" stroke="${INK.yellow}" stroke-width="1.2"/>
        <path d="M121,58 h8 l-1,-4 q-3,-5 -6,0 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        ${swag(88, 162, 80, 6)}
        ${person(116, 146, k, { s: 2.2, dress: INK.red, extra: `<path d="M-1.4,-12.6 L2.6,-1 M1.6,-12.6 L-2,-5" stroke="${INK.green}" stroke-width="0.7"/><path d="M-2,-12.4 Q0,-8 2,-12.4" fill="none" stroke="${INK.paper}" stroke-width="0.9"/><circle cx="-1.8" cy="-16.4" r="1.1" fill="${k}"/><path d="M-3.2,-16.6 q-1,0 -0.4,1" stroke="${INK.paper}" stroke-width="0.4"/>` })}
        ${person(134, 146, k, { s: 2.2, shirt: INK.paper, legs: INK.paper, dir: -1, extra: `<path d="M-1.3,-13 V-6.6 M1.3,-13 V-6.6" stroke="${k}" stroke-width="0.25"/><path d="M-2,-12.4 Q0,-8 2,-12.4" fill="none" stroke="${INK.yellow}" stroke-width="0.9"/><path d="M-2.4,-16.4 Q0,-19.4 2.4,-16.4 L2.2,-15.4 H-2.2 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.2"/>` })}
        ${person(70, 148, k, { s: 2.1, shirt: INK.paper, legs: INK.paper, extra: `<path d="M0.6,-14.6 L6,-7 L8,-8.6 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.25"/><path d="M0.6,-12 L3,-11" stroke="${k}" stroke-width="1"/>` })}
        ${person(184, 148, k, { s: 2.1, dir: -1, dress: INK.pink, arms: `<path d="M0,-12 L2,-11 L1.6,-14.4" fill="none" stroke="${INK.pink}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`, extra: `<path d="M-1.6,-12.6 L1,-0.4" stroke="${INK.green}" stroke-width="0.8"/>` })}
        ${tear(ctx, 182, 117, '0s')}
        ${banana(44, 1)}${banana(206, -1)}
        ${falling(ctx, 9, 14, [INK.yellow, INK.paper], 104, 146, 70, 70, 3)}
        ${crowd}`;

      const steps = Array.from({ length: 5 }, (_, i) => `<rect x="${42 - i * 1}" y="${f(128 + i * 7.8)}" width="${166 + i * 2}" height="7.8" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><rect x="${42 - i}" y="${f(128 + i * 7.8)}" width="${166 + i * 2}" height="7.8" fill="${k}" opacity="${0.04 + i * 0.03}"/>`).join('');
      const bottom = `
        ${bg(INK.blue, 0.14)}
        <path d="M44,52 L125,34 L206,52 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M58,49 L125,38 L192,49 Z" fill="none" stroke="${k}" stroke-width="0.3"/>
        <rect x="40" y="52" width="170" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M40,56 H210" stroke="${k}" stroke-width="0.3"/>
        <rect x="40" y="60" width="170" height="64" fill="${k}" opacity="0.2"/>
        <rect x="111" y="74" width="28" height="50" fill="${k}" opacity="0.65"/><path d="M111,74 A14,10 0 0 1 139,74 Z" fill="${INK.yellow}" opacity="0.7"/>
        ${[52, 74, 96, 154, 176, 198].map((x) => `<rect x="${x - 4}" y="60" width="8" height="64" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/><path d="M${x - 1.4},62 V122 M${x + 1.4},62 V122" stroke="${k}" stroke-width="0.25"/><rect x="${x - 5.4}" y="60" width="10.8" height="2.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/>`).join('')}
        <rect x="40" y="124" width="170" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        ${steps}
        ${person(118, 151.4, k, { s: 2.2, dress: INK.paper, extra: `<path d="M-1.5,-12.8 Q0,-13.4 1.5,-12.8 L3.3,0 L-3.3,0 Z" fill="none" stroke="${k}" stroke-width="0.3"/><g transform="translate(3 -8)"><circle r="1.4" fill="${INK.pink}"/><circle cx="1.2" cy="0.8" r="1.2" fill="${INK.red}"/><path d="M0,1 L0.6,4" stroke="${INK.green}" stroke-width="0.5"/></g>`, arms: `<path d="M0,-12 L2.6,-8.4" stroke="${k}" stroke-width="0.5"/>` })}
        ${person(132, 151.4, k, { s: 2.2, dir: -1, shirt: k, extra: `<path d="M-0.5,-12.2 L0,-9 L0.5,-12.2" stroke="${INK.paper}" stroke-width="0.4" fill="none"/>` })}
        ${person(88, 159.2, k, { s: 2.1, shirt: INK.green, arms: `<path d="M0,-12 L3,-12.6 L4,-15" fill="none" stroke="${INK.green}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.2" y="-17.4" width="2.2" height="3.2" fill="${k}"/>` })}
        <circle cx="96.4" cy="124" r="5" fill="${INK.paper}" opacity="${ctx.still ? 0 : 0}">${ctx.a(loop('opacity', '0;0;0.95;0;0', '6s', ' keyTimes="0;0.5;0.52;0.6;1"'))}</circle>
        ${person(162, 159.2, k, { s: 2.1, dir: -1, dress: INK.blue, arms: `<path d="M0,-12 L2,-11 L1.6,-14.4" fill="none" stroke="${INK.blue}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>` })}
        ${tear(ctx, 160, 127.6, '-1.5s')}
        ${falling(ctx, 21, 16, [INK.pink, INK.yellow, INK.red, INK.paper], 96, 156, 90, 64, 4)}`;

      return {
        top: { city: 'blr', caption: 'CHAMARAJPET', clause: 'Nine hundred guests or two witnesses,', art: top },
        bottom: { city: 'nyc', caption: 'CITY HALL', clause: "somebody's mother cries.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 10 of Hearts: PG Life. Paying-guest room x railroad apartment, 11 PM.
  // One bathroom door at the seam, a queue on both sides of it.
  // ======================================================================
  function bathDoor(ctx, fill) {
    return `<rect x="106" y="70" width="38" height="84" fill="${k}" opacity="0.85"/>
      <rect x="109" y="73" width="32" height="79" fill="${fill}" stroke="${k}" stroke-width="0.6"/>
      <rect x="113" y="78" width="24" height="30" fill="none" stroke="${k}" stroke-width="0.45"/><rect x="113" y="114" width="24" height="32" fill="none" stroke="${k}" stroke-width="0.45"/>
      <circle cx="136" cy="112" r="1.3" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/>
      <rect x="109" y="151" width="32" height="1.8" fill="${INK.yellow}">${ctx.a(easeLoop('opacity', '1;0.6;1', '3s'))}</rect>
      <path d="M106,152.8 L100,167 H150 L144,152.8 Z" fill="${INK.yellow}" opacity="0.18"/>
      <rect x="118" y="62" width="14" height="6" fill="${k}" opacity="0.7"/><path d="M120,63 v4 M123,63 v4 M126,63 v4 M129,63 v4" stroke="${INK.paper}" stroke-width="0.5"/>
      ${wisps(ctx, 125, 61, 22, { color: INK.paper, sw: 1.8, dur: 4, count: 3, spread: 3, op: 0.7 })}`;
  }
  function waiting(ctx, x, extra, shirt) {
    return `<g transform="translate(${x} 166)"><g>${ctx.a(holdMove('0 0;0 0;-1.4 0;0 0;0 0', '4s', '0;0.5;0.6;0.7;1'))}
      ${person(0, 0, k, { s: 2.2, shirt, extra })}</g></g>`;
  }
  T.register({
    id: 'h-10', rank: '10', suit: 'heart', title: 'PG Life',
    pair: ['Paying-guest room', 'Railroad apartment'],
    sentence: ['Too many people, one bathroom,', 'best years of your life.'],
    why: 'Three cots, one bathroom, no privacy. You would move back in tomorrow.',
    mechanism: 'One bathroom door on the seam, a queue on each side. The light under it never goes out.',
    sound: 'A tube light humming, a knock, running water, someone singing badly.',
    draw(ctx) {
      const p = ctx.id;
      const cot = (x, y, w, sheet) => `<path d="M${x + 1},${y + 6} V${y + 20} M${x + w - 1},${y + 6} V${y + 20}" stroke="${k}" stroke-width="1"/>
        <rect x="${x}" y="${y + 5}" width="${w}" height="2" fill="${k}"/>
        <rect x="${x}" y="${y}" width="${w}" height="5" rx="1" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="${x}" y="${y}" width="${w}" height="5" rx="1" fill="${sheet}" opacity="0.45"/>`;
      const lump = (x, y, w, c) => `<path d="M${x},${y} Q${x + 2},${y - 6} ${x + w * 0.4},${y - 5} Q${x + w * 0.7},${y - 7} ${x + w},${y} Z" fill="${c}" stroke="${k}" stroke-width="0.45">${ctx.a(easeLoop('d', `M${x},${y} Q${x + 2},${y - 6} ${x + w * 0.4},${y - 5} Q${x + w * 0.7},${y - 7} ${x + w},${y} Z;M${x},${y} Q${x + 2},${y - 7} ${x + w * 0.4},${y - 6} Q${x + w * 0.7},${y - 8} ${x + w},${y} Z;M${x},${y} Q${x + 2},${y - 6} ${x + w * 0.4},${y - 5} Q${x + w * 0.7},${y - 7} ${x + w},${y} Z`, '4s'))}</path><circle cx="${x + w - 3}" cy="${y - 3}" r="2.4" fill="${k}"/>`;
      const tube = `<rect x="48" y="33" width="36" height="3" rx="1.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <rect x="44" y="29" width="44" height="12" rx="6" fill="${INK.paper}" opacity="0.2">${ctx.a(loop('opacity', '0.2;0.2;0.02;0.2;0.05;0.2;0.2', '12s', ' keyTimes="0;0.6;0.61;0.62;0.63;0.64;1"'))}</rect>`;

      const top = `
        ${bg(INK.green, 0.24)}
        <rect width="${W}" height="${H}" fill="${k}" opacity="0.12"/>
        <rect x="38" y="152" width="174" height="15" fill="${INK.red}" opacity="0.35"/>
        <path d="M38,152 H212 M60,152 L56,167 M90,152 L88,167 M160,152 L162,167 M190,152 L194,167" stroke="${k}" stroke-width="0.35"/>
        ${tube}
        <path d="M38,44 Q125,54 212,44" fill="none" stroke="${k}" stroke-width="0.35"/>
        <g stroke="${k}" stroke-width="0.35"><rect x="62" y="46.4" width="8" height="14" fill="${INK.blue}"/><rect x="74" y="47.6" width="12" height="9" fill="${INK.yellow}"/><rect x="162" y="48" width="10" height="16" fill="${INK.paper}"/><rect x="178" y="46.6" width="8" height="10" fill="${INK.pink}"/></g>
        ${barWin(164, 72, 34, 26, { n: 6, fill: k, op: 0.7 })}
        <circle cx="190" cy="80" r="2.6" fill="${INK.paper}" opacity="0.8"/>
        ${bathDoor(ctx, INK.blue)}
        ${cot(40, 140, 54, INK.pink)}
        ${seated(56, 140, k, { s: 2, leg: 6, shirt: INK.yellow, arms: `<path d="M0.2,-6 L3,-3 L5,-3" fill="none" stroke="${INK.yellow}" stroke-width="1.1" stroke-linecap="round"/>` })}
        <path d="M64,140 L72,140 L74,132 L66,132 Z" fill="${k}"/><path d="M66,132 L74,132" stroke="${INK.blue}" stroke-width="0.8"/>
        <ellipse cx="68" cy="130" rx="8" ry="5" fill="${INK.blue}" opacity="0.25">${ctx.a(easeLoop('opacity', '0.25;0.12;0.25', '2s'))}</ellipse>
        <path d="M157,100 V162 M209,100 V162" stroke="${k}" stroke-width="1.2"/>
        ${cot(156, 104, 54, INK.blue).replace(/V\d+(\.\d+)? M/, 'V110 M')}
        ${cot(156, 140, 54, INK.green)}
        ${lump(162, 140, 44, INK.blue)}
        ${lump(162, 104, 44, INK.red)}
        <path d="M203,110 V140 M209,110 V140 M203,118 h6 M203,126 h6 M203,134 h6" stroke="${k}" stroke-width="0.5"/>
        ${waiting(ctx, 96, `<path d="M-1.6,-12.8 L-2.4,-4" stroke="${INK.paper}" stroke-width="1.6"/><path d="M1.4,-8 L3.6,-8 L3.4,-4.6 L1.6,-4.6 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.2"/>`, INK.red)}
        <g transform="translate(150 167)"><path d="M-5,0 L-6,-9 H6 L5,0 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.45"/><path d="M-6,-9 Q0,-15 6,-9" fill="none" stroke="${k}" stroke-width="0.4"/></g>`;

      let lights = '';
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, x = 40 + t * 170, y = 30 + Math.sin(t * Math.PI * 2) * 3 + 6 * Math.sin(t * Math.PI);
        lights += `<circle cx="${f(x)}" cy="${f(y + 2.4)}" r="1.5" fill="${INK.yellow}">${ctx.a(easeLoop('opacity', '1;0.3;1', '2s', ` begin="-${f((i % 4) * 0.5)}s"`))}</circle>`;
      }
      const bottom = `
        ${bg(INK.pink, 0.16)}
        <rect width="${W}" height="${H}" fill="${k}" opacity="0.1"/>
        <rect x="38" y="20" width="58" height="132" fill="${INK.red}" opacity="0.28"/><rect x="38" y="20" width="58" height="132" fill="url(#${p}-brick)"/>
        <rect x="38" y="152" width="174" height="15" fill="${INK.kaapi}" opacity="0.45"/>
        <path d="M38,152 H212 M38,159 H212 M70,152 v7 M120,159 v8 M170,152 v7 M200,159 v8" stroke="${k}" stroke-width="0.35"/>
        <path d="M40,30 Q82,40 125,32 Q168,24 210,36" fill="none" stroke="${k}" stroke-width="0.35"/>
        ${lights}
        <rect x="46" y="72" width="40" height="80" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <rect x="52" y="84" width="28" height="68" fill="${k}" opacity="0.45"/>
        <rect x="57" y="94" width="18" height="58" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="61" y="102" width="10" height="50" fill="${INK.yellow}" opacity="0.7"/>
        ${bathDoor(ctx, INK.paper)}
        <g transform="translate(178 84)" fill="none" stroke="${k}">
          <circle cx="-14" cy="0" r="9" stroke-width="1.2"/><circle cx="14" cy="0" r="9" stroke-width="1.2"/>
          <path d="M-14,0 L-4,-12 H8 L14,0 M-4,-12 L2,0 L8,-12 M2,0 H-14" stroke="${INK.red}" stroke-width="1"/>
          <path d="M-6,-14 h5 M8,-12 l2,-4 h4" stroke-width="0.9"/>
          <path d="M0,-20 V-12" stroke-width="0.5"/>
        </g>
        <rect x="160" y="116" width="40" height="22" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 9 }, (_, i) => `M${164 + i * 4.2},116 V138`).join(' ')}" stroke="${k}" stroke-width="0.6"/>
        ${wisps(ctx, 196, 114, 12, { color: INK.paper, sw: 1.4, dur: 3, count: 2, spread: 1.6, op: 0.6 })}
        <rect x="152" y="156" width="56" height="7" rx="2" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        ${lump(158, 157, 46, INK.green)}
        ${waiting(ctx, 96, `<path d="M0.6,-12 L2.6,-12 L3.6,-14.2" fill="none" stroke="${INK.blue}" stroke-width="1"/><path d="M3.6,-14.4 L3,-16.6" stroke="${INK.paper}" stroke-width="0.7"/><path d="M-1.6,-12.8 L-2.4,-4" stroke="${INK.yellow}" stroke-width="1.6"/>`, INK.blue)}`;

      return {
        top: { city: 'blr', caption: 'KORAMANGALA', clause: 'Too many people, one bathroom,', art: top },
        bottom: { city: 'nyc', caption: 'BUSHWICK', clause: 'best years of your life.', art: bottom }
      };
    }
  });

  // ======================================================================
  // J of Hearts: The Istri Cart. Ironing cart x wash-and-fold.
  // One work table at the seam; the same stack of shirts on both.
  // ======================================================================
  function shirtStack(x, y, colors) {
    return colors.map((c, i) => {
      const yy = y - (i + 1) * 4.2;
      return `<rect x="${x}" y="${f(yy)}" width="18" height="4.2" rx="0.8" fill="${c}" stroke="${k}" stroke-width="0.35"/><path d="M${x + 7},${f(yy + 0.6)} l2,1.6 l2,-1.6" fill="none" stroke="${k}" stroke-width="0.3"/>`;
    }).join('');
  }
  T.register({
    id: 'h-j', rank: 'J', suit: 'heart', title: 'The Istri Cart',
    pair: ['Istriwala', 'Wash-and-fold'],
    sentence: ['Knows every shirt', 'on the street.'],
    why: 'He has pressed your shirts for ten years. He knew about the interview first.',
    mechanism: 'One table, one stack of shirts. A charcoal iron slides above, a shirt gets folded below.',
    sound: 'A damp shirt hissing, charcoal crackle, dryers thumping, quarters dropping.',
    draw(ctx) {
      const p = ctx.id;
      const stack = shirtStack(138, 140, [INK.blue, INK.paper, INK.pink, INK.green, INK.paper, INK.yellow]);
      const embers = ctx.still ? '' : [0, 1, 2, 3].map((i) => `<circle cx="${102 + i * 4}" cy="126" r="0.6" fill="${INK.red}" opacity="0">${move(`0 0;${i % 2 ? 2 : -2} -14`, '1.5s', ` begin="-${f(i * 0.37)}s"`)}${loop('opacity', '0;1;0', '1.5s', ` begin="-${f(i * 0.37)}s"`)}</circle>`).join('');
      const iron = `<g>${ctx.a(easeMove('0 0;12 0;0 0', '2s'))}
          <path d="M96,138.6 L98,128 H116 L121,138.6 Z" fill="${k}"/>
          <path d="M98,133 H118" stroke="${INK.paper}" stroke-width="0.3" opacity="0.5"/>
          ${[101, 105, 109, 113].map((x) => `<circle cx="${x}" cy="131" r="0.9" fill="${INK.red}">${ctx.a(easeLoop('opacity', '1;0.4;1', '1s', ` begin="-${f((x - 101) / 16)}s"`))}</circle>`).join('')}
          <path d="M100,128 V122 H114 V128" fill="none" stroke="${INK.kaapi}" stroke-width="1.8"/>
          <path d="M116,128 l3,-3 l1,2" fill="none" stroke="${k}" stroke-width="0.7"/>
          ${embers}
        </g>
        <path d="M121,127 L109,122.6" fill="none" stroke="${k}" stroke-width="1.8" stroke-linecap="round">${ctx.a(easeLoop('d', 'M121,127 L109,122.6;M121,127 L121,122.6;M121,127 L109,122.6', '2s'))}</path>`;

      const top = `
        ${bg(INK.yellow, 0.16)}
        <path d="${scallop(80, 40, 78, 26, 22, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(80, 40, 78, 26, 22, 5)}" fill="url(#${p}-leaf)"/>
        <path d="M58,167 C60,120 56,90 52,64 M56,96 C64,84 76,76 90,70" fill="none" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="150" y="112" width="62" height="55" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="150" y="112" width="62" height="55" fill="${INK.yellow}" opacity="0.3"/>
        <rect x="148" y="109" width="66" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <path d="${scallop(178, 104, 30, 9, 14, 3)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.4"/>
        <path d="${scallop(204, 118, 10, 14, 8, 3)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.4"/>
        <path d="${scallop(178, 104, 30, 9, 14, 3)}" fill="url(#${p}-leaf)"/>
        ${fallingLeaf(ctx, 170, 110, 54, INK.pink, '6s', '0s')}${fallingLeaf(ctx, 196, 120, 44, INK.pink, '6s', '-3s')}
        <path d="M86,140 V84 M166,140 V84" stroke="${INK.kaapi}" stroke-width="1.3"/>
        <path d="M78,82 L174,82 L170,90 Q125,96 82,90 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
        ${person(122, 167, k, { s: 3.4, shirt: INK.paper, arms: '', extra: `<path d="M-1.4,-12.6 V-6.6 M1.4,-12.6 V-6.6" stroke="${k}" stroke-width="0.2"/>` })}
        <rect x="82" y="140" width="88" height="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <rect x="88" y="138.6" width="46" height="1.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/>
        <path d="M100,138.4 h18 l2,-1.2 h-22 Z" fill="${INK.blue}" opacity="0.8"/>
        <rect x="86" y="144" width="80" height="12" fill="${INK.kaapi}" fill-opacity="0.6" stroke="${k}" stroke-width="0.5"/>
        <path d="M86,148 H166 M86,152 H166" stroke="${k}" stroke-width="0.3"/>
        ${[100, 152].map((x) => `<g transform="translate(${x} 160)"><circle r="7" fill="none" stroke="${k}" stroke-width="1.4"/><path d="M-7,0 H7 M0,-7 V7 M-5,-5 L5,5 M5,-5 L-5,5" stroke="${k}" stroke-width="0.5"/><circle r="1.3" fill="${k}"/></g>`).join('')}
        ${iron}
        ${wisps(ctx, 110, 120, 24, { dur: 3, count: 3, spread: 3, op: 0.5 })}
        ${stack}
        <g transform="translate(60 148)"><path d="M-6,0 h12 l-1,10 h-10 Z" fill="${k}" fill-opacity="0.75"/><circle cx="-2" cy="-1" r="1.2" fill="${INK.red}"/><circle cx="2" cy="-0.6" r="1" fill="${INK.red}"/></g>
        ${wisps(ctx, 60, 146, 14, { dur: 4, count: 2, spread: 2, op: 0.4 })}`;

      const washer = (x, b) => `<g transform="translate(${x} 0)">
          <rect x="0" y="78" width="30" height="40" rx="1.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <rect x="2" y="80" width="26" height="6" fill="${k}" opacity="0.15"/><circle cx="23" cy="83" r="1.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/><rect x="5" y="82" width="8" height="2.4" fill="${INK.red}" opacity="0.7"/>
          <circle cx="15" cy="102" r="11" fill="${k}" opacity="0.8"/><circle cx="15" cy="102" r="8.6" fill="${INK.blue}" opacity="0.45"/>
          <g>${ctx.a(spin('0 15 102;360 15 102', '1.5s', ` begin="${b}"`))}<path d="M10,104 q3,-6 8,-4 q-2,4 -8,4 Z" fill="${INK.red}" opacity="0.8"/><path d="M14,96 q4,2 4,6 q-4,-1 -4,-6 Z" fill="${INK.yellow}" opacity="0.8"/><path d="M12,106 q4,2 8,0" stroke="${INK.paper}" stroke-width="1" fill="none"/></g>
          <circle cx="15" cy="102" r="11" fill="none" stroke="${INK.paper}" stroke-width="1"/>
        </g>`;
      const folding = `<g transform="translate(118 138)"><g>${ctx.a(`<animateTransform attributeName="transform" type="scale" values="1 1;1 0.35;1 1;1 1" dur="2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.4;0.8;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0 0 1 1"/>`)}
          <path d="M-8,-12 L-3,-14 Q0,-12 3,-14 L8,-12 L10,-7 L6,-6 L6,0 H-6 L-6,-6 L-10,-7 Z" fill="${INK.pink}" stroke="${k}" stroke-width="0.4"/></g></g>`;
      const bottom = `
        ${bg(INK.blue, 0.1)}
        <rect x="38" y="20" width="174" height="56" fill="${INK.paper}"/>
        <rect x="38" y="20" width="174" height="56" fill="${INK.yellow}" opacity="0.18"/>
        <rect x="58" y="40" width="72" height="14" fill="${k}"/>
        <text x="94" y="50.4" text-anchor="middle" font-family="${FONT.sans}" font-size="7.6" font-weight="700" letter-spacing="1.2" fill="none" stroke="${INK.pink}" stroke-width="0.7">WASH &amp; FOLD${ctx.a(loop('opacity', '1;1;0.25;1;1', '12s', ' keyTimes="0;0.3;0.31;0.33;1"'))}</text>
        <rect x="160" y="38" width="36" height="22" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M164,44 h20 M164,48 h26 M164,52 h16" stroke="${k}" stroke-width="0.6" opacity="0.5"/>
        <rect x="38" y="76" width="174" height="91" fill="${k}" opacity="0.08"/>
        ${washer(40, '0s')}${washer(74, '-0.3s')}${washer(142, '-0.7s')}${washer(176, '-1.1s')}
        <rect x="108" y="78" width="30" height="40" fill="${k}" opacity="0.15"/>
        ${person(118, 167, k, { s: 3.4, shirt: INK.green, arms: `<path d="M0,-12 L2.4,-10 M0,-12 L-2.4,-10" stroke="${INK.green}" stroke-width="1.1" stroke-linecap="round"/>` })}
        ${folding}
        <rect x="82" y="140" width="88" height="3.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M86,143 V167 M166,143 V167" stroke="${k}" stroke-width="1.2"/>
        <rect x="86" y="128" width="12" height="12" rx="1" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/><rect x="88" y="124" width="8" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/>
        ${stack}
        <g transform="translate(196 167)"><path d="M-12,-20 H12 L10,-6 H-10 Z" fill="none" stroke="${k}" stroke-width="0.6"/><path d="M-8,-20 L-7,-6 M-3,-20 V-6 M2,-20 V-6 M7,-20 L6,-6" stroke="${k}" stroke-width="0.3"/><path d="M-9,-20 q4,-6 9,-2 q5,-5 9,2 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/><path d="M-10,-6 V-2 M10,-6 V-2" stroke="${k}" stroke-width="0.6"/><circle cx="-10" cy="-1.4" r="1.4" fill="${k}"/><circle cx="10" cy="-1.4" r="1.4" fill="${k}"/></g>`;

      return {
        top: { city: 'blr', caption: 'INDIRANAGAR', clause: 'Knows every shirt', art: top },
        bottom: { city: 'nyc', caption: 'WILLIAMSBURG', clause: 'on the street.', art: bottom }
      };
    }
  });

  // ======================================================================
  // Q of Hearts: Belongs to Everyone. Street dog x bodega cat.
  // ======================================================================
  T.register({
    id: 'h-q', rank: 'Q', suit: 'heart', title: 'Belongs to Everyone',
    pair: ['The lane\'s street dog', 'The bodega cat'],
    sentence: ['Owned by no one.', 'Answers to everyone.'],
    why: 'Twelve households feed her. She has four names. She answers to all of them.',
    mechanism: 'A dog sits up outside, a cat sleeps on the bread. Both on duty at the seam.',
    sound: 'A tail thumping, a biscuit packet, a purr, the bodega door bell.',
    draw(ctx) {
      const p = ctx.id;
      const dog = `<g transform="translate(118 167) scale(1.55)">
          <g>${ctx.a(easeSpin('0 -12 -3;-26 -12 -3;0 -12 -3;-18 -12 -3;0 -12 -3', '1.2s'))}<path d="M-12,-3 C-18,-4 -22,-9 -21,-15" fill="none" stroke="${INK.kaapi}" stroke-width="2.2" stroke-linecap="round"/><path d="M-12,-3 C-18,-4 -22,-9 -21,-15" fill="none" stroke="${k}" stroke-width="0.3"/></g>
          <path d="M-12,0 C-16,-6 -15,-14 -9,-17 C-5,-19 -1,-24 1,-28 L3,-31 C5,-34 8,-35 11,-34.6 L17,-31.6 Q18.6,-30 16.4,-29 L10.6,-28 C8.6,-24 9,-20 8.6,-16 L8.6,-1 L11.4,0 L5.4,0 L5.2,-12 Q1,-9 -0.6,-4 L3,0 Z" fill="${INK.kaapi}" fill-opacity="0.6" stroke="${k}" stroke-width="0.45" stroke-linejoin="round"/>
          <path d="M8.4,-24 C5,-22 5,-16 6,-12 L8.6,-12 Z" fill="${INK.paper}"/>
          <g>${ctx.a(easeSpin('0 5 -33;0 5 -33;-14 5 -33;0 5 -33;0 5 -33', '3s'))}<path d="M4,-33 L5,-39.6 L8.4,-34.6 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4" stroke-linejoin="round"/></g>
          <circle cx="16.8" cy="-30.4" r="0.9" fill="${k}"/>
          <path d="M2.4,-29 L9.8,-26.4" stroke="${k}" stroke-width="2.4"/><path d="M2.4,-29 L9.8,-26.4" stroke="${INK.yellow}" stroke-width="1.4"/><path d="M3.4,-28.7 L9,-26.7" stroke="${INK.red}" stroke-width="0.35" stroke-dasharray="0.8 0.8"/>
        </g>`;
      const top = `
        ${bg(INK.yellow, 0.15)}
        <rect x="98" y="34" width="114" height="78" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="98" y="34" width="114" height="78" fill="${INK.yellow}" opacity="0.35"/>
        ${[44, 70].map((y) => `<rect x="106" y="${y}" width="98" height="16" fill="${INK.blue}" fill-opacity="0.28" stroke="${k}" stroke-width="0.4"/><rect x="102" y="${y + 14}" width="106" height="5" fill="none" stroke="${k}" stroke-width="0.6"/><path d="${Array.from({ length: 34 }, (_, i) => `M${104 + i * 3},${y + 14} v5`).join(' ')}" stroke="${k}" stroke-width="0.25"/>`).join('')}
        <path d="${scallop(56, 56, 30, 26, 14, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(56, 56, 30, 26, 14, 5)}" fill="url(#${p}-leaf)"/>
        <path d="M58,112 V80" stroke="${k}" stroke-width="2.4"/>
        <rect x="38" y="112" width="174" height="55" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="140" width="174" height="27" fill="${INK.red}" opacity="0.35"/>
        <rect x="36" y="109" width="178" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="46" y="118" width="40" height="49" fill="${k}" opacity="0.1"/>
        <path d="M46,118 H86 V167 M46,118 V167 ${Array.from({ length: 9 }, (_, i) => `M${50 + i * 4},118 V167`).join(' ')} M46,140 H86" fill="none" stroke="${k}" stroke-width="0.7"/>
        <text x="176" y="130" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" letter-spacing="1" fill="${INK.red}">NO PARKING</text>
        <g transform="translate(184 167)">
          <path d="M-18,-8 Q-16,-16 -4,-16 L6,-16 L10,-9 L-6,-8 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
          <path d="M7,-15 L12,-26 M9,-26 h7" stroke="${k}" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M8,-10 L15,-6 Q17,-12 12,-15 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/>
          <path d="M-16,-17 h12" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="-12" cy="-5" r="5" fill="${k}"/><circle cx="-12" cy="-5" r="1.8" fill="${INK.paper}"/><circle cx="13" cy="-5" r="5" fill="${k}"/><circle cx="13" cy="-5" r="1.8" fill="${INK.paper}"/>
        </g>
        ${person(80, 167, k, { s: 2.1, dress: INK.green, arms: `<path d="M0,-12 L3.4,-9.4 L5.6,-9" fill="none" stroke="${INK.green}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`, extra: `<rect x="5.2" y="-10" width="2.2" height="1.4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.15"/><path d="M-1.4,-12.6 L2.4,-0.4" stroke="${INK.red}" stroke-width="0.7"/>` })}
        ${dog}
        <g transform="translate(150 167)"><path d="M-6,0 L-7,-3.4 H7 L6,0 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/><ellipse cy="-3.4" rx="7" ry="1.1" fill="${INK.blue}" fill-opacity="0.4" stroke="${k}" stroke-width="0.4"/></g>
        <g transform="translate(164 167)"><path d="M-5,0 L-6,-2.6 H6 L5,0 Z" fill="${INK.red}" fill-opacity="0.6" stroke="${k}" stroke-width="0.4"/><circle cx="-2" cy="-3.2" r="1.3" fill="${INK.yellow}" stroke="${k}" stroke-width="0.2"/><circle cx="1.4" cy="-3" r="1.3" fill="${INK.yellow}" stroke="${k}" stroke-width="0.2"/></g>
        <g transform="translate(150 109)">${perch(k)}${ctx.a(holdMove('0 0;0 0;4 -3;8 0;8 0;8 0;4 -3;0 0', '6s', '0;0.25;0.32;0.4;0.6;0.75;0.82;1'))}</g>`;

      const cat = `<g transform="translate(125 128)">
          <ellipse cx="0" cy="-6" rx="13" ry="6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5">${ctx.a(easeLoop('ry', '6;6.7;6', '3s'))}</ellipse>
          <path d="M-8,-10 q2,3 0,7 M-3,-11.4 q2,4 0,9 M2,-11.6 q2,4 0,9" fill="none" stroke="${INK.kaapi}" stroke-width="0.9"/>
          <g>${ctx.a(easeSpin('0 -12 -3;0 -12 -3;-10 -12 -3;0 -12 -3', '4s'))}<path d="M-12,-3 Q-12,1 -2,0.6 Q6,0.4 9,-1" fill="none" stroke="${k}" stroke-width="3.6" stroke-linecap="round"/><path d="M-12,-3 Q-12,1 -2,0.6 Q6,0.4 9,-1" fill="none" stroke="${INK.yellow}" stroke-width="2.6" stroke-linecap="round"/></g>
          <circle cx="9" cy="-6" r="4.6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
          <path d="M6,-9.4 L6.6,-13 L9,-10.4 Z M10,-10.6 L12.6,-13 L12.6,-9 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4" stroke-linejoin="round"/>
          <path d="M8,-5.6 q1,0.8 2,0 M11,-5.6 q1,0.8 2,0" fill="none" stroke="${k}" stroke-width="0.4"/>
          <path d="M7.4,-8.4 q1.6,-0.6 3,0" stroke="${INK.kaapi}" stroke-width="0.6" fill="none"/>
        </g>`;
      const loaf = (x, band) => `<rect x="${x}" y="128" width="16" height="12" rx="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><rect x="${x}" y="131" width="16" height="4" fill="${band}" opacity="0.8"/><path d="M${x + 1},134 h14" stroke="${INK.paper}" stroke-width="0.4" stroke-dasharray="1 1"/>`;
      const bottom = `
        ${bg(INK.red, 0.08)}
        <rect x="38" y="20" width="174" height="110" fill="${INK.paper}"/>
        <rect x="38" y="20" width="174" height="110" fill="${INK.yellow}" opacity="0.15"/>
        ${[56, 80, 104].map((y, r) => `<path d="M38,${y} H212" stroke="${k}" stroke-width="0.8"/>${Array.from({ length: 21 }, (_, i) => `<rect x="${40 + i * 8.2}" y="${y - (i % 3 ? 9 : 12)}" width="6" height="${i % 3 ? 9 : 12}" fill="${[INK.red, INK.yellow, INK.blue, INK.green, INK.kaapi][(i + r * 2) % 5]}" opacity="0.6" stroke="${k}" stroke-width="0.25"/>`).join('')}`).join('')}
        <rect x="150" y="26" width="34" height="14" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
        <text x="167" y="36.4" text-anchor="middle" font-family="${FONT.sans}" font-size="8" font-weight="700" letter-spacing="1" fill="${INK.red}">LOTTO</text>
        <text x="72" y="38" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" letter-spacing="1" fill="none" stroke="${INK.pink}" stroke-width="0.7">COLD BEER${ctx.a(loop('opacity', '1;1;0.2;1;1', '12s', ' keyTimes="0;0.5;0.51;0.53;1"'))}</text>
        <rect x="60" y="114" width="20" height="12" fill="${k}" opacity="0.8"/><rect x="62" y="116" width="10" height="5" fill="${INK.green}" opacity="0.7"/>
        <rect x="56" y="140" width="138" height="27" fill="${INK.kaapi}" fill-opacity="0.5" stroke="${k}" stroke-width="0.5"/>
        <rect x="56" y="140" width="138" height="27" fill="url(#${p}-hatch)" opacity="0.25"/>
        <rect x="52" y="138" width="146" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="58" y="126" width="24" height="12" fill="${k}" opacity="0.85"/><rect x="60" y="128" width="12" height="4" fill="${INK.green}" opacity="0.8"/>
        ${loaf(104, INK.red)}${loaf(117, INK.blue)}${loaf(130, INK.yellow)}
        ${cat}
        ${paperCup(174, 128.4, 0, 0.4)}
        ${wisps(ctx, 174, 118, 14, { dur: 3, count: 2, spread: 1.4, op: 0.45 })}`;

      return {
        top: { city: 'blr', caption: 'BTM LAYOUT', clause: 'Owned by no one.', art: top },
        bottom: { city: 'nyc', caption: 'CROWN HEIGHTS', clause: 'Answers to everyone.', art: bottom }
      };
    }
  });

  // ======================================================================
  // K of Hearts: Knows Everything. Balcony aunty x building super.
  // ======================================================================
  T.register({
    id: 'h-k', rank: 'K', suit: 'heart', title: 'Knows Everything',
    pair: ['The balcony aunty', 'The building super'],
    sentence: ['Knows your business', 'better than your mother does.'],
    why: 'Your mother calls on Sundays. The aunty upstairs knew what you ate on Saturday.',
    mechanism: 'A balcony above, a basement door below. She watches the street. He holds the keys to it.',
    sound: 'Keys jangling, a grille creaking, a buzzer, a very loud hello.',
    draw(ctx) {
      const p = ctx.id;
      const walker = (dur, b, c) => ctx.still ? '' : `<g transform="translate(${CX} 167)">${move('-120 0;120 0', dur, ` begin="${b}"`)}${figure(ctx, { color: c })}</g>`;
      const grille = (x0, x1, y0, y1) => { let s = ''; for (let x = x0; x < x1; x += 8) s += `M${x},${y1} Q${x + 4},${y0 + 2} ${x + 8},${y1} M${x + 4},${y0} V${y1} `; return `<path d="${s}" fill="none" stroke="${k}" stroke-width="0.45"/>`; };
      const aunty = `<g>${ctx.a(easeSpin('0 125 118;0 125 118;-7 125 118;-7 125 118;6 125 118;6 125 118;0 125 118', '6s'))}
          ${person(125, 120, k, { s: 2.3, dress: INK.red, arms: `<path d="M0,-12 L-3,-8 L-5,-6.4 M0,-12 L3,-8 L5,-6.4" fill="none" stroke="${INK.red}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`, extra: `<path d="M-1.6,-12.6 L2.8,0" stroke="${INK.green}" stroke-width="1.1"/><circle cx="-1.8" cy="-16.4" r="1.2" fill="${k}"/><circle cx="1.4" cy="-17" r="0.5" fill="${INK.paper}"/>` })}</g>`;

      const top = `
        ${bg(INK.yellow, 0.15)}
        <path d="M30,44 Q90,60 150,46 T230,54 M30,52 Q100,66 160,52" fill="none" stroke="${k}" stroke-width="0.35"/>
        <path d="M48,167 V36 M42,42 H54" stroke="${k}" stroke-width="1.6"/>
        <rect x="42" y="60" width="12" height="10" rx="1.4" fill="${k}" opacity="0.7"/>
        <g>${ctx.a(easeMove('0 0;0 1.4;0 0', '4s'))}<path d="M48,44 Q70,58 96,52 M48,46 Q68,64 100,60 M48,48 C60,54 54,62 66,58" fill="none" stroke="${k}" stroke-width="0.35"/></g>
        <rect x="72" y="54" width="106" height="113" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="72" y="54" width="106" height="113" fill="${INK.green}" opacity="0.2"/>
        <rect x="68" y="52" width="114" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="78" y="70" width="94" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <rect x="80" y="78" width="16" height="24" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.45"/><rect x="154" y="78" width="16" height="24" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.45"/>
        <rect x="112" y="78" width="26" height="40" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        ${aunty}
        <rect x="84" y="102" width="82" height="16" fill="none" stroke="${k}" stroke-width="0.8"/>
        ${grille(84, 166, 102, 118)}
        <rect x="80" y="118" width="90" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M86,102 h-1" stroke="${k}"/>
        <g transform="translate(92 102)"><path d="M-4,0 L-3,-6 H3 L4,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.35"/><path d="M0,-6 q-5,-6 -2,-10 M0,-6 q4,-6 6,-8 M0,-6 V-14" stroke="${INK.green}" stroke-width="1.2" fill="none"/></g>
        <g transform="translate(160 102)"><path d="M-4,0 L-3,-6 H3 L4,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.35"/><circle cx="-1" cy="-8" r="2.4" fill="${INK.green}"/><circle cx="2" cy="-10" r="2" fill="${INK.green}"/></g>
        <rect x="80" y="130" width="22" height="22" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.45"/><path d="M84,130 v22 M88,130 v22 M92,130 v22 M96,130 v22 M80,141 h22" stroke="${k}" stroke-width="0.35"/>
        <rect x="112" y="128" width="26" height="39" fill="${INK.kaapi}" fill-opacity="0.6" stroke="${k}" stroke-width="0.5"/>
        <rect x="104" y="142" width="42" height="25" fill="none" stroke="${k}" stroke-width="0.7"/>
        <path d="${Array.from({ length: 10 }, (_, i) => `M${108 + i * 4},142 V167`).join(' ')} M104,150 H146" stroke="${k}" stroke-width="0.4"/>
        <rect x="150" y="136" width="10" height="8" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        ${walker('12s', '-2s', k)}`;

      const keys = `<g transform="translate(131 150)"><g>${ctx.a(easeSpin('0;14;0;-10;0', '1.5s'))}
          <circle cy="3" r="2.6" fill="none" stroke="${INK.yellow}" stroke-width="0.7"/>
          <path d="M-1.4,5 L-2.4,10 M0,5.6 V11 M1.4,5 L2.6,10 M-0.6,5.4 L-1,9.6" stroke="${INK.yellow}" stroke-width="0.7" stroke-linecap="round"/></g></g>`;
      const bottom = `
        ${bg(INK.blue, 0.1)}
        <rect x="38" y="20" width="174" height="147" fill="${INK.red}" opacity="0.35"/>
        <rect x="38" y="20" width="174" height="147" fill="url(#${p}-brick)"/>
        ${[[54, 36], [54, 78], [172, 36], [172, 78], [98, 36], [130, 36]].map(([x, y]) => `<rect x="${x}" y="${y}" width="22" height="28" fill="${INK.blue}" fill-opacity="0.3" stroke="${INK.paper}" stroke-width="1.2"/><path d="M${x},${y + 14} h22" stroke="${INK.paper}" stroke-width="0.8"/><rect x="${x - 2}" y="${y + 28}" width="26" height="2.6" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/>`).join('')}
        <path d="M58,78 h7 v14 h-7 Z" fill="${INK.paper}" opacity="0.8">${ctx.a(easeLoop('d', 'M58,78 h7 v14 h-7 Z;M58,78 h12 v14 h-12 Z;M58,78 h7 v14 h-7 Z', '6s'))}</path>
        <g fill="none" stroke="${k}" stroke-width="0.6"><path d="M166,66 H200 M166,108 H200 M166,66 V62 M200,66 V62 M166,108 V104 M200,108 V104"/><path d="M172,66 L194,108" stroke-width="0.45"/><path d="M168,64 H198 M168,106 H198" stroke-width="0.3"/></g>
        <rect x="96" y="80" width="58" height="36" fill="${INK.paper}" opacity="0.15"/>
        <rect x="100" y="102" width="50" height="10" fill="${k}"/>
        <text x="125" y="109.4" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" letter-spacing="1.6" fill="${INK.paper}">SUPER</text>
        <rect x="108" y="114" width="34" height="53" fill="${k}" opacity="0.8"/>
        <rect x="110" y="116" width="30" height="51" fill="${INK.yellow}" opacity="0.25"/>
        ${person(125, 167, k, { s: 2.4, shirt: INK.blue, legs: k, arms: `<path d="M0,-12 L-1.6,-7 M0,-12 L2.4,-7.4" stroke="${INK.blue}" stroke-width="1.2" stroke-linecap="round"/>` })}
        ${keys}
        <path d="M92,150 H106 M144,150 H158 M92,150 V167 M158,150 V167 M96,150 V167 M100,150 V167 M150,150 V167 M154,150 V167" stroke="${k}" stroke-width="0.8"/>
        <g transform="translate(76 167)"><rect x="-7" y="-18" width="14" height="18" fill="${k}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/><rect x="-8" y="-20" width="16" height="2.6" rx="1" fill="${k}" fill-opacity="0.55"/><path d="M-3,-15 V-3 M0,-15 V-3 M3,-15 V-3" stroke="${k}" stroke-width="0.35"/></g>
        <g transform="translate(174 167)"><path d="M-7,0 L-8,-11 H8 L7,0 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/><path d="M0,-11 L4,-34" stroke="${INK.kaapi}" stroke-width="1.2"/><path d="M-3,-11 q3,-5 7,0" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/></g>
        ${walker('12s', '-8s', k)}`;

      return {
        top: { city: 'blr', caption: 'RAJAJINAGAR', clause: 'Knows your business', art: top },
        bottom: { city: 'nyc', caption: 'THE BRONX', clause: 'better than your mother does.', art: bottom }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
