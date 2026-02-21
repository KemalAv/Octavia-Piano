
import { MidiNotePlaybackItem, TimeSignatureInfo, TempoEvent, PianoKeyDefinition } from './types';
import { PIANO_KEYS_CONFIG, HAND_SPLIT_MIDI_NOTE } from './constants';
import { INITIAL_PLAYBACK_DELAY_MS } from './midiParser'; // Import from midiParser

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

const createNote = (midi: number, timeMs: number, durationMs: number, hand: 'left' | 'right', counter: number, idSuffix: string): MidiNotePlaybackItem | null => {
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
    durationTicks: 0
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

  const addNote = (midi: number, duration: number, hand: 'left' | 'right') => {
      const n = createNote(midi, currentTime, duration, hand, noteCounter++, 'gen');
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
          sequence.forEach(offset => {
              addNote(root.midi + offset, NOTE_DURATION_MS, 'right');
              addNote(root.midi + offset - 12, NOTE_DURATION_MS, 'left');
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
          fullSequence.forEach(offset => {
              addNote(root.midi + offset, NOTE_DURATION_MS, 'right');
              addNote(root.midi + offset - 12, NOTE_DURATION_MS, 'left');
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

          currentIntervals.forEach(interval => {
              // Voicing: Standard 2-hand chords (one note per voice in the triad)
              // Right hand triad
              addNote(root.midi + interval, CHORD_DURATION_MS, 'right');
              // Left hand triad (one octave lower)
              addNote(root.midi + interval - 12, CHORD_DURATION_MS, 'left');
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
