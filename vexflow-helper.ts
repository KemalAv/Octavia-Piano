
import { MidiNotePlaybackItem, TimeSignatureInfo, VexFlowMeasureData, VexFlowNoteInfo, VexFlowRenderData, OctaveLineInfo, NoteFragment, TempoEvent, TempoMarkingInfo } from '../types';
import { getNoteZoom, getLayoutZoom, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, SignatureEvent } from './utils';
import { StaveNote, Beam } from 'vexflow'; // Import StaveNote and Beam directly

// --- Universal Scaling ---
const UNIVERSAL_SCALE = 0.35; 

// --- Constants ---
const GRAND_STAFF_VERTICAL_SPACING = 350 * UNIVERSAL_SCALE;
const HORIZONTAL_PADDING = 15 * UNIVERSAL_SCALE;
const MIDDLE_C_MIDI = 60; // C4
const CLEF_CHANGE_THRESHOLD_RATIO = 0.75;
const CLEF_CHANGE_MIN_NOTES = 2;
const OCTAVA_8VA_THRESHOLD_MIDI = 84; // C6
const OCTAVA_8VB_THRESHOLD_MIDI = 36; // C2
const OCTAVA_THRESHOLD_RATIO = 0.75;
const DURATION_MATCH_TOLERANCE = 0.0625;

// --- Mappings ---
const DURATION_TO_VEXFLOW: { [key: number]: { type: string, dots: number } } = {
    4: { type: 'w', dots: 0 }, 3: { type: 'h', dots: 1 }, 2: { type: 'h', dots: 0 },
    1.5: { type: 'q', dots: 1 }, 1: { type: 'q', dots: 0 }, 0.75: { type: '8', dots: 1 },
    0.5: { type: '8', dots: 0 }, 0.375: { type: '16', dots: 1 }, 0.25: { type: '16', dots: 0 },
    0.1875: { type: '32', dots: 1 }, 0.125: { type: '32', dots: 0 }, 0.0625: { type: '64', dots: 0 },
};

const KEY_SIGNATURE_SPEC: { [key: string]: { [note: string]: string } } = {
    'C': {}, 'G': { 'F': '#' }, 'D': { 'F': '#', 'C': '#' }, 'A': { 'F': '#', 'C': '#', 'G': '#' }, 'E': { 'F': '#', 'C': '#', 'G': '#', 'D': '#' }, 'B': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#' }, 'F#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#' }, 'C#': { 'F': '#', 'C': '#', 'G': '#', 'D': '#', 'A': '#', 'E': '#', 'B': '#' },
    'F': { 'B': 'b' }, 'Bb': { 'B': 'b', 'E': 'b' }, 'Eb': { 'B': 'b', 'E': 'b', 'A': 'b' }, 'Ab': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b' }, 'Db': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b' }, 'Gb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b' }, 'Cb': { 'B': 'b', 'E': 'b', 'A': 'b', 'D': 'b', 'G': 'b', 'C': 'b', 'F': 'b' }
};

// --- Helper Types for Internal Processing ---
interface TimelineNoteEvent {
    type: 'note';
    timeMs: number;
    durationMs: number;
    notesAtTime: NoteFragment[];
    vexNoteId: string;
    originalNoteId: string;
    fragmentMapping: { fragmentId: string; keyIndex: number }[];
    midiValue: number;
}

interface TimelineRestEvent {
    type: 'rest';
    timeMs: number;
    durationMs: number;
}

type TimelineEvent = TimelineNoteEvent | TimelineRestEvent;
// --- End Helper Types ---

// --- Helper Functions ---
// Removed SignatureEvent interface definition from here as it's now imported from utils.ts

/**
 * A pre-computed Set of common VexFlow duration values in quarter notes for efficiency.
 * Used for determining if a duration is 'major' or 'standard'.
 */
const COMMON_VEXFLOW_DURATIONS_SET = new Set(Object.keys(DURATION_TO_VEXFLOW).map(Number));

/**
 * Checks if a duration in quarters is close enough to a common VexFlow duration,
 * and returns the closest common duration if found, otherwise null.
 */
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
    
    // Only return if it's within tolerance
    if (closestCommonQ !== null && minDiff < DURATION_MATCH_TOLERANCE) {
        return closestCommonQ;
    }
    return null;
}

