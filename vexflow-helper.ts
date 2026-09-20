
import { MidiNotePlaybackItem, TimeSignatureInfo, VexFlowMeasureData, VexFlowNoteInfo, VexFlowRenderData, OctaveLineInfo, NoteFragment, TempoEvent, TempoMarkingInfo, VexFlowTupletGroup } from './types';
import { getNoteZoom, getLayoutZoom, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, SignatureEvent } from './utils';
import { StaveNote, Beam, Stave, Accidental, Dot, Barline, StaveConnector, Renderer, Voice, Formatter } from 'vexflow';
import { BASE_PIXELS_PER_MILLISECOND } from './constants';

// --- Universal Scaling ---
const UNIVERSAL_SCALE = 0.40; 

// --- Constants ---
const BASE_GRAND_STAFF_VERTICAL_SPACING = 125; // Normal spacing at 100%
const ROLL_VIEW_SCALE_MULTIPLIER = 1.00; // Roll view default is 125%

const HORIZONTAL_PADDING = 15 * UNIVERSAL_SCALE;
const MIDDLE_C_MIDI = 60; // C4
const CLEF_CHANGE_THRESHOLD_RATIO = 0.75;
const CLEF_CHANGE_MIN_NOTES = 1;

// Octave thresholds
const OCTAVA_15MA_THRESHOLD_MIDI = 96; // C7
const OCTAVA_8VA_THRESHOLD_MIDI = 84;  // C6
const OCTAVA_8VB_THRESHOLD_MIDI = 36;  // C2
const OCTAVA_15MB_THRESHOLD_MIDI = 24; // C1
const OCTAVA_THRESHOLD_RATIO = 0.75;

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
    35: { key: 'f/4' }, // Bass Drum 2
    36: { key: 'f/4' }, // Bass Drum 1
    38: { key: 'c/5' }, // Snare Drum 1
    40: { key: 'c/5' }, // Snare Drum 2
    41: { key: 'a/4' }, // Low Floor Tom
    43: { key: 'a/4' }, // High Floor Tom
    45: { key: 'b/4' }, // Low Tom
    47: { key: 'b/4' }, // Low-Mid Tom
    48: { key: 'd/5' }, // Hi-Mid Tom
    50: { key: 'e/5' }, // High Tom
    42: { key: 'g/5', noteHead: 'x' },  // Closed Hi-Hat (x)
    46: { key: 'g/5', noteHead: 'x2' }, // Open Hi-Hat (circle-x)
    44: { key: 'd/4', noteHead: 'x' },  // Pedal Hi-Hat (x)
    49: { key: 'a/5', noteHead: 'x' },  // Crash Cymbal 1 (x)
    57: { key: 'a/5', noteHead: 'x' },  // Crash Cymbal 2 (x)
    51: { key: 'f/5', noteHead: 'x' },  // Ride Cymbal 1 (x)
    59: { key: 'f/5', noteHead: 'x' },  // Ride Cymbal 2 (x)
    53: { key: 'f/5', noteHead: 'x' },  // Ride Bell (x)
    55: { key: 'a/5', noteHead: 'x' },  // Splash Cymbal (x)
    52: { key: 'a/5', noteHead: 'x' },  // Chinese Cymbal (x)
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

function getClosestCommonDuration(q: number): number | null {
    let closestCommonQ: number | null = null;
    let minDiff = Infinity;
    for (const commonQ of Array.from(COMMON_VEXFLOW_DURATIONS_SET)) {
        const diff = Math.abs(q - commonQ);
        if (diff < minDiff) {
            minDiff = diff;
            closestCommonQ = commonQ;
        }
    }
    return closestCommonQ;
}

