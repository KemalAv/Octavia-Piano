import { MidiNotePlaybackItem } from './types';

// ==================================================================================
// SHARED TYPES & UTILS
// ==================================================================================
type Finger = 1 | 2 | 3 | 4 | 5;
type HandType = 'left' | 'right';

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#
const isBlack = (midi: number) => BLACK_KEYS.has(midi % 12);
const isWhite = (midi: number) => !isBlack(midi);

// ==================================================================================
// RIGHT HAND ALGORITHM: PARNCUTT ET AL. (1997) ERGONOMIC MODEL
// (Viterbi / Cost-Based)
// ==================================================================================

// --- PARNCUTT WEIGHTS ---
const RH_WEIGHTS = {
  STRETCH: 2,
  SMALL_SPAN: 2,
  SMALL_SPAN_THUMB: 1,
  LARGE_SPAN: 2,
  LARGE_SPAN_THUMB: 1,
  POS_CHANGE_FULL: 2,
  POS_CHANGE_HALF: 1,
  POS_CHANGE_SIZE: 1,
  WEAK_FINGER: 1,
  THREE_FOUR_FIVE: 1,
  THREE_TO_FOUR: 1,
  FOUR_ON_BLACK: 1,
  THUMB_ON_BLACK: 1,
  THUMB_ON_BLACK_PREV_WHITE: 2,
  THUMB_ON_BLACK_NEXT_WHITE: 2,
  FIVE_ON_BLACK_PREV_WHITE: 2,
  FIVE_ON_BLACK_NEXT_WHITE: 2,
  THUMB_PASSING: 1,
  THUMB_PASSING_HARD: 3
};

// --- TABLE 1: Span Limits (in semitones) ---
const RH_SPAN_DEFS: Record<string, number[]> = {
  '1-2': [-5, -3, 1, 5, 8, 10],
  '1-3': [-4, -2, 3, 7, 10, 12],
  '1-4': [-3, -1, 5, 9, 12, 14],
  '1-5': [-1, 1, 7, 10, 13, 15],
  '2-3': [1, 1, 1, 2, 3, 5],
  '2-4': [1, 1, 3, 4, 5, 7],
  '2-5': [2, 2, 5, 6, 8, 10],
  '3-4': [1, 1, 1, 2, 2, 4],
  '3-5': [1, 1, 3, 4, 5, 7],
  '4-5': [1, 1, 1, 2, 3, 5]
};

const getRHSpanLimits = (f1: Finger, f2: Finger) => {
  if (f1 === f2) return null;
  const key = f1 < f2 ? `${f1}-${f2}` : `${f2}-${f1}`;
  const vals = RH_SPAN_DEFS[key];
  if (!vals) return null;
  return {
    minPrac: vals[0], minComf: vals[1], minRel: vals[2],
    maxRel: vals[3], maxComf: vals[4], maxPrac: vals[5]
  };
};

interface RHCostContext {
  prevPrevNote: MidiNotePlaybackItem | null;
  prevNote: MidiNotePlaybackItem;
  currNote: MidiNotePlaybackItem;
  nextNote: MidiNotePlaybackItem | null;
  prevPrevFinger: Finger | null;
  prevFinger: Finger;
  currFinger: Finger;
}

