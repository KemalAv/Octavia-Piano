import { MidiNotePlaybackItem } from './types';
import { runFingeringEngine, FingeringOptions, SPAN } from './fingeringEngine';

export type { FingeringOptions, HandSize } from './fingeringEngine';

// ==================================================================================
// PIANO FINGERING
//  - Textbook tables for scale / arpeggio / chord exercises (used by the lesson generator).
//  - assignFingering(): automatic fingering for any song, see fingeringEngine.ts.
// ==================================================================================

export type Finger = 1 | 2 | 3 | 4 | 5;
export type HandType = 'left' | 'right';

const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);
export const isBlackKey = (midi: number): boolean => BLACK_KEYS.has(midi % 12);
export const isWhiteKey = (midi: number): boolean => !isBlackKey(midi);
const isWhite = isWhiteKey;

export interface ScaleFingeringConfig {
  rhUp: Finger[];
  rhTop: Finger;
  lhUp: Finger[];
  lhTop: Finger;
}

export const MAJOR_SCALE_FINGERING: Record<number, ScaleFingeringConfig> = {
  0: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  7: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  2: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  9: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  4: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  11: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [4, 3, 2, 1, 4, 3, 2], lhTop: 1 },
  6: { rhUp: [2, 3, 4, 1, 2, 3, 1], rhTop: 2, lhUp: [4, 3, 2, 1, 3, 2, 1], lhTop: 1 },
  1: { rhUp: [2, 3, 1, 2, 3, 4, 1], rhTop: 2, lhUp: [3, 2, 1, 4, 3, 2, 1], lhTop: 1 },
  8: { rhUp: [3, 4, 1, 2, 3, 1, 2], rhTop: 3, lhUp: [3, 2, 1, 4, 3, 2, 1], lhTop: 1 },
  3: { rhUp: [3, 1, 2, 3, 4, 1, 2], rhTop: 3, lhUp: [3, 2, 1, 4, 3, 2, 1], lhTop: 1 },
  10: { rhUp: [4, 1, 2, 3, 1, 2, 3], rhTop: 4, lhUp: [3, 2, 1, 4, 3, 2, 1], lhTop: 1 },
  5: { rhUp: [1, 2, 3, 4, 1, 2, 3], rhTop: 4, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
};

export const MINOR_SCALE_FINGERING: Record<number, ScaleFingeringConfig> = {
  9: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  4: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  11: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [4, 3, 2, 1, 4, 3, 2], lhTop: 1 },
  6: { rhUp: [2, 3, 1, 2, 3, 1, 2], rhTop: 3, lhUp: [4, 3, 2, 1, 3, 2, 1], lhTop: 1 },
  1: { rhUp: [2, 3, 1, 2, 3, 4, 1], rhTop: 2, lhUp: [3, 2, 1, 4, 3, 2, 1], lhTop: 1 },
  8: { rhUp: [2, 3, 1, 2, 3, 1, 2], rhTop: 3, lhUp: [3, 2, 1, 3, 2, 1, 4], lhTop: 3 },
  3: { rhUp: [2, 1, 2, 3, 4, 1, 2], rhTop: 3, lhUp: [2, 1, 4, 3, 2, 1, 3], lhTop: 2 },
  10: { rhUp: [4, 1, 2, 3, 1, 2, 3], rhTop: 4, lhUp: [2, 1, 3, 2, 1, 4, 3], lhTop: 2 },
  5: { rhUp: [1, 2, 3, 4, 1, 2, 3], rhTop: 4, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  0: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  7: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
  2: { rhUp: [1, 2, 3, 1, 2, 3, 4], rhTop: 5, lhUp: [5, 4, 3, 2, 1, 3, 2], lhTop: 1 },
};

