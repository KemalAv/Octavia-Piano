import { MidiNotePlaybackItem, AnalysisResult, ExtendedResult, AnalysisConfig } from './types';
import { DRUM_PRIMARY_MIDI_MAP } from './constants';

export interface FineTunedWeights {
  piano_stretch_mult: number;
  piano_internal_stretch: number;
  piano_leap_strain: number;
  piano_double_stop: number;
  piano_jackhammer: number;
  piano_finger_flow: number;
  piano_hand_jump: number;
  piano_black_key_awkward: number;
  piano_finger_independence: number;
  piano_hand_collision: number;
  piano_stamina_fatigue: number;
  piano_arpeggio_sweep: number;
  piano_octave_staccato: number;
  piano_unison_discount: number;
  piano_chord_buff: number;

  drum_foot_kick: number;
  drum_stick_jackhammer: number;
  drum_stick_move: number;
  drum_crossed_arms: number;
  drum_polyrhythm: number;
  drum_roll_fatigue: number;
  drum_stamina_fatigue: number;

  piano_global_factor: number;
  drum_global_factor: number;
}

export const DEFAULT_FINE_TUNED_WEIGHTS: FineTunedWeights = {
  "piano_stretch_mult": 0.4,
  "piano_internal_stretch": 0.3,
  "piano_leap_strain": 0.3,
  "piano_double_stop": 0.2,
  "piano_jackhammer": 0.3,
  "piano_finger_flow": 1.4,
  "piano_hand_jump": 0.8,
  "piano_black_key_awkward": 0.4,
  "piano_finger_independence": 0.1,
  "piano_hand_collision": 0.3,
  "piano_stamina_fatigue": 0.1,
  "piano_arpeggio_sweep": 2.4,
  "piano_octave_staccato": 2.1,
  "piano_unison_discount": 0.5,
  "piano_chord_buff": 0.2,
  "drum_foot_kick": 1.2,
  "drum_stick_jackhammer": 2.1,
  "drum_stick_move": 1.3,
  "drum_crossed_arms": 1.2,
  "drum_polyrhythm": 0.3,
  "drum_roll_fatigue": 2.7,
  "drum_stamina_fatigue": 0.3,
  "piano_global_factor": 0.6,
  "drum_global_factor": 2.2
};

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  densityWindowMs: 1000,
  densityStepMs: 250,
  densityMinNorm: 0.1,
  densityMaxNorm: 80,
  awkwardIntervalMin: 3,
  awkwardIntervalMax: 4,
  awkwardGapMin: 0.02,
  awkwardGapMax: 0.09,
  awkwardWeightMax: 0.36,
  zigzagGapMin: 0.05,
  zigzagGapMax: 0.03,
  zigzagWeightMax: 0.95,
  repetitionWindow: 250,
  repetitionWeightMin: 0,
  repetitionWeightMax: 0.75,
  abstractnessWeightMax: 33,
  timingVarianceMax: 1000,
  complexityAwkwardWeight: 0.4,
  complexityZigzagWeight: 0.25,
  complexityAbstractWeight: 0.06,
  complexityTimingWeight: 0.34,
  complexityFinalMin: 0.064,
  complexityFinalMax: 0.35,
  tightIntervalMax: 6.2,
  tightIntervalDtMax: 202,
  tightIntervalMinNorm: 0.08,
  tightIntervalMaxNorm: 0.7,
  chordMobilityMinInterval: 6.3,
  chordMobilityMinNorm: 22,
  chordMobilityMaxNorm: 220,
  effortWindow: 500,
  effortStep: 250,
  effortNormMin: 0.4,
  effortNormMax: 88,
  effortConsistencyDiscount: 0.08,
  rangeWindow: 2000,
  rangeStep: 500,
  rangeNormMin: 20,
  rangeNormMax: 118,
  arpNpsMin: 0.6,
  arpNpsMax: 123,
  arpRangeMin: 5.9,
  arpRangeMax: 39,
  arpJumpSmall: 5,
  arpJumpSmallWeight: 0,
  arpJumpLarge: 9.5,
  arpJumpLargeWeight: 0,
  arpJumpWeight: 0.16,
  arpZigzagWeight: 0.12,
  arpSpeedWeight: 0.3,
  arpRangeWeight: 0.4,
  arpJumpZigzagWeight: 0.2,
  arpConsistencyWeight: 0.05,
  trillRatio: 1,
  trillMaxInterval: 3.2,
  trillMaxGap: 275,
  trillNormMin: 0.08,
  trillNormMax: 0.28,
  npsNormMin: 0.2,
  npsNormMax: 192,
  weightSpeedNps: 0.2,
  weightSpeedDensity: 0.4,
  weightSpeedEffort: 0.4,
  polyphonyNormMin: 0,
  polyphonyNormMax: 6,
  weightCompPolyphony: 0.08,
  weightCompAbstract: 0.32,
  weightCompInterval: 0.12,
  weightCompChordMobility: 0.03,
  weightCompRange: 0.36,
  durationNormMin: 20,
  durationNormMax: 275,
  finalWeightSpeed: 3,
  finalWeightComplexity: 5,
  finalWeightArpeggio: 2.5,
  penaltyRepetition: 0.25,
  penaltyTrill: 0.25,
  bonusStamina: 0.25,
  expFactor: 2.6,
  scale: 0.5,
  base: 0.25,
};

