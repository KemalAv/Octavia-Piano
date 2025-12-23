
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { KeyPosition, PianoKeyDefinition, MidiNotePlaybackItem, ActiveMidiNoteInfo, MIDIInput, MIDIMessageEvent, MIDIAccess, MIDIOutput, TimeSignatureInfo, FileType, ExtendedResult, MidiAccessStatus, MetronomeMode, WaitMode, ViewMode, Screen, GameSettings, NoteLabelType, PracticeHand, ThemeSettings, PerformanceSummary, TempoEvent, DevicePreset, LayoutDimensions, QwertyLayout, BeatInfo, FreePlayLiveNote } from './types';
import {
  PIANO_KEYS_CONFIG,
  BLACK_KEY_WIDTH_RATIO, BLACK_KEY_OFFSET_RATIO,
  PROGRESS_BAR_HEIGHT_PX,
  HAND_SPLIT_MIDI_NOTE,
  BASE_PIXELS_PER_MILLISECOND,
  QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, OCTAVE_DOWN_KEYS, OCTAVE_UP_KEYS, INTERACTIVE_NOTE_DURATION_MS,
  DEFAULT_QWERTY_OCTAVE_SHIFT, MIN_QWERTY_OCTAVE_SHIFT, MAX_QWERTY_OCTAVE_SHIFT,
  DEFAULT_MASTER_VOLUME, DEFAULT_METRONOME_VOLUME, DEFAULT_VIEW_MODE,
  DEFAULT_NOTE_LABEL_TYPE, DEFAULT_SHOW_ONLY_MAJOR_NOTES,
  DEFAULT_SHOW_QWERTY_SHORTCUTS, DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS,
  DEFAULT_THEME_SETTINGS, DEVICE_LAYOUTS,
  DEFAULT_AUTO_HIDE_TOP_BAR,
  DEFAULT_SHOW_PIANO_TILES_BACKGROUND,
  VISUAL_NOTE_CAP_MS,
  FREE_PLAY_ARPEGGIO_WINDOW_MS
} from './constants';
import PianoKeyboard from './components/PianoKeyboard';
import TopBar from './components/TopBar';
import ProgressBar from './components/ProgressBar';
import MainMenu from './components/MainMenu';
import SongSelection from './components/SongSelection';
import ModeSelection from './components/ModeSelection';
import Settings from './components/Settings';
import AuthModal from './AuthModal'; 
import AccountModal from './components/AccountModal'; 
import JSZip, { JSZipObject } from 'jszip';
import { assignFingering } from './fingering';
import { analyzeMidi } from './midiAnalysis';
import VexFlowSheetMusicView from './components/VexFlowSheetMusicView';
import HorizontalNotesView from './components/HorizontalNotesView';
import BarNavigationControls from './components/BarNavigationControls';
import PerformanceSummaryModal from './components/PerformanceSummaryModal';
import { FallingNotesArea } from './components/FallingNotesArea';
import { getActiveKeySignature, getActiveTimeSignature, SignatureEvent, getActiveTempoBpmAtOriginalTime, getBeatTimesInWindow } from './utils'; 
import { AuthProvider, useAuth } from './AuthContext'; 
import { supabase } from './supabaseClient'; 
import { 
  parseMidiData, 
  parseMusicXmlData, 
  INITIAL_PLAYBACK_DELAY_MS, 
  DEFAULT_TIME_SIGNATURE, 
  DEFAULT_KEY_SIGNATURE,
  DEFAULT_MUSICXML_TEMPO_BPM
} from './midiParser'; 
import { getVexFlowRenderData } from './vexflow-helper';
import Leaderboard from './components/Leaderboard';
import ChordDisplay from './components/ChordDisplay';
import { Midi } from '@tonejs/midi';
import GameOverModal from './components/GameOverModal';


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
    positions.set(key.name, { name: key.name, x: currentX, width: whiteKeyWidth, type: 'white' });
    currentX += whiteKeyWidth;
  });
  keysConfig.forEach(key => {
    if (key.type === 'black') {
      const precedingWhiteKeyMidi = key.midiNote - 1;
      const precedingWhiteKeyName = midiToNameMap.get(precedingWhiteKeyMidi);
      if (precedingWhiteKeyName) {
        const whiteKeyPos = positions.get(precedingWhiteKeyName);
        if (whiteKeyPos) {
          positions.set(key.name, { name: key.name, x: whiteKeyPos.x + whiteKeyWidth * BLACK_KEY_OFFSET_RATIO, width: blackKeyWidth, type: 'black' });
        }
      }
    }
  });
  return positions;
};

interface MetronomeAudioNode {
  oscillator?: OscillatorNode;
  source?: AudioBufferSourceNode; 
  gainNode: GainNode;
}

interface ActiveAudioNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}

const END_PLAYBACK_DELAY_MS = 200; 
const UI_CLICK_SOUND_SEQUENCE_MIDI = [60, 62, 64, 65, 67, 69, 71]; 

const PITCH_CLASS_TO_NAME: { [key: number]: string } = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

/**
 * Chord Formulas based on semitone intervals from root
 */