const calculateRHCost = (ctx: RHCostContext): number => {
  let cost = 0;
  const { prevNote, currNote, prevFinger, currFinger, nextNote, prevPrevNote, prevPrevFinger } = ctx;

  let interval = currNote.midi - prevNote.midi;
  // Note: Since this is strictly RH logic now, interval > 0 is ascending pitch.

  const f = prevFinger;
  const g = currFinger;
  
  if (prevNote.midi === currNote.midi) return f === g ? 0 : 1;
  if (f === g) return 1000;

  const limits = getRHSpanLimits(f, g);
  if (!limits) return 1000;

  let i_norm = interval;
  if (f > g) i_norm = -interval; // Normalize for LowFinger->HighFinger table lookups

  if (i_norm > limits.maxPrac || i_norm < limits.minPrac) return 10000;

  const isThumbInvolved = (f === 1 || g === 1);

  // 1. Stretch
  if (i_norm > limits.maxComf) cost += RH_WEIGHTS.STRETCH * (i_norm - limits.maxComf);
  else if (i_norm < limits.minComf) cost += RH_WEIGHTS.STRETCH * (limits.minComf - i_norm);

  // 2. Small-Span
  if (i_norm < limits.minRel) {
    cost += (isThumbInvolved ? RH_WEIGHTS.SMALL_SPAN_THUMB : RH_WEIGHTS.SMALL_SPAN) * (limits.minRel - i_norm);
  }

  // 3. Large-Span
  if (i_norm > limits.maxRel) {
    cost += (isThumbInvolved ? RH_WEIGHTS.LARGE_SPAN_THUMB : RH_WEIGHTS.LARGE_SPAN) * (i_norm - limits.maxRel);
  }

  // 4 & 5. Position-Change (Triplet)
  if (prevPrevNote && prevPrevFinger) {
    const ppf = prevPrevFinger;
    const pf = prevFinger;
    const cf = currFinger;
    let interval1_3 = currNote.midi - prevPrevNote.midi;

    if (ppf !== cf) {
      const limits1_3 = getRHSpanLimits(ppf, cf);
      if (limits1_3) {
        let i13_norm = interval1_3;
        if (ppf > cf) i13_norm = -interval1_3;

        const outsideComf = (i13_norm > limits1_3.maxComf || i13_norm < limits1_3.minComf);
        if (outsideComf) {
          const isPivotThumb = (pf === 1);
          const isPitchBetween = (prevPrevNote.midi < prevNote.midi && prevNote.midi < currNote.midi) || 
                                 (prevPrevNote.midi > prevNote.midi && prevNote.midi > currNote.midi);
          const outsidePrac = (i13_norm > limits1_3.maxPrac || i13_norm < limits1_3.minPrac);

          if (isPivotThumb && isPitchBetween && outsidePrac) cost += RH_WEIGHTS.POS_CHANGE_FULL;
          else cost += RH_WEIGHTS.POS_CHANGE_HALF;

          if (i13_norm > limits1_3.maxComf) cost += RH_WEIGHTS.POS_CHANGE_SIZE * (i13_norm - limits1_3.maxComf);
          else if (i13_norm < limits1_3.minComf) cost += RH_WEIGHTS.POS_CHANGE_SIZE * (limits1_3.minComf - i13_norm);
        }
      }
    }
  }

  // 6. Weak-Finger
  if (currFinger === 4 || currFinger === 5) cost += RH_WEIGHTS.WEAK_FINGER;

  // 7. Three-Four-Five
  if (prevPrevFinger) {
    const set = new Set([prevPrevFinger, prevFinger, currFinger]);
    if (set.has(3) && set.has(4) && set.has(5) && set.size === 3) cost += RH_WEIGHTS.THREE_FOUR_FIVE;
  }

  // 8. Three-to-Four
  if (prevFinger === 3 && currFinger === 4) cost += RH_WEIGHTS.THREE_TO_FOUR;

  // 9. Four-on-Black
  if ((isWhite(prevNote.midi) && isBlack(currNote.midi) && prevFinger === 3 && currFinger === 4) ||
      (isBlack(prevNote.midi) && isWhite(currNote.midi) && prevFinger === 4 && currFinger === 3)) {
    cost += RH_WEIGHTS.FOUR_ON_BLACK;
  }

  // 10. Thumb-on-Black
  if (currFinger === 1 && isBlack(currNote.midi)) {
    cost += RH_WEIGHTS.THUMB_ON_BLACK;
    if (isWhite(prevNote.midi)) cost += RH_WEIGHTS.THUMB_ON_BLACK_PREV_WHITE;
    if (nextNote && isWhite(nextNote.midi)) cost += RH_WEIGHTS.THUMB_ON_BLACK_NEXT_WHITE;
  }

  // 11. Five-on-Black
  if (currFinger === 5 && isBlack(currNote.midi)) {
    const prevIsBlack = isBlack(prevNote.midi);
    const nextIsBlack = nextNote ? isBlack(nextNote.midi) : true;
    if (!prevIsBlack || !nextIsBlack) {
      if (isWhite(prevNote.midi)) cost += RH_WEIGHTS.FIVE_ON_BLACK_PREV_WHITE;
      if (nextNote && isWhite(nextNote.midi)) cost += RH_WEIGHTS.FIVE_ON_BLACK_NEXT_WHITE;
    }
  }

  // 12. Thumb-Passing
  if (isThumbInvolved && i_norm < 0) {
    const thumbNote = (currFinger === 1) ? currNote : prevNote;
    const otherNote = (currFinger === 1) ? prevNote : currNote;
    if (isWhite(thumbNote.midi) && isWhite(otherNote.midi)) cost += RH_WEIGHTS.THUMB_PASSING;
    else if (isBlack(thumbNote.midi) && isBlack(otherNote.midi)) cost += RH_WEIGHTS.THUMB_PASSING;
    else if (isBlack(thumbNote.midi) && isWhite(otherNote.midi)) cost += RH_WEIGHTS.THUMB_PASSING_HARD;
  }

  return cost;
};

interface ViterbiState {
  cost: number;
  prevFinger: Finger | null;
}

