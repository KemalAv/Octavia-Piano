import { MidiNotePlaybackItem, TimeSignatureInfo, VexFlowMeasureData, VexFlowNoteInfo, VexFlowRenderData, OctaveLineInfo, NoteFragment } from './types';
import { getNoteZoom, getLayoutZoom, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, SignatureEvent } from './utils';
import { StaveNote, Beam } from 'vexflow'; // Import StaveNote and Beam directly

// --- Universal Scaling ---
const UNIVERSAL_SCALE = 0.5; // Slightly larger for better readability

// --- Constants ---
const GRAND_STAFF_VERTICAL_SPACING = 400 * UNIVERSAL_SCALE;
const HORIZONTAL_PADDING = 15 * UNIVERSAL_SCALE;
const MIDDLE_C_MIDI = 60; // C4
const CLEF_CHANGE_THRESHOLD_RATIO = 0.75;
const CLEF_CHANGE_MIN_NOTES = 2;
const OCTAVA_8VA_THRESHOLD_MIDI = 84; // C6
const OCTAVA_8VB_THRESHOLD_MIDI = 36; // C2
const OCTAVA_THRESHOLD_RATIO = 0.75;
const DURATION_MATCH_TOLERANCE = 0.01; // In quarter notes, e.g., 0.005 means ~2.5ms at 120BPM for a quarter note.

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
 * Determines if a rest duration should be merged into a preceding note's duration.
 * Conditions:
 * 1. Both the note's snapped duration and the rest's snapped duration are 'common' VexFlow durations.
 * 2. The combined snapped duration is also a 'common' VexFlow duration.
 * 3. The note's snapped duration is approximately equal to the rest's snapped duration.
 */
function shouldMergeRestIntoNote(
    lastNoteDurationQuarters: number,
    gapQuarters: number
): boolean {
    const snappedNoteDuration = getClosestCommonDuration(lastNoteDurationQuarters);
    const snappedRestDuration = getClosestCommonDuration(gapQuarters);

    // If either the note or the rest isn't close to a common VexFlow duration, don't merge.
    if (snappedNoteDuration === null || snappedRestDuration === null) {
        return false;
    }

    // Check if the snapped note duration is approximately equal to the snapped rest duration.
    if (Math.abs(snappedNoteDuration - snappedRestDuration) > DURATION_MATCH_TOLERANCE) {
        return false;
    }

    const combinedQuarters = snappedNoteDuration + snappedRestDuration;
    const snappedCombinedDuration = getClosestCommonDuration(combinedQuarters);

    // The combined duration must also be close to a common VexFlow duration.
    return snappedCombinedDuration !== null;
}

/**
 * Adds rest notes to the vexNotes array, respecting the showOnlyMajorRests flag.
 */
