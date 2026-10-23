
import { MidiNotePlaybackItem, TimeSignatureInfo, VexFlowMeasureData, VexFlowNoteInfo, VexFlowRenderData, OctaveLineInfo, NoteFragment, TempoEvent, TempoMarkingInfo, VexFlowTupletGroup } from './types';
import { getNoteZoom, getLayoutZoom, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, SignatureEvent } from './utils';
import { StaveNote, Beam, Stave, Accidental, Dot, Barline, StaveConnector, Renderer, Voice, Formatter } from 'vexflow';
import { BASE_PIXELS_PER_MILLISECOND } from './constants';

// --- Universal Scaling ---
const UNIVERSAL_SCALE = 0.40; 

// --- Constants ---
const BASE_GRAND_STAFF_VERTICAL_SPACING = 125; // Normal spacing at 100%
const ROLL_VIEW_SCALE_MULTIPLIER = 1.00; // Roll view default is 125%
const SHEET_VIEW_SCALE_MULTIPLIER = 2.00; // 100% zoom in regular sheet music acts like 200%

const HORIZONTAL_PADDING = 15 * UNIVERSAL_SCALE;
const MIDDLE_C_MIDI = 60; // C4
const CLEF_CHANGE_THRESHOLD_RATIO = 0.75;
const CLEF_CHANGE_MIN_NOTES = 1;

// Octave thresholds (Extreme cases only: 4+ ledger lines or extreme leap >= 19 semitones)
// Standardized strictly to 8va / 8vb (1 octave shift) so players never deal with 15ma/15mb confusion
const OCTAVA_8VA_THRESHOLD_MIDI = 93;  // A6+ (4+ ledger lines above treble staff, truly extreme)
const OCTAVA_8VB_THRESHOLD_MIDI = 28;  // E1 or lower (4+ ledger lines below bass staff, truly extreme)
const OCTAVA_THRESHOLD_RATIO = 0.75;

// Clef extreme thresholds (only switch when forced: 4+ ledger lines or extreme leap between adjacent notes)
const CLEF_CHANGE_DEEP_BASS_MIDI = 48;   // C3 or lower (requires 4 ledger lines below treble staff)
const CLEF_CHANGE_HIGH_TREBLE_MIDI = 72;  // C5 or higher (requires 4 ledger lines above bass staff)
const EXTREME_LEAP_SEMITONES = 19;        // Octave + fifth or wider extreme leap between adjacent notes

const DURATION_MATCH_TOLERANCE = 0.01; // Reduced from 0.0625 to support up to 128th notes
const SNAP_TOLERANCE = 0.1; // Wider tolerance for identifying potential VexFlow durations (e.g., dotted notes)
const MIN_NOTE_DURATION_TO_RENDER = 0.015; // If a note's duration is less than this (e.g. < 128th note), convert to rest.
const ROLL_VIEW_BASE_PPM = BASE_PIXELS_PER_MILLISECOND * 1.5;
const ROLL_VIEW_PIXELS_PER_SECOND = (ROLL_VIEW_BASE_PPM * 1000) / UNIVERSAL_SCALE;

// --- Mappings ---
const DURATION_TO_VEXFLOW: { [key: number]: { type: string, dots: number, isTriplet?: boolean } } = {
    4: { type: 'w', dots: 0 }, 3: { type: 'h', dots: 1 }, 2: { type: 'h', dots: 0 },
    1.5: { type: 'q', dots: 1 }, 1: { type: 'q', dots: 0 }, 0.75: { type: '8', dots: 1 },
    0.5: { type: '8', dots: 0 }, 0.375: { type: '16', dots: 1 }, 0.25: { type: '16', dots: 0 },
    0.1875: { type: '32', dots: 1 }, 0.125: { type: '32', dots: 0 }, 
    0.09375: { type: '64', dots: 1 }, 0.0625: { type: '64', dots: 0 },
    0.046875: { type: '128', dots: 1 }, 0.03125: { type: '128', dots: 0 },
    // Legit triplets (3 in time of 2)
    [8/3]: { type: '1', dots: 0, isTriplet: true },   // Whole note triplet (1/1)
    [4/3]: { type: '2', dots: 0, isTriplet: true },   // Half note triplet (1/2)
    [2/3]: { type: '4', dots: 0, isTriplet: true },   // Quarter note triplet (1/4)
    [1/3]: { type: '8', dots: 0, isTriplet: true },   // 8th note triplet
    [1/6]: { type: '16', dots: 0, isTriplet: true },  // 16th note triplet
    [1/12]: { type: '32', dots: 0, isTriplet: true }, // 32nd note triplet
    [1/24]: { type: '64', dots: 0, isTriplet: true }, // 64th note triplet
};

const DRUM_MIDI_MAPPING: { [key: number]: { key: string, noteHead?: string } } = {
    // 1. Kick/Bass Drum: Space below line 1 (d/4)
    35: { key: 'd/4' }, // Acoustic Bass Drum
    36: { key: 'd/4' }, // Bass Drum 1
    // 2. Floor Tom: Space 1 (between line 1 and 2, f/4)
    41: { key: 'f/4' }, // Low Floor Tom
    43: { key: 'f/4' }, // High Floor Tom
    // 3. Tom Drum (Low-Mid / Tom 1): Space 3 (between line 3 and 4, c/5)
    45: { key: 'c/5' }, // Low Tom
    47: { key: 'c/5' }, // Low-Mid Tom
    61: { key: 'c/5' },
    64: { key: 'c/5' },
    66: { key: 'c/5' },
    68: { key: 'c/5' },
    // 4. Tom Drum 2 (High Tom): Space 4 (between line 4 and 5, e/5)
    48: { key: 'e/5' }, // Hi-Mid Tom
    50: { key: 'e/5' }, // High Tom
    60: { key: 'e/5' },
    62: { key: 'e/5' },
    63: { key: 'e/5' },
    65: { key: 'e/5' },
    67: { key: 'e/5' },
    // 5. Snare Drum: Space 2 (between line 2 and 3, a/4)
    38: { key: 'a/4' }, // Acoustic Snare
    40: { key: 'a/4' }, // Electric Snare
    37: { key: 'a/4', noteHead: 'X2' }, // Side Stick / Rimshot
    39: { key: 'a/4', noteHead: 'X2' }, // Hand Clap
    // 6. Ride Cymbal: Line 5 (top line, f/5) with 'X2' notehead
    51: { key: 'f/5', noteHead: 'X2' }, // Ride Cymbal 1
    59: { key: 'f/5', noteHead: 'X2' }, // Ride Cymbal 2
    53: { key: 'f/5', noteHead: 'X2' }, // Ride Bell
    // 7. Closed Hi-Hat: Space above line 5 (g/5) with 'X2' notehead
    42: { key: 'g/5', noteHead: 'X2' },  // Closed Hi-Hat
    54: { key: 'g/5', noteHead: 'X2' },  // Tambourine
    56: { key: 'g/5', noteHead: 'X2' },  // Cowbell
    58: { key: 'g/5', noteHead: 'X2' },  // Vibraslap
    // 8. Open Hi-Hat: Space above line 5 (g/5) with circle-x notehead (X3)
    46: { key: 'g/5', noteHead: 'X3' }, // Open Hi-Hat (circle-x)
    // 9. Hi-Hat Pedal: Space below line 1 (d/4) with 'X2' notehead (stem down)
    44: { key: 'd/4', noteHead: 'X2' },  // Pedal Hi-Hat
    // 10. Open Cymbal / Crash Cymbal: Ledger line above staff (a/5) with 'X2' notehead
    49: { key: 'a/5', noteHead: 'X2' },  // Crash Cymbal 1
    57: { key: 'a/5', noteHead: 'X2' },  // Crash Cymbal 2
    55: { key: 'a/5', noteHead: 'X2' },  // Splash Cymbal
    52: { key: 'a/5', noteHead: 'X2' },  // Chinese Cymbal
};

