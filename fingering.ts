import { MidiNotePlaybackItem } from './types';

// ==================================================================================
// SPESIFIKASI ALGORITMA: PIANO TIMING & FINGERING
// DETERMINISTIC V2.7 • HAND: MEDIUM
// Strict Double-Thirds Guard: Hanya aktif pada terts murni yang melangkah
// ==================================================================================

export type Finger = 1 | 2 | 3 | 4 | 5;
export type HandType = 'left' | 'right';

export const CHORD_MAX_BEAT = 0.12;
export const SIXTEENTH_NOTE_BEAT = 0.25;
export const EIGHTH_NOTE_BEAT = 0.50;
export const QUARTER_NOTE_BEAT = 1.00;
export const SOFT_RESET_REST_BEAT = 0.5;
export const HARD_RESET_REST_BEAT = 2.50;
export const PATTERN_MAX_BEAT = 2.00;
export const MAX_VITERBI_CHUNK_SIZE = 128;

const DEFAULT_MS_PER_BEAT = 500;
const TICKS_PER_BEAT = 480;

export const getNoteBeatPosition = (n: MidiNotePlaybackItem): { startBeat: number; durationBeat: number } => {
  if (n.ticks !== undefined && n.ticks > 0) {
    const durTicks = (n.durationTicks !== undefined && n.durationTicks > 0) ? n.durationTicks : TICKS_PER_BEAT;
    return {
      startBeat: n.ticks / TICKS_PER_BEAT,
      durationBeat: durTicks / TICKS_PER_BEAT
    };
  }
  const startBeat = (n.timeMs || 0) / DEFAULT_MS_PER_BEAT;
  const durationBeat = Math.max(0.1, (n.durationMs || 250) / DEFAULT_MS_PER_BEAT);
  return { startBeat, durationBeat };
};

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
const isBlack = (midi: number) => BLACK_KEYS.has(midi % 12);
const isWhite = (midi: number) => !isBlack(midi);

interface ScaleFingering {
  rhUp: Finger[];
  rhDown: Finger[];
  lhUp: Finger[];
  lhDown: Finger[];
}

const MAJOR_SCALE_TABLE: Record<number, ScaleFingering> = {
  0: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  7: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  2: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  9: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  4: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  11: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [4, 3, 2, 1, 4, 3, 2, 1], lhDown: [1, 2, 3, 4, 1, 2, 3, 4] },
  6: { rhUp: [2, 3, 4, 1, 2, 3, 1, 2], rhDown: [2, 1, 3, 2, 1, 4, 3, 2], lhUp: [4, 3, 2, 1, 3, 2, 1, 4], lhDown: [4, 1, 2, 3, 1, 2, 3, 4] },
  1: { rhUp: [2, 3, 1, 2, 3, 4, 1, 2], rhDown: [2, 1, 4, 3, 2, 1, 3, 2], lhUp: [3, 2, 1, 4, 3, 2, 1, 3], lhDown: [3, 1, 2, 3, 4, 1, 2, 3] },
  8: { rhUp: [3, 4, 1, 2, 3, 1, 2, 3], rhDown: [3, 2, 1, 3, 2, 1, 4, 3], lhUp: [3, 2, 1, 4, 3, 2, 1, 3], lhDown: [3, 1, 2, 3, 4, 1, 2, 3] },
  3: { rhUp: [3, 1, 2, 3, 4, 1, 2, 3], rhDown: [3, 2, 1, 4, 3, 2, 1, 3], lhUp: [3, 2, 1, 4, 3, 2, 1, 3], lhDown: [3, 1, 2, 3, 4, 1, 2, 3] },
  10: { rhUp: [4, 1, 2, 3, 1, 2, 3, 4], rhDown: [4, 3, 2, 1, 3, 2, 1, 4], lhUp: [3, 2, 1, 4, 3, 2, 1, 3], lhDown: [3, 1, 2, 3, 4, 1, 2, 3] },
  5: { rhUp: [1, 2, 3, 4, 1, 2, 3, 4], rhDown: [4, 3, 2, 1, 4, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] }
};

const MINOR_SCALE_TABLE: Record<number, ScaleFingering> = {
  9: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  4: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  11: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [4, 3, 2, 1, 4, 3, 2, 1], lhDown: [1, 2, 3, 4, 1, 2, 3, 4] },
  6: { rhUp: [2, 3, 1, 2, 3, 1, 2, 3], rhDown: [3, 2, 1, 3, 2, 1, 3, 2], lhUp: [4, 3, 2, 1, 3, 2, 1, 4], lhDown: [4, 1, 2, 3, 1, 2, 3, 4] },
  1: { rhUp: [2, 3, 1, 2, 3, 4, 1, 2], rhDown: [3, 2, 1, 3, 2, 1, 3, 2], lhUp: [3, 2, 1, 4, 3, 2, 1, 3], lhDown: [3, 1, 2, 3, 4, 1, 2, 3] },
  8: { rhUp: [2, 3, 1, 2, 3, 1, 2, 3], rhDown: [3, 2, 1, 3, 2, 1, 3, 2], lhUp: [3, 2, 1, 3, 2, 1, 4, 3], lhDown: [3, 4, 1, 2, 3, 1, 2, 3] },
  3: { rhUp: [2, 1, 2, 3, 4, 1, 2, 3], rhDown: [3, 2, 1, 4, 3, 2, 1, 2], lhUp: [2, 1, 4, 3, 2, 1, 3, 2], lhDown: [2, 3, 1, 2, 3, 4, 1, 2] },
  10: { rhUp: [4, 1, 2, 3, 1, 2, 3, 4], rhDown: [4, 3, 2, 1, 3, 2, 1, 4], lhUp: [2, 1, 3, 2, 1, 4, 3, 2], lhDown: [2, 3, 4, 1, 2, 3, 1, 2] },
  5: { rhUp: [1, 2, 3, 4, 1, 2, 3, 4], rhDown: [4, 3, 2, 1, 4, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  0: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  7: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] },
  2: { rhUp: [1, 2, 3, 1, 2, 3, 4, 5], rhDown: [5, 4, 3, 2, 1, 3, 2, 1], lhUp: [5, 4, 3, 2, 1, 3, 2, 1], lhDown: [1, 2, 3, 1, 2, 3, 4, 5] }
};

