
import { MidiNotePlaybackItem, TimeSignatureInfo, TempoEvent, PianoKeyDefinition } from './types';
import { PIANO_KEYS_CONFIG, HAND_SPLIT_MIDI_NOTE } from './constants';
import { INITIAL_PLAYBACK_DELAY_MS } from './midiParser'; // Import from midiParser
import { Finger } from './fingering';

export type ExerciseType = string;

const ROOT_NOTES = [
  { name: 'C', midi: 60 },
  { name: 'C# / Db', midi: 61 },
  { name: 'D', midi: 62 },
  { name: 'Eb', midi: 63 },
  { name: 'E', midi: 64 },
  { name: 'F', midi: 65 },
  { name: 'F# / Gb', midi: 66 },
  { name: 'G', midi: 67 },
  { name: 'Ab', midi: 68 },
  { name: 'A', midi: 69 },
  { name: 'Bb', midi: 70 },
  { name: 'B', midi: 71 },
];

// Intervals in semitones relative to root
const SCALE_INTERVALS: { [key: string]: number[] } = {
  'major': [0, 2, 4, 5, 7, 9, 11, 12],
  'natural_minor': [0, 2, 3, 5, 7, 8, 10, 12],
  'harmonic_minor': [0, 2, 3, 5, 7, 8, 11, 12],
  'melodic_minor': [0, 2, 3, 5, 7, 9, 11, 12], // Jazz Melodic Minor
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  'whole_tone': [0, 2, 4, 6, 8, 10, 12],
  'major_pentatonic': [0, 2, 4, 7, 9, 12],
  'ionian': [0, 2, 4, 5, 7, 9, 11, 12],
  'dorian': [0, 2, 3, 5, 7, 9, 10, 12],
  'phrygian': [0, 1, 3, 5, 7, 8, 10, 12],
  'lydian': [0, 2, 4, 6, 7, 9, 11, 12],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10, 12],
  'aeolian': [0, 2, 3, 5, 7, 8, 10, 12],
  'locrian': [0, 1, 3, 5, 6, 8, 10, 12],
};

const CHORD_INTERVALS: { [key: string]: number[] } = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  'aug': [0, 4, 8],
  'major7': [0, 4, 7, 11],
  '7': [0, 4, 7, 10], // Dominant 7th
  'dim': [0, 3, 6], // Diminished Triad
};

const EXERCISE_REPETITIONS = 16;
const DEFAULT_BPM = 120;

// Timing Constants for Clean 4/4
const BEAT_MS = 60000 / DEFAULT_BPM; // 500ms
const BAR_MS = BEAT_MS * 4; // 2000ms

// Durations
const NOTE_DURATION_MS = BEAT_MS / 2; // 250ms (8th note)
// Chord duration matches the requirement: 2 chords per bar (Half notes)
const CHORD_DURATION_MS = BAR_MS / 2; // 1000ms

const midiNoteToNameMap = new Map<number, string>();
PIANO_KEYS_CONFIG.forEach(key => midiNoteToNameMap.set(key.midiNote, key.name));

const createNote = (midi: number, timeMs: number, durationMs: number, hand: 'left' | 'right', counter: number, idSuffix: string, finger?: Finger): MidiNotePlaybackItem | null => {
  const name = midiNoteToNameMap.get(midi);
  if (!name) return null;
  const pitchClass = name.replace(/[0-9-]/g, '');
  return {
    noteId: `practice-${midi}-${timeMs}-${counter}-${idSuffix}`,
    midi: midi,
    timeMs: timeMs,
    durationMs: durationMs,
    name: name,
    pitchClass: pitchClass,
    velocity: 0.75,
    hand: hand,
    originalTrackSourceInfo: 'practice_generator',
    ticks: 0, 
    durationTicks: 0,
    finger: finger,
  };
};

const getInversion = (intervals: number[], inversionIndex: number): number[] => {
    let current = [...intervals].sort((a, b) => a - b);
    const numNotes = current.length;
    const times = inversionIndex % numNotes;
    for(let i = 0; i < times; i++) {
        const first = current.shift();
        if (first !== undefined) current.push(first + 12);
        current.sort((a,b) => a - b);
    }
    return current;
};

