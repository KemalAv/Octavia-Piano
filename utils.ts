
/**
 * Calculates a non-linear scaling factor for note widths based on a power curve.
 * This function makes the zoom effect more pronounced at lower values.
 * - For zoom >= 1.0 (100%), scaling is linear.
 * - For zoom < 1.0, scaling follows `zoom^1.6`.
 *
 * @param zoom The raw zoom factor (e.g., 1.0 for 100%, 0.5 for 50%).
 * @returns The adjusted scaling factor for note widths.
 */
export const getNoteZoom = (zoom: number): number => {
  if (zoom <= 0) return 0;
  if (zoom >= 1) return zoom;
  // A power of 1.6 provides an aggressive curve that matches the desired behavior
  // where note widths shrink rapidly as zoom decreases below 100%.
  return Math.pow(zoom, 1.6);
};

/**
 * Calculates a non-linear scaling factor for layout/bar widths based on a power curve.
 * This function makes the zoom effect less pronounced at lower values, preventing
 * the layout from becoming too compressed.
 * - For zoom >= 1.0 (100%), scaling is linear.
 * - For zoom < 1.0, scaling follows `zoom^0.25`.
 *
 * @param zoom The raw zoom factor (e.g., 1.0 for 100%, 0.5 for 50%).
 * @returns The adjusted scaling factor for layout widths.
 */
export const getLayoutZoom = (zoom: number): number => {
  if (zoom <= 0) return 0;
  if (zoom >= 1) return zoom;
  // The 4th root (power of 0.25) provides a gentle curve that keeps the layout
  // relatively wide even at low zoom levels, matching the requirements.
  return Math.pow(zoom, 0.25);
};

// --- Enharmonic Correction Constants ---
export const SHARP_KEYS = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];
export const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'];
export const NEUTRAL_KEYS = ['C', 'Am']; // As per user request, treat as sharp keys.

export const ENHARMONIC_MAP_TO_SHARP: { [flat: string]: string } = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
export const ENHARMONIC_MAP_TO_FLAT: { [sharp: string]: string } = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

// --- Signature Event Type (Moved from App.tsx and vexflow-helper.ts) ---
import { TimeSignatureInfo } from './types'; // Import TimeSignatureInfo

export interface SignatureEvent {
  timeMs: number;
  key?: string;
  time?: TimeSignatureInfo;
}

/**
 * Determines the active key signature at a given musical time.
 * @param currentTimeMs The current musical time in milliseconds.
 * @param signatureEvents An array of all key and time signature change events.
 * @param initialKeySignature The key signature at the very beginning of the song.
 * @returns The string representation of the active key signature (e.g., 'C', 'G', 'Bb').
 */
export const getActiveKeySignature = (
  currentTimeMs: number,
  signatureEvents: SignatureEvent[],
  initialKeySignature: string
): string => {
  let activeKey = initialKeySignature;
  // Filter for key signature events and sort by time
  const keySigEvents = signatureEvents.filter(event => event.key !== undefined).sort((a, b) => a.timeMs - b.timeMs);

  for (const event of keySigEvents) {
    if (event.timeMs <= currentTimeMs) {
      activeKey = event.key!;
    } else {
      // Events are sorted, so we can stop once we pass the current time
      break;
    }
  }
  return activeKey;
};

/**
 * Determines the active time signature at a given musical time.
 * @param currentTimeMs The current musical time in milliseconds.
 * @param signatureEvents An array of all key and time signature change events.
 * @param initialTimeSignature The time signature at the very beginning of the song.
 * @returns The active TimeSignatureInfo object.
 */
export const getActiveTimeSignature = (
  currentTimeMs: number,
  signatureEvents: SignatureEvent[],
  initialTimeSignature: TimeSignatureInfo
): TimeSignatureInfo => {
  let activeTime = initialTimeSignature;
  // Filter for time signature events and sort by time
  const timeSigEvents = signatureEvents.filter(event => event.time !== undefined).sort((a, b) => a.timeMs - b.timeMs);

  for (const event of timeSigEvents) {
    if (event.timeMs <= currentTimeMs) {
      activeTime = event.time!;
    } else {
      break;
    }
  }
  return activeTime;
};
