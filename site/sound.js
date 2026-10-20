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

  // ---------- a sound library, and one recipe per card ----------
  // Every card below the heroes is scored from these pieces. Each recipe
  // matches the card's "Listen" line in copy.js, so no two cards sound alike.
  function fx(S) {
    const r = Math.random;
    const vib = (at, notes, o) => {
      // A reed or a voice: sawtooth through a bandpass, with vibrato.
      o = Object.assign({ dur: 0.28, gain: 0.05, bp: 1400, q: 1, pan: 0, rate: 6, depth: 8, verb: 0.2 }, o);
      notes.forEach((f, i) => {
        const t = at + i * o.dur;
        const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f;
        const l = ac.createOscillator(); l.frequency.value = o.rate; const lg = ac.createGain(); lg.gain.value = o.depth; l.connect(lg); lg.connect(osc.frequency);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain, t + 0.04);
        g.gain.setValueAtTime(o.gain, t + o.dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur * 1.05);
        const out = S.pan(o.pan); const f2 = S.filter('bandpass', o.bp, o.q, out);
        osc.connect(g); g.connect(f2); if (o.verb) S.send(out, o.verb);
        osc.start(t); l.start(t); osc.stop(t + o.dur * 1.1); l.stop(t + o.dur * 1.1);
      });
    };
    const C = {
      // birds and animals
      crow: (at, o = {}) => [0, 0.34, 0.7].forEach((d) => S.tone({ at: at + d, type: 'sawtooth', f: 540, f2: 430, attack: 0.02, decay: 0.2, gain: 0.05, lp: 1500, pan: o.pan ?? -0.3, verb: 0.2 })),
      pigeon: (at, o = {}) => { S.tone({ at, f: 320, f2: 380, attack: 0.08, decay: 0.3, gain: 0.08, lp: 900, pan: o.pan ?? 0.4 }); S.tone({ at: at + 0.36, f: 380, f2: 290, attack: 0.05, decay: 0.42, gain: 0.07, lp: 900, pan: o.pan ?? 0.4 }); },
      wings: (at, o = {}) => { for (let i = 0; i < 9; i++) S.burst({ at: at + i * 0.07, kind: 'pink', type: 'bandpass', freq: 700, q: 1, decay: 0.05, gain: 0.07, pan: o.pan ?? 0.3 }); },
      gull: (at, o = {}) => [0, 0.5].forEach((d) => S.tone({ at: at + d, f: 1400, f2: 950, attack: 0.03, decay: 0.42, gain: 0.05, pan: o.pan ?? 0.4, verb: 0.3 })),
      kite: (at, o = {}) => S.tone({ at, f: 2500, f2: 1500, attack: 0.05, decay: 0.8, gain: 0.05, pan: o.pan ?? -0.4, verb: 0.4 }),
      chirps: (at, o = {}) => { for (let i = 0; i < 5; i++) { const f = 2600 + r() * 1200; S.tone({ at: at + i * 0.13, f, f2: f * 1.2, decay: 0.07, gain: 0.04, pan: o.pan ?? -0.3, verb: 0.25 }); } },
      barbet: (at, o = {}) => { for (let i = 0; i < 6; i++) { S.tone({ at: at + i * 0.32, f: 640, f2: 600, attack: 0.01, decay: 0.09, gain: 0.07, pan: o.pan ?? -0.3, verb: 0.3 }); S.tone({ at: at + i * 0.32 + 0.12, f: 780, decay: 0.12, gain: 0.06, pan: o.pan ?? -0.3 }); } },
      bark: (at, o = {}) => [0, 0.28].forEach((d) => { S.burst({ at: at + d, kind: 'pink', type: 'bandpass', freq: 650, q: 2, decay: 0.1, gain: 0.18, pan: o.pan ?? 0.2 }); S.tone({ at: at + d, type: 'sawtooth', f: 260, f2: 180, decay: 0.09, gain: 0.05, lp: 1200, pan: o.pan ?? 0.2 }); }),
      wag: (at, o = {}) => { for (let i = 0; i < 6; i++) S.burst({ at: at + i * 0.16, kind: 'brown', freq: 260, decay: 0.06, gain: 0.14, pan: o.pan ?? -0.2 }); },
      purr: (at, o = {}) => { const s = ac.createBufferSource(); s.buffer = bufs.brown; const g = ac.createGain(); g.gain.value = 0; const l = ac.createOscillator(); l.frequency.value = 24; const lg = ac.createGain(); lg.gain.value = 0.09; l.connect(lg); lg.connect(g.gain); const out = S.pan(o.pan ?? 0.3); const f = S.filter('lowpass', 320, 0.7, out); s.connect(g); g.connect(f); s.start(at); l.start(at); s.stop(at + 1.6); l.stop(at + 1.6); },
      wasp: (at, o = {}) => { const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 230; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.02, at + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6); const out = S.pan(-0.6); out.pan.linearRampToValueAtTime(0.6, at + 1.6); osc.connect(g); g.connect(S.filter('lowpass', 1400, 1, out)); osc.start(at); osc.stop(at + 1.7); },
      // vehicles
      horn: (at, o = {}) => {
        const k = o.kind || 'auto', pan = o.pan ?? 0;
        if (k === 'auto') [0, 0.18].forEach((d) => S.tone({ at: at + d, type: 'square', f: 470, decay: 0.1, gain: 0.05, lp: 1800, pan }));
        else if (k === 'scooter') [0, 0.14].forEach((d) => S.tone({ at: at + d, type: 'square', f: 640, decay: 0.08, gain: 0.04, lp: 2200, pan }));
        else if (k === 'squeak') S.tone({ at, type: 'square', f: 980, f2: 900, decay: 0.07, gain: 0.04, lp: 2600, pan });
        else if (k === 'bus') [220, 277].forEach((f) => S.tone({ at, type: 'sawtooth', f, attack: 0.02, hold: 0.45, decay: 0.15, gain: 0.04, lp: 1200, pan }));
        else if (k === 'pressure') [330, 415, 494].forEach((f) => S.tone({ at, type: 'sawtooth', f, attack: 0.03, hold: 0.9, decay: 0.2, gain: 0.03, lp: 2400, pan }));
        else [370, 466].forEach((f) => S.tone({ at, type: 'sawtooth', f, attack: 0.01, hold: o.long ? 0.8 : 0.25, decay: 0.15, gain: 0.035, lp: 1500, pan }));
      },
      hornWall: (at) => { const ks = ['auto', 'cab', 'scooter', 'bus', 'auto', 'squeak', 'cab', 'scooter']; ks.forEach((k, i) => C.horn(at + i * 0.17 + r() * 0.1, { kind: k, pan: r() * 1.6 - 0.8 })); },
      pass: (at, o = {}) => {
        // An engine crossing the stereo field.
        const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(o.f || 80, at); osc.frequency.linearRampToValueAtTime((o.f || 80) * 1.15, at + (o.dur || 2) / 2); osc.frequency.linearRampToValueAtTime((o.f || 80) * 0.9, at + (o.dur || 2));
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(o.gain || 0.05, at + (o.dur || 2) / 2); g.gain.exponentialRampToValueAtTime(0.0001, at + (o.dur || 2));
        const out = S.pan(o.from ?? -0.8); out.pan.linearRampToValueAtTime(o.to ?? 0.8, at + (o.dur || 2));
        osc.connect(g); g.connect(S.filter('lowpass', o.lp || 700, 1.5, out)); osc.start(at); osc.stop(at + (o.dur || 2) + 0.1);
      },
      whine: (at, o = {}) => { S.tone({ at, f: 900, f2: 1250, attack: 0.3, hold: 0.6, decay: 0.5, gain: 0.025, pan: o.pan ?? 0.4 }); },
      metro: (at) => { S.tone({ at, f: 280, f2: 620, attack: 0.8, hold: 0.8, decay: 1.2, gain: 0.03, pan: 0.3, verb: 0.3 }); S.burst({ at, kind: 'white', type: 'highpass', freq: 3000, attack: 0.8, hold: 0.8, decay: 1.2, gain: 0.03, pan: 0.3 }); },
      elTrain: (at) => { S.burst({ at, kind: 'brown', freq: 140, attack: 0.8, hold: 1, decay: 1.4, gain: 0.3, pan: 0.4 }); for (let i = 0; i < 8; i++) S.burst({ at: at + 0.5 + i * 0.22, kind: 'pink', freq: 500, decay: 0.05, gain: 0.07, pan: 0.4 }); },
      rails: (at) => [0, 0.12, 0.6, 0.72].forEach((d) => S.burst({ at: at + d, kind: 'brown', freq: 420, decay: 0.06, gain: 0.12, pan: 0.2 })),
      bump: (at) => [0, 0.25].forEach((d) => S.burst({ at: at + d, kind: 'brown', freq: 120, decay: 0.18, gain: 0.3 })),
      brakes: (at, o = {}) => { S.tone({ at, f: 2300, f2: 2100, attack: 0.1, hold: 0.4, decay: 0.3, gain: 0.02, pan: o.pan ?? 0.3 }); S.burst({ at, kind: 'pink', type: 'bandpass', freq: 900, attack: 0.1, hold: 0.4, decay: 0.3, gain: 0.05, pan: o.pan ?? 0.3 }); },
      doorHiss: (at, o = {}) => S.burst({ at, kind: 'white', type: 'highpass', freq: 1800, attack: 0.02, decay: 0.6, gain: 0.08, pan: o.pan ?? 0.3 }),
      slide: (at, o = {}) => S.burst({ at, kind: 'white', type: 'bandpass', freq: 1200, q: 0.8, attack: 0.25, decay: 0.45, gain: 0.06, pan: o.pan ?? 0 }),
      trolley: (at) => { const s = ac.createBufferSource(); s.buffer = bufs.pink; const g = ac.createGain(); g.gain.value = 0; const l = ac.createOscillator(); l.frequency.value = 19; const lg = ac.createGain(); lg.gain.value = 0.06; l.connect(lg); lg.connect(g.gain); s.connect(g); g.connect(S.filter('lowpass', 900, 0.7, S.pan(-0.4))); s.start(at); l.start(at); s.stop(at + 1.8); l.stop(at + 1.8); },
      wobble: (at) => S.tone({ at, type: 'sawtooth', f: 95, f2: 70, attack: 0.05, decay: 0.4, gain: 0.05, lp: 600, pan: -0.3 }),
      splash: (at, o = {}) => { S.burst({ at, kind: 'pink', type: 'bandpass', freq: 900, q: 0.8, decay: 0.45, gain: 0.18, pan: o.pan ?? 0 }); for (let i = 0; i < 5; i++) S.tone({ at: at + 0.05 + r() * 0.3, f: 500 + r() * 600, f2: 300, decay: 0.05, gain: 0.03 }); },
      thud: (at, o = {}) => S.burst({ at, kind: 'brown', freq: o.f || 200, decay: o.decay || 0.2, gain: o.gain || 0.25, pan: o.pan ?? 0 }),
      // signals and machines
      whistle: (at, o = {}) => { S.tone({ at, f: 2900, attack: 0.01, hold: o.long ? 0.6 : 0.3, decay: 0.08, gain: 0.04, pan: o.pan ?? 0 }); S.tone({ at, f: 3060, attack: 0.01, hold: o.long ? 0.6 : 0.3, decay: 0.08, gain: 0.03, pan: o.pan ?? 0 }); },
      subwayChime: (at, o = {}) => { S.tone({ at, f: 784, decay: 0.5, gain: 0.07, pan: o.pan ?? 0.3, verb: 0.3 }); S.tone({ at: at + 0.32, f: 622, decay: 0.7, gain: 0.07, pan: o.pan ?? 0.3, verb: 0.3 }); },
      doorBell: (at, o = {}) => [0, 0.09].forEach((d) => S.metal({ at: at + d, f: 2600, partials: [1, 2.4, 3.9], decay: 0.5, gain: 0.05, pan: o.pan ?? 0.3 })),
      cycleBell: (at, o = {}) => { for (let i = 0; i < 6; i++) S.metal({ at: at + i * 0.05, f: 3500, partials: [1, 2.1], decay: 0.15, gain: 0.04, pan: o.pan ?? -0.3 }); },
      orderBell: (at, o = {}) => { S.tone({ at, f: 2093, decay: 1.4, gain: 0.06, pan: o.pan ?? 0.3, verb: 0.4 }); S.tone({ at, f: 4186, decay: 0.8, gain: 0.02, pan: o.pan ?? 0.3 }); },
      boarding: (at) => [659, 784, 988].forEach((f, i) => S.tone({ at: at + i * 0.28, f, decay: 0.7, gain: 0.05, pan: 0.2, verb: 0.5 })),
      buzzer: (at, o = {}) => S.tone({ at, type: 'square', f: 120, attack: 0.01, hold: o.hold || 0.6, decay: 0.05, gain: 0.04, lp: 800, pan: o.pan ?? 0.3 }),
      beep: (at, o = {}) => [0, 0.14].slice(0, o.n || 2).forEach((d) => S.tone({ at: at + d, type: 'square', f: o.f || 1600, decay: 0.07, gain: 0.03, lp: 4000, pan: o.pan ?? 0.2 })),
      ping: (at, o = {}) => { S.tone({ at, f: 1318, decay: 0.25, gain: 0.05, pan: o.pan ?? 0 }); S.tone({ at: at + 0.08, f: 1760, decay: 0.3, gain: 0.04, pan: o.pan ?? 0 }); },
      pings: (at) => [0, 0.6, 1.1, 1.3, 1.5].forEach((d, i) => C.ping(at + d, { pan: i % 2 ? 0.3 : -0.3 })),
      vibrate: (at, o = {}) => [0, 0.5].forEach((d) => S.tone({ at: at + d, type: 'square', f: 160, attack: 0.01, hold: 0.3, decay: 0.05, gain: 0.03, lp: 400, pan: o.pan ?? 0 })),
      ring: (at, o = {}) => [0, 0.9].forEach((d) => { S.tone({ at: at + d, f: 480, attack: 0.01, hold: 0.55, decay: 0.05, gain: 0.03, pan: o.pan ?? 0.3 }); S.tone({ at: at + d, f: 440, attack: 0.01, hold: 0.55, decay: 0.05, gain: 0.03, pan: o.pan ?? 0.3 }); }),
      typing: (at, o = {}) => { let t = at; for (let i = 0; i < (o.n || 14); i++) { S.burst({ at: t, kind: 'white', type: 'bandpass', freq: 3000 + r() * 1500, q: 3, decay: 0.02, gain: 0.08, pan: o.pan ?? -0.2 }); t += 0.07 + r() * 0.1; } },
      grinder: (at) => { const s = ac.createBufferSource(); s.buffer = bufs.white; const g = ac.createGain(); g.gain.value = 0; const l = ac.createOscillator(); l.frequency.value = 42; const lg = ac.createGain(); lg.gain.value = 0.05; l.connect(lg); lg.connect(g.gain); s.connect(g); g.connect(S.filter('bandpass', 1900, 1, S.pan(0.3))); s.start(at); l.start(at); s.stop(at + 1.3); l.stop(at + 1.3); },
      denied: (at) => { S.tone({ at, type: 'square', f: 440, decay: 0.16, gain: 0.04, lp: 2000 }); S.tone({ at: at + 0.18, type: 'square', f: 330, decay: 0.3, gain: 0.04, lp: 2000 }); },
      tokenBuzz: (at) => S.tone({ at, type: 'square', f: 880, attack: 0.01, hold: 0.22, decay: 0.05, gain: 0.03, lp: 3000, pan: -0.2 }),
      inverter: (at) => S.tone({ at, type: 'square', f: 2800, decay: 0.07, gain: 0.025, lp: 6000, pan: -0.3 }),
      windDown: (at) => S.tone({ at, type: 'sawtooth', f: 90, f2: 18, attack: 0.05, hold: 0.5, decay: 2.4, gain: 0.09, lp: 400, pan: -0.2 }),
      stamp: (at, o = {}) => { C.thud(at, { f: 260, decay: 0.12, gain: 0.3, pan: o.pan ?? 0.3 }); S.burst({ at, kind: 'white', type: 'bandpass', freq: 2500, decay: 0.04, gain: 0.05, pan: o.pan ?? 0.3 }); },
      camera: (at) => [0, 0.05].forEach((d) => S.burst({ at: at + d, kind: 'white', type: 'bandpass', freq: 4200, q: 2, decay: 0.025, gain: 0.12, pan: 0.3 })),
      cooker: (at) => { S.burst({ at, kind: 'white', type: 'bandpass', freq: 2600, q: 6, attack: 0.05, hold: 1.0, decay: 0.3, gain: 0.25, pan: -0.3 }); S.tone({ at, f: 2600, attack: 0.05, hold: 1.0, decay: 0.3, gain: 0.015, pan: -0.3 }); },
      // hands and objects
      clink: (at, o = {}) => S.metal({ at, f: o.f || 1650, decay: o.decay || 0.8, gain: o.gain || 0.07, pan: o.pan ?? -0.2, verb: 0.15 }),
      ladle: (at, o = {}) => S.metal({ at, f: 620, partials: [1, 2.2, 3.7, 5.1], decay: 0.7, gain: 0.08, pan: o.pan ?? -0.2 }),
      bangles: (at, o = {}) => { for (let i = 0; i < 5; i++) S.metal({ at: at + i * 0.07 + r() * 0.04, f: 3600 + r() * 600, partials: [1, 1.4, 2.2], decay: 0.35, gain: 0.03, pan: o.pan ?? -0.3 }); },
      coins: (at, o = {}) => { for (let i = 0; i < 4; i++) S.metal({ at: at + i * 0.09, f: 4200 + r() * 400, partials: [1, 2.7], decay: 0.15, gain: 0.03, pan: o.pan ?? 0.3 }); },
      keys: (at, o = {}) => { for (let i = 0; i < 8; i++) S.metal({ at: at + i * 0.06 + r() * 0.03, f: 3000 + r() * 1500, partials: [1, 2.3], decay: 0.12, gain: 0.025, pan: o.pan ?? 0.3 }); },
      token: (at) => { for (let i = 0; i < 7; i++) S.metal({ at: at + i * (0.18 - i * 0.02), f: 2800, partials: [1, 2.6], decay: 0.08, gain: 0.04 - i * 0.004, pan: -0.2 }); },
      sleigh: (at) => { for (let i = 0; i < 16; i++) S.metal({ at: at + i * 0.06 + r() * 0.02, f: 4600 + r() * 800, partials: [1, 1.7], decay: 0.12, gain: 0.025, pan: 0.4 }); },
      scale: (at, o = {}) => [0, 0.2, 0.36].forEach((d) => S.metal({ at: at + d, f: 2400, partials: [1, 2.5], decay: 0.12, gain: 0.03, pan: o.pan ?? -0.2 })),
      latch: (at, o = {}) => { S.metal({ at, f: 2200, partials: [1, 2.9], decay: 0.12, gain: 0.06, pan: o.pan ?? -0.2 }); C.thud(at + 0.03, { f: 300, decay: 0.08, gain: 0.12, pan: o.pan ?? -0.2 }); },
      jar: (at) => { S.burst({ at, kind: 'white', type: 'bandpass', freq: 2200, q: 2, attack: 0.05, decay: 0.25, gain: 0.05, pan: -0.2 }); S.metal({ at: at + 0.3, f: 1800, partials: [1, 2.4], decay: 0.2, gain: 0.04, pan: -0.2 }); },
      paper: (at, o = {}) => { for (let i = 0; i < 7; i++) S.burst({ at: at + i * 0.05 + r() * 0.03, kind: 'white', type: 'bandpass', freq: 2500 + r() * 2000, q: 1.5, decay: 0.03, gain: 0.08, pan: o.pan ?? 0.2 }); },
      thwack: (at) => S.burst({ at, kind: 'pink', freq: 1300, decay: 0.12, gain: 0.25, pan: 0.2 }),
      tear: (at) => S.burst({ at, kind: 'white', type: 'bandpass', freq: 1500, freqTo: 4000, q: 1.5, decay: 0.28, gain: 0.08, pan: -0.2 }),
      knock: (at, o = {}) => [0, 0.16, 0.32].forEach((d) => C.thud(at + d, { f: 420, decay: 0.07, gain: 0.18, pan: o.pan ?? 0 })),
      creak: (at, o = {}) => { const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(o.f || 180, at); osc.frequency.linearRampToValueAtTime((o.f || 180) * 1.3, at + (o.dur || 0.6)); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.025, at + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, at + (o.dur || 0.6)); const l = ac.createOscillator(); l.frequency.value = 23; const lg = ac.createGain(); lg.gain.value = 0.015; l.connect(lg); lg.connect(g.gain); osc.connect(g); g.connect(S.filter('lowpass', 1000, 2, S.pan(o.pan ?? 0))); osc.start(at); l.start(at); osc.stop(at + (o.dur || 0.6) + 0.05); l.stop(at + (o.dur || 0.6) + 0.05); },
      shutter: (at, o = {}) => { const n = Math.round((o.dur || 1.4) / 0.03); for (let i = 0; i < n; i++) S.burst({ at: at + i * 0.03, kind: 'white', type: 'bandpass', freq: 1300 + r() * 900, q: 2, decay: 0.03, gain: 0.05 + r() * 0.04, pan: o.pan ?? 0 }); },
      broom: (at) => { for (let i = 0; i < 4; i++) S.burst({ at: at + i * 0.4, kind: 'pink', type: 'highpass', freq: 2000, attack: 0.12, decay: 0.2, gain: 0.07, pan: -0.3 }); },
      hiss: (at, o = {}) => S.burst({ at, kind: 'white', type: 'highpass', freq: 3000, attack: 0.02, decay: o.decay || 0.5, gain: o.gain || 0.08, pan: o.pan ?? -0.2 }),
      crackle: (at, o = {}) => { for (let i = 0; i < 10; i++) S.burst({ at: at + r() * 1.2, kind: 'white', type: 'highpass', freq: 2500, decay: 0.01, gain: 0.06, pan: o.pan ?? -0.2 }); },
      dryer: (at) => [0, 0.55, 1.1, 1.65].forEach((d) => C.thud(at + d, { f: 150, decay: 0.2, gain: 0.16, pan: 0.3 })),
      crack: (at, o = {}) => { S.burst({ at, kind: 'white', type: 'highpass', freq: 1500, decay: 0.05, gain: 0.2, pan: o.pan ?? 0 }); C.thud(at, { f: 260, decay: 0.08, gain: 0.15, pan: o.pan ?? 0 }); },
      puris: (at) => { for (let i = 0; i < 4; i++) S.burst({ at: at + i * 0.5 + r() * 0.1, kind: 'white', type: 'bandpass', freq: 3200, q: 1.5, decay: 0.04, gain: 0.14, pan: -0.2 }); },
      swoosh: (at, o = {}) => S.burst({ at, kind: 'pink', type: 'bandpass', freq: 1500, q: 1, attack: 0.25, decay: 0.3, gain: 0.08, pan: o.from ?? -0.6, panTo: o.to ?? 0.6 }),
      firework: (at, o = {}) => { S.tone({ at, f: 600, f2: 2600, attack: 0.05, decay: 1, gain: 0.025, pan: o.pan ?? -0.3 }); S.burst({ at: at + 1.05, kind: 'white', freq: 3000, decay: 0.3, gain: 0.2, pan: o.pan ?? -0.3, verb: 0.4 }); C.thud(at + 1.05, { f: 120, decay: 0.4, gain: 0.3, pan: o.pan ?? -0.3 }); },
      crackers: (at) => { for (let i = 0; i < 8; i++) { const t = at + i * 0.09 + r() * 0.05; S.burst({ at: t, kind: 'white', freq: 2500, decay: 0.05, gain: 0.15, pan: -0.4 + r() * 0.3 }); } },
      woodblock: (at, o = {}) => { S.tone({ at, f: o.f || 950, decay: 0.05, gain: 0.07, pan: o.pan ?? 0 }); S.burst({ at, kind: 'white', type: 'bandpass', freq: 2000, decay: 0.01, gain: 0.05, pan: o.pan ?? 0 }); },
      countdown: (at) => { for (let i = 0; i < 6; i++) C.woodblock(at + i * 0.5, { f: 1100 - i * 40 }); S.burst({ at: at + 3, kind: 'pink', freq: 2000, attack: 0.3, decay: 2.5, gain: 0.25, verb: 0.3 }); },
      partyHorns: (at) => { for (let i = 0; i < 4; i++) S.tone({ at: at + i * 0.22, type: 'sawtooth', f: 420 + i * 40, f2: 470 + i * 40, attack: 0.02, hold: 0.25, decay: 0.08, gain: 0.025, lp: 2500, pan: -0.5 + i * 0.3 }); },
      applause: (at, o = {}) => { for (let i = 0; i < 40; i++) S.burst({ at: at + r() * (o.dur || 1.8), kind: 'white', type: 'bandpass', freq: 1500 + r() * 1500, q: 1, decay: 0.02, gain: 0.05, pan: r() * 1.4 - 0.7 }); },
      kids: (at) => { for (let i = 0; i < 6; i++) vib(at + i * 0.22 + r() * 0.1, [700 + r() * 500], { dur: 0.18, gain: 0.02, bp: 1800, q: 2, pan: r() - 0.5, rate: 9, depth: 40 }); },
      sniffle: (at) => [0, 0.3].forEach((d) => S.burst({ at: at + d, kind: 'pink', type: 'bandpass', freq: 3000, attack: 0.05, decay: 0.14, gain: 0.08, pan: 0.2 })),
      sigh: (at, o = {}) => S.burst({ at, kind: 'pink', type: 'bandpass', freq: 800, attack: 0.5, decay: 1, gain: 0.08, pan: o.pan ?? 0 }),
      snore: (at) => S.burst({ at, kind: 'pink', freq: 380, attack: 0.8, decay: 0.8, gain: 0.12, pan: 0.2 }),
      // voices and music, sung by reeds and filters
      call: (at, o = {}) => vib(at, o.notes || [300, 420, 360], Object.assign({ dur: 0.45, gain: 0.04, bp: 900, q: 2, rate: 5, depth: 6, verb: 0.35, pan: -0.3 }, o)),
      mumble: (at, o = {}) => { for (let i = 0; i < 10; i++) vib(at + i * 0.17, [180 + r() * 60], { dur: 0.15, gain: 0.025, bp: 700, q: 3, pan: o.pan ?? 0.2, verb: 0.6 }); },
      nadaswaram: (at) => vib(at, [587, 659, 740, 880, 740, 659, 587, 659], { dur: 0.32, gain: 0.04, bp: 1600, q: 0.9, rate: 5.5, depth: 10, verb: 0.3, pan: -0.2 }),
      thavil: (at) => [0, 0.25, 0.5, 0.62, 0.75, 1.0, 1.25, 1.37].forEach((d, i) => { S.tone({ at: at + d, f: i % 3 ? 180 : 120, f2: 70, decay: 0.18, gain: 0.12, pan: -0.25 }); S.burst({ at: at + d, kind: 'white', type: 'bandpass', freq: 2200, decay: 0.03, gain: 0.05, pan: -0.25 }); }),
      hum: (at) => vib(at, [262, 294, 330, 294, 262, 247, 262], { dur: 0.42, gain: 0.03, bp: 500, q: 1, rate: 4, depth: 3, verb: 0.4, pan: 0.1 }),
      musicBox: (at) => [784, 659, 784, 880, 784, 659, 587, 659].forEach((f, i) => S.tone({ at: at + i * 0.2, f, decay: 0.35, gain: 0.04, pan: 0.4, verb: 0.2 })),
      band: (at) => { for (let i = 0; i < 8; i++) { const t = at + i * 0.25; S.tone({ at: t, f: 120, f2: 45, decay: i % 2 ? 0.1 : 0.2, gain: i % 2 ? 0.05 : 0.14 }); if (i % 2) S.burst({ at: t, kind: 'white', type: 'bandpass', freq: 1800, decay: 0.12, gain: 0.08 }); S.tone({ at: t, type: 'sawtooth', f: [82, 82, 110, 98][i % 4], decay: 0.22, gain: 0.04, lp: 320 }); } },
      feedback: (at) => S.tone({ at, f: 2200, attack: 0.6, decay: 0.25, gain: 0.03, pan: 0.2 }),
      windowMusic: (at) => { for (let i = 0; i < 8; i++) { S.tone({ at: at + i * 0.5, f: 110, f2: 50, decay: 0.15, gain: 0.08, lp: 250, pan: 0.4 }); } },
      tugboat: (at) => [110, 138].forEach((f) => S.tone({ at, type: 'sawtooth', f, attack: 0.1, hold: 1, decay: 0.4, gain: 0.03, lp: 500, pan: 0.5, verb: 0.5 })),
      crane: (at) => { C.creak(at, { f: 70, dur: 1.6, pan: 0.4 }); },
      gongBell: (at, o = {}) => S.bell({ at, f: o.f || 220, gain: 0.12, pan: o.pan ?? -0.2, verb: 0.6 })
    };
    // Continuous beds. Each returns nothing; levels are fixed per recipe.
    const B = {
      traffic: (g = 0.1) => S.bed('brown', [['lowpass', 260]], g, 0.15),
      rain: (g = 0.2) => S.bed('pink', [['highpass', 450], ['lowpass', 7000]], g, -0.1),
      drizzle: (g = 0.05) => S.bed('white', [['bandpass', 4200, 0.8]], g),
      wind: (g = 0.08) => { const w = S.bed('pink', [['bandpass', 500, 1.8]], g, 0.2); S.lfo(w.gain, 0.15, g * 0.5); },
      breeze: (g = 0.05) => { const w = S.bed('pink', [['lowpass', 900]], g, -0.1); S.lfo(w.gain, 0.2, g * 0.4); },
      leaves: (g = 0.015) => S.bed('white', [['bandpass', 4200, 0.8]], g, -0.2),
      crowd: (g = 0.04) => [380, 760, 1400].forEach((f, i) => { const b = S.bed('pink', [['bandpass', f, 1.3]], g, (i - 1) * 0.4); S.lfo(b.gain, 0.7 + i * 0.9, g * 0.6); }),
      room: (g = 0.08) => S.bed('brown', [['lowpass', 180]], g),
      hum: (f = 100, g = 0.015) => S.osc('sine', f, S.gain(g)),
      tube: (g = 0.01) => S.osc('sawtooth', 120, S.filter('lowpass', 700, 1, S.gain(g, S.pan(0.2)))),
      fan: (g = 0.02) => { S.osc('sine', 92, S.gain(g)); const w = S.bed('white', [['bandpass', 420, 0.5]], g * 0.6, -0.3); S.lfo(w.gain, 7.5, g * 0.4); },
      water: (g = 0.05) => { const w = S.bed('pink', [['bandpass', 1500, 0.6]], g, -0.2); S.lfo(w.gain, 6, g * 0.4); },
      rumble: (g = 0.1) => S.bed('brown', [['lowpass', 110]], g, 0.2),
      sizzle: (g = 0.04) => { const s = S.bed('white', [['highpass', 3500]], g, 0.2); S.lfo(s.gain, 11, g * 0.7, 'square'); },
      steam: (g = 0.02) => S.bed('white', [['highpass', 5000]], g, -0.2),
      engine: (f = 45, g = 0.04) => { const a = S.gain(g, S.pan(0.1)); S.lfo(a.gain, 9, g * 0.3); S.osc('sawtooth', f, S.filter('lowpass', 300, 1, a)); },
      motor: (g = 0.02) => S.osc('sawtooth', 100, S.filter('lowpass', 380, 1, S.gain(g, S.pan(-0.3)))),
      crickets: (g = 0.01) => { const a = S.gain(0.5, S.gain(g, S.pan(-0.4))); const b = S.gain(0.5, a); S.lfo(a.gain, 1.1, 0.5, 'square'); S.lfo(b.gain, 26, 0.5, 'square'); S.osc('sine', 4500, b); },
      boxfan: (g = 0.03) => { const w = S.bed('white', [['bandpass', 320, 0.8]], g, 0.3); S.lfo(w.gain, 18, g * 0.6); }
    };
    return { C, B };
  }

  // Recipes: beds to run, then cues at times in the 12 s loop. A cue with
  // an `every` fourth field repeats through the loop.
  const RECIPES = {
    'h-a': { beds: [['traffic', 0.05], ['breeze', 0.04]], cues: [[0.5, 'crow'], [3, 'thwack'], [5.5, 'pigeon'], [8.5, 'clink', { f: 1500 }]] },
    'h-4': { beds: [['crowd', 0.05]], cues: [[1, 'ladle'], [3.5, 'swoosh', { from: 0.5, to: 0.4 }], [6, 'doorBell'], [9, 'ladle']] },
    'h-5': { beds: [['traffic', 0.06], ['crowd', 0.025]], cues: [[1, 'call', { notes: [360, 440, 400] }], [4, 'scale'], [6.5, 'paper'], [9.5, 'doorBell', { pan: 0.4 }]] },
    'h-6': { beds: [['room', 0.06], ['hum', 60, 0.01]], cues: [[0.5, 'typing'], [4, 'latch'], [6.5, 'paper'], [9.5, 'vibrate']] },
    'h-7': { beds: [['room', 0.05]], cues: [[1, 'pings'], [5, 'horn', { kind: 'scooter', pan: -0.5 }], [7, 'pings'], [10, 'typing', { n: 30 }]] },
    'h-8': { beds: [['traffic', 0.05], ['breeze', 0.05]], cues: [[0.5, 'crow'], [3, 'cooker'], [6, 'wings'], [9, 'pigeon']] },
    'h-9': { beds: [['crowd', 0.035]], cues: [[0.5, 'nadaswaram'], [0.5, 'thavil'], [4, 'thavil'], [6.5, 'stamp'], [8.5, 'sniffle']] },
    'h-10': { beds: [['tube', 0.012], ['water', 0.03]], cues: [[1, 'knock'], [3, 'hum'], [7, 'knock'], [9, 'hum']] },
    'h-j': { beds: [['traffic', 0.05]], cues: [[0.5, 'hiss'], [1, 'crackle'], [4, 'dryer'], [7, 'coins'], [9.5, 'hiss']] },
    'h-q': { beds: [['traffic', 0.05]], cues: [[0.5, 'wag'], [3, 'tear'], [5, 'bark', { pan: -0.3 }], [7.5, 'purr'], [10, 'doorBell']] },
    'h-k': { beds: [['traffic', 0.06]], cues: [[1, 'keys'], [3.5, 'creak', { f: 220 }], [6, 'buzzer', { hold: 1.2 }], [9, 'keys']] },
    'd-a': { beds: [['breeze', 0.06]], cues: [[0.5, 'chirps'], [3, 'kite'], [6, 'creak', { f: 120, dur: 0.9, pan: 0.4 }], [9, 'gull']] },
    'd-2': { beds: [['engine', 38, 0.03], ['tube', 0.01]], cues: [[1, 'mumble', { pan: -0.3 }], [4, 'creak', { f: 400, dur: 0.4 }], [6, 'mumble', { pan: 0.3 }], [9, 'thud', { f: 300 }]] },
    'd-3': { beds: [['engine', 42, 0.05]], cues: [[1, 'bump'], [3, 'rails'], [6, 'snore'], [9, 'rails']] },
    'd-4': { beds: [['crowd', 0.025]], cues: [[0.5, 'typing'], [3, 'grinder'], [6, 'ping'], [8.5, 'clink', { f: 900, decay: 0.3 }]] },
    'd-5': { beds: [['room', 0.05], ['steam', 0.012]], cues: [[0, 'woodblock', { f: 1200 }], [1, 'woodblock', { f: 1200 }], [2, 'woodblock', { f: 1200 }], [3, 'typing', { n: 3, pan: 0.2 }], [3.8, 'denied']] },
    'd-6': { beds: [['crowd', 0.05]], cues: [[0.5, 'bangles'], [3, 'call', { notes: [320, 400, 300, 380] }], [6, 'elTrain'], [10, 'bangles']] },
    'd-7': { beds: [['fan', 0.02]], cues: [[1, 'scale'], [4, 'scale'], [7, 'buzzer', { hold: 0.5 }]] },
    'd-8': { beds: [['crowd', 0.025]], cues: [[0, 'band'], [2, 'band'], [4, 'feedback'], [5, 'band'], [8.5, 'applause']] },
    'd-9': { beds: [['hum', 60, 0.02], ['room', 0.04]], cues: [[1, 'mumble', { pan: -0.2 }], [4, 'ring'], [7, 'typing'], [10, 'mumble', { pan: 0.3 }]] },
    'd-10': { beds: [['steam', 0.03], ['sizzle', 0.04], ['traffic', 0.05]], cues: [[2, 'hiss', { decay: 1 }], [7, 'horn', { kind: 'cab', pan: 0.5 }], [10, 'horn', { kind: 'auto', pan: -0.5 }]] },
    'd-j': { beds: [['rain', 0.16]], cues: [[0.5, 'pass', { f: 85, from: -0.8, to: 0.8 }], [4, 'whine'], [7, 'ping'], [9, 'pass', { f: 90, from: 0.8, to: -0.8 }]] },
    'd-q': { beds: [['traffic', 0.04]], cues: [[0, 'windowMusic'], [5, 'creak', { f: 260 }], [8, 'pigeon']] },
    'd-k': { beds: [['traffic', 0.14], ['engine', 40, 0.05]], cues: [[0.5, 'hornWall'], [5, 'metro'], [8, 'hornWall']] },
    'c-a': { beds: [['breeze', 0.04]], cues: [[0.3, 'crow'], [2, 'shutter'], [5, 'broom'], [8, 'shutter', { pan: 0.3 }], [10.5, 'wings']] },
    'c-2': { beds: [['breeze', 0.04]], cues: [[0.5, 'cycleBell'], [3, 'latch'], [5.5, 'elTrain'], [9.5, 'pigeon']] },
    'c-3': { beds: [['traffic', 0.06], ['engine', 55, 0.03]], cues: [[0.5, 'kids'], [3, 'horn', { kind: 'squeak' }], [5.5, 'kids'], [8, 'doorHiss'], [10, 'horn', { kind: 'bus' }]] },
    'c-4': { beds: [['rumble', 0.08], ['crowd', 0.03]], cues: [[0.5, 'whistle'], [2.5, 'coins'], [5, 'brakes'], [7.5, 'subwayChime']] },
    'c-5': { beds: [['motor', 0.02], ['water', 0.05], ['wind', 0.05]], cues: [[3, 'crow'], [8, 'thud', { f: 160, gain: 0.1 }]] },
    'c-6': { beds: [['traffic', 0.04]], cues: [[0.5, 'call', { notes: [330, 330, 440, 392], dur: 0.5 }], [3, 'creak', { f: 300, dur: 1.2 }], [5, 'musicBox'], [9, 'musicBox']] },
    'c-7': { beds: [['traffic', 0.07], ['steam', 0.015]], cues: [[0.5, 'puris'], [4, 'clink', { f: 900, decay: 0.5 }], [7, 'puris'], [10, 'horn', { kind: 'cab', pan: 0.6 }]] },
    'c-9': { beds: [['traffic', 0.12]], cues: [[0.5, 'hornWall'], [3, 'horn', { kind: 'pressure', pan: -0.3 }], [6, 'horn', { kind: 'squeak' }], [7, 'horn', { kind: 'cab', long: true, pan: 0.4 }], [9.5, 'hornWall']] },
    'c-j': { beds: [['rumble', 0.06], ['crowd', 0.02]], cues: [[1, 'whistle', { long: true, pan: -0.3 }], [4, 'subwayChime'], [6, 'thud', { f: 180, gain: 0.2 }], [9, 'whistle', { pan: -0.3 }]] },
    'c-q': { beds: [['tube', 0.012]], cues: [[1, 'jar'], [4, 'doorBell'], [6.5, 'purr'], [10, 'jar']] },
    'c-k': { beds: [['rain', 0.15]], cues: [[1, 'pass', { f: 90, from: -0.8, to: 0.4, dur: 1.5 }], [2.2, 'splash'], [3, 'wobble'], [6, 'pass', { f: 60, from: 0.8, to: -0.4, dur: 1.5 }], [7.2, 'thud', { f: 100, gain: 0.3 }]] },
    's-a': { beds: [['engine', 40, 0.05], ['crowd', 0.035]], cues: [[1, 'whistle', { pan: -0.4 }], [3.5, 'mumble'], [7, 'horn', { kind: 'bus', pan: -0.3 }], [9.5, 'mumble', { pan: 0.4 }]] },
    's-2': { beds: [['breeze', 0.04]], cues: [[0.5, 'clink', { f: 1500 }], [2.5, 'chirps'], [5.5, 'swoosh', { from: 0.8, to: -0.2 }], [8, 'bark', { pan: 0.4 }]] },
    's-3': { beds: [['breeze', 0.07], ['leaves', 0.02]], cues: [[1, 'horn', { kind: 'scooter', pan: -0.4 }], [4, 'camera'], [6, 'camera'], [6.6, 'camera'], [9.5, 'camera']] },
    's-4': { beds: [['crowd', 0.03]], cues: [[0.5, 'call', { notes: [400, 480, 440] }], [3, 'scale'], [5.5, 'wasp'], [9, 'paper']] },
    's-5': { beds: [['room', 0.05], ['hum', 50, 0.008]], cues: [[1, 'creak', { f: 140, dur: 0.5 }], [1.6, 'thud', { f: 220, gain: 0.12 }], [4, 'keys', { pan: -0.2 }], [7, 'token']] },
    's-6': { beds: [['boxfan', 0.08], ['room', 0.05]], cues: [[0.5, 'windDown'], [3.5, 'inverter', {}, 2], [5, 'clink', { f: 1200, decay: 0.2, gain: 0.03 }], [9, 'clink', { f: 1300, decay: 0.2, gain: 0.03 }]] },
    's-8': { beds: [['engine', 50, 0.02]], cues: [[0.5, 'crackers'], [3, 'firework'], [6, 'sleigh'], [9, 'crackers']] },
    's-9': { beds: [['crowd', 0.03], ['room', 0.04]], cues: [[1, 'slide'], [3, 'trolley'], [5.5, 'boarding'], [8, 'mumble', { pan: 0.3 }], [10, 'slide', { pan: 0.3 }]] },
    's-10': { beds: [['crowd', 0.07]], cues: [[0.5, 'countdown'], [4, 'partyHorns'], [6.5, 'whistle', { pan: 0.4 }], [8, 'firework', { pan: 0.3 }]] },
    's-j': { beds: [['traffic', 0.04]], cues: [[0.5, 'thud', { f: 500, decay: 0.06, gain: 0.2 }], [2, 'crack'], [5, 'thud', { f: 520, decay: 0.06, gain: 0.2 }], [7, 'crack', { pan: 0.3 }], [9.5, 'creak', { f: 320, dur: 0.5 }]] },
    's-q': { beds: [['wind', 0.05], ['leaves', 0.02]], cues: [[1, 'barbet'], [5, 'swoosh', { from: 0.5, to: -0.5 }], [8, 'tugboat']] },
    's-k': { beds: [['traffic', 0.05]], cues: [[0.5, 'crane'], [3, 'woodblock', { f: 700 }], [3.6, 'woodblock', { f: 700 }], [4.2, 'woodblock', { f: 700 }], [6, 'pigeon'], [9, 'sigh']] }
  };

  function recipeScene(S, recipe) {
    const { C, B } = fx(S);
    recipe.beds.forEach(([name, ...args]) => B[name](...args));
    const events = [];
    recipe.cues.forEach(([time, name, opts, every]) => {
      if (every) for (let t = time; t < 12; t += every) events.push([t, (at) => C[name](at, opts || {})]);
      else events.push([time, (at) => C[name](at, opts || {})]);
    });
    return { cycle: 12, update() {}, events };
  }

  // Cards without their own score get a city bed that suits the suit: a
  // morning yard for Hearts, an office hum for Diamonds, traffic for Clubs,
  // weather for Spades. A small cue lands once per loop.
  function cityScene(S, suit) {
    S.bed('brown', [['lowpass', 240]], 0.14, 0.2);
    S.bed('pink', [['bandpass', 700, 1.2]], suit === 'club' ? 0.08 : 0.045, -0.2);
    if (suit === 'spade') S.bed('pink', [['highpass', 500], ['lowpass', 6000]], 0.16, -0.1);
    if (suit === 'diamond') S.osc('sine', 120, S.gain(0.02, S.pan(0.2)));
    const cue = {
      heart: (at) => [0, 0.16, 0.3].forEach((o, i) => S.tone({ at: at + o, f: 2400 + i * 300, f2: 2900 + i * 200, decay: 0.08, gain: 0.07, pan: -0.3, verb: 0.3 })),
      diamond: (at) => [0, 0.09, 0.2, 0.27, 0.4].forEach((o) => S.burst({ at: at + o, kind: 'white', type: 'bandpass', freq: 3000, q: 2, decay: 0.02, gain: 0.07, pan: 0.2 })),
      club: (at) => S.tone({ at, type: 'square', f: 470, decay: 0.12, gain: 0.07, lp: 1800, pan: 0.3 }),
      spade: (at) => S.burst({ at, kind: 'pink', type: 'bandpass', freq: 500, q: 1.5, attack: 0.8, decay: 1.4, gain: 0.12, pan: 0.3 })
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
    const scene = SCENES[id] ? SCENES[id](S) : RECIPES[id] ? recipeScene(S, RECIPES[id]) : cityScene(S, suit);
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
