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
  piano_stretch_mult: 0.36812500000000004,
  piano_internal_stretch: 0.15283956640624993,
  piano_leap_strain: 0.4560993197265625,
  piano_double_stop: 0.1122555697265625,
  piano_jackhammer: 0.7839126060546876,
  piano_finger_flow: 1.0514011568359374,
  piano_hand_jump: 0.47048220488281245,
  piano_black_key_awkward: 1.557178671875,
  piano_finger_independence: 0.33163770195312503,
  piano_hand_collision: 0.4709746294921875,
  piano_stamina_fatigue: 0.1,

  drum_foot_kick: 0.9242812499999999,
  drum_stick_jackhammer: 1.1314078125,
  drum_stick_move: 0.4968916757812501,
  drum_crossed_arms: 1,
  drum_polyrhythm: 0.11885472265625001,
  drum_roll_fatigue: 1.1734003705078124,
  drum_stamina_fatigue: 0.5875,

  piano_global_factor: 0.6898643371093751,
  drum_global_factor: 1.6742171875,
};

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  densityWindowMs: 1000,
  densityStepMs: 250,
  densityMinNorm: 0.1,
  densityMaxNorm: 80,
  awkwardIntervalMin: 3.1,
  awkwardIntervalMax: 4.2,
  awkwardGapMin: 0.017,
  awkwardGapMax: 0.092,
  awkwardWeightMax: 0.36,
  zigzagGapMin: 0.054,
  zigzagGapMax: 0.032,
  zigzagWeightMax: 0.95,
  repetitionWindow: 250,
  repetitionWeightMin: 0,
  repetitionWeightMax: 0.75,
  abstractnessWeightMax: 33,
  timingVarianceMax: 1000,
  complexityAwkwardWeight: 0.42,
  complexityZigzagWeight: 0.25,
  complexityAbstractWeight: 0.062,
  complexityTimingWeight: 0.34,
  complexityFinalMin: 0.064,
  complexityFinalMax: 0.35,
  tightIntervalMax: 6.1,
  tightIntervalDtMax: 202,
  tightIntervalMinNorm: 0.078,
  tightIntervalMaxNorm: 0.68,
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
  trillMaxInterval: 3.1,
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
  expFactor: 2.62,
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