const computeRightHandFingering = (notes: MidiNotePlaybackItem[]) => {
  const n = notes.length;
  if (n === 0) return;

  const dp: ViterbiState[][][] = new Array(n);
  for (let i = 0; i < n; i++) {
    dp[i] = new Array(6);
    for (let cf = 1; cf <= 5; cf++) {
      dp[i][cf] = new Array(6);
      for (let pf = 1; pf <= 5; pf++) {
        dp[i][cf][pf] = { cost: Infinity, prevFinger: null };
      }
    }
  }

  // Init first note
  for (let f = 1; f <= 5; f++) {
    let startCost = 0;
    if (f === 4 || f === 5) startCost += RH_WEIGHTS.WEAK_FINGER;
    if (f === 1 && isBlack(notes[0].midi)) {
      startCost += RH_WEIGHTS.THUMB_ON_BLACK;
      if (notes[1] && isWhite(notes[1].midi)) startCost += RH_WEIGHTS.THUMB_ON_BLACK_NEXT_WHITE;
    }
    if (f === 5 && isBlack(notes[0].midi)) {
       if (notes[1] && isWhite(notes[1].midi)) startCost += RH_WEIGHTS.FIVE_ON_BLACK_NEXT_WHITE;
    }
    for(let dummyP = 1; dummyP <= 5; dummyP++) {
       dp[0][f][dummyP] = { cost: startCost, prevFinger: null };
    }
  }

  // Forward Pass
  for (let i = 1; i < n; i++) {
    const currNote = notes[i];
    const prevNote = notes[i - 1];
    const nextNote = (i < n - 1) ? notes[i + 1] : null;
    const prevPrevNote = (i > 1) ? notes[i - 2] : null;
    const isNewPhrase = (currNote.timeMs - prevNote.timeMs) > 1500;

    for (let cf = 1; cf <= 5; cf++) {
      for (let pf = 1; pf <= 5; pf++) {
        let minTotal = Infinity;
        let bestPPF: Finger | null = null;

        if (isNewPhrase) {
           let startCost = 0;
           if (cf === 4 || cf === 5) startCost += RH_WEIGHTS.WEAK_FINGER;
           let cheapestPrevCost = Infinity;
           for (let ppf = 1; ppf <= 5; ppf++) {
              if (dp[i-1][pf][ppf].cost < cheapestPrevCost) {
                 cheapestPrevCost = dp[i-1][pf][ppf].cost;
                 bestPPF = ppf as Finger;
              }
           }
           if (bestPPF) minTotal = cheapestPrevCost + startCost;
        } else {
           for (let ppf = 1; ppf <= 5; ppf++) {
              const prevCost = dp[i-1][pf][ppf].cost;
              if (prevCost === Infinity) continue;
              const cost = calculateRHCost({
                prevPrevNote, prevNote, currNote, nextNote,
                prevPrevFinger: ppf as Finger, prevFinger: pf as Finger, currFinger: cf as Finger
              });
              if (prevCost + cost < minTotal) {
                minTotal = prevCost + cost;
                bestPPF = ppf as Finger;
              }
           }
        }
        dp[i][cf][pf] = { cost: minTotal, prevFinger: bestPPF };
      }
    }
  }

  // Backtracking
  let minFinalCost = Infinity;
  let lastFinger: Finger = 1;
  let prevLastFinger: Finger = 1;

  for (let cf = 1; cf <= 5; cf++) {
    for (let pf = 1; pf <= 5; pf++) {
      if (dp[n - 1][cf][pf].cost < minFinalCost) {
        minFinalCost = dp[n - 1][cf][pf].cost;
        lastFinger = cf as Finger;
        prevLastFinger = pf as Finger;
      }
    }
  }

  if (minFinalCost !== Infinity) {
    notes[n - 1].finger = lastFinger;
    if (n > 1) notes[n - 2].finger = prevLastFinger;
    let currF = lastFinger;
    let prevF = prevLastFinger;
    for (let i = n - 1; i > 1; i--) {
      const ppf = dp[i][currF][prevF].prevFinger;
      if (ppf) {
        notes[i - 2].finger = ppf;
        currF = prevF;
        prevF = ppf;
      }
    }
  }
};


// ==================================================================================
// LEFT HAND ALGORITHM: HEURISTIC PATTERN MODEL
// ==================================================================================

const LH_FINGER = { THUMB: 1, INDEX: 2, MIDDLE: 3, RING: 4, PINKY: 5 } as const;

// LH Constants
const LH_MAX_FINGER_SPAN = 9;
const LH_MIN_FINGER_SPAN = 3;
const LH_ARPEGGIO_MIN_INTERVAL = 3;
const LH_CHORD_TIME_TOLERANCE = 30;
const LH_PHRASE_GAP = 600;
const LH_SLOW_TEMPO_THRESHOLD = 800;
const LH_FAST_TEMPO_THRESHOLD = 200;
const LH_REPEATED_NOTE_ALTERNATE_THRESHOLD = 150;
const LH_SCALE_MIN_LENGTH = 4;
const LH_SCALE_MAX_INTERVAL = 2;
const LH_STABLE_PASSAGE_MIN_LENGTH = 4;
const LH_STABLE_PASSAGE_MAX_VARIANCE = 5;
const LH_STABLE_PASSAGE_MAX_INTERVAL = 2;

const LH_FORBIDDEN_TRANSITIONS_ASC = [[4, 3], [3, 2]];
const LH_FORBIDDEN_TRANSITIONS_DESC = [[2, 3], [3, 4]];

const LH_MIN_CROSSING_DISTANCE = 7;
const LH_CROSSING_TIME_TOLERANCE = 50;

interface LHHandPosition {
  thumbMidi: number;
  pinkyMidi: number;
  lastFinger: Finger;
  lastMidi: number;
  lastTime: number;
  usedFingers: Set<Finger>;
  inArpeggio: boolean;
  arpeggioRoot: number;
  currentTempo: number;
  phraseNotes: number;
}

