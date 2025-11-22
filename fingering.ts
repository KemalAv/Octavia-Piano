// fingering.ts
// TypeScript + ES6 Module + Hand Crossing Control (≥7 semitone)

import { MidiNotePlaybackItem } from './types'; // Import MidiNotePlaybackItem from central types.ts

const FINGER = { THUMB: 1, INDEX: 2, MIDDLE: 3, RING: 4, PINKY: 5 } as const;
type Finger = typeof FINGER[keyof typeof FINGER];

const BLACK_KEY_MIDI_REMAINDERS = [1, 3, 6, 8, 10];
const isBlackKey = (midi: number) => BLACK_KEY_MIDI_REMAINDERS.includes(midi % 12);

// === KONSTANTA ===
const MAX_FINGER_SPAN = 9;
const MIN_FINGER_SPAN = 3;
const ARPEGGIO_MIN_INTERVAL = 3;
const CHORD_TIME_TOLERANCE = 30;
const PHRASE_GAP = 600;
const SLOW_TEMPO_THRESHOLD = 800;
const FAST_TEMPO_THRESHOLD = 200;
const REPEATED_NOTE_ALTERNATE_THRESHOLD = 150;
const SCALE_MIN_LENGTH = 4;
const SCALE_MAX_INTERVAL = 2;
const STABLE_PASSAGE_MIN_LENGTH = 4;
const STABLE_PASSAGE_MAX_VARIANCE = 5;
const STABLE_PASSAGE_MAX_INTERVAL = 2;

const FORBIDDEN_TRANSITIONS_RH_ASC = [[3, 4], [4, 5]];
const FORBIDDEN_TRANSITIONS_RH_DESC = [[5, 4], [4, 3]];
const FORBIDDEN_TRANSITIONS_LH_ASC = [[4, 3], [3, 2]];
const FORBIDDEN_TRANSITIONS_LH_DESC = [[2, 3], [3, 4]];

const MIN_CROSSING_DISTANCE = 7; // C to G
const CROSSING_TIME_TOLERANCE = 50;

// === HAND POSITION ===
interface HandPosition {
  thumbMidi: number;
  pinkyMidi: number;
  lastFinger: Finger;
  lastMidi: number;
  lastTime: number;
  usedFingers: Set<Finger>;
  inArpeggio: boolean;
  arpeggioRoot: number;
  hand: 'left' | 'right';
  currentTempo: number;
  phraseNotes: number;
}

const createHandPosition = (note: MidiNotePlaybackItem): HandPosition => {
  const isRH = note.hand === 'right';
  return {
    thumbMidi: isRH ? note.midi - 2 : note.midi + 2,
    pinkyMidi: isRH ? note.midi + 4 : note.midi - 4,
    lastFinger: FINGER.MIDDLE,
    lastMidi: note.midi,
    lastTime: note.timeMs,
    usedFingers: new Set(),
    inArpeggio: false,
    arpeggioRoot: note.midi,
    hand: note.hand,
    currentTempo: 0,
    phraseNotes: 1,
  };
};

const updateFingerPos = (pos: HandPosition, midi: number, finger: Finger) => {
  const isRH = pos.hand === 'right';
  if (finger === FINGER.THUMB) pos.thumbMidi = midi;
  if (finger === FINGER.PINKY) pos.pinkyMidi = midi;
  if (finger === FINGER.INDEX) pos.thumbMidi = isRH ? midi - 1 : midi + 1;
  if (finger === FINGER.MIDDLE) {
    pos.thumbMidi = isRH ? midi - 2 : midi + 2;
    pos.pinkyMidi = isRH ? midi + 2 : midi - 2;
  }
  if (finger === FINGER.RING) pos.pinkyMidi = isRH ? midi + 1 : midi - 1;

  const span = Math.abs(pos.pinkyMidi - pos.thumbMidi);
  if (span > MAX_FINGER_SPAN && pos.currentTempo < FAST_TEMPO_THRESHOLD) {
    pos.thumbMidi = isRH ? pos.thumbMidi + 1 : pos.thumbMidi - 1;
    pos.pinkyMidi = isRH ? pos.pinkyMidi - 1 : pos.pinkyMidi + 1;
  } else if (span < MIN_FINGER_SPAN && pos.currentTempo > SLOW_TEMPO_THRESHOLD) {
    pos.thumbMidi = isRH ? pos.thumbMidi - 1 : pos.thumbMidi + 1;
    pos.pinkyMidi = isRH ? pos.pinkyMidi + 1 : pos.pinkyMidi - 1;
  }
};