export const getChromaticScaleFingers = (midis: number[], hand: HandType): Finger[] => {
  const n = midis.length;
  const fingers: Finger[] = new Array(n);
  const half = Math.floor(n / 2);

  for (let i = 0; i < n; i++) {
    const midi = midis[i];
    const isAsc = i < half;
    const pc = midi % 12;
    if (isBlackKey(midi)) {
      fingers[i] = 3;
    } else {
      if (hand === 'right') {
        if (isAsc) {
          if ((pc === 5 && i > 0 && midis[i - 1] % 12 === 4) || (pc === 0 && i > 0 && midis[i - 1] % 12 === 11)) {
            fingers[i] = 2;
          } else {
            fingers[i] = 1;
          }
        } else {
          if ((pc === 5 && i < n - 1 && midis[i + 1] % 12 === 4) || (pc === 0 && i < n - 1 && midis[i + 1] % 12 === 11)) {
            fingers[i] = 2;
          } else {
            fingers[i] = 1;
          }
        }
      } else {
        if (isAsc) {
          if ((pc === 11 && i < n - 1 && midis[i + 1] % 12 === 0) || (pc === 4 && i < n - 1 && midis[i + 1] % 12 === 5)) {
            fingers[i] = 2;
          } else {
            fingers[i] = 1;
          }
        } else {
          if ((pc === 11 && i > 0 && midis[i - 1] % 12 === 0) || (pc === 4 && i > 0 && midis[i - 1] % 12 === 5)) {
            fingers[i] = 2;
          } else {
            fingers[i] = 1;
          }
        }
      }
    }
  }
  return fingers;
};

export const getWholeToneScaleFingers = (midis: number[], hand: HandType): Finger[] => {
  const n = midis.length;
  if (hand === 'right') {
    const up: Finger[] = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 5];
    const down = [...up.slice(0, 12)].reverse();
    return [...up, ...down].slice(0, n);
  } else {
    const up: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1, 3, 2, 1, 2, 1];
    const down = [...up.slice(0, 12)].reverse();
    return [...up, ...down].slice(0, n);
  }
};

export const getPentatonicScaleFingers = (midis: number[], hand: HandType): Finger[] => {
  const n = midis.length;
  if (hand === 'right') {
    const up: Finger[] = [1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 5];
    const down = [...up.slice(0, 10)].reverse();
    return [...up, ...down].slice(0, n);
  } else {
    const up: Finger[] = [5, 4, 3, 2, 1, 4, 3, 2, 1, 2, 1];
    const down = [...up.slice(0, 10)].reverse();
    return [...up, ...down].slice(0, n);
  }
};

export const getDiatonicScaleFingers = (
  tonicMidi: number,
  scaleType: string,
  seqLength: number,
  hand: HandType
): Finger[] => {
  const tonicPc = ((tonicMidi % 12) + 12) % 12;
  const isMinor = scaleType.includes('minor') || scaleType === 'dorian' || scaleType === 'phrygian' || scaleType === 'aeolian' || scaleType === 'locrian';
  const table = isMinor ? MINOR_SCALE_FINGERING : MAJOR_SCALE_FINGERING;
  const config = table[tonicPc] || table[0];

  const pat = hand === 'right' ? config.rhUp : config.lhUp;
  const top = hand === 'right' ? config.rhTop : config.lhTop;

  const up: Finger[] = [...pat, ...pat, top];
  const down: Finger[] = [...up.slice(0, up.length - 1)].reverse();
  const full = [...up, ...down];
  if (full.length > seqLength) return full.slice(0, seqLength);
  while (full.length < seqLength) full.push(hand === 'right' ? 1 : 5);
  return full;
};

export const getScaleFingers = (
  tonicMidi: number,
  scaleType: string,
  typeId: string,
  midis: number[],
  hand: HandType
): Finger[] => {
  if (scaleType === 'chromatic') {
    return getChromaticScaleFingers(midis, hand);
  }
  if (scaleType === 'whole_tone') {
    return getWholeToneScaleFingers(midis, hand);
  }
  if (scaleType === 'major_pentatonic') {
    return getPentatonicScaleFingers(midis, hand);
  }
  return getDiatonicScaleFingers(tonicMidi, scaleType, midis.length, hand);
};

