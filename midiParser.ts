// midiParser.ts
import { Midi } from '@tonejs/midi';
// FIX: Import JSZipObject to use for type casting.
import JSZip, { JSZipObject } from 'jszip';
import { MidiNotePlaybackItem, TimeSignatureInfo, FileType, PianoKeyDefinition, TempoEvent } from './types';
import { SignatureEvent } from './utils'; // Corrected import path for SignatureEvent
import {
    HAND_SPLIT_MIDI_NOTE,
    PIANO_KEYS_CONFIG,
    DRUM_MIDI_TO_NAME_MAP,
} from './constants';

export const INITIAL_PLAYBACK_DELAY_MS = 2000;
export const DEFAULT_TIME_SIGNATURE: TimeSignatureInfo = { numerator: 4, denominator: 4 };
export const DEFAULT_KEY_SIGNATURE = 'C';
export const DEFAULT_MUSICXML_TEMPO_BPM = 120;

const MUSICXML_STEP_to_NOTE_OFFSET: { [key: string]: number } = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const FIFTHS_TO_KEY: { [key: string]: string } = {
    '7': 'C#', '6': 'F#', '5': 'B', '4': 'E', '3': 'A', '2': 'D', '1': 'G', '0': 'C',
    '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb', '-7': 'Cb'
};

function musicXmlPitchToMidiNote(step: string, alter: number, octave: number): number {
    let midi = 12 * (octave + 1);
    midi += MUSICXML_STEP_to_NOTE_OFFSET[step.toUpperCase()];
    midi += alter;
    return midi;
}

function musicXmlDurationToMs(durationValue: number, divisions: number, tempoBpm: number): number {
    if (divisions === 0 || tempoBpm === 0) return 0;
    const quarterNotes = durationValue / divisions;
    const beatsPerMinute = tempoBpm;
    const secondsPerBeat = 60 / beatsPerMinute;
    const totalSeconds = quarterNotes * secondsPerBeat;
    return Math.round(totalSeconds * 1000);
}

export function guessKeySignature(notes: { midi: number, durationMs?: number }[]): string {
    if (notes.length === 0) return 'C';

    // Total duration of each pitch class
    const pitchClassDurations = new Array(12).fill(0);
    for (const note of notes) {
        pitchClassDurations[note.midi % 12] += note.durationMs || 1;
    }

    // Krumhansl-Schmuckler profiles (Krumhansl & Kessler 1982)
    // 0 = C, 1 = C#, 2 = D ...
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const minorKeys = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

    function correlation(X: number[], Y: number[]): number {
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        const n = X.length;
        for (let i = 0; i < n; i++) {
            sumX += X[i];
            sumY += Y[i];
            sumXY += X[i] * Y[i];
            sumX2 += X[i] * X[i];
            sumY2 += Y[i] * Y[i];
        }
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominator === 0) return 0;
        return (n * sumXY - sumX * sumY) / denominator;
    }

    let bestKey = 'C';
    let maxCor = -Infinity;

    for (let i = 0; i < 12; i++) {
        const shiftedMajor = [];
        const shiftedMinor = [];
        for (let j = 0; j < 12; j++) {
            shiftedMajor.push(majorProfile[(j - i + 12) % 12]);
            shiftedMinor.push(minorProfile[(j - i + 12) % 12]);
        }

        const corMajor = correlation(pitchClassDurations, shiftedMajor);
        const corMinor = correlation(pitchClassDurations, shiftedMinor);

        if (corMajor > maxCor) {
            maxCor = corMajor;
            bestKey = keys[i];
        }

        if (corMinor > maxCor) {
            maxCor = corMinor;
            bestKey = minorKeys[i];
        }
    }

    // For flat equivalents if necessary to match display formats
    const enharmonicAdjustments: Record<string, string> = {
        'Db': 'C#',
        'Ebm': 'D#m',
        'Abm': 'G#m',
        'Bbm': 'A#m'
    };

    return enharmonicAdjustments[bestKey] || bestKey;
}