const isFingerComfortable = (pos: HandPosition, midi: number, finger: Finger): boolean => {
  let expected = midi;
  if (finger === FINGER.THUMB) expected = pos.thumbMidi;
  if (finger === FINGER.PINKY) expected = pos.pinkyMidi;
  if (finger === FINGER.INDEX) expected = pos.hand === 'right' ? pos.thumbMidi + 1 : pos.thumbMidi - 1;
  if (finger === FINGER.MIDDLE) expected = pos.hand === 'right' ? pos.thumbMidi + 2 : pos.thumbMidi - 2;
  if (finger === FINGER.RING) expected = pos.hand === 'right' ? pos.pinkyMidi - 1 : pos.pinkyMidi + 1;
  const diff = Math.abs(midi - expected);
  return diff <= (pos.currentTempo < FAST_TEMPO_THRESHOLD ? 2 : 1);
};

const canReuseFinger = (pos: HandPosition, finger: Finger, timeSinceLast: number, midi: number): boolean => {
  if (timeSinceLast > SLOW_TEMPO_THRESHOLD) return true;
  if (midi === pos.lastMidi && timeSinceLast > REPEATED_NOTE_ALTERNATE_THRESHOLD) return true;
  if (pos.usedFingers.has(finger)) return false;
  if (pos.currentTempo < FAST_TEMPO_THRESHOLD && midi !== pos.lastMidi) return false;
  return true;
};

const isForbiddenTransition = (
  lastFinger: Finger,
  finger: Finger,
  isRH: boolean,
  dir: number,
  isFast: boolean
): boolean => {
  if (!isFast) return false;
  const pair = [lastFinger, finger];
  let forbidden;
  if (isRH) {
    forbidden = dir > 0 ? FORBIDDEN_TRANSITIONS_RH_ASC : FORBIDDEN_TRANSITIONS_RH_DESC;
  } else {
    forbidden = dir > 0 ? FORBIDDEN_TRANSITIONS_LH_ASC : FORBIDDEN_TRANSITIONS_LH_DESC;
  }
  return forbidden.some(f => f[0] === pair[0] && f[1] === pair[1]);
};

const chooseBestFinger = (
  candidates: Finger[],
  midi: number,
  pos: HandPosition,
  timeGap: number
): Finger => {
  const isRH = pos.hand === 'right';
  const isFast = pos.currentTempo < FAST_TEMPO_THRESHOLD;

  if (isFast) {
    const alt = (pos.lastFinger % 2 === 1 ? pos.lastFinger + 1 : pos.lastFinger - 1) as Finger;
    if (candidates.includes(alt) && isFingerComfortable(pos, midi, alt)) return alt;
  }

  for (const f of candidates) {
    if (isFingerComfortable(pos, midi, f)) {
      if (f === FINGER.THUMB && isBlackKey(midi) && candidates.length > 1) continue;
      if (canReuseFinger(pos, f, timeGap, midi) && !isForbiddenTransition(pos.lastFinger, f, isRH, Math.sign(midi - pos.lastMidi), isFast)) return f;
    }
  }

  let best = candidates[0];
  let minDist = Infinity;
  for (const f of candidates) {
    if (f === FINGER.THUMB && isBlackKey(midi) && candidates.length > 1) continue;
    let expected = midi;
    if (f === FINGER.THUMB) expected = pos.thumbMidi;
    if (f === FINGER.PINKY) expected = pos.pinkyMidi;
    const dist = Math.abs(midi - expected);
    if (dist < minDist && canReuseFinger(pos, f, timeGap, midi) && !isForbiddenTransition(pos.lastFinger, f, isRH, Math.sign(midi - pos.lastMidi), isFast)) {
      minDist = dist;
      best = f;
    }
  }

  // Cast arithmetic result to Finger
  if (Math.abs(best - pos.lastFinger) > 2 && isFast) {
    best = ((pos.lastFinger + 1 > 5 ? 5 : pos.lastFinger + 1) as Finger);
  }

  if (isForbiddenTransition(pos.lastFinger, best, isRH, Math.sign(midi - pos.lastMidi), isFast)) {
    const alternatives = candidates.filter(f => f !== best && !isForbiddenTransition(pos.lastFinger, f, isRH, Math.sign(midi - pos.lastMidi), isFast));
    if (alternatives.length > 0) best = alternatives[0];
  }
  return best;
};