function addRestNotesFromMs(
    durationMs: number, // Pass duration in milliseconds
    baseId: string,
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass',
    targetVexNotes: VexFlowNoteInfo[],
    showOnlyMajorRests: boolean,
    msPerQuarterNote: number
) {
    const quarters = durationMs / msPerQuarterNote;
    if (quarters < DURATION_MATCH_TOLERANCE) return; // Ignore very small rests

    let decomposedRests: { type: string, dots: number }[] = [];

    if (showOnlyMajorRests) {
        let remainingQuarters = quarters;
        // Major durations (whole, half, quarter, dotted versions) as quarter-note values
        const majorDurations = [4, 3, 2, 1.5, 1].sort((a,b)=>b-a); // Largest first

        // Process as long as we can fit at least a quarter note (or smallest major unit)
        while (remainingQuarters >= 1 - DURATION_MATCH_TOLERANCE) {
            let consumed = false;
            for (const durQ of majorDurations) {
                if (remainingQuarters >= durQ - DURATION_MATCH_TOLERANCE) {
                    const vexDur = DURATION_TO_VEXFLOW[durQ];
                    if (vexDur) { // Ensure mapping exists for the exact duration
                        decomposedRests.push(vexDur);
                        remainingQuarters -= durQ;
                        consumed = true;
                        break; 
                    }
                }
            }
            if (!consumed) break; // If no major duration could be consumed, stop.
        }
        // Remaining small rests (<1 quarter) are intentionally ignored by this block.
    } else {
        decomposedRests = decomposeDuration(quarters);
    }

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
 *
 * It adheres to the following rules from the provided specification:
 *
 * **Key Signature Rules (Global, persistent):**
 * - **Rule I.1, I.2, II.1, II.2, I.4, II.4 (`Sharp/Flat pada key signature berlaku GLOBAL dan TIDAK reset per bar`):**
 *   The `keySpec` (derived from `measureData.activeKeySignature`) provides the global default
 *   sharps/flats for the current key. This rule is reflected in how `keySigModifier` is determined
 *   and used as the default if no manual accidental has been applied within the current measure.
 * - **Rule V (`Accidental manual tidak pernah permanen; key signature adalah aturan globalnya`):**
 *   Reinforced by `keySigModifier` as the ultimate default for notes not otherwise affected by accidentals within the bar.
 *
 * **Manual Accidental Rules (Per-bar, per-octave, temporary):**
 * - **Rule III.3 (`Accidental manual tidak boleh override key signature lebih dari 1 bar`) & Rule V (`Accidental manual tidak pernah permanen`):**
 *   The `activeAccidentals` map is passed as a *new, empty Map* for each measure for each hand.
 *   This ensures that manual accidentals from a previous bar do not carry over, making them
 *   strictly temporary to the current measure.
 * - **Rule 3.3 (`Accidental TIDAK perlu ditulis ulang untuk pitch yang sama`) & Rule 3.4 (`Jika pitch sama tetapi beda oktaf Accidental harus ditulis lagi`):**
 *   The `notePositionKey` combines the base pitch and octave (`${basePitch}/${octave}`).
 *   The `activeAccidentals` map tracks the last *explicitly displayed* accidental for this
 *   exact pitch-octave combination *within the current measure*. An accidental is only drawn
 *   if the note's `intendedModifier` differs from the `currentlyActiveModifier`.
 * - **Rule I.3, II.3, III.3, V (`Untuk menonaktifkan sementara (hanya 1 bar), gunakan NATURAL (♮)`):**
 *   If the `intendedModifier` is an empty string (meaning natural), an `'n'` accidental type
 *   is assigned. This natural sign explicitly cancels any existing key signature or prior
 *   manual accidental for that specific note and octave, but only within the current measure.
 * - **Rule 3.5 (`Accidental tidak lintas clef`):**
 *   This function is called separately for the right and left hands, each with its own
 *   `activeAccidentals` map, ensuring that accidental tracking is independent per clef/hand.
 * - **Rule 3.6 (`Chord`):**
 *   Each individual note within a chord is processed, and accidentals are applied per
 *   note head using `n.addModifier(new Accidental(acc.type), acc.index)`.
 *
 * @param allFragmentsInMeasure All note fragments (clipped original notes) for the current measure.
 * @param hand The hand being processed ('left' or 'right').
 * @param effectiveClef The effective clef for this hand in the measure.
 * @param measureStartTime The musical start time of the current measure.
 * @param measureEndTime The musical end time of the current measure.
 * @param msPerQuarterNote Milliseconds per quarter note for duration calculations.
 * @param keySpec Object mapping base note names to their key signature modifiers (e.g., {'F': '#'} for G major).
 * @param activeAccidentals A map (reset per measure) tracking the last applied accidental for each note/octave combination within the current measure.
 * @param is8vaActiveForMeasure Whether 8va is active for this hand/measure.
 * @param is8vbActiveForMeasure Whether 8vb is active for this hand/measure.
 * @param showOnlyMajorRests If true, only major rest durations are displayed.
 * @param currentMeasureKeySignature The full key signature string for the current measure (e.g., 'C', 'G', 'Bb').
 * @returns An array of `VexFlowNoteInfo` objects for the processed hand.
 */
function processHandAndAccidentals(
    allFragmentsInMeasure: NoteFragment[],
    hand: 'left' | 'right',
    effectiveClef: 'treble' | 'bass',
    measureStartTime: number,
    measureEndTime: number,
    msPerQuarterNote: number,
    keySpec: { [note: string]: string },
    activeAccidentals: Map<string, string>, // This map is reset per measure (Rule III.3, V)
    is8vaActiveForMeasure: boolean,
    is8vbActiveForMeasure: boolean,
    showOnlyMajorRests: boolean,
    currentMeasureKeySignature: string // New parameter for dynamic enharmonic correction
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
        if (restGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterNote) { // Small threshold for a meaningful rest
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
    if (finalRestGapMs > DURATION_MATCH_TOLERANCE * msPerQuarterNote) {
        rawTimelineEvents.push({ type: 'rest', timeMs: timelineCursorMs, durationMs: finalRestGapMs });
    }

    // 2. Apply merging logic if showOnlyMajorRests is true
    const processedTimelineEvents: TimelineEvent[] = [];

    if (showOnlyMajorRests) {
        for (let i = 0; i < rawTimelineEvents.length; i++) {
            let currentEvent = rawTimelineEvents[i];
            
            // If current is a note and next is a rest, try to merge
            if (currentEvent.type === 'note' && i + 1 < rawTimelineEvents.length && rawTimelineEvents[i + 1].type === 'rest') {
                const nextEvent = rawTimelineEvents[i + 1];

                const currentNoteDurationQuarters = currentEvent.durationMs / msPerQuarterNote;
                const nextRestDurationQuarters = nextEvent.durationMs / msPerQuarterNote;

                if (shouldMergeRestIntoNote(currentNoteDurationQuarters, nextRestDurationQuarters)) {
                    // Merge: Extend the current note's duration
                    const combinedQuarters = currentNoteDurationQuarters + nextRestDurationQuarters;
                    currentEvent.durationMs = combinedQuarters * msPerQuarterNote;
                    // Skip the next rest event (effectively removing it)
                    i++; // Advance 'i' by an extra step to skip the merged rest
                }
            }
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
            const durationQuarters = durationMs / msPerQuarterNote;
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
            addRestNotesFromMs(event.durationMs, `rest-${hand}-${event.timeMs}`, hand, effectiveClef, finalVexNotes, showOnlyMajorRests, msPerQuarterNote);
        }
    });

    return finalVexNotes;
}

function computeMinWidthFromNotes(
    fragmentsInMeasure: NoteFragment[],
    msPerQuarterNote: number,
    zoom: number
): number {
    const noteZoom = getNoteZoom(zoom);
    const layoutZoom = getLayoutZoom(zoom);

    if (fragmentsInMeasure.length === 0) return 150 * layoutZoom * UNIVERSAL_SCALE;

    let total = 0;

    const timestamps = [...new Set(fragmentsInMeasure.map(f => f.timeMs))].sort((a,b)=>a-b);

    for (const t of timestamps) {
        const group = fragmentsInMeasure.filter(f => f.timeMs === t);

        const baseDurQN = group[0].durationMs / msPerQuarterNote;

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
    showOnlyMajorRests: boolean
): VexFlowRenderData => {
    // CRITICAL FIX: Guard against invalid dimensions to prevent VexFlow crashes
    // Ensure dimensions are positive and finite numbers before any processing.
    if (viewWidth == null || viewWidth <= 0 || !Number.isFinite(viewWidth) ||
        viewHeight == null || viewHeight <= 0 || !Number.isFinite(viewHeight)) {
      console.warn("VexFlow Helper: Invalid dimensions, returning default data.", {viewWidth, viewHeight});
      return { measures: [], octaveLines: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map() };
    }

    const defaultReturn = { measures: [], octaveLines: [], topStaveYOffset: 60, fragments: [], noteIdToFragmentsMap: new Map() };
    if (notes.length === 0 || !timeSignature || initialTempoBpm <= 0) return defaultReturn;

    const msPerQuarterNote = 60000 / initialTempoBpm;
    const beatsPerMeasureDefault = timeSignature.numerator * (4 / timeSignature.denominator);
    // FIX: Re-calculate totalMusicalDurationMs from the notes.
    const totalMusicalDurationMs = notes.length > 0 ? Math.max(...notes.map(n => n.timeMs + n.durationMs)) : 0;
    const totalBeats = totalMusicalDurationMs / msPerQuarterNote;
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
    const SIGNATURE_TOLERANCE_MS = 50;
    const findClosestBarStart = (time: number) => effectiveBarLines.reduce((prev, curr) => (Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev));
    signatureEvents.forEach(e => {
        const closestBarStart = findClosestBarStart(e.timeMs);
        if (Math.abs(closestBarStart - e.timeMs) < SIGNATURE_TOLERANCE_MS) {
            if (e.time) timeSigChanges.set(closestBarStart, e.time);
            if (e.key) keySigChanges.set(closestBarStart, e.key);
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
            msPerQuarterNote,
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
            const keySignaturePadding = (100 * numAccidentals + 25) * UNIVERSAL_SCALE;
            extraPadding += keySignaturePadding;
        }

        if (newTime) {
            extraPadding += 50 * UNIVERSAL_SCALE;
        }
        if (hasNewClefRH || hasNewClefLH) {
            extraPadding += 50 * UNIVERSAL_SCALE;
        }

        const measureWidth = Math.max(minWidth, dynamicWidth) + extraPadding;
        
        tempMeasures.push({
            rightHand: [], leftHand: [], startTimeMs: measureStartTime, endTimeMs: measureEndTime, width: measureWidth, durationMs: measureDurationMs, 
            keySignature: keySignatureStr, startsRepeat: fragmentsInMeasure.some(n => n.isRepeatStart), endsRepeat: fragmentsInMeasure.some(n => n.isRepeatEnd),
            newKeySignature: newKey, newTimeSignature: newTime, activeKeySignature: currentKeySigForAccidentals, effectiveClefRH: detectedClefRH,
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
    let cumulativeWidthForOctaveLines = HORIZONTAL_PADDING;

    for (let i = 0; i < tempMeasures.length; i++) {
        const measureData = tempMeasures[i];
        if (measureData.is8vaActiveRH && (i === 0 || !tempMeasures[i - 1].is8vaActiveRH)) {
            let endBlockIndex = i; let currentBlockWidth = 0;
            while (endBlockIndex < tempMeasures.length && tempMeasures[endBlockIndex].is8vaActiveRH) { currentBlockWidth += tempMeasures[endBlockIndex].width; endBlockIndex++; }
            octaveLines.push({ type: '8va', hand: 'right', startX: cumulativeWidthForOctaveLines, endX: cumulativeWidthForOctaveLines + currentBlockWidth, startY: topStaveYOffset - 50 * UNIVERSAL_SCALE, endY: topStaveYOffset - 50 * UNIVERSAL_SCALE });
        }
        if (measureData.is8vbActiveLH && (i === 0 || !tempMeasures[i - 1].is8vbActiveLH)) {
            let endBlockIndex = i; let currentBlockWidth = 0;
            while (endBlockIndex < tempMeasures.length && tempMeasures[endBlockIndex].is8vbActiveLH) { currentBlockWidth += tempMeasures[endBlockIndex].width; endBlockIndex++; }
            octaveLines.push({ type: '8vb', hand: 'left', startX: cumulativeWidthForOctaveLines, endX: cumulativeWidthForOctaveLines + currentBlockWidth, startY: topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING + 200 * UNIVERSAL_SCALE, endY: topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING + 200 * UNIVERSAL_SCALE });
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

        measureData.rightHand = processHandAndAccidentals(fragmentsInMeasure, 'right', measureData.effectiveClefRH, measureData.startTimeMs, measureData.endTimeMs, msPerQuarterNote, keySpec, activeAccidentalsRH, measureData.is8vaActiveRH, measureData.is8vbActiveLH, showOnlyMajorRests, measureData.activeKeySignature);
        measureData.leftHand = processHandAndAccidentals(fragmentsInMeasure, 'left', measureData.effectiveClefLH, measureData.startTimeMs, measureData.endTimeMs, msPerQuarterNote, keySpec, activeAccidentalsLH, measureData.is8vaActiveRH, measureData.is8vbActiveLH, showOnlyMajorRests, measureData.activeKeySignature);
        
        measures.push(measureData);
        cumulativeWidthForOctaveLines += measureData.width;
    }

    return { measures, octaveLines, topStaveYOffset, fragments: allFragmentsForHighlights, noteIdToFragmentsMap };
};