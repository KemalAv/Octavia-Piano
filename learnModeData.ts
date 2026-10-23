import { MidiNotePlaybackItem } from './types';
import { PIANO_KEYS_CONFIG } from './constants';
import { getScaleFingers } from './musicTheoryGenerator';

const midiToNameMap = new Map<number, string>();
PIANO_KEYS_CONFIG.forEach(k => midiToNameMap.set(k.midiNote, k.name));

export const getMidiNoteName = (midi: number): string => {
  return midiToNameMap.get(midi) || `N${midi}`;
};

export const getPitchClass = (name: string): string => {
  return name.replace(/[0-9-]/g, '');
};

export interface TheoryItem {
  id: string;
  name: string;
  intervals: number[];
  formula: string;
  category: 'chord' | 'scale';
  description: string;
}

export const THEORY_ITEMS: TheoryItem[] = [
  { id: 'major', name: 'Major Triad', intervals: [0, 4, 7], formula: '1 - 3 - 5', category: 'chord', description: 'Root + 4 semitones (Major 3rd) + 3 semitones (Minor 3rd). Bright, uplifting, and foundational.' },
  { id: 'minor', name: 'Minor Triad', intervals: [0, 3, 7], formula: '1 - ♭3 - 5', category: 'chord', description: 'Root + 3 semitones (Minor 3rd) + 4 semitones (Major 3rd). Melancholic, emotional, and introspective.' },
  { id: 'dom7', name: 'Dominant 7th (7)', intervals: [0, 4, 7, 10], formula: '1 - 3 - 5 - ♭7', category: 'chord', description: 'Major triad + minor 7th. The essential blues, rock, and jazz cadence tension chord.' },
  { id: 'maj7', name: 'Major 7th (maj7)', intervals: [0, 4, 7, 11], formula: '1 - 3 - 5 - 7', category: 'chord', description: 'Major triad + major 7th. Dreamy, nostalgic, warm, and sophisticated sound.' },
  { id: 'min7', name: 'Minor 7th (m7)', intervals: [0, 3, 7, 10], formula: '1 - ♭3 - 5 - ♭7', category: 'chord', description: 'Minor triad + minor 7th. Smooth, mellow, and widely heard in Neo-Soul and Lo-Fi.' },
  { id: 'sus4', name: 'Suspended 4th (sus4)', intervals: [0, 5, 7], formula: '1 - 4 - 5', category: 'chord', description: '3rd replaced by the 4th. Creates an open, suspended tension yearning to resolve to Major.' },
  { id: 'dim', name: 'Diminished Triad', intervals: [0, 3, 6], formula: '1 - ♭3 - ♭5', category: 'chord', description: 'Two stacked minor 3rds. Highly dissonant, dramatic, and full of suspense.' },
  
  { id: 'scale_major', name: 'Major Scale (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11, 12], formula: '1 2 3 4 5 6 7 8', category: 'scale', description: 'Pattern: W - W - H - W - W - W - H (Do-Re-Mi-Fa-Sol-La-Ti-Do). The pillar of Western music.' },
  { id: 'scale_minor', name: 'Natural Minor Scale (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10, 12], formula: '1 2 ♭3 4 5 ♭6 ♭7 8', category: 'scale', description: 'Pattern: W - H - W - W - H - W - W. Dark, epic, and ubiquitous in cinematic scores.' },
  { id: 'scale_pent_maj', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9, 12], formula: '1 2 3 5 6 8', category: 'scale', description: '5 consonant notes without half-steps (omits degrees 4 and 7). Impossible to sound dissonant.' },
  { id: 'scale_pent_min', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10, 12], formula: '1 ♭3 4 5 ♭7 8', category: 'scale', description: 'The ultimate soloing scale for blues, rock, funk, and modern pop guitar/keys.' },
  { id: 'scale_blues', name: 'Blues Scale', intervals: [0, 3, 5, 6, 7, 10, 12], formula: '1 ♭3 4 ♭5 5 ♭7 8', category: 'scale', description: 'Minor pentatonic augmented with the gritty, chromatic diminished-5th "Blue Note" (♭5).' },
];