function getVexFlowDuration(durationInQuarterNotes: number): { type: string, dots: number } {
    if (durationInQuarterNotes <= 0) return { type: '16', dots: 0 };
    
    const snappedDuration = getClosestCommonDuration(durationInQuarterNotes);

    // If it's close to a common duration, use that.
    if (snappedDuration !== null && DURATION_TO_VEXFLOW[snappedDuration]) {
        return DURATION_TO_VEXFLOW[snappedDuration];
    }

    // Fallback to original logic if not close to a common duration (should be rare)
    const closest = Object.keys(DURATION_TO_VEXFLOW).map(Number).reduce((prev, curr) => (Math.abs(curr - durationInQuarterNotes) < Math.abs(prev - durationInQuarterNotes) ? curr : prev));
    return DURATION_TO_VEXFLOW[closest];
}

const decomposeDuration = (durationInQuarters: number): { type: string, dots: number }[] => {
    const results: { type: string, dots: number }[] = [];
    let remaining = durationInQuarters;
    const sortedDurations = Object.keys(DURATION_TO_VEXFLOW).map(Number).sort((a, b) => b - a); // Largest first
    while (remaining > DURATION_MATCH_TOLERANCE) { // Use a small tolerance for remaining duration
        let found = false;
        for (const dur of sortedDurations) {
            // Apply a small tolerance for comparison to handle floating point inaccuracies
            if (remaining >= dur - DURATION_MATCH_TOLERANCE) { 
                results.push(DURATION_TO_VEXFLOW[dur]);
                remaining -= dur;
                found = true;
                break;
            }
        }
        if (!found) { // If no standard duration fits, break to avoid infinite loop
            // console.warn(`Could not decompose remaining duration: ${remaining.toFixed(4)} quarters`);
            break;
        }
    }
    return results;
};

/**
 * Adds rest notes to the vexNotes array.
 * Note: Logic for 'showOnlyMajorRests' filtering is now handled in the timeline processing 
 * (processHandAndAccidentals) by merging small rests into previous notes. 
 * This function now blindly renders whatever duration is passed to ensure rhythm integrity.
 */
function addRestNotesFromMs(
    durationMs: number, // Pass duration in milliseconds
    timeMs: number,
    baseId: string,
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass',
    targetVexNotes: VexFlowNoteInfo[],
    getBpmAtTime: (timeMs: number) => number
) {
    const bpm = getBpmAtTime(timeMs);
    const msPerQuarterNote = 60000 / bpm;
    const quarters = durationMs / msPerQuarterNote;
    if (quarters < DURATION_MATCH_TOLERANCE) return; // Ignore very small rests

    const decomposedRests = decomposeDuration(quarters);

    decomposedRests.forEach((restDur, idx) => {
        targetVexNotes.push({
            vexNoteId: `${baseId}-${idx}`,
            hand: hand, midiValue: -1, // -1 indicates a rest
            vexNote: { keys: [hand === 'right' ? "b/4" : "d/3"], duration: `${restDur.type}r`, dots: restDur.dots, clef: effectiveClef },
            fragmentMapping: [], // Rests don't typically need fragment mapping for highlights
        });
    });
}


/**
 * Processes a single hand's notes within a measure, applying VexFlow's accidental rules.
 * This function ensures accidentals (sharps, flats, naturals) are rendered correctly
 * according to standard music notation, considering key signatures and their scope.
 */