function calculateDifficultyLevels(performanceScore: number): { difficultyLevel: number, starLevel: number } {
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
  else 
    difficultyLevel = 10 + norm(performanceScore, 1400, 10000) * 10; // Range 10-20 (Legendary)

  const starLevel = Math.max(1, difficultyLevel);
  return {
    difficultyLevel: +difficultyLevel.toFixed(2),
    starLevel: +starLevel.toFixed(1)
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
}

interface DrumState {
  lhTime: number;
  lhCol: number;
  rhTime: number;
  rhCol: number;
  footTime: number;
  noteTimes: Map<number, number>; // col -> timeMs
}

// ============================================================
// PURE PHYSIOLOGICAL PHYSICAL-LIMITS DIFFICULTY ENGINE
// ============================================================
export function analyzeMidi(
  notes: MidiNotePlaybackItem[],
  totalDurationMs: number,
  config: AnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
  originalDurationMsForChunking?: number,
  instrumentMode?: 'piano' | 'drum',
  customWeights?: FineTunedWeights
): ExtendedResult | null {
  if (!notes.length || totalDurationMs <= 500) return null;

  let weights = customWeights;
  if (!weights && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tuned_physical_weights');
      if (stored) {
        weights = { ...DEFAULT_FINE_TUNED_WEIGHTS, ...JSON.parse(stored) };
      }
    } catch (e) {
      // Ignore reading error
    }
  }
  if (!weights) {
    weights = DEFAULT_FINE_TUNED_WEIGHTS;
  }

  const mode = instrumentMode || 'piano';
  const durationSec = totalDurationMs / 1000;

  // Pre-process drum notes to keep primary drum mapping
  let processedNotes = notes;
  if (mode === 'drum') {
    processedNotes = notes
      .filter(n => DRUM_PRIMARY_MIDI_MAP[n.midi] !== undefined)
      .map(n => ({
        ...n,
        midi: DRUM_PRIMARY_MIDI_MAP[n.midi]
      }));
  }

  if (processedNotes.length === 0) return null;

  // 1. Sort notes and map them
  const sorted = [...processedNotes]
    .sort((a, b) => a.timeMs - b.timeMs)
    .map(n => ({
      id: n.noteId,
      midi: n.midi,
      timeMs: n.timeMs,
      durationMs: n.durationMs,
      column: getColumn(n.midi, mode)
    }));

  // 2. Group into discrete Chord Events (within a 30ms window)
  const chordEvents: ChordEvent[] = [];
  for (const note of sorted) {
    if (chordEvents.length === 0) {
      chordEvents.push({ timeMs: note.timeMs, notes: [note] });
    } else {
      const lastEvent = chordEvents[chordEvents.length - 1];
      if (note.timeMs - lastEvent.timeMs <= 30) {
        lastEvent.notes.push(note);
      } else {
        chordEvents.push({ timeMs: note.timeMs, notes: [note] });
      }
    }
  }

  // 3. Physical State & Biomechanical Strain Simulation
  const leftHand: HandState = { lastTime: -9999, lastCenter: 48, lastNotes: [], noteTimes: new Map() }; // LH center C3
  const rightHand: HandState = { lastTime: -9999, lastCenter: 72, lastNotes: [], noteTimes: new Map() }; // RH center C5
  const drumState: DrumState = { lhTime: -9999, lhCol: 1, rhTime: -9999, rhCol: 4, footTime: -9999, noteTimes: new Map() };

  const noteStrains = new Map<string, number>();
  const flowStrains: number[] = [];
  const chordSizes: number[] = [];
  let trillCount = 0;
  let staircaseCount = 0;
  const colHistory: number[] = [];

  // --- EXTENDED PHYSIOLOGICAL SIMULATION STATES ---
  const lhActiveNotes: { midi: number; endTime: number }[] = [];
  const rhActiveNotes: { midi: number; endTime: number }[] = [];
  let pianoFatigue = 0;
  let pianoLastTime = -9999;
  let drumFatigue = 0;
  let drumLastTime = -9999;

  for (const event of chordEvents) {
    const t = event.timeMs;
    const N = event.notes.length;
    chordSizes.push(N);

    if (mode === 'piano') {
      // ------------------------------------------------------------
      // PIANO PHYSICAL SIMULATION
      // - 2 hands, 5 fingers each (max 10 total keys, max 5 per hand)
      // - Stretch comfort limit: 12 semitones, absolute limit: 15 semitones
      // ------------------------------------------------------------
      const overloadPenalty = N > 10 ? 25.0 : 0;

      // Sort notes by pitch to split between Left Hand (lower) and Right Hand (higher)
      const pitches = [...event.notes].sort((a, b) => a.midi - b.midi);
      let lhNotes: typeof event.notes = [];
      let rhNotes: typeof event.notes = [];

      if (N === 1) {
        const note = pitches[0];
        // Dynamic hand selection based on center proximity
        const distL = Math.abs(note.midi - leftHand.lastCenter) - 2.5; // LH bias lower
        const distR = Math.abs(note.midi - rightHand.lastCenter) + 2.5; // RH bias higher
        if (distL < distR) {
          lhNotes = [note];
        } else {
          rhNotes = [note];
        }
      } else {
        // Optimize division boundary to minimize total strain
        let bestSplitIdx = 0;
        let minStrain = Infinity;

        for (let i = 0; i <= N; i++) {
          const lCand = pitches.slice(0, i);
          const rCand = pitches.slice(i);
          let candidateStrain = 0;

          // Limit to physical 5-finger capacity
          if (lCand.length > 5) candidateStrain += 40;
          if (rCand.length > 5) candidateStrain += 40;

          // Stretch spans
          if (lCand.length > 1) {
            const lSpan = lCand[lCand.length - 1].midi - lCand[0].midi;
            if (lSpan > 12) candidateStrain += (lSpan - 12) * 5;
            if (lSpan > 15) candidateStrain += 100; // impossible stretch
          }
          if (rCand.length > 1) {
            const rSpan = rCand[rCand.length - 1].midi - rCand[0].midi;
            if (rSpan > 12) candidateStrain += (rSpan - 12) * 5;
            if (rSpan > 15) candidateStrain += 100; // impossible stretch
          }

          // Hands cross-over
          if (lCand.length > 0 && rCand.length > 0) {
            if (lCand[lCand.length - 1].midi >= rCand[0].midi) {
              candidateStrain += 70;
            }
          }

          // Center jumps
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

      // Left Hand Strain Accumulation
      const isBlackKey = (m: number): boolean => [1, 3, 6, 8, 10].includes(m % 12);

      // Decelerate/recover piano fatigue during silence
      if (pianoLastTime > 0 && t > pianoLastTime) {
        const gap = t - pianoLastTime;
        if (gap > 1500) {
          pianoFatigue = Math.max(0, pianoFatigue * Math.exp(-(gap - 1500) / 1000));
        }
      }

      // Filter active holding notes for finger independence
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

      // Hand collision check
      if (lhNotes.length > 0 && rhNotes.length > 0) {
        const centerDistance = Math.abs(currentCenterR - currentCenterL);
        if (centerDistance < 6) {
          handCollisionStrain = (6 - centerDistance) * 1.5 * weights.piano_hand_collision;
        }
      }

      if (lhNotes.length > 0) {
        const dtL = t - leftHand.lastTime;
        const lhSpan = lhNotes.length > 1 ? (lhNotes[lhNotes.length - 1].midi - lhNotes[0].midi) : 0;
        
        // --- STRETCH MULTIPLIER ---
        const stretchMultiplier = lhSpan > 12 ? 1.0 + Math.pow(lhSpan - 12, 1.15) * 0.20 * weights.piano_stretch_mult : 1.0;

        // --- INTERNAL STRETCH GAPS ---
        let internalStretchPenalty = 0;
        if (lhNotes.length > 1) {
          for (let i = 0; i < lhNotes.length - 1; i++) {
            const gap = lhNotes[i + 1].midi - lhNotes[i].midi;
            if (gap > 6) {
              internalStretchPenalty += (gap - 6) * 0.8 * weights.piano_internal_stretch;
            }
            if (gap > 10) {
              internalStretchPenalty += (gap - 10) * 2.5 * weights.piano_internal_stretch;
            }
          }
        }

        let jumpStrain = 0;
        if (leftHand.lastTime > 0 && dtL > 0) {
          const dist = Math.abs(currentCenterL - leftHand.lastCenter);
          if (dist > 1.5) {
            jumpStrain = Math.pow(dist, 1.3) * Math.pow(150 / Math.max(40, dtL), 1.1) * 0.18 * weights.piano_hand_jump;
          }
        }

        // --- CONSECUTIVE DOUBLE STOPS / DOUBLE NOTES ---
        let doubleStopStrain = 0;
        if (lhNotes.length >= 2 && leftHand.lastNotes.length >= 2 && dtL > 0 && dtL <= 450) {
          const sizeFactor = (lhNotes.length + leftHand.lastNotes.length) / 2;
          doubleStopStrain = Math.pow(450 / Math.max(40, dtL), 1.4) * sizeFactor * 2.5 * weights.piano_double_stop;
        }

        // Finger independence tension
        const fingerIndependenceStrain = lhActive.length * 0.8 * weights.piano_finger_independence;

        for (const note of lhNotes) {
          // Same finger rapid key tap rate (Jackhammer)
          let jackStrain = 0;
          const lastNoteT = leftHand.noteTimes.get(note.midi);
          if (lastNoteT !== undefined) {
            const dtN = t - lastNoteT;
            if (dtN > 0 && dtN <= 800) {
              jackStrain = Math.pow(150 / Math.max(40, dtN), 1.5) * 1.5 * weights.piano_jackhammer;
            }
          }

          // Finger movement transition / stream flow
          let flowStrain = 0;
          let leapStrain = 0;
          let blackKeyStrain = 0;

          if (leftHand.lastNotes.length > 0 && dtL > 0) {
            const closestDist = Math.min(...leftHand.lastNotes.map(prevMidi => Math.abs(note.midi - prevMidi)));
            if (closestDist > 0) {
              flowStrain = (1.0 + closestDist * 0.15) * Math.pow(120 / Math.max(40, dtL), 1.2) * 0.4 * weights.piano_finger_flow;
              flowStrains.push(flowStrain);
            }

            // --- ARPEGGIO / SEQUENTIAL LEAP STRAIN ---
            const lastMidi = leftHand.lastNotes[leftHand.lastNotes.length - 1];
            const successiveInterval = Math.abs(note.midi - lastMidi);
            if (successiveInterval > 5) {
              leapStrain = Math.pow(successiveInterval - 5, 1.15) * Math.pow(150 / Math.max(40, dtL), 1.1) * 0.15 * weights.piano_leap_strain;
            }

            // Black key awkward transition
            if (isBlackKey(note.midi) !== isBlackKey(lastMidi)) {
              blackKeyStrain = Math.pow(120 / Math.max(40, dtL), 1.1) * 0.45 * weights.piano_black_key_awkward;
            }
          }

          const chordSizeBonus = (lhNotes.length - 1) * 0.9;
          
          // Apply fatigue multiplier
          const fatigueMult = 1.0 + pianoFatigue * 0.005 * weights.piano_stamina_fatigue;

          const totalStrain = (jackStrain + flowStrain + leapStrain + jumpStrain + chordSizeBonus + doubleStopStrain + internalStretchPenalty + fingerIndependenceStrain + handCollisionStrain + blackKeyStrain + overloadPenalty) * stretchMultiplier * fatigueMult;
          noteStrains.set(note.id, totalStrain);
          leftHand.noteTimes.set(note.midi, t);

          // Accumulate fatigue
          pianoFatigue += Math.min(10, totalStrain * 0.05);
        }

        leftHand.lastTime = t;
        leftHand.lastCenter = currentCenterL;
        leftHand.lastNotes = lhNotes.map(n => n.midi);

        // Register active holding notes
        lhNotes.forEach(n => {
          lhActiveNotes.push({ midi: n.midi, endTime: t + n.durationMs });
        });
      }

      // Right Hand Strain Accumulation
      if (rhNotes.length > 0) {
        const dtR = t - rightHand.lastTime;
        const rhSpan = rhNotes.length > 1 ? (rhNotes[rhNotes.length - 1].midi - rhNotes[0].midi) : 0;
        
        // --- STRETCH MULTIPLIER ---
        const stretchMultiplier = rhSpan > 12 ? 1.0 + Math.pow(rhSpan - 12, 1.15) * 0.20 * weights.piano_stretch_mult : 1.0;

        // --- INTERNAL STRETCH GAPS ---
        let internalStretchPenalty = 0;
        if (rhNotes.length > 1) {
          for (let i = 0; i < rhNotes.length - 1; i++) {
            const gap = rhNotes[i + 1].midi - rhNotes[i].midi;
            if (gap > 6) {
              internalStretchPenalty += (gap - 6) * 0.8 * weights.piano_internal_stretch;
            }
            if (gap > 10) {
              internalStretchPenalty += (gap - 10) * 2.5 * weights.piano_internal_stretch;
            }
          }
        }

        let jumpStrain = 0;
        if (rightHand.lastTime > 0 && dtR > 0) {
          const dist = Math.abs(currentCenterR - rightHand.lastCenter);
          if (dist > 1.5) {
            jumpStrain = Math.pow(dist, 1.3) * Math.pow(150 / Math.max(40, dtR), 1.1) * 0.18 * weights.piano_hand_jump;
          }
        }

        // --- CONSECUTIVE DOUBLE STOPS / DOUBLE NOTES ---
        let doubleStopStrain = 0;
        if (rhNotes.length >= 2 && rightHand.lastNotes.length >= 2 && dtR > 0 && dtR <= 450) {
          const sizeFactor = (rhNotes.length + rightHand.lastNotes.length) / 2;
          doubleStopStrain = Math.pow(450 / Math.max(40, dtR), 1.4) * sizeFactor * 2.5 * weights.piano_double_stop;
        }

        // Finger independence tension
        const fingerIndependenceStrain = rhActive.length * 0.8 * weights.piano_finger_independence;

        for (const note of rhNotes) {
          // Same finger rapid key tap rate (Jackhammer)
          let jackStrain = 0;
          const lastNoteT = rightHand.noteTimes.get(note.midi);
          if (lastNoteT !== undefined) {
            const dtN = t - lastNoteT;
            if (dtN > 0 && dtN <= 800) {
              jackStrain = Math.pow(150 / Math.max(40, dtN), 1.5) * 1.5 * weights.piano_jackhammer;
            }
          }

          // Finger movement transition / stream flow
          let flowStrain = 0;
          let leapStrain = 0;
          let blackKeyStrain = 0;

          if (rightHand.lastNotes.length > 0 && dtR > 0) {
            const closestDist = Math.min(...rightHand.lastNotes.map(prevMidi => Math.abs(note.midi - prevMidi)));
            if (closestDist > 0) {
              flowStrain = (1.0 + closestDist * 0.15) * Math.pow(120 / Math.max(40, dtR), 1.2) * 0.4 * weights.piano_finger_flow;
              flowStrains.push(flowStrain);
            }

            // --- ARPEGGIO / SEQUENTIAL LEAP STRAIN ---
            const lastMidi = rightHand.lastNotes[rightHand.lastNotes.length - 1];
            const successiveInterval = Math.abs(note.midi - lastMidi);
            if (successiveInterval > 5) {
              leapStrain = Math.pow(successiveInterval - 5, 1.15) * Math.pow(150 / Math.max(40, dtR), 1.1) * 0.15 * weights.piano_leap_strain;
            }

            // Black key awkward transition
            if (isBlackKey(note.midi) !== isBlackKey(lastMidi)) {
              blackKeyStrain = Math.pow(120 / Math.max(40, dtR), 1.1) * 0.45 * weights.piano_black_key_awkward;
            }
          }

          const chordSizeBonus = (rhNotes.length - 1) * 0.9;

          // Apply fatigue multiplier
          const fatigueMult = 1.0 + pianoFatigue * 0.005 * weights.piano_stamina_fatigue;

          const totalStrain = (jackStrain + flowStrain + leapStrain + jumpStrain + chordSizeBonus + doubleStopStrain + internalStretchPenalty + fingerIndependenceStrain + handCollisionStrain + blackKeyStrain + overloadPenalty) * stretchMultiplier * fatigueMult;
          noteStrains.set(note.id, totalStrain);
          rightHand.noteTimes.set(note.midi, t);

          // Accumulate fatigue
          pianoFatigue += Math.min(10, totalStrain * 0.05);
        }

        rightHand.lastTime = t;
        rightHand.lastCenter = currentCenterR;
        rightHand.lastNotes = rhNotes.map(n => n.midi);

        // Register active holding notes
        rhNotes.forEach(n => {
          rhActiveNotes.push({ midi: n.midi, endTime: t + n.durationMs });
        });
      }

      pianoLastTime = t;

      // Staircase & Trills
      for (const note of event.notes) {
        colHistory.push(note.column);
        if (colHistory.length > 4) colHistory.shift();
        if (colHistory.length === 4) {
          const [c0, c1, c2, c3] = colHistory;
          if (c0 === c2 && c1 === c3 && c0 !== c1) trillCount++;
          if ((c0 < c1 && c1 < c2 && c2 < c3) || (c0 > c1 && c1 > c2 && c2 > c3)) staircaseCount++;
        }
      }

    } else {
      // ------------------------------------------------------------
      // DRUM PHYSICAL SIMULATION
      // - 2 hands (sticks), 2 feet (pedals)
      // - Column 0 = Foot pedal (Kick). 1-4 = Stick pads Snare/Hihat/Tom/Cymbal.
      // - Max 2 simultaneous stick triggers (since we only have 2 sticks/hands)
      // ------------------------------------------------------------
      const footNotes = event.notes.filter(n => n.column === 0);
      const stickNotes = event.notes.filter(n => n.column > 0);

      const footOverloaded = footNotes.length > 1;
      const sticksOverloaded = stickNotes.length > 2; // Impossible 3+ simultaneous hits with 2 sticks
      const overloadPenalty = (sticksOverloaded ? 30.0 : 0) + (footOverloaded ? 12.0 : 0);

      // Decelerate/recover drum fatigue during silence
      if (drumLastTime > 0 && t > drumLastTime) {
        const gap = t - drumLastTime;
        if (gap > 1200) {
          drumFatigue = Math.max(0, drumFatigue * Math.exp(-(gap - 1200) / 1000));
        }
      }

      // Polyrhythm limb independence strain
      let polyrhythmStrain = 0;
      if (footNotes.length > 0 && stickNotes.length > 0) {
        polyrhythmStrain = 1.5 * weights.drum_polyrhythm;
      }

      // Roll fatigue detector
      let rollFatigue = 0;
      const lastStickTime = Math.max(drumState.lhTime, drumState.rhTime);
      const dtStick = t - lastStickTime;
      if (dtStick > 0 && dtStick < 120) {
        rollFatigue = Math.pow(120 / dtStick, 1.5) * 0.8 * weights.drum_roll_fatigue;
      }

      const fatigueMult = 1.0 + drumFatigue * 0.005 * weights.drum_stamina_fatigue;

      // Foot Pedal Strain (Right Foot Kick)
      for (const fn of footNotes) {
        const dtF = t - drumState.footTime;
        let footStrain = 0.5; // Base kick movement effort
        if (dtF > 0 && dtF <= 1200) {
          footStrain = Math.pow(150 / Math.max(45, dtF), 1.45) * 1.6 * weights.drum_foot_kick;
        }
        
        const totalStrain = (footStrain + polyrhythmStrain + overloadPenalty) * fatigueMult;
        noteStrains.set(fn.id, totalStrain);
        drumState.footTime = t;
        drumState.noteTimes.set(fn.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      // Stick Assignment (L-Stick vs R-Stick)
      let lhHits: typeof event.notes = [];
      let rhHits: typeof event.notes = [];

      if (stickNotes.length === 1) {
        const note = stickNotes[0];
        const lhIdle = t - drumState.lhTime;
        const rhIdle = t - drumState.rhTime;
        // Alternate sticks or bias based on column positions
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

      // Crossed arm coordination penalty
      let crossedArmStrain = 0;
      if (lhHits.length > 0 && rhHits.length > 0) {
        if (lhHits[0].column > rhHits[0].column) {
          crossedArmStrain = 4.0 * weights.drum_crossed_arms;
        }
      }

      // LH Stick Strain
      for (const note of lhHits) {
        const dtL = t - drumState.lhTime;
        let jackStrain = 0;
        let moveStrain = 0;

        if (note.column === drumState.lhCol && dtL > 0) {
          jackStrain = Math.pow(140 / Math.max(45, dtL), 1.4) * 1.3 * weights.drum_stick_jackhammer;
        } else if (dtL > 0) {
          const dist = Math.abs(note.column - drumState.lhCol);
          moveStrain = Math.pow(dist, 1.1) * Math.pow(120 / Math.max(45, dtL), 1.1) * 0.45 * weights.drum_stick_move;
        }

        const totalStrain = (jackStrain + moveStrain + rollFatigue + polyrhythmStrain + crossedArmStrain + 0.6 + overloadPenalty) * fatigueMult;
        noteStrains.set(note.id, totalStrain);
        drumState.lhTime = t;
        drumState.lhCol = note.column;
        drumState.noteTimes.set(note.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      // RH Stick Strain
      for (const note of rhHits) {
        const dtR = t - drumState.rhTime;
        let jackStrain = 0;
        let moveStrain = 0;

        if (note.column === drumState.rhCol && dtR > 0) {
          jackStrain = Math.pow(140 / Math.max(45, dtR), 1.4) * 1.3 * weights.drum_stick_jackhammer;
        } else if (dtR > 0) {
          const dist = Math.abs(note.column - drumState.rhCol);
          moveStrain = Math.pow(dist, 1.1) * Math.pow(120 / Math.max(45, dtR), 1.1) * 0.45 * weights.drum_stick_move;
        }

        const totalStrain = (jackStrain + moveStrain + rollFatigue + polyrhythmStrain + crossedArmStrain + 0.6 + overloadPenalty) * fatigueMult;
        noteStrains.set(note.id, totalStrain);
        drumState.rhTime = t;
        drumState.rhCol = note.column;
        drumState.noteTimes.set(note.column, t);
        drumFatigue += Math.min(8, totalStrain * 0.04);
      }

      drumLastTime = t;

      // Trill & Alternating pattern check
      for (const note of event.notes) {
        colHistory.push(note.column);
        if (colHistory.length > 4) colHistory.shift();
        if (colHistory.length === 4) {
          const [c0, c1, c2, c3] = colHistory;
          if (c0 === c2 && c1 === c3 && c0 !== c1) trillCount++;
          if ((c0 < c1 && c1 < c2 && c2 < c3) || (c0 > c1 && c1 > c2 && c2 > c3)) staircaseCount++;
        }
      }
    }
  }

  // 4. Slidings & Segment Strain Evaluation (400ms intervals)
  const songStart = sorted[0].timeMs;
  const songEnd = sorted[sorted.length - 1].timeMs;
  const segmentDuration = 400;
  const segmentStrains: number[] = [];
  const localDensities: number[] = [];

  for (let tSeg = songStart; tSeg < songEnd; tSeg += segmentDuration) {
    const segmentNotes = sorted.filter(n => n.timeMs >= tSeg && n.timeMs < tSeg + segmentDuration);
    if (segmentNotes.length > 0) {
      let maxS = 0;
      for (const n of segmentNotes) {
        const sVal = noteStrains.get(n.id) || 0;
        if (sVal > maxS) maxS = sVal;
      }
      segmentStrains.push(maxS);
      localDensities.push(segmentNotes.length / (segmentDuration / 1000));
    } else {
      segmentStrains.push(0);
      localDensities.push(0);
    }
  }

  // 5. Exponential decay weighting over all segments (valuing highest peak moments most)
  const sortedStrains = [...segmentStrains].sort((a, b) => b - a);
  let decayedSum = 0;
  for (let r = 0; r < sortedStrains.length; r++) {
    decayedSum += sortedStrains[r] * Math.pow(0.94, r);
  }

  // Calibration factor ensuring non-inflated difficulty scaling (max ~1000 - 1500 for virtuoso)
  const calibrationFactor = mode === 'drum' ? weights.drum_global_factor : weights.piano_global_factor;
  let performanceScore = Math.max(1, Math.round(calibrationFactor * Math.pow(decayedSum, 1.22)));

  // Dynamic Scale-down for short files / tests to avoid high scores on 5-second or few-note clips
  const totalNotes = sorted.length;
  if (totalNotes < 30) {
    performanceScore = Math.round(performanceScore * (totalNotes / 30));
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
  const rangeIntensity = mode === 'piano'
    ? (highestNote && lowestNote ? (highestNote - lowestNote) / 88 : 0)
    : (new Set(sorted.map(n => n.column)).size) / 5;

  const chordMobility = norm(avg(flowStrains), 0, 5);
  const avgSpeed = totalNotes / (durationSec || 1);
  const arpeggioVirtuosity = norm((staircaseCount / totalNotes) * (avgSpeed / 10), 0, 0.4);
  const trillRatio = trillCount / totalNotes;

  // Repetition multiplier
  let patternRepPenalty = 0;
  if (sorted.length >= 8) {
    const window = 4;
    const patterns = new Map<string, number>();
    for (let i = 0; i <= sorted.length - window; i++) {
      const pattern = sorted.slice(i, i + window).map(n => n.column).join(',');
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }
    const repeats = [...patterns.values()].reduce((sum, c) => sum + (c > 1 ? c - 1 : 0), 0);
    patternRepPenalty = repeats / (sorted.length - window);
  }

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

  // Track fast burst sections
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
    meta
  };
}