const SPAN_DEFS: Record<string, [number, number, number, number, number, number]> = {
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

const getSpanLimits = (f1: Finger, f2: Finger) => {
  if (f1 === f2) return null;
  const key = f1 < f2 ? `${f1}-${f2}` : `${f2}-${f1}`;
  const vals = SPAN_DEFS[key];
  if (!vals) return null;
  return {
    minPrac: vals[0], minComf: vals[1], minRel: vals[2],
    maxRel: vals[3], maxComf: vals[4], maxPrac: vals[5]
  };
};

interface CostContext {
  hand: HandType;
  prevNote: MidiNotePlaybackItem;
  currNote: MidiNotePlaybackItem;
  nextNote: MidiNotePlaybackItem | null;
  prevPrevNote: MidiNotePlaybackItem | null;
  prevPrevFinger: Finger | null;
  prevFinger: Finger;
  currFinger: Finger;
  isFingerOccupied: boolean;
}

const calculateDeterministicCostV22 = (ctx: CostContext): number => {
  const { hand, prevNote, currNote, prevFinger: f, currFinger: g, isFingerOccupied } = ctx;
  const prevBeat = getNoteBeatPosition(prevNote);
  const currBeat = getNoteBeatPosition(currNote);

  const beatDelta = Math.max(0, currBeat.startBeat - prevBeat.startBeat);
  const restGapBeat = Math.max(0, currBeat.startBeat - (prevBeat.startBeat + prevBeat.durationBeat));
  const ioiMs = Math.max(0, (currNote.timeMs || 0) - (prevNote.timeMs || 0));
  const interval = currNote.midi - prevNote.midi;

  if (isFingerOccupied && f === g && interval !== 0) {
    return 500;
  }

  if (restGapBeat >= SOFT_RESET_REST_BEAT || beatDelta >= 1.5) {
    let cost = 0;
    if (hand === 'right') {
      cost += (g === 1 || g === 2) ? 0 : 3;
    } else {
      cost += (g === 5 || g === 4) ? 0 : 3;
    }
    if (g === 1 && isBlack(currNote.midi)) cost += 5;
    return cost;
  }

  if (interval === 0) {
    return f === g ? 0 : 4;
  }

  if (f === g) {
    if (ioiMs < 160 || beatDelta <= SIXTEENTH_NOTE_BEAT) return 600;
    if (ioiMs < 300 || beatDelta <= EIGHTH_NOTE_BEAT) return 350;
    return Math.abs(interval) <= 2 ? 10 : 80;
  }

  if (Math.abs(interval) === 12) {
    if (hand === 'right') {
      if (interval === 12) return (f === 1 && g === 5) ? 0 : 120;
      if (interval === -12) return (f === 5 && g === 1) ? 0 : 120;
    } else {
      if (interval === 12) return (f === 5 && g === 1) ? 0 : 120;
      if (interval === -12) return (f === 1 && g === 5) ? 0 : 120;
    }
  }

  if ((ioiMs < 250 || beatDelta <= EIGHTH_NOTE_BEAT) && g === 1 && f === 1) {
    return 400;
  }

  if (g === 1 && isBlack(currNote.midi)) {
    const isUnder = hand === 'right' ? (interval > 0 && f > 1) : (interval < 0 && f > 1);
    if (isUnder) return 300;
  }

  // Anti-loop: prevent repeating 1-2-1-2 / 2-1-2-1 in a monotonic run
  if (
    ctx.prevPrevFinger !== null &&
    ((ctx.prevPrevFinger === 1 && f === 2 && g === 1) || (ctx.prevPrevFinger === 2 && f === 1 && g === 2))
  ) {
    const prevPrevNote = ctx.prevPrevNote;
    const prevInt = prevPrevNote ? (prevNote.midi - prevPrevNote.midi) : interval;
    if ((interval > 0 && prevInt > 0) || (interval < 0 && prevInt < 0)) {
      return 650; // Anatomically awkward/impossible repeating 1-2 oscillation in a run!
    }
  }

  let blackKeyPenalty = 0;
  if (g === 1 && isBlack(currNote.midi)) {
    blackKeyPenalty += 10.0;
    if (isWhite(prevNote.midi)) blackKeyPenalty += 4.0;
  }
  if ((g === 2 || g === 3) && isBlack(currNote.midi) && isWhite(prevNote.midi)) {
    blackKeyPenalty -= 3.0;
  }

  const normInterval = hand === 'right' ? interval : -interval;

  let cost = 0;

  if (normInterval > 0 && f > g) {
    if (g === 1 && (f === 2 || f === 3 || f === 4)) {
      // Thumb tuck allowed only under fingers 2, 3, or 4
    } else {
      return 450; // Thumb tuck under pinky (5) or finger crossing without thumb is anatomically impossible!
    }
  }
  if (normInterval < 0 && f < g) {
    if (f === 1 && (g === 2 || g === 3 || g === 4)) {
      // Finger cross allowed only over thumb with fingers 2, 3, or 4
      if (g === 2) {
        cost += 45; // Substantial penalty: prefer crossing 3 or 4 over thumb in runs!
      }
    } else {
      return 450; // Pinky cross over thumb or finger cross without thumb is anatomically impossible!
    }
  }

  const limits = getSpanLimits(f, g);
  if (!limits) return 150;

  let spanInterval = normInterval;
  if (f > g) spanInterval = -normInterval;

  if (spanInterval > limits.maxPrac || spanInterval < limits.minPrac) {
    return 280 + Math.abs(spanInterval - (spanInterval > limits.maxPrac ? limits.maxPrac : limits.minPrac)) * 10;
  }

  if (spanInterval > limits.maxComf) cost += 3.0 * (spanInterval - limits.maxComf);
  else if (spanInterval < limits.minComf) cost += 3.0 * (limits.minComf - spanInterval);

  if (spanInterval < limits.minRel) cost += 2.0 * (limits.minRel - spanInterval);
  if (spanInterval > limits.maxRel) cost += 2.5 * (spanInterval - limits.maxRel);

  if (g === 5 && isBlack(currNote.midi)) cost += 3.0;

  if (Math.abs(interval) <= 2) {
    if (hand === 'right') {
      if (interval > 0 && g === f + 1) cost -= 4;
      if (interval < 0 && g === f - 1) cost -= 4;
    } else {
      if (interval > 0 && g === f - 1) cost -= 4;
      if (interval < 0 && g === f + 1) cost -= 4;
    }
  }

  return Math.max(0, cost + blackKeyPenalty);
};

const detectAndApplyChromaticV22 = (notes: MidiNotePlaybackItem[], hand: HandType): boolean => {
  if (notes.length < 4) return false;
  for (let i = 1; i < notes.length; i++) {
    if (Math.abs(notes[i].midi - notes[i - 1].midi) !== 1) return false;
    const b1 = getNoteBeatPosition(notes[i - 1]);
    const b2 = getNoteBeatPosition(notes[i]);
    if (b2.startBeat - b1.startBeat > PATTERN_MAX_BEAT) return false;
  }

  const ascending = notes[notes.length - 1].midi > notes[0].midi;
  notes.forEach((note, idx) => {
    if (note.finger && note.finger >= 1 && note.finger <= 5) return;

    const pc = note.midi % 12;
    let f: Finger = 1;

    if (hand === 'right') {
      if (ascending) {
        if (isBlack(note.midi)) f = 3;
        else if (pc === 5 || pc === 0) f = (idx > 0 && notes[idx - 1].midi % 12 === (pc === 5 ? 4 : 11)) ? 2 : 1;
        else f = 1;
      } else {
        if (isBlack(note.midi)) f = 3;
        else if (pc === 4 || pc === 11) f = (idx > 0 && notes[idx - 1].midi % 12 === (pc === 4 ? 5 : 0)) ? 1 : 2;
        else f = 1;
      }
    } else {
      if (ascending) {
        if (isBlack(note.midi)) f = 3;
        else if (pc === 5 || pc === 0) f = (idx > 0 && notes[idx - 1].midi % 12 === (pc === 5 ? 4 : 11)) ? 1 : 2;
        else f = 1;
      } else {
        if (isBlack(note.midi)) f = 3;
        else if (pc === 4 || pc === 11) f = (idx > 0 && notes[idx - 1].midi % 12 === (pc === 4 ? 5 : 0)) ? 2 : 1;
        else f = 1;
      }
    }
    note.finger = f;
  });
  return true;
};

const getMultiOctaveScaleFingersV22 = (
  midis: number[],
  hand: HandType,
  tonicPc: number,
  isMinor: boolean
): Finger[] => {
  const table = isMinor ? MINOR_SCALE_TABLE : MAJOR_SCALE_TABLE;
  const config = table[tonicPc] || table[0];
  const n = midis.length;
  if (n === 8) {
    const ascending = midis[7] > midis[0];
    return hand === 'right'
      ? (ascending ? config.rhUp : config.rhDown)
      : (ascending ? config.lhUp : config.lhDown);
  }

  let peakIdx = 0;
  for (let i = 1; i < n; i++) {
    if (midis[i] > midis[peakIdx]) {
      peakIdx = i;
    }
  }

  const isArch = peakIdx > 0 && peakIdx < n - 1;
  const isAscending = !isArch && midis[n - 1] > midis[0];

  const pat = hand === 'right' ? config.rhUp.slice(0, 7) : config.lhUp.slice(0, 7);
  const topFinger = hand === 'right'
    ? (config.rhUp[7] || (tonicPc === 6 || tonicPc === 1 ? 2 : tonicPc === 8 || tonicPc === 3 ? 3 : tonicPc === 10 || tonicPc === 5 ? 4 : 5))
    : (config.lhUp[7] || 1);

  if (isArch) {
    const upCount = peakIdx + 1;
    const upFingers: Finger[] = [];
    for (let i = 0; i < upCount; i++) {
      if (i === upCount - 1) {
        upFingers.push(topFinger as Finger);
      } else {
        upFingers.push(pat[i % 7] as Finger);
      }
    }
    const downCount = n - upCount;
    const downFingers = [...upFingers.slice(0, upFingers.length - 1)].reverse().slice(0, downCount);
    while (downFingers.length < downCount) {
      downFingers.push(hand === 'right' ? 1 : 5);
    }
    return [...upFingers, ...downFingers];
  } else if (isAscending) {
    const fingers: Finger[] = [];
    for (let i = 0; i < n; i++) {
      if (i === n - 1) fingers.push(topFinger as Finger);
      else fingers.push(pat[i % 7] as Finger);
    }
    return fingers;
  } else {
    const patDown = hand === 'right' ? config.rhDown.slice(0, 7) : config.lhDown.slice(0, 7);
    const topF = hand === 'right' ? config.rhDown[0] : config.lhDown[0];
    const fingers: Finger[] = [];
    for (let i = 0; i < n; i++) {
      if (i === 0) fingers.push(topF as Finger);
      else fingers.push(patDown[(i - 1) % 7] as Finger);
    }
    return fingers;
  }
};

const detectAndApplyScaleV22 = (notes: MidiNotePlaybackItem[], hand: HandType): boolean => {
  if (notes.length < 5) return false;
  for (let i = 1; i < notes.length; i++) {
    const diff = Math.abs(notes[i].midi - notes[i - 1].midi);
    if (diff < 1 || diff > 2) return false;
    const b1 = getNoteBeatPosition(notes[i - 1]);
    const b2 = getNoteBeatPosition(notes[i]);
    if (b2.startBeat - b1.startBeat > PATTERN_MAX_BEAT) return false;
  }

  const n = notes.length;
  let minMidi = notes[0].midi;
  for (let i = 1; i < n; i++) {
    if (notes[i].midi < minMidi) minMidi = notes[i].midi;
  }
  const tonicPc = minMidi % 12;

  const isMinor = MINOR_SCALE_TABLE[tonicPc] !== undefined;
  const fingers = getMultiOctaveScaleFingersV22(notes.map(n => n.midi), hand, tonicPc, isMinor);
  notes.forEach((n, idx) => {
    if (!n.finger) n.finger = fingers[idx];
  });
  return true;
};

export const getArpeggioFingeringV22 = (
  midis: number[],
  hand: HandType
): Finger[] => {
  const n = midis.length;
  if (n === 13) {
    const m0 = midis[0];
    const m1 = midis[1];
    const m2 = midis[2];
    const gap01 = m1 - m0;
    const gap12 = m2 - m1;
    const firstWhite = isWhite(m0);
    const whiteCount = (isWhite(m0) ? 1 : 0) + (isWhite(m1) ? 1 : 0) + (isWhite(m2) ? 1 : 0);

    if (hand === 'right') {
      if (firstWhite || whiteCount === 0) {
        const use4 = (gap12 >= 5 || gap01 >= 5);
        const pat: Finger[] = [1, 2, use4 ? 4 : 3];
        const top: Finger = 5;
        const up = [pat[0], pat[1], pat[2], pat[0], pat[1], pat[2], top];
        const down = [pat[2], pat[1], pat[0], pat[2], pat[1], pat[0]];
        return [...up, ...down];
      } else {
        if (isWhite(m1)) {
          const f3: Finger = gap12 >= 4 ? 4 : 2;
          const up: Finger[] = [2, 1, f3, 2, 1, f3, 4];
          const down: Finger[] = [f3, 1, 2, f3, 1, 2];
          return [...up, ...down];
        } else {
          const up: Finger[] = [2, 3, 1, 2, 3, 1, 4];
          const down: Finger[] = [1, 3, 2, 1, 3, 2];
          return [...up, ...down];
        }
      }
    } else {
      if (firstWhite || whiteCount === 0) {
        const use3 = (gap01 >= 5 || (gap01 === 3 && gap12 === 4));
        const fMid: Finger = use3 ? 3 : 4;
        const up: Finger[] = [5, fMid, 2, 1, fMid, 2, 1];
        const down: Finger[] = [2, fMid, 1, 2, fMid, 5];
        return [...up, ...down];
      } else {
        if (isWhite(m1)) {
          const up: Finger[] = [2, 1, 4, 2, 1, 4, 2];
          const down: Finger[] = [4, 1, 2, 4, 1, 2];
          return [...up, ...down];
        } else {
          const up: Finger[] = [3, 2, 1, 3, 2, 1, 3];
          const down: Finger[] = [1, 2, 3, 1, 2, 3];
          return [...up, ...down];
        }
      }
    }
  } else if (n === 17) {
    const m0 = midis[0];
    const firstWhite = isWhite(m0);
    if (hand === 'right') {
      if (firstWhite) {
        const up: Finger[] = [1, 2, 3, 4, 1, 2, 3, 4, 5];
        const down: Finger[] = [4, 3, 2, 1, 4, 3, 2, 1];
        return [...up, ...down];
      } else {
        const up: Finger[] = [2, 1, 2, 3, 1, 2, 3, 4, 5];
        const down: Finger[] = [4, 3, 2, 1, 3, 2, 1, 2];
        return [...up, ...down];
      }
    } else {
      if (firstWhite) {
        const up: Finger[] = [5, 4, 3, 2, 1, 4, 3, 2, 1];
        const down: Finger[] = [2, 3, 4, 1, 2, 3, 4, 5];
        return [...up, ...down];
      } else {
        const up: Finger[] = [3, 2, 1, 4, 3, 2, 1, 4, 2];
        const down: Finger[] = [4, 1, 2, 3, 4, 1, 2, 3];
        return [...up, ...down];
      }
    }
  } else if (n === 7) {
    return hand === 'right' ? [1, 2, 3, 5, 3, 2, 1] : [5, 4, 2, 1, 2, 4, 5];
  } else if (n === 9) {
    return hand === 'right' ? [1, 2, 3, 4, 5, 4, 3, 2, 1] : [5, 4, 3, 2, 1, 2, 3, 4, 5];
  }
  return midis.map((_, i) => (hand === 'right' ? (Math.min(5, (i % 5) + 1) as Finger) : (Math.max(1, 5 - (i % 5)) as Finger)));
};

const detectAndApplyArpeggioV22 = (notes: MidiNotePlaybackItem[], hand: HandType): boolean => {
  if (notes.length < 5) return false;
  for (let i = 1; i < notes.length; i++) {
    const diff = Math.abs(notes[i].midi - notes[i - 1].midi);
    if (diff < 3 || diff > 7) return false;
    const b1 = getNoteBeatPosition(notes[i - 1]);
    const b2 = getNoteBeatPosition(notes[i]);
    if (b2.startBeat - b1.startBeat > PATTERN_MAX_BEAT) return false;
  }

  const midis = notes.map(n => n.midi);
  const fingers = getArpeggioFingeringV22(midis, hand);
  notes.forEach((n, idx) => {
    if (!n.finger) n.finger = fingers[idx];
  });
  return true;
};

// ==================================================================================
// F2, G2, H2. ATURAN FINGERING CHORD DETERMINISTIK V2.7
// ==================================================================================
export const assignDeterministicChordFingeringV22 = (
  chord: MidiNotePlaybackItem[],
  hand: HandType,
  lastChord?: MidiNotePlaybackItem[] | null
) => {
  chord.sort((a, b) => a.midi - b.midi);
  const n = chord.length;
  if (n === 0) return;
  if (n === 1) {
    if (!chord[0].finger) chord[0].finger = hand === 'right' ? 1 : 5;
    return;
  }

  const rootMidi = chord[0].midi;
  const span = chord[n - 1].midi - rootMidi;
  let pattern: Finger[] = [];

  // F2. CHORD 2 NADA
  if (n === 2) {
    const isPureThird = span === 3 || span === 4;
    const prevChordSorted = lastChord && lastChord.length >= 2
      ? [...lastChord].sort((a, b) => a.midi - b.midi)
      : null;

    if (hand === 'right') {
      const prevRoot = prevChordSorted ? prevChordSorted[0].midi : null;
      const pitchDiff = prevRoot !== null ? rootMidi - prevRoot : 999;
      const isStepping = Math.abs(pitchDiff) === 1 || Math.abs(pitchDiff) === 2;

      // HANYA jika tangga terts murni yang melangkah: toggle [1,3] <-> [2,4]
      if (isPureThird && isStepping && prevChordSorted) {
        if (pitchDiff < 0) {
          // Turun: selalu 1-3
          pattern = [1, 3];
        } else {
          // Naik: toggle 1-3 <-> 2-4
          const wasPrev13 = prevChordSorted[0].finger === 1 && prevChordSorted[1].finger === 3;
          pattern = wasPrev13 ? [2, 4] : [1, 3];
        }
      }
      // JIKA REPETISI DI TEMPAT SAMA (kedua nada sama): pertahankan fingering stabil
      else if (pitchDiff === 0 && prevChordSorted && prevChordSorted.length === 2 && chord[1].midi === prevChordSorted[1].midi) {
        pattern = [prevChordSorted[0].finger || 1, prevChordSorted[1].finger || 3];
      }
      // DILUAR ITU: 100% KEMBALI KE ATURAN STANDAR V2.2 (Bas/Lompatan lebar = selalu pakai jempol 1)
      else if (span <= 2) {
        pattern = [1, 2];
      } else if (span <= 4) {
        pattern = [1, 3];
      } else if (span <= 6) {
        pattern = [1, 4];
      } else {
        pattern = [1, 5];
      }
    } else {
      // Tangan Kiri (LH)
      const prevRoot = prevChordSorted ? prevChordSorted[0].midi : null;
      const pitchDiff = prevRoot !== null ? rootMidi - prevRoot : 999;
      const isStepping = Math.abs(pitchDiff) === 1 || Math.abs(pitchDiff) === 2;

      if (isPureThird && isStepping && prevChordSorted) {
        pattern = [3, 1];
      } else if (pitchDiff === 0 && prevChordSorted && prevChordSorted.length === 2 && chord[1].midi === prevChordSorted[1].midi) {
        pattern = [prevChordSorted[0].finger || 3, prevChordSorted[1].finger || 1];
      } else if (span <= 2) {
        pattern = [2, 1];
      } else if (span <= 4) {
        pattern = [3, 1];
      } else if (span <= 6) {
        pattern = [4, 1];
      } else {
        pattern = [5, 1];
      }
    }
  }
  // G2. CHORD 3 NADA
  else if (n === 3) {
    const i1 = chord[1].midi - rootMidi;
    const i2 = chord[2].midi - rootMidi;

    if (i1 === 4 && i2 === 7) pattern = hand === 'right' ? [1, 3, 5] : [5, 3, 1];
    else if (i1 === 3 && i2 === 7) pattern = hand === 'right' ? [1, 3, 5] : [5, 3, 1];
    else if (i1 === 4 && i2 === 8) pattern = hand === 'right' ? [1, 3, 5] : [5, 3, 1]; // Augmented Triad Root
    else if (i1 === 3 && i2 === 6) pattern = hand === 'right' ? [1, 3, 5] : [5, 3, 1]; // Diminished Triad Root
    else if (i1 === 3 && i2 === 8) pattern = hand === 'right' ? [1, 2, 5] : [5, 3, 1]; // Major 1st Inv
    else if (i1 === 4 && i2 === 9) pattern = hand === 'right' ? [1, 2, 5] : [5, 3, 1]; // Minor 1st Inv
    else if (i1 === 5 && i2 === 9) pattern = hand === 'right' ? [1, 3, 5] : [5, 2, 1]; // Major 2nd Inv
    else if (i1 === 5 && i2 === 8) pattern = hand === 'right' ? [1, 3, 5] : [5, 2, 1]; // Minor 2nd Inv
    else {
      if (span > 11) pattern = hand === 'right' ? [1, 2, 5] : [5, 2, 1];
      else if (i1 >= 5) pattern = hand === 'right' ? [1, 3, 5] : [5, 2, 1];
      else if ((i2 - i1) >= 5) pattern = hand === 'right' ? [1, 2, 5] : [5, 3, 1];
      else pattern = hand === 'right' ? [1, 3, 5] : [5, 3, 1];
    }
  }
  // H2. CHORD 4 NADA
  else if (n === 4) {
    const gap01 = chord[1].midi - chord[0].midi;
    const gap12 = chord[2].midi - chord[1].midi;
    const gap23 = chord[3].midi - chord[2].midi;

    if (hand === 'right') {
      if (gap23 <= 3 && gap12 >= 3) pattern = [1, 2, 4, 5];
      else if (gap23 <= 2) pattern = [1, 2, 4, 5];
      else if (gap01 <= 3 && gap12 >= 4) pattern = [1, 2, 4, 5];
      else if (gap23 < gap12 && gap23 <= 4) pattern = [1, 2, 4, 5];
      else pattern = [1, 2, 3, 5];
    } else {
      if (gap01 <= 3 && gap12 >= 3) pattern = [5, 4, 2, 1];
      else if (gap01 <= 2) pattern = [5, 4, 2, 1];
      else if (gap23 <= 3 && gap12 >= 4) pattern = [5, 4, 2, 1];
      else if (gap01 < gap12 && gap01 <= 4) pattern = [5, 4, 2, 1];
      else pattern = [5, 3, 2, 1];
    }
  } else {
    pattern = hand === 'right' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
  }

  chord.forEach((note, idx) => {
    if (!note.finger) {
      note.finger = pattern[idx] || (hand === 'right' ? (Math.min(5, idx + 1) as Finger) : (Math.max(1, 5 - idx) as Finger));
    }
  });

  if (hand === 'right') {
    for (let idx = 1; idx < chord.length; idx++) {
      if (chord[idx].finger! <= chord[idx - 1].finger!) {
        chord[idx].finger = Math.min(5, chord[idx - 1].finger! + 1) as Finger;
      }
    }
  } else {
    for (let idx = 1; idx < chord.length; idx++) {
      if (chord[idx].finger! >= chord[idx - 1].finger!) {
        chord[idx].finger = Math.max(1, chord[idx - 1].finger! - 1) as Finger;
      }
    }
  }
};

// ==================================================================================
// SUB-SEQUENCE PATTERN DETECTORS (SCALES, CHROMATICS, BROKEN CHORDS)
// ==================================================================================

/**
 * Detects broken chord / Alberti bass / ostinato accompaniment patterns in single-line notes.
 * Keeps consistent hand-frame fingers based on chord voicing rather than isolated hopping.
 */
const applyBrokenChordSubPatterns = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  const n = notes.length;
  let i = 0;

  while (i < n - 4) {
    let j = i;
    const pitchSet = new Set<number>();
    let minPitch = notes[i].midi;
    let maxPitch = notes[i].midi;

    while (j < n) {
      const midi = notes[j].midi;
      const nextMin = Math.min(minPitch, midi);
      const nextMax = Math.max(maxPitch, midi);
      if (nextMax - nextMin > 16) break;

      const testSet = new Set(pitchSet);
      testSet.add(midi);
      if (testSet.size > 4) break;

      if (j > i) {
        const b1 = getNoteBeatPosition(notes[j - 1]);
        const b2 = getNoteBeatPosition(notes[j]);
        if (b2.startBeat - b1.startBeat > 1.5) break;
      }

      pitchSet.add(midi);
      minPitch = nextMin;
      maxPitch = nextMax;
      j++;
    }

    const windowLen = j - i;
    if (windowLen >= 5 && pitchSet.size >= 2 && pitchSet.size <= 4) {
      const sortedPitches = Array.from(pitchSet).sort((a, b) => a - b);
      const numPitches = sortedPitches.length;
      const pitchToFinger = new Map<number, Finger>();

      if (numPitches === 2) {
        const span = sortedPitches[1] - sortedPitches[0];
        if (span <= 2) {
          // Trill between 2 adjacent notes: ALWAYS 2 and 3!
          if (hand === 'right') {
            pitchToFinger.set(sortedPitches[0], 2);
            pitchToFinger.set(sortedPitches[1], 3);
          } else {
            pitchToFinger.set(sortedPitches[0], 3);
            pitchToFinger.set(sortedPitches[1], 2);
          }
        } else {
          if (hand === 'right') {
            pitchToFinger.set(sortedPitches[0], 1);
            pitchToFinger.set(sortedPitches[1], span >= 7 ? 5 : 3);
          } else {
            pitchToFinger.set(sortedPitches[0], span >= 7 ? 5 : 3);
            pitchToFinger.set(sortedPitches[1], 1);
          }
        }
      } else if (numPitches === 3) {
        const root = sortedPitches[0];
        const i1 = sortedPitches[1] - root;
        const i2 = sortedPitches[2] - root;

        let pat: Finger[] = [];
        if (hand === 'right') {
          if (i1 <= 4 && (i2 - i1) >= 5) pat = [1, 2, 5];
          else if (i1 >= 5) pat = [1, 3, 5];
          else pat = (i2 - i1 >= 5) ? [1, 2, 5] : [1, 3, 5];
        } else {
          if (i1 >= 5) pat = [5, 2, 1];
          else if (i1 <= 4 && (i2 - i1) >= 5) pat = [5, 3, 1];
          else pat = [5, 3, 1];
        }
        sortedPitches.forEach((p, idx) => pitchToFinger.set(p, pat[idx]));
      } else if (numPitches === 4) {
        // 4-note accompaniment (lowest=1, mid-low=2, mid-high=3, highest=4)
        // Order: lowest(1) -> mid-low(2) -> highest(4) -> mid-high(3) -> 1 - 2 - 4 - 3 - 1 - 2 - 4 - 3
        let pat: Finger[] = [];
        if (hand === 'right') {
          pat = [1, 2, 3, 4];
        } else {
          pat = [4, 3, 2, 1];
        }
        sortedPitches.forEach((p, idx) => pitchToFinger.set(p, pat[idx]));
      }

      for (let k = i; k < j; k++) {
        if (!notes[k].finger) {
          const f = pitchToFinger.get(notes[k].midi);
          if (f) notes[k].finger = f;
        }
      }
      i = j;
    } else {
      i++;
    }
  }
};

