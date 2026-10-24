// Deterministic timeline. Rendering never changes the imported page snapshots.
export class WebShopClock {
  constructor(episode, reducedMotion = false) {
    this.episode = episode;
    this.reducedMotion = reducedMotion;
    this.speed = 1;
    this.seek(0);
  }
  seek(snapshot) {
    this.snapshot = Math.max(0, Math.min(this.episode.steps.length, Math.round(snapshot)));
    this.stepIndex = this.snapshot - 1;
    this.phase = 'rest'; this.elapsed = 0; this.progress = 0; this.playing = false;
  }
  pause() { this.playing = false; }
  play() {
    if (this.snapshot === this.episode.steps.length && this.phase === 'rest') this.seek(0);
    if (this.phase === 'rest') this.beginNext();
    this.playing = true;
  }
  beginNext() {
    if (this.snapshot === this.episode.steps.length) { this.phase = 'rest'; this.playing = false; return; }
    this.stepIndex = this.snapshot; this.phase = 'locate'; this.elapsed = 0; this.progress = 0;
  }
  duration() {
    if (this.phase === 'feedback') return 2;
    if (this.reducedMotion) return 0.001;
    if (this.phase === 'locate') return 0.6;
    if (this.phase === 'transition') return 0.3;
    return this.episode.steps[this.stepIndex]?.action?.type === 'search' ? 1.2 : 0.25;
  }
  tick(seconds) {
    let remaining = Math.max(0, seconds) * this.speed;
    while (remaining > 0 && this.playing) {
      const slice = Math.min(remaining, Math.max(0, this.duration() - this.elapsed));
      this.elapsed += slice; remaining -= slice;
      this.progress = Math.min(1, this.elapsed / this.duration());
      if (this.progress >= 1 - 1e-8) {
        const next = { locate: 'execute', execute: 'transition', transition: 'feedback' }[this.phase];
        if (next) {
          this.phase = next; this.elapsed = 0; this.progress = 0;
          if (next === 'feedback') this.snapshot = this.stepIndex + 1;
        } else this.beginNext();
      }
    }
  }
  get state() { return this.episode.snapshots[this.snapshot]; }
  get selectedStep() { return this.stepIndex; }
  get acting() { return ['locate', 'execute', 'transition'].includes(this.phase); }
}
