import { MicThresholds } from './types';
import { PianoNoteDetector, type ReferenceAudio } from './pianoNoteDetector';
import { BasicPitchVerifier } from './basicPitchVerifier';
import { loadBasicPitchInference, type InferenceHandle } from './basicPitchModel';

export interface NoteEvents {
  on: number[];
  off: number[];
}

export type AiStatus = 'loading' | 'ready' | 'unavailable';

const NO_EVENTS: NoteEvents = { on: [], off: [] };

// How strongly the AI must see a note start before an unexpected note is accepted, and how
// long such a note may wait for that answer. Chosen by simulation (see README).
const CONFIRM_ONSET = 0.5;
const CONFIRM_DEADLINE_MS = 500;

// One model load per page, however often the microphone is switched on and off.
let sharedInference: Promise<InferenceHandle | null> | null = null;
const loadInferenceOnce = (): Promise<InferenceHandle | null> => {
  if (!sharedInference) {
    sharedInference = loadBasicPitchInference().then((handle) => {
      if (!handle) sharedInference = null; // allow another try next time (e.g. the network was down)
      return handle;
    });
  }
  return sharedInference;
};

/**
 * Microphone -> piano notes.
 *
 * Two parts work together, with nothing for the player to set up:
 *   1. PianoNoteDetector (pure signal processing, ~1 ms per frame) finds notes fast.
 *      Notes the song is asking for are passed on immediately.
 *   2. A small note model (Basic Pitch, loaded once and kept in the browser) double-checks
 *      every OTHER note before it is passed on. It is only ever a second opinion: it
 *      cannot create notes, so silence and room noise stay silent. If the model cannot
 *      be loaded, or the device is too slow, this part is skipped and step 1 stands alone.
 */
export class AcousticPianoService {
  private analyser: AnalyserNode;
  private referenceAnalyser: AnalyserNode | null;
  private referenceBuffer: Float32Array | null = null;
  private audioContext: AudioContext;
  private detector: PianoNoteDetector;
  private buffer: Float32Array;
  private sampleRate: number;
  private lastRun = -Infinity;
  private lastEndSample = -1;
  private expected: Set<number> | null = null;
  private verifier: BasicPitchVerifier | null = null;
  private loadFinished = false;
  private destroyed = false;
  private pending = new Map<number, { t: number; offAt: number | null }>();
  private emitted = new Set<number>();

  /**
   * @param analysers  the microphone
   * @param audioContext the microphone's context
   * @param referenceAnalyser optional: hears what the app itself plays (metronome, backing track,
   *   hit sounds). Its sound reaches the microphone through the speakers, and is removed from it
   *   so it is not mistaken for notes.
   */
  constructor(analysers: AnalyserNode | AnalyserNode[], audioContext: AudioContext, referenceAnalyser?: AnalyserNode | null) {
    this.analyser = Array.isArray(analysers) ? analysers[0] : analysers;
    this.referenceAnalyser = referenceAnalyser ?? null;
    if (this.referenceAnalyser) {
      this.referenceAnalyser.fftSize = 32768; // the longest span the detector looks at, at any sample rate
      this.referenceBuffer = new Float32Array(this.referenceAnalyser.fftSize);
    }
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate || 44100;
    this.detector = new PianoNoteDetector(this.sampleRate);
    this.analyser.fftSize = this.detector.frameSize;
    this.analyser.smoothingTimeConstant = 0;
    this.buffer = new Float32Array(this.detector.frameSize);
    this.startVerifier();
  }

  private startVerifier() {
    loadInferenceOnce().then((handle) => {
      this.loadFinished = true;
      if (this.destroyed || !handle) return;
      this.verifier = new BasicPitchVerifier(handle.infer);
    });
  }

  /** What the AI second opinion is doing, for an optional status line. */
  public getAiStatus(): AiStatus {
    if (!this.loadFinished) return 'loading';
    if (!this.verifier || this.verifier.isDisabled()) return 'unavailable';
    return 'ready';
  }

