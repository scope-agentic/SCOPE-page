// Pure playback state: no rendering or browser dependencies.
export class ReplayClock {
  constructor(episode, reducedMotion = false) {
    this.episode = episode;
    this.reducedMotion = reducedMotion;
    this.speed = 1;
    this.seek(0);
  }
  seek(snapshot) {
    this.snapshot = Math.max(0, Math.min(this.episode.steps.length, Math.round(snapshot)));
    this.stepIndex = this.snapshot - 1;
    this.phase = 'rest';
    this.progress = 0;
    this.playing = false;
    this.elapsed = 0;
  }
  play() {
    if (this.snapshot === this.episode.steps.length && this.phase === 'rest') this.seek(0);
    if (this.phase === 'rest') this.beginNext();
    this.playing = true;
  }
  pause() { this.playing = false; }
  beginNext() {
    if (this.snapshot >= this.episode.steps.length) {
      this.playing = false;
      this.phase = 'rest';
      return;
    }
    this.stepIndex = this.snapshot;
    this.phase = 'action';
    this.elapsed = 0;
    this.progress = 0;
  }
  duration() {
    if (this.phase === 'hold') return 1.5;
    if (this.reducedMotion) return 0.12;
    return this.episode.steps[this.stepIndex]?.action.type === 'go' ? 1.6 : 0.9;
  }
  tick(seconds) {
    if (!this.playing) return;
    let remaining = seconds * this.speed;
    // Preserve elapsed time across phase boundaries, including at 2× speed.
    while (remaining > 0 && this.playing) {
      const duration = this.duration();
      const slice = Math.min(remaining, Math.max(0, duration - this.elapsed));
      this.elapsed += slice;
      remaining -= slice;
      this.progress = Math.min(1, this.elapsed / duration);
      if (this.elapsed >= duration - 1e-8) {
        if (this.phase === 'action') {
          this.snapshot = this.stepIndex + 1;
          this.phase = 'hold';
          this.elapsed = 0;
          this.progress = 0;
        } else this.beginNext();
      }
    }
  }
  get state() { return this.episode.snapshots[this.snapshot]; }
  get selectedStep() { return this.stepIndex; }
}
