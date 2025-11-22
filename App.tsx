

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { KeyPosition, PianoKeyDefinition, MidiNotePlaybackItem, ActiveMidiNoteInfo, MIDIInput, MIDIMessageEvent, MIDIAccess, MIDIOutput, TimeSignatureInfo, FileType, ExtendedResult, MidiAccessStatus, MetronomeMode, WaitMode, ViewMode, Screen, GameSettings, NoteLabelType, PracticeHand, ThemeSettings, PerformanceSummary } from './types';
import {
  PIANO_KEYS_CONFIG,
  BLACK_KEY_WIDTH_RATIO, BLACK_KEY_OFFSET_RATIO,
  PROGRESS_BAR_HEIGHT_PX, WHITE_KEY_HEIGHT_PX, KEY_LABEL_AREA_HEIGHT_PX,
  HAND_SPLIT_MIDI_NOTE, NUM_WHITE_KEYS, CHORD_RECOGNITION_WINDOW_MS,
  BASE_PIXELS_PER_MILLISECOND,
  QWERTY_MINI_KEYBOARD_MAPPING, OCTAVE_DOWN_KEYS, OCTAVE_UP_KEYS,
  DEFAULT_QWERTY_OCTAVE_SHIFT, MIN_QWERTY_OCTAVE_SHIFT, MAX_QWERTY_OCTAVE_SHIFT
} from './constants';
import PianoKeyboard from './components/PianoKeyboard';
import TopBar from './components/TopBar';
import ProgressBar from './components/ProgressBar';
import MainMenu from './components/MainMenu';
import SongSelection from './components/SongSelection';
import ModeSelection from './components/ModeSelection';
import Settings from './components/Settings';
import { Midi } from '@tonejs/midi';
import JSZip, { JSZipObject } from 'jszip';
import { assignFingering } from './fingering';
import { analyzeMidi } from './midiAnalysis';
import VexFlowSheetMusicView from './components/VexFlowSheetMusicView';
import BarNavigationControls from './components/BarNavigationControls';
import PerformanceSummaryModal from './components/PerformanceSummaryModal';
import { FallingNotesArea } from './components/FallingNotesArea';
import { getActiveKeySignature, getActiveTimeSignature } from './utils'; // Import getActiveTimeSignature

const INITIAL_PLAYBACK_DELAY_MS = 2000;
const DEFAULT_PPQ = 480; // Common PPQ value
const DEFAULT_TIME_SIGNATURE: TimeSignatureInfo = { numerator: 4, denominator: 4 };
const DEFAULT_MUSICXML_TEMPO_BPM = 120;
const DEFAULT_KEY_SIGNATURE = 'C';

const MUSICXML_STEP_to_NOTE_OFFSET: { [key: string]: number } = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const FIFTHS_TO_KEY: { [key: string]: string } = {
    '7': 'C#', '6': 'F#', '5': 'B', '4': 'E', '3': 'A', '2': 'D', '1': 'G', '0': 'C',
    '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb', '-7': 'Cb'
};

// --- MusicXML Helper Functions ---
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
// --- End MusicXML Helper Functions ---

const generateKeyPositions = (keysConfig: PianoKeyDefinition[], totalWidth: number): Map<string, KeyPosition> => {
  const positions = new Map<string, KeyPosition>();
  if (totalWidth <= 0) return positions;

  const midiToNameMap = new Map(keysConfig.map(k => [k.midiNote, k.name]));

  const whiteKeysFromConfig = keysConfig.filter(key => key.type === 'white');
  const numWhiteKeys = whiteKeysFromConfig.length;
  if (numWhiteKeys === 0) return positions;

  const whiteKeyWidth = totalWidth / numWhiteKeys;
  const blackKeyWidth = whiteKeyWidth * BLACK_KEY_WIDTH_RATIO;

  let currentX = 0;
  whiteKeysFromConfig.forEach(key => {
    positions.set(key.name, {
      name: key.name,
      x: currentX,
      width: whiteKeyWidth,
      type: 'white'
    });
    currentX += whiteKeyWidth;
  });

  keysConfig.forEach(key => {
    if (key.type === 'black') {
      const precedingWhiteKeyMidi = key.midiNote - 1;
      const precedingWhiteKeyName = midiToNameMap.get(precedingWhiteKeyMidi);

      if (precedingWhiteKeyName) {
        const whiteKeyPos = positions.get(precedingWhiteKeyName);
        if (whiteKeyPos) {
          positions.set(key.name, {
            name: key.name,
            x: whiteKeyPos.x + whiteKeyWidth * BLACK_KEY_OFFSET_RATIO,
            width: blackKeyWidth,
            type: 'black'
          });
        }
      }
    }
  });
  return positions;
};


interface MetronomeAudioNode {
  oscillator?: OscillatorNode; // Optional now that we use buffers
  source?: AudioBufferSourceNode; // Added for buffer-based metronome
  gainNode: GainNode;
}

interface TempoEvent {
  timeMs: number; // Absolute time in milliseconds from song start (after initial rest, if any)
  bpm: number;
}

interface ActiveAudioNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

// --- Default Settings Constants ---
const DEFAULT_MASTER_VOLUME = 0.5; // Changed from 0.8 to 0.5 as requested
const DEFAULT_METRONOME_VOLUME = 0.5;
const DEFAULT_VIEW_MODE: ViewMode = 'falling';
const DEFAULT_NOTE_LABEL_TYPE: NoteLabelType = 'none';
const DEFAULT_SHOW_ONLY_MAJOR_RESTS = false;
const DEFAULT_SHOW_ONLY_MAJOR_NOTES = false;
const DEFAULT_SHOW_QWERTY_SHORTCUTS = true;
const DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS = false;
const DEFAULT_PIANO_SCALE = 1.0;
const DEFAULT_PIANO_HORIZONTAL_OFFSET = 0;
const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  rightHandColor: '#A855F7', // purple-500
  leftHandColor: '#3B82F6',  // blue-500
  fallingNotesBackgroundColor: '#000000',
};
// --- End Default Settings Constants ---