// === DETEKSI PATTERN ===
const detectArpeggio = (notes: MidiNotePlaybackItem[], i: number, pos: HandPosition): MidiNotePlaybackItem[] | null => {
  if (i + 2 >= notes.length) return null;
  const group: MidiNotePlaybackItem[] = [notes[i]];
  const hand = notes[i].hand;
  let last = notes[i];
  let dir: 1 | -1 | 0 = 0;
  for (let j = i + 1; j < notes.length && group.length < 6; j++) {
    const n = notes[j];
    if (n.hand !== hand) break;
    const dt = n.timeMs - last.timeMs;
    if (dt > 350) break;
    const interval = n.midi - last.midi;
    const abs = Math.abs(interval);
    if (abs < ARPEGGIO_MIN_INTERVAL || abs > 7) break;
    const currDir = Math.sign(interval) as 1 | -1;
    if (dir === 0) dir = currDir;
    else if (currDir !== dir) break;
    group.push(n);
    last = n;
  }
  return group.length >= 3 ? group : null;
};

const applyArpeggioFingering = (group: MidiNotePlaybackItem[], pos: HandPosition) => {
  const isRH = group[0].hand === 'right';
  const ascending = group[group.length - 1].midi > group[0].midi;
  pos.inArpeggio = true;
  pos.arpeggioRoot = group[0].midi;
  let pattern = ascending
    ? (isRH ? [1, 2, 3, 5] : [5, 3, 2, 1])
    : (isRH ? [5, 3, 2, 1] : [1, 2, 3, 5]);
  if (pos.currentTempo < FAST_TEMPO_THRESHOLD) {
    pattern = ascending
      ? (isRH ? [1, 3, 2, 4] : [5, 3, 4, 2])
      : (isRH ? [4, 2, 3, 1] : [2, 4, 3, 5]);
  }
  group.forEach((note, idx) => {
    let f = pattern[idx % pattern.length] as Finger;
    if (f === FINGER.THUMB && isBlackKey(note.midi)) {
      f = isRH ? FINGER.INDEX : FINGER.MIDDLE;
    }
    note.finger = f;
    updateFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastMidi = group[group.length - 1].midi;
};

const assignChordFingering = (chord: MidiNotePlaybackItem[], pos: HandPosition) => {
  chord.sort((a, b) => a.midi - b.midi);
  const span = chord[chord.length - 1].midi - chord[0].midi;
  const isRH = pos.hand === 'right';
  const uniqueUsed = new Set<Finger>();

  let pattern: Finger[] = [];
  if (chord.length === 2) {
    pattern = span >= 11
      ? (isRH ? [FINGER.THUMB, FINGER.PINKY] : [FINGER.PINKY, FINGER.THUMB])
      : (isRH ? [FINGER.THUMB, FINGER.MIDDLE] : [FINGER.MIDDLE, FINGER.THUMB]);
  } else if (chord.length === 3) {
    pattern = span >= 7
      ? (isRH ? [FINGER.THUMB, FINGER.MIDDLE, FINGER.PINKY] : [FINGER.PINKY, FINGER.MIDDLE, FINGER.THUMB])
      : (isRH ? [FINGER.THUMB, FINGER.INDEX, FINGER.RING] : [FINGER.RING, FINGER.INDEX, FINGER.THUMB]);
  } else if (chord.length === 4) {
    pattern = isRH
      ? [FINGER.THUMB, FINGER.INDEX, FINGER.MIDDLE, FINGER.PINKY]
      : [FINGER.PINKY, FINGER.MIDDLE, FINGER.INDEX, FINGER.THUMB];
  } else {
    pattern = isRH
      ? [FINGER.THUMB, FINGER.INDEX, FINGER.MIDDLE, FINGER.RING, FINGER.PINKY]
      : [FINGER.PINKY, FINGER.RING, FINGER.MIDDLE, FINGER.INDEX, FINGER.THUMB];
  }

  chord.forEach((n, i) => {
    let f = pattern[Math.min(i, pattern.length - 1)];
    while (uniqueUsed.has(f)) {
      // Cast arithmetic result to Finger
      f = ((f === 5 ? 1 : f + 1) as Finger);
      if (uniqueUsed.size >= 5) break;
    }
    if (f === FINGER.THUMB && isBlackKey(n.midi)) {
      const alt = isRH ? FINGER.INDEX : FINGER.MIDDLE;
      if (!uniqueUsed.has(alt)) f = alt;
    }
    // Cast arithmetic result to Finger
    if (isRH && i > 0 && f <= (chord[i - 1].finger ?? 0)) {
      f = (Math.min(5, (chord[i - 1].finger ?? 0) + 1)) as Finger;
    }
    // Cast arithmetic result to Finger
    if (!isRH && i > 0 && f >= (chord[i - 1].finger ?? 6)) {
      f = (Math.max(1, (chord[i - 1].finger ?? 6) - 1)) as Finger;
    }
    n.finger = f;
    updateFingerPos(pos, n.midi, f);
    uniqueUsed.add(f);
  });
  pos.usedFingers = uniqueUsed;
};

// === CHROMATIC, SCALE, REPEATED, STABLE (sama) ===
const detectChromaticGroup = (notes: MidiNotePlaybackItem[], i: number, hand: 'left' | 'right') => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (n.hand !== hand) break;
    if (Math.abs(n.midi - notes[j - 1].midi) !== 1) break;
    if (n.timeMs - notes[j - 1].timeMs > 300) break;
    group.push(n);
  }
  return group.length >= 3 ? group : null;
};

