
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { KeyPosition, PianoKeyDefinition, MidiNotePlaybackItem, ActiveMidiNoteInfo, MIDIInput, MIDIMessageEvent, MIDIAccess, MIDIOutput, TimeSignatureInfo, FileType, ExtendedResult, MidiAccessStatus, MetronomeMode, WaitMode, ViewMode, Screen, GameSettings, NoteLabelType, PracticeHand, ThemeSettings, PerformanceSummary, TempoEvent, DevicePreset, LayoutDimensions, QwertyLayout, BeatInfo, FreePlayLiveNote, BackingTrackConfig, MicThresholds } from './types';
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
  FREE_PLAY_ARPEGGIO_WINDOW_MS,
  DEFAULT_MP3_VOLUME
} from './constants';
import PianoKeyboard from './components/PianoKeyboard';
import TopBar from './components/TopBar';
import ProgressBar from './components/ProgressBar';
import MainMenu from './components/MainMenu';
import SongSelection from './components/SongSelection';
import ModeSelection from './components/ModeSelection';
import {Settings} from './components/Settings';
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
import AdminModal from './components/AdminModal';
import { AboutUs, ContactPage, PrivacyPolicy, Disclaimer } from './components/InfoPages';
import MidiEditor from './components/MidiEditor'; // NEW

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