  /**
   * Notes the game is waiting for right now (a list, possibly empty), or null when there
   * is no score (free play). Expected notes are confirmed faster and at a lower level.
   */
  public setExpectedNotes(midis: Iterable<number> | null) {
    this.expected = midis === null ? null : new Set(midis);
    this.detector.setExpectedNotes(midis);
  }

  /** Hands the newly captured audio to the AI part. Exact: it counts samples, not time. */
  private feedVerifier(nowMs: number, activityLevel: number) {
    const verifier = this.verifier;
    if (!verifier || verifier.isDisabled()) return;
    verifier.setActivityLevel(activityLevel);
    const endSample = Math.round(this.audioContext.currentTime * this.sampleRate);
    const fresh = endSample - this.lastEndSample;
    const had = this.lastEndSample >= 0;
    this.lastEndSample = endSample;
    if (!had || fresh <= 0) return;
    if (fresh > this.buffer.length) {
      verifier.resetStream(); // audio was skipped (tab in the background): start over cleanly
      return;
    }
    verifier.push(this.buffer.subarray(this.buffer.length - fresh), this.sampleRate, nowMs);
  }

  /** Call once per animation frame. Returns the keys that went down / came up. */
  public process(thresholds: MicThresholds, nowMs: number = performance.now()): NoteEvents {
    // Screens faster than 100 Hz would only re-analyse nearly identical audio.
    if (nowMs - this.lastRun < 10) return NO_EVENTS;
    this.lastRun = nowMs;
    this.analyser.getFloatTimeDomainData(this.buffer as any);

    // Sensitivity slider: -30 dB (most sensitive) .. 0 dB, default -20 dB.
    // It sets the quietest note that may trigger, 35 dB below the slider value.
    const sensitivity = thresholds.mid ?? -20;
    const minLevelDb = sensitivity - 35;
    this.feedVerifier(nowMs, Math.pow(10, minLevelDb / 20) * 0.5);

    let reference: ReferenceAudio | undefined;
    if (this.referenceAnalyser && this.referenceBuffer) {
      try {
        this.referenceAnalyser.getFloatTimeDomainData(this.referenceBuffer as any);
        reference = { samples: this.referenceBuffer, sampleRate: this.referenceAnalyser.context.sampleRate };
      } catch {
        reference = undefined; // the app's audio context went away: carry on without it
      }
    }
    const found = this.detector.process(this.buffer, nowMs, minLevelDb, reference);
    const verifier = this.verifier;
    const aiReady = !!verifier && verifier.isReady(nowMs);

    const out: NoteEvents = { on: [], off: [] };
    const release = (midi: number) => {
      if (this.emitted.delete(midi)) out.off.push(midi);
    };
    const press = (midi: number) => {
      this.emitted.add(midi);
      out.on.push(midi);
    };

    // Releases first so a quick re-strike ends up pressed.
    for (const midi of found.off) {
      const waiting = this.pending.get(midi);
      if (waiting) waiting.offAt = nowMs;
      else release(midi);
    }
    for (const midi of found.on) {
      if (this.pending.has(midi)) continue;
      const asked = this.expected !== null && this.expected.has(midi);
      if (asked || !aiReady) press(midi);
      else this.pending.set(midi, { t: nowMs, offAt: null });
    }

    // Second opinions.
    if (this.pending.size > 0) {
      for (const [midi, wait] of this.pending) {
        const verdict = verifier && aiReady ? verifier.onsetEvidence(midi, wait.t - 300, wait.t + 20) : null;
        if (verdict && verdict.value >= CONFIRM_ONSET) {
          press(midi);
          if (wait.offAt !== null) release(midi);
          this.pending.delete(midi);
        } else if (!verdict) {
          // The AI went away while this note was waiting: do not lose a real note over it.
          press(midi);
          if (wait.offAt !== null) release(midi);
          this.pending.delete(midi);
        } else if (nowMs - wait.t > CONFIRM_DEADLINE_MS) {
          this.pending.delete(midi); // the AI did not hear a new note there
        }
      }
    }

    return out.on.length || out.off.length ? out : NO_EVENTS;
  }

  public destroy(): void {
    this.destroyed = true;
    this.pending.clear();
    this.emitted.clear();
    this.detector.reset();
    this.verifier = null;
  }
}