const COMMON_VEXFLOW_DURATIONS_SET = new Set(Object.keys(DURATION_TO_VEXFLOW).map(Number));

const KEY_SIGNATURE_SPEC: { [key: string]: { [note: string]: string } } = {
    // Major keys
    'C': {},
    'G': { 'F': '#' },
    'D': { 'F': '#', 'C': '#' },
    'A': { 'F': '#', 'C': '#', 'G': '#' },
    'E': { 'F': '#', 'C': '#', 'G': '#', 'D': '#' },
    'B': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' },
    'F#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#' },
    'C#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#', 'B': '#' },
    'F': { 'B': 'b' },
    'Bb': { 'B': 'b', 'E': 'b' },
    'Eb': { 'B': 'b', 'E': 'b', 'A': 'b' },
    'Ab': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b' },
    'Db': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b' },
    'Gb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b' },
    'Cb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b', 'F': 'b' },
    // Minor keys (same accidentals as their relative major)
    'Am': {},                                                                          // = C major
    'Em': { 'F': '#' },                                                                // = G major
    'Bm': { 'F': '#', 'C': '#' },                                                     // = D major
    'F#m': { 'F': '#', 'C': '#', 'G': '#' },                                          // = A major
    'C#m': { 'F': '#', 'C': '#', 'G': '#', 'D': '#' },                                // = E major
    'G#m': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' },                      // = B major
    'D#m': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#' },            // = F# major
    'A#m': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#', 'B': '#' },  // = C# major
    'Dm': { 'B': 'b' },                                                               // = F major
    'Gm': { 'B': 'b', 'E': 'b' },                                                     // = Bb major
    'Cm': { 'B': 'b', 'E': 'b', 'A': 'b' },                                           // = Eb major
    'Fm': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b' },                                // = Ab major
    'Bbm': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b' },                     // = Db major
    'Ebm': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b' },           // = Gb major
    'Abm': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b', 'F': 'b' } // = Cb major
};

interface TimelineNoteEvent {
    type: 'note';
    timeMs: number;
    durationMs: number;
    notesAtTime: NoteFragment[];
    vexNoteId: string;
    originalNoteId: string;
    fragmentMapping: { fragmentId: string; keyIndex: number }[];
    midiValue: number;
    primaryVexFlowDuration?: { type: string, dots: number, isTriplet?: boolean };
}

interface TimelineRestEvent {
    type: 'rest';
    timeMs: number;
    durationMs: number;
}

type TimelineEvent = TimelineNoteEvent | TimelineRestEvent;

const SORTED_COMMON_DURATIONS: number[] = Object.keys(DURATION_TO_VEXFLOW)
    .map(Number)
    .sort((a, b) => b - a);

const SORTED_ALL_DURATIONS: number[] = Object.keys(DURATION_TO_VEXFLOW)
    .map(Number)
    .sort((a, b) => {
        const aIsTriplet = DURATION_TO_VEXFLOW[a]?.isTriplet;
        const bIsTriplet = DURATION_TO_VEXFLOW[b]?.isTriplet;
        if (aIsTriplet !== bIsTriplet) return aIsTriplet ? 1 : -1;
        return b - a;
    });

const DURATION_ENTRY_TO_VALUE = new Map<string, number>();
Object.entries(DURATION_TO_VEXFLOW).forEach(([k, v]) => {
    const key = `${v.type}-${v.dots}-${!!v.isTriplet}`;
    if (!DURATION_ENTRY_TO_VALUE.has(key)) {
        DURATION_ENTRY_TO_VALUE.set(key, Number(k));
    }
});

function getDurationValue(vexDuration: { type: string, dots: number, isTriplet?: boolean }): number {
    const key = `${vexDuration.type}-${vexDuration.dots}-${!!vexDuration.isTriplet}`;
    return DURATION_ENTRY_TO_VALUE.get(key) ?? 0;
}

function quantizeMusicalDuration(q: number): number {
    // 1. Triplets (preserve triplets with exact mathematical fractions)
    if (Math.abs(q - 1/3) < 0.045) return 1/3;       // 8th note triplet (0.3333)
    if (Math.abs(q - 1/6) < 0.030) return 1/6;       // 16th note triplet (0.1667)
    if (Math.abs(q - 2/3) < 0.055) return 2/3;       // Quarter note triplet (0.6667)
    if (Math.abs(q - 4/3) < 0.075) return 4/3;       // Half note triplet (1.3333)
    if (Math.abs(q - 8/3) < 0.085) return 8/3;       // Whole note triplet (2.6667)
    if (Math.abs(q - 1/12) < 0.020) return 1/12;     // 32nd note triplet (0.0833)

    // 2. Standard note durations (clean snapping for long notes and regular notes)
    if (q >= 3.45 && q <= 4.45) return 4;           // Whole note (w)
    if (q >= 2.75 && q <= 3.35) return 3;           // Dotted half note (h.)
    if (q >= 1.70 && q <= 2.30) return 2;           // Half note (h)
    if (q >= 1.42 && q <= 1.62) return 1.5;         // Dotted quarter note (q.)
    if (q >= 0.82 && q <= 1.20) return 1;           // Quarter note (q)
    if (q >= 0.72 && q <= 0.80) return 0.75;        // Dotted 8th note (8.)
    if (q >= 0.44 && q <= 0.58) return 0.5;         // 8th note (8)
    if (q >= 0.22 && q <= 0.28) return 0.25;        // 16th note (16)
    if (q >= 0.11 && q <= 0.14) return 0.125;       // 32nd note (32)

    return q;
}

function getClosestCommonDuration(q: number): number | null {
    let closestCommonQ: number | null = null;
    let minDiff = Infinity;
    for (const commonQ of SORTED_COMMON_DURATIONS) {
        const diff = Math.abs(q - commonQ);
        if (diff < minDiff) {
            minDiff = diff;
            closestCommonQ = commonQ;
        }
    }
    return closestCommonQ;
}