// ============================================================
// CORE UTILITIES
// ============================================================
const norm = (v: number, min: number, max: number): number => {
  if (!isFinite(v) || !isFinite(min) || !isFinite(max)) return 0;
  if (max === min) return 0;
  const x = (v - min) / (max - min);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const curved = Math.log1p(x * 9) / Math.log1p(9); // soften scaling
  return Math.max(0, Math.min(1, curved));
};

const avg = (arr: number[]): number =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

function calculateDifficultyLevels(performanceScore: number): { difficultyLevel: number; starLevel: number } {
  let difficultyLevel = 1;
  if (performanceScore < 100)
    difficultyLevel = 1 + norm(performanceScore, 1, 100) * 2; // Range 1-3 (Novice)
  else if (performanceScore < 225)
    difficultyLevel = 3 + norm(performanceScore, 100, 225) * 1; // Range 3-4 (Beginner)
  else if (performanceScore < 550)
    difficultyLevel = 4 + norm(performanceScore, 225, 550) * 2; // Range 4-6 (Intermediate)
  else if (performanceScore < 900)
    difficultyLevel = 6 + norm(performanceScore, 550, 900) * 2; // Range 6-8 (Advanced)
  else if (performanceScore < 1400)
    difficultyLevel = 8 + norm(performanceScore, 900, 1400) * 2; // Range 8-10 (Virtuoso)
  else if (performanceScore < 10000)
    difficultyLevel = 10 + norm(performanceScore, 1400, 10000) * 10; // Range 10-20 (Legendary)
  else
    difficultyLevel = 20 + Math.log10(performanceScore / 10000) * 10;

  const starLevel = Math.max(1, difficultyLevel);
  return {
    difficultyLevel: +difficultyLevel.toFixed(2),
    starLevel: +starLevel.toFixed(1),
  };
}

// Map MIDI pitches to structured columns
function getColumn(midi: number, mode: 'piano' | 'drum'): number {
  if (mode === 'drum') {
    if (midi === 36) return 0; // Bass / Kick (Foot pedal)
    if (midi === 38) return 1; // Snare
    if (midi === 42 || midi === 44 || midi === 46) return 2; // Hi-Hats
    if (midi === 41 || midi === 45 || midi === 48) return 3; // Toms
    if (midi === 49 || midi === 51) return 4; // Cymbals (Crash / Ride)
    return 1; // Snare fallback
  } else {
    // Piano: Map standard 88 keys to index 0-87
    return Math.max(0, Math.min(87, midi - 21));
  }
}

interface NoteWithCol {
  id: string;
  midi: number;
  timeMs: number;
  durationMs: number;
  column: number;
}

interface ChordEvent {
  timeMs: number;
  notes: NoteWithCol[];
}

// Hand structures for simulated playback
interface HandState {
  lastTime: number;
  lastCenter: number;
  lastNotes: number[];
  noteTimes: Map<number, number>; // midi -> timeMs
  emaDt: number; // smoothed sustained interval (ms)
  recentPitches: { timeMs: number; midi: number }[]; // recent notes window for static hand-span box
}

interface DrumState {
  lhTime: number;
  lhCol: number;
  rhTime: number;
  rhCol: number;
  footTime: number;
  lhEmaDt: number;
  rhEmaDt: number;
  footEmaDt: number;
  stickEmaDt: number;
  noteTimes: Map<number, number>; // col -> timeMs
}

