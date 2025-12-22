
import { MidiNotePlaybackItem, TimeSignatureInfo, VexFlowMeasureData, VexFlowNoteInfo, VexFlowRenderData, OctaveLineInfo, NoteFragment, TempoEvent, TempoMarkingInfo } from './types';
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
const CLEF_CHANGE_MIN_NOTES = 2;

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
const DURATION_TO_VEXFLOW: { [key: number]: { type: string, dots: number } } = {
    4: { type: 'w', dots: 0 }, 3: { type: 'h', dots: 1 }, 2: { type: 'h', dots: 0 },
    1.5: { type: 'q', dots: 1 }, 1: { type: 'q', dots: 0 }, 0.75: { type: '8', dots: 1 },
    0.5: { type: '8', dots: 0 }, 0.375: { type: '16', dots: 1 }, 0.25: { type: '16', dots: 0 },
    0.1875: { type: '32', dots: 1 }, 0.125: { type: '32', dots: 0 }, 
    0.09375: { type: '64', dots: 1 }, 0.0625: { type: '64', dots: 0 },
    0.046875: { type: '128', dots: 1 }, 0.03125: { type: '128', dots: 0 }
};

const COMMON_VEXFLOW_DURATIONS_SET = new Set(Object.keys(DURATION_TO_VEXFLOW).map(Number));

const KEY_SIGNATURE_SPEC: { [key: string]: { [note: string]: string } } = {
    'C': {},
    'G': { 'F': '#' },
    'D': { 'F': '#', 'C': '#' },
    'A': { 'F': '#', 'C': '#', 'G': '#' },
    'E': { 'F': '#', 'C': '#', 'G': '#' },
    'B': { 'F': '#', 'C': '#', 'G': '#' },
    'F#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' },
    'C#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' },
    'F': { 'B': 'b' },
    'Bb': { 'B': 'b', 'E': 'b' },
    'Eb': { 'B': 'b', 'E': 'b', 'A': 'b' },
    'Ab': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b' },
    'Db': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b' },
    'Gb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b' },
    'Cb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b', 'F': 'b' }
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
    primaryVexFlowDuration?: { type: string, dots: number }; // NEW: to force specific VexFlow duration
}

interface TimelineRestEvent {
    type: 'rest';
    timeMs: number;
    durationMs: number;
}

type TimelineEvent = TimelineNoteEvent | TimelineRestEvent;

function getClosestCommonDuration(q: number): number | null { // Removed tolerance parameter
    let closestCommonQ: number | null = null;
    let minDiff = Infinity;
    for (const commonQ of Array.from(COMMON_VEXFLOW_DURATIONS_SET)) {
        const diff = Math.abs(q - commonQ);
        if (diff < minDiff) {
            minDiff = diff;
            closestCommonQ = commonQ;
        }
    }
    return closestCommonQ; // Always return the closest, let caller decide on tolerance
}

function getVexFlowDuration(durationInQuarterNotes: number): { type: string, dots: number } {
    if (durationInQuarterNotes <= 0) return { type: '16', dots: 0 };
    // Use SNAP_TOLERANCE here for initial recognition of a common VexFlow duration
    const snappedDuration = getClosestCommonDuration(durationInQuarterNotes); // No tolerance parameter
    if (snappedDuration !== null && Math.abs(snappedDuration - durationInQuarterNotes) < SNAP_TOLERANCE && DURATION_TO_VEXFLOW[snappedDuration]) {
      return DURATION_TO_VEXFLOW[snappedDuration];
    }
    const closest = Object.keys(DURATION_TO_VEXFLOW).map(Number).reduce((prev, curr) => (Math.abs(curr - durationInQuarterNotes) < Math.abs(prev - durationInQuarterNotes) ? curr : prev));
    return DURATION_TO_VEXFLOW[closest];
}