/**
 * Calculates zigzag inversion index: 0, 1, 2, ..., L-1, L-2, ..., 1, 0, ...
 */
const getZigzagIndex = (r: number, L: number): number => {
    if (L <= 1) return 0;
    const cycleLen = 2 * L - 2;
    const effR = r % cycleLen;
    return effR < L ? effR : cycleLen - effR;
};

/**
 * Calculates the Relative Major Key Signature.
 */
const getRelativeMajorSignature = (rootMidi: number, typeId: string): string => {
    let offset = 0;
    const type = typeId.toLowerCase();

    if (type.includes('natural_minor') || type.includes('aeolian') || type.includes('harmonic_minor') || type.includes('melodic_minor') || type.includes('minor_chord')) {
        offset = 3; 
    } else if (type.includes('dorian')) {
        offset = 10; 
    } else if (type.includes('phrygian')) {
        offset = 8; 
    } else if (type.includes('lydian')) {
        offset = 7; 
    } else if (type.includes('mixolydian')) {
        offset = 5; 
    } else if (type.includes('locrian')) {
        offset = 1; 
    }

    const targetMidi = (rootMidi + offset) % 12;
    const midiToMajorKey: Record<number, string> = {
        0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
        6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
    };

    return midiToMajorKey[targetMidi] || 'C';
};


const BLACK_KEY_SET = new Set([1, 3, 6, 8, 10]);
export const isBlackKey = (midi: number): boolean => BLACK_KEY_SET.has(midi % 12);
export const isWhiteKey = (midi: number): boolean => !isBlackKey(midi);

interface ScaleFingeringConfig {
  rhUp: Finger[];
  rhTop: Finger;
  lhUp: Finger[];
  lhTop: Finger;
}