function getVexFlowDuration(durationInQuarterNotes: number): { type: string, dots: number, isTriplet?: boolean } {
    if (durationInQuarterNotes <= 0) return { type: '16', dots: 0 };
    const snappedDuration = getClosestCommonDuration(durationInQuarterNotes);
    if (snappedDuration !== null && Math.abs(snappedDuration - durationInQuarterNotes) < SNAP_TOLERANCE && DURATION_TO_VEXFLOW[snappedDuration]) {
      return DURATION_TO_VEXFLOW[snappedDuration];
    }
    const closest = Object.keys(DURATION_TO_VEXFLOW).map(Number).reduce((prev, curr) => (Math.abs(curr - durationInQuarterNotes) < Math.abs(prev - durationInQuarterNotes) ? curr : prev));
    return DURATION_TO_VEXFLOW[closest];
}

function decomposeDuration(durationInQuarters: number): { type: string, dots: number, isTriplet?: boolean }[] {
    // Check if it's a single triplet first to avoid breaking it into standard notes
    const closest = getClosestCommonDuration(durationInQuarters);
    if (closest !== null && Math.abs(closest - durationInQuarters) < 0.05) {
        const entry = DURATION_TO_VEXFLOW[closest];
        if (entry.isTriplet) return [entry];
    }

    const results: { type: string, dots: number, isTriplet?: boolean }[] = [];
    let remaining = durationInQuarters;
    // For standard decomposition, only use non-triplets
    const sortedDurations = Object.keys(DURATION_TO_VEXFLOW)
        .map(Number)
        .filter(k => !DURATION_TO_VEXFLOW[k].isTriplet)
        .sort((a, b) => b - a);

    let loopCount = 0;
    const MAX_LOOPS = 50; // Safety brake

    while (remaining > DURATION_MATCH_TOLERANCE && loopCount < MAX_LOOPS) {
        let found = false;
        for (const dur of sortedDurations) {
            if (remaining >= dur - DURATION_MATCH_TOLERANCE) {
                results.push(DURATION_TO_VEXFLOW[dur]);
                remaining -= dur;
                found = true;
                break;
            }
        }
        if (!found) break;
        loopCount++;
    }
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
): { notes: VexFlowNoteInfo[], tuplets: VexFlowTupletGroup[] } {
    const handFragments = instrumentMode === 'drum' ? allFragmentsInMeasure : allFragmentsInMeasure.filter(n => n.hand === hand);
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

        if (restGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterForRest) {
            rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: restGapMs });
            timelineCursorMs += restGapMs;
        } else {
            timelineCursorMs = timestamp;
        }

        const notesAtTime = groupedByTime.get(timestamp)!.sort((a, b) => a.midi - b.midi);
        
        let durationForGroupMs;
        if (!isRollView) {
            const nextNoteEventTime = sortedTimestamps[index + 1];
            const rhythmicDurationMs = (nextNoteEventTime !== undefined)
                ? nextNoteEventTime - timestamp
                : measureEndTime - timestamp;
            const timeToMeasureEndMs = measureEndTime - timestamp;
            durationForGroupMs = Math.min(rhythmicDurationMs, timeToMeasureEndMs);
            if (durationForGroupMs < 0) durationForGroupMs = 0;
        } else {
            const maxNoteDurationMs = Math.max(...notesAtTime.map(n => n.durationMs));
            const timeToMeasureEndMs = measureEndTime - timestamp;
            durationForGroupMs = Math.min(maxNoteDurationMs, timeToMeasureEndMs);
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
    if (finalRestGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterForFinalRest) {
        rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: finalRestGapMs });
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

    const finalFilteredTimelineEvents: TimelineEvent[] = [];
    if (showOnlyMajorRests) {
        for (let i = 0; i < processedTimelineEvents.length; i++) {
            const currentEvent = processedTimelineEvents[i];
            if (currentEvent.type === 'rest') {
                const bpm = getBpmAtTime(currentEvent.timeMs);
                const isMajorRest = currentEvent.durationMs >= (60000 / bpm * 0.95);
                if (!isMajorRest && finalFilteredTimelineEvents.length > 0) {
                    const lastProcessed = finalFilteredTimelineEvents[finalFilteredTimelineEvents.length - 1];
                    if (lastProcessed.type === 'note') {
                        lastProcessed.durationMs += currentEvent.durationMs;
                        continue;
                    }
                }
            }
            finalFilteredTimelineEvents.push(currentEvent);
        }
    } else {
        finalFilteredTimelineEvents.push(...processedTimelineEvents);
    }

    const finalVexNotes: VexFlowNoteInfo[] = [];
    finalFilteredTimelineEvents.forEach(event => {
        const bpm = getBpmAtTime(event.timeMs);
        const localMsPerQuarterNote = 60000 / bpm;
        if (localMsPerQuarterNote <= 0) return;

        const durationQuarters = event.durationMs / localMsPerQuarterNote;
        if (durationQuarters < DURATION_MATCH_TOLERANCE) return;

        let decomposedDurations: { type: string, dots: number, isTriplet?: boolean }[];
        
        if (!isRollView && event.type === 'note') {
            const targetDurationQuarters = durationQuarters;
            const sortedVexFlowDurationsDescending = Object.keys(DURATION_TO_VEXFLOW).map(Number).sort((a, b) => b - a);
            let singleBestVexFlowDurationValue: number | null = null;
            let minAbsoluteDiff = Infinity; 

            for (const durValue of sortedVexFlowDurationsDescending) {
                const diff = targetDurationQuarters - durValue;
                const absDiff = Math.abs(diff);
                if (absDiff < minAbsoluteDiff) {
                    minAbsoluteDiff = absDiff;
                    singleBestVexFlowDurationValue = durValue;
                }
            }
            if (singleBestVexFlowDurationValue === null) singleBestVexFlowDurationValue = 0.03125;
            decomposedDurations = [DURATION_TO_VEXFLOW[singleBestVexFlowDurationValue]];
        } else {
            decomposedDurations = decomposeDuration(durationQuarters);
        }
        
        let cumulativeTimeMs = event.timeMs;
        let cumulativeQuarters = 0;

        decomposedDurations.forEach((vexDuration, index) => {
            const durationValueStr = Object.keys(DURATION_TO_VEXFLOW).find(k => {
                const entry = DURATION_TO_VEXFLOW[Number(k)];
                return entry.type === vexDuration.type && entry.dots === vexDuration.dots && entry.isTriplet === vexDuration.isTriplet;
            });
            const durationValue = durationValueStr ? Number(durationValueStr) : 0;
            const durationMsForThisPart = durationValue * localMsPerQuarterNote;

            if (event.type === 'rest') {
                finalVexNotes.push({
                    vexNoteId: `rest-${hand}-${event.timeMs}-${index}`,
                    hand: hand, midiValue: -1,
                    vexNote: { keys: [hand === 'right' ? "b/4" : "d/3"], duration: `${vexDuration.type}r`, dots: vexDuration.dots, clef: effectiveClef },
                    fragmentMapping: [], timeMs: cumulativeTimeMs, durationMs: durationMsForThisPart,
                    isTriplet: vexDuration.isTriplet,
                });
            } else {
                const notesAtTime = event.notesAtTime!;
                const keysForStaveNote: string[] = [];
                const accidentalsForStaveNote: { index: number; type: string }[] = [];
                const noteHeadsForStaveNote: string[] = [];

                notesAtTime.forEach((note, chordNoteIndex) => {
                    if (instrumentMode === 'drum') {
                        const drumMap = DRUM_MIDI_MAPPING[note.midi] || { key: 'c/5' };
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
                        if (is15maActive) octave -= 2;
                        else if (is8vaActive) octave -= 1;
                    } else {
                        if (is15mbActive) octave += 2;
                        else if (is8vbActive) octave += 1;
                    }
                    
                    keysForStaveNote.push(`${basePitch.toLowerCase()}/${octave}`);
                    noteHeadsForStaveNote.push('');
                });

                const tempStave = new Stave(0, 0, 100);
                tempStave.setClef(effectiveClef);
                const tempNote = new StaveNote({ keys: keysForStaveNote, duration: vexDuration.type, clef: effectiveClef });
                
                if (accidentalsForStaveNote.length > 0) accidentalsForStaveNote.forEach(acc => tempNote.addModifier(new Accidental(acc.type), acc.index));
                tempNote.setStave(tempStave);
                const noteYs = tempNote.getYs();
                const keyProps = tempNote.getKeyProps();

                finalVexNotes.push({
                    vexNoteId: `${event.vexNoteId}-${index}`,
                    hand: hand,
                    vexNote: { keys: keysForStaveNote, duration: vexDuration.type, dots: vexDuration.dots, clef: effectiveClef },
                    midiValue: event.midiValue!,
                    accidentals: accidentalsForStaveNote,
                    noteHeads: noteHeadsForStaveNote.some(h => h !== '') ? noteHeadsForStaveNote : undefined,
                    fragmentMapping: event.fragmentMapping!,
                    timeMs: cumulativeTimeMs,
                    durationMs: durationMsForThisPart,
                    originalNotes: notesAtTime,
                    isTieStart: Array(keysForStaveNote.length).fill(false),
                    isTieEnd: Array(keysForStaveNote.length).fill(false),
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

    return { notes: finalVexNotes, tuplets };
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
    if (fragmentsInMeasure.length === 0) return 150 * layoutZoom * UNIVERSAL_SCALE;

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

        let baseWidth = 60;
        if (distanceQN >= 1) baseWidth = 70;          
        else if (distanceQN >= 0.5) baseWidth = 85;   
        else if (distanceQN >= 0.25) baseWidth = 100;  
        else baseWidth = 115;                        
        
        baseWidth += (group.length - 1) * 12;
        if (group.some(n => n.pitchClass.includes("#") || n.pitchClass.includes("b"))) baseWidth += 16;
        total += baseWidth * UNIVERSAL_SCALE * noteZoom;
    }
    return Math.max(150 * layoutZoom * UNIVERSAL_SCALE, total);
}

export const getVexFlowRenderData = (
    notes: MidiNotePlaybackItem[], timeSignature: TimeSignatureInfo, initialTempoBpm: number, keySignatureStr: string, zoom: number = 1,
    barLinesMs: number[], signatureEvents: SignatureEvent[], viewWidth: number, viewHeight: number, showOnlyMajorRests: boolean,
    tempoEvents: TempoEvent[], playbackTempoMultiplier: number, isRollView: boolean = false, instrumentMode: 'piano' | 'drum' = 'piano'
): VexFlowRenderData => {
    if (viewWidth == null || viewWidth <= 0 || !Number.isFinite(viewWidth) || viewHeight == null || viewHeight <= 0 || !Number.isFinite(viewHeight)) {
      return { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing: BASE_GRAND_STAFF_VERTICAL_SPACING, instrumentMode };
    }
    
    const verticalSpacing = isRollView ? BASE_GRAND_STAFF_VERTICAL_SPACING * ROLL_VIEW_SCALE_MULTIPLIER : BASE_GRAND_STAFF_VERTICAL_SPACING;
    const defaultReturn = { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing, instrumentMode };
    if (notes.length === 0 || !timeSignature || initialTempoBpm <= 0) return defaultReturn;

    const effectiveZoom = isRollView ? zoom * ROLL_VIEW_SCALE_MULTIPLIER : zoom;
    const sortedTempoEvents = [...tempoEvents].sort((a, b) => a.timeMs - b.timeMs);
    const getBpmAtTime = (timeMs: number): number => {
      let activeBpm = initialTempoBpm;
      for (const event of sortedTempoEvents) { if (event.timeMs <= timeMs) activeBpm = event.bpm; else break; }
      return activeBpm;
    };

    const initialMsPerQuarterNote = 60000 / initialTempoBpm;
    const totalMusicalDurationMs = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    const totalBeats = totalMusicalDurationMs / initialMsPerQuarterNote;
    let PIXELS_PER_BEAT = 250 * UNIVERSAL_SCALE * getLayoutZoom(effectiveZoom, isRollView);

    const STAFF_HEIGHT_PX = 50 * UNIVERSAL_SCALE;
    let topStaveYOffset = Math.max(20 * UNIVERSAL_SCALE, (viewHeight - (STAFF_HEIGHT_PX + verticalSpacing + STAFF_HEIGHT_PX)) / 2);

    const effectiveBarLines = [...barLinesMs];
    const lastNoteEndTime = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    if (effectiveBarLines.length === 0 && notes.length > 0) effectiveBarLines.push(notes[0].timeMs);
    if (lastNoteEndTime > effectiveBarLines[effectiveBarLines.length - 1]) effectiveBarLines.push(lastNoteEndTime);
    if (effectiveBarLines.length < 2) return defaultReturn;

    const allFragments: NoteFragment[] = notes.map(n => ({ ...n, fragmentId: `${n.noteId}-0`, originalNoteId: n.noteId }));
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

    let lastDrawnClefRH: 'treble' | 'bass' | 'percussion' = instrumentMode === 'drum' ? 'percussion' : 'treble';
    let lastDrawnClefLH: 'treble' | 'bass' | 'percussion' = instrumentMode === 'drum' ? 'percussion' : 'bass';
    let lastDrawnKeySig = keySignatureStr;
    let lastDrawnTimeSig = timeSignature;
    let currentKeySig = keySignatureStr;
    let currentTsig = timeSignature;
    let currentTempoBpmForMeasure = initialTempoBpm;

    const tempMeasures: VexFlowMeasureData[] = [];
    const boundaryEpsilon = 1.0; 

    for (let i = 0; i < effectiveBarLines.length - 1; i++) {
        const measureStartTime = effectiveBarLines[i], measureEndTime = effectiveBarLines[i + 1];
        
        const newKey = keySigChanges.get(measureStartTime);
        const newTime = timeSigChanges.get(measureStartTime);
        const newTempo = tempoChanges.get(measureStartTime);
        
        if (newKey) currentKeySig = newKey;
        if (newTime) currentTsig = newTime;
        if (newTempo) currentTempoBpmForMeasure = newTempo;

        const fragmentsInMeasure = allFragments.filter(f => {
            if (isRollView) {
                return (f.timeMs < measureEndTime - boundaryEpsilon) && (f.timeMs + f.durationMs > measureStartTime + boundaryEpsilon);
            } else {
                return (f.timeMs >= measureStartTime - boundaryEpsilon && f.timeMs < measureEndTime - boundaryEpsilon);
            }
        }).map(f => {
            if (isRollView) {
                return {
                    ...f, 
                    timeMs: Math.max(f.timeMs, measureStartTime), 
                    durationMs: Math.min(f.timeMs + f.durationMs, measureEndTime) - Math.max(f.timeMs, measureStartTime)
                };
            }
            return f;
        });

        const rhNotes = fragmentsInMeasure.filter(n => n.hand === 'right'), lhNotes = fragmentsInMeasure.filter(n => n.hand === 'left');
        let detectedClefRH = lastDrawnClefRH, detectedClefLH = lastDrawnClefLH;
        
        if (instrumentMode === 'piano') {
            if (rhNotes.length >= CLEF_CHANGE_MIN_NOTES) {
                detectedClefRH = (rhNotes.filter(n => n.midi < MIDDLE_C_MIDI).length / rhNotes.length >= CLEF_CHANGE_THRESHOLD_RATIO) ? 'bass' : 'treble';
            } else if (i === 0 && rhNotes.length > 0) {
                detectedClefRH = rhNotes[0].midi < MIDDLE_C_MIDI ? 'bass' : 'treble';
            }

            if (lhNotes.length >= CLEF_CHANGE_MIN_NOTES) {
                detectedClefLH = (lhNotes.filter(n => n.midi > MIDDLE_C_MIDI).length / lhNotes.length >= CLEF_CHANGE_THRESHOLD_RATIO) ? 'treble' : 'bass';
            } else if (i === 0 && lhNotes.length > 0) {
                detectedClefLH = lhNotes[0].midi > MIDDLE_C_MIDI ? 'treble' : 'bass';
            }
        } else {
            detectedClefRH = 'percussion';
            detectedClefLH = 'percussion';
        }

        const checkOctave = (notes: NoteFragment[], threshold: number, isHigher: boolean) => 
            notes.length > 0 && (notes.filter(n => isHigher ? n.midi >= threshold : n.midi <= threshold).length / notes.length >= OCTAVA_THRESHOLD_RATIO);

        const is15maActiveRH = checkOctave(rhNotes, OCTAVA_15MA_THRESHOLD_MIDI, true);
        const is8vaActiveRH = !is15maActiveRH && checkOctave(rhNotes, OCTAVA_8VA_THRESHOLD_MIDI, true);
        const is15mbActiveLH = checkOctave(lhNotes, OCTAVA_15MB_THRESHOLD_MIDI, false);
        const is8vbActiveLH = !is15mbActiveLH && checkOctave(lhNotes, OCTAVA_8VB_THRESHOLD_MIDI, false);

        const isClefChangeRH = (i > 0 && detectedClefRH !== lastDrawnClefRH);
        const isClefChangeLH = (i > 0 && detectedClefLH !== lastDrawnClefLH);
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
                if (isClefChangeRH) measureStave.addClef(detectedClefRH, 'default');
                else if (isClefChangeLH) measureStave.addClef(detectedClefLH, 'default');
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

        tempMeasures.push({
            rightHand: [], leftHand: [], startTimeMs: measureStartTime, endTimeMs: measureEndTime, width: measureWidth, durationMs: measureEndTime - measureStartTime,
            newKeySignature: (i === 0 || isKeySigChange) ? currentKeySig : undefined,
            newTimeSignature: (i === 0 || isTimeSigChange) ? currentTsig : undefined,
            newTempoBpm: (i === 0 || newTempo) ? currentTempoBpmForMeasure : undefined,
            activeKeySignature: currentKeySig,
            previousKeySignature: isKeySigChange ? lastDrawnKeySig : undefined,
            effectiveClefRH: detectedClefRH, 
            effectiveClefLH: detectedClefLH, 
            newClefRH: (i === 0 || isClefChangeRH) ? detectedClefRH : undefined,
            newClefLH: (i === 0 || isClefChangeLH) ? detectedClefLH : undefined, 
            isClefChangeRH,
            isClefChangeLH,
            isKeySigChange,
            isTimeSigChange,
            is8vaActiveRH, is15maActiveRH, is8vbActiveLH, is15mbActiveLH,
            starts8vaRH: false, ends8vaRH: false, starts15maRH: false, ends15maRH: false, starts8vbLH: false, ends8vbLH: false, starts15mbLH: false, ends15mbLH: false,
            effectiveTimeSignature: currentTsig,
            hasDottedBeamableNotes: fragmentsInMeasure.some(f => {
                const dur = f.durationMs / (60000 / getBpmAtTime(f.timeMs));
                const vfd = getVexFlowDuration(dur);
                return vfd.dots > 0 && ['8', '16', '32', '64'].includes(vfd.type);
            }),
            startsRepeat: fragmentsInMeasure.some(n => n.isRepeatStart), endsRepeat: fragmentsInMeasure.some(n => n.isRepeatEnd),
            rightHandTuplets: [], leftHandTuplets: [],
            instrumentMode
        });
        if (tempMeasures[i].newClefRH) lastDrawnClefRH = tempMeasures[i].newClefRH!;
        if (tempMeasures[i].newClefLH) lastDrawnClefLH = tempMeasures[i].newClefLH!;
        lastDrawnKeySig = currentKeySig;
        lastDrawnTimeSig = currentTsig;
    }

    const measures: VexFlowMeasureData[] = [], octaveLines: OctaveLineInfo[] = [];
    const tempoMarkings: TempoMarkingInfo[] = [];
    let cumulativeWidth = HORIZONTAL_PADDING;
    for (let i = 0; i < tempMeasures.length; i++) {
        const m = tempMeasures[i];
        if (m.newTempoBpm !== undefined) tempoMarkings.push({ bpm: Math.round(m.newTempoBpm * playbackTempoMultiplier), x: cumulativeWidth, y: topStaveYOffset - 10 });
        
        const addOctaveLine = (check: (idx: number) => boolean, type: OctaveLineInfo['type'], hand: 'right' | 'left', yOff: number) => {
            if (instrumentMode === 'drum') return;
            if (check(i) && (i === 0 || !check(i-1))) {
                let end = i, w = 0; while (end < tempMeasures.length && check(end)) { w += tempMeasures[end].width; end++; }
                octaveLines.push({ type, hand, startX: cumulativeWidth, endX: cumulativeWidth + w, startY: topStaveYOffset + yOff, endY: topStaveYOffset + yOff });
            }
        };
        addOctaveLine(idx => tempMeasures[idx].is15maActiveRH, '15ma', 'right', -40);
        addOctaveLine(idx => tempMeasures[idx].is8vaActiveRH, '8va', 'right', -40);
        addOctaveLine(idx => tempMeasures[idx].is15mbActiveLH, '15mb', 'left', verticalSpacing + 80);
        addOctaveLine(idx => tempMeasures[idx].is8vbActiveLH, '8vb', 'left', verticalSpacing + 80);

        const keySpec = KEY_SIGNATURE_SPEC[m.activeKeySignature] || {}, accRH = new Map<string, string>(), accLH = new Map<string, string>();
        
        const getFragmentsForHand = (h: 'left' | 'right') => {
            return allFragments.filter(f => {
                if (isRollView) {
                    return (f.timeMs < m.endTimeMs - boundaryEpsilon) && (f.timeMs + f.durationMs > m.startTimeMs + boundaryEpsilon);
                } else {
                    return (f.timeMs >= m.startTimeMs - boundaryEpsilon && f.timeMs < m.endTimeMs - boundaryEpsilon);
                }
            }).map(f => {
                if (isRollView) {
                    return {
                        ...f, 
                        timeMs: Math.max(f.timeMs, m.startTimeMs), 
                        durationMs: Math.min(f.timeMs + f.durationMs, m.endTimeMs) - Math.max(f.timeMs, m.startTimeMs)
                    };
                }
                return f;
            }).filter(f => instrumentMode === 'drum' ? h === 'right' : f.hand === h);
        };

        const processedRH = processHandAndAccidentals(getFragmentsForHand('right'), 'right', m.effectiveClefRH, m.startTimeMs, m.endTimeMs, keySpec, accRH, m.is8vaActiveRH, m.is15maActiveRH, m.is8vbActiveLH, m.is15mbActiveLH, showOnlyMajorRests, m.activeKeySignature, getBpmAtTime, isRollView, instrumentMode);
        const processedLH = instrumentMode === 'drum' ? { notes: [], tuplets: [] } : processHandAndAccidentals(getFragmentsForHand('left'), 'left', m.effectiveClefLH, m.startTimeMs, m.endTimeMs, keySpec, accLH, m.is8vaActiveRH, m.is15maActiveRH, m.is8vbActiveLH, m.is15mbActiveLH, showOnlyMajorRests, m.activeKeySignature, getBpmAtTime, isRollView, instrumentMode);
        
        m.rightHand = processedRH.notes;
        m.rightHandTuplets = processedRH.tuplets;
        m.leftHand = processedLH.notes;
        m.leftHandTuplets = processedLH.tuplets;
        
        measures.push(m); cumulativeWidth += m.width;
    }
    return { measures, octaveLines, tempoMarkings, topStaveYOffset, fragments: allFragments, noteIdToFragmentsMap, keySignature: keySignatureStr, timeSignature, verticalSpacing, instrumentMode };
};