const createLHHandPosition = (note: MidiNotePlaybackItem): LHHandPosition => {
  return {
    thumbMidi: note.midi + 2, // Left hand logic: thumb is higher pitch
    pinkyMidi: note.midi - 4, // Left hand logic: pinky is lower pitch
    lastFinger: LH_FINGER.MIDDLE,
    lastMidi: note.midi,
    lastTime: note.timeMs,
    usedFingers: new Set(),
    inArpeggio: false,
    arpeggioRoot: note.midi,
    currentTempo: 0,
    phraseNotes: 1,
  };
};

const updateLHFingerPos = (pos: LHHandPosition, midi: number, finger: Finger) => {
  if (finger === LH_FINGER.THUMB) pos.thumbMidi = midi;
  if (finger === LH_FINGER.PINKY) pos.pinkyMidi = midi;
  if (finger === LH_FINGER.INDEX) pos.thumbMidi = midi + 1;
  if (finger === LH_FINGER.MIDDLE) {
    pos.thumbMidi = midi + 2;
    pos.pinkyMidi = midi - 2;
  }
  if (finger === LH_FINGER.RING) pos.pinkyMidi = midi - 1;

  const span = Math.abs(pos.pinkyMidi - pos.thumbMidi);
  if (span > LH_MAX_FINGER_SPAN && pos.currentTempo < LH_FAST_TEMPO_THRESHOLD) {
    pos.thumbMidi -= 1;
    pos.pinkyMidi += 1;
  } else if (span < LH_MIN_FINGER_SPAN && pos.currentTempo > LH_SLOW_TEMPO_THRESHOLD) {
    pos.thumbMidi += 1;
    pos.pinkyMidi -= 1;
  }
};

const isLHFingerComfortable = (pos: LHHandPosition, midi: number, finger: Finger): boolean => {
  let expected = midi;
  if (finger === LH_FINGER.THUMB) expected = pos.thumbMidi;
  if (finger === LH_FINGER.PINKY) expected = pos.pinkyMidi;
  if (finger === LH_FINGER.INDEX) expected = pos.thumbMidi - 1;
  if (finger === LH_FINGER.MIDDLE) expected = pos.thumbMidi - 2;
  if (finger === LH_FINGER.RING) expected = pos.pinkyMidi + 1;
  const diff = Math.abs(midi - expected);
  return diff <= (pos.currentTempo < LH_FAST_TEMPO_THRESHOLD ? 2 : 1);
};

const canReuseLHFinger = (pos: LHHandPosition, finger: Finger, timeSinceLast: number, midi: number): boolean => {
  if (timeSinceLast > LH_SLOW_TEMPO_THRESHOLD) return true;
  if (midi === pos.lastMidi && timeSinceLast > LH_REPEATED_NOTE_ALTERNATE_THRESHOLD) return true;
  if (pos.usedFingers.has(finger)) return false;
  if (pos.currentTempo < LH_FAST_TEMPO_THRESHOLD && midi !== pos.lastMidi) return false;
  return true;
};

const isForbiddenLHTransition = (lastFinger: Finger, finger: Finger, dir: number, isFast: boolean): boolean => {
  if (!isFast) return false;
  const pair = [lastFinger, finger];
  const forbidden = dir > 0 ? LH_FORBIDDEN_TRANSITIONS_ASC : LH_FORBIDDEN_TRANSITIONS_DESC;
  return forbidden.some(f => f[0] === pair[0] && f[1] === pair[1]);
};

const chooseBestLHFinger = (candidates: Finger[], midi: number, pos: LHHandPosition, timeGap: number): Finger => {
  const isFast = pos.currentTempo < LH_FAST_TEMPO_THRESHOLD;

  if (isFast) {
    const alt = (pos.lastFinger % 2 === 1 ? pos.lastFinger + 1 : pos.lastFinger - 1) as Finger;
    if (candidates.includes(alt) && isLHFingerComfortable(pos, midi, alt)) return alt;
  }

  for (const f of candidates) {
    if (isLHFingerComfortable(pos, midi, f)) {
      if (f === LH_FINGER.THUMB && isBlack(midi) && candidates.length > 1) continue;
      if (canReuseLHFinger(pos, f, timeGap, midi) && !isForbiddenLHTransition(pos.lastFinger, f, Math.sign(midi - pos.lastMidi), isFast)) return f;
    }
  }

  let best = candidates[0];
  let minDist = Infinity;
  for (const f of candidates) {
    if (f === LH_FINGER.THUMB && isBlack(midi) && candidates.length > 1) continue;
    let expected = midi;
    if (f === LH_FINGER.THUMB) expected = pos.thumbMidi;
    if (f === LH_FINGER.PINKY) expected = pos.pinkyMidi;
    const dist = Math.abs(midi - expected);
    if (dist < minDist && canReuseLHFinger(pos, f, timeGap, midi) && !isForbiddenLHTransition(pos.lastFinger, f, Math.sign(midi - pos.lastMidi), isFast)) {
      minDist = dist;
      best = f;
    }
  }

  if (Math.abs(best - pos.lastFinger) > 2 && isFast) {
    best = ((pos.lastFinger + 1 > 5 ? 5 : pos.lastFinger + 1) as Finger);
  }

  if (isForbiddenLHTransition(pos.lastFinger, best, Math.sign(midi - pos.lastMidi), isFast)) {
    const alternatives = candidates.filter(f => f !== best && !isForbiddenLHTransition(pos.lastFinger, f, Math.sign(midi - pos.lastMidi), isFast));
    if (alternatives.length > 0) best = alternatives[0];
  }
  return best;
};

