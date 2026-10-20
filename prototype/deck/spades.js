// Spades: weather and time. Seasons, arrivals, goodbyes.
// (The 7 of Spades, Four O'Clock, lives in cards.js as a hero card.)
(function (root) {
  'use strict';
  const T = root.TaleCards || require('../cards.js');
  const { INK, FONT } = T;
  const { W, H, CX, f, rng, scallop, loop, move, spin, easeLoop, easeMove, easeSpin,
    wisps, fallingLeaf, bird, figure } = T.kit;
  const k = INK.ink;

  // ---------- shared helpers ----------
  // A standing person, feet at (0,0), about 31 units tall. No faces.
  // o: top, leg, shorts (colour), cap ('monkey'), armL / armR (markup or
  // angle in degrees from hanging), extra (markup drawn over), skirt.
  function person(ctx, o) {
    o = o || {};
    const top = o.top || k, leg = o.leg || k;
    const arm = (side, a, anim) => {
      const x = side * 4.6;
      return `<g transform="translate(${x} -24) rotate(${side * (a || 0)})"><path d="M0,0 L${side * 1.2},10" stroke="${top}" stroke-width="2.3" stroke-linecap="round"/><circle cx="${side * 1.2}" cy="10.6" r="1.1" fill="${k}"/>${anim ? ctx.a(anim) : ''}${o['hold' + (side < 0 ? 'L' : 'R')] ? `<g transform="translate(${side * 1.2} 10.6)">${o['hold' + (side < 0 ? 'L' : 'R')]}</g>` : ''}</g>`;
    };
    const legs = o.skirt
      ? `<path d="M-5,-13 L-6.4,-3 L6.4,-3 L5,-13 Z" fill="${o.skirt}" stroke="${k}" stroke-width="0.4"/><path d="M-2,-3 V0 M2,-3 V0" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/>`
      : `<path d="M-2.4,-0.2 L-2.1,-13.5 M2.4,-0.2 L2.1,-13.5" stroke="${leg}" stroke-width="2.7" stroke-linecap="round"/>` +
        (o.shorts ? `<path d="M-4.4,-14.4 L-4.6,-8 L-0.3,-8 L0,-11 L0.3,-8 L4.6,-8 L4.4,-14.4 Z" fill="${o.shorts}" stroke="${k}" stroke-width="0.4"/>` : '');
    const head = o.cap === 'monkey'
      ? `<path d="M-4.6,-25.5 C-5.4,-31 -3.6,-35.6 0,-35.6 C3.6,-35.6 5.4,-31 4.6,-25.5 Z" fill="${o.capColor || INK.red}" stroke="${k}" stroke-width="0.45"/>
         <path d="M-3.4,-34 V-26.5 M-1.2,-35.3 V-26 M1.2,-35.3 V-26 M3.4,-34 V-26.5" stroke="${k}" stroke-width="0.25" opacity="0.5"/>
         <ellipse cx="0" cy="-29.8" rx="2.2" ry="1.9" fill="${k}"/>`
      : `<circle cx="0" cy="-30" r="3.6" fill="${k}"/>${o.hair || ''}`;
    return `<g>${legs}
      <path d="M-4.6,-13 L-5.2,-24 Q-5.2,-26.4 -3,-26.6 L3,-26.6 Q5.2,-26.4 5.2,-24 L4.6,-13 Z" fill="${top}" stroke="${k}" stroke-width="0.45"/>
      ${arm(-1, o.armL, o.animL)}${arm(1, o.armR, o.animR)}${head}${o.extra || ''}</g>`;
  }
  // A seated person on a bench edge at (0,0), facing right; about 24 tall.
  function sitter(ctx, o) {
    o = o || {};
    const top = o.top || k, leg = o.leg || k;
    return `<g>
      <path d="M-1,-1 L7,-1 L8,10" fill="none" stroke="${leg}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-4,-1 L-4.6,-13 Q-4.6,-15.2 -2.4,-15.4 L2.4,-15.4 Q4.4,-15.2 4.4,-13 L3.8,-1 Z" fill="${top}" stroke="${k}" stroke-width="0.45"/>
      ${o.arm || `<path d="M3,-12 L6,-5 L10,-6" fill="none" stroke="${top}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`}
      <circle cx="0.4" cy="-19" r="3.5" fill="${k}"/>${o.extra || ''}</g>`;
  }
  // Upright suitcase with a pull handle, ground at (0,0).
  function suitcase(color) {
    return `<g><path d="M-3,-18 V-27 H3 V-18" fill="none" stroke="${k}" stroke-width="0.9"/>
      <rect x="-6" y="-18" width="12" height="16.5" rx="1.6" fill="${color}" stroke="${k}" stroke-width="0.55"/>
      <path d="M-2.6,-16 V-3.5 M2.6,-16 V-3.5" stroke="${k}" stroke-width="0.35" opacity="0.6"/>
      <circle cx="-4.4" cy="-0.9" r="0.9" fill="${k}"/><circle cx="4.4" cy="-0.9" r="0.9" fill="${k}"/></g>`;
  }
  // A small falling bit (petal, confetti) that loops from y0 to y0 + drop.
  function faller(ctx, x, y, drop, color, dur, begin, shape, sway) {
    if (ctx.still) return '';
    const b = ` begin="${begin}"`, sw = sway == null ? 6 : sway;
    return `<g transform="translate(${x} ${y})" opacity="0">${loop('opacity', '0;1;1;0', dur, b + ' keyTimes="0;0.08;0.88;1"')}
      ${easeMove(`0 0;${sw} ${f(drop * 0.33)};${-sw * 0.8} ${f(drop * 0.66)};${f(sw * 0.4)} ${drop}`, dur, b)}
      <path d="${shape || 'M0,-1.6 Q1.4,0 0,1.6 Q-1.4,0 0,-1.6 Z'}" fill="${color}" stroke="${k}" stroke-width="0.15">${spin('0;160;60;260', dur, b)}</path></g>`;
  }
  // Pink petals lying on the ground in a band.
  function petalBed(seed, x0, x1, y0, y1, n, color, op) {
    const r = rng(seed); let s = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), a = Math.round(r() * 180), rr = f(0.9 + r() * 0.9);
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rr}" ry="${f(rr * 0.55)}" transform="rotate(${a} ${f(x)} ${f(y)})"/>`;
    }
    return `<g fill="${color}" opacity="${op || 0.9}">${s}</g>`;
  }
  const rays = (n, r0, r1a, r1b, sw, color, op) => `<g stroke="${color}" stroke-width="${sw}" opacity="${op}">${Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; const r1 = i % 2 ? r1a : r1b; return `<path d="M${f(Math.cos(a) * r0)},${f(Math.sin(a) * r0)} L${f(Math.cos(a) * r1)},${f(Math.sin(a) * r1)}"/>`; }).join('')}</g>`;

  // ======================================================================
  // Ace: First Stop. Majestic x Port Authority, dawn.
  // A newcomer and a suitcase, feet to feet across the seam.
  // ======================================================================
  T.register({
    id: 's-a', rank: 'A', suit: 'spade', title: 'First Stop',
    pair: ['Majestic', 'Port Authority'],
    sentence: ['The ugliest building in town', "is where everyone's story starts."],
    why: 'Nobody loves the bus station. Everybody remembers stepping off at one.',
    mechanism: 'Two newcomers stand sole to sole, suitcases at their side, both pretending they know the way out.',
    sound: 'Idling diesel, a conductor\'s whistle, a PA nobody can parse.',
    draw(ctx) {
      const p = ctx.id;
      const look = ctx.a(easeSpin('0 0 -30;-8 0 -30;-8 0 -30;7 0 -30;7 0 -30;0 0 -30', '12s'));
      const idle = ctx.a(easeMove('0 0;0 -0.5;0 0', '0.4s'));
      // Bus side: KSRTC red with the paper band, destination board flips.
      const ksrtc = `<g transform="translate(26 92)">${idle}
        <path d="M0,0 H86 Q92,0 92,6 V62 H0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
        <rect x="0" y="34" width="92" height="7" fill="${INK.paper}"/>
        <path d="M0,46 H92" stroke="${INK.yellow}" stroke-width="1.6"/>
        <g fill="${INK.blue}" fill-opacity="0.5" stroke="${k}" stroke-width="0.45">${[4, 22, 40, 58].map((x) => `<rect x="${x}" y="10" width="14" height="18" rx="1"/>`).join('')}</g>
        <rect x="56" y="1.8" width="32" height="6.4" fill="${k}"/>
        <text x="72" y="6.9" text-anchor="middle" font-family="${FONT.sans}" font-size="4.8" font-weight="700" letter-spacing="0.6" fill="${INK.yellow}" opacity="${ctx.still ? 1 : 1}">MYSURU${ctx.a(loop('opacity', '1;1;0;0;1', '12s', ' keyTimes="0;0.45;0.46;0.95;0.96"'))}</text>
        <text x="72" y="6.9" text-anchor="middle" font-family="${FONT.sans}" font-size="4.4" font-weight="700" letter-spacing="0.3" fill="${INK.yellow}" opacity="0">HUBBALLI${ctx.a(loop('opacity', '0;0;1;1;0', '12s', ' keyTimes="0;0.45;0.46;0.95;0.96"'))}</text>
        <rect x="74" y="14" width="12" height="44" fill="${k}" opacity="0.8"/>
        <circle cx="20" cy="62" r="7" fill="${k}"/><circle cx="20" cy="62" r="2.6" fill="${INK.paper}"/>
        <circle cx="76" cy="62" r="7" fill="${k}"/><circle cx="76" cy="62" r="2.6" fill="${INK.paper}"/>
      </g>`;
      const plat = (x, n) => `<g transform="translate(${x} 52)"><path d="M0,0 V6" stroke="${k}" stroke-width="0.5"/><rect x="-7" y="6" width="14" height="10" fill="${INK.yellow}" stroke="${k}" stroke-width="0.45"/><text y="13.6" text-anchor="middle" font-family="${FONT.sans}" font-size="6.6" font-weight="700" fill="${k}">${n}</text></g>`;
      const pigeon = (x, y, d) => `<g transform="translate(${x} ${y})"><g>${ctx.a(easeMove('0 0;0 0;0 -0.8;0 0;0 0', '3s', ` begin="-${d}s"`))}<path d="M-3.4,0 Q-3,-3.6 0.6,-3.4 Q2.4,-5.4 3.6,-3.6 L4.8,-3.2 L3.4,-2.6 Q3,0 0,0.4 Z" fill="${k}" opacity="0.75"/></g></g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.18"/>
        <rect x="30" y="34" width="190" height="18" fill="${k}" opacity="0.22"/>
        <rect x="30" y="34" width="190" height="18" fill="url(#${p}-hatch)" opacity="0.6"/>
        <path d="M30,52 H220 M30,34 H220" stroke="${k}" stroke-width="0.8"/>
        ${pigeon(150, 34, 0)}${pigeon(162, 34, 1.4)}
        ${plat(60, 12)}${plat(104, 13)}${plat(170, 14)}
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.5"><rect x="118" y="52" width="6" height="108"/><rect x="200" y="52" width="6" height="108"/></g>
        ${ksrtc}
        ${wisps(ctx, 30, 150, 18, { color: k, sw: 1.6, dur: 3, count: 3, spread: 2, op: 0.25 })}
        <g transform="translate(150 118)">
          <rect x="0" y="0" width="44" height="42" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <rect x="-2" y="-9" width="48" height="10" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/>
          <text x="22" y="-1.6" text-anchor="middle" font-family="${FONT.kn}" font-size="7" font-weight="700" fill="${INK.paper}">ಕಾಫಿ</text>
          <rect x="0" y="22" width="44" height="20" fill="${INK.kaapi}" fill-opacity="0.5" stroke="${k}" stroke-width="0.4"/>
          <g fill="${k}" fill-opacity="0.12" stroke="${k}" stroke-width="0.4"><path d="M8,22 h6 l-0.8,-8 h-4.4 Z"/><path d="M30,22 h8 v-11 h-8 Z"/></g>
          ${wisps(ctx, 34, 10, 16, { dur: 3, count: 3, spread: 2, op: 0.4 })}
        </g>
        <path d="M38,160 H212" stroke="${k}" stroke-width="0.5"/>
        <g fill="${INK.yellow}">${Array.from({ length: 22 }, (_, i) => `<rect x="${38 + i * 8}" y="160" width="4" height="7"/>`).join('')}</g>
        <rect x="38" y="160" width="174" height="7" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g transform="translate(137 160)">${suitcase(INK.blue)}</g>
        <g transform="translate(124 160)">${person(ctx, { top: INK.green, leg: k, armR: -32, extra: `<path d="M-5,-25 Q-9,-22 -8.6,-15 L-5,-15 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>` })}</g>
        <g transform="translate(124 160)"><g>${look}<circle cx="0" cy="-30" r="3.7" fill="${k}"/></g></g>`;

      // Port Authority: low ceiling, fluorescent tubes, numbered gates.
      const tube = (x, i) => `<g><rect x="${x}" y="38" width="26" height="3" rx="1.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <rect x="${x - 4}" y="34" width="34" height="11" rx="5" fill="${INK.yellow}" opacity="0.35">${i === 1 ? ctx.a(loop('opacity', '0.35;0.35;0.05;0.35;0.05;0.35;0.35', '6s', ' keyTimes="0;0.6;0.61;0.63;0.65;0.67;1"')) : ''}</rect></g>`;
      const gate = (x, n) => `<g transform="translate(${x} 60)">
        <rect x="-15" y="0" width="30" height="9" fill="${k}"/>
        <text y="6.8" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="0.5" fill="${INK.paper}">${n}</text>
        <rect x="-15" y="14" width="30" height="86" fill="${INK.blue}" fill-opacity="0.25" stroke="${k}" stroke-width="0.6"/>
        <path d="M0,14 V100" stroke="${k}" stroke-width="0.6"/>
        <path d="M-4,56 h2 M2,56 h2" stroke="${k}" stroke-width="1.2" stroke-linecap="round"/>
      </g>`;
      const coach = `<g transform="translate(0 ${0})">${idle}
        <path d="M38,98 H112 V150 H38 Z" fill="${INK.paper}" opacity="0.95"/>
        <path d="M38,104 H112" stroke="${INK.blue}" stroke-width="5"/>
        <path d="M38,140 H112" stroke="${INK.red}" stroke-width="1.6"/>
        <g fill="${k}" opacity="0.7">${[44, 64, 84].map((x) => `<rect x="${x}" y="110" width="15" height="14" rx="1"/>`).join('')}</g>
      </g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.13"/>
        <rect x="38" y="20" width="174" height="30" fill="${k}" opacity="0.18"/>
        <path d="M38,50 H212" stroke="${k}" stroke-width="0.8"/>
        <path d="M60,20 V50 M100,20 V50 M150,20 V50 M190,20 V50" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        ${tube(52, 0)}${tube(162, 1)}
        <g clip-path="url(#${p}-win)">
          <rect x="38" y="74" width="80" height="86" fill="${k}" opacity="0.5"/>
          ${coach}
          <rect x="38" y="74" width="80" height="86" fill="${INK.blue}" opacity="0.2"/>
        </g>
        ${gate(60, 'GATE 301')}${gate(96, 'GATE 302')}
        <path d="M38,74 H118" stroke="${k}" stroke-width="0.6"/>
        <g transform="translate(176 104)">
          <circle r="11" fill="${INK.paper}" stroke="${k}" stroke-width="1.2"/>
          ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M${f(Math.cos(a) * 8.4)},${f(Math.sin(a) * 8.4)} L${f(Math.cos(a) * 9.8)},${f(Math.sin(a) * 9.8)}" stroke="${k}" stroke-width="0.6"/>`; }).join('')}
          <path d="M0,0 V-6.5" stroke="${k}" stroke-width="1" stroke-linecap="round">${ctx.a(spin('0;30', '12s'))}</path>
          <path d="M0,0 L5.5,0" stroke="${k}" stroke-width="0.8" stroke-linecap="round" transform="rotate(-90)"/>
          <path d="M0,0 V7.5" stroke="${INK.red}" stroke-width="0.4">${ctx.a(spin('0;360', '6s'))}</path>
          <path d="M0,-11 V-54" stroke="${k}" stroke-width="0.6"/>
        </g>
        <g transform="translate(150 132)"><rect width="56" height="28" fill="${INK.red}" opacity="0.8" stroke="${k}" stroke-width="0.5"/>
          <rect x="4" y="4" width="48" height="8" fill="${INK.paper}"/>
          <text x="28" y="10.4" text-anchor="middle" font-family="${FONT.sans}" font-size="5.4" font-weight="700" letter-spacing="0.6" fill="${k}">TICKETS</text>
          <path d="M4,16 H52 M4,22 H52" stroke="${INK.paper}" stroke-width="0.5" opacity="0.6"/></g>
        <path d="M38,160 H212" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,163.5 H212 ${Array.from({ length: 12 }, (_, i) => `M${44 + i * 15},160 L${40 + i * 15},167`).join(' ')}" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        <g transform="translate(137 160)">${suitcase(INK.red)}<path d="M-6,-10 H6" stroke="${INK.paper}" stroke-width="0.8"/></g>
        <g transform="translate(124 160)">${person(ctx, { top: INK.yellow, leg: INK.blue, armR: -32, extra: `<path d="M-5,-25 Q-9,-22 -8.6,-15 L-5,-15 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>` })}</g>
        <g transform="translate(124 160)"><g>${ctx.a(easeSpin('0 0 -30;6 0 -30;6 0 -30;-8 0 -30;-8 0 -30;0 0 -30', '12s', ' begin="-3s"'))}<circle cx="0" cy="-30" r="3.7" fill="${k}"/></g></g>`;
      return {
        top: { city: 'blr', caption: 'MAJESTIC', clause: 'The ugliest building in town', art: top },
        bottom: { city: 'nyc', caption: 'PORT AUTHORITY', clause: "is where everyone's story starts.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 2: Fifteen Degrees. Ulsoor in December x Prospect Park in April, 6 AM.
  // One thermometer through the seam, reading 15 both ways up.
  // ======================================================================
  T.register({
    id: 's-2', rank: '2', suit: 'spade', title: 'Fifteen Degrees',
    pair: ['December, Bangalore', 'April, New York'],
    sentence: ['Fifteen degrees.', 'Monkey cap or shorts, depending.'],
    why: 'Fifteen is a cold wave in one city and a heatwave in the other.',
    mechanism: 'One thermometer, read from both ends. Same fifteen. One wears a monkey cap, one wears shorts.',
    sound: 'A steel tumbler set down, birdsong, a frisbee and a dog.',
    draw(ctx) {
      const p = ctx.id;
      // Thermometer: 0 at y=150, 22 units per 10 degrees. 15 sits at y=117.
      const therm = (fLabels) => `<g>
        <rect x="117" y="56" width="16" height="104" rx="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
        <rect x="122.6" y="62" width="4.8" height="94" rx="2.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>
        <circle cx="125" cy="158" r="6" fill="${INK.red}" stroke="${k}" stroke-width="0.6"/>
        <rect x="123.4" y="117" width="3.2" height="40" fill="${INK.red}">${ctx.a(easeLoop('y', '117;115.6;117;118;117', '6s') + easeLoop('height', '40;41.4;40;39;40', '6s'))}</rect>
        <g stroke="${k}" stroke-width="0.4">${[0, 10, 20, 30, 40].map((d) => `<path d="M118.5,${150 - d * 2.2} h3.2"/>`).join('')}${[5, 15, 25, 35].map((d) => `<path d="M119.5,${150 - d * 2.2} h2.2"/>`).join('')}</g>
        <g font-family="${FONT.sans}" font-size="3.4" font-weight="700" fill="${k}" text-anchor="end">${[0, 10, 20, 30, 40].map((d) => `<text x="116" y="${f(151.2 - d * 2.2)}">${d}</text>`).join('')}</g>
        <text x="125" y="66" text-anchor="middle" font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${k}">°C</text>
        <path d="M117,117 h-3 M133,117 h3" stroke="${INK.red}" stroke-width="0.8"/>
        <text x="${fLabels ? 138 : 136}" y="118.4" font-family="${FONT.display}" font-size="7" font-weight="600" fill="${INK.red}">15°</text>
        ${fLabels ? `<text x="138.4" y="124.6" font-family="${FONT.sans}" font-size="3.4" font-weight="700" fill="${k}" opacity="0.75">59°F</text>` : ''}
      </g>`;
      const tumbler = `<g><path d="M-2.4,-3.2 L2.4,-3.2 L1.9,2.4 L-1.9,2.4 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><path d="M-2.6,-3.2 H2.6" stroke="${k}" stroke-width="0.7"/></g>`;
      const fog = (y, dx, d) => `<g>${ctx.a(easeMove(`0 0;${dx} 0;0 0`, '12s', ` begin="-${d}s"`))}<path d="M20,${y} H240" stroke="${INK.paper}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="40 12 22 18" opacity="0.85"/></g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.16"/>
        <rect width="${W}" height="${H}" fill="${INK.paper}" opacity="0.25"/>
        <circle cx="180" cy="50" r="10" fill="${INK.paper}" opacity="0.9"/>
        <circle cx="180" cy="50" r="10" fill="none" stroke="${k}" stroke-width="0.35" opacity="0.5"/>
        <rect x="38" y="118" width="174" height="30" fill="${INK.blue}" opacity="0.45"/>
        <path d="M38,118 H212" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(180 118)">
          <path d="M-22,0 Q-20,-5 -12,-5 H14 Q22,-5 24,0 Z" fill="${INK.green}" opacity="0.6"/>
          <path d="${scallop(0, -12, 14, 8, 10, 2.5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
          <path d="${scallop(-12, -9, 8, 6, 8, 2)}" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
          <path d="M0,-4 V0 M-12,-4 V0" stroke="${k}" stroke-width="0.8"/>
        </g>
        <path d="M150,126 H198 M60,132 H104 M150,138 H204" stroke="${INK.paper}" stroke-width="0.7" opacity="0.8"/>
        <g transform="translate(64 128)" opacity="0.8">${bird(ctx, k, '0.6s', 1.1)}${ctx.a(easeMove('0 0;20 -6;0 0', '12s'))}</g>
        <path d="M38,148 H212 V167 H38 Z" fill="${INK.kaapi}" opacity="0.3"/>
        <path d="M38,148 H212" stroke="${k}" stroke-width="0.6"/>
        <g stroke="${k}" stroke-width="0.4" fill="${INK.paper}"><path d="M38,152 H112 M138,152 H212"/></g>
        ${fog(104, 14, 0)}${fog(142, -12, 4)}
        ${therm(false)}
        <g transform="translate(88 167)">${person(ctx, { cap: 'monkey', top: INK.green, leg: INK.kaapi, armR: -62,
          holdR: `<g transform="rotate(62)">${tumbler}</g>`,
          extra: `<path d="M-5.2,-24 H5.2 M-5,-21 H5 M-4.9,-18 H4.9 M-4.7,-15 H4.7" stroke="${k}" stroke-width="0.3" opacity="0.45"/>` })}</g>
        ${wisps(ctx, 101, 151, 14, { dur: 3, count: 3, spread: 1.2, sw: 0.5, op: 0.6 })}
`;

      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.2"/>
        <g transform="translate(182 50)"><g>${ctx.a(spin('0;360', '12s'))}${rays(16, 14, 20, 25, 0.8, INK.yellow, 0.85)}</g><circle r="11" fill="${INK.yellow}"/></g>
        ${[30, 50, 72, 96, 150, 172, 196, 218].map((x, i) => `<path d="${scallop(x, 112 - (i % 3) * 3, 13, 9, 9, 2.5)}" fill="${i % 3 === 1 ? INK.pink : INK.green}" opacity="${i % 3 === 1 ? 0.55 : 0.4}" stroke="${k}" stroke-width="0.3"/>`).join('')}
        <path d="M38,124 Q90,112 140,120 T212,116 V167 H38 Z" fill="${INK.green}" opacity="0.75"/>
        <path d="M38,124 Q90,112 140,120 T212,116" fill="none" stroke="${k}" stroke-width="0.5"/>
        <g transform="translate(60 126)">
          <path d="M0,0 V-34 M0,-20 L-9,-30 M0,-24 L8,-34" stroke="${k}" stroke-width="1.8" fill="none"/>
          <path d="${scallop(0, -40, 19, 13, 11, 3)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.45"/>
          <path d="${scallop(-5, -44, 8, 5, 7, 2)}" fill="${INK.paper}" opacity="0.4"/>
        </g>
        <g transform="translate(198 120)">
          <path d="M0,0 V-30" stroke="${k}" stroke-width="1.8"/>
          <path d="${scallop(0, -38, 17, 13, 11, 3)}" fill="${INK.green}" fill-opacity="0.7" stroke="${k}" stroke-width="0.45"/>
          <path d="${scallop(0, -38, 17, 13, 11, 3)}" fill="url(#${p}-leaf)"/>
        </g>
        <g transform="translate(168 140)">
          <path d="M-9,0 L-7,-3 H7 L9,0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/>
          <path d="M-12,4 H12" stroke="${INK.paper}" stroke-width="2" opacity="0.6"/>
        </g>
        ${therm(true)}
        <g transform="translate(88 167)">${person(ctx, { top: INK.yellow, leg: k, shorts: INK.blue, armR: -150, armL: 10,
          extra: `<path d="M-5.2,-24 Q0,-22 5.2,-24" stroke="${k}" stroke-width="0.3" fill="none" opacity="0.5"/>` })}</g>
        <g transform="translate(97 132)">${ctx.a(`<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 0;40 -22;76 18;76 18;0 0" keyTimes="0;0.25;0.45;0.62;0.92;1" calcMode="spline" keySplines="0 0 1 1;0.3 0 0.7 1;0.3 0 0.7 1;0 0 1 1;0.45 0 0.55 1" dur="6s" repeatCount="indefinite"/>` + loop('opacity', '1;1;0;0;1', '6s', ' keyTimes="0;0.75;0.8;0.95;1"'))}
          <g>${ctx.a(spin('0;-20;0', '0.6s'))}<ellipse rx="4.6" ry="1.5" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/></g>
        </g>
        <g transform="translate(176 167)">
          <g>${ctx.a(`<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 0;0 -9;0 0;0 0" keyTimes="0;0.5;0.6;0.7;1" dur="6s" repeatCount="indefinite"/>`)}
          <path d="M-8,-3 V-8 M-5,-3 V-8 M5,-3 V-8 M8,-3 V-8" stroke="${k}" stroke-width="1.6" stroke-linecap="round" transform="translate(0 3)"/>
          <ellipse cx="0" cy="-8" rx="10" ry="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
          <path d="M7,-10 Q8,-16 12,-16 Q15,-16 16,-13 L19,-12 Q18,-9 14,-10 Q10,-8 7,-8 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.5"/>
          <path d="M11,-16 Q9,-13 11,-11" fill="${k}" stroke="${k}" stroke-width="0.6"/>
          <g transform="translate(-9.5 -9)"><path d="M0,0 Q-4,-2 -5,-6" fill="none" stroke="${k}" stroke-width="1" stroke-linecap="round"/>${ctx.a(easeSpin('-15;20;-15', '0.4s'))}</g>
          </g>
        </g>`;
      return {
        top: { city: 'blr', caption: 'ULSOOR, DECEMBER', clause: 'Fifteen degrees.', art: top },
        bottom: { city: 'nyc', caption: 'PROSPECT PARK, APRIL', clause: 'Monkey cap or shorts, depending.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 3: Pink for a Week. Tabebuia on Sankey Road x cherries in Brooklyn, 8 AM.
  // A pink carpet crosses the seam: the pavement forgets it's grey.
  // ======================================================================
  T.register({
    id: 's-3', rank: '3', suit: 'spade', title: 'Pink for a Week',
    pair: ['Tabebuia', 'Cherry blossom'],
    sentence: ['Once a year the pavement', "forgets it's grey."],
    why: 'For one week the commute is a wedding aisle and nobody minds the traffic.',
    mechanism: 'The pink runs straight through the seam. A scooter on one side, a bench on the other, both buried.',
    sound: 'A scooter horn, a breeze, petals ticking, a camera shutter or six.',
    draw(ctx) {
      const p = ctx.id;
      const sway = (cx, d) => ctx.a(easeSpin(`0 ${cx} 167;1 ${cx} 167;0 ${cx} 167;-1 ${cx} 167;0 ${cx} 167`, '6s', ` begin="-${d}s"`));
      const petals = (seed, n) => { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += faller(ctx, f(44 + r() * 166), f(50 + r() * 30), f(70 + r() * 30), INK.pink, i % 2 ? '6s' : '4s', `-${f(r() * 6)}s`); return s; };
      const tabebuia = (cx, cy, rx, ry, d) => `<g>${sway(cx, d)}
        <path d="M${cx - 3},167 C${cx - 2},140 ${cx - 4},120 ${cx - 2},${cy + 6} L${cx + 2},${cy + 6} C${cx + 4},120 ${cx + 3},140 ${cx + 4},167 Z" fill="${k}"/>
        <path d="M${cx},${cy + 14} L${cx - 18},${cy + 2} M${cx},${cy + 10} L${cx + 16},${cy}" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="${scallop(cx, cy, rx, ry, 16, 5)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.5"/>
        <path d="${scallop(cx - rx * 0.3, cy - 3, rx * 0.5, ry * 0.5, 9, 3)}" fill="${INK.paper}" opacity="0.35"/>
        ${petalBed(cx, cx - rx, cx + rx, cy - ry, cy + ry, 30, INK.red, 0.35)}</g>`;
      const scooter = `<g>
        <circle cx="-14" cy="-5" r="5" fill="${k}"/><circle cx="-14" cy="-5" r="1.8" fill="${INK.paper}"/>
        <circle cx="15" cy="-5" r="5" fill="${k}"/><circle cx="15" cy="-5" r="1.8" fill="${INK.paper}"/>
        <path d="M-20,-6 Q-21,-17 -10,-18 H2 L4,-8 H10 L14,-26 H18 M14,-26 L12,-28" fill="none" stroke="${k}" stroke-width="0.6"/>
        <path d="M-21,-7 Q-22,-18 -10,-18 L-2,-18 Q0,-12 4,-8 L10,-8 L13,-22 L18,-22 L16,-8 Q14,-4 10,-4 L-18,-4 Q-21,-4 -21,-7 Z" fill="${INK.blue}" stroke="${k}" stroke-width="0.6" stroke-linejoin="round"/>
        <path d="M-18,-20.5 H-3" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M13,-28 L19,-28" stroke="${k}" stroke-width="1" stroke-linecap="round"/>
        <circle cx="18.4" cy="-19" r="1.5" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        ${petalBed(33, -18, 0, -22, -19, 9, INK.pink, 1)}${petalBed(35, -20, 16, -10, -5, 8, INK.pink, 1)}
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.1"/>
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.08"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.45">
          <rect x="138" y="86" width="44" height="52"/><path d="M134,86 L160,72 L186,86 Z" fill="${INK.red}" opacity="0.8"/>
        </g>
        <g fill="${INK.blue}" fill-opacity="0.4" stroke="${k}" stroke-width="0.4"><rect x="146" y="96" width="10" height="13"/><rect x="164" y="96" width="10" height="13"/></g>
        <path d="M38,138 H212" stroke="${k}" stroke-width="0.4"/>
        <path d="M38,138 H212 V146 H38 Z" fill="${k}" opacity="0.12"/>
        <g>${Array.from({ length: 22 }, (_, i) => `<rect x="${38 + i * 8}" y="144" width="4" height="3" fill="${i % 2 ? INK.yellow : k}"/>`).join('')}</g>
        <path d="M38,147 H212 V167 H38 Z" fill="${k}" opacity="0.18"/>
        <path d="M38,157 H58 M70,157 H94 M106,157 H130 M142,157 H166 M178,157 H202" stroke="${INK.paper}" stroke-width="0.8" opacity="0.7"/>
        ${petalBed(1, 38, 212, 147, 167, 170, INK.pink, 0.95)}
        ${petalBed(2, 38, 212, 138, 146, 40, INK.pink, 0.9)}
        ${tabebuia(70, 70, 40, 26, 0)}${tabebuia(188, 60, 30, 22, 2)}
        <g transform="translate(125 166)">${scooter}</g>
        ${petals(7, 12)}`;

      // Brooklyn Botanic: cherry esplanade, a bench in pink.
      const cherry = (cx, cy, d) => `<g>${sway(cx, d)}
        <path d="M${cx - 3},167 C${cx - 2},150 ${cx - 6},138 ${cx - 2},${cy + 14} L${cx + 3},${cy + 14} C${cx + 2},140 ${cx + 4},150 ${cx + 4},167 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.4"/>
        <path d="M${cx},${cy + 16} C${cx - 10},${cy + 8} ${cx - 26},${cy + 6} ${cx - 34},${cy + 10} M${cx},${cy + 14} C${cx + 12},${cy + 6} ${cx + 26},${cy + 6} ${cx + 36},${cy + 12}" fill="none" stroke="${INK.kaapi}" stroke-width="2" stroke-linecap="round"/>
        <path d="${scallop(cx - 18, cy + 2, 22, 13, 12, 4)}" fill="${INK.pink}" fill-opacity="0.9" stroke="${k}" stroke-width="0.45"/>
        <path d="${scallop(cx + 18, cy, 22, 13, 12, 4)}" fill="${INK.pink}" fill-opacity="0.9" stroke="${k}" stroke-width="0.45"/>
        <path d="${scallop(cx, cy - 8, 20, 12, 12, 4)}" fill="${INK.pink}" stroke="${k}" stroke-width="0.45"/>
        ${petalBed(cx + 3, cx - 36, cx + 36, cy - 14, cy + 12, 40, INK.paper, 0.55)}</g>`;
      const bench = `<g>
        <path d="M-20,-12 H20 M-20,-15 H20 M-20,-18 H20" stroke="${INK.green}" stroke-width="1.8"/>
        <path d="M-21,-8 H21" stroke="${INK.green}" stroke-width="2.2"/>
        <path d="M-17,0 V-19 M17,0 V-19 M-15,-8 L-19,0 M15,-8 L19,0" stroke="${k}" stroke-width="1"/>
        ${petalBed(44, -20, 20, -10, -7, 14, INK.pink, 1)}
      </g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.14"/>
        <g fill="none" stroke="${k}" stroke-width="0.45" opacity="0.5">
          <path d="M140,128 V84 H212 V128"/><path d="M146,84 V70 H206 V84"/><path d="M150,94 V120 M162,94 V120 M174,94 V120 M186,94 V120 M198,94 V120"/>
        </g>
        <path d="M38,128 H212 V167 H38 Z" fill="${INK.green}" opacity="0.45"/>
        <path d="M38,128 H212" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,146 H212 V167 H38 Z" fill="${k}" opacity="0.12"/>
        <path d="M38,146 H212" stroke="${k}" stroke-width="0.4"/>
        ${petalBed(3, 38, 212, 146, 167, 150, INK.pink, 0.95)}
        ${petalBed(4, 38, 212, 128, 146, 50, INK.pink, 0.8)}
        ${cherry(76, 64, 1)}${cherry(186, 74, 3)}
        <g transform="translate(125 164)">${bench}</g>
        <g transform="translate(${CX} 166)">${ctx.a(move('-120 0;120 0', '12s', ' begin="-3s"'))}<g transform="translate(-36 0)">${figure(ctx, { color: k }).replace(/0.9s/g, '1s')}</g></g>
        ${petals(9, 12)}`;
      return {
        top: { city: 'blr', caption: 'SANKEY ROAD, FEBRUARY', clause: 'Once a year the pavement', art: top },
        bottom: { city: 'nyc', caption: 'BROOKLYN BOTANIC, APRIL', clause: "forgets it's grey.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 4: Season of One Fruit. Mango cart at Lalbagh x peaches at Union Square.
  // The cart bed and the crate meet at the seam, both heaped.
  // ======================================================================
  T.register({
    id: 's-4', rank: '4', suit: 'spade', title: 'Season of One Fruit',
    pair: ['Mango season', 'Peach season'],
    sentence: ['One fruit, one month.', 'We wait all year.'],
    why: 'Eleven months of nothing, then four weeks of juice running to the elbow.',
    mechanism: 'The cart bed and the crate meet at the seam. Mangoes heaped one way, peaches the other.',
    sound: 'A vendor calling the price, scale pans clinking, a wasp, paper bags.',
    draw(ctx) {
      const p = ctx.id;
      const fruitHeap = (seed, cx, base, w, hgt, n, body, blush, leaf, rx, ry) => {
        const r = rng(seed); let s = '';
        const rows = Math.ceil(hgt / (ry * 1.5));
        for (let row = 0; row < rows; row++) {
          const y = base - ry - row * ry * 1.5, half = (w / 2) * (1 - row / (rows + 0.6));
          const cnt = Math.max(1, Math.round((half * 2) / (rx * 1.9)));
          for (let i = 0; i < cnt; i++) {
            const x = cx - half + (i + 0.5) * (half * 2 / cnt) + (r() - 0.5) * 2;
            const rot = Math.round((r() - 0.5) * 60);
            s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})"><ellipse rx="${rx}" ry="${ry}" fill="${body}" stroke="${k}" stroke-width="0.45"/>` +
              `<ellipse cx="${f(rx * 0.35)}" cy="${f(-ry * 0.25)}" rx="${f(rx * 0.5)}" ry="${f(ry * 0.55)}" fill="${blush}" opacity="${f(0.45 + r() * 0.4)}"/>` +
              (leaf && r() > 0.6 ? `<path d="M${-rx},0 q-2,-3 -4,-1 q2,2 4,1 Z" fill="${INK.green}"/>` : '') +
              `<path d="M${f(-rx * 0.5)},${f(-ry * 0.4)} q1,-1 2,-1" stroke="${INK.paper}" stroke-width="0.5" fill="none"/></g>`;
          }
        }
        return s;
      };
      // Hanging balance scale from the umbrella pole.
      const scale = `<g transform="translate(160 66)">${ctx.a(easeSpin('-5;5;-5', '3s'))}
        <path d="M0,0 V6 M-14,6 H14" stroke="${k}" stroke-width="0.8"/>
        <path d="M-14,6 L-19,20 M-14,6 L-9,20 M14,6 L9,20 M14,6 L19,20" stroke="${k}" stroke-width="0.35"/>
        <path d="M-20,20 Q-14,25 -8,20 Z M8,20 Q14,25 20,20 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <ellipse cx="-14" cy="18.4" rx="3.4" ry="2.4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
        <rect x="11" y="16.6" width="6" height="3.4" fill="${k}"/>
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.2"/>
        <g transform="translate(70 84)" fill="none" stroke="${k}" stroke-width="0.45" opacity="0.6">
          <path d="M-30,40 V10 Q0,-22 30,10 V40 Z" fill="${INK.paper}" fill-opacity="0.6"/>
          <path d="M-20,40 V14 M-10,40 V4 M0,40 V0 M10,40 V4 M20,40 V14 M-30,22 H30"/>
          <path d="M0,-12 V-4 M-3,-9 H3"/>
        </g>
        <g transform="translate(196 124)"><path d="M0,43 V0" stroke="${k}" stroke-width="2"/><path d="${scallop(0, -8, 22, 16, 12, 4)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/><path d="${scallop(0, -8, 22, 16, 12, 4)}" fill="url(#${p}-leaf)"/></g>
        <g transform="translate(42 70)"><rect width="56" height="11" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/>
          <text x="28" y="8" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="0.8" fill="${INK.paper}">MANGO MELA</text></g>
        <path d="M160,167 V48" stroke="${k}" stroke-width="1.1"/>
        <g>${ctx.a(easeSpin('0 160 50;1.5 160 50;0 160 50;-1.5 160 50;0 160 50', '6s'))}
          <path d="M120,62 Q160,30 200,62 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.5"/>
          <path d="M133,58 Q160,36 160,36 M187,58 Q160,36 160,36 M146,60 Q160,34 160,36 M174,60 Q160,34 160,36" fill="none" stroke="${INK.paper}" stroke-width="0.4" opacity="0.6"/>
        </g>
        ${scale}
        <g transform="translate(125 167)">
          <circle cx="-38" cy="-11" r="11" fill="none" stroke="${k}" stroke-width="1.8"/>
          <path d="M-38,-22 V0 M-49,-11 H-27 M-46,-19 L-30,-3 M-46,-3 L-30,-19" stroke="${k}" stroke-width="0.5"/>
          <circle cx="38" cy="-11" r="11" fill="none" stroke="${k}" stroke-width="1.8"/>
          <path d="M38,-22 V0 M27,-11 H49 M30,-19 L46,-3 M30,-3 L46,-19" stroke="${k}" stroke-width="0.5"/>
          <path d="M-56,-26 H56 L52,-20 H-52 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.6"/>
          <path d="M-52,-20 L-60,-12 M52,-20 L64,-14 H70" stroke="${k}" stroke-width="1.2" fill="none"/>
          ${fruitHeap(5, 0, -26, 104, 30, 0, INK.yellow, INK.red, true, 4.6, 3.2)}
          ${fruitHeap(6, -4, -42, 44, 8, 0, INK.yellow, INK.green, true, 4.6, 3.2)}
        </g>
        <g transform="translate(125 140)"><rect x="-10" y="-5" width="20" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
          <text y="1.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.6" font-weight="700" fill="${k}">₹120/KG</text></g>`;

      const wasp = (x, y, d) => ctx.still ? '' : `<g transform="translate(${x} ${y})">${easeMove('0 0;8 -5;14 2;5 6;0 0', '3s', ` begin="-${d}s"`)}<ellipse rx="1.6" ry="0.9" fill="${INK.yellow}" stroke="${k}" stroke-width="0.35"/><path d="M-0.4,-0.9 V0.9" stroke="${k}" stroke-width="0.4"/><path d="M0,-0.8 q-1,-2 -2,-1.4 M0,-0.8 q1,-2 2,-1.4" fill="none" stroke="${k}" stroke-width="0.3">${loop('opacity', '1;0.3;1', '0.4s')}</path></g>`;
      const valance = (dy) => `M70,58 H180 V64 ${Array.from({ length: 10 }, (_, i) => `Q${f(180 - i * 11 - 5.5)},${f(68 + dy)} ${f(180 - (i + 1) * 11)},64`).join(' ')} Z`;
      const quart = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-6,0 L-7,-8 H7 L6,0 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/><path d="M-6.6,-4 H6.6" stroke="${k}" stroke-width="0.3"/>${fruitHeap(x, 0, -8, 12, 3, 0, INK.yellow, INK.red, false, 2.6, 2.3)}</g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
        <g fill="none" stroke="${k}" stroke-width="0.45" opacity="0.5"><path d="M182,120 V36 H212"/><path d="M190,46 H210 M190,58 H210 M190,70 H210 M190,82 H210 M190,94 H210 M190,106 H210"/></g>
        <g transform="translate(198 132)"><path d="M0,35 V0" stroke="${k}" stroke-width="2"/><path d="${scallop(0, -12, 18, 16, 11, 4)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/><path d="${scallop(0, -12, 18, 16, 11, 4)}" fill="url(#${p}-leaf)"/></g>
        <g transform="translate(50 167)">
          <path d="M0,0 V-50" stroke="${INK.green}" stroke-width="2"/><path d="M-6,-50 H6" stroke="${INK.green}" stroke-width="1.6"/>
          <circle cx="-6" cy="-55" r="4" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/><circle cx="6" cy="-55" r="4" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/>
          <path d="M-12,-26 H12 V-30 H-12 Z" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
          <text y="-27" text-anchor="middle" font-family="${FONT.sans}" font-size="2.8" font-weight="700" fill="${INK.paper}">SUBWAY</text>
        </g>
        <path d="M66,58 L125,34 L184,58 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M84,58 L125,34 M166,58 L125,34 M104,58 L125,34 M146,58 L125,34" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        <g>${ctx.a(easeLoop('d', `${valance(0)};${valance(-3)};${valance(0)}`, '3s'))}
          <path d="${valance(0)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/></g>
        <path d="M70,58 H180" stroke="${k}" stroke-width="0.8"/>
        <path d="M72,64 V167 M178,64 V167" stroke="${k}" stroke-width="1"/>
        <path d="M66,138 H184 V144 H66 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M68,144 H182 V156 L174,152 L166,156 L158,152 L150,156 L142,152 L134,156 L126,152 L118,156 L110,152 L102,156 L94,152 L86,156 L78,152 L68,156 Z" fill="${INK.red}" fill-opacity="0.55" stroke="${k}" stroke-width="0.4"/>
        <path d="M76,156 V167 M174,156 V167" stroke="${k}" stroke-width="0.9"/>
        <g transform="translate(125 138)">
          <path d="M-30,0 V-20 H30 V0 Z" fill="${INK.kaapi}" fill-opacity="0.55" stroke="${k}" stroke-width="0.5"/>
          <path d="M-30,-13 H30 M-30,-6.5 H30" stroke="${k}" stroke-width="0.35"/>
          ${fruitHeap(8, 0, -18, 60, 16, 0, INK.yellow, INK.red, false, 4.2, 3.7)}
          <path d="M-30,-20 V0 M30,-20 V0" stroke="${k}" stroke-width="0.8"/>
        </g>
        ${quart(84, 138)}${quart(166, 138)}
        <g transform="translate(150 94)"><path d="M0,16 V30" stroke="${INK.kaapi}" stroke-width="1.2"/><rect x="-15" y="0" width="30" height="17" fill="${k}" stroke="${INK.kaapi}" stroke-width="1.2"/>
          <text y="7.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4.8" font-weight="700" fill="${INK.paper}">PEACHES</text>
          <text y="13.4" text-anchor="middle" font-family="${FONT.sans}" font-size="4" font-weight="500" fill="${INK.paper}">$4 / LB</text></g>
        <g transform="translate(96 86)"><path d="M0,0 V6" stroke="${k}" stroke-width="0.5"/>${ctx.a(easeSpin('-4;4;-4', '3s'))}<g transform="translate(0 6)"><circle cy="5" r="5" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><path d="M0,5 L2.6,2.6" stroke="${INK.red}" stroke-width="0.6"/><path d="M-6,16 Q0,20 6,16 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><path d="M0,10 V16 M0,10 L-6,16 M0,10 L6,16" stroke="${k}" stroke-width="0.3"/></g></g>
        ${wasp(118, 104, 0)}${wasp(134, 108, 1.5)}`;
      return {
        top: { city: 'blr', caption: 'LALBAGH, MAY', clause: 'One fruit, one month.', art: top },
        bottom: { city: 'nyc', caption: 'UNION SQUARE, AUGUST', clause: 'We wait all year.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 5: In a Drawer. A Namma Metro token x a MetroCard, noon.
  // Two kitchen drawers pulled open, fronts back to back across the seam.
  // ======================================================================
  T.register({
    id: 's-5', rank: '5', suit: 'spade', title: 'In a Drawer',
    pair: ['Namma Metro token', 'MetroCard'],
    sentence: ['You kept one in a drawer', 'long after it stopped working.'],
    why: 'The ride ended years ago. The ticket moved in with the rubber bands.',
    mechanism: 'Two kitchen drawers, fronts back to back. A token in one, a MetroCard in the other.',
    sound: 'A drawer on a sticky runner, keys, a token rolling.',
    draw(ctx) {
      const p = ctx.id;
      const slide = ctx.a(easeMove('0 -3;0 -3;0 1.5;0 1.5;0 -3', '12s'));
      // Drawer interior is a trapezoid: back edge y=100, front edge y=140.
      const drawer = (inner, front) => `<g>${slide}
        <path d="M66,100 H184 L196,140 H54 Z" fill="${INK.kaapi}" fill-opacity="0.22" stroke="${k}" stroke-width="0.6"/>
        <path d="M66,100 L54,140 M184,100 L196,140" stroke="${k}" stroke-width="0.4"/>
        <path d="M66,100 H184 V104 H66 Z" fill="${k}" opacity="0.18"/>
        ${inner}
        <rect x="52" y="140" width="146" height="20" fill="${front}" stroke="${k}" stroke-width="0.7"/>
        <rect x="56" y="143" width="138" height="14" fill="none" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
        <path d="M113,150 H137" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>
      </g>`;
      const band = (x, y, rx, ry, c, rot) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="${c}" stroke-width="0.8"/>`;
      const key = (x, y, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot})"><circle r="3.4" fill="${c}" stroke="${k}" stroke-width="0.45"/><circle r="1.1" fill="${INK.kaapi}" fill-opacity="0.3"/><path d="M3.2,-1 H14 V1 H13 V3 H11.6 V1 H10.4 V2.4 H9 V1 H3.2 Z" fill="${c}" stroke="${k}" stroke-width="0.4"/></g>`;
      const glint = (x, y, d) => `<path d="M${x},${y - 3} L${x + 0.7},${y - 0.7} L${x + 3},${y} L${x + 0.7},${y + 0.7} L${x},${y + 3} L${x - 0.7},${y + 0.7} L${x - 3},${y} L${x - 0.7},${y - 0.7} Z" fill="${INK.paper}" opacity="${ctx.still ? 0.9 : 0}">${ctx.a(easeLoop('opacity', '0;0;1;0;0', '4s', ` begin="-${d}s"`))}</path>`;
      // The token: round blue plastic with a ring, rocking on its edge.
      const token = `<g transform="translate(125 122)">
        <g>${ctx.a(`<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 1;0.25 1;1 1;1 1" keyTimes="0;0.4;0.5;0.6;1" calcMode="spline" keySplines="0 0 1 1;0.45 0 0.55 1;0.45 0 0.55 1;0 0 1 1" dur="6s" repeatCount="indefinite"/>`)}
        <ellipse rx="9" ry="6.4" fill="${INK.blue}" stroke="${k}" stroke-width="0.6"/>
        <ellipse rx="6" ry="4.2" fill="none" stroke="${INK.paper}" stroke-width="0.5"/>
        <path d="M-3,1.6 V-1.6 L0,0.8 L3,-1.6 V1.6" fill="none" stroke="${INK.paper}" stroke-width="0.7" stroke-linejoin="round"/>
        <path d="M-6.4,-3.4 Q-4,-5.4 -1,-5.6" stroke="${INK.paper}" stroke-width="0.6" fill="none" opacity="0.7"/></g>
        <ellipse cx="0.6" cy="7.4" rx="8" ry="1.2" fill="${k}" opacity="0.2"/>
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.16"/>
        <rect x="162" y="34" width="40" height="32" fill="${INK.blue}" fill-opacity="0.3" stroke="${k}" stroke-width="0.6"/>
        <path d="M162,45 H202 M162,56 H202 M172,34 V66 M182,34 V66 M192,34 V66" stroke="${k}" stroke-width="0.5"/>
        <path d="M162,34 H202 V38 Q182,44 162,38 Z" fill="${INK.green}" opacity="0.6"/>
        <g transform="translate(70 30)"><path d="M10,-6 V0" stroke="${k}" stroke-width="0.5"/>
          <rect x="0" y="0" width="20" height="30" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <rect x="0" y="0" width="20" height="11" fill="${INK.red}" opacity="0.85"/>
          <circle cx="10" cy="5.5" r="3.4" fill="${INK.yellow}"/>
          <g fill="${k}" opacity="0.5">${Array.from({ length: 20 }, (_, i) => `<rect x="${f(2 + (i % 5) * 3.4)}" y="${f(13 + Math.floor(i / 5) * 3.8)}" width="2" height="2"/>`).join('')}</g>
        </g>
        <path d="M100,66 H140" stroke="${k}" stroke-width="1"/>
        <g fill="${k}" fill-opacity="0.12" stroke="${k}" stroke-width="0.5"><rect x="104" y="52" width="10" height="14" rx="1.5"/><rect x="117" y="56" width="10" height="10" rx="1.5"/><rect x="130" y="48" width="8" height="18" rx="1.5"/></g>
        <path d="M106,54 h6 M119,58 h6" stroke="${INK.paper}" stroke-width="0.8"/>
        <rect x="38" y="76" width="174" height="10" fill="${k}" opacity="0.85"/>
        <path d="M60,79 l4,2 M120,80 l6,1 M170,78 l3,3" stroke="${INK.paper}" stroke-width="0.4" opacity="0.4"/>
        <rect x="38" y="86" width="174" height="81" fill="${INK.kaapi}" opacity="0.55"/>
        <path d="M44,90 V167 M206,90 V167" stroke="${k}" stroke-width="0.4" opacity="0.6"/>
        <g transform="translate(150 76)"><path d="M-8,0 L-7,-14 H7 L8,0 Z" fill="${k}" fill-opacity="0.12" stroke="${k}" stroke-width="0.5"/>${wisps(ctx, 0, -16, 14, { dur: 3, count: 3, spread: 2, op: 0.4 })}</g>
        ${drawer(`
          ${band(82, 112, 6, 3.2, INK.red, -10)}${band(88, 114, 5, 2.6, INK.kaapi, 20)}${band(166, 128, 6, 3, INK.red, 15)}
          ${key(90, 128, -20, INK.yellow)}${key(150, 110, 160, INK.paper)}
          <g transform="translate(168 112) rotate(10)"><rect x="-7" y="-3" width="14" height="6" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/><rect x="-4" y="-3" width="8" height="6" fill="${INK.yellow}" opacity="0.8"/></g>
          <g transform="translate(108 108) rotate(-6)"><rect x="-6" y="-1.6" width="12" height="3.2" rx="1.4" fill="${k}"/><rect x="5.6" y="-0.8" width="1.4" height="1.6" fill="${k}"/><rect x="-6" y="-1.6" width="4" height="3.2" fill="${INK.yellow}"/></g>
          <path d="M140,134 L176,130" stroke="${INK.blue}" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="72" cy="132" r="2.6" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/>
          ${token}${glint(92, 126, 0)}${glint(152, 108, 2)}`, INK.paper)}
      `;
      const metro = `<g transform="translate(125 122) rotate(-6)">
        <rect x="-15" y="-9.5" width="30" height="19" rx="1.4" fill="${INK.yellow}" stroke="${k}" stroke-width="0.6"/>
        <rect x="-15" y="-9.5" width="30" height="5" fill="${INK.blue}"/>
        <text x="-12.5" y="3" font-family="${FONT.sans}" font-size="5.6" font-weight="700" font-style="italic" fill="${INK.blue}">MetroCard</text>
        <path d="M-15,6 H15" stroke="${k}" stroke-width="1.6"/>
        <path d="M-12,-2 L13,-2" stroke="${INK.paper}" stroke-width="0.4" opacity="0">${ctx.a(easeLoop('opacity', '0;0;0.9;0;0', '6s', ' begin="-1s"'))}</path>
      </g>`;
      const menu = (x, y, rot, c, label) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-16" y="-11" width="32" height="22" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><rect x="-16" y="-11" width="32" height="7" fill="${c}"/><text y="-5.6" text-anchor="middle" font-family="${FONT.sans}" font-size="4.6" font-weight="700" fill="${INK.paper}">${label}</text><path d="M-12,-1 H8 M-12,2.5 H12 M-12,6 H4" stroke="${k}" stroke-width="0.5" opacity="0.5"/><path d="M0,-11 V11" stroke="${k}" stroke-width="0.3" opacity="0.4"/></g>`;
      const packet = (x, y, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-4" y="-2.4" width="8" height="4.8" fill="${c}" stroke="${k}" stroke-width="0.35"/><path d="M-4,-1.2 h8" stroke="${k}" stroke-width="0.2" stroke-dasharray="0.6 0.6"/></g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.12"/>
        <rect x="38" y="20" width="174" height="56" fill="${INK.paper}" opacity="0.8"/>
        <path d="${Array.from({ length: 8 }, (_, i) => `M38,${26 + i * 7} H212`).join(' ')}" stroke="${k}" stroke-width="0.25" opacity="0.4"/>
        <path d="${Array.from({ length: 8 }, (_, r) => Array.from({ length: 13 }, (_, c) => `M${38 + c * 14 + (r % 2) * 7},${19 + r * 7} v7`).join(' ')).join(' ')}" stroke="${k}" stroke-width="0.25" opacity="0.4"/>
        <g transform="translate(176 40)"><circle r="10" fill="${INK.paper}" stroke="${k}" stroke-width="0.9"/><path d="M0,0 V-6.5 M0,0 L4.6,0" stroke="${k}" stroke-width="0.8" stroke-linecap="round"/><path d="M0,0 V7.4" stroke="${INK.red}" stroke-width="0.4">${ctx.a(spin('0;360', '12s'))}</path></g>
        <g transform="translate(80 76)"><rect x="-12" y="-18" width="24" height="18" rx="2" fill="${INK.red}" opacity="0.85" stroke="${k}" stroke-width="0.5"/><rect x="-9" y="-15" width="18" height="10" fill="${k}" opacity="0.7"/><circle cx="7" cy="-3" r="1" fill="${INK.paper}"/></g>
        <rect x="38" y="76" width="174" height="10" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,86 H212" stroke="${k}" stroke-width="0.8"/>
        <rect x="38" y="86" width="174" height="81" fill="${INK.blue}" opacity="0.32"/>
        <path d="M44,90 V167 M206,90 V167" stroke="${k}" stroke-width="0.4" opacity="0.6"/>
        ${drawer(`
          ${menu(88, 116, -8, INK.red, 'SZECHUAN')}${menu(160, 114, 6, INK.green, 'PIZZA')}
          ${band(176, 132, 6, 3, INK.red, 15)}${band(80, 134, 5, 2.6, INK.blue, -15)}
          ${packet(104, 134, 20, k)}${packet(112, 136, -10, k)}${packet(146, 134, 40, INK.red)}
          <path d="M62,126 L74,132" stroke="${INK.red}" stroke-width="1.6" stroke-linecap="round"/>
          ${key(146, 108, 200, INK.paper)}${metro}${glint(150, 108, 3)}`, INK.paper)}
      `;
      return {
        top: { city: 'blr', caption: 'MG ROAD', clause: 'You kept one in a drawer', art: top },
        bottom: { city: 'nyc', caption: 'TIMES SQUARE', clause: 'long after it stopped working.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 6: Fan on High. Summer power cut x heatwave, 2 PM.
  // The inverter and the box fan sit on the floor, back to back.
  // ======================================================================
  T.register({
    id: 's-6', rank: '6', suit: 'spade', title: 'Fan on High',
    pair: ['Power cut', 'Heatwave'],
    sentence: ["Everyone's fan is on.", "Nobody's fan is enough."],
    why: 'May in one city, July in the other. Every fan on, everyone sweating anyway.',
    mechanism: 'An inverter and a box fan, back to back. The ceiling fan dies and the inverter starts blinking.',
    sound: 'A fan winding down, an inverter beep, AC drip, box fan rattle.',
    draw(ctx) {
      const p = ctx.id;
      const cut = ' keyTimes="0;0.4;0.41;0.83;0.84;1"';
      // Ceiling fan seen from below at an angle; slows to a stop, then recovers.
      const fanSpin = ctx.a(`<animateTransform attributeName="transform" type="rotate" additive="sum" values="0;1080;1260;1260;1800" keyTimes="0;0.34;0.58;0.84;1" calcMode="spline" keySplines="0 0 1 1;0 0 0.35 1;0 0 1 1;0.65 0 1 1" dur="12s" repeatCount="indefinite"/>`);
      const blade = (a) => `<path d="M3,-2 L30,-4.5 Q33,0 30,4.5 L3,2 Z" transform="rotate(${a})" fill="${INK.paper}" stroke="${k}" stroke-width="0.8"/>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.22"/>
        <rect x="38" y="20" width="174" height="8" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <rect x="46" y="46" width="44" height="58" fill="${INK.yellow}" stroke="${k}" stroke-width="0.7"/>
        <circle cx="68" cy="66" r="12" fill="${INK.paper}" opacity="0.6"/>
        <path d="M46,60 H90 M46,75 H90 M46,90 H90 M57,46 V104 M68,46 V104 M79,46 V104" stroke="${k}" stroke-width="0.7"/>
        <path d="M44,104 H92" stroke="${k}" stroke-width="1.6"/>
        <g transform="translate(160 28)">
          <path d="M0,0 V18" stroke="${k}" stroke-width="1.2"/>
          <g transform="translate(0 22) scale(1 0.32)"><g>${fanSpin}${blade(0)}${blade(120)}${blade(240)}</g></g>
          <ellipse cx="0" cy="21.5" rx="5" ry="3.2" fill="${k}"/>
        </g>
        <g transform="translate(184 50)"><path d="M0,-22 V0" stroke="${k}" stroke-width="0.4"/><rect x="-1.6" y="0" width="3.2" height="7" rx="1.2" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
          <circle cy="3.5" r="6" fill="${INK.yellow}" opacity="${ctx.still ? 0 : 0.5}">${ctx.a(loop('opacity', '0.5;0.5;0;0;0.5;0.5', '12s', cut))}</circle></g>
        <g transform="translate(104 56)"><path d="M8,-4 V0" stroke="${k}" stroke-width="0.5"/><rect width="16" height="24" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/><rect width="16" height="9" fill="${INK.green}" opacity="0.8"/><circle cx="8" cy="4.5" r="2.6" fill="${INK.yellow}"/>
          <g fill="${k}" opacity="0.5">${Array.from({ length: 15 }, (_, i) => `<rect x="${f(1.6 + (i % 5) * 2.8)}" y="${f(11 + Math.floor(i / 5) * 3.8)}" width="1.6" height="1.6"/>`).join('')}</g><circle cx="${f(1.6 + 3 * 2.8 + 0.8)}" cy="${f(11 + 3.8 + 0.8)}" r="1.6" fill="none" stroke="${INK.red}" stroke-width="0.4"/></g>
        <g transform="translate(198 84)">
          <path d="M6,-8 H10 V8 H6 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <g>${ctx.a(easeSpin('-25 6 0;25 6 0;-25 6 0', '6s'))}
            <path d="M6,0 H0" stroke="${k}" stroke-width="1.2"/>
            <ellipse cx="-4" cy="0" rx="3.4" ry="11" fill="${INK.blue}" fill-opacity="0.25" stroke="${k}" stroke-width="0.6"/>
            <path d="M-4,-11 V11 M-6.8,-6 L-1.2,6 M-6.8,6 L-1.2,-6" stroke="${k}" stroke-width="0.3"/>
            <ellipse cx="-4" cy="0" rx="1.2" ry="2.6" fill="${k}"/>
          </g>
          <path d="M8,8 V64" stroke="${k}" stroke-width="0.4"/>
        </g>
        <path d="M38,148 H212 V167 H38 Z" fill="${INK.red}" opacity="0.5"/>
        <path d="M38,148 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M38,148 H212 V151 H38 Z" fill="${k}" opacity="0.6"/>
        <g transform="translate(70 167)">
          <path d="M-12,-1 L-10,-20 H12 L14,-1 M-10,-20 L-12,-34 H8 L10,-20" fill="none" stroke="${INK.green}" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M-11,-20 H13" stroke="${INK.green}" stroke-width="2.6"/>
          <g transform="translate(0 -21)">${sitter(ctx, { top: INK.paper, leg: INK.blue, arm: `<g transform="translate(3 -12)"><path d="M0,0 L5,6 L4,-2" fill="none" stroke="${INK.paper}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(4 -2)">${ctx.a(easeSpin('-25;25;-25', '0.5s'))}<path d="M0,0 V-4" stroke="${INK.kaapi}" stroke-width="0.8"/><path d="M0,-4 C-6,-5 -7,-14 0,-16 C7,-14 6,-5 0,-4 Z" fill="${INK.kaapi}" fill-opacity="0.7" stroke="${k}" stroke-width="0.45"/><path d="M0,-4 V-15 M-3,-6 L-4.5,-13 M3,-6 L4.5,-13" stroke="${k}" stroke-width="0.3"/></g></g>` })}</g>
        </g>
        <g transform="translate(125 166)">
          <rect x="-16" y="-24" width="32" height="24" rx="1.5" fill="${INK.paper}" stroke="${k}" stroke-width="0.7"/>
          <rect x="-11" y="-19" width="14" height="7" fill="${INK.green}" fill-opacity="0.5" stroke="${k}" stroke-width="0.4"/>
          <text x="-4" y="-13.8" text-anchor="middle" font-family="${FONT.sans}" font-size="4.4" font-weight="700" fill="${k}">230V</text>
          <path d="M-12,-6 H12 M-12,-4 H12" stroke="${k}" stroke-width="0.35" opacity="0.6"/>
          <circle cx="9" cy="-16" r="1.8" fill="${INK.green}" stroke="${k}" stroke-width="0.35" opacity="${ctx.still ? 1 : 1}">${ctx.a(loop('opacity', '1;1;0;0;1;1', '12s', cut))}</circle>
          <circle cx="9" cy="-10.6" r="1.8" fill="${INK.red}" stroke="${k}" stroke-width="0.35" opacity="${ctx.still ? 0.25 : 0}">${ctx.a(loop('opacity', '0;1;0;1;0', '1s'))}</circle>
          <path d="M16,-8 C24,-8 22,0 30,0" fill="none" stroke="${k}" stroke-width="0.8"/>
          <rect x="30" y="-16" width="22" height="16" fill="${k}"/>
          <rect x="33" y="-19" width="4" height="3" fill="${INK.red}"/><rect x="45" y="-19" width="4" height="3" fill="${k}"/>
          <path d="M33,-10 H49" stroke="${INK.paper}" stroke-width="0.5" opacity="0.5"/>
        </g>
        <rect width="${W}" height="${H}" fill="${k}" opacity="0">${ctx.a(loop('opacity', '0;0;0.12;0.12;0;0', '12s', cut))}</rect>`;

      const drip = (x, y, d) => ctx.still ? `<ellipse cx="${x}" cy="${y + 8}" rx="0.7" ry="1.2" fill="${INK.blue}"/>` :
        `<ellipse cx="${x}" cy="${y}" rx="0.7" ry="1.2" fill="${INK.blue}" opacity="0">${move(`0 0;0 ${167 - y}`, '1.5s', ` begin="-${d}s"`)}${loop('opacity', '1;1;0', '1.5s', ` begin="-${d}s" keyTimes="0;0.9;1"`)}</ellipse>`;
      const ac = (x, y, d) => `<g transform="translate(${x} ${y})"><rect x="-13" y="0" width="26" height="14" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M-10,3 H10 M-10,5.5 H10 M-10,8 H10 M-10,10.5 H10" stroke="${k}" stroke-width="0.4"/><path d="M-13,0 L-15,-3 H15 L13,0" fill="${k}" opacity="0.4"/></g>${drip(x + 10, y + 14, d)}`;
      const win = (x, y) => `<rect x="${x}" y="${y}" width="16" height="22" fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.5"/><path d="M${x - 2},${y + 22} h20" stroke="${INK.paper}" stroke-width="1.4"/>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.32"/>
        <g transform="translate(64 38)"><g>${ctx.a(spin('0;360', '12s'))}${rays(16, 13, 18, 23, 0.8, INK.red, 0.6)}</g><circle r="10" fill="${INK.yellow}" stroke="${INK.red}" stroke-width="0.6"/></g>
        <rect x="96" y="44" width="116" height="104" fill="${INK.red}" opacity="0.32"/>
        <rect x="96" y="44" width="116" height="104" fill="url(#${p}-brick)"/>
        <path d="M96,44 H212 M96,44 V148" stroke="${k}" stroke-width="0.7"/>
        <path d="M96,40 H212 V44 H96 Z" fill="${k}" opacity="0.7"/>
        ${win(108, 56)}${win(140, 56)}${win(172, 56)}${win(108, 96)}${win(140, 96)}${win(172, 96)}
        ${ac(116, 66, 0)}${ac(180, 66, 0.7)}${ac(148, 106, 0.3)}
        <path d="M38,148 H212 V167 H38 Z" fill="${k}" opacity="0.15"/>
        <path d="M38,148 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M70,148 L66,167 M130,148 L128,167 M190,148 L192,167" stroke="${k}" stroke-width="0.3" opacity="0.5"/>
        ${[0, 1, 2].map((i) => `<path d="M${50 + i * 14},140 q2,-4 0,-8 q-2,-4 0,-8" fill="none" stroke="${INK.red}" stroke-width="0.5" opacity="0">${ctx.a(easeMove('0 4;0 -4', '3s', ` begin="-${i}s"`) + easeLoop('opacity', '0;0.6;0', '3s', ` begin="-${i}s"`))}</path>`).join('')}
        <g transform="translate(125 166)">
          <rect x="-15" y="-31" width="30" height="31" rx="2" fill="${INK.blue}" stroke="${k}" stroke-width="0.7"/>
          <circle cy="-15.5" r="12" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
          <g transform="translate(0 -15.5)"><g>${ctx.a(spin('0;360', '0.4s'))}${[0, 72, 144, 216, 288].map((a) => `<path d="M0,0 C3,-3 4,-9 1,-10.5 C-1,-8 -1,-3 0,0 Z" transform="rotate(${a})" fill="${INK.blue}" fill-opacity="0.6" stroke="${k}" stroke-width="0.35"/>`).join('')}</g>
            <circle r="12" fill="none" stroke="${k}" stroke-width="0.3"/><circle r="8" fill="none" stroke="${k}" stroke-width="0.3"/><circle r="4" fill="none" stroke="${k}" stroke-width="0.3"/>
            <path d="M-12,0 H12 M0,-12 V12 M-8.5,-8.5 L8.5,8.5 M-8.5,8.5 L8.5,-8.5" stroke="${k}" stroke-width="0.3"/><circle r="2" fill="${k}"/></g>
          <path d="M-6,-31 V-34 H6 V-31" fill="none" stroke="${k}" stroke-width="1"/>
          <path d="M15,-4 C24,-4 26,-10 30,-18 V-40" fill="none" stroke="${k}" stroke-width="0.6"/>
        </g>
        <g transform="translate(172 167)">
          <path d="M-8,0 L6,-14 M6,0 L-8,-14 M-9,-14 H8" stroke="${k}" stroke-width="0.9"/>
          <g transform="translate(0 -14)">${sitter(ctx, { top: INK.paper, leg: INK.kaapi, arm: `<g transform="translate(3 -12)"><path d="M0,0 L5,6 L4,-2" fill="none" stroke="${INK.paper}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(4 -2)">${ctx.a(easeSpin('-20;20;-20', '0.6s'))}<path d="M-1,0 L-3,-12 L5,-13 L4,-1 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/><path d="M-2,-9 h5 M-1.6,-6 h5 M-1.2,-3 h4" stroke="${k}" stroke-width="0.3"/></g></g>` }).replace('<g>', '<g transform="scale(-1 1)">')}</g>
        </g>`;
      return {
        top: { city: 'blr', caption: 'BANASHANKARI, MAY', clause: "Everyone's fan is on.", art: top },
        bottom: { city: 'nyc', caption: 'INWOOD, JULY', clause: "Nobody's fan is enough.", art: bottom }
      };
    }
  });

  // ======================================================================
  // 8: Every Window Shows Off. Deepavali x Christmas in Dyker Heights, 6 PM.
  // Two strings of light run along the ground and meet at the seam.
  // ======================================================================
  T.register({
    id: 's-8', rank: '8', suit: 'spade', title: 'Every Window Shows Off',
    pair: ['Deepavali', 'Dyker Heights'],
    sentence: ['One night a year,', 'every window shows off.'],
    why: 'Diyas or ten thousand bulbs. Either way the neighbours are keeping score.',
    mechanism: 'A row of diyas and a row of bulbs meet at the seam, flickering at each other.',
    sound: 'Crackers popping, a rocket whistle, sleigh bells, a generator humming.',
    draw(ctx) {
      const p = ctx.id;
      const diya = (x, y, i) => `<g transform="translate(${x} ${y})"><path d="M-3.2,0 Q0,3 3.2,0 Z" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3"/>
        <circle cy="-2.4" r="3.4" fill="${INK.yellow}" opacity="0.25"/>
        <path d="M0,-0.3 C-1.2,-1.8 -0.5,-3.4 0,-4.4 C0.5,-3.4 1.2,-1.8 0,-0.3 Z" fill="${INK.yellow}" stroke="${INK.red}" stroke-width="0.25">${ctx.a(`<animateTransform attributeName="transform" type="scale" values="1 1;0.85 1.15;1.1 0.9;1 1" dur="${i % 2 ? '0.6s' : '0.8s'}" repeatCount="indefinite" begin="-${f((i * 0.13) % 0.6)}s"/>`)}</path></g>`;
      const kandil = `<g transform="translate(160 64)">${ctx.a(easeSpin('-6;6;-6', '3s'))}
        <path d="M0,-30 V-12" stroke="${INK.paper}" stroke-width="0.4"/>
        <circle cy="0" r="16" fill="${INK.yellow}" opacity="0.18"/>
        <path d="M0,-12 L4,-4 L12,-2 L5,3 L7,12 L0,7 L-7,12 L-5,3 L-12,-2 L-4,-4 Z" fill="${INK.red}" stroke="${INK.yellow}" stroke-width="0.6" stroke-linejoin="round"/>
        <path d="M0,-6 L2,-1 L6,0 L2,2 L3,7 L0,4 L-3,7 L-2,2 L-6,0 L-2,-1 Z" fill="${INK.yellow}"/>
        <path d="M-5,12 V22 M-2,9 V24 M2,9 V24 M5,12 V22" stroke="${INK.yellow}" stroke-width="0.5"/>
        <path d="M-5,12 V22 M5,12 V22" stroke="${INK.pink}" stroke-width="0.5"/>
      </g>`;
      const sparks = (cx, cy) => {
        if (ctx.still) return `<g fill="${INK.yellow}">${Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + (i - 4) * 0.22; return `<circle cx="${f(cx + Math.cos(a) * (8 + (i % 3) * 5))}" cy="${f(cy + Math.sin(a) * (8 + (i % 3) * 5))}" r="0.7"/>`; }).join('')}</g>`;
        let s = '';
        for (let i = 0; i < 14; i++) {
          const a = -Math.PI / 2 + (i - 6.5) * 0.12, d = 14 + (i % 4) * 5, b = ` begin="-${f(i * 0.11)}s"`;
          s += `<circle cx="${cx}" cy="${cy}" r="0.7" fill="${i % 3 ? INK.yellow : INK.paper}" opacity="0">${move(`0 0;${f(Math.cos(a) * d)} ${f(Math.sin(a) * d)};${f(Math.cos(a) * d * 1.3)} ${f(Math.sin(a) * d + 6)}`, '0.8s', b)}${loop('opacity', '1;1;0', '0.8s', b)}</circle>`;
        }
        return s;
      };
      const rocket = (x, y, b) => ctx.still ? '' : `<g transform="translate(${x} ${y})">${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M0,0 L${f(Math.cos(a) * 3)},${f(Math.sin(a) * 3)}" stroke="${i % 2 ? INK.pink : INK.yellow}" stroke-width="0.8" stroke-linecap="round" opacity="0">${loop('opacity', '0;0;1;0;0', '4s', ` begin="${b}" keyTimes="0;0.5;0.55;0.8;1"`)}<animateTransform attributeName="transform" type="scale" values="1;1;1;5;5" keyTimes="0;0.5;0.55;0.8;1" dur="4s" begin="${b}" repeatCount="indefinite"/></path>`; }).join('')}
        <circle r="0.9" fill="${INK.yellow}" opacity="0">${loop('opacity', '0;1;1;0;0', '4s', ` begin="${b}" keyTimes="0;0.05;0.48;0.5;1"`)}${move('0 60;0 60;0 0;0 0', '4s', ` begin="${b}" keyTimes="0;0.05;0.5;1"`)}</circle></g>`;
      let diyas = '';
      [56, 66, 76, 86, 96, 154, 164, 174, 184, 194].forEach((x, i) => { diyas += diya(x, 151, i); });
      let ledge = '';
      [104, 116, 128, 140, 152, 176, 188].forEach((x, i) => { ledge += diya(x, 100, i + 3); });
      const kolam = `<g transform="translate(125 161)">
        <ellipse rx="22" ry="5.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
        <ellipse rx="16" ry="3.8" fill="${INK.red}" opacity="0.85"/>
        <ellipse rx="11" ry="2.6" fill="${INK.yellow}"/>
        <ellipse rx="6" ry="1.4" fill="${INK.green}"/>
        <ellipse rx="2.4" ry="0.6" fill="${INK.paper}"/>
        ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<ellipse cx="${f(Math.cos(a) * 19)}" cy="${f(Math.sin(a) * 4.7)}" rx="1.5" ry="0.6" fill="${INK.pink}"/>`; }).join('')}
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${k}" opacity="0.88"/>
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.25"/>
        ${rocket(62, 50, '0s')}${rocket(200, 36, '-2s')}
        <g fill="${INK.paper}" fill-opacity="0.14" stroke="${INK.paper}" stroke-width="0.5">
          <rect x="88" y="62" width="112" height="84"/>
          <path d="M82,62 L144,40 L206,62 Z" fill="${INK.red}" fill-opacity="0.5"/>
        </g>
        <path d="M82,62 L144,40 L206,62" fill="none" stroke="${INK.paper}" stroke-width="0.4" stroke-dasharray="2 1.4"/>
        <rect x="96" y="70" width="18" height="22" fill="${INK.yellow}" opacity="0.85"/><rect x="174" y="70" width="18" height="22" fill="${INK.yellow}" opacity="0.85"/>
        <path d="M105,70 V92 M96,81 H114 M183,70 V92 M174,81 H192" stroke="${k}" stroke-width="0.6"/>
        <path d="M86,100 H202" stroke="${INK.paper}" stroke-width="1.6"/>
        <path d="M86,100 V106 H202 V100" fill="none" stroke="${INK.paper}" stroke-width="0.5"/>
        ${ledge}
        <rect x="128" y="112" width="32" height="34" fill="${INK.yellow}"/>
        <path d="M128,112 H160 M144,112 V146" stroke="${k}" stroke-width="0.8"/>
        <path d="M126,112 ${Array.from({ length: 9 }, (_, i) => `q2,4 4,0`).join(' ')}" fill="${INK.green}" stroke="${k}" stroke-width="0.3"/>
        <rect x="102" y="116" width="16" height="20" fill="${INK.yellow}" opacity="0.6"/>
        ${kandil}
        <path d="M38,146 H212 V167 H38 Z" fill="${INK.paper}" opacity="0.12"/>
        <rect x="38" y="152" width="64" height="15" fill="${INK.paper}" fill-opacity="0.2" stroke="${INK.paper}" stroke-width="0.4"/>
        <rect x="148" y="152" width="64" height="15" fill="${INK.paper}" fill-opacity="0.2" stroke="${INK.paper}" stroke-width="0.4"/>
        ${diyas}
        ${kolam}
        <g transform="translate(206 152)"><path d="M-3,0 L-2,-5 H2 L3,0 Z" fill="${INK.red}" stroke="${INK.paper}" stroke-width="0.3"/>${sparks(0, -5)}</g>
        <g transform="translate(50 152)"><path d="M-3,0 L-2,-5 H2 L3,0 Z" fill="${INK.green}" stroke="${INK.paper}" stroke-width="0.3"/>${sparks(0, -5)}</g>`;

      const bulbs = (pts, seed) => { const r = rng(seed); const cols = [INK.red, INK.yellow, INK.green, INK.blue, INK.pink]; return pts.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="1.3" fill="${cols[i % 5]}">${ctx.a(loop('opacity', '1;0.25;1', '1.5s', ` begin="-${f((i % 5) * 0.3)}s"`))}</circle>`).join(''); };
      const along = (x0, y0, x1, y1, n) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)]);
      const nut = (x, s) => `<g transform="translate(${x} 150) scale(${s})">
        <rect x="-5" y="-50" width="10" height="12" fill="${k}" stroke="${INK.paper}" stroke-width="0.4"/><path d="M-6,-38 H6" stroke="${INK.yellow}" stroke-width="1.4"/>
        <rect x="-4" y="-37" width="8" height="7" fill="${INK.paper}" opacity="0.85"/><path d="M-4,-31 H4 V-28 H-4 Z" fill="${INK.paper}"/>
        <path d="M-6,-28 H6 L7,-10 H-7 Z" fill="${INK.red}" stroke="${INK.paper}" stroke-width="0.4"/>
        <path d="M-1.5,-28 V-10 M1.5,-28 V-10" stroke="${INK.yellow}" stroke-width="0.6"/>
        <path d="M-6,-26 L-9,-14 M6,-26 L9,-14" stroke="${INK.red}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M-5,-10 V0 M5,-10 V0" stroke="${INK.blue}" stroke-width="3.4"/><path d="M-7,0 H-2 M2,0 H7" stroke="${k}" stroke-width="1.6"/>
      </g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${k}" opacity="0.9"/>
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.3"/>
        <g>${ctx.a(easeMove('0 0;3 0;0 0;-3 0;0 0', '6s'))}${T.kit.precip(ctx, { kind: 'snow', seed: 51, step: 14, px: 2, py: 28, dur: '6s', color: INK.paper, sw: 0.4, opacity: 0.6 })}</g>
        <g fill="${INK.paper}" fill-opacity="0.12" stroke="${INK.paper}" stroke-width="0.5">
          <rect x="60" y="72" width="130" height="74"/>
          <path d="M52,72 L125,42 L198,72 Z" fill="${INK.blue}" fill-opacity="0.4"/>
        </g>
        ${bulbs(along(52, 72, 125, 42, 16), 1)}${bulbs(along(125, 42, 198, 72, 16), 2)}${bulbs(along(60, 104, 190, 104, 22), 3)}
        <rect x="72" y="80" width="20" height="18" fill="${INK.yellow}" opacity="0.85"/><rect x="158" y="80" width="20" height="18" fill="${INK.yellow}" opacity="0.85"/>
        <path d="M82,80 V98 M72,89 H92 M168,80 V98 M158,89 H178" stroke="${k}" stroke-width="0.6"/>
        <rect x="112" y="110" width="26" height="36" fill="${INK.red}" stroke="${INK.paper}" stroke-width="0.5"/>
        <circle cx="125" cy="122" r="6" fill="none" stroke="${INK.green}" stroke-width="2.6"/>
        <circle cx="125" cy="122" r="6" fill="none" stroke="${INK.yellow}" stroke-width="0.5" stroke-dasharray="0.6 2"/>
        <path d="M123,116 l2,2 l2,-2" fill="${INK.red}"/>
        <g transform="translate(125 40)"><path d="M0,-6 L1.6,-1.8 L6,-1.8 L2.5,1 L3.8,5.4 L0,2.8 L-3.8,5.4 L-2.5,1 L-6,-1.8 L-1.6,-1.8 Z" fill="${INK.yellow}">${ctx.a(easeLoop('opacity', '1;0.5;1', '2s'))}</path></g>
        ${nut(80, 0.8)}${nut(170, 0.8)}
        <path d="M38,150 H212 V167 H38 Z" fill="${INK.paper}" opacity="0.65"/>
        <path d="M38,150 H212" stroke="${INK.paper}" stroke-width="0.6"/>
        <g transform="translate(125 167)">
          <path d="M-13,0 L-8,-17 H8 L13,0 Z" fill="${k}" opacity="0.15"/>
          ${[-1, 1].map((sd) => Array.from({ length: 4 }, (_, i) => { const x = sd * (11 - i * 1.2), y = -2 - i * 4.4; return `<g transform="translate(${f(x)} ${f(y)})"><path d="M0,0 V-6 Q0,-8.6 ${sd * 2},-8.6 Q${sd * 3.6},-8.6 ${sd * 3.6},-7" fill="none" stroke="${INK.red}" stroke-width="1.2" stroke-linecap="round"/><path d="M0,-1 V-6 Q0,-8.6 ${sd * 2},-8.6" fill="none" stroke="${INK.paper}" stroke-width="1.2" stroke-dasharray="1 1.2"/></g>`; }).join('')).join('')}
        </g>
        ${bulbs(along(42, 158, 106, 158, 10), 4)}${bulbs(along(144, 158, 208, 158, 10), 5)}
        <path d="M42,158 H106 M144,158 H208" stroke="${k}" stroke-width="0.3"/>`;
      return {
        top: { city: 'blr', caption: 'BASAVANAGUDI, DEEPAVALI', clause: 'One night a year,', art: top },
        bottom: { city: 'nyc', caption: 'DYKER HEIGHTS, DECEMBER', clause: 'every window shows off.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 9: Until the Glass. Departures at Kempegowda x arrivals at JFK T4, 8 PM.
  // Two sets of sliding glass doors meet at the seam.
  // ======================================================================
  T.register({
    id: 's-9', rank: '9', suit: 'spade', title: 'Until the Glass',
    pair: ['Departures', 'Arrivals'],
    sentence: ['Everyone waves', 'until the glass gets in the way.'],
    why: 'One family waves goodbye at the glass. Another waits with a sign. Same suitcase, probably.',
    mechanism: 'Two sliding doors meet at the seam. One closes on a goodbye, the other opens on a hello.',
    sound: 'Doors hissing, trolley wheels, a boarding call, someone shouting a name.',
    draw(ctx) {
      const p = ctx.id;
      const wave = (a0, a1, d, dur) => easeSpin(`${a0};${a1};${a0}`, dur || '1s', ` begin="-${d}s"`);
      const trolley = (load) => `<g>
        <path d="M-12,-3 H8 L12,-22" fill="none" stroke="${k}" stroke-width="0.9"/>
        <path d="M-12,-4 H8 V-6 H-12 Z" fill="${k}"/>
        <circle cx="-9" cy="-1.4" r="1.6" fill="${k}"/><circle cx="5" cy="-1.4" r="1.6" fill="${k}"/>
        ${load ? `<rect x="-11" y="-17" width="18" height="11" rx="1.2" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/><rect x="-8" y="-23" width="12" height="6" rx="1" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/>` : ''}
      </g>`;
      // Doors: panels slide apart and back in a 6 s cycle.
      const doors = (glass, open) => `
        <rect x="103" y="76" width="44" height="76" fill="${INK.yellow}" opacity="0.35"/>
        <g>${ctx.a(easeMove(open ? '-12 0;-12 0;-12 0;0 0;-12 0' : '0 0;0 0;-12 0;0 0;0 0', '6s'))}<rect x="104" y="77" width="21" height="75" fill="${glass}" fill-opacity="0.45" stroke="${k}" stroke-width="0.6"/><path d="M108,90 L118,80 M108,100 L120,88" stroke="${INK.paper}" stroke-width="0.6" opacity="0.7"/></g>
        <g>${ctx.a(easeMove(open ? '12 0;12 0;12 0;0 0;12 0' : '0 0;0 0;12 0;0 0;0 0', '6s'))}<rect x="125" y="77" width="21" height="75" fill="${glass}" fill-opacity="0.45" stroke="${k}" stroke-width="0.6"/><path d="M129,92 L139,82" stroke="${INK.paper}" stroke-width="0.6" opacity="0.7"/></g>
        <rect x="101" y="72" width="48" height="5" fill="${k}"/>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${k}" opacity="0.8"/>
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.3"/>
        <rect x="38" y="52" width="174" height="100" fill="${INK.yellow}" opacity="0.28"/>
        <g opacity="0.7">
          <g transform="translate(64 152)">${person(ctx, { top: INK.paper, leg: k })}</g>
          <g transform="translate(184 152) scale(0.9)">${person(ctx, { top: INK.pink, leg: k })}</g>
        </g>
        <path d="M38,64 H212" stroke="${INK.paper}" stroke-width="0.4" opacity="0.5"/>
        ${doors(INK.blue, false)}
        <g transform="translate(125 152)" opacity="0.9">
          <g transform="translate(10 0)">${trolley(true)}</g>
          <g transform="translate(-2 0) scale(0.92)">${person(ctx, { top: INK.yellow, leg: INK.blue, armR: -40, armL: 0, animL: wave(150, 175, 0) , extra: '' })}</g>
        </g>
        <rect x="38" y="52" width="174" height="100" fill="${INK.blue}" opacity="0.28"/>
        <path d="M38,52 H212 M38,152 H212 M60,52 V152 M82,52 V152 M168,52 V152 M190,52 V152 M38,100 H101 M149,100 H212" stroke="${k}" stroke-width="0.7"/>
        <path d="M44,140 L56,118 M66,146 L80,120 M172,140 L184,116 M194,146 L206,124" stroke="${INK.paper}" stroke-width="0.7" opacity="0.5"/>
        <path d="M30,52 Q125,30 220,52 V40 Q125,18 30,40 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M30,46 Q125,24 220,46" fill="none" stroke="${k}" stroke-width="0.3"/>
        <g transform="translate(70 56)"><rect x="-24" y="0" width="48" height="10" fill="${k}" stroke="${INK.paper}" stroke-width="0.4"/>
          <text y="7.2" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="1" fill="${INK.yellow}">DEPARTURES</text></g>
        <g transform="translate(182 56)"><rect x="-16" y="0" width="32" height="10" fill="${k}" stroke="${INK.paper}" stroke-width="0.4"/>
          <text y="7.2" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="1" fill="${INK.yellow}">GATE A</text></g>
        <path d="M38,152 H212 V167 H38 Z" fill="${INK.paper}" opacity="0.3"/>
        <path d="M38,152 H212" stroke="${INK.paper}" stroke-width="0.5"/>
        <path d="M38,160 H212" stroke="${INK.yellow}" stroke-width="0.8" stroke-dasharray="6 4" opacity="0.7"/>
        <g transform="translate(78 167)">${person(ctx, { top: INK.red, leg: k, armR: -150, animR: wave(-150, -175, 0.3) })}</g>
        <g transform="translate(93 167) scale(0.7)">${person(ctx, { top: INK.green, leg: k, armR: -160, animR: wave(-160, -130, 0.1, '0.6s') })}</g>
        <g transform="translate(166 167)">${person(ctx, { skirt: INK.kaapi, top: INK.yellow, armL: 155, animL: wave(155, 178, 0.6) })}</g>
        <g transform="translate(198 167)">${trolley(false)}</g>`;

      const balloon = (x, y, c, d) => `<g transform="translate(${x} ${y})"><g>${ctx.a(easeMove('0 0;1.5 -2;0 0;-1.5 -1;0 0', '4s', ` begin="-${d}s"`))}<path d="M0,8 Q-2,18 1,30" fill="none" stroke="${k}" stroke-width="0.3"/><ellipse cx="0" cy="0" rx="5.4" ry="6.6" fill="${c}" stroke="${k}" stroke-width="0.45"/><path d="M-1,6.6 h2 l-1,1.6 Z" fill="${c}"/><path d="M-2.6,-3 q1,-2 3,-2.4" stroke="${INK.paper}" stroke-width="0.6" fill="none"/></g></g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.14"/>
        <rect x="38" y="20" width="174" height="22" fill="${k}" opacity="0.12"/>
        <path d="M38,42 H212" stroke="${k}" stroke-width="0.6"/>
        ${[56, 92, 158, 194].map((x) => `<circle cx="${x}" cy="34" r="2.4" fill="${INK.paper}" stroke="${k}" stroke-width="0.35"/><circle cx="${x}" cy="34" r="6" fill="${INK.yellow}" opacity="0.3"/>`).join('')}
        <g transform="translate(125 50)"><rect x="-30" y="0" width="60" height="11" fill="${INK.yellow}" stroke="${k}" stroke-width="0.5"/>
          <text y="7.8" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="1" fill="${k}">ARRIVALS</text></g>
        <rect x="38" y="68" width="62" height="84" fill="${INK.paper}" opacity="0.7" stroke="${k}" stroke-width="0.4"/>
        <rect x="150" y="68" width="62" height="84" fill="${INK.paper}" opacity="0.7" stroke="${k}" stroke-width="0.4"/>
        <path d="M60,68 V152 M82,68 V152 M172,68 V152 M194,68 V152" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
        <g transform="translate(178 80)"><rect x="-14" y="0" width="28" height="18" fill="${k}"/>
          <g fill="${INK.yellow}">${[0, 1, 2, 3].map((r) => `<rect x="-11" y="${2.6 + r * 3.6}" width="${12 + (r * 5) % 9}" height="1.6"/><rect x="6" y="${2.6 + r * 3.6}" width="5" height="1.6" fill="${r === 1 ? INK.green : INK.yellow}"/>`).join('')}</g></g>
        <g>
          <rect x="103" y="76" width="44" height="76" fill="${INK.paper}"/>
          <g transform="translate(125 152)"><g transform="translate(12 0)">${trolley(true)}</g><g transform="scale(0.92)">${person(ctx, { top: INK.green, leg: k, armR: -30, armL: 150, animL: wave(150, 175, 0.4) })}</g></g>
        </g>
        ${doors(INK.paper, true)}
        <path d="M38,152 H212 V167 H38 Z" fill="${k}" opacity="0.1"/>
        <path d="M38,152 H212" stroke="${k}" stroke-width="0.5"/>
        <g stroke="${k}"><path d="M38,146 H96 M154,146 H212" stroke="${INK.blue}" stroke-width="1.6"/>${[44, 70, 96, 154, 180, 206].map((x) => `<path d="M${x},146 V167" stroke-width="1"/><path d="M${x - 3},166.4 H${x + 3}" stroke-width="1.2"/>`).join('')}</g>
        ${balloon(180, 102, INK.red, 0)}${balloon(190, 108, INK.pink, 1.5)}
        <g transform="translate(184 167)">${person(ctx, { top: INK.blue, leg: k, armL: 150, holdL: '' })}</g>
        <g transform="translate(66 167)">${person(ctx, { top: INK.red, leg: k, armR: -120, armL: 120 })}</g>
        <g transform="translate(84 167) scale(0.72)">${person(ctx, { top: INK.yellow, leg: k, armL: 120, armR: -120 })}</g>
        <g transform="translate(75 126)"><g>${ctx.a(easeMove('0 0;0 -2;0 0', '1s'))}
          <rect x="-22" y="-8" width="44" height="16" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
          <text y="-1" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" fill="${INK.red}">WELCOME</text>
          <text y="5.6" text-anchor="middle" font-family="${FONT.sans}" font-size="5.6" font-weight="700" fill="${INK.red}">HOME!</text></g></g>`;
      return {
        top: { city: 'blr', caption: 'KEMPEGOWDA AIRPORT', clause: 'Everyone waves', art: top },
        bottom: { city: 'nyc', caption: 'JFK, TERMINAL 4', clause: 'until the glass gets in the way.', art: bottom }
      };
    }
  });

  // ======================================================================
  // 10: Midnight Again. Brigade Road x Times Square, New Year's Eve, 11 PM.
  // Two crowds, feet to feet. One kid on shoulders at the centre of each.
  // ======================================================================
  T.register({
    id: 's-10', rank: '10', suit: 'spade', title: 'Midnight Again',
    pair: ['Brigade Road', 'Times Square'],
    sentence: ['Midnight again.', 'Same resolutions.'],
    why: 'Both crowds count down, hug strangers, and swear the gym starts on the second.',
    mechanism: 'Two crowds, feet to feet. One kid on shoulders at the centre of each, arms up.',
    sound: 'A countdown, a roar, party horns, a police whistle, auld lang syne.',
    draw(ctx) {
      const p = ctx.id;
      const crowd = (seed, colors) => {
        const r = rng(seed); let back = '', front = '';
        for (let x = 30; x < 222; x += 7 + r() * 3) {
          const y = 150 + r() * 4, up = r() > 0.55, bd = f(r() * 1.2);
          back += `<g transform="translate(${f(x)} ${f(y)})"><g>${ctx.a(easeMove('0 0;0 -1.6;0 0', '1.2s', ` begin="-${bd}s"`))}<circle cy="-6" r="3.2" fill="${k}"/><path d="M-5,4 Q-5,-3 0,-3 Q5,-3 5,4 Z" fill="${colors[Math.floor(r() * colors.length)]}" stroke="${k}" stroke-width="0.35"/>${up ? `<path d="M-3.4,-2 L-5.4,-13 M3.4,-2 L5.4,-13" stroke="${k}" stroke-width="1.5" stroke-linecap="round"/>` : ''}</g></g>`;
        }
        for (let x = 34; x < 222; x += 11 + r() * 4) {
          if (Math.abs(x - 125) < 12) continue;
          const y = 163 + r() * 3, up = r() > 0.6, bd = f(r() * 1.2);
          front += `<g transform="translate(${f(x)} ${f(y)})"><g>${ctx.a(easeMove('0 0;0 -2;0 0', '1.2s', ` begin="-${bd}s"`))}<circle cy="-8" r="4" fill="${k}"/><path d="M-7,6 Q-7,-3.4 0,-3.4 Q7,-3.4 7,6 Z" fill="${colors[Math.floor(r() * colors.length)]}" stroke="${k}" stroke-width="0.4"/>${up ? `<path d="M-4.4,-2 L-7,-16 M4.4,-2 L7,-16" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/>` : ''}</g></g>`;
        }
        return back + front;
      };
      const shoulders = (c1, c2, hold) => `<g transform="translate(125 168)"><g>${ctx.a(easeMove('0 0;0 -2;0 0', '0.6s'))}
        <path d="M-8,0 Q-8,-14 0,-14 Q8,-14 8,0 Z" fill="${c1}" stroke="${k}" stroke-width="0.45"/>
        <circle cy="-18" r="4.4" fill="${k}"/>
        <path d="M-5,-15 L-7,-8 M5,-15 L7,-8" stroke="${k}" stroke-width="2" stroke-linecap="round"/>
        <path d="M-4.6,-19 Q-4.6,-28 0,-28 Q4.6,-28 4.6,-19" fill="${c2}" stroke="${k}" stroke-width="0.4"/>
        <circle cy="-31.4" r="3" fill="${k}"/>
        <g transform="translate(-3.6 -26)">${ctx.a(easeSpin('-150;-170;-150', '0.6s'))}<path d="M0,0 L0,10" stroke="${k}" stroke-width="1.6" stroke-linecap="round" transform="rotate(0)"/></g>
        <g transform="translate(3.6 -26)">${ctx.a(easeSpin('150;170;150', '0.6s'))}<path d="M0,0 L0,10" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>${hold || ''}</g>
      </g></g>`;
      const confetti = (seed, n, cols) => { if (ctx.still) { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${f(40 + r() * 170)}" y="${f(30 + r() * 110)}" width="2" height="1.1" transform="rotate(${Math.round(r() * 180)} ${f(40 + r() * 170)} ${f(30 + r() * 110)})" fill="${cols[i % cols.length]}"/>`; return s; } const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += faller(ctx, f(40 + r() * 170), f(24 + r() * 20), f(110 + r() * 30), cols[i % cols.length], i % 3 ? '4s' : '6s', `-${f(r() * 6)}s`, 'M-1.1,-0.6 H1.1 V0.6 H-1.1 Z', 4); return s; };
      const streamer = (d0, d1, c, dl) => `<path d="${d0}" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round">${ctx.a(easeLoop('d', `${d0};${d1};${d0}`, '3s', ` begin="-${dl}s"`))}</path>`;
      const sign = (x, y, w, c, txt, d) => `<g transform="translate(${x} ${y})"><rect width="${w}" height="10" fill="${c}" stroke="${INK.paper}" stroke-width="0.5"/><text x="${w / 2}" y="7.3" text-anchor="middle" font-family="${FONT.sans}" font-size="6" font-weight="700" letter-spacing="0.8" fill="${INK.paper}">${txt}${d != null ? ctx.a(loop('opacity', '1;1;0.3;1;1', '6s', ` begin="-${d}s" keyTimes="0;0.5;0.52;0.54;1"`)) : ''}</text></g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${k}"/>
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.25"/>
        <g fill="${INK.paper}" fill-opacity="0.1" stroke="${INK.paper}" stroke-width="0.45">
          <path d="M38,150 V50 H86 V150 Z"/><path d="M164,150 V40 H212 V150 Z"/>
        </g>
        ${[0, 1, 2, 3].map((r) => [0, 1].map((c) => `<rect x="${46 + c * 20}" y="${80 + r * 16}" width="10" height="9" fill="${INK.yellow}" opacity="${(r + c) % 2 ? 0.9 : 0.4}"/>`).join('')).join('')}
        ${[0, 1, 2, 3].map((r) => [0, 1].map((c) => `<rect x="${172 + c * 20}" y="${76 + r * 16}" width="10" height="9" fill="${INK.yellow}" opacity="${(r + c) % 2 ? 0.4 : 0.9}"/>`).join('')).join('')}
        ${sign(40, 60, 44, INK.red, 'MUSIC', 0)}${sign(166, 50, 44, INK.green, 'PUB', 3)}
        <path d="M86,66 Q125,82 164,58" fill="none" stroke="${INK.paper}" stroke-width="0.4"/>
        ${Array.from({ length: 11 }, (_, i) => { const t = i / 10, x = 86 + 78 * t, y = (1 - t) * (1 - t) * 66 + 2 * (1 - t) * t * 82 + t * t * 58; return `<circle cx="${f(x)}" cy="${f(y)}" r="1.3" fill="${[INK.yellow, INK.pink, INK.green][i % 3]}">${ctx.a(loop('opacity', '1;0.3;1', '1.5s', ` begin="-${f((i % 3) * 0.5)}s"`))}</circle>`; }).join('')}
        ${streamer('M70,40 C90,70 110,50 120,90 S140,110 132,130', 'M70,40 C96,64 104,56 124,90 S136,110 128,130', INK.red, 0)}
        ${streamer('M180,30 C160,60 170,80 150,100 S160,120 150,136', 'M180,30 C166,58 160,82 154,100 S152,122 156,136', INK.yellow, 1)}
        ${streamer('M100,30 C110,50 96,70 104,96', 'M100,30 C104,52 106,70 98,96', INK.green, 2)}
        ${confetti(3, 26, [INK.yellow, INK.pink, INK.paper, INK.green])}
        ${crowd(7, [INK.red, INK.blue, INK.green, INK.yellow, INK.paper])}
        ${shoulders(INK.blue, INK.yellow, `<g transform="translate(0 10)"><path d="M0,0 L4,-12 L-1,-11 Z" fill="${INK.pink}" stroke="${k}" stroke-width="0.4"/></g>`)}`;

      const bottom = `
        <rect width="${W}" height="${H}" fill="${k}"/>
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.2"/>
        <g stroke="${INK.paper}" stroke-width="0.45">
          <path d="M38,150 V40 H84 V150 Z" fill="${INK.blue}" fill-opacity="0.5"/>
          <path d="M166,150 V56 H212 V150 Z" fill="${INK.red}" fill-opacity="0.4"/>
          <path d="M138,150 V70 H164 V150 Z" fill="${INK.paper}" fill-opacity="0.15"/>
        </g>
        <rect x="42" y="50" width="38" height="26" fill="${INK.pink}" opacity="0.8"/>
        <rect x="42" y="82" width="38" height="16" fill="${INK.yellow}" opacity="0.85"/>
        <rect x="42" y="104" width="38" height="30" fill="${INK.green}" opacity="0.7"/>
        <rect x="170" y="62" width="38" height="20" fill="${INK.yellow}" opacity="0.85"/>
        <rect x="170" y="88" width="38" height="34" fill="${INK.blue}" opacity="0.9"/>
        <path d="M46,58 H74 M46,64 H66 M174,96 H200 M174,104 H194" stroke="${INK.paper}" stroke-width="1.2" opacity="0.8"/>
        <g opacity="0.9">${ctx.a(loop('opacity', '0.9;0.9;0.4;0.9', '3s', ' keyTimes="0;0.6;0.7;1"'))}<rect x="46" y="108" width="30" height="22" fill="${INK.paper}" opacity="0.3"/></g>
        <path d="M151,70 V40" stroke="${INK.paper}" stroke-width="1"/>
        <g transform="translate(151 66)"><g>${ctx.a(easeMove('0 -26;0 -26;0 0;0 0;0 -26', '12s'))}
          <circle r="9" fill="${INK.yellow}" opacity="0.25"/>
          <circle r="6" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>
          <path d="M-6,0 H6 M0,-6 V6 M-4.2,-4.2 L4.2,4.2 M-4.2,4.2 L4.2,-4.2" stroke="${INK.blue}" stroke-width="0.4"/>
          <circle r="3.4" fill="none" stroke="${INK.pink}" stroke-width="0.5"/></g></g>
        ${confetti(5, 34, [INK.paper, INK.yellow, INK.pink, INK.blue, INK.red])}
        ${crowd(11, [INK.red, INK.blue, INK.paper, INK.yellow, INK.pink])}
        <g transform="translate(66 167)"><path d="M-14,0 V-12 M14,0 V-12" stroke="${k}" stroke-width="1.2"/><rect x="-16" y="-15" width="32" height="6" fill="${INK.blue}" stroke="${INK.paper}" stroke-width="0.4"/>
          <text y="-10.6" text-anchor="middle" font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${INK.paper}">POLICE LINE</text></g>
        <g transform="translate(184 167)"><path d="M-14,0 V-12 M14,0 V-12" stroke="${k}" stroke-width="1.2"/><rect x="-16" y="-15" width="32" height="6" fill="${INK.blue}" stroke="${INK.paper}" stroke-width="0.4"/>
          <text y="-10.6" text-anchor="middle" font-family="${FONT.sans}" font-size="3.6" font-weight="700" fill="${INK.paper}">POLICE LINE</text></g>
        ${shoulders(INK.red, INK.green, `<g transform="translate(0 10)"><path d="M-3,0 L3,0 L0,-8 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/></g>`)}`;
      return {
        top: { city: 'blr', caption: 'BRIGADE ROAD', clause: 'Midnight again.', art: top },
        bottom: { city: 'nyc', caption: 'TIMES SQUARE', clause: 'Same resolutions.', art: bottom }
      };
    }
  });

  // ======================================================================
  // Jack: Mother Calls. Gully cricket x stickball.
  // The stone wicket and the manhole-cover home plate meet at the seam.
  // ======================================================================
  T.register({
    id: 's-j', rank: 'J', suit: 'spade', title: 'Mother Calls',
    pair: ['Gully cricket', 'Stickball'],
    sentence: ['The game ends', "when someone's mother calls."],
    why: 'No umpire, no innings, no rules worth keeping. The only final whistle is a window opening.',
    mechanism: 'Stone wicket and manhole plate meet at the seam. Both batters swing at the same moment.',
    sound: 'Tennis ball off a wall, a shout of out, a name called twice.',
    draw(ctx) {
      const p = ctx.id;
      // Ball pitched from the left, hit at 1.5 s, flies off up and right. 3 s loop.
      const ball = (c, sz) => `<g transform="translate(60 150)" opacity="${ctx.still ? 1 : 1}">${ctx.a(`<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;34 14;64 2;90 -50;120 -100" keyTimes="0;0.25;0.5;0.75;1" dur="3s" repeatCount="indefinite"/>` + loop('opacity', '0;1;1;1;0', '3s', ' keyTimes="0;0.05;0.5;0.85;1"'))}<circle r="${sz}" fill="${c}" stroke="${k}" stroke-width="0.4"/></g>`;
      const swing = (x, bat, batW) => `<g transform="translate(${x} 167)">
        ${person(ctx, { top: INK.paper, leg: k, armL: 60, armR: 60 })}
        <g transform="translate(-3 -18)"><g>${ctx.a(`<animateTransform attributeName="transform" type="rotate" additive="sum" values="-40;-40;100;-40" keyTimes="0;0.42;0.52;1" calcMode="spline" keySplines="0 0 1 1;0.6 0 0.4 1;0.45 0 0.55 1" dur="3s" repeatCount="indefinite"/>`)}
          <path d="M0,0 L0,-${batW}" stroke="${bat}" stroke-width="${bat === INK.kaapi ? 2.6 : 1.4}" stroke-linecap="round" transform="rotate(-30)"/></g></g>
      </g>`;
      const call = (x, y) => ctx.still ? `<g fill="none" stroke="${INK.red}" stroke-width="0.7"><path d="M${x + 6},${y - 4} q4,4 0,8 M${x + 9},${y - 7} q6,7 0,14"/></g>` :
        [0, 1, 2].map((i) => `<path d="M${x + 6},${y - 5} q5,5 0,10" fill="none" stroke="${INK.red}" stroke-width="0.8" opacity="0">${move('0 0;14 0', '1.5s', ` begin="-${f(i * 0.5)}s"`)}${loop('opacity', '0;1;0', '1.5s', ` begin="-${f(i * 0.5)}s"`)}</path>`).join('');
      const mother = (x, y, frame, sari) => `<g>
        <rect x="${x - 11}" y="${y - 14}" width="22" height="24" fill="${k}" opacity="0.85"/>
        <g transform="translate(${x} ${y + 10})"><circle cy="-15" r="3.4" fill="${INK.paper}" opacity="0.15"/><circle cy="-15" r="3.4" fill="${k}" stroke="${INK.yellow}" stroke-width="0.4"/><path d="M-6,0 Q-6,-10 0,-11 Q6,-10 6,0 Z" fill="${sari}"/>
          <path d="M4,-8 L10,-14" stroke="${sari}" stroke-width="2" stroke-linecap="round">${ctx.a(easeSpin('0 4 -8;-20 4 -8;0 4 -8', '1.5s'))}</path></g>
        <rect x="${x - 11}" y="${y - 14}" width="22" height="24" fill="none" stroke="${frame}" stroke-width="1.2"/>
        ${call(x + 8, y - 6)}
      </g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.yellow}" opacity="0.2"/>
        <g transform="translate(200 120)"><path d="M0,47 C2,30 -4,10 2,-40" fill="none" stroke="${INK.kaapi}" stroke-width="2.6"/>
          ${[-60, -20, 20, 60, 100, 140, 180].map((a) => `<path d="M2,-40 q${f(Math.cos(a * Math.PI / 180) * 10)},${f(Math.sin(a * Math.PI / 180) * 6 - 6)} ${f(Math.cos(a * Math.PI / 180) * 22)},${f(Math.sin(a * Math.PI / 180) * 14 + 4)}" fill="none" stroke="${INK.green}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}</g>
        <path d="M164,150 V40 M158,46 H170 M158,52 H170" stroke="${k}" stroke-width="1.2"/>
        <g>${ctx.a(easeMove('0 0;0 1.2;0 0', '6s'))}<path d="M30,60 Q100,74 164,46 T260,58 M30,66 Q102,80 164,52 T260,64" fill="none" stroke="${k}" stroke-width="0.3"/></g>
        <g transform="translate(176 56)"><path d="M-4,0 Q-3,-3 0,-3 Q2,-5 4,-3 L5.4,-2.6 L4,-2 Q3.4,0 0,0.4 Z" fill="${k}"/><path d="M-1,0.4 V2 M1,0.4 V2" stroke="${k}" stroke-width="0.4"/></g>
        <path d="M38,96 H112 V150 H38 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        <path d="M32,96 L54,70 H120 L112,96 Z" fill="${INK.red}" opacity="0.8" stroke="${k}" stroke-width="0.5"/>
        <path d="M40,90 L58,72 M52,90 L68,72 M64,90 L80,72 M76,90 L92,72 M88,90 L104,72 M100,90 L114,74" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
        ${mother(76, 118, INK.green, INK.pink)}
        <path d="M65,104 V128 M70,104 V128 M75,104 V128 M80,104 V128 M85,104 V128" stroke="${INK.green}" stroke-width="0.6"/>
        <path d="M112,120 H212 V150 H112 Z" fill="${INK.blue}" opacity="0.25"/>
        <path d="M112,120 H212" stroke="${k}" stroke-width="0.6"/>
        <path d="M112,120 H212" stroke="${INK.paper}" stroke-width="2" stroke-dasharray="3 3" opacity="0.6"/>
        <path d="M38,150 H212 V167 H38 Z" fill="${INK.kaapi}" opacity="0.3"/>
        <path d="M38,150 H212" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,150 H212" stroke="${INK.paper}" stroke-width="0.3" opacity="0.5"/>
        <path d="M140,150 L150,140 L158,148" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g transform="translate(125 167)" fill="${INK.paper}" stroke="${k}" stroke-width="0.5">
          <path d="M-7,0 Q-8,-4 -3,-5 L4,-5 Q8,-4 7,0 Z" fill="${k}" fill-opacity="0.25"/>
          <path d="M-5,-5 Q-6,-9 -1,-10 L3,-10 Q6,-9 5,-5 Z" fill="${k}" fill-opacity="0.2"/>
          <path d="M-3,-10 Q-4,-14 0,-14 Q4,-14 3,-10 Z" fill="${k}" fill-opacity="0.3"/>
        </g>
        ${swing(138, INK.kaapi, 13)}
        <g transform="translate(54 167) scale(0.8)">${person(ctx, { top: INK.blue, leg: k, armR: -160, armL: 30 })}</g>
        <g transform="translate(180 167) scale(-1 1)">${person(ctx, { top: INK.green, leg: k, armL: 30, armR: 30 })}</g>
        ${ball(INK.yellow, 1.6)}`;

      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.14"/>
        <rect x="38" y="40" width="96" height="110" fill="${INK.red}" opacity="0.3"/>
        <rect x="38" y="40" width="96" height="110" fill="url(#${p}-brick)"/>
        <path d="M38,40 H134 V150" fill="none" stroke="${k}" stroke-width="0.6"/>
        <path d="M36,40 H136 V36 H36 Z" fill="${k}" opacity="0.6"/>
        <g fill="${INK.blue}" fill-opacity="0.35" stroke="${k}" stroke-width="0.45"><rect x="48" y="50" width="12" height="18"/><rect x="104" y="50" width="12" height="18"/><rect x="48" y="84" width="12" height="18"/></g>
        ${mother(110, 92, INK.paper, INK.blue)}
        <g stroke="${k}" stroke-width="0.6" fill="none"><path d="M44,74 H66 M44,108 H66 M44,74 V70 M66,74 V70 M44,108 V104 M66,108 V104 M48,74 L62,108"/></g>
        <rect x="134" y="64" width="78" height="86" fill="${INK.kaapi}" opacity="0.45"/>
        <path d="M134,64 H212" stroke="${k}" stroke-width="0.6"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.4"><rect x="146" y="76" width="12" height="16"/><rect x="176" y="76" width="12" height="16"/><rect x="146" y="106" width="12" height="16"/><rect x="176" y="106" width="12" height="16"/></g>
        <path d="M38,150 H212 V167 H38 Z" fill="${k}" opacity="0.2"/>
        <path d="M38,150 H212" stroke="${k}" stroke-width="0.6"/>
        <g transform="translate(196 150)"><path d="M-4,0 V-10 Q-4,-14 0,-14 Q4,-14 4,-10 V0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.45"/><rect x="-6" y="-9" width="12" height="2.6" rx="1" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/><path d="M-5,0 H5" stroke="${k}" stroke-width="1"/></g>
        <g transform="translate(125 166)"><ellipse rx="10" ry="2.6" fill="${k}" opacity="0.8"/><ellipse rx="7.4" ry="1.8" fill="none" stroke="${INK.paper}" stroke-width="0.35" opacity="0.6"/><path d="M-6,0 H6 M-4,-1.2 H4 M-4,1.2 H4" stroke="${INK.paper}" stroke-width="0.3" opacity="0.5"/></g>
        ${swing(140, INK.kaapi, 18)}
        <g transform="translate(56 167)">${person(ctx, { top: INK.yellow, leg: k, armR: -60 })}</g>
        <g transform="translate(176 167) scale(-0.9 0.9)">${person(ctx, { top: INK.red, leg: INK.blue, armL: 20, armR: 40 })}</g>
        ${ball(INK.pink, 1.7)}`;
      return {
        top: { city: 'blr', caption: 'MALLESHWARAM', clause: 'The game ends', art: top },
        bottom: { city: 'nyc', caption: 'EAST HARLEM', clause: "when someone's mother calls.", art: bottom }
      };
    }
  });

  // ======================================================================
  // Queen: Two Perfect Weeks. Lalbagh in November x Riverside in October.
  // One bench through the seam, a sitter on each side in a light layer.
  // ======================================================================
  T.register({
    id: 's-q', rank: 'Q', suit: 'spade', title: 'Two Perfect Weeks',
    pair: ['November, Bangalore', 'October, New York'],
    sentence: ['Two perfect weeks', 'we talk about all year.'],
    why: 'A light shawl, a light jacket. Both cities at their best and both gone by Friday.',
    mechanism: 'Two benches back to back. A shawl on one, a jacket on the other. Nobody gets up.',
    sound: 'Wind in the rain trees, a barbet, leaves skittering, a tugboat.',
    draw(ctx) {
      const p = ctx.id;
      const bench = (c) => `<g transform="translate(125 167)">
        <path d="M-30,-9 H30 M-30,-6.6 H30" stroke="${c}" stroke-width="1.8"/>
        <path d="M-30,-15 H30 M-30,-18 H30 M-30,-21 H30" stroke="${c}" stroke-width="1.5"/>
        <path d="M-26,0 V-22 M26,0 V-22" stroke="${k}" stroke-width="1.1"/><path d="M-26,-6 L-22,0 M26,-6 L22,0" stroke="${k}" stroke-width="0.9"/>
      </g>`;
      const shawl = `<g>${ctx.a(easeLoop('d', 'M-5,-14 Q0,-17 5,-14 L6,-4 Q3,-1 -1,-3 L-7,-6 Z;M-5,-14 Q0,-17 5,-14 L6,-4 Q2,-2 -2,-2 L-8,-4 Z;M-5,-14 Q0,-17 5,-14 L6,-4 Q3,-1 -1,-3 L-7,-6 Z', '3s'))}</g>`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.16"/>
        <rect width="${W}" height="${H}" fill="${INK.green}" opacity="0.06"/>
        <g>${ctx.a(easeMove('0 0;-14 0;0 0', '12s'))}<path d="${scallop(80, 40, 30, 8, 10, 4)}" fill="${INK.paper}" opacity="0.85"/><path d="${scallop(180, 52, 24, 6, 9, 3)}" fill="${INK.paper}" opacity="0.7"/></g>
        <g transform="translate(70 0)"><g>${ctx.a(easeSpin('0 0 167;1 0 167;0 0 167;-1 0 167;0 0 167', '6s'))}
          <path d="M-4,167 C-2,140 -4,124 -10,112 L-4,110 C0,118 2,118 4,110 L10,112 C4,124 4,140 5,167 Z" fill="${k}"/>
          <path d="M-8,112 C-18,104 -30,100 -40,98 M8,112 C18,104 30,100 40,98" stroke="${k}" stroke-width="1.6" fill="none"/>
          <path d="${scallop(0, 84, 54, 22, 18, 5)}" fill="${INK.green}" stroke="${k}" stroke-width="0.5"/>
          <path d="${scallop(0, 84, 54, 22, 18, 5)}" fill="url(#${p}-leaf)"/></g></g>
        <g transform="translate(188 167)">
          <path d="M0,0 V-34" stroke="${k}" stroke-width="2"/>
          <path d="${scallop(0, -46, 22, 16, 12, 4)}" fill="${INK.green}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5"/>
          <path d="${scallop(0, -46, 22, 16, 12, 4)}" fill="url(#${p}-leaf)"/>
        </g>
        <path d="M38,140 Q125,132 212,140 V167 H38 Z" fill="${INK.green}" opacity="0.55"/>
        <path d="M38,140 Q125,132 212,140" fill="none" stroke="${k}" stroke-width="0.4"/>
        <g transform="translate(160 138)" fill="${INK.red}">${[0, 6, 12, 18].map((x) => `<circle cx="${x}" cy="${x % 12 ? -1 : 0}" r="1.4"/>`).join('')}</g>
        <path d="M38,152 H212" stroke="${INK.paper}" stroke-width="0.5" opacity="0.6"/>
        <g opacity="0.55" fill="${INK.paper}">${ctx.a(easeMove('0 0;10 0;0 0', '6s'))}<path d="M30,126 H120 M150,130 H230" stroke="${INK.paper}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="30 10"/></g>
        ${bench(INK.kaapi)}
        <g transform="translate(116 158)">${sitter(ctx, { top: INK.paper, leg: INK.paper, extra: `<path d="M-5,-14.6 Q0,-17 5,-14.6 L6,-4 Q3,-1 -1,-3 L-6.4,-5.6 Z" fill="${INK.pink}" stroke="${k}" stroke-width="0.4">${ctx.a(easeLoop('d', 'M-5,-14.6 Q0,-17 5,-14.6 L6,-4 Q3,-1 -1,-3 L-6.4,-5.6 Z;M-5,-14.6 Q0,-17 5,-14.6 L6,-4 Q2,-2 -2,-2 L-8,-4 Z;M-5,-14.6 Q0,-17 5,-14.6 L6,-4 Q3,-1 -1,-3 L-6.4,-5.6 Z', '3s'))}</path><path d="M-4,-12 L4,-8 M-4,-9 L4,-5" stroke="${INK.red}" stroke-width="0.4"/>` })}</g>
        <g transform="translate(140 158)"><path d="M-2.2,0 L2.2,0 L1.8,-5 L-1.8,-5 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/>${wisps(ctx, 0, -6, 12, { dur: 3, count: 3, spread: 1, sw: 0.45 })}</g>
        <g transform="translate(150 60)">${bird(ctx, k, '0.5s', 1)}${ctx.a(easeMove('0 0;-30 10;0 0', '12s'))}</g>`;

      const leaves = (seed, n) => { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += fallingLeaf(ctx, f(46 + r() * 160), f(56 + r() * 40), f(60 + r() * 30), i % 2 ? INK.red : INK.yellow, i % 3 ? '6s' : '4s', `-${f(r() * 6)}s`); return s; };
      const autumn = (cx, cy, rx, ry, c1, c2, seed) => `<g>
        <path d="M${cx - 2.5},167 L${cx - 1.6},${cy + 8} L${cx + 1.6},${cy + 8} L${cx + 2.5},167 Z" fill="${k}"/>
        <path d="M${cx},${cy + 14} L${cx - 14},${cy + 2} M${cx},${cy + 12} L${cx + 12},${cy}" stroke="${k}" stroke-width="1.3" stroke-linecap="round"/>
        <path d="${scallop(cx, cy, rx, ry, 14, 4)}" fill="${c1}" stroke="${k}" stroke-width="0.5"/>
        ${petalBed(seed, cx - rx, cx + rx, cy - ry, cy + ry, 34, c2, 0.8)}</g>`;
      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.18"/>
        <path d="M38,86 Q70,76 100,82 L160,80 Q190,74 212,80 V100 H38 Z" fill="${INK.kaapi}" opacity="0.5"/>
        <path d="M38,100 H212 V120 H38 Z" fill="${INK.blue}" opacity="0.6"/>
        <g>${ctx.a(easeMove('0 0;12 0;0 0', '6s'))}<path d="M40,106 H70 M96,112 H136 M160,106 H196" stroke="${INK.paper}" stroke-width="0.7" opacity="0.8"/></g>
        <g transform="translate(150 100)"><g>${ctx.a(move('-160 0;80 0', '12s', ' begin="-6s"'))}<path d="M-8,0 L-6,-4 H4 L6,-7 H8 V0 Z" fill="${INK.red}" stroke="${k}" stroke-width="0.4"/><path d="M3,-7 V-10" stroke="${k}" stroke-width="0.8"/></g></g>
        <path d="M38,120 H212" stroke="${k}" stroke-width="0.5"/>
        <path d="M38,120 H212 V124 H38 Z" fill="${k}" opacity="0.4"/>
        <path d="M38,124 H212 V167 H38 Z" fill="${INK.green}" opacity="0.4"/>
        ${petalBed(17, 38, 212, 150, 167, 60, INK.red, 0.8)}${petalBed(18, 38, 212, 150, 167, 50, INK.yellow, 0.95)}
        <path d="M38,150 H212" stroke="${k}" stroke-width="0.4"/>
        <path d="M38,150 H212 V167 H38 Z" fill="${k}" opacity="0.08"/>
        ${autumn(64, 74, 30, 22, INK.red, INK.yellow, 21)}${autumn(186, 70, 28, 24, INK.yellow, INK.red, 22)}
        <g transform="translate(100 150)"><path d="M0,0 V-30" stroke="${k}" stroke-width="1.4"/><path d="M-3,-30 h6 l-1,-6 h-4 Z" fill="${INK.yellow}" stroke="${k}" stroke-width="0.4"/></g>
        ${bench(INK.green)}
        <g transform="translate(116 158)">${sitter(ctx, { top: INK.red, leg: INK.blue, extra: `<path d="M0,-15.4 V-1 M-4.6,-13 L-4,-1" stroke="${k}" stroke-width="0.35"/><path d="M-2,-15.6 L0,-12 L2,-15.6" fill="none" stroke="${k}" stroke-width="0.35"/>` })}</g>
        <g transform="translate(140 158)"><path d="M-2.6,0 L2.6,0 L2.2,-7 L-2.2,-7 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.4"/><path d="M-2.4,-4.6 H2.4" stroke="${INK.kaapi}" stroke-width="1.6"/></g>
        ${leaves(30, 9)}`;
      return {
        top: { city: 'blr', caption: 'LALBAGH, NOVEMBER', clause: 'Two perfect weeks', art: top },
        bottom: { city: 'nyc', caption: 'RIVERSIDE PARK, OCTOBER', clause: 'we talk about all year.', art: bottom }
      };
    }
  });

  // ======================================================================
  // King: Better Before. MG Road x East Village.
  // Two old-timers, back to back, each remembering a city that left.
  // ======================================================================
  T.register({
    id: 's-k', rank: 'K', suit: 'spade', title: 'Better Before',
    pair: ['Bangalore old-timer', 'New York old-timer'],
    sentence: ['Everyone says it was better', 'the year they arrived.'],
    why: 'Every city peaked the year you got there. Ask anyone who got there.',
    mechanism: 'Two old-timers sit back to back. Each speech bubble holds the building the tower replaced.',
    sound: 'A crane groaning, a walking stick, pigeons, the same story twice.',
    draw(ctx) {
      const p = ctx.id;
      const tower = (x, w, top, c) => `<g>
        <rect x="${x}" y="${top}" width="${w}" height="${167 - top}" fill="${c}" fill-opacity="0.35" stroke="${k}" stroke-width="0.6"/>
        <path d="${Array.from({ length: Math.floor((167 - top) / 8) }, (_, i) => `M${x},${top + 8 + i * 8} H${x + w}`).join(' ')} ${Array.from({ length: Math.floor(w / 9) }, (_, i) => `M${x + 9 + i * 9},${top} V167`).join(' ')}" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
        <g clip-path="url(#${p}-win)"><path d="M${x},${top + 30} L${x + w},${top + 6} L${x + w},${top + 18} L${x},${top + 42} Z" fill="${INK.paper}" opacity="0.4">${ctx.a(easeMove('0 0;0 40;0 0', '12s'))}</path></g>
      </g>`;
      const crane = (x, top) => `<g transform="translate(${x} ${top})">
        <path d="M-2,0 V-24 M2,0 V-24 M-2,-4 L2,-8 M-2,-12 L2,-16 M-2,-20 L2,-24" stroke="${INK.yellow}" stroke-width="0.8"/>
        <g transform="translate(0 -24)"><g>${ctx.a(easeSpin('0;-8;0;6;0', '12s'))}
          <path d="M-14,0 H36 M-14,-3 H36 M0,-3 L-14,0 M0,-3 L36,0" stroke="${INK.yellow}" stroke-width="0.8" fill="none"/>
          <path d="M0,-3 V-9 L-14,-1 M0,-9 L36,-1" stroke="${k}" stroke-width="0.3"/>
          <rect x="-16" y="0" width="5" height="4" fill="${k}"/>
          <path d="M28,0 V14" stroke="${k}" stroke-width="0.3">${ctx.a(easeLoop('d', 'M28,0 V14;M28,0 V24;M28,0 V14', '6s'))}</path>
        </g></g></g>`;
      const bubble = (x, y, inner) => `<g transform="translate(${x} ${y})"><g>${ctx.a('<animateTransform attributeName="transform" type="scale" additive="sum" values="1;1;1.06;1;1" keyTimes="0;0.4;0.5;0.6;1" dur="3s" repeatCount="indefinite"/>')}
        <path d="M-18,-12 Q-18,-20 -10,-20 H10 Q18,-20 18,-12 V-2 Q18,6 10,6 H-2 L-10,13 L-8,6 H-10 Q-18,6 -18,-2 Z" fill="${INK.paper}" stroke="${k}" stroke-width="0.6"/>
        ${inner}</g></g>`;
      const oldie = (top, leg, cap) => `${sitter(ctx, { top, leg, arm: `<path d="M3,-12 L7,-5 L9,-5" fill="none" stroke="${top}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><g transform="translate(9 -5)">${ctx.a(easeSpin('0 0 15;-4 0 15;0 0 15', '1.5s'))}<path d="M0,-2 V15" stroke="${INK.kaapi}" stroke-width="1"/><path d="M0,-2 q-2.4,0 -2.4,2" fill="none" stroke="${INK.kaapi}" stroke-width="1"/></g>`, extra: cap }).replace('<g>', '<g transform="rotate(4)">')}`;
      const top = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.16"/>
        ${tower(140, 56, 58, INK.blue)}
        ${crane(168, 58)}
        <path d="M38,106 L74,82 H118 L150,106 Z" fill="${INK.red}" opacity="0.85" stroke="${k}" stroke-width="0.5"/>
        <path d="${Array.from({ length: 6 }, (_, i) => `M${44 + i * 4},${102 - i * 3.6} H${144 - i * 4}`).join(' ')}" stroke="${k}" stroke-width="0.3" opacity="0.6"/>
        <rect x="44" y="106" width="100" height="48" fill="${INK.paper}" stroke="${k}" stroke-width="0.5"/>
        <path d="M40,106 H148" stroke="${k}" stroke-width="1.2"/>
        ${[50, 70, 118, 138].map((x) => `<rect x="${x - 2}" y="108" width="4" height="40" fill="${INK.paper}" stroke="${k}" stroke-width="0.45"/>`).join('')}
        <rect x="56" y="116" width="10" height="20" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/><rect x="122" y="116" width="10" height="20" fill="${INK.green}" stroke="${k}" stroke-width="0.4"/>
        <path d="M80,148 V122 Q94,112 108,122 V148 Z" fill="${INK.kaapi}" fill-opacity="0.7" stroke="${k}" stroke-width="0.4"/>
        <path d="M44,148 H144 V154 H44 Z" fill="${k}" opacity="0.2"/>
        <g transform="translate(196 167)"><path d="M0,0 C-1,-20 2,-30 0,-44" stroke="${k}" stroke-width="2.4" fill="none"/><path d="${scallop(0, -54, 16, 12, 10, 3)}" fill="${INK.green}" stroke="${k}" stroke-width="0.45"/><path d="${scallop(0, -54, 16, 12, 10, 3)}" fill="url(#${p}-leaf)"/></g>
        <path d="M38,154 H212 V167 H38 Z" fill="${k}" opacity="0.12"/>
        <path d="M38,154 H212" stroke="${k}" stroke-width="0.4"/>
        <g transform="translate(125 167)">
          <path d="M-26,-10 H26 M-26,-13 H26" stroke="${k}" stroke-width="1.2"/><path d="M-22,0 V-12 M22,0 V-12" stroke="${k}" stroke-width="1"/>
        </g>
        <g transform="translate(116 155)">${oldie(INK.paper, INK.paper, `<path d="M-3.6,-21 Q0.4,-24.6 4.4,-21 Z" fill="${k}"/>`)}</g>
        ${bubble(150, 128, `<g transform="translate(0 -7)"><path d="M0,9 V2" stroke="${k}" stroke-width="1"/><path d="${scallop(0, -2, 9, 5, 9, 2)}" fill="${INK.green}" stroke="${k}" stroke-width="0.35"/><path d="M-12,9 H12" stroke="${k}" stroke-width="0.4"/></g>`)}
        <g transform="translate(64 154)"><g>${ctx.a(easeMove('0 0;0 0;0 -0.8;0 0;0 0', '3s'))}<path d="M-3.4,0 Q-3,-3.6 0.6,-3.4 Q2.4,-5.4 3.6,-3.6 L4.8,-3.2 L3.4,-2.6 Q3,0 0,0.4 Z" fill="${k}" opacity="0.75"/></g></g>`;

      const bottom = `
        <rect width="${W}" height="${H}" fill="${INK.blue}" opacity="0.14"/>
        ${tower(150, 62, 52, INK.blue)}
        ${crane(186, 52)}
        <rect x="38" y="50" width="106" height="98" fill="${INK.red}" opacity="0.3"/>
        <rect x="38" y="50" width="106" height="98" fill="url(#${p}-brick)"/>
        <path d="M38,50 H144 V148" fill="none" stroke="${k}" stroke-width="0.6"/>
        <path d="M36,50 H146 V46 H36 Z" fill="${k}" opacity="0.6"/>
        <g transform="translate(70 46)"><path d="M-6,0 L-5,-8 M6,0 L5,-8 M0,0 V-8" stroke="${k}" stroke-width="0.5"/><rect x="-7" y="-18" width="14" height="10" fill="${INK.kaapi}" fill-opacity="0.75" stroke="${k}" stroke-width="0.5"/><path d="M-8,-18 L0,-24 L8,-18 Z" fill="${k}"/></g>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.4">${[60, 84, 128].map((y) => [48, 66, 118].map((x) => `<rect x="${x}" y="${y}" width="10" height="14"/>`).join('')).join('')}</g>
        <g stroke="${k}" stroke-width="0.6" fill="none"><path d="M44,78 H80 M44,102 H80 M44,78 V74 M80,78 V74 M44,102 V98 M80,102 V98 M50,78 L74,102"/></g>
        <path d="M100,148 V118 H138 V148" fill="${k}" opacity="0.7"/>
        <rect x="108" y="122" width="22" height="26" fill="${INK.kaapi}" stroke="${INK.paper}" stroke-width="0.3"/>
        <g fill="${INK.paper}" stroke="${k}" stroke-width="0.45">
          <rect x="102" y="148" width="40" height="5"/><rect x="98" y="153" width="48" height="7"/><rect x="94" y="160" width="56" height="7"/>
        </g>
        <path d="M94,167 C94,154 98,148 102,146 M150,167 C150,154 146,148 142,146" fill="none" stroke="${k}" stroke-width="0.9"/>
        <path d="M38,148 H94 M150,148 H212" stroke="${k}" stroke-width="0.4"/>
        <path d="M38,148 H94 V167 H38 Z M150,148 H212 V167 H150 Z" fill="${k}" opacity="0.12"/>
        <g transform="translate(116 160)">${oldie(INK.kaapi, INK.blue, `<path d="M-3.8,-20.4 Q0.4,-25 4.6,-20.4 L7,-20 Z" fill="${INK.red}"/>`)}</g>
        ${bubble(160, 126, `<g transform="translate(0 -6)"><rect x="-6" y="-6" width="12" height="15" fill="${INK.red}" opacity="0.6" stroke="${k}" stroke-width="0.35"/><path d="M-3,-2 h2 M1,-2 h2 M-3,3 h2 M1,3 h2" stroke="${k}" stroke-width="0.8"/><rect x="-2.6" y="-11" width="5.2" height="4" fill="${INK.kaapi}" stroke="${k}" stroke-width="0.3"/><path d="M-3,-11 L0,-13.4 L3,-11 Z" fill="${k}"/><path d="M-12,9 H12" stroke="${k}" stroke-width="0.4"/></g>`)}
        <g transform="translate(190 148)"><g>${ctx.a(easeMove('0 0;0 0;0 -0.8;0 0;0 0', '3s', ' begin="-1s"'))}<path d="M-3.4,0 Q-3,-3.6 0.6,-3.4 Q2.4,-5.4 3.6,-3.6 L4.8,-3.2 L3.4,-2.6 Q3,0 0,0.4 Z" fill="${k}" opacity="0.75"/></g></g>`;
      return {
        top: { city: 'blr', caption: 'MG ROAD', clause: 'Everyone says it was better', art: top },
        bottom: { city: 'nyc', caption: 'EAST VILLAGE', clause: 'the year they arrived.', art: bottom }
      };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
