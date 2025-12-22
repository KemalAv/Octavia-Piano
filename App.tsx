
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { KeyPosition, PianoKeyDefinition, MidiNotePlaybackItem, ActiveMidiNoteInfo, MIDIInput, MIDIMessageEvent, MIDIAccess, MIDIOutput, TimeSignatureInfo, FileType, ExtendedResult, MidiAccessStatus, MetronomeMode, WaitMode, ViewMode, Screen, GameSettings, NoteLabelType, PracticeHand, ThemeSettings, PerformanceSummary, TempoEvent, DevicePreset, LayoutDimensions, QwertyLayout, BeatInfo } from './types';
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
  VISUAL_NOTE_CAP_MS
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
import AdBanner from './components/AdBanner';
import ChordDisplay from './components/ChordDisplay';


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

const END_PLAYBACK_DELAY_MS = 200; // Small delay buffer for snapping the ending precisely
const UI_CLICK_SOUND_SEQUENCE_MIDI = [60, 62, 64, 65, 67, 69, 71]; 

const PITCH_CLASS_TO_NAME: { [key: number]: string } = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

const CHORD_FORMULAS: { [key: string]: { name: string, intervals: number[] } } = {
  '0,4,7': { name: '', intervals: [0, 4, 7] }, '0,3,7': { name: 'm', intervals: [0, 3, 7] }, '0,3,6': { name: 'dim', intervals: [0, 3, 6] },
  '0,4,8': { name: 'aug', intervals: [0, 4, 8] }, '0,2,7': { name: 'sus2', intervals: [0, 2, 7] }, '0,5,7': { name: 'sus4', intervals: [0, 5, 7] },
  '0,4,7,11': { name: 'maj7', intervals: [0, 4, 7, 11] }, '0,3,7,10': { name: 'm7', intervals: [0, 3, 7, 10] }, '0,4,7,10': { name: '7', intervals: [0, 4, 7, 10] },
  '0,3,6,9': { name: 'dim7', intervals: [0, 3, 6, 9] }, '0,3,6,10': { name: 'm7b5', intervals: [0, 3, 6, 10] }, '0,4,7,9': { name: '6', intervals: [0, 4, 7, 9] }, '0,3,7,9': { name: 'm6', intervals: [0, 3, 7, 9] }
};

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mainMenu');
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false); 
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); 
  const { session } = useAuth(); 

  const [isFreePlayMode, setIsFreePlayMode] = useState(false);
  const [detectedChord, setDetectedChord] = useState<string | null>(null);
  const chordDetectionTimeoutRef = useRef<number | null>(null);
  const [selectedOnlineSongIdForNavigation, setSelectedOnlineSongIdForNavigation] = useState<string | null>(null);

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
  const [customWhiteKeyHeight, setCustomWhiteKeyHeight] = useState(DEVICE_LAYOUTS(88).desktop.whiteKeyHeight);
  const [customBlackKeyHeight, setCustomBlackKeyHeight] = useState(DEVICE_LAYOUTS(88).desktop.blackKeyHeight);
  const [customKeyLabelHeight, setCustomKeyLabelHeight] = useState(DEVICE_LAYOUTS(88).desktop.keyLabelHeight);
  const [customMinWhiteKeyWidth, setCustomMinWhiteKeyWidth] = useState(DEVICE_LAYOUTS(88).desktop.minWhiteKeyWidth);
  const [pianoRangeMode, setPianoRangeMode] = useState<'full' | '61-key' | '37-key' | '25-key' | 'custom'>('full');
  const [customStartNote, setCustomStartNote] = useState('C3');
  const [customEndNote, setCustomEndNote] = useState('C5');

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
      if (devicePreset === 'custom') return { whiteKeyHeight: customWhiteKeyHeight, blackKeyHeight: customBlackKeyHeight, keyLabelHeight: customKeyLabelHeight, minWhiteKeyWidth: customMinWhiteKeyWidth };
      return DEVICE_LAYOUTS(totalKeys)[devicePreset];
  }, [devicePreset, customWhiteKeyHeight, customBlackKeyHeight, customKeyLabelHeight, customMinWhiteKeyWidth, visiblePianoKeys.length]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const activeKeyTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeAudioNodesRef = useRef<Map<string, ActiveAudioNode>>(new Map());
  const audioBufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const lastUiClickTimeRef = useRef<number>(0);
  const uiClickComboIndexRef = useRef<number>(0);
  const metronomeBuffersRef = useRef<{ strong?: AudioBuffer; weak?: AudioBuffer }>({});
  
  const [playbackNotes, setPlaybackNotes] = useState<MidiNotePlaybackItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [currentFileType, setCurrentFileType] = useState<FileType>(FileType.UNKNOWN);
  // FIX: Use FileType.UNKNOWN from corrected types.ts
  const fileTypeRef = useRef<FileType>(FileType.UNKNOWN);
  useEffect(() => { fileTypeRef.current = currentFileType; }, [currentFileType]);
  const [currentOnlineSongId, setCurrentOnlineSongId] = useState<string | null>(null); 
  const [isCurrentSongRanked, setIsCurrentSongRanked] = useState<boolean | null>(null); 
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [activePlaybackNotesInfo, setActivePlaybackNotesInfo] = useState<Map<string, ActiveMidiNoteInfo>>(new Map());
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0); 
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
  const chordRecognitionTimeoutIdRef = useRef<number | null>(null);
  const rhythmChordBufferRef = useRef<Set<number>>(new Set());

  const [totalWaitTimeMs, setTotalWaitTimeMs] = useState<number>(0);
  const accumulatedWaitTimeRef = useRef<number>(0);
  const waitStartTimeRef = useRef<number | null>(null);
  const accumulatedPauseTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  
  const [initialTimeSignature, setInitialTimeSignature] = useState<TimeSignatureInfo>(DEFAULT_TIME_SIGNATURE); 
  const [initialKeySignature, setInitialKeySignature] = useState<string>(DEFAULT_KEY_SIGNATURE); 
  const [currentTempoBpm, setCurrentTempoBpm] = useState<number | null>(null);
  const [tempoEvents, setTempoEvents] = useState<TempoEvent[]>([]);
  const [barLines, setBarLines] = useState<number[]>([]);
  const [signatureEvents, setSignatureEvents] = useState<SignatureEvent[]>([]); 
  
  const scheduledMetronomeAudioNodesRef = useRef<MetronomeAudioNode[]>([]);
  const lastMetronomeScheduleTimeRef = useRef<number>(0);
  const [metronomeBeat, setMetronomeBeat] = useState<'strong' | 'weak' | null>(null);
  const lastMetronomeVisualBeatRef = useRef<'strong' | 'weak' | null>(null);
  const scheduledMetronomeBeatsRef = useRef<BeatInfo[]>([]); 
  const [metronomeOffsetMs, setMetronomeOffsetMs] = useState<number>(-25);
  
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
  const [metronomeMode, setMetronomeMode] = useState<MetronomeMode>('off');
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

  const [playbackTempoMultiplier, setPlaybackTempoMultiplier] = useState<number>(1);
  const [previewPlaybackTempoMultiplier, setPreviewPlaybackTempoMultiplier] = useState<number>(1);

  // Add the `onHideBarNavigationButtonsChange` handler here.
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

  const notesForGame = useMemo(() => {
    if (isFreePlayMode) return [];
    if (!gameSettings?.practiceHand || !playbackNotes) return playbackNotes;
    if (gameSettings.practiceHand === 'both') return playbackNotes;
    return playbackNotes.filter(note => note.hand === gameSettings.practiceHand);
  }, [playbackNotes, gameSettings?.practiceHand, isFreePlayMode]);

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

  const originalTotalMusicalDurationMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    const startTime = notesForGame.reduce((min, note) => Math.min(min, note.timeMs), Infinity);
    const endTime = notesForGame.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
    return isFinite(startTime) ? endTime - startTime : 0;
  }, [notesForGame]);

  // Calculated absolute end time based on the finish point of the last note.
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

  // NEW: Calculate Preview Analysis Result based on previewPlaybackTempoMultiplier
  // This ensures the ModeSelection screen updates immediately when dragging the slider
  const previewAnalysisResult = useMemo(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) return null;
    const scaledNotes = playbackNotes.map(note => ({
      ...note,
      timeMs: note.timeMs / previewPlaybackTempoMultiplier,
      durationMs: note.durationMs / previewPlaybackTempoMultiplier
    }));
    return analyzeMidi(scaledNotes, originalTotalMusicalDurationMs / previewPlaybackTempoMultiplier, undefined, originalTotalMusicalDurationMs);
  }, [playbackNotes, originalTotalMusicalDurationMs, previewPlaybackTempoMultiplier]);

  const vexFlowData = useMemo(() => {
      if (viewMode !== 'sheet' && viewMode !== 'sheet-roll') return null;
      if (!notesForGame.length || !initialTimeSignature || !currentTempoBpm) return null;
      if (baseCalculatedPianoWidth <= 0 || contentAreaHeight <= 0) return null;
      const zoomForVex = viewMode === 'sheet' ? sheetMusicZoom : noteSpeedMultiplier;
      try {
          return getVexFlowRenderData(
              notesForGame, initialTimeSignature, currentTempoBpm, initialKeySignature, zoomForVex,
              barLines, signatureEvents, baseCalculatedPianoWidth, contentAreaHeight, true, 
              tempoEvents, playbackTempoMultiplier, viewMode === 'sheet-roll' 
          );
      } catch (e) { console.error("Error generating VexFlow data:", e); return null; }
  }, [notesForGame, initialTimeSignature, currentTempoBpm, initialKeySignature, sheetMusicZoom, barLines, signatureEvents, baseCalculatedPianoWidth, contentAreaHeight, tempoEvents, playbackTempoMultiplier, viewMode, noteSpeedMultiplier]);

  const onPlaybackTempoMultiplierChange = useCallback((multiplier: number) => setPreviewPlaybackTempoMultiplier(multiplier), []);

  const startTopBarHideTimer = useCallback(() => {
    if (topBarTimeoutRef.current) clearTimeout(topBarTimeoutRef.current);
    topBarTimeoutRef.current = window.setTimeout(() => setIsTopBarVisible(false), 5000);
  }, []);

  const clearTopBarHideTimer = useCallback(() => {
    if (topBarTimeoutRef.current) { clearTimeout(topBarTimeoutRef.current); topBarTimeoutRef.current = null; }
  }, []);

  useEffect(() => {
    if (autoHideTopBar && isTopBarVisible && currentScreen === 'inGame') startTopBarHideTimer(); else clearTopBarHideTimer();
    return clearTopBarHideTimer;
  }, [autoHideTopBar, isTopBarVisible, currentScreen, startTopBarHideTimer, clearTopBarHideTimer]);

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
          if (currentScreen !== 'inGame') return; 
          const contentAreaDiv = contentAreaRef.current;
          if (!contentAreaDiv) { setContentAreaHeight(300); return; }
          const totalAvailableContentHeight = contentAreaDiv.clientHeight;
          const actualHeightForDynamicView = Math.max(0, totalAvailableContentHeight - (notesForGame.length > 0 ? PROGRESS_BAR_HEIGHT_PX : 0) - (layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight));
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
  }, [notesForGame.length, currentScreen, layoutConfig]);

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

  // Initialize audio context and preload UI sounds on mount
  useEffect(() => {
    const setupAudio = async () => {
      // Create context (starts suspended)
      await initializeAudioContext(false);
      
      // Preload UI click sounds
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
    if (!audioContextRef.current || !masterGainRef.current || activeAudioNodesRef.current.has(keyName)) return;
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
        try { nodes.gainNode.gain.cancelScheduledValues(now); nodes.gainNode.gain.setValueAtTime(nodes.gainNode.gain.value, now); nodes.gainNode.gain.linearRampToValueAtTime(0.00001, now + 0.02); if (nodes.oscillator) nodes.oscillator.stop(now + 0.02); if (nodes.source) nodes.source.stop(now + 0.02); } catch (e) {}
      });
    }
    scheduledMetronomeAudioNodesRef.current = []; scheduledMetronomeBeatsRef.current = []; lastMetronomeVisualBeatRef.current = null;
  }, []);

  const scheduleMetronomeSounds = useCallback((songTimeAtSchedulingStartMs: number) => {
    clearScheduledMetronomeSounds();
    if (metronomeMode === 'off' || !audioContextRef.current || audioContextRef.current.state !== 'running' || originalTotalMusicalDurationMs <= 0) return;
    const audioCtx = audioContextRef.current, audioContextTimeAtSchedulingStart = audioCtx.currentTime, SCHEDULING_WINDOW_MUSICAL_MS = 4000, endSchedulingMusicalTimeMs = songTimeAtSchedulingStartMs + SCHEDULING_WINDOW_MUSICAL_MS;
    let beatsToSchedule: BeatInfo[] = [];
    if (metronomeMode === 'bar') { beatsToSchedule = barLines.filter(barTimeMs => barTimeMs >= songTimeAtSchedulingStartMs && barTimeMs < endSchedulingMusicalTimeMs).map(barTimeMs => ({ timeMs: barTimeMs, isStrong: true })); }
    else if (metronomeMode === 'beat') { beatsToSchedule = getBeatTimesInWindow(songTimeAtSchedulingStartMs, endSchedulingMusicalTimeMs, playbackTempoMultiplier, currentTempoBpm || DEFAULT_MUSICXML_TEMPO_BPM, tempoEvents, initialTimeSignature, signatureEvents, barLines); }
    beatsToSchedule.forEach(beat => {
      const targetAudioContextTimeForBeat = audioContextTimeAtSchedulingStart + ((beat.timeMs - songTimeAtSchedulingStartMs) / playbackTempoMultiplier / 1000) + (metronomeOffsetMs / 1000);
      if (targetAudioContextTimeForBeat >= audioCtx.currentTime - 0.05) {
        const buffer = beat.isStrong ? metronomeBuffersRef.current.strong : metronomeBuffersRef.current.weak;
        if (buffer) {
          const source = audioCtx.createBufferSource(); source.buffer = buffer; const gainNode = audioCtx.createGain();
          gainNode.gain.setValueAtTime(0, targetAudioContextTimeForBeat); gainNode.gain.linearRampToValueAtTime(1.0, targetAudioContextTimeForBeat + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, targetAudioContextTimeForBeat + buffer.duration * 0.8);
          source.connect(gainNode); gainNode.connect(metronomeGainRef.current!); source.start(targetAudioContextTimeForBeat); source.stop(targetAudioContextTimeForBeat + buffer.duration);
          scheduledMetronomeAudioNodesRef.current.push({ source, gainNode });
        }
      }
    });
    scheduledMetronomeBeatsRef.current = beatsToSchedule;
  }, [metronomeMode, barLines, originalTotalMusicalDurationMs, playbackTempoMultiplier, metronomeOffsetMs, tempoEvents, currentTempoBpm, initialTimeSignature, signatureEvents, clearScheduledMetronomeSounds]);

  const clearScheduledNotes = useCallback(() => { scheduledNoteTimeoutsRef.current.forEach(clearTimeout); scheduledNoteTimeoutsRef.current.clear(); activeNoteInstancesRef.current.clear(); setActivePlaybackNotesInfo(new Map()); }, []);

  const resumePlaybackFromWait = useCallback(() => {
    const completedBlockTimeMusical = waitingBlockTimeRef.current;
    if (completedBlockTimeMusical === null) return;
    if (waitStartTimeRef.current !== null) { accumulatedWaitTimeRef.current += (performance.now() - waitStartTimeRef.current); waitStartTimeRef.current = null; }
    pausedMusicalTimeRef.current = completedBlockTimeMusical; setMusicalCurrentTimeMs(completedBlockTimeMusical);
    if (resumeIndexRef.current !== null) { nextNoteIndexRef.current = resumeIndexRef.current; resumeIndexRef.current = null; }
    performanceStartTimeRef.current = performance.now(); lastPlayerInputRealTimeRef.current = performance.now(); waitingBlockTimeRef.current = null;
    updateNotesCurrentlyWaitingFor(new Set()); notesCurrentlyWaitingForIdsRef.current = new Set();
    setActivePlaybackNotesInfo(prev => {
        const newMap = new Map(prev); const keysToDelete: string[] = [];
        newMap.forEach((v: ActiveMidiNoteInfo, k: string) => { if (v.status === 'waiting') keysToDelete.push(k); });
        keysToDelete.forEach(k => newMap.delete(k)); return newMap;
    });
    if (metronomeMode !== 'off') { scheduleMetronomeSounds(pausedMusicalTimeRef.current); lastMetronomeScheduleTimeRef.current = pausedMusicalTimeRef.current; }
  }, [metronomeMode, scheduleMetronomeSounds, updateNotesCurrentlyWaitingFor]);

  const handleStopPlayback = useCallback(() => {
    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false;
    if (playbackRequestRef.current) { cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; }
    setMusicalCurrentTimeMs(0); currentTimeRef.current = 0; pausedMusicalTimeRef.current = 0; nextNoteIndexRef.current = 0; lastMetronomeScheduleTimeRef.current = 0;
    clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set()); notesCurrentlyWaitingForIdsRef.current = new Set();
    waitingBlockTimeRef.current = null; resumeIndexRef.current = null; presatisfiedNoteIdsRef.current = new Set(); setActivePlaybackNotesInfo(new Map());
    if (chordRecognitionTimeoutIdRef.current) { clearTimeout(chordRecognitionTimeoutIdRef.current); chordRecognitionTimeoutIdRef.current = null; }
    hitCountRef.current = 0; errorCountRef.current = 0; hitNoteIdsRef.current.clear(); setHitCount(0); setErrorCount(0); setLiveAccuracy(100); setLiveSpeed(100);
    gameRealStartTimeRef.current = null; setTotalWaitTimeMs(0); accumulatedWaitTimeRef.current = 0; waitStartTimeRef.current = null;
    accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; playerInputTimesRef.current = []; firstInputRealTimeRef.current = null;
    lastInputRealTimeRef.current = null; setPerformanceSummary(null); setIsLoadingContent(false); setIsFreePlayMode(false); setDetectedChord(null); setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor]);

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

  const playbackLoop = useCallback(() => {
    if (!isPlayingRef.current || notesForGame.length === 0) { if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; return; }
    const currentRealTime = performance.now(), realTimeElapsedSinceStartOrPause = currentRealTime - performanceStartTimeRef.current, conceptualMusicalTime = pausedMusicalTimeRef.current + (realTimeElapsedSinceStartOrPause * playbackTempoMultiplier);
    let actualMusicalTimeForGameLogic: number; const lastMusicalTime = prevMusicalTimeRef.current;
    const isInWaitState = (waitMode === 'strict' || waitMode === 'lenient' || waitMode === 'rhythm' || waitMode === 'retical') && notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    if (isInWaitState) { 
      actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!; 
      if (waitStartTimeRef.current === null) waitStartTimeRef.current = performance.now();
      setTotalWaitTimeMs(accumulatedWaitTimeRef.current + (performance.now() - waitStartTimeRef.current));
    } else { 
      actualMusicalTimeForGameLogic = conceptualMusicalTime; setMusicalCurrentTimeMs(conceptualMusicalTime);
      if (totalWaitTimeMs !== accumulatedWaitTimeRef.current) setTotalWaitTimeMs(accumulatedWaitTimeRef.current);
    }
    currentTimeRef.current = actualMusicalTimeForGameLogic; prevMusicalTimeRef.current = actualMusicalTimeForGameLogic;
    if (isPlayingRef.current && gameRealStartTimeRef.current !== null) {
        const idealTimeElapsedSoFar = currentTimeRef.current / playbackTempoMultiplier, actualDurationSoFar = (performance.now() - gameRealStartTimeRef.current) - accumulatedPauseTimeRef.current;
        setLiveSpeed(actualDurationSoFar > 500 && idealTimeElapsedSoFar > 0 ? Math.min(100, (idealTimeElapsedSoFar / actualDurationSoFar) * 100) : 100);
    }
    if (isPlayingRef.current && metronomeMode !== 'off') {
        if (isInWaitState) { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; } 
        else {
            if (currentTimeRef.current > lastMetronomeScheduleTimeRef.current + 2000) { scheduleMetronomeSounds(currentTimeRef.current); lastMetronomeScheduleTimeRef.current = currentTimeRef.current; }
            if (scheduledMetronomeBeatsRef.current.length > 0) {
              const currentBeat = scheduledMetronomeBeatsRef.current.find(beat => beat.timeMs > lastMusicalTime && beat.timeMs <= actualMusicalTimeForGameLogic);
              if (currentBeat) { const ns = currentBeat.isStrong ? 'strong' : 'weak'; if (ns !== lastMetronomeVisualBeatRef.current) { setMetronomeBeat(ns); lastMetronomeVisualBeatRef.current = ns; } }
              else if (actualMusicalTimeForGameLogic > lastMusicalTime) { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; }
            } else { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; }
        }
    } else { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; }

    let currentProcessingIdx = nextNoteIndexRef.current;
    const notesToSetWaitingThisFrame: MidiNotePlaybackItem[] = [];
    while (currentProcessingIdx < notesForGame.length) {
      const note = notesForGame[currentProcessingIdx];
      if (currentTimeRef.current >= note.timeMs) {
        if (presatisfiedNoteIdsRef.current.has(note.noteId)) { presatisfiedNoteIdsRef.current.delete(note.noteId); currentProcessingIdx++; continue; }
        if (waitMode === 'off') {
          const noteId = note.noteId;
          if (!activeNoteInstancesRef.current.has(noteId)) {
            playSound(note.midi, note.durationMs, note.velocity); activeNoteInstancesRef.current.set(noteId, note);
            if (!hitNoteIdsRef.current.has(noteId)) { hitNoteIdsRef.current.add(noteId); setHitCount(prev => prev + 1); }
            setActivePlaybackNotesInfo(prev => new Map(prev).set(noteId, { noteId, name: note.name, timeMs: note.timeMs, hand: note.hand, midi: note.midi, pitchClass: note.pitchClass, status: 'playing', finger: note.finger }));
            const hd = Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) / playbackTempoMultiplier;
            scheduledNoteTimeoutsRef.current.set(noteId, window.setTimeout(() => { activeNoteInstancesRef.current.delete(noteId); scheduledNoteTimeoutsRef.current.delete(noteId); setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); nm.delete(noteId); return nm; }); }, hd));
          }
        } else { notesToSetWaitingThisFrame.push(note); }
        currentProcessingIdx++;
      } else break;
    }
    if ((waitMode === 'strict' || waitMode === 'lenient' || waitMode === 'rhythm' || waitMode === 'retical') && notesToSetWaitingThisFrame.length > 0) {
        const firstDueNote = notesToSetWaitingThisFrame[0], blockStartTime = firstDueNote.timeMs, CHORD_WINDOW_MS = (waitMode === 'strict') ? 30 : 150;
        const chordBlock = notesToSetWaitingThisFrame.filter(n => (n.timeMs - blockStartTime) < CHORD_WINDOW_MS);
        let lookaheadIndex = currentProcessingIdx;
        while (lookaheadIndex < notesForGame.length) { const n = notesForGame[lookaheadIndex]; if ((n.timeMs - blockStartTime) < CHORD_WINDOW_MS) { if (!presatisfiedNoteIdsRef.current.has(n.noteId)) chordBlock.push(n); lookaheadIndex++; } else break; }
        if (chordBlock.length > 0) {
            if (metronomeMode !== 'off') { clearScheduledMetronomeSounds(); lastMetronomeScheduleTimeRef.current = 0; setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; }
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

    // UPDATE LIVE ACCURACY HUD (OSU-STYLE)
    if (isPlayingRef.current) {
        const currentHits = hitCountRef.current;
        const currentErrors = errorCountRef.current;
        const totalEncounteredSoFar = currentProcessingIdx;
        
        // Denominator: max(passed notes, hits) + errors to account for extra key presses
        const denominator = Math.max(currentHits, totalEncounteredSoFar) + currentErrors;
        const liveAcc = denominator > 0 ? (currentHits / denominator) * 100 : 100;
        setLiveAccuracy(liveAcc);
    }

    // Ending trigger: Finish game once absolute end time is reached
    if (actualMusicalTimeForGameLogic >= totalDurationWithEndDelayMs && absoluteEndTimeMs > 0) {
        setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false;
        if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
        const finalHitCount = hitCountRef.current, finalErrorCount = errorCountRef.current, totalNotes = notesForGame.length;
        let isAutoPlay = waitMode === 'off';
        
        // --- START FIX for Speed Efficiency Calculation ---
        let actDur: number;
        const idealDuration = absoluteEndTimeMs / playbackTempoMultiplier;
        if (isAutoPlay) {
            // For autoplay mode, actual duration is ideal duration.
            actDur = idealDuration;
        } else {
            // For interactive modes, actual duration is ideal duration + total time spent waiting for user.
            // This isolates player performance from system/rendering latency.
            actDur = idealDuration + accumulatedWaitTimeRef.current;
        }
        // --- END FIX for Speed Efficiency Calculation ---
        
        const calculateStats = (h: number, e: number, t: number, a: boolean, dur: number) => {
            if (a) return { acc: 100, spd: 100 };
            const den = Math.max(h, t) + e;
            const acc = den > 0 ? (h / den) * 100 : 100;
            const ideal = absoluteEndTimeMs / playbackTempoMultiplier;
            const spd = (ideal > 0 && dur > 0 ? Math.min(100, (ideal / dur) * 100) : 0);
            return { acc, spd };
        };
        const stats = calculateStats(finalHitCount, finalErrorCount, totalNotes, isAutoPlay, actDur);
        setLiveAccuracy(stats.acc); setLiveSpeed(stats.spd);
        const baseMidiScore = analysisResult?.performanceScore || 0;
        const gameplayPS = (stats.acc * 0.5) + (stats.spd * 0.5);
        let finalScore = baseMidiScore * Math.pow(gameplayPS / 100, 4);
        let rank = 'D';
        if (gameplayPS >= 100) rank = 'X';
        else if (gameplayPS >= 98) rank = 'SS';
        else if (gameplayPS >= 95) rank = 'S';
        else if (gameplayPS >= 90) rank = 'A';
        else if (gameplayPS >= 80) rank = 'B';
        else if (gameplayPS >= 70) rank = 'C';
        setPerformanceSummary({ accuracy: +stats.acc.toFixed(2), speed: +stats.spd.toFixed(2), gameplayPercentage: +gameplayPS.toFixed(2), baseMidiScore, finalScore: +finalScore.toFixed(2), rank, hitCount: finalHitCount, errorCount: finalErrorCount, totalNoteCount: totalNotes, playbackTempoMultiplier, totalWaitTimeMs: accumulatedWaitTimeRef.current });
        clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set()); setMusicalCurrentTimeMs(totalDurationWithEndDelayMs);
        return;
    }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [isPlayingRef, notesForGame, playbackTempoMultiplier, pausedMusicalTimeRef, waitMode, scheduleMetronomeSounds, playSound, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, analysisResult, originalTotalMusicalDurationMs, totalDurationWithEndDelayMs, absoluteEndTimeMs]);

  const handleStartGame = (settings: GameSettings) => {
    setGameSettings(settings); setPlaybackTempoMultiplier(settings.playbackTempoMultiplier); setCurrentScreen('inGame');
    initializeAudioContext(); setPreviewPlaybackTempoMultiplier(1); setIsLoadingContent(true); isUserPausedRef.current = false;
    accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; setLiveAccuracy(100); setLiveSpeed(100); gameRealStartTimeRef.current = null;
    setIsTopBarVisible(!autoHideTopBar);
  };

  const handleStartFreePlay = () => { handleStopPlayback(); setIsFreePlayMode(true); setCurrentScreen('inGame'); initializeAudioContext(); };

  const handlePlay = useCallback(async () => {
    if (isFreePlayMode || notesForGame.length === 0 || isPlayingRef.current) return;
    if (!(await initializeAudioContext())) return;
    if (gameRealStartTimeRef.current === null) gameRealStartTimeRef.current = performance.now() - (pausedMusicalTimeRef.current / playbackTempoMultiplier);
    if (pauseStartTimeRef.current !== null) { if (!isUserPausedRef.current) accumulatedPauseTimeRef.current += performance.now() - pauseStartTimeRef.current; pauseStartTimeRef.current = null; }
    setIsPlaying(true); isPlayingRef.current = true; isUserPausedRef.current = false; performanceStartTimeRef.current = performance.now();
    setMusicalCurrentTimeMs(pausedMusicalTimeRef.current); currentTimeRef.current = pausedMusicalTimeRef.current; prevMusicalTimeRef.current = pausedMusicalTimeRef.current;
    if (metronomeMode !== 'off') { scheduleMetronomeSounds(pausedMusicalTimeRef.current); lastMetronomeScheduleTimeRef.current = pausedMusicalTimeRef.current; }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [notesForGame.length, initializeAudioContext, playbackLoop, metronomeMode, scheduleMetronomeSounds, pausedMusicalTimeRef, isFreePlayMode, playbackTempoMultiplier]);

  const handlePause = useCallback(() => {
    if (isFreePlayMode || waitMode === 'retical' || !isPlayingRef.current) return;
    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = true; pausedMusicalTimeRef.current = currentTimeRef.current;
    pauseStartTimeRef.current = performance.now(); if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
    clearScheduledNotes(); clearScheduledMetronomeSounds(); setMetronomeBeat(null);
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, waitMode, isFreePlayMode]);

  useEffect(() => {
    const p = () => { if (waitMode !== 'retical' && currentScreen === 'inGame' && isPlayingRef.current) { setIsPlaying(false); isPlayingRef.current = false; pausedMusicalTimeRef.current = currentTimeRef.current; pauseStartTimeRef.current = performance.now(); if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current); clearScheduledNotes(); clearScheduledMetronomeSounds(); } };
    const r = () => { if (currentScreen === 'inGame' && !isPlayingRef.current && !isUserPausedRef.current && notesForGame.length > 0) handlePlay(); };
    const hv = () => document.hidden ? p() : r(); const hb = () => p(); const hf = () => r();
    document.addEventListener('visibilitychange', hv); window.addEventListener('blur', hb); window.addEventListener('focus', hf);
    return () => { document.removeEventListener('visibilitychange', hv); window.removeEventListener('blur', hb); window.removeEventListener('focus', hf); };
  }, [currentScreen, notesForGame.length, handlePlay, waitMode]);

  const handleSeek = useCallback((t: number) => {
    if (notesForGame.length === 0 || waitMode === 'retical') return;
    const cl = Math.max(0, Math.min(t, totalDurationWithEndDelayMs)); clearScheduledNotes(); presatisfiedNoteIdsRef.current = new Set();
    updateNotesCurrentlyWaitingFor(new Set()); notesCurrentlyWaitingForIdsRef.current = new Set(); waitingBlockTimeRef.current = null;
    if (waitMode === 'off') { const b = notesForGame.filter(n => n.timeMs < cl); hitNoteIdsRef.current = new Set(b.map(n => n.noteId)); setHitCount(hitNoteIdsRef.current.size); setErrorCount(0); }
    else { hitNoteIdsRef.current = new Set(Array.from(hitNoteIdsRef.current).filter(id => { const n = notesForGame.find(x => x.noteId === id); return n && n.timeMs < cl; })); setHitCount(hitNoteIdsRef.current.size); }
    if (waitMode !== 'strict' && waitMode !== 'lenient') { setTotalWaitTimeMs(0); accumulatedWaitTimeRef.current = 0; waitStartTimeRef.current = null; accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; playerInputTimesRef.current = []; firstInputRealTimeRef.current = null; lastInputRealTimeRef.current = null; setPerformanceSummary(null); gameRealStartTimeRef.current = null; setLiveSpeed(100); }
    pausedMusicalTimeRef.current = cl; setMusicalCurrentTimeMs(cl); currentTimeRef.current = cl; prevMusicalTimeRef.current = cl; isUserPausedRef.current = false;
    let ni = 0; while(ni < notesForGame.length && notesForGame[ni].timeMs < cl) ni++; nextNoteIndexRef.current = ni;
    if (isPlayingRef.current) { performanceStartTimeRef.current = performance.now(); if (metronomeMode !== 'off') { scheduleMetronomeSounds(cl); lastMetronomeScheduleTimeRef.current = cl; } }
    else { clearScheduledMetronomeSounds(); if (metronomeMode !== 'off') { scheduleMetronomeSounds(cl); lastMetronomeScheduleTimeRef.current = cl; } }
  }, [notesForGame, totalDurationWithEndDelayMs, clearScheduledNotes, metronomeMode, scheduleMetronomeSounds, clearScheduledMetronomeSounds, waitMode]);

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
        const search = notesForGame.slice(Math.max(0, nextNoteIndexRef.current - 10), Math.min(notesForGame.length, nextNoteIndexRef.current + 50));
        let best: MidiNotePlaybackItem | null = null, min = Infinity;
        for (const n of search) { if (n.midi === midi && !presatisfiedNoteIdsRef.current.has(n.noteId) && n.timeMs > nm - 1000 && n.timeMs <= nm + 2000) { const d = Math.abs(n.timeMs - nm); if (d < min) { min = d; best = n; } } }
        if (best) { if (!hitNoteIdsRef.current.has(best.noteId)) { setHitCount(p => p + 1); hitNoteIdsRef.current.add(best.noteId); } satisfyUpcomingNote(best); playerInputTimesRef.current.push(nr); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = nr; lastInputRealTimeRef.current = nr; }
        else if (notesForGame.some(n => n.timeMs > nm - 1500 && n.timeMs <= nm + 2500 && !presatisfiedNoteIdsRef.current.has(n.noteId))) setErrorCount(p => p + 1);
    }
  }, [notesForGame, waitMode, visuallySatisfyNote, satisfyUpcomingNote, updateNotesCurrentlyWaitingFor, resumePlaybackFromWait]);

  const handleUiKeyPress = useCallback((k: string, m: number) => { setUserSustainedKeys(p => new Set(p).add(k)); startSustainedSound(k, m); if (isPlayingRef.current && !isFreePlayMode) processKeyPress(m); }, [processKeyPress, startSustainedSound, isFreePlayMode]);
  const handleUiKeyRelease = useCallback((k: string, m: number) => { setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); stopSustainedSound(k, m); }, [stopSustainedSound]);
  
  const loadFile = useCallback(async (f: File | null, id?: string | null, r?: boolean | null) => {
    setIsLoadingFile(true); handleStopPlayback(); setPlaybackNotes([]); setCurrentOnlineSongId(id || null); setIsCurrentSongRanked(r || null);
    if (!f) { setIsLoadingFile(false); return; }
    try {
        const ext = f.name.split('.').pop()?.toLowerCase(); let res;
        if (ext === 'mid' || ext === 'midi') res = await parseMidiData(await f.arrayBuffer(), midiNoteToNameMap);
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
        setCurrentTempoBpm(res.initialTempoBpm); setTempoEvents(res.tempoEvents); setSignatureEvents(res.signatureEvents); setCurrentFileType(ext === 'mid' || ext === 'midi' ? FileType.MIDI : FileType.MUSICXML); setBarLines(res.barLinesMs);
        if (notesWithF.length > 0) await preloadSamplesForSong(notesWithF); else setIsPreloading(false);
    } catch (e) { alert("Error processing file."); } finally { setIsLoadingFile(false); setSelectedOnlineSongIdForNavigation(null); }
  }, [handleStopPlayback, preloadSamplesForSong, midiNoteToNameMap]);
  
  const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
      const [c, n, v] = e.data, k = midiNoteToNameMap.get(n); if (!k) return;
      if (c === 144 && v > 0) { setUserActiveKeys(p => new Set(p).add(k)); setUserSustainedKeys(p => new Set(p).add(k)); startSustainedSound(k, n, v / 127); if (isPlayingRef.current && !isFreePlayMode) processKeyPress(n); }
      else if (c === 128 || (c === 144 && v === 0)) { setUserActiveKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); stopSustainedSound(k, n); }
  }, [midiNoteToNameMap, startSustainedSound, stopSustainedSound, processKeyPress, isFreePlayMode]);

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

  const handleBarNavigation = useCallback((dir: 'forward' | 'backward') => {
    if (notesForGame.length === 0 || barLines.length === 0 || waitMode === 'retical') return;
    const cur = currentTimeRef.current, nextIdx = barLines.findIndex(b => b > cur + 50); let target;
    if (dir === 'forward') target = nextIdx !== -1 ? nextIdx : barLines.length - 1;
    else { const curIdx = nextIdx !== -1 ? nextIdx - 1 : barLines.length - 1; if (curIdx < 0) return; target = cur - barLines[curIdx] < 100 ? Math.max(0, curIdx - 1) : curIdx; }
    if (barLines[target] !== undefined) handleSeek(barLines[target]);
  }, [notesForGame.length, barLines, handleSeek, waitMode]);

  const handleQwertyKeyDown = useCallback((e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target === document.body) e.preventDefault();
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
  }, [qwertyLayout, mirpTranspose, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyPress]);
  
  const handleQwertyKeyUp = useCallback((e: KeyboardEvent) => {
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
  }, [qwertyLayout, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyRelease]);

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
    if (currentScreen === 'inGame' && isLoadingContent) {
      const timer = setTimeout(() => { setIsLoadingContent(false); isUserPausedRef.current = false; if (document.hasFocus() && !isFreePlayMode) handlePlay(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isLoadingContent, handlePlay, isFreePlayMode]);

  useEffect(() => {
    const save = async () => {
      if (performanceSummary && !isPlaying && gameSettings?.waitMode === 'retical' && session && currentOnlineSongId && isCurrentSongRanked === true) {
        try {
          const { data: b } = await supabase.from('scores').select('final_score').eq('user_id', session.user.id).eq('song_id', currentOnlineSongId).order('final_score', { ascending: false }).limit(1);
          if (performanceSummary.finalScore > (b?.[0]?.final_score ?? -1)) {
            await supabase.from('scores').delete().eq('user_id', session.user.id).eq('song_id', currentOnlineSongId);
            await supabase.from('scores').insert({ user_id: session.user.id, song_id: currentOnlineSongId, final_score: performanceSummary.finalScore, accuracy: performanceSummary.accuracy, speed: performanceSummary.speed, rank: performanceSummary.rank, notes_hit: performanceSummary.hitCount, errors: performanceSummary.errorCount, total_notes: performanceSummary.totalNoteCount, mode: 'retical', tempo_multiplier: performanceSummary.playbackTempoMultiplier, total_wait_time_ms: performanceSummary.totalWaitTimeMs });
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
      const sus = Array.from(userSustainedKeys).map(k => noteNameToKeyDefMap.get(k)?.midiNote).filter((m): m is number => m !== undefined);
      if (sus.length < 2) { setDetectedChord(null); return; }
      const pc = [...new Set(sus.map(m => m % 12))].sort((a, b) => a - b);
      if (pc.length < 2) { setDetectedChord(null); return; }
      let best = null;
      for (const r of pc) {
        const iv = pc.map(x => (x - r + 12) % 12).sort((a, b) => a - b).join(',');
        const match = CHORD_FORMULAS[iv]; if (match) { best = `${PITCH_CLASS_TO_NAME[r]}${match.name}`; break; }
      }
      setDetectedChord(best);
    }, 100);
    return () => { if (chordDetectionTimeoutRef.current) clearTimeout(chordDetectionTimeoutRef.current); };
  }, [userSustainedKeys, isFreePlayMode, noteNameToKeyDefMap]);

  return (
      <div ref={appRootRef} onClick={async (e) => {
          if (currentScreen === 'inGame') return;
          let t = e.target as HTMLElement | null, isI = false;
          while (t && t !== appRootRef.current) { if (t.matches('button, a, [role="button"], input, select, textarea, label') || window.getComputedStyle(t).cursor === 'pointer') { isI = true; break; } t = t.parentElement; }
          if (!isI || !(await initializeAudioContext())) return;
          const now = performance.now(); if (now - lastUiClickTimeRef.current > 500) uiClickComboIndexRef.current = 0;
          playSound(UI_CLICK_SOUND_SEQUENCE_MIDI[uiClickComboIndexRef.current], INTERACTIVE_NOTE_DURATION_MS, 0.4);
          uiClickComboIndexRef.current = (uiClickComboIndexRef.current + 1) % UI_CLICK_SOUND_SEQUENCE_MIDI.length; lastUiClickTimeRef.current = now;
      }} className="text-white min-h-screen flex flex-col font-sans">
        {currentScreen !== 'inGame' && <AdBanner />}
        {currentScreen === 'mainMenu' && <MainMenu onPlay={() => setCurrentScreen('songSelection')} onSettings={() => setCurrentScreen('settings')} onSocial={() => setCurrentScreen('leaderboard')} onOpenLoginModal={() => setIsAuthModalOpen(true)} onOpenAccountModal={() => setIsAccountModalOpen(true)} />}
        {currentScreen === 'leaderboard' && <Leaderboard onBack={() => setCurrentScreen('mainMenu')} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); setCurrentScreen('songSelection'); }} />}
        {currentScreen === 'songSelection' && <SongSelection onFileLoaded={loadFile} onSongSelected={() => setCurrentScreen('modeSelection')} onBack={() => { setCurrentScreen('mainMenu'); setSelectedOnlineSongIdForNavigation(null); }} loadedSongName={currentFileName} analysisResult={analysisResult} isLoading={isLoadingFile || isPreloading} selectedOnlineSongIdForNavigation={selectedOnlineSongIdForNavigation} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); }} onStartFreePlay={handleStartFreePlay} />}
        {currentScreen === 'modeSelection' && <ModeSelection onStartGame={handleStartGame} onBack={() => setCurrentScreen('songSelection')} analysisResult={analysisResult} analysisResultForPreview={previewAnalysisResult} fileName={currentFileName} initialTempoBpm={currentTempoBpm} initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier} onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange} currentHideBarNavigationButtons={hideBarNavigationButtons} onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} />}
        {currentScreen === 'settings' && <Settings onBack={() => setCurrentScreen('mainMenu')} midiAccessStatus={midiAccessStatus} midiInputs={midiInputs} selectedMidiInputId={selectedMidiInputId} onSelectMidiInput={setSelectedMidiInputId} midiOutputs={midiOutputs} selectedMidiOutputId={selectedMidiOutputId} onSelectMidiOutput={setSelectedMidiOutputId} connectMidi={connectMidi} viewMode={viewMode} onViewModeChange={setViewMode} noteLabelType={noteLabelType} onNoteLabelTypeChange={setNoteLabelType} showOnlyMajorNotes={showOnlyMajorNotes} onShowOnlyMajorNotesChange={setShowOnlyMajorNotes} showQwertyShortcuts={showQwertyShortcuts} onShowQwertyShortcutsChange={setShowQwertyShortcuts} hideBarNavigationButtons={hideBarNavigationButtons} onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} autoHideTopBar={autoHideTopBar} onAutoHideTopBarChange={setAutoHideTopBar} masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume} metronomeVolume={metronomeVolume} onMetronomeVolumeChange={setMetronomeVolume} metronomeOffsetMs={metronomeOffsetMs} onMetronomeOffsetChange={setMetronomeOffsetMs} themeSettings={themeSettings} onThemeSettingsChange={setThemeSettings} devicePreset={devicePreset} onDevicePresetChange={setDevicePreset} customWhiteKeyHeight={customWhiteKeyHeight} onCustomWhiteKeyHeightChange={setCustomWhiteKeyHeight} customBlackKeyHeight={customBlackKeyHeight} onCustomBlackKeyHeightChange={setCustomBlackKeyHeight} customKeyLabelHeight={customKeyLabelHeight} onCustomKeyLabelHeightChange={setCustomKeyLabelHeight} customMinWhiteKeyWidth={customMinWhiteKeyWidth} onCustomMinWhiteKeyWidthChange={setCustomMinWhiteKeyWidth} pianoRangeMode={pianoRangeMode} onPianoRangeModeChange={setPianoRangeMode} customStartNote={customStartNote} onCustomStartNoteChange={setCustomStartNote} customEndNote={customEndNote} onCustomEndNoteChange={setCustomEndNote} qwertyLayout={qwertyLayout} onQwertyLayoutChange={setQwertyLayout} showPianoTilesBackground={showPianoTilesBackground} onShowPianoTilesBackgroundChange={setShowPianoTilesBackground} />}
        {currentScreen === 'inGame' && (
          <div className="flex-grow relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${autoHideTopBar ? (isTopBarVisible ? 'translate-y-0' : '-translate-y-full') : 'translate-y-0'}`} onMouseEnter={autoHideTopBar ? clearTopBarHideTimer : undefined} onMouseLeave={autoHideTopBar ? startTopBarHideTimer : undefined}>
              <TopBar onPlay={handlePlay} onPause={handlePause} onStop={handleStopPlayback} onExit={() => { handleStopPlayback(); setCurrentScreen('songSelection'); }} isPlaying={isPlaying} isFileLoaded={playbackNotes.length > 0} fileName={currentFileName} waitMode={waitMode} metronomeMode={metronomeMode} onCycleMetronomeMode={() => setMetronomeMode(p => p === 'off' ? 'beat' : (p === 'beat' ? 'bar' : 'off'))} isMetronomeAvailable={isMetronomeAvailable} hitCount={hitCount} errorCount={errorCount} liveAccuracy={liveAccuracy} liveSpeed={liveSpeed} totalNoteCount={totalNoteCountForGame} currentTimeMs={musicalCurrentTimeMs / playbackTempoMultiplier} totalDurationMs={absoluteEndTimeMs / playbackTempoMultiplier} viewMode={viewMode} noteSpeedMultiplier={noteSpeedMultiplier} onNoteSpeedMultiplierChange={setNoteSpeedMultiplier} sheetMusicZoom={sheetMusicZoom} onSheetMusicZoomChange={setSheetMusicZoom} analysisResult={analysisResult} metronomeBeat={metronomeBeat} totalWaitTimeMs={totalWaitTimeMs} isFreePlayMode={isFreePlayMode} />
            </div>
            <div ref={contentAreaRef} className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden">
                {autoHideTopBar && <div className="absolute top-0 left-0 right-0 h-10 z-40" onMouseEnter={() => setIsTopBarVisible(true)} onClick={() => setIsTopBarVisible(true)} />}
                {isLoadingContent ? <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30"><div className="flex items-center space-x-3 p-4 text-sky-300 font-semibold text-lg"><svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading Game...</span></div></div> : (
                  <>
                    {!isFreePlayMode && <BarNavigationControls onNavigate={handleBarNavigation} isFileLoaded={notesForGame.length > 0} waitMode={waitMode} hideControls={hideBarNavigationButtons} />}
                    <div className="flex flex-col justify-end" style={{ width: `${baseCalculatedPianoWidth}px`, height: '100%' }}>
                      <div className="relative flex-grow w-full">
                        {isFreePlayMode ? <ChordDisplay chord={detectedChord} /> : viewMode === 'falling' ? (
                          <FallingNotesArea notes={notesForGame} currentTimeMs={musicalCurrentTimeMs} keyPositions={keyPositionsMap} activeMidiNotesInfo={activePlaybackNotesInfo} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={barLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={themeSettings.fallingNotesBackgroundColor} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeTempoBpm={(currentTempoBpm || 120) * playbackTempoMultiplier} showOnlyMajorNotes={showOnlyMajorNotes} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                        ) : viewMode === 'sheet-roll' && vexFlowData ? (
                            <HorizontalNotesView currentTimeMs={musicalCurrentTimeMs} width={baseCalculatedPianoWidth} height={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5} activePlaybackNotesInfo={activePlaybackNotesInfo} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={'#F7F5ED'} vexFlowData={vexFlowData} showOnlyMajorNotes={showOnlyMajorNotes} noteLabelType={noteLabelType} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                        ) : viewMode === 'sheet' && vexFlowData ? (
                          <VexFlowSheetMusicView notes={notesForGame} timeSignature={initialTimeSignature} keySignature={initialKeySignature} initialTempoBpm={currentTempoBpm || 120} width={baseCalculatedPianoWidth} height={contentAreaHeight} currentTimeMs={musicalCurrentTimeMs} totalDurationMs={originalTotalMusicalDurationMs} activePlaybackNotesInfo={activePlaybackNotesInfo} onSeek={handleSeek} isPlaying={isPlaying} sheetMusicZoom={sheetMusicZoom} barLines={barLines} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} signatureEvents={signatureEvents} onLayoutRendered={setRenderedLayoutId} tempoEvents={tempoEvents} playbackTempoMultiplier={playbackTempoMultiplier} />
                        ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><p className="text-slate-400 animate-pulse">Loading music...</p></div>}
                      </div>
                      {!isFreePlayMode && notesForGame.length > 0 && <div className="w-full"><ProgressBar currentTimeMs={musicalCurrentTimeMs} totalDurationMs={absoluteEndTimeMs} width={baseCalculatedPianoWidth} height={PROGRESS_BAR_HEIGHT_PX} onSeek={handleSeek} isPlaybackActive={isPlaying} isSeekingDisabled={waitMode === 'retical'} /></div>}
                      <div className="relative flex-shrink-0" style={{ width: '100%', height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px` }}>
                        <PianoKeyboard keyPositions={Array.from(keyPositionsMap.values())} userSustainedKeys={userSustainedKeys} userActiveKeys={userActiveKeys} activeMidiNotesInfo={activeMidiNotesInfoForKeyboard} onUiKeyPress={handleUiKeyPress} onUiKeyRelease={handleUiKeyRelease} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} showQwertyShortcuts={showQwertyShortcuts} qwertyCurrentOctaveShift={qwertyLayout === 'mirp' ? 0 : qwertyCurrentOctaveShift} width={baseCalculatedPianoWidth} layoutConfig={layoutConfig} qwertyLayout={qwertyLayout} mirpTranspose={mirpTranspose} />
                      </div>
                    </div>
                  </>
                )}
            </div>
            <PerformanceSummaryModal isVisible={!!performanceSummary} summary={performanceSummary} onClose={() => { setPerformanceSummary(null); handleStopPlayback(); }} />
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