// LH Detectors
const detectLHArpeggio = (notes: MidiNotePlaybackItem[], i: number): MidiNotePlaybackItem[] | null => {
  if (i + 2 >= notes.length) return null;
  const group: MidiNotePlaybackItem[] = [notes[i]];
  let last = notes[i];
  let dir: 1 | -1 | 0 = 0;
  for (let j = i + 1; j < notes.length && group.length < 8; j++) { // Increased group length limit
    const n = notes[j];
    const dt = n.timeMs - last.timeMs;
    if (dt > 750) break; // Increased from 350 to better detect arpeggios in slower tempos
    const interval = n.midi - last.midi;
    const abs = Math.abs(interval);
    if (abs < LH_ARPEGGIO_MIN_INTERVAL || abs > 12) break; // Allow up to an octave interval
    const currDir = Math.sign(interval) as 1 | -1;
    if (dir === 0) dir = currDir;
    else if (currDir !== dir) break;
    group.push(n);
    last = n;
  }
  return group.length >= 3 ? group : null;
};

const applyLHArpeggioFingering = (group: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  const ascending = group[group.length - 1].midi > group[0].midi;
  pos.inArpeggio = true;
  pos.arpeggioRoot = group[0].midi;
  const numNotes = group.length;

  let pattern: Finger[];

  if (ascending) {
    // LH Ascending (e.g., C3-E3-G3) - fingering goes from 5 towards 1
    switch (numNotes) {
      case 2: // An interval
        pattern = [5, 1];
        break;
      case 3: // A triad
        // Per user request, enforce 5-3-1 for all 3-note ascending arpeggios.
        pattern = [5, 3, 1];
        break;
      case 4: // A seventh chord
        pattern = [5, 4, 2, 1]; // Common fingering
        break;
      default: // Longer or other
        pattern = [5, 4, 3, 2, 1]; // Fallback to a scale-like fingering
        break;
    }
  } else {
    // LH Descending (e.g., C4-G3-E3) - fingering goes from 1 towards 5
    switch (numNotes) {
      case 2:
        pattern = [1, 5];
        break;
      case 3:
        // C-G-E -> 1-2-4 or 1-2-3.
        const interval = group[0].midi - group[1].midi;
        pattern = (interval <= 5) ? [1, 3, 5] : [1, 2, 5];
        break;
      case 4:
        pattern = [1, 2, 3, 5]; // Common for C-A-F-C type patterns
        break;
      default:
        pattern = [1, 2, 3, 4, 5]; // Fallback
        break;
    }
  }

  group.forEach((note, idx) => {
    // Use pattern index, but for long arpeggios, cycle through the middle fingers.
    let finger: Finger;
    if (idx < pattern.length) {
      finger = pattern[idx];
    } else {
      // For longer runs, after the initial pattern, cycle through middle fingers
      const patternContinuationAsc = [3, 2, 1];
      const patternContinuationDesc = [2, 3, 4]; // after 1
      if (ascending) {
          finger = patternContinuationAsc[(idx - pattern.length) % patternContinuationAsc.length] as Finger;
      } else {
          finger = patternContinuationDesc[(idx - pattern.length) % patternContinuationDesc.length] as Finger;
      }
    }
    
    // Rule: Avoid thumb on black key if possible
    if (finger === LH_FINGER.THUMB && isBlack(note.midi)) {
      // If it's not the last note of an ascending run, use 2 instead.
      if (ascending && idx < numNotes - 1) {
        finger = LH_FINGER.INDEX;
      }
      // If it's not the first note of a descending run, use 2 instead.
      else if (!ascending && idx > 0) {
        finger = LH_FINGER.INDEX;
      }
    }
    
    // Rule: For ascending arpeggios, the last note should ideally be 1 or 2 to allow for thumb-under.
    // If our pattern assigned something else and it's a long run, adjust.
    if (ascending && idx === numNotes - 1 && numNotes > 4) {
      if (isWhite(note.midi)) finger = 1;
      else finger = 2;
    }

    note.finger = finger;
    updateLHFingerPos(pos, note.midi, finger);
    pos.usedFingers.add(finger);
  });
  
  if (group.length > 0) {
    pos.lastFinger = group[group.length - 1].finger!;
    pos.lastMidi = group[group.length - 1].midi;
  }
};