export const ROOT_OPTIONS = [
  { name: 'C', midi: 60 },
  { name: 'C# / Db', midi: 61 },
  { name: 'D', midi: 62 },
  { name: 'D# / Eb', midi: 63 },
  { name: 'E', midi: 64 },
  { name: 'F', midi: 65 },
  { name: 'F# / Gb', midi: 66 },
  { name: 'G', midi: 67 },
  { name: 'G# / Ab', midi: 68 },
  { name: 'A', midi: 69 },
  { name: 'A# / Bb', midi: 70 },
  { name: 'B', midi: 71 },
];

// Standardized beat at 120 BPM: 1 beat = 500ms, 1 bar (4 beats) = 2000ms
export const buildTheoryPracticeNotes = (rootMidi: number, intervals: number[], category: 'chord' | 'scale'): MidiNotePlaybackItem[] => {
  const notes: MidiNotePlaybackItem[] = [];
  
  if (category === 'chord') {
    // 1. Arpeggio step-by-step: each note on the beat (500ms apart)
    intervals.forEach((interval, i) => {
      const midi = rootMidi + interval;
      const name = getMidiNoteName(midi);
      let f: 1 | 2 | 3 | 4 | 5 = 1;
      if (intervals.length === 3) {
        f = (i === 0 ? 1 : i === 1 ? 3 : 5);
      } else if (intervals.length === 4) {
        f = (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 5);
      } else {
        f = Math.min(5, i + 1) as any;
      }
      notes.push({
        noteId: `theory-arp-${midi}-${i}`,
        midi,
        timeMs: i * 500,
        durationMs: 460,
        name,
        pitchClass: getPitchClass(name),
        velocity: 0.8,
        hand: 'right',
        originalTrackSourceInfo: 'learn_theory',
        finger: f,
      });
    });

    // 2. Full chord hit together: lands cleanly on the next 2000ms barline
    const chordBar = Math.ceil((intervals.length * 500 + 500) / 2000) * 2000;
    intervals.forEach((interval, i) => {
      const midi = rootMidi + interval;
      const name = getMidiNoteName(midi);
      let f: 1 | 2 | 3 | 4 | 5 = 1;
      if (intervals.length === 3) {
        f = (i === 0 ? 1 : i === 1 ? 3 : 5);
      } else if (intervals.length === 4) {
        f = (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 5);
      } else {
        f = Math.min(5, i + 1) as any;
      }
      notes.push({
        noteId: `theory-chord-${midi}-${i}`,
        midi,
        timeMs: chordBar,
        durationMs: 1950,
        name,
        pitchClass: getPitchClass(name),
        velocity: 0.85,
        hand: 'right',
        originalTrackSourceInfo: 'learn_theory',
        finger: f,
      });
    });
  } else {
    // Scale ascending & descending: each note on a 500ms quarter-note beat
    const allIntervals = [...intervals];
    for (let i = intervals.length - 2; i >= 0; i--) {
      allIntervals.push(intervals[i]);
    }
    const midis = allIntervals.map(inv => rootMidi + inv);
    const scaleFingers = getScaleFingers(rootMidi, 'major', 'scale_major', midis, 'right');

    allIntervals.forEach((interval, i) => {
      const midi = rootMidi + interval;
      const name = getMidiNoteName(midi);
      notes.push({
        noteId: `theory-scale-${midi}-${i}`,
        midi,
        timeMs: i * 500,
        durationMs: 460,
        name,
        pitchClass: getPitchClass(name),
        velocity: 0.8,
        hand: 'right',
        originalTrackSourceInfo: 'learn_theory',
        finger: scaleFingers[i] || (i < 8 ? ([1, 2, 3, 1, 2, 3, 4, 5][i] as any) : ([4, 3, 2, 1, 3, 2, 1][i - 8] as any)),
      });
    });
  }

  return notes;
};