/**
 * Detects contiguous chromatic runs and assigns standard classical chromatic fingering
 * (Black keys = 3, White keys = 1, with 1-2 or 2-1 on adjacent white keys).
 */
const applyChromaticSubRuns = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  const n = notes.length;
  let i = 0;
  while (i < n - 3) {
    let j = i;
    while (j < n - 1) {
      const diff = notes[j + 1].midi - notes[j].midi;
      if (Math.abs(diff) !== 1) break;
      const b1 = getNoteBeatPosition(notes[j]);
      const b2 = getNoteBeatPosition(notes[j + 1]);
      if (b2.startBeat - b1.startBeat > 1.0) break;
      j++;
    }

    const runLength = j - i + 1;
    if (runLength >= 4) {
      const isAsc = notes[j].midi > notes[i].midi;
      for (let k = i; k <= j; k++) {
        if (notes[k].finger) continue;
        const midi = notes[k].midi;
        const pc = midi % 12;

        if (isBlack(midi)) {
          notes[k].finger = 3;
        } else {
          if (hand === 'right') {
            if (isAsc) {
              if ((pc === 5 && k > i && notes[k - 1].midi % 12 === 4) ||
                  (pc === 0 && k > i && notes[k - 1].midi % 12 === 11)) {
                notes[k].finger = 2;
              } else {
                notes[k].finger = 1;
              }
            } else {
              if ((pc === 4 && k < j && notes[k + 1].midi % 12 === 5) ||
                  (pc === 11 && k < j && notes[k + 1].midi % 12 === 0)) {
                notes[k].finger = 1;
              } else if (pc === 5 || pc === 0) {
                notes[k].finger = 2;
              } else {
                notes[k].finger = 1;
              }
            }
          } else {
            if (isAsc) {
              if ((pc === 11 && k < j && notes[k + 1].midi % 12 === 0) ||
                  (pc === 4 && k < j && notes[k + 1].midi % 12 === 5)) {
                notes[k].finger = 2;
              } else {
                notes[k].finger = 1;
              }
            } else {
              if ((pc === 11 && k > i && notes[k - 1].midi % 12 === 0) ||
                  (pc === 4 && k > i && notes[k - 1].midi % 12 === 5)) {
                notes[k].finger = 2;
              } else {
                notes[k].finger = 1;
              }
            }
          }
        }
      }
      i = j + 1;
    } else {
      i++;
    }
  }
};

