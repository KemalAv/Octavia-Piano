// ==================================================================================
// POLYPHONIC PIANO NOTE DETECTOR (microphone -> note on / note off)
//
// Plain signal processing, no machine-learning model and nothing to download:
//
//   1. One FFT per frame (plus a longer one for the lowest octave).
//   2. For each of the 88 keys, look for its partials (fundamental + overtones,
//      allowing for piano string inharmonicity) as real spectral peaks whose
//      measured frequency is within a fraction of a semitone of where that key
//      would put them.
//   3. A key counts as sounding when its fundamental and enough overtones are
//      there. A key whose fundamental sits on an overtone of a lower sounding key
//      is only accepted with extra evidence (it is clearly too strong to be an
//      overtone, or it starts while the lower key is already ringing).
//   4. A small per-key state machine turns that into note-on / note-off, with
//      re-strike detection for repeated notes.
//
// The game can also tell the detector which notes it is waiting for
// (setExpectedNotes). Those are confirmed faster and at a lower level, while
// everything else has to be unambiguous. That "listen for what the score asks"
// step is what makes chords and octaves reliable without a neural network.
//
// Cost: well under a millisecond per frame.
// ==================================================================================

const MIN_MIDI = 21; // A0
const MAX_MIDI = 108; // C8
const KEYS = MAX_MIDI - MIN_MIDI + 1;
const MAX_PARTIALS = 10;
const MAX_PARTIAL_HZ = 8000;
const LONG_WINDOW_BELOW_MIDI = 40; // the lowest keys need the longer window to separate partials
const FAST_WINDOW_FROM_MIDI = 60; // expected keys from here up are first tried in a short, quick window
const HISTORY = 16;
const PEAK_OVER_FLOOR = 6; // a partial must stand this far above the band's noise floor
const REF_HOLD_MS = 280; // the app's own sound is remembered this long: it reaches the microphone a little late
const REF_OVERSUBTRACT = 1.6; // remove a bit more than the estimate: a leftover looks like a note, a hole does not
const REF_QUARTILE = 0.25; // the leak is taken from the weakest quarter of the measurements, so it is never over-estimated


const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Typical piano inharmonicity coefficient B for a key (partial k sits at k*f0*sqrt(1+B*k^2)). */
const inharmonicity = (m: number) =>
  m >= 40 ? 1e-4 * Math.pow(2, (m - 48) / 7.5) : 0.7e-4 * Math.pow(2, (40 - m) / 14);

class FFT {
  readonly n: number;
  private cos: Float32Array;
  private sin: Float32Array;
  private rev: Uint32Array;
  private re: Float32Array;
  private im: Float32Array;
  private win: Float32Array;
  private norm: number;
  readonly mag: Float32Array;
  /** Noise floor per bin: a low percentile of each frequency band, so partial peaks do not lift it. */
  readonly floor: Float32Array;
  private bandEdges: number[] = [];
  private scratch: Float32Array;

  constructor(n: number) {
    this.n = n;
    this.cos = new Float32Array(n / 2);
    this.sin = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / n);
      this.sin[i] = Math.sin((2 * Math.PI * i) / n);
    }
    this.rev = new Uint32Array(n);
    const bits = Math.round(Math.log2(n));
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.re = new Float32Array(n);
    this.im = new Float32Array(n);
    this.win = new Float32Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      sum += this.win[i];
    }
    this.norm = 2 / sum; // a full-scale sine reads as amplitude 1
    this.mag = new Float32Array(n / 2);
    this.floor = new Float32Array(n / 2);
    // Bands grow with frequency (about a third of an octave, at least 16 bins).
    for (let b = 1; b < n / 2; ) {
      this.bandEdges.push(b);
      b += Math.max(16, Math.round(b * 0.26));
    }
    this.bandEdges.push(n / 2);
    this.scratch = new Float32Array(n / 2);
  }

  /** Transforms the last `n` samples of `input`. */
  run(input: Float32Array) {
    const { n, re, im, rev, win, cos, sin } = this;
    const off = input.length - n;
    for (let i = 0; i < n; i++) {
      re[rev[i]] = input[off + i] * win[i];
      im[i] = 0;
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let j = 0, t = 0; j < half; j++, t += step) {
          const a = start + j;
          const b = a + half;
          const xr = re[b] * cos[t] + im[b] * sin[t];
          const xi = im[b] * cos[t] - re[b] * sin[t];
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
    const { mag, floor, norm, bandEdges, scratch } = this;
    const bins = n / 2;
    for (let i = 0; i < bins; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) * norm;

    // 25th percentile of each band, then interpolated between band centres.
    const count = bandEdges.length - 1;
    let prevCentre = 0;
    let prevValue = 0;
    for (let b = 0; b < count; b++) {
      const lo = bandEdges[b];
      const hi = bandEdges[b + 1];
      const part = scratch.subarray(0, hi - lo);
      part.set(mag.subarray(lo, hi));
      part.sort();
      const value = part[(part.length * 0.25) | 0] + 1e-9;
      const centre = (lo + hi) / 2;
      if (b === 0) {
        for (let i = 0; i < centre; i++) floor[i] = value;
      } else {
        const from = Math.ceil(prevCentre);
        for (let i = from; i < centre; i++) {
          floor[i] = prevValue + ((value - prevValue) * (i - prevCentre)) / (centre - prevCentre);
        }
      }
      prevCentre = centre;
      prevValue = value;
    }
    for (let i = Math.ceil(prevCentre); i < bins; i++) floor[i] = prevValue;
  }
}