export async function parseMidiData(
    arrayBuffer: ArrayBuffer,
    midiNoteToNameMap: Map<number, string>
): Promise<{
    notes: MidiNotePlaybackItem[];
    timeSignature: TimeSignatureInfo;
    keySignature: string;
    initialTempoBpm: number;
    tempoEvents: TempoEvent[];
    barLinesMs: number[];
    signatureEvents: SignatureEvent[];
    originalTotalMusicalDurationMs: number;
}> {
    const midi = new Midi(arrayBuffer);
    const ppq = midi.header.ppq;

    midi.tracks.forEach(track => {
        delete track.controlChanges['64'];
    });

    const sortedTimeSignatures = [...midi.header.timeSignatures].sort((a, b) => a.ticks - b.ticks);

    let initialTimeSignature = DEFAULT_TIME_SIGNATURE;
    if (sortedTimeSignatures.length > 0 && sortedTimeSignatures[0].ticks === 0) {
        initialTimeSignature = {
            numerator: sortedTimeSignatures[0].timeSignature[0],
            denominator: sortedTimeSignatures[0].timeSignature[1]
        };
    }

    let keySignature = midi.header.keySignatures[0]?.key ?? DEFAULT_KEY_SIGNATURE;
    const initialTempoBpm = midi.header.tempos[0] ? midi.header.tempos[0].bpm : 120;

    const tempoEvents: TempoEvent[] = midi.header.tempos.map(t => ({
        timeMs: Math.round((t.time ?? 0) * 1000) + INITIAL_PLAYBACK_DELAY_MS,
        bpm: t.bpm
    }));

    if (tempoEvents.length === 0) {
        tempoEvents.push({ timeMs: INITIAL_PLAYBACK_DELAY_MS, bpm: 120 });
    } else if (tempoEvents[0].timeMs > INITIAL_PLAYBACK_DELAY_MS) {
        tempoEvents.unshift({ timeMs: INITIAL_PLAYBACK_DELAY_MS, bpm: tempoEvents[0].bpm });
    } else {
        tempoEvents[0].timeMs = INITIAL_PLAYBACK_DELAY_MS;
    }

    const barLinesMs: number[] = [];
    if (midi.durationTicks > 0) {
        const ppq = midi.header.ppq;
        const timeSignatures = [...sortedTimeSignatures];
        if (timeSignatures.length === 0 || timeSignatures[0].ticks > 0) {
            timeSignatures.unshift({
                ticks: 0,
                timeSignature: [4, 4],
                measures: 0
            } as any);
        }

        let currentTick = 0;
        let tsIndex = 0;

        let maxTick = midi.durationTicks;
        midi.tracks.forEach(track => {
            track.notes.forEach(note => {
                if (note.ticks + note.durationTicks > maxTick) {
                    maxTick = note.ticks + note.durationTicks;
                }
            });
        });

        while (currentTick <= maxTick) {
            barLinesMs.push(Math.round(midi.header.ticksToSeconds(currentTick) * 1000) + INITIAL_PLAYBACK_DELAY_MS);
            while (tsIndex < timeSignatures.length - 1 && timeSignatures[tsIndex + 1].ticks <= currentTick) {
                tsIndex++;
            }
            const activeTs = timeSignatures[tsIndex];
            const num = activeTs.timeSignature[0];
            const den = activeTs.timeSignature[1];
            const ticksPerMeasure = ppq * num * (4 / den);
            if (ticksPerMeasure <= 0) break;
            currentTick += ticksPerMeasure;
        }
        barLinesMs.push(Math.round(midi.header.ticksToSeconds(currentTick) * 1000) + INITIAL_PLAYBACK_DELAY_MS);
    }

    const signatureEvents: SignatureEvent[] = [];
    sortedTimeSignatures.forEach(ts => {
        if (ts.ticks >= 0) {
            signatureEvents.push({
                timeMs: Math.round(midi.header.ticksToSeconds(ts.ticks) * 1000) + INITIAL_PLAYBACK_DELAY_MS,
                time: { numerator: ts.timeSignature[0], denominator: ts.timeSignature[1] }
            });
        }
    });
    midi.header.keySignatures.forEach(ks => {
        if (ks.ticks >= 0) {
            signatureEvents.push({
                timeMs: Math.round(midi.header.ticksToSeconds(ks.ticks) * 1000) + INITIAL_PLAYBACK_DELAY_MS,
                key: ks.key
            });
        }
    });

    const uniqueNotesMap = new Map<string, Omit<MidiNotePlaybackItem, 'noteId'>>();
    const tracksWithNotes = midi.tracks.filter(t => t.notes.length > 0);

    midi.tracks.forEach((track, trackIndex) => {
        // Find which musical track index this is among tracks that actually contain notes
        const noteTrackIndex = tracksWithNotes.indexOf(track);

        track.notes.forEach(note => {
            // Filter out corrupted/zero-duration glitch notes and zero-velocity notes
            if (note.durationTicks <= 0 || note.duration <= 0.005 || note.velocity <= 0) {
                return;
            }

            const noteName = midiNoteToNameMap.get(note.midi);
            if (noteName) {
                let hand: 'left' | 'right';
                if (tracksWithNotes.length === 2 && noteTrackIndex !== -1) {
                    hand = noteTrackIndex === 0 ? 'right' : 'left';
                } else {
                    hand = note.midi < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right';
                }

                // Ensure a minimum audible duration so notes don't get cut off in 0ms
                const rawDurationMs = Math.round(note.duration * 1000);
                const durationMs = Math.max(60, rawDurationMs);
                const durationTicks = Math.max(Math.round(ppq / 16), note.durationTicks);

                const newNote = {
                    midi: note.midi,
                    timeMs: Math.round(note.time * 1000) + INITIAL_PLAYBACK_DELAY_MS,
                    durationMs: durationMs,
                    name: noteName,
                    pitchClass: note.pitch,
                    velocity: note.velocity,
                    hand: hand,
                    originalTrackSourceInfo: `midi_track_${trackIndex}`,
                    ticks: note.ticks,
                    durationTicks: durationTicks
                };

                const key = `${note.ticks}_${note.midi}`;
                if (uniqueNotesMap.has(key)) {
                    const existingNote = uniqueNotesMap.get(key)!;
                    // Prefer the note with longer duration or better velocity
                    if (newNote.durationMs > existingNote.durationMs) {
                        uniqueNotesMap.set(key, newNote);
                    } else if (existingNote.hand === 'right' && newNote.hand === 'left') {
                        uniqueNotesMap.set(key, newNote);
                    }
                } else {
                    uniqueNotesMap.set(key, newNote);
                }
            }
        });
    });

    const rawNotes = Array.from(uniqueNotesMap.values());
    rawNotes.sort((a, b) => a.timeMs - b.timeMs);

    if (midi.header.keySignatures.length === 0) {
        keySignature = guessKeySignature(rawNotes);
        signatureEvents.push({
            timeMs: INITIAL_PLAYBACK_DELAY_MS,
            key: keySignature
        });
    }

    let counter = 0;
    const notes: MidiNotePlaybackItem[] = rawNotes.map(n => ({
        ...n,
        noteId: `midi-${n.originalTrackSourceInfo}-${n.ticks}-${counter++}`
    }));

    // FIX: Calculate duration as (Last Note End - First Note Start) to match App.tsx logic.
    // This ignores the arbitrary INITIAL_PLAYBACK_DELAY_MS added to start times.
    let firstNoteTime = Infinity;
    let lastNoteEndTime = 0;
    if (notes.length > 0) {
        for (const n of notes) {
            if (n.timeMs < firstNoteTime) firstNoteTime = n.timeMs;
            const end = n.timeMs + n.durationMs;
            if (end > lastNoteEndTime) lastNoteEndTime = end;
        }
    }
    const originalTotalMusicalDurationMs = (isFinite(firstNoteTime) && lastNoteEndTime > 0)
        ? lastNoteEndTime - firstNoteTime
        : 0;

    return { notes, timeSignature: initialTimeSignature, keySignature, initialTempoBpm, tempoEvents, barLinesMs, signatureEvents, originalTotalMusicalDurationMs };
}