const STANDARD_NON_TRIPLET_DURATIONS: number[] = [
    4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.1875, 0.125, 0.09375, 0.0625, 0.046875, 0.03125
];

function getSingleDurationFromBeats(durationInQuarterNotes: number): { type: string, dots: number, isTriplet?: boolean } {
    if (durationInQuarterNotes <= 0) return { type: '16', dots: 0 };
    const quantized = quantizeMusicalDuration(durationInQuarterNotes);
    if (DURATION_TO_VEXFLOW[quantized]) return DURATION_TO_VEXFLOW[quantized];

    // Pick the single closest standard non-triplet duration (tie-breaking toward the smaller/cleaner value)
    let bestDur = 0.25;
    let minDiff = Infinity;
    for (const d of STANDARD_NON_TRIPLET_DURATIONS) {
        const diff = Math.abs(durationInQuarterNotes - d);
        if (diff < minDiff || (Math.abs(diff - minDiff) < 1e-6 && d < bestDur)) {
            minDiff = diff;
            bestDur = d;
        }
    }
    return DURATION_TO_VEXFLOW[bestDur] || { type: '16', dots: 0 };
}

function getVexFlowDuration(durationInQuarterNotes: number): { type: string, dots: number, isTriplet?: boolean } {
    if (durationInQuarterNotes <= 0) return { type: '16', dots: 0 };
    const quantized = quantizeMusicalDuration(durationInQuarterNotes);
    if (DURATION_TO_VEXFLOW[quantized]) return DURATION_TO_VEXFLOW[quantized];

    const snappedDuration = getClosestCommonDuration(durationInQuarterNotes);
    if (snappedDuration !== null && Math.abs(snappedDuration - durationInQuarterNotes) < SNAP_TOLERANCE && DURATION_TO_VEXFLOW[snappedDuration]) {
      return DURATION_TO_VEXFLOW[snappedDuration];
    }
    return { type: '16', dots: 0 };
}

function decomposeDuration(durationInQuarters: number): { type: string, dots: number, isTriplet?: boolean }[] {
    if (durationInQuarters <= 0) return [{ type: '16', dots: 0 }];

    // 1. Quantize directly to standard musical duration or triplet
    const quantized = quantizeMusicalDuration(durationInQuarters);
    if (DURATION_TO_VEXFLOW[quantized]) {
        return [DURATION_TO_VEXFLOW[quantized]];
    }

    // Check near-match in common durations
    let closestMatch: number | null = null;
    let minDiff = Infinity;
    for (const commonQ of SORTED_COMMON_DURATIONS) {
        const diff = Math.abs(durationInQuarters - commonQ);
        if (diff < minDiff) {
            minDiff = diff;
            closestMatch = commonQ;
        }
    }

    if (closestMatch !== null && minDiff < 0.05) {
        const entry = DURATION_TO_VEXFLOW[closestMatch];
        if (entry) return [entry];
    }

    // 2. Greedy decomposition with pre-sorted lookup
    const results: { type: string, dots: number, isTriplet?: boolean }[] = [];
    let remaining = durationInQuarters;

    let loopCount = 0;
    const MAX_LOOPS = 16;

    while (remaining > DURATION_MATCH_TOLERANCE && loopCount < MAX_LOOPS) {
        // If remaining can be quantized cleanly to a standard duration, take it and finish
        const remQuantized = quantizeMusicalDuration(remaining);
        if (remQuantized <= remaining + 0.05 && DURATION_TO_VEXFLOW[remQuantized]) {
            results.push(DURATION_TO_VEXFLOW[remQuantized]);
            break;
        }

        let found = false;
        for (const dur of SORTED_ALL_DURATIONS) {
            if (remaining >= dur - DURATION_MATCH_TOLERANCE) {
                const entry = DURATION_TO_VEXFLOW[dur];
                if (entry) {
                    results.push(entry);
                    remaining -= dur;
                    found = true;
                    break;
                }
            }
        }
        if (!found) break;
        loopCount++;
    }
    
    if (results.length === 0) return [{ type: '16', dots: 0 }];
    return results;
}