/**
 * Detects contiguous monotonic scale runs (ascending or descending) and applies
 * classical scale fingering with proper thumb-tuck and finger crossing (never 1-2-1-2 loop).
 */
const applyScaleSubRuns = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  const n = notes.length;
  let i = 0;
  while (i < n - 3) {
    const firstDiff = notes[i + 1].midi - notes[i].midi;
    if (Math.abs(firstDiff) < 1 || Math.abs(firstDiff) > 2) {
      i++;
      continue;
    }
    const isAscending = firstDiff > 0;

    let j = i;
    while (j < n - 1) {
      const step = notes[j + 1].midi - notes[j].midi;
      if (isAscending && (step < 1 || step > 2)) break;
      if (!isAscending && (step > -1 || step < -2)) break;
      const b1 = getNoteBeatPosition(notes[j]);
      const b2 = getNoteBeatPosition(notes[j + 1]);
      if (b2.startBeat - b1.startBeat > 1.25) break;
      j++;
    }

    const runLength = j - i + 1;
    if (runLength >= 4) {
      const subNotes = notes.slice(i, j + 1);
      const fingers: Finger[] = new Array(runLength);

      if (hand === 'right') {
        if (isAscending) {
          const startIsBlack = isBlack(subNotes[0].midi);
          let f = startIsBlack ? 2 : 1;
          for (let k = 0; k < runLength; k++) {
            fingers[k] = f as Finger;
            if (k === runLength - 1) break;
            if (f === 3) {
              const nextIsBlack = isBlack(subNotes[k + 1].midi);
              f = nextIsBlack ? 4 : 1;
            } else if (f === 4 || f === 5) {
              f = 1;
            } else {
              f = f + 1;
            }
          }
        } else {
          // Right Hand Descending (e.g. 5, 4, 3, 2, 1 -> cross 3 or 4 -> 3, 2, 1)
          const topIsBlack = isBlack(subNotes[0].midi);
          let f = topIsBlack ? 4 : 5;
          if (runLength === 4 && !topIsBlack) f = 4;
          if (runLength === 3 && !topIsBlack) f = 3;

          for (let k = 0; k < runLength; k++) {
            fingers[k] = f as Finger;
            if (k === runLength - 1) break;
            if (f === 1) {
              const remaining = runLength - (k + 1);
              if (remaining <= 3) {
                f = 3;
              } else {
                const noteAfter3 = (k + 3 < runLength) ? subNotes[k + 3].midi : null;
                f = (noteAfter3 !== null && isBlack(noteAfter3)) ? 4 : 3;
              }
            } else {
              f = f - 1;
            }
          }
        }
      } else {
        // Left hand
        if (isAscending) {
          const bottomIsBlack = isBlack(subNotes[0].midi);
          let f = bottomIsBlack ? 4 : 5;
          if (runLength === 4 && !bottomIsBlack) f = 4;
          if (runLength === 3 && !bottomIsBlack) f = 3;

          for (let k = 0; k < runLength; k++) {
            fingers[k] = f as Finger;
            if (k === runLength - 1) break;
            if (f === 1) {
              const remaining = runLength - (k + 1);
              f = remaining <= 3 ? 3 : 4;
            } else {
              f = f - 1;
            }
          }
        } else {
          const topIsBlack = isBlack(subNotes[0].midi);
          let f = topIsBlack ? 2 : 1;
          for (let k = 0; k < runLength; k++) {
            fingers[k] = f as Finger;
            if (k === runLength - 1) break;
            if (f === 3) {
              const nextIsBlack = isBlack(subNotes[k + 1].midi);
              f = nextIsBlack ? 4 : 1;
            } else if (f >= 4) {
              f = 1;
            } else {
              f = f + 1;
            }
          }
        }
      }

      for (let k = 0; k < runLength; k++) {
        if (!subNotes[k].finger) {
          subNotes[k].finger = fingers[k];
        }
      }
      i = j + 1;
    } else {
      i++;
    }
  }
};