export const getChordFingers = (
  chordMidis: number[],
  hand: HandType
): Finger[] => {
  const n = chordMidis.length;
  const sorted = [...chordMidis].sort((a, b) => a - b);
  const root = sorted[0];

  if (n === 2) {
    const span = sorted[1] - root;
    if (span === 12) {
      return hand === 'right' ? [1, 5] : [5, 1];
    }
    if (hand === 'right') {
      if (span <= 2) return [1, 2];
      if (span <= 4) return [1, 3];
      if (span <= 6) return [1, 4];
      return [1, 5];
    } else {
      if (span <= 4) return [3, 1];
      if (span <= 6) return [4, 1];
      return [5, 1];
    }
  }

  if (n === 3) {
    const i1 = sorted[1] - root;
    const i2 = sorted[2] - root;
    // Octave chord with middle note (Root + 5th/3rd + Octave)
    if (i2 === 12) {
      if (hand === 'right') {
        if (i1 <= 4) return [1, 2, 5];
        return [1, 3, 5];
      } else {
        if (i1 >= 6) return [5, 2, 1]; // Left hand: 5th + 4th octave (e.g. C-G-C) -> 5-2-1!
        return [5, 3, 1];
      }
    }
    if ((i2 - i1) >= 5) {
      return hand === 'right' ? [1, 2, 5] : [5, 3, 1];
    } else if (i1 >= 5) {
      return hand === 'right' ? [1, 3, 5] : [5, 2, 1];
    } else {
      return hand === 'right' ? [1, 3, 5] : [5, 3, 1];
    }
  } else if (n === 4) {
    const span = sorted[3] - root;
    const gap01 = sorted[1] - sorted[0];
    const gap12 = sorted[2] - sorted[1];
    const gap23 = sorted[3] - sorted[2];

    // 4-note chord spanning octave or more (e.g. C-E-G-C or C-G-C-E)
    if (span >= 12) {
      if (hand === 'right') {
        return (gap01 <= 3 && gap12 >= 4) ? [1, 2, 4, 5] : [1, 2, 3, 5];
      } else {
        return (gap23 <= 3 && gap12 >= 4) ? [5, 4, 2, 1] : [5, 3, 2, 1];
      }
    }

    if (gap01 <= 2) {
      return hand === 'right' ? [1, 2, 4, 5] : [5, 4, 2, 1];
    } else if (gap12 <= 2) {
      return hand === 'right' ? [1, 2, 3, 5] : [5, 3, 2, 1];
    } else if (gap23 <= 2) {
      return hand === 'right' ? [1, 2, 4, 5] : [5, 4, 2, 1];
    } else {
      return hand === 'right' ? [1, 2, 3, 5] : [5, 3, 2, 1];
    }
  }
  return hand === 'right' ? ([1, 2, 3, 4, 5].slice(0, n) as Finger[]) : ([5, 4, 3, 2, 1].slice(0, n) as Finger[]);
};


export const getArpeggioFingers = (
  midis: number[],
  hand: HandType
): Finger[] => {
  return getArpeggioFingeringV22(midis, hand);
};

/**
 * Fingering for a broken-chord (arpeggio) run, worked out from the notes themselves
 * (so every inversion and key gets its own correct pattern) with dynamic programming:
 *  - each step must fit the hand: the semitone span between the two fingers has to be playable
 *    (the same span table the song fingering uses), which also decides where the thumb may cross;
 *  - crossings are rare and happen the textbook way (thumb under 3 first, 4 second, 2 last);
 *  - thumbs stay off black keys, the little finger sits on the top of a run, runs start on the thumb.
 * The left hand is the mirror image of the right hand, so it is solved as the right hand on the
 * mirrored keyboard.
 */
const ARP_CROSSING_COST = 4;

