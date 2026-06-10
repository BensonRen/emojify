/*
 * Ambience — procedural sound for the emojify universe. Zero assets, zero deps:
 * everything is synthesized in WebAudio, so it ships under the strict CSP and
 * weighs nothing. Classic script: exposes window.Ambience.
 *
 *   Ambience.start('galaxy' | 'translate' | 'games')  — begin the themed bed
 *       (must be called from a user gesture; safe to call repeatedly)
 *   Ambience.event('hover'|'dive'|'chime'|'coin'|'open'|'seal')
 *   Ambience.walking(true|false)   — footstep loop while moving
 *   Ambience.toggleMute() → muted  — persisted in localStorage
 *   Ambience.muted() → bool
 *
 * Mix discipline: the bed sits far back (master ≈ 0.14, beds ≈ 0.05); events
 * peak ≈ 0.12. A world should murmur, never perform.
 */
(function () {
  'use strict';

  var MUTE_KEY = 'emojify-muted';
  var ctx = null, master = null, theme = null;
  var stepTimer = null, chirpTimer = null;
  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.14;
    master.connect(ctx.destination);
    return true;
  }

  // 2s of cached white noise — the raw material for wind, steps, swells.
  var _noise = null;
  function noiseBuf() {
    if (_noise) return _noise;
    var n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (_noise = buf);
  }

  function env(node, t0, a, peak, d) { // attack to peak, exponential-ish decay
    var g = node.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  // ── beds ──────────────────────────────────────────────
  function startWind() { // filtered noise, slow breathing — the morning meadow
    var src = ctx.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
    var g = ctx.createGain(); g.gain.value = 0.05;
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(master); src.start(); lfo.start();
  }
  function startPad() { // two detuned triangles shimmering — the night galaxy
    [110, 165.2].forEach(function (f, i) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = i ? 6 : -4;
      var g = ctx.createGain(); g.gain.value = 0.016;
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.03; lg.gain.value = 0.008; lfo.connect(lg); lg.connect(g.gain);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      o.connect(lp); lp.connect(g); g.connect(master); o.start(); lfo.start();
    });
  }
  function chirp() { // one little bird (sine) or chiptune bird (square, stepped)
    var square = theme === 'games';
    var notes = 2 + ((Math.random() * 3) | 0), t = ctx.currentTime;
    for (var i = 0; i < notes; i++) {
      var o = ctx.createOscillator(); o.type = square ? 'square' : 'sine';
      var f0 = 1900 + Math.random() * 900, f1 = f0 * (0.72 + Math.random() * 0.12);
      var t0 = t + i * (0.10 + Math.random() * 0.05);
      if (square) { o.frequency.setValueAtTime(f0 * 0.5, t0); o.frequency.setValueAtTime(f1 * 0.5, t0 + 0.05); }
      else { o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + 0.09); }
      var g = ctx.createGain(); env(g, t0, 0.012, square ? 0.018 : 0.035, 0.10);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.25);
    }
  }
  function scheduleChirps() {
    chirpTimer = setTimeout(function () { chirp(); scheduleChirps(); }, 2400 + Math.random() * 4800);
  }

  // ── events ────────────────────────────────────────────
  var stepHi = false;
  function footstep() { // soft grass tick + low thump, alternating pitch
    var t = ctx.currentTime;
    var n = ctx.createBufferSource(); n.buffer = noiseBuf();
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = stepHi ? 950 : 760; bp.Q.value = 1.2;
    var g = ctx.createGain(); env(g, t, 0.004, 0.06, 0.07);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 0.12);
    var o = ctx.createOscillator(); o.frequency.value = stepHi ? 95 : 82;
    var og = ctx.createGain(); env(og, t, 0.004, 0.05, 0.06);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.1);
    stepHi = !stepHi;
  }
  function bell(fs, peak, decay) { // little additive bell
    var t = ctx.currentTime;
    fs.forEach(function (f, i) {
      var o = ctx.createOscillator(); o.frequency.value = f;
      var g = ctx.createGain(); env(g, t, 0.006, peak / (i + 1), decay);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + decay + 0.1);
    });
  }
  var EVENTS = {
    hover: function () { bell([1320], 0.035, 0.18); },                       // galaxy: planet under cursor
    open:  function () { bell([660, 1782], 0.07, 0.5); },                    // panel / card opens
    chime: function () { bell([880, 2376, 4488], 0.10, 0.9); },              // the bureau counter bell
    coin:  function () { // arcade: two-step coin blip
      var t = ctx.currentTime;
      [988, 1319].forEach(function (f, i) {
        var o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
        var g = ctx.createGain(); env(g, t + i * 0.07, 0.005, 0.05, 0.09);
        o.connect(g); g.connect(master); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.15);
      });
    },
    dive: function () { // rising filtered rush — the plunge into a world
      var t = ctx.currentTime;
      var n = ctx.createBufferSource(); n.buffer = noiseBuf(); n.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.6;
      bp.frequency.setValueAtTime(220, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 1.1);
      var g = ctx.createGain(); env(g, t, 0.5, 0.11, 0.9);
      n.connect(bp); bp.connect(g); g.connect(master); n.start(t); n.stop(t + 1.6);
    },
    seal: function () { bell([523, 659, 1047], 0.06, 1.2); },                // the sealed letter
  };

  // ── api ───────────────────────────────────────────────
  function start(name) {
    if (!ensure()) return;
    if (theme) return; // beds are one-shot per page
    theme = name;
    if (name === 'galaxy') startPad();
    else { startWind(); scheduleChirps(); }
  }
  function event(name) { if (ctx && theme && EVENTS[name]) EVENTS[name](); }
  function walking(on) {
    if (!ctx) return;
    if (on && !stepTimer) { footstep(); stepTimer = setInterval(footstep, 380); }
    else if (!on && stepTimer) { clearInterval(stepTimer); stepTimer = null; }
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.linearRampToValueAtTime(muted ? 0 : 0.14, ctx.currentTime + 0.15);
    return muted;
  }

  window.Ambience = { start: start, event: event, walking: walking, toggleMute: toggleMute, muted: function () { return muted; } };
})();
