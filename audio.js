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

  // Low "bang" — a sine with a fast downward pitch sweep and a quick decay.
  kick(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.12);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(1.0, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Stick "tap" — short filtered noise burst. pan: -1 (left hand) .. +1 (right).
  tap(time, pan = 0) {
    const ctx = this.ctx;
    const dur = 0.05;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    let tail = gain;
    if (this.canPan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      tail = panner;
    }
    src.connect(bp).connect(gain);
    tail.connect(this.master);
    src.start(time);
    src.stop(time + dur);
  }

  // Metronome click — short blip. accent = louder + higher on the downbeat.
  click(time, accent = false) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 2000 : 1200;
    const vol = accent ? 0.28 : 0.16;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    osc.connect(gain).connect(this.master);
    osc.start(time);
    osc.stop(time + 0.04);
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