interface KeyModel {
  midi: number;
  long: boolean;
  count: number; // number of partials tracked
  hz: Float32Array; // expected partial frequencies
  f0: number;
  B: number;
}

interface KeyState {
  on: boolean;
  seenSince: number; // time the key became continuously present, -1 if not present
  lastSeen: number;
  onAt: number;
  independent: boolean; // accepted although it sits on an overtone of a lower key
}

/** What the app itself is playing (metronome, backing track, ...), as heard before the speakers. */
export interface ReferenceAudio {
  /** Most recent audio, last sample = now. Needs at least `frameSize * referenceRate / micRate` samples. */
  samples: Float32Array;
  sampleRate: number;
}

export interface DetectorEvents {
  on: number[];
  off: number[];
}

export class PianoNoteDetector {
  readonly sampleRate: number;
  /** Number of most recent samples `process` needs. */
  readonly frameSize: number;

  private fast: FFT;
  private short: FFT;
  private longer: FFT;
  private keys: KeyModel[] = [];
  private states: KeyState[] = [];
  private expected = new Uint8Array(128);
  private hasExpected = false;

  // Per-frame measurements, indexed by key (midi - MIN_MIDI).
  private amp = new Float32Array(KEYS * (MAX_PARTIALS + 1));
  private level = new Float32Array(KEYS);
  private upper = new Float32Array(KEYS); // energy of overtones 3+, renewed by every attack
  private raw = new Uint8Array(KEYS);
  private accepted = new Uint8Array(KEYS);

  // The app's own sound (see ReferenceAudio): spectra per FFT, with a decaying max-hold,
  // and how strongly it leaks from the speakers into the microphone (learned on the fly).
  private refFast: FFT;
  private refShort: FFT;
  private refLonger: FFT;
  private holdFast: Float32Array;
  private holdShort: Float32Array;
  private holdLonger: Float32Array;
  private refBuf: Float32Array;
  private refTotalPrev = 0;
  private lastRefMs = -1e9;
  private coupling = 1; // how much of the app's sound reaches the microphone (1 until measured)
  private couplingKnown = false;
  private refHoldActive = false; // some of the app's sound is still remembered