const BackgroundDisplay: React.FC<{ themeSettings: ThemeSettings; viewMode: ViewMode; isFreePlayMode: boolean; }> = ({ themeSettings, viewMode, isFreePlayMode }) => {
  const { backgroundUrl, backgroundOpacity } = themeSettings;
  if (!backgroundUrl) return null;
  const isVideo = useMemo(() => 
    backgroundUrl.startsWith('data:video/') || 
    backgroundUrl.toLowerCase().endsWith('.mp4') ||
    backgroundUrl.toLowerCase().endsWith('.webm'),
    [backgroundUrl]
  );
  const opacity = backgroundOpacity ?? 0.25;
  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: opacity,
    transition: 'opacity 300ms ease-in-out',
  };
  const backingLayerClass = (viewMode === 'falling' || isFreePlayMode) ? 'bg-black' : 'bg-white';
  return (
    <>
      <div className={`absolute inset-0 ${backingLayerClass}`} />
      {isVideo ? (
        <video
          key={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{...commonStyle, objectFit: 'cover'}}
          src={backgroundUrl}
        />
      ) : (
        <div
          style={{
            ...commonStyle,
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </>
  );
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

const CHORD_FORMULAS: { [key: string]: { name: string, intervals: number[] } } = {
  '0,4,7': { name: '', intervals: [0, 4, 7] },
  '0,3,7': { name: 'm', intervals: [0, 3, 7] },
  '0,3,6': { name: 'dim', intervals: [0, 3, 6] },
  '0,4,8': { name: 'aug', intervals: [0, 4, 8] },
  '0,5,7': { name: 'sus4', intervals: [0, 5, 7] },
  '0,2,7': { name: 'sus2', intervals: [0, 2, 7] },
  '0,4,7,9': { name: '6', intervals: [0, 4, 7, 9] },
  '0,3,7,9': { name: 'm6', intervals: [0, 3, 7, 9] },
  '0,4,7,10': { name: '7', intervals: [0, 4, 7, 10] },
  '0,4,7,11': { name: 'maj7', intervals: [0, 4, 7, 11] },
  '0,3,7,10': { name: 'm7', intervals: [0, 3, 7, 10] },
  '0,3,6,10': { name: 'm7b5', intervals: [0, 3, 6, 10] },
  '0,3,6,9': { name: 'dim7', intervals: [0, 3, 6, 9] },
  '0,5,7,10': { name: '7sus4', intervals: [0, 5, 7, 10] },
  '0,2,4,7,10': { name: '9', intervals: [0, 2, 4, 7, 10] },
  '0,2,4,7,11': { name: 'maj9', intervals: [0, 2, 4, 7, 11] },
  '0,2,3,7,10': { name: 'm9', intervals: [0, 2, 3, 7, 10] },
  '0,2,4,7': { name: 'add9', intervals: [0, 2, 4, 7] },
  '0,2,3,7': { name: 'madd9', intervals: [0, 2, 3, 7] },
  '0,4,5,7,10': { name: '11', intervals: [0, 4, 5, 7, 10] },
  '0,4,7,9,10': { name: '13', intervals: [0, 4, 7, 9, 10] },
  '0,4,7,10,13': { name: '7b9', intervals: [0, 4, 7, 10, 1] },
  '0,4,7,10,15': { name: '7#9', intervals: [0, 4, 7, 10, 3] },
  '0,7': { name: '5', intervals: [0, 7] },
  '0,4': { name: '', intervals: [0, 4] },
  '0,3': { name: 'm', intervals: [0, 3] },
};

function frequencyToMidi(frequency: number): number {
  if (frequency <= 0) return 0;
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

function midiToFrequency(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mainMenu');
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null); 
  const [isLoadingContent, setIsLoadingContent] = useState(false); 
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); 
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); 
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { session } = useAuth(); 

  const sessionPlaytimeMs = useRef<number>(0);
  const playtimeStartRef = useRef<number | null>(null);
  const sessionTotalPlaytimeMs = useRef<number>(0);
  const sessionTotalNotesHit = useRef<number>(0);

  const [isFreePlayMode, setIsFreePlayMode] = useState(false);
  const isFreePlayModeRef = useRef(false);
  const [freePlayBpm, setFreePlayBpm] = useState(120);
  const [freePlayTimeSignature, setFreePlayTimeSignature] = useState<TimeSignatureInfo>({ numerator: 4, denominator: 4 });
  const [freePlayMetronomeMode, setFreePlayMetronomeMode] = useState<MetronomeMode>('off');

  const [detectedChord, setDetectedChord] = useState<string | null>(null);
  const chordDetectionTimeoutRef = useRef<number | null>(null);
  const [selectedOnlineSongIdForNavigation, setSelectedOnlineSongIdForNavigation] = useState<string | null>(null);

  const [isSustainPedalActive, setIsSustainPedalActive] = useState(false);
  const sustainedByPedalKeysRef = useRef<Map<string, number>>(new Map()); 

  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<MidiNotePlaybackItem[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);

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
  const [customWhiteKeyHeight, setCustomWhiteKeyHeight] = useState(140);
  const [customBlackKeyHeight, setCustomBlackKeyHeight] = useState(90);
  const [customKeyLabelHeight, setCustomKeyLabelHeight] = useState(25);
  const [customMinWhiteKeyWidth, setCustomMinWhiteKeyWidth] = useState(24.5);

  const [pianoRangeMode, setPianoRangeMode] = useState<'full' | '61-key' | '37-key' | '25-key' | 'custom'>('full');
  const [customStartNote, setCustomStartNote] = useState('C3');
  const [customEndNote, setCustomEndNote] = useState('C5');

  const [uiZoom, setUiZoom] = useState<number>(100);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [backingTrackError, setBackingTrackError] = useState<string | null>(null);
  const audioStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null); // NEW: Track audio play promise
  const [mp3Volume, setMp3Volume] = useState(DEFAULT_MP3_VOLUME);
  const [backingTrackFile, setBackingTrackFile] = useState<File | null>(null);
  const [backingTrackOffset, setBackingTrackOffset] = useState(-2000);

  const [isAudioInputEnabled, setIsAudioInputEnabled] = useState(false);
  const isAudioInputEnabledRef = useRef(isAudioInputEnabled);
  useEffect(() => { isAudioInputEnabledRef.current = isAudioInputEnabled; }, [isAudioInputEnabled]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string | null>(null);
  const [audioInputError, setAudioInputError] = useState<string | null>(null);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pitchDetectionRequestRef = useRef<number | null>(null);
  const audioContextForInputRef = useRef<AudioContext | null>(null);
  const micActiveNotesRef = useRef<Set<number>>(new Set());
  const noteOffCandidatesRef = useRef<Map<number, number>>(new Map());

  // NEW: Mic Thresholds state - Adjusted defaults to be more sensitive for bass
  const [micThresholds, setMicThresholds] = useState<MicThresholds>({
    subBass: -70,
    bass: -65,
    mid: -60,
    treble: -65,
    highTreble: -70
  });
  const micThresholdsRef = useRef(micThresholds);
  useEffect(() => { micThresholdsRef.current = micThresholds; }, [micThresholds]);

  // NEW: State for MIDI Editor
  const [editorMidiFile, setEditorMidiFile] = useState<File | null>(null);

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
  const [previewPlaybackTempoMultiplier, setPlaybackTempoMultiplierForPreview] = useState<number>(1);
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0); 

  const [isLooping, setIsLooping] = useState(false);
  const [loopStartMs, setLoopStartMs] = useState<number | null>(null);
  const [loopEndMs, setLoopEndMs] = useState<number | null>(null);
  const isLoopingRef = useRef(isLooping);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);
  const loopStartMsRef = useRef(loopStartMs);
  useEffect(() => { loopStartMsRef.current = loopStartMs; }, [loopStartMs]);
  const loopEndMsRef = useRef(loopEndMs);
  useEffect(() => { loopEndMsRef.current = loopEndMs; }, [loopEndMs]);

  const isSettingsPreviewActiveRef = useRef(false);
  const originalMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME);
  const prevMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME); // New ref to store volume before mic/midi mute

  // State to hold extra online song metadata
  const [currentMidiLink, setCurrentMidiLink] = useState<string | null>(null);
  const [currentMidiOffset, setCurrentMidiOffset] = useState<number | null>(null);

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
    if (isFreePlayMode) return freePlayBpm;
    if (currentTempoBpm === null) return DEFAULT_MUSICXML_TEMPO_BPM * playbackTempoMultiplier;
    const originalBpm = getActiveTempoBpmAtOriginalTime(musicalCurrentTimeMs, tempoEvents, currentTempoBpm);
    return originalBpm * playbackTempoMultiplier;
  }, [isFreePlayMode, freePlayBpm, currentTempoBpm, musicalCurrentTimeMs, tempoEvents, playbackTempoMultiplier]);
  
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
  const nextBeatToScheduleIndexRef = useRef<number>(0);
  const prevConceptualTimeRef = useRef<number>(0);

  const freePlayBarLines = useMemo(() => {
    if (!isFreePlayMode) return [];
    const barDurationMs = (60000 / freePlayBpm) * freePlayTimeSignature.numerator;
    const visibleCount = 20; 
    const lines = [];
    const currentBarIndex = Math.floor(freePlayElapsedTime / barDurationMs);
    for (let i = currentBarIndex; i < currentBarIndex + visibleCount; i++) {
        lines.push(i * barDurationMs);
    }
    return lines;
  }, [isFreePlayMode, freePlayBpm, freePlayTimeSignature, freePlayElapsedTime]);
  
  useEffect(() => {
    if (isFreePlayMode || playbackNotes.length === 0) {
      if (allBeatTimes.length > 0) setAllBeatTimes([]);
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
        allBeats = getBeatTimesInWindow(0, estimatedScaledEndTime, playbackTempoMultiplier, res.initialTempoBpm, res.tempoEvents, res.timeSignature, res.signatureEvents, scaledBarLines);
    } else if (metronomeMode === 'bar') {
        allBeats = res.barLinesMs.map(t => ({ timeMs: t / playbackTempoMultiplier, isStrong: true }));
    }
    setAllBeatTimes(allBeats);
    const startIndex = allBeats.findIndex(b => b.timeMs >= currentTimeRef.current);
    nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeats.length;
    prevConceptualTimeRef.current = currentTimeRef.current;
  }, [metronomeMode, playbackTempoMultiplier, playbackNotes.length, currentTempoBpm, originalTotalMusicalDurationMs, initialTimeSignature, tempoEvents, signatureEvents, barLines, isFreePlayMode]);

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
  
  const updateNotesCurrentlyWaitingFor = useCallback((newSet: Set<number>) => {
      setNotesCurrentlyWaitingFor(newSet);
      notesCurrentlyWaitingForRef.current = newSet;
  }, []);

  const waitingBlockTimeRef = useRef<number | null>(null);
  const resumeIndexRef = useRef<number | null>(null);
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
  const [noteOffsetMs, setNoteOffsetMs] = useState<number>(0);
  const allBeatTimesRef = useRef<BeatInfo[]>([]);
  useEffect(() => { allBeatTimesRef.current = allBeatTimes; }, [allBeatTimes]);
  
  const [hitCount, setHitCount] = useState<number>(0);
  const hitCountRef = useRef<number>(0);
  useEffect(() => { hitCountRef.current = hitCount; }, [hitCount]); 
  const [errorCount, setErrorCount] = useState<number>(0);
  const errorCountRef = useRef<number>(0);
  useEffect(() => { errorCountRef.current = errorCount; }, [errorCount]); 
  const [liveAccuracy, setLiveAccuracy] = useState<number>(100);
  const [liveAccuracyRef, setLiveAccuracyRef] = useState<number>(100);
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

  const recentNotesBufferRef = useRef<Map<number, number>>(new Map()); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');

  // --- Auto-Offset and Mic/MIDI Volume Logic ---
  useEffect(() => {
    // Volume Logic
    if (isAudioInputEnabled || selectedMidiInputId) {
        if (masterVolume > 0) {
            prevMasterVolumeRef.current = masterVolume;
            setMasterVolume(0);
        }
    } else {
        // Restore volume if it was muted by this logic (and user hasn't manually set it, though manual is disabled)
        if (masterVolume === 0 && prevMasterVolumeRef.current > 0) {
            setMasterVolume(prevMasterVolumeRef.current);
        }
    }

    // Auto-Offset Logic
    let newOffset = 0;
    if (isAudioInputEnabled) {
        newOffset = -150;
    } else if (selectedMidiInputId) {
        newOffset = 25;
    } else {
        newOffset = 0;
    }
    setNoteOffsetMs(newOffset);

  }, [isAudioInputEnabled, selectedMidiInputId]);
  // --- End Auto-Offset and Mic/MIDI Volume Logic ---

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
  const isMetronomeAvailable = useMemo(() => (notesForGame.length > 0 && tempoEvents.length > 0) || isFreePlayMode, [notesForGame.length, tempoEvents.length, isFreePlayMode]);
  const absoluteEndTimeMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    return notesForGame.reduce((max, note) => Math.max(max, note.timeMs + note.durationMs), 0);
  }, [notesForGame]);
  const totalDurationWithEndDelayMs = useMemo(() => absoluteEndTimeMs === 0 ? 0 : absoluteEndTimeMs + END_PLAYBACK_DELAY_MS, [absoluteEndTimeMs]);

  useEffect(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) { setAnalysisResult(null); return; }
    const scaledNotes = playbackNotes.map(note => ({ ...note, timeMs: note.timeMs / playbackTempoMultiplier, durationMs: note.durationMs / playbackTempoMultiplier }));
    setAnalysisResult(analyzeMidi(scaledNotes, originalTotalMusicalDurationMs, undefined, originalTotalMusicalDurationMs));
  }, [playbackNotes, originalTotalMusicalDurationMs, playbackTempoMultiplier]);

  const previewAnalysisResult = useMemo(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) return null;
    const scaledNotes = playbackNotes.map(note => ({ ...note, timeMs: note.timeMs / previewPlaybackTempoMultiplier, durationMs: note.durationMs / previewPlaybackTempoMultiplier }));
    return analyzeMidi(scaledNotes, originalTotalMusicalDurationMs / previewPlaybackTempoMultiplier, undefined, originalTotalMusicalDurationMs);
  }, [playbackNotes, originalTotalMusicalDurationMs, previewPlaybackTempoMultiplier]);

  const onPlaybackTempoMultiplierChange = useCallback((multiplier: number) => setPlaybackTempoMultiplierForPreview(multiplier), []);

  const startTopBarHideTimer = useCallback(() => {
    if (autoHideTopBar && topBarTimeoutRef.current) clearTimeout(topBarTimeoutRef.current);
    topBarTimeoutRef.current = window.setTimeout(() => setIsTopBarVisible(false), 5000);
  }, [autoHideTopBar]);

  const clearTopBarHideTimer = useCallback(() => {
    if (topBarTimeoutRef.current) { clearTimeout(topBarTimeoutRef.current); topBarTimeoutRef.current = null; }
  }, []);

  useEffect(() => {
    if (autoHideTopBar && isTopBarVisible && (currentScreen === 'inGame' || currentScreen === 'settings')) startTopBarHideTimer(); else clearTopBarHideTimer();
    return clearTopBarHideTimer;
  }, [autoHideTopBar, isTopBarVisible, currentScreen, startTopBarHideTimer, clearTopBarHideTimer]);

  useEffect(() => { setIsTopBarVisible(true); }, [autoHideTopBar]);

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
      /* FIX: Use 'removeEventListener' instead of 'removePrefix' */
      window.removeEventListener('resize', calculateHeights);
      if (contentAreaRef.current) contentAreaObserver.unobserve(contentAreaRef.current);
    };
  }, [notesForGame.length, currentScreen, layoutConfig, isFreePlayMode]);

  useEffect(() => { isFreePlayModeRef.current = isFreePlayMode; }, [isFreePlayMode]);

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
  useEffect(() => { if (audioRef.current) { audioRef.current.volume = mp3Volume; } }, [mp3Volume]);
  useEffect(() => { if (audioRef.current) { audioRef.current.playbackRate = playbackTempoMultiplier; } }, [playbackTempoMultiplier, gameSettings?.backingTrack?.url]);
  useEffect(() => {
      const backingUrl = gameSettings?.backingTrack?.url;
      return () => { if (backingUrl && backingUrl.startsWith('blob:')) { URL.revokeObjectURL(backingUrl); } };
  }, [gameSettings?.backingTrack?.url]);

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
    if (!audioContextReady) return;
    setIsPreloading(true);
    const uniqueMidiNotes = notes.length > 0 ? [...new Set(notes.map(note => note.midi))] : [];
    const promises = uniqueMidiNotes.map(midiNote => getAudioBuffer(midiNote));
    const loadGeneric = async (path: string) => {
        if (!audioContextRef.current) return null;
        const res = await fetch(path);
        const ab = await res.arrayBuffer();
        return audioContextRef.current.decodeAudioData(ab);
    };
    const p1 = loadGeneric('/sounds/metronome/strong_beat.mp3');
    const p2 = loadGeneric('/sounds/metronome/weak_beat.mp3');
    promises.push(p1 as any, p2 as any);
    try { 
        await Promise.all(promises); 
        metronomeBuffersRef.current.strong = (await p1) as AudioBuffer; 
        metronomeBuffersRef.current.weak = (await p2) as AudioBuffer; 
    } catch (e) {} finally { 
        setIsPreloading(false); 
    }
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
    if (activeAudioNodesRef.current.has(keyName)) {
        const audioNode = activeAudioNodesRef.current.get(keyName);
        if (audioNode) { try { audioNode.source.stop(audioContextRef.current.currentTime); } catch (e) {} }
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

  // NEW: Robust Audio Playback Helper
  const safePlayAudio = useCallback(async () => {
    if (audioRef.current) {
        try {
            audioPlayPromiseRef.current = audioRef.current.play();
            await audioPlayPromiseRef.current;
            audioPlayPromiseRef.current = null;
        } catch (e: any) {
            audioPlayPromiseRef.current = null;
            if (e.name !== 'AbortError') {
                setBackingTrackError("Failed to play backing track.");
            }
        }
    }
  }, []);

  // NEW: Robust Audio Pause Helper
  const safePauseAudio = useCallback(async () => {
    if (audioRef.current) {
        if (audioPlayPromiseRef.current) {
            try { await audioPlayPromiseRef.current; } catch (e) {}
        }
        audioRef.current.pause();
    }
  }, []);

  const handleStopPlayback = useCallback(async () => {
    if (playtimeStartRef.current !== null) { sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current; }
    if (gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) { sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current; sessionTotalNotesHit.current += hitCountRef.current; }
    sessionPlaytimeMs.current = 0; playtimeStartRef.current = null;
    if (isSettingsPreviewActiveRef.current) { isSettingsPreviewActiveRef.current = false; }
    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false;
    if (playbackRequestRef.current) { cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; }
    setIsFreePlayMode(false); // Explicitly set to false here
    isFreePlayModeRef.current = false; 
    if (freePlayRequestRef.current) { cancelAnimationFrame(freePlayRequestRef.current); freePlayRequestRef.current = null; }
    setMusicalCurrentTimeMs(0); currentTimeRef.current = 0; pausedMusicalTimeRef.current = 0; nextNoteIndexRef.current = 0;
    clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set<number>()); notesCurrentlyWaitingForIdsRef.current = new Set<string>();
    waitingBlockTimeRef.current = null; resumeIndexRef.current = null; presatisfiedNoteIdsRef.current = new Set<string>(); setActivePlaybackNotesInfo(new Map());
    if (chordDetectionTimeoutRef.current) { clearTimeout(chordDetectionTimeoutRef.current); chordDetectionTimeoutRef.current = null; }
    recentNotesBufferRef.current.clear(); setDetectedChord(null); hitCountRef.current = 0; errorCountRef.current = 0; hitNoteIdsRef.current.clear(); setHitCount(0); setErrorCount(0); setLiveAccuracy(100); setLiveSpeed(100);
    gameRealStartTimeRef.current = null; setTotalWaitTimeMs(0); accumulatedWaitTimeRef.current = 0; waitStartTimeRef.current = null;
    accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; accumulatedSeekTimeRef.current = 0;
    
    if (audioRef.current) { 
        await safePauseAudio();
        audioRef.current.currentTime = 0; 
    }
    if (audioStartTimeoutRef.current) { clearTimeout(audioStartTimeoutRef.current); audioStartTimeoutRef.current = null; }
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, setIsFreePlayMode, safePauseAudio]);

  const handleCloseGameOverModal = useCallback(() => { setIsGameOver(false); setGameOverReason(''); handleStopPlayback(); }, [handleStopPlayback]);

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
    if (!session || (playtimeToAdd === 0 && notesHitToAdd === 0)) return;
    try {
        const { error } = await supabase.rpc('increment_user_stats', { playtime_ms_to_add: playtimeToAdd, notes_hit_to_add: notesHitToAdd });
        if (!error) { sessionTotalPlaytimeMs.current = 0; sessionTotalNotesHit.current = 0; }
    } catch (e) { console.error('Error calling RPC to upload stats:', e); }
  }, [session]);

  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session }, [session]);

  useEffect(() => {
    const handlePageHide = () => {
        if (isPlayingRef.current && playtimeStartRef.current !== null) {
            const finalPlaytimeChunk = performance.now() - playtimeStartRef.current;
            sessionPlaytimeMs.current += finalPlaytimeChunk;
            if (gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) { sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current; sessionTotalNotesHit.current += hitCountRef.current; }
        }
        const playtimeToAdd = Math.round(sessionTotalPlaytimeMs.current);
        const notesHitToAdd = sessionTotalNotesHit.current;
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
        const currentSession = sessionRef.current;
        if (!currentSession || !supabaseUrl || !supabaseAnonKey || (playtimeToAdd === 0 && notesHitToAdd === 0)) return;
        const payload = { playtime_ms_to_add: playtimeToAdd, notes_hit_to_add: notesHitToAdd };
        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/increment_user_stats`;
        const headers = { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' };
        if (navigator.sendBeacon) { const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' }); fetch(rpcUrl, { method: 'POST', headers, body: JSON.stringify(payload), keepalive: true }); }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []); 

  const handleSeek = useCallback(async (t: number) => {
    if (notesForGame.length === 0 || waitMode === 'retical') return;
    const cl = Math.max(0, Math.min(t, totalDurationWithEndDelayMs));
    const timeBeforeSeek = currentTimeRef.current; 
    clearScheduledNotes(); clearScheduledMetronomeSounds(); presatisfiedNoteIdsRef.current = new Set<string>(); updateNotesCurrentlyWaitingFor(new Set<number>()); notesCurrentlyWaitingForIdsRef.current = new Set<string>(); waitingBlockTimeRef.current = null;
    const startIndex = allBeatTimesRef.current.findIndex(b => b.timeMs >= cl);
    nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
    prevConceptualTimeRef.current = cl;
    if (waitMode === 'off') {
        const b = notesForGame.filter(n => n.timeMs < cl); hitNoteIdsRef.current = new Set(b.map(n => n.noteId)); setHitCount(hitNoteIdsRef.current.size); setErrorCount(0);
        setTotalWaitTimeMs(0); accumulatedWaitTimeRef.current = 0; playerInputTimesRef.current = []; firstInputRealTimeRef.current = null; lastInputRealTimeRef.current = null;
        if (gameRealStartTimeRef.current !== null) { gameRealStartTimeRef.current = performance.now() - (cl / playbackTempoMultiplier); }
        accumulatedPauseTimeRef.current = 0; pauseStartTimeRef.current = null; accumulatedSeekTimeRef.current = 0;
    } else {
        hitNoteIdsRef.current = new Set(Array.from(hitNoteIdsRef.current).filter(id => { const n = notesForGame.find(x => x.noteId === id); return n && n.timeMs < cl; }));
        setHitCount(hitNoteIdsRef.current.size); accumulatedSeekTimeRef.current += cl - timeBeforeSeek;
    }
    setPerformanceSummary(null);
    if (waitStartTimeRef.current !== null) { accumulatedWaitTimeRef.current += (performance.now() - waitStartTimeRef.current); }
    waitStartTimeRef.current = null;
    pausedMusicalTimeRef.current = cl; setMusicalCurrentTimeMs(cl); currentTimeRef.current = cl; prevMusicalTimeRef.current = cl; isUserPausedRef.current = false;
    let ni = 0; while (ni < notesForGame.length && notesForGame[ni].timeMs < cl) ni++;
    nextNoteIndexRef.current = ni; if (isPlayingRef.current) { performanceStartTimeRef.current = performance.now(); }
    const backing = gameSettingsRef.current?.backingTrack;
    if (backing && backing.type !== 'none') {
        const offset = backing.offsetMs || 0; const targetAudioTimeMs = cl + offset;
        if (audioStartTimeoutRef.current) { clearTimeout(audioStartTimeoutRef.current); audioStartTimeoutRef.current = null; }
        if (isPlayingRef.current) {
            if (targetAudioTimeMs < 0) {
                if (audioRef.current) { 
                    await safePauseAudio();
                    audioRef.current.currentTime = 0; 
                }
                const waitMs = Math.abs(targetAudioTimeMs) / playbackTempoMultiplier;
                audioStartTimeoutRef.current = setTimeout(async () => { 
                    if (backing.type === 'mp3' && audioRef.current) { 
                        audioRef.current.currentTime = 0; 
                        await safePlayAudio();
                    } 
                }, waitMs);
            } else {
                const targetAudioTimeSec = targetAudioTimeMs / 1000;
                if (backing.type === 'mp3' && audioRef.current) { 
                    audioRef.current.currentTime = targetAudioTimeSec; 
                    await safePlayAudio();
                }
            }
        } else {
            const targetAudioTimeSec = Math.max(0, targetAudioTimeMs / 1000);
            if (backing.type === 'mp3' && audioRef.current) { 
                audioRef.current.currentTime = targetAudioTimeSec; 
            }
        }
    }
  }, [notesForGame, totalDurationWithEndDelayMs, clearScheduledNotes, updateNotesCurrentlyWaitingFor, clearScheduledMetronomeSounds, waitMode, playbackTempoMultiplier, safePlayAudio, safePauseAudio]);

  const handleProgressBarSeek = useCallback((t: number) => {
    if (metronomeMode === 'bar') { if (barLines.length === 0) { handleSeek(t); return; } const closestBar = barLines.reduce((prev, curr) => (Math.abs(curr - t) < Math.abs(prev - t) ? curr : prev)); handleSeek(closestBar); } 
    else if (metronomeMode === 'beat') { if (allBeatTimesRef.current.length === 0) { handleSeek(t); return; } const t_scaled = t / playbackTempoMultiplier; const closestBeat_scaled = allBeatTimesRef.current.reduce((prev, curr) => (Math.abs(curr.timeMs - t_scaled) < Math.abs(prev.timeMs - t_scaled) ? curr : prev), allBeatTimesRef.current[0] || { timeMs: 0 }); handleSeek(closestBeat_scaled.timeMs * playbackTempoMultiplier); } 
    else { handleSeek(t); }
  }, [metronomeMode, barLines, playbackTempoMultiplier, handleSeek]);

  const handleBarNavigation = useCallback((dir: 'forward' | 'backward') => {
    if (notesForGame.length === 0 || waitMode === 'retical' || metronomeMode === 'off') return;
    const cur = currentTimeRef.current; let targetTime: number | undefined;
    if (metronomeMode === 'bar') { if (barLines.length === 0) return; const nextIdx = barLines.findIndex(b => b > cur + 50); let targetBarIndex; if (dir === 'forward') { targetBarIndex = nextIdx !== -1 ? nextIdx : barLines.length - 1; } else { const hexIdx = nextIdx !== -1 ? nextIdx - 1 : barLines.length - 1; if (hexIdx < 0) return; targetBarIndex = cur - barLines[hexIdx] < 100 ? Math.max(0, hexIdx - 1) : hexIdx; } targetTime = barLines[targetBarIndex]; } 
    else { if (allBeatTimesRef.current.length === 0) return; const scaledCurrentTime = cur / playbackTempoMultiplier; if (dir === 'forward') { const nextBeat = allBeatTimesRef.current.find(b => b.timeMs > scaledCurrentTime + 10); if (nextBeat) targetTime = nextBeat.timeMs * playbackTempoMultiplier; } else { const prevBeats = allBeatTimesRef.current.filter(b => b.timeMs < scaledCurrentTime - 10); if (prevBeats.length > 0) targetTime = prevBeats[prevBeats.length - 1].timeMs * playbackTempoMultiplier; else targetTime = 0; } }
    if (targetTime !== undefined) handleSeek(targetTime);
  }, [notesForGame.length, barLines, handleSeek, waitMode, metronomeMode, playbackTempoMultiplier]);

  const playbackLoop = useCallback(async () => {
    const isNonStop = gameSettingsRef.current?.isNonStop ?? false;
    if (!isPlayingRef.current || notesForGame.length === 0) { if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; return; }
    const currentRealTime = performance.now(); const realTimeElapsedSinceStartOrPause = currentRealTime - performanceStartTimeRef.current;
    let conceptualMusicalTime = pausedMusicalTimeRef.current + (realTimeElapsedSinceStartOrPause * playbackTempoMultiplier);
    if (isLoopingRef.current && loopStartMsRef.current !== null && loopEndMsRef.current !== null && loopEndMsRef.current > loopStartMsRef.current && conceptualMusicalTime >= loopEndMsRef.current) { handleSeek(loopStartMsRef.current); const newCurrentRealTime = performance.now(); const newRealTimeElapsedSinceStartOrPause = newCurrentRealTime - performanceStartTimeRef.current; conceptualMusicalTime = pausedMusicalTimeRef.current + (newRealTimeElapsedSinceStartOrPause * playbackTempoMultiplier); }
    let actualMusicalTimeForGameLogic: number; const canWait = (waitMode === 'strict' || waitMode === 'rhythm' || waitMode === 'retical');
    const isInWaitState = !isNonStop && canWait && notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    if (isInWaitState) { actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!; if (waitStartTimeRef.current === null) waitStartTimeRef.current = performance.now(); setTotalWaitTimeMs(accumulatedWaitTimeRef.current + (performance.now() - waitStartTimeRef.current)); } 
    else { actualMusicalTimeForGameLogic = conceptualMusicalTime; setMusicalCurrentTimeMs(conceptualMusicalTime); if (totalWaitTimeMs !== accumulatedWaitTimeRef.current) setTotalWaitTimeMs(accumulatedWaitTimeRef.current); }
    
    if (audioRef.current) { 
        if (isInWaitState && !audioRef.current.paused) { 
            await safePauseAudio(); 
        } else if (!isInWaitState && audioRef.current.paused && isPlayingRef.current && !isUserPausedRef.current) { 
            const backing = gameSettingsRef.current?.backingTrack; 
            if (backing && backing.type === 'mp3' && audioRef.current) { 
                const offset = backing.offsetMs || 0; 
                const targetAudioTimeMs = currentTimeRef.current + offset; 
                if (targetAudioTimeMs >= 0) { 
                    const targetAudioTimeSec = targetAudioTimeMs / 1000; 
                    if (Math.abs(audioRef.current.currentTime - targetAudioTimeSec) > 0.1) audioRef.current.currentTime = targetAudioTimeSec; 
                    await safePlayAudio();
                } 
            } 
        } 
    }

    currentTimeRef.current = actualMusicalTimeForGameLogic; prevMusicalTimeRef.current = actualMusicalTimeForGameLogic;
    let calculatedLiveSpeed = 100;
    if (isPlayingRef.current && gameRealStartTimeRef.current !== null) { const idealTimePlayedMs = currentTimeRef.current - accumulatedSeekTimeRef.current; const idealTimeElapsedSoFar = idealTimePlayedMs / playbackTempoMultiplier; const actualDurationSoFar = (performance.now() - gameRealStartTimeRef.current) - accumulatedPauseTimeRef.current; calculatedLiveSpeed = actualDurationSoFar > 500 && idealTimeElapsedSoFar > 0 ? Math.min(100, (idealTimeElapsedSoFar / actualDurationSoFar) * 100) : 100; setLiveSpeed(calculatedLiveSpeed); }
    if (isPlayingRef.current && metronomeMode !== 'off' && audioContextRef.current && allBeatTimesRef.current.length > 0) {
      const audioCtx = audioContextRef.current; const schedulingLookaheadRealMs = 500; const idealCurrentTimeRealMs = currentTimeRef.current / playbackTempoMultiplier; const lookaheadIdealTimeRealMs = idealCurrentTimeRealMs + schedulingLookaheadRealMs;
      let nextIndex = nextBeatToScheduleIndexRef.current;
      while (nextIndex < allBeatTimesRef.current.length && allBeatTimesRef.current[nextIndex].timeMs < lookaheadIdealTimeRealMs) {
          const beat = allBeatTimesRef.current[nextIndex]; const shouldScheduleSound = (metronomeMode === 'beat') || (metronomeMode === 'bar' && beat.isStrong);
          if (shouldScheduleSound) { const timeUntilBeatPlaysRealMs = beat.timeMs - idealCurrentTimeRealMs; const targetAudioContextTime = audioCtx.currentTime + (timeUntilBeatPlaysRealMs / 1000) + (25 / 1000); if (targetAudioContextTime > audioCtx.currentTime) { const buffer = beat.isStrong ? metronomeBuffersRef.current.strong : metronomeBuffersRef.current.weak; if (buffer && metronomeGainRef.current) { const source = audioCtx.createBufferSource(); source.buffer = buffer; const gainNode = audioCtx.createGain(); gainNode.gain.setValueAtTime(1.0, targetAudioContextTime); gainNode.gain.exponentialRampToValueAtTime(0.0001, targetAudioContextTime + buffer.duration * 0.9); source.connect(gainNode); gainNode.connect(metronomeGainRef.current); source.start(targetAudioContextTime); const nodeRecord = { source, gainNode }; source.onended = () => { const index = scheduledMetronomeAudioNodesRef.current.indexOf(nodeRecord); if (index > -1) scheduledMetronomeAudioNodesRef.current.splice(index, 1); }; /* FIX: access .current before push */ scheduledMetronomeAudioNodesRef.current.push(nodeRecord); } } }
          nextIndex++;
      }
      nextBeatToScheduleIndexRef.current = nextIndex; const lastIdealTimeRealMs = prevConceptualTimeRef.current / playbackTempoMultiplier; const beatForVisuals = allBeatTimesRef.current.find(beat => beat.timeMs > lastIdealTimeRealMs && beat.timeMs <= idealCurrentTimeRealMs);
      if (beatForVisuals) { const beatType = beatForVisuals.isStrong ? 'strong' : 'weak'; if (beatType !== lastMetronomeVisualBeatRef.current) { setMetronomeBeat(beatType); lastMetronomeVisualBeatRef.current = beatType; } } 
      else if (idealCurrentTimeRealMs > lastIdealTimeRealMs) { if (metronomeBeat !== null) { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; } }
    } else if (metronomeBeat !== null) { setMetronomeBeat(null); lastMetronomeVisualBeatRef.current = null; }
    prevConceptualTimeRef.current = conceptualMusicalTime;
    let currentProcessingIdx = nextNoteIndexRef.current; const notesToSetWaitingThisFrame: MidiNotePlaybackItem[] = [];
    while (currentProcessingIdx < notesForGame.length) {
      const note = notesForGame[currentProcessingIdx];
      if (currentTimeRef.current >= note.timeMs) {
        if (presatisfiedNoteIdsRef.current.has(note.noteId)) { presatisfiedNoteIdsRef.current.delete(note.noteId); currentProcessingIdx++; continue; }
        if (waitMode === 'off') {
          const noteId = note.noteId;
          if (!activeNoteInstancesRef.current.has(noteId)) {
            const soundVelocity = isSettingsPreviewActiveRef.current ? note.velocity * 0.25 : note.velocity; playSound(note.midi, note.durationMs, soundVelocity); activeNoteInstancesRef.current.set(noteId, note);
            if (!hitNoteIdsRef.current.has(noteId)) { hitNoteIdsRef.current.add(noteId); setHitCount(prev => prev + 1); }
            setActivePlaybackNotesInfo(prev => new Map(prev).set(noteId, { noteId, name: note.name, timeMs: note.timeMs, hand: note.hand, midi: note.midi, pitchClass: note.pitchClass, status: 'playing', finger: note.finger }));
            const hd = Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) / playbackTempoMultiplier;
            scheduledNoteTimeoutsRef.current.set(noteId, window.setTimeout(() => { activeNoteInstancesRef.current.delete(noteId); scheduledNoteTimeoutsRef.current.delete(noteId); setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); nm.delete(noteId); return nm; }); }, hd));
          }
        } else { if (!isNonStop) notesToSetWaitingThisFrame.push(note); }
        currentProcessingIdx++;
      } else break;
    }
    if (!isNonStop && canWait && notesToSetWaitingThisFrame.length > 0) {
        const firstDueNote = notesToSetWaitingThisFrame[0], blockStartTime = firstDueNote.timeMs; let chordWindowMs = gameSettings?.noteToleranceMs ?? 150; const chordBlock = notesToSetWaitingThisFrame.filter(n => (n.timeMs - blockStartTime) < chordWindowMs); let lookaheadIndex = currentProcessingIdx;
        while (lookaheadIndex < notesForGame.length) { const n = notesForGame[lookaheadIndex]; if ((n.timeMs - blockStartTime) < chordWindowMs) { if (!presatisfiedNoteIdsRef.current.has(n.noteId)) chordBlock.push(n); lookaheadIndex++; } else break; }
        if (chordBlock.length > 0) {
            waitingBlockTimeRef.current = blockStartTime; resumeIndexRef.current = lookaheadIndex; notesCurrentlyWaitingForIdsRef.current = new Set<string>(chordBlock.map(n => n.noteId)); updateNotesCurrentlyWaitingFor(new Set<number>(chordBlock.map(n => n.midi)));
            setActivePlaybackNotesInfo(prev => { const nm = new Map(prev); chordBlock.forEach(n => nm.set(n.noteId, { noteId: n.noteId, name: n.name, timeMs: n.timeMs, hand: n.hand, midi: n.midi, pitchClass: n.pitchClass, status: 'waiting', finger: n.finger })); return nm; });
            currentProcessingIdx = lookaheadIndex;
        }
    }
    nextNoteIndexRef.current = currentProcessingIdx; let calculatedLiveAccuracy = 100;
    if (isPlayingRef.current) { const currentHits = hitCountRef.current; const currentErrors = errorCountRef.current; const totalEncounteredSoFar = currentProcessingIdx; const denominator = Math.max(currentHits, totalEncounteredSoFar) + currentErrors; calculatedLiveAccuracy = denominator > 0 ? (currentHits / denominator) * 100 : 100; setLiveAccuracy(calculatedLiveAccuracy); }
    if (waitMode === 'retical' && barLines.length > 2 && currentTimeRef.current > barLines[2] && (calculatedLiveAccuracy < 50 || calculatedLiveSpeed < 50)) { setIsPlaying(false); isPlayingRef.current = false; if (playbackRequestRef.current) { cancelAnimationFrame(playbackRequestRef.current); playbackRequestRef.current = null; } const reason = calculatedLiveAccuracy < 50 ? `Your accuracy (${calculatedLiveAccuracy.toFixed(1)}%) dropped below 50%.` : `Your speed efficiency (${calculatedLiveSpeed.toFixed(1)}%) dropped below 50%.`; setGameOverReason(reason); setIsGameOver(true); return; }
    if (actualMusicalTimeForGameLogic >= totalDurationWithEndDelayMs && absoluteEndTimeMs > 0) {
        if (isSettingsPreviewActiveRef.current) { handleSeek(0); } 
        else {
            if (playtimeStartRef.current !== null) { sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current; playtimeStartRef.current = null; }
            setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = false; if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current);
            const finalHitCount = hitCountRef.current, finalErrorCount = errorCountRef.current, totalNotes = notesForGame.length; let isAutoPlay = waitMode === 'off'; let actDur: number; const idealDuration = absoluteEndTimeMs / playbackTempoMultiplier;
            if (isAutoPlay) actDur = idealDuration; else actDur = idealDuration + accumulatedWaitTimeRef.current;
            const calculateStats = (h: number, e: number, t: number, a: boolean, dur: number): { acc: number; spd: number } => { if (a) return { acc: 100, spd: 100 }; const den = Math.max(h, t) + e; const acc = den > 0 ? (h / den) * 100 : 100; const ideal = absoluteEndTimeMs / playbackTempoMultiplier; const spd = (ideal > 0 && dur > 0 ? Math.min(100, (ideal / dur) * 100) : 0); return { acc, spd }; };
            const stats = calculateStats(finalHitCount, finalErrorCount, totalNotes, isAutoPlay, actDur); setLiveAccuracy(stats.acc); setLiveSpeed(stats.spd);
            const baseMidiScore = analysisResult?.performanceScore || 0; 
            
            // --- Pure Curve Gameplay PS Scoring Logic ---
            const gameplayPS = (stats.acc + stats.spd) / 2;
            const p = Math.max(0, Math.min(1, gameplayPS / 100));
            const performanceFactor = (gameplayPS >= 100) ? 1 : Math.pow(p, 3.5) * (0.5 + 0.5 * Math.pow(p, 8));
            const finalScore = baseMidiScore * performanceFactor;
            // --- End Pure Curve Logic ---

            let rank = 'D'; const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
            if (gameplayPS >= 100) rank = 'X'; else if (gameplayPS >= 97.5) rank = 'SS'; else if (gameplayPS >= 95) rank = 'S'; else if (gameplayPS >= 91.25) rank = 'A'; else if (gameplayPS >= 87.5) rank = 'B'; else if (gameplayPS >= 75) rank = 'C';
            setPerformanceSummary({ accuracy: +stats.acc.toFixed(2), speed: +stats.spd.toFixed(2), gameplayPercentage: +gameplayPS.toFixed(2), baseMidiScore, finalScore: +finalScore.toFixed(2), rank, hitCount: finalHitCount, errorCount: finalErrorCount, totalNoteCount: totalNotes, playbackTempoMultiplier, totalWaitTimeMs: accumulatedWaitTimeRef.current, gameplayStyle });
            clearScheduledNotes(); clearScheduledMetronomeSounds(); updateNotesCurrentlyWaitingFor(new Set<number>()); setMusicalCurrentTimeMs(totalDurationWithEndDelayMs); return;
        }
    }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [handleSeek, isPlayingRef, notesForGame, playbackTempoMultiplier, pausedMusicalTimeRef, waitMode, playSound, clearScheduledMetronomeSounds, updateNotesCurrentlyWaitingFor, analysisResult, originalTotalMusicalDurationMs, totalDurationWithEndDelayMs, absoluteEndTimeMs, metronomeMode, noteOffsetMs, viewMode, gameSettings, barLines, safePlayAudio, safePauseAudio]);

  const freePlayLoop = useCallback(() => {
    if (!isFreePlayModeRef.current) { if (freePlayRequestRef.current) cancelAnimationFrame(freePlayRequestRef.current); freePlayRequestRef.current = null; return; }
    if (!isPlayingRef.current) { if (freePlayRequestRef.current) cancelAnimationFrame(freePlayRequestRef.current); freePlayRequestRef.current = null; return; }
    const now = performance.now(); const elapsed = now - freePlayStartTimeRef.current; setFreePlayElapsedTime(elapsed); setMusicalCurrentTimeMs(elapsed);
    setFreePlayLiveNotes(prev => prev.filter(n => { if (n.endTime === null) return true; const noteAge = elapsed - n.endTime; return noteAge < 10000; }));
    const buffer = recentNotesBufferRef.current; for (const [midi, timestamp] of buffer.entries()) { if (elapsed - timestamp > FREE_PLAY_ARPEGGIO_WINDOW_MS) buffer.delete(midi); }

    // Real-time Metronome for Free Play
    if (freePlayMetronomeMode !== 'off' && audioContextRef.current) {
        const audioCtx = audioContextRef.current;
        const beatDurationMs = (60000 / freePlayBpm);
        const lookaheadMs = 100; 
        const nextBeatTimeMs = Math.ceil(elapsed / beatDurationMs) * beatDurationMs;
        
        if (nextBeatTimeMs >= elapsed && nextBeatTimeMs < elapsed + lookaheadMs) {
            const timeUntilBeatMs = nextBeatTimeMs - elapsed;
            const targetAudioTime = audioCtx.currentTime + (timeUntilBeatMs / 1000);
            
            const beatsPerMeasure = freePlayTimeSignature.numerator;
            const absoluteBeatIndex = Math.round(nextBeatTimeMs / beatDurationMs);
            const isStrongBeat = (absoluteBeatIndex % beatsPerMeasure) === 0;

            const shouldSchedule = (freePlayMetronomeMode === 'beat') || (freePlayMetronomeMode === 'bar' && isStrongBeat);

            if (shouldSchedule) {
                // Ensure we don't schedule the same beat multiple times
                const lastScheduledBeatRef = (window as any).__lastFreePlayScheduledBeat || -1;
                if (absoluteBeatIndex > lastScheduledBeatRef) {
                    (window as any).__lastFreePlayScheduledBeat = absoluteBeatIndex;
                    const buffer = isStrongBeat ? metronomeBuffersRef.current.strong : metronomeBuffersRef.current.weak;
                    if (buffer && metronomeGainRef.current) {
                        const source = audioCtx.createBufferSource();
                        source.buffer = buffer;
                        const gainNode = audioCtx.createGain();
                        gainNode.gain.setValueAtTime(1.0, targetAudioTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.0001, targetAudioTime + buffer.duration * 0.9);
                        source.connect(gainNode);
                        gainNode.connect(metronomeGainRef.current);
                        source.start(targetAudioTime);
                        
                        // Visual feedback trigger (approximate)
                        setTimeout(() => {
                            if (isFreePlayModeRef.current) {
                                const beatType = isStrongBeat ? 'strong' : 'weak';
                                setMetronomeBeat(beatType);
                                setTimeout(() => setMetronomeBeat(null), 100);
                            }
                        }, timeUntilBeatMs);
                    }
                }
            }
        }
    }

    freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
  }, [freePlayBpm, freePlayMetronomeMode, freePlayTimeSignature]);

  const handleStartGame = (settings: GameSettings) => { 
    setIsFreePlayMode(false); // Explicitly set to false when starting a regular game
    setRenderedLayoutId(0); 
    setGameSettings(settings); 
    setPlaybackTempoMultiplier(settings.playbackTempoMultiplier); 
    setCurrentScreen('inGame'); 
    initializeAudioContext(); 
    setPlaybackTempoMultiplierForPreview(1); 
    setIsLoadingContent(true); 
    isUserPausedRef.current = false; 
    accumulatedPauseTimeRef.current = 0; 
    pauseStartTimeRef.current = null; 
    setLiveAccuracy(100); 
    setLiveSpeed(100); 
    gameRealStartTimeRef.current = null; 
    accumulatedSeekTimeRef.current = 0; 
    setIsTopBarVisible(!autoHideTopBar); 
  };

  const handleStartFreePlay = async () => { 
    handleStopPlayback(); 
    setIsFreePlayMode(true); 
    isFreePlayModeRef.current = true; 
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentScreen('inGame'); 
    await initializeAudioContext(); 
    await preloadSamplesForSong([]); // Preload just metronome
    freePlayStartTimeRef.current = performance.now(); 
    (window as any).__lastFreePlayScheduledBeat = -1;
    if (!freePlayRequestRef.current) freePlayRequestRef.current = requestAnimationFrame(freePlayLoop); 
    setIsTopBarVisible(!autoHideTopBar); 
  };

  const handlePlay = useCallback(async () => {
    if (!(await initializeAudioContext())) return;
    
    if (isFreePlayMode) {
      freePlayStartTimeRef.current = performance.now() - freePlayElapsedTime;
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (!freePlayRequestRef.current) freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
      return;
    }

    if (notesForGame.length === 0 || isPlayingRef.current) return;
    if (audioStartTimeoutRef.current) { clearTimeout(audioStartTimeoutRef.current); audioStartTimeoutRef.current = null; }
    if (playtimeStartRef.current === null && gameSettingsRef.current && (gameSettingsRef.current.waitMode === 'strict' || gameSettingsRef.current.waitMode === 'retical')) playtimeStartRef.current = performance.now();
    if (gameRealStartTimeRef.current === null) gameRealStartTimeRef.current = performance.now() - (pausedMusicalTimeRef.current / playbackTempoMultiplier);
    if (pauseStartTimeRef.current !== null) { accumulatedPauseTimeRef.current += performance.now() - pauseStartTimeRef.current; pauseStartTimeRef.current = null; }
    const startIndex = allBeatTimesRef.current.findIndex(b => b.timeMs >= pausedMusicalTimeRef.current); nextBeatToScheduleIndexRef.current = startIndex !== -1 ? startIndex : allBeatTimesRef.current.length; prevConceptualTimeRef.current = pausedMusicalTimeRef.current;
    setIsPlaying(true); isPlayingRef.current = true; isUserPausedRef.current = false; performanceStartTimeRef.current = performance.now(); setMusicalCurrentTimeMs(pausedMusicalTimeRef.current); currentTimeRef.current = pausedMusicalTimeRef.current; prevMusicalTimeRef.current = pausedMusicalTimeRef.current;
    const backing = gameSettingsRef.current?.backingTrack;
    if (backing && backing.type !== 'none') {
        const offset = backing.offsetMs || 0; const targetAudioTimeMs = pausedMusicalTimeRef.current + offset;
        if (targetAudioTimeMs < 0) { 
            if (backing.type === 'mp3' && audioRef.current) { 
                await safePauseAudio();
                audioRef.current.currentTime = 0; 
                audioRef.current.volume = mp3Volume; 
            } 
            const waitMs = Math.abs(targetAudioTimeMs) / playbackTempoMultiplier; 
            audioStartTimeoutRef.current = setTimeout(async () => { 
                if (backing.type === 'mp3' && audioRef.current) { 
                    audioRef.current.currentTime = 0; 
                    await safePlayAudio();
                } 
            }, waitMs); 
        } 
        else { 
            const targetAudioTimeSec = targetAudioTimeMs / 1000; 
            if (backing.type === 'mp3' && audioRef.current) { 
                audioRef.current.currentTime = targetAudioTimeSec; 
                audioRef.current.volume = mp3Volume; 
                await safePlayAudio();
            } 
        }
    }
    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [notesForGame.length, initializeAudioContext, playbackLoop, freePlayLoop, isFreePlayMode, freePlayElapsedTime, playbackTempoMultiplier, mp3Volume, safePlayAudio, safePauseAudio]);

  const handlePause = useCallback(async () => {
    if (isFreePlayMode) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (freePlayRequestRef.current) cancelAnimationFrame(freePlayRequestRef.current);
      freePlayRequestRef.current = null;
      return;
    }

    if (waitMode === 'retical' || !isPlayingRef.current) return;
    if (playtimeStartRef.current !== null) { sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current; playtimeStartRef.current = null; }
    setIsPlaying(false); isPlayingRef.current = false; isUserPausedRef.current = true; pausedMusicalTimeRef.current = currentTimeRef.current; pauseStartTimeRef.current = performance.now(); if (playbackRequestRef.current) cancelAnimationFrame(playbackRequestRef.current); clearScheduledNotes(); clearScheduledMetronomeSounds(); setMetronomeBeat(null);
    if (audioStartTimeoutRef.current) { clearTimeout(audioStartTimeoutRef.current); audioStartTimeoutRef.current = null; }
    if (audioRef.current) await safePauseAudio();
  }, [clearScheduledNotes, clearScheduledMetronomeSounds, waitMode, isFreePlayMode, safePauseAudio]);

  useEffect(() => {
    const p = () => { if (waitMode !== 'retical' && currentScreen === 'inGame' && isPlayingRef.current) handlePause(); };
    const r = () => { if (currentScreen === 'inGame' && !isPlayingRef.current && !isUserPausedRef.current && (notesForGame.length > 0 || isFreePlayMode)) handlePlay(); };
    const hv = () => document.hidden ? p() : r(); const hb = () => p(); const hf = () => r();
    document.addEventListener('visibilitychange', hv); window.addEventListener('blur', hb); window.addEventListener('focus', hf);
    return () => { document.removeEventListener('visibilitychange', hv); window.removeEventListener('blur', hb); window.removeEventListener('focus', hf); };
  }, [currentScreen, notesForGame.length, isFreePlayMode, handlePlay, waitMode, handlePause]);

  const processKeyPress = useCallback((midi: number) => {
    const inputTime = currentTimeRef.current; // Input time is exactly when processed (game time)
    if (isPlayingRef.current) lastPlayerInputRealTimeRef.current = performance.now();
    
    const isW = notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    
    // In Wait Mode, we don't strictly use the offset for hit detection validity in the same way 
    // because the game is paused waiting for the specific note. 
    // However, visual feedback logic or scoring (if added later for wait mode) might use it.
    if (isW) {
        const wn = notesForGame.filter(n => notesCurrentlyWaitingForIdsRef.current.has(n.noteId));
        
        let m: MidiNotePlaybackItem | undefined;
        if (isAudioInputEnabledRef.current) {
            // v2 scoring: octave-insensitive
            const inputPitchClass = midi % 12;
            m = wn.find(n => (n.midi % 12 === inputPitchClass) && !hitNoteIdsRef.current.has(n.noteId));
        } else {
            // v1 scoring: octave-sensitive
            m = wn.find(n => n.midi === midi && !hitNoteIdsRef.current.has(n.noteId));
        }

        if (waitMode === 'strict') {
            if (m) {
                setHitCount(p => p + 1);
                hitNoteIdsRef.current.add(m.noteId);
                visuallySatisfyNote(m);
                playerInputTimesRef.current.push(performance.now()); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = performance.now();
                lastInputRealTimeRef.current = performance.now();

                const newWaitingSet = new Set(notesCurrentlyWaitingForRef.current);
                newWaitingSet.delete(m.midi);
                updateNotesCurrentlyWaitingFor(newWaitingSet);

                if (newWaitingSet.size === 0) resumePlaybackFromWait();
            }
            else setErrorCount(p => p + 1);
        } else {
            if (m) {
                setHitCount(p => p + 1); hitNoteIdsRef.current.add(m.noteId); visuallySatisfyNote(m); playerInputTimesRef.current.push(performance.now()); if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = performance.now(); lastInputRealTimeRef.current = performance.now();
            }
            else setErrorCount(p => p + 1);
            resumePlaybackFromWait();
        }
    } else {
        // Non-wait mode (Falling, Sheet, etc.) - Apply Adjusted Note Time Logic
        const search = notesForGame.slice(Math.max(0, nextNoteIndexRef.current - 20), Math.min(notesForGame.length, nextNoteIndexRef.current + 80));
        let best: MidiNotePlaybackItem | null = null, min = Infinity;
        
        for (const n of search) {
            const adjustedNoteTime = n.timeMs + noteOffsetMs; // Rule: offset applied to note
            
            // Optimization: Skip notes way out of range
            if (adjustedNoteTime < inputTime - 2500 || adjustedNoteTime > inputTime + 2500) continue;

            const midiMatch = isAudioInputEnabledRef.current
                ? (n.midi % 12) === (midi % 12)
                : n.midi === midi;
            
            if (midiMatch && !presatisfiedNoteIdsRef.current.has(n.noteId)) { 
                // Rule: HIT if |inputTime - adjustedNoteTime| <= hitWindow (implied logic via closest search)
                const d = Math.abs(inputTime - adjustedNoteTime);
                if (d < min) { 
                    min = d; 
                    best = n; 
                } 
            } 
        }
        
        // Use a hit window (tolerance) to determine if it's actually a hit or just the closest note
        const hitWindow = gameSettings?.noteToleranceMs ?? 150; // Default tolerance

        if (best && min <= hitWindow) { 
            if (!hitNoteIdsRef.current.has(best.noteId)) { 
                setHitCount(p => p + 1); 
                hitNoteIdsRef.current.add(best.noteId); 
            } 
            satisfyUpcomingNote(best); 
            playerInputTimesRef.current.push(performance.now()); 
            if (firstInputRealTimeRef.current === null) firstInputRealTimeRef.current = performance.now(); 
            lastInputRealTimeRef.current = performance.now(); 
        } else {
            // Check for miss (error) logic
            // If we pressed a key but no note was close enough (adjusted time)
            // Error logic usually checks if there was *something* nearby that we missed, or if we pressed blindly.
            // Simplified error logic: if we pressed and nothing valid was found within a reasonable window (1s)
            
            const nearbyNote = notesForGame.some(n => {
                const adjTime = n.timeMs + noteOffsetMs;
                return adjTime > inputTime - 1000 && adjTime <= inputTime + 1000 && !presatisfiedNoteIdsRef.current.has(n.noteId);
            });
            
            if (nearbyNote) {
                 setErrorCount(p => p + 1);
            }
        }
    }
  }, [notesForGame, waitMode, visuallySatisfyNote, satisfyUpcomingNote, updateNotesCurrentlyWaitingFor, resumePlaybackFromWait, noteOffsetMs, gameSettings]);

  const handleFreePlayKeyPress = useCallback((midi: number) => {
    const now = performance.now(); const elapsed = now - freePlayStartTimeRef.current; const keyDef = midiNoteToKeyDefMap.get(midi); if (!keyDef) return;
    const liveNote: FreePlayLiveNote = { id: `fp-${midi}-${now}`, midi: midi, name: keyDef.name, startTime: elapsed, endTime: null, pitchClass: keyDef.displayName, hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right' };
    setFreePlayLiveNotes(prev => [...prev, liveNote]); recentNotesBufferRef.current.set(midi, elapsed);
    if (isRecording && recordingStartTimeRef.current !== null) { const recTime = now - recordingStartTimeRef.current; const newNote: MidiNotePlaybackItem = { noteId: `rec-${midi}-${now}`, midi: midi, timeMs: recTime, durationMs: 0, name: keyDef.name, pitchClass: keyDef.displayName, velocity: 0.75, hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right', originalTrackSourceInfo: 'recording' }; setRecordedNotes(prev => [...prev, newNote]); }
  }, [isRecording, midiNoteToKeyDefMap]);

  const handleFreePlayKeyRelease = useCallback((midi: number) => {
    const now = performance.now(); const elapsed = now - freePlayStartTimeRef.current;
    setFreePlayLiveNotes(prev => { const newNotes = [...prev]; const index = [...newNotes].reverse().findIndex(n => n.midi === midi && n.endTime === null); if (index !== -1) { const actualIndex = newNotes.length - 1 - index; newNotes[actualIndex] = { ...newNotes[actualIndex], endTime: elapsed }; } return newNotes; });
    if (isRecording && recordingStartTimeRef.current !== null) { const recEndTime = now - recordingStartTimeRef.current; setRecordedNotes(prev => { const newNotes = [...prev]; const index = [...newNotes].reverse().findIndex(n => n.midi === midi && n.durationMs === 0); if (index === -1) return prev; const actualIndex = newNotes.length - 1 - index; const start = newNotes[actualIndex].timeMs; newNotes[actualIndex] = { ...newNotes[actualIndex], durationMs: Math.max(1, recEndTime - start) }; return newNotes; }); }
  }, [isRecording]);

  const handleUiKeyPress = useCallback((k: string, m: number) => { 
    setUserSustainedKeys(p => new Set(p).add(k)); startSustainedSound(k, m); 
    if (isPlayingRef.current && !isFreePlayMode) processKeyPress(m); if (isFreePlayMode) handleFreePlayKeyPress(m);
  }, [processKeyPress, startSustainedSound, isFreePlayMode, handleFreePlayKeyPress]);

  const handleUiKeyRelease = useCallback((k: string, m: number) => { 
    setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); 
    if (isSustainPedalActive) sustainedByPedalKeysRef.current.set(k, m); else stopSustainedSound(k, m); 
    if (isFreePlayMode) handleFreePlayKeyRelease(m);
  }, [stopSustainedSound, isFreePlayMode, handleFreePlayKeyRelease, isSustainPedalActive]);
  
  const handleUiKeyPressRef = useRef(handleUiKeyPress);
  useEffect(() => { handleUiKeyPressRef.current = handleUiKeyPress; }, [handleUiKeyPress]);

  const handleUiKeyReleaseRef = useRef(handleUiKeyRelease);
  useEffect(() => { handleUiKeyReleaseRef.current = handleUiKeyRelease; }, [handleUiKeyRelease]);

  const loadFile = useCallback(async (f: File | null, id?: string | null, r?: boolean | null, mLink?: string | null, mOffset?: number | null) => {
    setIsLoadingFile(true); handleStopPlayback(); setPlaybackNotes([]); setCurrentOnlineSongId(id || null); setIsCurrentSongRanked(r || null);
    setCurrentMidiLink(mLink || null);
    setCurrentMidiOffset(mOffset || null);
    if (!f) { setIsLoadingFile(false); return; }
    try {
        const ext = f.name.split('.').pop()?.toLowerCase(); let res: any;
        if (f.type === 'application/json') { const text = await f.text(); res = JSON.parse(text); setCurrentFileType(FileType.UNKNOWN); }
        else if (ext === 'mid' || ext === 'midi') res = await parseMidiData(await f.arrayBuffer(), midiNoteToNameMap);
        else if (ext === 'xml' || ext === 'musicxml') res = await parseMusicXmlData(await f.text(), midiNoteToNameMap);
        else if (ext === 'mxl') { const zip = await new JSZip().loadAsync(await f.arrayBuffer()); let xml = await zip.file("META-INF/container.xml")?.async("string"); if (xml) { const p = new DOMParser().parseFromString(xml, "application/xml"); const path = p.getElementsByTagName("rootfile")[0]?.getAttribute("full-path"); if (path) xml = await zip.file(path)?.async("string"); } if (!xml) { for (const obj of Object.values(zip.files)) { const z = obj as JSZipObject; if (!z.dir && (z.name.endsWith('.xml') || z.name.endsWith('.musicxml'))) { xml = await z.async("string"); break; } } } if (!xml) throw new Error(); res = await parseMusicXmlData(xml, midiNoteToNameMap); } else throw new Error();
        const notesWithF = assignFingering(res.notes); setPlaybackNotes(notesWithF); setCurrentFileName(f.name); setInitialTimeSignature(res.timeSignature); setInitialKeySignature(res.keySignature); setCurrentTempoBpm(res.initialTempoBpm); setTempoEvents(res.tempoEvents); setSignatureEvents(res.signatureEvents || []); 
        if (ext === 'mid' || ext === 'midi') setCurrentFileType(FileType.MIDI); else if (ext === 'xml' || ext === 'musicxml' || ext === 'mxl') setCurrentFileType(FileType.MUSICXML);
        setBarLines((res.barLinesMs as number[]) || []); if (notesWithF.length > 0) await preloadSamplesForSong(notesWithF); else setIsPreloading(false);
    } catch (e) { console.error(e); alert("Error processing file."); } finally { setIsLoadingFile(false); setSelectedOnlineSongIdForNavigation(null); }
  }, [handleStopPlayback, preloadSamplesForSong, midiNoteToNameMap]);
  
  const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
      const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano';
      if (gameplayStyle === 'computer') return;
      const [c, n, v] = e.data, k = midiNoteToNameMap.get(n); if (!k) return;
      if (c === 144 && v > 0) { setUserActiveKeys(p => new Set(p).add(k)); setUserSustainedKeys(p => new Set(p).add(k)); startSustainedSound(k, n, v / 127); if (isPlayingRef.current && !isFreePlayMode) processKeyPress(n); if (isFreePlayMode) handleFreePlayKeyPress(n); }
      else if (c === 128 || (c === 144 && v === 0)) { setUserActiveKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); setUserSustainedKeys(p => { const ns = new Set(p); ns.delete(k); return ns; }); if (isSustainPedalActive) sustainedByPedalKeysRef.current.set(k, n); else stopSustainedSound(k, n); if (isFreePlayMode) handleFreePlayKeyRelease(n); }
  }, [midiNoteToNameMap, startSustainedSound, stopSustainedSound, processKeyPress, isFreePlayMode, handleFreePlayKeyPress, handleFreePlayKeyRelease, viewMode, isSustainPedalActive]);

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) { setMidiAccessStatus('unsupported'); return; }
    setMidiAccessStatus('requesting');
    try { const ma = await navigator.requestMIDIAccess({ sysex: false }); midiAccessInstanceRef.current = ma; setMidiAccessStatus('granted'); setMidiInputs(new Map(ma.inputs.entries())); setMidiOutputs(new Map(ma.outputs.entries())); ma.onstatechange = () => { if (midiAccessInstanceRef.current) { const ci = new Map(midiAccessInstanceRef.current.inputs.entries()), co = new Map(midiAccessInstanceRef.current.outputs.entries()); setMidiInputs(ci); setMidiOutputs(co); } }; } 
    catch (err) { setMidiAccessStatus('denied'); }
  }, []);

  useEffect(() => { connectMidi(); }, [connectMidi]);
  useEffect(() => { if (selectedMidiInputId && !midiInputs.has(selectedMidiInputId)) { setSelectedMidiInputId(null); } else if (!selectedMidiInputId && midiInputs.size > 0) { const firstInputId = midiInputs.keys().next().value; setSelectedMidiInputId(firstInputId); } }, [midiInputs]);
  useEffect(() => { if (selectedMidiOutputId && !midiOutputs.has(selectedMidiOutputId)) { setSelectedMidiOutputId(null); } }, [midiOutputs, selectedMidiOutputId]);
  useEffect(() => { const ai = selectedMidiInputId ? midiInputs.get(selectedMidiInputId) : null; if (activeMidiInputDeviceRef.current) activeMidiInputDeviceRef.current.onmidimessage = null; if (ai) { ai.onmidimessage = handleMidiMessage; activeMidiInputDeviceRef.current = ai; } return () => { if (activeMidiInputDeviceRef.current) activeMidiInputDeviceRef.current.onmidimessage = null; } }, [selectedMidiInputId, midiInputs, handleMidiMessage]);

  const activeMidiNotesInfoForKeyboard = useMemo(() => {
    const notePerKey = new Map<string, ActiveMidiNoteInfo>(); if (isFreePlayMode) return notePerKey;
    for (const info of activePlaybackNotesInfo.values()) if (info.status === 'user_played') notePerKey.set(info.name, info);
    for (const n of notesForGame) if (musicalCurrentTimeMs >= n.timeMs && musicalCurrentTimeMs < (n.timeMs + Math.min(n.durationMs, VISUAL_NOTE_CAP_MS))) if (!notePerKey.has(n.name)) notePerKey.set(n.name, { ...n, status: activePlaybackNotesInfo.get(n.noteId)?.status || 'playing' });
    return notePerKey;
  }, [activePlaybackNotesInfo, musicalCurrentTimeMs, notesForGame, isFreePlayMode]);

  const handleQwertyKeyDown = useCallback((e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && e.target === document.body) e.preventDefault();
    if (e.code === 'Space' && !e.repeat) { setIsSustainPedalActive(prev => { const isTurningOff = !prev; if (isTurningOff) { sustainedByPedalKeysRef.current.forEach((midiNote, keyName) => { stopSustainedSound(keyName, midiNote); }); sustainedByPedalKeysRef.current.clear(); } return !prev; }); return; }
    const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano'; if (gameplayStyle === 'piano') return;
    if (e.repeat) return; const lower = e.code.toLowerCase();
    if (qwertyLayout === 'mirp') { if (lower === 'arrowup') { setMirpTranspose(p => p + 1); return; } if (lower === 'arrowdown') { setMirpTranspose(p => p - 1); return; } const entry = MIRP_KEYBOARD_MAPPING.find(m => m.code === e.code && m.shift === e.shiftKey); if (entry) { const midi = entry.midi + mirpTranspose, key = midiNoteToKeyDefMap.get(midi); activeMirpNotesRef.current.set(e.code, midi); if (key) handleUiKeyPress(key.name, key.midiNote); } return; }
    if (qwertyActiveKeysRef.current.has(lower)) return; if (OCTAVE_DOWN_KEYS.includes(lower)) { setQwertyCurrentOctaveShift(p => Math.max(MIN_QWERTY_OCTAVE_SHIFT, p - 1)); qwertyActiveKeysRef.current.add(lower); return; } if (OCTAVE_UP_KEYS.includes(lower)) { setQwertyCurrentOctaveShift(p => Math.min(MAX_QWERTY_OCTAVE_SHIFT, p + 1)); qwertyActiveKeysRef.current.add(lower); return; }
    const m = QWERTY_MINI_KEYBOARD_MAPPING.find(x => x.qwertyKey === lower); if (m) { const midi = m.midiBase + (qwertyCurrentOctaveShift * 12), key = midiNoteToKeyDefMap.get(midi); if (key) { qwertyActiveKeysRef.current.add(lower); handleUiKeyPress(key.name, key.midiNote); } }
  }, [qwertyLayout, mirpTranspose, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyPress, viewMode, stopSustainedSound]);
  
  const handleQwertyKeyUp = useCallback((e: KeyboardEvent) => {
    const gameplayStyle = viewMode === 'sheet-qwerty' ? 'computer' : 'piano'; if (gameplayStyle === 'piano') return;
    const lower = e.code.toLowerCase();
    if (qwertyLayout === 'mirp') { const m = activeMirpNotesRef.current.get(e.code); if (m !== undefined) { const key = midiNoteToKeyDefMap.get(m); if (key) handleUiKeyRelease(key.name, key.midiNote); activeMirpNotesRef.current.delete(e.code); } return; }
    if (qwertyActiveKeysRef.current.has(lower)) qwertyActiveKeysRef.current.delete(lower); if (OCTAVE_DOWN_KEYS.includes(lower) || OCTAVE_UP_KEYS.includes(lower)) return;
    const m = QWERTY_MINI_KEYBOARD_MAPPING.find(x => x.qwertyKey === lower); if (m) { const midi = m.midiBase + (qwertyCurrentOctaveShift * 12), key = midiNoteToKeyDefMap.get(midi); if (key) { handleUiKeyRelease(key.name, key.midiNote); } }
  }, [qwertyLayout, qwertyCurrentOctaveShift, midiNoteToKeyDefMap, handleUiKeyRelease, viewMode]);

  useEffect(() => { if (currentScreen === 'inGame') { window.addEventListener('keydown', handleQwertyKeyDown); window.addEventListener('keyup', handleQwertyKeyUp); } return () => { window.removeEventListener('keydown', handleQwertyKeyDown); window.removeEventListener('keyup', handleQwertyKeyUp); }; }, [currentScreen, handleQwertyKeyDown, handleQwertyKeyUp]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (currentScreen !== 'inGame' || notesForGame.length === 0 || waitMode === 'retical') return; if (document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') handleBarNavigation('forward'); else if (e.key === 'ArrowLeft') handleBarNavigation('backward'); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [currentScreen, notesForGame, waitMode, handleBarNavigation]);
  useEffect(() => { if (currentScreen !== 'inGame' || !isLoadingContent) return; const startPlayback = () => { setIsLoadingContent(false); isUserPausedRef.current = false; if (document.hasFocus() && (notesForGame.length > 0 || isFreePlayMode)) handlePlay(); }; if (viewMode === 'sheet') { if (renderedLayoutId > 0) { const timer = setTimeout(startPlayback, 1000); return () => clearTimeout(timer); } } else { const timer = setTimeout(startPlayback, 2500); return () => clearTimeout(timer); } }, [currentScreen, isLoadingContent, viewMode, renderedLayoutId, isFreePlayMode, handlePlay]);

  useEffect(() => {
    const save = async () => {
      if (performanceSummary && !isPlaying && gameSettings?.waitMode === 'retical' && session && currentOnlineSongId && isCurrentSongRanked === true) {
        try { const { data: b } = await supabase.from('scores').select('final_score').eq('user_id', session.user.id).eq('song_id', currentOnlineSongId).order('final_score', { ascending: false }).limit(1); if (performanceSummary.finalScore > (b?.[0]?.final_score ?? -1)) { await supabase.from('scores').delete().eq('user_id', session.user.id).eq('song_id', currentOnlineSongId); await supabase.from('scores').insert({ user_id: session.user.id, song_id: currentOnlineSongId, final_score: performanceSummary.finalScore, accuracy: performanceSummary.accuracy, speed: performanceSummary.speed, rank: performanceSummary.rank, notes_hit: performanceSummary.hitCount, errors: performanceSummary.errorCount, total_notes: performanceSummary.totalNoteCount, mode: 'retical', tempo_multiplier: performanceSummary.playbackTempoMultiplier, total_wait_time_ms: performanceSummary.totalWaitTimeMs, gameplay_style: performanceSummary.gameplayStyle }); } } catch (e) {}
      }
    };
    save();
  }, [performanceSummary, isPlaying, gameSettings, session, currentOnlineSongId, isCurrentSongRanked]);

  useEffect(() => {
    if (activeMidiInputDeviceRef.current) {
        activeMidiInputDeviceRef.current.onmidimessage = handleMidiMessage;
    }
  }, [handleMidiMessage]);

  useEffect(() => {
    if (!isFreePlayMode) { setDetectedChord(null); return; }
    if (chordDetectionTimeoutRef.current) clearTimeout(chordDetectionTimeoutRef.current);
    chordDetectionTimeoutRef.current = window.setTimeout(() => {
      const buffer = recentNotesBufferRef.current; const elapsed = performance.now() - freePlayStartTimeRef.current;
      const recentMidis = Array.from(buffer.entries()).filter(([_, timestamp]) => elapsed - timestamp < FREE_PLAY_ARPEGGIO_WINDOW_MS).map(([midi, _]) => midi);
      if (recentMidis.length < 2) { setDetectedChord(null); return; }
      const pcSet = new Set(recentMidis.map(m => m % 12)); const pc = Array.from(pcSet).sort((a: number, b: number) => a - b);
      if (pc.length < 2) { setDetectedChord(null); return; }
      let bestMatch = null;
      for (const root of pc) { const normalizedIntervals = pc.map(p => (p - root + 12) % 12).sort((a: number, b: number) => a - b).join(','); const formula = CHORD_FORMULAS[normalizedIntervals]; if (formula) { bestMatch = `${PITCH_CLASS_TO_NAME[root]}${formula.name}`; break; } }
      setDetectedChord(bestMatch);
    }, 50); 
    return () => { if (chordDetectionTimeoutRef.current) clearTimeout(chordDetectionTimeoutRef.current); };
  }, [userSustainedKeys, isFreePlayMode]);

  useEffect(() => { if (!isRecording && recordedNotes.length > 0) setShowSaveButton(true); else setShowSaveButton(false); }, [isRecording, recordedNotes.length]);

  const handleToggleRecording = useCallback(() => { if (!isRecording) { setRecordedNotes([]); setShowSaveButton(false); recordingStartTimeRef.current = performance.now(); setIsRecording(true); } else { setIsRecording(false); recordingStartTimeRef.current = null; } }, [isRecording]);
  const handleSaveRecording = useCallback(() => {
    if (recordedNotes.length === 0 && userSustainedKeys.size === 0) return;
    try {
        const midi = new Midi(); const track = midi.addTrack(); track.name = "Recording";
        const now = performance.now(); const recEndTime = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;
        const finalNotes = recordedNotes.map(note => { if (note.durationMs === 0 && recEndTime > note.timeMs) { return { ...note, durationMs: Math.max(1, recEndTime - note.timeMs) }; } return note; });
        userSustainedKeys.forEach(keyName => { const keyDef = noteNameToKeyDefMap.get(keyName); if (keyDef && !recordedNotes.some(n => n.midi === keyDef.midiNote)) { finalNotes.push({ noteId: `rec-sustained-${keyDef.midiNote}-${now}`, midi: keyDef.midiNote, timeMs: 0, durationMs: recEndTime, name: keyDef.name, pitchClass: keyDef.displayName, velocity: 0.75, hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? 'left' : 'right', originalTrackSourceInfo: 'recording-sustained' } as MidiNotePlaybackItem); } });
        finalNotes.forEach(note => { if (note.durationMs > 0) { track.addNote({ midi: note.midi, time: note.timeMs / 1000, duration: note.durationMs / 1000, velocity: note.velocity }); } });
        const midiArray = midi.toArray(); if (midiArray.length === 0) { alert("No notes recorded to save."); return; }
        const blob = new Blob([midiArray], { type: 'audio/midi' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `octavia_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mid`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setRecordedNotes([]); setShowSaveButton(false);
    } catch (e) { alert("Failed to generate MIDI file."); }
  }, [recordedNotes, userSustainedKeys, noteNameToKeyDefMap]);

  const notesForFallingView = useMemo(() => { if (viewMode !== 'falling') return []; return notesForGame; }, [notesForGame, viewMode]);
  const vexFlowData = useMemo(() => {
    if ((viewMode !== 'sheet' && viewMode !== 'sheet-roll' && viewMode !== 'sheet-qwerty') || !notesForGame.length || !initialTimeSignature || currentTempoBpm === null || currentTempoBpm <= 0) return null;
    if (baseCalculatedPianoWidth == null || baseCalculatedPianoWidth <= 0 || !Number.isFinite(baseCalculatedPianoWidth) || contentAreaHeight == null || contentAreaHeight <= 0 || !Number.isFinite(contentAreaHeight)) return null;
    try {
        return getVexFlowRenderData(notesForGame, initialTimeSignature, currentTempoBpm, initialKeySignature, (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty') ? noteSpeedMultiplier : sheetMusicZoom, barLines, signatureEvents, baseCalculatedPianoWidth, contentAreaHeight, showOnlyMajorNotes, tempoEvents, playbackTempoMultiplier, (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty'));
    } catch (e) { return null; }
  }, [notesForGame, initialTimeSignature, currentTempoBpm, initialKeySignature, sheetMusicZoom, noteSpeedMultiplier, barLines, signatureEvents, baseCalculatedPianoWidth, contentAreaHeight, showOnlyMajorNotes, tempoEvents, playbackTempoMultiplier, viewMode]);

  const handleExitSettingsPreview = useCallback(() => { if (!isSettingsPreviewActiveRef.current) return; handleStopPlayback(); setPlaybackNotes([]); setCurrentFileName(null); setAnalysisResult(null); setInitialTimeSignature(DEFAULT_TIME_SIGNATURE); setInitialKeySignature(DEFAULT_KEY_SIGNATURE); setCurrentTempoBpm(null); setTempoEvents([]); setSignatureEvents([]); setBarLines([]); setTotalNoteCountForGame(0); isSettingsPreviewActiveRef.current = false; }, [handleStopPlayback]);
  const handleEnterSettingsPreview = useCallback(async () => {
    if (currentFileName) return; isSettingsPreviewActiveRef.current = true; setIsTopBarVisible(true);
    setGameSettings({ waitMode: 'off', practiceHand: 'both', playbackTempoMultiplier: 1 }); setIsLoadingFile(true);
    try { const response = await fetch('/sounds/test.mid'); if (!response.ok) throw new Error('Failed to fetch preview MIDI'); const blob = await response.blob(); const file = new File([blob], 'Settings Preview.mid', { type: 'audio/midi' }); const res = await parseMidiData(await file.arrayBuffer(), midiNoteToNameMap); const notesWithF = assignFingering(res.notes); setPlaybackNotes(notesWithF); setInitialTimeSignature(res.timeSignature); setInitialKeySignature(res.keySignature); setCurrentTempoBpm(res.initialTempoBpm); setTempoEvents(res.tempoEvents); setSignatureEvents(res.signatureEvents); setCurrentFileType(FileType.MIDI); setBarLines(res.barLinesMs); await preloadSamplesForSong(notesWithF); } 
    catch (error) { handleExitSettingsPreview(); } finally { setIsLoadingFile(false); }
  }, [currentFileName, midiNoteToNameMap, preloadSamplesForSong, handleExitSettingsPreview]);

  const prevScreenRef = useRef<Screen | undefined>(undefined);
  useEffect(() => { const previousScreen = prevScreenRef.current; if (previousScreen === 'settings' && currentScreen !== 'settings') handleExitSettingsPreview(); else if (currentScreen === 'settings' && previousScreen !== 'settings') handleEnterSettingsPreview(); prevScreenRef.current = currentScreen; }, [currentScreen, handleEnterSettingsPreview, handleExitSettingsPreview]);
  useEffect(() => { if (isSettingsPreviewActiveRef.current && playbackNotes.length > 0 && !isPlayingRef.current) handlePlay(); }, [playbackNotes, handlePlay]);
  const handleExitGame = useCallback(() => { const wasInFreePlay = isFreePlayModeRef.current; handleStopPlayback(); if (wasInFreePlay) { sessionStorage.setItem('songSelectionInitialTab', 'local'); setCurrentScreen('songSelection'); } else { setCurrentScreen('modeSelection'); } }, [handleStopPlayback]);
  const handleToggleLoop = useCallback(() => setIsLooping(p => !p), []);
  const handleSetLoopStart = useCallback(() => { setLoopStartMs(currentTimeRef.current); if (loopEndMs === null || loopEndMs <= currentTimeRef.current) setLoopEndMs(absoluteEndTimeMs); }, [loopEndMs, absoluteEndTimeMs]);
  const handleSetLoopEnd = useCallback(() => { if (loopStartMs !== null && currentTimeRef.current > loopStartMs) setLoopEndMs(currentTimeRef.current); }, [loopStartMs]);
  const handleClearLoop = useCallback(() => { setIsLooping(false); setLoopStartMs(null); setLoopEndMs(null); }, []);

  const stopAudioProcessing = useCallback(() => {
    if (pitchDetectionRequestRef.current) { cancelAnimationFrame(pitchDetectionRequestRef.current); pitchDetectionRequestRef.current = null; }
    if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(track => track.stop()); audioStreamRef.current = null; }
    if (audioContextForInputRef.current && audioContextForInputRef.current.state !== 'closed') audioContextForInputRef.current.close();
    audioContextForInputRef.current = null; analyserRef.current = null; audioSourceRef.current = null;
    micActiveNotesRef.current.forEach(midi => { const keyDef = midiNoteToKeyDefMap.get(midi); if (keyDef) handleUiKeyReleaseRef.current(keyDef.name, keyDef.midiNote); });
    micActiveNotesRef.current.clear(); noteOffCandidatesRef.current.clear();
  }, [midiNoteToKeyDefMap]);

  useEffect(() => {
    const getAudioDevices = async () => {
        if (!navigator.mediaDevices?.enumerateDevices) { setIsAudioInputEnabled(false); return; }
        try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); /* FIX: Removed redundant 'mediaDevices' property */ const devices = await navigator.mediaDevices.enumerateDevices(); const inputs = devices.filter(device => device.kind === 'audioinput'); setAudioInputs(inputs); if (inputs.length > 0 && !selectedAudioInputId) setSelectedAudioInputId(inputs[0].deviceId); if (inputs.length === 0) setIsAudioInputEnabled(false); } 
        catch (err) { setIsAudioInputEnabled(false); }
    };
    if (isAudioInputEnabled) getAudioDevices(); else { stopAudioProcessing(); setAudioInputs([]); setSelectedAudioInputId(null); setAudioInputError(null); }
    return () => stopAudioProcessing();
  }, [isAudioInputEnabled, stopAudioProcessing]);

  const startAudioProcessing = useCallback(async (deviceId: string) => {
    stopAudioProcessing();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, autoGainControl: false, echoCancellation: false, noiseSuppression: false } });
        audioStreamRef.current = stream;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext({ sampleRate: 44100 });
        audioContextForInputRef.current = context;
        const source = context.createMediaStreamSource(stream);
        audioSourceRef.current = source;
        const analyser = context.createAnalyser();
        analyser.fftSize = 16384; 
        analyser.smoothingTimeConstant = 0.05;
        analyserRef.current = analyser;
        source.connect(analyser);

        const processPitch = () => {
            if (!analyserRef.current || !audioContextForInputRef.current) return;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const frequencyData = new Float32Array(bufferLength);
            analyserRef.current.getFloatFrequencyData(frequencyData);

            const peaks: { freq: number, mag: number }[] = [];
            const maxPianoFreqBin = Math.min(bufferLength - 2, Math.floor(4186 * analyser.fftSize / context.sampleRate));

            for (let i = 2; i < maxPianoFreqBin; i++) {
                const freq = i * context.sampleRate / analyser.fftSize;
                if (freq < 27.0) continue; // Skip frequencies below A0

                const midi = frequencyToMidi(freq);
                let threshold: number;

                // Use the custom thresholds from state
                const currentT = micThresholdsRef.current;
                if (midi < 43) {                 // Below G2
                    threshold = currentT.subBass;
                } else if (midi < 48) {          // G2 up to (but not including) C3
                    threshold = currentT.bass;
                } else if (midi < 60) {          // C3 up to (but not including) C4
                    threshold = currentT.mid;
                } else if (midi <= 96) {         // C4 up to and including C7
                    threshold = currentT.treble;
                } else {                         // Above C7
                    threshold = currentT.highTreble;
                }

                if (frequencyData[i] > threshold && frequencyData[i] > frequencyData[i - 1] && frequencyData[i] > frequencyData[i + 1]) {
                    // Quadratic Interpolation for more accurate peak frequency
                    const alpha = frequencyData[i - 1];
                    const beta = frequencyData[i];
                    const gamma = frequencyData[i + 1];
                    const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
                    
                    const interpolatedFreq = (isFinite(p) && !isNaN(p))
                        ? (i + p) * context.sampleRate / analyser.fftSize
                        : freq;

                    peaks.push({ freq: interpolatedFreq, mag: beta });
                }
            }

            // PEELING HARMONIC FILTER:
            const sortedPeaks = [...peaks].sort((a, b) => a.freq - b.freq);
            const fundamentals: { freq: number, mag: number }[] = [];
            
            for (let i = 0; i < sortedPeaks.length; i++) {
                const peak = sortedPeaks[i];
                let isHarmonicOfLowerPeak = false;

                for (const fund of fundamentals) {
                    const ratio = peak.freq / fund.freq;
                    const roundedRatio = Math.round(ratio);
                    
                    const isHarmonic = roundedRatio >= 2 && Math.abs(ratio - roundedRatio) < (0.04 * roundedRatio);
                    
                    if (isHarmonic) {
                        // FIX: Piano bass notes have VERY strong overtones.
                        // We increase headroom significantly for low frequencies to prevent harmonics from being detected as separate notes.
                        const headRoom = fund.freq < 150 ? 28 : 12; 
                        
                        if (peak.mag < fund.mag + headRoom) {
                            isHarmonicOfLowerPeak = true;
                            break;
                        }
                    }
                }

                if (!isHarmonicOfLowerPeak) {
                    fundamentals.push(peak);
                }
            }

            const currentFrameNotes = new Set<number>();
            fundamentals.forEach(f => {
                const midi = frequencyToMidi(f.freq);
                if (midi >= 21 && midi <= 108) currentFrameNotes.add(midi);
            });

            const previousActiveNotes = micActiveNotesRef.current;
            const offCandidates = noteOffCandidatesRef.current;
            const NOTE_OFF_THRESHOLD = 2; // Faster note-off

            currentFrameNotes.forEach(midi => {
                if (!previousActiveNotes.has(midi)) {
                    const keyDef = midiNoteToKeyDefMap.get(midi);
                    if (keyDef) handleUiKeyPressRef.current(keyDef.name, keyDef.midiNote);
                    previousActiveNotes.add(midi);
                }
                offCandidates.delete(midi);
            });

            previousActiveNotes.forEach(midi => {
                if (!currentFrameNotes.has(midi)) {
                    const misses = (offCandidates.get(midi) || 0) + 1;
                    if (misses >= NOTE_OFF_THRESHOLD) {
                        const keyDef = midiNoteToKeyDefMap.get(midi);
                        if (keyDef) handleUiKeyReleaseRef.current(keyDef.name, keyDef.midiNote);
                        previousActiveNotes.delete(midi);
                        offCandidates.delete(midi);
                    } else {
                        offCandidates.set(midi, misses);
                    }
                }
            });

            pitchDetectionRequestRef.current = requestAnimationFrame(processPitch);
        };
        pitchDetectionRequestRef.current = requestAnimationFrame(processPitch);
    } catch (err) { setIsAudioInputEnabled(false); }
  }, [stopAudioProcessing, midiNoteToKeyDefMap]);
  
  useEffect(() => { if (isAudioInputEnabled && selectedAudioInputId) startAudioProcessing(selectedAudioInputId); else stopAudioProcessing(); return () => stopAudioProcessing(); }, [isAudioInputEnabled, selectedAudioInputId, startAudioProcessing, stopAudioProcessing]);

  const zoomScale = uiZoom / 100;
  const inverseZoomScale = 100 / zoomScale;
  const bgOpacity = themeSettings.backgroundOpacity ?? 0;
  const isImageActive = !!themeSettings.backgroundUrl && bgOpacity > 0;
  const sheetMusicBackgroundColor = isImageActive ? 'transparent' : '#ffffff';
  const fallingNotesBackgroundColor = (bgOpacity === 0) ? '#000000' : (isImageActive ? 'transparent' : themeSettings.fallingNotesBackgroundColor);

  return (
      <div ref={appRootRef} onClick={async (e) => {
          if (currentScreen === 'inGame' || currentScreen === 'midiEditor') return; // Skip click sounds in editor
          let t = e.target as HTMLElement | null, isI = false;
          while (t && t !== appRootRef.current) { if (t.matches('button, a, [role="button"], input, select, textarea, label') || window.getComputedStyle(t).cursor === 'pointer') { isI = true; break; } t = t.parentElement; }
          if (!isI || !(await initializeAudioContext())) return;
          const now = performance.now(); if (now - lastUiClickTimeRef.current > 500) uiClickComboIndexRef.current = 0;
          playSound(UI_CLICK_SOUND_SEQUENCE_MIDI[uiClickComboIndexRef.current], INTERACTIVE_NOTE_DURATION_MS, 0.4);
          uiClickComboIndexRef.current = (uiClickComboIndexRef.current + 1) % UI_CLICK_SOUND_SEQUENCE_MIDI.length; lastUiClickTimeRef.current = now;
      }} 
      className="text-white min-h-screen flex flex-col font-sans"
      style={{ width: `${inverseZoomScale}%`, height: `${inverseZoomScale}%`, transform: `scale(${zoomScale})`, transformOrigin: 'top left', position: 'absolute', overflow: 'auto', minHeight: 'unset' }}
      >
        {gameSettings?.backingTrack?.type === 'mp3' && gameSettings.backingTrack.url && (
            <audio ref={audioRef} src={gameSettings.backingTrack.url} preload="auto" />
        )}
        {currentScreen === 'settings' && isSettingsPreviewActiveRef.current && playbackNotes.length > 0 && (
          <div className="absolute inset-0 z-0">
             <BackgroundDisplay themeSettings={themeSettings} viewMode={viewMode} isFreePlayMode={isFreePlayMode} />
             <div className="absolute inset-0 z-0">
                <div className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${autoHideTopBar ? (isTopBarVisible ? 'translate-y-0' : '-translate-y-full') : 'translate-y-0'}`}>
                <TopBar onPlay={handlePlay} onPause={handlePause} onStop={handleStopPlayback} onExit={() => {}} isPlaying={isPlaying} isFileLoaded={playbackNotes.length > 0} fileName={currentFileName} waitMode={waitMode} metronomeMode={metronomeMode} onCycleMetronomeMode={() => setMetronomeMode(p => p === 'off' ? 'beat' : p === 'beat' ? 'bar' : 'off')} isMetronomeAvailable={isMetronomeAvailable} hitCount={hitCount} errorCount={errorCount} liveAccuracy={liveAccuracy} liveSpeed={liveSpeed} totalNoteCount={totalNoteCountForGame} currentTimeMs={musicalCurrentTimeMs / playbackTempoMultiplier} totalDurationMs={absoluteEndTimeMs / playbackTempoMultiplier} viewMode={viewMode} noteSpeedMultiplier={noteSpeedMultiplier} onNoteSpeedMultiplierChange={setNoteSpeedMultiplier} sheetMusicZoom={sheetMusicZoom} onSheetMusicZoomChange={setSheetMusicZoom} analysisResult={analysisResult} metronomeBeat={metronomeBeat} totalWaitTimeMs={totalWaitTimeMs} isFreePlayMode={isFreePlayMode} isRecording={isRecording} onToggleRecording={handleToggleRecording} onSaveRecording={handleSaveRecording} showSaveButton={showSaveButton} isLooping={isLooping} onToggleLoop={handleToggleLoop} loopStartMs={loopStartMs} loopEndMs={loopEndMs} onSetLoopStart={handleSetLoopStart} onSetLoopEnd={handleSetLoopEnd} onClearLoop={handleClearLoop} />
                </div>
                <div ref={contentAreaRef} className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden">
                    <div className="flex flex-col justify-end" style={{ width: `${baseCalculatedPianoWidth}px`, height: '100%' }}>
                    <div className="relative flex-grow w-full">
                        {viewMode === 'falling' ? (
                        <FallingNotesArea notes={notesForFallingView} currentTimeMs={musicalCurrentTimeMs} keyPositions={keyPositionsMap} activeMidiNotesInfo={activePlaybackNotesInfo} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={barLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={fallingNotesBackgroundColor} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeTempoBpm={activeBpmForDisplay} showOnlyMajorNotes={showOnlyMajorNotes} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                        ) : (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty') && vexFlowData ? (
                            <HorizontalNotesView currentTimeMs={musicalCurrentTimeMs} width={baseCalculatedPianoWidth} height={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5} activePlaybackNotesInfo={activePlaybackNotesInfo} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={sheetMusicBackgroundColor} vexFlowData={vexFlowData} showOnlyMajorNotes={showOnlyMajorNotes} noteLabelType={viewMode === 'sheet-qwerty' ? 'qwerty' : noteLabelType} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeBpmForDisplay={activeBpmForDisplay} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} isQwertyView={viewMode === 'sheet-qwerty'} />
                        ) : viewMode === 'sheet' && vexFlowData ? (
                        <VexFlowSheetMusicView notes={notesForGame} timeSignature={initialTimeSignature} keySignature={initialKeySignature} initialTempoBpm={currentTempoBpm || 120} width={baseCalculatedPianoWidth} height={contentAreaHeight} currentTimeMs={musicalCurrentTimeMs} totalDurationMs={originalTotalMusicalDurationMs} activePlaybackNotesInfo={activePlaybackNotesInfo} onSeek={handleSeek} isPlaying={isPlaying} sheetMusicZoom={sheetMusicZoom} barLines={barLines} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} signatureEvents={signatureEvents} onLayoutRendered={setRenderedLayoutId} tempoEvents={tempoEvents} playbackTempoMultiplier={playbackTempoMultiplier} backgroundColor={sheetMusicBackgroundColor} />
                        ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><p className="text-slate-400 animate-pulse">Loading preview...</p></div>}
                    </div>
                    <div className="relative flex-shrink-0" style={{ width: '100%', height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px` }}>
                        <PianoKeyboard keyPositions={Array.from(keyPositionsMap.values())} userSustainedKeys={userSustainedKeys} userActiveKeys={userActiveKeys} activeMidiNotesInfo={activeMidiNotesInfoForKeyboard} onUiKeyPress={handleUiKeyPress} onUiKeyRelease={handleUiKeyRelease} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} showQwertyShortcuts={showQwertyShortcuts} qwertyCurrentOctaveShift={qwertyLayout === 'mirp' ? 0 : qwertyCurrentOctaveShift} width={baseCalculatedPianoWidth} layoutConfig={layoutConfig} qwertyLayout={qwertyLayout} mirpTranspose={mirpTranspose} isInteractive={viewMode !== 'sheet-qwerty'} lowDetailMode={true} />
                        {isSustainPedalActive && <div className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded shadow-lg animate-pulse" style={{ zIndex: 30 }} aria-live="polite">SUSTAIN</div>}
                    </div>
                    </div>
                </div>
            </div>
          </div>
        )}
        {currentScreen === 'mainMenu' && <MainMenu onPlay={() => setCurrentScreen('songSelection')} onSettings={() => setCurrentScreen('settings')} onSocial={() => setCurrentScreen('leaderboard')} onOpenLoginModal={() => setIsAuthModalOpen(true)} onOpenAccountModal={() => setIsAccountModalOpen(true)} onNavigate={setCurrentScreen} />}
        {currentScreen === 'leaderboard' && <Leaderboard onBack={() => setCurrentScreen('mainMenu')} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); setCurrentScreen('songSelection'); }} />}
        {currentScreen === 'songSelection' && <SongSelection onFileLoaded={loadFile} onSongSelected={() => setCurrentScreen('modeSelection')} onBack={() => { setCurrentScreen('mainMenu'); setSelectedOnlineSongIdForNavigation(null); setCurrentFileName(null); setPlaybackNotes([]); setAnalysisResult(null); }} loadedSongName={currentFileName} analysisResult={analysisResult} isLoading={isLoadingFile || isPreloading} selectedOnlineSongIdForNavigation={selectedOnlineSongIdForNavigation} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); }} onStartFreePlay={handleStartFreePlay} onNavigateToEditor={(file) => { setEditorMidiFile(file); setCurrentScreen('midiEditor'); }} />}
        {currentScreen === 'modeSelection' && <ModeSelection onStartGame={handleStartGame} onBack={() => setCurrentScreen('songSelection')} analysisResult={analysisResult} analysisResultForPreview={previewAnalysisResult} fileName={currentFileName} initialTempoBpm={currentTempoBpm} initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier} onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange} currentHideBarNavigationButtons={hideBarNavigationButtons} onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} backingTrackFile={backingTrackFile} onBackingTrackFileChange={setBackingTrackFile} backingTrackOffset={backingTrackOffset} onBackingTrackOffsetChange={setBackingTrackOffset} isAudioInputEnabled={isAudioInputEnabled} midiLink={currentMidiLink} midiOffset={currentMidiOffset} />}
        {currentScreen === 'settings' && (
           <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-40 p-4" onClick={(e) => e.target === e.currentTarget && setCurrentScreen('mainMenu')}>
              <Settings onBack={() => setCurrentScreen('mainMenu')} midiAccessStatus={midiAccessStatus} midiInputs={midiInputs} selectedMidiInputId={selectedMidiInputId} onSelectMidiInput={setSelectedMidiInputId} midiOutputs={midiOutputs} selectedMidiOutputId={selectedMidiOutputId} onSelectMidiOutput={setSelectedMidiOutputId} connectMidi={connectMidi} isAudioInputEnabled={isAudioInputEnabled} onIsAudioInputEnabledChange={setIsAudioInputEnabled} audioInputs={audioInputs} selectedAudioInputId={selectedAudioInputId} onSelectedAudioInputIdChange={setSelectedAudioInputId} audioInputError={audioInputError} micThresholds={micThresholds} onMicThresholdsChange={setMicThresholds} viewMode={viewMode} onViewModeChange={setViewMode} noteLabelType={noteLabelType} onNoteLabelTypeChange={setNoteLabelType} showOnlyMajorNotes={showOnlyMajorNotes} onShowOnlyMajorNotesChange={setShowOnlyMajorNotes} showQwertyShortcuts={showQwertyShortcuts} onShowQwertyShortcutsChange={setShowQwertyShortcuts} hideBarNavigationButtons={hideBarNavigationButtons} onHideBarNavigationButtonsChange={onHideBarNavigationButtonsChange} autoHideTopBar={autoHideTopBar} onAutoHideTopBarChange={setAutoHideTopBar} masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume} metronomeVolume={metronomeVolume} onMetronomeVolumeChange={setMetronomeVolume} metronomeOffsetMs={noteOffsetMs} onMetronomeOffsetChange={setNoteOffsetMs} themeSettings={themeSettings} onThemeSettingsChange={setThemeSettings} devicePreset={devicePreset} onDevicePresetChange={setDevicePreset} customWhiteKeyHeight={customWhiteKeyHeight} onCustomWhiteKeyHeightChange={setCustomWhiteKeyHeight} customBlackKeyHeight={customBlackKeyHeight} onCustomBlackKeyHeightChange={setCustomBlackKeyHeight} customKeyLabelHeight={customKeyLabelHeight} onCustomKeyLabelHeightChange={setCustomKeyLabelHeight} customMinWhiteKeyWidth={customMinWhiteKeyWidth} onCustomMinWhiteKeyWidthChange={setCustomMinWhiteKeyWidth} pianoRangeMode={pianoRangeMode} onPianoRangeModeChange={setPianoRangeMode} customStartNote={customStartNote} onCustomStartNoteChange={setCustomStartNote} customEndNote={customEndNote} onCustomEndNoteChange={setCustomEndNote} qwertyLayout={qwertyLayout} onQwertyLayoutChange={setQwertyLayout} showPianoTilesBackground={showPianoTilesBackground} onShowPianoTilesBackgroundChange={setShowPianoTilesBackground} uiZoom={uiZoom} onUiZoomChange={setUiZoom} mp3Volume={mp3Volume} onMp3VolumeChange={setMp3Volume} />
           </div>
        )}
        {currentScreen === 'about' && <AboutUs onBack={() => setCurrentScreen('mainMenu')} />}
        {currentScreen === 'contact' && <ContactPage onBack={() => setCurrentScreen('mainMenu')} />}
        {currentScreen === 'privacy' && <PrivacyPolicy onBack={() => setCurrentScreen('mainMenu')} />}
        {currentScreen === 'disclaimer' && <Disclaimer onBack={() => setCurrentScreen('mainMenu')} />}
        {currentScreen === 'midiEditor' && (
            <MidiEditor 
                initialMidiFile={editorMidiFile} 
                onClose={() => { 
                    setEditorMidiFile(null); 
                    sessionStorage.setItem('songSelectionInitialTab', 'local'); // Go back to local tab
                    setCurrentScreen('songSelection'); 
                }} 
            />
        )}
        {currentScreen === 'inGame' && (
          <div className="flex-grow relative overflow-hidden">
            <div className="absolute inset-0 z-0">
               <BackgroundDisplay themeSettings={themeSettings} viewMode={viewMode} isFreePlayMode={isFreePlayMode} />
            </div>
            <div className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${autoHideTopBar ? (isTopBarVisible ? 'translate-y-0' : '-translate-y-full') : 'translate-y-0'}`} onMouseEnter={autoHideTopBar ? clearTopBarHideTimer : undefined} onMouseLeave={autoHideTopBar ? startTopBarHideTimer : undefined}>
              <TopBar 
                onPlay={handlePlay} onPause={handlePause} onStop={handleStopPlayback} onExit={handleExitGame} isPlaying={isPlaying} isFileLoaded={playbackNotes.length > 0 || isFreePlayMode} fileName={isFreePlayMode ? 'Free Play' : currentFileName} waitMode={waitMode} 
                metronomeMode={isFreePlayMode ? freePlayMetronomeMode : metronomeMode} 
                onCycleMetronomeMode={() => {
                    if (isFreePlayMode) setFreePlayMetronomeMode(p => p === 'off' ? 'beat' : p === 'beat' ? 'bar' : 'off');
                    else setMetronomeMode(p => p === 'off' ? 'beat' : p === 'beat' ? 'bar' : 'off');
                }} 
                isMetronomeAvailable={isMetronomeAvailable} hitCount={hitCount} errorCount={errorCount} liveAccuracy={liveAccuracy} liveSpeed={liveSpeed} totalNoteCount={totalNoteCountForGame} currentTimeMs={(isFreePlayMode ? freePlayElapsedTime : musicalCurrentTimeMs) / (isFreePlayMode ? 1 : playbackTempoMultiplier)} totalDurationMs={isFreePlayMode ? Infinity : absoluteEndTimeMs / playbackTempoMultiplier} viewMode={viewMode} noteSpeedMultiplier={noteSpeedMultiplier} onNoteSpeedMultiplierChange={setNoteSpeedMultiplier} sheetMusicZoom={sheetMusicZoom} onSheetMusicZoomChange={setSheetMusicZoom} analysisResult={analysisResult} metronomeBeat={metronomeBeat} totalWaitTimeMs={totalWaitTimeMs} isFreePlayMode={isFreePlayMode} isRecording={isRecording} onToggleRecording={handleToggleRecording} onSaveRecording={handleSaveRecording} showSaveButton={showSaveButton} isLooping={isLooping} onToggleLoop={handleToggleLoop} loopStartMs={loopStartMs} loopEndMs={loopEndMs} onSetLoopStart={handleSetLoopStart} onSetLoopEnd={handleSetLoopEnd} onClearLoop={handleClearLoop}
                freePlayBpm={freePlayBpm} onFreePlayBpmChange={setFreePlayBpm}
                freePlayTimeSignature={freePlayTimeSignature} onFreePlayTimeSignatureChange={setFreePlayTimeSignature}
              />
            </div>
            {backingTrackError && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-600/90 text-white px-4 py-3 rounded-lg shadow-lg border border-red-400 flex items-center gap-3 animate-bounce-in">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span>{backingTrackError}</span>
                    <button onClick={() => setBackingTrackError(null)} className="ml-2 text-red-200 hover:text-white font-bold">&times;</button>
                </div>
            )}
            <div ref={contentAreaRef} className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden">
                {autoHideTopBar && <div className="absolute top-0 left-0 right-0 h-10 z-40" onMouseEnter={() => setIsTopBarVisible(true)} onClick={() => setIsTopBarVisible(true)} />}
                <>
                  {!isFreePlayMode && <BarNavigationControls onNavigate={handleBarNavigation} isFileLoaded={notesForGame.length > 0} waitMode={waitMode} hideControls={hideBarNavigationButtons || metronomeMode === 'off'} barNavigationMode={metronomeMode} />}
                  <div className="flex flex-col justify-end" style={{ width: `${baseCalculatedPianoWidth}px`, height: '100%' }}>
                    <div className="relative flex-grow w-full">
                      {isFreePlayMode ? (
                        <div className="relative w-full h-full" style={{ backgroundColor: fallingNotesBackgroundColor }}>
                          <div className="absolute inset-0 z-0"><ChordDisplay chord={detectedChord} /></div>
                          <FallingNotesArea isRising={true} notes={[]} liveNotes={freePlayLiveNotes} currentTimeMs={freePlayElapsedTime} keyPositions={keyPositionsMap} activeMidiNotesInfo={new Map()} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={freePlayBarLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor="transparent" activeKeySignature="C" activeTempoBpm={freePlayBpm} showOnlyMajorNotes={false} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                        </div>
                      ) : viewMode === 'falling' ? (
                        <FallingNotesArea notes={notesForFallingView} currentTimeMs={musicalCurrentTimeMs} keyPositions={keyPositionsMap} activeMidiNotesInfo={activePlaybackNotesInfo} width={baseCalculatedPianoWidth} actualHeight={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier} barLines={barLines} noteLabelType={noteLabelType} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={fallingNotesBackgroundColor} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeTempoBpm={activeBpmForDisplay} showOnlyMajorNotes={showOnlyMajorNotes} showPianoTilesBackground={showPianoTilesBackground} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} />
                      ) : (viewMode === 'sheet-roll' || viewMode === 'sheet-qwerty') && vexFlowData ? (
                          <HorizontalNotesView currentTimeMs={musicalCurrentTimeMs} width={baseCalculatedPianoWidth} height={contentAreaHeight} pixelsPerMillisecond={BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5} activePlaybackNotesInfo={activePlaybackNotesInfo} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} backgroundColor={sheetMusicBackgroundColor} vexFlowData={vexFlowData} showOnlyMajorNotes={showOnlyMajorNotes} noteLabelType={viewMode === 'sheet-qwerty' ? 'qwerty' : noteLabelType} activeKeySignature={getActiveKeySignature(musicalCurrentTimeMs, signatureEvents, initialKeySignature)} activeBpmForDisplay={activeBpmForDisplay} qwertyLayout={qwertyLayout} qwertyCurrentOctaveShift={qwertyCurrentOctaveShift} mirpTranspose={mirpTranspose} isQwertyView={viewMode === 'sheet-qwerty'} />
                      ) : viewMode === 'sheet' && vexFlowData ? (
                        <VexFlowSheetMusicView notes={notesForGame} timeSignature={initialTimeSignature} keySignature={initialKeySignature} initialTempoBpm={currentTempoBpm || 120} width={baseCalculatedPianoWidth} height={contentAreaHeight} currentTimeMs={musicalCurrentTimeMs} totalDurationMs={originalTotalMusicalDurationMs} activePlaybackNotesInfo={activePlaybackNotesInfo} onSeek={handleSeek} isPlaying={isPlaying} sheetMusicZoom={sheetMusicZoom} barLines={barLines} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} signatureEvents={signatureEvents} onLayoutRendered={setRenderedLayoutId} tempoEvents={tempoEvents} playbackTempoMultiplier={playbackTempoMultiplier} backgroundColor={sheetMusicBackgroundColor} />
                      ) : <div className="w-full h-full flex items-center justify-center bg-slate-900"><p className="text-slate-400 animate-pulse">Loading music...</p></div>}
                    </div>
                    {!isFreePlayMode && notesForGame.length > 0 && <div className="w-full"><ProgressBar currentTimeMs={musicalCurrentTimeMs} totalDurationMs={absoluteEndTimeMs} width={baseCalculatedPianoWidth} height={PROGRESS_BAR_HEIGHT_PX} onSeek={handleProgressBarSeek} isPlaybackActive={isPlaying} isSeekingDisabled={waitMode === 'retical'} loopStartMs={isLooping ? loopStartMs : null} loopEndMs={isLooping ? loopEndMs : null} /></div>}
                    <div className="relative flex-shrink-0" style={{ width: '100%', height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px` }}>
                      <PianoKeyboard keyPositions={Array.from(keyPositionsMap.values())} userSustainedKeys={userSustainedKeys} userActiveKeys={userActiveKeys} activeMidiNotesInfo={activeMidiNotesInfoForKeyboard} onUiKeyPress={handleUiKeyPress} onUiKeyRelease={handleUiKeyRelease} rightHandColor={themeSettings.rightHandColor} leftHandColor={themeSettings.leftHandColor} showQwertyShortcuts={showQwertyShortcuts} qwertyCurrentOctaveShift={qwertyLayout === 'mirp' ? 0 : qwertyCurrentOctaveShift} width={baseCalculatedPianoWidth} layoutConfig={layoutConfig} qwertyLayout={qwertyLayout} mirpTranspose={mirpTranspose} isInteractive={viewMode !== 'sheet-qwerty'} lowDetailMode={true} />
                      {isSustainPedalActive && <div className="absolute bottom-2 right-2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded shadow-lg animate-pulse" style={{ zIndex: 30 }} aria-live="polite">SUSTAIN</div>}
                    </div>
                  </div>
                </>
                {isLoadingContent && <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30"><div className="flex items-center space-x-3 p-4 text-sky-300 font-semibold text-lg"><svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Loading Game...</span></div></div>}
            </div>
            <PerformanceSummaryModal isVisible={!!performanceSummary} summary={performanceSummary} onClose={() => { handleStopPlayback(); uploadSessionStats(); setPerformanceSummary(null); }} />
            <GameOverModal isVisible={!!isGameOver} reason={gameOverReason} onClose={handleCloseGameOverModal} />
          </div>
        )}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onGoToOnlineSong={s => { setSelectedOnlineSongIdForNavigation(s); setCurrentScreen('songSelection'); }} onOpenAdminModal={() => setIsAdminModalOpen(true)} />
        <AdminModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