const assignLHChordFingering = (chord: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  chord.sort((a, b) => a.midi - b.midi);
  const span = chord[chord.length - 1].midi - chord[0].midi;
  const uniqueUsed = new Set<Finger>();

  let pattern: Finger[] = [];
  if (chord.length === 2) {
    pattern = span >= 11 ? [LH_FINGER.PINKY, LH_FINGER.THUMB] : [LH_FINGER.MIDDLE, LH_FINGER.THUMB];
  } else if (chord.length === 3) {
    pattern = span >= 7 ? [LH_FINGER.PINKY, LH_FINGER.MIDDLE, LH_FINGER.THUMB] : [LH_FINGER.RING, LH_FINGER.INDEX, LH_FINGER.THUMB];
  } else if (chord.length === 4) {
    pattern = [LH_FINGER.PINKY, LH_FINGER.MIDDLE, LH_FINGER.INDEX, LH_FINGER.THUMB];
  } else {
    pattern = [LH_FINGER.PINKY, LH_FINGER.RING, LH_FINGER.MIDDLE, LH_FINGER.INDEX, LH_FINGER.THUMB];
  }

  chord.forEach((n, i) => {
    let f = pattern[Math.min(i, pattern.length - 1)];
    while (uniqueUsed.has(f)) {
      f = ((f === 5 ? 1 : f + 1) as Finger);
      if (uniqueUsed.size >= 5) break;
    }
    if (f === LH_FINGER.THUMB && isBlack(n.midi)) {
      const alt = LH_FINGER.MIDDLE;
      if (!uniqueUsed.has(alt)) f = alt;
    }
    if (i > 0 && f >= (chord[i - 1].finger ?? 6)) {
      f = (Math.max(1, (chord[i - 1].finger ?? 6) - 1)) as Finger;
    }
    n.finger = f;
    updateLHFingerPos(pos, n.midi, f);
    uniqueUsed.add(f);
  });
  pos.usedFingers = uniqueUsed;
};

const detectLHChromaticGroup = (notes: MidiNotePlaybackItem[], i: number) => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (Math.abs(n.midi - notes[j - 1].midi) !== 1) break;
    if (n.timeMs - notes[j - 1].timeMs > 300) break;
    group.push(n);
  }
  return group.length >= 3 ? group : null;
};

const applyLHChromaticFingering = (group: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  const ascending = group[group.length - 1].midi > group[0].midi;
  let patternLHAsc: Finger[] = [4, 3, 2, 1, 3, 2, 1];
  let patternLHDesc: Finger[] = [1, 2, 3, 1, 2, 3, 4];
  if (pos.currentTempo < LH_FAST_TEMPO_THRESHOLD) {
    patternLHAsc = [4, 3, 2, 3, 1, 2, 1];
    patternLHDesc = [1, 2, 1, 3, 2, 3, 4];
  }
  const pattern = ascending ? patternLHAsc : patternLHDesc;
  group.forEach((note, idx) => {
    const f = pattern[idx % pattern.length] as Finger;
    note.finger = f;
    updateLHFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

const detectLHScaleGroup = (notes: MidiNotePlaybackItem[], i: number): MidiNotePlaybackItem[] | null => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  let dir: 1 | -1 | 0 = 0;
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    const interval = n.midi - notes[j - 1].midi;
    const abs = Math.abs(interval);
    if (abs < 1 || abs > LH_SCALE_MAX_INTERVAL) break;
    const currDir = Math.sign(interval) as 1 | -1;
    if (dir === 0) dir = currDir;
    else if (currDir !== dir) break;
    if (n.timeMs - notes[j - 1].timeMs > 250) break;
    group.push(n);
  }
  return group.length >= LH_SCALE_MIN_LENGTH ? group : null;
};

const applyLHScaleFingering = (group: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  const ascending = group[group.length - 1].midi > group[0].midi;
  const patternLHAsc: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];
  const patternLHDesc: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];
  let pattern = ascending ? patternLHAsc : patternLHDesc;
  const startOffset = (group[0].midi % 12) % pattern.length;
  pattern = [...pattern.slice(startOffset), ...pattern.slice(0, startOffset)];
  if (pos.currentTempo < LH_FAST_TEMPO_THRESHOLD) {
    pattern = ascending
      ? [4, 3, 2, 1, 5, 4, 3, 2]
      : [2, 3, 4, 5, 1, 2, 3, 4];
  }
  group.forEach((note, idx) => {
    let f = pattern[idx % pattern.length] as Finger;
    if (f === LH_FINGER.THUMB && isBlack(note.midi)) {
      f = ((f + 1) as Finger);
    }
    note.finger = f;
    updateLHFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

const detectLHRepeatedNotesGroup = (notes: MidiNotePlaybackItem[], i: number): MidiNotePlaybackItem[] | null => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (n.midi !== notes[j - 1].midi) break;
    if (n.timeMs - notes[j - 1].timeMs > LH_REPEATED_NOTE_ALTERNATE_THRESHOLD * 2) break;
    group.push(n);
  }
  return group.length >= 2 ? group : null;
};