  // Short history for onset / re-strike decisions.
  private histTime = new Float64Array(HISTORY).fill(-1e9);
  private histLevel = new Float32Array(HISTORY * KEYS);
  private histFund = new Float32Array(HISTORY * KEYS);
  private histUpper = new Float32Array(HISTORY * KEYS);
  private histPos = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    const shortSize = sampleRate > 50000 ? 8192 : 4096;
    this.fast = new FFT(shortSize / 2);
    this.short = new FFT(shortSize);
    this.longer = new FFT(shortSize * 2);
    this.refFast = new FFT(shortSize / 2);
    this.refShort = new FFT(shortSize);
    this.refLonger = new FFT(shortSize * 2);
    this.holdFast = new Float32Array(shortSize / 4);
    this.holdShort = new Float32Array(shortSize / 2);
    this.holdLonger = new Float32Array(shortSize);
    this.refBuf = new Float32Array(shortSize * 2);
    this.frameSize = shortSize * 2;
    for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
      const f0 = midiToHz(m);
      const B = inharmonicity(m);
      const limit = Math.min(MAX_PARTIAL_HZ, sampleRate * 0.45);
      const hz = new Float32Array(MAX_PARTIALS + 1);
      let count = 0;
      for (let k = 1; k <= MAX_PARTIALS; k++) {
        const f = k * f0 * Math.sqrt(1 + B * k * k);
        if (f > limit) break;
        hz[k] = f;
        count = k;
      }
      this.keys.push({ midi: m, long: m < LONG_WINDOW_BELOW_MIDI, count, hz, f0, B });
      this.states.push({ on: false, seenSince: -1, lastSeen: -1e9, onAt: -1e9, independent: false });
    }
  }

  /**
   * Notes the game is waiting for right now.
   * Pass a list (possibly empty) while a song is being played: notes on the list are
   * confirmed quickly, anything else has to be unambiguous.
   * Pass null when there is no score (free play): every note is judged on its own.
   */
  setExpectedNotes(midis: Iterable<number> | null) {
    this.expected.fill(0);
    this.hasExpected = midis !== null;
    if (!midis) return;
    for (const m of midis) if (m >= 0 && m < 128) this.expected[m] = 1;
  }

  reset() {
    for (const s of this.states) {
      s.on = false;
      s.seenSince = -1;
      s.lastSeen = -1e9;
      s.independent = false;
    }
    this.histTime.fill(-1e9);
    this.histLevel.fill(0);
    this.histFund.fill(0);
    this.histUpper.fill(0);
    this.holdFast.fill(0);
    this.holdShort.fill(0);
    this.holdLonger.fill(0);
    this.refTotalPrev = 0;
    this.coupling = 1;
    this.couplingKnown = false;
    this.refHoldActive = false;
  }

  /** The reference's last `frameSize` samples at this detector's sample rate, or null if there is not enough. */
  private referenceTail(ref: ReferenceAudio): Float32Array | null {
    const n = this.frameSize;
    const ratio = ref.sampleRate / this.sampleRate;
    const same = Math.abs(ratio - 1) < 1e-6;
    const need = same ? n : Math.ceil(n * ratio) + 2;
    const len = ref.samples.length;
    if (len < need) return null;
    if (same) return ref.samples.subarray(len - n);
    const out = this.refBuf;
    const first = len - n * ratio;
    for (let i = 0; i < n; i++) {
      const pos = first + i * ratio;
      const k = Math.floor(pos);
      const f = pos - k;
      out[i] = ref.samples[k] * (1 - f) + ref.samples[k + 1] * f;
    }
    return out;
  }

  /**
   * Removes what the speakers are playing from the microphone spectra.
   * The leak (speaker -> room -> microphone) is learned while the app's sound is fading:
   * that is when the microphone shows it clearly, without a note being struck on top.
   */
  private subtractReference(ref: ReferenceAudio, nowMs: number): void {
    const tail = this.referenceTail(ref);
    if (!tail) return;
    this.refFast.run(tail);
    this.refShort.run(tail);
    this.refLonger.run(tail);
    const dt = Math.min(1000, Math.max(0, nowMs - this.lastRefMs));
    this.lastRefMs = nowMs;
    const decay = Math.exp(-dt / REF_HOLD_MS);
    const pairs: [FFT, FFT, Float32Array][] = [
      [this.fast, this.refFast, this.holdFast],
      [this.short, this.refShort, this.holdShort],
      [this.longer, this.refLonger, this.holdLonger],
    ];

    // Learn the leak from the middle spectrum, before anything is subtracted.
    {
      const [mic, rf, hold] = pairs[1];
      let total = 0;
      let holdMax = 0;
      for (let b = 2; b < hold.length; b++) {
        const h = Math.max(rf.mag[b], hold[b] * decay);
        if (h > holdMax) holdMax = h;
        total += rf.mag[b];
      }
      const rising = total > this.refTotalPrev * 1.02 + 1e-6;
      this.refTotalPrev = total;
      if (holdMax > 2e-4 && !rising) {
        const ratios: number[] = [];
        for (let b = 3; b < hold.length - 2; b++) {
          const h = Math.max(rf.mag[b], hold[b] * decay);
          if (h < holdMax * 0.08 || h < Math.max(hold[b - 1], hold[b + 1]) * decay) continue; // strong peaks only
          const m = Math.max(mic.mag[b - 1], mic.mag[b], mic.mag[b + 1]);
          ratios.push(m / h);
          if (ratios.length >= 48) break;
        }
        if (ratios.length >= 3) {
          ratios.sort((a, b) => a - b);
          const estimate = ratios[Math.floor(ratios.length * REF_QUARTILE)];
          if (!this.couplingKnown) {
            this.couplingKnown = true;
            this.coupling = estimate;
          } else {
            // Quickly down (a smaller leak is certain), slowly up (a played note may be adding to it).
            this.coupling += (estimate - this.coupling) * (estimate < this.coupling ? 0.35 : 0.06);
          }
        }
      }
    }

    const sub = REF_OVERSUBTRACT * this.coupling;
    let remembered = 0;
    for (const [mic, rf, hold] of pairs) {
      const mag = mic.mag;
      for (let b = 1; b < hold.length; b++) {
        const h = Math.max(rf.mag[b], hold[b] * decay);
        hold[b] = h;
        if (h > remembered) remembered = h;
        if (h > 0) {
          const v = mag[b] - sub * h;
          mag[b] = v > 0 ? v : 0;
        }
      }
    }
    this.refHoldActive = remembered > 1e-6;
  }

  /** Keys currently considered held. */
  activeNotes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < KEYS; i++) if (this.states[i].on) out.push(i + MIN_MIDI);
    return out;
  }

  /**
   * Amplitude of the spectral peak expected at `hz`, or 0 when there is no clean peak
   * within a fraction of a semitone.
   */
  private peak(fft: FFT, hz: number, minAmp: number, overFloor: number): number {
    const binHz = this.sampleRate / fft.n;
    const mag = fft.mag;
    const center = hz / binHz;
    const reach = Math.max(1, center * 0.03); // +-50 cents, at least one bin
    let lo = Math.floor(center - reach);
    let hi = Math.ceil(center + reach);
    if (lo < 2) lo = 2;
    if (hi > mag.length - 2) hi = mag.length - 2;
    let best = -1;
    let bestMag = 0;
    for (let b = lo; b <= hi; b++) {
      if (mag[b] > bestMag) {
        bestMag = mag[b];
        best = b;
      }
    }
    if (best < 0 || bestMag < minAmp) return 0;
    const l = mag[best - 1];
    const r = mag[best + 1];
    if (l > bestMag || r > bestMag) return 0; // slope of a neighbouring peak
    if (bestMag < fft.floor[best] * overFloor) return 0; // not standing out of the noise
    // Parabolic interpolation on log magnitude gives the true peak frequency.
    const a = Math.log(l + 1e-12);
    const c = Math.log(r + 1e-12);
    const b0 = Math.log(bestMag);
    const denom = a - 2 * b0 + c;
    const shift = denom < -1e-9 ? (0.5 * (a - c)) / denom : 0;
    const cents = 1200 * Math.log2(((best + shift) * binHz) / hz);
    if (cents > 42 || cents < -42) return 0;
    return Math.exp(b0 - 0.25 * (a - c) * shift);
  }

  /** Measures the partials of one key in one spectrum. Returns whether the key is sounding. */
  private measure(i: number, fft: FFT, minAmp: number, isExpected: boolean): boolean {
    const key = this.keys[i];
    const amp = this.amp;
    const base = i * (MAX_PARTIALS + 1);
    const m = key.midi;
    let strongest = 0;
    for (let k = 1; k <= key.count; k++) {
      // High keys have little besides their fundamental, so it has to stand out clearly.
      const a = this.peak(fft, key.hz[k], minAmp, k === 1 && m >= 84 ? 12 : PEAK_OVER_FLOOR);
      amp[base + k] = a;
      if (a > strongest) strongest = a;
    }
    for (let k = key.count + 1; k <= MAX_PARTIALS; k++) amp[base + k] = 0;
    let support = 0;
    let sq = 0;
    let sqUpper = 0;
    for (let k = 1; k <= key.count; k++) {
      let a = amp[base + k];
      if (a < strongest * 0.012) a = amp[base + k] = 0; // stray blip, not a partial of this key
      if (a > 0) {
        if (k >= 2 && k <= 6) support++;
        if (k <= 4) sq += a * a;
        if (k >= 3) sqUpper += a * a;
      }
    }
    this.level[i] = Math.sqrt(sq);
    this.upper[i] = Math.sqrt(sqUpper);

    const fund = amp[base + 1] > 0;
    let present: boolean;
    if (m >= 84) present = fund;
    else if (m >= 60) present = fund && support >= 1;
    else if (m > 45) present = fund && support >= (isExpected ? 1 : 2);
    else {
      // Small microphones barely pick up bass fundamentals: accept a missing one when
      // the overtone ladder (including the odd ones) is complete and even.
      const a2 = amp[base + 2];
      const a3 = amp[base + 3];
      const a4 = amp[base + 4];
      const a5 = amp[base + 5];
      const top = Math.max(a2, a3, a4, a5) * 0.1;
      const ladder = m <= 40 && top > 0 && a2 > top && a3 > top && a4 > top && a5 > top && amp[base + 6] > 0;
      present = (fund && support >= 2) || ladder;
    }
    // A note the song is asking for may be recognised by its overtones alone, down to the
    // keys a laptop microphone hardly hears. The odd partials (3, 5, 7) tell the key from the
    // key an octave above it. This is only trusted for expected notes: for unexpected ones,
    // overtones of chords and of bass notes would add up to false low notes.
    if (!present && isExpected && m <= 64) {
      const odd = (amp[base + 3] > 0 ? 1 : 0) + (amp[base + 5] > 0 ? 1 : 0) + (amp[base + 7] > 0 ? 1 : 0);
      let mid = 0;
      for (let k = 3; k <= 8 && k <= key.count; k++) if (amp[base + k] > 0) mid++;
      if (mid >= 3 && odd >= 1) {
        // ...unless the octave below is the better explanation: it adds energy at 1.5x and 2.5x.
        const probe = Math.max(minAmp, strongest * 0.05);
        const lowerOctave = this.peak(fft, key.f0 * 1.5, probe, 4) > 0 && this.peak(fft, key.f0 * 2.5, probe, 4) > 0;
        present = !lowerOctave;
      }
    }
    // The fundamental must not be a negligible blip next to the key's own overtones:
    // that pattern is a higher key whose partials happen to line up with this one.
    if (present && fund && m > 40 && amp[base + 1] < strongest * (isExpected ? 0.02 : 0.08)) present = false;
    return present;
  }

  /** True when there is energy where a key one or two octaves-and-a-fifth lower would have partials. */
  private hasLowerHint(i: number, minAmp: number): boolean {
    const f0 = this.keys[i].f0;
    const own = this.amp[i * (MAX_PARTIALS + 1) + 1] || this.level[i];
    const floor = Math.max(minAmp, own * 0.1);
    return (
      this.peak(this.short, f0 * 0.5, floor, 4) > 0 ||
      this.peak(this.short, f0 * 1.5, floor, 4) > 0 ||
      this.peak(this.short, f0 / 3, floor, 4) > 0
    );
  }

  private pastIndex(now: number, agoMs: number): number {
    // Most recent stored frame that is at least `agoMs` old.
    let best = -1;
    let bestT = -1e12;
    for (let i = 0; i < HISTORY; i++) {
      const t = this.histTime[i];
      if (t <= now - agoMs && t > bestT) {
        bestT = t;
        best = i;
      }
    }
    return best;
  }

  /**
   * Analyses one frame.
   * @param samples   mono samples, at least `frameSize` long, most recent last
   * @param nowMs     monotonic time of this frame
   * @param minLevelDb quietest note level that may trigger, in dBFS (e.g. -40)
   */
  process(samples: Float32Array, nowMs: number, minLevelDb: number, reference?: ReferenceAudio): DetectorEvents {
    const events: DetectorEvents = { on: [], off: [] };
    if (samples.length < this.frameSize) return events;


    const onLevel = Math.pow(10, minLevelDb / 20);
    const partialMin = onLevel * 0.08;
    const { amp, level, raw, accepted, keys, states } = this;
    const P = MAX_PARTIALS + 1;

    // Nothing but room noise: skip the analysis entirely (keeps an idle microphone free).
    let peakAbs = 0;
    for (let i = samples.length - (this.frameSize >> 2); i < samples.length; i++) {
      const v = samples[i] < 0 ? -samples[i] : samples[i];
      if (v > peakAbs) peakAbs = v;
    }
    const silent = peakAbs < onLevel * 0.25;
    let minAmp = partialMin;
    let loudest = 0;

    if (silent) {
      amp.fill(0);
      level.fill(0);
      this.upper.fill(0);
      raw.fill(0);
      accepted.fill(0);
    } else {
      this.fast.run(samples);
      this.short.run(samples);
      this.longer.run(samples);
      if (reference) {
        // While the app plays nothing (and nothing is remembered any more) there is nothing to remove.
        let refPeak = 0;
        const rs = reference.samples;
        for (let i = rs.length - (this.frameSize >> 2); i < rs.length; i++) {
          const v = rs[i] < 0 ? -rs[i] : rs[i];
          if (v > refPeak) refPeak = v;
        }
        if (refPeak > 1e-5 || this.refHoldActive) this.subtractReference(reference, nowMs);
      }

      // ---- 1. measure every key ---------------------------------------------------------
      // Anything more than 50 dB below the loudest thing in the frame is ignored.
      let frameMax = 0;
      {
        const mag = this.short.mag;
        for (let b = 2; b < mag.length; b++) if (mag[b] > frameMax) frameMax = mag[b];
      }
      minAmp = Math.max(partialMin, frameMax * 0.003);
      for (let i = 0; i < KEYS; i++) {
        const key = keys[i];
        const isExpected = this.expected[key.midi] === 1;
        let present = false;
        if (isExpected && key.midi >= FAST_WINDOW_FROM_MIDI) present = this.measure(i, this.fast, minAmp, true);
        if (!present) present = this.measure(i, key.long ? this.longer : this.short, minAmp, isExpected);
        raw[i] = present ? 1 : 0;
        if (present && level[i] > loudest) loudest = level[i];
      }

      // ---- 2. overtone shadows ----------------------------------------------------------
      // A key whose fundamental coincides with an overtone of a lower sounding key needs
      // extra evidence before it counts as a note of its own.
      const past = this.pastIndex(nowMs, 60);
      for (let i = 0; i < KEYS; i++) {
        accepted[i] = raw[i];
        if (!raw[i]) continue;
        if (states[i].on) continue; // already playing: only its own presence matters
        const fundAmp = amp[i * P + 1] || level[i];
        const fundHz = keys[i].f0;
        const isExpected = this.expected[i + MIN_MIDI] === 1;
        // With a score, a note the score does not ask for is only reported when nothing
        // else could explain it.
        const strict = this.hasExpected && !isExpected;
        for (let j = i - 12; j >= 0; j--) {
          if (!accepted[j] && !states[j].on) continue;
          const lowerKey = keys[j];
          const ratio = fundHz / lowerKey.f0;
          let k = 0;
          if (ratio > 24.5) {
            k = 25; // that high up, the lower key has an overtone next to every key
          } else {
            const k0 = Math.round(ratio);
            for (let c = k0 - 1; c <= k0; c++) {
              if (c < 2) continue;
              const predicted = c * lowerKey.f0 * Math.sqrt(1 + lowerKey.B * c * c);
              const cents = 1200 * Math.log2(fundHz / predicted);
              if (cents > -(55 + 2 * c) && cents < 55 + 2 * c) k = c;
            }
          }
          if (!k) continue;
          const lower = j * P;
          let ok = false;
          if (strict) {
            ok = false;
          } else if (k <= lowerKey.count) {
            // Evidence 1: far stronger than the lower key's neighbouring overtones.
            const before = amp[lower + k - 1];
            const after = k + 1 <= lowerKey.count ? amp[lower + k + 1] : 0;
            if (isExpected) {
              ok = fundAmp >= Math.max(before, after) * 0.6;
              // Over a key that has been ringing for a while, even an expected note has to
              // show an attack of its own, or the ringing overtone would play it for free.
              if (ok && states[j].on && nowMs - states[j].onAt > 150) {
                const wasFund = past >= 0 ? this.histFund[past * KEYS + i] : 0;
                ok = fundAmp > wasFund * 1.4 + minAmp;
              }
            } else {
              ok = fundAmp >= Math.max(before, after, level[j] * 0.35) * 2.2;
            }
          } else {
            ok = fundAmp >= level[j] * (isExpected ? 0.15 : 0.8);
          }
          // Evidence 2: it starts while the lower key has been ringing for a while.
          if (!ok && !strict && past >= 0 && states[j].on && nowMs - states[j].onAt > 150) {
            const wasFund = this.histFund[past * KEYS + i];
            const lowerWas = this.histLevel[past * KEYS + j];
            if (fundAmp > wasFund * 2 + minAmp && fundAmp > level[j] * 0.25 && level[j] < lowerWas * 1.3) ok = true;
          }
          if (!ok) {
            accepted[i] = 0;
            break;
          }
        }
      }

    }

    // ---- 3. per-key state machine -----------------------------------------------------
    const pastLong = this.pastIndex(nowMs, 85);
    for (let i = 0; i < KEYS; i++) {
      const st = states[i];
      const midi = i + MIN_MIDI;
      const isExpected = this.expected[midi] === 1;
      const lvl = level[i];

      if (st.on) {
        if (raw[i] && lvl >= onLevel * 0.2) {
          st.lastSeen = nowMs;
          // Re-strike of a key that is still ringing.
          if (pastLong >= 0 && nowMs - st.onAt > 140) {
            const was = this.histLevel[pastLong * KEYS + i];
            const upperWas = this.histUpper[pastLong * KEYS + i];
            const fundNow = amp[i * P + 1];
            const fundWas = this.histFund[pastLong * KEYS + i];
            // The key's own fundamental has to jump: a note struck on one of its overtones
            // makes the key louder too, but leaves its fundamental alone.
            const ownAttack = fundNow > 0 ? fundNow > fundWas * 1.3 : lvl > was * 1.6;
            const louder = lvl > was * 1.5 && this.upper[i] >= upperWas * 1.15;
            const freshAttack = this.upper[i] > upperWas * 1.8 + minAmp && lvl > was * 1.2;
            if (was > 0 && ownAttack && (louder || freshAttack) && lvl >= onLevel && !(this.hasExpected && !isExpected)) {
              events.off.push(midi);
              events.on.push(midi);
              st.onAt = nowMs;
            }
          }
        } else if (nowMs - st.lastSeen > 90) {
          st.on = false;
          st.seenSince = -1;
          st.independent = false;
          events.off.push(midi);
        }
        continue;
      }

      // Quiet next to the loudest key = resonance or leftover, not a played note.
      const strict = this.hasExpected && !isExpected;
      const need = Math.max(
        isExpected ? onLevel * 0.5 : strict ? onLevel * 1.5 : onLevel,
        loudest * (isExpected ? 0.03 : strict ? 0.25 : 0.07)
      );
      if (accepted[i] && lvl >= need) {
        if (st.seenSince < 0) st.seenSince = nowMs;
        st.lastSeen = nowMs;
        // Unexpected notes must hold a little longer, and must be an attack, not a tail
        // drifting back above the threshold.
        // A key in the middle of the keyboard may be an overtone of a bass note whose own
        // (longer) analysis window has not caught up yet: give that a moment to show.
        let hold = isExpected ? 12 : strict ? 60 : 28;
        if (!isExpected && midi < 76 && this.hasLowerHint(i, minAmp)) hold += 75;
        if (nowMs - st.seenSince >= hold) {
          let rising = true;
          // Compare with how things were just before the key first showed up.
          const before = isExpected ? -1 : this.pastIndex(nowMs, nowMs - st.seenSince + 45);
          if (before >= 0) {
            const was = this.histLevel[before * KEYS + i];
            const fundNow = amp[i * P + 1];
            const fundWas = this.histFund[before * KEYS + i];
            rising = lvl > was * 1.2 && (fundNow === 0 || fundNow > fundWas * 1.4);
          }
          if (rising) {
            st.on = true;
            st.onAt = nowMs;
            events.on.push(midi);
          }
        }
      } else if (nowMs - st.lastSeen > 40) {
        st.seenSince = -1;
      }
    }

    // ---- 4. remember this frame -------------------------------------------------------
    const h = this.histPos;
    this.histTime[h] = nowMs;
    for (let i = 0; i < KEYS; i++) {
      this.histLevel[h * KEYS + i] = level[i];
      this.histFund[h * KEYS + i] = amp[i * P + 1];
      this.histUpper[h * KEYS + i] = this.upper[i];
    }
    this.histPos = (h + 1) % HISTORY;

    return events;
  }
}