function decomposeDuration(durationInQuarters: number): { type: string, dots: number }[] {
    const results: { type: string, dots: number }[] = [];
    let remaining = durationInQuarters;
    const sortedDurations = Object.keys(DURATION_TO_VEXFLOW).map(Number).sort((a, b) => b - a);
    while (remaining > DURATION_MATCH_TOLERANCE) { // Use DURATION_MATCH_TOLERANCE for loop termination
        let found = false;
        for (const dur of sortedDurations) {
            if (remaining >= dur - DURATION_MATCH_TOLERANCE) { // Allow slight deficit to snap
                results.push(DURATION_TO_VEXFLOW[dur]);
                remaining -= dur;
                found = true;
                break;
            }
        }
        if (!found) break; // If no duration can be found, prevent infinite loop
    }
    return results;
}

function processHandAndAccidentals(
    allFragmentsInMeasure: NoteFragment[],
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass',
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
    isRollView: boolean
): VexFlowNoteInfo[] {
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

        // Insert rest if there is a significant gap before the note
        if (restGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterForRest) {
            rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: restGapMs });
            timelineCursorMs += restGapMs;
        } else {
            // Snap cursor to note start to consume micro-gaps
            timelineCursorMs = timestamp;
        }

        const notesAtTime = groupedByTime.get(timestamp)!.sort((a, b) => a.midi - b.midi);
        
        let durationForGroupMs; // Duration in milliseconds for this group of notes
        let primaryVexFlowDuration: { type: string, dots: number } | null = null; // Store the chosen VexFlow duration type
        
        if (!isRollView) {
            const maxNoteDurationMs = Math.max(...notesAtTime.map(n => n.durationMs));
            const timeToMeasureEndMs = measureEndTime - timestamp;
            const bpm = getBpmAtTime(timestamp);
            const msPerQuarter = 60000 / bpm;

            const maxDurationInQuarters = maxNoteDurationMs / msPerQuarter;

            // For regular sheet music, `durationForGroupMs` is now determined like roll view:
            // The note takes its full MIDI duration, only clipped by the measure end.
            durationForGroupMs = Math.min(maxNoteDurationMs, timeToMeasureEndMs);
            if (durationForGroupMs < 0) durationForGroupMs = 0; // Ensure non-negative duration

            // Now, determine if this duration *should* ideally be represented as a single VexFlow note.
            // This flag will guide the final decomposition step.
            const snappedDurationInQuarters = getClosestCommonDuration(maxDurationInQuarters); // Call without tolerance

            // Set primaryVexFlowDuration if the original MIDI duration is a good candidate for a common VexFlow primitive.
            // Check tolerance here: if the original MIDI duration is very close to a snapped VexFlow duration.
            if (snappedDurationInQuarters !== null && Math.abs(maxDurationInQuarters - snappedDurationInQuarters) < SNAP_TOLERANCE) { 
                primaryVexFlowDuration = DURATION_TO_VEXFLOW[snappedDurationInQuarters];
            } else {
                primaryVexFlowDuration = null; // Let it proceed to the enhanced decomposition logic below
            }

        } else {
            // ROLL VIEW LOGIC (Unchanged: simplified duration, effectively only clipped by measure)
            const maxNoteDurationMs = Math.max(...notesAtTime.map(n => n.durationMs));
            const timeToMeasureEndMs = measureEndTime - timestamp;
            durationForGroupMs = Math.min(maxNoteDurationMs, timeToMeasureEndMs);
            primaryVexFlowDuration = null; // Roll view does not force specific VexFlow types initially
        }

        rawTimelineEvents.push({
            type: 'note', timeMs: timestamp, durationMs: durationForGroupMs, notesAtTime: notesAtTime,
            vexNoteId: `vexnote-${hand}-${timestamp}-${noteCounter++}`,
            originalNoteId: notesAtTime[0].originalNoteId,
            fragmentMapping: notesAtTime.map((note, idx) => ({ fragmentId: note.fragmentId, keyIndex: idx })),
            midiValue: Math.min(...notesAtTime.map(n => n.midi)),
            primaryVexFlowDuration: primaryVexFlowDuration, // Pass the forced VexFlow duration type
        });
        timelineCursorMs += durationForGroupMs;
    });

    // Fill remaining space in measure with rest
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
            
            // If the calculated duration for a note is too small, convert it to a rest
            if (durationQuarters < MIN_NOTE_DURATION_TO_RENDER) {
                processedTimelineEvents.push({ type: 'rest', timeMs: event.timeMs, durationMs: event.durationMs });
            } else {
                processedTimelineEvents.push(event);
            }
        } else {
            processedTimelineEvents.push(event);
        }
    });

    // Apply showOnlyMajorRests logic (after potential note-to-rest conversion)
    const finalFilteredTimelineEvents: TimelineEvent[] = [];
    if (showOnlyMajorRests) {
        for (let i = 0; i < processedTimelineEvents.length; i++) {
            const currentEvent = processedTimelineEvents[i];
            if (currentEvent.type === 'rest') {
                const bpm = getBpmAtTime(currentEvent.timeMs);
                const isMajorRest = currentEvent.durationMs >= (60000 / bpm * 0.95);
                if (!isMajorRest && finalFilteredTimelineEvents.length > 0) {
                    const lastProcessed = finalFilteredTimelineEvents[finalFilteredTimelineEvents.length - 1];
                    // Only merge if the last event was a note, extending its duration
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
        if (durationQuarters < DURATION_MATCH_TOLERANCE) return; // Use DURATION_MATCH_TOLERANCE here

        let decomposedDurations: { type: string, dots: number }[];
        
        // For non-roll view, we *always* want a single VexFlow note representation for notes.
        // This ensures no tied notes are generated for duration mismatches.
        if (!isRollView && event.type === 'note') {
            const targetDurationQuarters = durationQuarters;

            const sortedVexFlowDurationsDescending = Object.keys(DURATION_TO_VEXFLOW)
                .map(Number)
                .sort((a, b) => b - a); // Sort from whole note down to 128th note

            let singleBestVexFlowDurationValue: number | null = null;
            let minAbsoluteDiff = Infinity; 

            for (const durValue of sortedVexFlowDurationsDescending) {
                const diff = targetDurationQuarters - durValue;
                const absDiff = Math.abs(diff);

                // Find the closest duration, prioritizing those that are slightly smaller or equal.
                if (absDiff < minAbsoluteDiff) {
                    minAbsoluteDiff = absDiff;
                    singleBestVexFlowDurationValue = durValue;
                }
            }
            
            // Fallback if no reasonable duration found (e.g., targetDurationQuarters is extremely small)
            if (singleBestVexFlowDurationValue === null) {
                // Default to smallest renderable duration available in our map
                singleBestVexFlowDurationValue = 0.03125; // 128th note
            }

            decomposedDurations = [DURATION_TO_VEXFLOW[singleBestVexFlowDurationValue]];

        } else {
            // For rests, or if in roll view, use the regular decomposition logic if it exists (though roll view generally bypasses this part for notes)
            // For notes in roll view, primaryVexFlowDuration will be null, and we want a simpler representation.
            // For rests, we want proper decomposition if needed, unless showOnlyMajorRests is active.
            decomposedDurations = decomposeDuration(durationQuarters);
        }
        
        let cumulativeTimeMs = event.timeMs;
        let cumulativeQuarters = 0;

        decomposedDurations.forEach((vexDuration, index) => {
            const durationValueStr = Object.keys(DURATION_TO_VEXFLOW).find(k => {
                const keyNum = Number(k);
                return DURATION_TO_VEXFLOW[keyNum].type === vexDuration.type && DURATION_TO_VEXFLOW[keyNum].dots === vexDuration.dots;
            });
            const durationValue = durationValueStr ? Number(durationValueStr) : 0;
            const durationMsForThisPart = durationValue * localMsPerQuarterNote;

            if (event.type === 'rest') {
                finalVexNotes.push({
                    vexNoteId: `rest-${hand}-${event.timeMs}-${index}`,
                    hand: hand, midiValue: -1,
                    vexNote: { keys: [hand === 'right' ? "b/4" : "d/3"], duration: `${vexDuration.type}r`, dots: vexDuration.dots, clef: effectiveClef },
                    fragmentMapping: [], timeMs: cumulativeTimeMs, durationMs: durationMsForThisPart,
                });
            } else {
                const notesAtTime = event.notesAtTime!;
                const keysForStaveNote: string[] = [];
                const accidentalsForStaveNote: { index: number; type: string }[] = [];

                notesAtTime.forEach((note, chordNoteIndex) => {
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
                    fragmentMapping: event.fragmentMapping!,
                    timeMs: cumulativeTimeMs,
                    durationMs: durationMsForThisPart,
                    originalNotes: notesAtTime,
                    // isTieStart: Array(keysForStaveNote.length).fill(index < decomposedDurations.length - 1), // OLD TIE LOGIC
                    // isTieEnd: Array(keysForStaveNote.length).fill(index > 0), // OLD TIE LOGIC
                    isTieStart: Array(keysForStaveNote.length).fill(false), // Force no ties for single notes
                    isTieEnd: Array(keysForStaveNote.length).fill(false),   // Force no ties for single notes
                    vexNoteYPositions: noteYs,
                    vexNoteKeyProps: keyProps.map(kp => ({ line: kp.line })),
                });
            }
            cumulativeQuarters += durationValue;
            cumulativeTimeMs = event.timeMs + (cumulativeQuarters * localMsPerQuarterNote);
        });
    });
    return finalVexNotes;
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
        
        // Calculate distance to next note event or measure end in milliseconds
        const nextTime = (i + 1 < timestamps.length) ? timestamps[i+1] : measureEndTime;
        const distanceMs = nextTime - t;

        const bpm = getBpmAtTime(t);
        const localMsPerQuarterNote = 60000 / bpm;
        const distanceQN = distanceMs > 0 ? distanceMs / localMsPerQuarterNote : 0; // Distance in quarter notes

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
    tempoEvents: TempoEvent[], playbackTempoMultiplier: number, isRollView: boolean = false
): VexFlowRenderData => {
    if (viewWidth == null || viewWidth <= 0 || !Number.isFinite(viewWidth) || viewHeight == null || viewHeight <= 0 || !Number.isFinite(viewHeight)) {
      return { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing: BASE_GRAND_STAFF_VERTICAL_SPACING };
    }
    
    // NEW: Calculate vertical spacing based on mode. 125 for standard, 156.25 for roll.
    const verticalSpacing = isRollView ? BASE_GRAND_STAFF_VERTICAL_SPACING * ROLL_VIEW_SCALE_MULTIPLIER : BASE_GRAND_STAFF_VERTICAL_SPACING;
    
    const defaultReturn = { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map(), keySignature: keySignatureStr, timeSignature: timeSignature, verticalSpacing };
    if (notes.length === 0 || !timeSignature || initialTempoBpm <= 0) return defaultReturn;

    // NEW: Apply 1.25x scaling factor for roll view horizontally as well
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

    // Refined logic: Snap signature and tempo changes to the START of the next full measure.
    signatureEvents.forEach(e => {
        // Find the first bar line that is greater than or equal to the event's time
        const nextBarLine = effectiveBarLines.find(b => b >= e.timeMs);
        if (nextBarLine !== undefined) {
            // Apply change at the next full measure start
            if (e.time) timeSigChanges.set(nextBarLine, e.time);
            if (e.key) keySigChanges.set(nextBarLine, e.key);
        } else if (e.timeMs === 0) { // Special case for events exactly at time 0
            if (e.time) timeSigChanges.set(0, e.time);
            if (e.key) keySigChanges.set(0, e.key);
        }
    });

    tempoEvents.forEach(e => {
        const nextBarLine = effectiveBarLines.find(b => b >= e.timeMs);
        if (nextBarLine !== undefined && !tempoChanges.has(nextBarLine)) {
            // Apply change at the next full measure start
            tempoChanges.set(nextBarLine, e.bpm);
        } else if (e.timeMs === 0 && !tempoChanges.has(0)) { // Special case for events exactly at time 0
            tempoChanges.set(0, e.bpm);
        }
    });

    let lastDrawnClefRH: 'treble' | 'bass' = 'treble';
    let lastDrawnClefLH: 'treble' | 'bass' = 'bass';
    let currentKeySig = keySignatureStr;
    let currentTsig = timeSignature;
    let currentTempoBpmForMeasure = initialTempoBpm;

    const tempMeasures: VexFlowMeasureData[] = [];
    const boundaryEpsilon = 1.0; // 1ms epsilon for strict boundary checks

    for (let i = 0; i < effectiveBarLines.length - 1; i++) {
        const measureStartTime = effectiveBarLines[i], measureEndTime = effectiveBarLines[i + 1];
        
        // Check for new signatures/tempo exactly at the start of this measure
        const newKey = keySigChanges.get(measureStartTime);
        const newTime = timeSigChanges.get(measureStartTime);
        const newTempo = tempoChanges.get(measureStartTime);
        
        if (newKey) currentKeySig = newKey;
        if (newTime) currentTsig = newTime;
        if (newTempo) currentTempoBpmForMeasure = newTempo;

        // FIXED: Strict start-only logic for standard view using epsilon
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

        const checkOctave = (notes: NoteFragment[], threshold: number, isHigher: boolean) => 
            notes.length > 0 && (notes.filter(n => isHigher ? n.midi >= threshold : n.midi <= threshold).length / notes.length >= OCTAVA_THRESHOLD_RATIO);

        const is15maActiveRH = checkOctave(rhNotes, OCTAVA_15MA_THRESHOLD_MIDI, true);
        const is8vaActiveRH = !is15maActiveRH && checkOctave(rhNotes, OCTAVA_8VA_THRESHOLD_MIDI, true);
        const is15mbActiveLH = checkOctave(lhNotes, OCTAVA_15MB_THRESHOLD_MIDI, false);
        const is8vbActiveLH = !is15mbActiveLH && checkOctave(lhNotes, OCTAVA_8VB_THRESHOLD_MIDI, false);

        let measureWidth = isRollView 
            ? (measureEndTime - measureStartTime) / 1000 * ROLL_VIEW_PIXELS_PER_SECOND * effectiveZoom * UNIVERSAL_SCALE
            : Math.max(computeMinWidthFromNotes(fragmentsInMeasure, getBpmAtTime, effectiveZoom, false, measureEndTime), currentTsig.numerator * (4 / currentTsig.denominator) * PIXELS_PER_BEAT) + HORIZONTAL_PADDING;

        tempMeasures.push({
            rightHand: [], leftHand: [], startTimeMs: measureStartTime, endTimeMs: measureEndTime, width: measureWidth, durationMs: measureEndTime - measureStartTime,
            newKeySignature: (i === 0 || newKey) ? currentKeySig : undefined, // Only set if first measure or explicit change at this measure start
            newTimeSignature: (i === 0 || newTime) ? currentTsig : undefined, // Only set if first measure or explicit change at this measure start
            newTempoBpm: (i === 0 || newTempo) ? currentTempoBpmForMeasure : undefined, // Only set if first measure or explicit change at this measure start
            activeKeySignature: currentKeySig, // Always reflect the current active signature
            effectiveClefRH: detectedClefRH, 
            effectiveClefLH: detectedClefLH, 
            newClefRH: (i === 0 || detectedClefRH !== lastDrawnClefRH) ? detectedClefRH : undefined,
            newClefLH: (i === 0 || detectedClefLH !== lastDrawnClefLH) ? detectedClefLH : undefined, 
            is8vaActiveRH, is15maActiveRH, is8vbActiveLH, is15mbActiveLH,
            starts8vaRH: false, ends8vaRH: false, starts15maRH: false, ends15maRH: false, starts8vbLH: false, ends8vbLH: false, starts15mbLH: false, ends15mbLH: false,
            effectiveTimeSignature: currentTsig, // Always reflect the current active time signature
            hasDottedBeamableNotes: fragmentsInMeasure.some(f => {
                const dur = f.durationMs / (60000 / getBpmAtTime(f.timeMs));
                const vfd = getVexFlowDuration(dur);
                return vfd.dots > 0 && ['8', '16', '32', '64'].includes(vfd.type);
            }),
            startsRepeat: fragmentsInMeasure.some(n => n.isRepeatStart), endsRepeat: fragmentsInMeasure.some(n => n.isRepeatEnd)
        });
        // Update lastDrawnClef for the next measure's comparison
        if (tempMeasures[i].newClefRH) lastDrawnClefRH = tempMeasures[i].newClefRH!;
        if (tempMeasures[i].newClefLH) lastDrawnClefLH = tempMeasures[i].newClefLH!;
    }

    const measures: VexFlowMeasureData[] = [], octaveLines: OctaveLineInfo[] = [];
    const tempoMarkings: TempoMarkingInfo[] = [];
    let cumulativeWidth = HORIZONTAL_PADDING;
    for (let i = 0; i < tempMeasures.length; i++) {
        const m = tempMeasures[i];
        if (m.newTempoBpm !== undefined) tempoMarkings.push({ bpm: Math.round(m.newTempoBpm * playbackTempoMultiplier), x: cumulativeWidth, y: topStaveYOffset - 10 });
        
        const addOctaveLine = (check: (idx: number) => boolean, type: OctaveLineInfo['type'], hand: 'right' | 'left', yOff: number) => {
            if (check(i) && (i === 0 || !check(i-1))) {
                let end = i, w = 0; while (end < tempMeasures.length && check(end)) { w += tempMeasures[end].width; end++; }
                octaveLines.push({ type, hand, startX: cumulativeWidth, endX: cumulativeWidth + w, startY: topStaveYOffset + yOff, endY: topStaveYOffset + yOff });
            }
        };
        addOctaveLine(idx => tempMeasures[idx].is15maActiveRH, '15ma', 'right', -40);
        addOctaveLine(idx => tempMeasures[idx].is8vaActiveRH, '8va', 'right', -40);
        addOctaveLine(idx => tempMeasures[idx].is15mbActiveLH, '15mb', 'left', verticalSpacing + 125);
        addOctaveLine(idx => tempMeasures[idx].is8vbActiveLH, '8vb', 'left', verticalSpacing + 125);

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
            }).filter(f => f.hand === h);
        };

        m.rightHand = processHandAndAccidentals(getFragmentsForHand('right'), 'right', m.effectiveClefRH, m.startTimeMs, m.endTimeMs, keySpec, accRH, m.is8vaActiveRH, m.is15maActiveRH, m.is8vbActiveLH, m.is15mbActiveLH, showOnlyMajorRests, m.activeKeySignature, getBpmAtTime, isRollView);
        m.leftHand = processHandAndAccidentals(getFragmentsForHand('left'), 'left', m.effectiveClefLH, m.startTimeMs, m.endTimeMs, keySpec, accLH, m.is8vaActiveRH, m.is15maActiveRH, m.is8vbActiveLH, m.is15mbActiveLH, showOnlyMajorRests, m.activeKeySignature, getBpmAtTime, isRollView);
        
        measures.push(m); cumulativeWidth += m.width;
    }
    return { measures, octaveLines, tempoMarkings, topStaveYOffset, fragments: allFragments, noteIdToFragmentsMap, keySignature: keySignatureStr, timeSignature, verticalSpacing };
};