function processHandAndAccidentals(
    allFragmentsInMeasure: NoteFragment[],
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass',
    measureStartTime: number,
    measureEndTime: number,
    keySpec: { [note: string]: string },
    activeAccidentals: Map<string, string>, // This map is reset per measure (Rule III.3, V)
    is8vaActiveForMeasure: boolean,
    is8vbActiveForMeasure: boolean,
    showOnlyMajorRests: boolean,
    currentMeasureKeySignature: string, // New parameter for dynamic enharmonic correction
    getBpmAtTime: (timeMs: number) => number
): VexFlowNoteInfo[] {
    const handFragments = allFragmentsInMeasure.filter(n => n.hand === hand);
    const groupedByTime = new Map<number, NoteFragment[]>();
    handFragments.forEach(note => {
        if (!groupedByTime.has(note.timeMs)) groupedByTime.set(note.timeMs, []);
        groupedByTime.get(note.timeMs)!.push(note);
    });
    const sortedTimestamps = Array.from(groupedByTime.keys()).sort((a, b) => a - b);
    
    // 1. Create a raw timeline of notes and rests
    const rawTimelineEvents: TimelineEvent[] = [];
    let timelineCursorMs = measureStartTime; 
    let noteCounter = 0; // for unique vexNoteId generation

    sortedTimestamps.forEach((timestamp) => {
        // Add rest event if there's a gap before current notes
        const restGapMs = timestamp - timelineCursorMs;
        const bpmForRest = getBpmAtTime(timelineCursorMs);
        const msPerQuarterForRest = 60000 / bpmForRest;
        if (restGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterForRest) { // Small threshold for a meaningful rest
            rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: restGapMs });
            timelineCursorMs += restGapMs;
        }

        // Add note event(s) at current timestamp (grouped as a chord)
        // Rule 3.6 (Chord): Each note in a chord is processed individually for accidental logic.
        const notesAtTime = groupedByTime.get(timestamp)!.sort((a, b) => a.midi - b.midi);
        const firstNoteInChord = notesAtTime[0]; // Assuming all notes in a chord have the same duration
        const durationForGroup = firstNoteInChord.durationMs;

        rawTimelineEvents.push({
            type: 'note',
            timeMs: timestamp,
            durationMs: durationForGroup,
            notesAtTime: notesAtTime,
            vexNoteId: `vexnote-${hand}-${timestamp}-${noteCounter++}`,
            originalNoteId: firstNoteInChord.originalNoteId, // Important for highlight mapping
            fragmentMapping: notesAtTime.map((note, index) => ({ fragmentId: note.fragmentId, keyIndex: index })), // Access fragmentId directly
            midiValue: Math.min(...notesAtTime.map(n => n.midi)), // Lowest MIDI value for a chord
        });
        timelineCursorMs += durationForGroup;
    });

    // Add final rest at the end of the measure if timeline isn't filled
    const finalRestGapMs = measureEndTime - timelineCursorMs;
    const bpmForFinalRest = getBpmAtTime(timelineCursorMs);
    const msPerQuarterForFinalRest = 60000 / bpmForFinalRest;
    if (finalRestGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterForFinalRest) {
        rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: finalRestGapMs });
    }

    // 2. Apply merging logic if showOnlyMajorRests is true
    // Instead of deleting rests, we merge small rests into the previous note to preserve rhythm.
    const processedTimelineEvents: TimelineEvent[] = [];

    if (showOnlyMajorRests) {
        for (let i = 0; i < rawTimelineEvents.length; i++) {
            const currentEvent = rawTimelineEvents[i];
            
            if (currentEvent.type === 'rest') {
                const bpm = getBpmAtTime(currentEvent.timeMs);
                const msPerQuarter = 60000 / bpm;
                // Definition of a "major" rest: Greater than or equal to a Quarter Note (1 beat).
                // We use a small tolerance (0.95) to account for float precision.
                const isMajorRest = currentEvent.durationMs >= (msPerQuarter * 0.95);

                // If it's a minor rest AND we have a previous event to merge into
                if (!isMajorRest && processedTimelineEvents.length > 0) {
                    const lastProcessed = processedTimelineEvents[processedTimelineEvents.length - 1];
                    if (lastProcessed.type === 'note') {
                        // Merge logic: Extend the previous note's duration
                        lastProcessed.durationMs += currentEvent.durationMs;
                        // Skip adding this rest to the list, effectively "hiding" it by legato
                        continue; 
                    }
                }
            }
            // If it's a note, or a major rest, or a minor rest at the very start (cannot merge), keep it.
            processedTimelineEvents.push(currentEvent);
        }
    } else {
        // If not showing only major rests, use raw timeline directly
        processedTimelineEvents.push(...rawTimelineEvents);
    }


    // 3. Convert processed timeline events into VexFlowNoteInfo objects
    const finalVexNotes: VexFlowNoteInfo[] = [];

    processedTimelineEvents.forEach(event => {
        if (event.type === 'note') {
            const durationMs = event.durationMs;
            const bpm = getBpmAtTime(event.timeMs);
            const localMsPerQuarterNote = 60000 / bpm;
            const durationQuarters = durationMs / localMsPerQuarterNote;
            const vexDuration = getVexFlowDuration(durationQuarters);
            
            const keysForStaveNote: string[] = [];
            const accidentalsForStaveNote: { index: number; type: string }[] = [];
            
            event.notesAtTime!.forEach((note, index) => { // Rule 3.6 (Chord): Each note in a chord is processed individually.
                let octave = Math.floor(note.midi / 12) - 1;
                let currentNotePitchClass = note.pitchClass; // Start with the raw pitch class from MidiNotePlaybackItem

                // NEW: Apply enharmonic correction dynamically based on the current measure's key signature.
                const isSharpContext = SHARP_KEYS.includes(currentMeasureKeySignature) || NEUTRAL_KEYS.includes(currentMeasureKeySignature);
                const isFlatContext = FLAT_KEYS.includes(currentMeasureKeySignature);

                if (isSharpContext) {
                    const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[currentNotePitchClass];
                    if (sharpEquivalent) {
                        currentNotePitchClass = sharpEquivalent;
                    }
                } else if (isFlatContext) {
                    const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[currentNotePitchClass];
                    if (flatEquivalent) {
                        currentNotePitchClass = flatEquivalent;
                    }
                }
                // END NEW dynamic enharmonic correction

                const basePitch = currentNotePitchClass.charAt(0); // e.g., 'C', 'D'.
                const intendedModifier = currentNotePitchClass.substring(1); // e.g., '#', 'b', or '' for natural.
                
                // Determine the modifier from the current key signature for this base pitch.
                // Rule I.1, I.2, II.1, II.2 (`Sharp/Flat pada key signature berlaku GLOBAL dan TIDAK reset per bar`):
                // This `keySpec` reflects the global key signature across all bars and octaves.
                const keySigModifier = keySpec[basePitch] || '';

                // Generate a unique key for tracking accidentals: base pitch + octave.
                // Rule 3.4 (`Jika pitch sama tetapi beda oktaf Accidental harus ditulis lagi`):
                // This ensures accidental tracking is specific to both the pitch and its octave.
                const notePositionKey = `${basePitch}/${octave}`;
                
                // Get the last explicitly applied accidental for this note/octave combination *within the current measure*.
                // Rule III.3 (`Accidental manual tidak boleh override key signature lebih dari 1 bar`) & Rule V:
                // `activeAccidentals` is reset per measure, so `lastAppliedModifierInBar` only reflects accidentals in the current bar.
                const lastAppliedModifierInBar = activeAccidentals.get(notePositionKey);
                
                // Determine what modifier is currently 'active' for this note, considering precedence.
                // If a manual accidental was applied earlier in this bar, it takes precedence over the key signature.
                // Rule III.1 & III.2 (`Key signature berlaku GLOBAL`, `Accidental manual berlaku sementara, hanya satu bar`).
                const currentlyActiveModifier = (lastAppliedModifierInBar !== undefined) ? lastAppliedModifierInBar : keySigModifier;
                
                // Decide if an accidental needs to be drawn for this specific note head.
                // An accidental is only drawn if the note's intended state is DIFFERENT from its currently active state.
                // Rule I.4, II.4 (`Semua not yang terkena daftarnya WAJIB sharp/flat`) & Rule 3.3 (`Accidental TIDAK perlu ditulis ulang`):
                // This prevents redundant accidentals for notes already covered by the key signature or a prior manual accidental in this bar.
                if (intendedModifier !== currentlyActiveModifier) {
                    let accidentalType = '';
                    if (intendedModifier === '#') accidentalType = '#';
                    else if (intendedModifier === 'b') accidentalType = 'b';
                    // Rule I.3, II.3, III.3, V (`Natural (♮) membatalkan key signature sementara`):
                    // If the intended modifier is natural (empty string), a natural sign must be drawn.
                    else if (intendedModifier === '') accidentalType = 'n'; 
                    if (accidentalType) accidentalsForStaveNote.push({ index, type: accidentalType });
                }
                
                // Update the activeAccidentals map for this note/octave with the *intended* modifier.
                // This sets the 'last applied' state for subsequent notes of the same pitch/octave in the current bar.
                // This is crucial for Rule 3.3 (`Accidental TIDAK perlu ditulis ulang`) and natural cancellations.
                activeAccidentals.set(notePositionKey, intendedModifier);
                
                // Apply 8va/8vb visual shift for displaying notes (does not affect accidental logic)
                if (is8vaActiveForMeasure && hand === 'right') octave--;
                if (is8vbActiveForMeasure && hand === 'left') octave++;
                
                keysForStaveNote.push(`${basePitch.toLowerCase()}/${octave}`);
            });

            finalVexNotes.push({
                vexNoteId: event.vexNoteId!,
                hand: hand,
                vexNote: { keys: keysForStaveNote, duration: vexDuration.type, dots: vexDuration.dots, clef: effectiveClef },
                midiValue: event.midiValue!,
                accidentals: accidentalsForStaveNote,
                fragmentMapping: event.fragmentMapping!,
            });
        } else { // event.type === 'rest'
            // We pass the full duration here. Merging/filtering is handled in the timeline loop above.
            addRestNotesFromMs(event.durationMs, event.timeMs, `rest-${hand}-${event.timeMs}`, hand, effectiveClef, finalVexNotes, getBpmAtTime);
        }
    });

    return finalVexNotes;
}