function processHandAndAccidentals(
    allFragmentsInMeasure: NoteFragment[],
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass' | 'percussion',
    measureStartTime: number,
    measureEndTime: number,
    keySpec: { [note: string]: string },
    activeAccidentals: Map<string, string>,
    is8vaActive: boolean,
    is15maActive: boolean,
    is8vbActive: boolean,
    is15mbActive: boolean,
    showOnlyMajorRests: boolean,
    currentMeasureKeySignature: string,
    getBpmAtTime: (timeMs: number) => number,
    isRollView: boolean,
    instrumentMode: 'piano' | 'drum' = 'piano'
): { notes: VexFlowNoteInfo[], tuplets: VexFlowTupletGroup[], finalClef: 'treble' | 'bass' | 'percussion' } {
    const handFragments = allFragmentsInMeasure.filter(n => n.hand === hand);
    const groupedByTime = new Map<number, NoteFragment[]>();
    handFragments.forEach(note => {
        if (!groupedByTime.has(note.timeMs)) groupedByTime.set(note.timeMs, []);
        groupedByTime.get(note.timeMs)!.push(note);
    });
    const sortedTimestamps = Array.from(groupedByTime.keys()).sort((a, b) => a - b);
    
    const rawTimelineEvents: TimelineEvent[] = [];
    let timelineCursorMs = measureStartTime; 
    let noteCounter = 0;

    sortedTimestamps.forEach((timestamp, index) => {
        const restGapMs = timestamp - timelineCursorMs;
        const bpmForRest = getBpmAtTime(timelineCursorMs);
        const msPerQuarterForRest = 60000 / bpmForRest;
        const minRestDurationMs = 0.25 * msPerQuarterForRest;

        if (restGapMs >= minRestDurationMs) {
            rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: restGapMs });
            timelineCursorMs += restGapMs;
        } else {
            if (rawTimelineEvents.length > 0 && rawTimelineEvents[rawTimelineEvents.length - 1].type === 'note') {
                rawTimelineEvents[rawTimelineEvents.length - 1].durationMs += restGapMs;
            }
            timelineCursorMs = timestamp;
        }

        const notesAtTime = groupedByTime.get(timestamp)!.sort((a, b) => a.midi - b.midi);
        
        const nextNoteEventTime = sortedTimestamps[index + 1];
        const maxAvailableMs = (nextNoteEventTime !== undefined ? nextNoteEventTime : measureEndTime) - timestamp;
        const maxNoteDurationMs = Math.max(...notesAtTime.map(n => n.durationMs));

        const localBpm = getBpmAtTime(timestamp);
        const localMsPerQuarter = 60000 / localBpm;
        const gapToNextMs = maxAvailableMs - maxNoteDurationMs;
        const gapInQuarters = gapToNextMs / localMsPerQuarter;

        // Jika showOnlyMajorRests aktif (show only major notes / drum):
        // Kembali ke versi dulu saat tidak memakai note duration MIDI dan tidak pakai tie dll.
        // Durasi dihitung ritmis hingga not berikutnya atau akhir birama.
        let durationForGroupMs: number;
        if (showOnlyMajorRests) {
            durationForGroupMs = maxAvailableMs;
        } else if (gapInQuarters < 0.25 || (maxAvailableMs > 0 && maxNoteDurationMs / maxAvailableMs >= 0.70)) {
            // Sensitivitas celah antar-not pada mode realistis piano: gabungkan jika legato / celah kecil
            durationForGroupMs = maxAvailableMs;
        } else {
            durationForGroupMs = Math.max(0, Math.min(maxNoteDurationMs, maxAvailableMs));
        }

        rawTimelineEvents.push({
            type: 'note', timeMs: timestamp, durationMs: durationForGroupMs, notesAtTime: notesAtTime,
            vexNoteId: `vexnote-${hand}-${timestamp}-${noteCounter++}`,
            originalNoteId: notesAtTime[0].originalNoteId,
            fragmentMapping: notesAtTime.map((note, idx) => ({ fragmentId: note.fragmentId, keyIndex: idx })),
            midiValue: Math.min(...notesAtTime.map(n => n.midi)),
        });
        timelineCursorMs += durationForGroupMs;
    });

    const finalRestGapMs = measureEndTime - timelineCursorMs;
    const bpmForFinalRest = getBpmAtTime(timelineCursorMs);
    const msPerQuarterForFinalRest = 60000 / bpmForFinalRest;
    const minFinalRestMs = 0.25 * msPerQuarterForFinalRest;

    if (finalRestGapMs >= minFinalRestMs) {
        rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: finalRestGapMs });
    } else if (finalRestGapMs > 0 && rawTimelineEvents.length > 0 && rawTimelineEvents[rawTimelineEvents.length - 1].type === 'note' && !showOnlyMajorRests) {
        rawTimelineEvents[rawTimelineEvents.length - 1].durationMs += finalRestGapMs;
    }

    const processedTimelineEvents: TimelineEvent[] = [];
    rawTimelineEvents.forEach(event => {
        if (event.type === 'note') {
            const bpm = getBpmAtTime(event.timeMs);
            const localMsPerQuarterNote = 60000 / bpm;
            if (localMsPerQuarterNote <= 0) return;
            const durationQuarters = event.durationMs / localMsPerQuarterNote;
            if (durationQuarters < MIN_NOTE_DURATION_TO_RENDER) {
                processedTimelineEvents.push({ type: 'rest', timeMs: event.timeMs, durationMs: event.durationMs });
            } else {
                processedTimelineEvents.push(event);
            }
        } else {
            processedTimelineEvents.push(event);
        }
    });

    const finalFilteredTimelineEvents: TimelineEvent[] = [...processedTimelineEvents];

    const finalVexNotes: VexFlowNoteInfo[] = [];
    let currentClef: 'treble' | 'bass' | 'percussion' = effectiveClef;
    let lastMidiInHand: number | null = null;

    finalFilteredTimelineEvents.forEach(event => {
        const bpm = getBpmAtTime(event.timeMs);
        const localMsPerQuarterNote = 60000 / bpm;
        if (localMsPerQuarterNote <= 0) return;

        const durationQuarters = event.durationMs / localMsPerQuarterNote;
        if (durationQuarters < DURATION_MATCH_TOLERANCE) return;

        // When showOnlyMajorRests is enabled, never split a note into multiple tied notes;
        // determine note length as a single note directly from the beat distance between notes.
        const decomposedDurations = showOnlyMajorRests
            ? [getSingleDurationFromBeats(durationQuarters)]
            : decomposeDuration(durationQuarters);
        
        let cumulativeTimeMs = event.timeMs;
        let cumulativeQuarters = 0;

        decomposedDurations.forEach((vexDuration, index) => {
            if (!vexDuration) return;
            const durationValue = getDurationValue(vexDuration);
            const durationMsForThisPart = durationValue * localMsPerQuarterNote;

            if (event.type === 'rest') {
                const restKey = instrumentMode === 'drum'
                    ? (hand === 'left' ? "d/4" : "b/4")
                    : (hand === 'right' ? (currentClef === 'bass' ? "d/3" : "b/4") : (currentClef === 'treble' ? "b/4" : "d/3"));
                finalVexNotes.push({
                    vexNoteId: `rest-${hand}-${event.timeMs}-${index}`,
                    hand: hand, midiValue: -1,
                    vexNote: { keys: [restKey], duration: `${vexDuration.type}r`, dots: vexDuration.dots, clef: currentClef },
                    fragmentMapping: [], timeMs: cumulativeTimeMs, durationMs: durationMsForThisPart,
                    isTriplet: vexDuration.isTriplet,
                });
            } else {
                const notesAtTime = event.notesAtTime!;
                const keysForStaveNote: string[] = [];
                const accidentalsForStaveNote: { index: number; type: string }[] = [];
                const noteHeadsForStaveNote: string[] = [];

                // Per-beat calculation for Clef and 8va/8vb (HANYA untuk kasus ekstrem, misal not sebelahan jaraknya jauh / terpaksa saja):
                const currentMinMidi = notesAtTime.length > 0 ? Math.min(...notesAtTime.map(n => n.midi)) : 60;
                const currentMaxMidi = notesAtTime.length > 0 ? Math.max(...notesAtTime.map(n => n.midi)) : 60;
                const leapDist = lastMidiInHand !== null ? Math.abs(currentMinMidi - lastMidiInHand) : 0;

                if (instrumentMode === 'piano') {
                    if (hand === 'right') {
                        if (currentClef === 'treble') {
                            if (currentMaxMidi < CLEF_CHANGE_DEEP_BASS_MIDI || (leapDist >= EXTREME_LEAP_SEMITONES && currentMaxMidi < 52)) {
                                currentClef = 'bass';
                            }
                        } else if (currentClef === 'bass') {
                            if (currentMinMidi >= 64 || (leapDist >= EXTREME_LEAP_SEMITONES && currentMinMidi >= 60)) {
                                currentClef = 'treble';
                            }
                        }
                    } else {
                        if (currentClef === 'bass') {
                            if (currentMinMidi > CLEF_CHANGE_HIGH_TREBLE_MIDI || (leapDist >= EXTREME_LEAP_SEMITONES && currentMinMidi > 69)) {
                                currentClef = 'treble';
                            }
                        } else if (currentClef === 'treble') {
                            if (currentMaxMidi <= 57 || (leapDist >= EXTREME_LEAP_SEMITONES && currentMaxMidi <= 60)) {
                                currentClef = 'bass';
                            }
                        }
                    }
                }
                const noteClef = currentClef;

                // 8va / 8vb berubah per bar (bukan per beat), menggunakan status bar-level is8vaActive / is8vbActive:
                const note8va = instrumentMode === 'piano' && hand === 'right' && is8vaActive;
                const note8vb = instrumentMode === 'piano' && hand === 'left' && is8vbActive;
                lastMidiInHand = currentMinMidi;

                notesAtTime.forEach((note, chordNoteIndex) => {
                    if (instrumentMode === 'drum') {
                        const drumMap = DRUM_MIDI_MAPPING[note.midi] || { key: 'a/4' };
                        const keyWithHead = drumMap.noteHead ? `${drumMap.key}/${drumMap.noteHead}` : drumMap.key;
                        keysForStaveNote.push(keyWithHead);
                        noteHeadsForStaveNote.push(drumMap.noteHead || '');
                        return;
                    }
                    let octave = Math.floor(note.midi / 12) - 1;
                    let currentNotePitchClass = note.pitchClass;
                    const isSharpContext = SHARP_KEYS.includes(currentMeasureKeySignature) || NEUTRAL_KEYS.includes(currentMeasureKeySignature);
                    const isFlatContext = FLAT_KEYS.includes(currentMeasureKeySignature);

                    if (isSharpContext) {
                        const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[currentNotePitchClass];
                        if (sharpEquivalent) currentNotePitchClass = sharpEquivalent;
                    } else if (isFlatContext) {
                        const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[currentNotePitchClass];
                        if (flatEquivalent) currentNotePitchClass = flatEquivalent;
                    }

                    const basePitch = currentNotePitchClass.charAt(0);
                    const intendedModifier = currentNotePitchClass.substring(1);
                    const notePositionKey = `${basePitch}/${octave}`;
                    const keySigModifier = keySpec[basePitch] || '';
                    const lastAppliedModifierInBar = activeAccidentals.get(notePositionKey);
                    const currentlyActiveModifier = (lastAppliedModifierInBar !== undefined) ? lastAppliedModifierInBar : keySigModifier;

                    if (index === 0 && intendedModifier !== currentlyActiveModifier) {
                        let accidentalType = '';
                        if (intendedModifier === '#') accidentalType = '#';
                        else if (intendedModifier === 'b') accidentalType = 'b';
                        else if (intendedModifier === '') accidentalType = 'n';
                        if (accidentalType) accidentalsForStaveNote.push({ index: chordNoteIndex, type: accidentalType });
                    }
                    activeAccidentals.set(notePositionKey, intendedModifier);
                    
                    if (hand === 'right') {
                        if (note8va) octave -= 1;
                    } else {
                        if (note8vb) octave += 1;
                    }
                    
                    keysForStaveNote.push(`${basePitch.toLowerCase()}/${octave}`);
                    noteHeadsForStaveNote.push('');
                });

                const tempStave = new Stave(0, 0, 100);
                tempStave.setClef(noteClef);
                const tempNote = new StaveNote({ keys: keysForStaveNote, duration: vexDuration.type, clef: noteClef });
                
                if (accidentalsForStaveNote.length > 0) {
                    accidentalsForStaveNote.forEach(acc => {
                        if (acc && acc.type) tempNote.addModifier(new Accidental(acc.type), acc.index);
                    });
                }
                tempNote.setStave(tempStave);
                const noteYs = tempNote.getYs();
                const keyProps = tempNote.getKeyProps();

                const isGroupTieStart = !showOnlyMajorRests && notesAtTime.some(n => !!n.isTieStart);
                const isGroupTieEnd = !showOnlyMajorRests && notesAtTime.some(n => !!n.isTieEnd);
                const partTieStart = !showOnlyMajorRests && (index < decomposedDurations.length - 1 || isGroupTieStart);
                const partTieEnd = !showOnlyMajorRests && (index > 0 || isGroupTieEnd);

                finalVexNotes.push({
                    vexNoteId: `${event.vexNoteId}-${index}`,
                    hand: hand,
                    vexNote: { keys: keysForStaveNote, duration: vexDuration.type, dots: vexDuration.dots, clef: noteClef },
                    octaveShift: note8va ? '8va' : note8vb ? '8vb' : undefined,
                    midiValue: event.midiValue!,
                    accidentals: accidentalsForStaveNote,
                    noteHeads: noteHeadsForStaveNote.some(h => h !== '') ? noteHeadsForStaveNote : undefined,
                    fragmentMapping: event.fragmentMapping!,
                    timeMs: cumulativeTimeMs,
                    durationMs: durationMsForThisPart,
                    originalNotes: notesAtTime,
                    originalNoteIds: notesAtTime.map(n => n.originalNoteId),
                    fingering: notesAtTime.map(n => n.finger),
                    isTieStart: notesAtTime.map(n => !showOnlyMajorRests && (index < decomposedDurations.length - 1 || !!n.isTieStart)),
                    isTieEnd: notesAtTime.map(n => !showOnlyMajorRests && (index > 0 || !!n.isTieEnd)),
                    vexNoteYPositions: noteYs,
                    vexNoteKeyProps: keyProps.map(kp => ({ line: kp.line })),
                    isTriplet: vexDuration.isTriplet,
                });
            }
            cumulativeQuarters += durationValue;
            cumulativeTimeMs = event.timeMs + (cumulativeQuarters * localMsPerQuarterNote);
        });
    });

    // Detect Tuplets mathematically
    const tuplets: VexFlowTupletGroup[] = [];
    let pendingIndices: number[] = [];
    let pendingType = '';

    finalVexNotes.forEach((vn, idx) => {
        if (vn.isTriplet) {
            if (pendingType && vn.vexNote.duration !== pendingType) {
                pendingIndices = [];
            }
            pendingType = vn.vexNote.duration;
            pendingIndices.push(idx);
            if (pendingIndices.length === 3) {
                tuplets.push({ hand, indices: [...pendingIndices] });
                pendingIndices = [];
                pendingType = '';
            }
        } else {
            pendingIndices = [];
            pendingType = '';
        }
    });

    return { notes: finalVexNotes, tuplets, finalClef: currentClef };
}