// All lessons calibrated to strict 120 BPM grid (quarter note = 500ms, bar = 2000ms)
export const LEARN_LESSONS: Record<string, { title: string; notes: MidiNotePlaybackItem[] }> = {
  scale_c: {
    title: "C Major Scale (Ascending & Descending with Thumb Tuck)",
    notes: [
      // Measure 1 (0ms - 2000ms): C4, D4, E4, F4 (Thumb tuck on F4 at 1500ms)
      { noteId: "c1", midi: 60, timeMs: 0, durationMs: 460, name: "C4", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "c2", midi: 62, timeMs: 500, durationMs: 460, name: "D4", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "c3", midi: 64, timeMs: 1000, durationMs: 460, name: "E4", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "c4", midi: 65, timeMs: 1500, durationMs: 460, name: "F4", pitchClass: "F", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 }, // THUMB TUCK!
      // Measure 2 (2000ms - 4000ms): G4, A4, B4, C5 (C5 held for 2 beats = 960ms)
      { noteId: "c5", midi: 67, timeMs: 2000, durationMs: 460, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "c6", midi: 69, timeMs: 2500, durationMs: 460, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "c7", midi: 71, timeMs: 3000, durationMs: 460, name: "B4", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "c8", midi: 72, timeMs: 3500, durationMs: 960, name: "C5", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
      // Measure 3 (4500ms - 6500ms): Descending B4, A4, G4, F4
      { noteId: "c9", midi: 71, timeMs: 4500, durationMs: 460, name: "B4", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "c10", midi: 69, timeMs: 5000, durationMs: 460, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "c11", midi: 67, timeMs: 5500, durationMs: 460, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "c12", midi: 65, timeMs: 6000, durationMs: 460, name: "F4", pitchClass: "F", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      // Measure 4 (6500ms - 8500ms): E4 (Cross over!), D4, C4 (Whole note resolution)
      { noteId: "c13", midi: 64, timeMs: 6500, durationMs: 460, name: "E4", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 }, // CROSS OVER!
      { noteId: "c14", midi: 62, timeMs: 7000, durationMs: 460, name: "D4", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "c15", midi: 60, timeMs: 7500, durationMs: 1950, name: "C4", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
    ],
  },
  scale_g: {
    title: "G Major Scale (One Sharp: F#5 Ascending & Descending)",
    notes: [
      // Measure 1
      { noteId: "g1", midi: 67, timeMs: 0, durationMs: 460, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "g2", midi: 69, timeMs: 500, durationMs: 460, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "g3", midi: 71, timeMs: 1000, durationMs: 460, name: "B4", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "g4", midi: 72, timeMs: 1500, durationMs: 460, name: "C5", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      // Measure 2
      { noteId: "g5", midi: 74, timeMs: 2000, durationMs: 460, name: "D5", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "g6", midi: 76, timeMs: 2500, durationMs: 460, name: "E5", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "g7", midi: 78, timeMs: 3000, durationMs: 460, name: "Gb5", pitchClass: "Gb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "g8", midi: 79, timeMs: 3500, durationMs: 960, name: "G5", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
      // Measure 3
      { noteId: "g9", midi: 78, timeMs: 4500, durationMs: 460, name: "Gb5", pitchClass: "Gb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "g10", midi: 76, timeMs: 5000, durationMs: 460, name: "E5", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "g11", midi: 74, timeMs: 5500, durationMs: 460, name: "D5", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "g12", midi: 72, timeMs: 6000, durationMs: 460, name: "C5", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      // Measure 4
      { noteId: "g13", midi: 71, timeMs: 6500, durationMs: 460, name: "B4", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "g14", midi: 69, timeMs: 7000, durationMs: 460, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "g15", midi: 67, timeMs: 7500, durationMs: 1950, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
    ],
  },
  chords_pop: {
    title: "Pop 4-Chord Progression (C - G - Am - F)",
    notes: [
      // Measure 1 (0ms - 2000ms): C Major Triad (C4, E4, G4)
      { noteId: "cp1", midi: 60, timeMs: 0, durationMs: 1950, name: "C4", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cp2", midi: 64, timeMs: 0, durationMs: 1950, name: "E4", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cp3", midi: 67, timeMs: 0, durationMs: 1950, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 2 (2000ms - 4000ms): G Major Triad Inversion (B3, D4, G4)
      { noteId: "cp4", midi: 59, timeMs: 2000, durationMs: 1950, name: "B3", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cp5", midi: 62, timeMs: 2000, durationMs: 1950, name: "D4", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "cp6", midi: 67, timeMs: 2000, durationMs: 1950, name: "G4", pitchClass: "G", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 3 (4000ms - 6000ms): A Minor Triad (A3, C4, E4)
      { noteId: "cp7", midi: 57, timeMs: 4000, durationMs: 1950, name: "A3", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cp8", midi: 60, timeMs: 4000, durationMs: 1950, name: "C4", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cp9", midi: 64, timeMs: 4000, durationMs: 1950, name: "E4", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 4 (6000ms - 8000ms): F Major Triad (F3, A3, C4)
      { noteId: "cp10", midi: 53, timeMs: 6000, durationMs: 1950, name: "F3", pitchClass: "F", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cp11", midi: 57, timeMs: 6000, durationMs: 1950, name: "A3", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cp12", midi: 60, timeMs: 6000, durationMs: 1950, name: "C4", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
    ],
  },
  canon: {
    title: "Canon in D - Chord Foundation (Pachelbel)",
    notes: [
      // Measure 1: D Major (D4, Gb4, A4)
      { noteId: "cn1", midi: 62, timeMs: 0, durationMs: 1950, name: "D4", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cn2", midi: 66, timeMs: 0, durationMs: 1950, name: "Gb4", pitchClass: "Gb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cn3", midi: 69, timeMs: 0, durationMs: 1950, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 2: A Major (A3, Db4, E4)
      { noteId: "cn4", midi: 57, timeMs: 2000, durationMs: 1950, name: "A3", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cn5", midi: 61, timeMs: 2000, durationMs: 1950, name: "Db4", pitchClass: "Db", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cn6", midi: 64, timeMs: 2000, durationMs: 1950, name: "E4", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 3: B Minor (B3, D4, Gb4)
      { noteId: "cn7", midi: 59, timeMs: 4000, durationMs: 1950, name: "B3", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cn8", midi: 62, timeMs: 4000, durationMs: 1950, name: "D4", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cn9", midi: 66, timeMs: 4000, durationMs: 1950, name: "Gb4", pitchClass: "Gb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },

      // Measure 4: F# Minor (Gb3, A3, Db4)
      { noteId: "cn10", midi: 54, timeMs: 6000, durationMs: 1950, name: "Gb3", pitchClass: "Gb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
      { noteId: "cn11", midi: 57, timeMs: 6000, durationMs: 1950, name: "A3", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "cn12", midi: 61, timeMs: 6000, durationMs: 1950, name: "Db4", pitchClass: "Db", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
    ],
  },
  fur_elise: {
    title: "Für Elise - Iconic Theme (Beethoven)",
    notes: [
      // Measure 1 (3/8 or eighth notes at 250ms intervals)
      { noteId: "fe1", midi: 76, timeMs: 0, durationMs: 220, name: "E5", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
      { noteId: "fe2", midi: 75, timeMs: 250, durationMs: 220, name: "Eb5", pitchClass: "Eb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "fe3", midi: 76, timeMs: 500, durationMs: 220, name: "E5", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
      { noteId: "fe4", midi: 75, timeMs: 750, durationMs: 220, name: "Eb5", pitchClass: "Eb", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "fe5", midi: 76, timeMs: 1000, durationMs: 220, name: "E5", pitchClass: "E", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 5 },
      { noteId: "fe6", midi: 71, timeMs: 1250, durationMs: 220, name: "B4", pitchClass: "B", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 2 },
      { noteId: "fe7", midi: 74, timeMs: 1500, durationMs: 220, name: "D5", pitchClass: "D", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 4 },
      { noteId: "fe8", midi: 72, timeMs: 1750, durationMs: 220, name: "C5", pitchClass: "C", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 3 },
      { noteId: "fe9", midi: 69, timeMs: 2000, durationMs: 1000, name: "A4", pitchClass: "A", velocity: 0.8, hand: "right", originalTrackSourceInfo: "learn", finger: 1 },
    ],
  },
};