function computeMinWidthFromNotes(
    fragmentsInMeasure: NoteFragment[],
    getBpmAtTime: (timeMs: number) => number,
    zoom: number
): number {
    const noteZoom = getNoteZoom(zoom);
    const layoutZoom = getLayoutZoom(zoom);

    if (fragmentsInMeasure.length === 0) return 150 * layoutZoom * UNIVERSAL_SCALE;

    let total = 0;

    const timestamps = [...new Set(fragmentsInMeasure.map(f => f.timeMs))].sort((a,b)=>a-b);

    for (const t of timestamps) {
        const group = fragmentsInMeasure.filter(f => f.timeMs === t);

        const bpm = getBpmAtTime(t);
        const localMsPerQuarterNote = 60000 / bpm;
        const baseDurQN = group[0].durationMs / localMsPerQuarterNote;

        // base width before zoom and scaling
        let baseWidth = 60;

        if (baseDurQN >= 1) baseWidth = 70;          
        else if (baseDurQN >= 0.5) baseWidth = 85;   
        else if (baseDurQN >= 0.25) baseWidth = 100;  
        else baseWidth = 115;                        

        // chord spacing
        baseWidth += (group.length - 1) * 12;

        // accidental spacing
        if (group.some(n => n.pitchClass.includes("#") || n.pitchClass.includes("b"))) {
            baseWidth += 16;
        }

        // Apply universal scale first, then dynamic zoom
        const width = baseWidth * UNIVERSAL_SCALE * noteZoom;

        total += width;
    }

    // The total width is the sum of note-zoomed items.
    // The minimum width for a measure is layout-zoomed.
    return Math.max(150 * layoutZoom * UNIVERSAL_SCALE, total);
}

