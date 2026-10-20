// Diamonds: Ambition. Early starts, money, the reason you moved.
(function (root) {
  'use strict';
  const T = root.TaleCards || require('../cards.js');
  const { INK, FONT } = T;
  const { W, H, CX, f, rng, scallop, loop, move, spin, easeLoop, easeMove, easeSpin,
    precip, figure, bird, wisps, fallingLeaf, splashes, wheel, autoRickshaw, yellowCab, paperCup } = T.kit;
  const k = INK.ink;

  // ---------- shared drawing helpers ----------
  const bg = (c, op) => `<rect width="${W}" height="${H}" fill="${c}" opacity="${op}"/>`;
  // A quiet ctx for kit vehicles that must sit still (wheels not turning).
  const quiet = (ctx) => ({ id: ctx.id, still: false, a: () => '' });

  // Standing person, feet at (x,y), about 28 tall at s = 1. Faces nobody.
  function person(x, y, o) {
    o = o || {};
    const c = o.c || k, s = o.s || 1;
    return `<g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})">` +
      `<path d="M-4.2,0 L-3.8,-10.5 L-4.8,-19.5 Q-4.8,-21.6 -2.4,-21.6 H2.4 Q4.8,-21.6 4.8,-19.5 L3.8,-10.5 L4.2,0 H1.1 L0,-9 L-1.1,0 Z" fill="${c}"/>` +
      `<circle cy="-25.2" r="3.4" fill="${c}"/>${o.extra || ''}</g>`;
  }
  // Seated person, hip at (x,y), facing right (flip to face left).
  function seated(x, y, o) {
    o = o || {};
    const c = o.c || k, s = o.s || 1;
    return `<g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})">` +
      `<path d="M-4,0 L-4.6,-14 Q-4.6,-16.4 -2.2,-16.4 H2 Q4.4,-16.4 4.4,-14 L4,-3 Z" fill="${c}"/>` +
      `<path d="M-4,-4.4 H9 Q11.4,-4.4 11.4,-2 V0 H-4 Z M8.2,-1 H11.4 V11 H8.2 Z" fill="${c}"/>` +
      `<g>${o.head || `<circle cx="0.6" cy="-20" r="3.4" fill="${c}"/>`}</g>${o.extra || ''}</g>`;
  }
  // Head and shoulders, base centre at (x,y).
  function bust(x, y, c, s, extra) {
    return `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-8,0 C-8,-6 -5,-8.4 0,-8.4 C5,-8.4 8,-6 8,0 Z" fill="${c}"/><circle cy="-12.4" r="4" fill="${c}"/>${extra || ''}</g>`;
  }
  // Raised open hand from the right shoulder (local person frame).
  const raisedHand = (c) => `<path d="M3.8,-19.4 L8.4,-29" stroke="${c}" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="9.2" cy="-31.4" rx="1.9" ry="2.8" fill="${c}"/>`;
  // Hanging bulb with a soft glow; sways about its wire point.
  function bulb(ctx, x, y0, len, o) {
    o = Object.assign({ glow: 22, op: 0.22, sway: 3, dur: '4s', wire: k }, o);
    return `<g>${ctx.a(easeSpin(`0 ${x} ${y0};${o.sway} ${x} ${y0};0 ${x} ${y0};${-o.sway} ${x} ${y0};0 ${x} ${y0}`, o.dur))}
      <circle cx="${x}" cy="${y0 + len + 3}" r="${o.glow}" fill="${INK.yellow}" opacity="${o.op}">${ctx.a(easeLoop('opacity', `${o.op};${f(o.op * 0.55)};${o.op}`, '3s'))}</circle>
      <path d="M${x},${y0} V${y0 + len}" stroke="${o.wire}" stroke-width="0.5"/>
      <rect x="${x - 1.4}" y="${y0 + len - 1}" width="2.8" height="2.4" fill="${k}"/>
      <circle cx="${x}" cy="${y0 + len + 3.2}" r="2.6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/></g>`;
  }
  // Wall clock with fixed hands, or a minute hand that laps every 12 s.
  function clock(ctx, x, y, r, hh, mm, o) {
    o = o || {};
    const ha = (hh % 12 + mm / 60) * 30, ma = mm * 6;
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      ticks += `M${f(x + Math.sin(a) * r * 0.78)},${f(y - Math.cos(a) * r * 0.78)} L${f(x + Math.sin(a) * r * 0.9)},${f(y - Math.cos(a) * r * 0.9)} `;
    }
    return `<g><circle cx="${x}" cy="${y}" r="${r + 1.2}" fill="${o.rim || k}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${INK.paper}"/>
      <path d="${ticks}" stroke="${k}" stroke-width="0.5"/>
      <path d="M${x},${y} V${f(y - r * 0.5)}" stroke="${k}" stroke-width="1.3" stroke-linecap="round" transform="rotate(${f(ha)} ${x} ${y})"/>
      <path d="M${x},${y} V${f(y - r * 0.76)}" stroke="${k}" stroke-width="0.8" stroke-linecap="round" transform="rotate(${f(ma)} ${x} ${y})">${o.spin ? ctx.a(spin(`0 ${x} ${y};360 ${x} ${y}`, '12s')) : ''}</path>
      <circle cx="${x}" cy="${y}" r="0.9" fill="${INK.red}"/>
      ${o.label ? `<text x="${x}" y="${f(y + r + 6.4)}" text-anchor="middle" font-family="${FONT.sans}" font-size="3.4" font-weight="700" letter-spacing="0.5" fill="${o.labelColor || k}">${o.label}</text>` : ''}</g>`;
  }
  // A flag on a pole top at (x,y), stripes stacked top to bottom.
  function flag(ctx, x, y, colors, w, h, dur) {
    const n = colors.length;
    const shape = (b, t0, t1) => {
      const y0 = y + h * t0, y1 = y + h * t1;
      return `M${x},${f(y0)} Q${f(x + w / 2)},${f(y0 + b)} ${x + w},${f(y0 + 1)} L${x + w},${f(y1 + 1)} Q${f(x + w / 2)},${f(y1 + b)} ${x},${f(y1)} Z`;
    };
    return colors.map((c, i) => {
      const a = shape(-1.6, i / n, (i + 1) / n), b = shape(1.6, i / n, (i + 1) / n);
      return `<path d="${a}" fill="${c}" stroke="${k}" stroke-width="0.25">${ctx.a(easeLoop('d', `${a};${b};${a}`, dur || '1s'))}</path>`;
    }).join('') + `<path d="M${x},${y - 1} V${y + h + 14}" stroke="${k}" stroke-width="0.7"/>`;
  }
  // Heap of blooms on the ground: a half-ellipse packed with little flowers.
  function heap(cx, base, rx, ry, color, accent, seed) {
    const r = rng(seed);
    let s = `<path d="M${cx - rx},${base} Q${cx - rx},${base - ry * 1.15} ${cx},${base - ry} Q${cx + rx},${base - ry * 1.15} ${cx + rx},${base} Z" fill="${color}" stroke="${k}" stroke-width="0.5"/>`;
    for (let i = 0; i < Math.round(rx * ry / 9); i++) {
      const a = Math.PI * (0.04 + r() * 0.92), d = Math.sqrt(r()) * 0.92;
      const x = cx - Math.cos(a) * rx * d, y = base - Math.sin(a) * ry * d - 1;
      const rr = f(1.2 + r() * 0.9);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${rr}" fill="${color}" stroke="${k}" stroke-width="0.22"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.35)}" fill="${accent}"/>`;
    }
    return s;
  }
  // Simple sedan, ground at y=0, facing right.
  function sedan(color, brake, ctx) {
    return `<g><ellipse cx="0" cy="0.4" rx="28" ry="1.3" fill="${k}" opacity="0.25"/>
      <path d="M-28,-5 Q-28,-12 -22,-13 L-13,-14 Q-8,-22 -2,-22 L11,-22 Q16,-22 20,-16 L26,-14 Q30,-13 30,-8 L30,-5 Q30,-3 28,-3 L-26,-3 Q-28,-3 -28,-5 Z" fill="${color}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-10,-14 Q-6,-20 -2,-20 L4,-20 L4,-14 Z M6,-20 L10.5,-20 Q14,-20 16.6,-16 L18,-14 L6,-14 Z" fill="${k}" opacity="0.85"/>
      <circle cx="-17" cy="-3.6" r="4" fill="${k}"/><circle cx="-17" cy="-3.6" r="1.5" fill="${INK.paper}"/>
      <circle cx="19" cy="-3.6" r="4" fill="${k}"/><circle cx="19" cy="-3.6" r="1.5" fill="${INK.paper}"/>
      <rect x="-28.4" y="-11" width="2.2" height="3" fill="${INK.red}" opacity="${brake && !ctx.still ? 0.4 : 1}">${brake ? ctx.a(loop('opacity', '1;1;0.4;1', '3s', ` keyTimes="0;0.5;0.6;1" begin="${brake}"`)) : ''}</rect></g>`;
  }
  function brakeGlow(ctx, x, y, begin) {
    return `<circle cx="${x}" cy="${y}" r="4" fill="${INK.red}" opacity="${ctx.still ? 0.35 : 0.1}">${ctx.a(loop('opacity', '0.4;0.4;0.05;0.4', '3s', ` keyTimes="0;0.5;0.6;1" begin="${begin}"`))}</circle>`;
  }
  const walker = (ctx, fig, dur, begin, y, span) => `<g transform="translate(${CX} ${y})">${fig}${ctx.a(move(`${-(span || 110)} 0;${span || 110} 0`, dur, ` begin="${begin}"`))}</g>`;
  // Lit window grid on a dark tower.
  function windows(ctx, x0, y0, cols, rows, dx, dy, w, h, seed, blink) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const lit = r() < 0.6, d = f(r() * 12);
      if (!lit) continue;
      const bl = blink && r() < 0.25;
      s += `<rect x="${f(x0 + i * dx)}" y="${f(y0 + j * dy)}" width="${w}" height="${h}" fill="${INK.yellow}" opacity="0.85">${bl ? ctx.a(loop('opacity', '0.85;0.85;0.1;0.1;0.85', '12s', ` keyTimes="0;0.4;0.42;0.8;0.82" begin="-${d}s"`)) : ''}</rect>`;
    }
    return s;
  }

  // ======================================================================
  // Ace: Where It Ends. Kempegowda's boundary tower x the 1653 palisade.
  // A stone mantapa on Lalbagh rock above, the wall's gatehouse below:
  // two pointed roofs guarding one line.
  // ======================================================================
  T.register({
    id: 'd-a', rank: 'A', suit: 'diamond', title: 'Where It Ends',
    pair: ['Kempegowda tower', 'The Wall Street palisade'],
    sentence: ['Every city begins', 'by deciding where it ends.'],
    why: 'Bengaluru marked its edge with towers. New York built a wall and kept the name.',
    mechanism: 'Tower and gatehouse meet at the seam, two pointed roofs guarding one line. The cities outgrew both.',
    sound: "Dawn birds, a kite's whistle, windmill creak, a gull.",
    draw(ctx) {
      const p = ctx.id;
      const kite = (cx, cy, rx, ry, dur, begin) => ctx.still
        ? `<g transform="translate(${cx + rx} ${cy})">${bird(ctx, k, '1.2s', 1.5)}</g>`
        : `<g><animateMotion path="M${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>${bird(ctx, k, '1.2s', 1.5)}</g>`;
      let rays = '';
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; rays += `<path d="M${f(Math.cos(a) * 15)},${f(Math.sin(a) * 15)} L${f(Math.cos(a) * (i % 2 ? 21 : 26))},${f(Math.sin(a) * (i % 2 ? 21 : 26))}"/>`; }
      const top = `
        ${bg(INK.yellow, 0.2)}
        <rect x="0" y="104" width="${W}" height="70" fill="${INK.pink}" opacity="0.16"/>
        <g>${ctx.a(easeMove('0 0;-10 0;0 0', '12s'))}<path d="${scallop(70, 66, 16, 4, 8, 2.4)}" fill="${INK.paper}" opacity="0.9"/><path d="${scallop(196, 52, 12, 3, 7, 2)}" fill="${INK.paper}" opacity="0.9"/></g>
        <g transform="translate(176 104)"><g stroke="${INK.yellow}" stroke-width="0.8">${ctx.a(spin('0;22.5', '12s'))}${rays}</g><circle r="12" fill="${INK.yellow}"/></g>
        <g fill="${INK.blue}" fill-opacity="0.2" stroke="${k}" stroke-width="0.4">
          <path d="M44,152 V134 H58 V128 Q58,114 70,111 Q82,114 82,128 V134 H96 V152 Z"/>
        </g>
        <path d="M63,128 V152 M70,111 V152 M77,128 V152 M58,134 H82 M44,142 H96 M51,134 V152 M89,134 V152 M58,121 Q70,116 82,121" stroke="${k}" stroke-width="0.3" fill="none"/>
        <g>${ctx.a(easeSpin('0 196 160;1.2 196 160;0 196 160;-1 196 160;0 196 160', '6s'))}
          <path d="${scallop(196, 126, 30, 18, 14, 4)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
          <path d="${scallop(196, 126, 30, 18, 14, 4)}" fill="url(#${p}-leaf)"/>
        </g>
        <path d="M196,167 C197,152 196,144 192,136 M196,150 C200,142 206,138 212,136" fill="none" stroke="${k}" stroke-width="2" stroke-linecap="round"/>
        <path d="${scallop(66, 160, 30, 8, 12, 3)}" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/>
        <path d="M44,167 C62,152 84,138 106,131.5 Q125,127 144,131.5 C166,138 188,152 206,167 Z" fill="${k}" fill-opacity="0.2" stroke="${k}" stroke-width="0.6"/>
        <path d="M44,167 C62,152 84,138 106,131.5 Q125,127 144,131.5 C166,138 188,152 206,167 Z" fill="url(#${p}-hatch)" opacity="0.3"/>
        <path d="M84,150 q8,-3 14,1 M152,146 q8,2 12,8 M110,140 q6,-2 10,0" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g stroke="${k}" stroke-width="0.6" stroke-linejoin="round">
          <rect x="104" y="124" width="42" height="7" fill="${INK.paper}"/>
          <rect x="108" y="119" width="34" height="5" fill="${INK.paper}"/>
          <rect x="110" y="100" width="30" height="19" fill="${k}"/>
          <g fill="${INK.paper}"><rect x="110" y="100" width="4" height="19"/><rect x="118.6" y="100" width="4" height="19"/><rect x="127.4" y="100" width="4" height="19"/><rect x="136" y="100" width="4" height="19"/></g>
          <path d="M103,100 L147,100 L142,94.5 L108,94.5 Z" fill="${INK.paper}"/>
          <rect x="112" y="87" width="26" height="7.5" fill="${INK.paper}"/>
          <rect x="116" y="80" width="18" height="7" fill="${INK.paper}"/>
          <path d="M116.5,80 Q116.5,68 125,64 Q133.5,68 133.5,80 Z" fill="${INK.paper}"/>
          <path d="M123.2,64 L126.8,64 L125.9,59.4 L125,57.6 L124.1,59.4 Z" fill="${INK.yellow}" stroke-width="0.4"/>
        </g>
        <path d="M130,100 H140 V119 M136,94.5 L142,94.5 L147,100 M130,87 H138 V94.5 M129,80 H134 V87 M128.5,66 Q133.5,68 133.5,80 H129 Z" fill="url(#${p}-hatch)" opacity="0.7"/>
        <path d="M112,90.6 H138 M116,83.4 H134" stroke="${k}" stroke-width="0.3"/>
        <path d="M108,97.4 h34" stroke="${k}" stroke-width="0.3"/>
        ${flag(ctx, 125, 46, [INK.red], 9, 5.5, '0.8s')}
        ${kite(100, 58, 30, 9, '12s', '0s')}${kite(160, 64, 22, 7, '6s', '-2s')}
        ${walker(ctx, figure(ctx, { color: k }), '12s', '-3s', 167)}`;

      // New Amsterdam, north edge, 1653.
      let stakes = '';
      const r = rng(77);
      for (let x = 34; x < 216; x += 7) {
        if (x > 103 && x < 141) continue;
        const t = 118 + r() * 5;
        stakes += `<path d="M${x},167 V${f(t + 5)} L${x + 3.5},${f(t)} L${x + 7},${f(t + 5)} V167 Z"/>`;
      }
      let sails = '';
      for (let i = 0; i < 4; i++) sails += `<g transform="rotate(${i * 90 + 20})"><path d="M0,0 V-27" stroke="${k}" stroke-width="0.9"/><rect x="0.8" y="-26" width="5" height="19" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><rect x="0.8" y="-26" width="5" height="19" fill="url(#${p}-hatch)" opacity="0.6"/></g>`;
      const bottom = `
        ${bg(INK.blue, 0.14)}
        <rect x="0" y="100" width="${W}" height="70" fill="${INK.pink}" opacity="0.22"/>
        <circle cx="168" cy="108" r="11" fill="${INK.yellow}" opacity="0.85"/>
        <g>${ctx.a(easeMove('0 0;10 0;0 0', '12s'))}<path d="${scallop(110, 52, 18, 4, 9, 2.4)}" fill="${INK.paper}" opacity="0.9"/><path d="${scallop(186, 70, 13, 3, 7, 2)}" fill="${INK.paper}" opacity="0.9"/></g>
        <g transform="translate(0 0)">
          <path d="M57,150 L61,108 L71,108 L75,150 Z" fill="${INK.kaapi}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5"/>
          <path d="M58.5,108 Q66,98 73.5,108 Z" fill="${k}"/>
          <rect x="63.5" y="128" width="5" height="8" fill="${k}"/>
          <g transform="translate(66 105)">${sails}${ctx.a(spin('0;360', '12s'))}</g>
          <circle cx="66" cy="105" r="1.4" fill="${k}"/>
        </g>
        <g stroke="${k}" stroke-width="0.5">
          <path d="M158,152 V110 H162 V104 H166 V98 H170 V92 H182 V98 H186 V104 H190 V110 H194 V152 Z" fill="${INK.red}" fill-opacity="0.55"/>
          <path d="M194,152 V118 H198 V112 H202 V106 H212 V152 Z" fill="${INK.kaapi}" fill-opacity="0.5"/>
        </g>
        <path d="M158,152 V110 H162 V104 H166 V98 H170 V92 H182 V98 H186 V104 H190 V110 H194 V152 Z" fill="url(#${p}-brick)"/>
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"><rect x="171" y="98" width="10" height="9"/><rect x="164" y="114" width="8" height="10"/><rect x="180" y="114" width="8" height="10"/></g>
        <rect x="185" y="84" width="4" height="9" fill="${k}"/>
        ${wisps(ctx, 187, 82, 22, { color: k, sw: 0.5, dur: 4, count: 3, spread: 2, op: 0.45 })}
        <rect x="38" y="158" width="174" height="9" fill="${INK.kaapi}" opacity="0.3"/>
        <g fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4">${stakes}</g>
        <path d="M34,140 H104 M146,140 H216" stroke="${k}" stroke-width="1.6"/>
        <path d="M34,150 H104 M146,150 H216" stroke="${k}" stroke-width="0.5" opacity="0.6"/>
        <g stroke="${k}" stroke-width="0.6" stroke-linejoin="round">
          <rect x="106" y="102" width="7" height="65" fill="${INK.kaapi}"/>
          <rect x="137" y="102" width="7" height="65" fill="${INK.kaapi}"/>
          <rect x="113" y="114" width="24" height="53" fill="${INK.kaapi}" fill-opacity="0.75"/>
          <path d="M117,114 V167 M121,114 V167 M125,114 V167 M129,114 V167 M133,114 V167" stroke-width="0.3"/>
          <path d="M114,120 H136 L114,150 H136" fill="none" stroke-width="1.1"/>
          <path d="M102,102 H148 V107 H102 Z" fill="${k}"/>
          <path d="M104,102 L125,83 L146,102 Z" fill="${INK.kaapi}"/>
        </g>
        <path d="M125,83 L146,102 H134 Z" fill="url(#${p}-hatch)" opacity="0.7"/>
        <circle cx="132" cy="130" r="1" fill="${k}"/>
        ${flag(ctx, 125, 66, [INK.red, INK.paper, INK.blue], 12, 7.5, '1s')}
        ${ctx.still ? `<g transform="translate(92 66)">${bird(ctx, INK.paper, '0.8s', 1.4)}</g>` : `<g>${move('260 60;120 52;-40 64', '12s', ' begin="-5s"')}${bird(ctx, INK.paper, '0.8s', 1.4)}</g>`}`;

      return {
        top: { city: 'blr', caption: 'LALBAGH', clause: 'Every city begins', art: top },
        bottom: { city: 'nyc', caption: 'WALL STREET', clause: 'by deciding where it ends.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 2: Before Dawn. KR Market x the 28th Street flower district, 6 AM.
  // A marigold heap and a bucket of roses back to back, both lit before
  // the sun turns up.
  // ======================================================================
  T.register({
    id: 'd-2', rank: '2', suit: 'diamond', title: 'Before Dawn',
    pair: ['KR Market', '28th Street flower district'],
    sentence: ['The prettiest hour', 'belongs to the people working it.'],
    why: "Flowers arrive before the sun does, sorted by people who haven't slept.",
    mechanism: 'A marigold heap and a bucket of roses sit back to back across the seam, lit before sunrise.',
    sound: 'Haggling in whispers, a van idling, buckets on concrete.',
    draw(ctx) {
      const p = ctx.id;
      const stars = (seed) => { const r = rng(seed); let s = ''; for (let i = 0; i < 14; i++) s += `<circle cx="${f(42 + r() * 166)}" cy="${f(36 + r() * 22)}" r="${f(0.3 + r() * 0.35)}" fill="${INK.paper}" opacity="0.8"/>`; return s; };
      let arches = '';
      for (let x = 44; x < 206; x += 20) arches += `<path d="M${x},132 V112 Q${x + 6},103 ${x + 12},112 V132 Z" fill="${(x / 20) % 3 < 1 ? INK.yellow : k}" opacity="${(x / 20) % 3 < 1 ? 0.75 : 0.5}"/>`;
      let upper = '';
      for (let x = 48; x < 206; x += 20) upper += `<rect x="${x}" y="80" width="6" height="11" fill="${k}" opacity="0.5"/>`;
      const sack = (x, w) => `<g><path d="M${x - w / 2},167 Q${x - w / 2 - 2},146 ${x - w / 2 + 2},136 H${x + w / 2 - 2} Q${x + w / 2 + 2},146 ${x + w / 2},167 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.45"/><path d="M${x - w / 2 + 2},136 H${x + w / 2 - 2}" fill="none" stroke="url(#${p}-hatch)"/>${heap(x, 138, w / 2 - 1, 6, INK.yellow, INK.red, x)}</g>`;
      const top = `
        ${bg(k, 0.86)}
        <rect x="0" y="96" width="${W}" height="80" fill="${INK.blue}" opacity="0.3"/>
        ${stars(3)}
        <rect x="38" y="68" width="174" height="66" fill="${INK.blue}" fill-opacity="0.45" stroke="${INK.paper}" stroke-width="0.35"/>
        <path d="M38,72 H212 M38,96 H212" stroke="${INK.paper}" stroke-width="0.4" opacity="0.5"/>
        ${upper}${arches}
        <path d="M38,42 Q125,62 212,44" fill="none" stroke="${INK.paper}" stroke-width="0.4" opacity="0.7"/>
        <rect x="38" y="148" width="174" height="19" fill="${INK.kaapi}" opacity="0.6"/>
        <rect x="38" y="148" width="174" height="19" fill="url(#${p}-hatch)" opacity="0.3"/>
        ${sack(50, 18)}
        ${walker(ctx, figure(ctx, { color: INK.paper }), '12s', '-2s', 150, 120)}
        ${heap(70, 167, 22, 20, INK.pink, INK.red, 5)}
        ${heap(125, 167, 32, 34, INK.yellow, INK.red, 9)}
        ${heap(178, 167, 18, 13, INK.paper, INK.green, 13)}
        <g transform="translate(200 167)">
          <path d="M-9,0 Q-10,-14 -4,-18 Q0,-26 4,-18 Q10,-14 9,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
          <circle cx="0" cy="-21" r="3.6" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
          <g>${ctx.a(easeSpin('0 -4 -12;-14 -4 -12;0 -4 -12', '3s'))}<path d="M-4,-12 L-14,-6" stroke="${INK.red}" stroke-width="2.4" stroke-linecap="round"/></g>
        </g>
        ${bulb(ctx, 125, 56, 18, { glow: 22, op: 0.16, wire: INK.paper })}
        ${fallingLeaf(ctx, 112, 100, 46, INK.yellow, '6s', '0s')}${fallingLeaf(ctx, 140, 96, 50, INK.pink, '6s', '-3s')}`;

      const bunch = (x, h, colors, seed, sway) => {
        const r = rng(seed);
        let stems = '', blooms = '';
        for (let i = 0; i < 7; i++) {
          const bx = x - 9 + r() * 18, by = 151 - h + r() * 10;
          stems += `M${f(x - 4 + i * 1.3)},152 L${f(bx)},${f(by)} `;
          blooms += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(2.4 + r() * 1.2)}" fill="${colors[i % colors.length]}" stroke="${k}" stroke-width="0.3"/>`;
        }
        return `<g>${sway ? ctx.a(easeSpin(`0 ${x} 152;2.5 ${x} 152;0 ${x} 152;-2.5 ${x} 152;0 ${x} 152`, '4s', ` begin="-${seed % 4}s"`)) : ''}<path d="${stems}" stroke="${INK.green}" stroke-width="0.7" fill="none"/>${blooms}</g>`;
      };
      const bucket = (x, w, c) => `<path d="M${x - w / 2},150 L${x + w / 2},150 L${x + w / 2 - 2.4},167 L${x - w / 2 + 2.4},167 Z" fill="${c}" stroke="${k}" stroke-width="0.5"/><path d="M${x - w / 2 + 0.6},153 H${x + w / 2 - 0.6}" stroke="${k}" stroke-width="0.35"/>`;
      const bottom = `
        ${bg(k, 0.86)}
        <rect x="0" y="96" width="${W}" height="80" fill="${INK.blue}" opacity="0.3"/>
        ${stars(8)}
        <rect x="38" y="44" width="174" height="106" fill="${INK.red}" opacity="0.32"/>
        <rect x="38" y="44" width="174" height="106" fill="url(#${p}-brick)" opacity="0.6"/>
        <g fill="${k}" opacity="0.55"><rect x="62" y="52" width="10" height="14"/><rect x="88" y="52" width="10" height="14"/><rect x="162" y="52" width="10" height="14"/><rect x="188" y="52" width="10" height="14"/></g>
        <rect x="88" y="52" width="10" height="14" fill="${INK.yellow}" opacity="0.8"/>
        <g stroke="${INK.paper}" stroke-width="0.45" fill="none" opacity="0.8"><path d="M156,70 H204 M156,74 H204 M160,70 L178,52 M156,52 H204"/></g>
        <path d="M56,84 H194 L198,96 H52 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <text x="125" y="92.6" text-anchor="middle" font-family="${FONT.sans}" font-size="5.2" font-weight="700" letter-spacing="1" fill="${INK.paper}">WHOLESALE FLOWERS</text>
        <rect x="58" y="96" width="134" height="54" fill="${INK.yellow}" opacity="0.5"/>
        <path d="M58,96 V150 M125,96 V150 M192,96 V150" stroke="${k}" stroke-width="0.6"/>
        <g fill="${INK.green}" opacity="0.55">${[66, 80, 96, 138, 152, 170, 184].map((x) => `<path d="M${x - 5},150 Q${x},128 ${x + 5},150 Z"/>`).join('')}</g>
        <path d="M44,167 V58 Q44,52 50,52 H58" fill="none" stroke="${k}" stroke-width="1.4"/>
        <path d="M54,50 h10 v4 h-10 Z" fill="${k}"/>
        <path d="M54,54 L48,74 H70 L64,54 Z" fill="${INK.yellow}" opacity="${ctx.still ? 0.3 : 0.3}">${ctx.a(easeLoop('opacity', '0.3;0.18;0.3', '3s'))}</path>
        <rect x="38" y="150" width="174" height="17" fill="${INK.paper}" opacity="0.2"/>
        <g transform="translate(206 167)">
          <rect x="-26" y="-50" width="40" height="44" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
          <rect x="-26" y="-50" width="5" height="44" fill="${k}" opacity="0.8"/>
          <path d="M-26,-12 H14" stroke="${k}" stroke-width="0.4"/>
          ${wheel(quiet(ctx), -10, '1s')}
          <rect x="-29" y="-20" width="3" height="4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.3">${ctx.a(loop('opacity', '1;0.15;1', '1s'))}</rect>
        </g>
        ${bucket(66, 15, INK.blue)}${bunch(66, 20, [INK.pink, INK.paper], 2, false)}
        ${bucket(90, 15, INK.paper)}${bunch(90, 26, [INK.yellow], 3, true)}
        ${bunch(125, 34, [INK.red, INK.red, INK.pink], 5, true)}${bucket(125, 22, k)}
        ${bucket(160, 15, INK.blue)}${bunch(160, 24, [INK.paper, INK.pink], 7, false)}
        ${walker(ctx, figure(ctx, { color: INK.paper, extra: `<path d="M3,-10 h5 l-0.8,5 h-3.4 Z" fill="${INK.blue}" stroke="${INK.paper}" stroke-width="0.3"/>` }), '12s', '-8s', 167, 120)}`;

      return {
        top: { city: 'blr', caption: 'KR MARKET', clause: 'The prettiest hour', art: top },
        bottom: { city: 'nyc', caption: '28TH STREET', clause: 'belongs to the people working it.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 3: Same Seat. The company shuttle x Metro-North, 8 AM.
  // Same window, same lean. The two sleepers nod in sync.
  // ======================================================================
  function windowRow(ctx, glass, glassOp, sleeper) {
    const head = (x, tilt) => `<g>${bust(x, 124, k, 1, '')}</g>`;
    return `
      <g fill="${glass}" fill-opacity="${glassOp}" stroke="${k}" stroke-width="0.6">
        <rect x="40" y="96" width="52" height="28" rx="2"/><rect x="100" y="96" width="50" height="28" rx="2"/><rect x="158" y="96" width="52" height="28" rx="2"/>
      </g>
      <g opacity="0.85">${head(56)}${head(190)}
        <path d="M76,124 C76,118 79,116 84,116 C89,116 92,118 92,124 Z" fill="${k}"/><circle cx="84" cy="111" r="3.6" fill="${k}"/>
        <rect x="88" y="104" width="2.4" height="5" rx="0.5" fill="${INK.paper}" stroke="${k}" stroke-width="0.3" transform="rotate(10 89 106)"/>
      </g>
      <g>
        <path d="M114,124 C114,116 120,113.6 127,113.6 C133,113.6 138,116 138,124 Z" fill="${k}"/>
        <g>${ctx.a(easeSpin('0 128 114;-7 128 114;0 128 114;-2 128 114;0 128 114', '4s'))}
          <g transform="rotate(22 128 114)"><circle cx="128" cy="109" r="4.3" fill="${k}"/></g>
        </g>
        <path d="M138,98 Q144,98 146,104" fill="none" stroke="${INK.paper}" stroke-width="0.8" opacity="0.8"/>
      </g>
      <path d="M150,96 V124 M92,96 V124" stroke="${k}" stroke-width="1.2"/>`;
  }
  T.register({
    id: 'd-3', rank: '3', suit: 'diamond', title: 'Same Seat',
    pair: ['Company shuttle', 'Metro-North'],
    sentence: ['Same seat every morning.', 'Same nap.'],
    why: 'Two thousand mornings, one window, zero memory of the commute.',
    mechanism: 'Bus window above, train window below. Same seat, same lean, the heads nod in sync.',
    sound: 'Engine hum, a horn, rails clacking, one soft snore.',
    draw(ctx) {
      let piers = '';
      for (let i = 0; i < 7; i++) piers += `<rect x="${20 + i * 46}" y="64" width="9" height="90" fill="${k}" opacity="0.18"/><path d="M${24.5 + i * 46},54 V40 M${21.5 + i * 46},41 h6" stroke="${k}" stroke-width="0.6"/>`;
      const top = `
        ${bg(INK.yellow, 0.18)}
        <circle cx="62" cy="48" r="10" fill="${INK.yellow}" opacity="0.8"/>
        <g>${ctx.a(move('0 0;-46 0', '1.5s'))}${piers}</g>
        <rect x="30" y="54" width="200" height="10" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M30,58 H230" stroke="${k}" stroke-width="0.3"/>
        <rect x="38" y="150" width="174" height="17" fill="${k}" opacity="0.12"/>
        <g>${ctx.a(move('0 0;-30 0', '0.6s'))}<path d="${Array.from({ length: 9 }, (_, i) => `M${30 + i * 30},163.5 h14`).join(' ')}" stroke="${INK.paper}" stroke-width="1"/></g>
        <g>${ctx.a(easeMove('0 0;0 -1;0 0', '0.6s'))}
          <path d="M30,158 V96 Q30,86 40,86 H222 V158 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
          <rect x="30" y="129" width="192" height="4" fill="${INK.red}"/>
          <rect x="30" y="136" width="192" height="14" fill="${INK.blue}" opacity="0.7"/>
          <path d="M30,150 H222" stroke="${k}" stroke-width="0.5"/>
          ${windowRow(ctx, INK.blue, 0.35)}
          <path d="M44,90 H206" stroke="${k}" stroke-width="0.3"/>
        </g>
        <path d="M54,158 a16,14 0 0 1 32,0 Z M164,158 a16,14 0 0 1 32,0 Z" fill="${k}"/>
        <g transform="translate(0 167)">${wheel(ctx, 70, '0.4s')}${wheel(ctx, 180, '0.4s')}</g>`;

      let cols = '', lamps = '';
      for (let i = 0; i < 9; i++) cols += `<rect x="${30 + i * 30}" y="36" width="5" height="120" fill="${INK.paper}" opacity="0.08"/>`;
      for (let i = 0; i < 7; i++) lamps += `<rect x="${30 + i * 40}" y="52" width="9" height="2.6" rx="1" fill="${INK.yellow}"/><rect x="${26 + i * 40}" y="49" width="17" height="9" rx="4" fill="${INK.yellow}" opacity="0.18"/>`;
      const bottom = `
        ${bg(k, 0.88)}
        <g>${ctx.a(move('0 0;-30 0', '1s'))}${cols}</g>
        <g>${ctx.a(move('0 0;-40 0', '0.8s'))}${lamps}</g>
        <path d="M38,166 H212" stroke="${INK.paper}" stroke-width="0.8" opacity="0.5"/>
        <g>${ctx.a(easeMove('0 0;0 -0.7;0 0', '0.5s'))}
          <path d="M28,156 V92 Q28,84 36,84 H222 V156 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
          <path d="M28,92 H222 M28,140 H222" stroke="${k}" stroke-width="0.3"/>
          ${Array.from({ length: 30 }, (_, i) => `<path d="M${30 + i * 6.4},142 V154" stroke="${k}" stroke-width="0.25" opacity="0.5"/>`).join('')}
          <rect x="28" y="128" width="194" height="4.5" fill="${INK.blue}"/>
          <rect x="28" y="133.6" width="194" height="1.8" fill="${INK.red}"/>
          ${windowRow(ctx, INK.yellow, 0.55)}
        </g>
        <g fill="${k}"><rect x="48" y="156" width="46" height="6"/><rect x="156" y="156" width="46" height="6"/></g>
        <g fill="${k}" stroke="${INK.paper}" stroke-width="0.4"><circle cx="56" cy="162" r="4"/><circle cx="86" cy="162" r="4"/><circle cx="164" cy="162" r="4"/><circle cx="194" cy="162" r="4"/></g>`;

      return {
        top: { city: 'blr', caption: 'ELECTRONIC CITY', clause: 'Same seat every morning.', art: top },
        bottom: { city: 'nyc', caption: 'GRAND CENTRAL', clause: 'Same nap.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 4: Pitch Deck. A Koramangala café x a DUMBO coworking floor, 10 AM.
  // Two tables back to back, two laptops, and on both screens the bars
  // keep climbing.
  // ======================================================================
  function pitchScreen(ctx, label) {
    const bars = [[150, 8], [162, 14], [174, 22], [186, 32]];
    return `<rect x="140" y="40" width="64" height="46" fill="${k}" rx="1"/>
      <rect x="143" y="43" width="58" height="40" fill="${INK.paper}"/>
      <text x="146" y="49.6" font-family="${FONT.sans}" font-size="4" font-weight="700" letter-spacing="0.4" fill="${k}">${label}</text>
      ${bars.map(([x, h], i) => {
        const lo = f(h * 0.35);
        return `<rect x="${x}" y="${80 - h}" width="8" height="${h}" fill="${i === 3 ? INK.green : INK.red}">${ctx.a(easeLoop('height', `${lo};${h};${h};${lo}`, '6s', ` begin="-${f(i * 0.3)}s"`) + easeLoop('y', `${80 - lo};${80 - h};${80 - h};${80 - lo}`, '6s', ` begin="-${f(i * 0.3)}s"`))}</rect>`;
      }).join('')}
      <path d="M146,80 H200" stroke="${k}" stroke-width="0.4"/>
      <path d="M150,70 L190,46 M185,46 H190 V51" fill="none" stroke="${k}" stroke-width="0.6"/>
      <path d="M172,86 V92 M164,92 H180" stroke="${k}" stroke-width="0.8"/>`;
  }
  function pitchTable(ctx, cupL, cupR, stickers, armDur) {
    return `
      ${seated(70, 148, { c: k, s: 1.25, extra: `<g>${ctx.a(easeSpin('0 3 -14;-30 3 -14;-30 3 -14;0 3 -14', armDur, ''))}<path d="M3,-14 L12,-10" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/></g>` })}
      ${seated(180, 148, { c: INK.kaapi, s: 1.25, flip: true, extra: `<path d="M3,-13 L12,-9" stroke="${INK.kaapi}" stroke-width="2.2" stroke-linecap="round"/>` })}
      <rect x="80" y="137" width="90" height="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
      <path d="M90,141 V167 M160,141 V167" stroke="${k}" stroke-width="1.6"/>
      <path d="M106,137 L109,113 H141 L144,137 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M106,137 L109,113 H141 L144,137 Z" fill="${k}" opacity="0.12"/>
      ${stickers}
      <path d="M102,137.4 H148" stroke="${k}" stroke-width="1.2"/>
      ${cupL}${cupR}`;
  }
  T.register({
    id: 'd-4', rank: '4', suit: 'diamond', title: 'Pitch Deck',
    pair: ['Koramangala café', 'DUMBO coworking'],
    sentence: ['Every table is a startup.', 'Every startup needs more coffee.'],
    why: 'Koramangala and DUMBO, where every chart goes up and every cup goes empty.',
    mechanism: 'Two tables back to back. On both screens the bars keep climbing, and so does the caffeine.',
    sound: "Keyboards, an espresso machine, someone saying 'pivot' twice.",
    draw(ctx) {
      const p = ctx.id;
      const mug = (x) => `<path d="M${x - 3.5},130 h7 l-0.6,7 h-5.8 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><path d="M${x + 3.3},131.5 q2.6,0 2.2,2.4 q-0.4,1.8 -2.5,1.6" fill="none" stroke="${k}" stroke-width="0.5"/>`;
      const top = `
        ${bg(INK.yellow, 0.14)}
        <rect x="38" y="150" width="174" height="17" fill="${INK.kaapi}" opacity="0.28"/>
        <path d="M38,150 H212" stroke="${k}" stroke-width="0.5"/>
        <rect x="46" y="40" width="44" height="52" fill="${k}" stroke="${INK.kaapi}" stroke-width="1.6"/>
        <text x="68" y="55" text-anchor="middle" font-family="${FONT.kn}" font-size="8.5" font-weight="700" fill="${INK.paper}">ಕಾಫಿ</text>
        <g font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${INK.paper}" letter-spacing="0.4">
          <text x="51" y="66">FILTER</text><text x="80" y="66" text-anchor="end">60</text>
          <text x="51" y="74">COLD BREW</text><text x="85" y="74" text-anchor="end">180</text>
          <text x="51" y="82">WAFFLE</text><text x="85" y="82" text-anchor="end">220</text>
        </g>
        ${pitchScreen(ctx, 'TRACTION')}
        <g transform="translate(52 167)">
          <path d="M-7,0 L-8,-12 H8 L7,0 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
          <g>${ctx.a(easeSpin('0 0 -12;2 0 -12;0 0 -12;-2 0 -12;0 0 -12', '6s'))}
            <path d="M0,-12 C-2,-30 -10,-40 -14,-44 M0,-12 C2,-28 8,-40 14,-46 M0,-12 V-50" stroke="${INK.green}" stroke-width="0.8" fill="none"/>
            <path d="M-14,-44 q-6,-6 -2,-12 q8,2 2,12 Z M14,-46 q6,-8 0,-12 q-6,4 0,12 Z M0,-50 q-5,-6 0,-12 q5,6 0,12 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
          </g>
        </g>
        ${bulb(ctx, 116, 30, 16, { glow: 18, op: 0.25, sway: 1.5 })}
        ${pitchTable(ctx, mug(94) + wisps(ctx, 94, 128, 16, { count: 3, spread: 2, op: 0.45 }), mug(156),
          `<circle cx="117" cy="121" r="3" fill="${INK.red}"/><rect x="128" y="118" width="7" height="4" fill="${INK.green}" transform="rotate(-10 131 120)"/><path d="M124,129 l3,-2 l3,2 v3 l-3,2 l-3,-2 Z" fill="${INK.yellow}"/>`, '3s')}`;

      const bottom = `
        ${bg(INK.red, 0.18)}
        <rect x="38" y="20" width="174" height="130" fill="url(#${p}-brick)" opacity="0.7"/>
        <rect x="38" y="150" width="174" height="17" fill="${k}" opacity="0.16"/>
        <path d="M38,150 H212" stroke="${k}" stroke-width="0.5"/>
        <rect x="44" y="36" width="76" height="82" fill="${INK.blue}" fill-opacity="0.22"/>
        <rect x="44" y="100" width="76" height="18" fill="${INK.blue}" fill-opacity="0.35"/>
        <g stroke="${k}" stroke-width="0.4" fill="none">
          <path d="M71,60 Q58,88 44,92 M93,60 Q106,88 120,92"/>
          <path d="M71,62 L48,96 M71,62 L56,96 M71,62 L63,96 M93,62 L116,96 M93,62 L108,96 M93,62 L101,96"/>
          <path d="M50,96 V90 M56,96 V86.4 M62,96 V81 M114,96 V90 M108,96 V86.4 M102,96 V81" stroke-width="0.3"/>
        </g>
        <path d="M44,96 H120 V99 H44 Z" fill="${k}"/>
        <path d="M70,118 V60 L72,55 H92 L94,60 V118 Z" fill="${INK.kaapi}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/>
        <path d="M70,118 V60 L72,55 H92 L94,60 V118 Z" fill="url(#${p}-hatch)" opacity="0.25"/>
        <path d="M73.6,97 V76 Q73.6,68 77.6,65 Q81.6,68 81.6,76 V97 Z M82.4,97 V76 Q82.4,68 86.4,65 Q90.4,68 90.4,76 V97 Z" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.4"/>
        <path d="M70,60 H94 M70,104 H94" stroke="${k}" stroke-width="0.4"/>
        <g stroke="${k}" stroke-width="1.4" fill="none"><rect x="44" y="36" width="76" height="82"/></g><path d="M60,36 V118 M104,36 V118 M44,52 H120 M44,108 H120" stroke="${k}" stroke-width="0.8"/>
        ${pitchScreen(ctx, 'SERIES A')}
        <g transform="translate(200 167)"><path d="M-6,0 V-26 H6 V0 Z" fill="${k}" opacity="0.7"/><path d="M-6,-20 H6 M-6,-13 H6 M-6,-6 H6" stroke="${INK.paper}" stroke-width="0.4"/></g>
        ${bulb(ctx, 130, 30, 16, { glow: 16, op: 0.26, sway: 1.5 })}
        ${pitchTable(ctx, paperCup(94, 132.5, 0, 0.19) + wisps(ctx, 94, 127, 16, { count: 3, spread: 2, op: 0.45 }), paperCup(156, 132.5, 0, 0.19),
          `<rect x="114" y="118" width="9" height="5" fill="${INK.yellow}" transform="rotate(8 118 120)"/><circle cx="134" cy="122" r="3.2" fill="${INK.blue}"/><path d="M118,128 h8 v4 h-8 Z" fill="${INK.pink}"/>`, '4s')}`;

      return {
        top: { city: 'blr', caption: 'KORAMANGALA', clause: 'Every table is a startup.', art: top },
        bottom: { city: 'nyc', caption: 'DUMBO', clause: 'Every startup needs more coffee.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 5: Lunch Hour. A tech park food court x a Midtown salad line, noon.
  // Both queues shuffle forward one step at a time; the clocks lap.
  // ======================================================================
  function queue(ctx, colors, y, s, lanyard) {
    let q = '';
    for (let i = -1; i < 12; i++) {
      const c = colors[((i % colors.length) + colors.length) % colors.length];
      q += person(20 + i * 18, y, { c, s, extra: lanyard ? `<path d="M-2.4,-21.4 L0,-15 L2.4,-21.4" fill="none" stroke="${INK.paper}" stroke-width="0.4"/><rect x="-1.4" y="-15" width="2.8" height="3.4" fill="${INK.yellow}"/>` : '' });
    }
    // One step every 3 s; four steps per film.
    return `<g>${ctx.a(move('0 0;0 0;18 0', '3s', ' calcMode="spline" keyTimes="0;0.55;1" keySplines="0 0 1 1;0.45 0 0.55 1"'))}${q}</g>`;
  }
  // The phone in the middle of the Fastest Finger card. Countdown, three
  // frantic taps, then the stamp. One 12 s film.
  function bookingPhone(ctx, stampText, stampSize) {
    const disc = (vals, times) => ctx.a(loop('opacity', vals, '12s', ` calcMode="discrete" keyTimes="${times}"`));
    const count = ['00:03', '00:02', '00:01', 'LIVE'].map((t, i) => {
      const on = ['1;0;0', '0;1;0;0', '0;0;1;0;0', '0;0;0;1;0'][i];
      const kt = ['0;0.083;1', '0;0.083;0.166;1', '0;0.083;0.166;0.25;1', '0;0.083;0.166;0.25;1'][i];
      // Print frame shows LIVE.
      return `<text x="125" y="89" text-anchor="middle" font-family="${FONT.sans}" font-size="5.2" font-weight="700" fill="${i === 3 ? INK.red : k}" opacity="${ctx.still ? (i === 3 ? 1 : 0) : (i === 0 ? 1 : 0)}">${t}${disc(on, kt)}</text>`;
    }).join('');
    let pills = '';
    for (let i = 0; i < 4; i++) {
      const y = 95 + i * 10;
      pills += `<rect x="112" y="${y}" width="26" height="7" rx="3.5" fill="${INK.green}"/>
        <text x="125" y="${y + 5}" text-anchor="middle" font-family="${FONT.sans}" font-size="3.4" font-weight="700" fill="${INK.paper}">${['12:30', '1:30', '7:00', '8:30'][i]}</text>
        <rect x="112" y="${y}" width="26" height="7" rx="3.5" fill="${k}" opacity="${ctx.still ? 0.55 : 0}">${ctx.a(loop('opacity', '0;0;0.55;0.55;0', '12s', ` keyTimes="0;${(0.27 + i * 0.012).toFixed(3)};${(0.29 + i * 0.012).toFixed(3)};0.95;1"`))}</rect>`;
    }
    return `<g>
      <rect x="105" y="70" width="40" height="80" rx="6" fill="${k}"/>
      <rect x="108.5" y="76" width="33" height="66" rx="2.5" fill="${INK.paper}"/>
      <rect x="120" y="72.4" width="10" height="1.6" rx="0.8" fill="${INK.paper}" opacity="0.5"/>
      ${count}
      ${pills}
      <g transform="translate(125 112) rotate(-14)" opacity="${ctx.still ? 1 : 0}">${ctx.a(loop('opacity', '0;0;1;1;0', '12s', ' keyTimes="0;0.31;0.32;0.94;1"'))}
        <rect x="-19" y="-6.5" width="38" height="13" rx="1.2" fill="${INK.paper}" stroke="${INK.red}" stroke-width="1.2"/>
        <text y="2" text-anchor="middle" font-family="${FONT.sans}" font-size="${stampSize}" font-weight="700" letter-spacing="0.4" fill="${INK.red}">${stampText}</text>
      </g>
      <g transform="translate(146 132)">${ctx.a(move('0 0;0 0;-5 -3;0 0;-5 -3;0 0;-5 -3;0 0;0 0', '12s', ' keyTimes="0;0.25;0.262;0.274;0.286;0.298;0.31;0.322;1"'))}
        <path d="M-6,4 C-10,0 -11,-6 -7,-8 C-4,-9.4 -1,-6 2,-2 L12,10 L6,22 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
      </g>
    </g>`;
  }
  T.register({
    id: 'd-5', rank: '5', suit: 'diamond', title: 'Fastest Finger',
    pair: ['Naru Noodle Bar', '4 Charles Prime Rib'],
    sentence: ['The table was gone', 'before the page loaded.'],
    why: '', mechanism: '', sound: '',
    draw(ctx) {
      const stools = Array.from({ length: 8 }, (_, i) => {
        const x = 48 + i * 22;
        return `<path d="M${x},167 V154 M${x - 3},167 L${x},158 L${x + 3},167" stroke="${k}" stroke-width="0.8" fill="none"/><ellipse cx="${x}" cy="153" rx="5" ry="1.6" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>`;
      }).join('');
      const bowl = (x, y) => `<g transform="translate(${x} ${y})">
        <path d="M-12,0 H12 Q11,9 0,10 Q-11,9 -12,0 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M-10,3 H10" stroke="${INK.red}" stroke-width="0.8"/>
        <ellipse cx="0" cy="0" rx="12" ry="2" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
        <circle cx="-4" cy="-0.3" r="1.8" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/><circle cx="-4" cy="-0.3" r="0.8" fill="${INK.yellow}"/>
        <path d="M3,-0.5 h5" stroke="${INK.green}" stroke-width="1.2"/>
        <path d="M2,-1 C2,-8 6,-12 8,-20 M4,-1 C4,-8 8,-12 10,-19" stroke="${INK.yellow}" stroke-width="0.6" fill="none"/>
        <path d="M6,-26 L11,-2 M9,-26 L12,-2" stroke="${INK.kaapi}" stroke-width="0.8"/>
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.16"/>
        <rect x="38" y="34" width="174" height="2" fill="${INK.kaapi}"/>
        <path d="M58,36 H192 V64 H58 Z" fill="${k}"/>
        <path d="M80,40 V64 M102,40 V64 M148,40 V64 M170,40 V64" stroke="${INK.yellow}" stroke-width="0.8" opacity="0.3"/>
        <circle cx="125" cy="49" r="7" fill="${INK.paper}"/>
        <path d="M120,48 H130 Q129.5,53 125,53.6 Q120.5,53 120,48 Z" fill="${k}"/>
        <path d="M122,46.5 c0,-2 2,-2 2,-4 M126,46.5 c0,-2 2,-2 2,-4" stroke="${k}" stroke-width="0.5" fill="none"/>
        <g opacity="0.9"><rect x="44" y="80" width="40" height="30" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <text x="64" y="90" text-anchor="middle" font-family="${FONT.sans}" font-size="4" font-weight="700" fill="${k}">8 SEATS</text>
          <text x="64" y="98" text-anchor="middle" font-family="${FONT.sans}" font-size="3.2" fill="${k}">BOOKINGS OPEN</text>
          <text x="64" y="104" text-anchor="middle" font-family="${FONT.sans}" font-size="3.2" fill="${k}">MONDAYS</text></g>
        <rect x="38" y="128" width="174" height="7" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="135" width="174" height="32" fill="${INK.kaapi}" opacity="0.35"/>
        ${stools}
        ${bowl(186, 118)}
        ${wisps(ctx, 186, 112, 22, { dur: 3, count: 3, spread: 3, op: 0.5 })}
        ${bookingPhone(ctx, 'SOLD OUT', 6)}`;
      const frames = [52, 82, 168, 198].map((x, i) => `<rect x="${x - 10}" y="40" width="20" height="16" fill="${INK.paper}" stroke="${INK.yellow}" stroke-width="1.6"/><path d="M${x - 6},52 L${x - 1},${46 + (i % 2) * 2} L${x + 5},52 Z" fill="${INK.green}" opacity="0.7"/>`).join('');
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.kaapi}" opacity="0.6"/>
        <path d="${Array.from({ length: 12 }, (_, i) => `M${44 + i * 15},20 V120`).join(' ')}" stroke="${k}" stroke-width="0.4" opacity="0.5"/>
        <rect x="38" y="66" width="174" height="2" fill="${INK.yellow}" opacity="0.6"/>
        ${frames}
        <circle cx="72" cy="80" r="9" fill="${INK.yellow}" opacity="0.35">${ctx.a(easeLoop('opacity', '0.35;0.2;0.35', '4s'))}</circle>
        <path d="M68,70 h8 l2,8 h-12 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <rect x="38" y="118" width="174" height="34" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        ${Array.from({ length: 10 }, (_, i) => `<circle cx="${46 + i * 18}" cy="128" r="0.9" fill="${k}" opacity="0.6"/><circle cx="${55 + i * 18}" cy="140" r="0.9" fill="${k}" opacity="0.6"/>`).join('')}
        <rect x="38" y="146" width="174" height="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <rect x="38" y="152" width="174" height="15" fill="${k}" opacity="0.5"/>
        <g transform="translate(66 145)">
          <ellipse cx="0" cy="0" rx="15" ry="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <path d="M-9,-1 Q-9,-7 -2,-8 Q7,-8 8,-2 Q0,0 -9,-1 Z" fill="${INK.pink}" stroke="${INK.kaapi}" stroke-width="1.2"/>
        </g>
        <g transform="translate(188 145)">
          <path d="M-6,-14 H6 L0,-6 Z" fill="${INK.paper}" fill-opacity="0.6" stroke="${k}" stroke-width="0.5"/>
          <path d="M0,-6 V0 M-3,0 H3" stroke="${k}" stroke-width="0.6"/><circle cx="1.5" cy="-11" r="1" fill="${INK.green}"/>
        </g>
        ${bookingPhone(ctx, 'FULLY BOOKED', 4.3)}`;
      return {
        top: { city: 'blr', caption: 'NARU NOODLE BAR', hour: 'MONDAY', clause: 'The table was gone', art: top },
        bottom: { city: 'nyc', caption: '4 CHARLES ST', hour: '9 AM', clause: 'before the page loaded.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 6: Name Your Price. Commercial Street x Canal Street, 2 PM.
  // Two stalls back to back, raised hands either side, a blank tag
  // swinging in the middle.
  // ======================================================================
  function haggle(ctx, cloth, goods) {
    const hand = (dur, begin) => `<g>${ctx.a(easeSpin('0 3.8 -19.4;-14 3.8 -19.4;0 3.8 -19.4', dur, ` begin="${begin}"`))}${raisedHand(k)}</g>`;
    return `
      ${person(84, 167, { c: k, s: 1.25, extra: hand('1.2s', '0s') })}
      ${person(168, 167, { c: INK.kaapi, s: 1.25, flip: true, extra: `<g>${ctx.a(easeSpin('0 3.8 -19.4;-14 3.8 -19.4;0 3.8 -19.4', '1.5s', ' begin="-0.4s"'))}${raisedHand(INK.kaapi)}</g>` })}
      <rect x="98" y="139" width="54" height="3" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
      <path d="M98,142 H152 V167 H98 Z" fill="${cloth}" stroke="${k}" stroke-width="0.5"/>
      <path d="M98,146 H152" stroke="${INK.yellow}" stroke-width="1.4"/>
      ${goods}
      <g>${ctx.a(easeSpin('0 125 142;12 125 142;0 125 142;-12 125 142;0 125 142', '3s'))}
        <path d="M125,142 V149" stroke="${k}" stroke-width="0.4"/>
        <path d="M121,149 H129 V160 L125,163 L121,160 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <circle cx="125" cy="151.6" r="0.9" fill="${k}"/>
      </g>`;
  }
  const handbag = (x, y, c, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-4,-8 Q0,-15 4,-8" fill="none" stroke="${k}" stroke-width="0.8"/><path d="M-7,-8 H7 L8,4 H-8 Z" fill="${c}" stroke="${k}" stroke-width="0.5"/><path d="M-7.5,-3 H7.5" stroke="${k}" stroke-width="0.3"/></g>`;
  T.register({
    id: 'd-6', rank: '6', suit: 'diamond', title: 'Name Your Price',
    pair: ['Commercial Street', 'Canal Street'],
    sentence: ['Everything has a price.', 'Nothing has a price tag.'],
    why: 'Commercial Street and Canal Street agree the first price is a joke.',
    mechanism: 'Two stalls back to back, two raised hands, one blank tag swinging between offers.',
    sound: "Haggling, bangles clinking, a hawker's call, a subway rumble.",
    draw(ctx) {
      const p = ctx.id;
      const bangles = (x, seed) => {
        const r = rng(seed), cs = [INK.red, INK.green, INK.yellow, INK.pink, INK.blue];
        let s = `<path d="M${x},150 V82" stroke="${k}" stroke-width="0.8"/>`;
        for (let y = 86; y < 150; y += 2.2) s += `<ellipse cx="${x}" cy="${f(y)}" rx="5.4" ry="1.5" fill="none" stroke="${cs[Math.floor(r() * 5)]}" stroke-width="1.3"/>`;
        return s;
      };
      let awning = '';
      for (let i = 0; i < 18; i++) awning += `<path d="M${38 + i * 10},62 h10 v10 q-5,4 -10,0 Z" fill="${i % 2 ? INK.paper : INK.red}" stroke="${k}" stroke-width="0.35"/>`;
      const top = `
        ${bg(INK.yellow, 0.16)}
        <rect x="38" y="34" width="174" height="28" fill="${INK.pink}" opacity="0.3"/>
        <rect x="42" y="38" width="62" height="14" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/>
        <text x="73" y="47.4" text-anchor="middle" font-family="${FONT.sans}" font-size="5" font-weight="700" letter-spacing="0.6" fill="${INK.paper}">BANGLE HOUSE</text>
        <rect x="160" y="38" width="48" height="14" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/>
        <text x="184" y="47.4" text-anchor="middle" font-family="${FONT.sans}" font-size="5.2" font-weight="700" letter-spacing="0.6" fill="${INK.yellow}">SALE 50%</text>
        <rect x="38" y="72" width="174" height="95" fill="${k}" opacity="0.42"/>
        ${awning}
        <rect x="42" y="148" width="40" height="4" fill="${INK.kaapi}"/>
        ${bangles(50, 1)}${bangles(62, 2)}${bangles(74, 3)}
        <path d="M160,80 H210" stroke="${k}" stroke-width="1"/>
        ${handbag(170, 92, INK.kaapi)}${handbag(186, 94, INK.red)}${handbag(202, 92, INK.blue)}
        ${handbag(178, 116, INK.green)}${handbag(196, 118, INK.yellow)}
        ${haggle(ctx, INK.red, `<path d="M104,139 h16 v-3 h-16 Z M104,136 h16 v-3 h-16 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.35"/><path d="M104,133 h16 v-3 h-16 Z" fill="${INK.pink}" stroke="${k}" stroke-width="0.35"/><path d="M104,134.5 h16 M104,137.5 h16" stroke="${INK.yellow}" stroke-width="0.5"/>${handbag(140, 135, INK.blue, 0.8)}`)}`;

      const shades = (y) => [0, 1, 2].map((i) => `<g transform="translate(${50 + i * 8} ${y})"><circle cx="-1.8" cy="0" r="1.7" fill="${k}"/><circle cx="1.8" cy="0" r="1.7" fill="${k}"/><path d="M-0.4,-0.4 h0.8" stroke="${k}" stroke-width="0.5"/></g>`).join('');
      const bottom = `
        ${bg(INK.blue, 0.12)}
        <rect x="38" y="20" width="174" height="56" fill="${INK.red}" opacity="0.35"/>
        <rect x="38" y="20" width="174" height="56" fill="url(#${p}-brick)" opacity="0.6"/>
        <g fill="${k}" opacity="0.5"><rect x="48" y="40" width="10" height="14"/><rect x="66" y="40" width="10" height="14"/></g>
        <g stroke="${k}" stroke-width="0.5" fill="none"><path d="M152,52 H206 M152,56 H206 M152,36 H206 M160,52 L178,36 M158,36 V56 M200,36 V56"/></g>
        <rect x="42" y="62" width="76" height="12" fill="${INK.yellow}" stroke="${k}" stroke-width="0.45"/>
        <text x="80" y="70.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.6" font-weight="700" letter-spacing="0.6" fill="${k}">BAGS · WATCHES · LUGGAGE</text>
        <rect x="38" y="76" width="174" height="91" fill="${k}" opacity="0.4"/>
        <g transform="translate(58 0)"><path d="M0,150 V84" stroke="${k}" stroke-width="1"/><path d="M-8,150 H8" stroke="${k}" stroke-width="1.4"/></g>
        <g>${ctx.a(easeMove('0 0;-3 0;0 0;3 0;0 0', '6s'))}${shades(92)}${shades(106)}</g>
        <g>${ctx.a(easeMove('0 0;3 0;0 0;-3 0;0 0', '6s'))}${shades(120)}${shades(134)}</g>
        <path d="M158,82 H210" stroke="${k}" stroke-width="1"/>
        ${handbag(168, 94, k)}${handbag(184, 96, INK.paper)}${handbag(200, 94, INK.kaapi)}${handbag(176, 118, INK.red)}${handbag(194, 120, INK.pink)}
        <g transform="translate(206 0)"><path d="M0,167 V112" stroke="${INK.green}" stroke-width="1.6"/><circle cx="0" cy="106" r="7" fill="${INK.yellow}" opacity="0.25">${ctx.a(easeLoop('opacity', '0.25;0.1;0.25', '3s'))}</circle><circle cx="0" cy="106" r="4.4" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/></g>
        ${haggle(ctx, INK.blue, `<g transform="translate(110 136)"><rect x="-6" y="-3" width="12" height="3" fill="${k}"/>${[0, 1, 2].map((i) => `<circle cx="${-4 + i * 4}" cy="-4.6" r="1.6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.3"/>`).join('')}</g>${handbag(140, 135, INK.red, 0.8)}`)}`;

      return {
        top: { city: 'blr', caption: 'COMMERCIAL STREET', clause: 'Everything has a price.', art: top },
        bottom: { city: 'nyc', caption: 'CANAL STREET', clause: 'Nothing has a price tag.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 7: By the Gram. A Chickpet gold shop x a 47th Street counter, 4 PM.
  // A balance settles above, a loupe hovers below.
  // ======================================================================
  T.register({
    id: 'd-7', rank: '7', suit: 'diamond', title: 'By the Gram',
    pair: ['Chickpet gold shop', 'Diamond District counter'],
    sentence: ['Gold by the gram.', 'Trust by the decade.'],
    why: "Chickpet weighs gold to the milligram. 47th Street weighs who's asking.",
    mechanism: 'A balance settles above, a loupe hovers below. Both are checking the same thing, honestly.',
    sound: 'A scale ticking still, a fan, a door buzzer.',
    draw(ctx) {
      const p = ctx.id;
      const silk = (x0, seed) => {
        const r = rng(seed), cs = [INK.red, INK.green, INK.pink, INK.blue, INK.kaapi, INK.yellow];
        let s = `<rect x="${x0}" y="38" width="58" height="84" fill="${INK.kaapi}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/>`;
        for (const y of [58, 80, 102, 122]) s += `<path d="M${x0},${y} H${x0 + 58}" stroke="${k}" stroke-width="1.2"/>`;
        for (const y of [58, 80, 102, 122]) for (let j = 0; j < 3; j++) {
          for (let b = 0; b < 4; b++) {
            const c = cs[Math.floor(r() * cs.length)];
            s += `<rect x="${x0 + 3 + j * 18.5}" y="${y - 4.4 * (b + 1)}" width="15" height="4.4" fill="${c}" stroke="${k}" stroke-width="0.25"/><path d="M${x0 + 3 + j * 18.5},${f(y - 4.4 * (b + 1) + 3.6)} h15" stroke="${INK.yellow}" stroke-width="0.5"/>`;
          }
        }
        return s;
      };
      const vals = '0 125 100;-7 125 100;4 125 100;-1.5 125 100;0 125 100;0 125 100';
      const pan = (x, inner) => {
        const back = vals.split(';').map((v) => { const [a] = v.split(' '); return `${f(-a)} ${x} 100`; }).join(';');
        return `<g>${ctx.a(easeSpin(back, '6s'))}<path d="M${x},100 L${x - 8},120 M${x},100 L${x + 8},120" stroke="${k}" stroke-width="0.35"/><path d="M${x - 10},120 Q${x},127 ${x + 10},120 Z" fill="${INK.yellow}" fill-opacity="0.6" stroke="${k}" stroke-width="0.5"/>${inner}</g>`;
      };
      const chains = (x) => `<path d="M${x},150 q6,8 12,0 q6,8 12,0" fill="none" stroke="${INK.yellow}" stroke-width="1.2"/>`;
      const fan = `<g transform="translate(125 34)"><path d="M0,-14 V2" stroke="${k}" stroke-width="0.8"/><rect x="-3" y="1" width="6" height="3.4" rx="1.2" fill="${k}"/><g transform="translate(0 3)"><path d="M-20,0 Q-10,-1.6 0,0 Q10,1.6 20,0" fill="none" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/>${ctx.a(`<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;-1 1;1 1" dur="0.5s" repeatCount="indefinite"/>`)}</g></g>`;
      const top = `
        ${bg(INK.yellow, 0.16)}
        ${silk(40, 4)}${silk(152, 8)}
        ${fan}
        <rect x="106" y="56" width="38" height="13" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
        <text x="125" y="65.2" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="0.8" fill="${INK.yellow}">916 GOLD</text>
        ${bust(176, 140, INK.kaapi, 1.5)}
        <rect x="38" y="140" width="174" height="27" fill="${INK.kaapi}" fill-opacity="0.7" stroke="${k}" stroke-width="0.5"/>
        <rect x="44" y="145" width="60" height="16" fill="${k}" opacity="0.7"/><rect x="146" y="145" width="60" height="16" fill="${k}" opacity="0.7"/>
        ${chains(50)}${chains(76)}${chains(152)}${chains(178)}
        <path d="M38,140 H212" stroke="${k}" stroke-width="1.2"/>
        <rect x="113" y="134" width="24" height="6" fill="${k}"/>
        <path d="M125,134 V100" stroke="${k}" stroke-width="1.6"/>
        <g>${ctx.a(easeSpin(vals, '6s'))}
          <path d="M96,100 H154" stroke="${k}" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M125,100 V92 L123,96 M125,92 L127,96" stroke="${k}" stroke-width="0.6" fill="none"/>
          ${pan(96, `<ellipse cx="96" cy="119.4" rx="5" ry="1.3" fill="none" stroke="${INK.yellow}" stroke-width="1.3"/><ellipse cx="96" cy="117.8" rx="5" ry="1.3" fill="none" stroke="${k}" stroke-width="0.25"/><ellipse cx="96" cy="117.6" rx="5" ry="1.3" fill="none" stroke="${INK.yellow}" stroke-width="1.3"/>`)}
          ${pan(154, `<rect x="149" y="114" width="4" height="5" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3"/><rect x="154" y="116" width="3.4" height="3.4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3"/>`)}
        </g>
        <circle cx="125" cy="100" r="1.6" fill="${INK.red}"/>
        <path d="M60,150 l1,-2 l1,2 l2,1 l-2,1 l-1,2 l-1,-2 l-2,-1 Z" fill="${INK.paper}" opacity="0">${ctx.a(easeLoop('opacity', '0;1;0', '2s'))}</path>`;

      const bottom = `
        ${bg(INK.blue, 0.1)}
        <rect x="44" y="36" width="162" height="84" fill="${INK.blue}" fill-opacity="0.22" stroke="${k}" stroke-width="1"/>
        <rect x="44" y="64" width="162" height="48" fill="${INK.kaapi}" opacity="0.35"/>
        <g fill="${k}" opacity="0.35">${[50, 66, 82, 98, 114, 130, 146].map((x) => `<rect x="${x}" y="72" width="8" height="10"/>`).join('')}</g>
        <path d="M44,112 H206" stroke="${k}" stroke-width="0.5"/>
        ${[[70, 0.8], [176, 1]].map(([x, s]) => `<g transform="translate(${x} 0)">
          <circle cx="0" cy="${f(64)}" r="9" fill="${INK.yellow}" opacity="0.25">${ctx.a(easeLoop('opacity', '0.25;0.12;0.25', '3s'))}</circle>
          <path d="M0,112 V72" stroke="${k}" stroke-width="${f(1.2 * s)}"/>
          <path d="M0,${f(64 - 8 * s)} L${f(6 * s)},64 L0,${f(64 + 8 * s)} L${f(-6 * s)},64 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <path d="M${f(-6 * s)},64 H${f(6 * s)} M0,${f(64 - 8 * s)} L${f(-2 * s)},64 L0,${f(64 + 8 * s)} L${f(2 * s)},64 Z" fill="none" stroke="${k}" stroke-width="0.3"/></g>`).join('')}
        ${walker(ctx, `<g transform="scale(0.7)">${figure(ctx, { color: k })}</g>`, '12s', '-4s', 112, 90)}
        <text x="125" y="50" text-anchor="middle" font-family="${FONT.sans}" font-size="7" font-weight="700" letter-spacing="1.4" fill="${INK.red}">WE BUY GOLD</text>
        <path d="M44,120 H206" stroke="${k}" stroke-width="0.6"/>
        ${bust(176, 140, k, 1.5, '')}
        <g>${ctx.a(easeMove('0 0;-2 -3;0 0', '4s'))}
          <path d="M168,123 L134,112" stroke="${k}" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M132,110 l-5,-1.5 l1.4,-4.4 l5,1.5 Z" fill="${k}"/>
          <circle cx="126" cy="113" r="5.4" fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="1.2"/>
          <path d="M123.6,111 q1.4,-1.6 3.2,-1.4" fill="none" stroke="${INK.paper}" stroke-width="0.6"/>
        </g>
        <rect x="38" y="140" width="174" height="27" fill="${k}" opacity="0.75"/>
        <rect x="44" y="144" width="162" height="18" fill="${INK.paper}" opacity="0.12" stroke="${INK.paper}" stroke-width="0.3"/>
        ${[56, 72, 88, 162, 178, 194].map((x, i) => `<circle cx="${x}" cy="154" r="2.6" fill="none" stroke="${INK.yellow}" stroke-width="0.9"/><path d="M${x - 1},151 l1,-2 l1,2 Z" fill="${INK.paper}"/>`).join('')}
        <path d="M38,140 H212" stroke="${k}" stroke-width="1.2"/>
        <rect x="104" y="134" width="42" height="6" fill="${k}"/>
        <path d="M118.6,131 L131.4,131 L134,133.4 L125,138.4 L116,133.4 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <path d="M116,133.4 H134 M121,131 L119.6,133.4 L125,138.4 M129,131 L130.4,133.4 L125,138.4 M125,131 V133.4" fill="none" stroke="${k}" stroke-width="0.3"/>
        <g transform="translate(131 128)"><path d="M0,-4 L0.9,-0.9 L4,0 L0.9,0.9 L0,4 L-0.9,0.9 L-4,0 L-0.9,-0.9 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.25" opacity="${ctx.still ? 1 : 0}">${ctx.a(easeLoop('opacity', '0;1;0;0', '3s'))}</path></g>`;

      return {
        top: { city: 'blr', caption: 'CHICKPET', clause: 'Gold by the gram.', art: top },
        bottom: { city: 'nyc', caption: '47TH STREET', clause: 'Trust by the decade.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 8: After Six. A Church Street pub band x a Village basement open mic.
  // One mic stand runs through the seam. The office lanyard stays on.
  // ======================================================================
  function micStand(y0) {
    return `<path d="M125,167 V${y0}" stroke="${k}" stroke-width="1"/><path d="M119,167 L125,162 L131,167" fill="none" stroke="${k}" stroke-width="0.9"/><path d="M125,${y0} L121,${y0 - 2}" stroke="${k}" stroke-width="0.9"/><rect x="117.6" y="${y0 - 4}" width="4" height="2.6" rx="1.2" fill="${k}" transform="rotate(-20 119.6 ${y0 - 2.7})"/>`;
  }
  T.register({
    id: 'd-8', rank: '8', suit: 'diamond', title: 'After Six',
    pair: ['Church Street pub band', 'Village open mic'],
    sentence: ['Day job till six.', 'Rock star till close.'],
    why: 'By day they file tickets. By night, someone in the back knows every word.',
    mechanism: 'One mic stand runs through the seam. A band above, one brave guitar below.',
    sound: 'Drums, a bass line, feedback, polite basement applause.',
    draw(ctx) {
      const p = ctx.id;
      let lights = '';
      for (let i = 0; i < 12; i++) {
        const t = i / 11, x = 40 + t * 170, y = 40 + Math.sin(t * Math.PI) * 14;
        lights += `<circle cx="${f(x)}" cy="${f(y + 2)}" r="1.6" fill="${INK.yellow}">${ctx.a(easeLoop('opacity', '1;0.3;1', '1.5s', ` begin="-${f(i * 0.37)}s"`))}</circle>`;
      }
      const guitar = (c) => `<g transform="rotate(-28 0 -12)"><path d="M-6,-12 C-6,-16 -2,-16 -1,-14 C1,-17 5,-16 5,-12 C5,-8 1,-7 -0.5,-8 C-2,-7 -6,-8 -6,-12 Z" fill="${c}" stroke="${k}" stroke-width="0.4"/><rect x="4" y="-12.8" width="14" height="1.6" fill="${INK.kaapi}"/></g>`;
      const top = `
        ${bg(INK.red, 0.3)}
        <rect width="${W}" height="${H}" fill="url(#${p}-brick)" opacity="0.6"/>
        ${bg(k, 0.55)}
        <path d="M40,42 Q125,70 210,42" fill="none" stroke="${k}" stroke-width="0.5"/>
        ${lights}
        <path d="M150,38 L96,167 H204 Z" fill="${INK.yellow}" opacity="0.14">${ctx.a(easeLoop('opacity', '0.14;0.24;0.14', '1.5s'))}</path>
        <rect x="44" y="66" width="32" height="34" fill="${k}" stroke="${INK.kaapi}" stroke-width="1.4"/>
        <g font-family="${FONT.sans}" font-weight="700" fill="${INK.paper}" text-anchor="middle" letter-spacing="0.5">
          <text x="60" y="77" font-size="6">LIVE</text><text x="60" y="85" font-size="4">TONIGHT</text><text x="60" y="94" font-size="3.6" fill="${INK.yellow}">8 PM</text>
        </g>
        <rect x="38" y="156" width="174" height="11" fill="${INK.kaapi}" opacity="0.8"/>
        <path d="M38,156 H212" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(176 0)">
          ${bust(4, 140, k, 1.3)}
          <g>${ctx.a(easeSpin('0 -6 124;-25 -6 124;0 -6 124', '0.5s'))}<path d="M-6,124 L-16,118" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/><path d="M-16,118 L-20,112" stroke="${INK.paper}" stroke-width="0.6"/></g>
          <g>${ctx.a(easeSpin('0 14 124;25 14 124;0 14 124', '0.5s', ' begin="-0.25s"'))}<path d="M14,124 L24,118" stroke="${k}" stroke-width="1.4" stroke-linecap="round"/><path d="M24,118 L26,112" stroke="${INK.paper}" stroke-width="0.6"/></g>
          <circle cx="0" cy="146" r="11" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/><circle cx="0" cy="146" r="8.6" fill="none" stroke="${INK.red}" stroke-width="1.2"/>
          <path d="M-12,157 H12 M-8,157 L-4,152 M8,157 L4,152" stroke="${k}" stroke-width="0.6"/>
          <path d="M22,167 V116" stroke="${k}" stroke-width="0.5"/>
          <ellipse cx="22" cy="116" rx="9" ry="1.6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4">${ctx.a(easeSpin('0 22 116;4 22 116;0 22 116', '0.5s'))}</ellipse>
        </g>
        <g>${ctx.a(easeMove('0 0;0 -1;0 0', '0.5s'))}${person(64, 167, { c: k, s: 1.25, extra: guitar(INK.blue) })}</g>
        ${micStand(124)}
        <g>${ctx.a(easeMove('0 0;0 -1.2;0 0', '1s'))}${person(112, 167, { c: k, s: 1.32, extra: `${guitar(INK.red)}<path d="M-2.4,-21 L0,-15 L2.4,-21" fill="none" stroke="${INK.yellow}" stroke-width="0.4"/><rect x="-1.5" y="-15" width="3" height="3.6" fill="${INK.paper}" stroke="${INK.yellow}" stroke-width="0.3"/>` })}</g>`;

      const bottom = `
        ${bg(INK.red, 0.28)}
        <rect width="${W}" height="${H}" fill="url(#${p}-brick)" opacity="0.6"/>
        ${bg(k, 0.62)}
        <rect x="38" y="20" width="174" height="18" fill="${k}"/>
        <path d="M38,42 H212 M38,47 H212" stroke="${INK.paper}" stroke-width="1.2" opacity="0.35"/>
        <path d="M70,40 v9 M150,40 v9" stroke="${INK.paper}" stroke-width="2.4" opacity="0.35"/>
        <text x="72" y="72" text-anchor="middle" font-family="${FONT.sans}" font-size="10" font-weight="700" letter-spacing="1" fill="none" stroke="${INK.pink}" stroke-width="2.6" opacity="0.25">OPEN MIC</text>
        <text x="72" y="72" text-anchor="middle" font-family="${FONT.sans}" font-size="10" font-weight="700" letter-spacing="1" fill="none" stroke="${INK.pink}" stroke-width="0.8">OPEN MIC${ctx.a(loop('opacity', '1;1;0.2;1;0.3;1;1', '6s', ' keyTimes="0;0.6;0.62;0.64;0.66;0.68;1"'))}</text>
        <rect x="156" y="58" width="40" height="44" fill="${INK.paper}" stroke="${k}" stroke-width="0.5" transform="rotate(3 176 80)"/>
        <g transform="rotate(3 176 80)" font-family="${FONT.sans}" font-weight="700" fill="${k}" letter-spacing="0.4">
          <text x="176" y="67" text-anchor="middle" font-size="4.6">SIGN UP</text>
          <path d="M162,73 H190 M162,79 H186 M162,85 H190 M162,91 H180 M162,97 H170" stroke="${k}" stroke-width="0.35"/>
          <path d="M164,72 q4,-3 8,0 t8,0 M164,78 q3,-3 6,0 t7,0 M164,84 q4,-2 8,0 t9,0" fill="none" stroke="${INK.blue}" stroke-width="0.4"/>
        </g>
        <circle cx="176" cy="59" r="1.2" fill="${INK.red}"/>
        <path d="M125,40 L84,167 H166 Z" fill="${INK.paper}" opacity="0.12">${ctx.a(easeLoop('opacity', '0.12;0.18;0.12', '3s'))}</path>
        <rect x="38" y="160" width="174" height="7" fill="${INK.kaapi}" opacity="0.6"/>
        <ellipse cx="108" cy="147" rx="8" ry="1.8" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>
        <path d="M102,148 L99,167 M114,148 L117,167 M101,158 H115" stroke="${k}" stroke-width="0.9"/>
        ${seated(108, 145, { c: k, s: 1.5, extra: `<path d="M0,-15.6 L0,-9" stroke="${INK.red}" stroke-width="1.2"/>
          <g transform="rotate(-12 4 -6)"><path d="M-1,-6 C-1,-11 4,-11 5,-8.6 C7,-12 13,-11 13,-6 C13,-1 7,-0.6 5,-2.6 C4,-0.6 -1,-1 -1,-6 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/><circle cx="9" cy="-6" r="1.4" fill="${k}"/><rect x="12" y="-6.8" width="12" height="1.6" fill="${k}"/></g>
          <g>${ctx.a(easeSpin('0 2 -13;18 2 -13;0 2 -13', '0.6s'))}<path d="M2,-13 L8,-6" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/></g>` })}
        ${micStand(116)}
        ${[[56, 0], [190, 0.6]].map(([x, d]) => `<g>
          <circle cx="${x}" cy="138" r="9" fill="${INK.yellow}" opacity="0.2">${ctx.a(easeLoop('opacity', '0.2;0.1;0.25;0.2', '1.5s', ` begin="-${d}s"`))}</circle>
          <ellipse cx="${x}" cy="144" rx="11" ry="2" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/><path d="M${x},146 V167 M${x - 5},167 H${x + 5}" stroke="${k}" stroke-width="1"/>
          <rect x="${x - 1.6}" y="138" width="3.2" height="5" fill="${INK.red}"/><path d="M${x},138 q-1.2,-2 0,-3.4 q1.2,1.4 0,3.4 Z" fill="${INK.yellow}"/>
          <g>${ctx.a(easeMove('0 0;0 -1.2;0 0', '1.5s', ` begin="-${d}s"`))}${bust(x + (x < 125 ? -12 : 12), 167, k, 1.3, '')}</g></g>`).join('')}
        <path d="M38,160 H212" stroke="${INK.paper}" stroke-width="0.3" opacity="0.4"/>`;

      return {
        top: { city: 'blr', caption: 'CHURCH STREET', clause: 'Day job till six.', art: top },
        bottom: { city: 'nyc', caption: 'GREENWICH VILLAGE', clause: 'Rock star till close.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 9: Night Shift. An Outer Ring Road support desk at 8 PM x a Midtown
  // office at 10:30 AM. Each wall clock keeps the other city's time.
  // ======================================================================
  function desk(ctx, inner) {
    return `<rect x="38" y="142" width="174" height="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
      <rect x="38" y="146" width="174" height="21" fill="${k}" opacity="0.22"/>
      ${inner}`;
  }
  T.register({
    id: 'd-9', rank: '9', suit: 'diamond', title: 'Night Shift',
    pair: ['Night-shift support desk', 'Midtown office'],
    sentence: ['Your morning', 'is my night shift.'],
    why: 'Bengaluru picks up the phone just as New York starts its day.',
    mechanism: "Two desks back to back. Each wall clock keeps the other city's time.",
    sound: 'Headset chatter, a desk phone ring, traffic far below.',
    draw(ctx) {
      const p = ctx.id;
      const cars = (y, c, dir, dur, begin) => ctx.still
        ? [0, 1, 2].map((i) => `<rect x="${110 + i * 34}" y="${y}" width="3" height="1.4" fill="${c}"/>`).join('')
        : `<g>${move(dir > 0 ? '0 0;40 0' : '0 0;-40 0', dur, ` begin="${begin}"`)}${Array.from({ length: 6 }, (_, i) => `<rect x="${60 + i * 40}" y="${y}" width="3" height="1.4" fill="${c}"/>`).join('')}</g>`;
      const top = `
        ${bg(INK.blue, 0.2)}
        ${bg(k, 0.3)}
        <clipPath id="${p}-w9"><rect x="98" y="36" width="112" height="80"/></clipPath>
        <g clip-path="url(#${p}-w9)">
          <rect x="98" y="36" width="112" height="80" fill="${k}"/>
          <g fill="${INK.blue}" fill-opacity="0.55" stroke="${INK.paper}" stroke-width="0.3"><rect x="104" y="56" width="22" height="50"/><rect x="132" y="46" width="28" height="60"/><rect x="168" y="62" width="20" height="44"/><rect x="192" y="52" width="20" height="54"/></g>
          ${windows(ctx, 106, 60, 4, 8, 5, 5.4, 3, 2.4, 11, true)}${windows(ctx, 134, 50, 5, 10, 5.2, 5.4, 3, 2.4, 12, true)}${windows(ctx, 194, 56, 3, 9, 5.6, 5.4, 3, 2.4, 13, true)}
          <rect x="98" y="104" width="112" height="4" fill="${INK.paper}" opacity="0.5"/>
          ${cars(104.6, INK.yellow, 1, '1.5s', '0s')}${cars(106.4, INK.red, -1, '2s', '-1s')}
        </g>
        <rect x="98" y="36" width="112" height="80" fill="none" stroke="${INK.paper}" stroke-width="1.2"/>
        <path d="M154,36 V116" stroke="${INK.paper}" stroke-width="0.8"/>
        ${clock(ctx, 66, 62, 13, 10, 30, { label: 'NEW YORK', labelColor: INK.paper })}
        ${desk(ctx, `
          ${bust(125, 142, INK.paper, 1.6, '')}
          <g>${ctx.a(easeSpin('0 125 128;-5 125 128;0 125 128;3 125 128;0 125 128', '3s'))}
            <circle cx="125" cy="122.2" r="6.4" fill="${INK.paper}"/>
            <path d="M118.4,122 A6.8,6.8 0 0 1 131.6,122" fill="none" stroke="${k}" stroke-width="1.1"/>
            <rect x="129.6" y="120" width="3" height="5" rx="1" fill="${k}"/>
            <path d="M131,125 Q132,130 127,131" fill="none" stroke="${k}" stroke-width="0.7"/>
          </g>
          <path d="M160,140 L164,110 H196 L192,140 Z" fill="${k}" stroke="${INK.paper}" stroke-width="0.4"/>
          <path d="M163,138 L166.6,113 H193 L189.6,138 Z" fill="${INK.blue}" opacity="0.7">${ctx.a(easeLoop('opacity', '0.7;0.5;0.7', '1.5s'))}</path>
          <rect x="190" y="110" width="5" height="5" fill="${INK.yellow}"/>
          <path d="M176,140 V142" stroke="${k}" stroke-width="2"/>
          <path d="M60,142 l2,-12 h8 l2,12 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        `)}`;

      const tower = (x, h) => `<g transform="translate(${x} ${h})"><path d="M-6,0 V-9 Q0,-12 6,-9 V0 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/><path d="M-6,-12 L0,-16 L6,-12" fill="${k}"/><path d="M-5,0 L-6,6 M5,0 L6,6 M-5,3 H5" stroke="${k}" stroke-width="0.4"/></g>`;
      const bottom = `
        ${bg(INK.yellow, 0.12)}
        <clipPath id="${p}-w9b"><rect x="98" y="36" width="112" height="80"/></clipPath>
        <g clip-path="url(#${p}-w9b)">
          <rect x="98" y="36" width="112" height="80" fill="${INK.blue}" opacity="0.3"/>
          <g>${ctx.a(easeMove('0 0;12 0;0 0', '12s'))}<path d="${scallop(130, 50, 14, 4, 8, 2.4)}" fill="${INK.paper}"/><path d="${scallop(184, 44, 10, 3, 6, 2)}" fill="${INK.paper}"/></g>
          <g fill="${INK.red}" fill-opacity="0.45" stroke="${k}" stroke-width="0.4"><rect x="100" y="86" width="32" height="30"/><rect x="136" y="78" width="30" height="38"/><rect x="170" y="90" width="40" height="26"/></g>
          ${tower(116, 80)}${tower(152, 72)}${tower(196, 84)}
          <g fill="${k}" opacity="0.35">${[104, 112, 120, 140, 148, 156, 176, 186, 196].map((x, i) => `<rect x="${x}" y="${96 + (i % 2) * 8}" width="4" height="5"/>`).join('')}</g>
        </g>
        <rect x="98" y="36" width="112" height="80" fill="none" stroke="${k}" stroke-width="1.2"/>
        <path d="M154,36 V116" stroke="${k}" stroke-width="0.8"/>
        ${clock(ctx, 66, 62, 13, 8, 0, { label: 'BENGALURU' })}
        ${desk(ctx, `
          ${bust(125, 142, k, 1.6, '')}
          <circle cx="125" cy="122.2" r="6.4" fill="${k}"/>
          <path d="M120,116 Q118,122 121,128" fill="none" stroke="${INK.red}" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M129,132 L118.4,121" stroke="${k}" stroke-width="3" stroke-linecap="round"/>
          <g>${ctx.a(easeSpin('0 133 132;-20 133 132;0 133 132;-8 133 132;0 133 132', '3s'))}<path d="M133,132 L142,126" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/></g>
          <path d="M121,128 C126,136 132,134 136,140 C140,144 146,138 150,142" fill="none" stroke="${INK.red}" stroke-width="0.6"/>
          <path d="M148,142 v-5 q0,-2 2,-2 h10 q2,0 2,2 v5 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
          ${paperCup(178, 136.6, 0, 0.21)}
          ${wisps(ctx, 178, 130, 16, { count: 3, spread: 2, op: 0.5 })}
          <path d="M188,140 L191,114 H208 L206,140 Z" fill="${k}" opacity="0.8"/>
          <path d="M60,142 l2,-12 h8 l2,12 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
          <path d="M66,130 q-6,-8 -2,-14 q6,4 2,14 Z M66,130 q6,-10 2,-16" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
        `)}`;

      return {
        top: { city: 'blr', caption: 'OUTER RING ROAD', clause: 'Your morning', art: top },
        bottom: { city: 'nyc', caption: 'MIDTOWN', clause: 'is my night shift.', art: bottom, hour: '10:30 AM' }
      };
    }
  });

  // ======================================================================
  // 10: Dinner at Midnight. A tea stall outside a tech park x a halal
  // cart on 53rd and 6th, 11 PM. Two carts parked wheel to wheel.
  // ======================================================================
  function spokeWheel(ctx, x, y, r, dur) {
    let s = '';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 8; s += `M${f(-Math.cos(a) * r)},${f(-Math.sin(a) * r)} L${f(Math.cos(a) * r)},${f(Math.sin(a) * r)} `; }
    return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="none" stroke="${k}" stroke-width="1.6"/><path d="${s}" stroke="${k}" stroke-width="0.3"/><circle r="1.4" fill="${k}"/></g>`;
  }
  T.register({
    id: 'd-10', rank: '10', suit: 'diamond', title: 'Dinner at Midnight',
    pair: ['Tea stall', 'Halal cart'],
    sentence: ['Dinner at midnight,', 'from a cart, standing up.'],
    why: 'The best dinner after a long shift is the one served off wheels.',
    mechanism: 'Two carts park wheel to wheel across the seam. Kettle steam above, griddle steam below.',
    sound: 'A kettle hiss, a griddle sizzle, a late horn.',
    draw(ctx) {
      const p = ctx.id;
      const stars = (seed) => { const r = rng(seed); let s = ''; for (let i = 0; i < 16; i++) s += `<circle cx="${f(40 + r() * 170)}" cy="${f(34 + r() * 30)}" r="${f(0.3 + r() * 0.35)}" fill="${INK.paper}">${ctx.a(easeLoop('opacity', '1;0.3;1', '3s', ` begin="-${f(r() * 3)}s"`))}</circle>`; return s; };
      const sipper = (x, c, flip, begin) => person(x, 167, { c, s: 1.2, flip, extra: `<g>${ctx.a(easeSpin('0 3.8 -19.4;0 3.8 -19.4;-40 3.8 -19.4;-40 3.8 -19.4;0 3.8 -19.4', '6s', ` begin="${begin}"`))}<path d="M3.8,-19.4 L7,-12 L9.4,-15" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4,-18.6 h3 l-0.4,3.4 h-2.2 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/></g>` });
      const top = `
        ${bg(k, 0.94)}
        ${stars(21)}
        <g fill="${INK.blue}" fill-opacity="0.4" stroke="${INK.paper}" stroke-width="0.3"><rect x="42" y="44" width="66" height="116"/><rect x="152" y="62" width="58" height="98"/></g>
        ${windows(ctx, 46, 50, 10, 16, 6.2, 6.6, 3.6, 3, 31, true)}${windows(ctx, 156, 68, 8, 13, 6.6, 6.6, 3.6, 3, 32, true)}
        <rect x="38" y="160" width="174" height="7" fill="${INK.paper}" opacity="0.1"/>
        <path d="M84,96 V128 M166,96 V128" stroke="${INK.paper}" stroke-width="0.9"/>
        <path d="M78,86 L172,86 L178,97 L72,97 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
        <path d="M78,86 L172,86" stroke="${INK.paper}" stroke-width="0.4"/>
        ${bulb(ctx, 125, 97, 6, { glow: 34, op: 0.24, sway: 2, dur: '6s' })}
        <rect x="82" y="128" width="86" height="22" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
        <path d="M82,135 H168 M82,142 H168" stroke="${k}" stroke-width="0.3"/>
        <rect x="80" y="126" width="90" height="3" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <rect x="96" y="120" width="22" height="6" fill="${k}"/>
        <path d="M100,120 q1.6,-4 3,0 q1.6,-4 3,0 q1.6,-4 3,0 q1.6,-4 3,0" fill="${INK.blue}">${ctx.a(easeLoop('opacity', '1;0.5;1;0.7;1', '0.6s'))}</path>
        <path d="M99,120 L101,104 Q107,100 113,104 L115,120 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M99,120 L101,104 Q107,100 113,104 L115,120 Z" fill="${k}" opacity="0.12"/>
        <path d="M114,110 Q120,108 122,102" fill="none" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M102,104 Q102,96 107,96 Q112,96 112,104" fill="none" stroke="${k}" stroke-width="0.8"/>
        ${wisps(ctx, 122, 100, 22, { color: INK.paper, sw: 0.7, count: 3, spread: 2, op: 0.7 })}
        ${[124, 130, 136].map((x) => `<path d="M${x - 2},118 h4.4 l-0.6,8 h-3.2 Z" fill="${INK.paper}" fill-opacity="0.5" stroke="${k}" stroke-width="0.3"/><path d="M${x - 1.7},121 h3.8 l-0.4,5 h-3 Z" fill="${INK.kaapi}"/>`).join('')}
        <rect x="144" y="108" width="22" height="18" fill="${INK.paper}" fill-opacity="0.25" stroke="${INK.paper}" stroke-width="0.5"/>
        ${[[149, 118], [155, 118], [161, 118], [152, 124.6], [158, 124.6]].map(([x, y]) => `<path d="M${x - 3},${y} L${x},${y - 5} L${x + 3},${y} Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.3"/>`).join('')}
        ${spokeWheel(ctx, 100, 155, 12)}${spokeWheel(ctx, 150, 155, 12)}
        ${sipper(60, INK.paper, false, '0s')}${sipper(192, INK.paper, true, '-3s')}`;

      let umb = '';
      for (let i = 0; i < 6; i++) {
        const a0 = Math.PI + i * Math.PI / 6, a1 = a0 + Math.PI / 6;
        umb += `<path d="M125,84 L${f(125 + Math.cos(a0) * 40)},${f(84 + Math.sin(a0) * 18)} A40,18 0 0 1 ${f(125 + Math.cos(a1) * 40)},${f(84 + Math.sin(a1) * 18)} Z" fill="${i % 2 ? INK.yellow : INK.red}" stroke="${k}" stroke-width="0.4"/>`;
      }
      const eater = (x, c, flip, begin) => person(x, 167, { c, s: 1.2, flip, extra: `<path d="M-4,-14 L6,-13 L10,-14" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M6,-14.6 h7 l-1,2 h-5 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.3"/><g>${ctx.a(easeSpin('0 3.8 -19.4;-30 3.8 -19.4;0 3.8 -19.4', '1.5s', ` begin="${begin}"`))}<path d="M3.8,-19.4 L8,-14 L6,-20" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>` });
      const bottom = `
        ${bg(k, 0.94)}
        ${stars(22)}
        <g fill="${INK.blue}" fill-opacity="0.35" stroke="${INK.paper}" stroke-width="0.3"><rect x="40" y="30" width="62" height="130"/><rect x="150" y="48" width="62" height="112"/></g>
        ${windows(ctx, 44, 36, 9, 18, 6.4, 6.8, 4, 3.4, 41, true)}${windows(ctx, 154, 54, 9, 15, 6.4, 6.8, 4, 3.4, 42, true)}
        <rect x="38" y="160" width="174" height="7" fill="${INK.paper}" opacity="0.1"/>
        <path d="M125,84 V108" stroke="${INK.paper}" stroke-width="1"/>
        ${umb}
        ${bust(125, 106, INK.paper, 1, '')}
        <rect x="84" y="106" width="82" height="46" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <rect x="84" y="106" width="82" height="46" fill="${k}" opacity="0.12"/>
        <rect x="80" y="103" width="90" height="4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="90" y="112" width="70" height="30" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <text x="125" y="119" text-anchor="middle" font-family="${FONT.sans}" font-size="4.6" font-weight="700" letter-spacing="0.4" fill="${INK.red}">CHICKEN OVER RICE</text>
        <rect x="93" y="122" width="20" height="16" fill="${INK.yellow}" opacity="0.8"/><circle cx="103" cy="129" r="4" fill="${INK.kaapi}"/>
        <rect x="117" y="122" width="20" height="16" fill="${INK.green}" opacity="0.6"/><path d="M120,132 q7,-8 14,0 Z" fill="${INK.kaapi}"/>
        <text x="149" y="134" text-anchor="middle" font-family="${FONT.sans}" font-size="8" font-weight="700" fill="${k}">$10</text>
        <path d="M150,103 v-3 h14 v3 M152,100 v-3 h10 v3" fill="none" stroke="${INK.paper}" stroke-width="0.6"/>
        ${wisps(ctx, 100, 100, 34, { color: INK.paper, sw: 2.6, dur: 4, count: 4, spread: 6, op: 0.75 })}
        <path d="M84,152 H166 V156 H84 Z" fill="${k}"/>
        <g transform="translate(0 167)">${wheel(quiet(ctx), 100)}${wheel(quiet(ctx), 150)}</g>
        ${eater(60, INK.paper, false, '0s')}${eater(192, INK.paper, true, '-0.7s')}`;

      return {
        top: { city: 'blr', caption: 'MARATHAHALLI', clause: 'Dinner at midnight,', art: top },
        bottom: { city: 'nyc', caption: '53RD & 6TH', clause: 'from a cart, standing up.', art: bottom }
      };
    }
  });

  // ======================================================================
  // Jack: The Rider. A delivery scooter in Bellandur rain x a deliverista
  // on the Upper East Side. One wet road; they pass, both already late.
  // ======================================================================
  function scooter(ctx) {
    return `<g>
      <ellipse cx="0" cy="0.4" rx="24" ry="1.2" fill="${k}" opacity="0.25"/>
      <path d="M-26,-40 H-4 V-17 H-26 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-26,-34 H-4" stroke="${k}" stroke-width="0.35"/>
      <path d="M-20,-5 Q-22,-16 -10,-17 L4,-17 L8,-9 L16,-9 L18,-28 L21,-28 L20,-8 Q20,-3 15,-3 L-18,-3 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.6" stroke-linejoin="round"/>
      <path d="M18,-28 L14,-31" stroke="${k}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M-8,-18 L-6,-30 Q-4,-34 0,-33 L6,-31 L14,-30" fill="none" stroke="${INK.blue}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-6,-18 L6,-17 L8,-8" fill="none" stroke="${k}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-10,-17 Q-11,-30 -4,-34 Q4,-34 4,-28 L2,-17 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.5"/>
      <circle cx="0" cy="-38.6" r="4.4" fill="${k}"/><path d="M1,-40 h4 v3 h-4 Z" fill="${INK.yellow}" opacity="0.8"/>
      ${wheel(quiet(ctx), -14, '0.4s').replace('r="6.6"', 'r="5.4"')}${wheel(quiet(ctx), 15, '0.4s').replace('r="6.6"', 'r="5.4"')}
      <circle cx="21" cy="-24" r="1.4" fill="${INK.yellow}"/>
    </g>`;
  }
  function ebike(ctx) {
    return `<g>
      <ellipse cx="0" cy="0.4" rx="24" ry="1.2" fill="${k}" opacity="0.25"/>
      <circle cx="-16" cy="-8" r="8" fill="none" stroke="${k}" stroke-width="1.6"/><circle cx="17" cy="-8" r="8" fill="none" stroke="${k}" stroke-width="1.6"/>
      <circle cx="-16" cy="-8" r="1.3" fill="${k}"/><circle cx="17" cy="-8" r="1.3" fill="${k}"/>
      <path d="M-16,-8 L-6,-24 L12,-24 L17,-8 M-6,-24 L0,-8 L12,-24 M-16,-8 L0,-8" fill="none" stroke="${INK.red}" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="-5" y="-20" width="8" height="6" rx="1" fill="${k}"/>
      <path d="M12,-24 L10,-32 L15,-33" fill="none" stroke="${k}" stroke-width="1" stroke-linecap="round"/>
      <path d="M-24,-24 H-6" stroke="${k}" stroke-width="1"/>
      <rect x="-30" y="-48" width="22" height="24" rx="2" fill="${INK.yellow}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-30,-42 H-8 M-19,-48 V-42" stroke="${k}" stroke-width="0.35"/>
      <path d="M-8,-27 L-4,-40 Q-2,-44 2,-43 L8,-40 L13,-33" fill="none" stroke="${INK.paper}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-10,-24 Q-11,-38 -4,-44 Q4,-46 6,-38 L2,-24 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
      <path d="M-6,-26 L4,-22 L2,-10" fill="none" stroke="${k}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="-48.4" r="4.2" fill="${k}"/>
      <circle cx="16" cy="-30" r="1.4" fill="${INK.yellow}"/>
    </g>`;
  }
  T.register({
    id: 'd-j', rank: 'J', suit: 'diamond', title: 'The Rider',
    pair: ['Delivery rider', 'Deliverista'],
    sentence: ["Everyone's dinner", "is somebody's shift."],
    why: "Rain or shine, someone is riding across town so you don't have to.",
    mechanism: 'One wet road. The scooter and the e-bike pass each other, both already late.',
    sound: 'Rain, a scooter buzz, an e-bike whine, a phone ping.',
    draw(ctx) {
      const p = ctx.id;
      const ride = (inner) => `<g transform="translate(${CX} ${167})">${inner}${ctx.a(move('-200 0;200 0', '12s', ' begin="-6s"'))}</g>`;
      const rain = (seed) => precip(ctx, { seed, step: 9, px: 4, py: 24, dx: 1.2, dy: 6, dur: '0.6s', color: INK.blue, sw: 0.45, opacity: 0.55 }) +
        precip(ctx, { seed: seed + 1, step: 8, px: 5, py: 26, dx: 1.6, dy: 8, dur: '0.4s', color: INK.blue, sw: 0.7 });
      const foam = (x, y, rx, d) => `<g>${ctx.a(easeMove('0 0;6 -1;0 0', '6s', ` begin="-${d}s"`))}<path d="${scallop(x, y, rx, 3.6, 9, 2.2)}" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/></g>`;
      const top = `
        ${bg(INK.blue, 0.16)}
        ${bg(k, 0.1)}
        <g fill="${INK.blue}" fill-opacity="0.4" stroke="${k}" stroke-width="0.4"><rect x="44" y="50" width="36" height="72"/><rect x="88" y="66" width="26" height="56"/><rect x="146" y="40" width="40" height="82"/><rect x="190" y="70" width="24" height="52"/></g>
        <g stroke="${k}" stroke-width="0.3" opacity="0.6">${[58, 66, 74, 82, 90, 98, 106, 114].map((y) => `<path d="M44,${y} H80 M146,${y - 8} H186"/>`).join('')}</g>
        ${windows(ctx, 47, 52, 5, 9, 6.8, 7.6, 3, 2.6, 51, false)}${windows(ctx, 149, 42, 6, 10, 6.4, 7.6, 3, 2.6, 52, false)}
        <rect x="38" y="120" width="174" height="22" fill="${INK.blue}" opacity="0.5"/>
        ${foam(64, 128, 16, 0)}${foam(122, 132, 12, 2)}${foam(178, 127, 18, 4)}
        <path d="M38,142 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M38,140 H212" stroke="${k}" stroke-width="0.4" stroke-dasharray="1 3"/>
        <rect x="38" y="142" width="174" height="25" fill="${k}" opacity="0.22"/>
        ${rain(61)}
        ${splashes(ctx, 7)}
        ${ride(scooter(ctx))}`;

      let tree = `<g transform="translate(66 0)">${ctx.a(easeSpin('0 0 167;1 0 167;0 0 167;-1 0 167;0 0 167', '6s'))}<path d="M0,167 V112" stroke="${k}" stroke-width="2.2"/><path d="${scallop(0, 94, 22, 20, 12, 4)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/><path d="${scallop(0, 94, 22, 20, 12, 4)}" fill="url(#${p}-leaf)"/></g>`;
      const bottom = `
        ${bg(INK.blue, 0.16)}
        ${bg(k, 0.1)}
        <rect x="38" y="20" width="174" height="128" fill="${INK.kaapi}" opacity="0.4"/>
        <rect x="38" y="20" width="174" height="128" fill="url(#${p}-brick)" opacity="0.5"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.4">${[46, 66, 86, 140, 160, 180, 198].map((x) => `<rect x="${x}" y="40" width="10" height="16"/><rect x="${x}" y="66" width="10" height="16"/>`).join('')}</g>
        <g fill="${INK.yellow}">${[66, 160, 198].map((x) => `<rect x="${x}" y="66" width="10" height="16"/>`).join('')}</g>
        <path d="M38,92 H212" stroke="${INK.paper}" stroke-width="1.4"/>
        <rect x="150" y="100" width="40" height="48" fill="${k}"/>
        <rect x="156" y="104" width="28" height="44" fill="${INK.yellow}" opacity="0.85"/>
        <path d="M170,104 V148" stroke="${k}" stroke-width="0.6"/>
        <path d="M144,96 H196 V106 H144 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
        <text x="170" y="103.4" text-anchor="middle" font-family="${FONT.micro}" font-size="6" font-weight="700" letter-spacing="1" fill="${INK.paper}">1140</text>
        <path d="M146,106 V148 M194,106 V148" stroke="${k}" stroke-width="0.8"/>
        <rect x="38" y="146" width="174" height="3" fill="${INK.paper}" opacity="0.6"/>
        ${tree}
        <path d="M54,148 V158 M78,148 V158 M54,152 H78" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="149" width="174" height="18" fill="${k}" opacity="0.22"/>
        ${rain(71)}
        ${splashes(ctx, 13)}
        ${ride(ebike(ctx))}`;

      return {
        top: { city: 'blr', caption: 'BELLANDUR', clause: "Everyone's dinner", art: top },
        bottom: { city: 'nyc', caption: 'UPPER EAST SIDE', clause: "is somebody's shift.", art: bottom }
      };
    }
  });

  // ======================================================================
  // Queen: So, Rent? A TO-LET board on a Bangalore gate x a FOR RENT sign
  // on a brownstone railing. The party upstairs gets there eventually.
  // ======================================================================
  function partyLights(ctx, x0, y0, w) {
    let s = `<path d="M${x0},${y0} Q${x0 + w / 2},${y0 + 5} ${x0 + w},${y0}" fill="none" stroke="${k}" stroke-width="0.35"/>`;
    const cs = [INK.red, INK.yellow, INK.green, INK.pink, INK.blue];
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7, x = x0 + t * w, y = y0 + Math.sin(t * Math.PI) * 4 + 1;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.1" fill="${cs[i % 5]}">${ctx.a(loop('opacity', '1;0.25;1', '1s', ` begin="-${f(i * 0.29)}s"`))}</circle>`;
    }
    return s;
  }
  T.register({
    id: 'd-q', rank: 'Q', suit: 'diamond', title: 'So, Rent?',
    pair: ['TO-LET board', 'FOR RENT sign'],
    sentence: ['Every party gets there eventually.', "So, what's your rent?"],
    why: 'Every conversation in both cities ends at rent, usually before the second drink.',
    mechanism: 'A TO-LET board and a FOR RENT sign hang back to back, swinging on the same breeze.',
    sound: 'Party music through a window, a gate creak, pigeons.',
    draw(ctx) {
      const p = ctx.id;
      const swing = (inner) => `<g>${ctx.a(easeSpin('0 125 127;4 125 127;0 125 127;-4 125 127;0 125 127', '4s'))}${inner}</g>`;
      let bars = '';
      for (let x = 101; x < 150; x += 4) if (Math.abs(x - 125) > 1) bars += `M${x},167 V${f(128 - 4 * Math.sin((x - 98) / 54 * Math.PI))} `;
      const top = `
        ${bg(INK.yellow, 0.16)}
        <rect x="160" y="34" width="22" height="16" rx="2" fill="${k}"/><path d="M160,39 H182 M160,44 H182" stroke="${INK.paper}" stroke-width="0.4" opacity="0.5"/>
        <rect x="56" y="50" width="140" height="80" fill="${INK.pink}" fill-opacity="0.4" stroke="${k}" stroke-width="0.6"/>
        <path d="M52,50 H200" stroke="${k}" stroke-width="1.6"/>
        <rect x="70" y="58" width="30" height="20" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
        ${partyLights(ctx, 70, 60, 30)}
        <g>${ctx.a(easeMove('0 0;3 -1.5;0 0;-3 -1.5;0 0', '1s'))}${person(80, 78, { c: k, s: 0.62, extra: raisedHand(k) })}</g>
        ${person(92, 78, { c: k, s: 0.62 })}
        <path d="M70,68 H100 M85,58 V78" stroke="${k}" stroke-width="0.3" opacity="0.4"/>
        <rect x="150" y="58" width="26" height="20" fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/>
        <path d="M150,82 H182 M150,88 H182 M154,82 V88 M160,82 V88 M166,82 V88 M172,82 V88 M178,82 V88" stroke="${k}" stroke-width="0.6"/>
        <rect x="136" y="96" width="30" height="34" fill="${INK.kaapi}" fill-opacity="0.7" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="122" width="174" height="45" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="38" y="122" width="174" height="45" fill="${INK.yellow}" opacity="0.25"/>
        <path d="M38,124 H212" stroke="${k}" stroke-width="0.5"/>
        <rect x="98" y="118" width="54" height="49" fill="${INK.paper}"/>
        <path d="${bars}" stroke="${k}" stroke-width="0.8"/>
        <path d="M98,128 Q125,120 152,128 M98,150 H152 M125,124 V167" fill="none" stroke="${k}" stroke-width="1.3"/>
        <g stroke="${k}" stroke-width="0.5"><rect x="88" y="112" width="10" height="55" fill="${INK.paper}"/><rect x="152" y="112" width="10" height="55" fill="${INK.paper}"/>
          <rect x="86" y="108" width="14" height="4" fill="${INK.paper}"/><rect x="150" y="108" width="14" height="4" fill="${INK.paper}"/></g>
        <circle cx="93" cy="103" r="4.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><circle cx="157" cy="103" r="4.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M${scallop(60, 116, 24, 12, 12, 4).slice(1)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.45"/>
        ${[[46, 112], [56, 108], [68, 114], [76, 108], [52, 120], [64, 120]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${INK.red}"/>`).join('')}
        <path d="M44,122 q4,10 2,22 M58,124 q-2,8 0,18 M74,124 q4,6 2,14" fill="none" stroke="${INK.green}" stroke-width="0.8"/>
        ${fallingLeaf(ctx, 62, 122, 40, INK.pink, '6s', '0s')}${fallingLeaf(ctx, 80, 120, 44, INK.pink, '6s', '-3s')}
        ${swing(`<path d="M118,127 L111,134 M132,127 L139,134" stroke="${k}" stroke-width="0.4"/>
          <rect x="108" y="133" width="34" height="19" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
          <text x="125" y="143.4" text-anchor="middle" font-family="${FONT.sans}" font-size="8" font-weight="700" letter-spacing="0.4" fill="${INK.red}">TO-LET</text>
          <text x="125" y="149.6" text-anchor="middle" font-family="${FONT.sans}" font-size="3.8" font-weight="700" letter-spacing="0.4" fill="${k}">2 BHK · CALL</text>`)}`;

      let rail = '';
      for (let x = 46; x <= 150; x += 5) rail += `M${x},167 V132 M${x - 1},131 L${x},128.5 L${x + 1},131 `;
      const bottom = `
        ${bg(INK.blue, 0.12)}
        <rect x="38" y="30" width="174" height="137" fill="${INK.kaapi}" opacity="0.55"/>
        <rect x="38" y="30" width="174" height="137" fill="url(#${p}-hatch)" opacity="0.18"/>
        <path d="M38,32 H212" stroke="${k}" stroke-width="2"/><path d="M38,36 H212" stroke="${k}" stroke-width="0.5"/>
        <g fill="${k}" opacity="0.6"><rect x="50" y="46" width="16" height="22"/><rect x="80" y="46" width="16" height="22"/></g>
        <g fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"><rect x="50" y="78" width="18" height="34"/><rect x="80" y="78" width="18" height="34"/></g>
        ${partyLights(ctx, 50, 80, 48)}
        <g>${ctx.a(easeMove('0 0;3 -1.5;0 0;-3 -1.5;0 0', '1s', ' begin="-0.5s"'))}${person(59, 112, { c: k, s: 0.75, extra: raisedHand(k) })}</g>
        ${person(89, 112, { c: k, s: 0.75 })}
        <path d="M48,76 H70 M78,76 H100" stroke="${INK.paper}" stroke-width="1.4"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.45">
          ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${158 + i * 5}" y="${f(160 - i * 7)}" width="${60 - i * 5}" height="7"/>`).join('')}
        </g>
        <path d="M156,167 L200,112 L214,112" fill="none" stroke="${k}" stroke-width="1.4"/>
        <path d="M156,167 V150 M166,155 V138 M176,142 V125 M186,130 V113" stroke="${k}" stroke-width="0.6"/>
        <rect x="186" y="62" width="26" height="50" fill="${k}"/><rect x="190" y="66" width="22" height="46" fill="${INK.kaapi}"/>
        <path d="${rail}" stroke="${k}" stroke-width="0.6"/>
        <path d="M44,132 H152" stroke="${k}" stroke-width="1.4"/>
        <g transform="translate(78 132)">${ctx.a(easeSpin('0 0 0;0 0 0;24 0 0;0 0 0;0 0 0', '3s'))}<path d="M-5,0 Q-6,-5 -1,-6 Q2,-9 4,-6 L6,-6 L4,-4.8 Q3,0 -1,0 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.35"/><circle cx="2.6" cy="-6.4" r="0.45" fill="${INK.paper}"/></g>
        ${fallingLeaf(ctx, 170, 60, 70, INK.yellow, '6s', '-1s')}${fallingLeaf(ctx, 120, 50, 80, INK.yellow, '6s', '-4s')}
        ${swing(`<path d="M118,132 L111,138 M132,132 L139,138" stroke="${k}" stroke-width="0.4"/>
          <rect x="106" y="137" width="38" height="20" fill="${INK.red}" stroke="${k}" stroke-width="0.7"/>
          <text x="125" y="147.4" text-anchor="middle" font-family="${FONT.sans}" font-size="7.2" font-weight="700" letter-spacing="0.4" fill="${INK.paper}">FOR RENT</text>
          <text x="125" y="153.8" text-anchor="middle" font-family="${FONT.sans}" font-size="3.8" font-weight="700" letter-spacing="0.4" fill="${INK.paper}">2BR · NO FEE</text>`)}`;

      return {
        top: { city: 'blr', caption: 'INDIRANAGAR', clause: 'Every party gets there eventually.', art: top },
        bottom: { city: 'nyc', caption: 'EAST VILLAGE', clause: "So, what's your rent?", art: bottom }
      };
    }
  });

  // ======================================================================
  // King: Going Nowhere. Silk Board junction x the Cross Bronx.
  // Auto above, cab below, neither moving. Only the walker gets anywhere.
  // ======================================================================
  function bus(c, stripe) {
    let w = '';
    for (let i = 0; i < 6; i++) w += `<rect x="${-46 + i * 13}" y="-34" width="10" height="11" fill="${k}" opacity="0.8"/>`;
    return `<g><path d="M-50,-6 V-36 Q-50,-40 -46,-40 H34 Q42,-40 44,-30 L46,-6 Z" fill="${c}" stroke="${k}" stroke-width="0.6"/>${w}
      <path d="M34,-34 H40 L43,-24 H34 Z" fill="${k}" opacity="0.8"/><rect x="-50" y="-18" width="96" height="3" fill="${stripe}"/>
      <circle cx="-32" cy="-6" r="5" fill="${k}"/><circle cx="28" cy="-6" r="5" fill="${k}"/><circle cx="-32" cy="-6" r="2" fill="${INK.paper}"/><circle cx="28" cy="-6" r="2" fill="${INK.paper}"/></g>`;
  }
  function truck() {
    return `<g><rect x="-62" y="-40" width="74" height="32" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
      <path d="M-62,-30 H12" stroke="${k}" stroke-width="0.3"/>
      <path d="M14,-8 V-30 Q14,-34 18,-34 H28 Q32,-34 34,-26 L38,-20 V-8 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
      <path d="M26,-31 H30 L34,-22 H26 Z" fill="${k}" opacity="0.85"/><path d="M18,-34 V-42" stroke="${k}" stroke-width="1.2"/>
      ${[-52, -40, 0, 26].map((x) => `<circle cx="${x}" cy="-5" r="5" fill="${k}"/><circle cx="${x}" cy="-5" r="1.8" fill="${INK.paper}"/>`).join('')}</g>`;
  }
  T.register({
    id: 'd-k', rank: 'K', suit: 'diamond', title: 'Going Nowhere',
    pair: ['Silk Board junction', 'Cross Bronx Expressway'],
    sentence: ['Everyone is going somewhere.', 'Nobody is moving.'],
    why: 'Silk Board and the Cross Bronx, two places where engines idle and patience runs out.',
    mechanism: 'Auto above, cab below, neither moving. The only things going anywhere are a walker and a train.',
    sound: 'Horns in every key, idling engines, a metro gliding past.',
    draw(ctx) {
      const p = ctx.id;
      const idle = (x, y, s, inner, d) => `<g transform="translate(${x} ${y}) scale(${s})"><g>${ctx.a(easeMove('0 0;0 -0.6;0 0', '0.4s', ` begin="-${d}s"`))}${inner}</g></g>`;
      let coaches = '';
      for (let i = 0; i < 3; i++) coaches += `<g transform="translate(${i * 46} 0)"><rect x="0" y="40" width="44" height="14" rx="3" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>${[4, 14, 24, 34].map((x) => `<rect x="${x}" y="43" width="7" height="5" fill="${k}" opacity="0.8"/>`).join('')}<rect x="0" y="50" width="44" height="1.4" fill="${INK.blue}"/></g>`;
      const top = `
        ${bg(INK.yellow, 0.18)}
        ${bg(k, 0.06)}
        <g>${ctx.a(move('-160 0;260 0', '12s', ' begin="-5s"'))}${coaches}</g>
        <rect x="30" y="54" width="200" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <rect x="30" y="80" width="200" height="7" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.5"><path d="M56,62 H66 V80 H56 Z M58,87 H64 V140 H58 Z"/><path d="M184,62 H194 V80 H184 Z M186,87 H192 V140 H186 Z"/></g>
        <rect x="38" y="140" width="174" height="27" fill="${k}" opacity="0.14"/>
        ${idle(84, 150, 0.8, bus(INK.blue, INK.paper), 0)}
        ${idle(176, 150, 0.8, sedan(INK.paper, '-1s', ctx), 0.2)}
        ${wisps(ctx, 46, 146, 18, { color: k, sw: 0.8, count: 3, spread: 2, op: 0.3 })}
        ${walker(ctx, figure(ctx, { color: k }), '12s', '-9s', 154)}
        ${idle(125, 167, 0.82, autoRickshaw(quiet(ctx)), 0.1)}
        ${idle(54, 167, 0.9, `<g transform="scale(-1 1)">${sedan(INK.red, false, ctx)}</g>`, 0.3)}
        ${idle(196, 167, 0.9, sedan(INK.green, '-2s', ctx), 0.25)}`;

      const bottom = `
        ${bg(INK.blue, 0.14)}
        ${bg(k, 0.06)}
        <g fill="${INK.red}" fill-opacity="0.4" stroke="${k}" stroke-width="0.4"><rect x="40" y="34" width="40" height="34"/><rect x="84" y="42" width="34" height="26"/><rect x="152" y="30" width="30" height="38"/><rect x="186" y="40" width="28" height="28"/></g>
        ${windows(ctx, 44, 38, 6, 4, 6, 7, 3, 3.6, 61, false)}${windows(ctx, 156, 34, 4, 5, 6.6, 6.6, 3, 3.6, 62, false)}
        ${walker(ctx, `<g transform="scale(0.8)">${figure(ctx, { color: k })}</g>`, '12s', '-4s', 66)}
        <rect x="30" y="68" width="200" height="10" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M30,66 H230 M30,62 H230" stroke="${k}" stroke-width="0.4"/>
        <path d="${Array.from({ length: 34 }, (_, i) => `M${30 + i * 6},62 V66`).join(' ')}" stroke="${k}" stroke-width="0.3"/>
        <path d="M30,73 H230" stroke="${k}" stroke-width="0.3"/>
        <path d="M150,78 V84 M196,78 V84" stroke="${k}" stroke-width="0.8"/>
        <rect x="140" y="84" width="66" height="22" rx="1.4" fill="${INK.green}" stroke="${INK.paper}" stroke-width="0.6"/>
        <g transform="translate(150 95)"><path d="M-5,-6 h10 v5 q0,6 -5,8 q-5,-2 -5,-8 Z" fill="${INK.blue}" stroke="${INK.paper}" stroke-width="0.5"/><text y="1.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.4" font-weight="700" fill="${INK.paper}">95</text></g>
        <text x="160" y="94" font-family="${FONT.sans}" font-size="4.6" font-weight="700" letter-spacing="0.4" fill="${INK.paper}">NORTH</text>
        <text x="160" y="101" font-family="${FONT.sans}" font-size="4.2" font-weight="700" letter-spacing="0.4" fill="${INK.paper}">GW BRIDGE</text>
        <path d="M38,108 L60,140 M212,108 L190,140" stroke="${k}" stroke-width="0.4" opacity="0.5"/>
        <rect x="38" y="140" width="174" height="27" fill="${k}" opacity="0.16"/>
        ${idle(92, 150, 0.8, truck(), 0)}
        ${idle(184, 150, 0.8, sedan(k, '-1.5s', ctx), 0.2)}
        ${idle(125, 167, 0.82, yellowCab(quiet(ctx)), 0.1)}
        ${idle(52, 167, 0.9, `<g transform="scale(-1 1)">${sedan(INK.blue, false, ctx)}</g>`, 0.3)}
        ${idle(198, 167, 0.9, sedan(INK.paper, '-0.5s', ctx), 0.25)}`;

      return {
        top: { city: 'blr', caption: 'SILK BOARD', clause: 'Everyone is going somewhere.', art: top },
        bottom: { city: 'nyc', caption: 'CROSS BRONX', clause: 'Nobody is moving.', art: bottom }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