/**
 * Detects trills (rapid oscillation between two notes separated by 1 or 2 semitones)
 * and strictly assigns standard classical piano fingering: 2 - 3 - 2 - 3 - 2 - 3.
 */
const applyTrillSubPatterns = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  const n = notes.length;
  let i = 0;

  while (i < n - 3) {
    const p1 = notes[i].midi;
    const p2 = notes[i + 1].midi;
    const diff = Math.abs(p2 - p1);

    // Trill must be between two notes separated by 1 or 2 semitones
    if (diff < 1 || diff > 2) {
      i++;
      continue;
    }

    let j = i;
    while (j < n - 1) {
      const curr = notes[j].midi;
      const next = notes[j + 1].midi;
      if (curr === p1 && next !== p2) break;
      if (curr === p2 && next !== p1) break;

      const b1 = getNoteBeatPosition(notes[j]);
      const b2 = getNoteBeatPosition(notes[j + 1]);
      if (b2.startBeat - b1.startBeat > 0.8) break;
      j++;
    }

    const trillLen = j - i + 1;
    if (trillLen >= 4) {
      const lowerPitch = Math.min(p1, p2);
      const lowFinger: Finger = hand === 'right' ? 2 : 3;
      const highFinger: Finger = hand === 'right' ? 3 : 2;

      for (let k = i; k <= j; k++) {
        notes[k].finger = notes[k].midi === lowerPitch ? lowFinger : highFinger;
      }
      i = j + 1;
    } else {
      i++;
    }
  }
};

