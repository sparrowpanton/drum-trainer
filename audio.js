/*
 * audio.js — synthesized drum voices on the Web Audio clock.
 *
 * Every voice takes an explicit `time` (an AudioContext currentTime value) and
 * schedules itself to fire EXACTLY then. We never trigger a sound with
 * setTimeout — that's the whole point. setTimeout only decides *when to
 * schedule* (see the scheduler in app.js); the audio clock decides *when a
 * sound plays*. That separation is what keeps the click from drifting.
 *
 * No sample files — kick, tap, and click are all synthesized.
 */

class DrumAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;       // cached noise buffer for the stick "tap"
    this.canPan = true;      // StereoPanner support (older Safari lacks it)
  }

  // Must be called from a user gesture (the Play button) — browsers block
  // audio until the user interacts with the page.
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.noise = this._makeNoise(0.2);
    this.canPan = typeof this.ctx.createStereoPanner === 'function';
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  get currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Real kick drum — a pitch-swept sine "body" plus a short beater "click"
  // transient at the attack. The click is what your ear reads as "a real kick."
  kick(time) {
    const ctx = this.ctx;

    // body: 130 Hz dropping to 48 Hz, punchy decay
    const osc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(48, time + 0.10);
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.exponentialRampToValueAtTime(1.0, time + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    osc.connect(bodyGain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.4);

    // beater click: a fast high-passed noise tick
    const click = ctx.createBufferSource();
    click.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.55, time);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
    click.connect(hp).connect(clickGain).connect(this.master);
    click.start(time);
    click.stop(time + 0.03);
  }

  // Real snare — a tonal shell (two triangles) plus the wire "rattle" (filtered
  // noise). pan: -1 (left hand) .. +1 (right hand).
  tap(time, pan = 0) {
    const ctx = this.ctx;

    // shared output (handles pan + level for the whole hit)
    const out = ctx.createGain();
    out.gain.value = 0.85;
    let tail = out;
    if (this.canPan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      out.connect(panner);
      tail = panner;
    }
    tail.connect(this.master);

    // wires: high-passed noise — the bulk of the snare character
    const noise = ctx.createBufferSource();
    noise.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1600;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    noise.connect(hp).connect(noiseGain).connect(out);
    noise.start(time);
    noise.stop(time + 0.15);

    // shell: two short tones give it body and pitch
    [180, 270].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(i === 0 ? 0.5 : 0.3, time + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
      o.connect(g).connect(out);
      o.start(time);
      o.stop(time + 0.12);
    });
  }

  // Cymbal / hi-hat — a short, bright high-passed noise "tsst". pan by hand.
  hihat(time, pan = 0) {
    const ctx = this.ctx;
    const dur = 0.05;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    let tail = gain;
    if (this.canPan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      tail = panner;
    }
    src.connect(hp).connect(gain);
    tail.connect(this.master);
    src.start(time);
    src.stop(time + dur);
  }

  // Metronome click — a soft, clean tick that sits under the drums.
  click(time, accent = false) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = accent ? 1800 : 1300;
    const vol = accent ? 0.18 : 0.10;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.03);
  }

  _makeNoise(dur) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}