const App: React.FC = () => {
  // --- Screen & Flow Management ---
  const [currentScreen, setCurrentScreen] = useState<Screen>('mainMenu');
  const [quitMessageVisible, setQuitMessageVisible] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false); // NEW: State for loading overlay

  // --- UI Interaction State ---
  const [userSustainedKeys, setUserSustainedKeys] = new useState<Set<string>>(new Set());
  const [userActiveKeys, setUserActiveKeys] = useState<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(800);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [contentAreaHeight, setContentAreaHeight] = useState(300);

  // --- Audio State & Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const activeKeyTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeAudioNodesRef = useRef<Map<string, ActiveAudioNode>>(new Map());
  const audioBufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  // NEW: Metronome audio buffers
  const metronomeBuffersRef = useRef<{ strong?: AudioBuffer; weak?: AudioBuffer }>({});
  
  // --- File & Song Data State ---
  const [playbackNotes, setPlaybackNotes] = useState<MidiNotePlaybackItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [currentFileType, setCurrentFileType] = useState<FileType>(FileType.UNKNOWN);
  const fileTypeRef = useRef<FileType>(FileType.UNKNOWN);
  useEffect(() => { fileTypeRef.current = currentFileType; }, [currentFileType]);
  
  // --- Playback State & Refs ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [activePlaybackNotesInfo, setActivePlaybackNotesInfo] = useState<Map<string, ActiveMidiNoteInfo>>(new Map());
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0); // Renamed for clarity
  const currentTimeRef = useRef<number>(0); // This is the actual musical time for logic
  const playbackRequestRef = useRef<number | null>(null);
  const performanceStartTimeRef = useRef<number>(0);
  const pausedMusicalTimeRef = useRef<number>(0);
  const nextNoteIndexRef = useRef<number>(0);
  const scheduledNoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeNoteInstancesRef = useRef<Map<string, MidiNotePlaybackItem>>(new Map());
  // NEW: Ref to track if the user explicitly paused the game.
  const isUserPausedRef = useRef<boolean>(false); 
  
  // --- Wait Mode State & Refs ---
  const [notesCurrentlyWaitingFor, setNotesCurrentlyWaitingFor] = useState<Set<number>>(new Set());
  const notesCurrentlyWaitingForRef = useRef<Set<number>>(new Set()); // Initialized with a Set
  // Synchronize ref to state
  useEffect(() => { notesCurrentlyWaitingForRef.current = notesCurrentlyWaitingFor; }, [notesCurrentlyWaitingFor]);
  const waitingBlockTimeRef = useRef<number | null>(null);
  const presatisfiedNoteIdsRef = useRef<Set<string>>(new Set());
  const WAIT_MODE_TOLERANCE_MS = 1000; // Increased to 1000ms for 'early hit' and 'error detection context' as per user request
  const chordRecognitionTimeoutIdRef = useRef<number | null>(null);
  
  // --- Music Metadata State ---
  const [initialTimeSignature, setInitialTimeSignature] = useState<TimeSignatureInfo>(DEFAULT_TIME_SIGNATURE); // Rename to initial
  const [initialKeySignature, setInitialKeySignature] = useState<string>(DEFAULT_KEY_SIGNATURE); // Rename to initial
  const [currentTempoBpm, setCurrentTempoBpm] = useState<number | null>(null);
  const [tempoEvents, setTempoEvents] = useState<TempoEvent[]>([]);
  const [barLines, setBarLines] = useState<number[]>([]);
  const [signatureEvents, setSignatureEvents] = useState<SignatureEvent[]>([]); // Using imported interface now
  
  // --- Metronome State & Refs ---
  const scheduledMetronomeAudioNodesRef = useRef<MetronomeAudioNode[]>([]);
  const lastMetronomeScheduleTimeRef = useRef<number>(0);
  // FIX: Added state for visual metronome beat
  const [metronomeBeat, setMetronomeBeat] = useState<'strong' | 'weak' | null>(null);
  // NEW: State for metronome audio offset
  const [metronomeOffsetMs, setMetronomeOffsetMs] = useState<number>(-25);
  
  // --- Score Keeping & Analysis ---
  const [hitCount, setHitCount] = useState<number>(0);
  // FIX: Declare hitCountRef using useRef
  const hitCountRef = useRef<number>(0);
  hitCountRef.current = hitCount;
  const [errorCount, setErrorCount] = useState<number>(0);
  // FIX: Declare errorCountRef using useRef
  const errorCountRef = useRef<number>(0);
  errorCountRef.current = errorCount;
  const [totalNoteCountForGame, setTotalNoteCountForGame] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<ExtendedResult | null>(null);
  const hitNoteIdsRef = useRef<Set<string>>(new Set());
  const playerInputTimesRef = useRef<number[]>([]);
  const firstInputRealTimeRef = useRef<number | null>(null);
  const lastInputRealTimeRef = useRef<number | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null); // Use new interface

  // --- MIDI Device State ---
  const [midiInputs, setMidiInputs] = useState<Map<string, MIDIInput>>(new Map());
  const [midiOutputs, setMidiOutputs] = useState<Map<string, MIDIOutput>>(new Map());
  const [selectedMidiInputId, setSelectedMidiInputId] = useState<string | null>(null);
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState<string | null>(null);
  const [midiAccessError, setMidiAccessError] = useState<string | null>(null);
  const activeMidiInputDeviceRef = useRef<MIDIInput | null>(null);
  const midiAccessInstanceRef = useRef<MIDIAccess | null>(null);
  const [midiAccessStatus, setMidiAccessStatus] = useState<MidiAccessStatus>('uninitialized');

  // --- Settings State ---
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [noteSpeedMultiplier, setNoteSpeedMultiplier] = useState<number>(1);
  const [sheetMusicZoom, setSheetMusicZoom] = useState<number>(1);
  const [noteLabelType, setNoteLabelType] = useState<NoteLabelType>(DEFAULT_NOTE_LABEL_TYPE);
  const [metronomeMode, setMetronomeMode] = useState<MetronomeMode>('off');
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME); // Changed to use constant
  const [metronomeVolume, setMetronomeVolume] = useState(DEFAULT_METRONOME_VOLUME); // Changed to use constant
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS); // Changed to use constant
  // FIX: Renamed state variable from showOnlyMajorRusta to showOnlyMajorRests to match prop name in Settings.tsx and VexFlowSheetMusicView.tsx.
  const [showOnlyMajorRests, setShowOnlyMajorRests] = useState<boolean>(DEFAULT_SHOW_ONLY_MAJOR_RESTS); // Changed to use constant
  const [showOnlyMajorNotes, setShowOnlyMajorNotes] = useState<boolean>(DEFAULT_SHOW_ONLY_MAJOR_NOTES); // Changed to use constant

  // NEW: QWERTY Keyboard State
  const [qwertyCurrentOctaveShift, setQwertyCurrentOctaveShift] = useState<number>(DEFAULT_QWERTY_OCTAVE_SHIFT);
  const qwertyActiveKeysRef = useRef<Set<string>>(new Set());
  const noteNameToKeyDefMap = useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  // NEW: Setting for QWERTY shortcuts, default to true
  const [showQwertyShortcuts, setShowQwertyShortcuts] = useState(DEFAULT_SHOW_QWERTY_SHORTCUTS); // Changed to use constant
  // NEW: Setting for hiding bar navigation buttons, default to false
  const [hideBarNavigationButtons, setHideBarNavigationButtons] = useState(DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS); // Changed to use constant

  // NEW: Piano scaling and offset states
  const [pianoScale, setPianoScale] = useState<number>(DEFAULT_PIANO_SCALE); // Changed to use constant
  const [pianoHorizontalOffset, setPianoHorizontalOffset] = useState<number>(DEFAULT_PIANO_HORIZONTAL_OFFSET); // Changed to use constant

  const [renderedLayoutId, setRenderedLayoutId] = useState(0); // NEW: For VexFlow re-render detection

  const prevMusicalTimeRef = useRef<number>(0);

  // --- Derived State & Memos ---
  const waitMode = gameSettings?.waitMode ?? 'off';
  const playbackTempoMultiplier = gameSettings?.playbackTempoMultiplier ?? 1;

  // New state for ModeSelection's live preview of playbackTempoMultiplier
  const [previewPlaybackTempoMultiplier, setPreviewPlaybackTempoMultiplier] = useState<number>(1);

  const notesForGame = useMemo(() => {
    if (!gameSettings || gameSettings.practiceHand === 'both') return playbackNotes;
    return playbackNotes.filter(note => note.hand === gameSettings.practiceHand);
  }, [playbackNotes, gameSettings]);

  const MIN_WHITE_KEY_WIDTH_PX = 23;
  const PIANO_MIN_WIDTH_PX = NUM_WHITE_KEYS * MIN_WHITE_KEY_WIDTH_PX;
  const PIANO_MAX_WIDTH_PX = 2500;

  // Base piano width, clamped by min/max and container size
  const baseCalculatedPianoWidth = useMemo(() => {
    if (containerWidth <= 0) return 0;
    return Math.max(PIANO_MIN_WIDTH_PX, Math.min(PIANO_MAX_WIDTH_PX, containerWidth));
  }, [containerWidth]);

  // Scaled piano width applying the user's zoom factor
  const scaledPianoWidth = useMemo(() => {
    return baseCalculatedPianoWidth * pianoScale;
  }, [baseCalculatedPianoWidth, pianoScale]);

  const keyPositionsMap = useMemo(() => {
      if (scaledPianoWidth <= 0) return new Map();
      return generateKeyPositions(PIANO_KEYS_CONFIG, scaledPianoWidth);
  }, [scaledPianoWidth]);

  const midiNoteToNameMap = useMemo(() => new Map(PIANO_KEYS_CONFIG.map(k => [k.midiNote, k.name])), []);

  // NEW: Map MIDI note to PianoKeyDefinition for QWERTY input handling
  const midiNoteToKeyDefMap = useMemo(() => {
    const map = new Map<number, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key));
    return map;
  }, []);


  const isMetronomeAvailable = useMemo(() => {
    return notesForGame.length > 0 && tempoEvents.length > 0;
  }, [notesForGame.length, tempoEvents.length]);

  const originalTotalMusicalDurationMs = useMemo(() => {
    if (!playbackNotes || playbackNotes.length === 0) return 0;
    const maxTime = playbackNotes.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
    return maxTime;
  }, [playbackNotes]);

  // Dynamically determine the active key signature for falling notes and metronome
  const activeKeySignature = useMemo(() => {
    return getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature);
  }, [musicalCurrentTimeMs, signatureEvents, initialKeySignature]);

  // The analysis result is recalculated when playback speed changes.
  useEffect(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) {
      setAnalysisResult(null);
      return;
    }
    const scaledNotes = playbackNotes.map(note => ({
      ...note,
      timeMs: note.timeMs / playbackTempoMultiplier,
      durationMs: note.durationMs / playbackTempoMultiplier,
    }));
    const effectiveDurationMs = originalTotalMusicalDurationMs / playbackTempoMultiplier;
    setAnalysisResult(analyzeMidi(scaledNotes, effectiveDurationMs));
  }, [playbackNotes, originalTotalMusicalDurationMs, playbackTempoMultiplier]);

  // Memo for analysis result used in ModeSelection preview
  const analysisResultForPreview = useMemo(() => {
    if (!playbackNotes.length || originalTotalMusicalDurationMs === 0) return null;
    const scaledNotes = playbackNotes.map(note => ({
      ...note,
      timeMs: note.timeMs / previewPlaybackTempoMultiplier,
      durationMs: note.durationMs / previewPlaybackTempoMultiplier,
    }));
    const effectiveDurationMs = originalTotalMusicalDurationMs / previewPlaybackTempoMultiplier;
    return analyzeMidi(scaledNotes, effectiveDurationMs);
  }, [playbackNotes, originalTotalMusicalDurationMs, previewPlaybackTempoMultiplier]);

  // Define the callback function to update previewPlaybackTempoMultiplier
  const onPlaybackTempoMultiplierChange = useCallback((multiplier: number) => {
    setPreviewPlaybackTempoMultiplier(multiplier);
  }, []);

  // --- Start File Parsers ---
  const parseMidiData = useCallback(async (arrayBuffer: ArrayBuffer): Promise<{
    notes: MidiNotePlaybackItem[],
    timeSignature: TimeSignatureInfo,
    keySignature: string,
    initialTempoBpm: number,
    tempoEvents: TempoEvent[],
    barLinesMs: number[],
    signatureEvents: SignatureEvent[]
  }> => {
      const midi = new Midi(arrayBuffer);

      // Remove sustain pedal events (CC 64) to ignore pedal effect on note duration.
      midi.tracks.forEach(track => {
        // The key for control changes is a string of the CC number.
        delete track.controlChanges['64'];
      });

      // Time Signature
      // Default to 4/4 if not present at the beginning
      // Sort time signatures first to ensure we pick the one at tick 0 correctly
      const sortedTimeSignatures = [...midi.header.timeSignatures].sort((a, b) => a.ticks - b.ticks);
      
      let initialTimeSignature = DEFAULT_TIME_SIGNATURE;
      if (sortedTimeSignatures.length > 0 && sortedTimeSignatures[0].ticks === 0) {
         initialTimeSignature = { 
            numerator: sortedTimeSignatures[0].timeSignature[0], 
            denominator: sortedTimeSignatures[0].timeSignature[1] 
         };
      }
      
      const keySignature = midi.header.keySignatures[0]?.key ?? DEFAULT_KEY_SIGNATURE;
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

      // Barline Calculation
      const barLinesMs: number[] = [];
      if (midi.durationTicks > 0) {
        const ppq = midi.header.ppq;
        
        // Use sorted time signatures
        const timeSignatures = [...sortedTimeSignatures];
        
        // Ensure we have a starting TS at tick 0
        if (timeSignatures.length === 0 || timeSignatures[0].ticks > 0) {
            timeSignatures.unshift({
                ticks: 0,
                timeSignature: [4, 4],
                measures: 0
            } as any);
        }

        let currentTick = 0;
        let tsIndex = 0;
        
        // Generate barlines
        while (currentTick < midi.durationTicks) {
             // Add barline for current tick
             barLinesMs.push(Math.round(midi.header.ticksToSeconds(currentTick) * 1000) + INITIAL_PLAYBACK_DELAY_MS);
             
             // Check if we need to update active TS
             // Move tsIndex forward if the NEXT TS event has been reached or passed
             while (tsIndex < timeSignatures.length - 1 && timeSignatures[tsIndex + 1].ticks <= currentTick) {
                 tsIndex++;
             }
             
             const activeTs = timeSignatures[tsIndex];
             const num = activeTs.timeSignature[0];
             const den = activeTs.timeSignature[1];
             
             const ticksPerMeasure = ppq * num * (4 / den);
             
             if (ticksPerMeasure <= 0) break; // Avoid infinite loop
             
             // Advance to next bar
             currentTick += ticksPerMeasure;
        }
        // Add final barline at or after end?
        barLinesMs.push(Math.round(midi.header.ticksToSeconds(currentTick) * 1000) + INITIAL_PLAYBACK_DELAY_MS);
      }
      
      // Signature Change Events for VexFlow
      const signatureEvents: SignatureEvent[] = [];
      // Use sorted time signatures for consistency
      sortedTimeSignatures.forEach(ts => {
        if (ts.ticks >= 0) { // Allow tick 0 events
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
  
      const rawNotes: Omit<MidiNotePlaybackItem, 'noteId'>[] = [];
      midi.tracks.forEach((track, trackIndex) => {
          track.notes.forEach(note => {
              const noteName = midiNoteToNameMap.get(note.midi);
              if (noteName) {
                  let hand: 'left' | 'right';
                  // Use track-based assignment for multi-track files, as requested.
                  if (midi.tracks.length > 1) {
                      if (trackIndex === 0) { // Instrument 1
                          hand = 'right'; 
                      } else if (trackIndex === 1) { // Instrument 2
                          hand = 'left';
                      } else {
                          // Fallback for tracks 2, 3, etc.
                          hand = note.midi < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right';
                      }
                  } else {
                      // For single-track files, use the keyboard split.
                      hand = note.midi < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right';
                  }

                  rawNotes.push({
                      midi: note.midi,
                      timeMs: Math.round(note.time * 1000) + INITIAL_PLAYBACK_DELAY_MS,
                      durationMs: Math.round(note.duration * 1000),
                      name: noteName,
                      pitchClass: note.pitch,
                      velocity: note.velocity,
                      hand: hand,
                      originalTrackSourceInfo: `midi_track_${trackIndex}`,
                      ticks: note.ticks,
                      durationTicks: note.durationTicks
                  });
              }
          });
      });
  
      rawNotes.sort((a, b) => a.timeMs - b.timeMs);
      
      let counter = 0;
      const notes: MidiNotePlaybackItem[] = rawNotes.map(n => ({
        ...n,
        noteId: `midi-${n.originalTrackSourceInfo}-${n.ticks}-${counter++}`
      }));
  
      return { notes, timeSignature: initialTimeSignature, keySignature, initialTempoBpm, tempoEvents, barLinesMs, signatureEvents };
  }, [midiNoteToNameMap]);

  const parseMusicXmlData = useCallback(async (xmlString: string): Promise<{
      notes: MidiNotePlaybackItem[],
      timeSignature: TimeSignatureInfo,
      keySignature: string,
      initialTempoBpm: number,
      tempoEvents: TempoEvent[],
      barLinesMs: number[],
      signatureEvents: SignatureEvent[]
  }> => {
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
          const partId = part.getAttribute('id') || `P${partIndex + 1}`;

          // --- Repeat Handling State ---
          let repeatStartTick = 0;
          let repeatStartMs = 0;
          let notesInRepeatSection: Omit<MidiNotePlaybackItem, 'noteId'>[] = [];
          let isInsideRepeat = false;
          let repeatStartIndexInRawNotes = -1;
          // --- End Repeat Handling State ---
  
          const measures = Array.from(part.getElementsByTagName('measure'));
          measures.forEach(measure => {
              if (partIndex === 0) {
                barLineTimeSet.add(cursorMs);
              }
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
                              // FIX: Ensure initial time signature is set only once
                              if (initialTimeSignature === null) {
                                  initialTimeSignature = newTimeSig;
                              }
                              // Always push signature event, even at time 0, to ensure VexFlow picks it up correctly
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
                              repeatStartTick = cursorTicks;
                              repeatStartMs = cursorMs;
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
                                  
                                  // We should advance cursorMs by the repeat duration, 
                                  // but logically the music jumps back. For linear playback, we just append content.
                                  // So cursorMs increases.
                                  // But `cursorTicks`? Ticks in XML are measure-relative mostly or accumulated.
                                  // Just accumulating both is correct for linear playback representation.
                              }
                              isInsideRepeat = false;
                              notesInRepeatSection = [];
                              repeatStartIndexInRawNotes = -1;
                          }
                      }
                  } else if (element.tagName === 'note') {
                      const isRest = element.getElementsByTagName('rest').length > 0;
                      const durationEl = element.getElementsByTagName('duration')[0];
                      const durationTicks = durationEl ? parseInt(durationEl.textContent || '0', 10) : 0;
                      const isChord = element.getElementsByTagName('chord').length > 0;

                      // Delta calculation based on current tempo
                      const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                      
                      if (!isRest) {
                          const pitchEl = element.getElementsByTagName('pitch')[0];
                          if (pitchEl) {
                              const step = pitchEl.getElementsByTagName('step')[0].textContent || 'C';
                              const alter = parseInt(pitchEl.getElementsByTagName('alter')[0]?.textContent || '0', 10);
                              const octave = parseInt(pitchEl.getElementsByTagName('octave')[0].textContent || '4', 10);
  
                              const midiNote = musicXmlPitchToMidiNote(step, alter, octave);
                              const noteName = midiNoteToNameMap.get(midiNote);
  
                              if (noteName) {
                                  // Use accumulated cursorMs
                                  const startTimeMs = cursorMs;
                                  
                                  let hand: 'left' | 'right';
                                  if (parts.length > 1) {
                                      hand = (partIndex === 0) ? 'right' : 'left';
                                  } else {
                                      hand = midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right';
                                  }

                                  const newNote = {
                                      midi: midiNote,
                                      timeMs: startTimeMs,
                                      durationMs: durationMs,
                                      name: noteName,
                                      pitchClass: step + (alter === 1 ? '#' : alter === -1 ? 'b' : ''),
                                      velocity: 0.75,
                                      hand: hand,
                                      originalTrackSourceInfo: `musicxml_part_${partId}`,
                                      ticks: cursorTicks,
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
                          cursorTicks += durationTicks;
                          cursorMs += durationMs;
                      }
                  } else if (element.tagName === 'backup') {
                      const durationTicks = parseInt(element.getElementsByTagName('duration')[0]?.textContent || '0', 10);
                      const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                      cursorTicks -= durationTicks;
                      cursorMs -= durationMs;
                  } else if (element.tagName === 'forward') {
                      const durationTicks = parseInt(element.getElementsByTagName('duration')[0]?.textContent || '0', 10);
                      const durationMs = musicXmlDurationToMs(durationTicks, divisions, currentTempoBpm);
                      cursorTicks += durationTicks;
                      cursorMs += durationMs;
                  }
              });
          });
      });
  
      rawNotes.sort((a, b) => a.timeMs - b.timeMs || (a.ticks ?? 0) - (b.ticks ?? 0));
      
      let counter = 0;
      const notes: MidiNotePlaybackItem[] = rawNotes.map(n => ({
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
      const finalTempoEvents = uniqueTempoEvents.map(t => ({...t, timeMs: t.timeMs + INITIAL_PLAYBACK_DELAY_MS }));
      const finalBarLinesMs = barLinesMs.map(b => b + INITIAL_PLAYBACK_DELAY_MS);
      const finalSignatureEvents = signatureEventsFromXml.map(e => ({...e, timeMs: e.timeMs + INITIAL_PLAYBACK_DELAY_MS}));
      
      // Return the first found time signature, or default if none found.
      return { notes: finalNotes, timeSignature: initialTimeSignature || DEFAULT_TIME_SIGNATURE, keySignature, initialTempoBpm, tempoEvents: finalTempoEvents, barLinesMs: finalBarLinesMs, signatureEvents: finalSignatureEvents };
  }, [midiNoteToNameMap]);
  // --- End File Parsers ---

    const countBeatsSinceStart = useCallback((targetTimeMs: number): number => {
    const initialRest = (fileTypeRef.current === FileType.MIDI || fileTypeRef.current === FileType.MUSICXML) ? INITIAL_PLAYBACK_DELAY_MS : 0;
    if (targetTimeMs < initialRest || !tempoEvents || tempoEvents.length === 0) return 0;

    let totalBeats = 0;
    
    // Ensure relevantTempoEvents includes initial tempo at `initialRest` if it's not the first one
    const relevantTempoEvents = [{ timeMs: initialRest, bpm: tempoEvents[0]?.bpm || 120 }, ...tempoEvents.filter(t => t.timeMs > initialRest)];

    for (let i = 0; i < relevantTempoEvents.length; i++) {
        const event = relevantTempoEvents[i];
        // Scale the BPM by the playbackTempoMultiplier
        const adjustedBpm = event.bpm * playbackTempoMultiplier;

        const nextEventTimeMs = (i + 1 < relevantTempoEvents.length) ? relevantTempoEvents[i+1].timeMs : targetTimeMs;
        const segmentEndTimeMs = Math.min(nextEventTimeMs, targetTimeMs);
        
        const durationInSegmentMs = segmentEndTimeMs - event.timeMs;
        if (durationInSegmentMs > 0 && adjustedBpm > 0) {
            const beatsInSegment = (durationInSegmentMs / 60000) * adjustedBpm;
            totalBeats += beatsInSegment;
        }

        if (segmentEndTimeMs === targetTimeMs) break;
    }

    return totalBeats;
  }, [tempoEvents, playbackTempoMultiplier]);

  const getTimeOfBeat = useCallback((targetBeat: number): number => {
      const initialRest = (fileTypeRef.current === FileType.MIDI || fileTypeRef.current === FileType.MUSICXML) ? INITIAL_PLAYBACK_DELAY_MS : 0;
      if (targetBeat < 0 || !tempoEvents || tempoEvents.length === 0) return -1;

      let totalBeats = 0;
      
      const relevantTempoEvents = [{ timeMs: initialRest, bpm: tempoEvents[0]?.bpm || 120 }, ...tempoEvents.filter(t => t.timeMs > initialRest)];

      for (let i = 0; i < relevantTempoEvents.length; i++) {
          const event = relevantTempoEvents[i];
          // Scale the BPM by the playbackTempoMultiplier
          const adjustedBpm = event.bpm * playbackTempoMultiplier;

          const nextEventTimeMs = (i + 1 < relevantTempoEvents.length) ? relevantTempoEvents[i + 1].timeMs : Infinity;
          
          if (adjustedBpm > 0) {
              const beatsInSegment = ((nextEventTimeMs - event.timeMs) / 60000) * adjustedBpm;

              if (totalBeats + beatsInSegment >= targetBeat) {
                  const beatsNeeded = targetBeat - totalBeats;
                  const timeNeededMs = (beatsNeeded / adjustedBpm) * 60000;
                  return event.timeMs + timeNeededMs;
              }
              totalBeats += beatsInSegment;
          }
           if (nextEventTimeMs === Infinity) { // If it's the last segment
              const beatsNeeded = targetBeat - totalBeats;
              const timeNeededMs = (beatsNeeded / adjustedBpm) * 60000;
              return event.timeMs + timeNeededMs;
           }
      }
      return -1; // Should not be reached if targetBeat is reasonable
  }, [tempoEvents, playbackTempoMultiplier]);

  useEffect(() => {
    const contentEl = contentAreaRef.current;
    if (!contentEl) return;

    const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            const newWidth = entries[0].contentRect.width;
            if (newWidth > 0) {
                // Wrap in rAF to prevent ResizeObserver loop limit exceeded error
                requestAnimationFrame(() => {
                    setContainerWidth(newWidth);
                });
            }
        }
    });
    resizeObserver.observe(contentEl);
    
    if (contentEl.clientWidth > 0) {
        setContainerWidth(contentEl.clientWidth);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const calculateHeights = () => {
      // Wrap in rAF to prevent ResizeObserver loop limit exceeded error
      requestAnimationFrame(() => {
          if (currentScreen !== 'inGame') return; 
          const contentAreaDiv = contentAreaRef.current;
          if (!contentAreaDiv) {
            setContentAreaHeight(300); 
            return;
          }
          const totalAvailableContentHeight = contentAreaDiv.clientHeight;

          // Heights of the fixed elements, potentially scaled
          const progressBarRequiredHeight = notesForGame.length > 0 ? PROGRESS_BAR_HEIGHT_PX : 0;
          const pianoKeyboardRequiredHeight = WHITE_KEY_HEIGHT_PX + KEY_LABEL_AREA_HEIGHT_PX;

          // The remaining height is for the dynamic view (FallingNotesArea or VexFlowSheetMusicView)
          const actualHeightForDynamicView = Math.max(0, totalAvailableContentHeight - progressBarRequiredHeight - pianoKeyboardRequiredHeight);
          
          setContentAreaHeight(actualHeightForDynamicView);
      });
    };

    calculateHeights(); 

    window.addEventListener('resize', calculateHeights);
    const topBarObserver = new ResizeObserver(calculateHeights);
    const topBarElementToObserve = document.querySelector('.flex-shrink-0.bg-blue-600');
    if (topBarElementToObserve) {
      topBarObserver.observe(topBarElementToObserve);
    }
    const contentAreaObserver = new ResizeObserver(calculateHeights);
    if (contentAreaRef.current) {
        contentAreaObserver.observe(contentAreaRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateHeights);
      if (topBarElementToObserve) {
        topBarObserver.unobserve(topBarElementToObserve);
      }
      if (contentAreaRef.current) {
        contentAreaObserver.unobserve(contentAreaRef.current);
      }
    };
  }, [notesForGame.length, currentScreen]); // Removed scaledPianoWidth as direct dependency; it affects content, not total available space for height partitioning

  // FIX: Directly assign the AudioContext constructor to a variable.
  // This helps TypeScript correctly infer it as a constructable type.
  const initializeAudioContext = useCallback(() => {
    let context = audioContextRef.current;
    if (!context) {
      try {
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;

        if (!AudioContextConstructor) {
          console.error("AudioContext is not supported by this browser.");
          return false;
        }
        // FIX: Explicitly assert AudioContextConstructor as a constructable type to satisfy strict type checking.
        context = new (AudioContextConstructor as { new (): AudioContext })();
        audioContextRef.current = context;
        masterGainRef.current = context.createGain();
        masterGainRef.current.connect(context.destination);
        metronomeGainRef.current = context.createGain();
        metronomeGainRef.current.connect(context.destination);
      } catch (e) { console.error("Failed to create AudioContext:", e); return false; }
    }
    if (context.state === 'suspended') {
      context.resume().catch(e => console.error("Error resuming AudioContext:", e));
    }
    return context.state === 'running';
  }, []);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    if (metronomeGainRef.current) metronomeGainRef.current.gain.value = metronomeVolume;
  }, [metronomeVolume]);

  const getAudioBuffer = useCallback(async (midiNote: number): Promise<AudioBuffer | null> => {
    if (audioBufferCacheRef.current.has(midiNote)) {
      return audioBufferCacheRef.current.get(midiNote)!;
    }
    if (!audioContextRef.current) return null;

    const noteName = midiNoteToNameMap.get(midiNote);
    if (!noteName) return null;

    // Changed URL to point to a local directory
    const url = `/sounds/piano/${noteName}.mp3`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferCacheRef.current.set(midiNote, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load or decode audio for note ${noteName}:`, error);
      return null;
    }
  }, [initializeAudioContext, midiNoteToNameMap]);

  // NEW: Function to load a generic audio file
  const loadGenericAudioBuffer = useCallback(async (path: string, key: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load or decode audio from ${path}:`, error);
      return null;
    }
  }, [initializeAudioContext]);

  const preloadSamplesForSong = useCallback(async (notes: MidiNotePlaybackItem[]) => {
    // FIX: Separated the function call from the conditional check to potentially resolve a linter false positive.
    const audioContextReady = initializeAudioContext();
    if (notes.length === 0 || !audioContextReady) {
      return;
    }
    setIsPreloading(true);
    const uniqueMidiNotes = [...new Set(notes.map(note => note.midi))];
    const promises = uniqueMidiNotes.map(midiNote => getAudioBuffer(midiNote));

    // NEW: Preload metronome sounds here
    const metronomeStrongPromise = loadGenericAudioBuffer('/sounds/metronome/strong_beat.mp3', 'strong');
    const metronomeWeakPromise = loadGenericAudioBuffer('/sounds/metronome/weak_beat.mp3', 'weak');
    
    promises.push(metronomeStrongPromise, metronomeWeakPromise);

    try {
      const results = await Promise.all(promises);
      // NEW: Assign metronome buffers
      metronomeBuffersRef.current.strong = results[results.length - 2] as AudioBuffer | undefined;
      metronomeBuffersRef.current.weak = results[results.length - 1] as AudioBuffer | undefined;
      // Remove metronome results from the main array so it doesn't interfere with piano notes
      results.pop(); 
      results.pop();

    } catch (error) {
      console.error("An error occurred during sample preloading:", error);
    } finally {
      setIsPreloading(false);
    }
  }, [initializeAudioContext, getAudioBuffer, loadGenericAudioBuffer]);

  const playSound = useCallback((midiNote: number, musicalDurationMs: number, velocity: number = 0.75) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    const realDurationMs = musicalDurationMs / playbackTempoMultiplier;

    if (selectedOutput) {
        const noteOnMessage = [0x90, midiNote, Math.round(velocity * 127)];
        const noteOffMessage = [0x80, midiNote, 0];
        selectedOutput.send(noteOnMessage);
        setTimeout(() => { selectedOutput.send(noteOffMessage); }, realDurationMs);
        return;
    }

    if (!initializeAudioContext() || !audioContextRef.current || !masterGainRef.current) return;
    const audioCtx = audioContextRef.current;
    const audioBuffer = audioBufferCacheRef.current.get(midiNote);

    if (!audioBuffer) {
      getAudioBuffer(midiNote).then(buffer => {
        if (buffer && audioContextRef.current && masterGainRef.current) {
           const fallbackSource = audioContextRef.current.createBufferSource();
           fallbackSource.buffer = buffer;
           const fallbackGain = audioContextRef.current.createGain();
           fallbackSource.connect(fallbackGain);
           fallbackGain.connect(masterGainRef.current);
           fallbackGain.gain.setValueAtTime(velocity * 2.8, audioContextRef.current.currentTime);
           fallbackSource.start();
        }
      });
      return;
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(velocity * 2.8, now);
    source.connect(gainNode);
    gainNode.connect(masterGainRef.current);
    source.start(now);
    const releaseTimeSec = 0.5;
    const noteEndTimeSec = now + (realDurationMs / 1000);
    gainNode.gain.setValueAtTime(velocity * 2.8, noteEndTimeSec);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTimeSec + releaseTimeSec);
    source.stop(noteEndTimeSec + releaseTimeSec + 0.1);
  }, [initializeAudioContext, getAudioBuffer, playbackTempoMultiplier, selectedMidiOutputId, midiOutputs]);

  const startSustainedSound = useCallback((keyName: string, midiNote: number, velocity: number = 0.75) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    if (selectedOutput) {
        selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)]);
        return;
    }

    if (!initializeAudioContext() || !audioContextRef.current || !masterGainRef.current) return;
    if (activeAudioNodesRef.current.has(keyName)) return;
    const audioCtx = audioContextRef.current;

    const playBufferedNote = (buffer: AudioBuffer) => {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(velocity * 2.8, audioCtx.currentTime);
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current!);
      source.start(0);
      activeAudioNodesRef.current.set(keyName, { source, gainNode });
    };

    const cachedBuffer = audioBufferCacheRef.current.get(midiNote);
    if (cachedBuffer) {
      playBufferedNote(cachedBuffer);
    } else {
      getAudioBuffer(midiNote).then(loadedBuffer => {
        if (loadedBuffer) playBufferedNote(loadedBuffer);
      });
    }
  }, [initializeAudioContext, getAudioBuffer, selectedMidiOutputId, midiOutputs]);

  const stopSustainedSound = useCallback((keyName: string, midiNote: number) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    if (selectedOutput) {
        selectedOutput.send([0x80, midiNote, 0]);
        return;
    }

    if (!audioContextRef.current || !activeAudioNodesRef.current.has(keyName)) return;
    const audioCtx = audioContextRef.current;
    const audioNode = activeAudioNodesRef.current.get(keyName);

    if (audioNode) {
      const { source, gainNode } = audioNode;
      const now = audioCtx.currentTime;
      const releaseTime = 0.5; // seconds
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now); 
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
      source.stop(now + releaseTime + 0.1);
    }
    activeAudioNodesRef.current.delete(keyName);
  }, [selectedMidiOutputId, midiOutputs]);

  const playMetronomeSound = useCallback((isStrongBeat: boolean, scheduledPlayTime: number): MetronomeAudioNode | null => {
    if (!audioContextRef.current || audioContextRef.current.state !== 'running' || !metronomeGainRef.current) {
      initializeAudioContext();
      if (!audioContextRef.current || audioContextRef.current.state !== 'running' || !metronomeGainRef.current) {
        return null;
      }
    }
    const audioCtx = audioContextRef.current;
    const buffer = isStrongBeat ? metronomeBuffersRef.current.strong : metronomeBuffersRef.current.weak;

    if (!buffer) {
      console.warn('Metronome audio buffer not loaded.');
      // Fallback to sine wave if buffers are not available
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isStrongBeat ? 880.0 : 440.0, scheduledPlayTime);
      gainNode.gain.setValueAtTime(0, scheduledPlayTime);
      gainNode.gain.linearRampToValueAtTime(0.5, scheduledPlayTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduledPlayTime + 0.1);

      osc.connect(gainNode);
      gainNode.connect(metronomeGainRef.current);

      osc.start(scheduledPlayTime);
      osc.stop(scheduledPlayTime + 0.1);
      
      return { oscillator: osc, gainNode };
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();

    gainNode.gain.setValueAtTime(0, scheduledPlayTime);
    gainNode.gain.linearRampToValueAtTime(1.0, scheduledPlayTime + 0.01); // Full volume quickly
    gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduledPlayTime + buffer.duration * 0.8); // Fade out

    source.connect(gainNode);
    gainNode.connect(metronomeGainRef.current);

    source.start(scheduledPlayTime);
    source.stop(scheduledPlayTime + buffer.duration); // Stop after buffer duration
    
    return { source: source, gainNode: gainNode };
  }, [initializeAudioContext, metronomeBuffersRef]);

  const clearScheduledMetronomeSounds = useCallback(() => {
    if (audioContextRef.current && scheduledMetronomeAudioNodesRef.current.length > 0) {
      const now = audioContextRef.current.currentTime;
      scheduledMetronomeAudioNodesRef.current.forEach(nodes => {
        try {
          nodes.gainNode.gain.cancelScheduledValues(now);
          nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now); 
          nodes.gainNode.gain.linearRampToValueAtTime(0.00001, now + 0.02);
          if (nodes.oscillator) nodes.oscillator.stop(now + 0.02);
          if (nodes.source) nodes.source.stop(now + 0.02); // Stop buffer source as well
        } catch (e) { /* Ignore errors */ }
      });
    }
    scheduledMetronomeAudioNodesRef.current = [];
  }, []);
  

  const scheduleMetronomeSounds = useCallback((songTimeAtSchedulingStartMs: number) => {
    clearScheduledMetronomeSounds();
    // The metronome now only supports 'bar' mode, as requested.
    if (metronomeMode !== 'bar' || !audioContextRef.current || audioContextRef.current.state !== 'running' || originalTotalMusicalDurationMs <= 0 || !barLines || barLines.length === 0) {
      return;
    }

    const audioCtx = audioContextRef.current;
    const audioContextTimeAtSchedulingStart = audioCtx.currentTime;
    const SCHEDULING_WINDOW_MUSICAL_MS = 4000;
    const endSchedulingMusicalTimeMs = songTimeAtSchedulingStartMs + SCHEDULING_WINDOW_MUSICAL_MS;

    const upcomingBarLines = barLines.filter(
      barTimeMs => barTimeMs >= songTimeAtSchedulingStartMs && barTimeMs < endSchedulingMusicalTimeMs
    );

    upcomingBarLines.forEach(barTimeMs => {
      const musicalDelayFromSchedulingStartMs = barTimeMs - songTimeAtSchedulingStartMs;
      const realDelayFromSchedulingStartMs = musicalDelayFromSchedulingStartMs / playbackTempoMultiplier;
      const targetAudioContextTimeForBeat = audioContextTimeAtSchedulingStart + (realDelayFromSchedulingStartMs / 1000);
      const adjustedTargetAudioContextTimeForBeat = targetAudioContextTimeForBeat + (metronomeOffsetMs / 1000);
      
      if (adjustedTargetAudioContextTimeForBeat >= audioCtx.currentTime - 0.05) {
        const audioNodes = playMetronomeSound(true, adjustedTargetAudioContextTimeForBeat); // Bar lines are always strong beats
        if (audioNodes) scheduledMetronomeAudioNodesRef.current.push(audioNodes);
      }
    });
  }, [ metronomeMode, barLines, originalTotalMusicalDurationMs, playMetronomeSound, clearScheduledMetronomeSounds, playbackTempoMultiplier, metronomeOffsetMs ]);

  const clearScheduledNotes = useCallback(() => {
    scheduledNoteTimeoutsRef.current.forEach(clearTimeout);
    scheduledNoteTimeoutsRef.current.clear();
    activeNoteInstancesRef.current.clear();
    setActivePlaybackNotesInfo(new Map());
  }, []);

  const resumePlaybackFromWait = useCallback(() => {
    const completedBlockTimeMusical = waitingBlockTimeRef.current;
    if (completedBlockTimeMusical === null) return;
    
    pausedMusicalTimeRef.current = completedBlockTimeMusical;
    setMusicalCurrentTimeMs(completedBlockTimeMusical); // Update musical state

    let newIndex = 0;
    while (newIndex < notesForGame.length && notesForGame[newIndex].timeMs <= completedBlockTimeMusical) { newIndex++; }
    nextNoteIndexRef.current = newIndex;
    performanceStartTimeRef.current = performance.now();
    waitingBlockTimeRef.current = null;
    notesCurrentlyWaitingForRef.current = new Set();
    setNotesCurrentlyWaitingFor(new Set()); // Update state instead of ref.clear()
    setActivePlaybackNotesInfo(prev => {
        const newMap = new Map(prev);
        const keysToDelete: string[] = [];
        newMap.forEach((value: ActiveMidiNoteInfo, key: string) => { if (value.status === 'waiting') { keysToDelete.push(key); } });
        if (keysToDelete.length > 0) {
            keysToDelete.forEach(key => newMap.delete(key));
            return newMap;
        }
        return prev;
    });
    if (metronomeMode !== 'off') {
        scheduleMetronomeSounds(pausedMusicalTimeRef.current);
        lastMetronomeScheduleTimeRef.current = pausedMusicalTimeRef.current;
    }
}, [notesForGame, metronomeMode, scheduleMetronomeSounds, setNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo, setMusicalCurrentTimeMs]);


  const calculateAndSetPerformanceSummary = useCallback((
    actualPlayedRealDurationMs: number, 
    isAutoPlay: boolean,
    currentHitCountRefValue: number,
    currentErrorCountRefValue: number
  ) => {
    const midiPerformanceScore = analysisResult?.performanceScore || 0;
    const totalNotes = notesForGame.length;
    let effectiveHitNotes = currentHitCountRefValue;
    let effectiveErrorNotes = currentErrorCountRefValue;

    if (isAutoPlay) {
      effectiveHitNotes = totalNotes;
      effectiveErrorNotes = 0;
      actualPlayedRealDurationMs = originalTotalMusicalDurationMs; 
    }

    if (effectiveErrorNotes > effectiveHitNotes) effectiveErrorNotes = effectiveHitNotes;
    if (effectiveHitNotes > totalNotes) effectiveHitNotes = totalNotes;

    const accuracy = totalNotes > 0
      ? (Math.max(0, effectiveHitNotes - effectiveErrorNotes) / totalNotes) * 100
      : 0;

    const idealDuration = originalTotalMusicalDurationMs;
    let speed = 0;
    if (actualPlayedRealDurationMs > 0 && idealDuration > 0) {
        speed = (idealDuration / actualPlayedRealDurationMs) * 100;
        if (speed > 100) speed = 100;
    }
    
    const gameplayPS = (accuracy * 0.5) + (speed * 0.5)

    const exponent = 10;
    let finalScore = midiPerformanceScore * Math.pow(accuracy / 100, exponent);
    finalScore = Math.max(0, Math.min(midiPerformanceScore, finalScore));
    
    let rank = 'D';
    if (gameplayPS >= 98) rank = 'S';
    else if (gameplayPS >= 90) rank = 'A';
    else if (gameplayPS >= 80) rank = 'B';
    else if (gameplayPS >= 70) rank = 'C';

    setPerformanceSummary({
      accuracy: parseFloat(accuracy.toFixed(2)),
      speed: parseFloat(speed.toFixed(2)),
      gameplayPercentage: parseFloat(gameplayPS.toFixed(2)),
      baseMidiScore: parseFloat(midiPerformanceScore.toFixed(0)), 
      finalScore: parseFloat(finalScore.toFixed(2)),
      rank,
      hitCount: currentHitCountRefValue, // NEW
      errorCount: currentErrorCountRefValue, // NEW
      totalNoteCount: totalNotes, // NEW
    });
  }, [analysisResult, notesForGame.length, originalTotalMusicalDurationMs, setPerformanceSummary]);


  const handleStopPlayback = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    isUserPausedRef.current = false; // Reset user pause state on stop
    if (playbackRequestRef.current) {
      cancelAnimationFrame(playbackRequestRef.current);
      playbackRequestRef.current = null;
    }
    setMusicalCurrentTimeMs(0); // Reset musical time
    currentTimeRef.current = 0;
    pausedMusicalTimeRef.current = 0;
    nextNoteIndexRef.current = 0;
    lastMetronomeScheduleTimeRef.current = 0;
    clearScheduledNotes();
    clearScheduledMetronomeSounds();
    notesCurrentlyWaitingForRef.current = new Set();
    setNotesCurrentlyWaitingFor(new Set()); // Update state instead of ref.clear()
    waitingBlockTimeRef.current = null;
    presatisfiedNoteIdsRef.current = new Set();
    setActivePlaybackNotesInfo(new Map());

    if (chordRecognitionTimeoutIdRef.current) {
        clearTimeout(chordRecognitionTimeoutIdRef.current);
        chordRecognitionTimeoutIdRef.current = null;
    }
    
    hitCountRef.current = 0;
    errorCountRef.current = 0;
    hitNoteIdsRef.current.clear();
    setHitCount(0);
    setErrorCount(0);
    
    playerInputTimesRef.current = [];
    firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null;
    setPerformanceSummary(null);
    setIsLoadingContent(false); // Ensure loading is off on stop
    setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, setNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo, setHitCount, setErrorCount, setMusicalCurrentTimeMs]);

  const recordPlayerInputTime = useCallback((realTime: number, musicalTime: number) => {
    playerInputTimesRef.current.push(realTime);
    if (firstInputRealTimeRef.current === null) {
      firstInputRealTimeRef.current = realTime;
    }
    lastInputRealTimeRef.current = realTime;
  }, []);

  const satisfyUpcomingNote = useCallback((noteDef: MidiNotePlaybackItem) => {
    presatisfiedNoteIdsRef.current.add(noteDef.noteId);
    
    setActivePlaybackNotesInfo(prev => {
        const newMap = new Map(prev);
        newMap.set(noteDef.noteId, {
            noteId: noteDef.noteId,
            name: noteDef.name,
            timeMs: noteDef.timeMs,
            hand: noteDef.hand,
            midi: noteDef.midi,
            pitchClass: noteDef.pitchClass,
            status: 'user_played',
            finger: noteDef.finger
        });
        return newMap;
    });

    const nowMusical = currentTimeRef.current;
    const musicalTimeUntilNoteEnd = (noteDef.timeMs + noteDef.durationMs) - nowMusical;
    const realTimeUntilNoteEnd = musicalTimeUntilNoteEnd / playbackTempoMultiplier;
    
    const clearHighlightTimeoutId = window.setTimeout(() => {
        setActivePlaybackNotesInfo(prev => {
            const newMap = new Map(prev);
            newMap.delete(noteDef.noteId);
            return newMap;
        });
        scheduledNoteTimeoutsRef.current.delete(noteDef.noteId);
    }, realTimeUntilNoteEnd > 0 ? realTimeUntilNoteEnd : 0);
    scheduledNoteTimeoutsRef.current.set(noteDef.noteId, clearHighlightTimeoutId);
  }, [playbackTempoMultiplier]);

  const visuallySatisfyNote = useCallback((noteDefForWait: MidiNotePlaybackItem) => {
    const noteId = noteDefForWait.noteId;
    activeNoteInstancesRef.current.set(noteId, noteDefForWait);

    setActivePlaybackNotesInfo(prev => {
        const newMap = new Map(prev);
        newMap.set(noteId, {
            noteId: noteId,
            name: noteDefForWait.name,
            timeMs: noteDefForWait.timeMs,
            hand: noteDefForWait.hand, midi: noteDefForWait.midi, pitchClass: noteDefForWait.pitchClass, status: 'user_played',
            finger: noteDefForWait.finger
        });
        return newMap;
    });

    if (scheduledNoteTimeoutsRef.current.has(noteId)) {
        clearTimeout(scheduledNoteTimeoutsRef.current.get(noteId)!);
    }

    const realDurationMs = noteDefForWait.durationMs / playbackTempoMultiplier;
    const clearHighlightTimeoutId = window.setTimeout(() => {
        activeNoteInstancesRef.current.delete(noteId);
        scheduledNoteTimeoutsRef.current.delete(noteId);
        setActivePlaybackNotesInfo(prev => {
            const newMap = new Map(prev);
            newMap.delete(noteId);
            return newMap;
        });
    }, realDurationMs);
    scheduledNoteTimeoutsRef.current.set(noteId, clearHighlightTimeoutId);
  }, [playbackTempoMultiplier]);


  const playbackLoop = useCallback(() => {
    if (!isPlayingRef.current || notesForGame.length === 0) {
      if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
      playbackRequestRef.current = null;
      return;
    }

    const currentRealTime = performance.now();
    const realTimeElapsedSinceStartOrPause = currentRealTime - performanceStartTimeRef.current;
    const conceptualMusicalTime = pausedMusicalTimeRef.current + (realTimeElapsedSinceStartOrPause * playbackTempoMultiplier);

    let actualMusicalTimeForGameLogic: number;

    const lastMusicalTime = prevMusicalTimeRef.current; // for metronome visual beat detection

    // Determine if game is in a musical 'wait' state
    const isInWaitState = waitMode !== 'off' && notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;

    if (isInWaitState) { 
      // Musical game logic time is frozen at the waiting point
      actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!; // Use non-null assertion as condition above checks for null
      // musicalCurrentTimeMs state remains frozen as it's not explicitly updated in this branch.
      // This ensures FallingNotesArea and VexFlowSheetMusicView pause visually.
    } else {
      // Musical game logic time advances normally
      actualMusicalTimeForGameLogic = conceptualMusicalTime;
      // Update musical time state for FallingNotesArea and VexFlowSheetMusicView
      setMusicalCurrentTimeMs(conceptualMusicalTime);
    }
    
    // Always update the musical time ref for other game logic, metronome, etc.
    currentTimeRef.current = actualMusicalTimeForGameLogic;
    prevMusicalTimeRef.current = actualMusicalTimeForGameLogic; // update for next frame

    // Metronome Logic
    if (isPlayingRef.current && metronomeMode !== 'off') {
        if (isInWaitState) {
            // Sounds are now cleared immediately upon entering wait mode.
            // This ensures the visual beat is also cleared.
            setMetronomeBeat(null);
        } else {
            // If not waiting, continue scheduling metronome sounds normally
            const SCHEDULING_WINDOW_MUSICAL_MS = 4000;
            if (currentTimeRef.current > lastMetronomeScheduleTimeRef.current + SCHEDULING_WINDOW_MUSICAL_MS / 2) {
                scheduleMetronomeSounds(currentTimeRef.current);
                lastMetronomeScheduleTimeRef.current = currentTimeRef.current;
            }

            // Visual metronome logic (now only for 'bar' mode)
            if (metronomeMode === 'bar' && barLines && barLines.length > 0) {
                const barCrossed = barLines.find(barTimeMs => barTimeMs > lastMusicalTime && barTimeMs <= actualMusicalTimeForGameLogic);
                if (barCrossed) {
                    setMetronomeBeat('strong');
                }
            }
        }
    } else {
        // If not playing or metronome is off, ensure metronome is off visually
        setMetronomeBeat(null);
    }


    let currentProcessingIdx = nextNoteIndexRef.current;
    const notesToSetWaitingThisFrame: MidiNotePlaybackItem[] = [];

    while (currentProcessingIdx < notesForGame.length) {
      const note = notesForGame[currentProcessingIdx];
      
      if (currentTimeRef.current >= note.timeMs) {
        if (presatisfiedNoteIdsRef.current.has(note.noteId)) {
            presatisfiedNoteIdsRef.current.delete(note.noteId);
            currentProcessingIdx++;
            continue;
        }

        if (waitMode === 'off') {
          const noteId = note.noteId;
          if (!activeNoteInstancesRef.current.has(noteId)) {
            playSound(note.midi, note.durationMs, note.velocity);
            activeNoteInstancesRef.current.set(noteId, note);
            
            if (!hitNoteIdsRef.current.has(noteId)) {
                hitNoteIdsRef.current.add(noteId);
                hitCountRef.current++;
                setHitCount(hitCountRef.current);
            }

            setActivePlaybackNotesInfo(prev => new Map(prev).set(noteId, {
              noteId: noteId,
              name: note.name,
              timeMs: note.timeMs,
              hand: note.hand, midi: note.midi, pitchClass: note.pitchClass, status: 'playing',
              finger: note.finger
            }));

            const realDurationMs = note.durationMs / playbackTempoMultiplier;
            const timeoutId = window.setTimeout(() => {
              activeNoteInstancesRef.current.delete(noteId);
              scheduledNoteTimeoutsRef.current.delete(noteId);
              setActivePlaybackNotesInfo(prev => {
                const newMap = new Map(prev);
                newMap.delete(noteId);
                return newMap;
              });
            }, realDurationMs);
            scheduledNoteTimeoutsRef.current.set(noteId, timeoutId);
          }
        } else {
          notesToSetWaitingThisFrame.push(note);
        }
        currentProcessingIdx++;
      } else {
        break;
      }
    }

    if (waitMode !== 'off' && notesToSetWaitingThisFrame.length > 0) {
      const allWaitingNotesAreTheSameTime = notesToSetWaitingThisFrame.every(n => n.timeMs === notesToSetWaitingThisFrame[0].timeMs);
      if (allWaitingNotesAreTheSameTime) {
        // Immediately stop metronome when entering wait state to prevent sounds during pause.
        if (metronomeMode !== 'off') {
          clearScheduledMetronomeSounds();
          lastMetronomeScheduleTimeRef.current = 0;
          setMetronomeBeat(null);
        }

        waitingBlockTimeRef.current = notesToSetWaitingThisFrame[0].timeMs;
        const waitingMidiNotes = new Set(notesToSetWaitingThisFrame.map(n => n.midi));
        notesCurrentlyWaitingForRef.current = waitingMidiNotes;
        setNotesCurrentlyWaitingFor(waitingMidiNotes); // Update state
        
        setActivePlaybackNotesInfo(prev => {
          const newMap = new Map(prev);
          notesToSetWaitingThisFrame.forEach(n => {
            const waitingNoteId = n.noteId;
            newMap.set(waitingNoteId, {
              noteId: waitingNoteId,
              name: n.name,
              timeMs: n.timeMs,
              hand: n.hand, midi: n.midi, pitchClass: n.pitchClass, status: 'waiting',
              finger: n.finger
            });
          });
          return newMap;
        });
      }
    }

    nextNoteIndexRef.current = currentProcessingIdx;
    
    if (nextNoteIndexRef.current >= notesForGame.length && notesCurrentlyWaitingForRef.current.size === 0 && originalTotalMusicalDurationMs > 0) { // Use direct access
        let actualDurationForSpeedCalculation = 0;
        let isAutoPlay = false;

        if (waitMode !== 'off') {
            if (playerInputTimesRef.current.length > 1 && firstInputRealTimeRef.current !== null && lastInputRealTimeRef.current !== null) {
                actualDurationForSpeedCalculation = lastInputRealTimeRef.current - firstInputRealTimeRef.current;
            } else {
                actualDurationForSpeedCalculation = 0;
            }
        } else {
            isAutoPlay = true;
            actualDurationForSpeedCalculation = originalTotalMusicalDurationMs; 
        }
        
        calculateAndSetPerformanceSummary(
          actualDurationForSpeedCalculation, 
          isAutoPlay,
          hitCountRef.current,
          errorCountRef.current
        );
        setHitCount(hitCountRef.current);
        setErrorCount(errorCountRef.current);
        
        setIsPlaying(false);
        isPlayingRef.current = false;
        isUserPausedRef.current = false; // Reset user pause state on completion
        if (playbackRequestRef.current) {
          cancelAnimationFrame(playbackRequestRef.current);
          playbackRequestRef.current = null;
        }
        clearScheduledNotes();
        clearScheduledMetronomeSounds();
        notesCurrentlyWaitingForRef.current = new Set();
        setNotesCurrentlyWaitingFor(new Set()); // Update state
        waitingBlockTimeRef.current = null;
        presatisfiedNoteIdsRef.current = new Set();
        setActivePlaybackNotesInfo(new Map());

        if (chordRecognitionTimeoutIdRef.current) {
            clearTimeout(chordRecognitionTimeoutIdRef.current);
            chordRecognitionTimeoutIdRef.current = null;
        }

        // Ensure both musical and visual times end at the total duration
        setMusicalCurrentTimeMs(originalTotalMusicalDurationMs);
        setMetronomeBeat(null);

        return;
    }
    
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [
    isPlayingRef, notesForGame, playbackTempoMultiplier,
    performanceStartTimeRef, pausedMusicalTimeRef, originalTotalMusicalDurationMs,
    waitMode, notesCurrentlyWaitingForRef, waitingBlockTimeRef,
    setMusicalCurrentTimeMs, currentTimeRef, nextNoteIndexRef, playSound, metronomeMode,
    scheduleMetronomeSounds, calculateAndSetPerformanceSummary, clearScheduledNotes,
    clearScheduledMetronomeSounds, setNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo,
    setHitCount, setErrorCount, resumePlaybackFromWait, activePlaybackNotesInfo, 
    barLines
  ]);

  const handleStartGame = (settings: GameSettings) => {
    setGameSettings(settings);
    setTotalNoteCountForGame(notesForGame.length); // This will be stale one render, let's fix
    setCurrentScreen('inGame');
    initializeAudioContext();
    // Reset preview tempo to default after starting game
    setPreviewPlaybackTempoMultiplier(1); 
    setIsLoadingContent(true); // NEW: Start loading when entering inGame
    isUserPausedRef.current = true; // Set to true initially to prevent autoplay on focus
  };

  useEffect(() => {
    if (currentScreen === 'inGame') {
      setTotalNoteCountForGame(notesForGame.length);
    }
  }, [notesForGame, currentScreen]);


  const handlePlay = useCallback(() => {
    if (notesForGame.length === 0 || isPlayingRef.current) return;
    if (!initializeAudioContext()) {
      alert("AudioContext could not be started. Please interact with the page and try again.");
      return;
    }
    setIsPlaying(true);
    isPlayingRef.current = true;
    isUserPausedRef.current = false; // User explicitly pressed play
    performanceStartTimeRef.current = performance.now();
    // Initialize musical current times to the paused time
    setMusicalCurrentTimeMs(pausedMusicalTimeRef.current);

    if (metronomeMode !== 'off') {
      scheduleMetronomeSounds(pausedMusicalTimeRef.current);
      lastMetronomeScheduleTimeRef.current = pausedMusicalTimeRef.current;
    }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [notesForGame.length, initializeAudioContext, playbackLoop, metronomeMode, scheduleMetronomeSounds, pausedMusicalTimeRef, setMusicalCurrentTimeMs]);

  const handlePause = useCallback(() => {
    if (!isPlayingRef.current) return;
    setIsPlaying(false);
    isPlayingRef.current = false;
    isUserPausedRef.current = true; // User explicitly pressed pause
    pausedMusicalTimeRef.current = currentTimeRef.current; // currentTimeRef.current holds the last musical time
    if (playbackRequestRef.current) {
      cancelAnimationFrame(playbackRequestRef.current);
      playbackRequestRef.current = null;
    }
    clearScheduledNotes();
    clearScheduledMetronomeSounds();
    if (chordRecognitionTimeoutIdRef.current) {
        clearTimeout(chordRecognitionTimeoutIdRef.current);
        chordRecognitionTimeoutIdRef.current = null;
    }
    setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds]);

  // NEW: Automatic Pause/Resume on tab visibility or window focus
  useEffect(() => {
    const pausePlayback = () => {
      if (currentScreen === 'inGame' && isPlayingRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        pausedMusicalTimeRef.current = currentTimeRef.current;
        if (playbackRequestRef.current) {
          cancelAnimationFrame(playbackRequestRef.current);
          playbackRequestRef.current = null;
        }
        clearScheduledNotes();
        clearScheduledMetronomeSounds();
        if (chordRecognitionTimeoutIdRef.current) {
          clearTimeout(chordRecognitionTimeoutIdRef.current);
          chordRecognitionTimeoutIdRef.current = null;
        }
      }
    };

    const resumePlayback = () => {
      if (currentScreen === 'inGame' && !isPlayingRef.current && !isUserPausedRef.current && notesForGame.length > 0) {
        handlePlay();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pausePlayback();
      } else {
        resumePlayback();
      }
    };

    const handleWindowBlur = () => {
        pausePlayback();
    };

    const handleWindowFocus = () => {
        resumePlayback();
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        // Entered fullscreen
        pausePlayback();
      } else {
        // Exited fullscreen
        resumePlayback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange); // Add fullscreen listener

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange); // Clean up fullscreen listener
    };
  }, [currentScreen, notesForGame.length, handlePlay, clearScheduledNotes, clearScheduledMetronomeSounds]); // Add all relevant dependencies

  const handleSeek = useCallback((newMusicalTime: number) => {
    if (notesForGame.length === 0 || waitMode === 'retical') return;
    const clampedTime = Math.max(0, Math.min(newMusicalTime, originalTotalMusicalDurationMs));

    clearScheduledNotes();
    presatisfiedNoteIdsRef.current = new Set();
    
    notesCurrentlyWaitingForRef.current = new Set();
    setNotesCurrentlyWaitingFor(new Set()); // Update state instead of ref.clear()
    waitingBlockTimeRef.current = null;
    if (chordRecognitionTimeoutIdRef.current) {
        clearTimeout(chordRecognitionTimeoutIdRef.current);
        chordRecognitionTimeoutIdRef.current = null;
    }

    if (waitMode === 'off') {
        const notesBeforeSeekTime = notesForGame.filter(n => n.timeMs < clampedTime);
        hitNoteIdsRef.current = new Set(notesBeforeSeekTime.map(n => n.noteId));
        hitCountRef.current = hitNoteIdsRef.current.size;
        setHitCount(hitCountRef.current);
        errorCountRef.current = 0;
        setErrorCount(0);
    } else {
        hitNoteIdsRef.current = new Set(
            Array.from(hitNoteIdsRef.current).filter(noteId => {
                const note = notesForGame.find(n => n.noteId === noteId);
                return note && note.timeMs < clampedTime;
            })
        );
        hitCountRef.current = hitNoteIdsRef.current.size;
        setHitCount(hitCountRef.current);
    }

    playerInputTimesRef.current = [];
    firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null;
    setPerformanceSummary(null);

    pausedMusicalTimeRef.current = clampedTime;
    setMusicalCurrentTimeMs(clampedTime); // Update musical time
    currentTimeRef.current = clampedTime; // Update ref for game logic
    isUserPausedRef.current = false; // Seeking acts like a "reset" for user pause state, allowing auto-play if applicable

    let newIndex = 0;
    while(newIndex < notesForGame.length && notesForGame[newIndex].timeMs < clampedTime) {
      newIndex++;
    }
    nextNoteIndexRef.current = newIndex;
    if (isPlayingRef.current) {
      performanceStartTimeRef.current = performance.now();
      if (metronomeMode !== 'off') {
        scheduleMetronomeSounds(clampedTime);
        lastMetronomeScheduleTimeRef.current = clampedTime;
      }
    } else {
      clearScheduledMetronomeSounds();
      if (metronomeMode !== 'off') {
        scheduleMetronomeSounds(clampedTime);
        lastMetronomeScheduleTimeRef.current = clampedTime;
      } else {
        lastMetronomeScheduleTimeRef.current = 0;
      }
    }
    setMetronomeBeat(null);
  }, [notesForGame, originalTotalMusicalDurationMs, clearScheduledNotes, metronomeMode, scheduleMetronomeSounds, clearScheduledMetronomeSounds, setHitCount, setNotesCurrentlyWaitingFor, waitMode, setErrorCount, setMusicalCurrentTimeMs]);

  const processKeyPressInWaitMode = useCallback((midiNote: number) => {
    const isCurrentlyWaiting = notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    const nowRealTime = performance.now();
    const nowMusical = currentTimeRef.current; // Snapshot current musical time
    
    // Define constants for forgiveness windows
    const FORGIVENESS_WINDOW_FORWARD_MS = 100;
    const FORGIVENESS_WINDOW_BACKWARD_MS = 100;

    if (isCurrentlyWaiting) {
        // This block uses the existing, more robust logic for handling notes when the game is paused.
        const waitingNotes = notesForGame.filter(n =>
            n.timeMs === waitingBlockTimeRef.current && notesCurrentlyWaitingForRef.current.has(n.midi)
        );
        
        if (waitMode === 'strict') {
            const pressedNoteMatches = waitingNotes.filter(n => n.midi === midiNote);
        
            if (pressedNoteMatches.length > 0) {
                const noteToSatisfy = pressedNoteMatches.find(n => !hitNoteIdsRef.current.has(n.noteId));
        
                if (noteToSatisfy) {
                    if (!hitNoteIdsRef.current.has(noteToSatisfy.noteId)) {
                        hitCountRef.current++;
                        setHitCount(hitCountRef.current);
                        hitNoteIdsRef.current.add(noteToSatisfy.noteId);
                    }
                    visuallySatisfyNote(noteToSatisfy);
                    recordPlayerInputTime(nowRealTime, waitingBlockTimeRef.current!);
        
                    const allInstancesOfMidi = waitingNotes.filter(n => n.midi === midiNote);
                    const areAllInstancesHit = allInstancesOfMidi.every(n => hitNoteIdsRef.current.has(n.noteId));
        
                    const newWaitingSet = new Set(notesCurrentlyWaitingForRef.current);
                    if (areAllInstancesHit) {
                        newWaitingSet.delete(midiNote);
                    }
                    
                    notesCurrentlyWaitingForRef.current = newWaitingSet;
                    setNotesCurrentlyWaitingFor(newWaitingSet);
        
                    if (newWaitingSet.size === 0) {
                        resumePlaybackFromWait();
                    }
                }
            } else {
                errorCountRef.current++;
                setErrorCount(errorCountRef.current);
            }
        } else if (waitMode === 'rhythm' || waitMode === 'retical') {
            const pressedNoteMatches = waitingNotes.filter(n => n.midi === midiNote);
            let anyCorrectNoteHitThisPress = false;

            if (pressedNoteMatches.length > 0) {
                for (const noteToSatisfy of pressedNoteMatches) {
                    if (!hitNoteIdsRef.current.has(noteToSatisfy.noteId)) {
                        hitCountRef.current++;
                        setHitCount(hitCountRef.current);
                        hitNoteIdsRef.current.add(noteToSatisfy.noteId);
                        visuallySatisfyNote(noteToSatisfy);
                        recordPlayerInputTime(nowRealTime, waitingBlockTimeRef.current!);
                        anyCorrectNoteHitThisPress = true;
                    }
                }
            }

            if (!anyCorrectNoteHitThisPress) {
                errorCountRef.current++;
                setErrorCount(errorCountRef.current);
            }

            if (chordRecognitionTimeoutIdRef.current) {
                clearTimeout(chordRecognitionTimeoutIdRef.current);
            }
            chordRecognitionTimeoutIdRef.current = window.setTimeout(() => {
                resumePlaybackFromWait();
                chordRecognitionTimeoutIdRef.current = null;
            }, CHORD_RECOGNITION_WINDOW_MS);
        }
    } else { 
        // This block uses the new, more forgiving logic for handling key presses when playback is flowing.
        let hitRegistered = false;

        const upcomingNoteMatch = notesForGame.find(n =>
            n.midi === midiNote &&
            n.timeMs > nowMusical - FORGIVENESS_WINDOW_BACKWARD_MS &&
            n.timeMs <= nowMusical + WAIT_MODE_TOLERANCE_MS + FORGIVENESS_WINDOW_FORWARD_MS &&
            !presatisfiedNoteIdsRef.current.has(n.noteId)
        );

        if (upcomingNoteMatch) {
            if (!hitNoteIdsRef.current.has(upcomingNoteMatch.noteId)) {
                hitCountRef.current++;
                setHitCount(hitCountRef.current);
                hitNoteIdsRef.current.add(upcomingNoteMatch.noteId);
            }
            satisfyUpcomingNote(upcomingNoteMatch);
            recordPlayerInputTime(nowRealTime, upcomingNoteMatch.timeMs);
            hitRegistered = true;
        }

        if (!hitRegistered) {
            const RELEVANT_NOTE_DETECTION_WINDOW_FORWARD_MS = WAIT_MODE_TOLERANCE_MS + FORGIVENESS_WINDOW_FORWARD_MS + 250; 
            const RELEVANT_NOTE_DETECTION_WINDOW_BACKWARD_MS = FORGIVENESS_WINDOW_BACKWARD_MS + 250; 

            const isAnyNoteRelevantForContext = notesForGame.some(n =>
                n.timeMs > nowMusical - RELEVANT_NOTE_DETECTION_WINDOW_BACKWARD_MS &&
                n.timeMs <= nowMusical + RELEVANT_NOTE_DETECTION_WINDOW_FORWARD_MS &&
                !presatisfiedNoteIdsRef.current.has(n.noteId)
            );

            if (isAnyNoteRelevantForContext) {
                errorCountRef.current++;
                setErrorCount(errorCountRef.current);
            }
        }
    }
  }, [notesForGame, waitMode, visuallySatisfyNote, satisfyUpcomingNote, playbackTempoMultiplier, recordPlayerInputTime, setHitCount, setErrorCount, resumePlaybackFromWait, WAIT_MODE_TOLERANCE_MS]);

  const handleUiKeyPress = (keyName: string, midiNote: number) => {
    setUserSustainedKeys(prev => new Set(prev).add(keyName));
    startSustainedSound(keyName, midiNote);
    if (isPlayingRef.current) {
      processKeyPressInWaitMode(midiNote);
    }
  };

  const handleUiKeyRelease = (keyName: string, midiNote: number) => {
    setUserSustainedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(keyName);
      return newSet;
    });
    stopSustainedSound(keyName, midiNote);
  };
  
  const loadFile = useCallback(async (file: File) => {
    setIsLoadingFile(true);
    handleStopPlayback();
    setPlaybackNotes([]);
    setCurrentFileName(null);
    setMusicalCurrentTimeMs(0); // Reset musical time
    pausedMusicalTimeRef.current = 0;
    setTempoEvents([]);
    setSignatureEvents([]);
    setCurrentTempoBpm(null);
    setInitialTimeSignature(DEFAULT_TIME_SIGNATURE);
    setInitialKeySignature(DEFAULT_KEY_SIGNATURE);
    setCurrentFileType(FileType.UNKNOWN);
    setBarLines([]);
    hitCountRef.current = 0;
    errorCountRef.current = 0;
    hitNoteIdsRef.current.clear();
    setHitCount(0);
    setErrorCount(0);
    setTotalNoteCountForGame(0);
    setAnalysisResult(null);
    setPreviewPlaybackTempoMultiplier(1); // Reset preview tempo when loading new file
    isUserPausedRef.current = false; // Reset user pause state on new file load

    try {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        let parsedDataNotes: MidiNotePlaybackItem[] = [], timeSig: TimeSignatureInfo = DEFAULT_TIME_SIGNATURE;
        let initialTempo: number = 120, tempos: TempoEvent[] = [], fileType: FileType = FileType.UNKNOWN, keySig: string = DEFAULT_KEY_SIGNATURE;
        let newBarLines: number[] = [], newSigEvents: SignatureEvent[] = [];

        if (fileExtension === 'mid' || fileExtension === 'midi' || file.type.includes('midi')) {
            fileType = FileType.MIDI;
            const midiArrayBuffer = await file.arrayBuffer();
            const result = await parseMidiData(midiArrayBuffer);
            ({ notes: parsedDataNotes, timeSignature: timeSig, keySignature: keySig, initialTempoBpm: initialTempo, tempoEvents: tempos, barLinesMs: newBarLines, signatureEvents: newSigEvents } = result);

        } else if (fileExtension === 'xml' || fileExtension === 'musicxml' || file.type.includes('xml')) {
            fileType = FileType.MUSICXML;
            const xmlText = await file.text();
            const result = await parseMusicXmlData(xmlText);
            ({ notes: parsedDataNotes, timeSignature: timeSig, keySignature: keySig, initialTempoBpm: initialTempo, tempoEvents: tempos, barLinesMs: newBarLines, signatureEvents: newSigEvents } = result);

        } else if (fileExtension === 'mxl') {
            fileType = FileType.MUSICXML;
            const zip = new JSZip();
            const arrayBuffer = await file.arrayBuffer();
            const loadedZip = await zip.loadAsync(arrayBuffer);

            const containerFile: JSZipObject | null = loadedZip.file("META-INF/container.xml");
            let xmlText: string | null = null;

            if (containerFile) {
                const containerXmlText = await containerFile.async("string");
                const parser = new DOMParser();
                const containerDoc = parser.parseFromString(containerXmlText, "application/xml");
                const rootFileEl = containerDoc.getElementsByTagName("rootfile")[0];
                if (rootFileEl) {
                    const fullPath = rootFileEl.getAttribute("full-path");
                    if (fullPath) {
                        const scoreFile: JSZipObject | null = loadedZip.file(fullPath);
                        if (scoreFile) xmlText = await scoreFile.async("string");
                    }
                }
            }
            
            if (!xmlText) {
                for (const fileInZip of Object.values(loadedZip.files)) {
                    const zipObject = fileInZip as JSZipObject;
                    if (!zipObject.dir && (zipObject.name.endsWith('.xml') || zipObject.name.endsWith('.musicxml'))) {
                        xmlText = await zipObject.async("string");
                        break;
                    }
                }
            }

            if (xmlText) {
                const result = await parseMusicXmlData(xmlText);
                ({ notes: parsedDataNotes, timeSignature: timeSig, keySignature: keySig, initialTempoBpm: initialTempo, tempoEvents: tempos, barLinesMs: newBarLines, signatureEvents: newSigEvents } = result);
            } else {
                throw new Error("Could not find a valid MusicXML file inside the .mxl archive.");
            }
        } else {
            alert(`Unsupported file type: .${fileExtension}`);
            throw new Error(`Unsupported file type: .${fileExtension}`);
        }
        
        // Removed dynamic enharmonic correction here; it's now handled by vexflow-helper.ts for visual rendering.
        let correctedNotes = parsedDataNotes;
        
        const notesWithFingering = assignFingering(correctedNotes);
        
        setPlaybackNotes(notesWithFingering);
        setCurrentFileName(fileName);
        setInitialTimeSignature(timeSig);
        setInitialKeySignature(keySig);
        setCurrentTempoBpm(initialTempo);
        setTempoEvents(tempos);
        setSignatureEvents(newSigEvents);
        setCurrentFileType(fileType);
        setBarLines(newBarLines);
        
        if (notesWithFingering.length > 0) {
          await preloadSamplesForSong(notesWithFingering);
        } else {
          setIsPreloading(false);
        }

    } catch (error) {
        console.error("Error loading or parsing file:", error);
        alert("Sorry, there was an error processing this file. Please try another one.");
        setPlaybackNotes([]);
        setCurrentFileName(null);
    } finally {
        setIsLoadingFile(false);
    }
  }, [handleStopPlayback, preloadSamplesForSong, parseMidiData, parseMusicXmlData, setHitCount, setErrorCount, setMusicalCurrentTimeMs]);
  
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
      const [command, note, velocity] = event.data;
      const keyName = midiNoteToNameMap.get(note);
      if (!keyName) return;

      if (command === 144 && velocity > 0) {
          setUserActiveKeys(prev => new Set(prev).add(keyName));
          startSustainedSound(keyName, note, velocity / 127);
          
          if (isPlayingRef.current) {
            processKeyPressInWaitMode(note);
          }
      } else if (command === 128 || (command === 144 && velocity === 0)) {
          setUserActiveKeys(prev => {
              const newSet = new Set(prev);
              newSet.delete(keyName);
              return newSet;
          });
          stopSustainedSound(keyName, note);
      }
  }, [midiNoteToNameMap, startSustainedSound, stopSustainedSound, processKeyPressInWaitMode, isPlayingRef]);

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setMidiAccessStatus('unsupported');
      setMidiAccessError("Web MIDI is not supported by your browser.");
      return;
    }
    setMidiAccessStatus('requesting');
    try {
        const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        midiAccessInstanceRef.current = midiAccess;
        setMidiAccessStatus('granted');
        setMidiInputs(new Map(midiAccess.inputs.entries()));
        setMidiOutputs(new Map(midiAccess.outputs.entries()));
        midiAccess.onstatechange = () => {
          if (midiAccessInstanceRef.current) {
            const currentInputs = new Map(midiAccessInstanceRef.current.inputs.entries());
            const currentOutputs = new Map(midiAccessInstanceRef.current.outputs.entries());
            setMidiInputs(currentInputs);
            setMidiOutputs(currentOutputs);
            if (selectedMidiInputId && !currentInputs.has(selectedMidiInputId)) setSelectedMidiInputId(null);
            if (selectedMidiOutputId && !currentOutputs.has(selectedMidiOutputId)) setSelectedMidiOutputId(null);
          }
        };
    } catch (err) {
        console.error("MIDI access request failed.", err);
        setMidiAccessStatus('denied');
        setMidiAccessError("MIDI access was denied.");
    }
  }, [selectedMidiInputId, selectedMidiOutputId]);

  useEffect(() => {
    const activeInput = selectedMidiInputId ? midiInputs.get(selectedMidiInputId) : null;
    if (activeMidiInputDeviceRef.current && activeMidiInputDeviceRef.current !== activeInput) {
        activeMidiInputDeviceRef.current.onmidimessage = null;
    }
    if (activeInput) {
        activeInput.onmidimessage = handleMidiMessage;
        activeMidiInputDeviceRef.current = activeInput;
    } else {
        activeMidiInputDeviceRef.current = null;
    }
    return () => {
        if (activeMidiInputDeviceRef.current) activeMidiInputDeviceRef.current.onmidimessage = null;
    }
  }, [selectedMidiInputId, midiInputs, handleMidiMessage]);


  const activeMidiNotesInfoForKeyboard = useMemo(() => {
    const notePerKey = new Map<string, ActiveMidiNoteInfo>();
    
    const sortedActiveNotes = [...activePlaybackNotesInfo.values()].sort((a, b) => {
      if (a.status === 'waiting' && b.status !== 'waiting') return -1;
      if (b.status === 'waiting' && a.status !== 'waiting') return 1;
      return a.timeMs - b.timeMs;
    });

    for (const noteInfo of sortedActiveNotes) {
        const keyName = noteInfo.name;
        if (!notePerKey.has(keyName)) {
            notePerKey.set(keyName, noteInfo);
        }
    }
    return notePerKey;
  }, [activePlaybackNotesInfo]);

  const handleClosePerformanceSummary = useCallback(() => {
    setPerformanceSummary(null);
    handleStopPlayback();
  }, [handleStopPlayback]);

  const barNavDebounceRef = useRef<number>(0);
  const DEBOUNCE_TIME_MS = 1000;

  const handleBarNavigation = useCallback((direction: 'forward' | 'backward') => {
    if (notesForGame.length === 0 || barLines.length === 0 || waitMode === 'retical') return;
    const now = performance.now();
    if (now - barNavDebounceRef.current < DEBOUNCE_TIME_MS) return;
    barNavDebounceRef.current = now;

    const currentTime = currentTimeRef.current; // Use musical time for navigation
    const nextBarIndex = barLines.findIndex(barTime => barTime > currentTime + 50);
    let targetBarIndex;
    if (direction === 'forward') {
        targetBarIndex = nextBarIndex !== -1 ? nextBarIndex : barLines.length - 1;
    } else {
        const currentBarIndex = nextBarIndex !== -1 ? nextBarIndex - 1 : barLines.length - 1;
        if (currentBarIndex < 0) return;
        const currentBarStartTime = barLines[currentBarIndex];
        if (currentTime - currentBarStartTime < 100) {
            targetBarIndex = Math.max(0, currentBarIndex - 1);
        } else {
            targetBarIndex = currentBarIndex;
        }
    }
    const targetTime = barLines[targetBarIndex];
    if (targetTime !== undefined && Math.abs(targetTime - currentTimeRef.current) > 50) {
        handleSeek(targetTime);
    }
  }, [notesForGame.length, barLines, handleSeek, waitMode]);

  // NEW: QWERTY keyboard listener
  useEffect(() => {
    const handleQwertyKeyDown = (event: KeyboardEvent) => {
      // Allow default behavior for modifier keys or if not in game, OR if shortcuts are disabled
      if (event.metaKey || event.ctrlKey || event.altKey || currentScreen !== 'inGame' || !showQwertyShortcuts) {
        return;
      }

      const code = event.code.toLowerCase();

      if (qwertyActiveKeysRef.current.has(code)) {
        return; // Prevent repeating notes if key is held down
      }
      qwertyActiveKeysRef.current.add(code);

      if (OCTAVE_DOWN_KEYS.includes(code)) {
        setQwertyCurrentOctaveShift(prev => Math.max(MIN_QWERTY_OCTAVE_SHIFT, prev - 1));
        event.preventDefault(); // Prevent browser shortcuts
      } else if (OCTAVE_UP_KEYS.includes(code)) {
        setQwertyCurrentOctaveShift(prev => Math.min(MAX_QWERTY_OCTAVE_SHIFT, prev + 1));
        event.preventDefault(); // Prevent browser shortcuts
      } else {
        const mappedEntry = QWERTY_MINI_KEYBOARD_MAPPING.find(entry => entry.qwertyKey === code);
        if (mappedEntry) {
          const targetMidiNote = mappedEntry.midiBase + (qwertyCurrentOctaveShift * 12);
          const pianoKeyDef = midiNoteToKeyDefMap.get(targetMidiNote);
          if (pianoKeyDef) {
            handleUiKeyPress(pianoKeyDef.name, pianoKeyDef.midiNote);
            event.preventDefault(); // Prevent browser shortcuts
          }
        }
      }
    };

    const handleQwertyKeyUp = (event: KeyboardEvent) => {
      // Allow default behavior for modifier keys or if not in game, OR if shortcuts are disabled
      if (event.metaKey || event.ctrlKey || event.altKey || currentScreen !== 'inGame' || !showQwertyShortcuts) {
        return;
      }

      const code = event.code.toLowerCase();

      if (!qwertyActiveKeysRef.current.has(code)) {
        return; // Key was not active or already released
      }
      qwertyActiveKeysRef.current.delete(code);

      // Only trigger release for actual piano notes, not octave shift keys
      if (!OCTAVE_DOWN_KEYS.includes(code) && !OCTAVE_UP_KEYS.includes(code)) {
        const mappedEntry = QWERTY_MINI_KEYBOARD_MAPPING.find(entry => entry.qwertyKey === code);
        if (mappedEntry) {
          const targetMidiNote = mappedEntry.midiBase + (qwertyCurrentOctaveShift * 12);
          const pianoKeyDef = midiNoteToKeyDefMap.get(targetMidiNote);
          if (pianoKeyDef) {
            handleUiKeyRelease(pianoKeyDef.name, pianoKeyDef.midiNote);
            event.preventDefault(); // Prevent browser shortcuts
          }
        }
      }
    };

    window.addEventListener('keydown', handleQwertyKeyDown);
    window.addEventListener('keyup', handleQwertyKeyUp);

    return () => {
      window.removeEventListener('keydown', handleQwertyKeyDown);
      window.removeEventListener('keyup', handleQwertyKeyUp);
    };
  }, [currentScreen, qwertyCurrentOctaveShift, handleUiKeyPress, handleUiKeyRelease, showQwertyShortcuts, midiNoteToKeyDefMap]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (currentScreen !== 'inGame' || notesForGame.length === 0 || waitMode === 'retical' || hideBarNavigationButtons) return; // Add hideBarNavigationButtons check
        // Allow QWERTY piano keys to be handled by new listener, prevent default for navigation
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.preventDefault();
        if (event.key === 'ArrowLeft') handleBarNavigation('backward');
        else if (event.key === 'ArrowRight') handleBarNavigation('forward');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, notesForGame.length, handleBarNavigation, waitMode, hideBarNavigationButtons]); // Add hideBarNavigationButtons dependency

  // Dynamically determine the active key signature for falling notes
  const activeKeySignatureForFallingNotes = useMemo(() => {
    return getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature);
  }, [musicalCurrentTimeMs, signatureEvents, initialKeySignature]);

  // NEW: Callback for VexFlowSheetMusicView to signal layout completion
  const handleSheetLayoutRendered = useCallback((layoutId: number) => {
    setRenderedLayoutId(layoutId);
  }, []);

  // NEW: Effect to manage isLoadingContent state based on rendering completion
  useEffect(() => {
    if (currentScreen !== 'inGame' || !isLoadingContent) {
      return;
    }

    let timeoutId: number | undefined; // Changed to number | undefined

    if (viewMode === 'sheet') {
      // Check if vexFlowData exists and renderedLayoutId has updated since loading started
      // The `vexFlowData` dependency for `VexFlowSheetMusicView` will cause `renderedLayoutId` to update.
      timeoutId = window.setTimeout(() => {
        setIsLoadingContent(false);
      }, 100); // Small delay to allow browser to paint changes
    } else if (viewMode === 'falling') {
      // For falling notes and piano, check if keyPositionsMap (which depends on pianoScale) is ready
      if (keyPositionsMap.size > 0) {
        timeoutId = window.setTimeout(() => {
          setIsLoadingContent(false);
        }, 50); // Slightly less delay for simpler rendering
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentScreen, viewMode, isLoadingContent, renderedLayoutId, keyPositionsMap.size]);


  // Wrapped handlers to trigger loading state
  const handleNoteSpeedMultiplierChange = useCallback((multiplier: number) => {
    setIsLoadingContent(true);
    setNoteSpeedMultiplier(multiplier);
  }, []);

  const handleSheetMusicZoomChange = useCallback((zoom: number) => {
    setIsLoadingContent(true);
    setSheetMusicZoom(zoom);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setIsLoadingContent(true);
    setViewMode(mode);
  }, []);

  const handleNoteLabelTypeChange = useCallback((type: NoteLabelType) => {
    setNoteLabelType(type);
  }, []);

  const handleShowOnlyMajorRestsChange = useCallback((value: boolean) => {
    setIsLoadingContent(true);
    setShowOnlyMajorRests(value);
  }, []);

  const handleShowOnlyMajorNotesChange = useCallback((value: boolean) => {
    setIsLoadingContent(true);
    setShowOnlyMajorNotes(value);
  }, []);

  const handleShowQwertyShortcutsChange = useCallback((value: boolean) => {
    setShowQwertyShortcuts(value);
  }, []);

  const handleHideBarNavigationButtonsChange = useCallback((value: boolean) => {
    setIsLoadingContent(true);
    setHideBarNavigationButtons(value);
  }, []);

  const handleMasterVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume);
  }, []);

  const handleMetronomeVolumeChange = useCallback((volume: number) => {
    setMetronomeVolume(volume);
  }, []);

  const handleThemeSettingsChange = useCallback((settings: ThemeSettings) => {
    setThemeSettings(settings);
  }, []);

  const handlePianoScaleChange = useCallback((scale: number) => {
    setIsLoadingContent(true);
    setPianoScale(scale);
  }, []);

  const handlePianoHorizontalOffsetChange = useCallback((offset: number) => {
    setIsLoadingContent(true); // Can also trigger loading if it causes heavy repaint, but mostly just CSS transform
    setPianoHorizontalOffset(offset);
  }, []);

  // --- Reset to Defaults Function ---
  const handleResetToDefaults = useCallback(() => {
    handleViewModeChange(DEFAULT_VIEW_MODE);
    handleNoteLabelTypeChange(DEFAULT_NOTE_LABEL_TYPE);
    handleShowOnlyMajorRestsChange(DEFAULT_SHOW_ONLY_MAJOR_RESTS);
    handleShowOnlyMajorNotesChange(DEFAULT_SHOW_ONLY_MAJOR_NOTES);
    handleShowQwertyShortcutsChange(DEFAULT_SHOW_QWERTY_SHORTCUTS);
    handleHideBarNavigationButtonsChange(DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS);
    handleMasterVolumeChange(DEFAULT_MASTER_VOLUME);
    handleMetronomeVolumeChange(DEFAULT_METRONOME_VOLUME);
    handleThemeSettingsChange(DEFAULT_THEME_SETTINGS);
    handlePianoScaleChange(DEFAULT_PIANO_SCALE);
    handlePianoHorizontalOffsetChange(DEFAULT_PIANO_HORIZONTAL_OFFSET);
    setSelectedMidiInputId(null); // Disconnect MIDI input
    setSelectedMidiOutputId(null); // Disconnect MIDI output
    // Note: MIDI access status is not reset, as it requires user interaction.
  }, [
    handleViewModeChange, handleNoteLabelTypeChange, handleShowOnlyMajorRestsChange,
    handleShowOnlyMajorNotesChange, handleShowQwertyShortcutsChange, handleHideBarNavigationButtonsChange,
    handleMasterVolumeChange, handleMetronomeVolumeChange, handleThemeSettingsChange,
    handlePianoScaleChange, handlePianoHorizontalOffsetChange,
    setSelectedMidiInputId, setSelectedMidiOutputId // Add MIDI selectors to dependencies
  ]);
  // --- End Reset to Defaults Function ---


  const renderContent = () => {
    // Calculate total height needed by the piano, progress bar, and dynamic view (falling notes/sheet music)
    const pianoKeyboardTotalRequiredHeight = WHITE_KEY_HEIGHT_PX + KEY_LABEL_AREA_HEIGHT_PX;
    const progressBarRequiredHeightForRender = notesForGame.length > 0 ? PROGRESS_BAR_HEIGHT_PX : 0;
    const totalPianoSectionHeight = contentAreaHeight + progressBarRequiredHeightForRender + pianoKeyboardTotalRequiredHeight;

    switch (currentScreen) {
      case 'songSelection':
        return <SongSelection
                  onFileLoaded={loadFile}
                  onSongSelected={() => {
                    setCurrentScreen('modeSelection');
                    // Initialize preview tempo multiplier to 1 when entering mode selection
                    setPreviewPlaybackTempoMultiplier(1);
                  }}
                  onBack={() => setCurrentScreen('mainMenu')}
                  loadedSongName={currentFileName}
                  analysisResult={analysisResult}
                  isLoading={isLoadingFile || isPreloading}
                />;
      case 'modeSelection':
        return <ModeSelection
                  onStartGame={handleStartGame}
                  onBack={() => setCurrentScreen('songSelection')}
                  analysisResult={analysisResult}
                  analysisResultForPreview={analysisResultForPreview}
                  fileName={currentFileName}
                  initialTempoBpm={currentTempoBpm}
                  initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier} // Pass the actual state variable
                  onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange}
                  currentHideBarNavigationButtons={hideBarNavigationButtons} // Pass current state
                  onHideBarNavigationButtonsChange={setHideBarNavigationButtons} // Pass setter for final GameSettings
                />;
      case 'settings':
        return <Settings
                  onBack={() => setCurrentScreen('mainMenu')}
                  midiAccessStatus={midiAccessStatus}
                  midiInputs={midiInputs}
                  selectedMidiInputId={selectedMidiInputId}
                  onSelectMidiInput={setSelectedMidiInputId}
                  midiOutputs={midiOutputs}
                  selectedMidiOutputId={selectedMidiOutputId}
                  onSelectMidiOutput={setSelectedMidiOutputId}
                  connectMidi={connectMidi}
                  noteLabelType={noteLabelType}
                  onNoteLabelTypeChange={handleNoteLabelTypeChange}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange} // Use wrapped handler
                  masterVolume={masterVolume}
                  onMasterVolumeChange={handleMasterVolumeChange}
                  metronomeVolume={metronomeVolume}
                  onMetronomeVolumeChange={handleMetronomeVolumeChange}
                  themeSettings={themeSettings}
                  onThemeSettingsChange={handleThemeSettingsChange}
                  showOnlyMajorRests={showOnlyMajorRests}
                  onShowOnlyMajorRestsChange={handleShowOnlyMajorRestsChange} // Use wrapped handler
                  showOnlyMajorNotes={showOnlyMajorNotes}
                  onShowOnlyMajorNotesChange={handleShowOnlyMajorNotesChange}
                  showQwertyShortcuts={showQwertyShortcuts}
                  onShowQwertyShortcutsChange={handleShowQwertyShortcutsChange}
                  hideBarNavigationButtons={hideBarNavigationButtons} // Pass to Settings
                  onHideBarNavigationButtonsChange={handleHideBarNavigationButtonsChange} // Use wrapped handler
                  pianoScale={pianoScale}
                  onPianoScaleChange={handlePianoScaleChange} // Use wrapped handler
                  pianoHorizontalOffset={pianoHorizontalOffset}
                  onPianoHorizontalOffsetChange={handlePianoHorizontalOffsetChange}
                  onResetToDefaults={handleResetToDefaults} // Pass the new reset function
                />
      case 'inGame':
        return (
          <>
            <TopBar
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStopPlayback}
              onExit={() => { handleStopPlayback(); setCurrentScreen('songSelection'); }}
              isPlaying={isPlaying}
              isFileLoaded={notesForGame.length > 0}
              fileName={currentFileName}
              waitMode={waitMode}
              metronomeMode={metronomeMode}
              onCycleMetronomeMode={() => setMetronomeMode(p => p === 'off' ? 'bar' : 'off')}
              isMetronomeAvailable={isMetronomeAvailable}
              hitCount={hitCount}
              errorCount={errorCount}
              totalNoteCount={totalNoteCountForGame}
              currentTimeMs={musicalCurrentTimeMs} // Use musical time for TopBar
              totalDurationMs={originalTotalMusicalDurationMs}
              viewMode={viewMode}
              noteSpeedMultiplier={noteSpeedMultiplier}
              onNoteSpeedMultiplierChange={handleNoteSpeedMultiplierChange} // Use wrapped handler
              sheetMusicZoom={sheetMusicZoom}
              onSheetMusicZoomChange={handleSheetMusicZoomChange} // Use wrapped handler
              analysisResult={analysisResult}
              metronomeBeat={metronomeBeat}
            />
            <div ref={contentAreaRef} className="flex-grow flex flex-col justify-end overflow-hidden relative">
              <div className="w-full flex-grow flex justify-center items-end relative overflow-hidden">
                  <div
                    style={{
                      width: `${scaledPianoWidth}px`,
                      height: `${totalPianoSectionHeight}px`,
                      position: 'absolute',
                      left: '50%',
                      transform: `translateX(calc(-50% + ${pianoHorizontalOffset}px))`,
                      transition: 'transform 0.1s ease-out',
                    }}
                    className="flex flex-col flex-shrink-0"
                  >
                      {isLoadingContent && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-70 z-30">
                          <div className="flex items-center space-x-3 p-4 bg-slate-800 rounded-lg shadow-xl text-sky-400 font-semibold text-lg animate-pulse">
                            <svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Preparing content...</span>
                          </div>
                        </div>
                      )}

                      {viewMode === 'falling' ? (
                        <FallingNotesArea
                          notes={notesForGame}
                          currentTimeMs={musicalCurrentTimeMs} // Use musical time for falling notes
                          keyPositions={keyPositionsMap}
                          activeMidiNotesInfo={activePlaybackNotesInfo}
                          width={scaledPianoWidth}
                          actualHeight={contentAreaHeight} // This is the height for FallingNotesArea only
                          pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier}
                          barLines={barLines}
                          noteLabelType={noteLabelType}
                          rightHandColor={themeSettings.rightHandColor}
                          leftHandColor={themeSettings.leftHandColor}
                          backgroundColor={themeSettings.fallingNotesBackgroundColor}
                          activeKeySignature={activeKeySignatureForFallingNotes} // Pass active key signature
                          showOnlyMajorNotes={showOnlyMajorNotes}
                        />
                      ) : (
                        <VexFlowSheetMusicView
                          notes={notesForGame}
                          timeSignature={initialTimeSignature}
                          keySignature={initialKeySignature}
                          initialTempoBpm={currentTempoBpm || 120}
                          width={scaledPianoWidth}
                          height={contentAreaHeight} // This is the height for VexFlowSheetMusicView only
                          currentTimeMs={musicalCurrentTimeMs} // Use musical time for sheet music
                          totalDurationMs={originalTotalMusicalDurationMs}
                          activePlaybackNotesInfo={activePlaybackNotesInfo}
                          onSeek={handleSeek}
                          isPlaying={isPlaying}
                          sheetMusicZoom={sheetMusicZoom}
                          barLines={barLines}
                          rightHandColor={themeSettings.rightHandColor}
                          leftHandColor={themeSettings.leftHandColor}
                          signatureEvents={signatureEvents}
                          showOnlyMajorRests={showOnlyMajorRests}
                          onLayoutRendered={handleSheetLayoutRendered} // NEW: Pass callback
                        />
                      )}
                      {notesForGame.length > 0 && <ProgressBar
                          currentTimeMs={musicalCurrentTimeMs}
                          totalDurationMs={originalTotalMusicalDurationMs}
                          width={scaledPianoWidth}
                          height={progressBarRequiredHeightForRender}
                          onSeek={handleSeek}
                          isPlaybackActive={isPlayingRef.current}
                          isSeekingDisabled={waitMode === 'retical'}
                      />}
                      <PianoKeyboard 
                          keyPositions={Array.from(keyPositionsMap.values())}
                          userSustainedKeys={userSustainedKeys}
                          userActiveKeys={userActiveKeys}
                          activeMidiNotesInfo={activeMidiNotesInfoForKeyboard}
                          onUiKeyPress={handleUiKeyPress}
                          onUiKeyRelease={handleUiKeyRelease}
                          rightHandColor={themeSettings.rightHandColor}
                          leftHandColor={themeSettings.leftHandColor}
                          showQwertyShortcuts={showQwertyShortcuts}
                          qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                          width={scaledPianoWidth}
                      />
                  </div>
              </div>
            </div>
            {performanceSummary && (
              <PerformanceSummaryModal 
                isVisible={!!performanceSummary} 
                summary={performanceSummary} 
                onClose={handleClosePerformanceSummary}
              />
            )}
            {notesForGame.length > 0 && <BarNavigationControls 
              onNavigate={handleBarNavigation} 
              isFileLoaded={notesForGame.length > 0}
              waitMode={waitMode}
              hideControls={hideBarNavigationButtons} // Pass hideBarNavigationButtons to BarNavigationControls
            />}
          </>
        );
      default:
        return <MainMenu 
                onPlay={() => setCurrentScreen('songSelection')} 
                onSettings={() => setCurrentScreen('settings')} 
                onQuit={() => setQuitMessageVisible(true)}
                quitMessageVisible={quitMessageVisible}
               />;
    }
  };

  return (
    <div className="bg-slate-900 text-white h-screen flex flex-col">
      {renderContent()}
    </div>
  );
};

export default App;