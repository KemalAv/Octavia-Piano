import { BASIC_PITCH_WINDOW_SAMPLES, type InferWindow } from './basicPitchModel';

// ==================================================================================
// Streams microphone audio into the Basic Pitch model and answers one question:
//   "did a note with this pitch start around this time?"
//
// The model needs exactly 2 s of 22.05 kHz audio per run, so a result arrives about every
// 250 ms plus the compute time. That is too slow to trigger notes, but good enough to
// CONFIRM notes the fast signal detector already found. It must never create notes on
// its own: in quiet or noisy rooms the model is known to invent them.
// ==================================================================================

const MODEL_RATE = 22050;
const FRAMES = 172;
const PITCHES = 88;
const MIN_MIDI = 21;
const FRAME_MS = (256 / MODEL_RATE) * 1000;
const WINDOW_MS = (BASIC_PITCH_WINDOW_SAMPLES / MODEL_RATE) * 1000;
const KEEP_RESULTS = 4;

/** Streaming windowed-sinc resampler (any input rate -> 22.05 kHz). */
class Resampler {
  private ratio = 1;
  private half = 8;
  private pending = new Float32Array(0);
  private phase = 0;
  private srcRate = 0;

  reset() {
    this.pending = new Float32Array(0);
    this.phase = 0;
  }

  process(input: Float32Array, srcRate: number): Float32Array {
    if (srcRate !== this.srcRate) {
      this.srcRate = srcRate;
      this.ratio = srcRate / MODEL_RATE;
      this.half = Math.ceil(8 * Math.max(1, this.ratio));
      this.reset();
    }
    const merged = new Float32Array(this.pending.length + input.length);
    merged.set(this.pending);
    merged.set(input, this.pending.length);

    const { ratio, half } = this;
    const cutoff = 0.5 / Math.max(1, ratio);
    const out: number[] = [];
    let pos = this.phase;
    while (pos + half + 1 < merged.length) {
      const centre = Math.floor(pos);
      let acc = 0;
      let norm = 0;
      for (let k = centre - half + 1; k <= centre + half; k++) {
        if (k < 0) continue;
        const x = k - pos;
        const sinc = Math.abs(x) < 1e-9 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
        const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / half);
        const c = sinc * w;
        acc += merged[k] * c;
        norm += c;
      }
      out.push(norm > 1e-9 ? acc / norm : 0);
      pos += ratio;
    }
    const keepFrom = Math.max(0, Math.floor(pos) - half);
    this.pending = merged.slice(keepFrom);
    this.phase = pos - keepFrom;
    return Float32Array.from(out);
  }
}

interface WindowResult {
  /** Time (caller's clock, ms) of the last audio sample in the window. */
  endMs: number;
  onsets: Float32Array;
}

export interface VerifierOptions {
  /** How often a new window is run while there is sound. */
  hopMs?: number;
  /** If runs are on average slower than this, the verifier switches itself off. */
  maxInferMs?: number;
}

export class BasicPitchVerifier {
  private resampler = new Resampler();
  private ring = new Float32Array(BASIC_PITCH_WINDOW_SAMPLES);
  private filled = 0;
  private busy = false;
  private lastStartMs = -Infinity;
  private lastLoudMs = -Infinity;
  private results: WindowResult[] = [];
  private inferMsAverage = 0;
  private runs = 0;
  private off = false;
  private hopMs: number;
  private maxInferMs: number;
  private loudLevel = 0.002;

  constructor(private infer: InferWindow, options: VerifierOptions = {}) {
    this.hopMs = options.hopMs ?? 250;
    this.maxInferMs = options.maxInferMs ?? 600;
  }

  /** Peak amplitude above which the room counts as "not silent" (the model is not run in silence). */
  setActivityLevel(peak: number) {
    this.loudLevel = Math.max(1e-4, peak);
  }

  /** The verifier can give an answer right now. */
  isReady(nowMs: number): boolean {
    if (this.off || this.filled < BASIC_PITCH_WINDOW_SAMPLES) return false;
    const last = this.results[this.results.length - 1];
    return !!last && nowMs - last.endMs < 2500;
  }

  isDisabled(): boolean {
    return this.off;
  }

  /** Drops buffered audio, e.g. after the tab was in the background and audio was skipped. */
  resetStream() {
    this.resampler.reset();
    this.filled = 0;
    this.results = [];
  }

  /** Feeds newly captured audio. `endMs` is the clock time of its last sample. */
  push(samples: Float32Array, srcRate: number, endMs: number) {
    if (this.off || samples.length === 0) return;
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i] < 0 ? -samples[i] : samples[i];
      if (v > peak) peak = v;
    }
    if (peak > this.loudLevel) this.lastLoudMs = endMs;

    const resampled = this.resampler.process(samples, srcRate);
    const n = resampled.length;
    if (n === 0) return;
    if (n >= BASIC_PITCH_WINDOW_SAMPLES) {
      this.ring.set(resampled.subarray(n - BASIC_PITCH_WINDOW_SAMPLES));
    } else {
      this.ring.copyWithin(0, n);
      this.ring.set(resampled, BASIC_PITCH_WINDOW_SAMPLES - n);
    }
    this.filled = Math.min(BASIC_PITCH_WINDOW_SAMPLES, this.filled + n);
    this.maybeRun(endMs);
  }

  private maybeRun(nowMs: number) {
    if (this.busy || this.off || this.filled < BASIC_PITCH_WINDOW_SAMPLES) return;
    if (nowMs - this.lastStartMs < this.hopMs) return;
    // Nothing but quiet for the whole window: nothing to confirm, and no reason to spend CPU.
    if (nowMs - this.lastLoudMs > WINDOW_MS + 300) return;

    this.busy = true;
    this.lastStartMs = nowMs;
    const audio = this.ring.slice();
    const started = performance.now();
    this.infer(audio)
      .then((out) => {
        const took = performance.now() - started;
        this.runs++;
        this.inferMsAverage = this.runs === 1 ? took : this.inferMsAverage * 0.7 + took * 0.3;
        this.results.push({ endMs: nowMs, onsets: out.onsets });
        if (this.results.length > KEEP_RESULTS) this.results.shift();
        // Too slow for a live job (old phone, software rendering): step aside quietly.
        if (this.runs >= 3 && this.inferMsAverage > this.maxInferMs) this.off = true;
      })
      .catch(() => {
        this.off = true;
      })
      .finally(() => {
        this.busy = false;
      });
  }

  /**
   * Strongest "a note starts here" signal for `midi` between `fromMs` and `toMs`
   * (0..1), or 0 when no result covers that time yet.
   */
  onsetEvidence(midi: number, fromMs: number, toMs: number): { value: number; covered: boolean } {
    const pitch = midi - MIN_MIDI;
    if (pitch < 0 || pitch >= PITCHES) return { value: 0, covered: false };
    let best = 0;
    let covered = false;
    for (const r of this.results) {
      if (r.endMs < toMs - 120) continue; // that window ended before the note had much of a chance to show
      const start = r.endMs - WINDOW_MS;
      for (let j = 0; j < FRAMES; j++) {
        const t = start + j * FRAME_MS;
        if (t < fromMs || t > toMs) continue;
        covered = true;
        const v = r.onsets[j * PITCHES + pitch];
        if (v > best) best = v;
      }
    }
    return { value: best, covered };
  }
}