const CHORD_FORMULAS: { [key: string]: { name: string, intervals: number[] } } = {
  // TRIADS
  '0,4,7': { name: '', intervals: [0, 4, 7] },            // Major
  '0,3,7': { name: 'm', intervals: [0, 3, 7] },           // Minor
  '0,3,6': { name: 'dim', intervals: [0, 3, 6] },         // Diminished
  '0,4,8': { name: 'aug', intervals: [0, 4, 8] },         // Augmented
  '0,5,7': { name: 'sus4', intervals: [0, 5, 7] },        // Sus4
  '0,2,7': { name: 'sus2', intervals: [0, 2, 7] },        // Sus2
  
  // SIXTHS
  '0,4,7,9': { name: '6', intervals: [0, 4, 7, 9] },      // Major 6th
  '0,3,7,9': { name: 'm6', intervals: [0, 3, 7, 9] },     // Minor 6th

  // SEVENTHS
  '0,4,7,10': { name: '7', intervals: [0, 4, 7, 10] },    // Dominant 7th
  '0,4,7,11': { name: 'maj7', intervals: [0, 4, 7, 11] }, // Major 7th
  '0,3,7,10': { name: 'm7', intervals: [0, 3, 7, 10] },   // Minor 7th
  '0,3,6,10': { name: 'm7b5', intervals: [0, 3, 6, 10] }, // Half-Diminished
  '0,3,6,9': { name: 'dim7', intervals: [0, 3, 6, 9] },   // Diminished 7th
  '0,5,7,10': { name: '7sus4', intervals: [0, 5, 7, 10] },// 7sus4

  // NINTHS (include 7th)
  '0,2,4,7,10': { name: '9', intervals: [0, 2, 4, 7, 10] },     // Dominant 9th
  '0,2,4,7,11': { name: 'maj9', intervals: [0, 2, 4, 7, 11] },  // Major 9th
  '0,2,3,7,10': { name: 'm9', intervals: [0, 2, 3, 7, 10] },    // Minor 9th
  
  // ADD NINE (no 7th)
  '0,2,4,7': { name: 'add9', intervals: [0, 2, 4, 7] },
  '0,2,3,7': { name: 'madd9', intervals: [0, 2, 3, 7] },

  // ELEVENTHS & THIRTEENTHS (simplified)
  '0,4,5,7,10': { name: '11', intervals: [0, 4, 5, 7, 10] },
  '0,4,7,9,10': { name: '13', intervals: [0, 4, 7, 9, 10] },

  // ALTERED
  '0,4,7,10,13': { name: '7b9', intervals: [0, 4, 7, 10, 1] }, // Root + Major Triad + b7 + b9
  '0,4,7,10,15': { name: '7#9', intervals: [0, 4, 7, 10, 3] }, // Root + Major Triad + b7 + #9
  
  // POWER CHORD & DYADS
  '0,7': { name: '5', intervals: [0, 7] },
  '0,4': { name: '', intervals: [0, 4] }, // Implied Major (Root + 3rd)
  '0,3': { name: 'm', intervals: [0, 3] }, // Implied Minor (Root + b3)
};

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mainMenu');
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false); 
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); 
  const { session } = useAuth(); 

  // --- Lifetime Stats Tracking ---
  // Per-attempt accumulators (reset after each attempt)
  const sessionPlaytimeMs = useRef<number>(0);
  const playtimeStartRef = useRef<number | null>(null);
  // Session-wide accumulators (batched for upload)
  const sessionTotalPlaytimeMs = useRef<number>(0);
  const sessionTotalNotesHit = useRef<number>(0);

  const [isFreePlayMode, setIsFreePlayMode] = useState(false);
  const isFreePlayModeRef = useRef(false); // NEW: Ref to track free play status synchronously
  const [detectedChord, setDetectedChord] = useState<string | null>(null);
  const chordDetectionTimeoutRef = useRef<number | null>(null);
  const [selectedOnlineSongIdForNavigation, setSelectedOnlineSongIdForNavigation] = useState<string | null>(null);

  // NEW: Sustain pedal state
  const [isSustainPedalActive, setIsSustainPedalActive] = useState(false);
  const sustainedByPedalKeysRef = useRef<Map<string, number>>(new Map()); // keyName -> midiNote

  // NEW: Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<MidiNotePlaybackItem[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);

  // NEW: Free Play visual notes
  const [freePlayLiveNotes, setFreePlayLiveNotes] = useState<FreePlayLiveNote[]>([]);
  const [freePlayElapsedTime, setFreePlayElapsedTime] = useState(0);
  const freePlayStartTimeRef = useRef<number>(performance.now());
  const freePlayRequestRef = useRef<number | null>(null);

  const [userSustainedKeys, setUserSustainedKeys] = useState<Set<string>>(() => new Set());
  const [userActiveKeys, setUserActiveKeys] = useState<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(800);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const appRootRef = useRef<HTMLDivElement>(null); 
  const [contentAreaHeight, setContentAreaHeight] = useState(300);
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);
  
  const [isTopBarVisible, setIsTopBarVisible] = useState(false);
  const topBarTimeoutRef = useRef<number | null>(null);

  const [devicePreset, setDevicePreset] = useState<DevicePreset>('desktop');
  // NEW: Custom layout states
  const [customWhiteKeyHeight, setCustomWhiteKeyHeight] = useState(140);
  const [customBlackKeyHeight, setCustomBlackKeyHeight] = useState(90);
  const [customKeyLabelHeight, setCustomKeyLabelHeight] = useState(25);
  const [customMinWhiteKeyWidth, setCustomMinWhiteKeyWidth] = useState(24.5);

  const [pianoRangeMode, setPianoRangeMode] = useState<'full' | '61-key' | '37-key' | '25-key' | 'custom'>('full');
  const [customStartNote, setCustomStartNote] = useState('C3');
  const [customEndNote, setCustomEndNote] = useState('C5');

  // NEW: UI Zoom State
  const [uiZoom, setUiZoom] = useState<number>(100);

  const visiblePianoKeys = useMemo(() => {
      const getMidi = (n: string) => PIANO_KEYS_CONFIG.find(k => k.name.toLowerCase() === n.toLowerCase().trim())?.midiNote;
      let start: number, end: number;
      switch (pianoRangeMode) {
        case 'full': return PIANO_KEYS_CONFIG;
        case '61-key': start = getMidi('C2') ?? 36; end = getMidi('C7') ?? 96; break;
        case '37-key': start = getMidi('C3') ?? 48; end = getMidi('C6') ?? 84; break;
        case '25-key': start = getMidi('C3') ?? 48; end = getMidi('C5') ?? 72; break;
        case 'custom': start = getMidi(customStartNote) ?? 48; end = getMidi(customEndNote) ?? 72; break;
        default: return PIANO_KEYS_CONFIG;
      }
      if (start > end) [start, end] = [end, start];
      return PIANO_KEYS_CONFIG.filter(key => key.midiNote >= start && key.midiNote <= end);
  }, [pianoRangeMode, customStartNote, customEndNote]);

  const layoutConfig: LayoutDimensions = useMemo(() => {
      const totalKeys = visiblePianoKeys.length;
      if (devicePreset === 'custom') {
          return {
              whiteKeyHeight: customWhiteKeyHeight,
              blackKeyHeight: customBlackKeyHeight,
              keyLabelHeight: customKeyLabelHeight,
              minWhiteKeyWidth: customMinWhiteKeyWidth
          };
      }
      return DEVICE_LAYOUTS(totalKeys)[devicePreset];
  }, [devicePreset, visiblePianoKeys.length, customWhiteKeyHeight, customBlackKeyHeight, customKeyLabelHeight, customMinWhiteKeyWidth]);
  
  const [playbackNotes, setPlaybackNotes] = useState<MidiNotePlaybackItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [currentFileType, setCurrentFileType] = useState<FileType>(FileType.UNKNOWN);
  const fileTypeRef = useRef<FileType>(FileType.UNKNOWN);
  useEffect(() => { fileTypeRef.current = currentFileType; }, [currentFileType]);
  
  const [initialTimeSignature, setInitialTimeSignature] = useState<TimeSignatureInfo>(DEFAULT_TIME_SIGNATURE); 
  const [initialKeySignature, setInitialKeySignature] = useState<string>(DEFAULT_KEY_SIGNATURE); 
  const [currentTempoBpm, setCurrentTempoBpm] = useState<number | null>(null);
  const [tempoEvents, setTempoEvents] = useState<TempoEvent[]>([]);
  const [barLines, setBarLines] = useState<number[]>([]);
  const [signatureEvents, setSignatureEvents] = useState<SignatureEvent[]>([]); 

  const [metronomeMode, setMetronomeMode] = useState<MetronomeMode>('off');
  const [playbackTempoMultiplier, setPlaybackTempoMultiplier] = useState<number>(1);
  const [previewPlaybackTempoMultiplier, setPreviewPlaybackTempoMultiplier] = useState<number>(1);
  
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0); 

  // Settings Preview State
  const isSettingsPreviewActiveRef = useRef(false);
  const originalMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME);

  const notesForGame = useMemo(() => {
    if (isFreePlayMode) return [];
    if (!gameSettings?.practiceHand || !playbackNotes) return playbackNotes;
    if (gameSettings.practiceHand === 'both') return playbackNotes;
    return playbackNotes.filter(note => note.hand === gameSettings.practiceHand);
  }, [playbackNotes, gameSettings?.practiceHand, isFreePlayMode]);

  const originalTotalMusicalDurationMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    const startTime = notesForGame.reduce((min, note) => Math.min(min, note.timeMs), Infinity);
    const endTime = notesForGame.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
    return isFinite(startTime) ? endTime - startTime : 0;
  }, [notesForGame]);

  const activeBpmForDisplay = useMemo(() => {
    if (isFreePlayMode) {
      return 120; // A default for free play, not scaled
    }
    if (currentTempoBpm === null) {
      // Return a default scaled by multiplier if no song is loaded yet
      return DEFAULT_MUSICXML_TEMPO_BPM * playbackTempoMultiplier;
    }

    // getActiveTempoBpmAtOriginalTime returns the BPM at a specific point in the original, unscaled timeline.
    const originalBpm = getActiveTempoBpmAtOriginalTime(
        musicalCurrentTimeMs,
        tempoEvents,
        currentTempoBpm
    );
    
    // The display should show the BPM adjusted by the user's tempo multiplier setting.
    return originalBpm * playbackTempoMultiplier;
  }, [isFreePlayMode, currentTempoBpm, musicalCurrentTimeMs, tempoEvents, playbackTempoMultiplier]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const activeKeyTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeAudioNodesRef = useRef<Map<string, ActiveAudioNode>>(new Map());
  const audioBufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const lastUiClickTimeRef = useRef<number>(0);
  const uiClickComboIndexRef = useRef<number>(0);
  const metronomeBuffersRef = useRef<{ strong?: AudioBuffer; weak?: AudioBuffer }>({});
  
  const [allBeatTimes, setAllBeatTimes] = useState<BeatInfo[]>([]);
  
  useEffect(() => {
    if (isFreePlayMode || playbackNotes.length === 0) {
      if (allBeatTimes.length > 0) setAllBeatTimes([]); // Clear if no song
      return;
    }
  
    let allBeats: BeatInfo[] = [];
  
    const res = {
        initialTempoBpm: currentTempoBpm || DEFAULT_MUSICXML_TEMPO_BPM,
        originalTotalMusicalDurationMs: originalTotalMusicalDurationMs,
        timeSignature: initialTimeSignature,
        tempoEvents: tempoEvents,
        signatureEvents: signatureEvents,
        barLinesMs: barLines
    };
  
    if (metronomeMode === 'beat') {
        const scaledBarLines = res.barLinesMs.map(t => t / playbackTempoMultiplier);
        const estimatedScaledEndTime = (res.originalTotalMusicalDurationMs / playbackTempoMultiplier) + 5000;
        
        allBeats = getBeatTimesInWindow(
            0,
            estimatedScaledEndTime,
            playbackTempoMultiplier,
            res.initialTempoBpm,
            res.tempoEvents,
            res.timeSignature,
            res.signatureEvents,
            scaledBarLines
        );
    } else if (metronomeMode === 'bar') {
        allBeats = res.barLinesMs.map(t => ({ timeMs: t / playbackTempoMultiplier, isStrong: true }));
    }
  
    setAllBeatTimes(allBeats);
  
    const startIndex = allBeats.findIndex(b => b.timeMs >= currentTimeRef.current);
    nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeats.length;
    prevConceptualTimeRef.current = currentTimeRef.current;
  
  }, [
    metronomeMode, 
    playbackTempoMultiplier, 
    playbackNotes.length,
    currentTempoBpm,
    originalTotalMusicalDurationMs,
    initialTimeSignature,
    tempoEvents,
    signatureEvents,
    barLines,
    isFreePlayMode
  ]);

  const [currentOnlineSongId, setCurrentOnlineSongId] = useState<string | null>(null); 
  const [isCurrentSongRanked, setIsCurrentSongRanked] = useState<boolean | null>(null); 
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [activePlaybackNotesInfo, setActivePlaybackNotesInfo] = useState<Map<string, ActiveMidiNoteInfo>>(new Map());
  const currentTimeRef = useRef<number>(0); 
  const playbackRequestRef = useRef<number | null>(null);
  const performanceStartTimeRef = useRef<number>(0);
  const pausedMusicalTimeRef = useRef<number>(0);
  const nextNoteIndexRef = useRef<number>(0);
  const scheduledNoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeNoteInstancesRef = useRef<Map<string, MidiNotePlaybackItem>>(new Map());
  const gameRealStartTimeRef = useRef<number | null>(null);
  const isUserPausedRef = useRef<boolean>(false); 
  const prevMusicalTimeRef = useRef<number>(0);
  
  const [notesCurrentlyWaitingFor, setNotesCurrentlyWaitingFor] = useState<Set<number>>(() => new Set());
  const notesCurrentlyWaitingForRef = useRef<Set<number>>(new Set());
  const notesCurrentlyWaitingForIdsRef = useRef<Set<string>>(new Set()); 
  const resumeIndexRef = useRef<number | null>(null); 
  
  const updateNotesCurrentlyWaitingFor = useCallback((newSet: Set<number>) => {
      setNotesCurrentlyWaitingFor(newSet);
      notesCurrentlyWaitingForRef.current = newSet;
  }, []);

  const waitingBlockTimeRef = useRef<number | null>(null);
  const presatisfiedNoteIdsRef = useRef<Set<string>>(new Set());
  const lastPlayerInputRealTimeRef = useRef<number>(0); 
  const rhythmChordBufferRef = useRef<Set<number>>(new Set());

  const [totalWaitTimeMs, setTotalWaitTimeMs] = useState<number>(0);
  const accumulatedWaitTimeRef = useRef<number>(0);
  const waitStartTimeRef = useRef<number | null>(null);
  const accumulatedPauseTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const accumulatedSeekTimeRef = useRef<number>(0);
  
  const scheduledMetronomeAudioNodesRef = useRef<MetronomeAudioNode[]>([]);
  const [metronomeBeat, setMetronomeBeat] = useState<'strong' | 'weak' | null>(null);
  const lastMetronomeVisualBeatRef = useRef<'strong' | 'weak' | null>(null);
  const [metronomeOffsetMs, setMetronomeOffsetMs] = useState<number>(-50); // Changed default from -25 to -50
  const allBeatTimesRef = useRef<BeatInfo[]>([]);
  useEffect(() => { allBeatTimesRef.current = allBeatTimes; }, [allBeatTimes]);
  const nextBeatToScheduleIndexRef = useRef<number>(0);
  const prevConceptualTimeRef = useRef<number>(0);
  
  const [hitCount, setHitCount] = useState<number>(0);
  const hitCountRef = useRef<number>(0);
  useEffect(() => { hitCountRef.current = hitCount; }, [hitCount]); 
  const [errorCount, setErrorCount] = useState<number>(0);
  const errorCountRef = useRef<number>(0);
  useEffect(() => { errorCountRef.current = errorCount; }, [errorCount]); 
  const [liveAccuracy, setLiveAccuracy] = useState<number>(100);
  const [liveSpeed, setLiveSpeed] = useState<number>(100);
  const [totalNoteCountForGame, setTotalNoteCountForGame] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<ExtendedResult | null>(null);
  const hitNoteIdsRef = useRef<Set<string>>(new Set());
  const playerInputTimesRef = useRef<number[]>([]);
  const firstInputRealTimeRef = useRef<number | null>(null);
  const lastInputRealTimeRef = useRef<number | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null); 

  const [midiInputs, setMidiInputs] = useState<Map<string, MIDIInput>>(() => new Map());
  const [midiOutputs, setMidiOutputs] = useState<Map<string, MIDIOutput>>(() => new Map());
  const [selectedMidiInputId, setSelectedMidiInputId] = useState<string | null>(null);
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState<string | null>(null);
  const [midiAccessError, setMidiAccessError] = useState<string | null>(null);
  const activeMidiInputDeviceRef = useRef<MIDIInput | null>(null);
  const midiAccessInstanceRef = useRef<MIDIAccess | null>(null);
  const [midiAccessStatus, setMidiAccessStatus] = useState<MidiAccessStatus>('uninitialized');

  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [noteSpeedMultiplier, setNoteSpeedMultiplier] = useState<number>(1);
  const [sheetMusicZoom, setSheetMusicZoom] = useState<number>(1);
  const [noteLabelType, setNoteLabelType] = useState<NoteLabelType>(DEFAULT_NOTE_LABEL_TYPE);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME); 
  const [metronomeVolume, setMetronomeVolume] = useState(DEFAULT_METRONOME_VOLUME); 
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS); 
  const [showOnlyMajorNotes, setShowOnlyMajorNotes] = useState<boolean>(DEFAULT_SHOW_ONLY_MAJOR_NOTES);
  const [showQwertyShortcuts, setShowQwertyShortcuts] = useState<boolean>(DEFAULT_SHOW_QWERTY_SHORTCUTS);
  const [hideBarNavigationButtons, setHideBarNavigationButtons] = useState<boolean>(DEFAULT_HIDE_BAR_NAVIGATION_BUTTONS);
  const [autoHideTopBar, setAutoHideTopBar] = useState<boolean>(DEFAULT_AUTO_HIDE_TOP_BAR);
  const [showPianoTilesBackground, setShowPianoTilesBackground] = useState<boolean>(DEFAULT_SHOW_PIANO_TILES_BACKGROUND);

  const [qwertyLayout, setQwertyLayout] = useState<QwertyLayout>('mirp'); 
  const [qwertyCurrentOctaveShift, setQwertyCurrentOctaveShift] = useState<number>(DEFAULT_QWERTY_OCTAVE_SHIFT);
  const qwertyActiveKeysRef = useRef<Set<string>>(new Set());
  const [mirpTranspose, setMirpTranspose] = useState<number>(0);
  const activeMirpNotesRef = useRef<Map<string, number>>(new Map()); 

  const recentNotesBufferRef = useRef<Map<number, number>>(new Map()); // midi -> timestamp
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');

  const onHideBarNavigationButtonsChange = useCallback((value: boolean) => {
    setHideBarNavigationButtons(value);
  }, []);

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

  const midiNoteToKeyDefMap = useMemo(() => {
    const map = new Map<number, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key));
    return map;
  }, []);

  const numWhiteKeys = useMemo(() => visiblePianoKeys.filter(key => key.type === 'white').length, [visiblePianoKeys]);

  const keyPositionsMap = useMemo(() => {
      if (containerWidth <= 0 || numWhiteKeys === 0) return new Map<string, KeyPosition>();
      const adjustedContainerWidth = Math.max(containerWidth, layoutConfig.minWhiteKeyWidth * numWhiteKeys);
      return generateKeyPositions(visiblePianoKeys, adjustedContainerWidth);
  }, [containerWidth, layoutConfig, visiblePianoKeys, numWhiteKeys]);

  const baseCalculatedPianoWidth = useMemo(() => {
    if (!keyPositionsMap || keyPositionsMap.size === 0) return containerWidth; 
    return Array.from(keyPositionsMap.values()).filter((kp: KeyPosition) => kp.type === 'white').reduce((max: number, kp: KeyPosition) => Math.max(max, kp.x + kp.width), 0);
  }, [keyPositionsMap, containerWidth]);

  const waitMode: WaitMode = isFreePlayMode ? 'off' : gameSettings?.waitMode || 'strict';
  const isMetronomeAvailable = useMemo(() => notesForGame.length > 0 && tempoEvents.length > 0, [notesForGame.length, tempoEvents.length]);

  const absoluteEndTimeMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    return notesForGame.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
  }, [notesForGame]);

  const totalDurationWithEndDelayMs = useMemo(() => absoluteEndTimeMs === 0 ? 0 : absoluteEndTimeMs + END_PLAYBACK_DELAY_MS, [absoluteEndTimeMs]);

  useEffect(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) { setAnalysisResult(null); return; }
    const scaledNotes = playbackNotes.map(note => ({ ...note, timeMs: note.timeMs / playbackTempoMultiplier, durationMs: note.durationMs / playbackTempoMultiplier }));
    setAnalysisResult(analyzeMidi(scaledNotes, originalTotalMusicalDurationMs / playbackTempoMultiplier, undefined, originalTotalMusicalDurationMs));
  }, [playbackNotes, originalTotalMusicalDurationMs, playbackTempoMultiplier]);

  const previewAnalysisResult = useMemo(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) return null;
    const scaledNotes = playbackNotes.map(note => ({
      ...note,
      timeMs: note.timeMs / previewPlaybackTempoMultiplier,
      durationMs: note.durationMs / previewPlaybackTempoMultiplier
    }));
    return analyzeMidi(scaledNotes, originalTotalMusicalDurationMs / previewPlaybackTempoMultiplier, undefined, originalTotalMusicalDurationMs);
  }, [playbackNotes, originalTotalMusicalDurationMs, previewPlaybackTempoMultiplier]);

  const onPlaybackTempoMultiplierChange = useCallback((multiplier: number) => setPreviewPlaybackTempoMultiplier(multiplier), []);

  const startTopBarHideTimer = useCallback(() => {
    if (topBarTimeoutRef.current) clearTimeout(topBarTimeoutRef.current);
    topBarTimeoutRef.current = window.setTimeout(() => setIsTopBarVisible(false), 5000);
  }, []);

  const clearTopBarHideTimer = useCallback(() => {
    if (topBarTimeoutRef.current) { clearTimeout(topBarTimeoutRef.current); topBarTimeoutRef.current = null; }
  }, []);

  useEffect(() => {
    if (autoHideTopBar && isTopBarVisible && (currentScreen === 'inGame' || currentScreen === 'settings')) startTopBarHideTimer(); else clearTopBarHideTimer();
    return clearTopBarHideTimer;
  }, [autoHideTopBar, isTopBarVisible, currentScreen, startTopBarHideTimer, clearTopBarHideTimer]);

  useEffect(() => {
    // Show top bar temporarily when auto-hide preference changes so user can see it
    setIsTopBarVisible(true);
  }, [autoHideTopBar]);

  useEffect(() => {
    const contentEl = contentAreaRef.current;
    if (!contentEl) return;
    const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            const newWidth = entries[0].contentRect.width;
            if (newWidth > 0) requestAnimationFrame(() => setContainerWidth(newWidth));
        }
    });
    resizeObserver.observe(contentEl);
    if (contentEl.clientWidth > 0) setContainerWidth(contentAreaRef.current.clientWidth);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const calculateHeights = () => {
      requestAnimationFrame(() => {
          if (currentScreen !== 'inGame' && currentScreen !== 'settings') return; 
          const contentAreaDiv = contentAreaRef.current;
          if (!contentAreaDiv) { setContentAreaHeight(300); return; }
          const totalAvailableContentHeight = contentAreaDiv.clientHeight;
          const progressBarSpace = isFreePlayMode || currentScreen === 'settings' ? 0 : PROGRESS_BAR_HEIGHT_PX;
          const actualHeightForDynamicView = Math.max(0, totalAvailableContentHeight - progressBarSpace - (layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight));
          setContentAreaHeight(actualHeightForDynamicView);
      });
    };
    calculateHeights(); 
    window.addEventListener('resize', calculateHeights);
    const contentAreaObserver = new ResizeObserver(calculateHeights);
    if (contentAreaRef.current) contentAreaObserver.observe(contentAreaRef.current);
    return () => {
      window.removeEventListener('resize', calculateHeights);
      if (contentAreaRef.current) contentAreaObserver.unobserve(contentAreaRef.current);
    };
  }, [notesForGame.length, currentScreen, layoutConfig, isFreePlayMode]);

  // Sync ref with state
  useEffect(() => {
    isFreePlayModeRef.current = isFreePlayMode;
  }, [isFreePlayMode]);

  const initializeAudioContext = useCallback(async (shouldResume: boolean = true) => {
    let context = audioContextRef.current;
    if (!context) {
      try {
        const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextConstructor) return false;
        context = new (AudioContextConstructor as { new (): AudioContext })();
        audioContextRef.current = context;
        masterGainRef.current = context.createGain(); masterGainRef.current.connect(context.destination);
        metronomeGainRef.current = context.createGain(); metronomeGainRef.current.connect(context.destination);
      } catch (e) { return false; }
    }
    if (shouldResume && context.state === 'suspended') { try { await context.resume(); } catch (e) { return false; } }
    return context.state === 'running' || !shouldResume;
  }, []);

  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume; }, [masterVolume]);
  useEffect(() => { if (metronomeGainRef.current) metronomeGainRef.current.gain.value = metronomeVolume; }, [metronomeVolume]);

  const getAudioBuffer = useCallback(async (midiNote: number): Promise<AudioBuffer | null> => {
    if (audioBufferCacheRef.current.has(midiNote)) return audioBufferCacheRef.current.get(midiNote)!;
    if (!audioContextRef.current) return null;
    const noteName = midiNoteToNameMap.get(midiNote);
    if (!noteName) return null;
    try {
      const response = await fetch(`/sounds/piano/${noteName}.mp3`);
      if (!response.ok) throw new Error();
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferCacheRef.current.set(midiNote, audioBuffer);
      return audioBuffer;
    } catch (error) { return null; }
  }, [midiNoteToNameMap]);

  useEffect(() => {
    const setupAudio = async () => {
      await initializeAudioContext(false);
      const promises = UI_CLICK_SOUND_SEQUENCE_MIDI.map(midi => getAudioBuffer(midi));
      await Promise.all(promises);
    };
    setupAudio();
  }, [initializeAudioContext, getAudioBuffer]);

  const preloadSamplesForSong = useCallback(async (notes: MidiNotePlaybackItem[]) => {
    const audioContextReady = await initializeAudioContext();
    if (notes.length === 0 || !audioContextReady) return;
    setIsPreloading(true);
    const uniqueMidiNotes = [...new Set(notes.map(note => note.midi))];
    const promises = uniqueMidiNotes.map(midiNote => getAudioBuffer(midiNote));
    const loadGeneric = async (path: string) => {
        if (!audioContextRef.current) return null;
        const res = await fetch(path);
        const ab = await res.arrayBuffer();
        return audioContextRef.current.decodeAudioData(ab);
    };
    const p1 = loadGeneric('/sounds/metronome/strong_beat.mp3'), p2 = loadGeneric('/sounds/metronome/weak_beat.mp3');
    promises.push(p1, p2);
    try { await Promise.all(promises); metronomeBuffersRef.current.strong = (await p1) as AudioBuffer; metronomeBuffersRef.current.weak = (await p2) as AudioBuffer; } catch (e) {} finally { setIsPreloading(false); }
  }, [initializeAudioContext, getAudioBuffer]);

  const playSound = useCallback((midiNote: number, musicalDurationMs: number, velocity: number = 0.75) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    const realDurationMs = musicalDurationMs / playbackTempoMultiplier;
    if (selectedOutput) {
        selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)]);
        setTimeout(() => { selectedOutput.send([0x80, midiNote, 0]); }, realDurationMs);
        return;
    }
    if (!audioContextRef.current || !masterGainRef.current) return;
    const audioCtx = audioContextRef.current;
    const audioBuffer = audioBufferCacheRef.current.get(midiNote);
    if (!audioBuffer) return;
    const source = audioCtx.createBufferSource(); source.buffer = audioBuffer;
    const gainNode = audioCtx.createGain(); const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(velocity * 2.8, now); source.connect(gainNode); gainNode.connect(masterGainRef.current);
    source.start(now); const releaseTimeSec = 0.5, noteEndTimeSec = now + (realDurationMs / 1000);
    gainNode.gain.setValueAtTime(velocity * 2.8, noteEndTimeSec); gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEndTimeSec + releaseTimeSec);
    source.stop(noteEndTimeSec + releaseTimeSec + 0.1);
  }, [playbackTempoMultiplier, selectedMidiOutputId, midiOutputs]);

  const startSustainedSound = useCallback((keyName: string, midiNote: number, velocity: number = 0.75) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    if (selectedOutput) { selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)]); return; }
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    // If a sound for this key is already playing (e.g., sustained), stop it immediately before starting a new one.
    if (activeAudioNodesRef.current.has(keyName)) {
        const audioNode = activeAudioNodesRef.current.get(keyName);
        if (audioNode) {
            try {
                // Stop immediately
                audioNode.source.stop(audioContextRef.current.currentTime);
            } catch (e) {
                // may already be stopped
            }
        }
        activeAudioNodesRef.current.delete(keyName);
    }

    const audioCtx = audioContextRef.current;
    const playBufferedNote = (buffer: AudioBuffer) => {
      const source = audioCtx.createBufferSource(); source.buffer = buffer; source.loop = false;
      const gainNode = audioCtx.createGain(); gainNode.gain.setValueAtTime(velocity * 2.8, audioCtx.currentTime);
      source.connect(gainNode); gainNode.connect(masterGainRef.current!); source.start(0);
      activeAudioNodesRef.current.set(keyName, { source, gainNode });
    };
    const cachedBuffer = audioBufferCacheRef.current.get(midiNote);
    if (cachedBuffer) playBufferedNote(cachedBuffer); else getAudioBuffer(midiNote).then(loadedBuffer => { if (loadedBuffer) playBufferedNote(loadedBuffer); });
  }, [getAudioBuffer, selectedMidiOutputId, midiOutputs]);

  const stopSustainedSound = useCallback((keyName: string, midiNote: number) => {
    const selectedOutput = selectedMidiOutputId ? midiOutputs.get(selectedMidiOutputId) : null;
    if (selectedOutput) { selectedOutput.send([0x80, midiNote, 0]); return; }
    if (!audioContextRef.current || !activeAudioNodesRef.current.has(keyName)) return;
    const audioCtx = audioContextRef.current;
    const audioNode = activeAudioNodesRef.current.get(keyName);
    if (audioNode) {
      const { source, gainNode } = audioNode; const now = audioCtx.currentTime, releaseTime = 0.5;
      gainNode.gain.cancelScheduledValues(now); gainNode.gain.setValueAtTime(gainNode.gain.value, now); 
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime); source.stop(now + releaseTime + 0.1);
    }
    activeAudioNodesRef.current.delete(keyName);
  }, [selectedMidiOutputId, midiOutputs]);

  const clearScheduledMetronomeSounds = useCallback(() => {
    if (audioContextRef.current && scheduledMetronomeAudioNodesRef.current.length > 0) {
        const now = audioContextRef.current.currentTime;
        scheduledMetronomeAudioNodesRef.current.forEach(nodes => {
            try {
                nodes.gainNode.gain.cancelScheduledValues(now);
                nodes.gainNode.gain.setValueAtTime(0, now);
                if (nodes.oscillator) nodes.oscillator.stop(now);
                if (nodes.source) nodes.source.stop(now);
            } catch (e) {}
        });
    }
    scheduledMetronomeAudioNodesRef.current = [];
  }, []);

  const clearScheduledNotes = useCallback(() => { scheduledNoteTimeoutsRef.current.forEach(clearTimeout); scheduledNoteTimeoutsRef.current.clear(); activeNoteInstancesRef.current.clear(); setActivePlaybackNotesInfo(new Map()); }, []);

  const resumePlaybackFromWait = useCallback(() => {
    const completedBlockTimeMusical = waitingBlockTimeRef.current;
    if (completedBlockTimeMusical === null) return;
    if (waitStartTimeRef.current !== null) { accumulatedWaitTimeRef.current += (performance.now() - waitStartTimeRef.current); waitStartTimeRef.current = null; }
    pausedMusicalTimeRef.current = completedBlockTimeMusical; setMusicalCurrentTimeMs(completedBlockTimeMusical);
    if (resumeIndexRef.current !== null) { nextNoteIndexRef.current = resumeIndexRef.current; resumeIndexRef.current = null; }
    performanceStartTimeRef.current = performance.now(); lastPlayerInputRealTimeRef.current = performance.now(); waitingBlockTimeRef.current = null;
    updateNotesCurrentlyWaitingFor(new Set<number>()); notesCurrentlyWaitingForIdsRef.current = new Set<string>();
    setActivePlaybackNotesInfo(prev => {
        const newMap = new Map(prev); const keysToDelete: string[] = [];
        newMap.forEach((v: ActiveMidiNoteInfo, k: string) => { if (v.status === 'waiting') keysToDelete.push(k); });
        keysToDelete.forEach(k => newMap.delete(k)); return newMap;
    });
  }, [updateNotesCurrentlyWaitingFor]);

  const gameSettingsRef = useRef(gameSettings);
  useEffect(() => { gameSettingsRef.current = gameSettings }, [gameSettings]);

  const handleStopPlayback = useCallback(async () => {
    // Stop and finalize playtime tracking for the attempt
    if (playtimeStartRef.current !== null) {
        sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current;
    }

    // Accumulate this attempt's stats into the session batch
    // FIX: Use ref for gameSettings to break dependency cycle and ensure stability of this callback.
    if (gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) {
        sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current;
        sessionTotalNotesHit.current += hitCountRef.current;
    }

    // Reset PER-ATTEMPT stats for the next game
    sessionPlaytimeMs.current = 0;
    playtimeStartRef.current = null;

    if (isSettingsPreviewActiveRef.current) {
        isSettingsPreviewActiveRef.current = false;
    }

    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false;
    if (playbackRequestRef.current) { cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; }
    
    // Stop Free Play Loop
    isFreePlayModeRef.current = false; // Stop the ref-based guard
    if (freePlayRequestRef.current) { cancelAnimationFrame(freePlayRequestRef.current); freePlayRequestRef.current = null; }
    
    setMusicalCurrentTimeMs(0); currentTimeRef.current = 0; pausedMusicalTimeRef.current = 0; nextNoteIndexRef.current = 0;
    clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set<number>()); notesCurrentlyWaitingForIdsRef.current = new Set<string>();
    waitingBlockTimeRef.current = null; resumeIndexRef.current = null; presatisfiedNoteIdsRef.current = new Set<string>(); setActivePlaybackNotesInfo(new Map());
    if (chordDetectionTimeoutRef.current) { clearTimeout(chordDetectionTimeoutRef.current); chordDetectionTimeoutRef.current = null; }
    
    recentNotesBufferRef.current.clear();
    setDetectedChord(null);

    hitCountRef.current = 0; errorCountRef.current = 0; hitNoteIdsRef.current.clear(); setHitCount(0); setErrorCount(0); setLiveAccuracy(100); setLiveSpeed(100);
    gameRealStartTimeRef.current = null; setTotalWaitTimeMs(0); accumulatedWaitTimeRef.current = 0; waitStartTimeRef.current = null;
    accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; playerInputTimesRef.current = []; firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null; setPerformanceSummary(null); setIsLoadingContent(false); setIsFreePlayMode(false); setMetronomeBeat(null);
    accumulatedSeekTimeRef.current = 0;
    setFreePlayLiveNotes([]); setRecordedNotes([]); setIsRecording(false);
    setShowSaveButton(false);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor]);

  const handleCloseGameOverModal = useCallback(() => {
    setIsGameOver(false);
    setGameOverReason('');
    handleStopPlayback();
  }, [handleStopPlayback]);

  const satisfyUpcomingNote = useCallback((noteDef: MidiNotePlaybackItem) => {
    presatisfiedNoteIdsRef.current.add(noteDef.noteId);
    setActivePlaybackNotesInfo(prev => new Map(prev).set(noteDef.noteId, { noteId: noteDef.noteId, name: noteDef.name, timeMs: noteDef.timeMs, hand: noteDef.hand, midi: noteDef.midi, pitchClass: noteDef.pitchClass, status: 'user_played', finger: noteDef.finger }));
    const highlightDurationMs = Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) / playbackTempoMultiplier;
    scheduledNoteTimeoutsRef.current.set(noteDef.noteId, window.setTimeout(() => { setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); nm.delete(noteDef.noteId); return nm; }); scheduledNoteTimeoutsRef.current.delete(noteDef.noteId); }, Math.max(0, (noteDef.timeMs + Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS)) - currentTimeRef.current) / playbackTempoMultiplier));
  }, [playbackTempoMultiplier]);

  const visuallySatisfyNote = useCallback((noteDef: MidiNotePlaybackItem) => {
    const noteId = noteDef.noteId; activeNoteInstancesRef.current.set(noteId, noteDef);
    setActivePlaybackNotesInfo(prev => new Map(prev).set(noteId, { noteId, name: noteDef.name, timeMs: noteDef.timeMs, hand: noteDef.hand, midi: noteDef.midi, pitchClass: noteDef.pitchClass, status: 'user_played', finger: noteDef.finger }));
    if (scheduledNoteTimeoutsRef.current.has(noteId)) clearTimeout(scheduledNoteTimeoutsRef.current.get(noteId)!);
    scheduledNoteTimeoutsRef.current.set(noteId, window.setTimeout(() => { activeNoteInstancesRef.current.delete(noteId); scheduledNoteTimeoutsRef.current.delete(noteId); setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); nm.delete(noteId); return nm; }); }, Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) / playbackTempoMultiplier));
  }, [playbackTempoMultiplier]);

  const uploadSessionStats = useCallback(async () => {
    const playtimeToAdd = Math.round(sessionTotalPlaytimeMs.current);
    const notesHitToAdd = sessionTotalNotesHit.current;

    if (!session || (playtimeToAdd === 0 && notesHitToAdd === 0)) {
        return;
    }

    try {
        const { error } = await supabase.rpc('increment_user_stats', {
            playtime_ms_to_add: playtimeToAdd,
            notes_hit_to_add: notesHitToAdd,
        });

        if (error) {
            console.error('Failed to upload user stats:', error);
            // Don't reset if upload failed, so we can try again later.
        } else {
            // Reset accumulators after successful upload
            sessionTotalPlaytimeMs.current = 0;
            sessionTotalNotesHit.current = 0;
        }
    } catch (e) {
        console.error('Error calling RPC to upload stats:', e);
    }
  }, [session]);

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session }, [session]);

  useEffect(() => {
    const handlePageHide = () => {
        // Finalize stats for the currently playing song, if any
        if (isPlayingRef.current && playtimeStartRef.current !== null) {
            const finalPlaytimeChunk = performance.now() - playtimeStartRef.current;
            sessionPlaytimeMs.current += finalPlaytimeChunk;
            
            if (gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) {
                sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current;
                sessionTotalNotesHit.current += hitCountRef.current;
            }
        }

        const playtimeToAdd = Math.round(sessionTotalPlaytimeMs.current);
        const notesHitToAdd = sessionTotalNotesHit.current;

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
        const currentSession = sessionRef.current;

        if (!currentSession || !supabaseUrl || !supabaseAnonKey || (playtimeToAdd === 0 && notesHitToAdd === 0)) {
            return;
        }

        const payload = {
            playtime_ms_to_add: playtimeToAdd,
            notes_hit_to_add: notesHitToAdd,
        };
        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/increment_user_stats`;
        const headers = {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json'
        };
        
        // Use sendBeacon if available, otherwise fall back to fetch with keepalive
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            // sendBeacon doesn't allow custom headers like Authorization.
            // We rely on the user's session cookie if the RPC is set up for it,
            // or accept that this might only work for public/anon roles if not.
            // Let's use fetch with keepalive as a more robust method that supports auth headers.
            fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                keepalive: true
            });
        }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []); // Empty dependency array ensures this runs once, logic inside uses refs for fresh data

  const handleSeek = useCallback((t: number) => {
    if (notesForGame.length === 0 || waitMode === 'retical') return;
    const cl = Math.max(0, Math.min(t, totalDurationWithEndDelayMs));
    const timeBeforeSeek = currentTimeRef.current; // Capture time before it's updated

    clearScheduledNotes();
    clearScheduledMetronomeSounds();
    presatisfiedNoteIdsRef.current = new Set<string>();
    updateNotesCurrentlyWaitingFor(new Set<number>());
    notesCurrentlyWaitingForIdsRef.current = new Set<string>();
    waitingBlockTimeRef.current = null;
  
    const startIndex = allBeatTimesRef.current.findIndex(b => b.timeMs >= cl);
    nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
    prevConceptualTimeRef.current = cl;
  
    if (waitMode === 'off') {
        // --- AUTOPLAY SEEK ---
        const b = notesForGame.filter(n => n.timeMs < cl);
        hitNoteIdsRef.current = new Set(b.map(n => n.noteId));
        setHitCount(hitNoteIdsRef.current.size);
        setErrorCount(0);
        
        // Reset all performance metrics
        setTotalWaitTimeMs(0);
        accumulatedWaitTimeRef.current = 0;
        playerInputTimesRef.current = [];
        firstInputRealTimeRef.current = null;
        lastInputRealTimeRef.current = null;
        if (gameRealStartTimeRef.current !== null) {
            gameRealStartTimeRef.current = performance.now() - (cl / playbackTempoMultiplier);
        }
        accumulatedPauseTimeRef.current = 0;
        pauseStartTimeRef.current = null;
        accumulatedSeekTimeRef.current = 0; // Reset seek time
    } else {
        // --- PRACTICE MODE SEEK ---
        // Update hit counts for notes before the new cursor
        hitNoteIdsRef.current = new Set(Array.from(hitNoteIdsRef.current).filter(id => {
            const n = notesForGame.find(x => x.noteId === id);
            return n && n.timeMs < cl;
        }));
        setHitCount(hitNoteIdsRef.current.size);

        // Account for the time jump to preserve speed efficiency
        accumulatedSeekTimeRef.current += cl - timeBeforeSeek;
    }
  
    // For any seek action, invalidate summary and stop active wait timer.
    setPerformanceSummary(null);
    // If we are currently in a waiting state, add the elapsed wait time to the accumulator before resetting.
    if (waitStartTimeRef.current !== null) {
        accumulatedWaitTimeRef.current += (performance.now() - waitStartTimeRef.current);
    }
    waitStartTimeRef.current = null;
  
    // Update musical time and playback state for all modes
    pausedMusicalTimeRef.current = cl;
    setMusicalCurrentTimeMs(cl);
    currentTimeRef.current = cl;
    prevMusicalTimeRef.current = cl;
    isUserPausedRef.current = false;
    let ni = 0;
    while (ni < notesForGame.length && notesForGame[ni].timeMs < cl) ni++;
    nextNoteIndexRef.current = ni;
    if (isPlayingRef.current) {
        performanceStartTimeRef.current = performance.now();
    }
}, [notesForGame, totalDurationWithEndDelayMs, clearScheduledNotes, updateNotesCurrentlyWaitingFor, clearScheduledMetronomeSounds, waitMode, playbackTempoMultiplier]);

  const handleBarNavigation = useCallback((dir: 'forward' | 'backward') => {
    if (notesForGame.length === 0 || waitMode === 'retical' || metronomeMode === 'off') return;
    const cur = currentTimeRef.current;
    let targetTime: number | undefined;

    if (metronomeMode === 'bar') {
        if (barLines.length === 0) return;
        const nextIdx = barLines.findIndex(b => b > cur + 50);
        let targetBarIndex;
        if (dir === 'forward') {
            targetBarIndex = nextIdx !== -1 ? nextIdx : barLines.length - 1;
        } else {
            const curIdx = nextIdx !== -1 ? nextIdx - 1 : barLines.length - 1;
            if (curIdx < 0) return;
            targetBarIndex = cur - barLines[curIdx] < 100 ? Math.max(0, curIdx - 1) : curIdx;
        }
        targetTime = barLines[targetBarIndex];
    } else { // 'beat' mode
        if (allBeatTimesRef.current.length === 0) return;
        
        const scaledCurrentTime = cur / playbackTempoMultiplier;
        
        if (dir === 'forward') {
            const nextBeat = allBeatTimesRef.current.find(b => b.timeMs > scaledCurrentTime + 10);
            if (nextBeat) {
                targetTime = nextBeat.timeMs * playbackTempoMultiplier;
            }
        } else { // backward
            const prevBeats = allBeatTimesRef.current.filter(b => b.timeMs < scaledCurrentTime - 10);
            if (prevBeats.length > 0) {
                targetTime = prevBeats[prevBeats.length - 1].timeMs * playbackTempoMultiplier;
            } else {
                targetTime = 0;
            }
        }
    }

    if (targetTime !== undefined) {
        handleSeek(targetTime);
    }
  }, [notesForGame.length, barLines, handleSeek, waitMode, metronomeMode, playbackTempoMultiplier]);

  const playbackLoop = useCallback(() => {
    if (!isPlayingRef.current || notesForGame.length === 0) { if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; return; }
    
    const currentRealTime = performance.now();
    const realTimeElapsedSinceStartOrPause = currentRealTime - performanceStartTimeRef.current;
    const conceptualMusicalTime = pausedMusicalTimeRef.current + (realTimeElapsedSinceStartOrPause * playbackTempoMultiplier);
    
    let actualMusicalTimeForGameLogic: number;
    const isInWaitState = (waitMode === 'strict' || waitMode === 'rhythm' || waitMode === 'retical') && notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    
    if (isInWaitState) { 
      actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!; 
      if (waitStartTimeRef.current === null) waitStartTimeRef.current = performance.now();
      setTotalWaitTimeMs(accumulatedWaitTimeRef.current + (performance.now() - waitStartTimeRef.current));
    } else { 
      actualMusicalTimeForGameLogic = conceptualMusicalTime; 
      setMusicalCurrentTimeMs(conceptualMusicalTime);
      if (totalWaitTimeMs !== accumulatedWaitTimeRef.current) setTotalWaitTimeMs(accumulatedWaitTimeRef.current);
    }
    
    currentTimeRef.current = actualMusicalTimeForGameLogic; 
    prevMusicalTimeRef.current = actualMusicalTimeForGameLogic;
    
    let calculatedLiveSpeed = 100;
    if (isPlayingRef.current && gameRealStartTimeRef.current !== null) {
        const idealTimePlayedMs = currentTimeRef.current - accumulatedSeekTimeRef.current;
        const idealTimeElapsedSoFar = idealTimePlayedMs / playbackTempoMultiplier;
        const actualDurationSoFar = (performance.now() - gameRealStartTimeRef.current) - accumulatedPauseTimeRef.current;
        calculatedLiveSpeed = actualDurationSoFar > 500 && idealTimeElapsedSoFar > 0 ? Math.min(100, (idealTimeElapsedSoFar / actualDurationSoFar) * 100) : 100;
        setLiveSpeed(calculatedLiveSpeed);
    }

    if (isPlayingRef.current && metronomeMode !== 'off' && audioContextRef.current && allBeatTimesRef.current.length > 0) {
      const audioCtx = audioContextRef.current;
      const schedulingLookaheadRealMs = 500;
      
      // Convert current original time to scaled/real time for metronome calculations.
      // `allBeatTimes` are already scaled, so all comparisons must be in scaled time.
      const idealCurrentTimeRealMs = currentTimeRef.current / playbackTempoMultiplier;
      const lookaheadIdealTimeRealMs = idealCurrentTimeRealMs + schedulingLookaheadRealMs;
  
      let nextIndex = nextBeatToScheduleIndexRef.current;
      while (nextIndex < allBeatTimesRef.current.length && allBeatTimesRef.current[nextIndex].timeMs < lookaheadIdealTimeRealMs) {
          const beat = allBeatTimesRef.current[nextIndex];
          
          const shouldScheduleSound = (metronomeMode === 'beat') || (metronomeMode === 'bar' && beat.isStrong);

          if (shouldScheduleSound) {
            const timeUntilBeatPlaysRealMs = beat.timeMs - idealCurrentTimeRealMs; // Both are scaled (real) time.
            const targetAudioContextTime = audioCtx.currentTime + (timeUntilBeatPlaysRealMs / 1000) + (metronomeOffsetMs / 1000);
    
            if (targetAudioContextTime > audioCtx.currentTime) {
                const buffer = beat.isStrong ? metronomeBuffersRef.current.strong : metronomeBuffersRef.current.weak;
                if (buffer && metronomeGainRef.current) {
                    const source = audioCtx.createBufferSource();
                    source.buffer = buffer;
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.setValueAtTime(1.0, targetAudioContextTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, targetAudioContextTime + buffer.duration * 0.9);
                    source.connect(gainNode);
                    gainNode.connect(metronomeGainRef.current);
                    source.start(targetAudioContextTime);
                    const nodeRecord = { source, gainNode };
                    source.onended = () => {
                        const index = scheduledMetronomeAudioNodesRef.current.indexOf(nodeRecord);
                        if (index > -1) {
                            scheduledMetronomeAudioNodesRef.current.splice(index, 1);
                        }
                    };
                    scheduledMetronomeAudioNodesRef.current.push(nodeRecord);
                }
            }
          }
          nextIndex++;
      }
      nextBeatToScheduleIndexRef.current = nextIndex;
  
      // For visual metronome pulse
      const lastIdealTimeRealMs = prevConceptualTimeRef.current / playbackTempoMultiplier;
      const beatForVisuals = allBeatTimesRef.current.find(beat => beat.timeMs > lastIdealTimeRealMs && beat.timeMs <= idealCurrentTimeRealMs);
  
      if (beatForVisuals) {
        const beatType = beatForVisuals.isStrong ? 'strong' : 'weak';
        if (beatType !== lastMetronomeVisualBeatRef.current) {
          setMetronomeBeat(beatType);
          lastMetronomeVisualBeatRef.current = beatType;
        }
      } else if (idealCurrentTimeRealMs > lastIdealTimeRealMs) {
          if (metronomeBeat !== null) {
              setMetronomeBeat(null);
              lastMetronomeVisualBeatRef.current = null;
          }
      }
    } else if (metronomeBeat !== null) {
        setMetronomeBeat(null);
        lastMetronomeVisualBeatRef.current = null;
    }
    prevConceptualTimeRef.current = conceptualMusicalTime;

    let currentProcessingIdx = nextNoteIndexRef.current;
    const notesToSetWaitingThisFrame: MidiNotePlaybackItem[] = [];
    while (currentProcessingIdx < notesForGame.length) {
      const note = notesForGame[currentProcessingIdx];
      if (currentTimeRef.current >= note.timeMs) {
        if (presatisfiedNoteIdsRef.current.has(note.noteId)) { presatisfiedNoteIdsRef.current.delete(note.noteId); currentProcessingIdx++; continue; }
        if (waitMode === 'off') {
          const noteId = note.noteId;
          if (!activeNoteInstancesRef.current.has(noteId)) {
            const soundVelocity = isSettingsPreviewActiveRef.current ? note.velocity * 0.25 : note.velocity;
            playSound(note.midi, note.durationMs, soundVelocity); 
            activeNoteInstancesRef.current.set(noteId, note);
            if (!hitNoteIdsRef.current.has(noteId)) { hitNoteIdsRef.current.add(noteId); setHitCount(prev => prev + 1); }
            setActivePlaybackNotesInfo(prev => new Map(prev).set(noteId, { noteId, name: note.name, timeMs: note.timeMs, hand: note.hand, midi: note.midi, pitchClass: note.pitchClass, status: 'playing', finger: note.finger }));
            const hd = Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) / playbackTempoMultiplier;
            scheduledNoteTimeoutsRef.current.set(noteId, window.setTimeout(() => { activeNoteInstancesRef.current.delete(noteId); scheduledNoteTimeoutsRef.current.delete(noteId); setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); nm.delete(noteId); return nm; }); }, hd));
          }
        } else { notesToSetWaitingThisFrame.push(note); }
        currentProcessingIdx++;
      } else break;
    }
    if ((waitMode === 'strict' || waitMode === 'rhythm' || waitMode === 'retical') && notesToSetWaitingThisFrame.length > 0) {
        const firstDueNote = notesToSetWaitingThisFrame[0], blockStartTime = firstDueNote.timeMs;
        
        let chordWindowMs: number;
        // Use noteToleranceMs from game settings for practice modes, with a fallback.
        chordWindowMs = gameSettings?.noteToleranceMs ?? 150;

        const chordBlock = notesToSetWaitingThisFrame.filter(n => (n.timeMs - blockStartTime) < chordWindowMs);
        let lookaheadIndex = currentProcessingIdx;
        while (lookaheadIndex < notesForGame.length) { const n = notesForGame[lookaheadIndex]; if ((n.timeMs - blockStartTime) < chordWindowMs) { if (!presatisfiedNoteIdsRef.current.has(n.noteId)) chordBlock.push(n); lookaheadIndex++; } else break; }
        if (chordBlock.length > 0) {
            waitingBlockTimeRef.current = blockStartTime; resumeIndexRef.current = lookaheadIndex;
            notesCurrentlyWaitingForIdsRef.current = new Set<string>(chordBlock.map(n => n.noteId));
            updateNotesCurrentlyWaitingFor(new Set<number>(chordBlock.map(n => n.midi)));
            setActivePlaybackNotesInfo(prev => {
                const nm = new Map(prev); chordBlock.forEach(n => nm.set(n.noteId, { noteId: n.noteId, name: n.name, timeMs: n.timeMs, hand: n.hand, midi: n.midi, pitchClass: n.pitchClass, status: 'waiting', finger: n.finger }));
                return nm;
            });
            currentProcessingIdx = lookaheadIndex;
        }
    }
    nextNoteIndexRef.current = currentProcessingIdx;

    let calculatedLiveAccuracy = 100;
    if (isPlayingRef.current) {
        const currentHits = hitCountRef.current;
        const currentErrors = errorCountRef.current;
        const totalEncounteredSoFar = currentProcessingIdx;
        const denominator = Math.max(currentHits, totalEncounteredSoFar) + currentErrors;
        calculatedLiveAccuracy = denominator > 0 ? (currentHits / denominator) * 100 : 100;
        setLiveAccuracy(calculatedLiveAccuracy);
    }

    // Game Over logic for Retical mode
    if (
        waitMode === 'retical' &&
        barLines.length > 2 &&
        currentTimeRef.current > barLines[2] &&
        (calculatedLiveAccuracy < 50 || calculatedLiveSpeed < 50)
    ) {
        // Stop the loop but don't reset stats yet
        setIsPlaying(false); 
        isPlayingRef.current = false;
        if (playbackRequestRef.current) { 
            cancelAnimationFrame(playbackRequestRef.current); 
            playbackRequestRef.current = null; 
        }

        // Set reason and open modal
        const reason = calculatedLiveAccuracy < 50 
            ? `Your accuracy (${calculatedLiveAccuracy.toFixed(1)}%) dropped below 50%.`
            : `Your speed efficiency (${calculatedLiveSpeed.toFixed(1)}%) dropped below 50%.`;
        setGameOverReason(reason);
        setIsGameOver(true);

        return; // Exit the loop immediately
    }

    if (actualMusicalTimeForGameLogic >= totalDurationWithEndDelayMs && absoluteEndTimeMs > 0) {
        if (isSettingsPreviewActiveRef.current) {
            handleSeek(0);
        } else {
            if (playtimeStartRef.current !== null) {
                sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current;
                playtimeStartRef.current = null;
            }
            setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false;
            if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
            const finalHitCount = hitCountRef.current, finalErrorCount = errorCountRef.current, totalNotes = notesForGame.length;
            let isAutoPlay = waitMode === 'off';
            let actDur: number;
            const idealDuration = absoluteEndTimeMs / playbackTempoMultiplier;
            if (isAutoPlay) actDur = idealDuration;
            else actDur = idealDuration + accumulatedWaitTimeRef.current;
            
            // FIX: Explicit return type to prevent 'unknown' or 'any' inference issues
            const calculateStats = (h: number, e: number, t: number, a: boolean, dur: number): { acc: number; spd: number } => {
                if (a) return { acc: 100, spd: 100 };
                const den = Math.max(h, t) + e;
                const acc = den > 0 ? (h / den) * 100 : 100;
                const ideal = absoluteEndTimeMs / playbackTempoMultiplier;
                // Avoid potential division by zero or NaN if dur is 0
                const spd = (ideal > 0 && dur > 0 ? Math.min(100, (ideal / dur) * 100) : 0);
                return { acc: Number(acc), spd: Number(spd) };
            };
            const stats = calculateStats(finalHitCount, finalErrorCount, totalNotes, isAutoPlay, actDur);
            setLiveAccuracy(stats.acc); setLiveSpeed(stats.spd);
            const baseMidiScore = analysisResult?.performanceScore || 0;
            
            // FIX: stats.acc and stats.spd are now guaranteed numbers, fixing arithmetic type errors.
            const accVal = Number(stats.acc);
            const spdVal = Number(stats.spd);
            const gameplayPS = (accVal * 0.5) + (spdVal * 0.5);
            
            const finalScore = Number(baseMidiScore) * Math.pow(gameplayPS / 100, 4);
            let rank = 'D';
            const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
            if (gameplayPS >= 100) rank = 'X';
            else if (gameplayPS >= 98) rank = 'SS';
            else if (gameplayPS >= 95) rank = 'S';
            else if (gameplayPS >= 90) rank = 'A';
            else if (gameplayPS >= 80) rank = 'B';
            else if (gameplayPS >= 70) rank = 'C';
            setPerformanceSummary({ accuracy: +stats.acc.toFixed(2), speed: +stats.spd.toFixed(2), gameplayPercentage: +gameplayPS.toFixed(2), baseMidiScore, finalScore: +finalScore.toFixed(2), rank, hitCount: finalHitCount, errorCount: finalErrorCount, totalNoteCount: totalNotes, playbackTempoMultiplier, totalWaitTimeMs: accumulatedWaitTimeRef.current, gameplayStyle });
            clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set<number>()); setMusicalCurrentTimeMs(totalDurationWithEndDelayMs);
            return;
        }
    }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [isPlayingRef, notesForGame, playbackTempoMultiplier, pausedMusicalTimeRef, waitMode, playSound, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, analysisResult, originalTotalMusicalDurationMs, totalDurationWithEndDelayMs, absoluteEndTimeMs, metronomeMode, metronomeOffsetMs, handleSeek, viewMode, gameSettings, barLines]);

  const freePlayLoop = useCallback(() => {
    // Use REF for checking state to avoid stale closure in the loop
    if (!isFreePlayModeRef.current) { 
        if (freePlayRequestRef.current) cancelAnimationFrame(freePlayRequestRef.current); 
        freePlayRequestRef.current = null; 
        return; 
    }
    
    const now = performance.now();
    const elapsed = now - freePlayStartTimeRef.current;
    setFreePlayElapsedTime(elapsed);
    setMusicalCurrentTimeMs(elapsed); // Sync visual time

    setFreePlayLiveNotes(prev => prev.filter(n => {
        if (n.endTime === null) return true;
        const noteAge = elapsed - n.endTime;
        return noteAge < 10000;
    }));

    const buffer = recentNotesBufferRef.current;
    for (const [midi, timestamp] of buffer.entries()) {
        if (elapsed - timestamp > FREE_PLAY_ARPEGGIO_WINDOW_MS) {
            buffer.delete(midi);
        }
    }

    freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
  }, []);

  const handleStartGame = (settings: GameSettings) => {
    setRenderedLayoutId(0); // Reset render signal
    setGameSettings(settings); setPlaybackTempoMultiplier(settings.playbackTempoMultiplier); setCurrentScreen('inGame');
    initializeAudioContext(); setPreviewPlaybackTempoMultiplier(1); setIsLoadingContent(true); isUserPausedRef.current = false;
    accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; setLiveAccuracy(100); setLiveSpeed(100); gameRealStartTimeRef.current = null;
    accumulatedSeekTimeRef.current = 0;
    setIsTopBarVisible(!autoHideTopBar);
  };

  const handleStartFreePlay = () => { 
    handleStopPlayback(); 
    
    // Explicitly set Free Play mode active
    setIsFreePlayMode(true); 
    isFreePlayModeRef.current = true;

    setCurrentScreen('inGame'); 
    initializeAudioContext(); 
    
    freePlayStartTimeRef.current = performance.now();
    if (!freePlayRequestRef.current) {
        freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
    }
    setIsTopBarVisible(!autoHideTopBar);
  };

  const handlePlay = useCallback(async () => {
    if (isFreePlayMode || notesForGame.length === 0 || isPlayingRef.current) return;
    if (!(await initializeAudioContext())) return;

    if (playtimeStartRef.current === null && gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) {
        playtimeStartRef.current = performance.now();
    }
    
    if (gameRealStartTimeRef.current === null) gameRealStartTimeRef.current = performance.now() - (pausedMusicalTimeRef.current / playbackTempoMultiplier);
    if (pauseStartTimeRef.current !== null) { 
        accumulatedPauseTimeRef.current += performance.now() - pauseStartTimeRef.current;
        pauseStartTimeRef.current = null; 
    }
    
    const startIndex = allBeatTimesRef.current.findIndex(b => b.timeMs >= pausedMusicalTimeRef.current);
    nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
    prevConceptualTimeRef.current = pausedMusicalTimeRef.current;

    setIsPlaying(true); isPlayingRef.current = true; isUserPausedRef.current = false; performanceStartTimeRef.current = performance.now();
    setMusicalCurrentTimeMs(pausedMusicalTimeRef.current); currentTimeRef.current = pausedMusicalTimeRef.current; prevMusicalTimeRef.current = pausedMusicalTimeRef.current;
    
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [notesForGame.length, initializeAudioContext, playbackLoop, isFreePlayMode, playbackTempoMultiplier]);

  const handlePause = useCallback(() => {
    if (isFreePlayMode || waitMode === 'retical' || !isPlayingRef.current) return;

    if (playtimeStartRef.current !== null) {
        sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current;
        playtimeStartRef.current = null;
    }

    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = true; pausedMusicalTimeRef.current = currentTimeRef.current;
    pauseStartTimeRef.current = performance.now(); if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
    clearScheduledNotes(); clearScheduledMetronomeSounds(); setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, waitMode, isFreePlayMode]);

  useEffect(() => {
    const p = () => { if (waitMode !== 'retical' && currentScreen === 'inGame' && isPlayingRef.current) { handlePause(); } };
    const r = () => { if (currentScreen === 'inGame' && !isPlayingRef.current && !isUserPausedRef.current && notesForGame.length > 0) handlePlay(); };
    const hv = () => document.hidden ? p() : r(); const hb = () => p(); const hf = () => r();
    document.addEventListener('visibilitychange', hv); window.addEventListener('blur', hb); window.addEventListener('focus', hf);
    return () => { document.removeEventListener('visibilitychange', hv); window.removeEventListener('blur', hb); window.removeEventListener('focus', hf); };
  }, [currentScreen, notesForGame.length, handlePlay, waitMode, handlePause]);

  const processKeyPress = useCallback((midi: number) => {
    const nr = performance.now(); if (isPlayingRef.current) lastPlayerInputRealTimeRef.current = nr;
    const isW = notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null, nm = currentTimeRef.current;
    if (isW) {
        const wn = notesForGame.filter(n => notesCurrentlyWaitingForIdsRef.current.has(n.noteId));
        if (waitMode === 'strict') {
            const m = wn.find(n => n.midi === midi && !hitNoteIdsRef.current.has(n.noteId));
            if (m) { setHitCount(p => p + 1); hitNoteIdsRef.current.add(m.noteId); visuallySatisfyNote(m); playerInputTimesRef.current.push(nr); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = nr; lastInputRealTimeRef.current = nr; const areAll = wn.filter(n => n.midi === midi).every(n => hitNoteIdsRef.current.has(n.noteId)); const ns = new Set(notesCurrentlyWaitingForRef.current); if (areAll) ns.delete(midi); updateNotesCurrentlyWaitingFor(ns); if (ns.size === 0) resumePlaybackFromWait(); }
            else setErrorCount(p => p + 1);
        } else {
            const m = wn.find(n => n.midi === midi && !hitNoteIdsRef.current.has(n.noteId));
            if (m) { setHitCount(p => p + 1); hitNoteIdsRef.current.add(m.noteId); visuallySatisfyNote(m); playerInputTimesRef.current.push(nr); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = nr; lastInputRealTimeRef.current = nr; }
            else setErrorCount(p => p + 1); resumePlaybackFromWait();
        }
    } else {
        const search = notesForGame.slice(Math.max(0, nextNoteIndexRef.current - 20), Math.min(notesForGame.length, nextNoteIndexRef.current + 80));
        let best: MidiNotePlaybackItem | null = null, min = Infinity;
        for (const n of search) { if (n.midi === midi && !presatisfiedNoteIdsRef.current.has(n.noteId) && n.timeMs > nm - 2500 && n.timeMs <= nm + 2500) { const d = Math.abs(n.timeMs - nm); if (d < min) { min = d; best = n; } } }
        if (best) { if (!hitNoteIdsRef.current.has(best.noteId)) { setHitCount(p => p + 1); hitNoteIdsRef.current.add(best.noteId); } satisfyUpcomingNote(best); playerInputTimesRef.current.push(nr); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = nr; lastInputRealTimeRef.current = nr; }
        else if (notesForGame.some(n => n.timeMs > nm - 1000 && n.timeMs <= nm + 1000 && !presatisfiedNoteIdsRef.current.has(n.noteId))) setErrorCount(p => p + 1);
    }
  }, [notesForGame, waitMode, visuallySatisfyNote, satisfyUpcomingNote, updateNotesCurrentlyWaitingFor, resumePlaybackFromWait]);

  const handleFreePlayKeyPress = useCallback((midi: number) => {
    const now = performance.now();
    const elapsed = now - freePlayStartTimeRef.current;
    const keyDef = midiNoteToKeyDefMap.get(midi);
    if (!keyDef) return;

    const liveNote: FreePlayLiveNote = {
        id: `fp-${midi}-${now}`,
        midi: midi,
        name: keyDef.name,
        startTime: elapsed,
        endTime: null,
        pitchClass: keyDef.displayName,
        hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right',
    };
    setFreePlayLiveNotes(prev => [...prev, liveNote]);

    recentNotesBufferRef.current.set(midi, elapsed);

    if (isRecording && recordingStartTimeRef.current !== null) {
        const recTime = now - recordingStartTimeRef.current;
        const newNote: MidiNotePlaybackItem = {
            noteId: `rec-${midi}-${now}`,
            midi: midi,
            timeMs: recTime,
            durationMs: 0,
            name: keyDef.name,
            pitchClass: keyDef.displayName,
            velocity: 0.75,
            hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right',
            originalTrackSourceInfo: 'recording'
        };
        setRecordedNotes(prev => [...prev, newNote]);
    }
  }, [isRecording, midiNoteToKeyDefMap]);

  const handleFreePlayKeyRelease = useCallback((midi: number) => {
    const now = performance.now();
    const elapsed = now - freePlayStartTimeRef.current;

    setFreePlayLiveNotes(prev => {
        const newNotes = [...prev];
        const index = [...newNotes].reverse().findIndex(n => n.midi === midi && n.endTime === null);
        if (index !== -1) {
            const actualIndex = newNotes.length - 1 - index;
            newNotes[actualIndex] = { ...newNotes[actualIndex], endTime: elapsed };
        }
        return newNotes;
    });

    if (isRecording && recordingStartTimeRef.current !== null) {
        const recEndTime = now - recordingStartTimeRef.current;
        setRecordedNotes(prev => {
            const newNotes = [...prev];
            const index = [...newNotes].reverse().findIndex(n => n.midi === midi && n.durationMs === 0);
            if (index === -1) return prev;

            const actualIndex = newNotes.length - 1 - index;
            const start = newNotes[actualIndex].timeMs;
            newNotes[actualIndex] = { ...newNotes[actualIndex], durationMs: Math.max(1, recEndTime - start) };
            return newNotes;
        });
    }
  }, [isRecording]);

  const handleUiKeyPress = useCallback((k: string, m: number) => { 
    setUserSustainedKeys(p => new Set(p).add(k)); 
    startSustainedSound(k, m); 
    if (isPlayingRef.current && !isFreePlayMode) {
      processKeyPress(m); 
    }
    if (isFreePlayMode) {
      handleFreePlayKeyPress(m);
    }
  }, [processKeyPress, startSustainedSound, isFreePlayMode, handleFreePlayKeyPress]);

  const handleUiKeyRelease = useCallback((k: string, m: number) => { 
    setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); 
    
    if (isSustainPedalActive) {
        sustainedByPedalKeysRef.current.set(k, m);
    } else {
        stopSustainedSound(k, m); 
    }

    if (isFreePlayMode) {
      handleFreePlayKeyRelease(m);
    }
  }, [stopSustainedSound, isFreePlayMode, handleFreePlayKeyRelease, isSustainPedalActive]);
  
  const loadFile = useCallback(async (f: File | null, id?: string | null, r?: boolean | null) => {
    setIsLoadingFile(true); handleStopPlayback(); setPlaybackNotes([]); setCurrentOnlineSongId(id || null); setIsCurrentSongRanked(r || null);
    if (!f) { setIsLoadingFile(false); return; }
    try {
        const ext = f.name.split('.').pop()?.toLowerCase(); 
        let res: any; // Explicitly type as any to handle mixed return types from parsers and JSON
        
        // Handle generated JSON files
        if (f.type === 'application/json') {
            const text = await f.text();
            res = JSON.parse(text);
            // Ensure compatibility if types differ slightly
            setCurrentFileType(FileType.UNKNOWN); 
        }
        else if (ext === 'mid' || ext === 'midi') res = await parseMidiData(await f.arrayBuffer(), midiNoteToNameMap);
        else if (ext === 'xml' || ext === 'musicxml') res = await parseMusicXmlData(await f.text(), midiNoteToNameMap);
        else if (ext === 'mxl') {
            const zip = await new JSZip().loadAsync(await f.arrayBuffer());
            let xml = await zip.file("META-INF/container.xml")?.async("string");
            if (xml) { const p = new DOMParser().parseFromString(xml, "application/xml"); const path = p.getElementsByTagName("rootfile")[0]?.getAttribute("full-path"); if (path) xml = await zip.file(path)?.async("string"); }
            if (!xml) { for (const obj of Object.values(zip.files)) { const z = obj as JSZipObject; if (!z.dir && (z.name.endsWith('.xml') || z.name.endsWith('.musicxml'))) { xml = await z.async("string"); break; } } }
            if (!xml) throw new Error(); res = await parseMusicXmlData(xml, midiNoteToNameMap);
        } else throw new Error();
        
        const notesWithF = assignFingering(res.notes);
        setPlaybackNotes(notesWithF); setCurrentFileName(f.name); setInitialTimeSignature(res.timeSignature); setInitialKeySignature(res.keySignature);
        setCurrentTempoBpm(res.initialTempoBpm); setTempoEvents(res.tempoEvents); setSignatureEvents(res.signatureEvents || []); 
        if (ext === 'mid' || ext === 'midi') setCurrentFileType(FileType.MIDI); 
        else if (ext === 'xml' || ext === 'musicxml' || ext === 'mxl') setCurrentFileType(FileType.MUSICXML);
        
        // Ensure barLines exists (might be missing in JSON)
        // FIX: Cast barLinesMs to number[] to resolve 'unknown[]' error
        setBarLines(((res as any).barLinesMs as number[]) || []);
        
        if (notesWithF.length > 0) await preloadSamplesForSong(notesWithF); else setIsPreloading(false);
    } catch (e) { console.error(e); alert("Error processing file."); } finally { setIsLoadingFile(false); setSelectedOnlineSongIdForNavigation(null); }
  }, [handleStopPlayback, preloadSamplesForSong, midiNoteToNameMap]);
  
  const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
      const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
      if (gameplayStyle === 'computer') return;

      const [c, n, v] = e.data, k = midiNoteToNameMap.get(n); if (!k) return;
      if (c === 144 && v > 0) { 
        setUserActiveKeys(p => new Set(p).add(k)); 
        setUserSustainedKeys(p => new Set(p).add(k)); 
        startSustainedSound(k, n, v / 127); 
        if (isPlayingRef.current && !isFreePlayMode) processKeyPress(n); 
        if (isFreePlayMode) handleFreePlayKeyPress(n);
      }
      else if (c === 128 || (c === 144 && v === 0)) { 
        setUserActiveKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); 
        setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); 
        
        if (isSustainPedalActive) {
            sustainedByPedalKeysRef.current.set(k, n);
        } else {
            stopSustainedSound(k, n); 
        }

        if (isFreePlayMode) handleFreePlayKeyRelease(n);
      }
  }, [midiNoteToNameMap, startSustainedSound, stopSustainedSound, processKeyPress, isFreePlayMode, handleFreePlayKeyPress, handleFreePlayKeyRelease, viewMode, isSustainPedalActive]);

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) { setMidiAccessStatus('unsupported'); return; }
    setMidiAccessStatus('requesting');
    try {
        const ma = await navigator.requestMIDIAccess({ sysex: false }); midiAccessInstanceRef.current = ma; setMidiAccessStatus('granted');
        setMidiInputs(new Map(ma.inputs.entries())); setMidiOutputs(new Map(ma.outputs.entries()));
        ma.onstatechange = () => { if (midiAccessInstanceRef.current) { const ci = new Map(midiAccessInstanceRef.current.inputs.entries()), co = new Map(midiAccessInstanceRef.current.outputs.entries()); setMidiInputs(ci); setMidiOutputs(co); } };
    } catch (err) { setMidiAccessStatus('denied'); }
  }, []);

  useEffect(() => {
    connectMidi();
  }, [connectMidi]);

  useEffect(() => {
    // Auto-select a MIDI input on initial load or if the selected one is unplugged.
    
    // If the selected device is no longer in the list, deselect it.
    if (selectedMidiInputId && !midiInputs.has(selectedMidiInputId)) {
      setSelectedMidiInputId(null);
    } 
    // If no device is selected but some are available (e.g., on first load), select the first one.
    else if (!selectedMidiInputId && midiInputs.size > 0) {
      const firstInputId = midiInputs.keys().next().value;
      setSelectedMidiInputId(firstInputId);
    }
    // This effect ONLY runs when midiInputs changes. This allows the user to manually 
    // select "Disconnect" (which sets selectedMidiInputId to null) without this
    // effect immediately re-selecting a device.
  }, [midiInputs]);

  useEffect(() => {
    // When MIDI devices change, check if the currently selected output is still available.
    // If not, fall back to the internal synth (null).
    if (selectedMidiOutputId && !midiOutputs.has(selectedMidiOutputId)) {
      setSelectedMidiOutputId(null);
    }
    // By default, the output is the internal synth. A device is not auto-selected.
  }, [midiOutputs, selectedMidiOutputId]);

  useEffect(() => {
    const ai = selectedMidiInputId ? midiInputs.get(selectedMidiInputId) : null;
    if (activeMidiInputDeviceRef.current) activeMidiInputDeviceRef.current.onmidimessage = null;
    if (ai) { ai.onmidimessage = handleMidiMessage; activeMidiInputDeviceRef.current = ai; }
    return () => { if (activeMidiInputDeviceRef.current) activeMidiInputDeviceRef.current.onmidimessage = null; }
  }, [selectedMidiInputId, midiInputs, handleMidiMessage]);

  const activeMidiNotesInfoForKeyboard = useMemo(() => {
    const notePerKey = new Map<string, ActiveMidiNoteInfo>(); if (isFreePlayMode) return notePerKey;
    for (const info of activePlaybackNotesInfo.values()) if (info.status === 'user_played') notePerKey.set(info.name, info);
    for (const n of notesForGame) if (musicalCurrentTimeMs >= n.timeMs && musicalCurrentTimeMs < (n.timeMs + Math.min(n.durationMs, VISUAL_NOTE_CAP_MS))) if (!notePerKey.has(n.name)) notePerKey.set(n.name, { ...n, status: activePlaybackNotesInfo.get(n.noteId)?.status || 'playing' });
    return notePerKey;
  }, [activePlaybackNotesInfo, musicalCurrentTimeMs, notesForGame, isFreePlayMode]);

  const handleQwertyKeyDown = useCallback((e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target === document.body) e.preventDefault();
    
    // NEW: Handle Spacebar for sustain pedal
    if (e.code === 'Space' && !e.repeat) {
        setIsSustainPedalActive(prev => {
            const isTurningOff = !prev;
            if (isTurningOff) {
                sustainedByPedalKeysRef.current.forEach((midiNote, keyName) => {
                    stopSustainedSound(keyName, midiNote);
                });
                sustainedByPedalKeysRef.current.clear();
            }
            return !prev;
        });
        return;
    }

    const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
    if (gameplayStyle === 'piano') return;

    if (e.repeat) return; const lower = e.code.toLowerCase();
    if (qwertyLayout === 'mirp') {
      if (lower === 'arrowup') { setMirpTranspose(p => p + 1); return; } if (lower === 'arrowdown') { setMirpTranspose(p => p - 1); return; }
      const entry = MIRP_KEYBOARD_MAPPING.find(m => m.code === e.code && m.shift === e.shiftKey);
      if (entry) { const midi = entry.midi + mirpTranspose, key = midiNoteToKeyDefMap.get(midi); activeMirpNotesRef.current.set(e.code, midi); if (key) handleUiKeyPress(key.name, key.midiNote); }
      return;
    }
    if (qwertyActiveKeysRef.current.has(lower)) return;
    if (OCTAVE_DOWN_KEYS.includes(lower)) { setQwertyCurrentOctaveShift(p => Math.max(MIN_QWERTY_OCTAVE_SHIFT, p - 1)); qwertyActiveKeysRef.current.add(lower); return; }
    if (OCTAVE_UP_KEYS.includes(lower)) { setQwertyCurrentOctaveShift(p => Math.min(MAX_QWERTY_OCTAVE_SHIFT, p + 1)); qwertyActiveKeysRef.current.add(lower); return; }
    const m = QWERTY_MINI_KEYBOARD_MAPPING.find(x => x.qwertyKey === lower);
    if (m) { const midi = m.midiBase + (qwertyCurrentOctaveShift * 12), key = midiNoteToKeyDefMap.get(midi); if (key) { qwertyActiveKeysRef.current.add(lower); handleUiKeyPress(key.name, key.midiNote); } }
  }, [qwertyLayout, mirpTranspose, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyPress, viewMode, stopSustainedSound]);
  
  const handleQwertyKeyUp = useCallback((e: KeyboardEvent) => {
    const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
    if (gameplayStyle === 'piano') return;

    const lower = e.code.toLowerCase();
    if (qwertyLayout === 'mirp') {
      const m = activeMirpNotesRef.current.get(e.code);
      if (m !== undefined) { const key = midiNoteToKeyDefMap.get(m); if (key) handleUiKeyRelease(key.name, key.midiNote); activeMirpNotesRef.current.delete(e.code); }
      return;
    }
    if (qwertyActiveKeysRef.current.has(lower)) qwertyActiveKeysRef.current.delete(lower);
    if (OCTAVE_DOWN_KEYS.includes(lower) || OCTAVE_UP_KEYS.includes(lower)) return;
    const m = QWERTY_MINI_KEYBOARD_MAPPING.find(x => x.qwertyKey === lower);
    if (m) { const midi = m.midiBase + (qwertyCurrentOctaveShift * 12), key = midiNoteToKeyDefMap.get(midi); if (key) { handleUiKeyRelease(key.name, key.midiNote); } }
  }, [qwertyLayout, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyRelease, viewMode]);

  useEffect(() => {
    if (currentScreen === 'inGame') { window.addEventListener('keydown', handleQwertyKeyDown); window.addEventListener('keyup', handleQwertyKeyUp); }
    return () => { window.removeEventListener('keydown', handleQwertyKeyDown); window.removeEventListener('keyup', handleQwertyKeyUp); };
  }, [currentScreen, handleQwertyKeyDown, handleQwertyKeyUp]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
        if (currentScreen !== 'inGame' || notesForGame.length === 0 || waitMode === 'retical') return;
        if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === 'ArrowRight') handleBarNavigation('forward'); else if (e.key === 'ArrowLeft') handleBarNavigation('backward');
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [currentScreen, notesForGame, waitMode, handleBarNavigation]);

  useEffect(() => {
    // If we're not in the game screen or not in the loading state, do nothing.
    if (currentScreen !== 'inGame' || !isLoadingContent) {
        return;
    }

    const startPlayback = () => {
        setIsLoadingContent(false);
        isUserPausedRef.current = false;
        if (document.hasFocus() && !isFreePlayMode) {
            handlePlay();
        }
    };

    // For the full sheet music view, which is the most complex to render.
    if (viewMode === 'sheet') {
        // Wait for VexFlow to signal it has rendered at least once.
        if (renderedLayoutId > 0) {
            const timer = setTimeout(startPlayback, 200); // 200ms buffer after render
            return () => clearTimeout(timer);
        }
    } else {
        // For 'falling', 'sheet-roll', 'sheet-qwerty' modes, a fixed delay is sufficient
        // to let the browser render initial elements and prevent stutter.
        const timer = setTimeout(startPlayback, 1500); // 1.5 seconds
        return () => clearTimeout(timer);
    }

  }, [currentScreen, isLoadingContent, viewMode, renderedLayoutId, isFreePlayMode, handlePlay]);

  useEffect(() => {
    const save = async () => {
      if (performanceSummary && !isPlaying && gameSettings?.waitMode === 'retical' && session && currentOnlineSongId && isCurrentSongRanked === true) {
        try {
          const { data: b } = await supabase.from('scores').select('final_score').eq('user_id', session.user.id).eq('song_id', currentOnlineSongId).order('final_score', { ascending: false }).limit(1);
          if (performanceSummary.finalScore > (b?.[0]?.final_score ?? -1)) {
            await supabase.from('scores').delete().eq('user_id', session.user.id).eq('song_id', currentOnlineSongId);
            await supabase.from('scores').insert({ user_id: session.user.id, song_id: currentOnlineSongId, final_score: performanceSummary.finalScore, accuracy: performanceSummary.accuracy, speed: performanceSummary.speed, rank: performanceSummary.rank, notes_hit: performanceSummary.hitCount, errors: performanceSummary.errorCount, total_notes: performanceSummary.totalNoteCount, mode: 'retical', tempo_multiplier: performanceSummary.playbackTempoMultiplier, total_wait_time_ms: performanceSummary.totalWaitTimeMs, gameplay_style: performanceSummary.gameplayStyle });
          }
        } catch (e) {}
      }
    };
    save();
  }, [performanceSummary, isPlaying, gameSettings, session, currentOnlineSongId, isCurrentSongRanked]);

  useEffect(() => {
    if (!isFreePlayMode) { setDetectedChord(null); return; }
    if (chordDetectionTimeoutRef.current) clearTimeout(chordDetectionTimeoutRef.current);
    
    chordDetectionTimeoutRef.current = window.setTimeout(() => {
      const buffer = recentNotesBufferRef.current;
      const elapsed = performance.now() - freePlayStartTimeRef.current;
      
      const recentMidis = Array.from(buffer.entries())
        .filter(([_, timestamp]) => elapsed - timestamp < FREE_PLAY_ARPEGGIO_WINDOW_MS)
        .map(([midi, _]) => midi);

      if (recentMidis.length < 2) { setDetectedChord(null); return; }

      const pcSet = new Set(recentMidis.map(m => m % 12));
      const pc = Array.from(pcSet).sort((a: number, b: number) => a - b);
      
      if (pc.length < 2) { setDetectedChord(null); return; }

      let bestMatch = null;
      for (const root of pc) {
        const normalizedIntervals = pc
          .map(p => (p - root + 12) % 12)
          .sort((a: number, b: number) => a - b)
          .join(',');
        
        const formula = CHORD_FORMULAS[normalizedIntervals];
        if (formula) {
          bestMatch = `${PITCH_CLASS_TO_NAME[root]}${formula.name}`;
          break;
        }
      }
      setDetectedChord(bestMatch);
    }, 50); 
    
    return () => { if (chordDetectionTimeoutRef.current) clearTimeout(chordDetectionTimeoutRef.current); };
  }, [userSustainedKeys, isFreePlayMode]);

  useEffect(() => {
    if (!isRecording && recordedNotes.length > 0) {
      setShowSaveButton(true);
    } else {
      setShowSaveButton(false);
    }
  }, [isRecording, recordedNotes.length]);


  const handleToggleRecording = useCallback(() => {
    if (!isRecording) {
        setRecordedNotes([]);
        setShowSaveButton(false);
        recordingStartTimeRef.current = performance.now();
        setIsRecording(true);
    } else {
        setIsRecording(false);
        recordingStartTimeRef.current = null;
    }
  }, [isRecording]);

  const handleSaveRecording = useCallback(() => {
    if (recordedNotes.length === 0 && userSustainedKeys.size === 0) return;
    
    try {
        const midi = new Midi();
        const track = midi.addTrack();
        track.name = "Recording";
        
        const now = performance.now();
        const recEndTime = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;

        const finalNotes = recordedNotes.map(note => {
            if (note.durationMs === 0 && recEndTime > note.timeMs) {
                return { ...note, durationMs: Math.max(1, recEndTime - note.timeMs) };
            }
            return note;
        });

        userSustainedKeys.forEach(keyName => {
            const keyDef = noteNameToKeyDefMap.get(keyName);
            if (keyDef && !recordedNotes.some(n => n.midi === keyDef.midiNote)) {
                 finalNotes.push({
                    noteId: `rec-sustained-${keyDef.midiNote}-${now}`,
                    midi: keyDef.midiNote,
                    timeMs: 0, // Assume it was held from the start of recording.
                    durationMs: recEndTime, // Held until the end.
                    name: keyDef.name,
                    pitchClass: keyDef.displayName,
                    velocity: 0.75,
                    hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right',
                    originalTrackSourceInfo: 'recording-sustained'
                } as MidiNotePlaybackItem);
            }
        });

        finalNotes.forEach(note => {
            if (note.durationMs > 0) {
                track.addNote({
                    midi: note.midi,
                    time: note.timeMs / 1000,
                    duration: note.durationMs / 1000,
                    velocity: note.velocity
                });
            }
        });

        // Use toArray() directly.
        const midiArray = midi.toArray();
        if (midiArray.length === 0) {
            alert("No notes recorded to save.");
            return;
        }
        
        const blob = new Blob([midiArray], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `octavia_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setRecordedNotes([]);
        setShowSaveButton(false);
    } catch (e) {
        console.error("Failed to save MIDI:", e);
        alert("Failed to generate MIDI file.");
    }
  }, [recordedNotes, userSustainedKeys, noteNameToKeyDefMap]);

  const RENDER_WINDOW_BLOCK_SIZE_MS = 5 * 1000;
  const RENDER_WINDOW_DURATION_MS = 10 * 1000;
  const currentRenderWindowBlock = Math.floor(musicalCurrentTimeMs / RENDER_WINDOW_BLOCK_SIZE_MS);

  // NEW: Windowed notes for falling notes view to improve performance
  const notesForFallingView = useMemo(() => {
    if (viewMode !== 'falling') return [];
    
    // Use the same block size as Vexflow for update consistency
    const windowStart = currentRenderWindowBlock * RENDER_WINDOW_BLOCK_SIZE_MS;
    
    // Window: 3 seconds behind the start of the current block, and 12 seconds ahead. Total 15 second window.
    const windowStartTimeMs = windowStart - 3000;
    const windowEndTimeMs = windowStart + 12000;

    return notesForGame.filter(note => {
        const noteStart = note.timeMs;
        const noteEnd = note.timeMs + note.durationMs;
        return noteEnd >= windowStartTimeMs && noteStart < windowEndTimeMs;
    });
  }, [notesForGame, viewMode, currentRenderWindowBlock]);

  const vexFlowData = useMemo(() => {
    if ((viewMode !== 'sheet' && viewMode !== 'sheet-roll' && viewMode !== 'sheet-qwerty') || !notesForGame.length || !initialTimeSignature || currentTempoBpm === null || currentTempoBpm <= 0) return null;
    if (baseCalculatedPianoWidth == null || baseCalculatedPianoWidth <= 0 || !Number.isFinite(baseCalculatedPianoWidth) || contentAreaHeight == null || contentAreaHeight <= 0 || !Number.isFinite(contentAreaHeight)) {
        return null;
    }

    try {
        const windowStart = currentRenderWindowBlock * RENDER_WINDOW_BLOCK_SIZE_MS;
        const windowEnd = windowStart + RENDER_WINDOW_DURATION_MS;

        const notesForWindow = notesForGame.filter(note => {
            const noteStart = note.timeMs;
            const noteEnd = note.timeMs + note.durationMs;
            return noteEnd >= windowStart && noteStart < windowEnd;
        });

        if (notesForWindow.length === 0 && windowStart < absoluteEndTimeMs) {
            return null;
        }

        const barLinesForWindow = barLines.filter(b => b >= windowStart && b < windowEnd);
        const firstBar = [...barLines].reverse().find(b => b < windowStart);
        if (firstBar !== undefined) {
            barLinesForWindow.unshift(firstBar);
        }

        const lastBar = barLines.find(b => b >= windowEnd);
        if (lastBar !== undefined) {
            barLinesForWindow.push(lastBar);
        } else {
            barLinesForWindow.push(absoluteEndTimeMs + END_PLAYBACK_DELAY_MS);
        }
        
        const uniqueBarLines = [...new Set(barLinesForWindow)].sort((a,b) => a-b);
        const isRollView = viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty';

        return getVexFlowRenderData(
            notesForWindow, 
            initialTimeSignature, 
            currentTempoBpm, 
            initialKeySignature, 
            isRollView ? noteSpeedMultiplier : sheetMusicZoom,
            uniqueBarLines, 
            signatureEvents, 
            baseCalculatedPianoWidth, 
            contentAreaHeight, 
            showOnlyMajorNotes,
            tempoEvents, 
            playbackTempoMultiplier, 
            isRollView
        );
    } catch (e) {
        console.error("Error generating VexFlow data:", e);
        return null;
    }
  }, [
    notesForGame, initialTimeSignature, currentTempoBpm, initialKeySignature, sheetMusicZoom,
    noteSpeedMultiplier, barLines, signatureEvents, baseCalculatedPianoWidth, contentAreaHeight,
    showOnlyMajorNotes, tempoEvents, playbackTempoMultiplier, viewMode, currentRenderWindowBlock, absoluteEndTimeMs
  ]);

  const handleExitSettingsPreview = useCallback(() => {
    if (!isSettingsPreviewActiveRef.current) return;

    handleStopPlayback(); // This already handles resetting the isPlaying states
    setPlaybackNotes([]);
    setCurrentFileName(null);
    setAnalysisResult(null);
    setInitialTimeSignature(DEFAULT_TIME_SIGNATURE);
    setInitialKeySignature(DEFAULT_KEY_SIGNATURE);
    setCurrentTempoBpm(null);
    setTempoEvents([]);
    setSignatureEvents([]);
    setBarLines([]);
    setTotalNoteCountForGame(0);

    isSettingsPreviewActiveRef.current = false;
}, [handleStopPlayback]);