const applyLHRepeatedNotesFingering = (group: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  // Per user request, repeated notes should use the same finger for consistency.
  // The middle finger (3) is a stable and common choice.
  const fingerToUse: Finger = 3;

  group.forEach((note) => {
    note.finger = fingerToUse;
    updateLHFingerPos(pos, note.midi, fingerToUse);
    pos.usedFingers.add(fingerToUse);
  });

  if (group.length > 0) {
    const lastNote = group[group.length - 1];
    pos.lastMidi = lastNote.midi;
    pos.lastFinger = fingerToUse;
    pos.lastTime = lastNote.timeMs;
  }
};

const detectLHStableFastPassage = (notes: MidiNotePlaybackItem[], i: number, tempo: number): MidiNotePlaybackItem[] | null => {
  if (tempo >= LH_FAST_TEMPO_THRESHOLD) return null;
  const group: MidiNotePlaybackItem[] = [notes[i]];
  const midis: number[] = [notes[i].midi];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    const interval = Math.abs(n.midi - notes[j - 1].midi);
    if (interval > LH_STABLE_PASSAGE_MAX_INTERVAL) break;
    if (n.timeMs - notes[j - 1].timeMs > LH_FAST_TEMPO_THRESHOLD) break;
    group.push(n);
    midis.push(n.midi);
  }
  if (group.length < LH_STABLE_PASSAGE_MIN_LENGTH) return null;
  const max = Math.max(...midis);
  const min = Math.min(...midis);
  if (max - min > LH_STABLE_PASSAGE_MAX_VARIANCE) return null;
  return group;
};

