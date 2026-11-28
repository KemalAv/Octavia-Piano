// ==================================================================================
// Hand assignment for two-staff piano files (two MIDI tracks / two MusicXML parts).
//
// The first track is the right hand and the other is the left hand: that is how piano
// files are written, and a line that dips low or climbs high is still played by its own
// hand. A note only changes hands when its own hand physically cannot play it: when the
// notes struck together on that hand span more than a hand can reach. Then the outer
// notes go to the other hand, but only if that hand has room for them at that moment.
// ==================================================================================

type Hand = 'left' | 'right';

interface HandNote {
  midi: number;
  timeMs: number;
  hand: Hand;
}

/** Notes starting this close together are struck as one chord. */
const CHORD_MS = 35;
/** Widest span (semitones) one hand can strike at once. */
const MAX_REACH = 14;

/** Groups note indices into chords (onsets within CHORD_MS of the first note). */
const chordGroups = (notes: HandNote[]): number[][] => {
  const order = notes.map((_, i) => i).sort((a, b) => notes[a].timeMs - notes[b].timeMs);
  const groups: number[][] = [];
  let start = -Infinity;
  for (const i of order) {
    if (notes[i].timeMs - start > CHORD_MS) {
      groups.push([]);
      start = notes[i].timeMs;
    }
    groups[groups.length - 1].push(i);
  }
  return groups;
};

const span = (notes: HandNote[], idx: number[]) => {
  if (!idx.length) return 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (const i of idx) { lo = Math.min(lo, notes[i].midi); hi = Math.max(hi, notes[i].midi); }
  return hi - lo;
};

/**
 * Moves the outer notes of chords that one hand cannot reach to the other hand, when the
 * other hand can take them. Mutates `hand` on the notes it is given.
 */
export function refineTrackHands<T extends HandNote>(notes: T[], isLocked: (n: T) => boolean = () => false): T[] {
  for (const group of chordGroups(notes)) {
    const right = group.filter((i) => notes[i].hand === 'right').sort((a, b) => notes[a].midi - notes[b].midi);
    const left = group.filter((i) => notes[i].hand === 'left').sort((a, b) => notes[a].midi - notes[b].midi);
    if (group.some((i) => isLocked(notes[i]))) continue; // a hand-edited chord stays as written

    // Right hand too wide: hand its lowest notes to the left hand.
    while (right.length > 1 && span(notes, right) > MAX_REACH) {
      const low = right[0];
      const next = [...left, low];
      if (next.length > 5 || span(notes, next) > MAX_REACH) break;
      if (left.length && notes[low].midi > Math.max(...left.map((i) => notes[i].midi)) + MAX_REACH) break;
      notes[low].hand = 'left';
      left.push(right.shift()!);
    }
    // Left hand too wide: hand its highest notes to the right hand.
    left.sort((a, b) => notes[a].midi - notes[b].midi);
    while (left.length > 1 && span(notes, left) > MAX_REACH) {
      const high = left[left.length - 1];
      const next = [...right, high];
      if (next.length > 5 || span(notes, next) > MAX_REACH) break;
      notes[high].hand = 'right';
      right.unshift(left.pop()!);
    }
  }
  return notes;
}