// ==================================================================================
// VITERBI DP
// ==================================================================================
interface ViterbiState {
  cost: number;
  prevFinger: Finger | null;
}

const computeViterbiMelodicV22 = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  const n = notes.length;
  if (n === 0) return;
  if (n === 1) {
    if (!notes[0].finger) notes[0].finger = hand === 'right' ? 1 : 5;
    return;
  }

  // 1. Pre-detect and lock in Trills (strictly 2 - 3 - 2 - 3 - 2 - 3)
  applyTrillSubPatterns(notes, hand);

  // 2. Pre-detect and lock in Broken Chords / Accompaniment ostinatos (1 - 2 - 4 - 3 - 1 - 2 - 4 - 3)
  applyBrokenChordSubPatterns(notes, hand);

  // 3. Pre-detect and lock in Chromatic runs
  applyChromaticSubRuns(notes, hand);

  // 4. Pre-detect and lock in Scale runs
  applyScaleSubRuns(notes, hand);

  // If every note has already been deterministically assigned by pattern rules, return immediately!
  if (notes.every(n => n.finger && n.finger >= 1 && n.finger <= 5)) return;

  if (detectAndApplyChromaticV22(notes, hand)) return;
  if (detectAndApplyScaleV22(notes, hand)) return;
  if (detectAndApplyArpeggioV22(notes, hand)) return;

  if (n > MAX_VITERBI_CHUNK_SIZE) {
    for (let start = 0; start < n; start += MAX_VITERBI_CHUNK_SIZE) {
      const end = Math.min(n, start + MAX_VITERBI_CHUNK_SIZE);
      const subNotes = notes.slice(start, end);
      computeViterbiMelodicV22(subNotes, hand);
    }
    return;
  }

  const dp: ViterbiState[][][] = new Array(n);
  for (let idx = 0; idx < n; idx++) {
    dp[idx] = new Array(6);
    for (let cf = 1; cf <= 5; cf++) {
      dp[idx][cf] = new Array(6);
      for (let pf = 1; pf <= 5; pf++) {
        dp[idx][cf][pf] = { cost: Infinity, prevFinger: null };
      }
    }
  }

  const hasNext = n > 1;
  const initialTrend = hasNext ? notes[1].midi - notes[0].midi : 0;

  for (let f = 1; f <= 5; f++) {
    if (notes[0].finger && f !== notes[0].finger) continue;
    let startCost = 0;

    if (hand === 'right') {
      if (initialTrend > 0) {
        startCost += (f === 1 || f === 2) ? 0 : (f - 2) * 2;
      } else if (initialTrend < 0) {
        startCost += (f >= 3) ? 0 : (3 - f) * 3;
      } else {
        startCost += Math.abs(f - 1);
      }
    } else {
      if (initialTrend > 0) {
        startCost += (f >= 3) ? 0 : (3 - f) * 3;
      } else if (initialTrend < 0) {
        startCost += (f === 1 || f === 2) ? 0 : (f - 2) * 2;
      } else {
        startCost += Math.abs(f - 5);
      }
    }

    if (f === 1 && isBlack(notes[0].midi)) startCost += 6;
    if (f === 2 && isBlack(notes[0].midi)) startCost -= 2;
    for (let dummyP = 1; dummyP <= 5; dummyP++) {
      dp[0][f][dummyP] = { cost: Math.max(0, startCost), prevFinger: null };
    }
  }

  for (let idx = 1; idx < n; idx++) {
    const currNote = notes[idx];
    const prevNote = notes[idx - 1];
    const nextNote = (idx < n - 1) ? notes[idx + 1] : null;
    const prevPrevNote = (idx > 1) ? notes[idx - 2] : null;

    const prevB = getNoteBeatPosition(prevNote);
    const currB = getNoteBeatPosition(currNote);
    const isOccupied = currB.startBeat < (prevB.startBeat + prevB.durationBeat) && prevB.durationBeat > 0.15;

    for (let cf = 1; cf <= 5; cf++) {
      if (currNote.finger && cf !== currNote.finger) continue;

      for (let pf = 1; pf <= 5; pf++) {
        if (prevNote.finger && pf !== prevNote.finger) continue;

        let minCost = Infinity;
        let bestPPF: Finger | null = null;

        for (let ppf = 1; ppf <= 5; ppf++) {
          const prevState = dp[idx - 1][pf][ppf];
          if (prevState.cost >= Infinity) continue;

          const transCost = calculateDeterministicCostV22({
            hand,
            prevNote,
            currNote,
            nextNote,
            prevPrevNote,
            prevPrevFinger: (idx > 1) ? (ppf as Finger) : null,
            prevFinger: pf as Finger,
            currFinger: cf as Finger,
            isFingerOccupied: isOccupied
          });

          const total = prevState.cost + transCost;
          if (total < minCost) {
            minCost = total;
            bestPPF = ppf as Finger;
          }
        }

        dp[idx][cf][pf] = { cost: minCost, prevFinger: bestPPF };
      }
    }
  }

  let minTermCost = Infinity;
  let lastCF: Finger = (hand === 'right' ? 5 : 1);
  let lastPF: Finger = (hand === 'right' ? 1 : 5);

  for (let cf = 1; cf <= 5; cf++) {
    if (notes[n - 1].finger && cf !== notes[n - 1].finger) continue;
    for (let pf = 1; pf <= 5; pf++) {
      if (dp[n - 1][cf][pf].cost < minTermCost) {
        minTermCost = dp[n - 1][cf][pf].cost;
        lastCF = cf as Finger;
        lastPF = pf as Finger;
      }
    }
  }

  if (notes[n - 1] && !notes[n - 1].finger) notes[n - 1].finger = lastCF;
  if (n > 1 && notes[n - 2] && !notes[n - 2].finger) notes[n - 2].finger = lastPF;

  let curI = n - 1;
  let cF = lastCF;
  let pF = lastPF;

  while (curI >= 2) {
    const ppf = dp[curI][cF][pF].prevFinger;
    if (!ppf) break;
    if (!notes[curI - 2].finger) notes[curI - 2].finger = ppf;
    cF = pF;
    pF = ppf;
    curI--;
  }

  for (let k = 0; k < n; k++) {
    if (!notes[k].finger) {
      if (k === 0) {
        notes[k].finger = hand === 'right' ? 1 : 5;
      } else {
        const prevF = notes[k - 1].finger || (hand === 'right' ? 1 : 5);
        const diff = notes[k].midi - notes[k - 1].midi;
        if (hand === 'right') {
          if (diff > 0) {
            notes[k].finger = (prevF < 5 ? (prevF + 1) : 1) as Finger;
          } else if (diff < 0) {
            notes[k].finger = (prevF > 1 ? (prevF - 1) : 3) as Finger;
          } else {
            notes[k].finger = prevF;
          }
        } else {
          if (diff > 0) {
            notes[k].finger = (prevF > 1 ? (prevF - 1) : 3) as Finger;
          } else if (diff < 0) {
            notes[k].finger = (prevF < 5 ? (prevF + 1) : 1) as Finger;
          } else {
            notes[k].finger = prevF;
          }
        }
      }
    }
  }
};

