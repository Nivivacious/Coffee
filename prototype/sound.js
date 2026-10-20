/*
 * A Tale of Two Cities: sound for the moving cards.
 *
 * Everything is synthesised with the Web Audio API, so there are no sound
 * files. Each card has a scene that reads the featured SVG's clock and
 * follows its loop: an engine gets louder as the auto nears the middle, the
 * thunder lands a beat after the lightning, the bell rings when the rings
 * leave the cathedral dome. Timings here mirror the SMIL timings in cards.js.
 *
 * Browser only: window.TaleSound.
 */
(function (root) {
  'use strict';

  let ac = null, master = null, verbIn = null, analyser = null;
  let current = null;          // { id, clock, bus, nodes, scene, state }
  let timer = null, enabled = false, muted = false;
  const bufs = {};

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mod = (a, n) => ((a % n) + n) % n;
  // Piecewise-linear keyframes, same as a SMIL values/keyTimes pair.
  function kf(values, times, p) {
    for (let i = 1; i < times.length; i++) {
      if (p <= times[i]) {
        const u = (p - times[i - 1]) / (times[i] - times[i - 1] || 1);
        return values[i - 1] + (values[i] - values[i - 1]) * u;
      }
    }
    return values[values.length - 1];
  }

  function makeNoise(kind) {
    const len = ac.sampleRate * 4, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
    }
    return b;
  }

  function makeReverb(seconds) {
    const len = Math.floor(ac.sampleRate * seconds), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const v = ac.createConvolver(); v.buffer = b; return v;
  }

  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ac.destination);
    analyser = ac.createAnalyser(); analyser.fftSize = 2048; comp.connect(analyser);
    const verb = makeReverb(2.6);
    verbIn = ac.createGain(); verbIn.gain.value = 0.5;
    verbIn.connect(verb); verb.connect(master);
    bufs.white = makeNoise('white'); bufs.pink = makeNoise('pink'); bufs.brown = makeNoise('brown');
  }

  // ---------- building blocks, bound to one scene's bus ----------
  function kit(bus, nodes) {
    const S = {
      t0: () => ac.currentTime + 0.03,
      gain(v, dest) { const g = ac.createGain(); g.gain.value = v; g.connect(dest || bus); return g; },
      pan(v, dest) { const p = ac.createStereoPanner(); p.pan.value = v || 0; p.connect(dest || bus); return p; },
      filter(type, freq, q, dest) {
        const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q == null ? 0.7 : q;
        f.connect(dest || bus); return f;
      },
      osc(type, freq, dest) {
        const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(dest); o.start(); nodes.push(o); return o;
      },
      noise(kind, dest) {
        const s = ac.createBufferSource(); s.buffer = bufs[kind]; s.loop = true;
        s.connect(dest); s.start(0, Math.random() * 3); nodes.push(s); return s;
      },
      // An LFO on an AudioParam: param moves by +-depth around its value.
      lfo(param, rate, depth, type) {
        const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.value = rate;
        const g = ac.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(); nodes.push(o); return o;
      },
      // Looping noise through filters into a gain we can ride. Returns the gain.
      bed(kind, filters, level, pan) {
        const g = S.gain(level, pan != null ? S.pan(pan) : bus);
        let dest = g;
        for (let i = filters.length - 1; i >= 0; i--) { const [type, freq, q] = filters[i]; dest = S.filter(type, freq, q, dest); }
        S.noise(kind, dest);
        return g;
      },
      set(param, v, smooth) { param.setTargetAtTime(v, ac.currentTime, smooth || 0.08); },
      send(node, amount) { const g = ac.createGain(); g.gain.value = amount; node.connect(g); g.connect(verbIn); },
      tone(o) {
        const t = o.at || S.t0(), a = o.attack || 0.005, d = o.decay || 0.2;
        const osc = ac.createOscillator(); osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.f, t);
        if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || a + d));
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.gain, t + a);
        if (o.hold) g.gain.setValueAtTime(o.gain, t + a + o.hold);
        g.gain.exponentialRampToValueAtTime(0.0001, t + a + (o.hold || 0) + d);
        const out = S.pan(o.pan || 0);
        let dest = out;
        if (o.lp) dest = S.filter('lowpass', o.lp, 0.7, out);
        g.connect(dest); osc.connect(g);
        if (o.verb) S.send(out, o.verb);
        osc.start(t); osc.stop(t + a + (o.hold || 0) + d + 0.1);
      },
      burst(o) {
        const t = o.at || S.t0(), a = o.attack || 0.005, d = o.decay || 0.2;
        const s = ac.createBufferSource(); s.buffer = bufs[o.kind || 'pink'];
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(o.gain, t + a);
        if (o.hold) g.gain.setValueAtTime(o.gain, t + a + o.hold);
        g.gain.exponentialRampToValueAtTime(0.0001, t + a + (o.hold || 0) + d);
        const out = S.pan(o.pan || 0);
        if (o.panTo != null) { out.pan.setValueAtTime(o.pan || 0, t); out.pan.linearRampToValueAtTime(o.panTo, t + a + (o.hold || 0) + d); }
        const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 0.7;
        if (o.freqTo) { f.frequency.setValueAtTime(o.freq, t); f.frequency.exponentialRampToValueAtTime(o.freqTo, t + a + (o.hold || 0) + d); }
        s.connect(f); f.connect(g); g.connect(out);
        if (o.verb) S.send(out, o.verb);
        s.start(t, Math.random() * 3); s.stop(t + a + (o.hold || 0) + d + 0.1);
      },
      // Struck metal: inharmonic partials, higher ones dying faster.
      metal(o) {
        (o.partials || [1, 2.76, 5.4, 8.93]).forEach((r, i) => S.tone({
          at: o.at, f: o.f * r, decay: o.decay / (1 + i * 0.6), gain: o.gain / (1 + i * 0.8), pan: o.pan, verb: o.verb, lp: o.lp
        }));
      },
      bell(o) {
        [[0.5, 1, 4], [1, 1, 3], [1.19, 0.6, 2.2], [1.5, 0.45, 1.8], [2, 0.5, 1.5], [2.51, 0.25, 1], [3.01, 0.2, 0.8]].forEach(([r, g, d]) =>
          S.tone({ at: o.at, f: o.f * r, decay: d * (o.decay || 1), gain: o.gain * g, pan: o.pan, verb: o.verb, attack: 0.004 }));
      }
    };
    return S;
  }

  // ---------- the scenes ----------
  const SCENES = {
    // 8 of Clubs. Auto and cab cross the seam every 12 s; rain comes and goes.
    ride(S) {
      const autoX = (t) => -200 + 400 * (mod(t + 6, 12) / 12);
      const rainOf = (p) => kf([1, 1, 0, 0, 1, 1], [0, 0.42, 0.5, 0.79, 0.92, 1], p / 12);
      const rain = S.bed('pink', [['highpass', 450], ['lowpass', 7000]], 0);
      const patter = S.bed('white', [['bandpass', 3800, 0.8]], 0);
      S.bed('brown', [['lowpass', 260]], 0.05);
      // Auto: a small two-stroke, sawtooth through a lowpass, pulsed.
      const aPan = S.pan(0), aGain = S.gain(0, aPan), amp = S.gain(0.55, aGain);
      S.lfo(amp.gain, 13, 0.45, 'square');
      const aLp = S.filter('lowpass', 520, 2, amp);
      const e1 = S.osc('sawtooth', 31, aLp); S.osc('square', 62, S.gain(0.3, aLp));
      // Cab: a quiet hybrid hum and wet tyres.
      const cPan = S.pan(0), cGain = S.gain(0, cPan);
      S.osc('sine', 68, S.gain(0.5, cGain));
      const tyres = S.gain(0, cPan); S.noise('white', S.filter('bandpass', 1700, 0.6, tyres));
      return {
        cycle: 12,
        update(t, p) {
          const r = rainOf(p);
          S.set(rain.gain, 0.03 + 0.22 * r); S.set(patter.gain, 0.05 * r);
          const x = autoX(t), prox = clamp(1 - Math.abs(x) / 230, 0, 1);
          S.set(aGain.gain, 0.26 * Math.pow(prox, 1.5)); S.set(aPan.pan, clamp(x / 190, -1, 1));
          S.set(e1.frequency, 30 + prox * 5);
          const cx = -x;
          S.set(cGain.gain, 0.1 * Math.pow(prox, 1.5)); S.set(cPan.pan, clamp(cx / 190, -1, 1));
          S.set(tyres.gain, (0.04 + 0.16 * r) * Math.pow(prox, 1.4));
        },
        events: [
          [10.55, (at) => S.tone({ at, type: 'square', f: 1900, decay: 0.015, gain: 0.03, pan: 0.2 })],
          [11.0, (at) => { const pan = clamp(autoX(11) / 190, -1, 1); [0, 0.2].forEach((o) => S.tone({ at: at + o, type: 'square', f: 470, decay: 0.11, gain: 0.05, lp: 1800, pan })); }],
          [0.9, (at) => { const pan = clamp(-autoX(0.9) / 190, -1, 1); [370, 466].forEach((f) => S.tone({ at, type: 'sawtooth', f, attack: 0.01, hold: 0.25, decay: 0.15, gain: 0.035, lp: 1500, pan })); }]
        ]
      };
    },

    // 2 of Hearts. 24 s loop; walker once round, runner twice.
    park(S) {
      const walkerX = (t) => -110 + 220 * (mod(t + 12, 24) / 24);
      const runnerX = (t) => -(-110 + 220 * (mod(t + 6, 12) / 12));
      const breeze = S.bed('pink', [['lowpass', 900]], 0.08);
      const leaves = S.bed('white', [['bandpass', 4200, 0.8]], 0.008);
      const koel = (at) => {
        // The koel's call climbs: each "ku-oo" a little higher than the last.
        for (let i = 0; i < 3; i++) {
          const b = 560 * (1 + 0.13 * i), t = at + i * 1.05;
          S.tone({ at: t, f: b, f2: b * 1.1, attack: 0.02, decay: 0.18, gain: 0.11, pan: -0.4, verb: 0.35 });
          S.tone({ at: t + 0.24, f: b * 1.28, f2: b * 1.62, attack: 0.03, decay: 0.34, gain: 0.13, pan: -0.4, verb: 0.35 });
        }
      };
      const robin = (at) => {
        for (let i = 0; i < 6; i++) {
          const f0 = 2300 + Math.random() * 1100;
          S.tone({ at: at + i * 0.14 + Math.random() * 0.03, f: f0, f2: f0 * (i % 2 ? 1.25 : 0.8), attack: 0.005, decay: 0.08, gain: 0.06, pan: 0.45, verb: 0.25 });
        }
      };
      const coo = (at) => {
        S.tone({ at, f: 330, f2: 390, attack: 0.08, decay: 0.3, gain: 0.1, pan: 0.5, lp: 900 });
        S.tone({ at: at + 0.36, f: 390, f2: 290, attack: 0.05, decay: 0.45, gain: 0.09, pan: 0.5, lp: 900 });
      };
      const st = { w: null, r: null };
      return {
        cycle: 24,
        update(t) {
          S.set(breeze.gain, 0.07 + 0.035 * Math.sin(t * Math.PI / 6), 0.5);
          S.set(leaves.gain, 0.018 + 0.014 * Math.sin(t * Math.PI / 6), 0.5);
          const nw = Math.floor(t / 0.45);
          if (nw !== st.w) {
            st.w = nw; const x = walkerX(t), prox = clamp(1 - Math.abs(x) / 120, 0, 1);
            if (prox > 0.02) S.burst({ kind: 'brown', freq: 420, decay: 0.07, gain: 0.22 * prox, pan: clamp(x / 110, -1, 1) });
          }
          const nr = Math.floor(t / 0.25);
          if (nr !== st.r) {
            st.r = nr; const x = runnerX(t), prox = clamp(1 - Math.abs(x) / 120, 0, 1);
            if (prox > 0.02) S.burst({ kind: 'pink', type: 'bandpass', freq: 650, q: 1, decay: 0.045, gain: 0.15 * prox, pan: clamp(x / 110, -1, 1) });
          }
        },
        events: [[1.5, koel], [13.5, koel], [7.5, robin], [19.0, robin], [10.5, coo], [22.0, coo]]
      };
    },

    // 3 of Hearts. Darshini above the counter, diner below.
    usual(S) {
      const voices = [[380, -0.45], [720, 0.05], [1350, 0.4]].map(([f, pan]) => ({ g: S.bed('pink', [['bandpass', f, 1.3]], 0.02, pan), v: 0.02 }));
      S.osc('sine', 92, S.gain(0.02));
      const whoosh = S.bed('white', [['bandpass', 420, 0.5]], 0.01, -0.3);
      S.lfo(whoosh.gain, 7.5, 0.008);
      const neon = S.gain(0.01, S.pan(0.35)); S.osc('sawtooth', 120, S.filter('lowpass', 700, 1, neon));
      const pour = (at, dur, f, gain, pan) => {
        S.burst({ at, kind: 'pink', type: 'bandpass', freq: f, q: 1.6, attack: 0.08, hold: dur, decay: 0.25, gain, pan });
        for (let i = 0; i < 6; i++) S.tone({ at: at + Math.random() * dur, f: 300 + Math.random() * 300, f2: 140, decay: 0.07, gain: 0.02, pan });
      };
      return {
        cycle: 12,
        update(t, p) {
          voices.forEach((v) => { v.v = clamp(v.v + (Math.random() - 0.5) * 0.016, 0.015, 0.06); S.set(v.g.gain, v.v, 0.15); });
          const flick = p > 8.4 && p < 9.25;
          S.set(neon.gain, flick ? (Math.random() > 0.5 ? 0.016 : 0) : 0.01, 0.01);
        },
        events: [
          [0.8, (at) => S.metal({ at, f: 1650, decay: 0.9, gain: 0.08, pan: -0.2, verb: 0.15 })],
          [1.5, (at) => pour(at, 1.3, 950, 0.07, -0.15)],
          [3.62, (at) => [0, 0.11, 0.26].forEach((o) => S.tone({ at: at + o, type: 'square', f: 3200, decay: 0.012, gain: 0.015, pan: 0.1 }))],
          [5.5, (at) => { S.tone({ at, f: 2093, decay: 1.6, gain: 0.07, pan: 0.3, verb: 0.4 }); S.tone({ at, f: 4186, decay: 0.9, gain: 0.025, pan: 0.3 }); }],
          [7.2, (at) => [0, 0.11, 0.22].forEach((o) => S.metal({ at: at + o, f: 3100, partials: [1, 2.4, 4.1], decay: 0.18, gain: 0.05, pan: 0.25 }))],
          [8.0, (at) => pour(at, 0.9, 700, 0.05, 0.3)],
          [10.2, (at) => { S.metal({ at, f: 900, partials: [1, 2.3, 3.9], decay: 0.4, gain: 0.06, pan: -0.25 }); S.burst({ at, kind: 'brown', freq: 300, decay: 0.08, gain: 0.08, pan: -0.25 }); }]
        ]
      };
    },

    // 7 of Spades. Storm above, snow below. Lightning at 6.0 s.
    weather(S) {
      S.bed('pink', [['highpass', 300], ['lowpass', 9000]], 0.24, -0.15);
      S.bed('white', [['bandpass', 3200, 0.7]], 0.035, -0.2);
      const windF = S.filter('bandpass', 500, 1.8, S.gain(1, S.pan(0.3)));
      const wind = S.gain(0.05); wind.disconnect(); wind.connect(windF);
      S.noise('pink', wind);
      const st = { d: null };
      return {
        cycle: 12,
        update(t) {
          const s = Math.sin(t * Math.PI / 6);
          S.set(windF.frequency, 380 + 300 * (0.5 + 0.5 * s), 0.4);
          S.set(wind.gain, 0.05 + 0.03 * s, 0.4);
          const nd = Math.floor(t / 0.3);
          if (nd !== st.d) {
            st.d = nd;
            if (Math.random() < 0.6) { const f = 1300 + Math.random() * 800; S.tone({ f, f2: f * 0.7, decay: 0.07, gain: 0.025, pan: -0.35, verb: 0.2 }); }
          }
        },
        events: [
          [6.0, (at) => { S.burst({ at, kind: 'white', type: 'highpass', freq: 1500, decay: 0.25, gain: 0.16, pan: 0.2 }); S.burst({ at: at + 0.02, kind: 'pink', freq: 1200, decay: 0.6, gain: 0.1, pan: 0.2 }); }],
          [6.8, (at) => { S.burst({ at, kind: 'brown', freq: 160, freqTo: 70, attack: 0.25, decay: 4, gain: 0.55, pan: 0.1, verb: 0.4 }); S.burst({ at: at + 0.9, kind: 'brown', freq: 100, attack: 0.4, decay: 3, gain: 0.35, pan: -0.2 }); }],
          [2.6, (at) => S.metal({ at, f: 170, partials: [1, 2.7, 5.2, 8.4], decay: 0.3, gain: 0.12, pan: 0.35, lp: 2500 })],
          [2.95, (at) => S.metal({ at, f: 165, partials: [1, 2.7, 5.2, 8.4], decay: 0.25, gain: 0.09, pan: 0.35, lp: 2500 })],
          [9.6, (at) => S.metal({ at, f: 172, partials: [1, 2.7, 5.2, 8.4], decay: 0.35, gain: 0.11, pan: 0.35, lp: 2500 })]
        ]
      };
    },

    // 10 of Clubs. Bell when the rings leave the dome, cars, a siren.
    saint(S) {
      const cr = S.gain(0.5, S.gain(0.012, S.pan(-0.4)));
      const cr2 = S.gain(0.5, cr);
      S.lfo(cr.gain, 1.3, 0.5, 'square'); S.lfo(cr2.gain, 28, 0.5, 'square');
      S.osc('sine', 4700, cr2);
      S.bed('brown', [['lowpass', 220]], 0.05, 0.3);
      S.bed('pink', [['bandpass', 600, 1.4]], 0.014, -0.35);
      const buzz = S.gain(0.006, S.pan(0.3)); S.osc('sawtooth', 120, S.filter('lowpass', 600, 1, buzz));
      const st = { k: null };
      const whoosh = (from, to) => (at) => S.burst({ at, kind: 'pink', type: 'bandpass', freq: 650, q: 0.7, attack: 1.0, decay: 1.3, gain: 0.08, pan: from, panTo: to });
      const siren = (at) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 950;
        const l = ac.createOscillator(); l.frequency.value = 0.55; const lg = ac.createGain(); lg.gain.value = 330; l.connect(lg); lg.connect(o.frequency);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.03, at + 0.8);
        g.gain.setValueAtTime(0.03, at + 3.3); g.gain.exponentialRampToValueAtTime(0.0001, at + 4.6);
        const out = S.pan(0.55); const f = S.filter('lowpass', 2500, 0.7, out); g.connect(f); o.connect(g); S.send(out, 0.5);
        o.start(at); l.start(at); o.stop(at + 4.8); l.stop(at + 4.8);
      };
      return {
        cycle: 12,
        update(t) {
          const nk = Math.floor(t / 0.5);
          if (nk !== st.k) { st.k = nk; S.tone({ f: 62, f2: 42, decay: 0.18, gain: 0.08, lp: 160, pan: 0.35 }); }
          const p = mod(t, 12);
          S.set(buzz.gain, p > 7.2 && p < 7.6 ? (Math.random() > 0.5 ? 0.012 : 0) : 0.006, 0.01);
        },
        events: [
          [0.05, (at) => S.bell({ at, f: 196, gain: 0.16, pan: -0.25, verb: 0.6 })],
          [1.0, whoosh(-0.8, 0.8)], [7.0, whoosh(-0.8, 0.8)],
          [4.0, whoosh(0.8, -0.8)], [10.0, whoosh(0.8, -0.8)],
          [6.4, siren]
        ]
      };
    },

    // Jokers. The pour, steel, and a low drone in Sa and Pa.
    departure(S) { return jokerScene(S, false); },
    return(S) { return jokerScene(S, true); }
  };

  // Cards without their own score get a city bed that suits the suit: a
  // morning yard for Hearts, an office hum for Diamonds, traffic for Clubs,
  // weather for Spades. A small cue lands once per loop.
  function cityScene(S, suit) {
    S.bed('brown', [['lowpass', 240]], 0.05, 0.2);
    S.bed('pink', [['bandpass', 700, 1.2]], suit === 'club' ? 0.03 : 0.015, -0.2);
    if (suit === 'spade') S.bed('pink', [['highpass', 500], ['lowpass', 6000]], 0.07, -0.1);
    if (suit === 'diamond') S.osc('sine', 120, S.gain(0.008, S.pan(0.2)));
    const cue = {
      heart: (at) => [0, 0.16, 0.3].forEach((o, i) => S.tone({ at: at + o, f: 2400 + i * 300, f2: 2900 + i * 200, decay: 0.08, gain: 0.03, pan: -0.3, verb: 0.3 })),
      diamond: (at) => [0, 0.09, 0.2, 0.27, 0.4].forEach((o) => S.burst({ at: at + o, kind: 'white', type: 'bandpass', freq: 3000, q: 2, decay: 0.02, gain: 0.03, pan: 0.2 })),
      club: (at) => S.tone({ at, type: 'square', f: 470, decay: 0.12, gain: 0.03, lp: 1800, pan: 0.3 }),
      spade: (at) => S.burst({ at, kind: 'pink', type: 'bandpass', freq: 500, q: 1.5, attack: 0.8, decay: 1.4, gain: 0.05, pan: 0.3 })
    }[suit] || (() => {});
    return { cycle: 12, update() {}, events: [[2.0, cue], [8.0, cue]] };
  }

  function jokerScene(S, back) {
    const pour = S.bed('pink', [['bandpass', 1100, 0.9]], 0.08, back ? 0.15 : -0.15);
    S.lfo(pour.gain, 9, 0.03);
    S.bed('pink', [['bandpass', 380, 2]], 0.03, back ? 0.15 : -0.15);
    S.bed('white', [['highpass', 6000]], 0.005);
    const drone = S.gain(0.035, S.filter('lowpass', 650, 0.7));
    S.lfo(drone.gain, 0.2, 0.01);
    [130.81, 196.0, 261.63].forEach((f, i) => { const o = S.osc('sawtooth', f, drone); o.detune.value = (i - 1) * 4; });
    // The Return comes back with one more note: the third.
    if (back) S.osc('sine', 164.81, S.gain(0.4, drone));
    const st = { g: null };
    return {
      cycle: 8,
      update(t) {
        const n = Math.floor(t / 0.35);
        if (n !== st.g) { st.g = n; if (Math.random() < 0.5) S.tone({ f: 240 + Math.random() * 120, f2: 110, decay: 0.09, gain: 0.025, pan: back ? -0.25 : 0.25 }); }
      },
      events: [[0.1, (at) => S.metal({ at, f: back ? 1250 : 1500, decay: 1.1, gain: 0.04, pan: back ? -0.3 : -0.4, verb: 0.3 })]]
    };
  }

  // ---------- scheduler ----------
  function stopCurrent() {
    if (!current) return;
    const c = current; current = null;
    c.bus.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    setTimeout(() => { c.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* already stopped */ } }); c.bus.disconnect(); }, 900);
  }

  function startScene(id, clock) {
    stopCurrent();
    const bus = ac.createGain(); bus.gain.value = 0; bus.connect(master);
    const nodes = [];
    const S = kit(bus, nodes);
    const suit = { h: 'heart', d: 'diamond', c: 'club', s: 'spade' }[id[0]];
    const scene = SCENES[id] ? SCENES[id](S) : cityScene(S, suit);
    current = { id, clock, bus, nodes, scene, last: null, prevP: null, idle: 0 };
  }

  function tick() {
    if (!current) return;
    const c = current;
    let t = null;
    try { t = c.clock(); } catch (e) { t = null; }
    if (t == null || isNaN(t)) return;
    // A paused SVG clock stops moving; fade the scene out until it moves again.
    if (c.last !== null && Math.abs(t - c.last) < 1e-4) c.idle++; else c.idle = 0;
    c.last = t;
    const live = c.idle < 3 && !muted;
    c.bus.gain.setTargetAtTime(live ? 1 : 0, ac.currentTime, live ? 0.4 : 0.1);
    if (!live) { c.prevP = null; return; }
    const C = c.scene.cycle, p = mod(t, C);
    c.scene.update(t, p);
    if (c.prevP !== null) {
      const at = ac.currentTime + 0.03;
      c.scene.events.forEach(([time, fn]) => {
        const hit = c.prevP <= p ? time > c.prevP && time <= p : time > c.prevP || time <= p;
        if (hit) fn(at);
      });
    }
    c.prevP = p;
  }

  const api = {
    get enabled() { return enabled; },
    // Turn sound on. Must be called from a click or key press.
    enable() {
      if (!ac) init();
      ac.resume();
      enabled = true;
      master.gain.setTargetAtTime(0.85, ac.currentTime, 0.3);
      if (!timer) timer = setInterval(tick, 40);
      if (api._pending) { startScene(api._pending.id, api._pending.clock); api._pending = null; }
    },
    disable() {
      enabled = false;
      if (!ac) return;
      master.gain.setTargetAtTime(0, ac.currentTime, 0.1);
      setTimeout(() => { if (!enabled) ac.suspend(); }, 500);
    },
    // Follow a card. clock() returns the card's SVG time in seconds.
    follow(id, clock) {
      if (!ac || !enabled) { api._pending = { id, clock }; return; }
      startScene(id, clock);
    },
    // Current output level (RMS, 0 to 1), for checking the mix.
    level() {
      if (!analyser) return 0;
      const d = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(d);
      let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
      return Math.sqrt(sum / d.length);
    },
    // A riffle for the shuffle and a flick for turning a card over.
    riffle() {
      if (!ac || !enabled) return;
      const S = kit(master, []);
      const t = ac.currentTime + 0.02;
      for (let i = 0; i < 26; i++) S.burst({ at: t + 0.25 + i * 0.022 + Math.random() * 0.006, kind: 'white', type: 'bandpass', freq: 2600 + Math.random() * 1600, q: 1.2, decay: 0.018, gain: 0.05 });
      S.burst({ at: t + 0.85, kind: 'pink', freq: 900, decay: 0.08, gain: 0.08 });
    },
    flick() {
      if (!ac || !enabled) return;
      const S = kit(master, []);
      S.burst({ kind: 'white', type: 'bandpass', freq: 2200, q: 0.9, decay: 0.05, gain: 0.07 });
    },
    // Hold the sound while the still print frame is showing.
    mute(m) { muted = !!m; }
  };
  root.TaleSound = api;
})(window);
