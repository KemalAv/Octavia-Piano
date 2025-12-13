
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
import { TimeSignatureInfo, Score, PerformanceSummary, TempoEvent, BeatInfo } from './types'; // Import TimeSignatureInfo and other types

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

/**
 * Gets the active tempo (BPM) at a given original musical time.
 * This function does NOT account for `playbackTempoMultiplier`.
 * @param originalTimeMs The original musical time in milliseconds (unscaled).
 * @param tempoEvents An array of original tempo change events.
 * @param initialTempoBpm The initial BPM of the song.
 * @returns The active BPM at the given original time.
 */
export const getActiveTempoBpmAtOriginalTime = (
  originalTimeMs: number,
  tempoEvents: TempoEvent[], // Original tempo events
  initialTempoBpm: number // Original initial BPM
): number => {
  let activeBpm = initialTempoBpm;
  const sortedEvents = [...tempoEvents].sort((a, b) => a.timeMs - b.timeMs);
  for (const event of sortedEvents) {
    if (event.timeMs <= originalTimeMs) {
      activeBpm = event.bpm;
    } else {
      break;
    }
  }
  return activeBpm;
};

/**
 * Calculates all beat times (and their strong/weak status) within a given scaled musical time window.
 * This function handles tempo and time signature changes within the window.
 * 
 * @param windowStartScaledTimeMs The start of the time window in scaled milliseconds.
 * @param windowEndScaledTimeMs The end of the time window in scaled milliseconds.
 * @param playbackTempoMultiplier The current playback tempo multiplier.
 * @param originalInitialTempoBpm The original initial BPM of the song.
 * @param originalTempoEvents An array of original tempo change events.
 * @param originalInitialTimeSignature The original initial time signature of the song.
 * @param originalSignatureEvents An array of original time/key signature change events.
 * @param scaledBarLinesMs An array of bar line times, already scaled by `playbackTempoMultiplier`.
 * @returns An array of `BeatInfo` objects for all beats within the window.
 */