const handleEnterSettingsPreview = useCallback(async () => {
    if (currentFileName) return;

    isSettingsPreviewActiveRef.current = true;
    setIsTopBarVisible(true); // ADDED: Show top bar when entering preview
    
    setGameSettings({
        waitMode: 'off',
        practiceHand: 'both',
        playbackTempoMultiplier: 1,
    });
    
    setIsLoadingFile(true);
    try {
        const response = await fetch('/sounds/test.mid');
        if (!response.ok) throw new Error('Failed to fetch preview MIDI');
        const blob = await response.blob();
        const file = new File([blob], 'Settings Preview.mid', { type: 'audio/midi' });
        
        const res = await parseMidiData(await file.arrayBuffer(), midiNoteToNameMap);
        const notesWithF = assignFingering(res.notes);

        setPlaybackNotes(notesWithF);
        setInitialTimeSignature(res.timeSignature);
        setInitialKeySignature(res.keySignature);
        setCurrentTempoBpm(res.initialTempoBpm);
        setTempoEvents(res.tempoEvents);
        setSignatureEvents(res.signatureEvents);
        setCurrentFileType(FileType.MIDI);
        setBarLines(res.barLinesMs);
        
        await preloadSamplesForSong(notesWithF);

    } catch (error) {
        console.error("Failed to load settings preview song:", error);
        handleExitSettingsPreview();
    } finally {
        setIsLoadingFile(false);
    }
}, [currentFileName, midiNoteToNameMap, preloadSamplesForSong, handleExitSettingsPreview]);

  // Fix: use Screen | undefined to match useRef initialization
  const prevScreenRef = useRef<Screen | undefined>(undefined);
  useEffect(() => {
    const previousScreen = prevScreenRef.current;
    if (previousScreen === 'settings' && currentScreen !== 'settings') {
        handleExitSettingsPreview();
    } else if (currentScreen === 'settings' && previousScreen !== 'settings') {
        handleEnterSettingsPreview();
    }
    prevScreenRef.current = currentScreen;
  }, [currentScreen, handleEnterSettingsPreview, handleExitSettingsPreview]);

