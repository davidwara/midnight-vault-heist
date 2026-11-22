// Midnight Vault — WebAudio sound effects, no audio files.
// Every sound is a tiny oscillator blip, so the game ships zero bytes
// of audio and plays offline. M toggles mute; sounds only start after
// the first key press (browsers require a user gesture).

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) { /* headless or blocked: stay silent */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', gain = 0.08, slideTo = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t0);
      o.stop(t0 + dur);
    } catch (e) { /* ignore audio errors mid-game */ }
  }

  step() { this.tone(140 + Math.random() * 40, 0.05, 'triangle', 0.02); }
  pickup() { this.tone(660, 0.1, 'sine', 0.09); this.tone(990, 0.14, 'sine', 0.07); }
  pickHit() { this.tone(520, 0.07, 'square', 0.05, 760); }
  pickMiss() { this.tone(180, 0.22, 'sawtooth', 0.07, 90); }
  emp() { this.tone(1200, 0.3, 'sine', 0.08, 120); }
  alarmTick() { this.tone(880, 0.09, 'square', 0.045); }
  caught() { this.tone(220, 0.4, 'sawtooth', 0.09, 70); }
  laserZap() { this.tone(1500, 0.12, 'sawtooth', 0.06, 300); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'sine', 0.08), i * 110);
    });
  }
  fail() {
    [330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'triangle', 0.08), i * 140);
    });
  }
  click() { this.tone(440, 0.05, 'sine', 0.05); }
}
