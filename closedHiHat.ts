import type { MidiNotePlaybackItem } from './types';

export interface ClosedHatRange {
  start: number;
  end: number;
  /** Length of one beat (ms) around the slider, for scaling how long it is drawn. */
  beatMs: number;
}

/** Hi-hat pad notes other than the closed hit (open hat, pedal-ish variants, ...). */
const OTHER_HAT_NOTES = new Set([46, 54, 56, 58, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81]);

/**
 * While the hi-hat is closed the pedal is down. A closed hi-hat (midi 42) starts that state and it
 * is held across the following closed hits until a regular hi-hat or a hi-hat foot note (midi 44)
 * comes along, or a whole beat passes without a closed hit. It ends a 32nd note after the last
 * closed hit so there is a short pause before it lets go, never later than the note that releases it.
 */
export function computeClosedHatRanges(notes: MidiNotePlaybackItem[], barLines: number[] = [], unitsPerBar = 32, unitsPerBeat = 8): ClosedHatRange[] {
  const closed: number[] = [];
  const breakers: number[] = [];
  for (const n of notes) {
    if (n.midi === 42) closed.push(n.timeMs);
    else if (n.midi === 44 || OTHER_HAT_NOTES.has(n.midi)) breakers.push(n.timeMs);
  }
  if (!closed.length) return [];
  closed.sort((a, b) => a - b);
  breakers.sort((a, b) => a - b);

  const bars = [...barLines].sort((a, b) => a - b);
  const unitsN = Math.max(1, unitsPerBar);
  const barLen = (t: number) => {
    let lo = 0;
    let hi = bars.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bars[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (idx >= 0 && idx + 1 < bars.length) return bars[idx + 1] - bars[idx];
    if (idx > 0) return bars[idx] - bars[idx - 1];
    return bars.length > 1 ? bars[1] - bars[0] : 2000;
  };
  // First breaking note strictly after t.
  const breakAfter = (t: number) => {
    let lo = 0;
    let hi = breakers.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (breakers[mid] > t) hi = mid; else lo = mid + 1;
    }
    return lo < breakers.length ? breakers[lo] : Infinity;
  };

  const out: ClosedHatRange[] = [];
  let start = closed[0];
  let last = closed[0];
  const close = () => {
    const tail = barLen(last) / unitsN; // 1/32 note
    out.push({ start, end: Math.min(last + tail, breakAfter(last)), beatMs: (barLen(last) * Math.max(1, unitsPerBeat)) / unitsN });
  };
  for (let i = 1; i < closed.length; i++) {
    const t = closed[i];
    const continues = t - last <= (barLen(last) * Math.max(1, unitsPerBeat)) / unitsN * 1.02 && breakAfter(last) >= t;
    if (continues) {
      last = t;
    } else {
      close();
      start = t;
      last = t;
    }
  }
  close();
  return out;
}