// ============================================================
// PURE PHYSIOLOGICAL PHYSICAL-LIMITS DIFFICULTY ENGINE
// ============================================================
export function analyzeMidi(
  notes: MidiNotePlaybackItem[],
  totalDurationMs: number,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
  _unusedOriginalDurationMs?: number,
  instrumentMode?: 'piano' | 'drum',
  customWeights?: FineTunedWeights
): ExtendedResult | null {
  if (!notes.length || totalDurationMs <= 0) return null;

  const weights = customWeights || DEFAULT_FINE_TUNED_WEIGHTS;
  const mode = instrumentMode || 'piano';

  // Pre-process drum notes to keep primary drum mapping
  let processedNotes = notes;
  if (mode === 'drum') {
    processedNotes = notes
      .filter(n => DRUM_PRIMARY_MIDI_MAP[n.midi] !== undefined)
      .map(n => ({
        ...n,
        midi: DRUM_PRIMARY_MIDI_MAP[n.midi],
      }));
  }

  if (processedNotes.length === 0) return null;

  // 1. Sort notes and map them
  const sorted: NoteWithCol[] = [...processedNotes]
    .sort((a, b) => (a.timeMs !== b.timeMs ? a.timeMs - b.timeMs : a.midi - b.midi))
    .map(n => ({
      id: n.noteId,
      midi: n.midi,
      timeMs: n.timeMs,
      durationMs: n.durationMs,
      column: getColumn(n.midi, mode),
    }));

  const songStart = sorted[0].timeMs;
  const songEnd = sorted[sorted.length - 1].timeMs;
  const effectiveDurationMs = Math.max(totalDurationMs, songEnd - songStart, 1);
  const durationSec = effectiveDurationMs / 1000;

  // 2. Group into discrete Chord Events
  const avgMsPerNote = (songEnd - songStart) / Math.max(1, sorted.length);
  const chordWindowMs = Math.min(35, Math.max(2, avgMsPerNote * 0.25));
  const chordEvents: ChordEvent[] = [];
  for (const note of sorted) {
    if (chordEvents.length === 0) {
      chordEvents.push({ timeMs: note.timeMs, notes: [note] });
    } else {
      const lastEvent = chordEvents[chordEvents.length - 1];
      const isSameKey = lastEvent.notes.some(
        n => n.midi === note.midi || (mode === 'drum' && n.column === note.column)
      );
      if (!isSameKey && note.timeMs - lastEvent.timeMs <= chordWindowMs) {
        lastEvent.notes.push(note);
      } else {
        chordEvents.push({ timeMs: note.timeMs, notes: [note] });
      }
    }
  }

  // 3. Physical State & Biomechanical Strain Simulation
  const leftHand: HandState = {
    lastTime: -9999,
    lastCenter: 48,
    lastNotes: [],
    noteTimes: new Map(),
    emaDt: 250,
    recentPitches: [],
  };
  const rightHand: HandState = {
    lastTime: -9999,
    lastCenter: 72,
    lastNotes: [],
    noteTimes: new Map(),
    emaDt: 250,
    recentPitches: [],
  };
  const drumState: DrumState = {
    lhTime: -9999,
    lhCol: 1,
    rhTime: -9999,
    rhCol: 4,
    footTime: -9999,
    lhEmaDt: 250,
    rhEmaDt: 250,
    footEmaDt: 350,
    stickEmaDt: 200,
    noteTimes: new Map(),
  };

  const noteStrains = new Map<string, number>();
  const flowStrains: number[] = [];
  const chordSizes: number[] = [];
  let trillCount = 0;
  let staircaseCount = 0;
  const colHistory: number[] = [];

  const lhActiveNotes: { midi: number; endTime: number }[] = [];
  const rhActiveNotes: { midi: number; endTime: number }[] = [];
  let pianoFatigue = 0;
  let pianoLastTime = -9999;
  let drumFatigue = 0;
  let drumLastTime = -9999;

  const isBlackKey = (m: number): boolean => [1, 3, 6, 8, 10].includes(m % 12);

  for (const event of chordEvents) {
    const t = event.timeMs;
    const N = event.notes.length;
    chordSizes.push(N);

    if (mode === 'piano') {
      // ------------------------------------------------------------
      // PIANO PHYSICAL SIMULATION
      // ------------------------------------------------------------
      const overloadPenalty = N > 10 ? 25.0 : 0;
      const pitches = [...event.notes].sort((a, b) => a.midi - b.midi);
      let lhNotes: NoteWithCol[] = [];
      let rhNotes: NoteWithCol[] = [];

      // Detect parallel octave unison across the keyboard (e.g. 2-hand practice scales and arpeggios)
      const isParallelUnison =
        pitches.length === 2 && [12, 24].includes(Math.abs(pitches[1].midi - pitches[0].midi));

      // Gentle home-register relaxation when a hand has been idle (>300ms)
      if (leftHand.lastTime > 0 && t - leftHand.lastTime > 300) {
        leftHand.lastCenter = 0.8 * leftHand.lastCenter + 0.2 * 50;
      }
      if (rightHand.lastTime > 0 && t - rightHand.lastTime > 300) {
        rightHand.lastCenter = 0.8 * rightHand.lastCenter + 0.2 * 70;
      }

      if (N === 1) {
        const note = pitches[0];
        // Register gravity around C4 (60) prevents one hand from stealing the entire keyboard
        // during rising broken chords (e.g. Bach Prelude in C Major)
        const registerBias = (note.midi - 60) * 0.35;
        const distL = Math.abs(note.midi - leftHand.lastCenter) + registerBias;
        const distR = Math.abs(note.midi - rightHand.lastCenter) - registerBias;
        if (distL < distR) {
          lhNotes = [note];
        } else {
          rhNotes = [note];
        }
      } else {
        let bestSplitIdx = 0;
        let minStrain = Infinity;

        for (let i = 0; i <= N; i++) {
          const lCand = pitches.slice(0, i);
          const rCand = pitches.slice(i);
          let candidateStrain = 0;

          if (lCand.length > 5) candidateStrain += 40;
          if (rCand.length > 5) candidateStrain += 40;

          if (lCand.length > 1) {
            const lSpan = lCand[lCand.length - 1].midi - lCand[0].midi;
            if (lSpan > 12) candidateStrain += (lSpan - 12) * 5;
            if (lSpan > 15) candidateStrain += 100;
          }
          if (rCand.length > 1) {
            const rSpan = rCand[rCand.length - 1].midi - rCand[0].midi;
            if (rSpan > 12) candidateStrain += (rSpan - 12) * 5;
            if (rSpan > 15) candidateStrain += 100;
          }

          if (lCand.length > 0 && rCand.length > 0) {
            if (lCand[lCand.length - 1].midi >= rCand[0].midi) {
              candidateStrain += 70;
            }
          }

          if (lCand.length > 0) {
            const lCenter = lCand.reduce((sum, n) => sum + n.midi, 0) / lCand.length;
            candidateStrain += Math.abs(lCenter - leftHand.lastCenter) * 0.4;
          }
          if (rCand.length > 0) {
            const rCenter = rCand.reduce((sum, n) => sum + n.midi, 0) / rCand.length;
            candidateStrain += Math.abs(rCenter - rightHand.lastCenter) * 0.4;
          }

          if (candidateStrain < minStrain) {
            minStrain = candidateStrain;
            bestSplitIdx = i;
          }
        }

        lhNotes = pitches.slice(0, bestSplitIdx);
        rhNotes = pitches.slice(bestSplitIdx);
      }

      if (pianoLastTime > 0 && t > pianoLastTime) {
        const gap = t - pianoLastTime;
        const silenceThreshold = 1500;
        if (gap > silenceThreshold) {
          pianoFatigue = Math.max(0, pianoFatigue * Math.exp(-(gap - silenceThreshold) / 1000));
        }
      }

      const lhActive = lhActiveNotes.filter(n => n.endTime > t);
      const rhActive = rhActiveNotes.filter(n => n.endTime > t);

      let handCollisionStrain = 0;
      let currentCenterL = leftHand.lastCenter;
      let currentCenterR = rightHand.lastCenter;

      if (lhNotes.length > 0) {
        currentCenterL = lhNotes.reduce((sum, n) => sum + n.midi, 0) / lhNotes.length;
      }
      if (rhNotes.length > 0) {
        currentCenterR = rhNotes.reduce((sum, n) => sum + n.midi, 0) / rhNotes.length;
      }

      if (lhNotes.length > 0 && rhNotes.length > 0) {
        const centerDistance = Math.abs(currentCenterR - currentCenterL);
        if (centerDistance < 6) {
          handCollisionStrain = (6 - centerDistance) * 1.5 * weights.piano_hand_collision;
        }
      }

      const processPianoHand = (
        hand: HandState,
        hNotes: NoteWithCol[],
        rawCenter: number,
        activeList: { midi: number; endTime: number }[]
      ) => {
        if (hNotes.length === 0) return;

        const rawDt = t - hand.lastTime;
        if (hand.lastTime > 0 && rawDt > 0) {
          const clampedDt = Math.max(8, Math.min(1500, rawDt));
          if (clampedDt < hand.emaDt) {
            hand.emaDt = 0.35 * clampedDt + 0.65 * hand.emaDt;
          } else {
            hand.emaDt = 0.6 * clampedDt + 0.4 * hand.emaDt;
          }
        }
        const effDt = Math.max(8, hand.emaDt);
        const slowDecay =
          effDt > 300
            ? Math.pow(300 / effDt, 0.75)
            : effDt < 150
              ? Math.min(2.0, Math.pow(150 / effDt, 0.3))
              : 1.0;

        // Track recent 4-note pitch window within 800ms to detect static broken-chord hand box
        // (e.g. Bach Prelude in C Major where fingers rock inside a fixed <=12-semitone chord position)
        hand.recentPitches = hand.recentPitches
          .filter(p => t - p.timeMs <= 800)
          .slice(-4);
        for (const n of hNotes) {
          hand.recentPitches.push({ timeMs: t, midi: n.midi });
        }
        const winMidis = hand.recentPitches.map(p => p.midi);
        const winSpan = winMidis.length ? Math.max(...winMidis) - Math.min(...winMidis) : 0;

        let curCenter = rawCenter;
        let inStaticArpeggioBox = false;
        if (hNotes.length === 1 && winSpan <= 12 && winMidis.length >= 2) {
          curCenter = 0.5 * (Math.min(...winMidis) + Math.max(...winMidis));
          inStaticArpeggioBox = true;
        }

        const span =
          hNotes.length > 1 ? hNotes[hNotes.length - 1].midi - hNotes[0].midi : 0;
        const stretchMultiplier =
          span > 12
            ? 1.0 + Math.pow(span - 12, 1.15) * 0.2 * weights.piano_stretch_mult
            : 1.0;

        let internalStretchPenalty = 0;
        if (hNotes.length > 1) {
          for (let i = 0; i < hNotes.length - 1; i++) {
            const gap = hNotes[i + 1].midi - hNotes[i].midi;
            if (gap > 6) {
              internalStretchPenalty +=
                (gap - 6) * 0.8 * weights.piano_internal_stretch * slowDecay;
            }
            if (gap > 10) {
              internalStretchPenalty +=
                (gap - 10) * 2.5 * weights.piano_internal_stretch * slowDecay;
            }
          }
        }

        let jumpStrain = 0;
        if (hand.lastTime > 0 && rawDt > 0) {
          const dist = Math.abs(curCenter - hand.lastCenter);
          if (dist > 1.5) {
            jumpStrain =
              Math.pow(dist, 1.3) *
              Math.pow(150 / effDt, 1.1) *
              0.18 *
              weights.piano_hand_jump;
          }
        }

        let doubleStopStrain = 0;
        if (hNotes.length >= 2 && hand.lastNotes.length >= 2 && hand.lastTime > 0 && rawDt > 0) {
          const sizeFactor = (hNotes.length + hand.lastNotes.length) / 2;
          if (effDt <= 450) {
            doubleStopStrain =
              Math.pow(450 / effDt, 1.4) * sizeFactor * 2.5 * weights.piano_double_stop;
          } else {
            doubleStopStrain =
              Math.pow(450 / effDt, 2.0) * sizeFactor * 2.5 * weights.piano_double_stop;
          }
        }

        // 1. Extreme Arpeggio Lateral Sweep (Waterfall Op. 10 No. 1)
        // Multi-octave arpeggio sweep in RH at high speed (effDt <= 95ms) spanning >= 16 semitones
        let arpeggioSweepStrain = 0;
        if (hNotes.length === 1 && hand === rightHand && effDt <= 95) {
          const recentSub = hand.recentPitches
            .filter(p => t - p.timeMs <= 450)
            .map(p => p.midi);
          if (recentSub.length >= 4) {
            const subSpan = Math.max(...recentSub) - Math.min(...recentSub);
            const netDisp = Math.abs(recentSub[recentSub.length - 1] - recentSub[0]);
            if (subSpan >= 16 && netDisp >= 12) {
              const clampedSpan = Math.min(19.0, subSpan);
              const rawArp =
                Math.pow(clampedSpan - 14, 1.25) *
                Math.pow(90 / effDt, 1.35) *
                weights.piano_arpeggio_sweep;
              arpeggioSweepStrain = Math.min(11.0, rawArp);
            }
          }
        }

        // 2. Detached Leaping Octaves (Butterfly Etude Op. 25 No. 9)
        // Right-hand rapid staccato octaves (span >= 12, avgDur <= 75ms, effDt <= 180ms)
        let butterflyOctaveStrain = 0;
        const avgDur = hNotes.reduce((sum, n) => sum + n.durationMs, 0) / hNotes.length;
        const leapDist = Math.abs(curCenter - hand.lastCenter);
        if (hand === rightHand && span >= 12 && avgDur <= 75 && effDt <= 180) {
          butterflyOctaveStrain =
            Math.pow(150 / effDt, 1.3) *
            (1.0 + (span - 12) * 0.1) *
            (1.0 + leapDist * 0.08) *
            weights.piano_octave_staccato;
        }

        // Count unique held pitches excluding currently struck keys, capped at 3 fingers
        // to avoid sustain-pedal / arpeggio-hold inflation
        const currentMidis = new Set(hNotes.map(n => n.midi));
        const uniqueHeldSet = new Set<number>();
        for (const a of activeList) {
          if (!currentMidis.has(a.midi)) uniqueHeldSet.add(a.midi);
        }
        const effectiveHeld = Math.min(3, uniqueHeldSet.size);
        const heldBoxFactor = inStaticArpeggioBox ? 0.35 : 1.0;
        const fingerIndependenceStrain =
          effectiveHeld *
          0.8 *
          weights.piano_finger_independence *
          slowDecay *
          heldBoxFactor;

        for (const note of hNotes) {
          let jackStrain = 0;
          const lastNoteT = hand.noteTimes.get(note.midi);
          // True jackhammer only when the same pitch is struck consecutively OR repeated within <=250ms
          const isConsecutiveSame = hand.lastNotes.includes(note.midi);
          if (lastNoteT !== undefined) {
            const dtN = t - lastNoteT;
            if (dtN > 0 && dtN <= 800 && (isConsecutiveSame || dtN <= 250)) {
              const smoothDtN = Math.max(8, 0.5 * dtN + 0.5 * effDt);
              jackStrain =
                Math.pow(150 / smoothDtN, 1.5) * 1.5 * weights.piano_jackhammer;
            }
          }

          let flowStrain = 0;
          let leapStrain = 0;
          let blackKeyStrain = 0;

          if (hand.lastNotes.length > 0 && hand.lastTime > 0 && rawDt > 0) {
            const closestDist = Math.min(
              ...hand.lastNotes.map(prevMidi => Math.abs(note.midi - prevMidi))
            );
            if (closestDist > 0) {
              const effClosestDist = inStaticArpeggioBox
                ? Math.min(closestDist, 4)
                : closestDist;
              flowStrain =
                (1.0 + effClosestDist * 0.15) *
                Math.pow(120 / effDt, 1.2) *
                0.4 *
                weights.piano_finger_flow;
              flowStrains.push(flowStrain);
            }

            const lastMidi = hand.lastNotes[hand.lastNotes.length - 1];
            const successiveInterval = Math.abs(note.midi - lastMidi);
            if (successiveInterval > 5 && !inStaticArpeggioBox) {
              leapStrain =
                Math.pow(successiveInterval - 5, 1.15) *
                Math.pow(150 / effDt, 1.1) *
                0.15 *
                weights.piano_leap_strain;
            }

            if (isBlackKey(note.midi) !== isBlackKey(lastMidi)) {
              blackKeyStrain =
                Math.pow(120 / effDt, 1.1) * 0.45 * weights.piano_black_key_awkward;
            }
          }

          const chordBuffEff = effDt >= 350 ? weights.piano_chord_buff : 0;
          const chordSizeBonus = (hNotes.length - 1) * (0.9 * slowDecay + chordBuffEff);
          const fatigueMult = 1.0 + pianoFatigue * 0.005 * weights.piano_stamina_fatigue;

          let totalStrain =
            (jackStrain +
              flowStrain +
              leapStrain +
              jumpStrain +
              chordSizeBonus +
              doubleStopStrain +
              internalStretchPenalty +
              fingerIndependenceStrain +
              handCollisionStrain * slowDecay +
              blackKeyStrain +
              arpeggioSweepStrain +
              butterflyOctaveStrain +
              overloadPenalty) *
            stretchMultiplier *
            fatigueMult;

          if (isParallelUnison) {
            totalStrain *= weights.piano_unison_discount;
          }

          noteStrains.set(note.id, totalStrain);
          hand.noteTimes.set(note.midi, t);
          pianoFatigue += Math.min(10, totalStrain * 0.05);
        }

        hand.lastTime = t;
        hand.lastCenter = curCenter;
        hand.lastNotes = hNotes.map(n => n.midi);

        hNotes.forEach(n => {
          activeList.push({ midi: n.midi, endTime: t + n.durationMs });
        });
      };

      processPianoHand(leftHand, lhNotes, currentCenterL, lhActive);
      processPianoHand(rightHand, rhNotes, currentCenterR, rhActive);

      lhActiveNotes.length = 0;
      lhActiveNotes.push(...lhActive);
      rhActiveNotes.length = 0;
      rhActiveNotes.push(...rhActive);

      pianoLastTime = t;

      for (const note of event.notes) {
        colHistory.push(note.column);
        if (colHistory.length > 4) colHistory.shift();
        if (colHistory.length === 4) {
          const [c0, c1, c2, c3] = colHistory;
          if (c0 === c2 && c1 === c3 && c0 !== c1) trillCount++;
          if ((c0 < c1 && c1 < c2 && c2 < c3) || (c0 > c1 && c1 > c2 && c2 > c3))
            staircaseCount++;
        }
      }
    } else {
      // ------------------------------------------------------------
      // DRUM PHYSICAL SIMULATION
      // ------------------------------------------------------------
      const footNotes = event.notes.filter(n => n.column === 0);
      const stickNotes = event.notes.filter(n => n.column > 0);

      const footOverloaded = footNotes.length > 1;
      const sticksOverloaded = stickNotes.length > 2;
      const overloadPenalty = (sticksOverloaded ? 30.0 : 0) + (footOverloaded ? 12.0 : 0);

      if (drumLastTime > 0 && t > drumLastTime) {
        const gap = t - drumLastTime;
        const silenceThreshold = 1200;
        if (gap > silenceThreshold) {
          drumFatigue = Math.max(0, drumFatigue * Math.exp(-(gap - silenceThreshold) / 1000));
        }
      }

      const lastStickTime = Math.max(drumState.lhTime, drumState.rhTime);
      const dtStick = t - lastStickTime;
      if (stickNotes.length > 0 && lastStickTime > 0 && dtStick > 0) {
        const clampedDt = Math.max(8, Math.min(1500, dtStick));
        drumState.stickEmaDt =
          clampedDt < drumState.stickEmaDt
            ? 0.35 * clampedDt + 0.65 * drumState.stickEmaDt
            : 0.6 * clampedDt + 0.4 * drumState.stickEmaDt;
      }
      const effStickDt = Math.max(8, drumState.stickEmaDt);
      const slowDecay = effStickDt > 300 ? Math.pow(300 / effStickDt, 0.75) : 1.0;

      let polyrhythmStrain = 0;
      if (footNotes.length > 0 && stickNotes.length > 0) {
        polyrhythmStrain = 1.5 * weights.drum_polyrhythm * slowDecay;
      }

      let rollFatigue = 0;
      if (stickNotes.length > 0 && lastStickTime > 0 && effStickDt > 0 && effStickDt < 120) {
        rollFatigue =
          Math.pow(120 / effStickDt, 1.35) *
          ((120 - effStickDt) / 120) *
          0.8 *
          weights.drum_roll_fatigue;
      }

      const fatigueMult = 1.0 + drumFatigue * 0.005 * weights.drum_stamina_fatigue;

      for (const fn of footNotes) {
        const dtF = t - drumState.footTime;
        if (drumState.footTime > 0 && dtF > 0) {
          const clampedDt = Math.max(8, Math.min(1500, dtF));
          drumState.footEmaDt =
            clampedDt < drumState.footEmaDt
              ? 0.35 * clampedDt + 0.65 * drumState.footEmaDt
              : 0.6 * clampedDt + 0.4 * drumState.footEmaDt;
        }
        const effDtF = Math.max(8, drumState.footEmaDt);
        const footStrain =
          effDtF <= 1200
            ? Math.pow(150 / effDtF, 1.35) * 1.6 * weights.drum_foot_kick
            : 0.5 * (1200 / effDtF);

        const totalStrain = (footStrain + polyrhythmStrain + overloadPenalty) * fatigueMult;
        noteStrains.set(fn.id, totalStrain);
        drumState.footTime = t;
        drumState.noteTimes.set(fn.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      let lhHits: NoteWithCol[] = [];
      let rhHits: NoteWithCol[] = [];

      if (stickNotes.length === 1) {
        const note = stickNotes[0];
        const lhIdle = t - drumState.lhTime;
        const rhIdle = t - drumState.rhTime;
        if (Math.abs(lhIdle - rhIdle) > 150) {
          if (lhIdle > rhIdle) lhHits = [note];
          else rhHits = [note];
        } else {
          if (note.column <= 2) lhHits = [note];
          else rhHits = [note];
        }
      } else if (stickNotes.length === 2) {
        const sortedSticks = [...stickNotes].sort((a, b) => a.column - b.column);
        lhHits = [sortedSticks[0]];
        rhHits = [sortedSticks[1]];
      } else if (stickNotes.length > 2) {
        lhHits = stickNotes.slice(0, Math.floor(stickNotes.length / 2));
        rhHits = stickNotes.slice(Math.floor(stickNotes.length / 2));
      }

      let crossedArmStrain = 0;
      if (lhHits.length > 0 && rhHits.length > 0) {
        if (lhHits[0].column > rhHits[0].column) {
          crossedArmStrain = 4.0 * weights.drum_crossed_arms * slowDecay;
        }
      }

      for (const note of lhHits) {
        const dtL = t - drumState.lhTime;
        if (drumState.lhTime > 0 && dtL > 0) {
          const clampedDt = Math.max(8, Math.min(1500, dtL));
          drumState.lhEmaDt =
            clampedDt < drumState.lhEmaDt
              ? 0.35 * clampedDt + 0.65 * drumState.lhEmaDt
              : 0.6 * clampedDt + 0.4 * drumState.lhEmaDt;
        }
        const effDtL = Math.max(8, drumState.lhEmaDt);
        let jackStrain = 0;
        let moveStrain = 0;

        if (drumState.lhTime > 0 && dtL > 0) {
          if (note.column === drumState.lhCol) {
            jackStrain = Math.pow(140 / effDtL, 1.35) * 1.3 * weights.drum_stick_jackhammer;
          } else {
            const dist = Math.abs(note.column - drumState.lhCol);
            moveStrain =
              Math.pow(dist, 1.1) *
              Math.pow(120 / effDtL, 1.1) *
              0.45 *
              weights.drum_stick_move;
            flowStrains.push(moveStrain);
          }
        }

        const totalStrain =
          (jackStrain +
            moveStrain +
            rollFatigue +
            polyrhythmStrain +
            crossedArmStrain +
            0.6 * slowDecay +
            overloadPenalty) *
          fatigueMult;
        noteStrains.set(note.id, totalStrain);
        drumState.lhTime = t;
        drumState.lhCol = note.column;
        drumState.noteTimes.set(note.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      for (const note of rhHits) {
        const dtR = t - drumState.rhTime;
        if (drumState.rhTime > 0 && dtR > 0) {
          const clampedDt = Math.max(8, Math.min(1500, dtR));
          drumState.rhEmaDt =
            clampedDt < drumState.rhEmaDt
              ? 0.35 * clampedDt + 0.65 * drumState.rhEmaDt
              : 0.6 * clampedDt + 0.4 * drumState.rhEmaDt;
        }
        const effDtR = Math.max(8, drumState.rhEmaDt);
        let jackStrain = 0;
        let moveStrain = 0;

        if (drumState.rhTime > 0 && dtR > 0) {
          if (note.column === drumState.rhCol) {
            jackStrain = Math.pow(140 / effDtR, 1.35) * 1.3 * weights.drum_stick_jackhammer;
          } else {
            const dist = Math.abs(note.column - drumState.rhCol);
            moveStrain =
              Math.pow(dist, 1.1) *
              Math.pow(120 / effDtR, 1.1) *
              0.45 *
              weights.drum_stick_move;
            flowStrains.push(moveStrain);
          }
        }

        const totalStrain =
          (jackStrain +
            moveStrain +
            rollFatigue +
            polyrhythmStrain +
            crossedArmStrain +
            0.6 * slowDecay +
            overloadPenalty) *
          fatigueMult;
        noteStrains.set(note.id, totalStrain);
        drumState.rhTime = t;
        drumState.rhCol = note.column;
        drumState.noteTimes.set(note.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      drumLastTime = t;

      for (const note of event.notes) {
        colHistory.push(note.column);
        if (colHistory.length > 4) colHistory.shift();
        if (colHistory.length === 4) {
          const [c0, c1, c2, c3] = colHistory;
          if (c0 === c2 && c1 === c3 && c0 !== c1) trillCount++;
          if ((c0 < c1 && c1 < c2 && c2 < c3) || (c0 > c1 && c1 > c2 && c2 > c3))
            staircaseCount++;
        }
      }
    }
  }

  // 4. Segment Strain Evaluation (400ms sections with logarithmic event-density scaling)
  const segmentDuration = 400;
  const segmentStrains: number[] = [];
  const localDensities: number[] = [];

  if (songEnd - songStart <= segmentDuration) {
    let maxS = 0;
    for (const n of sorted) {
      const sVal = noteStrains.get(n.id) || 0;
      if (sVal > maxS) maxS = sVal;
    }
    const densityMult = 1 + 0.18 * Math.log2(Math.max(1, chordEvents.length / 2));
    segmentStrains.push(maxS * densityMult);
    localDensities.push(sorted.length / Math.max(0.05, (songEnd - songStart) / 1000));
  } else {
    let noteIdx = 0;
    let evIdx = 0;
    for (let tSeg = songStart; tSeg < songEnd; tSeg += segmentDuration) {
      const segEnd = tSeg + segmentDuration;
      let maxS = 0;
      let countInSeg = 0;

      while (noteIdx < sorted.length && sorted[noteIdx].timeMs < segEnd) {
        if (sorted[noteIdx].timeMs >= tSeg) {
          countInSeg++;
          const sVal = noteStrains.get(sorted[noteIdx].id) || 0;
          if (sVal > maxS) maxS = sVal;
        }
        noteIdx++;
      }

      let evCountInSeg = 0;
      while (evIdx < chordEvents.length && chordEvents[evIdx].timeMs < segEnd) {
        if (chordEvents[evIdx].timeMs >= tSeg) evCountInSeg++;
        evIdx++;
      }

      if (countInSeg > 0) {
        const densityMult = 1 + 0.18 * Math.log2(Math.max(1, evCountInSeg / 2));
        segmentStrains.push(maxS * densityMult);
        localDensities.push(countInSeg / (segmentDuration / 1000));
      } else {
        segmentStrains.push(0);
        localDensities.push(0);
      }
    }
  }

  // 5. Pattern Repetition & Exponential Decay Weighting Over All Segments
  let patternRepPenalty = 0;
  if (sorted.length >= 8) {
    const window = 4;
    const patterns = new Map<string, number>();
    for (let i = 0; i <= sorted.length - window; i++) {
      const pattern = sorted
        .slice(i, i + window)
        .map(n => n.column)
        .join(',');
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
    const repeats = [...patterns.values()].reduce((sum, c) => sum + (c > 1 ? c - 1 : 0), 0);
    patternRepPenalty = repeats / (sorted.length - window);
  }

  const sortedStrains = [...segmentStrains].sort((a, b) => b - a);
  let decayedSum = 0;
  let weightSum = 0;
  for (let r = 0; r < sortedStrains.length; r++) {
    const w = Math.pow(0.94, r);
    decayedSum += sortedStrains[r] * w;
    weightSum += w;
  }

  // Compensate only when high speed compresses many chord events into fewer 400ms segments
  const expectedSegments = Math.max(sortedStrains.length, Math.floor(chordEvents.length / 2.5));
  if (expectedSegments > sortedStrains.length && weightSum > 0) {
    const targetWeightSum = (1 - Math.pow(0.94, expectedSegments)) / (1 - 0.94);
    decayedSum = decayedSum * (targetWeightSum / weightSum);
  }

  const calibrationFactor =
    mode === 'drum' ? weights.drum_global_factor : weights.piano_global_factor;
  let performanceScore = Math.max(1, Math.round(calibrationFactor * Math.pow(decayedSum, 1.22)));

  const totalNotes = sorted.length;
  if (totalNotes < 30) {
    performanceScore = Math.max(1, Math.round(performanceScore * (totalNotes / 30)));
  }

  // 6. Calculate level & stars from the final score
  const { difficultyLevel, starLevel } = calculateDifficultyLevels(performanceScore);

  // 7. Calculate standard metrics parameters
  const peakDensity = Math.max(...localDensities, 0.1);
  const avgDensity = avg(localDensities);
  const density = norm(peakDensity * 0.6 + avgDensity * 0.4, 0.1, 40);

  const topStrains = sortedStrains.slice(0, Math.max(1, Math.floor(sortedStrains.length * 0.2)));
  const physicalEffort = norm(avg(topStrains), 0, 15);

  const pitches = sorted.map(n => n.midi);
  const highestNote = pitches.length ? Math.max(...pitches) : 0;
  const lowestNote = pitches.length ? Math.min(...pitches) : 0;
  const rangeIntensity =
    mode === 'piano'
      ? highestNote && lowestNote
        ? (highestNote - lowestNote) / 88
        : 0
      : new Set(sorted.map(n => n.column)).size / 5;

  const chordMobility = norm(avg(flowStrains), 0, 5);
  const avgSpeed = totalNotes / (durationSec || 1);
  const arpeggioVirtuosity = norm((staircaseCount / totalNotes) * (avgSpeed / 10), 0, 0.4);
  const trillRatio = trillCount / totalNotes;
  const arpeggioRepetition = 1 - patternRepPenalty;
  const polyphony = avg(chordSizes);

  const analysis: AnalysisResult = {
    difficultyLevel,
    performanceScore,
    parameters: {
      density: +density.toFixed(2),
      physicalEffort: +physicalEffort.toFixed(2),
      rangeIntensity: +rangeIntensity.toFixed(2),
      chordMobility: +chordMobility.toFixed(2),
      arpeggioRepetition: +arpeggioRepetition.toFixed(2),
      arpeggioVirtuosity: +arpeggioVirtuosity.toFixed(2),
      totalNps: +avgSpeed.toFixed(2),
      polyphony: +polyphony.toFixed(2),
      chordNps: +(density * polyphony).toFixed(2),
      patternRepPenalty: +patternRepPenalty.toFixed(2),
      trillRatio: +trillRatio.toFixed(2),
      starLevel,
    },
  };

  // 8. Metadata calculations
  const gaps = sorted.slice(1).map((n, i) => n.timeMs - sorted[i].timeMs);
  const gapAvg = avg(gaps);
  const gapVar = gaps.length ? Math.sqrt(avg(gaps.map(g => (g - gapAvg) ** 2))) : 0;

  const burstThreshold = avgDensity * 1.8 + 2;
  let burstSections = 0;
  let inBurst = false;
  for (const ld of localDensities) {
    if (ld > burstThreshold && !inBurst) {
      burstSections++;
      inBurst = true;
    } else if (ld <= burstThreshold) {
      inBurst = false;
    }
  }

  const meta = {
    durationSec: +durationSec.toFixed(2),
    totalNotes,
    highestNote,
    lowestNote,
    avgGapMs: +gapAvg.toFixed(2),
    gapVariance: +gapVar.toFixed(2),
    irregularityIndex: +patternRepPenalty.toFixed(2),
    burstSections,
    peakSpeedNps: +peakDensity.toFixed(2),
    avgVirtuosityIndex: +arpeggioVirtuosity.toFixed(2),
    tempoDeviation: undefined,
    arpeggioRate: undefined,
  };

  return {
    ...analysis,
    meta,
  };
}