// ==================================================================================
// SEGMENTASI DAN EKSEKUSI PER TANGAN
// ==================================================================================
const processHandEventsV22 = (rawHandNotes: MidiNotePlaybackItem[], hand: HandType) => {
  if (rawHandNotes.length === 0) return;

  // Pre-detect all trills in the hand to lock in 2-3-2-3-2-3
  applyTrillSubPatterns(rawHandNotes, hand);

  const uniqueNotes: MidiNotePlaybackItem[] = [];
  const activePitchMap = new Map<number, number>();

  for (const n of rawHandNotes) {
    const beatPos = getNoteBeatPosition(n);
    const lastBeat = activePitchMap.get(n.midi);
    if (lastBeat !== undefined && Math.abs(beatPos.startBeat - lastBeat) <= CHORD_MAX_BEAT) {
      continue;
    }
    activePitchMap.set(n.midi, beatPos.startBeat);
    uniqueNotes.push(n);
  }

  // Group uniqueNotes into chronological events (single notes vs simultaneous chords)
  const events: MidiNotePlaybackItem[][] = [];
  let i = 0;
  while (i < uniqueNotes.length) {
    const currentNote = uniqueNotes[i];
    const currBeat = getNoteBeatPosition(currentNote);
    const chordGroup: MidiNotePlaybackItem[] = [currentNote];
    let j = i + 1;

    while (j < uniqueNotes.length) {
      const nextBeat = getNoteBeatPosition(uniqueNotes[j]);
      if (Math.abs(nextBeat.startBeat - currBeat.startBeat) <= CHORD_MAX_BEAT) {
        chordGroup.push(uniqueNotes[j++]);
      } else {
        break;
      }
    }
    chordGroup.sort((a, b) => a.midi - b.midi);
    events.push(chordGroup);
    i = j;
  }

  // Helper: detect if a 1-note event is a fast thumb-pivot partner for a 2-note dyad
  // (e.g. Chopin Ballade No. 3 Coda: rapid alternating thumb 1 on lower note + 3-5 on upper dyad)
  const isFastThumbPivotForDyad = (
    singleEvent: MidiNotePlaybackItem[] | undefined,
    dyadEvent: MidiNotePlaybackItem[]
  ): boolean => {
    if (!singleEvent || singleEvent.length !== 1 || dyadEvent.length !== 2) return false;
    const singleNote = singleEvent[0];
    const lowNote = dyadEvent[0];
    const highNote = dyadEvent[1];
    const span = highNote.midi - lowNote.midi;
    if (span < 1 || span > 9) return false;

    const singleBeat = getNoteBeatPosition(singleNote);
    const dyadBeat = getNoteBeatPosition(lowNote);
    const beatDelta = Math.abs(dyadBeat.startBeat - singleBeat.startBeat);
    const ioiMs = Math.abs((lowNote.timeMs || 0) - (singleNote.timeMs || 0));
    const isFast = beatDelta <= EIGHTH_NOTE_BEAT || ioiMs <= 300;
    if (!isFast) return false;

    if (hand === 'right') {
      // Single note must be strictly below the dyad and within an extended hand frame
      return singleNote.midi < lowNote.midi && (highNote.midi - singleNote.midi) <= 16;
    } else {
      // Mirror for Left Hand: single note strictly above the dyad (thumb 1)
      return singleNote.midi > highNote.midi && (singleNote.midi - lowNote.midi) <= 16;
    }
  };

  const melodicSegments: MidiNotePlaybackItem[][] = [];
  let currentMelodicSegment: MidiNotePlaybackItem[] = [];
  let lastAssignedChord: MidiNotePlaybackItem[] | null = null;

  for (let eIdx = 0; eIdx < events.length; eIdx++) {
    const chordGroup = events[eIdx];

    if (chordGroup.length > 1) {
      if (currentMelodicSegment.length > 0) {
        melodicSegments.push(currentMelodicSegment);
        currentMelodicSegment = [];
      }

      const prevEvent = eIdx > 0 ? events[eIdx - 1] : undefined;
      const nextEvent = eIdx + 1 < events.length ? events[eIdx + 1] : undefined;
      const hasFastPrevPivot = isFastThumbPivotForDyad(prevEvent, chordGroup);
      const hasFastNextPivot = isFastThumbPivotForDyad(nextEvent, chordGroup);

      if (chordGroup.length === 2 && (hasFastPrevPivot || hasFastNextPivot)) {
        if (hand === 'right') {
          if (!chordGroup[0].finger) chordGroup[0].finger = 3;
          if (!chordGroup[1].finger) chordGroup[1].finger = 5;
        } else {
          if (!chordGroup[0].finger) chordGroup[0].finger = 5;
          if (!chordGroup[1].finger) chordGroup[1].finger = 3;
        }
        if (hasFastPrevPivot && prevEvent && !prevEvent[0].finger) {
          prevEvent[0].finger = 1;
        }
        if (hasFastNextPivot && nextEvent && !nextEvent[0].finger) {
          nextEvent[0].finger = 1;
        }
        lastAssignedChord = null;
      } else {
        assignDeterministicChordFingeringV22(chordGroup, hand, lastAssignedChord);
        lastAssignedChord = chordGroup;
      }
    } else {
      const currentNote = chordGroup[0];
      const currBeat = getNoteBeatPosition(currentNote);

      if (currentMelodicSegment.length > 0) {
        const lastNote = currentMelodicSegment[currentMelodicSegment.length - 1];
        const lastB = getNoteBeatPosition(lastNote);
        const restGapBeat = currBeat.startBeat - (lastB.startBeat + lastB.durationBeat);
        if (restGapBeat >= SOFT_RESET_REST_BEAT || currentMelodicSegment.length >= MAX_VITERBI_CHUNK_SIZE) {
          melodicSegments.push(currentMelodicSegment);
          currentMelodicSegment = [];
        }
      }
      currentMelodicSegment.push(currentNote);
    }
  }

  if (currentMelodicSegment.length > 0) {
    melodicSegments.push(currentMelodicSegment);
  }

  for (const segment of melodicSegments) {
    if (segment.length > 0) {
      if (segment.every(n => n.finger && n.finger >= 1 && n.finger <= 5)) {
        continue;
      }
      computeViterbiMelodicV22(segment, hand);
    }
  }
};