export const getVexFlowRenderData = (
    notes: MidiNotePlaybackItem[],
    timeSignature: TimeSignatureInfo,
    initialTempoBpm: number,
    keySignatureStr: string,
    zoom: number = 1,
    barLinesMs: number[],
    signatureEvents: SignatureEvent[],
    viewWidth: number,
    viewHeight: number,
    showOnlyMajorRests: boolean,
    tempoEvents: TempoEvent[],
    playbackTempoMultiplier: number
): VexFlowRenderData => {
    // CRITICAL FIX: Guard against invalid dimensions to prevent VexFlow crashes
    // Ensure dimensions are positive and finite numbers before any processing.
    if (viewWidth == null || viewWidth <= 0 || !Number.isFinite(viewWidth) ||
        viewHeight == null || viewHeight <= 0 || !Number.isFinite(viewHeight)) {
      console.warn("VexFlow Helper: Invalid dimensions, returning default data.", {viewWidth, viewHeight});
      return { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map() };
    }

    const defaultReturn = { measures: [], octaveLines: [], tempoMarkings: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map() };
    if (notes.length === 0 || !timeSignature || initialTempoBpm <= 0) return defaultReturn;

    const sortedTempoEvents = [...tempoEvents].sort((a, b) => a.timeMs - b.timeMs);
    const getBpmAtTime = (timeMs: number): number => {
      let activeBpm = initialTempoBpm;
      for (const event of sortedTempoEvents) {
        if (event.timeMs <= timeMs) {
          activeBpm = event.bpm;
        } else {
          break;
        }
      }
      return activeBpm;
    };

    const initialMsPerQuarterNote = 60000 / initialTempoBpm;
    const beatsPerMeasureDefault = timeSignature.numerator * (4 / timeSignature.denominator);
    // FIX: Re-calculate totalMusicalDurationMs from the notes.
    const totalMusicalDurationMs = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    const totalBeats = totalMusicalDurationMs / initialMsPerQuarterNote;
    const minPpb = 150, maxPpb = 350;
    let PIXELS_PER_BEAT = minPpb;
    const totalMeasures = barLinesMs.length > 1 ? barLinesMs.length - 1 : 1;
    if (totalBeats > 0 && viewWidth > 0) {
        const targetMeasuresInView = Math.max(2, Math.min(4, totalMeasures));
        const idealPpb = (viewWidth / targetMeasuresInView) / beatsPerMeasureDefault;
        PIXELS_PER_BEAT = Math.max(minPpb, Math.min(maxPpb, idealPpb));
    }
    PIXELS_PER_BEAT *= UNIVERSAL_SCALE; // Apply universal scale
    PIXELS_PER_BEAT *= getLayoutZoom(zoom);

    const STAFF_HEIGHT_PX = 50 * UNIVERSAL_SCALE;
    const estimatedTotalVerticalSpaceNeeded = STAFF_HEIGHT_PX + GRAND_STAFF_VERTICAL_SPACING + STAFF_HEIGHT_PX;
    let topStaveYOffset = Math.max(20 * UNIVERSAL_SCALE, (viewHeight - estimatedTotalVerticalSpaceNeeded) / 2);

    const tempMeasures: VexFlowMeasureData[] = [];
    const effectiveBarLines = [...barLinesMs];
    const lastNoteEndTime = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    if (effectiveBarLines.length === 0 && notes.length > 0) effectiveBarLines.push(notes[0].timeMs);
    const lastBarStartTime = effectiveBarLines[effectiveBarLines.length - 1];
    if (lastNoteEndTime > lastBarStartTime) effectiveBarLines.push(lastNoteEndTime);
    if (effectiveBarLines.length < 2) return defaultReturn;

    // Each original MidiNotePlaybackItem is now a single NoteFragment for highlight purposes
    const allFragmentsForHighlights: NoteFragment[] = notes.map(n => ({ 
        ...n, 
        fragmentId: `${n.noteId}-0`, // Consistent fragment ID, as notes are no longer split
        originalNoteId: n.noteId 
    }));

    const noteIdToFragmentsMap = new Map<string, NoteFragment[]>();
    allFragmentsForHighlights.forEach(fragment => {
        if (!noteIdToFragmentsMap.has(fragment.originalNoteId)) {
            noteIdToFragmentsMap.set(fragment.originalNoteId, []);
        }
        noteIdToFragmentsMap.get(fragment.originalNoteId)!.push(fragment);
    });

    const timeSigChanges = new Map<number, TimeSignatureInfo>();
    const keySigChanges = new Map<number, string>();
    const tempoChanges = new Map<number, number>(); // For BPM markings
    const SIGNATURE_TOLERANCE_MS = 50;
    const findClosestBarStart = (time: number) => effectiveBarLines.reduce((prev, curr) => (Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev));
    
    signatureEvents.forEach(e => {
        const closestBarStart = findClosestBarStart(e.timeMs);
        if (Math.abs(closestBarStart - e.timeMs) < SIGNATURE_TOLERANCE_MS) {
            if (e.time) timeSigChanges.set(closestBarStart, e.time);
            if (e.key) keySigChanges.set(closestBarStart, e.key);
        }
    });

    tempoEvents.forEach(e => {
        const closestBarStart = findClosestBarStart(e.timeMs);
        if (Math.abs(closestBarStart - e.timeMs) < SIGNATURE_TOLERANCE_MS) {
            if (!tempoChanges.has(closestBarStart)) {
                tempoChanges.set(closestBarStart, e.bpm);
            }
        }
    });

    let currentEffectiveClefRH: 'treble' | 'bass' = 'treble';
    let currentEffectiveClefLH: 'treble' | 'bass' = 'bass';
    let currentKeySigForAccidentals = keySignatureStr;
    let currentTsigForMeasure = timeSignature; // Tracks the currently active time signature

    let lastDrawnClefRH: 'treble' | 'bass' = 'treble';
    let lastDrawnClefLH: 'treble' | 'bass' = 'bass';

    const beamableVexDurations = ['8', '16', '32', '64'];

    for (let i = 0; i < effectiveBarLines.length - 1; i++) {
        const measureStartTime = effectiveBarLines[i];
        const measureEndTime = effectiveBarLines[i + 1];
        const newKey = keySigChanges.get(measureStartTime);
        const newTime = timeSigChanges.get(measureStartTime);
        const newTempo = tempoChanges.get(measureStartTime); // Get tempo for this measure
        if (newKey) currentKeySigForAccidentals = newKey;
        if (newTime) currentTsigForMeasure = newTime; // Update the active TS for this measure and subsequent ones

        const measureDurationMs = measureEndTime - measureStartTime;
        const currentBeatsPerMeasure = currentTsigForMeasure.numerator * (4 / currentTsigForMeasure.denominator);
        
        const fragmentsInMeasure: NoteFragment[] = allFragmentsForHighlights
            .filter(f => f.timeMs >= measureStartTime && f.timeMs < measureEndTime)
            .map(f => ({
                ...f,
                durationMs: Math.min(f.durationMs, measureEndTime - f.timeMs),
            }));

        // Determine if there are any dotted beamable notes in this measure
        const hasDottedBeamableNotesInMeasure = fragmentsInMeasure.some(f => {
            const bpm = getBpmAtTime(f.timeMs);
            const msPerQuarterNote = 60000 / bpm;
            const durationInQuarterNotes = f.durationMs / msPerQuarterNote;
            const vexDurationInfo = getVexFlowDuration(durationInQuarterNotes); // Use the helper
            
            const isDotted = vexDurationInfo.dots > 0;
            const isBeamableDuration = beamableVexDurations.includes(vexDurationInfo.type);
            
            return isDotted && isBeamableDuration;
        });


        const rhNotesInMeasure = fragmentsInMeasure.filter(n => n.hand === 'right');
        const lhNotesInMeasure = fragmentsInMeasure.filter(n => n.hand === 'left');

        let detectedClefRH: 'treble' | 'bass' = currentEffectiveClefRH;
        if (rhNotesInMeasure.length >= CLEF_CHANGE_MIN_NOTES) {
            const rhBelowC4 = rhNotesInMeasure.filter(n => n.midi < MIDDLE_C_MIDI).length;
            if (rhBelowC4 / rhNotesInMeasure.length >= CLEF_CHANGE_THRESHOLD_RATIO) detectedClefRH = 'bass'; else detectedClefRH = 'treble';
        }
        let detectedClefLH: 'treble' | 'bass' = currentEffectiveClefLH;
        if (lhNotesInMeasure.length >= CLEF_CHANGE_MIN_NOTES) {
            const lhAboveC4 = lhNotesInMeasure.filter(n => n.midi > MIDDLE_C_MIDI).length;
            if (lhAboveC4 / lhNotesInMeasure.length >= CLEF_CHANGE_THRESHOLD_RATIO) detectedClefLH = 'treble'; else detectedClefLH = 'bass';
        }

        let is8vaActiveRH = false;
        if (rhNotesInMeasure.length > 0) is8vaActiveRH = (rhNotesInMeasure.filter(n => n.midi >= OCTAVA_8VA_THRESHOLD_MIDI).length / rhNotesInMeasure.length) >= OCTAVA_THRESHOLD_RATIO;
        let is8vbActiveLH = false;
        if (lhNotesInMeasure.length > 0) is8vbActiveLH = (lhNotesInMeasure.filter(n => n.midi <= OCTAVA_8VB_THRESHOLD_MIDI).length / lhNotesInMeasure.length) >= OCTAVA_THRESHOLD_RATIO;
        
        // --- NEW DYNAMIC WIDTH CALCULATION ---
        const minWidth = computeMinWidthFromNotes(
            fragmentsInMeasure,
            getBpmAtTime,
            zoom
        );
        const dynamicWidth = currentBeatsPerMeasure * PIXELS_PER_BEAT;
        
        let extraPadding = HORIZONTAL_PADDING; // Base padding for every measure.

        const hasNewClefRH = (i === 0 || detectedClefRH !== lastDrawnClefRH);
        const hasNewClefLH = (i === 0 || detectedClefLH !== lastDrawnClefLH);

        if (i === 0) {
            extraPadding += 35 * UNIVERSAL_SCALE; // Initial brace/line
        }
        
        if (newKey) {
            // Add extra padding for the new key signature
            const keySpec = KEY_SIGNATURE_SPEC[newKey] || {};
            const numAccidentals = Object.keys(keySpec).length;
            const keySignaturePadding = (200 * numAccidentals + 200) * UNIVERSAL_SCALE;
            extraPadding += keySignaturePadding;
        }

        if (newTime) {
            extraPadding += 200 * UNIVERSAL_SCALE;
        }
        if (hasNewClefRH || hasNewClefLH) {
            extraPadding += 200 * UNIVERSAL_SCALE;
        }

        const measureWidth = Math.max(minWidth, dynamicWidth) + extraPadding;
        
        tempMeasures.push({
            rightHand: [], leftHand: [], startTimeMs: measureStartTime, endTimeMs: measureEndTime, width: measureWidth, durationMs: measureDurationMs, 
            keySignature: keySignatureStr, startsRepeat: fragmentsInMeasure.some(n => n.isRepeatStart), endsRepeat: fragmentsInMeasure.some(n => n.isRepeatEnd),
            newKeySignature: newKey, newTimeSignature: newTime, newTempoBpm: newTempo, activeKeySignature: currentKeySigForAccidentals, effectiveClefRH: detectedClefRH,
            effectiveClefLH: detectedClefLH, newClefRH: hasNewClefRH ? detectedClefRH : undefined,
            newClefLH: hasNewClefLH ? detectedClefLH : undefined, is8vaActiveRH, is8vbActiveLH,
            starts8vaRH: false, ends8vaRH: false, starts8vbLH: false, ends8vbLH: false,
            effectiveTimeSignature: currentTsigForMeasure, // NEW
            hasDottedBeamableNotes: hasDottedBeamableNotesInMeasure, // NEW
        });
        currentEffectiveClefRH = detectedClefRH; currentEffectiveClefLH = detectedClefLH;
        if (tempMeasures[i].newClefRH) lastDrawnClefRH = tempMeasures[i].newClefRH!;
        if (tempMeasures[i].newClefLH) lastDrawnClefLH = tempMeasures[i].newClefLH!;
    }

    const measures: VexFlowMeasureData[] = [];
    const octaveLines: OctaveLineInfo[] = [];
    const tempoMarkings: TempoMarkingInfo[] = [];
    let cumulativeWidth = HORIZONTAL_PADDING;

    for (let i = 0; i < tempMeasures.length; i++) {
        const measureData = tempMeasures[i];
        
        if (measureData.newTempoBpm) {
            tempoMarkings.push({
                bpm: Math.round(measureData.newTempoBpm * playbackTempoMultiplier),
                x: cumulativeWidth,
                y: topStaveYOffset - 30 * UNIVERSAL_SCALE,
            });
        }
        
        if (measureData.is8vaActiveRH && (i === 0 || !tempMeasures[i - 1].is8vaActiveRH)) {
            let endBlockIndex = i; let currentBlockWidth = 0;
            while (endBlockIndex < tempMeasures.length && tempMeasures[endBlockIndex].is8vaActiveRH) { currentBlockWidth += tempMeasures[endBlockIndex].width; endBlockIndex++; }
            octaveLines.push({ type: '8va', hand: 'right', startX: cumulativeWidth, endX: cumulativeWidth + currentBlockWidth, startY: topStaveYOffset - 100 * UNIVERSAL_SCALE, endY: topStaveYOffset - 100 * UNIVERSAL_SCALE });
        }
        if (measureData.is8vbActiveLH && (i === 0 || !tempMeasures[i - 1].is8vbActiveLH)) {
            let endBlockIndex = i; let currentBlockWidth = 0;
            while (endBlockIndex < tempMeasures.length && tempMeasures[endBlockIndex].is8vbActiveLH) { currentBlockWidth += tempMeasures[endBlockIndex].width; endBlockIndex++; }
            octaveLines.push({ type: '8vb', hand: 'left', startX: cumulativeWidth, endX: cumulativeWidth + currentBlockWidth, startY: topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING + 300 * UNIVERSAL_SCALE, endY: topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING + 300 * UNIVERSAL_SCALE });
        }

        // Use the clipped fragments for this measure
        const fragmentsInMeasure = allFragmentsForHighlights.filter(f => f.timeMs >= measureData.startTimeMs && f.timeMs < measureData.endTimeMs)
            .map(f => ({
                ...f,
                durationMs: Math.min(f.durationMs, measureData.endTimeMs - f.timeMs),
            }));

        const keySpec = KEY_SIGNATURE_SPEC[measureData.activeKeySignature] || {};
        const activeAccidentalsRH = new Map<string, string>();
        const activeAccidentalsLH = new Map<string, string>();

        measureData.rightHand = processHandAndAccidentals(fragmentsInMeasure, 'right', measureData.effectiveClefRH, measureData.startTimeMs, measureData.endTimeMs, keySpec, activeAccidentalsRH, measureData.is8vaActiveRH, measureData.is8vbActiveLH, showOnlyMajorRests, measureData.activeKeySignature, getBpmAtTime);
        measureData.leftHand = processHandAndAccidentals(fragmentsInMeasure, 'left', measureData.effectiveClefLH, measureData.startTimeMs, measureData.endTimeMs, keySpec, activeAccidentalsLH, measureData.is8vaActiveRH, measureData.is8vbActiveLH, showOnlyMajorRests, measureData.activeKeySignature, getBpmAtTime);
        
        measures.push(measureData);
        cumulativeWidth += measureData.width;
    }

    return { measures, octaveLines, tempoMarkings, topStaveYOffset, fragments: allFragmentsForHighlights, noteIdToFragmentsMap };
};