const applyChromaticFingering = (group: MidiNotePlaybackItem[], pos: HandPosition) => {
  const isRH = group[0].hand === 'right';
  const ascending = group[group.length - 1].midi > group[0].midi;
  let patternRHAsc: Finger[] = [1, 2, 3, 1, 2, 3, 4];
  let patternRHDesc: Finger[] = [4, 3, 2, 1, 3, 2, 1];
  let patternLHAsc: Finger[] = [4, 3, 2, 1, 3, 2, 1];
  let patternLHDesc: Finger[] = [1, 2, 3, 1, 2, 3, 4];
  if (pos.currentTempo < FAST_TEMPO_THRESHOLD) {
    patternRHAsc = [1, 2, 1, 3, 2, 3, 4];
    patternRHDesc = [4, 3, 2, 3, 1, 2, 1];
    patternLHAsc = [4, 3, 2, 3, 1, 2, 1];
    patternLHDesc = [1, 2, 1, 3, 2, 3, 4];
  }
  const pattern = isRH
    ? (ascending ? patternRHAsc : patternRHDesc)
    : (ascending ? patternLHAsc : patternLHDesc);
  group.forEach((note, idx) => {
    const f = pattern[idx % pattern.length] as Finger;
    note.finger = f;
    updateFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

const detectScaleGroup = (notes: MidiNotePlaybackItem[], i: number, hand: 'left' | 'right'): MidiNotePlaybackItem[] | null => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  let dir: 1 | -1 | 0 = 0;
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (n.hand !== hand) break;
    const interval = n.midi - notes[j - 1].midi;
    const abs = Math.abs(interval);
    if (abs < 1 || abs > SCALE_MAX_INTERVAL) break;
    const currDir = Math.sign(interval) as 1 | -1;
    if (dir === 0) dir = currDir;
    else if (currDir !== dir) break;
    if (n.timeMs - notes[j - 1].timeMs > 250) break;
    group.push(n);
  }
  return group.length >= SCALE_MIN_LENGTH ? group : null;
};

const applyScaleFingering = (group: MidiNotePlaybackItem[], pos: HandPosition) => {
  const isRH = group[0].hand === 'right';
  const ascending = group[group.length - 1].midi > group[0].midi;
  const patternRHAsc: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];
  const patternRHDesc: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];
  const patternLHAsc: Finger[] = [5, 4, 3, 2, 1, 3, 2, 1];
  const patternLHDesc: Finger[] = [1, 2, 3, 1, 2, 3, 4, 5];
  let pattern = isRH
    ? (ascending ? patternRHAsc : patternRHDesc)
    : (ascending ? patternLHAsc : patternLHDesc);
  const startOffset = (group[0].midi % 12) % pattern.length;
  pattern = [...pattern.slice(startOffset), ...pattern.slice(0, startOffset)];
  if (pos.currentTempo < FAST_TEMPO_THRESHOLD) {
    pattern = ascending
      ? (isRH ? [2, 3, 4, 5, 1, 2, 3, 4] : [4, 3, 2, 1, 5, 4, 3, 2])
      : (isRH ? [4, 3, 2, 1, 5, 4, 3, 2] : [2, 3, 4, 5, 1, 2, 3, 4]);
  }
  group.forEach((note, idx) => {
    let f = pattern[idx % pattern.length] as Finger;
    if (f === FINGER.THUMB && isBlackKey(note.midi)) {
      // Cast arithmetic result to Finger
      f = ((f + 1) as Finger);
    }
    note.finger = f;
    updateFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

const detectRepeatedNotesGroup = (notes: MidiNotePlaybackItem[], i: number, hand: 'left' | 'right'): MidiNotePlaybackItem[] | null => {
  const group: MidiNotePlaybackItem[] = [notes[i]];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (n.hand !== hand) break;
    if (n.midi !== notes[j - 1].midi) break;
    if (n.timeMs - notes[j - 1].timeMs > REPEATED_NOTE_ALTERNATE_THRESHOLD * 2) break;
    group.push(n);
  }
  return group.length >= 2 ? group : null;
};

const applyRepeatedNotesFingering = (group: MidiNotePlaybackItem[], pos: HandPosition) => {
  const isRH = group[0].hand === 'right';
  let pattern: Finger[] = isRH ? [3, 2, 3, 2, 1] : [3, 4, 3, 4, 5];
  if (pos.currentTempo < FAST_TEMPO_THRESHOLD) {
    pattern = isRH ? [2, 3, 1, 2, 3] : [4, 3, 5, 4, 3];
  }
  group.forEach((note, idx) => {
    const f = pattern[idx % pattern.length] as Finger;
    note.finger = f;
    updateFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

const detectStableFastPassage = (notes: MidiNotePlaybackItem[], i: number, hand: 'left' | 'right', tempo: number): MidiNotePlaybackItem[] | null => {
  if (tempo >= FAST_TEMPO_THRESHOLD) return null;
  const group: MidiNotePlaybackItem[] = [notes[i]];
  const midis: number[] = [notes[i].midi];
  for (let j = i + 1; j < notes.length; j++) {
    const n = notes[j];
    if (n.hand !== hand) break;
    const interval = Math.abs(n.midi - notes[j - 1].midi);
    if (interval > STABLE_PASSAGE_MAX_INTERVAL) break;
    if (n.timeMs - notes[j - 1].timeMs > FAST_TEMPO_THRESHOLD) break;
    group.push(n);
    midis.push(n.midi);
  }
  if (group.length < STABLE_PASSAGE_MIN_LENGTH) return null;
  const max = Math.max(...midis);
  const min = Math.min(...midis);
  if (max - min > STABLE_PASSAGE_MAX_VARIANCE) return null;
  return group;
};

const applyStableFastPassageFingering = (group: MidiNotePlaybackItem[], pos: HandPosition) => {
  const isRH = group[0].hand === 'right';
  let pattern: Finger[] = isRH ? [2, 3, 2, 3, 1, 4] : [4, 3, 4, 3, 5, 2];
  group.forEach((note, idx) => {
    let f = pattern[idx % pattern.length] as Finger;
    if (f === FINGER.THUMB && isBlackKey(note.midi)) {
      f = isRH ? FINGER.INDEX : FINGER.RING;
    }
    // Cast arithmetic result to Finger
    if (idx > 0 && isForbiddenTransition(group[idx - 1].finger!, f, isRH, Math.sign(note.midi - group[idx - 1].midi), true)) {
      f = ((f + 1 > 5 ? 1 : f + 1) as Finger);
    }
    note.finger = f;
    updateFingerPos(pos, note.midi, f);
    pos.usedFingers.add(f);
  });
  pos.lastMidi = group[group.length - 1].midi;
  pos.lastFinger = group[group.length - 1].finger!;
  pos.lastTime = group[group.length - 1].timeMs;
};

// === MAIN PROCESSOR ===
const processHand = (
  notes: MidiNotePlaybackItem[],
  otherHandLast: { midi: number; time: number } | null = null
): { midi: number; time: number } | null => {
  if (!notes.length) return null;

  let i = 0;
  const pos = createHandPosition(notes[0]);

  while (i < notes.length) {
    const curr = notes[i];
    const timeGap = curr.timeMs - pos.lastTime;

    if (timeGap > 0) {
      pos.currentTempo = (pos.currentTempo * pos.phraseNotes + timeGap) / (pos.phraseNotes + 1);
      pos.phraseNotes++;
    }
    if (i === 0 || timeGap > PHRASE_GAP) {
      pos.usedFingers.clear();
      pos.currentTempo = 0;
      pos.phraseNotes = 1;
    }

    // CROSSING RISK
    let crossingRisk = false;
    let crossingDistance = 0;
    if (otherHandLast && Math.abs(curr.timeMs - otherHandLast.time) <= CROSSING_TIME_TOLERANCE) {
      const otherMidi = otherHandLast.midi;
      if ((pos.hand === 'right' && curr.midi < otherMidi) || (pos.hand === 'left' && curr.midi > otherMidi)) {
        crossingRisk = true;
        crossingDistance = Math.abs(curr.midi - otherMidi);
      }
    }

    // CHORD
    const chord: MidiNotePlaybackItem[] = [curr];
    let j = i + 1;
    while (j < notes.length && notes[j].hand === pos.hand && Math.abs(notes[j].timeMs - curr.timeMs) <= CHORD_TIME_TOLERANCE) {
      chord.push(notes[j++]);
    }
    if (chord.length > 1) {
      assignChordFingering(chord, pos);
      pos.lastTime = curr.timeMs;
      i = j;
      continue;
    }

    // ARPEGGIO / SCALE / CHROMATIC / REPEATED / STABLE
    const arp = detectArpeggio(notes, i, pos);
    if (arp) { pos.usedFingers.clear(); applyArpeggioFingering(arp, pos); pos.lastTime = arp[arp.length - 1].timeMs; i += arp.length; continue; }

    const scale = detectScaleGroup(notes, i, pos.hand);
    if (scale) { pos.usedFingers.clear(); applyScaleFingering(scale, pos); pos.lastTime = scale[scale.length - 1].timeMs; i += scale.length; continue; }

    const chromatic = detectChromaticGroup(notes, i, pos.hand);
    if (chromatic) { pos.usedFingers.clear(); applyChromaticFingering(chromatic, pos); pos.lastTime = chromatic[chromatic.length - 1].timeMs; i += chromatic.length; continue; }

    const repeated = detectRepeatedNotesGroup(notes, i, pos.hand);
    if (repeated) { pos.usedFingers.clear(); applyRepeatedNotesFingering(repeated, pos); pos.lastTime = repeated[repeated.length - 1].timeMs; i += repeated.length; continue; }

    const stable = detectStableFastPassage(notes, i, pos.hand, pos.currentTempo);
    if (stable) { pos.usedFingers.clear(); applyStableFastPassageFingering(stable, pos); pos.lastTime = stable[stable.length - 1].timeMs; i += stable.length; continue; }

    // SINGLE NOTE
    const interval = curr.midi - pos.lastMidi;
    const isRH = pos.hand === 'right';
    let candidates: Finger[] = [];

    if (timeGap > PHRASE_GAP || Math.abs(interval) > 7) {
      const f = isRH
        ? (interval > 0 ? FINGER.PINKY : FINGER.THUMB)
        : (interval > 0 ? FINGER.THUMB : FINGER.PINKY);
      curr.finger = f;
      updateFingerPos(pos, curr.midi, f);
      pos.usedFingers.clear();
      pos.usedFingers.add(f);
    } else {
      const dir = Math.sign(interval);
      const isFast = pos.currentTempo < FAST_TEMPO_THRESHOLD;

      if (crossingRisk && crossingDistance < MIN_CROSSING_DISTANCE) {
        if (isRH) {
          candidates = [FINGER.RING, FINGER.PINKY];
          if (curr.midi > pos.lastMidi) candidates = [FINGER.PINKY];
        } else {
          candidates = [FINGER.THUMB, FINGER.INDEX];
          if (curr.midi < pos.lastMidi) candidates = [FINGER.THUMB];
        }
      } else {
        // Normal selection
        if (isRH) {
          if (dir > 0) {
            if (interval >= 12) candidates = [FINGER.PINKY];
            else if (interval >= 7) candidates = [FINGER.RING, FINGER.PINKY];
            else if (interval >= 5) candidates = [FINGER.MIDDLE, FINGER.RING];
            else if (interval >= 3) candidates = [FINGER.INDEX, FINGER.MIDDLE];
            // Cast arithmetic result to Finger
            else candidates = [((pos.lastFinger + 1 > 5 ? 5 : pos.lastFinger + 1)) as Finger];
          } else if (dir < 0) {
            if (interval <= -12) candidates = [FINGER.THUMB];
            else if (interval <= -7) candidates = [FINGER.THUMB, FINGER.INDEX];
            else if (interval <= -5) candidates = [FINGER.INDEX, FINGER.MIDDLE];
            else if (interval <= -3) candidates = [FINGER.MIDDLE, FINGER.RING];
            // Cast arithmetic result to Finger
            else candidates = [((pos.lastFinger - 1 < 1 ? 1 : pos.lastFinger - 1)) as Finger];
          } else {
            candidates = [pos.lastFinger];
          }
        } else {
          if (dir > 0) {
            if (interval >= 12) candidates = [FINGER.THUMB];
            else if (interval >= 7) candidates = [FINGER.THUMB, FINGER.INDEX];
            // Cast arithmetic result to Finger
            else candidates = [((pos.lastFinger - 1 < 1 ? 1 : pos.lastFinger - 1)) as Finger];
          } else if (dir < 0) {
            if (interval <= -12) candidates = [FINGER.PINKY];
            else if (interval <= -7) candidates = [FINGER.RING, FINGER.PINKY];
            // Cast arithmetic result to Finger
            else candidates = [((pos.lastFinger + 1 > 5 ? 5 : pos.lastFinger + 1)) as Finger];
          } else {
            candidates = [pos.lastFinger];
          }
        }

        candidates = candidates.filter(f => f >= 1 && f <= 5);
        const original = [...candidates];
        candidates = candidates.filter(f => !(f === FINGER.THUMB && isBlackKey(curr.midi)));
        if (candidates.length === 0) candidates = original;

        if (Math.abs(interval) <= 2 && isFast) {
          // Cast arithmetic result to Finger
          const next: Finger = (dir > 0
            ? (isRH ? Math.min(pos.lastFinger + 1, 5) : Math.max(pos.lastFinger - 1, 1))
            : (isRH ? Math.max(pos.lastFinger - 1, 1) : Math.min(pos.lastFinger + 1, 5))) as Finger;
          if (!candidates.includes(next)) candidates.unshift(next);
        }

        if (isFast) {
          candidates = candidates.filter(f => Math.abs(f - pos.lastFinger) <= 1);
        }

        if (candidates.length === 0) {
          // Cast arithmetic result to Finger
          const fallback: Finger = (dir >= 0
            ? (isRH ? Math.min(pos.lastFinger + 1, 5) : Math.max(pos.lastFinger - 1, 1))
            : (isRH ? Math.max(pos.lastFinger - 1, 1) : Math.min(pos.lastFinger + 1, 5))) as Finger;
          candidates = [fallback];
        }
      }

      const best = chooseBestFinger(candidates, curr.midi, pos, timeGap) || candidates[0];
      curr.finger = best;
      updateFingerPos(pos, curr.midi, curr.finger);
      if (timeGap < SLOW_TEMPO_THRESHOLD && curr.midi !== pos.lastMidi) {
        pos.usedFingers.add(curr.finger);
      }
    }

    pos.lastMidi = curr.midi;
    pos.lastFinger = curr.finger!;
    pos.lastTime = curr.timeMs;
    i++;
  }

  return { midi: pos.lastMidi, time: pos.lastTime };
};

// === EKSPOR NAMED (PENTING!) ===
export const assignFingering = (notes: MidiNotePlaybackItem[]): MidiNotePlaybackItem[] => {
  const cloned = notes.map(n => ({ ...n }));
  const left = cloned.filter(n => n.hand === 'left').sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);
  const right = cloned.filter(n => n.hand === 'right').sort((a, b) => a.timeMs - b.timeMs || a.midi - b.midi);

  const rightLast = processHand(right);
  processHand(left, rightLast);

  return cloned;
};