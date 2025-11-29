import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { KeyPosition, PianoKeyDefinition, MidiNotePlaybackItem, ActiveMidiNoteInfo, MIDIInput, MIDIMessageEvent, MIDIAccess, MIDIOutput, TimeSignatureInfo, FileType, ExtendedResult, MidiAccessStatus, MetronomeMode, WaitMode, ViewMode, Screen, GameSettings, NoteLabelType, PracticeHand, ThemeSettings, PerformanceSummary, TempoEvent, DevicePreset, LayoutDimensions } from './types';
import {
  PIANO_KEYS_CONFIG,
  BLACK_KEY_WIDTH_RATIO, BLACK_KEY_OFFSET_RATIO,
  PROGRESS_BAR_HEIGHT_PX,
  HAND_SPLIT_MIDI_NOTE, NUM_WHITE_KEYS, CHORD_RECOGNITION_WINDOW_MS,
  BASE_PIXELS_PER_MILLISECOND,
  QWERTY_MINI_KEYBOARD_MAPPING, OCTAVE_DOWN_KEYS, OCTAVE_UP_KEYS,
  DEFAULT_QWERTY_OCTAVE_SHIFT, MIN_QWERTY_OCTAVE_SHIFT, MAX_QWERTY_OCTAVE_SHIFT,
  DEFAULT_MASTER_VOLUME, DEFAULT_METRONOME_VOLUME, DEFAULT_VIEW_MODE,
  DEFAULT_NOTE_LABEL_TYPE, DEFAULT_SHOW_ONLY_MAJOR_RESTS, DEFAULT_SHOW_ONLY_MAJOR_NOTES,
  DEFAULT_SHOW_QWERTY_SHORTCUTS, DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS,
  DEFAULT_THEME_SETTINGS, DEVICE_LAYOUTS
} from './constants';
import PianoKeyboard from './components/PianoKeyboard';
import TopBar from './components/TopBar';
import ProgressBar from './components/ProgressBar';
import MainMenu from './components/MainMenu';
import SongSelection from './components/SongSelection';
import ModeSelection from './components/ModeSelection';
import Settings from './components/Settings';
import AuthModal from './AuthModal'; // Import AuthModal
import AccountModal from './components/AccountModal'; // Import AccountModal
import JSZip, { JSZipObject } from 'jszip';
import { assignFingering } from './fingering';
import { analyzeMidi } from './midiAnalysis';
import VexFlowSheetMusicView from './components/VexFlowSheetMusicView';
import BarNavigationControls from './components/BarNavigationControls';
import PerformanceSummaryModal from './components/PerformanceSummaryModal';
import { FallingNotesArea } from './components/FallingNotesArea';
import { getActiveKeySignature, getActiveTimeSignature, SignatureEvent } from './utils'; // Import getActiveTimeSignature and SignatureEvent
import { AuthProvider, useAuth } from './AuthContext'; // Import AuthProvider and useAuth
import { supabase } from './supabaseClient'; // Import supabase client
import { 
  parseMidiData, 
  parseMusicXmlData, 
  INITIAL_PLAYBACK_DELAY_MS, 
  DEFAULT_TIME_SIGNATURE, 
  DEFAULT_KEY_SIGNATURE,
  DEFAULT_MUSICXML_TEMPO_BPM
} from './midiParser'; 
import Leaderboard from './components/Leaderboard';


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

interface ActiveAudioNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

// --- Default Settings Constants ---
// Moved to constants.ts for single source of truth
// --- End Default Settings Constants ---