export async function parseMusicXmlData(
    xmlString: string,
    midiNoteToNameMap: Map<number, string>
): Promise<{
    notes: MidiNotePlaybackItem[];
    timeSignature: TimeSignatureInfo;
    keySignature: string;
    initialTempoBpm: number;
    tempoEvents: TempoEvent[];
    barLinesMs: number[];
    signatureEvents: SignatureEvent[];
    originalTotalMusicalDurationMs: number;
}> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        console.error("MusicXML Parser Error:", xmlDoc.getElementsByTagName("parsererror")[0].textContent);
        throw new Error("Failed to parse MusicXML: Invalid XML content.");
    }

    let initialTimeSignature: TimeSignatureInfo | null = null;
    let keySignature: string = DEFAULT_KEY_SIGNATURE;
    let initialTempoBpm: number = DEFAULT_MUSICXML_TEMPO_BPM;
    const rawNotes: Omit<MidiNotePlaybackItem, 'noteId'>[] = [];
    const tempoEvents: TempoEvent[] = [];
    const signatureEventsFromXml: SignatureEvent[] = [];
    const barLineTimeSet = new Set<number>();

    const parts = Array.from(xmlDoc.getElementsByTagName('part'));

    parts.forEach((part, partIndex) => {
        let cursorTicks = 0;
        let cursorMs = 0;
        let divisions = 1;
        let currentTempoBpm = DEFAULT_MUSICXML_TEMPO_BPM;
        let currentTsig = { numerator: 4, denominator: 4 };
        const partId = part.getAttribute('id') || `P${partIndex + 1}`;

        let repeatStartTick = 0;
        let repeatStartMs = 0;
        let notesInRepeatSection: Omit<MidiNotePlaybackItem, 'noteId'>[] = [];
        let isInsideRepeat = false;
        let repeatStartIndexInRawNotes = -1;

        const measures = Array.from(part.getElementsByTagName('measure'));
        measures.forEach(measure => {
            if (partIndex === 0) {
                barLineTimeSet.add(cursorMs);
            }

            const measureStartMs = cursorMs;
            const measureStartTicks = cursorTicks;
            let maxVoiceMs = 0;
            let maxVoiceTicks = 0;
            const voiceOffsetsMs = new Map<string, number>();
            const voiceOffsetsTicks = new Map<string, number>();
            let currentVoice = '1';
            const chordOnsets = new Map<string, {ms: number; ticks: number}>();

            const elements = Array.from(measure.children);
            elements.forEach(element => {
                if (element.tagName === 'attributes') {
                    const divisionsEl = element.getElementsByTagName('divisions')[0];
                    if (divisionsEl) divisions = parseInt(divisionsEl.textContent || '1', 10);

                    const timeEl = element.getElementsByTagName('time')[0];
                    if (timeEl) {
                        const beats = timeEl.getElementsByTagName('beats')[0]?.textContent;
                        const beatType = timeEl.getElementsByTagName('beat-type')[0]?.textContent;
                        if (beats && beatType) {
                            const newTimeSig = { numerator: parseInt(beats, 10), denominator: parseInt(beatType, 10) };
                            currentTsig = newTimeSig;
                            if (initialTimeSignature === null) {
                                initialTimeSignature = newTimeSig;
                            }
                            signatureEventsFromXml.push({ timeMs: cursorMs, time: newTimeSig });
                        }
                    }

                    const keyEl = element.getElementsByTagName('key')[0];
                    if (keyEl) {
                        const fifths = keyEl.getElementsByTagName('fifths')[0]?.textContent;
                        if (fifths && FIFTHS_TO_KEY[fifths]) {
                            const newKeySig = FIFTHS_TO_KEY[fifths];
                            if (cursorMs > 0) signatureEventsFromXml.push({ timeMs: cursorMs, key: newKeySig });
                            keySignature = newKeySig;
                        }
                    }
                } else if (element.tagName === 'direction') {
                    const soundEl = element.getElementsByTagName('sound')[0];
                    if (soundEl && soundEl.hasAttribute('tempo')) {
                        const newTempo = parseFloat(soundEl.getAttribute('tempo')!);
                        if (!isNaN(newTempo)) {
                            currentTempoBpm = newTempo;
                            if (tempoEvents.length === 0) initialTempoBpm = newTempo;
                            tempoEvents.push({ timeMs: cursorMs, bpm: newTempo });
                        }
                    }
                } else if (element.tagName === 'barline') {
                    const repeatEl = element.getElementsByTagName('repeat')[0];
                    if (repeatEl) {
                        const direction = repeatEl.getAttribute('direction');
                        if (direction === 'forward') {
                            isInsideRepeat = true;
                            notesInRepeatSection = [];
                            repeatStartTick = measureStartTicks;
                            repeatStartMs = measureStartMs;
                            repeatStartIndexInRawNotes = rawNotes.length;
                        } else if (direction === 'backward') {
                            if (isInsideRepeat && notesInRepeatSection.length > 0) {
                                const repeatDurationMs = cursorMs - repeatStartMs;

                                if (repeatStartIndexInRawNotes !== -1 && rawNotes[repeatStartIndexInRawNotes]) {
                                    (rawNotes[repeatStartIndexInRawNotes] as MidiNotePlaybackItem).isRepeatStart = true;
                                }
                                if (rawNotes.length > 0) {
                                    (rawNotes[rawNotes.length - 1] as MidiNotePlaybackItem).isRepeatEnd = true;
                                }

                                const repeatedNotes = notesInRepeatSection.map(noteToRepeat => {
                                    const newTimeMs = noteToRepeat.timeMs + repeatDurationMs;
                                    return { ...noteToRepeat, timeMs: newTimeMs };
                                });
                                rawNotes.push(...repeatedNotes);
                            }
                            isInsideRepeat = false;
                            notesInRepeatSection = [];
                            repeatStartIndexInRawNotes = -1;
                        }
                    }
                } else if (element.tagName === 'note') {
                    const voiceEl = element.getElementsByTagName('voice')[0];
                    if (voiceEl && voiceEl.textContent) {
                        currentVoice = voiceEl.textContent;
                    }
                    const vMs = voiceOffsetsMs.get(currentVoice) || 0;
                    const vTicks = voiceOffsetsTicks.get(currentVoice) || 0;

                    const isRest = element.getElementsByTagName('rest').length > 0;
                    const durationEl = element.getElementsByTagName('duration')[0];
                    const durationTicks = durationEl ? parseInt(durationEl.textContent || '0', 10) : 0;
                    const isChord = element.getElementsByTagName('chord').length > 0;

                    if (durationTicks < 0) {
                        if (!isChord) {
                            const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                            voiceOffsetsMs.set(currentVoice, vMs + durationMs);
                            voiceOffsetsTicks.set(currentVoice, vTicks + durationTicks);
                        }
                        return;
                    }

                    const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                    const chordOnset = isChord ? chordOnsets.get(currentVoice) : undefined;
                    const noteStartTimeMs = chordOnset?.ms ?? measureStartMs + vMs;
                    const noteStartTicks = chordOnset?.ticks ?? measureStartTicks + vTicks;
                    if (!isChord) chordOnsets.set(currentVoice, {ms: noteStartTimeMs, ticks: noteStartTicks});

                    if (!isRest) {
                        const pitchEl = element.getElementsByTagName('pitch')[0];
                        if (pitchEl) {
                            const step = pitchEl.getElementsByTagName('step')[0].textContent || 'C';
                            const alter = parseInt(pitchEl.getElementsByTagName('alter')[0]?.textContent || '0', 10);
                            const octave = parseInt(pitchEl.getElementsByTagName('octave')[0].textContent || '4', 10);

                            const midiNote = musicXmlPitchToMidiNote(step, alter, octave);
                            const noteName = midiNoteToNameMap.get(midiNote);

                            if (noteName) {
                                let hand: 'left' | 'right';
                                if (parts.length > 1) {
                                    hand = (partIndex === 0) ? 'right' : 'left';
                                } else {
                                    hand = midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right';
                                }

                                const nativeHand = element.getAttribute('data-octavia-hand');
                                if (nativeHand === 'left' || nativeHand === 'right') hand = nativeHand;
                                const nativeFinger = Number(element.getAttribute('data-octavia-finger'));
                                let handPositions: number[] | undefined;
                                try {
                                    const positions=JSON.parse(element.getAttribute('data-octavia-positions') || 'null');
                                    if (Array.isArray(positions) && positions.length===5 && positions.every(p=>typeof p==='number' && Number.isFinite(p))) handPositions=positions;
                                } catch { /* Optional display pose; keep parsing the score. */ }
                                const newNote = {
                                    handPositions,
                                    finger: nativeFinger >= 1 && nativeFinger <= 5 ? nativeFinger as 1|2|3|4|5 : undefined,
                                    midi: midiNote,
                                    timeMs: noteStartTimeMs,
                                    durationMs: durationMs,
                                    name: noteName,
                                    pitchClass: step + (alter === 1 ? '#' : alter === -1 ? 'b' : ''),
                                    velocity: 0.75,
                                    hand: hand,
                                    originalTrackSourceInfo: `musicxml_part_${partId}`,
                                    ticks: noteStartTicks,
                                    durationTicks: durationTicks
                                };
                                rawNotes.push(newNote);
                                if (isInsideRepeat) {
                                    notesInRepeatSection.push(newNote);
                                }

                            } else {
                                console.warn(`Note name not found for MIDI note: ${midiNote} (step: ${step}, octave: ${octave}, alter: ${alter})`);
                            }
                        }
                    }

                    if (!isChord) {
                        const nextVMs = vMs + durationMs;
                        const nextVTicks = vTicks + durationTicks;
                        voiceOffsetsMs.set(currentVoice, nextVMs);
                        voiceOffsetsTicks.set(currentVoice, nextVTicks);
                        maxVoiceMs = Math.max(maxVoiceMs, nextVMs);
                        maxVoiceTicks = Math.max(maxVoiceTicks, nextVTicks);
                    }
                } else if (element.tagName === 'backup') {
                    const durationTicks = parseInt(element.getElementsByTagName('duration')[0]?.textContent || '0', 10);
                    const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                    const vMs = voiceOffsetsMs.get(currentVoice) || 0;
                    const vTicks = voiceOffsetsTicks.get(currentVoice) || 0;
                    voiceOffsetsMs.set(currentVoice, Math.max(0, vMs - durationMs));
                    voiceOffsetsTicks.set(currentVoice, Math.max(0, vTicks - durationTicks));
                } else if (element.tagName === 'forward') {
                    const durationTicks = parseInt(element.getElementsByTagName('duration')[0]?.textContent || '0', 10);
                    const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                    const vMs = voiceOffsetsMs.get(currentVoice) || 0;
                    const vTicks = voiceOffsetsTicks.get(currentVoice) || 0;
                    const nextVMs = vMs + durationMs;
                    const nextVTicks = vTicks + durationTicks;
                    voiceOffsetsMs.set(currentVoice, nextVMs);
                    voiceOffsetsTicks.set(currentVoice, nextVTicks);
                    maxVoiceMs = Math.max(maxVoiceMs, nextVMs);
                    maxVoiceTicks = Math.max(maxVoiceTicks, nextVTicks);
                }
            });

            const measureDurationTicks = currentTsig.numerator * (4 / currentTsig.denominator) * divisions;
            const measureDurationMs = musicXmlDurationToMs(measureDurationTicks, divisions, currentTempoBpm);
            const actualMeasureDurationMs = Math.max(measureDurationMs, maxVoiceMs);
            const actualMeasureDurationTicks = Math.max(measureDurationTicks, maxVoiceTicks);

            cursorMs = measureStartMs + actualMeasureDurationMs;
            cursorTicks = measureStartTicks + actualMeasureDurationTicks;
        });
        if (partIndex === 0) {
            barLineTimeSet.add(cursorMs);
        }
    });

    const uniqueNotesMap = new Map<string, Omit<MidiNotePlaybackItem, 'noteId'>>();
    for (const note of rawNotes) {
        const key = `${note.ticks}_${note.midi}`;
        if (uniqueNotesMap.has(key)) {
            const existingNote = uniqueNotesMap.get(key)!;
            if (existingNote.hand === 'right' && note.hand === 'left') {
                uniqueNotesMap.set(key, note);
            }
        } else {
            uniqueNotesMap.set(key, note);
        }
    }
    const deduplicatedNotes = Array.from(uniqueNotesMap.values());
    deduplicatedNotes.sort((a, b) => a.timeMs - b.timeMs || (a.ticks ?? 0) - (b.ticks ?? 0));

    // Check if any key events were explicitly parsed
    const hasKeyEvents = signatureEventsFromXml.some(e => e.key !== undefined);

    if (!hasKeyEvents) {
        keySignature = guessKeySignature(deduplicatedNotes);
        signatureEventsFromXml.push({
            timeMs: 0,
            key: keySignature
        });
    }

    let counter = 0;
    const notes: MidiNotePlaybackItem[] = deduplicatedNotes.map(n => ({
        ...n,
        noteId: `xml-${n.originalTrackSourceInfo}-${n.ticks}-${counter++}`
    }));

    tempoEvents.sort((a, b) => a.timeMs - b.timeMs);
    const uniqueTempoEvents = tempoEvents.filter((event, index, self) => index === self.findIndex((t) => (t.timeMs === event.timeMs)));
    if (uniqueTempoEvents.length === 0 || uniqueTempoEvents[0].timeMs > 0) {
        uniqueTempoEvents.unshift({ timeMs: 0, bpm: initialTempoBpm });
    }

    const barLinesMs = Array.from(barLineTimeSet).sort((a, b) => a - b);

    const finalNotes = notes.map(n => ({ ...n, timeMs: n.timeMs + INITIAL_PLAYBACK_DELAY_MS }));
    const finalTempoEvents = uniqueTempoEvents.map(t => ({ ...t, timeMs: t.timeMs + INITIAL_PLAYBACK_DELAY_MS }));
    const finalBarLinesMs = barLinesMs.map(b => b + INITIAL_PLAYBACK_DELAY_MS);
    const finalSignatureEvents = signatureEventsFromXml.map(e => ({ ...e, timeMs: e.timeMs + INITIAL_PLAYBACK_DELAY_MS }));

    // FIX: Calculate duration as (Last Note End - First Note Start) to match App.tsx logic.
    // This ignores the arbitrary INITIAL_PLAYBACK_DELAY_MS added to start times.
    let firstNoteTime = Infinity;
    let lastNoteEndTime = 0;
    if (finalNotes.length > 0) {
        for (const n of finalNotes) {
            if (n.timeMs < firstNoteTime) firstNoteTime = n.timeMs;
            const end = n.timeMs + n.durationMs;
            if (end > lastNoteEndTime) lastNoteEndTime = end;
        }
    }
    const originalTotalMusicalDurationMs = (isFinite(firstNoteTime) && lastNoteEndTime > 0)
        ? lastNoteEndTime - firstNoteTime
        : 0;

    return { notes: finalNotes, timeSignature: initialTimeSignature || DEFAULT_TIME_SIGNATURE, keySignature, initialTempoBpm, tempoEvents: finalTempoEvents, barLinesMs: finalBarLinesMs, signatureEvents: finalSignatureEvents, originalTotalMusicalDurationMs };
}