const MAJOR_SCALE_FINGERING: Record<number, ScaleFingeringConfig> = {
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

const MINOR_SCALE_FINGERING: Record<number, ScaleFingeringConfig> = {
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

const getChromaticScaleFingers = (midis: number[], hand: 'left' | 'right'): Finger[] => {
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

const getWholeToneScaleFingers = (midis: number[], hand: 'left' | 'right'): Finger[] => {
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

const getPentatonicScaleFingers = (midis: number[], hand: 'left' | 'right'): Finger[] => {
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

const getDiatonicScaleFingers = (
  tonicMidi: number,
  scaleType: string,
  seqLength: number,
  hand: 'left' | 'right'
): Finger[] => {
  const tonicPc = tonicMidi % 12;
  const isMinor = scaleType.includes('minor') || scaleType === 'dorian' || scaleType === 'phrygian' || scaleType === 'aeolian' || scaleType === 'locrian';
  const table = isMinor ? MINOR_SCALE_FINGERING : MAJOR_SCALE_FINGERING;
  const config = table[tonicPc] || table[0];

  const pat = hand === 'right' ? config.rhUp : config.lhUp;
  const top = hand === 'right' ? config.rhTop : config.lhTop;

  const up: Finger[] = [...pat, ...pat, top];
  const down: Finger[] = [...up.slice(0, up.length - 1)].reverse();
  const full = [...up, ...down];
  if (full.length === seqLength) return full;
  if (full.length > seqLength) return full.slice(0, seqLength);
  while (full.length < seqLength) full.push(hand === 'right' ? 1 : 5);
  return full;
};

export const getScaleFingers = (
  tonicMidi: number,
  scaleType: string,
  typeId: string,
  midis: number[],
  hand: 'left' | 'right'
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

export const getArpeggioFingers = (
  midis: number[],
  hand: 'left' | 'right'
): Finger[] => {
  const n = midis.length;
  if (n === 13) {
    const m0 = midis[0];
    const m1 = midis[1];
    const m2 = midis[2];
    const gap01 = m1 - m0;
    const gap12 = m2 - m1;
    const firstWhite = isWhiteKey(m0);
    const whiteCount = (isWhiteKey(m0) ? 1 : 0) + (isWhiteKey(m1) ? 1 : 0) + (isWhiteKey(m2) ? 1 : 0);

    if (hand === 'right') {
      if (firstWhite || whiteCount === 0) {
        const use4 = (gap12 >= 5 || gap01 >= 5);
        const pat: Finger[] = [1, 2, use4 ? 4 : 3];
        const top: Finger = 5;
        const up = [pat[0], pat[1], pat[2], pat[0], pat[1], pat[2], top];
        const down = [pat[2], pat[1], pat[0], pat[2], pat[1], pat[0]];
        return [...up, ...down];
      } else {
        if (isWhiteKey(m1)) {
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
        if (isWhiteKey(m1)) {
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
    const firstWhite = isWhiteKey(m0);
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
  }
  return midis.map((_, i) => (hand === 'right' ? (Math.min(5, (i % 5) + 1) as Finger) : (Math.max(1, 5 - (i % 5)) as Finger)));
};

export const getChordFingers = (
  chordMidis: number[],
  hand: 'left' | 'right'
): Finger[] => {
  const n = chordMidis.length;
  const sorted = [...chordMidis].sort((a, b) => a - b);
  const root = sorted[0];

  if (n === 3) {
    const i1 = sorted[1] - root;
    const i2 = sorted[2] - root;
    if ((i2 - i1) >= 5) {
      return hand === 'right' ? [1, 2, 5] : [5, 3, 1];
    } else if (i1 >= 5) {
      return hand === 'right' ? [1, 3, 5] : [5, 2, 1];
    } else {
      return hand === 'right' ? [1, 3, 5] : [5, 3, 1];
    }
  } else if (n === 4) {
    const gap01 = sorted[1] - sorted[0];
    const gap12 = sorted[2] - sorted[1];
    const gap23 = sorted[3] - sorted[2];
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

export const generateExercise = (rootNoteName: string, typeId: ExerciseType): {
  notes: MidiNotePlaybackItem[];
  timeSignature: TimeSignatureInfo;
  keySignature: string;
  initialTempoBpm: number;
  tempoEvents: TempoEvent[];
  originalTotalMusicalDurationMs: number;
  barLinesMs: number[];
} => {
  const root = ROOT_NOTES.find(r => r.name === rootNoteName);
  if (!root) throw new Error("Invalid root note");

  const notes: MidiNotePlaybackItem[] = [];
  let currentTime = INITIAL_PLAYBACK_DELAY_MS; // Start time offset for consistency with MIDI loading
  let noteCounter = 0;

  const addNote = (midi: number, duration: number, hand: 'left' | 'right', finger?: Finger) => {
      const n = createNote(midi, currentTime, duration, hand, noteCounter++, 'gen', finger);
      if (n) notes.push(n);
  };

  const isSightReading = typeId.startsWith('sight_reading_');
  const isArpeggio = typeId.endsWith('_arpeggio');
  const isChord = typeId.endsWith('_chord');
  
  let scaleType = typeId;
  if (isSightReading) {
      scaleType = typeId.replace('sight_reading_', '');
  } else {
      scaleType = typeId.replace('_scale', '');
  }

  const isScale = !!(SCALE_INTERVALS[scaleType] || typeId === 'melodic_minor');
  const displayKey = getRelativeMajorSignature(root.midi, typeId);

  // --- SIGHT READING GENERATION ---
  if (isSightReading) {
      const intervalSet = SCALE_INTERVALS[scaleType] || SCALE_INTERVALS['major'];
      const validPitchClasses = new Set(intervalSet.map(i => (root.midi + i) % 12));
      const rhMidis: number[] = []; 
      const lhMidis: number[] = [];

      for (let m = 21; m <= 108; m++) {
          if (validPitchClasses.has(m % 12)) {
              if (m >= 60 && m <= 84) rhMidis.push(m); 
              else if (m >= 36 && m < 60) lhMidis.push(m); 
          }
      }
      
      rhMidis.sort((a,b) => a-b);
      lhMidis.sort((a,b) => a-b);

      const NUM_MEASURES = 36;
      const START_OFFSET = INITIAL_PLAYBACK_DELAY_MS; // Start time offset
      const barLinesMs: number[] = [];
      
      for(let i = 0; i <= NUM_MEASURES; i++) {
          barLinesMs.push(START_OFFSET + (i * BAR_MS));
      }

      let lastRhIdx = Math.floor(rhMidis.length / 2);
      let lastLhIdx = Math.floor(lhMidis.length / 2);

      const getRandomDuration = (remainingBeats: number) => {
          const choices = [1, 2, 4];
          const valid = choices.filter(d => d <= remainingBeats);
          if (valid.length === 0) return remainingBeats >= 1 ? 1 : remainingBeats;
          const r = Math.random();
          if (valid.includes(4) && r < 0.1) return 4;
          if (valid.includes(2) && r < 0.4) return 2;
          return 1;
      };

      const getNextPitchIdx = (currentIdx: number, poolLength: number) => {
          if (poolLength === 0) return 0;
          const r = Math.random();
          let jump = 0;
          if (r < 0.1) jump = 0;
          else if (r < 0.6) jump = 1;
          else if (r < 0.9) jump = 2;
          else jump = 3 + Math.floor(Math.random() * 2);
          const dir = Math.random() < 0.5 ? -1 : 1;
          let next = currentIdx + (jump * dir);
          if (next < 0) next = -next; 
          if (next >= poolLength) next = poolLength - (next - poolLength) - 1;
          return Math.max(0, Math.min(poolLength - 1, next));
      };

      for (let m = 0; m < NUM_MEASURES; m++) {
          const measureStart = START_OFFSET + (m * BAR_MS);
          
          let currentBeatRH = 0;
          while (currentBeatRH < 4) {
              const durBeats = getRandomDuration(4 - currentBeatRH);
              const durMs = durBeats * BEAT_MS;
              lastRhIdx = getNextPitchIdx(lastRhIdx, rhMidis.length);
              const visualDurMs = Math.min(durMs, BEAT_MS);
              const noteObj = createNote(rhMidis[lastRhIdx], measureStart + (currentBeatRH * BEAT_MS), visualDurMs, 'right', noteCounter++, 'sr');
              if (noteObj) notes.push(noteObj);
              currentBeatRH += durBeats;
          }

          let currentBeatLH = 0;
          while (currentBeatLH < 4) {
              const durBeats = getRandomDuration(4 - currentBeatLH);
              const durMs = durBeats * BEAT_MS;
              lastLhIdx = getNextPitchIdx(lastLhIdx, lhMidis.length);
              const visualDurMs = Math.min(durMs, BEAT_MS);
              const noteObj = createNote(lhMidis[lastLhIdx], measureStart + (currentBeatLH * BEAT_MS), visualDurMs, 'left', noteCounter++, 'sr');
              if (noteObj) notes.push(noteObj);
              currentBeatLH += durBeats;
          }
      }

      currentTime = START_OFFSET + (NUM_MEASURES * BAR_MS);
      notes.sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

      return {
        notes: notes,
        timeSignature: { numerator: 4, denominator: 4 },
        keySignature: displayKey,
        initialTempoBpm: DEFAULT_BPM,
        tempoEvents: [{ timeMs: INITIAL_PLAYBACK_DELAY_MS, bpm: DEFAULT_BPM }], // Tempo event also offset
        originalTotalMusicalDurationMs: currentTime - INITIAL_PLAYBACK_DELAY_MS, // Musical duration without delay
        barLinesMs: barLinesMs
      };
  }

  // --- STANDARD EXERCISE GENERATION ---
  let repetitions = EXERCISE_REPETITIONS; // Default for arpeggios (16)
  if (isScale) {
    repetitions = EXERCISE_REPETITIONS / 2; // Scales are shorter (8)
  } else if (isChord) {
    repetitions = EXERCISE_REPETITIONS * 4; // Chords are longer (64)
  }

  for (let r = 0; r < repetitions; r++) {
      if (isScale) {
          const OCTAVES = 2;
          let sequence: number[] = [];
          if (typeId === 'melodic_minor') {
              const ascIntervals = [0, 2, 3, 5, 7, 9, 11, 12];
              const natMinorIntervals = SCALE_INTERVALS['natural_minor'];
              for (let o = 0; o < OCTAVES; o++) sequence.push(...ascIntervals.slice(0, 7).map(i => i + (o * 12)));
              sequence.push(OCTAVES * 12);
              for (let o = OCTAVES - 1; o >= 0; o--) {
                  const revInt = [...natMinorIntervals].reverse(); 
                  for(let k = 1; k < revInt.length; k++) sequence.push(o * 12 + revInt[k]);
              }
          } else {
              const intervals = SCALE_INTERVALS[scaleType] || SCALE_INTERVALS['major'];
              for (let o = 0; o < OCTAVES; o++) sequence.push(...intervals.slice(0, intervals.length - 1).map(i => i + (o * 12)));
              sequence.push(OCTAVES * 12);
              for (let i = sequence.length - 2; i >= 0; i--) sequence.push(sequence[i]);
          }
          const rhScaleMidis = sequence.map(offset => root.midi + offset);
          const lhScaleMidis = sequence.map(offset => root.midi + offset - 12);
          const rhFingers = getScaleFingers(root.midi, scaleType, typeId, rhScaleMidis, 'right');
          const lhFingers = getScaleFingers(root.midi - 12, scaleType, typeId, lhScaleMidis, 'left');

          sequence.forEach((offset, idx) => {
              addNote(root.midi + offset, NOTE_DURATION_MS, 'right', rhFingers[idx]);
              addNote(root.midi + offset - 12, NOTE_DURATION_MS, 'left', lhFingers[idx]);
              currentTime += NOTE_DURATION_MS;
          });
      }
      else if (isArpeggio) {
          const coreType = typeId.replace('_arpeggio', '');
          const intervals = CHORD_INTERVALS[coreType] || CHORD_INTERVALS['major'];
          const currentIntervals = getInversion(intervals, getZigzagIndex(r, intervals.length));
          const OCTAVES = 2;
          let sequence: number[] = [];
          for(let o = 0; o < OCTAVES; o++) currentIntervals.forEach(i => sequence.push(i + (o * 12)));
          sequence.push(currentIntervals[0] + (OCTAVES * 12));
          const fullSequence = [...sequence];
          for (let i = sequence.length - 2; i >= 0; i--) fullSequence.push(sequence[i]);
          const rhArpMidis = fullSequence.map(offset => root.midi + offset);
          const lhArpMidis = fullSequence.map(offset => root.midi + offset - 12);
          const rhFingers = getArpeggioFingers(rhArpMidis, 'right');
          const lhFingers = getArpeggioFingers(lhArpMidis, 'left');

          fullSequence.forEach((offset, idx) => {
              addNote(root.midi + offset, NOTE_DURATION_MS, 'right', rhFingers[idx]);
              addNote(root.midi + offset - 12, NOTE_DURATION_MS, 'left', lhFingers[idx]);
              currentTime += NOTE_DURATION_MS;
          });
      }
      else if (isChord) {
          const coreType = typeId.replace('_chord', '');
          const intervals = CHORD_INTERVALS[coreType] || CHORD_INTERVALS['major'];
          
          // Extended zigzag: span 2 octaves of inversions (Root Octave then Higher Octave)
          const totalInversionsInOneOctave = intervals.length;
          const totalInversions = totalInversionsInOneOctave * 2; 
          const effIndex = getZigzagIndex(r, totalInversions);
          
          const octaveOffset = Math.floor(effIndex / totalInversionsInOneOctave) * 12;
          const baseInv = effIndex % totalInversionsInOneOctave;
          const currentIntervals = getInversion(intervals, baseInv).map(i => i + octaveOffset);

          const rhChordMidis = currentIntervals.map(interval => root.midi + interval);
          const lhChordMidis = currentIntervals.map(interval => root.midi + interval - 12);
          const rhFingers = getChordFingers(rhChordMidis, 'right');
          const lhFingers = getChordFingers(lhChordMidis, 'left');

          currentIntervals.forEach((interval, idx) => {
              // Voicing: Standard 2-hand chords (one note per voice in the triad)
              // Right hand triad
              addNote(root.midi + interval, CHORD_DURATION_MS, 'right', rhFingers[idx]);
              // Left hand triad (one octave lower)
              addNote(root.midi + interval - 12, CHORD_DURATION_MS, 'left', lhFingers[idx]);
          });
          
          // 2 chords per bar (Half notes)
          currentTime += CHORD_DURATION_MS;
      }
      
      const timeInBar = (currentTime - INITIAL_PLAYBACK_DELAY_MS) % BAR_MS; // Adjusted for delay
      // For standard scales/arpeggios, snap to next bar. 
      // For chords, let them flow as 2 per bar.
      if (!isChord && timeInBar > 0) currentTime += (BAR_MS - timeInBar);
  }

  notes.sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

  const barLinesMs: number[] = [];
  for (let t = INITIAL_PLAYBACK_DELAY_MS; t <= currentTime + BAR_MS; t += BAR_MS) barLinesMs.push(t); // Bar lines also offset

  let firstNoteTime = Infinity;
  let lastNoteEndTime = 0;
  if (notes.length > 0) {
      for (const n of notes) {
          if (n.timeMs < firstNoteTime) firstNoteTime = n.timeMs;
          const end = n.timeMs + n.durationMs;
          if (end > lastNoteEndTime) lastNoteEndTime = end;
      }
  }
  const originalTotalMusicalDurationMs = (isFinite(firstNoteTime) && lastNoteEndTime > 0) 
      ? lastNoteEndTime - firstNoteTime 
      : 0;

  return {
    notes: notes,
    timeSignature: { numerator: 4, denominator: 4 },
    keySignature: displayKey,
    initialTempoBpm: DEFAULT_BPM,
    tempoEvents: [{ timeMs: INITIAL_PLAYBACK_DELAY_MS, bpm: DEFAULT_BPM }], // Tempo event also offset
    originalTotalMusicalDurationMs,
    barLinesMs: barLinesMs
  };
};

export const EXERCISE_CATEGORIES = [
  {
    id: 'sight_reading_cat',
    name: 'Sight Reading',
    types: [
        { id: 'sight_reading_major', name: 'Major (Ionian)', description: 'Master the Major scale (1-2-3-4-5-6-7). Pattern: W-W-H-W-W-W-H. It is the cornerstone of Western music, known for its bright, stable, and "happy" character. Essential for building a strong foundation in melody and harmony.' },
        { id: 'sight_reading_natural_minor', name: 'Natural Minor (Aeolian)', description: 'Practice the Natural Minor scale (1-2-b3-4-5-b6-b7). Pattern: W-H-W-W-H-W-W. It shares the same notes as its relative major but starts on the 6th degree, resulting in a sad, serious, or contemplative mood.' },
        { id: 'sight_reading_harmonic_minor', name: 'Harmonic Minor', description: 'A minor scale with a raised 7th degree (1-2-b3-4-5-b6-7). This "leading tone" creates a strong pull back to the tonic and gives the scale its distinctively exotic, "Middle Eastern" or neo-classical flavor.' },
        { id: 'sight_reading_melodic_minor', name: 'Melodic Minor', description: 'Features a raised 6th and 7th (1-2-b3-4-5-6-7). Traditionally used to smooth out the large gap in the harmonic minor scale. This exercise uses the "Jazz Minor" version, which remains the same both ascending and descending.' },
        { id: 'sight_reading_chromatic', name: 'Chromatic', description: 'Uses all 12 available notes in the octave, each separated by a half-step. This is the ultimate exercise for developing finger independence, speed, and a complete understanding of the keyboard layout.' },
        { id: 'sight_reading_whole_tone', name: 'Whole Tone', description: 'A symmetrical scale where every note is a whole step apart (1-2-3-#4-#5-b7). Because it lacks a perfect 5th and a leading tone, it creates a dreamy, floating, and "unresolved" sound popularized by Impressionist composers.' },
        { id: 'sight_reading_major_pentatonic', name: 'Major Pentatonic', description: 'A simplified 5-note version of the major scale (1-2-3-5-6), omitting the 4th and 7th. It is incredibly versatile and forms the melodic backbone of Blues, Rock, Country, and Folk music worldwide.' },
        { id: 'sight_reading_dorian', name: 'Dorian Mode', description: 'The 2nd mode of the major scale (1-2-b3-4-5-6-b7). It is a minor-type mode but with a "bright" raised 6th. It sounds sophisticated and cool, making it a favorite for Jazz, Funk, and Soul improvisation.' },
        { id: 'sight_reading_phrygian', name: 'Phrygian Mode', description: 'The 3rd mode of the major scale (1-b2-b3-4-5-b6-b7). Its defining characteristic is the lowered 2nd, which creates an immediate sense of tension, darkness, and mystery. Often heard in Flamenco and Heavy Metal.' },
        { id: 'sight_reading_lydian', name: 'Lydian Mode', description: 'The 4th mode of the major scale (1-2-3-#4-5-6-7). The raised 4th creates an ethereal, "spacey," and uplifting sound. It is widely used in film scores to evoke a sense of wonder or the supernatural.' },
        { id: 'sight_reading_mixolydian', name: 'Mixolydian Mode', description: 'The 5th mode of the major scale (1-2-3-4-5-6-b7). It is a major scale with a "bluesy" lowered 7th. This is the primary sound of the Dominant 7th chord and is essential for Rock, Blues, and Jazz soloing.' },
        { id: 'sight_reading_locrian', name: 'Locrian Mode', description: 'The 7th mode of the major scale (1-b2-b3-4-b5-b6-b7). It is the only mode with a diminished 5th, making it extremely unstable and dissonant. It is rarely used as a primary key but offers unique harmonic possibilities.' },
    ]
  },
  { 
    id: 'scales', 
    name: 'Scales & Modes', 
    types: [
        { id: 'major', name: 'Major Scale (Ionian)', description: 'The fundamental 7-note major scale (1-2-3-4-5-6-7). Mastering this scale is crucial for understanding key signatures, intervals, and the construction of almost all Western musical harmony.' },
        { id: 'natural_minor', name: 'Natural Minor Scale (Aeolian)', description: 'The basic 7-note minor scale (1-2-b3-4-5-b6-b7). It provides the foundation for minor-key compositions and is essential for expressing a wide range of dramatic and emotional themes.' },
        { id: 'harmonic_minor', name: 'Harmonic Minor Scale', description: 'A minor scale with a raised 7th (1-2-b3-4-5-b6-7). The raised 7th allows for a "Major V" chord in minor keys, providing the strong harmonic resolution found in Classical and Baroque music.' },
        { id: 'melodic_minor', name: 'Melodic Minor Scale', description: 'Features a raised 6th and 7th (1-2-b3-4-5-6-7). This version (Jazz Minor) is used extensively in modern improvisation to navigate complex chord changes with a smooth, sophisticated sound.' },
        { id: 'chromatic', name: 'Chromatic Scale', description: 'A sequence of all 12 semitones. This exercise is vital for developing technical agility, precise fingering, and a comprehensive mental map of the entire piano keyboard.' },
        { id: 'whole_tone', name: 'Whole Tone Scale', description: 'A 6-note scale built entirely of whole steps (1-2-3-#4-#5-b7). Its lack of a tonal center creates a unique, "weightless" quality that is perfect for exploring non-traditional harmonies.' },
        { id: 'major_pentatonic', name: 'Major Pentatonic Scale', description: 'A highly melodic 5-note scale (1-2-3-5-6). Because it lacks dissonant intervals (the 4th and 7th), it is the perfect tool for beginners and pros alike to create instantly pleasing melodies.' },
        { id: 'dorian', name: 'Dorian Mode', description: 'Minor scale with a major 6th (1-2-b3-4-5-6-b7). It offers a "brighter" alternative to the natural minor and is a staple of Jazz, Fusion, and modern Pop music.' },
        { id: 'phrygian', name: 'Phrygian Mode', description: 'Minor scale with a minor 2nd (1-b2-b3-4-5-b6-b7). The b2 creates a distinctive "dark" and "exotic" tension that is highly effective for building atmospheric and moody musical passages.' },
        { id: 'lydian', name: 'Lydian Mode', description: 'Major scale with an augmented 4th (1-2-3-#4-5-6-7). Often described as "Major plus," its #4 provides a sense of lift and optimism that is a hallmark of modern cinematic music.' },
        { id: 'mixolydian', name: 'Mixolydian Mode', description: 'Major scale with a minor 7th (1-2-3-4-5-6-b7). This mode is the harmonic engine behind countless Rock, Blues, and Country hits, providing a "gritty" yet major-key feel.' },
        { id: 'locrian', name: 'Locrian Mode', description: 'The most dissonant mode (1-b2-b3-4-b5-b6-b7). Its diminished 5th makes it feel constantly in need of resolution, offering a challenging but rewarding landscape for experimental composition.' },
    ]
  },
  { 
    id: 'chords', 
    name: 'Chords', 
    types: [
        { id: 'major_chord', name: 'Major Chord', description: 'The most stable building block of music, consisting of the Root, Major 3rd, and Perfect 5th (1-3-5). It sounds bright, complete, and is the foundation of most songs.' },
        { id: 'minor_chord', name: 'Minor Chord', description: 'Built from the Root, Minor 3rd, and Perfect 5th (1-b3-5). It is the emotional anchor of music, often perceived as sad, serious, or deeply reflective.' },
        { id: 'aug_chord', name: 'Augmented Chord', description: 'A major triad with a raised 5th (1-3-#5). It creates an "opening" or "expanding" tension that is perfect for transitions, suspense, or adding a touch of mystery to a progression.' },
        { id: 'major7_chord', name: 'Major 7th Chord', description: 'A major triad with an added Major 7th (1-3-5-7). This chord has a lush, sophisticated, and "dreamy" quality, making it a staple of Jazz, Soul, and Bossa Nova.' },
        { id: '7_chord', name: 'Dominant 7th Chord', description: 'A major triad with an added Minor 7th (1-3-5-b7). It is inherently tense and "wants" to resolve to a chord a fifth below. The defining sound of Blues and early Rock & Roll.' },
        { id: 'dim_chord', name: 'Diminished Chord', description: 'Built from the Root, Minor 3rd, and Diminished 5th (1-b3-b5). It is highly unstable and dissonant, used to create intense drama or as a "passing" chord to lead between more stable harmonies.' }
    ]
  },
  { 
    id: 'arpeggios', 
    name: 'Arpeggios', 
    types: [
        { id: 'major_arpeggio', name: 'Major Arpeggio', description: 'The notes of a Major triad (1-3-5) played one after another. This exercise builds finger strength, fluidity, and a deep physical understanding of chord shapes across the keyboard.' },
        { id: 'minor_arpeggio', name: 'Minor Arpeggio', description: 'The notes of a Minor triad (1-b3-5) played sequentially. Essential for developing melodic speed and precision when soloing or composing in minor keys.' },
        { id: 'aug_arpeggio', name: 'Augmented Arpeggio', description: 'Sequential notes of an Augmented triad (1-3-#5). Because it is built on major thirds, it helps develop a wider hand span and mastery of symmetrical finger patterns.' },
        { id: 'major7_arpeggio', name: 'Major 7th Arpeggio', description: 'The notes of a Major 7th chord (1-3-5-7) played in sequence. This exercise is perfect for mastering "wide" melodic leaps and the sophisticated phrasing found in Jazz.' },
        { id: '7_arpeggio', name: 'Dominant 7th Arpeggio', description: 'Sequential notes of a Dominant 7th chord (1-3-5-b7). A fundamental drill for any musician looking to master the "bluesy" and "driving" lines of Rock, Blues, and Jazz.' },
        { id: 'dim_arpeggio', name: 'Diminished Arpeggio', description: 'The notes of a Diminished triad (1-b3-b5) played sequentially. Its symmetrical structure is excellent for building technical agility and navigating the keyboard with speed and accuracy.' }
    ]
  }
];

export const ALL_KEYS = ROOT_NOTES.map(n => n.name);
