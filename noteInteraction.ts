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