const AppContent: React.FC = () => { // Renamed App to AppContent to use useAuth hook
  // --- Screen & Flow Management ---
  const [currentScreen, setCurrentScreen] = useState<Screen>('mainMenu');
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false); // NEW: State for loading overlay
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // NEW: Auth modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); // NEW: Account modal state
  const { session } = useAuth(); // Get session for ranked mode logic

  // NEW: State for navigating to SongSelection with a specific online song pre-selected
  const [selectedOnlineSongIdForNavigation, setSelectedOnlineSongIdForNavigation] = useState<string | null>(null);

  // --- UI Interaction State ---
  // FIX: Removed 'new' keyword from useState
  // Fix: Initialize Set using a function to prevent potential issues with direct constructor calls in useState.
  const [userSustainedKeys, setUserSustainedKeys] = useState<Set<string>>(() => new Set());
  const [userActiveKeys, setUserActiveKeys] = useState<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(800);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [contentAreaHeight, setContentAreaHeight] = useState(300);
  // NEW: State to force re-render of VexFlowSheetMusicView when layout is known.
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);

  // --- Device Layout Settings ---
  const [devicePreset, setDevicePreset] = useState<DevicePreset>('desktop');
  const [customWhiteKeyHeight, setCustomWhiteKeyHeight] = useState(DEVICE_LAYOUTS.desktop.whiteKeyHeight);
  const [customBlackKeyHeight, setCustomBlackKeyHeight] = useState(DEVICE_LAYOUTS.desktop.blackKeyHeight);
  const [customKeyLabelHeight, setCustomKeyLabelHeight] = useState(DEVICE_LAYOUTS.desktop.keyLabelHeight);
  const [customMinWhiteKeyWidth, setCustomMinWhiteKeyWidth] = useState(DEVICE_LAYOUTS.desktop.minWhiteKeyWidth);

  const layoutConfig: LayoutDimensions = useMemo(() => {
      if (devicePreset === 'custom') {
          return {
              whiteKeyHeight: customWhiteKeyHeight,
              blackKeyHeight: customBlackKeyHeight,
              keyLabelHeight: customKeyLabelHeight,
              minWhiteKeyWidth: customMinWhiteKeyWidth,
          };
      }
      return DEVICE_LAYOUTS[devicePreset];
  }, [devicePreset, customWhiteKeyHeight, customBlackKeyHeight, customKeyLabelHeight, customMinWhiteKeyWidth]);
  
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
  const [currentOnlineSongId, setCurrentOnlineSongId] = useState<string | null>(null); // NEW for ranked mode
  const [isCurrentSongRanked, setIsCurrentSongRanked] = useState<boolean | null>(null); // NEW: Added state for ranked status
  
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
  // NEW: Ref to track previous musical time for metronome visual beat.
  const prevMusicalTimeRef = useRef<number>(0);
  
  // --- Wait Mode State & Refs ---
  const [notesCurrentlyWaitingFor, setNotesCurrentlyWaitingFor] = useState<Set<number>>(new Set());
  // FIX: Declare notesCurrentlyWaitingForRef using useRef
  const notesCurrentlyWaitingForRef = useRef<Set<number>>(new Set());
  
  // NEW: Helper to synchronize state and ref to prevent race conditions
  const updateNotesCurrentlyWaitingFor = useCallback((newSet: Set<number>) => {
      setNotesCurrentlyWaitingFor(newSet);
      notesCurrentlyWaitingForRef.current = newSet;
  }, []);

  const waitingBlockTimeRef = useRef<number | null>(null);
  const presatisfiedNoteIdsRef = useRef<Set<string>>(new Set());
  const lastPlayerInputRealTimeRef = useRef<number>(0); // NEW: For lenient mode
  const chordRecognitionTimeoutIdRef = useRef<number | null>(null);
  const rhythmChordBufferRef = useRef<Set<number>>(new Set());

  // --- Wait Time Tracking (Retical Mode) ---
  const [totalWaitTimeMs, setTotalWaitTimeMs] = useState<number>(0);
  const accumulatedWaitTimeRef = useRef<number>(0);
  const waitStartTimeRef = useRef<number | null>(null);
  
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
  useEffect(() => { hitCountRef.current = hitCount; }, [hitCount]); // Sync ref with state
  const [errorCount, setErrorCount] = useState<number>(0);
  // FIX: Declare errorCountRef using useRef
  const errorCountRef = useRef<number>(0);
  useEffect(() => { errorCountRef.current = errorCount; }, [errorCount]); // Sync ref with state
  const [totalNoteCountForGame, setTotalNoteCountForGame] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<ExtendedResult | null>(null);
  const hitNoteIdsRef = useRef<Set<string>>(new Set());
  const playerInputTimesRef = useRef<number[]>([]);
  const firstInputRealTimeRef = useRef<number | null>(null);
  const lastInputRealTimeRef = useRef<number | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null); // Use new interface

  // --- MIDI Device State ---
  // FIX: Only a void function can be called with the 'new' keyword.
  const [midiInputs, setMidiInputs] = useState<Map<string, MIDIInput>>(() => new Map());
  // FIX: Corrected useState initialization for midiOutputs
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
  // const [showOnlyMajorRests, setShowOnlyMajorRests] = useState<boolean>(DEFAULT_SHOW_ONLY_MAJOR_RESTS); // REMOVED
  const [showOnlyMajorNotes, setShowOnlyMajorNotes] = useState<boolean>(DEFAULT_SHOW_ONLY_MAJOR_NOTES); // Changed to use constant
  // NEW: State variables for QWERTY shortcuts and Bar Navigation Buttons.
  const [showQwertyShortcuts, setShowQwertyShortcuts] = useState<boolean>(DEFAULT_SHOW_QWERTY_SHORTCUTS);
  const [hideBarNavigationButtons, setHideBarNavigationButtons] = useState<boolean>(DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS);

  // NEW: QWERTY Keyboard State
  const [qwertyCurrentOctaveShift, setQwertyCurrentOctaveShift] = useState<number>(DEFAULT_QWERTY_OCTAVE_SHIFT);
  const qwertyActiveKeysRef = useRef<Set<string>>(new Set());

  // NEW: Playback tempo multiplier for actual game
  const [playbackTempoMultiplier, setPlaybackTempoMultiplier] = useState<number>(1);
  // NEW: Playback tempo multiplier for preview in ModeSelection
  const [previewPlaybackTempoMultiplier, setPreviewPlaybackTempoMultiplier] = useState<number>(1);

  // NEW: Memoized map for MidiNotePlaybackItem name property
  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
    return map;
  }, []);

  const noteNameToKeyDefMap = useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  // NEW: Map MIDI note to PianoKeyDefinition for QWERTY input handling
  const midiNoteToKeyDefMap = useMemo(() => {
    const map = new Map<number, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key));
    return map;
  }, []);

  // NEW: Memoized `notesForGame` derived from `playbackNotes` and `gameSettings.practiceHand`
  const notesForGame = useMemo(() => {
    if (!gameSettings?.practiceHand || !playbackNotes) {
      return playbackNotes; // If no settings or no notes, return all
    }
    if (gameSettings.practiceHand === 'both') {
      return playbackNotes;
    }
    return playbackNotes.filter(note => note.hand === gameSettings.practiceHand);
  }, [playbackNotes, gameSettings?.practiceHand]);

  // NEW: Memoized piano key positions map
  const keyPositionsMap = useMemo(() => {
    // Only generate positions if width > 0 to avoid division by zero
    if (containerWidth <= 0) return new Map<string, KeyPosition>();

    const whiteKeyWidth = containerWidth / NUM_WHITE_KEYS; // Use NUM_WHITE_KEYS from constants
    // If the calculated whiteKeyWidth is smaller than minWhiteKeyWidth, adjust containerWidth for proper scaling
    const adjustedContainerWidth = Math.max(containerWidth, layoutConfig.minWhiteKeyWidth * NUM_WHITE_KEYS);

    return generateKeyPositions(PIANO_KEYS_CONFIG, adjustedContainerWidth);
  }, [containerWidth, layoutConfig]);

  // NEW: Memoized base calculated piano width
  const baseCalculatedPianoWidth = useMemo(() => {
    if (!keyPositionsMap || keyPositionsMap.size === 0) return containerWidth; // Fallback
    const maxWhiteKeyX = Array.from(keyPositionsMap.values())
        .filter(kp => kp.type === 'white')
        .reduce((max, kp) => Math.max(max, kp.x + kp.width), 0);
    return maxWhiteKeyX;
  }, [keyPositionsMap, containerWidth]);

  // NEW: Memoized `waitMode` from gameSettings
  const waitMode: WaitMode = gameSettings?.waitMode || 'strict';


  const isMetronomeAvailable = useMemo(() => {
    return notesForGame.length > 0 && tempoEvents.length > 0;
  }, [notesForGame.length, tempoEvents.length]);

  const originalTotalMusicalDurationMs = useMemo(() => {
    if (!playbackNotes || playbackNotes.length === 0) return 0;
    const maxTime = playbackNotes.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
    return maxTime;
  }, [playbackNotes]);

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
    setAnalysisResult(analyzeMidi(scaledNotes, effectiveDurationMs, undefined, originalTotalMusicalDurationMs));
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
    return analyzeMidi(scaledNotes, effectiveDurationMs, undefined, originalTotalMusicalDurationMs);
  }, [playbackNotes, originalTotalMusicalDurationMs, previewPlaybackTempoMultiplier]);

  // Define the callback function to update previewPlaybackTempoMultiplier
  const onPlaybackTempoMultiplierChange = useCallback((multiplier: number) => {
    setPreviewPlaybackTempoMultiplier(multiplier);
  }, []);

  // --- Start File Parsers ---
  const parseMidiDataWrapper = useCallback(async (arrayBuffer: ArrayBuffer) => {
    return parseMidiData(arrayBuffer, midiNoteToNameMap);
  }, [midiNoteToNameMap]);

  const parseMusicXmlDataWrapper = useCallback(async (xmlString: string) => {
    return parseMusicXmlData(xmlString, midiNoteToNameMap);
  }, [midiNoteToNameMap]);
  // --- End File Parsers ---

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
        setContainerWidth(contentAreaRef.current.clientWidth);
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
          const pianoKeyboardRequiredHeight = layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight;

          // The remaining height is for the dynamic view (FallingNotesArea or VexFlowSheetMusicView)
          const actualHeightForDynamicView = Math.max(0, totalAvailableContentHeight - progressBarRequiredHeight - pianoKeyboardRequiredHeight);
          
          setContentAreaHeight(actualHeightForDynamicView);
      });
    };

    calculateHeights(); 

    window.addEventListener('resize', calculateHeights);
    const topBarObserver = new ResizeObserver(calculateHeights);
    const topBarElementToObserve = document.querySelector('.flex-shrink-0.bg-slate-800\\/50'); // Updated selector
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
  }, [notesForGame.length, currentScreen, layoutConfig]); // Depend on layoutConfig so height updates when preset changes

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
    
    // Add time spent waiting to totalWaitTimeMs
    if (waitStartTimeRef.current !== null) {
      accumulatedWaitTimeRef.current += (performance.now() - waitStartTimeRef.current);
      waitStartTimeRef.current = null;
    }

    pausedMusicalTimeRef.current = completedBlockTimeMusical;
    setMusicalCurrentTimeMs(completedBlockTimeMusical); // Update musical state

    let newIndex = 0;
    while (newIndex < notesForGame.length && notesForGame[newIndex].timeMs <= completedBlockTimeMusical) { newIndex++; }
    nextNoteIndexRef.current = newIndex;
    performanceStartTimeRef.current = performance.now();
    lastPlayerInputRealTimeRef.current = performance.now(); // Reset lenient timer
    waitingBlockTimeRef.current = null;
    updateNotesCurrentlyWaitingFor(new Set());
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
}, [notesForGame, metronomeMode, scheduleMetronomeSounds, updateNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo, setMusicalCurrentTimeMs]);


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

    const exponent = 9;
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
    updateNotesCurrentlyWaitingFor(new Set());
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
    
    // Reset wait time counters
    setTotalWaitTimeMs(0);
    accumulatedWaitTimeRef.current = 0;
    waitStartTimeRef.current = null;

    playerInputTimesRef.current = [];
    firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null;
    setPerformanceSummary(null);
    setIsLoadingContent(false); // Ensure loading is off on stop
    setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo, setHitCount, setErrorCount, setMusicalCurrentTimeMs]);

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
    const isInWaitState = (waitMode === 'strict' || waitMode === 'lenient' || waitMode === 'retical') && notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    
    if (isInWaitState) { 
      // Musical game logic time is frozen at the waiting point
      actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!; // Use non-null assertion as condition above checks for null
      // musicalCurrentTimeMs state remains frozen as it's not explicitly updated in this branch.
      // This ensures FallingNotesArea and VexFlowSheetMusicView pause visually.

      // --- Calculate and update wait time ---
      if (waitStartTimeRef.current === null) {
        waitStartTimeRef.current = performance.now();
      }
      const currentSessionWait = performance.now() - waitStartTimeRef.current;
      setTotalWaitTimeMs(accumulatedWaitTimeRef.current + currentSessionWait);

    } else {
      // Musical game logic time advances normally
      actualMusicalTimeForGameLogic = conceptualMusicalTime;
      // Update musical time state for FallingNotesArea and VexFlowSheetMusicView
      setMusicalCurrentTimeMs(conceptualMusicalTime);

      // If not waiting, ensure displayed wait time matches the accumulated time
      if (totalWaitTimeMs !== accumulatedWaitTimeRef.current) {
        setTotalWaitTimeMs(accumulatedWaitTimeRef.current);
      }
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
                setHitCount(prev => prev + 1); // Use setter for state update
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

    if ((waitMode === 'strict' || waitMode === 'lenient' || waitMode === 'retical') && notesToSetWaitingThisFrame.length > 0) {
      // FIX: Corrected variable name from `notesToSetWaitingForThisFrame` to `notesToSetWaitingThisFrame`.
      const allWaitingNotesAreTheSameTime = notesToSetWaitingThisFrame.every(n => n.timeMs === notesToSetWaitingThisFrame[0].timeMs);
      if (allWaitingNotesAreTheSameTime) {
        // Immediately stop metronome when entering wait state to prevent sounds during pause.
        if (metronomeMode !== 'off') {
          clearScheduledMetronomeSounds();
          lastMetronomeScheduleTimeRef.current = 0;
          setMetronomeBeat(null);
        }

        waitingBlockTimeRef.current = notesToSetWaitingThisFrame[0].timeMs;
        const waitingMidiNotes = new Set<number>(notesToSetWaitingThisFrame.map(n => n.midi));
        updateNotesCurrentlyWaitingFor(waitingMidiNotes);
        
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
        updateNotesCurrentlyWaitingFor(new Set());
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
    clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, setActivePlaybackNotesInfo,
    setHitCount, setErrorCount, resumePlaybackFromWait, activePlaybackNotesInfo, 
    barLines, totalWaitTimeMs, prevMusicalTimeRef, // Added prevMusicalTimeRef to dependencies
  ]);

  const handleStartGame = (settings: GameSettings) => {
    setGameSettings(settings);
    setPlaybackTempoMultiplier(settings.playbackTempoMultiplier); // Set actual game tempo
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
    lastPlayerInputRealTimeRef.current = performance.now();
    // Initialize musical current times to the paused time
    setMusicalCurrentTimeMs(pausedMusicalTimeRef.current);
    currentTimeRef.current = pausedMusicalTimeRef.current; // Ensure ref is also updated
    prevMusicalTimeRef.current = pausedMusicalTimeRef.current; // Initialize for metronome

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
      window.removeEventListener('focus', handleWindowFocus); // Clean up focus listener
      document.removeEventListener('fullscreenchange', handleFullscreenChange); // Clean up fullscreen listener
    };
  }, [currentScreen, notesForGame.length, handlePlay, clearScheduledNotes, clearScheduledMetronomeSounds, isUserPausedRef, currentTimeRef]);


  const handleSeek = useCallback((newMusicalTime: number) => {
    if (notesForGame.length === 0 || waitMode === 'retical') return;
    const clampedTime = Math.max(0, Math.min(newMusicalTime, originalTotalMusicalDurationMs));

    clearScheduledNotes();
    presatisfiedNoteIdsRef.current = new Set();
    
    updateNotesCurrentlyWaitingFor(new Set());
    waitingBlockTimeRef.current = null;
    if (chordRecognitionTimeoutIdRef.current) {
        clearTimeout(chordRecognitionTimeoutIdRef.current);
        chordRecognitionTimeoutIdRef.current = null;
    }

    if (waitMode === 'off') {
        const notesBeforeSeekTime = notesForGame.filter(n => n.timeMs < clampedTime);
        hitNoteIdsRef.current = new Set(notesBeforeSeekTime.map(n => n.noteId));
        setHitCount(hitNoteIdsRef.current.size); // Use setter for state update
        setErrorCount(0);
    } else {
        hitNoteIdsRef.current = new Set(
            Array.from(hitNoteIdsRef.current).filter(noteId => {
                const note = notesForGame.find(n => n.noteId === noteId);
                return note && note.timeMs < clampedTime;
            })
        );
        setHitCount(hitNoteIdsRef.current.size); // Use setter for state update
    }

    // Reset accumulated wait time on seek
    setTotalWaitTimeMs(0);
    accumulatedWaitTimeRef.current = 0;
    waitStartTimeRef.current = null;

    playerInputTimesRef.current = [];
    firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null;
    setPerformanceSummary(null);
    lastPlayerInputRealTimeRef.current = performance.now();

    pausedMusicalTimeRef.current = clampedTime;
    setMusicalCurrentTimeMs(clampedTime); // Update musical time
    currentTimeRef.current = clampedTime; // Update ref for game logic
    prevMusicalTimeRef.current = clampedTime; // Also update for metronome
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
  }, [notesForGame, originalTotalMusicalDurationMs, clearScheduledNotes, metronomeMode, scheduleMetronomeSounds, clearScheduledMetronomeSounds, setHitCount, updateNotesCurrentlyWaitingFor, waitMode, setErrorCount, setMusicalCurrentTimeMs]);

  const processKeyPressInWaitMode = useCallback((midiNote: number) => {
    const nowRealTime = performance.now();
    if (isPlayingRef.current) {
      lastPlayerInputRealTimeRef.current = nowRealTime;
    }
    // FIX: Use notesCurrentlyWaitingForRef.current for consistency
    const isCurrentlyWaiting = notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    const nowMusical = currentTimeRef.current; // Snapshot current musical time
    
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
                        setHitCount(prev => prev + 1); // Use setter for state update
                        hitNoteIdsRef.current.add(noteToSatisfy.noteId);
                    }
                    visuallySatisfyNote(noteToSatisfy);
                    recordPlayerInputTime(nowRealTime, waitingBlockTimeRef.current!);
        
                    const allInstancesOfMidi = waitingNotes.filter(n => n.midi === midiNote);
                    const areAllInstancesHit = allInstancesOfMidi.every(n => hitNoteIdsRef.current.has(n.noteId));
        
                    const newWaitingSet = new Set<number>(notesCurrentlyWaitingForRef.current);
                    if (areAllInstancesHit) { // Corrected: `areAllInstancesOfMidi` -> `areAllInstancesHit`
                        newWaitingSet.delete(midiNote);
                    }
                    
                    updateNotesCurrentlyWaitingFor(newWaitingSet);
        
                    if (newWaitingSet.size === 0) {
                        resumePlaybackFromWait();
                    }
                }
            } else {
                setErrorCount(prev => prev + 1); // Use setter for state update
            }
        } else if (waitMode === 'lenient' || waitMode === 'retical') {
            if (chordRecognitionTimeoutIdRef.current) {
                clearTimeout(chordRecognitionTimeoutIdRef.current);
            }
            rhythmChordBufferRef.current.clear();

            const waitingNoteDefs = notesForGame.filter(n => n.timeMs === waitingBlockTimeRef.current && notesCurrentlyWaitingForRef.current.has(n.midi));
            const waitingMidiNotes = new Set(waitingNoteDefs.map(n => n.midi));
            
            if (waitingMidiNotes.has(midiNote)) {
                const noteToSatisfy = waitingNoteDefs.find(n => n.midi === midiNote && !hitNoteIdsRef.current.has(n.noteId));
                if (noteToSatisfy) {
                    if (!hitNoteIdsRef.current.has(noteToSatisfy.noteId)) {
                        setHitCount(prev => prev + 1);
                        hitNoteIdsRef.current.add(noteToSatisfy.noteId);
                    }
                    visuallySatisfyNote(noteToSatisfy);
                    recordPlayerInputTime(nowRealTime, waitingBlockTimeRef.current!);
                }
            } else {
                setErrorCount(prev => prev + 1);
            }
            resumePlaybackFromWait();
        }
    } else { 
      // This block handles key presses when playback is flowing (e.g., in lenient/retical mode).
      // It finds the best match for a key press within a time window, which is crucial for
      // correctly handling fast passages and trills where multiple notes of the same pitch may be close together.
      let hitRegistered = false;
      
      // Define a generous window to find potential note matches.
      // The logic will then pick the note closest in time to the player's input.
      const LATE_TOLERANCE_MS = 500; // How late the player can be (as requested).
      const EARLY_TOLERANCE_MS = 2000; // How early the player can be (kept large for responsiveness).

      let bestMatch: MidiNotePlaybackItem | null = null;
      let minTimeDiff = Infinity;

      // To optimize, search only in a relevant slice of the notes array.
      const searchStartIdx = Math.max(0, nextNoteIndexRef.current - 10);
      const searchEndIdx = Math.min(notesForGame.length, nextNoteIndexRef.current + 50);

      for (let i = searchStartIdx; i < searchEndIdx; i++) {
          const note = notesForGame[i];

          // Check if the note is a potential candidate
          if (
              note.midi === midiNote &&
              !presatisfiedNoteIdsRef.current.has(note.noteId) &&
              note.timeMs > nowMusical - LATE_TOLERANCE_MS &&
              note.timeMs <= nowMusical + EARLY_TOLERANCE_MS
          ) {
              const timeDiff = Math.abs(note.timeMs - nowMusical);
              if (timeDiff < minTimeDiff) {
                  minTimeDiff = timeDiff;
                  bestMatch = note;
              }
          }
      }

      if (bestMatch) {
          // A match was found, so we satisfy it.
          if (!hitNoteIdsRef.current.has(bestMatch.noteId)) {
              setHitCount(prev => prev + 1);
              hitNoteIdsRef.current.add(bestMatch.noteId);
          }
          satisfyUpcomingNote(bestMatch);
          recordPlayerInputTime(nowRealTime, bestMatch.timeMs);
          hitRegistered = true;
      }

      if (!hitRegistered) {
          // If no note was hit, check if it was a mistake (i.e., if there were other notes nearby to be played).
          const isAnyNoteRelevantForContext = notesForGame.some(n =>
              n.timeMs > nowMusical - (LATE_TOLERANCE_MS + 500) &&
              n.timeMs <= nowMusical + (EARLY_TOLERANCE_MS + 500) &&
              !presatisfiedNoteIdsRef.current.has(n.noteId)
          );

          if (isAnyNoteRelevantForContext) {
              setErrorCount(prev => prev + 1);
          }
      }
    }
  }, [notesForGame, waitMode, visuallySatisfyNote, satisfyUpcomingNote, playbackTempoMultiplier, recordPlayerInputTime, setHitCount, setErrorCount, resumePlaybackFromWait, notesCurrentlyWaitingForRef, updateNotesCurrentlyWaitingFor]);

  const handleUiKeyPress = useCallback((keyName: string, midiNote: number) => {
    setUserSustainedKeys(prev => new Set(prev).add(keyName));
    startSustainedSound(keyName, midiNote);
    if (isPlayingRef.current) {
      processKeyPressInWaitMode(midiNote);
    }
  }, [isPlayingRef, processKeyPressInWaitMode, startSustainedSound]);

  const handleUiKeyRelease = useCallback((keyName: string, midiNote: number) => {
    setUserSustainedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(keyName);
      return newSet;
    });
    stopSustainedSound(keyName, midiNote);
  }, [stopSustainedSound]);
  
  const loadFile = useCallback(async (file: File | null, onlineSongId?: string | null, isRanked: boolean | null = null) => {
    setIsLoadingFile(true);
    handleStopPlayback();
    setPlaybackNotes([]);
    setCurrentFileName(null);
    setCurrentOnlineSongId(onlineSongId || null); // NEW: Set online song ID
    setIsCurrentSongRanked(isRanked); // NEW: Set ranked status
    setMusicalCurrentTimeMs(0); // Reset musical time
    pausedMusicalTimeRef.current = 0;
    prevMusicalTimeRef.current = 0; // Reset for metronome visual
    setTempoEvents([]);
    setSignatureEvents([]);
    setCurrentTempoBpm(null);
    setInitialTimeSignature(DEFAULT_TIME_SIGNATURE);
    setInitialKeySignature(DEFAULT_KEY_SIGNATURE);
    setCurrentFileType(FileType.UNKNOWN);
    setBarLines([]);
    hitNoteIdsRef.current.clear();
    setHitCount(0);
    setErrorCount(0);
    setTotalNoteCountForGame(0);
    setAnalysisResult(null);
    setPlaybackTempoMultiplier(1); // Reset actual game tempo when loading new file
    setPreviewPlaybackTempoMultiplier(1); // Reset preview tempo when loading new file
    isUserPausedRef.current = false; // Reset user pause state on new file load
    
    // Reset accumulated wait time
    setTotalWaitTimeMs(0);
    accumulatedWaitTimeRef.current = 0;
    waitStartTimeRef.current = null;

    if (!file) { // Handle null file case
        setIsLoadingFile(false);
        setSelectedOnlineSongIdForNavigation(null);
        setIsCurrentSongRanked(null); // Clear ranked status if no file
        return;
    }

    try {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        let parsedDataNotes: MidiNotePlaybackItem[] = [], timeSig: TimeSignatureInfo = DEFAULT_TIME_SIGNATURE;
        let initialTempo: number = DEFAULT_MUSICXML_TEMPO_BPM, tempos: TempoEvent[] = [], fileType: FileType = FileType.UNKNOWN, keySig: string = DEFAULT_KEY_SIGNATURE;
        let newBarLines: number[] = [], newSigEvents: SignatureEvent[] = [];

        if (fileExtension === 'mid' || fileExtension === 'midi' || file.type.includes('midi')) {
            fileType = FileType.MIDI;
            const midiArrayBuffer = await file.arrayBuffer();
            const result = await parseMidiDataWrapper(midiArrayBuffer);
            ({ notes: parsedDataNotes, timeSignature: timeSig, keySignature: keySig, initialTempoBpm: initialTempo, tempoEvents: tempos, barLinesMs: newBarLines, signatureEvents: newSigEvents } = result);

        } else if (fileExtension === 'xml' || fileExtension === 'musicxml' || file.type.includes('xml')) {
            fileType = FileType.MUSICXML;
            const xmlText = await file.text();
            const result = await parseMusicXmlDataWrapper(xmlText);
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
                const result = await parseMusicXmlDataWrapper(xmlText);
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

    } catch (error: unknown) {
        // FIX: Replaced `(error as any).message` with `(error instanceof Error ? error.message : String(error))`
        // to handle unknown error types more robustly, and wrapped with String() for console/alert safety.
        console.error("Error loading or parsing file:", error);
        alert("Sorry, there was an error processing this file. Please try another one. Details: " + (error instanceof Error ? error.message : String(error)));
        setPlaybackNotes([]);
        setCurrentFileName(null);
        setCurrentOnlineSongId(null); // Clear online song ID on error
        setIsCurrentSongRanked(null); // Clear ranked status on error
    } finally {
        setIsLoadingFile(false);
        setSelectedOnlineSongIdForNavigation(null);
    }
  }, [handleStopPlayback, preloadSamplesForSong, parseMidiDataWrapper, parseMusicXmlDataWrapper, setHitCount, setErrorCount, setMusicalCurrentTimeMs, setSelectedOnlineSongIdForNavigation]);
  
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
        console.error("MIDI access request failed:", err);
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
  const DEBOUNCE_TIME_MS = 500;
  const handleBarNavigation = useCallback((direction: 'forward' | 'backward') => {
      const now = Date.now();
      if (now - barNavDebounceRef.current < DEBOUNCE_TIME_MS) return;
      barNavDebounceRef.current = now;

      if (!barLines || barLines.length < 2) return;
      const currentMusicalTime = isPlayingRef.current ? currentTimeRef.current : pausedMusicalTimeRef.current;
      
      let targetBarTime: number | undefined;
      
      if (direction === 'forward') {
          targetBarTime = barLines.find(barTime => barTime > currentMusicalTime + 10); // +10ms to avoid staying on current bar
      } else { // backward
          const previousBars = barLines.filter(barTime => barTime < currentMusicalTime - 10);
          targetBarTime = previousBars.length > 0 ? previousBars[previousBars.length - 1] : barLines[0];
      }
      
      if (targetBarTime !== undefined) {
          handleSeek(targetBarTime);
      } else if (direction === 'forward') {
          // FIX: Cannot find name 'totalDurationMs'. Corrected to 'originalTotalMusicalDurationMs'.
          handleSeek(originalTotalMusicalDurationMs);
      }
  // FIX: Cannot find name 'totalDurationMs'. Corrected to 'originalTotalMusicalDurationMs'.
  }, [barLines, originalTotalMusicalDurationMs, handleSeek, currentTimeRef, pausedMusicalTimeRef, isPlayingRef]); // Added dependencies

  // --- QWERTY Keyboard Handling ---
  const handleQwertyKeyDown = useCallback((event: KeyboardEvent) => {
    const code = event.code.toLowerCase();
    if (qwertyActiveKeysRef.current.has(code) || event.repeat) return;
    
    // Octave Shift
    if (OCTAVE_DOWN_KEYS.includes(code)) {
      setQwertyCurrentOctaveShift(prev => Math.max(MIN_QWERTY_OCTAVE_SHIFT, prev - 1));
      qwertyActiveKeysRef.current.add(code);
      return;
    }
    if (OCTAVE_UP_KEYS.includes(code)) {
      setQwertyCurrentOctaveShift(prev => Math.min(MAX_QWERTY_OCTAVE_SHIFT, prev + 1));
      qwertyActiveKeysRef.current.add(code);
      return;
    }
    
    // Note Playing
    const mapping = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.qwertyKey === code);
    if (mapping) {
      const midiNote = mapping.midiBase + (qwertyCurrentOctaveShift * 12);
      const keyDef = midiNoteToKeyDefMap.get(midiNote);
      if (keyDef) {
        qwertyActiveKeysRef.current.add(code);
        handleUiKeyPress(keyDef.name, keyDef.midiNote);
      }
    }
  }, [qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyPress]);
  
  const handleQwertyKeyUp = useCallback((event: KeyboardEvent) => {
    const code = event.code.toLowerCase();
    
    if (qwertyActiveKeysRef.current.has(code)) {
        qwertyActiveKeysRef.current.delete(code);
    }
    
    // Octave keys don't play notes, so just return
    if (OCTAVE_DOWN_KEYS.includes(code) || OCTAVE_UP_KEYS.includes(code)) {
      return;
    }
    
    const mapping = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.qwertyKey === code);
    if (mapping) {
      const midiNote = mapping.midiBase + (qwertyCurrentOctaveShift * 12);
      const keyDef = midiNoteToKeyDefMap.get(midiNote);
      if (keyDef) {
        handleUiKeyRelease(keyDef.name, keyDef.midiNote);
      }
    }
  }, [qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyRelease]);

  useEffect(() => {
    if (currentScreen === 'inGame') {
      window.addEventListener('keydown', handleQwertyKeyDown);
      window.addEventListener('keyup', handleQwertyKeyUp);
    } else {
      window.removeEventListener('keydown', handleQwertyKeyDown);
      window.removeEventListener('keyup', handleQwertyKeyUp);
    }
    
    return () => {
      window.removeEventListener('keydown', handleQwertyKeyDown);
      window.removeEventListener('keyup', handleQwertyKeyUp);
    };
  }, [currentScreen, handleQwertyKeyDown, handleQwertyKeyUp]);

  // Handle hotkeys for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (currentScreen !== 'inGame' || notesForGame.length === 0 || waitMode === 'retical' || hideBarNavigationButtons) return;
        
        if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        if (e.key === 'ArrowRight') {
            handleBarNavigation('forward');
        } else if (e.key === 'ArrowLeft') {
            handleBarNavigation('backward');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, notesForGame, waitMode, hideBarNavigationButtons, handleBarNavigation]);

  // NEW: Callbacks for Settings component props
  const onViewModeChange = useCallback((mode: ViewMode) => setViewMode(mode), []);
  const onNoteLabelTypeChange = useCallback((type: NoteLabelType) => setNoteLabelType(type), []);
  const onShowOnlyMajorNotesChange = useCallback((value: boolean) => setShowOnlyMajorNotes(value), []);
  const onShowQwertyShortcutsChange = useCallback((value: boolean) => setShowQwertyShortcuts(value), []);
  const onHideBarNavigationButtonsChange = useCallback((value: boolean) => setHideBarNavigationButtons(value), []);
  const onMasterVolumeChange = useCallback((volume: number) => setMasterVolume(volume), []);
  const onMetronomeVolumeChange = useCallback((volume: number) => setMetronomeVolume(volume), []);
  const onThemeSettingsChange = useCallback((settings: ThemeSettings) => setThemeSettings(settings), []);
  const onDevicePresetChange = useCallback((preset: DevicePreset) => setDevicePreset(preset), []);
  const onCustomWhiteKeyHeightChange = useCallback((height: number) => setCustomWhiteKeyHeight(height), []);
  const onCustomBlackKeyHeightChange = useCallback((height: number) => setCustomBlackKeyHeight(height), []);
  const onCustomKeyLabelHeightChange = useCallback((height: number) => setCustomKeyLabelHeight(height), []);
  const onCustomMinWhiteKeyWidthChange = useCallback((width: number) => setCustomMinWhiteKeyWidth(width), []);

  // NEW: Reset Settings to Default
  const handleResetToDefaults = useCallback(() => {
    if (window.confirm("Are you sure you want to reset all settings to their default values?")) {
      setViewMode(DEFAULT_VIEW_MODE);
      setNoteLabelType(DEFAULT_NOTE_LABEL_TYPE);
      // setShowOnlyMajorRests(DEFAULT_SHOW_ONLY_MAJOR_RESTS); // REMOVED
      setShowOnlyMajorNotes(DEFAULT_SHOW_ONLY_MAJOR_NOTES);
      setShowQwertyShortcuts(DEFAULT_SHOW_QWERTY_SHORTCUTS);
      setHideBarNavigationButtons(DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS);
      setMasterVolume(DEFAULT_MASTER_VOLUME);
      setMetronomeVolume(DEFAULT_METRONOME_VOLUME);
      setThemeSettings(DEFAULT_THEME_SETTINGS);
      setDevicePreset('desktop'); // Reset preset
      setCustomWhiteKeyHeight(DEVICE_LAYOUTS.desktop.whiteKeyHeight);
      setCustomBlackKeyHeight(DEVICE_LAYOUTS.desktop.blackKeyHeight);
      setCustomKeyLabelHeight(DEVICE_LAYOUTS.desktop.keyLabelHeight);
      setCustomMinWhiteKeyWidth(DEVICE_LAYOUTS.desktop.minWhiteKeyWidth);
    }
  }, []);

  const pixelsPerMillisecond = useMemo(() => {
    return BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier;
  }, [noteSpeedMultiplier]);
  
  const handleExitGame = () => {
    handleStopPlayback();
    setGameSettings(null);
    setCurrentScreen('songSelection');
  };


  const activeTempoBpm = useMemo(() => {
    let activeBpm = currentTempoBpm || DEFAULT_MUSICXML_TEMPO_BPM;
    const sortedEvents = [...tempoEvents].sort((a,b) => a.timeMs - b.timeMs);
    for (const event of sortedEvents) {
      if (event.timeMs <= musicalCurrentTimeMs) {
        activeBpm = event.bpm;
      } else {
        break;
      }
    }
    return activeBpm * playbackTempoMultiplier;
  }, [musicalCurrentTimeMs, tempoEvents, currentTempoBpm, playbackTempoMultiplier]);

  const effectiveKeySignature = useMemo(() => {
    return getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature);
  }, [musicalCurrentTimeMs, signatureEvents, initialKeySignature]);
  
  // NEW: When entering inGame, after a short delay, remove the loading state
  // and set user pause to false to allow auto-play if applicable (e.g., on window focus)
  useEffect(() => {
    if (currentScreen === 'inGame' && isLoadingContent) {
      const timer = setTimeout(() => {
        setIsLoadingContent(false);
        // Only trigger auto-play if waitMode is off.
        if (waitMode === 'off') {
            isUserPausedRef.current = false;
            if (document.hasFocus()) {
                handlePlay();
            }
        } else {
            // In wait modes, start paused.
            isUserPausedRef.current = true;
        }
      }, 500); // Small delay to allow UI to settle
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isLoadingContent, handlePlay, waitMode]);

  // NEW: Save score to Supabase after game completion in Retical mode
  useEffect(() => {
    const saveReticalScore = async () => {
      // Only save if it's an online song, in retical mode, and user is logged in.
      // The `isCurrentSongRanked` check is removed here to save all retical scores.
      if (performanceSummary && !isPlaying && gameSettings?.waitMode === 'retical' && session && currentOnlineSongId) {
        try {
          const { error } = await supabase.from('scores').insert({
            user_id: session.user.id,
            song_id: currentOnlineSongId,
            final_score: performanceSummary.finalScore,
            accuracy: performanceSummary.accuracy,
            speed: performanceSummary.speed,
            rank: performanceSummary.rank,
            notes_hit: performanceSummary.hitCount,
            errors: performanceSummary.errorCount,
            total_notes: performanceSummary.totalNoteCount,
            mode: 'retical',
          });
          if (error) throw error;
        } catch (error) {
          console.error("Error saving score:", error);
          // Optionally, display an error message to the user
        }
      }
    };

    saveReticalScore();
  }, [performanceSummary, isPlaying, gameSettings, session, currentOnlineSongId]); // isCurrentSongRanked removed from dependencies

  // NEW: Function to navigate to SongSelection with a specific online song ID
  const handleGoToOnlineSongSelection = useCallback((songId: string) => {
      setSelectedOnlineSongIdForNavigation(songId);
      setCurrentScreen('songSelection');
  }, []);


  // Destructure hand colors from themeSettings
  const { rightHandColor, leftHandColor } = themeSettings;

  // Main render logic
  return (
      <div className="bg-slate-900 text-white min-h-screen flex flex-col font-sans">
        {currentScreen === 'mainMenu' && (
          <MainMenu 
            onPlay={() => setCurrentScreen('songSelection')} 
            onSettings={() => setCurrentScreen('settings')} 
            onLeaderboard={() => setCurrentScreen('leaderboard')}
            onOpenLoginModal={() => setIsAuthModalOpen(true)}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
          />
        )}
        
        {currentScreen === 'leaderboard' && (
          // FIX: Add `onGoToOnlineSong` prop to Leaderboard component.
          <Leaderboard 
            onBack={() => setCurrentScreen('mainMenu')} 
            onGoToOnlineSong={handleGoToOnlineSongSelection}
          />
        )}

        {currentScreen === 'songSelection' && (
            <SongSelection
                onFileLoaded={loadFile}
                onSongSelected={() => setCurrentScreen('modeSelection')}
                onBack={() => {
                  setCurrentScreen('mainMenu');
                  setSelectedOnlineSongIdForNavigation(null); // Clear navigation flag when going back
                }}
                loadedSongName={currentFileName}
                analysisResult={analysisResult}
                isLoading={isLoadingFile || isPreloading}
                selectedOnlineSongIdForNavigation={selectedOnlineSongIdForNavigation}
                onGoToOnlineSong={handleGoToOnlineSongSelection}
            />
        )}
        
        {currentScreen === 'modeSelection' && (
          <ModeSelection
            onStartGame={handleStartGame}
            onBack={() => setCurrentScreen('songSelection')}
            analysisResult={analysisResult}
            analysisResultForPreview={analysisResultForPreview}
            fileName={currentFileName}
            initialTempoBpm={currentTempoBpm}
            initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier}
            onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange}
            currentHideBarNavigationButtons={hideBarNavigationButtons}
            onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange}
          />
        )}

        {currentScreen === 'settings' && (
            <Settings
                onBack={() => setCurrentScreen('mainMenu')}
                midiAccessStatus={midiAccessStatus}
                midiInputs={midiInputs}
                selectedMidiInputId={selectedMidiInputId}
                onSelectMidiInput={setSelectedMidiInputId}
                midiOutputs={midiOutputs}
                selectedMidiOutputId={selectedMidiOutputId}
                onSelectMidiOutput={setSelectedMidiOutputId}
                connectMidi={connectMidi}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                noteLabelType={noteLabelType}
                onNoteLabelTypeChange={onNoteLabelTypeChange}
                // showOnlyMajorRests={showOnlyMajorRests} // REMOVED
                // onShowOnlyMajorRestsChange={onShowOnlyMajorRestsChange} // REMOVED
                showOnlyMajorNotes={showOnlyMajorNotes}
                onShowOnlyMajorNotesChange={onShowOnlyMajorNotesChange}
                showQwertyShortcuts={showQwertyShortcuts}
                onShowQwertyShortcutsChange={onShowQwertyShortcutsChange}
                hideBarNavigationButtons={hideBarNavigationButtons}
                onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange}
                masterVolume={masterVolume}
                onMasterVolumeChange={onMasterVolumeChange}
                metronomeVolume={metronomeVolume}
                onMetronomeVolumeChange={onMetronomeVolumeChange}
                themeSettings={themeSettings}
                onThemeSettingsChange={onThemeSettingsChange}
                onResetToDefaults={handleResetToDefaults}
                devicePreset={devicePreset}
                onDevicePresetChange={onDevicePresetChange}
                customWhiteKeyHeight={customWhiteKeyHeight}
                onCustomWhiteKeyHeightChange={onCustomWhiteKeyHeightChange}
                customBlackKeyHeight={customBlackKeyHeight}
                onCustomBlackKeyHeightChange={onCustomBlackKeyHeightChange}
                customKeyLabelHeight={customKeyLabelHeight}
                onCustomKeyLabelHeightChange={onCustomKeyLabelHeightChange}
                customMinWhiteKeyWidth={customMinWhiteKeyWidth}
                onCustomMinWhiteKeyWidthChange={onCustomMinWhiteKeyWidthChange}
            />
        )}

        {currentScreen === 'inGame' && (
          <>
            <TopBar
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStopPlayback}
                onExit={handleExitGame}
                isPlaying={isPlaying}
                isFileLoaded={playbackNotes.length > 0}
                fileName={currentFileName}
                waitMode={waitMode}
                metronomeMode={metronomeMode}
                onCycleMetronomeMode={() => setMetronomeMode(prev => prev === 'off' ? 'bar' : 'off')}
                isMetronomeAvailable={isMetronomeAvailable}
                hitCount={hitCount}
                errorCount={errorCount}
                totalNoteCount={totalNoteCountForGame}
                currentTimeMs={musicalCurrentTimeMs}
                totalDurationMs={originalTotalMusicalDurationMs}
                viewMode={viewMode}
                noteSpeedMultiplier={noteSpeedMultiplier}
                onNoteSpeedMultiplierChange={setNoteSpeedMultiplier}
                sheetMusicZoom={sheetMusicZoom}
                onSheetMusicZoomChange={setSheetMusicZoom}
                analysisResult={analysisResult}
                metronomeBeat={metronomeBeat}
                totalWaitTimeMs={totalWaitTimeMs} // NEW: Pass the wait time prop
            />
            <div ref={contentAreaRef} className="flex-grow flex flex-col justify-end items-center relative overflow-hidden">
                {isLoadingContent ? (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30">
                     <div className="flex items-center space-x-3 p-4 text-sky-300 font-semibold text-lg">
                        <svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading Game...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <BarNavigationControls
                      onNavigate={handleBarNavigation}
                      isFileLoaded={notesForGame.length > 0}
                      waitMode={waitMode}
                      hideControls={hideBarNavigationButtons}
                    />

                    {/* NEW: Single wrapper for all horizontally transformed content */}
                    <div
                      className="flex flex-col justify-end"
                      style={{
                        width: `${baseCalculatedPianoWidth}px`,
                        height: '100%',
                      }}
                    >
                      <div className="relative flex-grow w-full">
                        {viewMode === 'falling' ? (
                          <FallingNotesArea
                            notes={notesForGame}
                            currentTimeMs={musicalCurrentTimeMs}
                            keyPositions={keyPositionsMap}
                            activeMidiNotesInfo={activePlaybackNotesInfo}
                            width={baseCalculatedPianoWidth}
                            actualHeight={contentAreaHeight}
                            pixelsPerMillisecond={pixelsPerMillisecond}
                            barLines={barLines}
                            noteLabelType={noteLabelType}
                            rightHandColor={themeSettings.rightHandColor}
                            leftHandColor={themeSettings.leftHandColor}
                            backgroundColor={themeSettings.fallingNotesBackgroundColor}
                            activeKeySignature={effectiveKeySignature}
                            showOnlyMajorNotes={showOnlyMajorNotes}
                            activeTempoBpm={activeTempoBpm}
                          />
                        ) : (
                          <VexFlowSheetMusicView
                            notes={notesForGame}
                            timeSignature={initialTimeSignature}
                            keySignature={initialKeySignature}
                            initialTempoBpm={currentTempoBpm || 120}
                            width={baseCalculatedPianoWidth}
                            height={contentAreaHeight}
                            currentTimeMs={musicalCurrentTimeMs}
                            totalDurationMs={originalTotalMusicalDurationMs}
                            activePlaybackNotesInfo={activePlaybackNotesInfo}
                            onSeek={handleSeek}
                            isPlaying={isPlaying}
                            sheetMusicZoom={sheetMusicZoom}
                            onLayoutRendered={setRenderedLayoutId}
                            barLines={barLines}
                            rightHandColor={themeSettings.rightHandColor}
                            leftHandColor={themeSettings.leftHandColor}
                            signatureEvents={signatureEvents}
                            showOnlyMajorRests={false}
                            tempoEvents={tempoEvents}
                            playbackTempoMultiplier={playbackTempoMultiplier}
                          />
                        )}
                      </div>
                      
                      {notesForGame.length > 0 && (
                        <div className="w-full">
                          <ProgressBar
                            currentTimeMs={musicalCurrentTimeMs}
                            totalDurationMs={originalTotalMusicalDurationMs}
                            width={baseCalculatedPianoWidth}
                            height={PROGRESS_BAR_HEIGHT_PX}
                            onSeek={handleSeek}
                            isPlaybackActive={isPlaying}
                            isSeekingDisabled={waitMode === 'retical'}
                          />
                        </div>
                      )}
                      
                      <div 
                        className="relative flex-shrink-0"
                        style={{ 
                            width: '100%',
                            height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px`
                        }}
                      >
                        <PianoKeyboard
                          keyPositions={Array.from(keyPositionsMap.values())}
                          userSustainedKeys={userSustainedKeys}
                          userActiveKeys={userActiveKeys}
                          activeMidiNotesInfo={activeMidiNotesInfoForKeyboard}
                          onUiKeyPress={handleUiKeyPress}
                          onUiKeyRelease={handleUiKeyRelease}
                          rightHandColor={rightHandColor}
                          leftHandColor={leftHandColor}
                          showQwertyShortcuts={showQwertyShortcuts}
                          qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                          width={baseCalculatedPianoWidth}
                          layoutConfig={layoutConfig}
                        />
                      </div>
                    </div>
                  </>
                )}
            </div>

            <PerformanceSummaryModal 
                isVisible={!!performanceSummary} 
                summary={performanceSummary} 
                onClose={handleClosePerformanceSummary}
            />
          </>
        )}
        
        {/* Auth Modals */}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <AccountModal 
          isOpen={isAccountModalOpen} 
          onClose={() => setIsAccountModalOpen(false)} 
          onGoToOnlineSong={handleGoToOnlineSongSelection}
        />
      </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