export const getBeatTimesInWindow = (
  windowStartScaledTimeMs: number,
  windowEndScaledTimeMs: number,
  playbackTempoMultiplier: number,
  originalInitialTempoBpm: number,
  originalTempoEvents: TempoEvent[],
  originalInitialTimeSignature: TimeSignatureInfo,
  originalSignatureEvents: SignatureEvent[],
  scaledBarLinesMs: number[] // Already scaled bar lines
): BeatInfo[] => {
  const beatTimes: BeatInfo[] = [];

  // Filter relevant bar lines within the scheduling window or just before/after
  // to ensure we capture beats around the edge and detect upcoming measure starts.
  const relevantBarLines = scaledBarLinesMs.filter(
    (barTime) => barTime >= windowStartScaledTimeMs - 500 && barTime <= windowEndScaledTimeMs + 500
  );

  // If there are no bar lines, or only one, we can't reliably determine measures.
  // In this case, fall back to a simpler beat calculation, or return empty if no tempo/time signature.
  if (relevantBarLines.length < 1 && scaledBarLinesMs.length < 1) {
    return []; // Cannot determine beats without at least an implied measure structure.
  }
  
  // If no specific bar lines, but there are notes, use a virtual bar line at 0 scaled time.
  let currentRelevantBarLines = relevantBarLines;
  if (relevantBarLines.length === 0 && scaledBarLinesMs.length === 0) {
      currentRelevantBarLines = [0]; // Assume a measure starts at time 0
  } else if (relevantBarLines.length === 0 && scaledBarLinesMs.length > 0) {
      // Find the closest bar line before the window start if the window itself has no bar lines
      const closestPrevBar = scaledBarLinesMs.reduce((prev, curr) => 
          (curr <= windowStartScaledTimeMs && curr > prev) ? curr : prev, 0);
      currentRelevantBarLines = [closestPrevBar];
  }


  // Iterate through relevant bar lines to determine beats within each measure
  for (let i = 0; i < currentRelevantBarLines.length; i++) {
    const barStartScaledTime = currentRelevantBarLines[i];
    // Find the actual next bar line time, not just the next in relevantBarLines
    let nextBarStartScaledTime = windowEndScaledTimeMs + 1000; // Default far future
    for (const b of scaledBarLinesMs) {
        if (b > barStartScaledTime) {
            nextBarStartScaledTime = b;
            break;
        }
    }


    // Convert scaled bar time back to original time to query original tempo/time signature events
    const barStartOriginalTime = barStartScaledTime / playbackTempoMultiplier;

    const activeTimeSignature = getActiveTimeSignature(
      barStartOriginalTime,
      originalSignatureEvents,
      originalInitialTimeSignature
    );
    const activeTempoBpm = getActiveTempoBpmAtOriginalTime(
      barStartOriginalTime,
      originalTempoEvents,
      originalInitialTempoBpm
    );

    const msPerQuarterNoteOriginal = 60000 / activeTempoBpm;
    // msPerBeatOriginal: The duration of one beat in original milliseconds.
    // Example: 4/4 time, denominator is 4 (quarter note). msPerBeatOriginal = msPerQuarterNoteOriginal * (4/4) = msPerQuarterNoteOriginal.
    // Example: 3/8 time, denominator is 8 (eighth note). msPerBeatOriginal = msPerQuarterNoteOriginal * (4/8) = msPerQuarterNoteOriginal / 2.
    const msPerBeatOriginal = msPerQuarterNoteOriginal * (4 / activeTimeSignature.denominator);

    if (msPerBeatOriginal <= 0) continue; // Avoid infinite loop

    // Iterate through beats within this measure (based on numerator of time signature)
    for (let beat = 0; beat < activeTimeSignature.numerator; beat++) {
      const beatOriginalTime = barStartOriginalTime + (beat * msPerBeatOriginal);
      const beatScaledTime = beatOriginalTime * playbackTempoMultiplier;

      // Only add beat if it's within the scheduling window
      // Use a small tolerance for the window boundary to catch beats very close to it
      if (beatScaledTime >= windowStartScaledTimeMs - 50 && beatScaledTime < windowEndScaledTimeMs + 50) {
        beatTimes.push({
          timeMs: beatScaledTime,
          isStrong: beat === 0, // First beat of measure is strong
        });
      }
      
      // Optimization: if we're past the next bar or window end, no more beats in this "measure interval"
      if (beatScaledTime >= nextBarStartScaledTime - 50 || beatScaledTime >= windowEndScaledTimeMs + 50) {
          break;
      }
    }
  }

  // Sort and filter out near-duplicates (due to floating point arithmetic or overlapping windows)
  beatTimes.sort((a, b) => a.timeMs - b.timeMs);
  const uniqueBeatTimes: BeatInfo[] = [];
  const processedTimestamps = new Set<number>(); // Store rounded timestamps to check for uniqueness
  
  beatTimes.forEach(beat => {
      // Round to nearest 10ms to group very close beats as one
      const roundedTime = Math.round(beat.timeMs / 10) * 10; 
      
      if (!processedTimestamps.has(roundedTime)) {
          uniqueBeatTimes.push(beat);
          processedTimestamps.add(roundedTime);
      } else {
          // If a beat at this rounded time already exists, check if the new one is strong.
          // If existing is weak and new is strong, replace it.
          const existingBeatIndex = uniqueBeatTimes.findIndex(ub => Math.round(ub.timeMs / 10) * 10 === roundedTime);
          if (existingBeatIndex !== -1 && beat.isStrong && !uniqueBeatTimes[existingBeatIndex].isStrong) {
              uniqueBeatTimes[existingBeatIndex] = beat;
          }
      }
  });


  return uniqueBeatTimes;
};


/**
 * Converts a Score object from Supabase into a PerformanceSummary object for display.
 * @param score The Supabase Score object.
 * @param songTitle The title of the song (for context in summary).
 * @returns A PerformanceSummary object.
 */
export function convertScoreToPerformanceSummary(score: Score, songTitle: string = 'Unknown Song'): PerformanceSummary {
  const totalNotes = score.total_notes ?? 0;
  const hitCount = score.notes_hit ?? 0;
  const errorCount = score.errors ?? 0;
  // Recalculate accuracy if it's null, or use the stored value
  const accuracy = score.accuracy ?? (totalNotes > 0 ? ((hitCount - errorCount) / totalNotes) * 100 : 0);
  const speed = score.speed ?? 0;
  const finalScore = score.final_score ?? 0;
  const rank = score.rank ?? 'D';

  // These are not directly stored in the 'scores' table, use placeholder/derived values
  const gameplayPercentage = (accuracy * 0.5) + (speed * 0.5);
  const baseMidiScore = 0; // Not available from score table, so default to 0

  return {
    accuracy: parseFloat(accuracy.toFixed(2)),
    speed: parseFloat(speed.toFixed(2)),
    gameplayPercentage: parseFloat(gameplayPercentage.toFixed(2)),
    baseMidiScore: parseFloat(baseMidiScore.toFixed(0)), 
    finalScore: parseFloat(finalScore.toFixed(2)),
    rank,
    hitCount,
    errorCount,
    totalNoteCount: totalNotes,
    playbackTempoMultiplier: score.tempo_multiplier ?? 1, // Use stored tempo, default to 1
    totalWaitTimeMs: score.total_wait_time_ms ?? 0, // Use stored value, fallback to 0
  };
}