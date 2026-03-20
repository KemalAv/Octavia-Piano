/**
 * Calculates a non-linear scaling factor for note widths based on a power curve.
 * This function makes the zoom effect more pronounced at lower values.
 * - For zoom >= 1.0 (100%), scaling is linear.
 * - For zoom < 1.0, scaling follows `zoom^1.6`.
 *
 * @param zoom The raw zoom factor (e.g., 1.0 for 100%, 0.5 for 50%).
 * @param isRollView If true, returns a linear zoom factor. Defaults to false.
 * @returns The adjusted scaling factor for note widths.
 */
export const getNoteZoom = (zoom: number, isRollView: boolean = false): number => {
  if (isRollView) return zoom; // Use linear zoom for roll view to keep sync
  if (zoom <= 0) return 0;
  return zoom;
};

/**
 * Calculates a non-linear scaling factor for layout/bar widths based on a power curve.
 * This function makes the zoom effect less pronounced at lower values, preventing
 * the layout from becoming too compressed.
 * - For zoom >= 1.0 (100%), scaling is linear.
 * - For zoom < 1.0, scaling follows `zoom^0.25`.
 *
 * @param zoom The raw zoom factor (e.g., 1.0 for 100%, 0.5 for 50%).
 * @param isRollView If true, returns a linear zoom factor. Defaults to false.
 * @returns The adjusted scaling factor for layout widths.
 */