const applyLHStableFastPassageFingering = (group: MidiNotePlaybackItem[], pos: LHHandPosition) => {
  const pattern: Finger[] = [4, 3, 4, 3, 5, 2];
  group.forEach((note, idx) => {
    let f = pattern[idx % pattern.length] as Finger;
    if (f === LH_FINGER.THUMB && isBlack(note.midi)) {
      f = LH_FINGER.RING;
    }
    if (idx > 0 && isForbiddenLHTransition(group[idx - 1].finger!, f, Math.sign(note.midi - group[idx - 1].midi), true)) {
      f = ((f + 1 > 5 ? 1 : f + 1) as Finger);
    }
    note.finger = f;
    updateLHFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

// === LEFT HAND PROCESSOR ===
const computeLeftHandFingering = (
  notes: MidiNotePlaybackItem[],
  rightHandLast: { midi: number; time: number } | null
) => {
  if (!notes.length) return;

  let i = 0;
  const pos = createLHHandPosition(notes[0]);

  while (i < notes.length) {
    const curr = notes[i];
    const timeGap = curr.timeMs - pos.lastTime;

    if (timeGap > 0) {
      pos.currentTempo = (pos.currentTempo * pos.phraseNotes + timeGap) / (pos.phraseNotes + 1);
      pos.phraseNotes++;
    }
    if (i === 0 || timeGap > LH_PHRASE_GAP) {
      pos.usedFingers.clear();
      pos.currentTempo = 0;
      pos.phraseNotes = 1;
    }

    // CROSSING RISK CHECK WITH RH
    let crossingRisk = false;
    let crossingDistance = 0;
    if (rightHandLast && Math.abs(curr.timeMs - rightHandLast.time) <= LH_CROSSING_TIME_TOLERANCE) {
      const rightMidi = rightHandLast.midi;
      if (curr.midi > rightMidi) { // Left hand crossed above right hand (rare but possible)
        crossingRisk = true;
        crossingDistance = Math.abs(curr.midi - rightMidi);
      }
    }

    // 1. CHORD
    const chord: MidiNotePlaybackItem[] = [curr];
    let j = i + 1;
    while (j < notes.length && Math.abs(notes[j].timeMs - curr.timeMs) <= LH_CHORD_TIME_TOLERANCE) {
      chord.push(notes[j++]);
    }
    if (chord.length > 1) {
      assignLHChordFingering(chord, pos);
      pos.lastTime = curr.timeMs;
      i = j;
      continue;
    }

    // 2. PATTERNS
    const arp = detectLHArpeggio(notes, i);
    if (arp) { pos.usedFingers.clear(); applyLHArpeggioFingering(arp, pos); pos.lastTime = arp[arp.length - 1].timeMs; i += arp.length; continue; }

    const scale = detectLHScaleGroup(notes, i);
    if (scale) { pos.usedFingers.clear(); applyLHScaleFingering(scale, pos); pos.lastTime = scale[scale.length - 1].timeMs; i += scale.length; continue; }

    const chromatic = detectLHChromaticGroup(notes, i);
    if (chromatic) { pos.usedFingers.clear(); applyLHChromaticFingering(chromatic, pos); pos.lastTime = chromatic[chromatic.length - 1].timeMs; i += chromatic.length; continue; }

    const repeated = detectLHRepeatedNotesGroup(notes, i);
    if (repeated) { pos.usedFingers.clear(); applyLHRepeatedNotesFingering(repeated, pos); pos.lastTime = repeated[repeated.length - 1].timeMs; i += repeated.length; continue; }

    const stable = detectLHStableFastPassage(notes, i, pos.currentTempo);
    if (stable) { pos.usedFingers.clear(); applyLHStableFastPassageFingering(stable, pos); pos.lastTime = stable[stable.length - 1].timeMs; i += stable.length; continue; }

    // 3. SINGLE NOTE
    const interval = curr.midi - pos.lastMidi;
    let candidates: Finger[] = [];

    if (timeGap > LH_PHRASE_GAP || Math.abs(interval) > 7) {
      const f = (interval > 0 ? LH_FINGER.THUMB : LH_FINGER.PINKY);
      curr.finger = f;
      updateLHFingerPos(pos, curr.midi, f);
      pos.usedFingers.clear();
      pos.usedFingers.add(f);
    } else {
      const dir = Math.sign(interval);
      const isFast = pos.currentTempo < LH_FAST_TEMPO_THRESHOLD;

      if (crossingRisk && crossingDistance < LH_MIN_CROSSING_DISTANCE) {
        // Avoid collision
        candidates = [LH_FINGER.THUMB, LH_FINGER.INDEX];
        if (curr.midi < pos.lastMidi) candidates = [LH_FINGER.THUMB];
      } else {
        if (dir > 0) {
          if (interval >= 12) candidates = [LH_FINGER.THUMB];
          else if (interval >= 7) candidates = [LH_FINGER.THUMB, LH_FINGER.INDEX];
          else candidates = [((pos.lastFinger - 1 < 1 ? 1 : pos.lastFinger - 1)) as Finger];
        } else if (dir < 0) {
          if (interval <= -12) candidates = [LH_FINGER.PINKY];
          else if (interval <= -7) candidates = [LH_FINGER.RING, LH_FINGER.PINKY];
          else candidates = [((pos.lastFinger + 1 > 5 ? 5 : pos.lastFinger + 1)) as Finger];
        } else {
          candidates = [pos.lastFinger];
        }

        candidates = candidates.filter(f => f >= 1 && f <= 5);
        const original = [...candidates];
        candidates = candidates.filter(f => !(f === LH_FINGER.THUMB && isBlack(curr.midi)));
        if (candidates.length === 0) candidates = original;

        if (Math.abs(interval) <= 2 && isFast) {
          const next: Finger = (dir > 0
            ? Math.max(pos.lastFinger - 1, 1)
            : Math.min(pos.lastFinger + 1, 5)) as Finger;
          if (!candidates.includes(next)) candidates.unshift(next);
        }

        if (isFast) {
          candidates = candidates.filter(f => Math.abs(f - pos.lastFinger) <= 1);
        }

        if (candidates.length === 0) {
          const fallback: Finger = (dir >= 0
            ? Math.max(pos.lastFinger - 1, 1)
            : Math.min(pos.lastFinger + 1, 5)) as Finger;
          candidates = [fallback];
        }
      }

      const best = chooseBestLHFinger(candidates, curr.midi, pos, timeGap) || candidates[0];
      curr.finger = best;
      updateLHFingerPos(pos, curr.midi, curr.finger);
      if (timeGap < LH_SLOW_TEMPO_THRESHOLD && curr.midi !== pos.lastMidi) {
        pos.usedFingers.add(curr.finger);
      }
    }

    pos.lastMidi = curr.midi;
    pos.lastFinger = curr.finger!;
    pos.lastTime = curr.timeMs;
    i++;
  }
};


// ==================================================================================
// MAIN ORCHESTRATOR
// ==================================================================================

export const assignFingering = (notes: MidiNotePlaybackItem[]): MidiNotePlaybackItem[] => {
  if (notes.length === 0) return notes;

  const processedNotes = notes.map(n => ({ ...n }));

  const rightHandNotes = processedNotes
    .filter(n => n.hand === 'right')
    .sort((a, b) => a.timeMs - b.timeMs);
    
  const leftHandNotes = processedNotes
    .filter(n => n.hand === 'left')
    .sort((a, b) => a.timeMs - b.timeMs);

  // 1. Process Right Hand (Parncutt Model - Viterbi)
  // Process in phrases to keep Viterbi efficient
  const PHRASE_GAP = 2000;
  let chunkStart = 0;
  for (let i = 1; i <= rightHandNotes.length; i++) {
    const isEnd = i === rightHandNotes.length;
    const isGap = !isEnd && (rightHandNotes[i].timeMs - rightHandNotes[i - 1].timeMs > PHRASE_GAP);
    if (isEnd || isGap) {
      const phrase = rightHandNotes.slice(chunkStart, i);
      computeRightHandFingering(phrase);
      chunkStart = i;
    }
  }

  // 2. Extract context for Left Hand Crossing logic
  let rightLastInfo: { midi: number; time: number } | null = null;
  if (rightHandNotes.length > 0) {
    const last = rightHandNotes[rightHandNotes.length - 1];
    rightLastInfo = { midi: last.midi, time: last.timeMs };
  }

  // 3. Process Left Hand (Heuristic Model)
  // Processes entire LH stream at once as it uses a continuous state machine
  computeLeftHandFingering(leftHandNotes, rightLastInfo);

  return processedNotes;
};