// ==================================================================================
// FUNGSI UTAMA
// ==================================================================================

/**
 * Sanitizes chords and overlapping clusters in a single hand to ensure
 * strictly monotonic, anatomically valid finger assignments.
 * In Right Hand: pitch increases -> fingers MUST strictly increase (e.g. 1, 2, 3, 5; never 1, 3, 5, 1).
 * In Left Hand: pitch increases -> fingers MUST strictly decrease (e.g. 5, 3, 2, 1).
 */
export const sanitizeHandChordClusters = (notes: MidiNotePlaybackItem[], hand: HandType) => {
  if (notes.length < 2) return;
  const sorted = [...notes].sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);
  const n = sorted.length;
  let i = 0;

  while (i < n) {
    const curr = sorted[i];
    const currBeat = getNoteBeatPosition(curr);
    const group = [curr];
    let j = i + 1;

    while (j < n) {
      const nextN = sorted[j];
      if (group.some(g => g.midi === nextN.midi)) {
        break;
      }
      const nextBeat = getNoteBeatPosition(nextN);
      const beatDiff = Math.abs(nextBeat.startBeat - currBeat.startBeat);
      const timeDiff = Math.abs(nextN.timeMs - curr.timeMs);
      const isSimultaneous = (curr.ticks !== undefined && nextN.ticks !== undefined)
        ? beatDiff <= CHORD_MAX_BEAT
        : timeDiff <= 60;
      if (isSimultaneous) {
        group.push(nextN);
        j++;
      } else {
        break;
      }
    }

    if (group.length >= 2) {
      group.sort((a, b) => a.midi - b.midi);
      let isInvalid = false;

      if (hand === 'right') {
        for (let k = 1; k < group.length; k++) {
          if ((group[k].finger || 0) <= (group[k - 1].finger || 0)) {
            isInvalid = true;
            break;
          }
        }
        if (isInvalid) {
          const L = group.length;
          let pat: Finger[] = [];
          if (L === 2) {
            pat = (group[1].midi - group[0].midi >= 7) ? [1, 5] : [1, 3];
          } else if (L === 3) {
            pat = (group[2].midi - group[1].midi >= 5) ? [1, 2, 5] : [1, 3, 5];
          } else if (L === 4) {
            const gap23 = group[3].midi - group[2].midi;
            const gap12 = group[2].midi - group[1].midi;
            pat = (gap23 <= 3 && gap12 >= 3) ? [1, 2, 4, 5] : [1, 2, 3, 5];
          } else {
            pat = [1, 2, 3, 4, 5].slice(0, L) as Finger[];
          }
          group.forEach((gn, idx) => {
            gn.finger = pat[idx];
          });
        }
      } else {
        for (let k = 1; k < group.length; k++) {
          if ((group[k].finger || 6) >= (group[k - 1].finger || 6)) {
            isInvalid = true;
            break;
          }
        }
        if (isInvalid) {
          const L = group.length;
          let pat: Finger[] = [];
          if (L === 2) {
            pat = (group[1].midi - group[0].midi >= 7) ? [5, 1] : [3, 1];
          } else if (L === 3) {
            pat = (group[1].midi - group[0].midi >= 5) ? [5, 2, 1] : [5, 3, 1];
          } else if (L === 4) {
            const gap01 = group[1].midi - group[0].midi;
            const gap12 = group[2].midi - group[1].midi;
            pat = (gap01 <= 3 && gap12 >= 3) ? [5, 4, 2, 1] : [5, 3, 2, 1];
          } else {
            pat = [5, 4, 3, 2, 1].slice(0, L) as Finger[];
          }
          group.forEach((gn, idx) => {
            gn.finger = pat[idx];
          });
        }
      }
      i = j;
    } else {
      i++;
    }
  }
};

export const assignFingering = (notes: MidiNotePlaybackItem[]): MidiNotePlaybackItem[] => {
  if (notes.length === 0) return notes;
  if (notes.every(n => n.finger && n.finger >= 1 && n.finger <= 5)) {
    return notes.map(n => ({ ...n }));
  }

  const processedNotes = notes.map(n => ({ ...n }));

  const rightHandNotes = processedNotes
    .filter(n => n.hand === 'right')
    .sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

  const leftHandNotes = processedNotes
    .filter(n => n.hand === 'left')
    .sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

  const otherNotes = processedNotes.filter(n => n.hand !== 'right' && n.hand !== 'left');
  for (const n of otherNotes) {
    if (n.midi >= 60) {
      n.hand = 'right';
      rightHandNotes.push(n);
    } else {
      n.hand = 'left';
      leftHandNotes.push(n);
    }
  }

  if (otherNotes.length > 0) {
    rightHandNotes.sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);
    leftHandNotes.sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);
  }

  processHandEventsV22(rightHandNotes, 'right');
  processHandEventsV22(leftHandNotes, 'left');

  sanitizeHandChordClusters(rightHandNotes, 'right');
  sanitizeHandChordClusters(leftHandNotes, 'left');

  for (const note of processedNotes) {
    if (!note.finger) {
      note.finger = note.hand === 'left' ? 5 : 1;
    }
  }

  return processedNotes;
};