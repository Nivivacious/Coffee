// Hearts: Belonging. Regulars, rituals, people who know your order.
// The 2 (Morning Walk) and 3 (The Usual) live in cards.js.
(function (root) {
  'use strict';
  const T = root.TaleCards || require('../cards.js');
  const { INK, FONT } = T;
  const { W, H, CX, WIN, f, rng, scallop, loop, move, spin, easeLoop, easeMove, easeSpin,
    wisps, figure, bird, paperCup } = T.kit;
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
    mechanism: 'Two front steps meet at the seam. A stone katte flanks one door, a stoop climbs to the other.',
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
    sound: 'Shuffling feet, a ladle on copper, a bagel slicer, someone saving a spot.',
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
        <path d="M121.6,112 Q125,108.6 128.6,112" fill="none" stroke="${INK.paper}" stroke-width="0.9" stroke-dasharray="0.9 0.6"/>
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
        return `<g transform="translate(${x} ${y})"><g>${ctx.a(easeSpin('0 0 0;3 0 0;0 0 0;-2 0 0;0 0 0', '4s', ` begin="${b}"`))}
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
        <rect x="108" y="74" width="34" height="76" fill="${k}" fill-opacity="0.55" stroke="${k}" stroke-width="0.5"/>
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

  // @@MORE@@
})(typeof window !== 'undefined' ? window : globalThis);