function computeMinWidthFromNotes(
    fragmentsInMeasure: NoteFragment[], 
    getBpmAtTime: (timeMs: number) => number, 
    zoom: number, 
    isRollView: boolean,
    measureEndTime: number
): number {
    const noteZoom = getNoteZoom(zoom, isRollView);
    const layoutZoom = getLayoutZoom(zoom, isRollView);
    if (fragmentsInMeasure.length === 0) return 90 * layoutZoom * UNIVERSAL_SCALE;

    let total = 0;
    const timestamps = [...new Set(fragmentsInMeasure.map(f => f.timeMs))].sort((a,b)=>a-b);
    
    for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps[i];
        const group = fragmentsInMeasure.filter(f => f.timeMs === t);
        const nextTime = (i + 1 < timestamps.length) ? timestamps[i+1] : measureEndTime;
        const distanceMs = nextTime - t;
        const bpm = getBpmAtTime(t);
        const localMsPerQuarterNote = 60000 / bpm;
        const distanceQN = distanceMs > 0 ? distanceMs / localMsPerQuarterNote : 0;

        let baseWidth = 40;
        if (distanceQN >= 1) baseWidth = 50;          
        else if (distanceQN >= 0.5) baseWidth = 44;   
        else if (distanceQN >= 0.25) baseWidth = 38;  
        else baseWidth = 34;                        
        
        baseWidth += (group.length - 1) * 8;
        const hasAccidental = group.some(n => n.pitchClass.includes("#") || n.pitchClass.includes("b"));
        if (hasAccidental) baseWidth += 14;
        
        const calculatedPx = baseWidth * UNIVERSAL_SCALE * noteZoom;
        const minSpacingPx = isRollView ? 0 : (hasAccidental ? 20 : 15);
        total += Math.max(minSpacingPx, calculatedPx);
    }
    return Math.max(100 * layoutZoom * UNIVERSAL_SCALE, total);
}