export const getArpeggioFingeringV22 = (
  midis: number[],
  hand: HandType
): Finger[] => {
  const n = midis.length;
  if (n === 0) return [];
  const pitch = midis.map(m => (hand === 'right' ? m : -m)); // mirrored for the left hand
  const black = midis.map(m => isBlackKey(m));
  const INF = 1e9;

  const spanCost = (a: number, b: number, s: number): number => {
    const t = SPAN[a * 10 + b];
    if (!t) return INF;
    if (s < 0 && a === 1) {
      // The thumb tucks under (or is passed): in broken chords it may sit a fourth to a sixth
      // away from the finger it crosses, so use roomier limits than the song-fingering table.
      const reach = b === 2 ? 4 : b === 3 ? 8 : b === 4 ? 9 : 10;
      const easy = b === 2 ? 3 : b === 3 ? 6 : b === 4 ? 7 : 8;
      if (-s > reach) return INF;
      return -s > easy ? 2 : -s > 4 ? 0.4 : 0;
    }
    // Fourth and little finger easily reach a major third in a broken chord
    if (a === 4 && b === 5 && s >= 1 && s <= 5) return s > 3 ? 1 : 0;
    if (s < t[0] || s > t[5]) return INF;
    if (s < t[1] || s > t[4]) return 3;
    if (s < t[2] || s > t[3]) return 1;
    return 0;
  };

  const fingerCost = (f: number, i: number): number => {
    let c = 0;
    if (f === 1 && black[i]) c += 2.5;
    if (f === 5 && black[i]) c += 1;
    if (f === 4 && black[i]) c += 0.2;
    const isPeak = (i === 0 || pitch[i] >= pitch[i - 1]) && (i === n - 1 || pitch[i] >= pitch[i + 1]);
    const isValley = (i === 0 || pitch[i] <= pitch[i - 1]) && (i === n - 1 || pitch[i] <= pitch[i + 1]);
    if (f === 5) c += isPeak ? -0.8 : 0.5;
    if (f === 1 && isValley && !black[i]) c -= 0.3;
    if (i === 0 && f !== 1) c += 0.5;
    return c;
  };

  const transition = (f: number, g: number, i: number): number => {
    if (f === g) return INF; // different pitches never share a finger in an arpeggio
    const a = Math.min(f, g);
    const b = Math.max(f, g);
    const s = b === g ? pitch[i] - pitch[i - 1] : pitch[i - 1] - pitch[i];
    let c = spanCost(a, b, s);
    if (c >= INF) return INF;
    if (s < 0 || (pitch[i] - pitch[i - 1]) * (g - f) < 0) {
      // the finger order opposes the pitch order: a crossing
      const crossing = pitch[i] > pitch[i - 1] ? g : f; // the thumb side of the crossing
      void crossing;
      const other = f === 1 ? g : f; // the finger the thumb passes
      if (f !== 1 && g !== 1) return INF; // only the thumb may tuck under or be passed
      c += ARP_CROSSING_COST + (other === 3 ? 0 : other === 4 ? 0.5 : other === 2 ? 1.0 : 4);
    }
    return c;
  };

  const best: number[][] = Array.from({ length: n }, () => new Array(6).fill(INF));
  const from: number[][] = Array.from({ length: n }, () => new Array(6).fill(0));
  for (let f = 1; f <= 5; f++) best[0][f] = fingerCost(f, 0);
  for (let i = 1; i < n; i++) {
    for (let g = 1; g <= 5; g++) {
      for (let f = 1; f <= 5; f++) {
        if (best[i - 1][f] >= INF) continue;
        const t = transition(f, g, i);
        if (t >= INF) continue;
        const v = best[i - 1][f] + t + fingerCost(g, i);
        if (v < best[i][g]) { best[i][g] = v; from[i][g] = f; }
      }
    }
  }
  let g = 1;
  for (let f = 2; f <= 5; f++) if (best[n - 1][f] < best[n - 1][g]) g = f;
  if (best[n - 1][g] >= INF) {
    // nothing fits (extreme spans): fall back to a simple fan
    return midis.map((_, i) => (hand === 'right' ? Math.min(5, (i % 5) + 1) : Math.max(1, 5 - (i % 5))) as Finger);
  }
  const out: Finger[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    out[i] = g as Finger;
    g = from[i][g];
  }
  return out;
};

// ==================================================================================
// AUTOMATIC FINGERING
// ==================================================================================

/**
 * Returns a copy of the notes with a finger (1-5) on every note.
 * Notes that already carry a finger (lessons, hand-edited songs) keep it.
 */
export const assignFingering = (
  notes: MidiNotePlaybackItem[],
  options: FingeringOptions = {}
): MidiNotePlaybackItem[] => {
  if (notes.length === 0) return notes;

  const processedNotes = notes.map(n => ({ ...n }));
  const rightHandNotes: MidiNotePlaybackItem[] = [];
  const leftHandNotes: MidiNotePlaybackItem[] = [];

  for (const n of processedNotes) {
    if (n.hand !== 'left' && n.hand !== 'right') n.hand = n.midi >= 60 ? 'right' : 'left';
    (n.hand === 'right' ? rightHandNotes : leftHandNotes).push(n);
  }

  runFingeringEngine(leftHandNotes, rightHandNotes, options);

  for (const note of processedNotes) {
    if (!note.finger) note.finger = note.hand === 'left' ? 5 : 1;
  }
  return processedNotes;
};
