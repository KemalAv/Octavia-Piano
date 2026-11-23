import type { MidiNotePlaybackItem } from './types';

/**
 * Tap-only notes use the same short pulse as drum mode: one thirty-second
 * note at the song's original tempo. The value stays in original musical
 * milliseconds so playback-speed changes are applied exactly once later.
 */
export const getTapNoteDurationMs = (bpm: number): number => {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  return (60_000 / safeBpm) / 8;
};

/**
 * Hitbox length (ms) of tap / major notes = the full perfect zone of the judgment (perfect window on each
 * side of the note, so 2 x perfect window). Level 5 = 200 ms, level 3 = 280 ms. It is fixed by the
 * accuracy level only: it does not follow the song's BPM or note density.
 */
export const getFixedHitboxMs = (accuracyLevel: number | null | undefined): number => {
  const raw = Number(accuracyLevel);
  const level = Number.isFinite(raw) ? Math.max(1, Math.min(7, raw)) : 5;
  const perfectWindow = 100 + (5 - level) * 20;
  return perfectWindow * 2;
};

/** A roomier note head for major-note displays: one eighth note. */
export const getMajorNoteVisualDurationMs = (bpm: number): number => {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  return (60_000 / safeBpm) / 2;
};

export const getMajorVisualDurationsByNoteId = (
  notes: ReadonlyArray<Pick<MidiNotePlaybackItem, 'noteId' | 'timeMs' | 'durationMs'>>,
  bpmAtOnset: (timeMs: number) => number,
): ReadonlyMap<string, number> =>
  new Map(notes.map(note => [
    note.noteId,
    Math.min(note.durationMs, getMajorNoteVisualDurationMs(bpmAtOnset(note.timeMs))),
  ]));

export const getInteractionNoteDurationMs = (
  note: Pick<MidiNotePlaybackItem, 'durationMs'>,
  bpm: number,
  tapOnly: boolean,
): number =>
  tapOnly
    ? Math.min(note.durationMs, getTapNoteDurationMs(bpm))
    : note.durationMs;

/** Difficulty intentionally ignores sustain length in every display mode. */
export const getDifficultyNoteDurationMs = (
  note: Pick<MidiNotePlaybackItem, 'durationMs'>,
  bpm: number,
): number => getInteractionNoteDurationMs(note, bpm, true);

/** Display simplification must never shorten the piano's audible note. */
export const getPianoPlaybackDurationMs = (
  note: Pick<MidiNotePlaybackItem, 'durationMs'>,
): number => note.durationMs;

// ---------------------------------------------------------------------------
// Adaptive accuracy windows by note speed.
// The perfect / great / good windows and the hitbox length of a note are multiplied by a scale that
// depends on how fast the song is played around that note:
//   speed = strike events per second in the 4 s around the note (2 s before, 2 s after) / 4
//   scale = SPEED_CURVE (interpolated, see scaleForSpeed)
// A strike event is one hand movement: notes that start within CHORD_MERGE_MS of the first note of their
// group count as ONE event, so a chord is one strike even when its notes do not start at the same ms.
// Slow passages (few strikes) get the wider window, fast passages (many strikes) the tighter one.
// The scale is measured on the song's own (musical) timeline, so it does not change with playback speed.
// ---------------------------------------------------------------------------
/**
 * Scale per strike speed (strikes per second, 1/8-note reference: 60 BPM = 2, 120 = 4, 180 = 6, 240 = 8,
 * 360 = 12). Between the points the scale is interpolated linearly; outside them it stays at the end values.
 */
export const SPEED_CURVE: ReadonlyArray<readonly [number, number]> = [
  [2, 1.5],
  [4, 1.25],
  [6, 1.125],
  [8, 1.0],
  [12, 0.875],
];
export const CHORD_MERGE_MS = 50;
const SPEED_HALF_WINDOW_MS = 2000;

const lowerBound = (arr: number[], value: number): number => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/** Strike events: note start times with chord notes (within CHORD_MERGE_MS of the group start) merged. */
export const buildStrikeEvents = (notes: ReadonlyArray<{ timeMs: number }>): number[] => {
  const sorted = notes.map(n => n.timeMs).sort((a, b) => a - b);
  const events: number[] = [];
  let groupStart = -Infinity;
  for (const t of sorted) {
    if (t - groupStart > CHORD_MERGE_MS) {
      events.push(t);
      groupStart = t;
    }
  }
  return events;
};

/** Safety limits only; the curve itself is not clamped at the reference points. */
export const SPEED_SCALE_LIMIT_MIN = 0.875;
export const SPEED_SCALE_LIMIT_MAX = 2.0;

/**
 * Scale for a strike speed (strikes per real second). The reference points of SPEED_CURVE are followed
 * exactly between them, and the curve continues beyond them with the same log-log slope as the nearest
 * segment, so slow playback (e.g. 40%) keeps widening the window and fast playback keeps tightening it.
 */
export const scaleForSpeed = (speed: number): number => {
  const c = SPEED_CURVE;
  if (!(speed > 0)) return SPEED_SCALE_LIMIT_MAX;
  const lnS = Math.log(speed);
  let i = 0;
  if (speed <= c[0][0]) i = 0;
  else if (speed >= c[c.length - 1][0]) i = c.length - 2;
  else {
    for (i = 0; i < c.length - 2 && speed > c[i + 1][0]; i++);
  }
  const [x0, y0] = c[i];
  const [x1, y1] = c[i + 1];
  const slope = (Math.log(y1) - Math.log(y0)) / (Math.log(x1) - Math.log(x0));
  const value = Math.exp(Math.log(y0) + slope * (lnS - Math.log(x0)));
  return Math.max(SPEED_SCALE_LIMIT_MIN, Math.min(SPEED_SCALE_LIMIT_MAX, value));
};

/** Builds a function timeMs -> window scale for one song's notes. */
export const createNoteSpeedScaler = (notes: ReadonlyArray<{ timeMs: number }>) => {
  const events = buildStrikeEvents(notes);
  const n = events.length;
  // Gap (ms, song time) from a note to the next strike. The last note uses the gap before it.
  const gapAt = (timeMs: number): number => {
    if (n < 2) return 500;
    let idx = lowerBound(events, timeMs - 1);
    if (idx >= n) idx = n - 1;
    if (idx > 0 && Math.abs(events[idx - 1] - timeMs) < Math.abs(events[idx] - timeMs)) idx -= 1;
    if (idx + 1 < n) return events[idx + 1] - events[idx];
    return events[idx] - events[idx - 1];
  };
  // rate = playback speed (1 = normal). Strikes per REAL second = (1000 / gap) x rate.
  return (timeMs: number, rate = 1): number => {
    const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
    const gap = Math.max(1, gapAt(timeMs));
    return scaleForSpeed((1000 / gap) * r);
  };
};