export async function parseFileForAnalysis(
    file: File,
    midiNoteToNameMap: Map<number, string>
): Promise<{
    notes: MidiNotePlaybackItem[];
    originalTotalMusicalDurationMs: number;
    initialTempoBpm: number;
} | null> {
    try {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        let parsedDataNotes: MidiNotePlaybackItem[] = [];
        let totalDuration: number = 0;
        let initialTempo: number = DEFAULT_MUSICXML_TEMPO_BPM;

        if (fileExtension === 'mid' || fileExtension === 'midi' || file.type.includes('midi')) {
            const midiArrayBuffer = await file.arrayBuffer();
            const result = await parseMidiData(midiArrayBuffer, midiNoteToNameMap);
            parsedDataNotes = result.notes;
            totalDuration = result.originalTotalMusicalDurationMs;
            initialTempo = result.initialTempoBpm;
        } else if (fileExtension === 'xml' || fileExtension === 'musicxml' || file.type.includes('xml')) {
            const xmlText = await file.text();
            const result = await parseMusicXmlData(xmlText, midiNoteToNameMap);
            parsedDataNotes = result.notes;
            totalDuration = result.originalTotalMusicalDurationMs;
            initialTempo = result.initialTempoBpm;
        } else if (fileExtension === 'mxl') {
            const zip = new JSZip();
            const arrayBuffer = await file.arrayBuffer();
            const loadedZip = await zip.loadAsync(arrayBuffer);

            const containerFile = loadedZip.file("META-INF/container.xml") ||
                Object.values(loadedZip.files).find(f => !f.dir && f.name.toLowerCase().replace(/\\/g, '/') === 'meta-inf/container.xml');
            let xmlText: string | null = null;

            if (containerFile) {
                const containerXmlText = await containerFile.async("string");
                const parser = new DOMParser();
                const containerDoc = parser.parseFromString(containerXmlText, "application/xml");
                const rootFileEl = containerDoc.getElementsByTagName("rootfile")[0];
                if (rootFileEl) {
                    const fullPath = rootFileEl.getAttribute("full-path");
                    if (fullPath) {
                        const cleanPath = fullPath.replace(/^\.\//, '').replace(/\\/g, '/');
                        const scoreFile = loadedZip.file(cleanPath) ||
                            Object.values(loadedZip.files).find(f => f.name.replace(/\\/g, '/') === cleanPath);
                        if (scoreFile) xmlText = await scoreFile.async("string");
                    }
                }
            }

            if (!xmlText) {
                for (const fileInZip of Object.values(loadedZip.files)) {
                    const zipObject = fileInZip as JSZipObject;
                    const normName = zipObject.name.toLowerCase().replace(/\\/g, '/');
                    if (!zipObject.dir && !normName.startsWith('meta-inf/') && (normName.endsWith('.xml') || normName.endsWith('.musicxml'))) {
                        xmlText = await zipObject.async("string");
                        break;
                    }
                }
            }

            if (xmlText) {
                const result = await parseMusicXmlData(xmlText, midiNoteToNameMap);
                parsedDataNotes = result.notes;
                totalDuration = result.originalTotalMusicalDurationMs;
                initialTempo = result.initialTempoBpm;
            } else {
                throw new Error("Could not find a valid MusicXML file inside the .mxl archive.");
            }
        } else {
            console.warn(`Unsupported file type for analysis: .${fileExtension}`);
            return null;
        }

        return {
            notes: parsedDataNotes,
            originalTotalMusicalDurationMs: totalDuration,
            initialTempoBpm: initialTempo
        };

    } catch (error) {
        console.error("Error parsing file for analysis:", error);
        return null;
    }
}