export const getLayoutZoom = (zoom: number, isRollView: boolean = false): number => {
  if (isRollView) return zoom; // Use linear zoom for roll view to keep sync
  if (zoom <= 0) return 0;
  return zoom;
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

// Maps an input key signature (major or minor) to its canonical Major Root and Minor Root pair.
// Uses canonical spellings (e.g., prefers Bb over A# for 2 flats, Db over C# for 5 flats)
const KEY_SIGNATURE_TO_RELATIVE_PAIR: { [inputKey: string]: { major: string; minor: string } } = {
    'C': { major: 'C', minor: 'A' },
    'Am': { major: 'C', minor: 'A' },

    'G': { major: 'G', minor: 'E' },
    'Em': { major: 'G', minor: 'E' },

    'D': { major: 'D', minor: 'B' },
    'Bm': { major: 'D', minor: 'B' },

    'A': { major: 'A', minor: 'F#' },
    'F#m': { major: 'A', minor: 'F#' },

    'E': { major: 'E', minor: 'C#' },
    'C#m': { major: 'E', minor: 'C#' },

    'B': { major: 'B', minor: 'G#' },
    'G#m': { major: 'B', minor: 'G#' },
    // Enharmonic for B/G#m
    'Cb': { major: 'Cb', minor: 'Ab' }, // Cb is enharmonic to B
    'Abm': { major: 'Cb', minor: 'Ab' }, // Abm is enharmonic to G#m

    'F#': { major: 'F#', minor: 'D#' },
    'D#m': { major: 'F#', minor: 'D#' },
    // Enharmonic for F#/D#m
    'Gb': { major: 'Gb', minor: 'Eb' }, // Gb is enharmonic to F#
    'Ebm': { major: 'Gb', minor: 'Eb' }, // Ebm is enharmonic to D#m


    'C#': { major: 'C#', minor: 'A#' },
    'A#m': { major: 'C#', minor: 'A#' },
    // Enharmonic for C#/A#m
    'Db': { major: 'Db', minor: 'Bb' }, // Db is enharmonic to C#
    'Bbm': { major: 'Db', minor: 'Bb' }, // Bbm is enharmonic to A#m


    'F': { major: 'F', minor: 'D' },
    'Dm': { major: 'F', minor: 'D' },

    'Bb': { major: 'Bb', minor: 'G' },
    'Gm': { major: 'Bb', minor: 'G' },

    'Eb': { major: 'Eb', minor: 'C' },
    'Cm': { major: 'Eb', minor: 'C' }, // This is the user's specific case.

    'Ab': { major: 'Ab', minor: 'F' },
    'Fm': { major: 'Ab', minor: 'F' },
};


/**
 * Formats a key signature string for display to show both the major key and its relative minor.
 * e.g., "C" -> "Cmaj/Amin", "Am" -> "Cmaj/Amin", "Eb" -> "Ebmaj/Cmin"
 * @param key The key signature string from the MIDI data (e.g., "C", "Am", "Eb", "Cm").
 * @returns A formatted string for UI display.
 */
export const formatKeySignatureForDisplay = (key: string): string => {
  if (!key) return 'N/A';

  const pair = KEY_SIGNATURE_TO_RELATIVE_PAIR[key];

  if (pair) {
      return `${pair.major}maj/${pair.minor}min`;
  }

  // Fallback for unrecognized or very unusual key signatures
  // It will try to format as Major or Minor based on 'm' suffix
  const isMinor = key.endsWith('m');
  const rootNote = isMinor ? key.slice(0, -1) : key;

  return isMinor ? `${rootNote}min` : `${rootNote}maj`;
};

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
  if (currentRelevantBarLines.length === 0 && scaledBarLinesMs.length === 0) {
      currentRelevantBarLines = [0]; // Assume a measure starts at time 0
  } else if (currentRelevantBarLines.length === 0 && scaledBarLinesMs.length > 0) {
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
    const barStartOriginalTime = barStartScaledTime * playbackTempoMultiplier;

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
    // Example: 3/8 time, denominator is 8 (eighth note). msPerBeatOriginal = msPerQuarterNoteOriginal / 2.
    const msPerBeatOriginal = msPerQuarterNoteOriginal * (4 / activeTimeSignature.denominator);

    if (msPerBeatOriginal <= 0) continue; // Avoid infinite loop

    // NEW LOGIC: Continuously generate beats until the next bar line to handle irregular measures.
    let currentOriginalTime = barStartOriginalTime;
    let beatCount = 0;
    while (true) {
        // Fetch the tempo at the current beat's time to handle tempo changes within a measure
        const activeTempoBpmAtBeat = getActiveTempoBpmAtOriginalTime(
          currentOriginalTime,
          originalTempoEvents,
          originalInitialTempoBpm
        );
        const msPerQuarterNoteOriginal = 60000 / activeTempoBpmAtBeat;
        const msPerBeatOriginal = msPerQuarterNoteOriginal * (4 / activeTimeSignature.denominator);

        const beatScaledTime = currentOriginalTime / playbackTempoMultiplier;

        // Stop if we've passed the next measure or are well beyond the scheduling window
        if (beatScaledTime >= nextBarStartScaledTime || beatScaledTime >= windowEndScaledTimeMs + 50) {
            break;
        }
        
        // Add beat if it falls within the scheduling window (with tolerance)
        if (beatScaledTime >= windowStartScaledTimeMs - 50) {
            beatTimes.push({
                timeMs: beatScaledTime,
                // The first beat generated after a bar line is always the strong beat
                isStrong: beatCount === 0,
                beatIndex: beatCount,
                timeSignature: activeTimeSignature,
            });
        }
        
        currentOriginalTime += msPerBeatOriginal;
        beatCount++;
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
    perfectCount: score.perfect_count ?? hitCount,
    greatCount: score.great_count ?? errorCount,
    goodCount: score.good_count ?? 0,
    missCount: score.miss_count ?? (totalNotes - hitCount - errorCount),
    totalNoteCount: totalNotes,
    playbackTempoMultiplier: score.tempo_multiplier ?? 1, // Use stored tempo, default to 1
    totalWaitTimeMs: score.total_wait_time_ms ?? 0, // Use stored value, fallback to 0
    gameplayStyle: score.gameplay_style,
    maxCombo: score.max_combo ?? 0,
    isNonStop: score.mode === 'retical' || score.mode === 'autoplay',
  };
}

/**
 * Darkens a hex color by a given percentage.
 * @param hex The hex color string (e.g., '#RRGGBB').
 * @param percent The percentage to darken (0-100).
 * @returns The new darkened hex color string.
 */
export const darkenHex = (hex: string, percent: number): string => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const p = Math.min(100, Math.max(0, percent)) / 100;
    
    let f = parseInt(hex.slice(1), 16);
    if (isNaN(f)) return hex;
    
    const R = f >> 16;
    const G = (f >> 8) & 0x00ff;
    const B = f & 0x0000ff;
    
    const newR = Math.round(R * (1 - p));
    const newG = Math.round(G * (1 - p));
    const newB = Math.round(B * (1 - p));

    const toHex = (c: number) => ('00' + c.toString(16)).slice(-2);

    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

/**
 * Converts a hex color string to an RGBA string.
 * @param hex The hex color string (e.g., '#RGB' or '#RRGGBB').
 * @param alpha The alpha value (0-1).
 * @returns The RGBA color string.
 */
export const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Converts a frequency in Hz to a MIDI note number.
 * @param frequency The frequency in Hz.
 * @returns The MIDI note number.
 */
export function frequencyToMidi(frequency: number): number {
  if (frequency <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

/**
 * Converts a MIDI note number to its fundamental frequency in Hz.
 * @param midi The MIDI note number.
 * @returns The frequency in Hz.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Lightens a hex color by a given percentage.
 * @param hex The hex color string (e.g., '#RRGGBB').
 * @param percent The percentage to lighten (0-100).
 * @returns The new lightened hex color string.
 */
export const lightenHex = (hex: string, percent: number): string => {
    if (!hex || typeof hex !== 'string') return '#FFFFFF';
    const f=parseInt(hex.slice(1),16),t=255,p=percent/100,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
};

export const getRankColorClass = (rank: string) => {
    switch (rank) {
      case 'X': return 'animate-rainbow-pulse'; // Legendary/Perfect - Rainbow RGB Pulse
      case 'SS': return 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.7)]'; // Near Perfect
      case 'S': return 'text-purple-400';
      case 'A': return 'text-lime-400';
      case 'B': return 'text-cyan-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-red-400';
      default: return 'text-slate-400';
    }
};
