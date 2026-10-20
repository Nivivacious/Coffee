// Clubs: Streets. Commutes, corners, food and small daily annoyances.
// The 8 (The Ride Home) and 10 (Late on St Mark's) live in cards.js.
(function (root) {
  'use strict';
  const T = root.TaleCards || require('../cards.js');
  const { INK, FONT } = T;
  const { W, H, CX, f, rng, scallop, loop, move, easeLoop, easeMove, easeSpin,
    precip, figure, bird, wisps, wheel, autoRickshaw, yellowCab, paperCup } = T.kit;
  const k = INK.ink, P = INK.paper;
  const sky = (c, o) => `<rect width="${W}" height="${H}" fill="${c}" opacity="${o}"/>`;

  // ---------- shared bits ----------
  // A standing person, feet at (x, g). arms: absolute end points for the hands.
  function person(x, g, o) {
    o = Object.assign({ h: 30, c: k, arms: null, head: null }, o);
    const s = o.h / 30, hip = g - 13 * s, sh = g - 23.5 * s, hy = g - 27.4 * s;
    const arms = o.arms || [[x - 2.6 * s, hip + 1], [x + 2.6 * s, hip + 1]];
    return `<g stroke="${o.c}" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M${f(x - 2.6 * s)},${g} L${x},${f(hip)} L${f(x + 2.6 * s)},${g}" stroke-width="${f(1.8 * s)}"/>
      <path d="M${x},${f(hip)} V${f(sh)}" stroke-width="${f(4.4 * s)}"/>
      ${arms.map((a) => `<path d="M${x},${f(sh + 0.8 * s)} L${f(a[0])},${f(a[1])}" stroke-width="${f(1.5 * s)}"/>`).join('')}
      <circle cx="${x}" cy="${f(hy)}" r="${f(2.7 * s)}" fill="${o.head || o.c}" stroke="none"/>
      ${o.extra || ''}</g>`;
  }
  // Sound arcs opening to one side (dir = 1 right, -1 left), pulsing outward.
  function arcs(ctx, x, y, dir, o) {
    o = Object.assign({ c: k, n: 3, dur: 1.5, begin: 0, sw: 0.6, r0: 3, gap: 3, op: 0.8, keys: null }, o);
    let s = '';
    for (let i = 0; i < o.n; i++) {
      const r = o.r0 + i * o.gap, a = 0.75;
      const x1 = f(x + dir * r * Math.cos(a)), y1 = f(y - r * Math.sin(a)), y2 = f(y + r * Math.sin(a));
      const b = ` begin="${f(o.begin - (o.dur / o.n) * (o.n - 1 - i) * 0.4)}s"`;
      s += `<path d="M${x1},${y1} A${r},${r} 0 0 ${dir > 0 ? 1 : 0} ${x1},${y2}" opacity="${ctx.still ? o.op : 0}">${ctx.a(loop('opacity', o.keys || `0;${o.op};0`, o.dur + 's', b))}</path>`;
    }
    return `<g fill="none" stroke="${o.c}" stroke-width="${o.sw}" stroke-linecap="round">${s}</g>`;
  }
  // A honk: three short rays.
  function honk(ctx, x, y, dir, dur, begin, c) {
    const d = `M${x},${y} l${dir * 5},-4 M${x + dir},${y + 1.5} l${dir * 6},0 M${x},${y + 3} l${dir * 5},4`;
    return `<path d="${d}" stroke="${c || k}" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;1;1;0;0;1;0;0', dur, ` begin="${begin}" keyTimes="0;0.05;0.2;0.25;0.4;0.45;0.55;1"`))}</path>`;
  }
  // Small spinning wheel of any radius.
  function rim(ctx, x, y, r, dur, fill) {
    return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${fill || k}"/><circle r="${f(r * 0.45)}" fill="${P}"/>` +
      `<g><path d="M${f(-r * 0.45)},0 H${f(r * 0.45)} M0,${f(-r * 0.45)} V${f(r * 0.45)}" stroke="${k}" stroke-width="0.5"/>${ctx.a(T.kit.spin('0;360', dur))}</g></g>`;
  }
  // Scooter with rider, ground at 0, facing right, ~42 long.
  function scooter(ctx, body, rider) {
    return `<g>
      <ellipse cx="0" cy="0.4" rx="22" ry="1.2" fill="${k}" opacity="0.25"/>
      <path d="M-4,-20 L-1,-33" stroke="${rider}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M-4,-20 L6,-18 L7,-8" fill="none" stroke="${rider}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-1,-31 L11,-27" stroke="${rider}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M-2.6,-37.4 a3.4,3.4 0 0 1 6.8,0 Z" fill="${k}"/><circle cx="0.8" cy="-36.4" r="2.6" fill="${rider}"/>
      <path d="M-2.6,-37 a3.4,3.4 0 0 1 6.8,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.3"/>
      <path d="M-21,-5 C-22,-14 -16,-18 -8,-18 L3,-18 L3,-10 L-6,-7 L-6,-5 Z" fill="${body}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-6,-5 L11,-5 L11,-8 L-6,-8 Z" fill="${k}"/>
      <path d="M10,-5 L18,-5 Q20,-11 15,-27 L12,-27 L11.4,-11 Q10.6,-7 10,-5 Z" fill="${body}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-14,-19 L1,-19" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M12,-27 L9,-29.5 M14,-27 L16,-29" stroke="${k}" stroke-width="0.9" stroke-linecap="round"/>
      <circle cx="16.6" cy="-22" r="1.4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
      <rect x="-22.4" y="-12" width="2.2" height="2" fill="${INK.red}"/>
      ${rim(ctx, -14, -4.6, 4.6, '0.4s')}${rim(ctx, 14, -4.6, 4.6, '0.4s')}
    </g>`;
  }
  // A plain glow block that breathes.
  const breathe = (ctx, base, vals, dur, begin) => ctx.a(easeLoop('opacity', vals || `${base};${f(base * 0.4)};${base}`, dur || '3s', begin ? ` begin="${begin}"` : ''));

  // ======================================================================
  // A of Clubs: Shutters Up. Two shutters back to back across the seam,
  // both rolling up and away from the middle at dawn.
  // ======================================================================
  function rollShutter(ctx, x, y, w, h, id, fill, frac) {
    const open = 3, dy = h - open, h0 = ctx.still ? f(h * frac) : h;
    return `<defs><pattern id="${id}" width="6" height="2.6" patternUnits="userSpaceOnUse" y="${y}">
        <rect width="6" height="2.6" fill="${P}"/><rect width="6" height="2.6" fill="${fill}"/>
        <path d="M0,0.4 H6" stroke="${k}" stroke-width="0.45" opacity="0.75"/><path d="M0,1.4 H6" stroke="${P}" stroke-width="0.5" opacity="0.4"/></pattern></defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h0}" fill="url(#${id})" stroke="${k}" stroke-width="0.5">${ctx.a(easeLoop('height', `${h};${h};${open};${open};${open};${h}`, '12s'))}</rect>
      <g><rect x="${x - 1}" y="${f(y + h0 - 3)}" width="${w + 2}" height="3" fill="${k}"/>
        <path d="M${x + w / 2 - 4},${f(y + h0)} v2 h8 v-2" fill="none" stroke="${k}" stroke-width="0.8"/>
        ${ctx.a(easeMove(`0 0;0 0;0 ${-dy};0 ${-dy};0 ${-dy};0 0`, '12s'))}</g>`;
  }

  T.register({
    id: 'c-a', rank: 'A', suit: 'club', title: 'Shutters Up',
    pair: ['Rolling shutter', 'Bodega gate'],
    sentence: ['Every street starts', 'with a shutter going up.'],
    why: 'Before the buses, before the honking, one rattle of steel tells the street it can begin.',
    mechanism: 'Two shutters back to back across the seam. Both roll up and away from the middle.',
    sound: 'A crow, a long steel rattle, a broom, a gate, pigeons.',
    draw(ctx) {
      const p = ctx.id;
      const shelves = (x, y, w, seed, cols) => {
        const r = rng(seed); let s = '';
        for (let row = 0; row < 4; row++) {
          const yy = y + 12 + row * 17;
          s += `<path d="M${x},${yy} H${x + w}" stroke="${k}" stroke-width="0.6"/>`;
          for (let xx = x + 2; xx < x + w - 5;) {
            const ww = 3 + r() * 5, hh = 5 + r() * 7;
            s += `<rect x="${f(xx)}" y="${f(yy - hh)}" width="${f(ww)}" height="${f(hh)}" fill="${cols[Math.floor(r() * cols.length)]}" stroke="${k}" stroke-width="0.25"/>`;
            xx += ww + 1 + r() * 2;
          }
        }
        return s;
      };
      // Kolam: dots and an interlaced chain, drawn in rice flour on the wet step.
      let dots = '', chainA = 'M90,161', chainB = 'M90,161';
      for (let i = 0; i < 9; i++) {
        const x = 93 + i * 6;
        dots += `<circle cx="${x}" cy="161" r="0.55" fill="${P}"/>`;
        chainA += ` Q${x},${i % 2 ? 165.5 : 156.5} ${x + 3},161`;
        chainB += ` Q${x},${i % 2 ? 156.5 : 165.5} ${x + 3},161`;
      }
      const kolamAnim = ctx.a(loop('stroke-dashoffset', '100;0;0', '12s', ' keyTimes="0;0.5;1"') + loop('opacity', '1;1;0;0', '12s', ' keyTimes="0;0.9;0.98;1"'));
      const kolam = `<g fill="none" stroke="${P}" stroke-width="0.7" stroke-linecap="round">
          <path d="${chainA}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0">${kolamAnim}</path>
          <path d="${chainB}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0">${kolamAnim}</path>
          <path d="M87,161 q-3,-3 0,-5 M87,161 q-3,3 0,5 M147,161 q3,-3 0,-5 M147,161 q3,3 0,5" opacity="0.9"/>
        </g>${dots}`;

      const top = `
        ${sky(INK.pink, 0.2)}
        <rect width="${W}" height="70" fill="${INK.yellow}" opacity="0.18"/>
        <circle cx="62" cy="64" r="11" fill="${INK.yellow}"/>
        <circle cx="62" cy="64" r="16" fill="${INK.yellow}" opacity="0.25">${breathe(ctx, 0.25, '0.25;0.1;0.25', '6s')}</circle>
        <path d="M30,44 Q80,54 130,42 T230,46 M30,50 Q90,60 150,48 T230,54" fill="none" stroke="${k}" stroke-width="0.3"/>
        <g transform="translate(176 47)"><path d="M-3,0 q3,-3 6,0 l2,1 h-3 q-3,2 -6,0 Z" fill="${k}"/><path d="M-3,0 l-3,2" stroke="${k}" stroke-width="0.8"/>${ctx.a(easeMove('0 0;0 0;0 -1.4;0 0', '3s'))}</g>
        <rect x="38" y="80" width="36" height="76" fill="${INK.green}" opacity="0.4"/>
        <rect x="44" y="92" width="22" height="22" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <path d="M49.5,92 V114 M55,92 V114 M60.5,92 V114 M44,103 H66" stroke="${k}" stroke-width="0.5"/>
        <rect x="176" y="72" width="36" height="84" fill="${INK.yellow}" opacity="0.45"/>
        <path d="M176,72 H212 M176,86 H212" stroke="${k}" stroke-width="0.5"/>
        <rect x="184" y="98" width="20" height="30" rx="10" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/>
        <rect x="74" y="52" width="102" height="104" fill="${P}" stroke="${k}" stroke-width="0.6"/>
        <rect x="80" y="56" width="90" height="13" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <text x="125" y="65.6" text-anchor="middle" font-family="${FONT.sans}" font-size="6.6" font-weight="700" letter-spacing="1.2" fill="${P}">SRI RAMA STORES</text>
        <rect x="84" y="71" width="82" height="7" rx="1.5" fill="${k}"/>
        <rect x="86" y="78" width="78" height="78" fill="${INK.yellow}" opacity="0.6"/>
        ${shelves(86, 78, 78, 4, [INK.red, INK.green, INK.blue, P, INK.kaapi])}
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.4">${[96, 112, 128, 144, 158].map((x) => `<path d="M${x},78 v4 a2.5,2.5 0 0 0 5,0 v-4" opacity="0.9"/>`).join('')}</g>
        ${rollShutter(ctx, 86, 78, 78, 78, `${p}-rib-t`, INK.blue + '" fill-opacity="0.35', 0.45)}
        <rect x="70" y="156" width="110" height="11" fill="${INK.kaapi}" opacity="0.55"/>
        <path d="M70,156 H180" stroke="${k}" stroke-width="0.6"/>
        ${kolam}
        <g transform="translate(160 167)">
          <path d="M-5,0 L-7,-6 L0,-8 M-2,0 L-1,-6" fill="none" stroke="${INK.green}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M-3,-8 Q0,-18 6,-20" fill="none" stroke="${INK.green}" stroke-width="4.6" stroke-linecap="round"/>
          <circle cx="8" cy="-23" r="2.8" fill="${k}"/><circle cx="10.4" cy="-22" r="1.4" fill="${k}"/>
          <g><path d="M4,-18 L-6,-8" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/>${ctx.a(easeSpin('0 4 -18;-10 4 -18;0 4 -18;6 4 -18;0 4 -18', '2s'))}</g>
          <path d="M14,-1 a3.4,2 0 1 0 0.01,0 Z" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        </g>`;

      const bottom = `
        ${sky(INK.blue, 0.14)}
        <rect width="${W}" height="70" fill="${INK.pink}" opacity="0.2"/>
        <rect x="38" y="40" width="40" height="127" fill="${INK.red}" opacity="0.3"/>
        <rect x="38" y="40" width="40" height="127" fill="url(#${p}-brick)"/>
        <g fill="${P}" stroke="${k}" stroke-width="0.4"><rect x="46" y="52" width="9" height="13"/><rect x="62" y="52" width="9" height="13"/><rect x="46" y="80" width="9" height="13"/><rect x="62" y="80" width="9" height="13"/></g>
        <rect x="62" y="80" width="9" height="13" fill="${INK.yellow}" opacity="${ctx.still ? 1 : 0}">${ctx.a(easeLoop('opacity', '0;0;1;1;0', '12s'))}</rect>
        <g stroke="${k}" stroke-width="0.6" fill="none"><path d="M42,68 H76 M42,96 H76 M46,68 L70,96"/></g>
        <rect x="172" y="34" width="40" height="133" fill="${INK.kaapi}" opacity="0.4"/>
        <rect x="172" y="34" width="40" height="133" fill="url(#${p}-hatch)" opacity="0.25"/>
        <g fill="${P}" stroke="${k}" stroke-width="0.4"><rect x="180" y="46" width="10" height="14"/><rect x="196" y="46" width="10" height="14"/></g>
        <rect x="78" y="52" width="94" height="104" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
        <path d="M74,58 H176 L170,72 H80 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <path d="M80,72 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0 q4,3 8,0" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
        <rect x="84" y="76" width="82" height="6" rx="1.4" fill="${k}"/>
        <rect x="86" y="82" width="78" height="74" fill="${INK.yellow}" opacity="0.65"/>
        ${shelves(86, 80, 78, 9, [INK.red, INK.blue, INK.pink, P, INK.green])}
        ${rollShutter(ctx, 86, 82, 78, 74, `${p}-rib-b`, k + '" fill-opacity="0.5', 0.45)}
        <rect x="70" y="156" width="110" height="11" fill="${k}" opacity="0.18"/>
        <path d="M38,156 H212" stroke="${k}" stroke-width="0.6"/>
        <g transform="translate(64 167)"><rect x="-8" y="-7" width="16" height="7" fill="${P}" stroke="${k}" stroke-width="0.4"/><path d="M-8,-3.5 H8 M0,-7 V0" stroke="${INK.red}" stroke-width="0.5"/></g>
        <g transform="translate(192 167)"><g>${ctx.a(easeSpin('0 0 0;0 0 0;24 0 0;0 0 0;0 0 0;24 0 0;0 0 0', '3s'))}
          <path d="M-5,-2 Q-6,-8 0,-8 Q4,-8 5,-5 L8,-4 L5,-3 Q3,0 -3,0 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/><circle cx="3" cy="-6.6" r="0.5" fill="${P}"/></g>
          <path d="M-1,0 V2 M1,0 V2" stroke="${k}" stroke-width="0.4"/></g>
        ${ctx.still ? '' : `<g transform="translate(0 44)">${move('260 0;-20 -8', '6s')}<g>${bird(ctx, k, '0.4s', 1.1)}</g><g transform="translate(10 4)">${bird(ctx, k, '0.5s', 0.9)}</g></g>`}`;

      return {
        top: { city: 'blr', caption: 'GANDHI BAZAAR', clause: 'Every street starts', art: top },
        bottom: { city: 'nyc', caption: 'SUNSET PARK', clause: 'with a shutter going up.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 2 of Clubs: First Delivery. Milk bag on the gate x bread crates on the
  // sidewalk, both left at the middle of the card while you slept.
  // ======================================================================
  function bicycle(ctx, c) {
    return `<g>
      ${rim(ctx, -13, -8, 8, '0.6s', 'none" stroke="' + k + '" stroke-width="1.1')}${rim(ctx, 13, -8, 8, '0.6s', 'none" stroke="' + k + '" stroke-width="1.1')}
      <path d="M-13,-8 L-4,-20 L9,-20 L13,-8 M-4,-20 L1,-8 L9,-20 M1,-8 L-13,-8 M9,-20 L8,-25 L5,-25 M-4,-20 L-5,-23" fill="none" stroke="${k}" stroke-width="0.9" stroke-linejoin="round"/>
      <path d="M-8,-23 h5" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="-24" y="-26" width="13" height="9" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
      <path d="M-24,-23 H-11 M-20,-26 V-17 M-15.5,-26 V-17" stroke="${P}" stroke-width="0.4"/>
      <path d="M-5,-24 L-2,-38" stroke="${c}" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M-5,-24 L2,-17 L1,-10" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M-2,-36 L7,-26" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="-1.4" cy="-41.6" r="2.7" fill="${c}"/>
    </g>`;
  }

  T.register({
    id: 'c-2', rank: '2', suit: 'club', title: 'First Delivery',
    pair: ['Nandini milk packets', 'Bread crates'],
    sentence: ["Somebody's up before you,", "making sure you're fed."],
    why: 'You\'ve never met whoever brings your milk. They know your gate better than you do.',
    mechanism: 'Milk bag on the gate, bread on the sidewalk. Both dead centre, both already there.',
    sound: 'A cycle bell, a gate clink, the El overhead, a pigeon.',
    draw(ctx) {
      const p = ctx.id;
      const bx = ctx.still ? 190 : 125;
      const cyclist = `<g transform="translate(${bx} 167)">${ctx.a(move('-180 0;180 0', '12s', ' begin="-4s"'))}<g transform="scale(-1 1)">${bicycle(ctx, INK.kaapi)}</g></g>`;
      const gateBars = Array.from({ length: 11 }, (_, i) => `M${100 + i * 5},124 V167`).join(' ');
      const packet = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M-5,-4 Q0,-5.4 5,-4 Q5.8,0 5,4 Q0,5.4 -5,4 Q-5.8,0 -5,-4 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/><rect x="-4.4" y="-1.3" width="8.8" height="2.6" fill="${P}"/><text y="0.8" text-anchor="middle" font-family="${FONT.sans}" font-size="2.1" font-weight="700" fill="${INK.blue}">NANDINI</text></g>`;
      const top = `
        ${sky(INK.pink, 0.16)}
        <rect width="${W}" height="84" fill="${INK.yellow}" opacity="0.14"/>
        <circle cx="190" cy="74" r="10" fill="${INK.yellow}"/>
        <path d="M54,62 L125,44 L196,62 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <path d="M54,62 L125,44 L196,62 Z" fill="url(#${p}-brick)"/>
        <rect x="60" y="62" width="130" height="66" fill="${INK.kaapi}" opacity="0.28"/>
        <path d="M60,62 H190" stroke="${k}" stroke-width="1"/>
        <rect x="72" y="74" width="24" height="30" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/>
        <path d="M76,74 V104 M80,74 V104 M84,74 V104 M88,74 V104 M92,74 V104 M72,89 H96" stroke="${k}" stroke-width="0.45"/>
        <rect x="154" y="74" width="24" height="30" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/>
        <path d="M158,74 V104 M162,74 V104 M166,74 V104 M170,74 V104 M174,74 V104 M154,89 H178" stroke="${k}" stroke-width="0.45"/>
        <rect x="113" y="76" width="24" height="52" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <path d="M125,76 V128 M115,80 h8 v20 h-8 Z M127,80 h8 v20 h-8 Z" fill="none" stroke="${k}" stroke-width="0.4"/>
        <path d="M110,76 H140" stroke="${INK.green}" stroke-width="2"/>
        <g fill="${INK.green}">${[112, 117, 122, 127, 132, 137].map((x) => `<path d="M${x},77 q-1,2.6 0,4.6 q1,-2 0,-4.6 Z"/>`).join('')}</g>
        <rect x="38" y="128" width="58" height="39" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <rect x="154" y="128" width="58" height="39" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="128" width="58" height="39" fill="url(#${p}-hatch)" opacity="0.18"/>
        <rect x="154" y="128" width="58" height="39" fill="url(#${p}-hatch)" opacity="0.18"/>
        <path d="M36,128 H96 M154,128 H214" stroke="${k}" stroke-width="1.4"/>
        <rect x="92" y="116" width="7" height="51" fill="${P}" stroke="${k}" stroke-width="0.5"/><rect x="151" y="116" width="7" height="51" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <path d="M91,116 h9 M150,116 h9" stroke="${k}" stroke-width="1.4"/>
        <g transform="translate(58 128)"><g>${ctx.a(easeMove('0 0;0 0;6 0;6 0;0 0', '6s'))}<path d="M-4,0 q0,-5 4,-5 l3,-1 l-1,2 q2,3 -1,4 Z" fill="${k}"/><path d="M-4,-2 l-4,1" stroke="${k}" stroke-width="1"/></g></g>
        <path d="${gateBars}" stroke="${k}" stroke-width="0.8"/>
        <path d="M99,126 H151 M99,146 H151 M99,164 H151" stroke="${k}" stroke-width="1.1"/>
        <path d="M99,126 Q112,118 125,122 Q138,118 151,126" fill="none" stroke="${k}" stroke-width="0.8"/>
        <g>${ctx.a(easeSpin('0 125 126;5 125 126;0 125 126;-4 125 126;0 125 126', '4s'))}
          <path d="M125,126 v3" stroke="${k}" stroke-width="0.8"/>
          <path d="M118,138 Q118,128 125,129 Q132,128 132,138" fill="none" stroke="${INK.red}" stroke-width="1.2"/>
          ${packet(121, 137, -12)}${packet(129.5, 136.6, 14)}
          <path d="M114,138 H136 L134,158 Q125,160 116,158 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
          <path d="M115,143 H135 M115.6,150 H134.4" stroke="${P}" stroke-width="0.8" opacity="0.8"/>
        </g>
        <g transform="translate(144 165)"><rect x="-6" y="-2" width="12" height="3.4" rx="1.7" fill="${P}" stroke="${k}" stroke-width="0.4"/><path d="M-2,-2 v3.4 M2,-2 v3.4" stroke="${INK.red}" stroke-width="0.5"/></g>
        ${cyclist}`;

      const tray = (y, loaves) => `<g transform="translate(125 ${y})">
          <rect x="-22" y="-9" width="44" height="9" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
          <g fill="${P}" opacity="0.8">${[-18, -12, -6, 0, 6, 12].map((x) => `<rect x="${x}" y="-6" width="4" height="3" rx="0.6"/>`).join('')}</g>
          ${loaves ? `<g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4">${[-15, -5, 5, 15].map((x, i) => `<path d="M${x - 5},-8.6 Q${x - 5},-14 ${x},-14 Q${x + 5},-14 ${x + 5},-8.6 Z" ${i % 2 ? `fill="${INK.yellow}"` : ''}/>`).join('')}</g>
            <path d="M-15,-12 l2,-1 M-5,-12 l2,-1 M5,-12 l2,-1 M15,-12 l2,-1" stroke="${P}" stroke-width="0.4"/>` : ''}
        </g>`;
      const train = ctx.still ? `<g transform="translate(70 0)">` : `<g>${move('-180 0;180 0', '6s')}`;
      const bottom = `
        ${sky(INK.blue, 0.14)}
        <rect width="${W}" height="70" fill="${INK.yellow}" opacity="0.14"/>
        ${train}<g fill="${P}" stroke="${k}" stroke-width="0.5">${[0, 1, 2].map((i) => `<rect x="${-60 + i * 62}" y="40" width="60" height="14" rx="2"/>`).join('')}</g>
          <g fill="${INK.yellow}">${[0, 1, 2].map((i) => [6, 18, 30, 42].map((x) => `<rect x="${-60 + i * 62 + x}" y="43" width="8" height="5"/>`).join('')).join('')}</g>
          <path d="M-60,50 H124" stroke="${INK.red}" stroke-width="0.8"/></g>
        <rect x="30" y="54" width="190" height="6" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="M30,60 H220 M30,66 H220" stroke="${k}" stroke-width="0.7"/>
        <path d="${Array.from({ length: 32 }, (_, i) => `M${30 + i * 6},60 L${33 + i * 6},66 L${36 + i * 6},60`).join(' ')}" fill="none" stroke="${k}" stroke-width="0.45"/>
        <path d="M46,66 V167 M204,66 V167" stroke="${INK.green}" stroke-width="4"/>
        <path d="M46,66 V167 M204,66 V167" stroke="${k}" stroke-width="0.4" stroke-dasharray="1 4"/>
        <rect x="64" y="72" width="122" height="95" fill="${k}" opacity="0.82"/>
        <path d="M60,72 H190 L184,82 H66 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <defs><pattern id="${p}-gate" width="6" height="2.6" patternUnits="userSpaceOnUse"><rect width="6" height="2.6" fill="${P}" opacity="0.5"/><path d="M0,0.4 H6" stroke="${k}" stroke-width="0.5"/></pattern></defs>
        <rect x="74" y="84" width="102" height="72" fill="url(#${p}-gate)" stroke="${k}" stroke-width="0.5"/>
        <rect x="64" y="156" width="122" height="11" fill="${P}" opacity="0.5"/>
        <path d="M38,156 H212" stroke="${k}" stroke-width="0.5"/>
        ${tray(167, false)}${tray(158, false)}${tray(149, true)}
        <g transform="translate(176 167)"><rect x="-1.6" y="-26" width="3.2" height="26" fill="${k}"/><circle cx="0" cy="-29" r="3.4" fill="${INK.yellow}" opacity="${ctx.still ? 0.4 : 0.9}">${ctx.a(easeLoop('opacity', '0.9;0.9;0;0;0.9', '12s'))}</circle></g>
        <g transform="translate(88 167)"><g>${ctx.a(easeSpin('0 0 0;0 0 0;28 0 0;0 0 0;28 0 0;0 0 0', '2s'))}
          <path d="M-5,-2 Q-6,-8 0,-8 Q4,-8 5,-5 L8,-4 L5,-3 Q3,0 -3,0 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/><circle cx="3" cy="-6.6" r="0.5" fill="${P}"/></g>
          <path d="M-1,0 V2 M1,0 V2" stroke="${k}" stroke-width="0.4"/></g>
        <circle cx="96" cy="166" r="0.7" fill="${INK.kaapi}"/><circle cx="99" cy="165.6" r="0.6" fill="${INK.kaapi}"/>`;

      return {
        top: { city: 'blr', caption: 'BASAVANAGUDI', clause: "Somebody's up before you,", art: top },
        bottom: { city: 'nyc', caption: 'ASTORIA', clause: "making sure you're fed.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 3 of Clubs: School Run. The school auto x the yellow school bus,
  // nose to tail across the seam, both idling loudly.
  // ======================================================================
  T.register({
    id: 'c-3', rank: '3', suit: 'club', title: 'School Run',
    pair: ['School auto', 'School bus'],
    sentence: ['The loudest vehicle on the street', 'is the one taking kids to school.'],
    why: 'Eight kids, eight bags, one horn. Every school run sounds like a small parade.',
    mechanism: 'Auto and bus back to back. Bags swing off one, red lights flash on the other.',
    sound: 'Kids shrieking, a two-stroke putter, a horn, a bus door hiss.',
    draw(ctx) {
      const p = ctx.id;
      const kids = [[-24, -28, INK.red], [-17, -31, INK.blue], [-10, -28, INK.green], [-3, -31, INK.pink], [-20, -22, INK.yellow]];
      const kidHeads = kids.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${INK.kaapi}" stroke="${P}" stroke-width="0.35"/><path d="M${x - 3},${y + 2.4} q3,-1.6 6,0 v3 h-6 Z" fill="${c}"/>`).join('');
      const bag = (x, y, c, r) => `<g transform="translate(${x} ${y})"><g>${ctx.a(easeSpin(`0 0 0;${r} 0 0;0 0 0;${-r} 0 0;0 0 0`, '1.2s'))}
          <path d="M-2,0 V3 M2,0 V3" stroke="${k}" stroke-width="0.6"/><rect x="-4" y="3" width="8" height="10" rx="1.6" fill="${c}" stroke="${k}" stroke-width="0.5"/><rect x="-2.6" y="8" width="5.2" height="3.6" rx="0.8" fill="none" stroke="${k}" stroke-width="0.4"/></g></g>`;
      const autoOverlay = `${kidHeads}
        <path d="M-31,-36 h-8" stroke="${k}" stroke-width="0.8"/>
        ${bag(-38, -44, INK.red, 8)}${bag(-31, -45, INK.blue, -6)}${bag(-44, -38, INK.green, 10)}
        <g transform="translate(-6 -28)"><g><path d="M0,0 L5,-9" stroke="${INK.kaapi}" stroke-width="1.4" stroke-linecap="round"/><circle cx="5.2" cy="-9.6" r="1.2" fill="${INK.kaapi}"/>${ctx.a(easeSpin('0 0 0;-30 0 0;0 0 0;-30 0 0;0 0 0', '1.2s'))}</g></g>`;
      const top = `
        ${sky(INK.yellow, 0.16)}
        <path d="${scallop(66, 54, 40, 18, 14, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(66, 54, 40, 18, 14, 5)}" fill="url(#${p}-leaf)"/>
        <path d="M64,120 C64,90 62,76 58,66 M63,84 C70,74 80,70 90,66" fill="none" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>
        <g transform="translate(176 60)"><path d="M-22,0 H22 V14 H-22 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
          <text y="9.4" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" letter-spacing="0.8" fill="${P}">HIGH SCHOOL</text>
          <path d="M-16,14 V60 M16,14 V60" stroke="${k}" stroke-width="1.2"/></g>
        <rect x="38" y="118" width="174" height="49" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="118" width="174" height="5" fill="${INK.red}"/>
        <rect x="38" y="152" width="174" height="15" fill="${INK.yellow}" opacity="0.5"/>
        <g font-family="${FONT.display}" font-size="9" fill="${INK.blue}" opacity="0.6">
          <text x="44" y="140">A</text><text x="56" y="142">B</text><text x="68" y="139">C</text></g>
        <path d="M38,152 H212" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(125 167) scale(1.32)">${autoRickshaw({ still: false, a: (m) => ctx.a(m) })}${autoOverlay}</g>
        ${honk(ctx, 180, 132, 1, '3s', '0s')}
        ${arcs(ctx, 180, 133, 1, { n: 3, dur: 3, keys: '0;0.8;0;0', r0: 9, gap: 4 })}`;

      const busKids = [-50, -38, -26, -14, -2, 10].map((x, i) => `<circle cx="${x + 5}" cy="-40" r="2.4" fill="${[INK.kaapi, k, INK.kaapi, INK.red, k, INK.kaapi][i]}"/><path d="M${x + 2},-36 q3,-2 6,0" fill="${[INK.red, INK.blue, INK.green, INK.pink, INK.yellow, INK.blue][i]}"/>`).join('');
      const flash = (x, b) => `<circle cx="${x}" cy="-55.6" r="1.8" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/><circle cx="${x}" cy="-55.6" r="4" fill="${INK.red}" opacity="${ctx.still ? 0.4 : 0}">${ctx.a(loop('opacity', '0.6;0.6;0;0', '1s', ` begin="${b}" keyTimes="0;0.45;0.5;1" calcMode="discrete"`))}</circle>`;
      const bus = `<g>
        <ellipse cx="0" cy="0.4" rx="64" ry="1.6" fill="${k}" opacity="0.25"/>
        <path d="M-62,-8 L-62,-52 Q-62,-55 -59,-55 L36,-55 Q40,-55 40,-51 L40,-30 L56,-28 Q62,-27 62,-20 L62,-8 Q62,-6 59,-6 L-60,-6 Q-62,-6 -62,-8 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
        <rect x="-60" y="-54" width="98" height="5" fill="${k}" opacity="0.9"/>
        <text x="-11" y="-50.2" text-anchor="middle" font-family="${FONT.sans}" font-size="4" font-weight="700" letter-spacing="1.4" fill="${INK.yellow}">SCHOOL BUS</text>
        <g fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5">${[-50, -38, -26, -14, -2, 10].map((x) => `<rect x="${x}" y="-47" width="10" height="11"/>`).join('')}</g>
        ${busKids}
        <rect x="24" y="-47" width="13" height="38" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/>
        <path d="M30.5,-47 V-9 M24,-28 H37" stroke="${k}" stroke-width="0.5"/>
        <path d="M-62,-31 H24 M-62,-23 H24 M-62,-15 H24 M37,-23 H62 M37,-15 H62" stroke="${k}" stroke-width="0.9"/>
        <path d="M54,-24 h6" stroke="${P}" stroke-width="1.4"/>
        <rect x="58" y="-21" width="4" height="5" fill="${k}" opacity="0.7"/>
        ${flash(-57, '0s')}${flash(33, '-0.5s')}
        <g transform="translate(20 -27)"><path d="M0,0 H-4" stroke="${k}" stroke-width="1"/>
          <path d="M-7.3,-5 L-12.7,-5 L-16,-1.7 L-16,1.7 L-12.7,5 L-7.3,5 L-4,1.7 L-4,-1.7 Z" fill="${INK.red}" stroke="${P}" stroke-width="0.6"/>
          <text x="-10" y="1.3" text-anchor="middle" font-family="${FONT.sans}" font-size="3.4" font-weight="700" fill="${P}">STOP</text>
          <circle cx="-10" cy="-5" r="1" fill="${INK.red}" stroke="${k}" stroke-width="0.3"/></g>
        ${wheel(ctx, -42, '0.5s')}${wheel(ctx, 44, '0.5s')}
      </g>`;
      const bottom = `
        ${sky(INK.blue, 0.12)}
        <rect x="132" y="98" width="74" height="32" fill="${INK.red}" opacity="0.3"/>
        <rect x="132" y="98" width="74" height="32" fill="url(#${p}-brick)"/>
        <rect x="132" y="74" width="74" height="24" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <path d="M132,74 H206 V130 H132 Z" fill="none" stroke="${k}" stroke-width="0.5"/>
        <path d="M140,74 V98 M154,74 V98 M184,74 V98 M198,74 V98 M140,86 L154,74 M140,86 L154,98 M184,74 L198,86 L184,98" fill="none" stroke="${INK.kaapi}" stroke-width="1.6"/>
        <path d="M128,76 L140,62 H198 L210,76 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <path d="M152,98 L169,48 L186,98 Z" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <path d="M169,52 V98 M161,74 H177 M161,74 L169,86 L177,74" fill="none" stroke="${INK.kaapi}" stroke-width="1.6"/>
        <path d="M147,98 L169,40 L191,98 L187,98 L169,49 L151,98 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"><rect x="138" y="106" width="10" height="14"/><rect x="190" y="106" width="10" height="14"/><rect x="164" y="104" width="10" height="26" fill="${INK.kaapi}"/></g>
        <path d="M143,106 V120 M195,106 V120 M138,113 H148 M190,113 H200" stroke="${k}" stroke-width="0.35"/>
        <path d="${scallop(70, 70, 34, 26, 14, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(70, 70, 34, 26, 14, 5)}" fill="url(#${p}-hatch)" opacity="0.4"/>
        <path d="M70,130 V90 M70,100 L60,88 M70,96 L82,86" stroke="${k}" stroke-width="2" fill="none"/>
        <rect x="38" y="130" width="174" height="37" fill="${k}" opacity="0.1"/>
        <path d="M38,130 H212" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,146 H212" stroke="${P}" stroke-width="1" stroke-dasharray="6 5" opacity="0.8"/>
        <g transform="translate(122 167)">${bus}</g>
        ${honk(ctx, 188, 136, 1, '3s', '-1.5s')}`;

      return {
        top: { city: 'blr', caption: 'JAYANAGAR', clause: 'The loudest vehicle on the street', art: top },
        bottom: { city: 'nyc', caption: 'FOREST HILLS', clause: 'is the one taking kids to school.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 4 of Clubs: Move Inside. Inside a packed BMTC bus x a packed subway
  // car. One grab pole runs through the seam; both crowds sway as one.
  // ======================================================================
  T.register({
    id: 'c-4', rank: '4', suit: 'club', title: 'Move Inside',
    pair: ['BMTC bus', 'Subway car'],
    sentence: ["There's always room", "if everyone's a little uncomfortable."],
    why: '"Swalpa adjust maadi" and "move in, folks" are the same prayer in two accents.',
    mechanism: 'One grab pole through the seam. Both crowds lean on the same curve, at the same moment.',
    sound: 'A conductor\'s whistle, coins, brakes, a door chime, sighing.',
    draw(ctx) {
      const p = ctx.id;
      const sway = (inner, x, g, i) => `<g>${ctx.a(easeSpin(`0 ${x} ${g};3 ${x} ${g};0 ${x} ${g};-2 ${x} ${g};0 ${x} ${g}`, '4s', ` begin="-${f(i * 0.06)}s"`))}${inner}</g>`;
      const crowd = (list, rail, g) => list.map(([x, c, hand, hh], i) => sway(person(x, g, { h: hh || 54, c, arms: hand === 0 ? null : [[x + hand, rail + 1], [x + 3, g - 24]] }), x, g, i)).join('');
      const scroll = (id, inner, dur) => `<clipPath id="${id}"><path d="M44,44 H206 V86 H44 Z"/></clipPath><g clip-path="url(#${id})"><g>${inner}${ctx.a(move('0 0;-174 0', dur))}</g></g>`;
      const pole = `<path d="M125,32 V167" stroke="${k}" stroke-width="2.6"/><path d="M124.4,32 V167" stroke="${P}" stroke-width="0.7" opacity="0.8"/>`;
      // Street seen through the windows, two copies wide so the scroll joins.
      let street = '';
      for (const off of [0, 174]) {
        street += `<g transform="translate(${off} 0)">
          <rect x="40" y="56" width="30" height="30" fill="${INK.red}" opacity="0.6"/><rect x="74" y="50" width="22" height="36" fill="${INK.green}" opacity="0.5"/>
          <path d="${scallop(118, 58, 16, 10, 10, 3)}" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/><path d="M118,66 V86" stroke="${k}" stroke-width="1.6"/>
          <rect x="140" y="60" width="34" height="26" fill="${INK.yellow}" opacity="0.7"/><rect x="142" y="62" width="30" height="6" fill="${INK.red}"/>
          <rect x="178" y="52" width="34" height="34" fill="${INK.blue}" opacity="0.4"/>
        </g>`;
      }
      const winFrames = (y1, y2) => `<g fill="none" stroke="${k}" stroke-width="0.7">${[44, 84, 125, 166].map((x, i) => `<path d="M${x},${y1} V${y2}"/>`).join('')}<path d="M44,${y1} H206 V${y2} H44 Z"/></g>`;
      const conductor = `<g>${ctx.a(easeSpin('0 140 160;3 140 160;0 140 160;-2 140 160;0 140 160', '4s'))}
          ${person(140, 160, { h: 56, c: INK.blue, arms: [[150, 108], [134, 128]] })}
          <path d="M136,114 L146,137" stroke="${INK.kaapi}" stroke-width="1"/><rect x="143" y="134" width="8" height="9" rx="1.2" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>
          <rect x="131" y="125" width="5" height="7" rx="0.8" fill="${k}"/><rect x="132" y="126" width="3" height="2" fill="${INK.yellow}"/>
          <g transform="translate(150 108)"><path d="M0,0 L4,-1.4 L4,1.4 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/></g>
          ${arcs(ctx, 146, 106, 1, { n: 2, dur: 2, r0: 3, gap: 3, keys: '0;0.8;0;0' })}</g>`;
      const top = `
        ${sky(INK.yellow, 0.14)}
        <rect x="38" y="20" width="174" height="20" fill="${INK.blue}" opacity="0.5"/>
        <rect x="38" y="40" width="174" height="50" fill="${P}"/>
        <rect x="44" y="44" width="162" height="42" fill="${INK.yellow}" opacity="0.35"/>
        ${scroll(`${p}-w-t`, street, '6s')}
        ${winFrames(44, 86)}
        <rect x="38" y="90" width="174" height="77" fill="${INK.blue}" opacity="0.4"/>
        <rect x="38" y="150" width="174" height="17" fill="${INK.kaapi}" opacity="0.45"/>
        <path d="M38,96 H212" stroke="${k}" stroke-width="1.6"/>
        ${[56, 82, 104, 170, 196].map((x) => `<path d="M${x},96 v6" stroke="${k}" stroke-width="0.6"/><circle cx="${x}" cy="104" r="2" fill="none" stroke="${k}" stroke-width="0.7"/>`).join('')}
        ${pole}
        ${crowd([[52, INK.red, 4], [74, INK.green, 8, 52], [97, k, 7], [114, INK.pink, 11, 50], [168, INK.kaapi, 2], [190, INK.green, 6, 53], [208, INK.red, -12]], 96, 160)}
        ${conductor}`;

      let tunnel = '';
      for (const off of [0, 174]) tunnel += `<g transform="translate(${off} 0)">${[48, 106, 164].map((x) => `<path d="M${x},64 h18" stroke="${INK.yellow}" stroke-width="1.6" stroke-linecap="round"/>`).join('')}<path d="M40,74 H214" stroke="${P}" stroke-width="0.3" opacity="0.4"/></g>`;
      const ads = [[44, 36, INK.pink], [84, 38, INK.yellow], [126, 36, INK.green], [166, 40, INK.blue]];
      const bottom = `
        ${sky(k, 0.08)}
        <rect x="38" y="20" width="174" height="22" fill="${P}"/>
        ${ads.map(([x, w, c]) => `<rect x="${x}" y="24" width="${w}" height="14" fill="${c}" opacity="0.7" stroke="${k}" stroke-width="0.4"/>`).join('')}
        <path d="M48,30 h14 M48,33 h10 M88,30 h20 M130,30 h16 M170,30 h22 M170,33 h12" stroke="${k}" stroke-width="0.8" opacity="0.7"/>
        <rect x="38" y="42" width="174" height="48" fill="${P}"/>
        <rect x="44" y="44" width="162" height="42" fill="${k}"/>
        ${scroll(`${p}-w-b`, tunnel, '1.5s')}
        ${winFrames(44, 86)}
        <rect x="38" y="90" width="174" height="77" fill="${k}" opacity="0.12"/>
        <rect x="38" y="138" width="174" height="12" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <rect x="38" y="150" width="174" height="17" fill="${k}" opacity="0.25"/>
        <path d="M38,96 H212" stroke="${k}" stroke-width="1.6"/>
        ${pole}
        ${crowd([[50, INK.blue, 6], [72, k, 9, 52], [94, INK.red, 8], [110, INK.green, 12, 50], [146, INK.kaapi, -8, 55], [166, INK.pink, 4, 51], [186, k, 8], [206, INK.yellow, -10, 52]], 96, 160)}
        <g transform="translate(190 120)"><rect x="-6" y="-4" width="12" height="8" rx="1" fill="${INK.red}"/><circle cx="0" cy="0" r="2" fill="${P}" opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;1;0;0', '3s', ' keyTimes="0;0.1;0.3;1"'))}</circle></g>`;

      return {
        top: { city: 'blr', caption: 'SHIVAJINAGAR', clause: "There's always room", art: top },
        bottom: { city: 'nyc', caption: '14TH STREET', clause: "if everyone's a little uncomfortable.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 5 of Clubs: Up on the Roof. A black Sintex tank x a wooden water tower,
  // the same squat cylinder standing on the same roofline across the seam.
  // ======================================================================
  function sintex(x, base, w, h) {
    const l = x - w / 2, r = x + w / 2, top = base - h;
    let ribs = '';
    for (let y = top + 6; y < base - 2; y += 4.4) ribs += `M${l + 0.6},${f(y)} Q${x},${f(y + 2.2)} ${r - 0.6},${f(y)} `;
    return `<g>
      <path d="M${l},${top + 3} Q${l - 1},${f(base - h / 2)} ${l + 1},${base} H${r - 1} Q${r + 1},${f(base - h / 2)} ${r},${top + 3} Z" fill="${k}"/>
      <path d="${ribs}" fill="none" stroke="${P}" stroke-width="0.45" opacity="0.4"/>
      <path d="M${l},${top + 3} Q${x},${f(top - h * 0.2)} ${r},${top + 3} Z" fill="${k}" stroke="${P}" stroke-width="0.4" stroke-opacity="0.5"/>
      <ellipse cx="${x}" cy="${f(top - h * 0.06)}" rx="${f(w * 0.17)}" ry="${f(w * 0.05)}" fill="${k}" stroke="${P}" stroke-width="0.4" stroke-opacity="0.6"/>
      <path d="M${f(l + w * 0.18)},${top + 8} V${base - 4}" stroke="${P}" stroke-width="${f(w * 0.05)}" opacity="0.18"/>
    </g>`;
  }
  function waterTower(x, base, s) {
    const bw = 21 * s, bt = base - 18 * s, tt = bt - 46 * s;
    let staves = '';
    for (let xx = x - bw + 4 * s; xx < x + bw; xx += 4 * s) staves += `M${f(xx)},${f(tt)} V${f(bt)} `;
    return `<g>
      <path d="M${f(x - bw * 0.8)},${base} L${f(x - bw * 0.7)},${f(bt)} M${f(x + bw * 0.8)},${base} L${f(x + bw * 0.7)},${f(bt)} M${f(x - bw * 0.25)},${base} V${f(bt)} M${f(x + bw * 0.25)},${base} V${f(bt)}" stroke="${k}" stroke-width="${f(1.4 * s)}"/>
      <path d="M${f(x - bw * 0.78)},${base} L${f(x + bw * 0.25)},${f(bt)} M${f(x + bw * 0.78)},${base} L${f(x - bw * 0.25)},${f(bt)} M${f(x - bw * 0.8)},${f(base - 9 * s)} H${f(x + bw * 0.8)}" stroke="${k}" stroke-width="${f(0.5 * s)}"/>
      <rect x="${f(x - bw - 2 * s)}" y="${f(bt)}" width="${f(bw * 2 + 4 * s)}" height="${f(2 * s)}" fill="${k}"/>
      <path d="M${f(x - bw)},${f(bt)} L${f(x - bw + 1 * s)},${f(tt)} H${f(x + bw - 1 * s)} L${f(x + bw)},${f(bt)} Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
      <path d="${staves}" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
      <path d="M${f(x - bw)},${f(bt - 8 * s)} H${f(x + bw)} M${f(x - bw + 0.3 * s)},${f(bt - 20 * s)} H${f(x + bw - 0.3 * s)} M${f(x - bw + 0.6 * s)},${f(bt - 32 * s)} H${f(x + bw - 0.6 * s)} M${f(x - bw + 0.9 * s)},${f(bt - 42 * s)} H${f(x + bw - 0.9 * s)}" stroke="${k}" stroke-width="${f(0.9 * s)}"/>
      <path d="M${f(x - bw - 3 * s)},${f(tt + 1)} L${x},${f(tt - 22 * s)} L${f(x + bw + 3 * s)},${f(tt + 1)} Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
      <path d="M${f(x - bw - 3 * s)},${f(tt + 1)} L${x},${f(tt - 22 * s)} L${f(x - 4 * s)},${f(tt + 1)} Z" fill="${k}" opacity="0.35"/>
      <circle cx="${x}" cy="${f(tt - 23.5 * s)}" r="${f(1.6 * s)}" fill="${k}"/>
    </g>`;
  }

  T.register({
    id: 'c-5', rank: '5', suit: 'club', title: 'Up on the Roof',
    pair: ['Sintex tank', 'Water tower'],
    sentence: ['Every house keeps a little worry', 'upstairs, just in case.'],
    why: 'Nobody looks up. Everybody has checked, at least once, whether the tank is overflowing.',
    mechanism: 'Black plastic tank, wooden water tower. Same squat barrel, same roofline, same slow drip.',
    sound: 'A motor humming, water overflowing, a crow, pigeons, wind.',
    draw(ctx) {
      const p = ctx.id;
      const drip = (x, y, len, dur, n) => ctx.still ? `<ellipse cx="${x}" cy="${y + len * 0.5}" rx="0.8" ry="1.4" fill="${INK.blue}"/>` :
        Array.from({ length: n }, (_, i) => `<ellipse cx="${x}" cy="${y}" rx="0.8" ry="1.4" fill="${INK.blue}" opacity="0">${move(`0 0;0 ${len}`, dur, ` begin="-${f(i * parseFloat(dur) / n)}s"`)}${loop('opacity', '0;1;1;0', dur, ` begin="-${f(i * parseFloat(dur) / n)}s" keyTimes="0;0.1;0.9;1"`)}</ellipse>`).join('');
      const cloth = (x, w, h, c, d) => `<g transform="translate(${x} 114)"><g>${ctx.a(easeSpin(`0 0 0;${d} 0 0;0 0 0;${-d * 0.6} 0 0;0 0 0`, '3s'))}<path d="M0,0 h${w} v${h} q${-w / 2},2 ${-w},0 Z" fill="${c}" stroke="${k}" stroke-width="0.4"/></g></g>`;
      const top = `
        ${sky(INK.yellow, 0.2)}
        <g transform="translate(194 46)"><circle r="10" fill="${INK.yellow}"/><circle r="15" fill="${INK.yellow}" opacity="0.3">${breathe(ctx, 0.3, '0.3;0.1;0.3', '4s')}</circle></g>
        <path d="M150,167 C152,130 156,96 166,64" fill="none" stroke="${INK.kaapi}" stroke-width="3"/>
        <g stroke="${INK.green}" stroke-width="1.6" fill="none" stroke-linecap="round">${ctx.a(easeSpin('0 166 64;3 166 64;0 166 64;-2 166 64;0 166 64', '6s'))}
          <path d="M166,64 Q150,54 136,66 M166,64 Q154,46 140,46 M166,64 Q172,44 186,42 M166,64 Q184,56 196,70 M166,64 Q160,72 152,86 M166,64 Q178,70 182,86"/></g>
        <rect x="38" y="96" width="50" height="54" fill="${INK.pink}" opacity="0.5"/>
        <path d="M36,96 H90" stroke="${k}" stroke-width="1.6"/>
        <g transform="translate(62 96)">${sintex(0, 0, 18, 20)}</g>
        <rect x="176" y="118" width="36" height="32" fill="${INK.green}" opacity="0.35"/>
        <path d="M174,118 H214" stroke="${k}" stroke-width="1.4"/>
        <g transform="translate(196 118)">${sintex(0, 0, 14, 15)}</g>
        <path d="M168,150 V108 M210,150 V108" stroke="${k}" stroke-width="0.9"/>
        <path d="M168,112 Q189,119 210,112" fill="none" stroke="${k}" stroke-width="0.4"/>
        ${cloth(171, 9, 20, INK.red, 6)}${cloth(183, 10, 12, INK.blue, -5)}${cloth(196, 8, 16, INK.yellow, 7)}
        <rect x="38" y="146" width="174" height="21" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="146" width="174" height="5" fill="${INK.kaapi}" opacity="0.4"/>
        <path d="M38,151 H212" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.4"><rect x="52" y="156" width="16" height="11"/><rect x="182" y="156" width="16" height="11"/></g>
        <rect x="108" y="138" width="34" height="8" fill="${INK.red}" opacity="0.6" stroke="${k}" stroke-width="0.4"/>
        <rect x="108" y="138" width="34" height="8" fill="url(#${p}-brick)"/>
        <g transform="translate(125 138)">${sintex(0, 0, 42, 48)}</g>
        <path d="M144,96 h6 v-4 M104,100 h-8 v4" fill="none" stroke="${k}" stroke-width="1.6"/>
        <path d="M96,104 v3" stroke="${INK.blue}" stroke-width="1.2"/>
        ${drip(96, 108, 38, '1.5s', 3)}
        <g transform="translate(127 82)"><g>${ctx.a(easeMove('0 0;0 0;0 -2;0 0', '2s'))}<path d="M-3,0 q3,-4 6,0 l3,1 h-3 q-3,2 -6,0 Z" fill="${k}"/><path d="M-3,0 l-3,2" stroke="${k}" stroke-width="0.9"/></g></g>`;

      const bottom = `
        ${sky(INK.blue, 0.16)}
        <path d="${scallop(80, 40, 30, 7, 8, 3)}" fill="${P}" opacity="0.8">${ctx.a(easeMove('0 0;12 0;0 0', '12s'))}</path>
        <rect x="38" y="104" width="46" height="63" fill="${INK.red}" opacity="0.3"/>
        <rect x="38" y="104" width="46" height="63" fill="url(#${p}-brick)"/>
        <path d="M36,104 H86" stroke="${k}" stroke-width="1.6"/>
        ${waterTower(62, 104, 0.45)}
        <rect x="172" y="120" width="40" height="47" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <path d="M170,120 H214 M170,124 H214" stroke="${k}" stroke-width="0.9"/>
        ${waterTower(194, 120, 0.36)}
        ${wisps(ctx, 178, 118, 26, { color: P, sw: 2.4, dur: 4, count: 3, spread: 1.5, op: 0.8 })}
        <path d="M176,120 v-6 h4 v6" fill="${k}"/>
        <rect x="38" y="148" width="174" height="19" fill="${INK.kaapi}" opacity="0.4"/>
        <path d="M38,148 H212 M38,152 H212" stroke="${k}" stroke-width="0.7"/>
        <g fill="${k}" opacity="0.7">${[48, 72, 172, 196].map((x) => `<path d="M${x},167 v-8 a4,4 0 0 1 8,0 v8 Z"/>`).join('')}</g>
        ${waterTower(125, 148, 1)}
        <path d="M150,148 V100 M154,148 V100 M150,${[140, 132, 124, 116, 108].join(' H154 M150,')} H154" stroke="${k}" stroke-width="0.5" fill="none"/>
        ${drip(117, 132, 14, '1.5s', 2)}
        ${ctx.still ? `<g transform="translate(112 59)">${bird(ctx, k, '0.4s', 1)}</g>` : `<g transform="translate(125 70)"><g>${T.kit.spin('0;360', '6s')}<g transform="translate(40 0)">${bird(ctx, k, '0.4s', 1.1)}</g><g transform="translate(-34 8)">${bird(ctx, INK.blue, '0.5s', 1)}</g></g></g>`}`;

      return {
        top: { city: 'blr', caption: 'MALLESHWARAM', clause: 'Every house keeps a little worry', art: top },
        bottom: { city: 'nyc', caption: 'TRIBECA', clause: 'upstairs, just in case.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 6 of Clubs: Heard Before Seen. The soppu cart x the soft-serve truck,
  // each parked dead centre and calling out down the block.
  // ======================================================================
  function note(ctx, x, y, dur, begin, c) {
    return `<g transform="translate(${x} ${y})" opacity="${ctx.still ? 0.9 : 0}">${ctx.a(easeMove('0 0;-6 -10;4 -20;-2 -30', dur, ` begin="${begin}"`) + loop('opacity', '0;1;1;0', dur, ` begin="${begin}" keyTimes="0;0.15;0.7;1"`))}
      <ellipse cx="0" cy="0" rx="1.8" ry="1.3" transform="rotate(-20)" fill="${c}"/><path d="M1.6,-0.4 V-8 q2,1 3,3" fill="none" stroke="${c}" stroke-width="0.7"/></g>`;
  }
  T.register({
    id: 'c-6', rank: '6', suit: 'club', title: 'Heard Before Seen',
    pair: ['Soppu cart', 'Soft-serve truck'],
    sentence: ['You never hear them coming.', 'Only leaving.'],
    why: 'By the time you find your purse, the cart is two streets away and still singing.',
    mechanism: 'Greens cart and ice cream truck, parked nose to tail across the seam, both calling down the block.',
    sound: '"Soppu, soppammaa!", a cart wheel, a jingle on loop, kids running.',
    draw(ctx) {
      const p = ctx.id;
      const heap = (x, y, rx, ry, c, seed) => {
        const r = rng(Math.round(seed * 100) + 3); let leaves = '';
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + 0.25 + r() * (Math.PI - 0.5), lx = x + Math.cos(a) * rx * 0.9, ly = y + Math.sin(a) * ry * 0.9 + 3;
          leaves += `<path d="M${f(lx)},${f(ly + 4)} q${f(-2 + r() * 4)},-5 ${f(Math.cos(a) * 3)},-9 q${f(2 + r() * 2)},4 ${f(-Math.cos(a) * 3)},9 Z"/>`;
        }
        return `<path d="M${x - rx},${y + ry * 0.6} Q${x - rx},${y - ry} ${x},${y - ry} Q${x + rx},${y - ry} ${x + rx},${y + ry * 0.6} Z" fill="${c}" stroke="${k}" stroke-width="0.45"/>
          <g fill="${INK.green}" fill-opacity="0.65" stroke="${k}" stroke-width="0.35">${leaves}</g>
          <path d="M${x - rx * 0.6},${y + ry * 0.3} q${rx * 0.3},-${ry * 0.8} ${rx * 0.6},0 M${x},${y + ry * 0.3} q${rx * 0.3},-${ry * 0.8} ${rx * 0.6},0" fill="none" stroke="${P}" stroke-width="0.4" opacity="0.6"/>`;
      };
      const woodWheel = (x, y, r) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="none" stroke="${INK.kaapi}" stroke-width="2"/><circle r="${r}" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g stroke="${INK.kaapi}" stroke-width="1">${[0, 45, 90, 135].map((a) => `<path d="M${f(-r * Math.cos(a * Math.PI / 180))},${f(-r * Math.sin(a * Math.PI / 180))} L${f(r * Math.cos(a * Math.PI / 180))},${f(r * Math.sin(a * Math.PI / 180))}"/>`).join('')}${ctx.a(easeSpin('0;-20;0', '6s'))}</g><circle r="2" fill="${k}"/></g>`;
      const cart = `<g>${ctx.a(easeMove('0 0;-5 0;0 0', '6s'))}
        <ellipse cx="0" cy="0.4" rx="46" ry="1.4" fill="${k}" opacity="0.25"/>
        ${woodWheel(-26, -12, 12)}${woodWheel(26, -12, 12)}
        <path d="M-46,-28 H46 L58,-34" fill="none" stroke="${INK.kaapi}" stroke-width="2"/>
        <rect x="-46" y="-32" width="92" height="6" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <path d="M-46,-29 H46" stroke="${k}" stroke-width="0.35"/>
        <path d="M-40,-46 V-32" stroke="${k}" stroke-width="1"/>
        <g transform="translate(-40 -66)"><path d="M0,0 V20" stroke="${k}" stroke-width="1"/>
          <g>${ctx.a(easeSpin('0 0 0;7 0 0;0 0 0;-7 0 0;0 0 0', '3s'))}<path d="M-9,0 H9" stroke="${k}" stroke-width="1"/>
            <path d="M-9,0 l-3,8 h6 Z M9,0 l-3,8 h6 Z" fill="none" stroke="${k}" stroke-width="0.4"/><path d="M-12,8 q3,2 6,0 M6,8 q3,2 6,0" fill="${k}" opacity="0.7" stroke="${k}" stroke-width="0.4"/></g></g>
        ${heap(-24, -37, 13, 6, INK.green, 0.2)}${heap(-4, -38, 11, 7, INK.yellow, 0.6)}${heap(14, -37, 10, 6, INK.green, 1)}
        <g fill="${INK.red}" stroke="${k}" stroke-width="0.35">${[[28, -35], [33, -35], [38, -35], [30.5, -39], [35.5, -39], [33, -43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
        <path d="M-30,-44 q-2,-6 2,-10 M-20,-45 q1,-7 -2,-11 M-4,-47 q-2,-7 1,-12 M8,-45 q2,-6 0,-11" fill="none" stroke="${INK.green}" stroke-width="1.2" stroke-linecap="round">${ctx.a(easeSpin('0 -10 -44;3 -10 -44;0 -10 -44', '1.5s'))}</path>
        ${person(64, 0, { h: 34, c: INK.kaapi, arms: [[57, -33], [58, -30]], extra: `<path d="M60.6,-33.6 q3.4,-4 7,0 Z" fill="${INK.yellow}" stroke="none"/>` })}
        ${arcs(ctx, 69, -27, 1, { n: 3, dur: 2, r0: 3, gap: 3.4 })}
      </g>`;
      const top = `
        ${sky(INK.yellow, 0.14)}
        <path d="${scallop(194, 46, 34, 22, 12, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(194, 46, 34, 22, 12, 5)}" fill="url(#${p}-leaf)"/>
        <rect x="38" y="58" width="66" height="109" fill="${INK.blue}" opacity="0.3"/>
        <path d="M38,58 H106" stroke="${k}" stroke-width="1.4"/>
        <rect x="46" y="68" width="22" height="22" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <path d="M51.5,68 V90 M57,68 V90 M62.5,68 V90" stroke="${k}" stroke-width="0.45"/>
        <path d="M38,100 H106 M38,108 H106" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 17 }, (_, i) => `M${40 + i * 4},100 V108`).join(' ')}" stroke="${k}" stroke-width="0.4"/>
        ${person(84, 100, { h: 18, c: INK.red, arms: [[80, 98], [90, 92]] })}
        <rect x="150" y="84" width="62" height="83" fill="${INK.pink}" opacity="0.4"/>
        <path d="M148,84 H214" stroke="${k}" stroke-width="1.4"/>
        <rect x="160" y="96" width="18" height="24" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <rect x="38" y="140" width="174" height="27" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <path d="M38,140 H212" stroke="${k}" stroke-width="1.2"/>
        <rect x="38" y="140" width="174" height="27" fill="url(#${p}-hatch)" opacity="0.18"/>
        <g transform="translate(118 167)">${cart}</g>`;

      const truck = `<g>${ctx.a(easeMove('0 0;0 -0.6;0 0', '0.5s'))}
        <ellipse cx="2" cy="0.4" rx="62" ry="1.6" fill="${k}" opacity="0.25"/>
        <path d="M-58,-8 V-58 Q-58,-60 -56,-60 H38 Q42,-60 44,-56 L56,-32 Q60,-30 60,-24 V-8 Q60,-6 57,-6 H-56 Q-58,-6 -58,-8 Z" fill="${P}" stroke="${k}" stroke-width="0.7" stroke-linejoin="round"/>
        <path d="M-58,-18 H60 V-12 H-58 Z" fill="${INK.blue}"/>
        <path d="M-58,-21 H59" stroke="${INK.pink}" stroke-width="1.4"/>
        <path d="M38,-56 L50,-34 H38 Z" fill="${INK.blue}" fill-opacity="0.4" stroke="${k}" stroke-width="0.5"/>
        <rect x="-46" y="-50" width="40" height="22" fill="${INK.yellow}" stroke="${k}" stroke-width="0.6"/>
        <path d="M-48,-50 H-4 L-6,-55 H-46 Z" fill="${INK.pink}" stroke="${k}" stroke-width="0.4"/>
        <path d="M-46,-28 H-6" stroke="${k}" stroke-width="1.4"/>
        ${person(-26, -28, { h: 16, c: k, arms: [[-30, -36], [-19, -36]] })}
        <g transform="translate(-14 -36)"><path d="M-1.6,0 L0,4 L1.6,0 Z" fill="${INK.kaapi}"/><path d="M-1.8,0 Q0,-4 1.8,0 Z" fill="${P}" stroke="${k}" stroke-width="0.3"/></g>
        <g fill="none" stroke="${k}" stroke-width="0.5"><rect x="4" y="-50" width="14" height="18" rx="1"/><rect x="21" y="-50" width="12" height="18" rx="1"/></g>
        <g transform="translate(11 -41)"><path d="M-3,0 L0,7 L3,0 Z" fill="${INK.kaapi}"/><path d="M-3.4,0 Q-3,-5 0,-6 Q3,-5 3.4,0 Z" fill="${INK.pink}"/></g>
        <g transform="translate(27 -41)"><path d="M-3,0 L0,7 L3,0 Z" fill="${INK.kaapi}"/><path d="M-3.4,0 Q-3,-5 0,-6 Q3,-5 3.4,0 Z" fill="${P}" stroke="${k}" stroke-width="0.3"/></g>
        <g transform="translate(-22 -60) scale(1.5)"><g>${ctx.a(easeSpin('0 0 0;4 0 0;0 0 0;-4 0 0;0 0 0', '3s'))}
          <path d="M-7,-14 L0,0 L7,-14 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
          <path d="M-5,-12 L2,-2 M-1,-14 L4,-6 M3,-14 L5,-11 M5,-12 L-2,-2 M1,-14 L-4,-6 M-3,-14 L-5,-11" stroke="${k}" stroke-width="0.35"/>
          <path d="M-8.4,-14 Q-10,-20 -4,-21 Q-7,-27 0,-28 Q-3,-33 2,-36 Q6,-31 3,-28 Q9,-27 5,-21 Q11,-20 8.4,-14 Z" fill="${P}" stroke="${k}" stroke-width="0.6"/>
          <path d="M-6,-17 Q0,-15 6,-18 M-3,-23 Q1,-22 4,-24" fill="none" stroke="${k}" stroke-width="0.4"/></g></g>
        <path d="M30,-60 v-4 h8 l4,-3 v10 l-4,-3" fill="${k}"/>
        ${note(ctx, 46, -66, '3s', '0s', k)}${note(ctx, 52, -62, '3s', '-1s', INK.pink)}${note(ctx, 44, -60, '3s', '-2s', INK.blue)}
        ${wheel(ctx, -38, '0.5s')}${wheel(ctx, 40, '0.5s')}
      </g>`;
      const kidX = ctx.still ? 52 : CX;
      const bottom = `
        ${sky(INK.blue, 0.12)}
        <rect x="38" y="44" width="174" height="80" fill="${INK.kaapi}" opacity="0.35"/>
        <rect x="38" y="44" width="174" height="80" fill="url(#${p}-brick)"/>
        <path d="M38,44 H212 M38,48 H212" stroke="${k}" stroke-width="0.8"/>
        ${[48, 92, 136, 180].map((x) => `<path d="M${x},60 h24 l-3,22 h-18 Z" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.5"/><path d="M${x + 12},60 V82" stroke="${k}" stroke-width="0.4"/>`).join('')}
        <path d="M38,92 H212" stroke="${k}" stroke-width="0.5"/>
        ${[60, 140].map((x) => `<rect x="${x}" y="98" width="12" height="26" fill="${k}" opacity="0.6"/>`).join('')}
        <rect x="38" y="124" width="174" height="43" fill="${k}" opacity="0.1"/>
        <path d="M38,124 H212" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(130 167)">${truck}</g>
        <g transform="translate(${kidX} 167)">${ctx.a(move('-110 0;-60 0;-60 0;-110 0', '12s', ' keyTimes="0;0.3;0.8;1"'))}${figure(ctx, { color: INK.red, run: true })}</g>`;

      return {
        top: { city: 'blr', caption: 'VIJAYANAGAR', clause: 'You never hear them coming.', art: top },
        bottom: { city: 'nyc', caption: 'BAY RIDGE', clause: 'Only leaving.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 7 of Clubs: Snack O'Clock. Pani puri cart x hot dog cart, both carts
  // on the kerb at the middle of the card at four o'clock sharp.
  // ======================================================================
  T.register({
    id: 'c-7', rank: '7', suit: 'club', title: "Snack O'Clock",
    pair: ['Pani puri cart', 'Hot dog cart'],
    sentence: ['Four o\'clock', 'is a street-food time zone.'],
    why: 'Lunch was hours ago. Dinner is hours away. A cart on the corner knows exactly why.',
    mechanism: 'Two carts at the same kerb, back to back. One dunks puris, the other dunks franks.',
    sound: 'A crisp crack, "one more, anna", steam, a pretzel bell, traffic.',
    draw(ctx) {
      const p = ctx.id;
      let puris = '';
      for (let row = 0; row < 4; row++) for (let i = 0; i <= 3 - row; i++) puris += `<circle cx="${-30 + i * 9 + row * 4.5}" cy="${-45 - row * 7}" r="4.2" fill="${INK.yellow}" stroke="${INK.kaapi}" stroke-width="0.6"/>`;
      const bulbs = (seed) => {
        const r = rng(seed); let s = `<path d="M38,38 Q125,58 212,38" fill="none" stroke="${k}" stroke-width="0.4"/>`;
        for (let i = 0; i < 12; i++) {
          const x = 44 + i * 15, t = (x - 38) / 174, y = f(38 + 4 * 20 * t * (1 - t) + 2);
          s += `<circle cx="${x}" cy="${y}" r="1.4" fill="${[INK.yellow, INK.pink, INK.green, INK.red][i % 4]}">${ctx.a(easeLoop('opacity', '1;0.3;1', '1.5s', ` begin="-${f(r() * 1.5)}s"`))}</circle>`;
        }
        return s;
      };
      const cart = `<g>
        <ellipse cx="0" cy="0.4" rx="44" ry="1.4" fill="${k}" opacity="0.25"/>
        ${rim(ctx, -28, -8, 8, '6s')}${rim(ctx, 28, -8, 8, '6s')}
        <rect x="-42" y="-38" width="84" height="22" fill="${INK.blue}" stroke="${k}" stroke-width="0.6"/>
        <path d="M-42,-32 H42" stroke="${P}" stroke-width="0.6"/>
        <rect x="-36" y="-76" width="38" height="38" fill="${INK.blue}" fill-opacity="0.1" stroke="${k}" stroke-width="0.7"/>
        ${puris}
        <path d="M-36,-76 L-30,-80 H8 L2,-76 M2,-38 L8,-42 V-80" fill="none" stroke="${k}" stroke-width="0.5"/>
        <path d="M-33,-73 L-33,-42" stroke="${P}" stroke-width="1.2" opacity="0.8"/>
        <path d="M8,-38 Q4,-54 16,-58 L30,-58 Q42,-54 38,-38 Z" fill="${k}" fill-opacity="0.15" stroke="${k}" stroke-width="0.7"/>
        <ellipse cx="23" cy="-58" rx="14" ry="2.6" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
        <path d="M14,-50 Q20,-47 32,-50" fill="none" stroke="${P}" stroke-width="1" opacity="0.8"/>
        <g transform="translate(-14 -18)"><rect x="-6" y="-3" width="12" height="3" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/></g>
      </g>`;
      const seller = `${person(176, 160, { h: 44, c: k, arms: [[166, 120], [160, 112]], head: k, extra: `<path d="M173,128 h6 v4 h-6 Z" fill="${INK.red}" stroke="none"/>` })}`;
      const dunk = `<g transform="translate(160 112)"><g>${ctx.a(easeMove('0 0;-4 -4;0 0;0 0', '2s'))}<circle cx="0" cy="0" r="2.4" fill="${INK.yellow}" stroke="${INK.kaapi}" stroke-width="0.5"/></g></g>`;
      const customer = person(78, 167, { h: 44, c: INK.green, arms: [[90, 140], [84, 136]], extra: `<path d="M86,137 q4,4 8,0 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>` });
      const top = `
        ${sky(INK.yellow, 0.2)}
        <rect x="38" y="62" width="58" height="105" fill="${INK.pink}" opacity="0.4"/>
        <rect x="42" y="66" width="50" height="12" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
        <text x="67" y="74.6" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="1" fill="${P}">SWEETS</text>
        <rect x="46" y="84" width="42" height="40" fill="${INK.yellow}" opacity="0.7" stroke="${k}" stroke-width="0.4"/>
        <path d="M46,98 H88 M46,111 H88" stroke="${k}" stroke-width="0.5"/>
        <rect x="154" y="70" width="58" height="97" fill="${INK.green}" opacity="0.35"/>
        <rect x="158" y="74" width="50" height="12" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <text x="183" y="82.6" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="1" fill="${k}">CHATS</text>
        ${bulbs(5)}
        ${seller}
        <g transform="translate(125 167)">${cart}</g>
        ${dunk}
        ${customer}`;

      const umbrella = () => {
        let s = '';
        for (let i = 0; i < 8; i++) {
          const x0 = -48 + i * 12, x1 = x0 + 12;
          s += `<path d="M0,0 L${x0},14 Q${x0 + 6},17 ${x1},14 Z" fill="${i % 2 ? INK.yellow : INK.blue}" stroke="${k}" stroke-width="0.4"/>`;
        }
        return s + '<circle cx="0" cy="-1" r="1.4" fill="' + k + '"/>';
      };
      const pretzel = (x) => `<path d="M${x},-48 c-4,-1 -5,-6 -1,-7 c2,0 3,3 1,6 c-2,-3 -1,-6 1,-6 c4,1 3,6 -1,7 Z" fill="none" stroke="${INK.kaapi}" stroke-width="1.4"/>`;
      const hotdogCart = `<g>
        <ellipse cx="0" cy="0.4" rx="42" ry="1.4" fill="${k}" opacity="0.25"/>
        ${rim(ctx, -24, -7, 7, '6s')}${rim(ctx, 24, -7, 7, '6s')}
        <rect x="-38" y="-42" width="76" height="28" fill="${P}" stroke="${k}" stroke-width="0.7"/>
        <rect x="-38" y="-42" width="76" height="28" fill="url(#${p}-hatch)" opacity="0.35"/>
        <path d="M-38,-36 H38" stroke="${k}" stroke-width="0.5"/>
        <rect x="-32" y="-31" width="26" height="12" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
        <path d="M-28,-25 h18" stroke="${INK.yellow}" stroke-width="2.4" stroke-linecap="round"/><path d="M-28,-25 h18" stroke="${INK.kaapi}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M-40,-42 H40" stroke="${k}" stroke-width="1.6"/>
        <rect x="6" y="-48" width="22" height="6" fill="${k}" opacity="0.8"/>
        ${pretzel(-24)}${pretzel(-14)}
        <rect x="30" y="-52" width="4" height="10" rx="1" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/><rect x="35" y="-51" width="4" height="9" rx="1" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
        <path d="M0,-42 V-76" stroke="${k}" stroke-width="1.2"/>
        <g transform="translate(0 -86)"><g>${ctx.a(easeSpin('0 0 12;1.6 0 12;0 0 12;-1.6 0 12;0 0 12', '4s'))}${umbrella()}</g></g>
      </g>`;
      const vendor = person(170, 160, { h: 42, c: INK.blue, arms: [[160, 128], [158, 132]], extra: `<path d="M166.4,116 h7.2 v-2 h-7.2 Z" fill="${INK.red}" stroke="none"/>` });
      const buyer = person(80, 167, { h: 44, c: INK.kaapi, arms: [[92, 138], [88, 142]], extra: `<g><path d="M90,138 h8" stroke="${INK.yellow}" stroke-width="2.4" stroke-linecap="round"/><path d="M90,138 h8" stroke="${INK.red}" stroke-width="1"/>${ctx.a(easeSpin('0 90 138;0 90 138;-24 90 138;0 90 138', '3s'))}</g>` });
      const bottom = `
        ${sky(INK.blue, 0.1)}
        <path d="${scallop(178, 64, 40, 26, 14, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(178, 64, 40, 26, 14, 5)}" fill="url(#${p}-leaf)"/>
        <path d="${scallop(58, 70, 30, 22, 12, 5)}" fill="${INK.green}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5"/>
        <path d="M178,167 V88 M58,167 V90" stroke="${k}" stroke-width="2.4"/>
        <rect x="38" y="120" width="174" height="10" fill="${INK.kaapi}" opacity="0.35"/>
        <path d="M38,120 H212 M38,130 H212" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(200 167)"><path d="M0,0 V-60" stroke="${k}" stroke-width="1.4"/><path d="M-4,-60 h8 l-1.4,-7 h-5.2 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/></g>
        ${vendor}
        <g transform="translate(125 167)">${hotdogCart}</g>
        ${wisps(ctx, 142, 118, 28, { color: P, sw: 2.6, dur: 3, count: 3, spread: 2, op: 0.9 })}
        ${wisps(ctx, 142, 118, 28, { color: k, sw: 0.3, dur: 3, count: 3, spread: 2, op: 0.35 })}
        ${buyer}
        <g transform="translate(56 167)"><g>${ctx.a(easeSpin('0 0 0;0 0 0;28 0 0;0 0 0', '1.5s'))}<path d="M-5,-2 Q-6,-8 0,-8 Q4,-8 5,-5 L8,-4 L5,-3 Q3,0 -3,0 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.4"/></g></g>`;

      return {
        top: { city: 'blr', caption: 'VV PURAM', clause: 'Four o\'clock', art: top },
        bottom: { city: 'nyc', caption: 'COLUMBUS CIRCLE', clause: 'is a street-food time zone.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 9 of Clubs: A Second Ago. One signal pole through the seam, green in
  // both cities, and nobody has moved yet except their thumbs.
  // ======================================================================
  function signal(ctx, x, top, timer) {
    const lamp = (cy, c, on) => `<circle cx="${x}" cy="${cy}" r="3.6" fill="${c}" opacity="${on ? 1 : 0.25}"/>`;
    return `<g>
      <path d="M${x},167 V${top + 30}" stroke="${k}" stroke-width="2.2"/>
      <path d="M${x - 0.6},167 V${top + 30}" stroke="${P}" stroke-width="0.5" opacity="0.5"/>
      <circle cx="${x}" cy="${top + 24}" r="9" fill="${INK.green}" opacity="0.3">${breathe(ctx, 0.3, '0.35;0.15;0.35', '1s')}</circle>
      <rect x="${x - 6}" y="${top}" width="12" height="30" rx="2" fill="${k}" stroke="${P}" stroke-width="0.4"/>
      ${lamp(top + 6, INK.red, false)}${lamp(top + 15, INK.yellow, false)}${lamp(top + 24, INK.green, true)}
      ${timer ? `<rect x="${x + 7}" y="${top + 4}" width="16" height="10" fill="${k}" stroke="${P}" stroke-width="0.4"/>
        <text x="${x + 15}" y="${top + 11.8}" text-anchor="middle" font-family="${FONT.sans}" font-size="7.4" font-weight="700" fill="${INK.green}">59</text>` : ''}
    </g>`;
  }
  T.register({
    id: 'c-9', rank: '9', suit: 'club', title: 'A Second Ago',
    pair: ['Hebbal signal', 'Holland Tunnel light'],
    sentence: ['The light turned green', 'a full second ago.'],
    why: 'Green means go. One second of green means everyone behind you has an opinion.',
    mechanism: 'One signal pole through the seam, green both ways. The honks start before the wheels do.',
    sound: 'Twelve horns, a pressure horn, an auto\'s squeak, a cab\'s lean.',
    draw(ctx) {
      const p = ctx.id;
      const inch = (inner, x, y, b) => `<g transform="translate(${x} ${y})">${inner}${ctx.a(easeMove('0 0;0 0;3 0;3 0;0 0', '3s', ` begin="${b}"`))}</g>`;
      const brake = (x, y, b) => `<rect x="${x}" y="${y}" width="2" height="2.4" fill="${INK.red}"/><circle cx="${x + 1}" cy="${y + 1.2}" r="3" fill="${INK.red}" opacity="${ctx.still ? 0.4 : 0}">${ctx.a(loop('opacity', '0.5;0.5;0;0;0.5', '3s', ` begin="${b}"`))}</circle>`;
      const bus = `<g>
        <path d="M-50,-8 V-46 Q-50,-50 -46,-50 H40 Q46,-50 47,-44 L50,-20 V-8 Q50,-6 47,-6 H-48 Q-50,-6 -50,-8 Z" fill="${INK.blue}" stroke="${P}" stroke-width="0.5"/>
        <path d="M-50,-24 H50" stroke="${P}" stroke-width="1.6" opacity="0.8"/>
        <g fill="${INK.yellow}" opacity="0.7">${[-44, -30, -16, -2, 12, 26].map((x) => `<rect x="${x}" y="-44" width="11" height="14"/>`).join('')}</g>
        <rect x="38" y="-46" width="8" height="18" fill="${INK.yellow}" opacity="0.5"/>
        ${wheel(ctx, -32, '6s')}${wheel(ctx, 32, '6s')}
      </g>`;
      const top = `
        ${sky(k, 0.82)}
        ${sky(INK.blue, 0.2)}
        <g fill="${INK.yellow}" opacity="0.5">${[[46, 70], [54, 70], [46, 80], [62, 80], [186, 64], [196, 64], [204, 74]].map(([x, y]) => `<rect x="${x}" y="${y}" width="4" height="5"/>`).join('')}</g>
        <path d="M38,98 Q120,80 212,92" fill="none" stroke="${P}" stroke-width="7" opacity="0.18"/>
        <path d="M38,94 Q120,76 212,88 M38,102 Q120,84 212,96" fill="none" stroke="${P}" stroke-width="0.5" opacity="0.5"/>
        <path d="M80,88 V120 M170,86 V120" stroke="${P}" stroke-width="3" opacity="0.18"/>
        ${[60, 104, 148, 192].map((x) => `<circle cx="${x}" cy="${f(86 - (x - 125) * 0.02)}" r="2" fill="${INK.yellow}"/>`).join('')}
        ${signal(ctx, 125, 46, true)}
        ${inch(bus, 92, 158, '0s')}
        ${inch(`<g transform="scale(0.72)">${autoRickshaw({ still: false, a: (m) => ctx.a(m) })}</g>`, 168, 167, '-0.3s')}
        ${inch(`<g transform="scale(0.8)">${scooter(ctx, INK.red, INK.kaapi)}</g>`, 64, 167, '-0.6s')}
        ${inch(`<g transform="scale(0.8)">${scooter(ctx, P, INK.green)}</g>`, 112, 167, '-0.9s')}
        ${brake(44, 154, '0s')}${brake(140, 155, '-0.3s')}
        ${honk(ctx, 82, 124, 1, '1.5s', '0s', INK.yellow)}${honk(ctx, 196, 118, 1, '1.5s', '-0.5s', INK.yellow)}${honk(ctx, 148, 118, -1, '1.5s', '-1s', INK.yellow)}${honk(ctx, 56, 104, -1, '1.5s', '-0.7s', INK.yellow)}`;

      const truck = `<g>
        <rect x="-44" y="-56" width="62" height="46" fill="${P}" stroke="${k}" stroke-width="0.6"/>
        <path d="M-40,-50 H14" stroke="${INK.red}" stroke-width="2"/>
        <path d="M18,-10 V-38 H32 L40,-26 V-10 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
        <path d="M22,-36 H31 L37,-27 H22 Z" fill="${INK.yellow}" opacity="0.6"/>
        ${wheel(ctx, -30, '6s')}${wheel(ctx, 28, '6s')}
      </g>`;
      const cab = `<g transform="scale(0.68)">${yellowCab({ still: false, a: (m) => ctx.a(m) })}</g>`;
      const bottom = `
        ${sky(k, 0.86)}
        ${sky(INK.blue, 0.15)}
        <rect x="56" y="70" width="138" height="60" fill="${P}" opacity="0.12" stroke="${P}" stroke-width="0.5"/>
        <path d="M56,78 H194" stroke="${P}" stroke-width="0.4" opacity="0.5"/>
        <g fill="${INK.yellow}" opacity="0.85"><rect x="74" y="96" width="42" height="34"/><rect x="134" y="96" width="42" height="34"/></g>
        <g fill="none" stroke="${P}" stroke-width="0.7"><rect x="74" y="96" width="42" height="34"/><rect x="134" y="96" width="42" height="34"/></g>
        <g fill="${INK.yellow}">${[80, 92, 104, 140, 152, 164].map((x) => `<circle cx="${x + 2}" cy="100" r="0.9"/>`).join('')}</g>
        <path d="M38,44 H212" stroke="${P}" stroke-width="1.2" opacity="0.7"/>
        <rect x="150" y="46" width="52" height="14" rx="1" fill="${INK.green}" stroke="${P}" stroke-width="0.5"/>
        <text x="176" y="55.6" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" letter-spacing="0.4" fill="${P}">HOLLAND TUNNEL</text>
        <path d="M160,44 V46 M192,44 V46" stroke="${P}" stroke-width="0.8"/>
        ${signal(ctx, 125, 66, false)}
        ${inch(`<g transform="scale(0.85)">${truck}</g>`, 58, 165, '-0.4s')}
        ${inch(cab, 182, 167, '0s')}
        ${inch(cab, 106, 167, '-0.8s')}
        ${brake(76, 155, '-0.8s')}${brake(151, 155, '0s')}
        ${honk(ctx, 116, 136, 1, '1.5s', '-0.2s', INK.yellow)}${honk(ctx, 200, 134, 1, '1.5s', '-0.9s', INK.yellow)}${honk(ctx, 46, 112, -1, '1.5s', '-0.5s', INK.yellow)}`;

      return {
        top: { city: 'blr', caption: 'HEBBAL', clause: 'The light turned green', art: top },
        bottom: { city: 'nyc', caption: 'HOLLAND TUNNEL', clause: 'a full second ago.', art: bottom }
      };
    }
  });

  // ======================================================================
  // J of Clubs: One Whistle. The conductor leaning out of the bus door x
  // the conductor leaning out of the cab window. Same spot, same lean.
  // ======================================================================
  T.register({
    id: 'c-j', rank: 'J', suit: 'club', title: 'One Whistle',
    pair: ['BMTC conductor', 'Subway conductor'],
    sentence: ['One whistle, one chime,', 'then nobody waits.'],
    why: 'They give you exactly one warning. Every runner on the platform knows it.',
    mechanism: 'Two conductors at the dead centre, leaning out the same way. One whistles, one points.',
    sound: 'A sharp whistle, "Right, poli!", a two-note chime, doors closing.',
    draw(ctx) {
      const p = ctx.id;
      const runX = ctx.still ? 70 : CX;
      const runner = (c) => `<g transform="translate(${runX} 167)">${ctx.a(move('-120 0;-40 0;-40 0;-120 0', '6s', ' keyTimes="0;0.45;0.5;1"'))}<g opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;1;1;0;0', '6s', ' keyTimes="0;0.1;0.45;0.5;1"'))}${figure(ctx, { color: c, run: true })}</g></g>`;
      const heads = (xs, y, cols) => xs.map((x, i) => `<circle cx="${x}" cy="${y}" r="3" fill="${cols[i % cols.length]}"/><path d="M${x - 4},${y + 9} q4,-6 8,0 Z" fill="${cols[i % cols.length]}"/>`).join('');
      const lean = (x, g, inner) => `<g>${ctx.a(easeSpin(`0 ${x} ${g};0 ${x} ${g};6 ${x} ${g};6 ${x} ${g};0 ${x} ${g}`, '6s'))}${inner}</g>`;
      const conductor = lean(126, 150, `${person(126, 150, { h: 50, c: INK.blue, arms: [[111, 80], [134, 105]], head: INK.kaapi })}
        <path d="M122,110 L133,134" stroke="${INK.kaapi}" stroke-width="1.2"/>
        <path d="M129,130 h11 v11 q-5.5,3 -11,0 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <path d="M134,104.4 l5,-0.8 l0.4,2.4 l-4.6,0.6 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        ${arcs(ctx, 141, 104, 1, { n: 3, dur: 3, r0: 3.4, gap: 3.6, keys: '0;0.9;0;0;0.9;0;0', c: k, sw: 0.9 })}`);
      const top = `
        ${sky(INK.yellow, 0.14)}
        <path d="${scallop(186, 36, 40, 16, 12, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(186, 36, 40, 16, 12, 5)}" fill="url(#${p}-leaf)"/>
        <g fill="${INK.red}">${[[164, 44], [176, 48], [196, 42], [208, 46], [186, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>
        <path d="M30,40 Q90,50 150,38" fill="none" stroke="${k}" stroke-width="0.35"/>
        <g>${ctx.a(easeMove('0 0;0 -0.6;0 0', '0.6s'))}
          <path d="M30,62 H206 Q212,62 212,68 V154 H30 Z" fill="${P}" stroke="${k}" stroke-width="0.7"/>
          <rect x="30" y="120" width="182" height="34" fill="${INK.blue}"/>
          <path d="M30,118 H212" stroke="${INK.green}" stroke-width="2.4"/>
          <rect x="30" y="62" width="182" height="6" fill="${INK.blue}"/>
          <g fill="${INK.blue}" fill-opacity="0.25" stroke="${k}" stroke-width="0.5">${[34, 58, 82].map((x) => `<rect x="${x}" y="72" width="20" height="26"/>`).join('')}${[148, 172].map((x) => `<rect x="${x}" y="72" width="20" height="26"/>`).join('')}</g>
          ${heads([44, 68, 92, 158, 182], 84, [k, INK.kaapi, k, INK.red, INK.kaapi])}
          <rect x="196" y="70" width="16" height="44" fill="${INK.blue}" fill-opacity="0.4" stroke="${k}" stroke-width="0.5"/>
          <rect x="152" y="104" width="30" height="10" fill="${k}"/>
          <text x="167" y="111.8" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" fill="${INK.yellow}">500D</text>
          <rect x="108" y="70" width="34" height="84" fill="${k}" opacity="0.5"/>
          <path d="M110,74 V150" stroke="${P}" stroke-width="1" opacity="0.7"/>
          <path d="M108,146 H142 M108,150 H142" stroke="${P}" stroke-width="0.6" opacity="0.6"/>
          ${conductor}
        </g>
        ${wheel(ctx, 66, '6s')}${wheel(ctx, 182, '6s')}
        <path d="M38,167 H212" stroke="${k}" stroke-width="0.5"/>
        ${runner(INK.red)}`;

      const zebra = `<g transform="translate(176 26)"><path d="M0,0 V6" stroke="${k}" stroke-width="0.6"/><rect x="-7" y="6" width="14" height="10" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <path d="M-5,6 L-9,16 M-1,6 L-5,16 M3,6 L-1,16 M7,6 L3,16" stroke="${k}" stroke-width="1.6" transform="translate(2 0)"/></g>`;
      const indicator = (x) => `<rect x="${x}" y="62" width="4" height="2.4" fill="${INK.yellow}" opacity="${ctx.still ? 1 : 0.2}">${ctx.a(loop('opacity', '0.2;1;0.2;1;0.2;0.2', '3s', ' calcMode="discrete" keyTimes="0;0.1;0.2;0.3;0.4;1"'))}</rect>`;
      const cond = lean(125, 104, `<path d="M116,104 Q116,92 125,91 Q134,92 134,104 Z" fill="${INK.blue}" stroke="${P}" stroke-width="0.4"/>
          <circle cx="126" cy="85" r="4.4" fill="${INK.kaapi}"/><path d="M121,83.4 h10 l-1.4,-3.4 h-7.2 Z M130.6,83.4 h3" fill="${INK.blue}" stroke="${INK.blue}" stroke-width="0.8"/>
          <g><path d="M131,95 L150,80" stroke="${INK.blue}" stroke-width="2.4" stroke-linecap="round"/><path d="M150,80 l4,-3" stroke="${INK.kaapi}" stroke-width="1.3" stroke-linecap="round"/>
          ${ctx.a(easeSpin('0 130 96;0 130 96;-10 130 96;-10 130 96;0 130 96', '6s'))}</g>`);
      const bottom = `
        ${sky(k, 0.12)}
        <rect x="38" y="20" width="174" height="12" fill="${k}" opacity="0.5"/>
        <rect x="64" y="30" width="34" height="9" fill="${k}"/>
        <text x="81" y="36.6" text-anchor="middle" font-family="${FONT.sans}" font-size="5" font-weight="700" fill="${P}">Times Sq</text>
        <path d="M70,30 V32 M92,30 V32" stroke="${k}"/>
        ${zebra}
        <rect x="30" y="54" width="182" height="96" fill="${P}" stroke="${k}" stroke-width="0.7"/>
        <rect x="30" y="54" width="182" height="96" fill="url(#${p}-hatch)" opacity="0.18"/>
        <path d="M30,60 H212 M30,140 H212" stroke="${k}" stroke-width="0.5"/>
        <rect x="30" y="104" width="182" height="4" fill="${INK.red}"/>
        <g fill="${k}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5">${[40, 70].map((x) => `<rect x="${x}" y="72" width="22" height="24" rx="2"/>`).join('')}${[166, 192].map((x) => `<rect x="${x}" y="72" width="16" height="24" rx="2"/>`).join('')}</g>
        <g fill="${k}" fill-opacity="0.15" stroke="${k}" stroke-width="0.6"><rect x="140" y="66" width="22" height="74"/><rect x="96" y="66" width="12" height="74"/></g>
        <rect x="143" y="72" width="7" height="24" fill="${k}" opacity="0.7"/><rect x="152" y="72" width="7" height="24" fill="${k}" opacity="0.7"/>
        ${indicator(149)}
        <rect x="112" y="72" width="26" height="32" fill="${k}" opacity="0.85"/>
        ${cond}
        <path d="M112,104 H138" stroke="${P}" stroke-width="0.6"/>
        <rect x="38" y="150" width="174" height="17" fill="${k}" opacity="0.2"/>
        <rect x="38" y="150" width="174" height="5" fill="${INK.yellow}"/>
        <path d="${Array.from({ length: 44 }, (_, i) => `M${39 + i * 4},151.5 h1`).join(' ')}" stroke="${k}" stroke-width="0.6" opacity="0.5"/>
        <g fill="${INK.blue}" stroke="${k}" stroke-width="0.5"><rect x="40" y="20" width="6" height="147"/><rect x="204" y="20" width="6" height="147"/></g>
        <path d="M38,20 v147 M48,20 v147 M202,20 v147 M212,20 v147" stroke="${k}" stroke-width="0.8"/>
        ${runner(INK.kaapi)}`;

      return {
        top: { city: 'blr', caption: 'BTM LAYOUT', clause: 'One whistle, one chime,', art: top },
        bottom: { city: 'nyc', caption: 'TIMES SQUARE', clause: 'then nobody waits.', art: bottom }
      };
    }
  });

  // ======================================================================
  // Q of Clubs: Still Open. The Iyengar bakery counter x the bodega
  // counter: a jar of rusks and a cup of coffee meet at the seam.
  // ======================================================================
  T.register({
    id: 'c-q', rank: 'Q', suit: 'club', title: 'Still Open',
    pair: ['Iyengar bakery', 'Corner bodega'],
    sentence: ["Open before you're up.", "Still open when you're not okay."],
    why: 'Bad day, any hour. A lit sign, a warm puff, and nobody asking questions.',
    mechanism: 'Two counters back to back. Rusks in a jar, coffee in a cup. The cat stays.',
    sound: 'A buzzing tube light, a jar lid, a door bell, a cat.',
    draw(ctx) {
      const p = ctx.id;
      const jar = (x, w, h, fill) => `<g transform="translate(${x} 128)">
        <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="3" fill="${INK.blue}" fill-opacity="0.12" stroke="${k}" stroke-width="0.6"/>
        ${fill(w, h)}
        <rect x="${-w / 2 + 1.5}" y="${-h - 4}" width="${w - 3}" height="4.4" rx="1" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <path d="M${-w / 2 + 2.4},${-h + 3} V-3" stroke="${P}" stroke-width="1.2" opacity="0.7"/></g>`;
      const rusks = (w, h) => { let s = ''; for (let y = -4; y > -h + 4; y -= 4.4) for (let x = -w / 2 + 3; x < w / 2 - 6; x += 7.2) s += `<rect x="${f(x + ((y / 4.4) % 2 ? 1.6 : 0))}" y="${f(y - 3.6)}" width="6.4" height="3.6" rx="0.8" fill="${INK.kaapi}" fill-opacity="0.85" stroke="${k}" stroke-width="0.25"/>`; return s; };
      const biscuits = (c) => (w, h) => { let s = ''; for (let y = -4; y > -h + 4; y -= 5) for (let x = -w / 2 + 3.6; x < w / 2 - 2; x += 5.6) s += `<circle cx="${f(x)}" cy="${f(y)}" r="2.3" fill="${c}" stroke="${k}" stroke-width="0.25"/>`; return s; };
      const moth = ctx.still ? '' : `<g transform="translate(150 60)"><g>${T.kit.spin('0;360', '2s')}<path d="M8,0 l-1.4,-1.4 l1.4,0.6 l1.4,-0.6 Z" fill="${P}"/></g></g>`;
      const top = `
        ${sky(k, 0.88)}
        <rect x="46" y="52" width="158" height="115" fill="${P}"/>
        <rect x="46" y="52" width="158" height="115" fill="${INK.yellow}" opacity="0.45"/>
        <rect x="46" y="52" width="158" height="115" fill="none" stroke="${P}" stroke-width="0.5"/>
        <rect x="40" y="32" width="170" height="22" fill="${INK.yellow}" opacity="0.25">${breathe(ctx, 0.25, '0.25;0.25;0.05;0.25;0.25', '12s')}</rect>
        <rect x="44" y="35" width="162" height="16" fill="${INK.yellow}" stroke="${k}" stroke-width="0.6"/>
        <text x="125" y="46.8" text-anchor="middle" font-family="${FONT.sans}" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="${INK.red}">IYENGAR BAKERY</text>
        <rect x="120" y="58" width="40" height="3" rx="1.4" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <rect x="114" y="54" width="52" height="11" rx="5" fill="${P}" opacity="0.35">${ctx.a(loop('opacity', '0.35;0.35;0.05;0.35;0.1;0.35;0.35', '6s', ' keyTimes="0;0.6;0.61;0.62;0.63;0.64;1"'))}</rect>
        ${moth}
        <path d="M50,76 H200 M50,98 H200" stroke="${k}" stroke-width="0.8"/>
        <g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4">${[56, 74, 92].map((x) => `<path d="M${x},76 v-8 q0,-5 7,-5 q7,0 7,5 v8 Z"/>`).join('')}</g>
        <path d="M56,68 h14 M74,68 h14 M92,68 h14" stroke="${P}" stroke-width="0.4" opacity="0.6"/>
        <g fill="${P}" stroke="${k}" stroke-width="0.4">${[160, 176].map((x) => `<path d="M${x},76 v-6 h14 v6 Z"/><path d="M${x},70 q7,-6 14,0" fill="${INK.pink}"/>`).join('')}</g>
        <g fill="${INK.yellow}" stroke="${INK.kaapi}" stroke-width="0.6">${[58, 70, 82, 94, 158, 170, 182, 194].map((x) => `<path d="M${x - 5},98 L${x},90 L${x + 5},98 Z"/>`).join('')}</g>
        <rect x="46" y="128" width="158" height="39" fill="${INK.blue}" fill-opacity="0.18" stroke="${k}" stroke-width="0.6"/>
        <path d="M46,128 H204" stroke="${k}" stroke-width="1.6"/>
        <path d="M50,140 H200 M50,154 H200" stroke="${k}" stroke-width="0.5" opacity="0.6"/>
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.3">${[56, 66, 76, 86, 160, 170, 180, 190].map((x) => `<rect x="${x}" y="133" width="7" height="5" rx="1"/>`).join('')}</g>
        <g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3">${[56, 68, 80, 158, 170, 182].map((x) => `<path d="M${x},152 q5,-6 10,0 Z"/>`).join('')}</g>
        ${jar(78, 18, 22, biscuits(INK.yellow))}${jar(100, 18, 26, biscuits(INK.pink))}
        ${jar(125, 28, 34, rusks)}
        ${jar(150, 18, 26, biscuits(INK.kaapi))}${jar(172, 18, 22, biscuits(INK.yellow))}
        ${wisps(ctx, 196, 120, 18, { color: P, dur: 3, count: 2, spread: 1.2, op: 0.7 })}
        <path d="M192,128 l1,-8 h6 l1,8 Z" fill="${P}" fill-opacity="0.5" stroke="${k}" stroke-width="0.4"/><path d="M193,125 h6" stroke="${INK.kaapi}" stroke-width="2"/>`;

      const cat = `<g transform="translate(78 128)">
        <path d="M-8,0 Q-9,-10 -2,-12 Q4,-12 6,-6 Q8,0 4,0 Z" fill="${k}"/>
        <circle cx="5" cy="-13" r="4" fill="${k}"/><path d="M2,-16 l0.6,-4 l2,3 Z M6,-16 l1.6,-3.6 l0.8,3.8 Z" fill="${k}"/>
        <g><path d="M-8,-1 Q-16,-2 -14,-10" fill="none" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>${ctx.a(easeSpin('0 -8 -1;0 -8 -1;-24 -8 -1;6 -8 -1;0 -8 -1', '3s'))}</g></g>`;
      const shelf = (y, seed) => { const r = rng(seed); let s = `<path d="M50,${y} H200" stroke="${k}" stroke-width="0.7"/>`; for (let x = 52; x < 196;) { const w = 4 + r() * 6, h = 6 + r() * 9; s += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${[INK.red, INK.blue, INK.green, P, INK.pink, INK.yellow][Math.floor(r() * 6)]}" stroke="${k}" stroke-width="0.25"/>`; x += w + 1 + r() * 2; } return s; };
      const bottom = `
        ${sky(k, 0.9)}
        <rect x="46" y="62" width="158" height="105" fill="${P}"/>
        <rect x="46" y="62" width="158" height="105" fill="${INK.yellow}" opacity="0.4"/>
        ${shelf(82, 3)}${shelf(102, 8)}
        <rect x="40" y="30" width="170" height="26" fill="${P}" opacity="0.18">${breathe(ctx, 0.18, '0.18;0.05;0.18', '4s')}</rect>
        <rect x="44" y="33" width="162" height="20" fill="${INK.green}" stroke="${P}" stroke-width="0.5"/>
        <rect x="48" y="35.5" width="154" height="15" fill="${P}" stroke="${k}" stroke-width="0.4"/>
        <text x="125" y="47.2" text-anchor="middle" font-family="${FONT.sans}" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="${INK.red}">DELI GROCERY</text>
        <path d="M44,53 H206 L200,63 H50 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <text x="176" y="118" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" letter-spacing="0.8" fill="none" stroke="${INK.pink}" stroke-width="0.8">24 HRS${ctx.a(loop('opacity', '1;1;0.2;1;0.3;1;1', '12s', ' keyTimes="0;0.4;0.41;0.43;0.45;0.47;1"'))}</text>
        <rect x="46" y="128" width="158" height="39" fill="${INK.red}" opacity="0.6" stroke="${k}" stroke-width="0.6"/>
        <path d="M46,128 H204" stroke="${k}" stroke-width="1.6"/>
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"><rect x="58" y="136" width="30" height="20"/><rect x="162" y="136" width="30" height="20"/></g>
        <path d="M58,142 h30 M58,148 h30 M162,142 h30 M162,148 h30" stroke="${k}" stroke-width="0.35"/>
        ${cat}
        ${paperCup(125, 114, 0, 0.58)}
        ${wisps(ctx, 125, 98, 22, { color: P, sw: 0.7, dur: 3, count: 3, spread: 2.5, op: 0.8 })}
        <g transform="translate(160 128)"><rect x="-6" y="-6" width="12" height="6" fill="${P}" stroke="${k}" stroke-width="0.4"/><path d="M-6,-3 H6" stroke="${INK.blue}" stroke-width="0.6"/></g>`;

      return {
        top: { city: 'blr', caption: 'RAJAJINAGAR', clause: "Open before you're up.", art: top },
        bottom: { city: 'nyc', caption: 'CROWN HEIGHTS', clause: "Still open when you're not okay.", art: bottom }
      };
    }
  });

  // ======================================================================
  // K of Clubs: That Pothole. One pothole at the seam in each city, full
  // of rain. Everyone swerves round it without looking.
  // ======================================================================
  T.register({
    id: 'c-k', rank: 'K', suit: 'club', title: 'That Pothole',
    pair: ['Outer Ring Road pothole', 'BQE pothole'],
    sentence: ['Nobody fixes it.', 'Everybody knows exactly where it is.'],
    why: 'Older than some marriages. Locals swerve in their sleep. Visitors find it the hard way.',
    mechanism: 'One pothole at the seam, full of rain. Scooter and cab swerve round it on the same beat.',
    sound: 'Rain, a splash, a scooter wobble, a cab thud, one long sigh.',
    draw(ctx) {
      const p = ctx.id;
      const pts = [[-210, 0], [-110, 0], [-60, -2], [-24, -10], [24, -10], [60, -2], [110, 0], [210, 0]];
      const kt = pts.map(([x]) => f((x + 210) / 420)).join(';');
      const swerve = (inner, dur, begin, stillX) => ctx.still
        ? `<g transform="translate(${stillX} 167)">${inner}</g>`
        : `<g transform="translate(${CX} 167)">${move(pts.map((q) => q.join(' ')).join(';'), dur, ` keyTimes="${kt}" begin="${begin}"`)}<g>${easeSpin('0;0;-4;3;0;0', dur, ` begin="${begin}"`)}${inner}</g></g>`;
      const hole = (seed) => `<g>
        <path d="M97,154 Q99,147 112,146.4 Q126,145 140,146.6 Q153,148 153,154 Q151,160 136,160.6 Q120,161.4 108,160 Q97,158.6 97,154 Z" fill="${k}" opacity="0.7"/>
        <path d="M100,154 Q102,149 114,148.6 Q126,147.6 139,148.8 Q150,150 150,154 Q148,158.4 135,158.8 Q120,159.4 110,158.4 Q100,157.6 100,154 Z" fill="${INK.blue}" opacity="0.85"/>
        <path d="M108,152 q10,-2 20,-1 M120,156 q8,1 16,-1" stroke="${P}" stroke-width="0.6" fill="none" opacity="0.7"/>
        ${ctx.a([0, 1, 2].map((i) => `<ellipse cx="${[116, 132, 124][i]}" cy="${[153, 155, 151][i]}" rx="1" ry="0.4" fill="none" stroke="${P}" stroke-width="0.4" opacity="0">${loop('rx', '1;7', '1.5s', ` begin="-${i * 0.5}s"`)}${loop('ry', '0.4;1.6', '1.5s', ` begin="-${i * 0.5}s"`)}${loop('opacity', '1;0', '1.5s', ` begin="-${i * 0.5}s"`)}</ellipse>`).join(''))}
        <path d="M96,152 l-3,-1 M154,155 l3,1 M104,160.4 l-2,2 M146,147 l2,-2" stroke="${k}" stroke-width="0.5"/></g>`;
      const road = `<rect x="38" y="128" width="174" height="39" fill="${k}" opacity="0.28"/>
        <path d="M38,128 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M38,140 H212" stroke="${P}" stroke-width="1.2" stroke-dasharray="10 8"/>`;
      const rain = (seed) => precip(ctx, { seed, step: 8, px: 3, py: 22, dx: 1, dy: 6, dur: '0.6s', color: INK.blue, sw: 0.45, opacity: 0.6 });
      const top = `
        ${sky(INK.blue, 0.16)}
        <rect x="140" y="30" width="72" height="98" fill="${INK.blue}" opacity="0.35"/>
        <path d="${Array.from({ length: 9 }, (_, i) => `M${140 + i * 9},30 V128`).join(' ')} ${Array.from({ length: 12 }, (_, i) => `M140,${30 + i * 8} H212`).join(' ')}" stroke="${P}" stroke-width="0.4" opacity="0.7"/>
        <rect x="38" y="62" width="174" height="10" fill="${P}" stroke="${k}" stroke-width="0.6"/>
        <path d="M38,74 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M70,72 L64,80 H82 L76,72 M176,72 L170,80 H188 L182,72" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        <rect x="68" y="80" width="10" height="48" fill="${P}" stroke="${k}" stroke-width="0.5"/><rect x="174" y="80" width="10" height="48" fill="${P}" stroke="${k}" stroke-width="0.5"/>
        ${road}
        ${swerve(`<g transform="scale(1.1)">${scooter(ctx, INK.green, INK.kaapi)}</g>`, '6s', '0s', 168)}
        ${hole(1)}
        ${rain(31)}`;
      const cab = `<g transform="scale(0.78)">${yellowCab({ still: false, a: (m) => ctx.a(m) })}</g>`;
      const bottom = `
        ${sky(INK.blue, 0.1)}
        <rect x="38" y="80" width="174" height="48" fill="${INK.kaapi}" opacity="0.35"/>
        <rect x="38" y="80" width="174" height="48" fill="url(#${p}-brick)"/>
        <g fill="${P}" stroke="${k}" stroke-width="0.4">${[48, 70, 92, 150, 172, 194].map((x) => `<rect x="${x}" y="90" width="9" height="13"/>`).join('')}</g>
        <rect x="38" y="44" width="174" height="12" fill="${INK.green}" stroke="${k}" stroke-width="0.6"/>
        <path d="M38,56 H212 M38,64 H212" stroke="${k}" stroke-width="0.8"/>
        <path d="${Array.from({ length: 30 }, (_, i) => `M${38 + i * 6},56 L${41 + i * 6},64 L${44 + i * 6},56`).join(' ')}" fill="none" stroke="${k}" stroke-width="0.45"/>
        <path d="M38,42 H212" stroke="${k}" stroke-width="0.8"/>
        <path d="M70,64 V128 M180,64 V128" stroke="${INK.green}" stroke-width="5"/>
        <path d="M70,64 V128 M180,64 V128" stroke="${k}" stroke-width="0.4" stroke-dasharray="1 4"/>
        ${ctx.still ? `<g transform="translate(120 44)">` : `<g>${move('300 44;-160 44', '4s')}`}<path d="M-30,0 v-8 q0,-4 6,-4 h12 l6,6 h6 v6 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/></g>
        ${road}
        ${wisps(ctx, 196, 136, 22, { color: P, sw: 2.6, dur: 4, count: 3, spread: 2, op: 0.8 })}
        ${swerve(cab, '6s', '-3s', 172)}
        ${hole(2)}
        <g transform="translate(160 158)"><path d="M-4,0 L-1,-11 H1 L4,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/><path d="M-2.6,-5 H2.6" stroke="${P}" stroke-width="1.2"/><rect x="-6" y="0" width="12" height="1.6" fill="${k}"/></g>`;

      return {
        top: { city: 'blr', caption: 'OUTER RING ROAD', clause: 'Nobody fixes it.', art: top },
        bottom: { city: 'nyc', caption: 'BQE', clause: 'Everybody knows exactly where it is.', art: bottom }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