useEffect(() => {
    if (isSettingsPreviewActiveRef.current && playbackNotes.length > 0 && !isPlayingRef.current) {
        handlePlay();
    }
}, [playbackNotes, handlePlay]);

const handleExitGame = useCallback(() => {
    const wasInFreePlay = isFreePlayModeRef.current;
    handleStopPlayback();
    if (wasInFreePlay) {
      sessionStorage.setItem('songSelectionInitialTab', 'local');
      setCurrentScreen('songSelection');
    } else {
      setCurrentScreen('modeSelection');
    }
  }, [handleStopPlayback]);

  const zoomScale = uiZoom / 100;
  const inverseZoomScale = 100 / zoomScale;

  return (
      <div ref={appRootRef} onClick={async (e) => {
          if (currentScreen === 'inGame') return;
          let t = e.target as HTMLElement | null, isI = false;
          while (t && t !== appRootRef.current) { if (t.matches('button, a, [role="button"], input, select, textarea, label') || window.getComputedStyle(t).cursor === 'pointer') { isI = true; break; } t = t.parentElement; }
          if (!isI || !(await initializeAudioContext())) return;
          const now = performance.now(); if (now - lastUiClickTimeRef.current > 500) uiClickComboIndexRef.current = 0;
          playSound(UI_CLICK_SOUND_SEQUENCE_MIDI[uiClickComboIndexRef.current], INTERACTIVE_NOTE_DURATION_MS, 0.4);
          uiClickComboIndexRef.current = (uiClickComboIndexRef.current + 1) % UI_CLICK_SOUND_SEQUENCE_MIDI.length; lastUiClickTimeRef.current = now;
      }} 
      className="text-white min-h-screen flex flex-col font-sans"
      style={{
        width: `${inverseZoomScale}%`,
        height: `${inverseZoomScale}%`,
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
        position: 'absolute',
        overflow: 'hidden',
        minHeight: 'unset' // Override min-h-screen when scaled to ensure proper layout
      }}
      >
        
        {/* Background Layer for Settings */}
        {currentScreen === 'settings' && isSettingsPreviewActiveRef.current && playbackNotes.length > 0 && (
          <div className="absolute inset-0 z-0 opacity-70">
             {/* Inserted TopBar for Settings Preview */}
             <div className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${autoHideTopBar ? (isTopBarVisible ? 'translate-y-0' : '-translate-y-full') : 'translate-y-0'}`}>
              <TopBar 
                onPlay={handlePlay} 
                onPause={handlePause} 
                onStop={handleStopPlayback} 
                onExit={() => {}} // No-op for preview
                isPlaying={isPlaying} 
                isFileLoaded={playbackNotes.length > 0} 
                fileName={currentFileName} 
                waitMode={waitMode} 
                metronomeMode={metronomeMode} 
                onCycleMetronomeMode={() => setMetronomeMode(p => p === 'off' ? 'beat' : (p === 'beat' ? 'bar' : 'off'))} 
                isMetronomeAvailable={isMetronomeAvailable} 
                hitCount={hitCount} 
                errorCount={errorCount} 
                liveAccuracy={liveAccuracy} 
                liveSpeed={liveSpeed} 
                totalNoteCount={totalNoteCountForGame} 
                currentTimeMs={musicalCurrentTimeMs / playbackTempoMultiplier} 
                totalDurationMs={absoluteEndTimeMs / playbackTempoMultiplier} 
                viewMode={viewMode} 
                noteSpeedMultiplier={noteSpeedMultiplier} 
                onNoteSpeedMultiplierChange={setNoteSpeedMultiplier} 
                sheetMusicZoom={sheetMusicZoom} 
                onSheetMusicZoomChange={setSheetMusicZoom} 
                analysisResult={analysisResult} 
                metronomeBeat={metronomeBeat} 
                totalWaitTimeMs={totalWaitTimeMs} 
                isFreePlayMode={isFreePlayMode} 
                isRecording={isRecording} 
                onToggleRecording={handleToggleRecording} 
                onSaveRecording={handleSaveRecording} 
                showSaveButton={showSaveButton} 
              />
            </div>

             <div ref={contentAreaRef} className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden">
                <div className="flex flex-col justify-end" style={{ width: `${baseCalculatedPianoWidth}px`, height: '100%' }}>
                  <div className="relative flex-grow w-full">
                    {viewMode === 'falling' ? (
                      <FallingNotesArea notes={notesForFallingView} currentTimeMs={musicalCurrentTimeMs} keyPositions={keyPositionsMap} activeMidiNotesInfo={activePlaybackNotesInfo} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={barLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={themeSettings.fallingNotesBackgroundColor} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeTempoBpm={activeBpmForDisplay} showOnlyMajorNotes={showOnlyMajorNotes} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                    ) : (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty') && vexFlowData ? (
                        <HorizontalNotesView currentTimeMs={musicalCurrentTimeMs} width={baseCalculatedPianoWidth} height={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5} activePlaybackNotesInfo={activePlaybackNotesInfo} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={'#F7F5ED'} vexFlowData={vexFlowData} showOnlyMajorNotes={showOnlyMajorNotes} noteLabelType={viewMode === 'sheet-qwerty' ? 'qwerty' : noteLabelType} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeBpmForDisplay={activeBpmForDisplay} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} isQwertyView={viewMode === 'sheet-qwerty'} />
                    ) : viewMode === 'sheet' && vexFlowData ? (
                      <VexFlowSheetMusicView notes={notesForGame} timeSignature={initialTimeSignature} keySignature={initialKeySignature} initialTempoBpm={currentTempoBpm || 120} width={baseCalculatedPianoWidth} height={contentAreaHeight} currentTimeMs={musicalCurrentTimeMs} totalDurationMs={originalTotalMusicalDurationMs} activePlaybackNotesInfo={activePlaybackNotesInfo} onSeek={handleSeek} isPlaying={isPlaying} sheetMusicZoom={sheetMusicZoom} barLines={barLines} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} signatureEvents={signatureEvents} onLayoutRendered={setRenderedLayoutId} tempoEvents={tempoEvents} playbackTempoMultiplier={playbackTempoMultiplier} />
                    ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><p className="text-slate-400 animate-pulse">Loading preview...</p></div>}
                  </div>
                  <div className="relative flex-shrink-0" style={{ width: '100%', height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px` }}>
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
                      qwertyCurrentOctaveShift={qwertyLayout === 'mirp' ? 0 : qwertyCurrentOctaveShift} 
                      width={baseCalculatedPianoWidth} 
                      layoutConfig={layoutConfig} 
                      qwertyLayout={qwertyLayout} 
                      mirpTranspose={mirpTranspose}
                      isInteractive={viewMode !== 'sheet-qwerty'} 
                    />
                     {isSustainPedalActive && (
                        <div 
                            className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded shadow-lg animate-pulse"
                            style={{ zIndex: 30 }}
                            aria-live="polite"
                        >
                            SUSTAIN
                        </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Screens */}
        {currentScreen === 'mainMenu' && <MainMenu onPlay={() => setCurrentScreen('songSelection')} onSettings={() => setCurrentScreen('settings')} onSocial={() => setCurrentScreen('leaderboard')} onOpenLoginModal={() => setIsAuthModalOpen(true)} onOpenAccountModal={() => setIsAccountModalOpen(true)} />}
        {currentScreen === 'leaderboard' && <Leaderboard onBack={() => setCurrentScreen('mainMenu')} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); setCurrentScreen('songSelection'); }} />}
        {currentScreen === 'songSelection' && <SongSelection onFileLoaded={loadFile} onSongSelected={() => setCurrentScreen('modeSelection')} onBack={() => { setCurrentScreen('mainMenu'); setSelectedOnlineSongIdForNavigation(null); setCurrentFileName(null); setPlaybackNotes([]); setAnalysisResult(null); }} loadedSongName={currentFileName} analysisResult={analysisResult} isLoading={isLoadingFile || isPreloading} selectedOnlineSongIdForNavigation={selectedOnlineSongIdForNavigation} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); }} onStartFreePlay={handleStartFreePlay} />}
        {currentScreen === 'modeSelection' && <ModeSelection onStartGame={handleStartGame} onBack={() => setCurrentScreen('songSelection')} analysisResult={analysisResult} analysisResultForPreview={previewAnalysisResult} fileName={currentFileName} initialTempoBpm={currentTempoBpm} initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier} onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange} currentHideBarNavigationButtons={hideBarNavigationButtons} onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} />}
        
        {currentScreen === 'settings' && (
           <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-40 p-4" onClick={(e) => e.target === e.currentTarget && setCurrentScreen('mainMenu')}>
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
                onViewModeChange={setViewMode} 
                noteLabelType={noteLabelType} 
                onNoteLabelTypeChange={setNoteLabelType} 
                showOnlyMajorNotes={showOnlyMajorNotes} 
                onShowOnlyMajorNotesChange={setShowOnlyMajorNotes} 
                showQwertyShortcuts={showQwertyShortcuts} 
                onShowQwertyShortcutsChange={setShowQwertyShortcuts} 
                hideBarNavigationButtons={hideBarNavigationButtons} 
                onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} 
                autoHideTopBar={autoHideTopBar} 
                onAutoHideTopBarChange={setAutoHideTopBar} 
                masterVolume={masterVolume} 
                onMasterVolumeChange={setMasterVolume} 
                metronomeVolume={metronomeVolume} 
                onMetronomeVolumeChange={setMetronomeVolume} 
                metronomeOffsetMs={metronomeOffsetMs} 
                onMetronomeOffsetChange={setMetronomeOffsetMs} 
                themeSettings={themeSettings} 
                onThemeSettingsChange={setThemeSettings} 
                devicePreset={devicePreset} 
                onDevicePresetChange={setDevicePreset}
                customWhiteKeyHeight={customWhiteKeyHeight}
                onCustomWhiteKeyHeightChange={setCustomWhiteKeyHeight}
                customBlackKeyHeight={customBlackKeyHeight}
                onCustomBlackKeyHeightChange={setCustomBlackKeyHeight}
                customKeyLabelHeight={customKeyLabelHeight}
                onCustomKeyLabelHeightChange={setCustomKeyLabelHeight}
                customMinWhiteKeyWidth={customMinWhiteKeyWidth}
                onCustomMinWhiteKeyWidthChange={setCustomMinWhiteKeyWidth} 
                pianoRangeMode={pianoRangeMode} 
                onPianoRangeModeChange={setPianoRangeMode} 
                customStartNote={customStartNote} 
                onCustomStartNoteChange={setCustomStartNote} 
                customEndNote={customEndNote} 
                onCustomEndNoteChange={setCustomEndNote} 
                qwertyLayout={qwertyLayout} 
                onQwertyLayoutChange={setQwertyLayout} 
                showPianoTilesBackground={showPianoTilesBackground} 
                onShowPianoTilesBackgroundChange={setShowPianoTilesBackground} 
                uiZoom={uiZoom}
                onUiZoomChange={setUiZoom}
              />
           </div>
        )}
        
        {currentScreen === 'inGame' && (
          <div className="flex-grow relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${autoHideTopBar ? (isTopBarVisible ? 'translate-y-0' : '-translate-y-full') : 'translate-y-0'}`} onMouseEnter={autoHideTopBar ? clearTopBarHideTimer : undefined} onMouseLeave={autoHideTopBar ? startTopBarHideTimer : undefined}>
              <TopBar onPlay={handlePlay} onPause={handlePause} onStop={handleStopPlayback} onExit={handleExitGame} isPlaying={isPlaying} isFileLoaded={playbackNotes.length > 0} fileName={currentFileName} waitMode={waitMode} metronomeMode={metronomeMode} onCycleMetronomeMode={() => setMetronomeMode(p => p === 'off' ? 'beat' : (p === 'beat' ? 'bar' : 'off'))} isMetronomeAvailable={isMetronomeAvailable} hitCount={hitCount} errorCount={errorCount} liveAccuracy={liveAccuracy} liveSpeed={liveSpeed} totalNoteCount={totalNoteCountForGame} currentTimeMs={musicalCurrentTimeMs / playbackTempoMultiplier} totalDurationMs={absoluteEndTimeMs / playbackTempoMultiplier} viewMode={viewMode} noteSpeedMultiplier={noteSpeedMultiplier} onNoteSpeedMultiplierChange={setNoteSpeedMultiplier} sheetMusicZoom={sheetMusicZoom} onSheetMusicZoomChange={setSheetMusicZoom} analysisResult={analysisResult} metronomeBeat={metronomeBeat} totalWaitTimeMs={totalWaitTimeMs} isFreePlayMode={isFreePlayMode} isRecording={isRecording} onToggleRecording={handleToggleRecording} onSaveRecording={handleSaveRecording} showSaveButton={showSaveButton} />
            </div>
            <div ref={contentAreaRef} className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden">
                {autoHideTopBar && <div className="absolute top-0 left-0 right-0 h-10 z-40" onMouseEnter={() => setIsTopBarVisible(true)} onClick={() => setIsTopBarVisible(true)} />}
                
                {/* Game content, always rendered when in-game */}
                <>
                  {!isFreePlayMode && <BarNavigationControls onNavigate={handleBarNavigation} isFileLoaded={notesForGame.length > 0} waitMode={waitMode} hideControls={hideBarNavigationButtons || metronomeMode === 'off'} barNavigationMode={metronomeMode} />}
                  <div className="flex flex-col justify-end" style={{ width: `${baseCalculatedPianoWidth}px`, height: '100%' }}>
                    <div className="relative flex-grow w-full">
                      {isFreePlayMode ? (
                        <div className="relative w-full h-full" style={{ backgroundColor: themeSettings.fallingNotesBackgroundColor }}>
                          <div className="absolute inset-0 z-0">
                              <ChordDisplay chord={detectedChord} />
                          </div>
                          <FallingNotesArea isRising={true} notes={[]} liveNotes={freePlayLiveNotes} currentTimeMs={freePlayElapsedTime} keyPositions={keyPositionsMap} activeMidiNotesInfo={new Map()} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={[]} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor="transparent" activeKeySignature="C" activeTempoBpm={120} showOnlyMajorNotes={false} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                        </div>
                      ) : viewMode === 'falling' ? (
                        <FallingNotesArea notes={notesForFallingView} currentTimeMs={musicalCurrentTimeMs} keyPositions={keyPositionsMap} activeMidiNotesInfo={activePlaybackNotesInfo} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={barLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={themeSettings.fallingNotesBackgroundColor} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeTempoBpm={activeBpmForDisplay} showOnlyMajorNotes={showOnlyMajorNotes} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                      ) : (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty') && vexFlowData ? (
                          <HorizontalNotesView
                              currentTimeMs={musicalCurrentTimeMs}
                              width={baseCalculatedPianoWidth}
                              height={contentAreaHeight}
                              pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5}
                              activePlaybackNotesInfo={activePlaybackNotesInfo}
                              rightHandColor={themeSettings.rightHandColor}
                              leftHandColor={themeSettings.leftHandColor}
                              backgroundColor={'#F7F5ED'}
                              vexFlowData={vexFlowData}
                              showOnlyMajorNotes={showOnlyMajorNotes}
                              noteLabelType={viewMode === 'sheet-qwerty' ? 'qwerty' : noteLabelType}
                              activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)}
                              activeBpmForDisplay={activeBpmForDisplay}
                              qwertyLayout={qwertyLayout}
                              qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                              mirpTranspose={mirpTranspose}
                              isQwertyView={viewMode === 'sheet-qwerty'}
                          />
                      ) : viewMode === 'sheet' && vexFlowData ? (
                        <VexFlowSheetMusicView notes={notesForGame} timeSignature={initialTimeSignature} keySignature={initialKeySignature} initialTempoBpm={currentTempoBpm || 120} width={baseCalculatedPianoWidth} height={contentAreaHeight} currentTimeMs={musicalCurrentTimeMs} totalDurationMs={originalTotalMusicalDurationMs} activePlaybackNotesInfo={activePlaybackNotesInfo} onSeek={handleSeek} isPlaying={isPlaying} sheetMusicZoom={sheetMusicZoom} barLines={barLines} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} signatureEvents={signatureEvents} onLayoutRendered={setRenderedLayoutId} tempoEvents={tempoEvents} playbackTempoMultiplier={playbackTempoMultiplier} />
                      ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><p className="text-slate-400 animate-pulse">Loading music...</p></div>}
                    </div>
                    {!isFreePlayMode && notesForGame.length > 0 && <div className="w-full"><ProgressBar currentTimeMs={musicalCurrentTimeMs} totalDurationMs={absoluteEndTimeMs} width={baseCalculatedPianoWidth} height={PROGRESS_BAR_HEIGHT_PX} onSeek={handleSeek} isPlaybackActive={isPlaying} isSeekingDisabled={waitMode === 'retical'} /></div>}
                    <div className="relative flex-shrink-0" style={{ width: '100%', height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px` }}>
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
                        qwertyCurrentOctaveShift={qwertyLayout === 'mirp' ? 0 : qwertyCurrentOctaveShift} 
                        width={baseCalculatedPianoWidth} 
                        layoutConfig={layoutConfig} 
                        qwertyLayout={qwertyLayout} 
                        mirpTranspose={mirpTranspose} 
                        isInteractive={viewMode !== 'sheet-qwerty'} // Disable virtual piano input in computer keyboard mode
                      />
                      {isSustainPedalActive && (
                          <div 
                              className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded shadow-lg animate-pulse"
                              style={{ zIndex: 30 }}
                              aria-live="polite"
                          >
                              SUSTAIN
                          </div>
                      )}
                    </div>
                  </div>
                </>

                {/* Loading overlay */}
                {isLoadingContent && <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30"><div className="flex items-center space-x-3 p-4 text-sky-300 font-semibold text-lg"><svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading Game...</span></div></div>}
            </div>
            <PerformanceSummaryModal 
                isVisible={!!performanceSummary} 
                summary={performanceSummary} 
                onClose={() => { 
                    handleStopPlayback();
                    uploadSessionStats();
                    setPerformanceSummary(null); 
                }} 
            />
            <GameOverModal
                isVisible={isGameOver}
                reason={gameOverReason}
                onClose={handleCloseGameOverModal}
            />
          </div>
        )}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); setCurrentScreen('songSelection'); }} />
      </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