export const getVexFlowRenderData = (
    notes: MidiNotePlaybackItem[], timeSignature: TimeSignatureInfo, initialTempoBpm: number, keySignatureStr: string, zoom: number = 1,
    barLinesMs: number[], signatureEvents: SignatureEvent[], viewWidth: number, viewHeight: number, showOnlyMajorRests: boolean,
    tempoEvents: TempoEvent[], playbackTempoMultiplier: number, isRollView: boolean = false, instrumentMode: 'piano' | 'drum' = 'piano'
): VexFlowRenderData => {
    if (viewWidth == null || viewWidth <= 0 || !Number.isFinite(viewWidth) || viewHeight == null || viewHeight <= 0 || !Number.isFinite(viewHeight)) {
      return { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing: BASE_GRAND_STAFF_VERTICAL_SPACING, instrumentMode };
    }
    
    const effectiveShowOnlyMajorRests = instrumentMode === 'drum' ? true : showOnlyMajorRests;
    const verticalSpacing = isRollView ? BASE_GRAND_STAFF_VERTICAL_SPACING * ROLL_VIEW_SCALE_MULTIPLIER : BASE_GRAND_STAFF_VERTICAL_SPACING;
    const defaultReturn = { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing, instrumentMode };
    if (notes.length === 0 || !timeSignature || initialTempoBpm <= 0) return defaultReturn;

    const effectiveZoom = isRollView ? zoom * ROLL_VIEW_SCALE_MULTIPLIER : zoom * SHEET_VIEW_SCALE_MULTIPLIER;
    const sortedTempoEvents = [...tempoEvents].sort((a, b) => a.timeMs - b.timeMs);
    const getBpmAtTime = (timeMs: number): number => {
      let activeBpm = initialTempoBpm;
      for (const event of sortedTempoEvents) { if (event.timeMs <= timeMs) activeBpm = event.bpm; else break; }
      return activeBpm;
    };

    const initialMsPerQuarterNote = 60000 / initialTempoBpm;
    const totalMusicalDurationMs = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    const totalBeats = totalMusicalDurationMs / initialMsPerQuarterNote;
    let PIXELS_PER_BEAT = 135 * UNIVERSAL_SCALE * getLayoutZoom(effectiveZoom, isRollView);

    const STAFF_HEIGHT_PX = 50 * UNIVERSAL_SCALE;
    let topStaveYOffset = Math.max(65 * UNIVERSAL_SCALE, (viewHeight - (STAFF_HEIGHT_PX + verticalSpacing + STAFF_HEIGHT_PX)) / 2);

    const effectiveBarLines = [...barLinesMs];
    const lastNoteEndTime = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    if (effectiveBarLines.length === 0 && notes.length > 0) effectiveBarLines.push(notes[0].timeMs);
    if (lastNoteEndTime > effectiveBarLines[effectiveBarLines.length - 1]) effectiveBarLines.push(lastNoteEndTime);
    if (effectiveBarLines.length < 2) return defaultReturn;

    const isDrumFoot = (midi: number) => midi === 35 || midi === 36 || midi === 44;
    const allFragments: NoteFragment[] = notes.map(n => ({
        ...n,
        hand: instrumentMode === 'drum' ? (isDrumFoot(n.midi) ? 'left' : 'right') : n.hand,
        fragmentId: `${n.noteId}-0`,
        originalNoteId: n.noteId
    }));
    const noteIdToFragmentsMap = new Map<string, NoteFragment[]>();
    allFragments.forEach(f => { if (!noteIdToFragmentsMap.has(f.originalNoteId)) noteIdToFragmentsMap.set(f.originalNoteId, []); noteIdToFragmentsMap.get(f.originalNoteId)!.push(f); });

    const timeSigChanges = new Map<number, TimeSignatureInfo>();
    const keySigChanges = new Map<number, string>();
    const tempoChanges = new Map<number, number>();

    signatureEvents.forEach(e => {
        const nextBarLine = effectiveBarLines.find(b => b >= e.timeMs);
        if (nextBarLine !== undefined) {
            if (e.time) timeSigChanges.set(nextBarLine, e.time);
            if (e.key) keySigChanges.set(nextBarLine, e.key);
        } else if (e.timeMs === 0) {
            if (e.time) timeSigChanges.set(0, e.time);
            if (e.key) keySigChanges.set(0, e.key);
        }
    });

    tempoEvents.forEach(e => {
        const nextBarLine = effectiveBarLines.find(b => b >= e.timeMs);
        if (nextBarLine !== undefined && !tempoChanges.has(nextBarLine)) {
            tempoChanges.set(nextBarLine, e.bpm);
        } else if (e.timeMs === 0 && !tempoChanges.has(0)) {
            tempoChanges.set(0, e.bpm);
        }
    });

    let runningClefRH: 'treble' | 'bass' | 'percussion' = instrumentMode === 'drum' ? 'percussion' : 'treble';
    let runningClefLH: 'treble' | 'bass' | 'percussion' = instrumentMode === 'drum' ? 'percussion' : 'bass';
    let runningOctaveRH: 'none' | '8va' = 'none';
    let runningOctaveLH: 'none' | '8vb' = 'none';
    let lastDrawnClefRH: 'treble' | 'bass' | 'percussion' = runningClefRH;
    let lastDrawnClefLH: 'treble' | 'bass' | 'percussion' = runningClefLH;
    let lastDrawnKeySig = keySignatureStr;
    let lastDrawnTimeSig = timeSignature;
    let currentKeySig = keySignatureStr;
    let currentTsig = timeSignature;
    let currentTempoBpmForMeasure = initialTempoBpm;

    const boundaryEpsilon = 1.0; 

    // Precompute note boundaries and durations once for extreme performance (no repeated BPM lookups in loops)
    const preparedFragments = allFragments.map(f => {
        const bpmVal = getBpmAtTime(f.timeMs);
        const eighthMs = (60000 / bpmVal) / 2;
        const effectiveDur = effectiveShowOnlyMajorRests ? Math.min(f.durationMs, eighthMs) : f.durationMs;
        const noteEndMs = f.timeMs + effectiveDur;
        return {
            fragment: f,
            timeMs: f.timeMs,
            effectiveDur,
            noteEndMs
        };
    }).sort((a, b) => a.timeMs - b.timeMs);

    const getMeasureFragments = (mStart: number, mEnd: number): NoteFragment[] => {
        const result: NoteFragment[] = [];
        if (effectiveShowOnlyMajorRests) {
            // Versi dulu (show only major notes / drum): not tidak dipotong melintasi barline menjadi not tie
            for (let j = 0; j < preparedFragments.length; j++) {
                const p = preparedFragments[j];
                if (p.timeMs >= mEnd - boundaryEpsilon) {
                    break;
                }
                if (p.timeMs >= mStart - boundaryEpsilon) {
                    result.push({
                        ...p.fragment,
                        timeMs: p.timeMs,
                        durationMs: p.fragment.durationMs,
                        isTieStart: false,
                        isTieEnd: false
                    });
                }
            }
            return result;
        }

        for (let j = 0; j < preparedFragments.length; j++) {
            const p = preparedFragments[j];
            if (p.timeMs >= mEnd - boundaryEpsilon) {
                break;
            }
            if (p.noteEndMs > mStart + boundaryEpsilon) {
                const fragStart = Math.max(p.timeMs, mStart);
                const fragEnd = Math.min(p.noteEndMs, mEnd);
                result.push({
                    ...p.fragment,
                    timeMs: fragStart,
                    durationMs: fragEnd - fragStart,
                    isTieStart: p.noteEndMs > mEnd + boundaryEpsilon,
                    isTieEnd: p.timeMs < mStart - boundaryEpsilon
                });
            }
        }
        return result;
    };

    const measures: VexFlowMeasureData[] = [];
    const measureStartXList: number[] = [];
    let cumulativeWidth = HORIZONTAL_PADDING;

    for (let i = 0; i < effectiveBarLines.length - 1; i++) {
        const measureStartTime = effectiveBarLines[i], measureEndTime = effectiveBarLines[i + 1];
        
        const newKey = keySigChanges.get(measureStartTime);
        const newTime = timeSigChanges.get(measureStartTime);
        const newTempo = tempoChanges.get(measureStartTime);
        
        if (newKey) currentKeySig = newKey;
        if (newTime) currentTsig = newTime;
        if (newTempo) currentTempoBpmForMeasure = newTempo;

        const fragmentsInMeasure = getMeasureFragments(measureStartTime, measureEndTime);

        // Smart hand separation for grand staff piano sheet music:
        if (instrumentMode === 'piano' && runningClefRH === 'treble') {
            const timeGroups = new Map<number, NoteFragment[]>();
            fragmentsInMeasure.forEach(f => {
                if (!timeGroups.has(f.timeMs)) timeGroups.set(f.timeMs, []);
                timeGroups.get(f.timeMs)!.push(f);
            });

            timeGroups.forEach(notesAtTime => {
                const rhAtTime = notesAtTime.filter(n => n.hand === 'right');
                if (rhAtTime.length > 1) {
                    const maxMidi = Math.max(...rhAtTime.map(n => n.midi));
                    rhAtTime.forEach(n => {
                        if ((maxMidi - n.midi > 16 && n.midi < MIDDLE_C_MIDI) || n.midi < 48) {
                            n.hand = 'left';
                        }
                    });
                } else if (rhAtTime.length === 1 && rhAtTime[0].midi < 48) {
                    rhAtTime[0].hand = 'left';
                }
            });
        }

        const getFragmentsForHand = (h: 'left' | 'right') => {
            return fragmentsInMeasure.filter(f => f.hand === h);
        };

        const rhNotes = getFragmentsForHand('right');
        const lhNotes = getFragmentsForHand('left');

        const checkOctave = (notes: NoteFragment[], threshold: number, isHigher: boolean) => 
            notes.length > 0 && (notes.filter(n => isHigher ? n.midi >= threshold : n.midi <= threshold).length / notes.length >= OCTAVA_THRESHOLD_RATIO);

        if (instrumentMode === 'piano') {
            if (rhNotes.length > 0) {
                const maxMidiRH = Math.max(...rhNotes.map(n => n.midi));
                const minMidiRH = Math.min(...rhNotes.map(n => n.midi));
                if (runningOctaveRH === 'none') {
                    if (checkOctave(rhNotes, OCTAVA_8VA_THRESHOLD_MIDI, true) || (maxMidiRH >= OCTAVA_8VA_THRESHOLD_MIDI && minMidiRH >= 79)) {
                        runningOctaveRH = '8va';
                    }
                } else {
                    if (maxMidiRH < 86 || minMidiRH < 72) {
                        runningOctaveRH = 'none';
                    }
                }
            } else {
                runningOctaveRH = 'none';
            }

            if (lhNotes.length > 0) {
                const minMidiLH = Math.min(...lhNotes.map(n => n.midi));
                const maxMidiLH = Math.max(...lhNotes.map(n => n.midi));
                if (runningOctaveLH === 'none') {
                    if (checkOctave(lhNotes, OCTAVA_8VB_THRESHOLD_MIDI, false) || (minMidiLH <= OCTAVA_8VB_THRESHOLD_MIDI && maxMidiLH <= 45)) {
                        runningOctaveLH = '8vb';
                    }
                } else {
                    if (minMidiLH > 36 || maxMidiLH > 48) {
                        runningOctaveLH = 'none';
                    }
                }
            } else {
                runningOctaveLH = 'none';
            }
        } else {
            runningOctaveRH = 'none';
            runningOctaveLH = 'none';
        }

        const is15maActiveRH = false;
        const is8vaActiveRH = runningOctaveRH === '8va';
        const is15mbActiveLH = false;
        const is8vbActiveLH = runningOctaveLH === '8vb';

        const keySpec = KEY_SIGNATURE_SPEC[currentKeySig] || {};
        const accRH = new Map<string, string>();
        const accLH = new Map<string, string>();

        const incomingClefRH = runningClefRH;
        const incomingClefLH = runningClefLH;

        const processedRH = processHandAndAccidentals(rhNotes, 'right', incomingClefRH, measureStartTime, measureEndTime, keySpec, accRH, is8vaActiveRH, is15maActiveRH, is8vbActiveLH, is15mbActiveLH, effectiveShowOnlyMajorRests, currentKeySig, getBpmAtTime, isRollView, instrumentMode);
        const processedLH = processHandAndAccidentals(lhNotes, 'left', incomingClefLH, measureStartTime, measureEndTime, keySpec, accLH, is8vaActiveRH, is15maActiveRH, is8vbActiveLH, is15mbActiveLH, effectiveShowOnlyMajorRests, currentKeySig, getBpmAtTime, isRollView, instrumentMode);

        const firstRh = processedRH.notes.find(n => !n.vexNote.duration.includes('r'));
        const startClefRH = (firstRh && firstRh.vexNote.clef) ? firstRh.vexNote.clef : incomingClefRH;

        const firstLh = processedLH.notes.find(n => !n.vexNote.duration.includes('r'));
        const startClefLH = (firstLh && firstLh.vexNote.clef) ? firstLh.vexNote.clef : incomingClefLH;

        const isClefChangeRH = (i > 0 && startClefRH !== lastDrawnClefRH);
        const isClefChangeLH = (i > 0 && startClefLH !== lastDrawnClefLH);
        const isKeySigChange = (i > 0 && currentKeySig !== lastDrawnKeySig);
        const isTimeSigChange = (i > 0 && (currentTsig.numerator !== lastDrawnTimeSig.numerator || currentTsig.denominator !== lastDrawnTimeSig.denominator));

        let extraSignatureWidth = 0;
        if (isClefChangeRH || isClefChangeLH || isKeySigChange || isTimeSigChange) {
            try {
                const measureStave = new Stave(0, 0, 400);
                measureStave.setBegBarType(0);
                measureStave.setEndBarType(0);
                measureStave.options.num_lines = 0;
                measureStave.options.left_bar = false;
                measureStave.options.right_bar = false;
                if (isClefChangeRH) measureStave.addClef(startClefRH, 'default');
                else if (isClefChangeLH) measureStave.addClef(startClefLH, 'default');
                if (isKeySigChange) measureStave.addKeySignature(currentKeySig, lastDrawnKeySig);
                if (isTimeSigChange) measureStave.addTimeSignature(`${currentTsig.numerator}/${currentTsig.denominator}`);
                extraSignatureWidth = Math.max(35, Math.round(measureStave.getNoteStartX()) + 15);
            } catch (e) {
                if (isClefChangeRH || isClefChangeLH) extraSignatureWidth += 45;
                if (isKeySigChange) extraSignatureWidth += 40;
                if (isTimeSigChange) extraSignatureWidth += 35;
            }
        }

        let measureWidth = isRollView 
            ? (measureEndTime - measureStartTime) / 1000 * ROLL_VIEW_PIXELS_PER_SECOND * effectiveZoom * UNIVERSAL_SCALE
            : Math.max(computeMinWidthFromNotes(fragmentsInMeasure, getBpmAtTime, effectiveZoom, false, measureEndTime), currentTsig.numerator * (4 / currentTsig.denominator) * PIXELS_PER_BEAT) + HORIZONTAL_PADDING + (extraSignatureWidth * getLayoutZoom(effectiveZoom, false) * UNIVERSAL_SCALE);

        measureStartXList.push(cumulativeWidth);

        const m: VexFlowMeasureData = {
            rightHand: processedRH.notes,
            leftHand: processedLH.notes,
            startTimeMs: measureStartTime,
            endTimeMs: measureEndTime,
            width: measureWidth,
            durationMs: measureEndTime - measureStartTime,
            newKeySignature: (i === 0 || isKeySigChange) ? currentKeySig : undefined,
            newTimeSignature: (i === 0 || isTimeSigChange) ? currentTsig : undefined,
            newTempoBpm: (i === 0 || newTempo) ? currentTempoBpmForMeasure : undefined,
            activeKeySignature: currentKeySig,
            previousKeySignature: isKeySigChange ? lastDrawnKeySig : undefined,
            effectiveClefRH: startClefRH, 
            effectiveClefLH: startClefLH, 
            newClefRH: (i === 0 || isClefChangeRH) ? startClefRH : undefined,
            newClefLH: (i === 0 || isClefChangeLH) ? startClefLH : undefined, 
            isClefChangeRH,
            isClefChangeLH,
            isKeySigChange,
            isTimeSigChange,
            is8vaActiveRH: processedRH.notes.some(n => n.octaveShift === '8va'),
            is15maActiveRH: false,
            is8vbActiveLH: processedLH.notes.some(n => n.octaveShift === '8vb'),
            is15mbActiveLH: false,
            starts8vaRH: false, ends8vaRH: false, starts15maRH: false, ends15maRH: false, starts8vbLH: false, ends8vbLH: false, starts15mbLH: false, ends15mbLH: false,
            effectiveTimeSignature: currentTsig,
            hasDottedBeamableNotes: fragmentsInMeasure.some(f => {
                const dur = f.durationMs / (60000 / getBpmAtTime(f.timeMs));
                const vfd = getVexFlowDuration(dur);
                return !!(vfd && vfd.dots > 0 && ['8', '16', '32', '64'].includes(vfd.type));
            }),
            startsRepeat: fragmentsInMeasure.some(n => n.isRepeatStart),
            endsRepeat: fragmentsInMeasure.some(n => n.isRepeatEnd),
            rightHandTuplets: processedRH.tuplets,
            leftHandTuplets: processedLH.tuplets,
            instrumentMode
        };

        measures.push(m);

        // Update running clefs and last drawn clefs for next measure:
        runningClefRH = processedRH.finalClef;
        runningClefLH = processedLH.finalClef;
        lastDrawnClefRH = processedRH.finalClef;
        lastDrawnClefLH = processedLH.finalClef;
        lastDrawnKeySig = currentKeySig;
        lastDrawnTimeSig = currentTsig;

        cumulativeWidth += measureWidth;
    }

    const octaveLines: OctaveLineInfo[] = [];
    const tempoMarkings: TempoMarkingInfo[] = [];

    for (let i = 0; i < measures.length; i++) {
        const m = measures[i];
        const mStartX = measureStartXList[i];
        if (m.newTempoBpm !== undefined) {
            tempoMarkings.push({
                bpm: Math.round(m.newTempoBpm * playbackTempoMultiplier),
                x: mStartX,
                y: topStaveYOffset - 10
            });
        }
    }

    const addOctaveLine = (check: (idx: number) => boolean, type: OctaveLineInfo['type'], hand: 'right' | 'left', yOff: number) => {
        if (instrumentMode === 'drum') return;
        for (let i = 0; i < measures.length; i++) {
            if (check(i) && (i === 0 || !check(i - 1))) {
                let end = i;
                let w = 0;
                while (end < measures.length && check(end)) {
                    w += measures[end].width;
                    end++;
                }
                const startMeasure = measures[i];
                const endMeasure = measures[end - 1];
                octaveLines.push({
                    type,
                    hand,
                    startX: measureStartXList[i],
                    endX: measureStartXList[i] + w,
                    startY: topStaveYOffset + yOff,
                    endY: topStaveYOffset + yOff,
                    startTimeMs: startMeasure.startTimeMs,
                    endTimeMs: endMeasure.endTimeMs
                });
            }
        }
    };

    addOctaveLine(idx => measures[idx].is15maActiveRH, '15ma', 'right', -40);
    addOctaveLine(idx => measures[idx].is8vaActiveRH, '8va', 'right', -40);
    addOctaveLine(idx => measures[idx].is15mbActiveLH, '15mb', 'left', verticalSpacing + 80);
    addOctaveLine(idx => measures[idx].is8vbActiveLH, '8vb', 'left', verticalSpacing + 80);

    return { measures, octaveLines, tempoMarkings, topStaveYOffset, fragments: allFragments, noteIdToFragmentsMap, keySignature: keySignatureStr, timeSignature, verticalSpacing, instrumentMode };
};
