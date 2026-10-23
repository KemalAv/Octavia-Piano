import { backingPlayheadMs, noteInputOffsetMs, measuredOutputLatencyMs, backingCorrection, routeLocalBackingAudio } from './playbackSync';
import { parsePlaybackFile } from './songLoading';
import { getDifficultyNoteDurationMs, getMajorNoteVisualDurationMs, getMajorVisualDurationsByNoteId, getPianoPlaybackDurationMs } from './noteInteraction';
import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import {
  KeyPosition,
  PianoKeyDefinition,
  MidiNotePlaybackItem,
  ActiveMidiNoteInfo,
  MIDIInput,
  MIDIMessageEvent,
  MIDIAccess,
  MIDIOutput,
  TimeSignatureInfo,
  FileType,
  ExtendedResult,
  MidiAccessStatus,
  MetronomeMode,
  WaitMode,
  ViewMode,
  Screen,
  GameSettings,
  NoteLabelType,
  PracticeHand,
  ThemeSettings,
  PerformanceSummary,
  TempoEvent,
  DevicePreset,
  LayoutDimensions,
  QwertyLayout,
  BeatInfo,
  FreePlayLiveNote,
  BackingTrackConfig,
  MicThresholds,
  DrumPadConfig,
  AppLanguage,
} from "./types";
import {
  PIANO_KEYS_CONFIG,
  BLACK_KEY_WIDTH_RATIO,
  BLACK_KEY_OFFSET_RATIO,
  PROGRESS_BAR_HEIGHT_PX,
  HAND_SPLIT_MIDI_NOTE,
  BASE_PIXELS_PER_MILLISECOND,
  QWERTY_MINI_KEYBOARD_MAPPING,
  MIRP_KEYBOARD_MAPPING,
  FULL_KEYBOARD_MAPPING,
  OCTAVE_DOWN_KEYS,
  OCTAVE_UP_KEYS,
  INTERACTIVE_NOTE_DURATION_MS,
  DEFAULT_QWERTY_OCTAVE_SHIFT,
  MIN_QWERTY_OCTAVE_SHIFT,
  MAX_QWERTY_OCTAVE_SHIFT,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_METRONOME_VOLUME,
  DEFAULT_VIEW_MODE,
  DEFAULT_NOTE_LABEL_TYPE,
  DEFAULT_SHOW_ONLY_MAJOR_NOTES,
  DEFAULT_SHOW_QWERTY_SHORTCUTS,
  DEFAULT_THEME_SETTINGS,
  DEVICE_LAYOUTS,
  DEFAULT_SHOW_PIANO_TILES_BACKGROUND,
  DEFAULT_SHOW_PERFECT_JUDGMENT,
  VISUAL_NOTE_CAP_MS,
  FREE_PLAY_ARPEGGIO_WINDOW_MS,
  DEFAULT_MP3_VOLUME,
  DEFAULT_NOTE_TOLERANCE,
  DEFAULT_ZOOM_DIRECTION,
  DRUM_SOUND_MAP,
  DRUM_KEYBOARD_MAP,
  DRUM_PADS,
  DRUM_MIDI_TO_NAME_MAP,
  DRUM_PRIMARY_MIDI_MAP,
  ADMIN_UUID,
} from "./constants";

import PianoKeyboard from "./components/PianoKeyboard";
import TopBar from "./components/TopBar";
import ProgressBar from "./components/ProgressBar";
import MainMenu from "./components/MainMenu";
import SongSelection from "./components/SongSelection";
import ModeSelection from "./components/ModeSelection";
import { HandFingering3D } from './components/HandFingering3D';
import { Settings } from "./components/Settings";
import AuthModal from "./AuthModal";
import AccountModal from "./components/AccountModal";
import JSZip, { JSZipObject } from "jszip";
import { assignFingering } from "./fingering";
import type { FingeringPreferences, HandPose } from "./types";
import { analyzeMidi } from "./midiAnalysis";
import VexFlowSheetMusicView from "./components/VexFlowSheetMusicView";
import HorizontalNotesView from "./components/HorizontalNotesView";
import PerformanceSummaryModal from "./components/PerformanceSummaryModal";
import { FallingNotesArea } from "./components/FallingNotesArea";
import { DrumView } from "./components/DrumView"; // NEW
import { DrumManiaView } from "./components/DrumManiaView";
import { QwertyManiaView } from "./components/QwertyManiaView";
import { AcousticPianoService } from "./AcousticPianoService";
import OffsetIndicator from "./components/OffsetIndicator";
import { useWakeLock } from "./useWakeLock";
import {
  getActiveKeySignature,
  getActiveTimeSignature,
  SignatureEvent,
  getActiveTempoBpmAtOriginalTime,
  getBeatTimesInWindow,
  frequencyToMidi,
  midiToFrequency,
  preloadAudioUrl,
  calculateScoreMultiplier,
  getDynamicFromVelocity,
  getDynamicTextColor,
  findNoteStartIndex,
  getOptimalKeyTranspose,
} from "./utils";
import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "./supabaseClient";
import {
  parseMidiData,
  parseMusicXmlData,
  INITIAL_PLAYBACK_DELAY_MS,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_KEY_SIGNATURE,
  DEFAULT_MUSICXML_TEMPO_BPM,
} from "./midiParser";
import { getVexFlowRenderData } from "./vexflow-helper";
import Leaderboard from "./components/Leaderboard";
import ChordDisplay from "./components/ChordDisplay";
import { Midi } from "@tonejs/midi";
import GameOverModal from "./components/GameOverModal";
import LoopCountdownOverlay, {
  LoopDelayInfo,
  BeatCountdownInfo,
} from "./components/LoopCountdownOverlay";
import AdminModal from "./components/AdminModal";
import {
  AboutUs,
  ContactPage,
  PrivacyPolicy,
  Disclaimer,
  HowToConnect,
} from "./components/InfoPages";
import MidiEditor from "./components/MidiEditor"; // NEW
import { FineTunePanel } from "./components/FineTunePanel";
import { LEARN_LESSONS, THEORY_ITEMS, ROOT_OPTIONS, buildTheoryPracticeNotes } from "./learnModeData";
import LearnGuideModal from "./components/LearnGuideModal";
import LearnArticleView from "./components/LearnArticleView";
import { generateExercise, ExerciseType } from "./musicTheoryGenerator";


import { motion, AnimatePresence } from "motion/react";

const generateKeyPositions = (
  keysConfig: PianoKeyDefinition[],
  totalWidth: number,
): Map<string, KeyPosition> => {
  const positions = new Map<string, KeyPosition>();
  if (totalWidth <= 0) return positions;
  const midiToNameMap = new Map(keysConfig.map((k) => [k.midiNote, k.name]));
  const whiteKeysFromConfig = keysConfig.filter((key) => key.type === "white");
  const numWhiteKeys = whiteKeysFromConfig.length;
  if (numWhiteKeys === 0) return positions;
  const whiteKeyWidth = totalWidth / numWhiteKeys;
  const blackKeyWidth = whiteKeyWidth * BLACK_KEY_WIDTH_RATIO;
  let currentX = 0;
  whiteKeysFromConfig.forEach((key) => {
    positions.set(key.name, {
      name: key.name,
      x: currentX,
      width: whiteKeyWidth,
      type: "white",
    });
    currentX += whiteKeyWidth;
  });
  keysConfig.forEach((key) => {
    if (key.type === "black") {
      const precedingWhiteKeyMidi = key.midiNote - 1;
      const precedingWhiteKeyName = midiToNameMap.get(precedingWhiteKeyMidi);
      if (precedingWhiteKeyName) {
        const whiteKeyPos = positions.get(precedingWhiteKeyName);
        if (whiteKeyPos) {
          positions.set(key.name, {
            name: key.name,
            x: whiteKeyPos.x + whiteKeyWidth * BLACK_KEY_OFFSET_RATIO,
            width: blackKeyWidth,
            type: "black",
          });
        }
      }
    }
  });
  return positions;
};

import { BackgroundDisplay } from "./components/BackgroundDisplay";

interface MetronomeAudioNode {
  oscillator?: OscillatorNode;
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
}

interface ActiveAudioNode {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  keyName?: string;
  startTime?: number;
  isUiSound?: boolean;
}

const END_PLAYBACK_DELAY_MS = 200;
const UI_CLICK_SOUND_SEQUENCE_MIDI = [60, 62, 64, 65, 67, 69, 71];
const PITCH_CLASS_TO_NAME: { [key: number]: string } = {
  0: "C",
  1: "C#",
  2: "D",
  3: "D#",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "G#",
  9: "A",
  10: "A#",
  11: "B",
};

const CHORD_FORMULAS: { [key: string]: { name: string; intervals: number[] } } =
{
  "0,4,7": { name: "", intervals: [0, 4, 7] },
  "0,3,7": { name: "m", intervals: [0, 3, 7] },
  "0,3,6": { name: "dim", intervals: [0, 3, 6] },
  "0,4,8": { name: "aug", intervals: [0, 4, 8] },
  "0,5,7": { name: "sus4", intervals: [0, 5, 7] },
  "0,2,7": { name: "sus2", intervals: [0, 2, 7] },
  "0,4,7,9": { name: "6", intervals: [0, 4, 7, 9] },
  "0,3,7,9": { name: "m6", intervals: [0, 3, 7, 9] },
  "0,4,7,10": { name: "7", intervals: [0, 4, 7, 10] },
  "0,4,7,11": { name: "maj7", intervals: [0, 4, 7, 11] },
  "0,3,7,10": { name: "m7", intervals: [0, 3, 7, 10] },
  "0,3,6,10": { name: "m7b5", intervals: [0, 3, 6, 10] },
  "0,3,6,9": { name: "dim7", intervals: [0, 3, 6, 9] },
  "0,5,7,10": { name: "7sus4", intervals: [0, 5, 7, 10] },
  "0,2,4,7,10": { name: "9", intervals: [0, 2, 4, 7, 10] },
  "0,2,4,7,11": { name: "maj9", intervals: [0, 2, 4, 7, 11] },
  "0,2,3,7,10": { name: "m9", intervals: [0, 2, 3, 7, 10] },
  "0,2,4,7": { name: "add9", intervals: [0, 2, 4, 7] },
  "0,2,3,7": { name: "madd9", intervals: [0, 2, 3, 7] },
  "0,4,5,7,10": { name: "11", intervals: [0, 4, 5, 7, 10] },
  "0,4,7,9,10": { name: "13", intervals: [0, 4, 7, 9, 10] },
  "0,4,7,10,13": { name: "7b9", intervals: [0, 4, 7, 10, 1] },
  "0,4,7,10,15": { name: "7#9", intervals: [0, 4, 7, 10, 3] },
  "0,7": { name: "5", intervals: [0, 7] },
  "0,4": { name: "", intervals: [0, 4] },
  "0,3": { name: "m", intervals: [0, 3] },
};

const isCacheableMode = (
  settings: GameSettings | null,
  isMidiImport: boolean = false,
): boolean => {
  if (!settings) return false;
  if (settings.waitMode === "off" && !isMidiImport) return false;
  return true;
};

const isAuthHash = (hash: string): boolean => {
  if (!hash) return false;
  return (
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    hash.includes("error=") ||
    hash.includes("error_description=") ||
    hash.includes("type=recovery") ||
    hash.includes("type=invite") ||
    hash.includes("type=signup")
  );
};

const SCREEN_TO_HASH: Record<Screen, string> = {
  mainMenu: "",
  settings: "#/settings",
  leaderboard: "#/leaderboard",
  songSelection: "#/songs",
  modeSelection: "#/mode",
  midiEditor: "#/midi-editor",
  inGame: "#/play",
  finetune: "#/finetune",
  about: "#/about",
  contact: "#/contact",
  privacy: "#/privacy",
  disclaimer: "#/disclaimer",
  howToConnect: "#/how-to-connect",
  learnMode: "#/learn",
};

const HASH_TO_SCREEN: Record<string, Screen> = {
  "": "mainMenu",
  "#": "mainMenu",
  "#/": "mainMenu",
  "#/settings": "settings",
  "#/leaderboard": "leaderboard",
  "#/songs": "songSelection",
  "#/mode": "modeSelection",
  "#/midi-editor": "midiEditor",
  "#/play": "inGame",
  "#/finetune": "finetune",
  "#/about": "about",
  "#/contact": "contact",
  "#/privacy": "privacy",
  "#/disclaimer": "disclaimer",
  "#/how-to-connect": "howToConnect",
  "#/learn": "learnMode",
};

const parseHash = (hash: string): { screen: Screen; songId: string | null } => {
  if (isAuthHash(hash)) {
    return { screen: "mainMenu", songId: null };
  }
  const decodedHash = decodeURIComponent(hash);
  const parts = decodedHash.split("?");
  const path = parts[0] || "";
  const queryStr = parts[1] || "";

  // Extract UUID if present in the hash path
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  let songId: string | null = null;
  let pathWithoutUuid = path;

  if (match) {
    songId = match[0];
    // Remove the UUID and collapse multi-slashes
    pathWithoutUuid = path.replace(match[0], "").replace(/\/+/g, "/");
    if (pathWithoutUuid.endsWith("/") && pathWithoutUuid.length > 2) {
      pathWithoutUuid = pathWithoutUuid.slice(0, -1);
    }
  }

  let screen: Screen = "mainMenu";
  if (HASH_TO_SCREEN[pathWithoutUuid]) {
    screen = HASH_TO_SCREEN[pathWithoutUuid];
  } else {
    // Sort routes by descending length so that more specific subdomains match before general ones
    const sortedRoutes = Object.entries(HASH_TO_SCREEN).sort((a, b) => b[0].length - a[0].length);
    for (const [route, scr] of sortedRoutes) {
      if (route && route !== "#/" && route !== "#" && route !== "") {
        if (pathWithoutUuid === route || pathWithoutUuid.startsWith(route + "/")) {
          screen = scr;
          break;
        }
      }
    }
  }

  if (queryStr && !songId) {
    const params = new URLSearchParams(queryStr);
    songId = params.get("id") || params.get("songId") || params.get("song_id");
  }

  return { screen, songId };
};

const AppContent: React.FC = () => {
  const activeEndGameSfxRef = useRef<HTMLAudioElement | null>(null);

  const playSoundEffect = useCallback((src: string) => {
    try {
      if (activeEndGameSfxRef.current) {
        try {
          activeEndGameSfxRef.current.pause();
          activeEndGameSfxRef.current.currentTime = 0;
        } catch (e) { }
      }
      const sfx = new Audio(src);
      sfx.volume = 0.5;
      activeEndGameSfxRef.current = sfx;
      sfx.play().catch(err => console.log("Failed to play sound effect:", err));
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, []);

  const stopEndGameSfx = useCallback(() => {
    if (activeEndGameSfxRef.current) {
      try {
        activeEndGameSfxRef.current.pause();
        activeEndGameSfxRef.current.currentTime = 0;
      } catch (e) { }
      activeEndGameSfxRef.current = null;
    }
  }, []);

  const [currentScreen, setCurrentScreen] = useState<Screen>("mainMenu");
  const [instrumentMode, setInstrumentMode] = useState<"piano" | "drum">(
    "piano",
  );
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { session, user } = useAuth();

  useEffect(() => {
    if (session || user) {
      setIsAuthModalOpen(false);
    }
  }, [session, user]);

  const sessionPlaytimeMs = useRef<number>(0);
  const playtimeStartRef = useRef<number | null>(null);
  const sessionTotalPlaytimeMs = useRef<number>(0);
  const sessionTotalNotesHit = useRef<number>(0);
  const audioCtxStartTimeRef = useRef<number>(0); // New ref

  const [isFreePlayMode, setIsFreePlayMode] = useState(false);
  const isFreePlayModeRef = useRef(false);
  const [isLearnModeActive, setIsLearnModeActive] = useState(false);
  const isLearnModeActiveRef = useRef(false);
  const [learnSubMode, setLearnSubMode] = useState<'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory'>('falling');
  const [currentLearnLessonId, setCurrentLearnLessonId] = useState<string>('scale_c');
  const [theoryRoot, setTheoryRoot] = useState<number>(60);
  const [theoryType, setTheoryType] = useState<string>('major');
  const [theoryPlayingNotes, setTheoryPlayingNotes] = useState<number[]>([]);
  const [isLearnGuideOpen, setIsLearnGuideOpen] = useState<boolean>(false);
  const [isLearnToolbarCollapsed, setIsLearnToolbarCollapsed] = useState<boolean>(true);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const isCalibratingRef = useRef<boolean>(false);
  const calibrationAutoplayPendingRef = useRef(false);
  const handleExitSettingsPreviewRef = useRef<() => Promise<void>>(async () => { });
  const [showCalibrationTutorial, setShowCalibrationTutorial] = useState<boolean>(false);
  const previousViewModeRef = useRef<ViewMode>("falling");
  const fileRef = useRef<File | null>(null);
  const [freePlayBpm, setFreePlayBpm] = useState(120);
  const [freePlayTimeSignature, setFreePlayTimeSignature] =
    useState<TimeSignatureInfo>({ numerator: 4, denominator: 4 });
  const [freePlayMetronomeMode, setFreePlayMetronomeMode] =
    useState<MetronomeMode>("beat");

  const [detectedChord, setDetectedChord] = useState<string | null>(null);
  const chordDetectionTimeoutRef = useRef<number | null>(null);
  const [
    selectedOnlineSongIdForNavigation,
    setSelectedOnlineSongIdForNavigation,
  ] = useState<string | null>(null);

  // Synchronize URL hash with application screens & menu routing (subdomains)
  useEffect(() => {
    const handleHashChange = () => {
      // If the URL hash contains Supabase / OAuth tokens, do not parse it as an app route
      if (window.location.hash && isAuthHash(window.location.hash)) {
        return;
      }

      const { screen, songId } = parseHash(window.location.hash);

      setCurrentScreen((prev) => {
        if (prev !== screen) return screen;
        return prev;
      });

      setSelectedOnlineSongIdForNavigation((prev) => {
        if (prev !== songId) return songId;
        return prev;
      });
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    // If the hash has auth tokens or error callback from OAuth, do NOT overwrite it!
    if (window.location.hash && isAuthHash(window.location.hash)) {
      return;
    }

    const baseHash = isLearnModeActive ? "#/learn" : (SCREEN_TO_HASH[currentScreen] ?? "");
    let targetHash = baseHash;

    if (selectedOnlineSongIdForNavigation && (currentScreen === "songSelection" || currentScreen === "modeSelection" || currentScreen === "inGame")) {
      if (baseHash.endsWith("/")) {
        targetHash = `${baseHash}${selectedOnlineSongIdForNavigation}`;
      } else if (baseHash) {
        targetHash = `${baseHash}/${selectedOnlineSongIdForNavigation}`;
      }
    }

    if (!targetHash) {
      // For mainMenu or clean root: if there is an unwanted hash like '#/' or '#', clean it up
      if (window.location.hash && !isAuthHash(window.location.hash)) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } else {
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
  }, [currentScreen, selectedOnlineSongIdForNavigation, isLearnModeActive]);

  const [isRewinding, setIsRewinding] = useState(false);
  const isRewindingRef = useRef(false);

  const [isSustainPedalActive, setIsSustainPedalActive] = useState(false);
  const isSustainPedalActiveRef = useRef(false);
  const [isHiHatFootPressed, setIsHiHatFootPressed] = useState(false);
  const isHiHatFootPressedRef = useRef(false);
  const sustainedByPedalKeysRef = useRef<Map<string, number>>(new Map());

  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<MidiNotePlaybackItem[]>(
    [],
  );
  const recordingStartTimeRef = useRef<number | null>(null);
  const [showSaveButton, setShowSaveButton] = useState(false);

  const [freePlayLiveNotes, setFreePlayLiveNotes] = useState<
    FreePlayLiveNote[]
  >([]);
  const [gameLiveNotes, setGameLiveNotes] = useState<FreePlayLiveNote[]>([]);
  const [freePlayElapsedTime, setFreePlayElapsedTime] = useState(0);
  const freePlayStartTimeRef = useRef<number>(performance.now());
  const freePlayRequestRef = useRef<number | null>(null);
  const freePlayPrevElapsedRef = useRef(0);
  const freePlayNextBeatToScheduleRef = useRef({ time: 0, index: 0 });

  const [userSustainedKeys, setUserSustainedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [userActiveKeys, setUserActiveKeys] = useState<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(800);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const appRootRef = useRef<HTMLDivElement>(null);

  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('octavia_language');
      if (saved === 'id' || saved === 'es' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const handleLanguageChange = (lang: AppLanguage) => {
    setAppLanguage(lang);
    try {
      localStorage.setItem('octavia_language', lang);
    } catch {
      // ignore
    }
  };
  const [contentAreaHeight, setContentAreaHeight] = useState(300);
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);

  const [isTopBarVisible, setIsTopBarVisible] = useState(false);
  const [settingsScrollTarget, setSettingsScrollTarget] = useState<string | undefined>(undefined);
  const topBarTimeoutRef = useRef<number | null>(null);

  const [devicePreset, setDevicePreset] = useState<DevicePreset>("desktop");
  const [customWhiteKeyHeight, setCustomWhiteKeyHeight] = useState(140);
  const [customBlackKeyHeight, setCustomBlackKeyHeight] = useState(90);
  const [customKeyLabelHeight, setCustomKeyLabelHeight] = useState(25);
  const [customMinWhiteKeyWidth, setCustomMinWhiteKeyWidth] = useState(24.5);

  const [pianoRangeMode, setPianoRangeMode] = useState<
    "full" | "61-key" | "37-key" | "25-key" | "custom"
  >("full");
  const [customStartNote, setCustomStartNote] = useState("C3");
  const [customEndNote, setCustomEndNote] = useState("C5");

  const [uiZoom, setUiZoom] = useState<number>(100);
  const [uiZoomAuto, setUiZoomAuto] = useState<boolean>(true);
  const [isAudioInputEnabled, setIsAudioInputEnabled] = useState(false);
  const [selectedMidiInputId, setSelectedMidiInputId] = useState<string | null>(
    null,
  );
  const isAudioInputEnabledRef = useRef(false);
  const selectedMidiInputIdRef = useRef<string | null>(null);

  useEffect(() => {
    isAudioInputEnabledRef.current = isAudioInputEnabled;
  }, [isAudioInputEnabled]);

  useEffect(() => {
    selectedMidiInputIdRef.current = selectedMidiInputId;
  }, [selectedMidiInputId]);

  useEffect(() => {
    if (!uiZoomAuto) return;
    const updateZoom = () => {
      // Base resolution is 1920x1080
      const scaleX = window.innerWidth / 1920;
      // Only use scaleX for Auto Fit Screen as requested
      const scale = scaleX;
      // Clamp between 25% and 200%
      const newZoom = Math.max(25, Math.min(200, Math.round(scale * 150)));
      setUiZoom(newZoom);
    };

    updateZoom();

    // Staggered timeouts to ensure calculation is updated as layout stabilizes
    const t1 = setTimeout(updateZoom, 100);
    const t2 = setTimeout(updateZoom, 300);
    const t3 = setTimeout(updateZoom, 500);
    const t4 = setTimeout(updateZoom, 1000);
    const t5 = setTimeout(updateZoom, 2000);

    // ResizeObserver ensures updates when element size changes (e.g. iframe scaling)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateZoom();
      });
      resizeObserver.observe(document.documentElement);
    }

    window.addEventListener("resize", updateZoom);
    window.addEventListener("load", updateZoom);

    return () => {
      window.removeEventListener("resize", updateZoom);
      window.removeEventListener("load", updateZoom);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [uiZoomAuto]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const youtubePlayerRef = useRef<any>(null); // NEW: Track YouTube player instance
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const lastYoutubeRateRef = useRef(1);
  const isYoutubeApiLoadedRef = useRef(false);
  const isWaitStateRef = useRef(false);
  const [backingTrackError, setBackingTrackError] = useState<string | null>(
    null,
  );
  // Internal compensation for different backends
  const YOUTUBE_INTERNAL_OFFSET_MS = 200; // Aligned with MIDI editor's +200ms for online backing
  const MP3_INTERNAL_OFFSET_MS = 0; // Aligned with MIDI editor's 0ms offset
  const MIDI_EDITOR_INTERNAL_OFFSET_MS = 200;

  const desiredBackingRateRef = useRef(1);
  const backingMediaSourcesRef = useRef(new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>());
  const setBackingAudioElement = useCallback((element: HTMLAudioElement | null) => {
    const previous = audioRef.current;
    if (previous && previous !== element) backingMediaSourcesRef.current.get(previous)?.disconnect();
    audioRef.current = element;
  }, []);
  const connectBackingAudio = useCallback((audio: HTMLAudioElement) => routeLocalBackingAudio(audio, audioContextRef.current, backingMediaSourcesRef.current, window.location.origin), []);
  const backingOutputLatency = () => {
    // An existing manual calibration already includes the user's output path.
    if (userAudioSyncOffsetRef.current !== 0 || noteOffsetMsRef.current !== 0) return 0;
    return audioRef.current && backingMediaSourcesRef.current.has(audioRef.current) ? measuredOutputLatencyMs(audioContextRef.current) : 0;
  };
  const applyAudioPlaybackRate = useCallback((audio: HTMLAudioElement | null, rate: number) => {
    if (!audio) return;
    const clampedRate = Math.max(0.1, Math.min(4.0, rate));
    desiredBackingRateRef.current = clampedRate;
    try {
      audio.defaultPlaybackRate = clampedRate;
      audio.playbackRate = clampedRate;
      (audio as any).preservesPitch = true;
      (audio as any).mozPreservesPitch = true;
      (audio as any).webkitPreservesPitch = true;
    } catch (e) {
      console.warn("Failed to set audio playback rate", e);
    }
  }, []);

  const [isBackingTrackOverlayDismissed, setIsBackingTrackOverlayDismissed] = useState(false);
  const backingPlayAttemptTimeRef = useRef<number | null>(null);

  const isPreseekingYoutubeRef = useRef(false);
  const currentYoutubeVideoIdRef = useRef<string | null>(null);

  const getAudioStartTime = (baseTimeSec: number, _backingType?: string, offsetMs: number = 0) => {
    return Math.max(0, (baseTimeSec * 1000) - INITIAL_PLAYBACK_DELAY_MS + offsetMs + userAudioSyncOffsetRef.current) / 1000;
  };

  // Pre-seeks and primes the backing track to the exact offset position while paused
  // (Automatically performs the same instant pre-seek that scrolling the mouse wheel to the bottom does)
  const preseekBackingTrackToTime = useCallback((baseMusicalTimeMs: number) => {
    const backing = gameSettingsRef.current?.backingTrack;
    if (!backing || backing.type === "none") return;
    const clampedTime = getAudioStartTime(
      baseMusicalTimeMs / 1000,
      backing.type,
      backing.offsetMs || 0,
    );
    if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
      if (audioRef.current.readyState >= 1 && Math.abs(audioRef.current.currentTime - clampedTime) > 0.05) {
        try {
          audioRef.current.currentTime = clampedTime;
        } catch (e) {}
      }
    } else if (backing.type === "youtube" && youtubePlayerRef.current) {
      try {
        if (typeof youtubePlayerRef.current.seekTo === "function") {
          const curYtTime = typeof youtubePlayerRef.current.getCurrentTime === "function"
            ? youtubePlayerRef.current.getCurrentTime()
            : -1;
          const curState = typeof youtubePlayerRef.current.getPlayerState === "function"
            ? youtubePlayerRef.current.getPlayerState()
            : -1;
          if (Math.abs(curYtTime - clampedTime) > 0.15 || curState === -1 || curState === 5) {
            if (!isPlayingRef.current) {
              isPreseekingYoutubeRef.current = true;
              if (typeof youtubePlayerRef.current.mute === "function") {
                try { youtubePlayerRef.current.mute(); } catch (e) {}
              }
            }
            youtubePlayerRef.current.seekTo(clampedTime, true);
            if (!isPlayingRef.current && curState === 2 && typeof youtubePlayerRef.current.pauseVideo === "function") {
              youtubePlayerRef.current.pauseVideo();
            }
          }
        }
      } catch (e) {}
    }
  }, []);

  const triggerBackingTrackPlay = useCallback((clMs: number) => {
    const backing = gameSettingsRef.current?.backingTrack;
    if (!backing || backing.type === "none") {
      setBackingTrackStatus("playing");
      setBackingTrackError(null);
      backingPlayAttemptTimeRef.current = null;
      hasAudioStartedThisStretchRef.current = true;
      return;
    }

    if (audioStartTimeoutRef.current) {
      clearTimeout(audioStartTimeoutRef.current);
      audioStartTimeoutRef.current = null;
    }

    hasAudioStartedThisStretchRef.current = true;

    const defaultOffsetMs = backing.offsetMs || 0;
    const userOffsetMs = userAudioSyncOffsetRef.current;
    const totalOffsetMs = defaultOffsetMs + userOffsetMs;
    const midiStartMs = clMs - INITIAL_PLAYBACK_DELAY_MS;
    const currentMultiplier = Math.max(0.1, playbackTempoMultiplierRef.current);

    let audioStartTime = 0;
    let startDelayMs = 0;

    if (totalOffsetMs < 0) {
      const absDelayMs = Math.abs(totalOffsetMs);
      if (midiStartMs < absDelayMs) {
        audioStartTime = 0;
        startDelayMs = absDelayMs - midiStartMs;
      } else {
        audioStartTime = (midiStartMs - absDelayMs) / 1000;
        startDelayMs = 0;
      }
    } else {
      const targetAudioMs = midiStartMs + totalOffsetMs;
      if (targetAudioMs < 0) {
        audioStartTime = 0;
        startDelayMs = Math.abs(targetAudioMs);
      } else {
        audioStartTime = targetAudioMs / 1000;
        startDelayMs = 0;
      }
    }

    const effectiveDelayWallMs = startDelayMs / currentMultiplier;
    const isOnlineBacking = backing.type === "youtube" || backing.type === "link";

    if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
      const audio = audioRef.current;
      connectBackingAudio(audio);
      audio.volume = mp3VolumeRef.current;
      applyAudioPlaybackRate(audio, currentMultiplier);

      if (backing.type === "mp3") {
        // Uploaded local MP3: never show failed-to-load or loading overlay
        setBackingTrackError(null);
        backingPlayAttemptTimeRef.current = null;
        if (startDelayMs === 0) {
          if (audio.readyState >= 1) {
            if (Math.abs(audio.currentTime - audioStartTime) > 0.15) {
              audio.currentTime = audioStartTime;
            }
          } else {
            const onMetadata = () => {
              audio.currentTime = audioStartTime;
              audio.removeEventListener("loadedmetadata", onMetadata);
            };
            audio.addEventListener("loadedmetadata", onMetadata);
          }
          void safePlayAudio(true);
          setBackingTrackStatus("playing");
        } else {
          void safePauseAudio();
          if (audio.readyState >= 1) {
            audio.currentTime = 0;
          }
          setBackingTrackStatus("playing");
          audioStartTimeoutRef.current = setTimeout(() => {
            if (isPlayingRef.current && !isWaitStateRef.current && audioRef.current) {
              audioRef.current.currentTime = 0;
              applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplierRef.current);
              void safePlayAudio(true);
              setBackingTrackStatus("playing");
            }
          }, effectiveDelayWallMs);
        }
      } else {
        // Online link MP3 ('link')
        if (audio.error) {
          setBackingTrackStatus("error");
          setBackingTrackError("Failed to load YouTube / online MP3 audio.");
          return;
        }
        backingPlayAttemptTimeRef.current = performance.now() + effectiveDelayWallMs;
        if (backingTrackStatusRef.current !== "error") {
          setBackingTrackStatus("loading");
        }
        if (startDelayMs === 0) {
          if (audio.readyState >= 1) {
            if (Math.abs(audio.currentTime - audioStartTime) > 0.15) {
              audio.currentTime = audioStartTime;
            }
          } else {
            const onMetadata = () => {
              audio.currentTime = audioStartTime;
              audio.removeEventListener("loadedmetadata", onMetadata);
            };
            audio.addEventListener("loadedmetadata", onMetadata);
          }
          void safePlayAudio(true);
        } else {
          void safePauseAudio();
          if (audio.readyState >= 1) {
            audio.currentTime = 0;
          }
          audioStartTimeoutRef.current = setTimeout(() => {
            if (isPlayingRef.current && !isWaitStateRef.current && audioRef.current) {
              audioRef.current.currentTime = 0;
              applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplierRef.current);
              backingPlayAttemptTimeRef.current = performance.now();
              void safePlayAudio(true);
            }
          }, effectiveDelayWallMs);
        }
      }
    } else if (backing.type === "youtube") {
      if (!backing.url || !getYoutubeId(backing.url)) {
        setBackingTrackStatus("error");
        setBackingTrackError("Failed to load YouTube audio (Invalid YouTube link).");
        setIsBackingTrackOverlayDismissed(false);
        return;
      }
      backingPlayAttemptTimeRef.current = performance.now() + effectiveDelayWallMs;
      if (backingTrackStatusRef.current !== "error") {
        setBackingTrackStatus("loading");
      }
      if (!youtubePlayerRef.current || typeof youtubePlayerRef.current.playVideo !== "function") {
        return;
      }
      isPreseekingYoutubeRef.current = false;
      try {
        if (typeof youtubePlayerRef.current.unMute === "function") {
          youtubePlayerRef.current.unMute();
        }
        if (typeof youtubePlayerRef.current.setVolume === "function") {
          youtubePlayerRef.current.setVolume(mp3VolumeRef.current * 100);
        }
        if (typeof youtubePlayerRef.current.setPlaybackRate === "function") {
          youtubePlayerRef.current.setPlaybackRate(currentMultiplier);
        }
      } catch (e) {}

      if (startDelayMs === 0) {
        if (typeof youtubePlayerRef.current.seekTo === "function") {
          try {
            const curYtTime = typeof youtubePlayerRef.current.getCurrentTime === "function"
              ? youtubePlayerRef.current.getCurrentTime()
              : -1;
            const curState = typeof youtubePlayerRef.current.getPlayerState === "function"
              ? youtubePlayerRef.current.getPlayerState()
              : -1;
            // Only seek if not already pre-seeked to audioStartTime while paused
            if (Math.abs(curYtTime - audioStartTime) > 0.25 || (curState !== 2 && curState !== 1)) {
              youtubePlayerRef.current.seekTo(audioStartTime, true);
            }
          } catch (e) {
            console.warn("YouTube seek failed", e);
          }
        }
        void safePlayYoutube(true);
      } else {
        void safePauseYoutube();
        try {
          if (typeof youtubePlayerRef.current.seekTo === "function") {
            youtubePlayerRef.current.seekTo(0, true);
          }
        } catch (e) {}
        audioStartTimeoutRef.current = setTimeout(() => {
          if (isPlayingRef.current && !isWaitStateRef.current && youtubePlayerRef.current) {
            if (typeof youtubePlayerRef.current.seekTo === "function") {
              try {
                youtubePlayerRef.current.seekTo(0, true);
              } catch (e) {
                console.warn("YouTube seek failed", e);
              }
            }
            if (typeof youtubePlayerRef.current.setPlaybackRate === "function") {
              try {
                youtubePlayerRef.current.setPlaybackRate(playbackTempoMultiplierRef.current);
              } catch (e) {}
            }
            backingPlayAttemptTimeRef.current = performance.now();
            void safePlayYoutube(true);
          }
        }, effectiveDelayWallMs);
      }
    } else if (isOnlineBacking) {
      backingPlayAttemptTimeRef.current = performance.now() + effectiveDelayWallMs;
      if (backingTrackStatusRef.current !== "error") {
        setBackingTrackStatus("loading");
      }
    }
  }, [applyAudioPlaybackRate, connectBackingAudio]);

  const [backingTrackStatus, setBackingTrackStatus] = useState<"idle" | "loading" | "playing" | "stalled" | "error">("idle");
  const backingTrackStatusRef = useRef(backingTrackStatus);
  useEffect(() => { backingTrackStatusRef.current = backingTrackStatus; }, [backingTrackStatus]);
  const audioStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null); // NEW: Track audio play promise
  const hasAudioStartedThisStretchRef = useRef(false);
  const lastAudioSyncTimeRef = useRef<number>(0);
  const [mp3Volume, setMp3Volume] = useState(DEFAULT_MP3_VOLUME);
  const mp3VolumeRef = useRef(mp3Volume);
  useEffect(() => { mp3VolumeRef.current = mp3Volume; }, [mp3Volume]);
  const [backingTrackFile, setBackingTrackFile] = useState<File | null>(null);
  const [backingTrackOffset, setBackingTrackOffset] = useState(0);

  // Reset piano volume when MIDI or Mic is disabled
  useEffect(() => {
    if (!isAudioInputEnabledRef.current && !selectedMidiInputIdRef.current) {
      setMasterVolume(DEFAULT_MASTER_VOLUME);
      setMp3Volume(DEFAULT_MP3_VOLUME);
    }
  }, [isAudioInputEnabled, selectedMidiInputId]);

  // Cleanup YouTube player when leaving both modeSelection and inGame
  useEffect(() => {
    if (currentScreen !== "inGame" && currentScreen !== "modeSelection" && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        console.warn("Failed to destroy YouTube player", e);
      }
      youtubePlayerRef.current = null;
      currentYoutubeVideoIdRef.current = null;
    }
  }, [currentScreen]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<
    string | null
  >(null);
  const [audioInputError, setAudioInputError] = useState<string | null>(null);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const acousticPianoServiceRef = useRef<AcousticPianoService | null>(null);
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
    treble: -75,
    highTreble: -75,
  });
  const micThresholdsRef = useRef(micThresholds);
  useEffect(() => {
    micThresholdsRef.current = micThresholds;
  }, [micThresholds]);

  // NEW: State for MIDI Editor
  const [editorMidiFile, setEditorMidiFile] = useState<File | null>(null);

  const visiblePianoKeys = useMemo(() => {
    const getMidi = (n: string) =>
      PIANO_KEYS_CONFIG.find(
        (k) => k.name.toLowerCase() === n.toLowerCase().trim(),
      )?.midiNote;
    let start: number, end: number;
    switch (pianoRangeMode) {
      case "full":
        return PIANO_KEYS_CONFIG;
      case "61-key":
        start = getMidi("C2") ?? 36;
        end = getMidi("C7") ?? 96;
        break;
      case "37-key":
        start = getMidi("C3") ?? 48;
        end = getMidi("C6") ?? 84;
        break;
      case "25-key":
        start = getMidi("C3") ?? 48;
        end = getMidi("C5") ?? 72;
        break;
      case "custom":
        start = getMidi(customStartNote) ?? 48;
        end = getMidi(customEndNote) ?? 72;
        break;
      default:
        return PIANO_KEYS_CONFIG;
    }
    if (start > end) [start, end] = [end, start];
    return PIANO_KEYS_CONFIG.filter(
      (key) => key.midiNote >= start && key.midiNote <= end,
    );
  }, [pianoRangeMode, customStartNote, customEndNote]);

  const layoutConfig: LayoutDimensions = useMemo(() => {
    const totalKeys = visiblePianoKeys.length;
    if (devicePreset === "custom") {
      return {
        whiteKeyHeight: customWhiteKeyHeight,
        blackKeyHeight: customBlackKeyHeight,
        keyLabelHeight: customKeyLabelHeight,
        minWhiteKeyWidth: customMinWhiteKeyWidth,
      };
    }
    return DEVICE_LAYOUTS(totalKeys)[devicePreset];
  }, [
    devicePreset,
    visiblePianoKeys.length,
    customWhiteKeyHeight,
    customBlackKeyHeight,
    customKeyLabelHeight,
    customMinWhiteKeyWidth,
  ]);

  const [playbackNotes, setPlaybackNotes] = useState<MidiNotePlaybackItem[]>(
    [],
  );
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [fingeringLoadingMessage, setFingeringLoadingMessage] = useState('');
  const [fingeringWarnings, setFingeringWarnings] = useState<string[]>([]);
  const [fingeringError, setFingeringError] = useState('');
  const [handPoses, setHandPoses] = useState<HandPose[]>([]);
  const [showHand3D, setShowHand3D] = useState(true);
  const [fingeringPreferences, setFingeringPreferences] = useState<FingeringPreferences>({ handSize: 'M', routing: 'auto', splitMidi: 60 });
  const fingeringLoadController = useRef<AbortController | null>(null);
  const audioPreloadJobRef = useRef(0);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [currentFileType, setCurrentFileType] = useState<FileType>(
    FileType.UNKNOWN,
  );
  const fileTypeRef = useRef<FileType>(FileType.UNKNOWN);
  useEffect(() => {
    fileTypeRef.current = currentFileType;
  }, [currentFileType]);

  const [initialTimeSignature, setInitialTimeSignature] =
    useState<TimeSignatureInfo>(DEFAULT_TIME_SIGNATURE);
  const [initialKeySignature, setInitialKeySignature] = useState<string>(
    DEFAULT_KEY_SIGNATURE,
  );
  const [currentTempoBpm, setCurrentTempoBpm] = useState<number | null>(null);
  const [tempoEvents, setTempoEvents] = useState<TempoEvent[]>([]);
  const [barLines, setBarLines] = useState<number[]>([]);
  const [signatureEvents, setSignatureEvents] = useState<SignatureEvent[]>([]);

  const [metronomeMode, setMetronomeMode] = useState<MetronomeMode>("beat");
  const previousMetronomeModeRef = useRef<MetronomeMode | null>(null);
  const [playbackTempoMultiplier, setPlaybackTempoMultiplier] =
    useState<number>(1);
  const playbackTempoMultiplierRef = useRef(playbackTempoMultiplier);

  const [previewPlaybackTempoMultiplier, setPlaybackTempoMultiplierForPreview] =
    useState<number>(1);
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0);
  const musicalCurrentTimeMsRef = useRef<number>(0);
  useEffect(() => {
    musicalCurrentTimeMsRef.current = musicalCurrentTimeMs;
  }, [musicalCurrentTimeMs]);

  const [isLooping, setIsLooping] = useState(false);
  const [loopStartMs, setLoopStartMs] = useState<number | null>(null);
  const [loopEndMs, setLoopEndMs] = useState<number | null>(null);
  const isLoopingRef = useRef(isLooping);
  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);
  const loopStartMsRef = useRef(loopStartMs);
  useEffect(() => {
    loopStartMsRef.current = loopStartMs;
  }, [loopStartMs]);
  const loopEndMsRef = useRef(loopEndMs);
  useEffect(() => {
    loopEndMsRef.current = loopEndMs;
  }, [loopEndMs]);

  const isSettingsPreviewActiveRef = useRef(false);
  const settingsPreviewRunRef = useRef(0);
  const settingsScreenRef = useRef(currentScreen);
  settingsScreenRef.current = currentScreen;
  const originalMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME);
  const prevMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME); // New ref to store volume before mic/midi mute
  const lastSeekTimeRef = useRef<number>(0);
  const loopDelayStartTimeRef = useRef<number | null>(null);
  const [loopDelayInfo, setLoopDelayInfo] = useState<LoopDelayInfo | null>(null);
  const loopDelayInfoRef = useRef<LoopDelayInfo | null>(null);
  const [beatCountdownInfo, setBeatCountdownInfo] = useState<BeatCountdownInfo | null>(null);
  const beatCountdownInfoRef = useRef<BeatCountdownInfo | null>(null);
  const startLoopWithPreRollRef = useRef<(() => void) | null>(null);
  const setLoopDelayInfoWithRef = useCallback((info: LoopDelayInfo | null) => {
    loopDelayInfoRef.current = info;
    setLoopDelayInfo(info);
  }, []);
  const handleSeekRef = useRef<((t: number, skipPause?: boolean) => Promise<void>) | null>(null);

  // State to hold extra online song metadata
  const [currentMidiLink, setCurrentMidiLink] = useState<string | null>(null);
  const [currentMidiOffset, setCurrentMidiOffset] = useState<number | null>(
    null,
  );
  const [currentSongBackgroundUrl, setCurrentSongBackgroundUrl] = useState<
    string | null
  >(null);
  const [currentSongAccuracyLevel, setCurrentSongAccuracyLevel] = useState<
    number | null
  >(null);

  const notesForGame = useMemo(() => {
    if (isFreePlayMode) return [];
    if (!gameSettings?.practiceHand || !playbackNotes) return playbackNotes;
    let filtered = playbackNotes;
    if (gameSettings.practiceHand !== "both") {
      filtered = filtered.filter(
        (note) => note.hand === gameSettings.practiceHand,
      );
    }
    if (isLooping) {
      if (loopStartMs !== null) {
        filtered = filtered.filter((note) => note.timeMs >= loopStartMs);
      }
      if (loopEndMs !== null && (loopStartMs === null || loopEndMs > loopStartMs)) {
        filtered = filtered.filter((note) => note.timeMs < loopEndMs);
      }
    }
    return filtered;
  }, [playbackNotes, gameSettings?.practiceHand, isFreePlayMode, isLooping, loopStartMs, loopEndMs]);

  const notesForGameRef = useRef<MidiNotePlaybackItem[]>(notesForGame);
  useEffect(() => {
    notesForGameRef.current = notesForGame;
  }, [notesForGame]);
  const playbackNotesRef = useRef<MidiNotePlaybackItem[]>(playbackNotes);
  useEffect(() => {
    playbackNotesRef.current = playbackNotes;
  }, [playbackNotes]);
  const playbackLoopRef = useRef<() => void>(() => {});

  const originalTotalMusicalDurationMs = useMemo(() => {
    const notesToMeasure = playbackNotes && playbackNotes.length > 0 ? playbackNotes : notesForGame;
    if (!notesToMeasure || notesToMeasure.length === 0) return 0;
    const endTime = notesToMeasure.reduce(
      (max, note) => Math.max(max, note.timeMs + note.durationMs),
      0,
    );
    return endTime;
  }, [playbackNotes, notesForGame]);

  const activeBpmForDisplay = useMemo(() => {
    if (isFreePlayMode) return freePlayBpm;
    if (currentTempoBpm === null)
      return DEFAULT_MUSICXML_TEMPO_BPM * playbackTempoMultiplier;
    const originalBpm = getActiveTempoBpmAtOriginalTime(
      musicalCurrentTimeMs,
      tempoEvents,
      currentTempoBpm,
    );
    return originalBpm * playbackTempoMultiplier;
  }, [
    isFreePlayMode,
    freePlayBpm,
    currentTempoBpm,
    musicalCurrentTimeMs,
    tempoEvents,
    playbackTempoMultiplier,
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const metronomeGainRef = useRef<GainNode | null>(null);
  const activeKeyTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeAudioNodesRef = useRef<Map<string, ActiveAudioNode>>(new Map());
  const pedalHeldPlaybackNodesRef = useRef<Set<ActiveAudioNode>>(new Set());
  const activeVoicesListRef = useRef<ActiveAudioNode[]>([]);
  const MAX_ACTIVE_AUDIO_VOICES = 32;
  const lastAvgOffsetUpdateRef = useRef<number>(0);

  const safelyStopAndDisconnectVoice = useCallback(
    (node: ActiveAudioNode, fadeTimeSec: number = 0.02) => {
      try {
        const ctx = audioContextRef.current;
        if (ctx && ctx.state !== "closed") {
          const now = ctx.currentTime;
          node.gainNode.gain.cancelScheduledValues(now);
          node.gainNode.gain.setValueAtTime(Math.max(0.0001, node.gainNode.gain.value), now);
          node.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTimeSec);
          node.source.stop(now + fadeTimeSec + 0.01);
        } else {
          node.source.stop();
        }
      } catch (e) { }
      setTimeout(() => {
        try {
          node.source.disconnect();
          node.gainNode.disconnect();
        } catch (e) { }
      }, Math.max(30, Math.round((fadeTimeSec + 0.05) * 1000)));
    },
    [],
  );

  const enforceAudioPolyphony = useCallback(
    (maxVoices: number = MAX_ACTIVE_AUDIO_VOICES) => {
      while (activeVoicesListRef.current.length >= maxVoices) {
        const oldest = activeVoicesListRef.current.shift();
        if (oldest) {
          if (oldest.keyName && activeAudioNodesRef.current.get(oldest.keyName) === oldest) {
            activeAudioNodesRef.current.delete(oldest.keyName);
          }
          safelyStopAndDisconnectVoice(oldest, 0.015);
        }
      }
    },
    [safelyStopAndDisconnectVoice],
  );

  const audioBufferCacheRef = useRef<Map<string | number, AudioBuffer>>(
    new Map(),
  );
  const lastUiClickTimeRef = useRef<number>(0);
  const uiClickComboIndexRef = useRef<number>(0);
  const metronomeBuffersRef = useRef<{
    strong?: AudioBuffer;
    weak?: AudioBuffer;
  }>({});

  const [allBeatTimes, setAllBeatTimes] = useState<BeatInfo[]>([]);
  const nextBeatToScheduleIndexRef = useRef<number>(0);
  const prevConceptualTimeRef = useRef<number>(0);

  const [lastHitOffset, setLastHitOffset] = useState<number>(0);
  const [userAverageOffset, setUserAverageOffset] = useState<number>(0);
  const totalSessionOffsetSumRef = useRef<number>(0);
  const totalSessionHitCountForOffsetRef = useRef<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  // Sync falling notes color with view mode automatically
  useEffect(() => {
    const isSheetMode = viewMode === "sheet" || viewMode === "sheet-roll" || viewMode === "sheet-qwerty";
    const targetColor = isSheetMode ? "#F0F6FF" : "#1C2636";

    setThemeSettings(prev => {
      if (prev.fallingNotesBackgroundColor === targetColor) return prev;
      return {
        ...prev,
        fallingNotesBackgroundColor: targetColor
      };
    });
  }, [viewMode]);

  const [lastPianoViewMode, setLastPianoViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE);
  const [lastDrumViewMode, setLastDrumViewMode] = useState<ViewMode>("drum_mania");
  const [gameplayStyle, setGameplayStyle] = useState<"piano" | "computer">("piano");

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (newMode === "sheet-qwerty" || newMode === "qwerty_mania") {
      setGameplayStyle("computer");
    }
    if (instrumentMode === "piano") {
      setLastPianoViewMode(newMode);
    } else {
      setLastDrumViewMode(newMode);
    }
    setIsLoadingContent(currentScreen !== "settings");
    setRenderedLayoutId(0);
    setActivePlaybackNotesInfo(new Map());
  };
  const handleInstrumentModeChange = (newMode: "piano" | "drum") => {
    setInstrumentMode(newMode);
    setActivePlaybackNotesInfo(new Map());
    setRenderedLayoutId(0);

    // Switch to the last used view mode for the new instrument mode
    if (newMode === "piano") {
      const validPianoView = lastPianoViewMode === "drum_mania" ? "falling" : lastPianoViewMode;
      setViewMode(validPianoView);
      setLastPianoViewMode(validPianoView);
    } else {
      // When switching to drum, reset computer keyboard piano settings to normal drum mode
      setGameplayStyle("piano");
      const validDrumView =
        lastDrumViewMode === "drum_mania" ||
        lastDrumViewMode === "falling" ||
        lastDrumViewMode === "sheet" ||
        lastDrumViewMode === "sheet-roll"
          ? lastDrumViewMode
          : "drum_mania";
      setViewMode(validDrumView);
      setLastDrumViewMode(validDrumView);
    }
  };

  const [drumInputMode, setDrumInputMode] = useState<"midi" | "non-midi">(
    "non-midi",
  );
  const [noteSpeedMultiplier, setNoteSpeedMultiplier] = useState<number>(1);

  const freePlayBarLines = useMemo(() => {
    if (!isFreePlayMode) return [];
    const barDurationMs =
      (60000 / freePlayBpm) * freePlayTimeSignature.numerator;
    if (barDurationMs <= 0) return [];

    const viewableDurationMs =
      contentAreaHeight / (BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier) ||
      5000;
    const visibleCount = Math.ceil(viewableDurationMs / barDurationMs) + 5;

    const lines = [];
    const currentBarIndex = Math.floor(freePlayElapsedTime / barDurationMs);

    const startBar = currentBarIndex - 5;
    const endBar = currentBarIndex + visibleCount;

    for (let i = startBar; i < endBar; i++) {
      lines.push(i * barDurationMs);
    }
    return lines;
  }, [
    isFreePlayMode,
    freePlayBpm,
    freePlayTimeSignature,
    freePlayElapsedTime,
    contentAreaHeight,
    noteSpeedMultiplier,
  ]);

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
      barLinesMs: barLines,
    };
    if (metronomeMode === "beat") {
      const scaledBarLines = res.barLinesMs.map(
        (t) => t / playbackTempoMultiplier,
      );
      const estimatedScaledEndTime =
        res.originalTotalMusicalDurationMs / playbackTempoMultiplier + 5000;
      allBeats = getBeatTimesInWindow(
        0,
        estimatedScaledEndTime,
        playbackTempoMultiplier,
        res.initialTempoBpm,
        res.tempoEvents,
        res.timeSignature,
        res.signatureEvents,
        scaledBarLines,
      );
    } else if (metronomeMode === "bar") {
      allBeats = res.barLinesMs.map((t) => ({
        timeMs: t / playbackTempoMultiplier,
        isStrong: true,
      }));
    }
    setAllBeatTimes(allBeats);
    const currentRealTimeMs = currentTimeRef.current / playbackTempoMultiplier;
    const startIndex = allBeats.findIndex(
      (b) => b.timeMs >= currentRealTimeMs,
    );
    nextBeatToScheduleIndexRef.current =
      startIndex !== -1 ? startIndex : allBeats.length;
    prevConceptualTimeRef.current = currentTimeRef.current;

    return () => {
      // Cleanup: cancel scheduled metronome sounds when tempo/multiplier changes
      if (
        audioContextRef.current &&
        scheduledMetronomeAudioNodesRef.current.length > 0
      ) {
        scheduledMetronomeAudioNodesRef.current.forEach((nodes) => {
          try {
            nodes.source.stop();
            nodes.source.disconnect();
            nodes.gainNode.disconnect();
          } catch (e) {
            /* ignore already stopped */
          }
        });
        scheduledMetronomeAudioNodesRef.current = [];
      }
    };
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
    isFreePlayMode,
  ]);

  useEffect(() => {
    if (currentScreen === "settings") {
      setMetronomeMode("off");
    }
  }, [currentScreen]);

  const [currentOnlineSongId, setCurrentOnlineSongId] = useState<string | null>(
    null,
  );
  const [isCurrentSongRanked, setIsCurrentSongRanked] = useState<
    boolean | null
  >(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const [activePlaybackNotesInfo, setActivePlaybackNotesInfo] = useState<
    Map<string, ActiveMidiNoteInfo>
  >(new Map());
  const currentTimeRef = useRef<number>(0);
  const playbackRequestRef = useRef<number | null>(null);
  const performanceStartTimeRef = useRef<number>(0);
  const pausedMusicalTimeRef = useRef<number>(0);
  const nextNoteIndexRef = useRef<number>(0);
  const missedNoteIndexRef = useRef<number>(0);
  const nextAutoplayAudioScheduleIndexRef = useRef<number>(0);
  const scheduledAutoplayNoteIdsRef = useRef<Set<string>>(new Set());
  const scheduledNoteTimeoutsRef = useRef<Map<string, number>>(new Map());
  const activeNoteInstancesRef = useRef<Map<string, MidiNotePlaybackItem>>(
    new Map(),
  );
  const gameRealStartTimeRef = useRef<number | null>(null);
  const isUserPausedRef = useRef<boolean>(false);
  const prevMusicalTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPlayingRef.current) {
      const currentRealTime = performance.now();
      const realTimeElapsed = currentRealTime - performanceStartTimeRef.current;
      // Use the OLD multiplier (which is still in ref) to calculate current musical time
      const currentMusicalTime =
        isWaitStateRef.current ? currentTimeRef.current : pausedMusicalTimeRef.current +
          realTimeElapsed * playbackTempoMultiplierRef.current;

      // Re-anchor time
      pausedMusicalTimeRef.current = currentMusicalTime;
      performanceStartTimeRef.current = currentRealTime;
    }
    // Update ref to new multiplier
    playbackTempoMultiplierRef.current = playbackTempoMultiplier;

    // Reposition with the new rate: physical offsets keep their real duration.
    if (audioRef.current) {
      if (audioRef.current.readyState >= 1) audioRef.current.currentTime = getAudioStartTime(pausedMusicalTimeRef.current / 1000, gameSettingsRef.current?.backingTrack?.type, gameSettingsRef.current?.backingTrack?.offsetMs || 0);
      lastAudioSyncTimeRef.current = performance.now();
      applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplier);
    }
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.setPlaybackRate === "function"
    ) {
      try {
        youtubePlayerRef.current.setPlaybackRate(playbackTempoMultiplier);
      } catch (e) {
        /* ignore */
      }
    }
  }, [playbackTempoMultiplier, applyAudioPlaybackRate]);

  const [notesCurrentlyWaitingFor, setNotesCurrentlyWaitingFor] = useState<
    Set<number>
  >(() => new Set());
  const notesCurrentlyWaitingForRef = useRef<Set<number>>(new Set());
  const notesCurrentlyWaitingForIdsRef = useRef<Set<string>>(new Set());
  const nextBarIndexRef = useRef<number>(0);
  const hitsAtLastCheckRef = useRef<number>(0);
  const totalNotesAtLastCheckRef = useRef<number>(0);
  const lastBarCheckedRef = useRef<number>(0);

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
  const lastPushedTotalWaitTimeMsRef = useRef<number>(0);
  const waitStartTimeRef = useRef<number | null>(null);
  const accumulatedPauseTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const accumulatedSeekTimeRef = useRef<number>(0);

  const scheduledMetronomeAudioNodesRef = useRef<MetronomeAudioNode[]>([]);
  const [metronomeBeat, setMetronomeBeat] = useState<"strong" | "weak" | null>(
    null,
  );
  const lastMetronomeVisualBeatRef = useRef<"strong" | "weak" | null>(null);
  const [noteOffsetMs, setNoteOffsetMs] = useState<number>(() => {
    const saved = localStorage.getItem("game_note_offset_ms");
    const val = saved ? parseInt(saved, 10) : 0;
    return isNaN(val) ? 0 : val;
  });
  const noteOffsetMsRef = useRef<number>(noteOffsetMs);
  useEffect(() => {
    noteOffsetMsRef.current = noteOffsetMs;
    localStorage.setItem("game_note_offset_ms", noteOffsetMs.toString());
  }, [noteOffsetMs]);

  const [userAudioSyncOffset, setUserAudioSyncOffset] = useState<number>(() => {
    const saved = localStorage.getItem("game_user_audio_sync_ms");
    const val = saved ? parseInt(saved, 10) : 0;
    return isNaN(val) ? 0 : val;
  });
  const userAudioSyncOffsetRef = useRef<number>(userAudioSyncOffset);
  useEffect(() => {
    userAudioSyncOffsetRef.current = userAudioSyncOffset;
    if (isPlayingRef.current && !isWaitStateRef.current) {
      const rate = playbackTempoMultiplierRef.current;
      const time = pausedMusicalTimeRef.current + (performance.now() - performanceStartTimeRef.current) * rate;
      triggerBackingTrackPlay(time);
    } else {
      preseekBackingTrackToTime(currentTimeRef.current);
      lastAudioSyncTimeRef.current = performance.now();
    }
    localStorage.setItem("game_user_audio_sync_ms", userAudioSyncOffset.toString());
  }, [userAudioSyncOffset, triggerBackingTrackPlay]);

  const [metronomePianoOffsetMs, setMetronomePianoOffsetMs] = useState<number>(() => {
    const saved = localStorage.getItem("game_metronome_piano_offset_ms");
    const val = saved ? parseInt(saved, 10) : 0;
    return isNaN(val) ? 0 : val;
  });
  const metronomePianoOffsetMsRef = useRef<number>(metronomePianoOffsetMs);
  useEffect(() => {
    metronomePianoOffsetMsRef.current = metronomePianoOffsetMs;
    localStorage.setItem("game_metronome_piano_offset_ms", metronomePianoOffsetMs.toString());
  }, [metronomePianoOffsetMs]);

  const [detectedHardwareLatencyMs, setDetectedHardwareLatencyMs] = useState<number>(0);
  const allBeatTimesRef = useRef<BeatInfo[]>([]);
  useEffect(() => {
    allBeatTimesRef.current = allBeatTimes;
  }, [allBeatTimes]);

  const [hitCount, setHitCount] = useState<number>(0);
  const hitCountRef = useRef<number>(0);
  useEffect(() => {
    hitCountRef.current = hitCount;
  }, [hitCount]);
  const [perfectCount, setPerfectCount] = useState<number>(0);
  const perfectCountRef = useRef<number>(0);
  useEffect(() => {
    perfectCountRef.current = perfectCount;
  }, [perfectCount]);
  const [greatCount, setGreatCount] = useState<number>(0);
  const greatCountRef = useRef<number>(0);
  useEffect(() => {
    greatCountRef.current = greatCount;
  }, [greatCount]);
  const [goodCount, setGoodCount] = useState<number>(0);
  const goodCountRef = useRef<number>(0);
  useEffect(() => {
    goodCountRef.current = goodCount;
  }, [goodCount]);
  const [missCount, setMissCount] = useState<number>(0);
  const missCountRef = useRef<number>(0);
  useEffect(() => {
    missCountRef.current = missCount;
  }, [missCount]);

  const [hp, setHp] = useState<number>(100);
  const hpRef = useRef<number>(100);
  useEffect(() => {
    hpRef.current = hp;
  }, [hp]);

  const [combo, setCombo] = useState<number>(0);
  const comboRef = useRef<number>(0);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const [maxCombo, setMaxCombo] = useState<number>(0);
  const maxComboRef = useRef<number>(0);
  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  const [lastJudgment, setLastJudgment] = useState<
    "perfect" | "great" | "good" | "miss" | null
  >(null);
  const lastJudgmentRef = useRef<"perfect" | "great" | "good" | "miss" | null>(
    null,
  );
  useEffect(() => {
    lastJudgmentRef.current = lastJudgment;
  }, [lastJudgment]);

  const [displayJudgment, setDisplayJudgment] = useState<{ id: number; type: 'perfect' | 'great' | 'good' | 'miss' } | null>(null);
  const judgmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lastJudgment) {
      if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
      setDisplayJudgment({ id: Date.now(), type: lastJudgment });
      judgmentTimerRef.current = setTimeout(() => {
        setDisplayJudgment(null);
        judgmentTimerRef.current = null;
      }, 800);
    }
  }, [lastJudgment, combo]);

  const [errorCount, setErrorCount] = useState<number>(0);
  const errorCountRef = useRef<number>(0);
  useEffect(() => {
    errorCountRef.current = errorCount;
  }, [errorCount]);
  const [liveAccuracy, setLiveAccuracy] = useState<number>(100);
  const [liveAccuracyRef, setLiveAccuracyRef] = useState<number>(100);
  const [liveSpeed, setLiveSpeed] = useState<number>(100);
  const [totalNoteCountForGame, setTotalNoteCountForGame] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<ExtendedResult | null>(
    null,
  );
  const hitNoteIdsRef = useRef<Set<string>>(new Set());
  const noteJudgmentsRef = useRef<
    Map<string, "perfect" | "great" | "good" | "miss">
  >(new Map());
  const playerInputTimesRef = useRef<number[]>([]);
  const firstInputRealTimeRef = useRef<number | null>(null);
  const lastInputRealTimeRef = useRef<number | null>(null);
  const [performanceSummary, setPerformanceSummary] =
    useState<PerformanceSummary | null>(null);

  const [midiInputs, setMidiInputs] = useState<Map<string, MIDIInput>>(
    () => new Map(),
  );
  const [midiOutputs, setMidiOutputs] = useState<Map<string, MIDIOutput>>(
    () => new Map(),
  );
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState<
    string | null
  >(null);
  const [midiAccessError, setMidiAccessError] = useState<string | null>(null);
  const activeMidiInputDeviceRef = useRef<MIDIInput | null>(null);
  const handleMidiMessageRef = useRef<((e: MIDIMessageEvent) => void) | null>(null);
  const midiAccessInstanceRef = useRef<MIDIAccess | null>(null);
  const [midiAccessStatus, setMidiAccessStatus] =
    useState<MidiAccessStatus>("uninitialized");

  const [sheetMusicZoom, setSheetMusicZoom] = useState<number>(1);
  const [noteLabelType, setNoteLabelType] = useState<NoteLabelType>(
    DEFAULT_NOTE_LABEL_TYPE,
  );
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME);
  const [metronomeVolume, setMetronomeVolume] = useState(
    DEFAULT_METRONOME_VOLUME,
  );
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(
    DEFAULT_THEME_SETTINGS,
  );
  const [showOnlyMajorNotes, setShowOnlyMajorNotes] = useState<boolean>(
    DEFAULT_SHOW_ONLY_MAJOR_NOTES,
  );
  const tapOnlyMode = instrumentMode === "drum" || showOnlyMajorNotes;
  // The cap belongs to the note's onset BPM, never the current playhead BPM.
  const majorVisualDurationByNoteId = useMemo(
    () => getMajorVisualDurationsByNoteId(
      notesForGame,
      timeMs => getActiveTempoBpmAtOriginalTime(
        timeMs,
        tempoEvents,
        currentTempoBpm ?? DEFAULT_MUSICXML_TEMPO_BPM,
      ),
    ),
    [currentTempoBpm, notesForGame, tempoEvents],
  );
  const majorVisualNotesForGame = useMemo(
    () =>
      tapOnlyMode
        ? notesForGame.map((note) => ({
          ...note,
          durationMs: majorVisualDurationByNoteId.get(note.noteId) ?? note.durationMs,
        }))
        : notesForGame,
    [majorVisualDurationByNoteId, notesForGame, tapOnlyMode],
  );
  // Dynamic sequential note hold duration map:
  // In autoplay and visual keyboard playback, consecutive fast notes (e.g. scales, trills, arpeggios)
  // must cleanly release before the next note in the same hand/key starts, preventing
  // adjacent keys from being pressed down simultaneously like chords.
  const sequentialVisualDurationByNoteId = useMemo(() => {
    const map = new Map<string, number>();
    if (!notesForGame || notesForGame.length === 0) return map;

    for (let i = 0; i < notesForGame.length; i++) {
      const note = notesForGame[i];
      let maxHold = VISUAL_NOTE_CAP_MS;

      for (let j = i + 1; j < notesForGame.length; j++) {
        const next = notesForGame[j];
        if (next.timeMs - note.timeMs > 300) break;
        const gap = next.timeMs - note.timeMs;
        if (gap > 15) {
          if (next.hand === note.hand || next.midi === note.midi || !note.hand || !next.hand) {
            const allowed = Math.max(25, gap - 12);
            if (allowed < maxHold) maxHold = allowed;
            break;
          }
        }
      }

      const dur = Math.min(note.durationMs, maxHold);
      map.set(note.noteId, dur);
    }

    return map;
  }, [notesForGame]);
  const fingeringHandNotes = useMemo(
    () =>
      notesForGame.map((note) => ({
        ...note,
        durationMs:
          majorVisualDurationByNoteId.get(note.noteId) ??
          Math.min(note.durationMs, VISUAL_NOTE_CAP_MS),
      })),
    [majorVisualDurationByNoteId, notesForGame],
  );
  const difficultyPlaybackNotes = useMemo(
    () =>
      playbackNotes.map((note) => ({
        ...note,
        durationMs: getDifficultyNoteDurationMs(
          note,
          getActiveTempoBpmAtOriginalTime(
            note.timeMs,
            tempoEvents,
            currentTempoBpm ?? DEFAULT_MUSICXML_TEMPO_BPM,
          ),
        ),
      })),
    [currentTempoBpm, playbackNotes, tempoEvents],
  );
  const activeMajorNoteVisualDurationMs = useMemo(() => {
    const sourceBpm = isFreePlayMode
      ? freePlayBpm
      : getActiveTempoBpmAtOriginalTime(
        musicalCurrentTimeMs,
        tempoEvents,
        currentTempoBpm ?? DEFAULT_MUSICXML_TEMPO_BPM,
      );
    return getMajorNoteVisualDurationMs(sourceBpm);
  }, [
    currentTempoBpm,
    freePlayBpm,
    isFreePlayMode,
    musicalCurrentTimeMs,
    tempoEvents,
  ]);
  const [showQwertyShortcuts, setShowQwertyShortcuts] = useState<boolean>(
    DEFAULT_SHOW_QWERTY_SHORTCUTS,
  );
  const [showPianoTilesBackground, setShowPianoTilesBackground] =
    useState<boolean>(DEFAULT_SHOW_PIANO_TILES_BACKGROUND);
  const [showPerfectJudgment, setShowPerfectJudgment] = useState<boolean>(
    DEFAULT_SHOW_PERFECT_JUDGMENT,
  );
  const [lowDetailMode, setLowDetailMode] = useState<boolean>(true);
  const [hidePianoKeyboardNonFalling, setHidePianoKeyboardNonFalling] = useState<boolean>(true);
  const [showDynamics, setShowDynamics] = useState<boolean>(false);
  const [resolutionScale, setResolutionScale] = useState<number>(1.0);
  const [zoomDirection, setZoomDirection] = useState<"normal" | "reverse">(
    DEFAULT_ZOOM_DIRECTION,
  );
  const [drumTyperPadOpacity, setDrumTyperPadOpacity] = useState<number>(25);
  const [antiDoubleTriggerEnabled, setAntiDoubleTriggerEnabled] = useState(true);
  const [antiDoubleTriggerInterval, setAntiDoubleTriggerInterval] = useState(40);
  const [drumMapping, setDrumMapping] = useState<DrumPadConfig[]>(DRUM_PADS);
  const lastTriggerTimeRef = useRef<Map<number, number>>(new Map());

  const [qwertyLayout, setQwertyLayout] = useState<QwertyLayout>("mirp");
  const [qwertyCurrentOctaveShift, setQwertyCurrentOctaveShift] =
    useState<number>(DEFAULT_QWERTY_OCTAVE_SHIFT);
  const qwertyActiveKeysRef = useRef<Set<string>>(new Set());
  const [mirpTranspose, setMirpTranspose] = useState<number>(0);
  const lastActiveKeySigRef = useRef<string | null>(null);
  const activeMirpNotesRef = useRef<Map<string, number>>(new Map());

  const SETTINGS_KEY = "octavia_settings_v1";

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.showHand3D !== undefined) setShowHand3D(!!s.showHand3D);
        if (s.fingeringPreferences && ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(s.fingeringPreferences.handSize)) setFingeringPreferences({ handSize: s.fingeringPreferences.handSize, routing: 'auto', splitMidi: s.fingeringPreferences.splitMidi ?? 60 });
        if (s.masterVolume !== undefined) setMasterVolume(s.masterVolume);
        if (s.metronomeVolume !== undefined)
          setMetronomeVolume(s.metronomeVolume);
        if (s.mp3Volume !== undefined) setMp3Volume(s.mp3Volume);
        if (s.viewMode !== undefined) setViewMode(s.viewMode);
        if (s.noteLabelType !== undefined) {
          setNoteLabelType((s.noteLabelType as string) === 'velocity' ? 'none' : s.noteLabelType);
        }
        if (s.showOnlyMajorNotes !== undefined)
          setShowOnlyMajorNotes(s.showOnlyMajorNotes);
        if (s.showQwertyShortcuts !== undefined)
          setShowQwertyShortcuts(s.showQwertyShortcuts);
        if (s.themeSettings !== undefined) setThemeSettings(s.themeSettings);
        if (s.devicePreset !== undefined) setDevicePreset(s.devicePreset);
        if (s.customWhiteKeyHeight !== undefined)
          setCustomWhiteKeyHeight(s.customWhiteKeyHeight);
        if (s.customBlackKeyHeight !== undefined)
          setCustomBlackKeyHeight(s.customBlackKeyHeight);
        if (s.customKeyLabelHeight !== undefined)
          setCustomKeyLabelHeight(s.customKeyLabelHeight);
        if (s.customMinWhiteKeyWidth !== undefined)
          setCustomMinWhiteKeyWidth(s.customMinWhiteKeyWidth);
        if (s.pianoRangeMode !== undefined) setPianoRangeMode(s.pianoRangeMode);
        if (s.customStartNote !== undefined)
          setCustomStartNote(s.customStartNote);
        if (s.customEndNote !== undefined) setCustomEndNote(s.customEndNote);
        if (s.qwertyLayout !== undefined) setQwertyLayout(s.qwertyLayout);
        if (s.showPianoTilesBackground !== undefined)
          setShowPianoTilesBackground(s.showPianoTilesBackground);
        if (s.showPerfectJudgment !== undefined)
          setShowPerfectJudgment(s.showPerfectJudgment);
        if (s.uiZoom !== undefined) setUiZoom(s.uiZoom);
        if (s.uiZoomAuto !== undefined) setUiZoomAuto(s.uiZoomAuto);
        if (s.micThresholds !== undefined) setMicThresholds(s.micThresholds);
        if (s.noteOffsetMs !== undefined) setNoteOffsetMs(s.noteOffsetMs);
        if (s.zoomDirection !== undefined) setZoomDirection(s.zoomDirection);
        if (s.drumTyperPadOpacity !== undefined) setDrumTyperPadOpacity(s.drumTyperPadOpacity);
        if (s.drumInputMode !== undefined) setDrumInputMode(s.drumInputMode);
        if (s.antiDoubleTriggerEnabled !== undefined) setAntiDoubleTriggerEnabled(s.antiDoubleTriggerEnabled);
        if (s.antiDoubleTriggerInterval !== undefined) setAntiDoubleTriggerInterval(s.antiDoubleTriggerInterval);
        if (s.drumMapping !== undefined) setDrumMapping(s.drumMapping);
        if (s.userAverageOffset !== undefined) setUserAverageOffset(s.userAverageOffset);
        const loadedInstMode = s.instrumentMode !== undefined ? s.instrumentMode : "piano";
        if (s.instrumentMode !== undefined) setInstrumentMode(s.instrumentMode);
        if (s.lastPianoViewMode !== undefined) {
          setLastPianoViewMode( s.lastPianoViewMode === "drum_mania" ? "falling" : s.lastPianoViewMode );
        }
        if (loadedInstMode === "piano" && s.viewMode === "drum_mania") {
          setViewMode("falling");
        }
        if (s.lastDrumViewMode !== undefined) setLastDrumViewMode(s.lastDrumViewMode);
        if (s.gameplayStyle !== undefined) setGameplayStyle(s.gameplayStyle);
        if (s.hidePianoKeyboardNonFalling !== undefined) setHidePianoKeyboardNonFalling(s.hidePianoKeyboardNonFalling);
        if (s.showDynamics !== undefined) setShowDynamics(!!s.showDynamics);
        if (s.resolutionScale !== undefined) {
          setResolutionScale(s.resolutionScale);
        } else if (s.lowResolutionMode !== undefined) {
          setResolutionScale(s.lowResolutionMode ? 0.5 : 1.0);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      fingeringPreferences, showHand3D,
      masterVolume,
      metronomeVolume,
      mp3Volume,
      viewMode,
      noteLabelType,
      showOnlyMajorNotes,
      showQwertyShortcuts,
      themeSettings,
      devicePreset,
      customWhiteKeyHeight,
      customBlackKeyHeight,
      customKeyLabelHeight,
      customMinWhiteKeyWidth,
      pianoRangeMode,
      customStartNote,
      customEndNote,
      qwertyLayout,
      showPianoTilesBackground,
      showPerfectJudgment,
      lowDetailMode,
      uiZoom,
      uiZoomAuto,
      micThresholds,
      noteOffsetMs,
      zoomDirection,
      drumTyperPadOpacity,
      drumInputMode,
      antiDoubleTriggerEnabled,
      antiDoubleTriggerInterval,
      drumMapping,
      userAverageOffset,
      instrumentMode,
      lastPianoViewMode,
      lastDrumViewMode,
      gameplayStyle,
      resolutionScale,
      hidePianoKeyboardNonFalling,
      showDynamics,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [
    fingeringPreferences, showHand3D,
    masterVolume,
    metronomeVolume,
    mp3Volume,
    viewMode,
    noteLabelType,
    showOnlyMajorNotes,
    showQwertyShortcuts,
    themeSettings,
    devicePreset,
    customWhiteKeyHeight,
    customBlackKeyHeight,
    customKeyLabelHeight,
    customMinWhiteKeyWidth,
    pianoRangeMode,
    customStartNote,
    customEndNote,
    qwertyLayout,
    showPianoTilesBackground,
    showPerfectJudgment,
    uiZoom,
    uiZoomAuto,
    micThresholds,
    noteOffsetMs,
    zoomDirection,
    drumTyperPadOpacity,
    drumInputMode,
    antiDoubleTriggerEnabled,
    antiDoubleTriggerInterval,
    drumMapping,
    userAverageOffset,
    instrumentMode,
    lastPianoViewMode,
    lastDrumViewMode,
    gameplayStyle,
    resolutionScale,
    hidePianoKeyboardNonFalling,
    showDynamics,
  ]);

  const resetSettings = useCallback(() => {
    setFingeringPreferences({ handSize: 'M', routing: 'auto', splitMidi: 60 });
    setShowHand3D(true);
    setHidePianoKeyboardNonFalling(true);
    setShowDynamics(false);
    setMasterVolume(DEFAULT_MASTER_VOLUME);
    setMetronomeVolume(DEFAULT_METRONOME_VOLUME);
    setMp3Volume(DEFAULT_MP3_VOLUME);
    setViewMode(DEFAULT_VIEW_MODE);
    setNoteLabelType(DEFAULT_NOTE_LABEL_TYPE);
    setShowOnlyMajorNotes(DEFAULT_SHOW_ONLY_MAJOR_NOTES);
    setShowQwertyShortcuts(DEFAULT_SHOW_QWERTY_SHORTCUTS);
    setThemeSettings(DEFAULT_THEME_SETTINGS);
    setDevicePreset("desktop");
    setCustomWhiteKeyHeight(140);
    setCustomBlackKeyHeight(90);
    setCustomKeyLabelHeight(25);
    setCustomMinWhiteKeyWidth(24.5);
    setPianoRangeMode("full");
    setCustomStartNote("C3");
    setCustomEndNote("C5");
    setQwertyLayout("mirp");
    setShowPianoTilesBackground(DEFAULT_SHOW_PIANO_TILES_BACKGROUND);
    setShowPerfectJudgment(DEFAULT_SHOW_PERFECT_JUDGMENT);
    setUiZoomAuto(true);
    setMicThresholds({
      subBass: -70,
      bass: -65,
      mid: -60,
      treble: -75,
      highTreble: -75,
    });
    setNoteOffsetMs(0);
    setZoomDirection(DEFAULT_ZOOM_DIRECTION);
    setDrumTyperPadOpacity(25);
    setAntiDoubleTriggerEnabled(true);
    setAntiDoubleTriggerInterval(40);
    setDrumMapping(DRUM_PADS);
    setUserAverageOffset(0);
    setLastPianoViewMode(DEFAULT_VIEW_MODE);
    setLastDrumViewMode("drum_mania");
    setResolutionScale(1.0);
    localStorage.removeItem(SETTINGS_KEY);
  }, []);

  const recentNotesBufferRef = useRef<Map<number, number>>(new Map());
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState("");

  // Screen Wake Lock: Prevent device screen from sleeping during gameplay session (manual & auto mode)
  useWakeLock(currentScreen === "inGame" && isPlaying && !isGameOver);
  const badStretchStartTimeRef = useRef<number | null>(null);
  const lastChunkCheckedRef = useRef<number>(-1);

  const changeHp = useCallback((amount: number) => {
    if (isFreePlayModeRef.current || isLearnModeActiveRef.current) return;
    if (gameSettingsRef.current?.isHpEnabled === false) return;

    const currentHp = hpRef.current;
    const nextHp = Math.min(100, Math.max(0, currentHp + amount));
    hpRef.current = nextHp;
    setHp(nextHp);

    if (nextHp <= 0) {
      if (isLoopingRef.current && loopStartMsRef.current !== null) {
        startLoopWithPreRollRef.current?.();
        return;
      }

      setIsPlaying(false);
      isPlayingRef.current = false;
      if (playbackRequestRef.current) {
        cancelAnimationFrame(playbackRequestRef.current);
        playbackRequestRef.current = null;
      }
      loopDelayStartTimeRef.current = null;
      setLoopDelayInfoWithRef(null);
      setGameOverReason("Game Over: You have run out of health (0 HP)!");
      setIsGameOver(true);

      // Stop background backing track automatically
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch (e) { }
      }
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.pauseVideo();
        } catch (e) { }
      }

      if (currentHp > 0) {
        playSoundEffect("/kalah.mp3");
      }
    }
  }, []);

  // --- Auto-Offset and Mic/MIDI Volume Logic ---
  const prevMidiInputIdRef = useRef<string | null>(null);
  const prevAudioInputEnabledRef = useRef<boolean>(false);
  const lastUserMasterVolumeRef = useRef<number>(DEFAULT_MASTER_VOLUME);
  const lastUserMp3VolumeRef = useRef<number>(DEFAULT_MP3_VOLUME);

  // Track user's manual volume changes
  useEffect(() => {
    if (!isAudioInputEnabled && selectedMidiInputId === null) {
      lastUserMasterVolumeRef.current = masterVolume;
      lastUserMp3VolumeRef.current = mp3Volume;
    }
  }, [masterVolume, mp3Volume, isAudioInputEnabled, selectedMidiInputId]);

  useEffect(() => {
    const midiConnected = selectedMidiInputId !== null;
    const micEnabled = isAudioInputEnabled;

    const wasMidiConnected = prevMidiInputIdRef.current !== null;
    const wasMicEnabled = prevAudioInputEnabledRef.current;

    // If mic was just enabled, mute both
    if (micEnabled && !wasMicEnabled) {
      setMasterVolume(0.1);
      setMetronomeVolume(0.1); // Lower metronome volume during calibration
      setMp3Volume(0.1);
    }
    // If mic was just disabled, restore volumes
    else if (!micEnabled && wasMicEnabled) {
      if (midiConnected) {
        setMasterVolume(0.1);
      } else {
        setMasterVolume(DEFAULT_MASTER_VOLUME);
      }
      setMp3Volume(DEFAULT_MP3_VOLUME);
      setMetronomeVolume(DEFAULT_METRONOME_VOLUME); // Restore metronome volume
    }
    // If MIDI was just enabled (and mic is not enabled), mute piano
    else if (midiConnected && !wasMidiConnected && !micEnabled) {
      setMasterVolume(0.1);
    }
    // If MIDI was just disabled (and mic is not enabled), restore piano volume
    else if (!midiConnected && wasMidiConnected && !micEnabled) {
      setMasterVolume(DEFAULT_MASTER_VOLUME);
    }

    // Auto-Offset Logic removed to prevent random jumps in User Ms
    prevMidiInputIdRef.current = selectedMidiInputId;
    prevAudioInputEnabledRef.current = isAudioInputEnabled;
  }, [isAudioInputEnabled, selectedMidiInputId]);

  useEffect(() => {
    if (audioRef.current) {
      applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplier);
    }
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.setPlaybackRate === "function"
    ) {
      try {
        youtubePlayerRef.current.setPlaybackRate(playbackTempoMultiplier);
      } catch (e) {
        console.warn("Failed to set YouTube playback rate:", e);
      }
    }
  }, [playbackTempoMultiplier, isPlaying, applyAudioPlaybackRate]); // Update when multiplier OR playing status changes
  // --- End Auto-Offset and Mic/MIDI Volume Logic ---

  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach((key) => map.set(key.midiNote, key.name));
    if (instrumentMode === "drum") {
      Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) =>
        map.set(parseInt(midi), name),
      );
    }
    return map;
  }, [instrumentMode]);

  const noteNameToKeyDefMap = useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach((key) => map.set(key.name, key));
    return map;
  }, []);

  const midiNoteToKeyDefMap = useMemo(() => {
    const map = new Map<number, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach((key) => map.set(key.midiNote, key));
    return map;
  }, []);

  const midiToDrumPadIdMap = useMemo(() => {
    const map = new Map<number, string>();
    drumMapping.forEach((pad) => {
      pad.midiNotes.forEach((note) => map.set(note, pad.id));
    });
    return map;
  }, [drumMapping]);

  const userActiveMidiNotes = useMemo(() => {
    const midiNotes = new Set<number>();
    const allActiveNames = new Set([...userActiveKeys, ...userSustainedKeys]);
    allActiveNames.forEach((name) => {
      const def = noteNameToKeyDefMap.get(name);
      if (def) {
        midiNotes.add(def.midiNote);
      } else {
        // Also check if it's a drum pad name
        const pad = drumMapping.find((p) => p.name === name);
        if (pad) {
          pad.midiNotes.forEach((m) => midiNotes.add(m));
        }
      }
    });
    return midiNotes;
  }, [userActiveKeys, userSustainedKeys, noteNameToKeyDefMap, drumMapping]);

  const numWhiteKeys = useMemo(
    () => visiblePianoKeys.filter((key) => key.type === "white").length,
    [visiblePianoKeys],
  );
  const keyPositionsMap = useMemo(() => {
    if (containerWidth <= 0 || numWhiteKeys === 0)
      return new Map<string, KeyPosition>();
    const adjustedContainerWidth = Math.max(
      containerWidth,
      layoutConfig.minWhiteKeyWidth * numWhiteKeys,
    );
    return generateKeyPositions(visiblePianoKeys, adjustedContainerWidth);
  }, [containerWidth, layoutConfig, visiblePianoKeys, numWhiteKeys]);

  const keyPositionsArray = useMemo(() => {
    return Array.from(keyPositionsMap.values());
  }, [keyPositionsMap]);

  const baseCalculatedPianoWidth = useMemo(() => {
    if (!keyPositionsArray || keyPositionsArray.length === 0) return containerWidth;
    return keyPositionsArray
      .filter((kp: KeyPosition) => kp.type === "white")
      .reduce(
        (max: number, kp: KeyPosition) => Math.max(max, kp.x + kp.width),
        0,
      );
  }, [keyPositionsArray, containerWidth]);

  const waitMode: WaitMode = isFreePlayMode
    ? "off"
    : gameSettings?.waitMode || "strict";
  const isMetronomeAvailable = useMemo(
    () => (notesForGame.length > 0 && tempoEvents.length > 0) || isFreePlayMode,
    [notesForGame.length, tempoEvents.length, isFreePlayMode],
  );
  const absoluteEndTimeMs = useMemo(() => {
    const notesToMeasure = playbackNotes && playbackNotes.length > 0 ? playbackNotes : notesForGame;
    if (!notesToMeasure || notesToMeasure.length === 0) return 0;
    return notesToMeasure.reduce(
      (max, note) => Math.max(max, note.timeMs + note.durationMs),
      0,
    );
  }, [playbackNotes, notesForGame]);
  const totalDurationWithEndDelayMs = useMemo(
    () =>
      absoluteEndTimeMs === 0 ? 0 : absoluteEndTimeMs + END_PLAYBACK_DELAY_MS,
    [absoluteEndTimeMs],
  );

  useEffect(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0) {
      setAnalysisResult(null);
      return;
    }
    const scaledNotes = playbackNotes.map((note) => ({
      ...note,
      timeMs: note.timeMs / playbackTempoMultiplier,
      durationMs: note.durationMs / playbackTempoMultiplier,
    }));
    setAnalysisResult(
      analyzeMidi(
        scaledNotes,
        originalTotalMusicalDurationMs / playbackTempoMultiplier,
        undefined,
        originalTotalMusicalDurationMs,
        instrumentMode,
      ),
    );
  }, [
    playbackNotes,
    originalTotalMusicalDurationMs,
    playbackTempoMultiplier,
    instrumentMode,
  ]);

  const previewAnalysisResult = useMemo(() => {
    if (playbackNotes.length === 0 || originalTotalMusicalDurationMs === 0)
      return null;
    const scaledNotes = playbackNotes.map((note) => ({
      ...note,
      timeMs: note.timeMs / previewPlaybackTempoMultiplier,
      durationMs: note.durationMs / previewPlaybackTempoMultiplier,
    }));
    return analyzeMidi(
      scaledNotes,
      originalTotalMusicalDurationMs / previewPlaybackTempoMultiplier,
      undefined,
      originalTotalMusicalDurationMs,
      instrumentMode,
    );
  }, [
    playbackNotes,
    originalTotalMusicalDurationMs,
    previewPlaybackTempoMultiplier,
    instrumentMode,
  ]);

  const onPlaybackTempoMultiplierChange = useCallback(
    (multiplier: number) => setPlaybackTempoMultiplierForPreview(multiplier),
    [],
  );

  useEffect(() => {
    const contentEl = contentAreaRef.current;
    if (!contentEl) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        const newWidth = entries[0].contentRect.width;
        if (newWidth > 0)
          requestAnimationFrame(() => setContainerWidth(newWidth));
      }
    });
    resizeObserver.observe(contentEl);
    if (contentEl.clientWidth > 0)
      setContainerWidth(contentAreaRef.current.clientWidth);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const calculateHeights = () => {
      requestAnimationFrame(() => {
        if (currentScreen !== "inGame" && currentScreen !== "settings") return;
        const contentAreaDiv = contentAreaRef.current;
        if (!contentAreaDiv) {
          setContentAreaHeight(300);
          return;
        }
        const totalAvailableContentHeight = contentAreaDiv.clientHeight;
        const isPianoKeyboardVisible = instrumentMode !== "drum" && (viewMode === "falling" || !hidePianoKeyboardNonFalling);
        const subtractHeight = isPianoKeyboardVisible ? (layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight) : 0;
        const actualHeightForDynamicView = Math.max(
          0,
          totalAvailableContentHeight - subtractHeight,
        );
        setContentAreaHeight(actualHeightForDynamicView);
      });
    };
    calculateHeights();
    window.addEventListener("resize", calculateHeights);
    const contentAreaObserver = new ResizeObserver(calculateHeights);
    if (contentAreaRef.current)
      contentAreaObserver.observe(contentAreaRef.current);
    return () => {
      /* FIX: Use 'removeEventListener' instead of 'removePrefix' */
      window.removeEventListener("resize", calculateHeights);
      if (contentAreaRef.current)
        contentAreaObserver.unobserve(contentAreaRef.current);
    };
  }, [notesForGame.length, currentScreen, layoutConfig, isFreePlayMode, instrumentMode, viewMode, hidePianoKeyboardNonFalling]);

  useEffect(() => {
    isFreePlayModeRef.current = isFreePlayMode;
  }, [isFreePlayMode]);

  const initializeAudioContext = useCallback(
    async (shouldResume: boolean = true) => {
      let context = audioContextRef.current;
      const updateLatency = () => {
        if (!context) return;
        const hwLat = Math.round(measuredOutputLatencyMs(context));
        if (hwLat > 0) setDetectedHardwareLatencyMs(hwLat);
      };

      if (!context) {
        try {
          const AudioContextConstructor =
            window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextConstructor) return false;
          context = new (AudioContextConstructor as { new(options?: AudioContextOptions): AudioContext })({
            latencyHint: "interactive",
          });
          audioContextRef.current = context;
          masterGainRef.current = context.createGain();
          masterGainRef.current.connect(context.destination);
          metronomeGainRef.current = context.createGain();
          metronomeGainRef.current.connect(context.destination);
          updateLatency();
          context.onstatechange = () => {
            updateLatency();
          };
        } catch (e) {
          return false;
        }
      } else {
        updateLatency();
      }
      if (shouldResume && context.state === "suspended") {
        try {
          await context.resume();
          updateLatency();
        } catch (e) {
          return false;
        }
      }
      // Also resume on EVERY call if it's not running
      if (shouldResume && context.state !== "running") {
        try {
          await context.resume();
          updateLatency();
        } catch (e) { }
      }
      return context.state === "running" || !shouldResume;
    },
    [],
  );

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);
  useEffect(() => {
    if (metronomeGainRef.current)
      metronomeGainRef.current.gain.value = metronomeVolume;
  }, [metronomeVolume]);

  // Consolidated Backing Track Volume Effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = mp3Volume;
    }
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.setVolume === "function"
    ) {
      try {
        youtubePlayerRef.current.setVolume(mp3Volume * 100);
      } catch (e) {
        // Might not be ready, onReady handles initial set
      }
    }
  }, [mp3Volume]);

  useEffect(() => {
    if (audioRef.current) {
      applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplier);
      // Force a re-apply after a short delay because some browsers reset it when playback starts or src changes
      const timer = setTimeout(() => {
        if (audioRef.current)
          applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplier);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [playbackTempoMultiplier, gameSettings?.backingTrack?.url, isPlaying, applyAudioPlaybackRate]);
  useEffect(() => {
    const backing = gameSettings?.backingTrack;
    const candidateUrl =
      currentScreen === "inGame"
        ? (backing?.type === "youtube" ? backing.url : null)
        : currentScreen === "modeSelection"
          ? (currentMidiLink && (currentMidiLink.includes("youtube.com") || currentMidiLink.includes("youtu.be")) ? currentMidiLink : null)
          : null;

    if (candidateUrl) {
      const videoId = getYoutubeId(candidateUrl);
      if (!videoId) {
        if (currentScreen === "inGame") {
          setBackingTrackError("Failed to load YouTube audio (Invalid link).");
          setBackingTrackStatus("error");
          setIsBackingTrackOverlayDismissed(false);
        }
        return;
      }

      if (youtubePlayerRef.current && currentYoutubeVideoIdRef.current === videoId) {
        if (currentScreen === "inGame" && !isPlayingRef.current) {
          preseekBackingTrackToTime(currentTimeRef.current);
        }
        return;
      }

      if (youtubePlayerRef.current && currentYoutubeVideoIdRef.current !== videoId) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {}
        youtubePlayerRef.current = null;
        currentYoutubeVideoIdRef.current = null;
      }

      const hasYTApi = (window as any).YT && (window as any).YT.Player;
      if (hasYTApi) {
        initializeYoutubePlayer(candidateUrl);
      } else if (!(window as any).onYouTubeIframeAPIReady) {
        (window as any).onYouTubeIframeAPIReady = () => {
          initializeYoutubePlayer(candidateUrl);
        };
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = () => {
          setBackingTrackError("Failed to load YouTube audio player.");
          setBackingTrackStatus("error");
          setIsBackingTrackOverlayDismissed(false);
        };
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      } else {
        const originalOnReady = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (originalOnReady) {
            try {
              originalOnReady();
            } catch (e) { }
          }
          initializeYoutubePlayer(candidateUrl);
        };
      }
    } else if (currentScreen !== "inGame" && currentScreen !== "modeSelection") {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) { }
        youtubePlayerRef.current = null;
        currentYoutubeVideoIdRef.current = null;
      }
    }
  }, [
    gameSettings?.backingTrack?.url,
    gameSettings?.backingTrack?.type,
    currentMidiLink,
    currentScreen,
    preseekBackingTrackToTime,
  ]);

  const initializeYoutubePlayer = (url: string) => {
    const videoId = getYoutubeId(url);
    if (!videoId) {
      setBackingTrackError("Failed to load YouTube audio (Invalid video ID).");
      setBackingTrackStatus("error");
      setIsBackingTrackOverlayDismissed(false);
      return;
    }
    currentYoutubeVideoIdRef.current = videoId;
    if (youtubeContainerRef.current) {
      youtubeContainerRef.current.innerHTML = '<div id="youtube-player"></div>';
    }
    const effectiveOffsetMs = gameSettingsRef.current?.backingTrack?.offsetMs ?? backingTrackOffset ?? 0;
    const initialStartSec = Math.max(0, Math.floor((-INITIAL_PLAYBACK_DELAY_MS + effectiveOffsetMs + userAudioSyncOffsetRef.current) / 1000));
    try {
      youtubePlayerRef.current = new (window as any).YT.Player("youtube-player", {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          ...(initialStartSec > 0 ? { start: initialStartSec } : {}),
        },
        events: {
          onReady: (event: any) => {
            console.log("YouTube Player Ready");
            youtubePlayerRef.current = event.target;
            try {
              event.target.setVolume(mp3VolumeRef.current * 100);
            } catch (e) {}
            if (isPlayingRef.current) {
              const backing = gameSettingsRef.current?.backingTrack;
              if (backing && backing.type === "youtube") {
                triggerBackingTrackPlay(currentTimeRef.current);
              }
            } else {
              // Automatically pre-seek/prime to offset position (just like scrolling mouse wheel to bottom)
              const targetOffsetMs = gameSettingsRef.current?.backingTrack?.offsetMs ?? backingTrackOffset ?? 0;
              const targetSec = getAudioStartTime(currentTimeRef.current / 1000, "youtube", targetOffsetMs);
              try {
                isPreseekingYoutubeRef.current = true;
                if (typeof event.target.mute === "function") event.target.mute();
                event.target.seekTo(targetSec, true);
              } catch (e) {}
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1, BUFFERING = 3
            if (event.data === 1) {
              if (!isPlayingRef.current && isPreseekingYoutubeRef.current) {
                isPreseekingYoutubeRef.current = false;
                try {
                  event.target.pauseVideo();
                  const targetOffsetMs = gameSettingsRef.current?.backingTrack?.offsetMs ?? backingTrackOffset ?? 0;
                  const targetSec = getAudioStartTime(currentTimeRef.current / 1000, "youtube", targetOffsetMs);
                  event.target.seekTo(targetSec, true);
                  if (typeof event.target.unMute === "function") event.target.unMute();
                  if (typeof event.target.setVolume === "function") event.target.setVolume(mp3VolumeRef.current * 100);
                } catch (e) {}
                return;
              }
              isPreseekingYoutubeRef.current = false;
              try {
                if (typeof event.target.unMute === "function") event.target.unMute();
                if (typeof event.target.setVolume === "function") event.target.setVolume(mp3VolumeRef.current * 100);
                if (typeof event.target.setPlaybackRate === "function") {
                  event.target.setPlaybackRate(playbackTempoMultiplierRef.current);
                }
              } catch (e) { }
              backingPlayAttemptTimeRef.current = null;
              setBackingTrackError(null);
              if (backingTrackStatusRef.current !== 'playing') setBackingTrackStatus('playing');
            } else if (event.data === 3 && isPlayingRef.current) {
              if (backingTrackStatusRef.current !== 'error' && backingTrackStatusRef.current !== 'playing') {
                setBackingTrackStatus('loading');
              }
            }
          },
          onError: (el: any) => {
            console.error("YouTube Player Error:", el);
            setBackingTrackError("Failed to load YouTube MP3 audio.");
            setBackingTrackStatus("error");
            setIsBackingTrackOverlayDismissed(false);
          },
        },
      });
    } catch (e) {
      console.error("Failed to construct YouTube player:", e);
      setBackingTrackError("Failed to load YouTube MP3 audio.");
      setBackingTrackStatus("error");
      setIsBackingTrackOverlayDismissed(false);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    if (url.includes("youtu.be/"))
      return url.split("youtu.be/")[1].split("?")[0].split("&")[0];
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    return null;
  };

  const safePlayYoutube = async (isDirect: boolean = false) => {
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.playVideo === "function"
    ) {
      try {
        youtubePlayerRef.current.playVideo();
      } catch (e) {
        console.error("safePlayYoutube error:", e);
        setBackingTrackError("Failed to load YouTube audio.");
        setBackingTrackStatus("error");
        setIsBackingTrackOverlayDismissed(false);
      }
    }
  };

  const safePauseYoutube = async () => {
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.pauseVideo === "function"
    ) {
      try {
        youtubePlayerRef.current.pauseVideo();
      } catch (e) { }
    }
  };

  useEffect(() => {
    const backingUrl = gameSettings?.backingTrack?.url;
    return () => {
      if (backingUrl && backingUrl.startsWith("blob:")) {
        URL.revokeObjectURL(backingUrl);
      }
    };
  }, [gameSettings?.backingTrack?.url]);

  const getAudioBuffer = useCallback(
    async (midiNote: number): Promise<AudioBuffer | null> => {
      const isDrumMode = instrumentMode === "drum";
      const cacheKey = isDrumMode ? `drum_${midiNote}` : midiNote;
      if (audioBufferCacheRef.current.has(cacheKey))
        return audioBufferCacheRef.current.get(cacheKey)!;
      if (!audioContextRef.current) return null;
      try {
        let response;
        if (isDrumMode) {
          const drumFile = DRUM_SOUND_MAP[midiNote];
          if (!drumFile) return null;
          response = await fetch(`/sounds/drum/${drumFile}`, { signal: AbortSignal.timeout(15000) });
        } else {
          const noteName = midiNoteToNameMap.get(midiNote);
          if (!noteName) return null;
          response = await fetch(`/sounds/piano/${noteName}.mp3`, { signal: AbortSignal.timeout(15000) });
        }
        if (!response.ok) throw new Error();
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer =
          await audioContextRef.current.decodeAudioData(arrayBuffer);
        audioBufferCacheRef.current.set(cacheKey, audioBuffer);
        return audioBuffer;
      } catch (error) {
        return null;
      }
    },
    [midiNoteToNameMap, instrumentMode],
  );

  useEffect(() => {
    const setupAudio = async () => {
      await initializeAudioContext(false);
      const promises = UI_CLICK_SOUND_SEQUENCE_MIDI.map((midi) =>
        getAudioBuffer(midi),
      );
      await Promise.all(promises);
    };
    setupAudio();
  }, [initializeAudioContext, getAudioBuffer]);

  const preloadSamplesForSong = useCallback(
    async (notes: MidiNotePlaybackItem[]) => {
      const preloadJob = ++audioPreloadJobRef.current;
      // Decoding samples does not require autoplay permission. Resume on Play,
      // while a fresh user gesture is available, instead of blocking file loading.
      const audioContextReady = await initializeAudioContext(false);
      if (!audioContextReady) return;
      setIsPreloading(true);
      const uniqueMidiNotes =
        notes.length > 0 ? [...new Set(notes.map((note) => note.midi))] : [];
      const promises = uniqueMidiNotes.map((midiNote) =>
        getAudioBuffer(midiNote),
      );
      const loadGeneric = async (path: string) => {
        if (!audioContextRef.current) return null;
        const res = await fetch(path, { signal: AbortSignal.timeout(15000) });
        const ab = await res.arrayBuffer();
        return audioContextRef.current.decodeAudioData(ab);
      };
      const p1 = loadGeneric("/sounds/metronome/strong_beat.mp3");
      const p2 = loadGeneric("/sounds/metronome/weak_beat.mp3");
      promises.push(p1 as any, p2 as any);
      let preloadTimer: ReturnType<typeof setTimeout>;
      try {
        await Promise.race([Promise.all(promises), new Promise((_, reject) => {
          preloadTimer = setTimeout(() => reject(new Error('Audio preload timed out')), 20000);
        })]);
        metronomeBuffersRef.current.strong = (await p1) as AudioBuffer;
        metronomeBuffersRef.current.weak = (await p2) as AudioBuffer;
      } catch (e) {
      } finally {
        clearTimeout(preloadTimer!);
        if (audioPreloadJobRef.current === preloadJob) setIsPreloading(false);
      }
    },
    [initializeAudioContext, getAudioBuffer],
  );

  useEffect(() => {
    if (playbackNotes.length > 0) {
      preloadSamplesForSong(playbackNotes);
    }
  }, [instrumentMode, preloadSamplesForSong, playbackNotes]);

  const playSound = useCallback(
    (
      midiNote: number,
      musicalDurationMs: number,
      velocity: number = 0.75,
      scheduledStartTimeSec?: number,
      isUiSound: boolean = false,
    ) => {
      const selectedOutput = selectedMidiOutputId
        ? midiOutputs.get(selectedMidiOutputId)
        : null;
      const effectiveMusicalDuration = Math.max(60, musicalDurationMs);
      const realDurationMs = effectiveMusicalDuration / playbackTempoMultiplier;
      if (selectedOutput) {
        const audioCtxTime = audioContextRef.current ? audioContextRef.current.currentTime : 0;
        const delayMs = scheduledStartTimeSec !== undefined
          ? Math.max(0, (scheduledStartTimeSec - audioCtxTime) * 1000)
          : 0;
        const targetPerfTimestamp = performance.now() + delayMs;
        selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)], targetPerfTimestamp);
        setTimeout(() => {
          selectedOutput.send([0x80, midiNote, 0]);
        }, delayMs + realDurationMs);
        return;
      }
      if (!audioContextRef.current || !masterGainRef.current) return;
      const audioCtx = audioContextRef.current;
      const isDrumMode = instrumentMode === "drum";
      const cacheKey = isDrumMode ? `drum_${midiNote}` : midiNote;
      const audioBuffer = audioBufferCacheRef.current.get(cacheKey);

      const triggerAudio = (buffer: AudioBuffer) => {
        if (!audioContextRef.current || !masterGainRef.current) return;
        const ctx = audioContextRef.current;

        enforceAudioPolyphony(MAX_ACTIVE_AUDIO_VOICES);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        const startNow = scheduledStartTimeSec !== undefined
          ? Math.max(ctx.currentTime, scheduledStartTimeSec)
          : ctx.currentTime;
        gainNode.gain.setValueAtTime(velocity * 1.6, startNow);
        source.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        source.start(startNow);
        const nodeRecord: ActiveAudioNode = { source, gainNode, startTime: startNow, isUiSound };
        activeVoicesListRef.current.push(nodeRecord);

        source.onended = () => {
          const idx = activeVoicesListRef.current.indexOf(nodeRecord);
          if (idx !== -1) activeVoicesListRef.current.splice(idx, 1);
          pedalHeldPlaybackNodesRef.current.delete(nodeRecord);
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch (e) { }
        };
        if (isDrumMode) {
          // Drum sounds play to completion without premature stop
          return;
        }
        if (isSustainPedalActiveRef.current) {
          // Let the sample resonate naturally until the pedal is released.
          pedalHeldPlaybackNodesRef.current.add(nodeRecord);
          return;
        }
        const releaseTimeSec = 0.4,
          noteEndTimeSec = startNow + realDurationMs / 1000;
        gainNode.gain.setValueAtTime(velocity * 1.6, noteEndTimeSec);
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          noteEndTimeSec + releaseTimeSec,
        );
        source.stop(noteEndTimeSec + releaseTimeSec + 0.1);
      };

      if (!audioBuffer) {
        getAudioBuffer(midiNote).then((buf) => {
          if (buf) triggerAudio(buf);
        });
        return;
      }
      triggerAudio(audioBuffer);
    },
    [
      playbackTempoMultiplier,
      selectedMidiOutputId,
      midiOutputs,
      instrumentMode,
      getAudioBuffer,
      enforceAudioPolyphony,
    ],
  );

  useEffect(() => {
    isSustainPedalActiveRef.current = isSustainPedalActive;
    const selectedOutput = selectedMidiOutputId
      ? midiOutputs.get(selectedMidiOutputId)
      : null;
    selectedOutput?.send([0xb0, 64, isSustainPedalActive ? 127 : 0]);
    if (isSustainPedalActive || !audioContextRef.current) return;
    const now = audioContextRef.current.currentTime;
    pedalHeldPlaybackNodesRef.current.forEach(({ source, gainNode }) => {
      try {
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        source.stop(now + 0.8);
      } catch (e) { }
    });
    pedalHeldPlaybackNodesRef.current.clear();
  }, [isSustainPedalActive, midiOutputs, selectedMidiOutputId]);

  const startSustainedSound = useCallback(
    (keyName: string, midiNote: number, velocity: number = 0.75) => {
      const selectedOutput = selectedMidiOutputId
        ? midiOutputs.get(selectedMidiOutputId)
        : null;
      if (selectedOutput) {
        selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)]);
        return;
      }
      if (!audioContextRef.current || !masterGainRef.current) return;
      if (activeAudioNodesRef.current.has(keyName)) {
        const audioNode = activeAudioNodesRef.current.get(keyName);
        if (audioNode) {
          const idx = activeVoicesListRef.current.indexOf(audioNode);
          if (idx !== -1) activeVoicesListRef.current.splice(idx, 1);
          safelyStopAndDisconnectVoice(audioNode, 0.015);
        }
        activeAudioNodesRef.current.delete(keyName);
      }
      const audioCtx = audioContextRef.current;
      const playBufferedNote = (buffer: AudioBuffer) => {
        if (!audioContextRef.current || !masterGainRef.current) return;
        const ctx = audioContextRef.current;

        enforceAudioPolyphony(MAX_ACTIVE_AUDIO_VOICES);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(velocity * 1.6, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(masterGainRef.current);
        source.start(0);

        const nodeRecord: ActiveAudioNode = {
          source,
          gainNode,
          keyName,
          startTime: ctx.currentTime,
        };
        activeVoicesListRef.current.push(nodeRecord);
        activeAudioNodesRef.current.set(keyName, nodeRecord);

        source.onended = () => {
          const idx = activeVoicesListRef.current.indexOf(nodeRecord);
          if (idx !== -1) activeVoicesListRef.current.splice(idx, 1);
          if (activeAudioNodesRef.current.get(keyName) === nodeRecord) {
            activeAudioNodesRef.current.delete(keyName);
          }
          try {
            source.disconnect();
            gainNode.disconnect();
          } catch (e) { }
        };
      };
      const isDrumMode = instrumentMode === "drum";

      let actualMidiNote = midiNote;
      if (isDrumMode) {
        if (isHiHatFootPressed && (midiNote === 42 || midiNote === 46)) {
          actualMidiNote = 42; // Closed hi-hat
        } else if (
          !isHiHatFootPressed &&
          (midiNote === 42 || midiNote === 46)
        ) {
          actualMidiNote = 46; // Open hi-hat
        }
      }

      const cacheKey = isDrumMode ? `drum_${actualMidiNote}` : actualMidiNote;
      const cachedBuffer = audioBufferCacheRef.current.get(cacheKey);
      if (cachedBuffer) playBufferedNote(cachedBuffer);
      else
        getAudioBuffer(actualMidiNote).then((loadedBuffer) => {
          if (loadedBuffer) playBufferedNote(loadedBuffer);
        });
    },
    [
      getAudioBuffer,
      selectedMidiOutputId,
      midiOutputs,
      instrumentMode,
      isHiHatFootPressed,
      enforceAudioPolyphony,
      safelyStopAndDisconnectVoice,
    ],
  );

  const stopSustainedSound = useCallback(
    (keyName: string, midiNote: number) => {
      // For drums, hitsounds are one-shots and should not be cut off on key release
      if (instrumentMode === "drum") return;

      const selectedOutput = selectedMidiOutputId
        ? midiOutputs.get(selectedMidiOutputId)
        : null;
      if (selectedOutput) {
        selectedOutput.send([0x80, midiNote, 0]);
        return;
      }
      if (!audioContextRef.current || !activeAudioNodesRef.current.has(keyName))
        return;
      const audioCtx = audioContextRef.current;
      const audioNode = activeAudioNodesRef.current.get(keyName);
      if (audioNode) {
        const { source, gainNode } = audioNode;
        const now = audioCtx.currentTime,
          releaseTime = 0.35;
        try {
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), now);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
          source.stop(now + releaseTime + 0.05);
        } catch (e) {
          try {
            source.stop(now);
          } catch (e2) { }
        }
      }
      activeAudioNodesRef.current.delete(keyName);
    },
    [selectedMidiOutputId, midiOutputs, instrumentMode],
  );

  const clearScheduledMetronomeSounds = useCallback(() => {
    if (
      audioContextRef.current &&
      scheduledMetronomeAudioNodesRef.current.length > 0
    ) {
      const now = audioContextRef.current.currentTime;
      scheduledMetronomeAudioNodesRef.current.forEach((nodes) => {
        try {
          nodes.gainNode.gain.cancelScheduledValues(now);
          nodes.gainNode.gain.setValueAtTime(0, now);
          if (nodes.oscillator) nodes.oscillator.stop(now);
          if (nodes.source) nodes.source.stop(now);
        } catch (e) { }
      });
    }
    scheduledMetronomeAudioNodesRef.current = [];
  }, []);

  const clearScheduledNotes = useCallback(() => {
    scheduledNoteTimeoutsRef.current.forEach(clearTimeout);
    scheduledNoteTimeoutsRef.current.clear();
    scheduledAutoplayNoteIdsRef.current.clear();
    activeNoteInstancesRef.current.clear();
    setActivePlaybackNotesInfo(new Map());

    // Clean up all active audio voices to prevent memory/WebAudio leaks (keep UI click sounds playing)
    const remainingVoices: ActiveAudioNode[] = [];
    activeVoicesListRef.current.forEach((v) => {
      if (v.isUiSound) {
        remainingVoices.push(v);
        return;
      }
      try {
        v.source.stop();
        v.source.disconnect();
        v.gainNode.disconnect();
      } catch (e) { }
    });
    activeVoicesListRef.current = remainingVoices;
    activeAudioNodesRef.current.clear();
  }, []);

  // Robust Audio Playback Helper
  const safePlayAudio = useCallback(async (isDirect: boolean = false) => {
    if (audioRef.current) {
      applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplierRef.current);
      try {
        if (!isDirect && audioPlayPromiseRef.current)
          await audioPlayPromiseRef.current;
        const p = audioRef.current.play();
        audioPlayPromiseRef.current = p;
        if (!isDirect) await p;
        // If direct, we don't await so it returns immediately to keep the stack 'clean'
        p.then(() => {
          if (audioPlayPromiseRef.current === p)
            audioPlayPromiseRef.current = null;
          applyAudioPlaybackRate(audioRef.current, playbackTempoMultiplierRef.current);
          backingPlayAttemptTimeRef.current = null;
          setBackingTrackError(null);
          setBackingTrackStatus("playing");
        }).catch((err) => {
          if (audioPlayPromiseRef.current === p)
            audioPlayPromiseRef.current = null;
          const bType = gameSettingsRef.current?.backingTrack?.type;
          if (err.name !== "AbortError" && bType === "link") {
            setBackingTrackStatus("error");
            setBackingTrackError("Failed to load YouTube / online MP3 audio.");
            setIsBackingTrackOverlayDismissed(false);
          }
        });
      } catch (e: any) {
        audioPlayPromiseRef.current = null;
        const bType = gameSettingsRef.current?.backingTrack?.type;
        if (e.name !== "AbortError") {
          console.error("Audio play error:", e);
          if (bType === "link") {
            setBackingTrackStatus("error");
            setBackingTrackError("Failed to load YouTube / online MP3 audio.");
            setIsBackingTrackOverlayDismissed(false);
          }
        }
      }
    }
  }, []);

  // Robust Audio Pause Helper
  const safePauseAudio = useCallback(async () => {
    if (audioRef.current) {
      if (audioPlayPromiseRef.current) {
        try {
          await audioPlayPromiseRef.current;
        } catch (e) { }
        audioPlayPromiseRef.current = null;
      }
      try {
        audioRef.current.pause();
      } catch (e) { }
    }
  }, []);

  const resumePlaybackFromWait = useCallback(() => {
    const completedBlockTimeMusical = waitingBlockTimeRef.current;
    if (completedBlockTimeMusical === null) return;
    if (waitStartTimeRef.current !== null) {
      accumulatedWaitTimeRef.current +=
        performance.now() - waitStartTimeRef.current;
      waitStartTimeRef.current = null;
    }
    pausedMusicalTimeRef.current = completedBlockTimeMusical;
    setMusicalCurrentTimeMs(completedBlockTimeMusical);
    currentTimeRef.current = completedBlockTimeMusical; // Sync currentTimeRef immediately
    if (resumeIndexRef.current !== null) {
      nextNoteIndexRef.current = resumeIndexRef.current;
      resumeIndexRef.current = null;
    }
    performanceStartTimeRef.current = performance.now();
    audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
    lastPlayerInputRealTimeRef.current = performance.now();
    waitingBlockTimeRef.current = null;
    isWaitStateRef.current = false;
    hasAudioStartedThisStretchRef.current = false;
    updateNotesCurrentlyWaitingFor(new Set<number>());
    notesCurrentlyWaitingForIdsRef.current = new Set<string>();
    setActivePlaybackNotesInfo((prev) => {
      const newMap = new Map(prev);
      const keysToDelete: string[] = [];
      newMap.forEach((v: ActiveMidiNoteInfo, k: string) => {
        if (v.status === "waiting") keysToDelete.push(k);
      });
      keysToDelete.forEach((k) => newMap.delete(k));
      return newMap;
    });

    // Resume AudioContext in case browser suspended it during long wait
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().catch(() => { });
    }
    // Properly seek and resume backing track audio at the correct position
    const currentWait = accumulatedWaitTimeRef.current;
    triggerBackingTrackPlay(completedBlockTimeMusical);
  }, [
    updateNotesCurrentlyWaitingFor,
    playbackTempoMultiplier,
    safePlayAudio,
    safePlayYoutube,
    barLines,
  ]);

  const gameSettingsRef = useRef(gameSettings);
  useEffect(() => {
    gameSettingsRef.current = gameSettings;
  }, [gameSettings]);

  const handleStopPlayback = useCallback(
    async (
      exitFreePlay: boolean = true,
      shouldRewind: boolean = true,
      forceResetToZero: boolean = false,
    ) => {
      if (playtimeStartRef.current !== null) {
        sessionPlaytimeMs.current +=
          performance.now() - playtimeStartRef.current;
      }
      if (isCacheableMode(gameSettingsRef.current)) {
        sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current;
        sessionTotalNotesHit.current += hitCountRef.current;
      }
      sessionPlaytimeMs.current = 0;
      playtimeStartRef.current = null;
      setIsPlaying(false);
      isPlayingRef.current = false;
      isUserPausedRef.current = false;
      setBackingTrackStatus("idle");
      hasAudioStartedThisStretchRef.current = false;
      if (playbackRequestRef.current) {
        cancelAnimationFrame(playbackRequestRef.current);
        playbackRequestRef.current = null;
      }

      if (exitFreePlay) {
        setIsFreePlayMode(false); // Explicitly set to false here
        isFreePlayModeRef.current = false;
      }

      // If we should rewind, trigger rewind instead of instant reset
      if (shouldRewind) {
        setIsRewinding(true);
        isRewindingRef.current = true;

        const rewindTargetTime =
          !forceResetToZero &&
            isLoopingRef.current &&
            loopStartMsRef.current !== null
            ? loopStartMsRef.current
            : 0;

        // Stop audio immediately and pre-seek to offset-adjusted start time (matching handleSeek(0))
        const rewindAudioSec = getAudioStartTime(
          rewindTargetTime / 1000,
          gameSettingsRef.current?.backingTrack?.type,
          gameSettingsRef.current?.backingTrack?.offsetMs || 0,
        );
        if (audioRef.current) {
          await safePauseAudio();
          if (audioRef.current.readyState >= 1) {
            audioRef.current.currentTime = rewindAudioSec;
          }
        }
        if (youtubePlayerRef.current) {
          await safePauseYoutube();
          try {
            youtubePlayerRef.current.seekTo(rewindAudioSec, true);
          } catch (e) { }
        }
        if (audioStartTimeoutRef.current) {
          clearTimeout(audioStartTimeoutRef.current);
          audioStartTimeoutRef.current = null;
        }
        return; // Exit early, the rewind logic will handle the rest
      }

      setFreePlayLiveNotes([]); // Reset Free Play notes
      setFreePlayElapsedTime(0); // Reset Free Play elapsed time
      if (freePlayRequestRef.current) {
        cancelAnimationFrame(freePlayRequestRef.current);
        freePlayRequestRef.current = null;
      }
      beatCountdownInfoRef.current = null;
      setBeatCountdownInfo(null);

      const targetResetMs =
        !forceResetToZero &&
          isLoopingRef.current &&
          loopStartMsRef.current !== null
          ? loopStartMsRef.current
          : 0;

      setMusicalCurrentTimeMs(targetResetMs);
      currentTimeRef.current = targetResetMs;
      pausedMusicalTimeRef.current = targetResetMs;

      let ni = 0;
      while (ni < notesForGame.length && notesForGame[ni].timeMs < targetResetMs)
        ni++;
      nextNoteIndexRef.current = ni;
      missedNoteIndexRef.current = ni;
      nextAutoplayAudioScheduleIndexRef.current = ni;
      scheduledAutoplayNoteIdsRef.current.clear();

      let bi = 0;
      while (bi < barLines.length && barLines[bi] < targetResetMs) bi++;
      nextBarIndexRef.current = bi;

      noteJudgmentsRef.current.clear();
      clearScheduledNotes();
      clearScheduledMetronomeSounds();
      updateNotesCurrentlyWaitingFor(new Set<number>());
      notesCurrentlyWaitingForIdsRef.current = new Set<string>();
      waitingBlockTimeRef.current = null;
      resumeIndexRef.current = null;
      presatisfiedNoteIdsRef.current = new Set<string>();
      setActivePlaybackNotesInfo(new Map());

      hitsAtLastCheckRef.current = 0;
      totalNotesAtLastCheckRef.current = 0;
      lastBarCheckedRef.current = 0;
      if (chordDetectionTimeoutRef.current) {
        clearTimeout(chordDetectionTimeoutRef.current);
        chordDetectionTimeoutRef.current = null;
      }
      loopDelayStartTimeRef.current = null;
      setLoopDelayInfoWithRef(null);
      recentNotesBufferRef.current.clear();
      setDetectedChord(null);
      hitCountRef.current = 0;
      errorCountRef.current = 0;
      perfectCountRef.current = 0;
      greatCountRef.current = 0;
      goodCountRef.current = 0;
      missCountRef.current = 0;
      comboRef.current = 0;
      maxComboRef.current = 0;
      lastJudgmentRef.current = null;
      hitNoteIdsRef.current.clear();

      if (targetResetMs > 0) {
        // Mark notes before loop point A as already processed
        notesForGame.forEach((n) => {
          if (n.timeMs < targetResetMs) {
            hitNoteIdsRef.current.add(n.noteId);
          }
        });
      }

      setHitCount(0);
      setErrorCount(0);
      setPerfectCount(0);
      setGreatCount(0);
      setGoodCount(0);
      setMissCount(0);
      setCombo(0);
      setMaxCombo(0);
      setLastJudgment(null);
      setLiveAccuracy(100);
      setLiveAccuracyRef(100);
      hpRef.current = 100;
      setHp(100);
      setLiveSpeed(100);
      gameRealStartTimeRef.current = null;
      setTotalWaitTimeMs(0);
      accumulatedWaitTimeRef.current = 0;
      waitStartTimeRef.current = null;
      accumulatedPauseTimeRef.current = 0;
      pauseStartTimeRef.current = null;
      accumulatedSeekTimeRef.current = 0;

      const resetAudioSec = getAudioStartTime(
        targetResetMs / 1000,
        gameSettingsRef.current?.backingTrack?.type,
        gameSettingsRef.current?.backingTrack?.offsetMs || 0,
      );
      if (audioRef.current) {
        await safePauseAudio();
        if (audioRef.current.readyState >= 1) {
          audioRef.current.currentTime = resetAudioSec;
        }
      }
      if (youtubePlayerRef.current) {
        await safePauseYoutube();
        try {
          youtubePlayerRef.current.seekTo(resetAudioSec, true);
        } catch (e) { }
      }
      if (audioStartTimeoutRef.current) {
        clearTimeout(audioStartTimeoutRef.current);
        audioStartTimeoutRef.current = null;
      }
    },
    [
      clearScheduledNotes,
      clearScheduledMetronomeSounds,
      updateNotesCurrentlyWaitingFor,
      setIsFreePlayMode,
      safePauseAudio,
      notesForGame,
      barLines,
    ],
  );

  /**
   * Effect to handle the visual rewind animation
   * Triggered when handleStopPlayback sets isRewinding to true
   */
  useEffect(() => {
    if (!isRewinding) return;

    const startValue = currentTimeRef.current;
    const isLoopTarget =
      isLoopingRef.current && loopStartMsRef.current !== null;
    const baseTarget = isLoopTarget ? loopStartMsRef.current! : 0;

    // Target is behind baseTarget to create an overshoot effect, but clamped appropriately
    const overshootAmount = isLoopTarget ? 500 : 1500;
    const targetValue = Math.max(0, baseTarget - overshootAmount);

    // Proportional duration: faster for short distances, but with a minimum for the overshoot
    const distance = Math.abs(startValue - targetValue);
    const duration = Math.min(800, Math.max(300, distance / 15));
    const startTime = performance.now();
    let rafId: number;

    const animateRewind = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quadratic easing for a "fling" that slows down at the very end
      const easedProgress = progress * (2 - progress);

      const current = startValue + (targetValue - startValue) * easedProgress;

      currentTimeRef.current = current;
      setMusicalCurrentTimeMs(current);
      setFreePlayElapsedTime(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animateRewind);
      } else {
        setIsRewinding(false);
        isRewindingRef.current = false;
        // Final full reset to point A (or 0) once overshoot animation is complete
        handleStopPlayback(false, false);
      }
    };

    rafId = requestAnimationFrame(animateRewind);
    return () => cancelAnimationFrame(rafId);
  }, [isRewinding, handleStopPlayback]);

  const handleCloseGameOverModal = useCallback(() => {
    setIsGameOver(false);
    setGameOverReason("");
    handleStopPlayback(false, true);
    stopEndGameSfx();
  }, [handleStopPlayback, stopEndGameSfx]);

  const satisfyUpcomingNote = useCallback(
    (noteDef: MidiNotePlaybackItem) => {
      presatisfiedNoteIdsRef.current.add(noteDef.noteId);
      // In falling/drum modes, neither FallingNotesArea nor PianoKeyboard displays user_played status.
      // Only horizontal/sheet views consume activePlaybackNotesInfo for user_played styling.
      const isSheetView =
        viewMode === "sheet" ||
        viewMode === "sheet-roll" ||
        viewMode === "sheet-qwerty";

      if (isSheetView) {
        setActivePlaybackNotesInfo((prev) =>
          new Map(prev).set(noteDef.noteId, {
            noteId: noteDef.noteId,
            name: noteDef.name,
            timeMs: noteDef.timeMs,
            hand: noteDef.hand,
            midi: noteDef.midi,
            pitchClass: noteDef.pitchClass,
            status: "user_played",
            finger: noteDef.finger,
          }),
        );
        const highlightDurationMs = Math.max(
          60,
          Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) /
          playbackTempoMultiplier,
        );
        if (scheduledNoteTimeoutsRef.current.has(noteDef.noteId)) {
          clearTimeout(scheduledNoteTimeoutsRef.current.get(noteDef.noteId)!);
        }
        scheduledNoteTimeoutsRef.current.set(
          noteDef.noteId,
          window.setTimeout(() => {
            setActivePlaybackNotesInfo((prev) => {
              if (!prev.has(noteDef.noteId)) return prev;
              const nm = new Map(prev);
              nm.delete(noteDef.noteId);
              return nm;
            });
            scheduledNoteTimeoutsRef.current.delete(noteDef.noteId);
          }, highlightDurationMs),
        );
      }
    },
    [viewMode, playbackTempoMultiplier],
  );

  const visuallySatisfyNote = useCallback(
    (noteDef: MidiNotePlaybackItem) => {
      const noteId = noteDef.noteId;
      activeNoteInstancesRef.current.set(noteId, noteDef);

      const isSheetView =
        viewMode === "sheet" ||
        viewMode === "sheet-roll" ||
        viewMode === "sheet-qwerty";

      if (isSheetView) {
        setActivePlaybackNotesInfo((prev) =>
          new Map(prev).set(noteId, {
            noteId,
            name: noteDef.name,
            timeMs: noteDef.timeMs,
            hand: noteDef.hand,
            midi: noteDef.midi,
            pitchClass: noteDef.pitchClass,
            status: "user_played",
            finger: noteDef.finger,
          }),
        );
      }

      if (scheduledNoteTimeoutsRef.current.has(noteId))
        clearTimeout(scheduledNoteTimeoutsRef.current.get(noteId)!);
      scheduledNoteTimeoutsRef.current.set(
        noteId,
        window.setTimeout(
          () => {
            activeNoteInstancesRef.current.delete(noteId);
            scheduledNoteTimeoutsRef.current.delete(noteId);
            if (isSheetView) {
              setActivePlaybackNotesInfo((prev) => {
                if (!prev.has(noteId)) return prev;
                const nm = new Map(prev);
                nm.delete(noteId);
                return nm;
              });
            }
          },
          Math.min(
            tapOnlyMode ? getMajorNoteVisualDurationMs(getActiveTempoBpmAtOriginalTime(noteDef.timeMs, tempoEvents, currentTempoBpm ?? DEFAULT_MUSICXML_TEMPO_BPM)) : noteDef.durationMs,
            VISUAL_NOTE_CAP_MS,
          ) /
          playbackTempoMultiplier,
        ),
      );
    },
    [
      currentTempoBpm,
      playbackTempoMultiplier,
      tapOnlyMode,
      tempoEvents,
      viewMode,
    ],
  );

  const uploadSessionStats = useCallback(async () => {
    const playtimeToAdd = Math.round(sessionTotalPlaytimeMs.current);
    const notesHitToAdd = sessionTotalNotesHit.current;
    if (!session || (playtimeToAdd === 0 && notesHitToAdd === 0)) return;
    try {
      const { error } = await supabase.rpc("increment_user_stats", {
        playtime_ms_to_add: playtimeToAdd,
        notes_hit_to_add: notesHitToAdd,
      });
      if (!error) {
        sessionTotalPlaytimeMs.current = 0;
        sessionTotalNotesHit.current = 0;
      }
    } catch (e) {
      console.error("Error calling RPC to upload stats:", e);
    }
  }, [session]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const handlePageHide = () => {
      if (isPlayingRef.current && playtimeStartRef.current !== null) {
        const finalPlaytimeChunk = performance.now() - playtimeStartRef.current;
        sessionPlaytimeMs.current += finalPlaytimeChunk;
        if (isCacheableMode(gameSettingsRef.current)) {
          sessionTotalPlaytimeMs.current += sessionPlaytimeMs.current;
          sessionTotalNotesHit.current += hitCountRef.current;
        }
      }
      const playtimeToAdd = Math.round(sessionTotalPlaytimeMs.current);
      const notesHitToAdd = sessionTotalNotesHit.current;
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      const currentSession = sessionRef.current;
      if (
        !currentSession ||
        !supabaseUrl ||
        !supabaseAnonKey ||
        (playtimeToAdd === 0 && notesHitToAdd === 0)
      )
        return;
      const payload = {
        playtime_ms_to_add: playtimeToAdd,
        notes_hit_to_add: notesHitToAdd,
      };
      const rpcUrl = `${supabaseUrl}/rest/v1/rpc/increment_user_stats`;
      const headers = {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${currentSession.access_token}`,
        "Content-Type": "application/json",
      };
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        fetch(rpcUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  // Fallback & Watchdog Effect for YouTube / Online MP3 Backing Track
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const backing = gameSettingsRef.current?.backingTrack;
      if (!backing || backing.type === 'none' || backing.type === 'mp3') return;

      const now = performance.now();
      const attemptTime = backingPlayAttemptTimeRef.current;
      const elapsedSinceAttempt = attemptTime !== null ? now - attemptTime : 0;

      if (backing.type === 'link') {
        const audio = audioRef.current;
        if (audio && !audio.paused && audio.currentTime > 0 && !audio.error) {
          backingPlayAttemptTimeRef.current = null;
          setBackingTrackError(null);
          if (backingTrackStatusRef.current !== 'playing') {
            setBackingTrackStatus('playing');
          }
        } else if (audio?.error || (!isWaitStateRef.current && attemptTime !== null && elapsedSinceAttempt > 4000)) {
          if (backingTrackStatusRef.current !== 'error') {
            setBackingTrackStatus('error');
            setBackingTrackError('Failed to load YouTube / online MP3 audio.');
            setIsBackingTrackOverlayDismissed(false);
          }
        }
      } else if (backing.type === 'youtube') {
        const yt = youtubePlayerRef.current;
        if (yt && typeof yt.getPlayerState === 'function') {
          let state = -1;
          try {
            state = yt.getPlayerState();
          } catch (e) {}
          if (state === 1) { // 1 = YT.PlayerState.PLAYING
            backingPlayAttemptTimeRef.current = null;
            setBackingTrackError(null);
            if (backingTrackStatusRef.current !== 'playing') {
              setBackingTrackStatus('playing');
            }
          } else if (!isWaitStateRef.current && attemptTime !== null && elapsedSinceAttempt > 3800) {
            if (backingTrackStatusRef.current !== 'error') {
              setBackingTrackStatus('error');
              setBackingTrackError('Failed to load YouTube audio.');
              setIsBackingTrackOverlayDismissed(false);
            }
          }
        } else if (!isWaitStateRef.current && attemptTime !== null && elapsedSinceAttempt > 4500) {
          if (backingTrackStatusRef.current !== 'error') {
            setBackingTrackStatus('error');
            setBackingTrackError('Failed to load YouTube audio.');
            setIsBackingTrackOverlayDismissed(false);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, backingTrackStatus]);

  const handleSeek = useCallback(
    async (t: number, skipPause: boolean = false) => {
      setIsRewinding(false);
      isRewindingRef.current = false;

      // User request: No automatic pause when seeking
      // if (isPlayingRef.current && !skipPause) {
      //   handlePause();
      // }

      let targetTime = t;

      const currentPlaybackTempoMultiplier = playbackTempoMultiplierRef.current;
      if (waitMode === "retical") return;
      const cl = Math.max(0, Math.min(targetTime, totalDurationWithEndDelayMs));
      const timeBeforeSeek = currentTimeRef.current;
      clearScheduledNotes();
      clearScheduledMetronomeSounds();
      presatisfiedNoteIdsRef.current = new Set<string>();
      updateNotesCurrentlyWaitingFor(new Set<number>());
      notesCurrentlyWaitingForIdsRef.current = new Set<string>();
      waitingBlockTimeRef.current = null;
      currentTimeRef.current = cl;
      pausedMusicalTimeRef.current = cl;
      const scaledCl = cl / currentPlaybackTempoMultiplier;
      const startIndex = allBeatTimesRef.current.findIndex(
        (b) => b.timeMs >= scaledCl - 0.001,
      );
      nextBeatToScheduleIndexRef.current =
        startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
      prevConceptualTimeRef.current = cl;
      const isAutoplay =
        !isCalibratingRef.current &&
        (gameSettingsRef.current?.isAutoplay ??
          (waitMode === "off" && !isLearnModeActiveRef.current));
      const notes =
        notesForGameRef.current.length > 0 ? notesForGameRef.current : notesForGame;
      if (isAutoplay) {
        const b = notes.filter((n) => n.timeMs < cl);
        hitNoteIdsRef.current = new Set(b.map((n) => n.noteId));
        const count = hitNoteIdsRef.current.size;
        setHitCount(count);
        hitCountRef.current = count;
        setPerfectCount(count);
        perfectCountRef.current = count;
        setCombo(count);
        comboRef.current = count;
        setErrorCount(0);
        setTotalWaitTimeMs(0);
        accumulatedWaitTimeRef.current = 0;
        playerInputTimesRef.current = [];
        firstInputRealTimeRef.current = null;
        lastInputRealTimeRef.current = null;
        if (gameRealStartTimeRef.current !== null) {
          gameRealStartTimeRef.current =
            performance.now() - cl / currentPlaybackTempoMultiplier;
        }
        accumulatedPauseTimeRef.current = 0;
        pauseStartTimeRef.current = null;
        accumulatedSeekTimeRef.current = 0;
      } else {
        const isNonStop =
          (gameSettingsRef.current?.isNonStop ?? false) ||
          (gameSettingsRef.current?.waitMode || waitMode) === "retical" ||
          (gameSettingsRef.current?.waitMode || waitMode) === "off";
        if (isNonStop) {
          notes.forEach((n) => {
            if (n.timeMs < cl) {
              if (!noteJudgmentsRef.current.has(n.noteId)) {
                noteJudgmentsRef.current.set(n.noteId, "miss");
                hitNoteIdsRef.current.add(n.noteId);
              }
            } else {
              noteJudgmentsRef.current.delete(n.noteId);
              hitNoteIdsRef.current.delete(n.noteId);
            }
          });

          let p = 0,
            gr = 0,
            go = 0,
            m = 0,
            c = 0;
          for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            if (n.timeMs >= cl) break;
            const j = noteJudgmentsRef.current.get(n.noteId);
            if (j === "perfect") {
              p++;
              c++;
            } else if (j === "great") {
              gr++;
              c++;
            } else if (j === "good") {
              go++;
              c++;
            } else if (j === "miss") {
              m++;
              c = 0;
            }
          }
          setPerfectCount(p);
          perfectCountRef.current = p;
          setGreatCount(gr);
          greatCountRef.current = gr;
          setGoodCount(go);
          goodCountRef.current = go;
          setMissCount(m);
          missCountRef.current = m;
          setCombo(c);
          comboRef.current = c;
          setHitCount(hitNoteIdsRef.current.size);
          accumulatedSeekTimeRef.current += cl - timeBeforeSeek;
        } else {
          hitNoteIdsRef.current = new Set(
            Array.from(hitNoteIdsRef.current).filter((id) => {
              const n = notes.find((x) => x.noteId === id);
              return n && n.timeMs < cl;
            }),
          );
          setHitCount(hitNoteIdsRef.current.size);
          accumulatedSeekTimeRef.current += cl - timeBeforeSeek;
        }
      }
      setPerformanceSummary(null);
      if (waitStartTimeRef.current !== null) {
        accumulatedWaitTimeRef.current +=
          performance.now() - waitStartTimeRef.current;
      }
      waitStartTimeRef.current = null;
      pausedMusicalTimeRef.current = cl;
      setMusicalCurrentTimeMs(cl);
      currentTimeRef.current = cl;
      prevMusicalTimeRef.current = cl;
      hasAudioStartedThisStretchRef.current = false;
      const currentBacking = gameSettingsRef.current?.backingTrack;
      if (currentBacking && (currentBacking.type === "youtube" || currentBacking.type === "link") && currentBacking.url) {
        if (backingTrackStatusRef.current !== "error") {
          setBackingTrackStatus("loading");
        }
      } else {
        setBackingTrackStatus("playing");
      }
      let ni = 0;
      while (ni < notes.length && notes[ni].timeMs < cl) ni++;
      nextNoteIndexRef.current = ni;
      missedNoteIndexRef.current = ni;
      nextAutoplayAudioScheduleIndexRef.current = ni;
      scheduledAutoplayNoteIdsRef.current.clear();
      if (isPlayingRef.current) {
        performanceStartTimeRef.current = performance.now();
        audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
        isUserPausedRef.current = false;
      }
      lastSeekTimeRef.current = performance.now();
      loopDelayStartTimeRef.current = null;
      setLoopDelayInfoWithRef(null);
      if (beatCountdownInfoRef.current) {
        const ci = beatCountdownInfoRef.current;
        if (cl < ci.startTimeMs - 100 || cl > ci.targetTimeMs + 450) {
          beatCountdownInfoRef.current = null;
          setBeatCountdownInfo(null);
        }
      }
      const backing = gameSettingsRef.current?.backingTrack;
      if (backing && backing.type !== "none") {
        if (isPlayingRef.current) {
          triggerBackingTrackPlay(cl);
        } else {
          // Paused seeking (matching MidiEditor offset math)
          const defaultOffset = backing.offsetMs || 0;
          const userMs = userAudioSyncOffsetRef.current;
          const totalOffsetMs = defaultOffset + userMs;
          const midiStartMs = cl - INITIAL_PLAYBACK_DELAY_MS;
          const clampedTime = Math.max(0, midiStartMs + totalOffsetMs) / 1000;
          if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
            if (audioRef.current.readyState >= 1) {
              audioRef.current.currentTime = clampedTime;
            }
          } else if (backing.type === "youtube" && youtubePlayerRef.current) {
            try { youtubePlayerRef.current.seekTo(clampedTime, true); } catch (e) { }
          }
        }
      }
    },
    [
      notesForGame,
      totalDurationWithEndDelayMs,
      clearScheduledNotes,
      updateNotesCurrentlyWaitingFor,
      clearScheduledMetronomeSounds,
      waitMode,
      safePlayAudio,
      safePauseAudio,
      barLines,
    ],
  );

  useEffect(() => {
    handleSeekRef.current = handleSeek;
  }, [handleSeek]);

  const handleProgressBarSeek = useCallback(
    (t: number) => {
      if (metronomeMode === "bar") {
        if (barLines.length === 0) {
          handleSeek(t);
          return;
        }
        const closestBar = barLines.reduce((prev, curr) =>
          Math.abs(curr - t) < Math.abs(prev - t) ? curr : prev,
        );
        handleSeek(closestBar);
      } else if (metronomeMode === "beat") {
        if (allBeatTimesRef.current.length === 0) {
          handleSeek(t);
          return;
        }
        const t_scaled = t / playbackTempoMultiplier;
        const closestBeat_scaled = allBeatTimesRef.current.reduce(
          (prev, curr) =>
            Math.abs(curr.timeMs - t_scaled) < Math.abs(prev.timeMs - t_scaled)
              ? curr
              : prev,
          allBeatTimesRef.current[0] || { timeMs: 0 },
        );
        handleSeek(closestBeat_scaled.timeMs * playbackTempoMultiplier);
      } else {
        handleSeek(t);
      }
    },
    [metronomeMode, barLines, playbackTempoMultiplier, handleSeek],
  );

  const handleBarNavigation = useCallback(
    (dir: "forward" | "backward") => {
      if (
        waitMode === "retical" ||
        metronomeMode === "off"
      )
        return;
      const cur = currentTimeRef.current;
      let targetTime: number | undefined;
      if (metronomeMode === "bar") {
        if (barLines.length === 0) return;
        const nextIdx = barLines.findIndex((b) => b > cur + 50);
        let targetBarIndex;
        if (dir === "forward") {
          targetBarIndex = nextIdx !== -1 ? nextIdx : barLines.length - 1;
          targetTime = barLines[targetBarIndex];
        } else {
          const hexIdx = nextIdx !== -1 ? nextIdx - 1 : barLines.length - 1;
          if (hexIdx < 0) {
            targetTime = 0;
          } else {
            targetBarIndex =
              cur - barLines[hexIdx] < 100 ? Math.max(0, hexIdx - 1) : hexIdx;
            if (hexIdx === 0 && cur - barLines[0] < 100) {
              targetTime = 0;
            } else {
              targetTime = barLines[targetBarIndex];
            }
          }
        }
      } else {
        if (allBeatTimesRef.current.length === 0) return;
        const scaledCurrentTime = cur / playbackTempoMultiplier;
        if (dir === "forward") {
          const nextBeat = allBeatTimesRef.current.find(
            (b) => b.timeMs > scaledCurrentTime + 10,
          );
          if (nextBeat) targetTime = nextBeat.timeMs * playbackTempoMultiplier;
        } else {
          const prevBeats = allBeatTimesRef.current.filter(
            (b) => b.timeMs < scaledCurrentTime - 10,
          );
          if (prevBeats.length > 0)
            targetTime =
              prevBeats[prevBeats.length - 1].timeMs * playbackTempoMultiplier;
          else targetTime = 0;
        }
      }
      if (targetTime !== undefined) handleSeek(targetTime);
    },
    [notesForGame.length, barLines, handleSeek, waitMode, metronomeMode],
  );

  const lastLiveSpeedUpdateRef = useRef<number>(0);
  const lastLiveAccuracyUpdateRef = useRef<number>(0);
  const lastLiveAccuracyValRef = useRef<number>(100);
  const lastTotalWaitTimeUpdateRef = useRef<number>(0);
  const lastMusicalTimeUpdateRef = useRef<number>(0);

  const playbackLoop = useCallback(async () => {
    try {
      const notes = notesForGameRef.current.length > 0 ? notesForGameRef.current : notesForGame;
      const currentPlaybackTempoMultiplier = Math.max(0.1, playbackTempoMultiplierRef.current);
      const currentWaitMode = isFreePlayModeRef.current
        ? "off"
        : (gameSettingsRef.current?.waitMode || "strict");
      const isAutoplay =
        !isCalibratingRef.current &&
        (gameSettingsRef.current?.isAutoplay ??
          (currentWaitMode === "off" && !isLearnModeActiveRef.current));
      const isNonStop =
        (gameSettingsRef.current?.isNonStop ?? false) ||
        currentWaitMode === "retical" ||
        currentWaitMode === "off";

      const backing = gameSettingsRef.current?.backingTrack;
      const isNoneBacking = !backing || backing.type === "none";

      if (isPlayingRef.current && !hasAudioStartedThisStretchRef.current) {
        if (isNoneBacking) {
          hasAudioStartedThisStretchRef.current = true;
          if (backingTrackStatus !== "playing") setBackingTrackStatus("playing");
        } else if (backing && !isWaitStateRef.current) {
          const currentEstTime = pausedMusicalTimeRef.current + (performance.now() - performanceStartTimeRef.current) * currentPlaybackTempoMultiplier;
          triggerBackingTrackPlay(currentEstTime);
        }
      }

      const canWait =
        currentWaitMode === "strict" ||
        currentWaitMode === "rhythm" ||
        currentWaitMode === "retical";
      const isInWaitState =
        !isNonStop &&
        canWait &&
        notesCurrentlyWaitingForRef.current.size > 0 &&
        waitingBlockTimeRef.current !== null;
      isWaitStateRef.current = isInWaitState;

      if (!isPlayingRef.current) {
        if (playbackRequestRef.current)
          cancelAnimationFrame(playbackRequestRef.current);
        playbackRequestRef.current = null;
        return;
      }
      const currentRealTime = performance.now();

      // Handle loop delay (dynamic duration, e.g. 2000ms or 3000ms)
      if (loopDelayStartTimeRef.current !== null) {
        const elapsed = currentRealTime - loopDelayStartTimeRef.current;
        const delayDuration = loopDelayInfoRef.current?.duration ?? 2000;
        if (elapsed < delayDuration) {
          currentTimeRef.current = loopStartMsRef.current!;
          setMusicalCurrentTimeMs(loopStartMsRef.current!);
          playbackRequestRef.current = requestAnimationFrame(() => playbackLoopRef.current());
          return;
        } else {
          loopDelayStartTimeRef.current = null;
          setLoopDelayInfoWithRef(null);
          performanceStartTimeRef.current = performance.now();
          audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
          pausedMusicalTimeRef.current = loopStartMsRef.current!;
          currentTimeRef.current = loopStartMsRef.current!;

          // Re-sync metronome index just in case it drifted or was affected by stale refs
          const currentMultiplier = Math.max(0.1, playbackTempoMultiplierRef.current);
          const scaledTarget = loopStartMsRef.current! / currentMultiplier;
          const startIndex = allBeatTimesRef.current.findIndex(
            (b) => b.timeMs >= scaledTarget - 0.001,
          );
          nextBeatToScheduleIndexRef.current =
            startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
          prevConceptualTimeRef.current = loopStartMsRef.current!;

          if (!isNoneBacking && backing) {
            triggerBackingTrackPlay(loopStartMsRef.current!);
          }
        }
      }

      const realTimeElapsedSinceStartOrPause = performance.now() - performanceStartTimeRef.current;
      const conceptualMusicalTimeNoFreeze = pausedMusicalTimeRef.current + realTimeElapsedSinceStartOrPause * currentPlaybackTempoMultiplier;

      const conceptualMusicalTime = conceptualMusicalTimeNoFreeze;

      // Initial sync (No more nudging)

      if (
        beatCountdownInfoRef.current &&
        conceptualMusicalTime > beatCountdownInfoRef.current.targetTimeMs + 450
      ) {
        beatCountdownInfoRef.current = null;
        setBeatCountdownInfo(null);
      }

      // Looping logic
      if (
        isLoopingRef.current &&
        loopStartMsRef.current !== null &&
        loopEndMsRef.current !== null &&
        loopEndMsRef.current > loopStartMsRef.current &&
        conceptualMusicalTime >= loopEndMsRef.current &&
        (conceptualMusicalTime >= 100 || loopEndMsRef.current >= 100)
      ) {
        startLoopWithPreRollRef.current?.();
        return;
      }

      // Backing track sync works identically to MidiEditor:
      // Synchronized cleanly once on Play / Seek / Resume without continuous per-frame re-seeking or rate nudging.

      let actualMusicalTimeForGameLogic: number;
      if (isInWaitState) {
        actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!;
        if (waitStartTimeRef.current === null) {
          waitStartTimeRef.current = performance.now();
          if (audioStartTimeoutRef.current) {
            clearTimeout(audioStartTimeoutRef.current);
            audioStartTimeoutRef.current = null;
          }
          if (audioRef.current && !audioRef.current.paused) safePauseAudio();
          if (youtubePlayerRef.current) {
            try {
              if (
                typeof youtubePlayerRef.current.getPlayerState === "function" &&
                youtubePlayerRef.current.getPlayerState() === 1
              ) {
                safePauseYoutube();
              }
            } catch (e) { }
          }
        }

        if (currentRealTime - lastTotalWaitTimeUpdateRef.current > 100) {
          setTotalWaitTimeMs(
            accumulatedWaitTimeRef.current +
            (currentRealTime - waitStartTimeRef.current),
          );
          lastTotalWaitTimeUpdateRef.current = currentRealTime;
        }

        if (musicalCurrentTimeMsRef.current !== actualMusicalTimeForGameLogic) {
          musicalCurrentTimeMsRef.current = actualMusicalTimeForGameLogic;
          setMusicalCurrentTimeMs(actualMusicalTimeForGameLogic);
        }
      } else {
        actualMusicalTimeForGameLogic = conceptualMusicalTime;
        // Animation time update - cap at ~60fps even on high refresh screens to save CPU
        if (currentRealTime - lastMusicalTimeUpdateRef.current > 16) {
          musicalCurrentTimeMsRef.current = conceptualMusicalTime;
          setMusicalCurrentTimeMs(conceptualMusicalTime);
          lastMusicalTimeUpdateRef.current = currentRealTime;
        }

        if (lastPushedTotalWaitTimeMsRef.current !== accumulatedWaitTimeRef.current) {
          setTotalWaitTimeMs(accumulatedWaitTimeRef.current);
          lastPushedTotalWaitTimeMsRef.current = accumulatedWaitTimeRef.current;
        }
      }


      // Check for bar crossing.
      if (
        nextBarIndexRef.current < barLines.length &&
        actualMusicalTimeForGameLogic >= barLines[nextBarIndexRef.current]
      ) {
        nextBarIndexRef.current++;
      }

      currentTimeRef.current = actualMusicalTimeForGameLogic;
      prevMusicalTimeRef.current = actualMusicalTimeForGameLogic;
      let calculatedLiveSpeed = 100;
      if (isPlayingRef.current && gameRealStartTimeRef.current !== null) {
        const idealTimePlayedMs =
          currentTimeRef.current - accumulatedSeekTimeRef.current;
        const idealTimeElapsedSoFar =
          idealTimePlayedMs / currentPlaybackTempoMultiplier;
        const actualDurationSoFar =
          performance.now() -
          gameRealStartTimeRef.current -
          accumulatedPauseTimeRef.current;
        calculatedLiveSpeed =
          actualDurationSoFar > 500 && idealTimeElapsedSoFar > 0
            ? Math.min(100, (idealTimeElapsedSoFar / actualDurationSoFar) * 100)
            : 100;
        if (waitMode === "off" && !isCalibratingRef.current) {
          calculatedLiveSpeed = 100;
        }

        if (currentRealTime - lastLiveSpeedUpdateRef.current > 250) {
          setLiveSpeed(calculatedLiveSpeed);
          lastLiveSpeedUpdateRef.current = currentRealTime;
        }
      }
      if (
        isPlayingRef.current &&
        metronomeMode !== "off" &&
        audioContextRef.current &&
        allBeatTimesRef.current.length > 0
      ) {
        const audioCtx = audioContextRef.current;
        const schedulingLookaheadRealMs = 500;
        const idealCurrentTimeRealMs =
          currentTimeRef.current / currentPlaybackTempoMultiplier;
        const lookaheadIdealTimeRealMs =
          idealCurrentTimeRealMs + schedulingLookaheadRealMs;
        let nextIndex = nextBeatToScheduleIndexRef.current;
        while (
          nextIndex < allBeatTimesRef.current.length &&
          allBeatTimesRef.current[nextIndex].timeMs < lookaheadIdealTimeRealMs
        ) {
          const beat = allBeatTimesRef.current[nextIndex];
          const shouldScheduleSound =
            metronomeMode === "beat" ||
            (metronomeMode === "bar" && beat.isStrong);
          if (shouldScheduleSound) {
            const timeUntilBeatPlaysRealMs =
              beat.timeMs - idealCurrentTimeRealMs;

            // Scheduling logic: Use a high-precision target time with Metronome & Piano Offset.
            const targetAudioContextTime =
              audioCtx.currentTime +
              (timeUntilBeatPlaysRealMs - metronomePianoOffsetMsRef.current) / 1000;

            if (timeUntilBeatPlaysRealMs > -100) {
              const scheduleTime = Math.max(audioCtx.currentTime, targetAudioContextTime);
              const buffer = beat.isStrong
                ? metronomeBuffersRef.current.strong
                : metronomeBuffersRef.current.weak;
              if (buffer && metronomeGainRef.current) {
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                const gainNode = audioCtx.createGain();
                gainNode.gain.setValueAtTime(1.0, scheduleTime);
                gainNode.gain.exponentialRampToValueAtTime(
                  0.0001,
                  scheduleTime + buffer.duration * 0.9,
                );
                source.connect(gainNode);
                gainNode.connect(metronomeGainRef.current);
                source.start(scheduleTime);
                const nodeRecord = { source, gainNode };
                source.onended = () => {
                  const index =
                    scheduledMetronomeAudioNodesRef.current.indexOf(nodeRecord);
                  if (index > -1)
                    scheduledMetronomeAudioNodesRef.current.splice(index, 1);
                };
                scheduledMetronomeAudioNodesRef.current.push(
                  nodeRecord,
                );
              }
            }
          }
          nextIndex++;
        }
        nextBeatToScheduleIndexRef.current = nextIndex;
        const lastIdealTimeRealMs =
          prevConceptualTimeRef.current / playbackTempoMultiplier;
        const beatForVisuals = allBeatTimesRef.current.find(
          (beat) =>
            beat.timeMs > lastIdealTimeRealMs &&
            beat.timeMs <= idealCurrentTimeRealMs,
        );
        if (beatForVisuals) {
          const beatType = beatForVisuals.isStrong ? "strong" : "weak";
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

      // Autoplay Lookahead Audio Scheduling:
      // When isAutoplay is true, schedule notes ahead into the Web Audio API hardware timeline (lookahead 250ms).
      // This ensures fast notes (trills, arpeggios, 32nds) are triggered sequentially with sub-millisecond precision
      // rather than all notes in a single RAF frame starting at the exact same audio time.
      if (
        isPlayingRef.current &&
        isAutoplay &&
        audioContextRef.current
      ) {
        const audioCtx = audioContextRef.current;
        const lookaheadRealMs = 250;
        const lookaheadMusicalMs = lookaheadRealMs * currentPlaybackTempoMultiplier;
        const lookaheadTargetMusicalTime = currentTimeRef.current + lookaheadMusicalMs;

        let schedIdx = nextAutoplayAudioScheduleIndexRef.current;
        while (schedIdx < notes.length) {
          const note = notes[schedIdx];
          if (note.timeMs <= lookaheadTargetMusicalTime) {
            const noteId = note.noteId;
            if (
              !scheduledAutoplayNoteIdsRef.current.has(noteId) &&
              !presatisfiedNoteIdsRef.current.has(noteId)
            ) {
              scheduledAutoplayNoteIdsRef.current.add(noteId);
              const soundVelocity = isSettingsPreviewActiveRef.current
                ? note.velocity * 0.25
                : note.velocity;
              const timeUntilNotePlaysRealSec = Math.max(
                0,
                (note.timeMs - currentTimeRef.current) / (1000 * currentPlaybackTempoMultiplier),
              );
              const targetAudioTime = audioCtx.currentTime + timeUntilNotePlaysRealSec;

              playSound(
                note.midi,
                getPianoPlaybackDurationMs(note),
                soundVelocity,
                targetAudioTime,
              );
            }
            schedIdx++;
          } else {
            break;
          }
        }
        nextAutoplayAudioScheduleIndexRef.current = schedIdx;
      }

      let currentProcessingIdx = nextNoteIndexRef.current;
      const notesToSetWaitingThisFrame: MidiNotePlaybackItem[] = [];
      while (currentProcessingIdx < notes.length) {
        const note = notes[currentProcessingIdx];
        if (currentTimeRef.current >= note.timeMs) {
          if (presatisfiedNoteIdsRef.current.has(note.noteId)) {
            presatisfiedNoteIdsRef.current.delete(note.noteId);
            currentProcessingIdx++;
            continue;
          }
          if (isAutoplay) {
            const noteId = note.noteId;
            if (!activeNoteInstancesRef.current.has(noteId)) {
              // Note audio has already been scheduled ahead with exact hardware timing!
              // Fallback only if note was not previously scheduled (e.g. note at exact time 0)
              if (!scheduledAutoplayNoteIdsRef.current.has(noteId)) {
                scheduledAutoplayNoteIdsRef.current.add(noteId);
                const soundVelocity = isSettingsPreviewActiveRef.current
                  ? note.velocity * 0.25
                  : note.velocity;
                playSound(
                  note.midi,
                  getPianoPlaybackDurationMs(note),
                  soundVelocity,
                );
              }
              activeNoteInstancesRef.current.set(noteId, note);

              if (!hitNoteIdsRef.current.has(noteId) && !isCalibratingRef.current) {
                // In Autoplay (waitMode === 'off'), notes are automatically hit as "Perfect"
                setPerfectCount((prev) => prev + 1);
                perfectCountRef.current += 1;
                setHitCount((prev) => prev + 1);
                hitCountRef.current += 1;
                hitNoteIdsRef.current.add(noteId);
                changeHp(4.0);

                setCombo((prev) => {
                  const next = prev + 1;
                  if (next > maxComboRef.current) {
                    setMaxCombo(next);
                    maxComboRef.current = next;
                  }
                  return next;
                });
                comboRef.current += 1;
                setLastJudgment("perfect");
                lastJudgmentRef.current = "perfect";
              }
              setActivePlaybackNotesInfo((prev) => {
                const nm = new Map(prev);
                for (const [existingId, existingInfo] of nm.entries()) {
                  if (
                    existingInfo.status === "user_played" &&
                    (existingInfo.hand === note.hand || existingInfo.midi === note.midi) &&
                    existingId !== noteId &&
                    note.timeMs - existingInfo.timeMs > 15
                  ) {
                    nm.delete(existingId);
                    activeNoteInstancesRef.current.delete(existingId);
                    const t = scheduledNoteTimeoutsRef.current.get(existingId);
                    if (t) {
                      clearTimeout(t);
                      scheduledNoteTimeoutsRef.current.delete(existingId);
                    }
                  }
                }
                nm.set(noteId, {
                  noteId,
                  name: note.name,
                  timeMs: note.timeMs,
                  hand: note.hand,
                  midi: note.midi,
                  pitchClass: note.pitchClass,
                  status: "user_played",
                  finger: note.finger,
                });
                return nm;
              });
              const baseVisualDur =
                sequentialVisualDurationByNoteId.get(noteId) ??
                Math.min(
                  tapOnlyMode
                    ? getMajorNoteVisualDurationMs(
                        getActiveTempoBpmAtOriginalTime(
                          note.timeMs,
                          tempoEvents,
                          currentTempoBpm ?? DEFAULT_MUSICXML_TEMPO_BPM,
                        ),
                      )
                    : note.durationMs,
                  VISUAL_NOTE_CAP_MS,
                );
              const hd = baseVisualDur / playbackTempoMultiplier;
              scheduledNoteTimeoutsRef.current.set(
                noteId,
                window.setTimeout(() => {
                  activeNoteInstancesRef.current.delete(noteId);
                  scheduledNoteTimeoutsRef.current.delete(noteId);
                  setActivePlaybackNotesInfo((prev) => {
                    const nm = new Map(prev);
                    nm.delete(noteId);
                    return nm;
                  });
                }, hd),
              );
            }
          } else {
            if (!isNonStop) notesToSetWaitingThisFrame.push(note);
          }
          currentProcessingIdx++;
        } else break;
      }
      if (!isNonStop && canWait && notesToSetWaitingThisFrame.length > 0) {
        const firstDueNote = notesToSetWaitingThisFrame[0],
          blockStartTime = firstDueNote.timeMs;
        let chordWindowMs =
          gameSettings?.noteToleranceMs ??
          (instrumentMode === "piano" ? 200 : 100);
        const chordBlock = notesToSetWaitingThisFrame.filter(
          (n) => n.timeMs - blockStartTime < chordWindowMs,
        );
        let lookaheadIndex = currentProcessingIdx;
        while (lookaheadIndex < notes.length) {
          const n = notes[lookaheadIndex];
          if (n.timeMs - blockStartTime < chordWindowMs) {
            if (!presatisfiedNoteIdsRef.current.has(n.noteId))
              chordBlock.push(n);
            lookaheadIndex++;
          } else break;
        }
        if (chordBlock.length > 0) {
          waitingBlockTimeRef.current = blockStartTime;
          resumeIndexRef.current = lookaheadIndex;
          // Clear any stale hit records so waiting notes are guaranteed to register on keypress in wait mode
          chordBlock.forEach((n) => {
            hitNoteIdsRef.current.delete(n.noteId);
            presatisfiedNoteIdsRef.current.delete(n.noteId);
          });
          notesCurrentlyWaitingForIdsRef.current = new Set<string>(
            chordBlock.map((n) => n.noteId),
          );
          updateNotesCurrentlyWaitingFor(
            new Set<number>(chordBlock.map((n) => n.midi)),
          );
          setActivePlaybackNotesInfo((prev) => {
            const nm = new Map(prev);
            chordBlock.forEach((n) =>
              nm.set(n.noteId, {
                noteId: n.noteId,
                name: n.name,
                timeMs: n.timeMs,
                hand: n.hand,
                midi: n.midi,
                pitchClass: n.pitchClass,
                status: "waiting",
                finger: n.finger,
              }),
            );
            return nm;
          });
          currentProcessingIdx = lookaheadIndex;
        }
      }
      nextNoteIndexRef.current = currentProcessingIdx;
      let calculatedLiveAccuracy = 100;
      if (isPlayingRef.current) {
        const isNonStop =
          (gameSettingsRef.current?.isNonStop ?? false) ||
          currentWaitMode === "retical" ||
          currentWaitMode === "off";
        if (isNonStop && !isAutoplay) {
          let mi = missedNoteIndexRef.current;
          const goodWindow =
            gameSettingsRef.current?.noteToleranceMs ??
            (instrumentMode === "piano" ? 200 : 100);
          while (mi < notes.length) {
            const note = notes[mi];
            const compensatedNoteTime = note.timeMs - (noteOffsetMsRef.current * currentPlaybackTempoMultiplier);
            const noteToleranceMusical = goodWindow * currentPlaybackTempoMultiplier;
            if (currentTimeRef.current > compensatedNoteTime + noteToleranceMusical) {
              if (!hitNoteIdsRef.current.has(note.noteId)) {
                setMissCount((p) => p + 1);
                missCountRef.current += 1;
                setCombo(0);
                comboRef.current = 0;
                setLastJudgment("miss");
                lastJudgmentRef.current = "miss";
                hitNoteIdsRef.current.add(note.noteId);
                noteJudgmentsRef.current.set(note.noteId, "miss");
                changeHp(-10.0);
              }
              mi++;
            } else {
              break;
            }
          }
          missedNoteIndexRef.current = mi;

          const weightedScore =
            perfectCountRef.current * 1.0 +
            greatCountRef.current * 0.3333333333 +
            goodCountRef.current * 0.1666666667;
          const totalEncounteredSoFar = currentProcessingIdx;
          calculatedLiveAccuracy =
            totalEncounteredSoFar > 0
              ? (weightedScore / totalEncounteredSoFar) * 100
              : 100;
        } else if (!isAutoplay) {
          const currentHits = hitCountRef.current;
          const currentErrors = isAudioInputEnabledRef.current
            ? 0
            : errorCountRef.current;

          // Old formula for non-stop disabled: hit / (hit + error)
          const totalAttempts = currentHits + currentErrors;
          calculatedLiveAccuracy =
            totalAttempts > 0 ? (currentHits / totalAttempts) * 100 : 100;
        }
        if (isAutoplay) {
          calculatedLiveAccuracy = 100;
        }
        if (currentRealTime - lastLiveAccuracyUpdateRef.current > 250) {
          const roundedAcc = Math.round(calculatedLiveAccuracy * 10) / 10;
          if (roundedAcc !== lastLiveAccuracyValRef.current) {
            setLiveAccuracy(roundedAcc);
            lastLiveAccuracyValRef.current = roundedAcc;
          }
          lastLiveAccuracyUpdateRef.current = currentRealTime;
        }
      }

      // 5-second chunk check removed so players only fail based on HP

      if (
        actualMusicalTimeForGameLogic >= totalDurationWithEndDelayMs &&
        absoluteEndTimeMs > 0
      ) {
        if (isSettingsPreviewActiveRef.current) {
          handleSeek(0);
        } else if (isLearnModeActiveRef.current) {
          handleSeek(0);
        } else if (isCalibratingRef.current) {
          if (playtimeStartRef.current !== null) {
            sessionPlaytimeMs.current +=
              performance.now() - playtimeStartRef.current;
            playtimeStartRef.current = null;
          }
          setIsPlaying(false);
          isPlayingRef.current = false;
          isUserPausedRef.current = false;
          if (playbackRequestRef.current)
            cancelAnimationFrame(playbackRequestRef.current);

          const avgDelta = Math.round(totalSessionHitCountForOffsetRef.current > 0
            ? (totalSessionOffsetSumRef.current / totalSessionHitCountForOffsetRef.current)
            : 0);

          const previousOffset = noteOffsetMsRef.current;
          const newOffset = previousOffset + avgDelta;

          setNoteOffsetMs(newOffset);
          localStorage.setItem("game_note_offset_ms", newOffset.toString());

          isCalibratingRef.current = false;
          setIsCalibrating(false);

          // Restore previous metronome mode
          if (previousMetronomeModeRef.current !== null) {
            setMetronomeMode(previousMetronomeModeRef.current);
            previousMetronomeModeRef.current = null;
          }

          // Clean up the loaded calibration song and MIDI states
          setPlaybackNotes([]);
          setCurrentFileName(null);
          setAnalysisResult(null);
          setInitialTimeSignature(DEFAULT_TIME_SIGNATURE);
          setInitialKeySignature(DEFAULT_KEY_SIGNATURE);
          setCurrentTempoBpm(null);
          setTempoEvents([]);
          setSignatureEvents([]);

          alert(`Calibration Finished! Note Offset updated from ${previousOffset}ms by ${avgDelta > 0 ? '+' : ''}${avgDelta}ms to: ${newOffset > 0 ? '+' : ''}${newOffset}ms based on your average input timing.`);
          setCurrentScreen("settings");
          return;
        } else {
          if (playtimeStartRef.current !== null) {
            sessionPlaytimeMs.current +=
              performance.now() - playtimeStartRef.current;
            playtimeStartRef.current = null;
          }
          setIsPlaying(false);
          isPlayingRef.current = false;
          isUserPausedRef.current = false;
          if (playbackRequestRef.current)
            cancelAnimationFrame(playbackRequestRef.current);

          // Stop background backing track automatically
          if (audioRef.current) {
            try {
              audioRef.current.pause();
            } catch (e) { }
          }
          if (youtubePlayerRef.current) {
            try {
              youtubePlayerRef.current.pauseVideo();
            } catch (e) { }
          }

          // Play menang.mp3 when finished
          playSoundEffect("/menang.mp3");

          const finalHitCount = hitCountRef.current,
            finalErrorCount = errorCountRef.current,
            totalNotes = notes.length;
          let finalPerfectCount = perfectCountRef.current;
          let finalGreatCount = greatCountRef.current;
          let finalGoodCount = goodCountRef.current;
          let finalMissCount =
            totalNotes - (finalPerfectCount + finalGreatCount + finalGoodCount);

          let isAutoPlay = isAutoplay;

          if (isAutoPlay) {
            finalPerfectCount = totalNotes;
            finalGreatCount = 0;
            finalGoodCount = 0;
            finalMissCount = 0;
          }

          let actDur: number;
          const idealDuration = absoluteEndTimeMs / playbackTempoMultiplier;
          if (isAutoPlay) actDur = idealDuration;
          else actDur = idealDuration + accumulatedWaitTimeRef.current;
          const isNonStop =
            (gameSettings?.isNonStop ?? false) ||
            currentWaitMode === "retical" ||
            currentWaitMode === "off";

          const calculateStats = (
            h: number,
            g: number,
            gd: number,
            t: number,
            a: boolean,
            dur: number,
            isNonStopMode: boolean,
            hitCount: number,
            errorCount: number,
          ): { acc: number; spd: number } => {
            if (a) return { acc: 100, spd: 100 };

            let acc = 100;
            if (isNonStopMode) {
              // Unified accuracy calculation (matches Admin Panel / Non-Stop style)
              // [(Perfect + 0.3333333333×Great + 0.1666666667×Good) / Total Notes] × 100
              const score = h * 1.0 + g * 0.3333333333 + gd * 0.1666666667;
              acc = t > 0 ? (score / t) * 100 : 100;
            } else {
              // Old formula for non-stop disabled: hit / (hit + error)
              const totalAttempts = hitCount + errorCount;
              acc = totalAttempts > 0 ? (hitCount / totalAttempts) * 100 : 100;
            }

            const ideal = absoluteEndTimeMs / playbackTempoMultiplier;
            const spd =
              ideal > 0 && dur > 0 ? Math.min(100, (ideal / dur) * 100) : 0;
            return { acc, spd };
          };
          const stats = calculateStats(
            finalPerfectCount,
            finalGreatCount,
            finalGoodCount,
            totalNotes,
            isAutoPlay,
            actDur,
            isNonStop,
            finalHitCount,
            finalErrorCount,
          );
          setLiveAccuracy(stats.acc);
          setLiveSpeed(stats.spd);
          const baseMidiScore = analysisResult?.performanceScore || 0;

          // If Base PS is fixed (>= 100), we must include speed in gameplayPS.
          // If Base PS scales (< 100), speed is already in Base PS, so we use 100 for speedEff.
          const speedEff = baseMidiScore >= 100 ? stats.spd : 100;
          const gameplayPS = (stats.acc + speedEff) / 2;

          let rank = "D";
          if (gameplayPS >= 100) rank = "X";
          else if (gameplayPS >= 97.5) rank = "SS";
          else if (gameplayPS >= 95) rank = "S";
          else if (gameplayPS >= 92.5) rank = "A";
          else if (gameplayPS >= 90) rank = "B";
          else if (gameplayPS >= 87.5) rank = "C";
          else rank = "D";

          const multiplier = calculateScoreMultiplier(gameplayPS);
          const finalScore = baseMidiScore * multiplier;

          let gameplayStyle = "";
          if (instrumentMode === "drum") {
            gameplayStyle =
              selectedMidiInputId !== null
                ? "Drum MIDI"
                : "Keyboard/Touchscreen";
          } else {
            gameplayStyle =
              (viewMode === "sheet-qwerty" || viewMode === "qwerty_mania") ? "Computer Keyboard" : "Piano";
          }
          setPerformanceSummary({
            accuracy: +stats.acc.toFixed(2),
            speed: +stats.spd.toFixed(2),
            gameplayPercentage: +gameplayPS.toFixed(2),
            baseMidiScore,
            finalScore: +finalScore.toFixed(2),
            rank,
            hitCount: isNonStop ? finalPerfectCount : finalHitCount,
            perfectCount: finalPerfectCount,
            greatCount: finalGreatCount,
            goodCount: finalGoodCount,
            missCount: finalMissCount,
            errorCount: finalErrorCount,
            maxCombo: maxComboRef.current,
            totalNoteCount: totalNotes,
            playbackTempoMultiplier,
            totalWaitTimeMs: accumulatedWaitTimeRef.current,
            gameplayStyle,
            instrumentMode,
            isMicEnabled: isAudioInputEnabledRef.current,
            isNonStop,
            isAutoplay: isAutoplay,
          });
          clearScheduledNotes();
          clearScheduledMetronomeSounds();
          updateNotesCurrentlyWaitingFor(new Set<number>());
          setMusicalCurrentTimeMs(totalDurationWithEndDelayMs);
          return;
        }
      }
      playbackRequestRef.current = requestAnimationFrame(() => playbackLoopRef.current());
    } catch (e: any) {
      console.error("Playback loop error:", e);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [
    handleSeek,
    isPlayingRef,
    notesForGame,
    currentTempoBpm,
    playbackTempoMultiplier,
    pausedMusicalTimeRef,
    waitMode,
    playSound,
    clearScheduledMetronomeSounds,
    updateNotesCurrentlyWaitingFor,
    analysisResult,
    originalTotalMusicalDurationMs,
    totalDurationWithEndDelayMs,
    absoluteEndTimeMs,
    metronomeMode,
    noteOffsetMs,
    viewMode,
    gameSettings,
    barLines,
    safePlayAudio,
    safePauseAudio,
    safePlayYoutube,
    safePauseYoutube,
    instrumentMode,
    tapOnlyMode,
    tempoEvents,
    selectedMidiInputId,
    isBackingTrackOverlayDismissed,
    signatureEvents,
    initialKeySignature,
    gameplayStyle,
  ]);

  playbackLoopRef.current = playbackLoop;

  const freePlayLoop = useCallback(() => {
    if (!isFreePlayModeRef.current || !isPlayingRef.current) {
      if (freePlayRequestRef.current)
        cancelAnimationFrame(freePlayRequestRef.current);
      freePlayRequestRef.current = null;
      return;
    }

    const now = performance.now();
    const elapsed = now - freePlayStartTimeRef.current;
    setFreePlayElapsedTime(elapsed);
    setMusicalCurrentTimeMs(elapsed);
    setFreePlayLiveNotes((prev) =>
      prev.filter((n) => {
        if (n.endTime === null) return true;
        const noteAge = elapsed - n.endTime;
        return noteAge < 10000;
      }),
    );
    const buffer = recentNotesBufferRef.current;
    for (const [midi, timestamp] of buffer.entries()) {
      if (elapsed - timestamp > FREE_PLAY_ARPEGGIO_WINDOW_MS)
        buffer.delete(midi);
    }

    // --- NEW METRONOME AUDIO LOGIC ---
    if (freePlayMetronomeMode !== "off" && audioContextRef.current) {
      const audioCtx = audioContextRef.current;
      const beatDurationMs = 60000 / freePlayBpm;

      if (beatDurationMs > 0) {
        const schedulingLookaheadMs = 500; // More robust lookahead
        const lookaheadTimeMs = elapsed + schedulingLookaheadMs;

        let { time: nextBeatTimeToSchedule, index: nextBeatIndex } =
          freePlayNextBeatToScheduleRef.current;

        if (nextBeatTimeToSchedule < elapsed) {
          const currentBeatIndex = Math.floor(elapsed / beatDurationMs);
          nextBeatIndex = currentBeatIndex;
          nextBeatTimeToSchedule = currentBeatIndex * beatDurationMs;
        }

        while (nextBeatTimeToSchedule < lookaheadTimeMs) {
          if (nextBeatTimeToSchedule >= elapsed) {
            const beatsPerMeasure = freePlayTimeSignature.numerator;
            const isStrongBeat = nextBeatIndex % beatsPerMeasure === 0;
            const shouldSchedule =
              freePlayMetronomeMode === "beat" ||
              (freePlayMetronomeMode === "bar" && isStrongBeat);

            if (shouldSchedule) {
              const timeUntilBeatMs = nextBeatTimeToSchedule - elapsed;
              const targetAudioTime =
                audioCtx.currentTime +
                (timeUntilBeatMs - metronomePianoOffsetMsRef.current) / 1000;
              const buffer = isStrongBeat
                ? metronomeBuffersRef.current.strong
                : metronomeBuffersRef.current.weak;

              const scheduleTime = Math.max(audioCtx.currentTime, targetAudioTime);
              if (
                buffer &&
                metronomeGainRef.current &&
                timeUntilBeatMs > -100
              ) {
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                const gainNode = audioCtx.createGain();
                source.connect(gainNode);
                gainNode.connect(metronomeGainRef.current);
                source.start(scheduleTime);
              }
            }
          }
          nextBeatIndex += 1;
          nextBeatTimeToSchedule = nextBeatIndex * beatDurationMs;
        }
        freePlayNextBeatToScheduleRef.current = {
          time: nextBeatTimeToSchedule,
          index: nextBeatIndex,
        };
      }
    }

    // --- NEW VISUAL METRONOME LOGIC ---
    const prevElapsed = freePlayPrevElapsedRef.current;
    if (freePlayMetronomeMode !== "off" && freePlayBpm > 0) {
      const beatDurationMs = 60000 / freePlayBpm;
      if (beatDurationMs > 0) {
        const lastBeatIndex = Math.floor(prevElapsed / beatDurationMs);
        const currentBeatIndex = Math.floor(elapsed / beatDurationMs);

        if (currentBeatIndex > lastBeatIndex) {
          const beatsPerMeasure = freePlayTimeSignature.numerator;
          const beatIndexForStrongCheck = currentBeatIndex;
          const isStrongBeat = beatIndexForStrongCheck % beatsPerMeasure === 0;

          const shouldShowVisual =
            freePlayMetronomeMode === "beat" ||
            (freePlayMetronomeMode === "bar" && isStrongBeat);
          if (shouldShowVisual) {
            setMetronomeBeat(isStrongBeat ? "strong" : "weak");
            setTimeout(() => setMetronomeBeat(null), 100);
          }
        }
      }
    }
    freePlayPrevElapsedRef.current = elapsed;

    freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
  }, [freePlayBpm, freePlayMetronomeMode, freePlayTimeSignature]);

  const handleStartGame = async (settings: GameSettings) => {
    setIsFreePlayMode(false); // Explicitly set to false when starting a regular game
    setRenderedLayoutId(0);

    let finalSettings = {
      ...settings,
      zoomDirection,
      drumTyperPadOpacity,
    };

    setBackingTrackError(null);
    setIsBackingTrackOverlayDismissed(false);
    backingPlayAttemptTimeRef.current = null;
    if (!finalSettings.backingTrack || finalSettings.backingTrack.type === 'none' || finalSettings.backingTrack.type === 'mp3') {
      setBackingTrackStatus('idle');
    } else {
      setBackingTrackStatus('loading');
    }

    // Preload backing track only if it's a direct online audio link (keep type: 'link' so it's distinguished from uploaded 'mp3')
    if (finalSettings.backingTrack?.url && finalSettings.backingTrack.type === 'link') {
      const originalUrl = finalSettings.backingTrack.url;
      const isYoutubeUrl = originalUrl.includes('youtube.com') || originalUrl.includes('youtu.be');
      if (!isYoutubeUrl && !originalUrl.startsWith('blob:') && !originalUrl.startsWith('data:')) {
        setIsPreloading(true);
        setIsLoadingContent(true);
        try {
          const blobUrl = await preloadAudioUrl(originalUrl);
          if (blobUrl !== originalUrl) {
            finalSettings.backingTrack = {
              ...finalSettings.backingTrack,
              url: blobUrl,
              type: 'link'
            };
          }
        } catch (e) {
          console.error("Backing track preload failed:", e);
          setBackingTrackStatus('error');
          setBackingTrackError('Failed to load YouTube / online MP3 audio.');
        } finally {
          setIsPreloading(false);
        }
      }
    }

    // Metronome default: ON ('beat') when Non-Stop is enabled (or Autoplay/Retical), OFF ('off') in Wait Mode (Non-Stop disabled)
    const isNonStopEnabled =
      (finalSettings.isNonStop ?? false) ||
      finalSettings.waitMode === "retical" ||
      finalSettings.waitMode === "off";
    setMetronomeMode(isNonStopEnabled ? "beat" : "off");

    setGameSettings(finalSettings);
    gameSettingsRef.current = finalSettings;
    setPlaybackTempoMultiplier(finalSettings.playbackTempoMultiplier);
    playbackTempoMultiplierRef.current = finalSettings.playbackTempoMultiplier;

    // Initialize transpose for Computer Keyboard (manual control)
    setMirpTranspose(0);
    lastActiveKeySigRef.current = null;

    setCurrentScreen("inGame");
    initializeAudioContext();
    setPlaybackTempoMultiplierForPreview(1);
    setIsLoadingContent(true);
    isUserPausedRef.current = false;
    accumulatedPauseTimeRef.current = 0;
    pauseStartTimeRef.current = null;
    setLiveAccuracy(100);
    setLiveSpeed(100);
    hitsAtLastCheckRef.current = 0;
    totalNotesAtLastCheckRef.current = 0;
    lastBarCheckedRef.current = 0;
    gameRealStartTimeRef.current = null;
    accumulatedSeekTimeRef.current = 0;
    setIsTopBarVisible(false);
    setUserAverageOffset(0);
    totalSessionOffsetSumRef.current = 0;
    totalSessionHitCountForOffsetRef.current = 0;
    // Automatically perform instant seek-to-0 / pre-seek backing track (same as scrolling mouse wheel to bottom)
    void handleSeek(0, true);
    preseekBackingTrackToTime(0);
  };

  const handleStartFreePlay = async () => {
    handleStopPlayback();
    setCurrentSongBackgroundUrl(null);
    setCurrentMidiLink(null);
    setCurrentMidiOffset(null);
    setBackingTrackFile(null);
    setBackingTrackOffset(0);
    previousViewModeRef.current = viewMode;
    setIsFreePlayMode(true);
    isFreePlayModeRef.current = true;
    setFreePlayMetronomeMode("beat");
    setIsPlaying(true);
    isPlayingRef.current = true;
    setGameSettings({
      waitMode: "off",
      practiceHand: "both",
      playbackTempoMultiplier: 1,
      instrumentMode,
      zoomDirection,
      drumTyperPadOpacity,
    });

    // Force view mode based on instrument and previous style
    if (instrumentMode === "drum") {
      setViewMode("falling");
    } else {
      if (viewMode === "sheet-qwerty" || viewMode === "qwerty_mania") {
        setViewMode("qwerty_mania");
      } else {
        setViewMode("falling");
      }
    }

    setCurrentScreen("inGame");
    await initializeAudioContext();
    await preloadSamplesForSong([]); // Preload just metronome
    freePlayStartTimeRef.current = performance.now();
    freePlayPrevElapsedRef.current = 0;
    freePlayNextBeatToScheduleRef.current = { time: 0, index: 0 };
    if (!freePlayRequestRef.current)
      freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
    setIsTopBarVisible(false);
  };

  const getPreviousBarTime = useCallback(
    (targetMs: number) => {
      if (barLines && barLines.length > 0) {
        const prevBars = barLines.filter((b) => b < targetMs - 30);
        if (prevBars.length > 0) {
          return prevBars[prevBars.length - 1];
        }
        if (barLines.length > 1) {
          const firstBarDuration = barLines[1] - barLines[0];
          return Math.max(0, barLines[0] - firstBarDuration);
        }
      }
      const tempo = currentTempoBpm || 120;
      const num = initialTimeSignature?.numerator || 4;
      const den = initialTimeSignature?.denominator || 4;
      const barDurationMs = (60000 / tempo) * (num * 4 / den);
      return Math.max(0, targetMs - barDurationMs);
    },
    [barLines, currentTempoBpm, initialTimeSignature]
  );

  const startLoopWithPreRoll = useCallback(() => {
    if (!isLoopingRef.current || loopStartMsRef.current === null) return;
    const targetTime = loopStartMsRef.current;
    const preRollStart = getPreviousBarTime(targetTime);
    const beatsInBar = initialTimeSignature?.numerator || 4;

    hpRef.current = 100;
    setHp(100);

    const countIn: BeatCountdownInfo = {
      type: "loop",
      startTimeMs: preRollStart,
      targetTimeMs: targetTime,
      beatsInBar,
    };
    beatCountdownInfoRef.current = countIn;
    setBeatCountdownInfo(countIn);

    loopDelayStartTimeRef.current = null;
    setLoopDelayInfoWithRef(null);

    handleSeek(preRollStart, true);

    // Reset judgments and accuracy counters for fresh loop practice evaluation
    noteJudgmentsRef.current.clear();
    hitNoteIdsRef.current.clear();
    presatisfiedNoteIdsRef.current.clear();
    perfectCountRef.current = 0;
    setPerfectCount(0);
    greatCountRef.current = 0;
    setGreatCount(0);
    goodCountRef.current = 0;
    setGoodCount(0);
    missCountRef.current = 0;
    setMissCount(0);
    hitCountRef.current = 0;
    setHitCount(0);
    errorCountRef.current = 0;
    setErrorCount(0);
    comboRef.current = 0;
    setCombo(0);
    setLiveAccuracy(100);
    lastLiveAccuracyValRef.current = 100;

    let ni = 0;
    const notes = notesForGameRef.current.length > 0 ? notesForGameRef.current : notesForGame;
    while (ni < notes.length && notes[ni].timeMs < targetTime) {
      ni++;
    }
    nextNoteIndexRef.current = ni;
    missedNoteIndexRef.current = ni;
    nextAutoplayAudioScheduleIndexRef.current = ni;
    scheduledAutoplayNoteIdsRef.current.clear();

    setIsPlaying(true);
    isPlayingRef.current = true;
    isUserPausedRef.current = false;
    performanceStartTimeRef.current = performance.now();
    audioCtxStartTimeRef.current = audioContextRef.current
      ? audioContextRef.current.currentTime
      : performance.now() / 1000;

    const backing = gameSettingsRef.current?.backingTrack;
    if (backing && backing.type !== "none") {
      triggerBackingTrackPlay(preRollStart);
    }

    if (!playbackRequestRef.current) {
      playbackRequestRef.current = requestAnimationFrame(() => playbackLoopRef.current());
    }
  }, [
    getPreviousBarTime,
    initialTimeSignature,
    handleSeek,
    notesForGame,
    playbackLoop,
    triggerBackingTrackPlay,
    setLoopDelayInfoWithRef,
  ]);
  startLoopWithPreRollRef.current = startLoopWithPreRoll;

  const handlePlay = useCallback(async () => {
    const previewAtStart = isSettingsPreviewActiveRef.current ? settingsPreviewRunRef.current : null;
    // Attempt to resume audio context, but don't hard-block the entire function
    // if it returns false (maybe it's still initializing).
    await initializeAudioContext();
    if (previewAtStart !== null && (previewAtStart !== settingsPreviewRunRef.current || !isSettingsPreviewActiveRef.current || settingsScreenRef.current !== 'settings')) return;

    setIsRewinding(false);
    isRewindingRef.current = false;

    if (isFreePlayMode) {
      freePlayStartTimeRef.current = performance.now() - freePlayElapsedTime;
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (!freePlayRequestRef.current)
        freePlayRequestRef.current = requestAnimationFrame(freePlayLoop);
      return;
    }

    if (isPlayingRef.current) return;

    if (
      isLoopingRef.current &&
      loopStartMsRef.current !== null &&
      Math.abs(pausedMusicalTimeRef.current - loopStartMsRef.current) < 50
    ) {
      startLoopWithPreRoll();
      return;
    }

    if (audioStartTimeoutRef.current) {
      clearTimeout(audioStartTimeoutRef.current);
      audioStartTimeoutRef.current = null;
    }
    if (
      playtimeStartRef.current === null &&
      gameSettingsRef.current &&
      (gameSettingsRef.current.waitMode === "strict" ||
        gameSettingsRef.current.waitMode === "retical")
    )
      playtimeStartRef.current = performance.now();
    if (gameRealStartTimeRef.current === null)
      gameRealStartTimeRef.current =
        performance.now() -
        pausedMusicalTimeRef.current / playbackTempoMultiplier;
    if (pauseStartTimeRef.current !== null) {
      accumulatedPauseTimeRef.current +=
        performance.now() - pauseStartTimeRef.current;
      pauseStartTimeRef.current = null;
    }
    const currentRealTimeMs = pausedMusicalTimeRef.current / playbackTempoMultiplier;
    const startIndex = allBeatTimesRef.current.findIndex(
      (b) => b.timeMs >= currentRealTimeMs,
    );
    nextBeatToScheduleIndexRef.current =
      startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
    prevConceptualTimeRef.current = pausedMusicalTimeRef.current;

    const startBarIndex = barLines.findIndex(
      (b) => b >= pausedMusicalTimeRef.current,
    );
    nextBarIndexRef.current =
      startBarIndex !== -1 ? startBarIndex : barLines.length;

    // Check if starting from beginning of the song (intro count-in)
    const startPos = pausedMusicalTimeRef.current;
    const firstBar = barLines && barLines.length > 0 ? barLines[0] : INITIAL_PLAYBACK_DELAY_MS;
    if (startPos <= 50 && firstBar > 200) {
      const beatsInBar = initialTimeSignature?.numerator || 4;
      const countIn: BeatCountdownInfo = {
        type: "intro",
        startTimeMs: 0,
        targetTimeMs: firstBar,
        beatsInBar,
      };
      beatCountdownInfoRef.current = countIn;
      setBeatCountdownInfo(countIn);
    }

    setIsPlaying(true);
    isPlayingRef.current = true;
    isUserPausedRef.current = false;
    let schedNi = 0;
    const notes = notesForGameRef.current.length > 0 ? notesForGameRef.current : notesForGame;
    while (schedNi < notes.length && notes[schedNi].timeMs < pausedMusicalTimeRef.current) schedNi++;
    nextAutoplayAudioScheduleIndexRef.current = schedNi;
    scheduledAutoplayNoteIdsRef.current.clear();
    performanceStartTimeRef.current = performance.now();
    audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
    setMusicalCurrentTimeMs(pausedMusicalTimeRef.current);
    currentTimeRef.current = pausedMusicalTimeRef.current;
    prevMusicalTimeRef.current = pausedMusicalTimeRef.current;
    hasAudioStartedThisStretchRef.current = false;
    setIsBackingTrackOverlayDismissed(false); // Reset dismissal on play

    const backing = gameSettingsRef.current?.backingTrack;
    const isNoneBacking = !backing || backing.type === "none";

    if (isNoneBacking) {
      setBackingTrackStatus("playing");
      hasAudioStartedThisStretchRef.current = true;
      playbackTempoMultiplierRef.current = playbackTempoMultiplier;
    } else {
      triggerBackingTrackPlay(pausedMusicalTimeRef.current);
    }

    playbackRequestRef.current = requestAnimationFrame(() => playbackLoopRef.current());
  }, [
    notesForGame.length,
    initializeAudioContext,
    playbackLoop,
    freePlayLoop,
    isFreePlayMode,
    freePlayElapsedTime,
    playbackTempoMultiplier,
    barLines,
    initialTimeSignature,
    startLoopWithPreRoll,
    triggerBackingTrackPlay,
    mp3Volume,
    safePlayAudio,
    safePauseAudio,
  ]);

  useEffect(() => {
    // Redundant volume effect removed, consolidated above
  }, [mp3Volume]);

  const handlePause = useCallback(async () => {
    setIsRewinding(false);
    isRewindingRef.current = false;

    if (isFreePlayMode) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (freePlayRequestRef.current)
        cancelAnimationFrame(freePlayRequestRef.current);
      freePlayRequestRef.current = null;
      return;
    }

    if (waitMode === "retical" || !isPlayingRef.current) return;
    if (playtimeStartRef.current !== null) {
      sessionPlaytimeMs.current += performance.now() - playtimeStartRef.current;
      playtimeStartRef.current = null;
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
    isUserPausedRef.current = true;
    pausedMusicalTimeRef.current = currentTimeRef.current;
    pauseStartTimeRef.current = performance.now();
    if (playbackRequestRef.current)
      cancelAnimationFrame(playbackRequestRef.current);
    clearScheduledNotes();
    clearScheduledMetronomeSounds();
    setMetronomeBeat(null);
    loopDelayStartTimeRef.current = null;
    setLoopDelayInfoWithRef(null);
    if (audioStartTimeoutRef.current) {
      clearTimeout(audioStartTimeoutRef.current);
      audioStartTimeoutRef.current = null;
    }
    if (audioRef.current) await safePauseAudio();
    if (youtubePlayerRef.current) await safePauseYoutube();
  }, [
    clearScheduledNotes,
    clearScheduledMetronomeSounds,
    waitMode,
    isFreePlayMode,
    safePauseAudio,
    safePauseYoutube,
  ]);

  const handleRetryGameOver = useCallback(() => {
    setIsGameOver(false);
    setGameOverReason("");
    stopEndGameSfx();
    if (isLoopingRef.current && loopStartMsRef.current !== null) {
      startLoopWithPreRoll();
    } else {
      handleStopPlayback(false, false);
      hpRef.current = 100;
      setHp(100);
      handlePlay();
    }
  }, [
    startLoopWithPreRoll,
    handleStopPlayback,
    handlePlay,
    stopEndGameSfx,
  ]);

  const handleUserAudioSyncOffsetChange = useCallback(
    (newOffset: number) => {
      setUserAudioSyncOffset(newOffset);
    },
    [],
  );

  useEffect(() => {
    const p = () => {
      if (
        waitMode !== "retical" &&
        currentScreen === "inGame" &&
        isPlayingRef.current
      )
        handlePause();
    };
    const r = async () => {
      await initializeAudioContext();
      if (currentScreen === "inGame" && isPlayingRef.current) {
        if (audioRef.current && audioRef.current.paused) safePlayAudio();
        if (youtubePlayerRef.current) safePlayYoutube();
      }
      if (
        currentScreen === "inGame" &&
        !isPlayingRef.current &&
        !isUserPausedRef.current &&
        (notesForGame.length > 0 || isFreePlayMode)
      )
        handlePlay();
    };
    const hv = () => (document.hidden ? p() : r());
    const hb = () => p();
    const hf = () => r();
    document.addEventListener("visibilitychange", hv);
    window.addEventListener("blur", hb);
    window.addEventListener("focus", hf);
    return () => {
      document.removeEventListener("visibilitychange", hv);
      window.removeEventListener("blur", hb);
      window.removeEventListener("focus", hf);
    };
  }, [
    currentScreen,
    notesForGame.length,
    isFreePlayMode,
    handlePlay,
    waitMode,
    handlePause,
  ]);

  const accuracyLevel = gameSettings?.accuracyLevel ?? 5;
  const perfectWindow = 100 + (5 - accuracyLevel) * 20;
  const greatWindow = perfectWindow * 1.5;
  const goodWindow = perfectWindow * 2;

  // Helper to get precise musical time for sub-frame accuracy (e.g. MIDI/Input events)
  const getPreciseMusicalTime = useCallback(() => {
    if (!isPlayingRef.current) return currentTimeRef.current;

    // If waiting for a specific chord/note, time is frozen at that block
    const isW = notesCurrentlyWaitingForRef.current.size > 0 && waitingBlockTimeRef.current !== null;
    if (isW) return waitingBlockTimeRef.current!;

    const now = performance.now();
    const currentPlaybackTempoMultiplier = playbackTempoMultiplierRef.current;
    const elapsedReal = now - performanceStartTimeRef.current;

    // We must handle the case where conceptualMusicalTime was calculated at the start of the frame
    // This is essentially doing the same math as conceptualMusicalTime but with "current" now
    return pausedMusicalTimeRef.current + elapsedReal * currentPlaybackTempoMultiplier;
  }, []);

  const processKeyPress = useCallback(
    (midi: number) => {
      const isAutoplay =
        !isCalibratingRef.current &&
        (gameSettingsRef.current?.isAutoplay ??
          ((gameSettingsRef.current?.waitMode || waitMode) === "off" &&
            !isLearnModeActiveRef.current));
      if (isAutoplay) return;

      const inputTime = getPreciseMusicalTime();
      if (isPlayingRef.current)
        lastPlayerInputRealTimeRef.current = performance.now();

      const isW =
        notesCurrentlyWaitingForRef.current.size > 0 &&
        waitingBlockTimeRef.current !== null;

      const notes =
        notesForGameRef.current.length > 0 ? notesForGameRef.current : notesForGame;

      // In Wait Mode, we don't strictly use the offset for hit detection validity in the same way
      // because the game is paused waiting for the specific note.
      // However, visual feedback logic or scoring (if added later for wait mode) might use it.
      if (isW) {
        // Direct ID lookup ensures waiting notes are never missed by index shifts or slicing
        const waitingIds = notesCurrentlyWaitingForIdsRef.current;
        const wn = notes.filter((n) => waitingIds.has(n.noteId));

        let m: MidiNotePlaybackItem | undefined;
        if (gameSettingsRef.current?.instrumentMode === "drum") {
          const inputPadId = midiToDrumPadIdMap.get(midi);
          m = wn.find((n) => {
            const targetPadId = midiToDrumPadIdMap.get(n.midi);
            return targetPadId !== undefined && targetPadId === inputPadId;
          });
        } else if (isAudioInputEnabledRef.current) {
          // v2 scoring: octave-insensitive
          const inputPitchClass = midi % 12;
          m = wn.find((n) => n.midi % 12 === inputPitchClass);
        } else {
          // v1 scoring: octave-sensitive
          m = wn.find((n) => n.midi === midi);
        }

        if (waitMode === "strict") {
          // If the note being pressed is wrong or already hit, simply ignore
          if (m) {
            setPerfectCount((p) => p + 1);
            perfectCountRef.current += 1;
            setHitCount((p) => p + 1);
            hitCountRef.current += 1;
            hitNoteIdsRef.current.add(m.noteId);
            changeHp(4.0);
            visuallySatisfyNote(m);
            playerInputTimesRef.current.push(performance.now());
            if (firstInputRealTimeRef.current === null)
              firstInputRealTimeRef.current = performance.now();
            lastInputRealTimeRef.current = performance.now();

            // Fixed: Use ID-based waiting set to handle multiple notes with same MIDI in a chord
            const newWaitingIds = new Set(notesCurrentlyWaitingForIdsRef.current);
            newWaitingIds.delete(m.noteId);
            notesCurrentlyWaitingForIdsRef.current = newWaitingIds;

            const remainingMidis = new Set<number>();
            notes.forEach(n => {
              if (newWaitingIds.has(n.noteId)) remainingMidis.add(n.midi);
            });
            updateNotesCurrentlyWaitingFor(remainingMidis);

            if (newWaitingIds.size === 0) resumePlaybackFromWait();
          } else {
            // Ignore wrong notes to prevent locking/errors in strict mode
          }
        } else {
          if (m) {
            setPerfectCount((p) => p + 1);
            perfectCountRef.current += 1;
            setHitCount((p) => p + 1);
            hitCountRef.current += 1;
            hitNoteIdsRef.current.add(m.noteId);
            changeHp(4.0);
            visuallySatisfyNote(m);
            playerInputTimesRef.current.push(performance.now());
            if (firstInputRealTimeRef.current === null)
              firstInputRealTimeRef.current = performance.now();
            lastInputRealTimeRef.current = performance.now();
          } else {
            setErrorCount((p) => p + 1);
            errorCountRef.current += 1;
          }
          resumePlaybackFromWait();
        }
      } else {
        // Non-wait mode (Falling, Sheet, etc.) - Apply Adjusted Note Time Logic
        const search = notes.slice(
          Math.max(0, nextNoteIndexRef.current - 20),
          Math.min(notes.length, nextNoteIndexRef.current + 80),
        );
        let best: MidiNotePlaybackItem | null = null,
          min = Infinity,
          bestOffset = 0;

        const currentMultiplier = Math.max(0.05, playbackTempoMultiplierRef.current);

        for (const n of search) {
          // Adjust judgment calculation: 
          // noteOffsetMs is the physical hardware/device input delay in real milliseconds.
          // Scaled to musical time: (noteOffsetMs * currentMultiplier).
          // Real physical difference in ms between tap and note:
          const realOffsetMs = noteInputOffsetMs(n.timeMs, inputTime, currentMultiplier, noteOffsetMsRef.current);

          // Optimization: Skip notes more than 2.5 real seconds away
          if (Math.abs(realOffsetMs) > 2500)
            continue;

          let midiMatch = false;
          if (gameSettingsRef.current?.instrumentMode === "drum") {
            const inputPadId = midiToDrumPadIdMap.get(midi);
            const targetPadId = midiToDrumPadIdMap.get(n.midi);

            if (targetPadId !== undefined && targetPadId === inputPadId) {
              midiMatch = true;
            } else {
              midiMatch = false;
            }
          } else if (isAudioInputEnabledRef.current) {
            midiMatch = n.midi % 12 === midi % 12;
          } else {
            midiMatch = n.midi === midi;
          }

          if (midiMatch && !presatisfiedNoteIdsRef.current.has(n.noteId)) {
            // Rule: HIT if |realOffsetMs| <= hitWindow
            const offset = realOffsetMs; // positive if early, negative if late
            const d = Math.abs(offset);
            if (d < min) {
              min = d;
              best = n;
              bestOffset = offset;
            }
          }
        }

        // Use the calculated windows for judgment
        if (best) {
          if (min <= goodWindow) {
            if (!hitNoteIdsRef.current.has(best.noteId)) {
              if (min <= perfectWindow) {
                setPerfectCount((p) => p + 1);
                perfectCountRef.current += 1;
                setHitCount((p) => p + 1);
                hitCountRef.current += 1;
                changeHp(4.0);
                setCombo((p) => {
                  const next = p + 1;
                  if (next > maxComboRef.current) {
                    setMaxCombo(next);
                    maxComboRef.current = next;
                  }
                  return next;
                });
                comboRef.current += 1;
                setLastJudgment("perfect");
                lastJudgmentRef.current = "perfect";
              } else if (min <= greatWindow) {
                setGreatCount((p) => p + 1);
                greatCountRef.current += 1;
                setErrorCount((p) => p + 1);
                errorCountRef.current += 1;
                changeHp(2.0);
                setCombo((p) => {
                  const next = p + 1;
                  if (next > maxComboRef.current) {
                    setMaxCombo(next);
                    maxComboRef.current = next;
                  }
                  return next;
                });
                comboRef.current += 1;
                setLastJudgment("great");
                lastJudgmentRef.current = "great";
              } else {
                setGoodCount((p) => p + 1);
                goodCountRef.current += 1;
                changeHp(1.0);
                setCombo((p) => {
                  const next = p + 1;
                  if (next > maxComboRef.current) {
                    setMaxCombo(next);
                    maxComboRef.current = next;
                  }
                  return next;
                });
                comboRef.current += 1;
                setLastJudgment("good");
                lastJudgmentRef.current = "good";
              }
              setLastHitOffset(bestOffset);

              // NEW: Update session average offset (throttled to avoid re-rendering every hit)
              totalSessionOffsetSumRef.current += bestOffset;
              totalSessionHitCountForOffsetRef.current += 1;
              const nowRealTime = performance.now();
              if (nowRealTime - lastAvgOffsetUpdateRef.current > 250) {
                const newAvg = totalSessionOffsetSumRef.current / totalSessionHitCountForOffsetRef.current;
                setUserAverageOffset(newAvg);
                lastAvgOffsetUpdateRef.current = nowRealTime;
              }

              hitNoteIdsRef.current.add(best.noteId);
              satisfyUpcomingNote(best);
            }
          } else {
            // min > goodWindow - Check if it's within 500ms for a 'miss' judgment or just an error
            if (min <= 500) {
              const currentWaitMode = gameSettingsRef.current?.waitMode || waitMode;
              // In strict wait mode, do not burn upcoming notes as misses before wait mode pauses for them
              if (currentWaitMode !== "strict") {
                if (!hitNoteIdsRef.current.has(best.noteId)) {
                  setMissCount((p) => p + 1);
                  missCountRef.current += 1;
                  changeHp(-10.0);
                  setLastHitOffset(bestOffset);

                  // NEW: Update session average offset (throttled to avoid re-rendering every hit)
                  totalSessionOffsetSumRef.current += bestOffset;
                  totalSessionHitCountForOffsetRef.current += 1;
                  const nowRealTime = performance.now();
                  if (nowRealTime - lastAvgOffsetUpdateRef.current > 250) {
                    const newAvg = totalSessionOffsetSumRef.current / totalSessionHitCountForOffsetRef.current;
                    setUserAverageOffset(newAvg);
                    lastAvgOffsetUpdateRef.current = nowRealTime;
                  }

                  setCombo(0);
                  comboRef.current = 0;
                  setLastJudgment("miss");
                  lastJudgmentRef.current = "miss";
                  hitNoteIdsRef.current.add(best.noteId);
                }
              }
            } else {
              // Rule: spam/extra press when too far from any note
              const isNonStop =
                (gameSettingsRef.current?.isNonStop ?? false) ||
                (gameSettingsRef.current?.waitMode || "strict") === "retical" ||
                (gameSettingsRef.current?.waitMode || "strict") === "off";
              if (!isNonStop) {
                setErrorCount((p) => p + 1);
                errorCountRef.current += 1;
              }
            }
          }

          playerInputTimesRef.current.push(performance.now());
          if (playerInputTimesRef.current.length > 2000)
            playerInputTimesRef.current.splice(0, 1000);
          if (firstInputRealTimeRef.current === null)
            firstInputRealTimeRef.current = performance.now();
          lastInputRealTimeRef.current = performance.now();
        } else {
          // No 'best' note found at all - Count as error if not in Non-Stop mode
          const isNonStop =
            (gameSettingsRef.current?.isNonStop ?? false) ||
            (gameSettingsRef.current?.waitMode || "strict") === "retical" ||
            (gameSettingsRef.current?.waitMode || "strict") === "off";
          if (!isNonStop) {
            setErrorCount((p) => p + 1);
            errorCountRef.current += 1;
          }
        }
      }
    },
    [
      notesForGame,
      waitMode,
      visuallySatisfyNote,
      satisfyUpcomingNote,
      updateNotesCurrentlyWaitingFor,
      resumePlaybackFromWait,
      noteOffsetMs,
      gameSettings,
    ],
  );

  const handleFreePlayKeyPress = useCallback(
    (midi: number) => {
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
        hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? "left" : "right",
      };
      setFreePlayLiveNotes((prev) => [...prev, liveNote]);
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
          hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? "left" : "right",
          originalTrackSourceInfo: "recording",
        };
        setRecordedNotes((prev) => [...prev, newNote]);
      }
    },
    [isRecording, midiNoteToKeyDefMap],
  );

  const handleFreePlayKeyRelease = useCallback(
    (midi: number) => {
      const now = performance.now();
      const elapsed = now - freePlayStartTimeRef.current;
      setFreePlayLiveNotes((prev) => {
        const newNotes = [...prev];
        const index = [...newNotes]
          .reverse()
          .findIndex((n) => n.midi === midi && n.endTime === null);
        if (index !== -1) {
          const actualIndex = newNotes.length - 1 - index;
          newNotes[actualIndex] = {
            ...newNotes[actualIndex],
            endTime: elapsed,
          };
        }
        return newNotes;
      });
      if (isRecording && recordingStartTimeRef.current !== null) {
        const recEndTime = now - recordingStartTimeRef.current;
        setRecordedNotes((prev) => {
          const newNotes = [...prev];
          const index = [...newNotes]
            .reverse()
            .findIndex((n) => n.midi === midi && n.durationMs === 0);
          if (index === -1) return prev;
          const actualIndex = newNotes.length - 1 - index;
          const start = newNotes[actualIndex].timeMs;
          newNotes[actualIndex] = {
            ...newNotes[actualIndex],
            durationMs: Math.max(1, recEndTime - start),
          };
          return newNotes;
        });
      }
    },
    [isRecording],
  );

  const handleUiKeyPress = useCallback(
    (k: string, m: number) => {
      setUserSustainedKeys((p) => new Set(p).add(k));
      startSustainedSound(k, m);

      // Add to gameLiveNotes if in game mode and it's a drum hit
      if (
        !isFreePlayMode &&
        gameSettingsRef.current?.instrumentMode === "drum"
      ) {
        const now = currentTimeRef.current;
        const liveNote: FreePlayLiveNote = {
          id: Math.random().toString(36).substr(2, 9),
          midi: m,
          name: k,
          startTime: now,
          endTime: now + 100,
          pitchClass: (m % 12).toString(),
          hand: "right",
        };
        setGameLiveNotes((prev) => [...prev, liveNote]);
        setTimeout(
          () =>
            setGameLiveNotes((prev) =>
              prev.filter((n) => n.id !== liveNote.id),
            ),
          100,
        );
      }

      if (isPlayingRef.current && !isFreePlayMode) processKeyPress(m);
      if (isFreePlayMode) handleFreePlayKeyPress(m);
    },
    [
      processKeyPress,
      startSustainedSound,
      isFreePlayMode,
      handleFreePlayKeyPress,
    ],
  );

  const handleUiKeyRelease = useCallback(
    (k: string, m: number) => {
      setUserSustainedKeys((p) => {
        const ns = new Set(p);
        ns.delete(k);
        return ns;
      });
      if (isSustainPedalActiveRef.current)
        sustainedByPedalKeysRef.current.set(k, m);
      else stopSustainedSound(k, m);
      if (isFreePlayMode) handleFreePlayKeyRelease(m);
    },
    [
      stopSustainedSound,
      isFreePlayMode,
      handleFreePlayKeyRelease,
    ],
  );

  const handleStartLearnMode = useCallback(
    async (
      lessonId = "scale_c",
      targetSubMode?: 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory',
    ) => {
      handleStopPlayback(true, false, true);
      setCurrentSongBackgroundUrl(null);
      setCurrentMidiLink(null);
      setCurrentMidiOffset(null);
      setBackingTrackFile(null);
      setBackingTrackOffset(0);
      previousViewModeRef.current = viewMode;
      setIsFreePlayMode(false);
      isFreePlayModeRef.current = false;
      setIsLearnModeActive(true);
      isLearnModeActiveRef.current = true;
      setInstrumentMode("piano");

      const lesson = LEARN_LESSONS[lessonId] || LEARN_LESSONS.scale_c;
      setCurrentLearnLessonId(lessonId);
      setCurrentFileName(lesson.title);

      const rawOffsetNotes: MidiNotePlaybackItem[] = lesson.notes.map((n, idx) => ({
        ...n,
        noteId: `learn-${lessonId}-${idx}-${n.midi}-${n.timeMs}`,
        pitchClass: n.name ? n.name.replace(/[0-9-]/g, '') : (n.pitchClass || 'C'),
        timeMs: n.timeMs + INITIAL_PLAYBACK_DELAY_MS,
      }));
      const offsetNotes = assignFingering(rawOffsetNotes);

      setPlaybackNotes(offsetNotes);
      setHandPoses([]);
      setInitialTimeSignature({ numerator: 4, denominator: 4 });
      setInitialKeySignature("C");
      setCurrentTempoBpm(120);
      setTempoEvents([]);
      setSignatureEvents([]);

      const barMs = 2000;
      const maxTime = offsetNotes.reduce((m, n) => Math.max(m, n.timeMs + n.durationMs), 0) + 4000;
      const bars: number[] = [];
      for (let t = INITIAL_PLAYBACK_DELAY_MS; t <= maxTime; t += barMs) {
        bars.push(t);
      }
      setBarLines(bars);

      const finalSettings: GameSettings = {
        waitMode: "strict",
        isAutoplay: false,
        isNonStop: false,
        practiceHand: "both",
        playbackTempoMultiplier: 1,
        instrumentMode: "piano",
        zoomDirection: "normal",
        drumTyperPadOpacity: 1,
      };
      setMetronomeMode("off");
      setGameSettings(finalSettings);
      gameSettingsRef.current = finalSettings;

      notesForGameRef.current = offsetNotes;
      playbackNotesRef.current = offsetNotes;
      nextNoteIndexRef.current = 0;
      missedNoteIndexRef.current = 0;
      nextAutoplayAudioScheduleIndexRef.current = 0;
      waitingBlockTimeRef.current = null;
      resumeIndexRef.current = null;
      presatisfiedNoteIdsRef.current.clear();
      notesCurrentlyWaitingForIdsRef.current.clear();
      notesCurrentlyWaitingForRef.current.clear();
      hitNoteIdsRef.current.clear();
      currentTimeRef.current = 0;
      pausedMusicalTimeRef.current = 0;
      musicalCurrentTimeMsRef.current = 0;
      setMusicalCurrentTimeMs(0);

      const activeSubMode = targetSubMode || learnSubMode || 'falling';
      setLearnSubMode(activeSubMode);
      if (activeSubMode === 'sheet') {
        setViewMode('sheet');
        setGameplayStyle('piano');
        setNoteLabelType('noteName');
        setShowHand3D(false);
      } else if (activeSubMode === 'fingering') {
        setViewMode('falling');
        setGameplayStyle('piano');
        setNoteLabelType('fingering');
        setShowHand3D(true);
      } else if (activeSubMode === 'roblox') {
        setViewMode('qwerty_mania');
        setGameplayStyle('computer');
        setQwertyLayout('mirp');
        setShowQwertyShortcuts(true);
        setNoteLabelType('qwerty');
        setShowHand3D(false);
      } else if (activeSubMode === 'theory') {
        setViewMode('falling');
        setGameplayStyle('piano');
        setNoteLabelType('noteName');
        setShowHand3D(false);
      } else {
        setViewMode('falling');
        setGameplayStyle('piano');
        setNoteLabelType('noteName');
        setShowHand3D(false);
      }

      setCurrentScreen("inGame");
      await initializeAudioContext();
      await preloadSamplesForSong(offsetNotes);
      setIsTopBarVisible(true);
      setIsLoadingContent(false);

      handlePlay();
    },
    [handleStopPlayback, initializeAudioContext, preloadSamplesForSong, handlePlay, viewMode, learnSubMode],
  );

  const handleStartLearnExercise = useCallback(
    async (
      key: string,
      typeId: string,
      typeName: string,
    ) => {
      handleStopPlayback(true, false, true);
      setCurrentSongBackgroundUrl(null);
      setCurrentMidiLink(null);
      setCurrentMidiOffset(null);
      setBackingTrackFile(null);
      setBackingTrackOffset(0);
      previousViewModeRef.current = viewMode;
      setIsFreePlayMode(false);
      isFreePlayModeRef.current = false;
      setIsLearnModeActive(true);
      isLearnModeActiveRef.current = true;
      setInstrumentMode("piano");

      const exercise = generateExercise(key, typeId as ExerciseType);
      setCurrentFileName(`${key} ${typeName}`);

      const rawOffsetNotes: MidiNotePlaybackItem[] = exercise.notes.map((n, idx) => ({
        ...n,
        noteId: `drill-${typeId}-${idx}-${n.midi}-${n.timeMs}`,
        pitchClass: n.name ? n.name.replace(/[0-9-]/g, '') : (n.pitchClass || 'C'),
      }));
      const offsetNotes = assignFingering(rawOffsetNotes);

      setPlaybackNotes(offsetNotes);
      setHandPoses([]);
      setInitialTimeSignature(exercise.timeSignature || { numerator: 4, denominator: 4 });
      setInitialKeySignature(exercise.keySignature || key);
      setCurrentTempoBpm(exercise.initialTempoBpm || 120);
      setTempoEvents(exercise.tempoEvents || []);
      setSignatureEvents([]);
      setBarLines(exercise.barLinesMs || []);
      setAnalysisResult(null);

      const finalSettings: GameSettings = {
        waitMode: "strict",
        isAutoplay: false,
        isNonStop: false,
        practiceHand: "both",
        playbackTempoMultiplier: 1,
        instrumentMode: "piano",
        zoomDirection: "normal",
        drumTyperPadOpacity: 1,
      };
      setGameSettings(finalSettings);
      gameSettingsRef.current = finalSettings;

      notesForGameRef.current = offsetNotes;
      playbackNotesRef.current = offsetNotes;
      nextNoteIndexRef.current = 0;
      missedNoteIndexRef.current = 0;
      nextAutoplayAudioScheduleIndexRef.current = 0;
      waitingBlockTimeRef.current = null;
      resumeIndexRef.current = null;
      presatisfiedNoteIdsRef.current.clear();
      notesCurrentlyWaitingForIdsRef.current.clear();
      notesCurrentlyWaitingForRef.current.clear();
      hitNoteIdsRef.current.clear();
      currentTimeRef.current = 0;
      pausedMusicalTimeRef.current = 0;
      musicalCurrentTimeMsRef.current = 0;
      setMusicalCurrentTimeMs(0);

      // Preload samples so instrument is ready
      if (offsetNotes.length > 0) {
        void preloadSamplesForSong(offsetNotes);
      }

      // Enter Game Mode selection screen so user can choose settings/modes as standard
      setCurrentScreen("modeSelection");
    },
    [handleStopPlayback, preloadSamplesForSong, viewMode],
  );

  const handleSwitchLearnSubMode = useCallback(
    (mode: 'sheet' | 'falling' | 'fingering' | 'roblox' | 'theory') => {
      setLearnSubMode(mode);
      if (mode === 'sheet') {
        setViewMode('sheet');
        setGameplayStyle('piano');
        setNoteLabelType('noteName');
        setShowHand3D(false);
      } else if (mode === 'falling') {
        setViewMode('falling');
        setGameplayStyle('piano');
        setGameSettings((prev) => (prev ? { ...prev, waitMode: 'strict' } : null));
        setNoteLabelType('noteName');
        setShowHand3D(false);
      } else if (mode === 'fingering') {
        setViewMode('falling');
        setGameplayStyle('piano');
        setNoteLabelType('fingering');
        setShowHand3D(true);
      } else if (mode === 'roblox') {
        setViewMode('qwerty_mania');
        setGameplayStyle('computer');
        setQwertyLayout('mirp');
        setShowQwertyShortcuts(true);
        setNoteLabelType('qwerty');
        setShowHand3D(false);
      } else if (mode === 'theory') {
        setViewMode('falling');
        setGameplayStyle('piano');
        setNoteLabelType('noteName');
        setShowHand3D(false);
      }
    },
    [],
  );

  const handlePlayTheoryAudition = useCallback(async () => {
    const item = THEORY_ITEMS.find((t) => t.id === theoryType) || THEORY_ITEMS[0];
    await initializeAudioContext();
    const chordMidis = item.intervals.map((int) => theoryRoot + int);
    setTheoryPlayingNotes(chordMidis);

    chordMidis.forEach((midi, idx) => {
      setTimeout(() => {
        const keyDef = PIANO_KEYS_CONFIG.find((k) => k.midiNote === midi);
        if (keyDef) {
          handleUiKeyPress(keyDef.name, midi);
        }
      }, idx * 150);
    });

    setTimeout(() => {
      chordMidis.forEach((midi) => {
        const keyDef = PIANO_KEYS_CONFIG.find((k) => k.midiNote === midi);
        if (keyDef) {
          handleUiKeyRelease(keyDef.name, midi);
        }
      });
      setTheoryPlayingNotes([]);
    }, 1800);
  }, [theoryType, theoryRoot, initializeAudioContext, handleUiKeyPress, handleUiKeyRelease]);

  const handlePracticeTheoryInGame = useCallback(async () => {
    const item = THEORY_ITEMS.find((t) => t.id === theoryType) || THEORY_ITEMS[0];
    const generated = buildTheoryPracticeNotes(theoryRoot, item.intervals, item.category);

    handleStopPlayback(true, false, true);
    setCurrentFileName(`${item.name} (${ROOT_OPTIONS.find((r) => r.midi === theoryRoot)?.name})`);

    const offsetNotes: MidiNotePlaybackItem[] = generated.map((n) => ({
      ...n,
      pitchClass: n.name ? n.name.replace(/[0-9-]/g, '') : (n.pitchClass || 'C'),
      timeMs: n.timeMs + INITIAL_PLAYBACK_DELAY_MS,
    }));

    setPlaybackNotes(offsetNotes);
    const maxTime = offsetNotes.reduce((m, n) => Math.max(m, n.timeMs + n.durationMs), 0) + 4000;
    const bars: number[] = [];
    for (let t = INITIAL_PLAYBACK_DELAY_MS; t <= maxTime; t += 2000) {
      bars.push(t);
    }
    setBarLines(bars);

    await initializeAudioContext();
    await preloadSamplesForSong(offsetNotes);
    setIsTopBarVisible(true);
    setIsLoadingContent(false);
    handlePlay();
  }, [theoryType, theoryRoot, handleStopPlayback, initializeAudioContext, preloadSamplesForSong, handlePlay]);

  useEffect(() => {
    if (currentScreen === "learnMode") {
      setIsLearnModeActive(true);
      isLearnModeActiveRef.current = true;
    }
  }, [currentScreen]);

  const handleDrumPadDown = useCallback(
    (padId: string) => {
      const pad = DRUM_PADS.find((p) => p.id === padId);
      if (!pad || !pad.midiNotes.length) return;

      if (padId === "hihat_foot") {
        setIsHiHatFootPressed(true);
        isHiHatFootPressedRef.current = true;
      }

      let midiNote = pad.midiNotes[0];

      // Special Logic for Hi-Hat: If Pedal (hihat_foot) is held, use Closed Hi-Hat (42)
      // Otherwise use Open Hi-Hat (46)
      if (padId === "hihat") {
        midiNote = isHiHatFootPressedRef.current ? 42 : 46;
      }

      handleUiKeyPress(pad.name, midiNote);
    },
    [handleUiKeyPress, userActiveMidiNotes],
  );

  const handleDrumPadUp = useCallback(
    (padId: string) => {
      const pad = DRUM_PADS.find((p) => p.id === padId);
      if (!pad || !pad.midiNotes.length) return;

      if (padId === "hihat_foot") {
        setIsHiHatFootPressed(false);
        isHiHatFootPressedRef.current = false;
      }

      const midiNote = pad.midiNotes[0];
      handleUiKeyRelease(pad.name, midiNote);
    },
    [handleUiKeyRelease],
  );

  const handleUiKeyPressRef = useRef(handleUiKeyPress);
  useEffect(() => {
    handleUiKeyPressRef.current = handleUiKeyPress;
  }, [handleUiKeyPress]);

  const handleUiKeyReleaseRef = useRef(handleUiKeyRelease);
  useEffect(() => {
    handleUiKeyReleaseRef.current = handleUiKeyRelease;
  }, [handleUiKeyRelease]);

  const loadFile = useCallback(
    async (
      f: File | null,
      id?: string | null,
      r?: boolean | null,
      mLink?: string | null,
      mOffset?: number | null,
      bgUrl?: string | null,
      accLevel?: number | null,
    ) => {
      fingeringLoadController.current?.abort();
      const controller = new AbortController();
      fingeringLoadController.current = controller;
      setFingeringError('');
      setFingeringWarnings([]);
      setCurrentFileName(null);
      setFingeringLoadingMessage('Reading song file...');
      fileRef.current = f;
      setIsLoadingFile(true);
      handleStopPlayback();
      setPlaybackNotes([]);
      setHandPoses([]);
      setCurrentOnlineSongId(id || null);
      setIsCurrentSongRanked(r || null);
      setCurrentMidiLink(mLink || null);
      setCurrentMidiOffset(mOffset || null);
      setBackingTrackOffset(mOffset || 0);
      setBackingTrackFile(null);
      setCurrentSongBackgroundUrl(bgUrl || null);
      setCurrentSongAccuracyLevel(accLevel || null);
      if (!f) {
        setIsLoadingFile(false);
        return;
      }
      try {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (f.type !== "application/json" && ext !== "mid" && ext !== "midi" && !f.type.includes("midi")) {
          throw new Error("Only MIDI files (.mid, .midi) are supported.");
        }
        let res: any;
        let notesWithF: MidiNotePlaybackItem[];
        if (f.type === "application/json") {
          res = JSON.parse(await f.text());
          notesWithF = res.notes;
          setCurrentFileType(FileType.UNKNOWN);
        } else {
          res = await parsePlaybackFile(f, midiNoteToNameMap);
          notesWithF = assignFingering(res.notes);
        }
        if (controller.signal.aborted) return;
        setFingeringLoadingMessage("Preparing audio...");
        setPlaybackNotes(notesWithF);
        setCurrentFileName(f.name);
        setInitialTimeSignature(res.timeSignature);
        setInitialKeySignature(res.keySignature);
        setCurrentTempoBpm(res.initialTempoBpm);
        setTempoEvents(res.tempoEvents);
        setSignatureEvents(res.signatureEvents || []);
        if (ext === "mid" || ext === "midi") setCurrentFileType(FileType.MIDI);
        else if (ext === "xml" || ext === "musicxml" || ext === "mxl")
          setCurrentFileType(FileType.MUSICXML);
        setBarLines((res.barLinesMs as number[]) || []);
        if (notesWithF.length > 0) await preloadSamplesForSong(notesWithF);
        else setIsPreloading(false);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
        setFingeringError(e instanceof Error ? e.message : "Error processing file.");
      } finally {
        if (fingeringLoadController.current === controller) {
          setIsLoadingFile(false);
          setIsPreloading(false);
          setFingeringLoadingMessage('');
          setSelectedOnlineSongIdForNavigation(null);
        }
      }
    },
    [handleStopPlayback, preloadSamplesForSong, midiNoteToNameMap, fingeringPreferences, noteLabelType, instrumentMode],
  );

  useEffect(() => {
    if (isSettingsPreviewActiveRef.current) return;
    if (noteLabelType === 'fingering' && instrumentMode === 'piano') {
      if (playbackNotes.length > 0 && playbackNotes.some(n => !n.finger)) {
        setPlaybackNotes(assignFingering(playbackNotes));
      }
    }
  }, [noteLabelType, instrumentMode, playbackNotes]);

  const executeCalibrationStart = useCallback(async () => {
    try {
      await handleExitSettingsPreviewRef.current();
      setIsLoadingFile(true);
      isCalibratingRef.current = true;
      setIsCalibrating(true);
      calibrationAutoplayPendingRef.current = true;

      // Save current metronome mode to restore later
      previousMetronomeModeRef.current = metronomeMode;
      setMetronomeMode("beat");

      // Keep existing noteOffsetMs (Hitbox Shift) intact as set by the user
      setUserAudioSyncOffset(0);
      userAudioSyncOffsetRef.current = 0;

      const response = await fetch("/sounds/offset.mid");
      if (!response.ok) {
        throw new Error("Failed to load /sounds/offset.mid");
      }
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], "offset.mid", { type: "audio/midi" });
      const parsed = await parseMidiData(arrayBuffer, midiNoteToNameMap);
      fileRef.current = file;
      setPlaybackNotes(parsed.notes);
      setHandPoses([]);
      setCurrentFileName(file.name);
      setCurrentOnlineSongId("calibration_offset_song");
      setIsCurrentSongRanked(false);
      setCurrentFileType(FileType.MIDI);
      setInitialTimeSignature(parsed.timeSignature);
      setInitialKeySignature(parsed.keySignature);
      setCurrentTempoBpm(parsed.initialTempoBpm);
      setTempoEvents(parsed.tempoEvents);
      setSignatureEvents(parsed.signatureEvents || []);
      setBarLines(parsed.barLinesMs || []);
      await preloadSamplesForSong(parsed.notes);

      // Start the game with calibration settings
      await handleStartGame({
        waitMode: "off",
        playbackTempoMultiplier: 1,
        practiceHand: "both",
        noteToleranceMs: 150,
        accuracyLevel: 5,
        isNonStop: true,
        isHpEnabled: false,
        instrumentMode: instrumentMode,
      });
    } catch (e) {
      console.error("Calibration load error:", e);
      calibrationAutoplayPendingRef.current = false;
      alert("Error starting calibration. Please make sure public/sounds/offset.mid is accessible.");
      isCalibratingRef.current = false;
      setIsCalibrating(false);
      // Restore previous metronome mode on error
      if (previousMetronomeModeRef.current !== null) {
        setMetronomeMode(previousMetronomeModeRef.current);
        previousMetronomeModeRef.current = null;
      }
    } finally {
      setIsLoadingFile(false);
    }
  }, [instrumentMode, metronomeMode, midiNoteToNameMap, preloadSamplesForSong]);

  const handleStartCalibration = useCallback(() => {
    setShowCalibrationTutorial(true);
  }, []);

  useEffect(() => {
    if (fileRef.current) {
      loadFile(
        fileRef.current,
        currentOnlineSongId,
        isCurrentSongRanked,
        currentMidiLink,
        currentMidiOffset,
        currentSongBackgroundUrl,
        currentSongAccuracyLevel,
      );
    }
  }, [instrumentMode, viewMode]);

  // Global interaction unlock for AudioContext
  useEffect(() => {
    const unlock = async () => {
      await initializeAudioContext();
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock);
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [initializeAudioContext]);

  const handleMidiMessage = useCallback(
    (e: MIDIMessageEvent) => {
      if (viewMode === "qwerty_mania") return;

      // Drum Mode MIDI restriction: If in drum mode and input mode is non-midi, ignore MIDI
      if (instrumentMode === "drum" && drumInputMode === "non-midi") return;

      const data = e.data;
      if (!data) return;
      const [c, n, v] = data;

      // Handle MIDI Control Change (CC) messages
      if ((c & 0xf0) === 0xb0) {
        if (n === 64) {
          // Sustain Pedal
          const isPressed = v >= 64;
          isSustainPedalActiveRef.current = isPressed;
          setIsSustainPedalActive(isPressed);
          if (!isPressed) {
            sustainedByPedalKeysRef.current.forEach((midiNote, keyName) => {
              stopSustainedSound(keyName, midiNote);
            });
            sustainedByPedalKeysRef.current.clear();
          }
        } else if (n === 4) {
          // Hi-Hat Foot controller (standard for hi-hat pedals)
          const isPressed = v >= 64;
          setIsHiHatFootPressed(isPressed);
          isHiHatFootPressedRef.current = isPressed;
        }
        return;
      }

      // Input Remapping Logic: Translate logical drum pads to standard internal MIDI notes
      let noteToProcess = n;
      let hitPadId: string | undefined = undefined;

      if (instrumentMode === "drum") {
        hitPadId = midiToDrumPadIdMap.get(n);
        if (hitPadId) {
          // Preserve the user's exact MIDI input directly via DRUM_PRIMARY_MIDI_MAP mapping to keep Open, Closed, and Foot distinct
          if (DRUM_PRIMARY_MIDI_MAP[n] !== undefined) {
            noteToProcess = DRUM_PRIMARY_MIDI_MAP[n];
          } else {
            // Fallback for custom drum mappings or other secondary notes
            const standardPad = DRUM_PADS.find((p) => p.id === hitPadId);
            if (standardPad && standardPad.midiNotes.length > 0) {
              noteToProcess = standardPad.midiNotes[0];
            }
          }
        }
      }

      let k = midiNoteToKeyDefMap.get(noteToProcess);
      if (instrumentMode === "drum" && !k) {
        // Drum pads aren't in piano map, find in default drum pads
        const pad = DRUM_PADS.find((p) => p.midiNotes.includes(noteToProcess));
        if (pad) {
          k = {
            id: pad.id,
            name: pad.name,
            displayName: pad.name,
            type: "white",
            midiNote: noteToProcess,
          };
        }
      }

      if (!k) return;

      if ((c & 0xf0) === 0x90 && v > 0) {
        // Anti Double Trigger: Prevent double hits from vibration. Keyed by input note (n).
        if (antiDoubleTriggerEnabled) {
          const now = e.timeStamp || performance.now();
          const lastTime = lastTriggerTimeRef.current.get(n) || 0;
          if (now - lastTime < antiDoubleTriggerInterval) {
            return;
          }
          lastTriggerTimeRef.current.set(n, now);
        }

        if (instrumentMode === "drum" && hitPadId === "hihat_foot") {
          setIsHiHatFootPressed(true);
          isHiHatFootPressedRef.current = true;
        }
        setUserActiveKeys((p) => new Set(p).add(k!.name));
        setUserSustainedKeys((p) => new Set(p).add(k!.name));
        startSustainedSound(k!.name, noteToProcess, v / 127);
        if (isPlayingRef.current && !isFreePlayMode) processKeyPress(noteToProcess);
        if (isFreePlayMode) handleFreePlayKeyPress(noteToProcess);
      } else if ((c & 0xf0) === 0x80 || ((c & 0xf0) === 0x90 && v === 0)) {
        if (instrumentMode === "drum" && hitPadId === "hihat_foot") {
          setIsHiHatFootPressed(false);
          isHiHatFootPressedRef.current = false;
        }
        setUserActiveKeys((p) => {
          const ns = new Set(p);
          ns.delete(k!.name);
          return ns;
        });
        setUserSustainedKeys((p) => {
          const ns = new Set(p);
          ns.delete(k!.name);
          return ns;
        });
        if (isSustainPedalActiveRef.current)
          sustainedByPedalKeysRef.current.set(k!.name, noteToProcess);
        else stopSustainedSound(k!.name, noteToProcess);
        if (isFreePlayMode) handleFreePlayKeyRelease(noteToProcess);
      }
    },
    [
      midiNoteToNameMap,
      startSustainedSound,
      stopSustainedSound,
      processKeyPress,
      isFreePlayMode,
      handleFreePlayKeyPress,
      handleFreePlayKeyRelease,
      viewMode,
      instrumentMode,
      drumInputMode,
      antiDoubleTriggerEnabled,
      antiDoubleTriggerInterval,
      midiToDrumPadIdMap,
      drumMapping,
    ],
  );

  const connectMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setMidiAccessStatus("unsupported");
      return;
    }
    setMidiAccessStatus("requesting");
    try {
      const ma = await navigator.requestMIDIAccess({ sysex: false });
      midiAccessInstanceRef.current = ma;
      setMidiAccessStatus("granted");
      setMidiInputs(new Map(ma.inputs.entries()));
      setMidiOutputs(new Map(ma.outputs.entries()));
      ma.onstatechange = () => {
        if (midiAccessInstanceRef.current) {
          const ci = new Map(midiAccessInstanceRef.current.inputs.entries()),
            co = new Map(midiAccessInstanceRef.current.outputs.entries());
          setMidiInputs(ci);
          setMidiOutputs(co);
        }
      };
    } catch (err) {
      console.error("MIDI Access Denied:", err);
      setMidiAccessStatus("denied");
    }
  }, []);

  useEffect(() => {
    connectMidi();
  }, [connectMidi]);
  useEffect(() => {
    if (selectedMidiInputId && !midiInputs.has(selectedMidiInputId)) {
      setSelectedMidiInputId(null);
    } else if (!selectedMidiInputId && midiInputs.size > 0) {
      const firstInputId = midiInputs.keys().next().value;
      setSelectedMidiInputId(firstInputId);
    }
  }, [midiInputs]);
  useEffect(() => {
    if (selectedMidiOutputId && !midiOutputs.has(selectedMidiOutputId)) {
      setSelectedMidiOutputId(null);
    }
  }, [midiOutputs, selectedMidiOutputId]);
  useEffect(() => {
    handleMidiMessageRef.current = handleMidiMessage;
  }, [handleMidiMessage]);

  useEffect(() => {
    const ai = selectedMidiInputId ? midiInputs.get(selectedMidiInputId) : null;
    if (activeMidiInputDeviceRef.current && activeMidiInputDeviceRef.current !== ai) {
      activeMidiInputDeviceRef.current.onmidimessage = null;
    }
    if (ai) {
      ai.onmidimessage = (e: MIDIMessageEvent) => {
        handleMidiMessageRef.current?.(e);
      };
      activeMidiInputDeviceRef.current = ai;
    } else {
      activeMidiInputDeviceRef.current = null;
    }
    return () => {
      if (activeMidiInputDeviceRef.current) {
        activeMidiInputDeviceRef.current.onmidimessage = null;
        activeMidiInputDeviceRef.current = null;
      }
    };
  }, [selectedMidiInputId, midiInputs]);

  const activeMidiNotesInfoForKeyboard = useMemo(() => {
    const notePerKey = new Map<string, ActiveMidiNoteInfo>();
    if (isFreePlayMode) return notePerKey;
    for (const info of activePlaybackNotesInfo.values())
      if (info.status === "user_played") notePerKey.set(info.name, info);
    const len = majorVisualNotesForGame.length;
    if (len > 0) {
      let low = 0, high = len - 1;
      let startIdx = 0;
      const minTime = musicalCurrentTimeMs - VISUAL_NOTE_CAP_MS;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (majorVisualNotesForGame[mid].timeMs >= minTime) {
          startIdx = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      for (let i = startIdx; i < len; i++) {
        const n = majorVisualNotesForGame[i];
        if (n.timeMs > musicalCurrentTimeMs) break;
        const dur =
          sequentialVisualDurationByNoteId.get(n.noteId) ??
          Math.min(n.durationMs, VISUAL_NOTE_CAP_MS);
        if (musicalCurrentTimeMs < n.timeMs + dur) {
          if (!notePerKey.has(n.name)) {
            notePerKey.set(n.name, {
              ...n,
              status: activePlaybackNotesInfo.get(n.noteId)?.status || "playing",
            });
          }
        }
      }
    }
    return notePerKey;
  }, [
    activePlaybackNotesInfo,
    musicalCurrentTimeMs,
    majorVisualNotesForGame,
    sequentialVisualDurationByNoteId,
    isFreePlayMode,
  ]);

  const handleQwertyKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        ) &&
        e.target === document.body
      )
        e.preventDefault();
      if (e.code === "Space" && !e.repeat) {
        setIsSustainPedalActive((prev) => {
          const isTurningOff = !prev;
          isSustainPedalActiveRef.current = !prev;
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

      // If in piano mode but not using computer mapping, we use the note-based mapping
      // But we must check if we should return early for drum mode
      if (instrumentMode === "drum" && drumInputMode === "midi") return;

      if (e.repeat) return;
      const lower = e.code.toLowerCase();
      const keyChar = e.key.toLowerCase();

      // Drum Mode Keyboard Mapping
      if (instrumentMode === "drum") {
        let midi = DRUM_KEYBOARD_MAP[keyChar];
        if (midi !== undefined) {
          // Anti Double Trigger for Keyboard
          if (antiDoubleTriggerEnabled) {
            const now = performance.now();
            const lastTime = lastTriggerTimeRef.current.get(midi) || 0;
            if (now - lastTime < antiDoubleTriggerInterval) {
              return;
            }
            lastTriggerTimeRef.current.set(midi, now);
          }

          if (midi === 44) {
            setIsHiHatFootPressed(true);
            isHiHatFootPressedRef.current = true;
          }

          // Dynamically map hi-hat open/closed based on foot pedal keyboard state
          if (midi === 42 || midi === 46) {
            midi = isHiHatFootPressedRef.current ? 42 : 46;
          }

          const key = midiNoteToKeyDefMap.get(midi);
          if (key) {
            qwertyActiveKeysRef.current.add(lower);
            handleUiKeyPress(key.name, key.midiNote);
          }
        }
        return;
      }

      if (qwertyLayout === "mirp") {
        if (lower === "arrowup") {
          setMirpTranspose((p) => p + 1);
          return;
        }
        if (lower === "arrowdown") {
          setMirpTranspose((p) => p - 1);
          return;
        }
        const entry = MIRP_KEYBOARD_MAPPING.find(
          (m) => m.code === e.code && m.shift === e.shiftKey,
        );
        if (entry) {
          const midi = entry.midi + mirpTranspose,
            key = midiNoteToKeyDefMap.get(midi);
          activeMirpNotesRef.current.set(e.code, midi);
          if (key) handleUiKeyPress(key.name, key.midiNote);
        }
        return;
      }
      if (qwertyActiveKeysRef.current.has(lower)) return;
      if (OCTAVE_DOWN_KEYS.includes(lower)) {
        setQwertyCurrentOctaveShift((p) =>
          Math.max(MIN_QWERTY_OCTAVE_SHIFT, p - 1),
        );
        qwertyActiveKeysRef.current.add(lower);
        return;
      }
      if (OCTAVE_UP_KEYS.includes(lower)) {
        setQwertyCurrentOctaveShift((p) =>
          Math.min(MAX_QWERTY_OCTAVE_SHIFT, p + 1),
        );
        qwertyActiveKeysRef.current.add(lower);
        return;
      }
      const m = QWERTY_MINI_KEYBOARD_MAPPING.find((x) => x.qwertyKey === lower);
      if (m) {
        const midi = m.midiBase + qwertyCurrentOctaveShift * 12,
          key = midiNoteToKeyDefMap.get(midi);
        if (key) {
          qwertyActiveKeysRef.current.add(lower);
          handleUiKeyPress(key.name, key.midiNote);
        }
      }
    },
    [
      qwertyLayout,
      mirpTranspose,
      qwertyCurrentOctaveShift,
      midiNoteToKeyDefMap,
      handleUiKeyPress,
      viewMode,
      gameplayStyle,
      stopSustainedSound,
      instrumentMode,
      drumInputMode,
      antiDoubleTriggerEnabled,
      antiDoubleTriggerInterval,
    ],
  );

  const handleQwertyKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // Drum Mode Non-MIDI restriction: If in drum mode and input mode is midi, ignore keyboard
      if (instrumentMode === "drum" && drumInputMode === "midi") return;

      const lower = e.code.toLowerCase();
      const keyChar = e.key.toLowerCase();

      // Drum Mode Keyboard Mapping
      if (instrumentMode === "drum") {
        const midi = DRUM_KEYBOARD_MAP[keyChar];
        if (midi !== undefined) {
          if (midi === 44) {
            setIsHiHatFootPressed(false);
            isHiHatFootPressedRef.current = false;
          }
          if (midi === 42 || midi === 46) {
            const key42 = midiNoteToKeyDefMap.get(42);
            if (key42) handleUiKeyRelease(key42.name, 42);
            const key46 = midiNoteToKeyDefMap.get(46);
            if (key46) handleUiKeyRelease(key46.name, 46);
          } else {
            const key = midiNoteToKeyDefMap.get(midi);
            if (key) {
              handleUiKeyRelease(key.name, key.midiNote);
            }
          }
        }
        if (qwertyActiveKeysRef.current.has(lower))
          qwertyActiveKeysRef.current.delete(lower);
        return;
      }

      if (qwertyLayout === "mirp") {
        const m = activeMirpNotesRef.current.get(e.code);
        if (m !== undefined) {
          const key = midiNoteToKeyDefMap.get(m);
          if (key) handleUiKeyRelease(key.name, key.midiNote);
          activeMirpNotesRef.current.delete(e.code);
        }
        return;
      }
      if (qwertyActiveKeysRef.current.has(lower))
        qwertyActiveKeysRef.current.delete(lower);
      if (OCTAVE_DOWN_KEYS.includes(lower) || OCTAVE_UP_KEYS.includes(lower))
        return;
      const m = QWERTY_MINI_KEYBOARD_MAPPING.find((x) => x.qwertyKey === lower);
      if (m) {
        const midi = m.midiBase + qwertyCurrentOctaveShift * 12,
          key = midiNoteToKeyDefMap.get(midi);
        if (key) {
          handleUiKeyRelease(key.name, key.midiNote);
        }
      }
    },
    [
      qwertyLayout,
      qwertyCurrentOctaveShift,
      midiNoteToKeyDefMap,
      handleUiKeyRelease,
      viewMode,
      gameplayStyle,
      instrumentMode,
      drumInputMode,
    ],
  );

  useEffect(() => {
    if (currentScreen === "inGame") {
      window.addEventListener("keydown", handleQwertyKeyDown);
      window.addEventListener("keyup", handleQwertyKeyUp);
    }
    return () => {
      window.removeEventListener("keydown", handleQwertyKeyDown);
      window.removeEventListener("keyup", handleQwertyKeyUp);
    };
  }, [currentScreen, handleQwertyKeyDown, handleQwertyKeyUp]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (
        currentScreen !== "inGame" ||
        notesForGame.length === 0 ||
        waitMode === "retical"
      )
        return;
      if (
        document.activeElement &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
      )
        return;
      if (e.key === "ArrowRight") handleBarNavigation("forward");
      else if (e.key === "ArrowLeft") handleBarNavigation("backward");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [currentScreen, notesForGame, waitMode, handleBarNavigation]);
  useEffect(() => {
    if (currentScreen !== "inGame" || !isLoadingContent) return;
    const startPlayback = () => {
      setIsLoadingContent(false);
      isUserPausedRef.current = true;
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Automatically execute the instant scroll-to-bottom seek (handleSeek(0)) once game view is ready
      if (!isFreePlayModeRef.current && !isCalibratingRef.current) {
        void handleSeekRef.current(0, true);
        preseekBackingTrackToTime(0);
      }
    };
    if (viewMode === "sheet") {
      if (renderedLayoutId > 0) {
        const timer = setTimeout(startPlayback, 200);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(startPlayback, 500);
      return () => clearTimeout(timer);
    }
  }, [
    currentScreen,
    isLoadingContent,
    viewMode,
    renderedLayoutId,
    isFreePlayMode,
    handlePlay,
  ]);

  useEffect(() => {
    const save = async () => {
      if (
        performanceSummary &&
        !isPlaying &&
        isCacheableMode(gameSettings, currentFileType === FileType.MIDI) &&
        gameSettings?.waitMode === "retical" &&
        session &&
        currentOnlineSongId &&
        isCurrentSongRanked === true
      ) {
        // Enforce allowed ranked tempos (0.75x, 1x, 1.25x, 1.5x)
        const allowedRankedTempos = [0.75, 1, 1.25, 1.5];
        const tempoMultiplier = performanceSummary.playbackTempoMultiplier ?? 1;
        const isValidRankedTempo = allowedRankedTempos.some(t => Math.abs(t - tempoMultiplier) < 0.01);
        if (!isValidRankedTempo) {
          console.warn("Score rejected for ranked submission: tempo multiplier " + tempoMultiplier + " is not in [0.75, 1, 1.25, 1.5]");
          return;
        }

        try {
          const currentMode = "retical";

          // Check if instrument_mode column exists
          const { data: testData, error: testError } = await supabase
            .from("scores")
            .select("instrument_mode")
            .limit(1);
          const hasInstrumentMode = !testError || testError.code !== "42703";

          // 1. Fetch all existing score entries for this user and song
          const { data: existingScoresData, error: fetchScoresError } = await supabase
            .from("scores")
            .select("id, final_score, instrument_mode")
            .eq("user_id", session.user.id)
            .eq("song_id", currentOnlineSongId);

          if (fetchScoresError) {
            console.error("Error fetching existing scores:", fetchScoresError);
          }

          const existingScores = existingScoresData || [];

          // Filter matching scores for this instrument mode (handling both exact match and legacy NULLs)
          const matchingScores = existingScores.filter((s: any) => {
            if (!hasInstrumentMode) return true;
            return s.instrument_mode === performanceSummary.instrumentMode || !s.instrument_mode;
          });

          const currentBestScore = matchingScores.reduce(
            (max: number, s: any) => Math.max(max, s.final_score ?? -1),
            -1
          );

          if (performanceSummary.finalScore > currentBestScore) {
            // Delete all previous lower scores for this user and song by primary key ID
            const idsToDelete = matchingScores.map((s: any) => s.id);
            if (idsToDelete.length > 0) {
              const { error: delError } = await supabase
                .from("scores")
                .delete()
                .in("id", idsToDelete);
              if (delError) {
                console.error("Failed to delete older scores by id:", delError);
              }
            }

            // Also fallback delete by user_id and song_id
            let delQuery = supabase
              .from("scores")
              .delete()
              .eq("user_id", session.user.id)
              .eq("song_id", currentOnlineSongId);
            if (hasInstrumentMode && performanceSummary.instrumentMode) {
              delQuery = delQuery.or(`instrument_mode.eq.${performanceSummary.instrumentMode},instrument_mode.is.null`);
            }
            await delQuery;

            const scoreData: any = {
              user_id: session.user.id,
              song_id: currentOnlineSongId,
              final_score: performanceSummary.finalScore,
              accuracy: performanceSummary.accuracy,
              rank: performanceSummary.rank,
              perfect_count: performanceSummary.perfectCount,
              great_count: performanceSummary.greatCount,
              good_count: performanceSummary.goodCount,
              miss_count: performanceSummary.missCount,
              total_notes: performanceSummary.totalNoteCount,
              mode: currentMode,
              tempo_multiplier: performanceSummary.playbackTempoMultiplier,
              gameplay_style: performanceSummary.gameplayStyle,
              max_combo: performanceSummary.maxCombo,
              created_at: new Date().toISOString(),
            };

            if (hasInstrumentMode) {
              scoreData.instrument_mode = performanceSummary.instrumentMode;
            }

            const { error: insertError } = await supabase
              .from("scores")
              .insert(scoreData);
            if (insertError) {
              console.error("Failed to insert score:", insertError);
              throw insertError;
            }
          } else {
            // If new score is not higher, but redundant duplicate lower records exist, clean them up
            if (matchingScores.length > 1) {
              const maxEntry = matchingScores.reduce(
                (prev: any, curr: any) => (curr.final_score > prev.final_score ? curr : prev),
                matchingScores[0]
              );
              const redundantIds = matchingScores.filter((s: any) => s.id !== maxEntry.id).map((s: any) => s.id);
              if (redundantIds.length > 0) {
                await supabase.from("scores").delete().in("id", redundantIds);
              }
            }
          }
        } catch (e) {
          console.error("Failed to save score:", e);
        }
      }
    };
    save();
  }, [
    performanceSummary,
    isPlaying,
    gameSettings,
    session,
    currentOnlineSongId,
    isCurrentSongRanked,
  ]);


  useEffect(() => {
    if (!isFreePlayMode) {
      setDetectedChord(null);
      return;
    }
    if (chordDetectionTimeoutRef.current)
      clearTimeout(chordDetectionTimeoutRef.current);
    chordDetectionTimeoutRef.current = window.setTimeout(() => {
      const buffer = recentNotesBufferRef.current;
      const elapsed = performance.now() - freePlayStartTimeRef.current;
      const recentMidis = Array.from(buffer.entries())
        .filter(
          ([_, timestamp]) =>
            elapsed - timestamp < FREE_PLAY_ARPEGGIO_WINDOW_MS,
        )
        .map(([midi, _]) => midi);
      if (recentMidis.length < 2) {
        setDetectedChord(null);
        return;
      }
      const pcSet = new Set(recentMidis.map((m) => m % 12));
      const pc = Array.from(pcSet).sort((a: number, b: number) => a - b);
      if (pc.length < 2) {
        setDetectedChord(null);
        return;
      }
      let bestMatch = null;
      for (const root of pc) {
        const normalizedIntervals = pc
          .map((p) => (p - root + 12) % 12)
          .sort((a: number, b: number) => a - b)
          .join(",");
        const formula = CHORD_FORMULAS[normalizedIntervals];
        if (formula) {
          bestMatch = `${PITCH_CLASS_TO_NAME[root]}${formula.name}`;
          break;
        }
      }
      setDetectedChord(bestMatch);
    }, 50);
    return () => {
      if (chordDetectionTimeoutRef.current)
        clearTimeout(chordDetectionTimeoutRef.current);
    };
  }, [userSustainedKeys, isFreePlayMode]);

  useEffect(() => {
    if (!isRecording && recordedNotes.length > 0) setShowSaveButton(true);
    else setShowSaveButton(false);
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
      midi.header.setTempo(freePlayBpm);
      midi.header.timeSignatures = [
        {
          ticks: 0,
          timeSignature: [
            freePlayTimeSignature.numerator,
            freePlayTimeSignature.denominator,
          ],
        },
      ];
      midi.header.update();

      const track = midi.addTrack();
      track.name = "Recording";
      const now = performance.now();
      const recEndTime = recordingStartTimeRef.current
        ? now - recordingStartTimeRef.current
        : 0;
      const finalNotes = recordedNotes.map((note) => {
        if (note.durationMs === 0 && recEndTime > note.timeMs) {
          return { ...note, durationMs: Math.max(1, recEndTime - note.timeMs) };
        }
        return note;
      });
      userSustainedKeys.forEach((keyName) => {
        const keyDef = noteNameToKeyDefMap.get(keyName);
        if (keyDef && !recordedNotes.some((n) => n.midi === keyDef.midiNote)) {
          finalNotes.push({
            noteId: `rec-sustained-${keyDef.midiNote}-${now}`,
            midi: keyDef.midiNote,
            timeMs: 0,
            durationMs: recEndTime,
            name: keyDef.name,
            pitchClass: keyDef.displayName,
            velocity: 0.75,
            hand: keyDef.midiNote < HAND_SPLIT_MIDI_NOTE ? "left" : "right",
            originalTrackSourceInfo: "recording-sustained",
          } as MidiNotePlaybackItem);
        }
      });
      finalNotes.forEach((note) => {
        if (note.durationMs > 0) {
          track.addNote({
            midi: note.midi,
            time: note.timeMs / 1000,
            duration: note.durationMs / 1000,
            velocity: note.velocity,
          });
        }
      });
      const midiArray = midi.toArray();
      if (midiArray.length === 0) {
        alert("No notes recorded to save.");
        return;
      }
      const blob = new Blob([midiArray as any], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `octavia_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRecordedNotes([]);
      setShowSaveButton(false);
    } catch (e) {
      alert("Failed to generate MIDI file.");
    }
  }, [
    recordedNotes,
    userSustainedKeys,
    noteNameToKeyDefMap,
    freePlayBpm,
    freePlayTimeSignature,
  ]);

  const notesForFallingView = useMemo(() => {
    if (viewMode !== "falling") return [];
    return notesForGame;
  }, [notesForGame, viewMode]);
  const vexFlowData = useMemo(() => {
    if (
      (viewMode !== "sheet" &&
        viewMode !== "sheet-roll" &&
        viewMode !== "sheet-qwerty") ||
      !notesForGame.length ||
      !initialTimeSignature ||
      currentTempoBpm === null ||
      currentTempoBpm <= 0
    )
      return null;
    if (
      baseCalculatedPianoWidth == null ||
      baseCalculatedPianoWidth <= 0 ||
      !Number.isFinite(baseCalculatedPianoWidth) ||
      contentAreaHeight == null ||
      contentAreaHeight <= 0 ||
      !Number.isFinite(contentAreaHeight)
    )
      return null;
    try {
      return getVexFlowRenderData(
        notesForGame,
        initialTimeSignature,
        currentTempoBpm,
        initialKeySignature,
        viewMode === "sheet-roll" || viewMode === "sheet-qwerty"
          ? noteSpeedMultiplier
          : sheetMusicZoom,
        barLines,
        signatureEvents,
        baseCalculatedPianoWidth,
        contentAreaHeight,
        instrumentMode === "drum" ? true : showOnlyMajorNotes,
        tempoEvents,
        playbackTempoMultiplier,
        viewMode === "sheet-roll" || viewMode === "sheet-qwerty",
        instrumentMode,
      );
    } catch (e) {
      console.error("vexFlowData error:", e);
      return null;
    }
  }, [
    notesForGame,
    initialTimeSignature,
    currentTempoBpm,
    initialKeySignature,
    sheetMusicZoom,
    noteSpeedMultiplier,
    barLines,
    signatureEvents,
    baseCalculatedPianoWidth,
    contentAreaHeight,
    showOnlyMajorNotes,
    tempoEvents,
    playbackTempoMultiplier,
    viewMode,
    instrumentMode,
  ]);

  const settingsPreviewController = useRef<AbortController | null>(null);
  const settingsPreviewSession = useRef<{
    usesSong: boolean;
    settings: GameSettings | null;
    timeMs: number;
    playbackNotes: MidiNotePlaybackItem[];
    handPoses: HandPose[];
    analysisResult: ExtendedResult | null;
    initialTimeSignature: TimeSignatureInfo;
    initialKeySignature: string;
    currentTempoBpm: number | null;
    tempoEvents: TempoEvent[];
    signatureEvents: SignatureEvent[];
    currentFileType: FileType;
    barLines: number[];
    totalNoteCountForGame: number;
  } | null>(null);
  const settingsPreviewData = useRef<{ file: File; parsed: Awaited<ReturnType<typeof parseMidiData>> } | null>(null);
  const [settingsPreviewReady, setSettingsPreviewReady] = useState(false);
  const [settingsPreviewError, setSettingsPreviewError] = useState('');
  const handleExitSettingsPreview = useCallback(async () => {
    settingsPreviewRunRef.current++;
    settingsPreviewController.current?.abort();
    settingsPreviewController.current = null;
    const session = settingsPreviewSession.current;
    settingsPreviewSession.current = null;
    isSettingsPreviewActiveRef.current = false;
    setSettingsPreviewReady(false);
    if (!session) return;
    setIsLoadingFile(false);
    audioPreloadJobRef.current++;
    setIsPreloading(false);
    await handleStopPlayback(true, false, true);
    // A quick reentry owns playback now; an older exit must not restore it.
    if (settingsPreviewSession.current) return;
    setGameSettings(session.settings);
    setPlaybackNotes(session.playbackNotes);
    setHandPoses(session.handPoses);
    setAnalysisResult(session.analysisResult);
    setInitialTimeSignature(session.initialTimeSignature);
    setInitialKeySignature(session.initialKeySignature);
    setCurrentTempoBpm(session.currentTempoBpm);
    setTempoEvents(session.tempoEvents);
    setSignatureEvents(session.signatureEvents);
    setCurrentFileType(session.currentFileType);
    setBarLines(session.barLines);
    setTotalNoteCountForGame(session.totalNoteCountForGame);
    if (session.usesSong) await handleSeek(session.timeMs);
  }, [handleStopPlayback, handleSeek]);
  handleExitSettingsPreviewRef.current = handleExitSettingsPreview;
  const handleEnterSettingsPreview = useCallback(async () => {
    settingsPreviewRunRef.current++;
    settingsPreviewController.current?.abort();
    const controller = new AbortController();
    settingsPreviewController.current = controller;
    if (!settingsPreviewSession.current) {
      settingsPreviewSession.current = {
        usesSong: !!currentFileName && playbackNotes.length > 0,
        settings: gameSettings,
        timeMs: currentTimeRef.current,
        playbackNotes,
        handPoses,
        analysisResult,
        initialTimeSignature,
        initialKeySignature,
        currentTempoBpm,
        tempoEvents,
        signatureEvents,
        currentFileType,
        barLines,
        totalNoteCountForGame,
      };
      await handleStopPlayback(true, false, true);
      if (controller.signal.aborted) return;
    }
    isSettingsPreviewActiveRef.current = true;
    setSettingsPreviewReady(false);
    setSettingsPreviewError('');
    setIsTopBarVisible(true);
    setIsLoadingContent(false);
    setGameSettings({ waitMode: 'off', isAutoplay: true, isNonStop: true, accuracyLevel: (currentSongAccuracyLevel || 5) as any, practiceHand: 'both', playbackTempoMultiplier: 1, zoomDirection, drumTyperPadOpacity });
    setIsLoadingFile(true);
    try {
      let data = settingsPreviewData.current;
      if (!data) {
        const response = await fetch('/sounds/test.mid', { signal: controller.signal });
        if (!response.ok) throw new Error('The preview MIDI could not be loaded.');
        const file = new File([await response.blob()], 'Settings Preview.mid', { type: 'audio/midi' });
        data = { file, parsed: await parseMidiData(await file.arrayBuffer(), midiNoteToNameMap) };
        if (controller.signal.aborted) return;
        settingsPreviewData.current = data;
      }
      const { file, parsed: res } = data;
      // Show and play the score immediately; Python annotates it in the background.
      setPlaybackNotes(res.notes);
      setHandPoses([]);
      setInitialTimeSignature(res.timeSignature);
      setInitialKeySignature(res.keySignature);
      setCurrentTempoBpm(res.initialTempoBpm);
      setTempoEvents(res.tempoEvents);
      setSignatureEvents(res.signatureEvents);
      setCurrentFileType(FileType.MIDI);
      setBarLines(res.barLinesMs);
      setTotalNoteCountForGame(res.notes.length);
      await preloadSamplesForSong(res.notes);
      if (controller.signal.aborted) return;
      setSettingsPreviewReady(true);
      let notes = assignFingering(res.notes);
      let poses: HandPose[] = [];
      if (controller.signal.aborted) return;
      setPlaybackNotes(notes);
      setHandPoses(poses);
    } catch (error) {
      if (!controller.signal.aborted) setSettingsPreviewError('Preview failed to load. Select Restart preview to try again.');
    } finally {
      if (settingsPreviewController.current === controller) setIsLoadingFile(false);
    }
  }, [currentFileName, playbackNotes, handPoses, analysisResult, initialTimeSignature, initialKeySignature, currentTempoBpm, tempoEvents, signatureEvents, currentFileType, barLines, totalNoteCountForGame, gameSettings, handleStopPlayback, midiNoteToNameMap, preloadSamplesForSong, noteLabelType, instrumentMode, fingeringPreferences, zoomDirection, drumTyperPadOpacity]);

  const previewOptionsKey = JSON.stringify([noteLabelType, instrumentMode, fingeringPreferences]);
  const previousPreviewOptions = useRef(previewOptionsKey);
  useEffect(() => {
    const changed = previousPreviewOptions.current !== previewOptionsKey;
    previousPreviewOptions.current = previewOptionsKey;
    if (changed && currentScreen === 'settings' && settingsPreviewSession.current) {
      void handleStopPlayback(true, false, true);
      void handleEnterSettingsPreview();
    }
  }, [previewOptionsKey, currentScreen, handleEnterSettingsPreview, handleStopPlayback]);

  const prevScreenRef = useRef<Screen | undefined>(undefined);
  useEffect(() => {
    const previousScreen = prevScreenRef.current;
    prevScreenRef.current = currentScreen;
    if (previousScreen === 'settings' && currentScreen !== 'settings') handleExitSettingsPreview();
    else if (currentScreen === 'settings' && previousScreen !== 'settings') void handleEnterSettingsPreview();
  }, [currentScreen, handleEnterSettingsPreview, handleExitSettingsPreview]);
  useEffect(() => {
    if (currentScreen === 'settings' && isSettingsPreviewActiveRef.current && settingsPreviewReady && playbackNotes.length > 0 && !isPlayingRef.current) {
      void handlePlay();
    }
  }, [currentScreen, settingsPreviewReady, playbackNotes, isPlaying, viewMode, handlePlay]);
  useEffect(() => {
    if (
      calibrationAutoplayPendingRef.current &&
      currentScreen === 'inGame' &&
      isCalibrating &&
      playbackNotes.length > 0 &&
      !isLoadingFile &&
      !isLoadingContent &&
      !isPlayingRef.current
    ) {
      calibrationAutoplayPendingRef.current = false;
      void handlePlay();
    }
  }, [currentScreen, isCalibrating, playbackNotes.length, isLoadingFile, isLoadingContent, isPlaying, handlePlay]);
  const handleRestartSettingsPreview = () => {
    handleSeek(0);
    void handleEnterSettingsPreview();
  };
  const handleExitGame = useCallback(() => {
    const wasInFreePlay = isFreePlayModeRef.current;
    handleStopPlayback(true, false, true); // exitFreePlay: true, shouldRewind: false, forceResetToZero: true

    // Reset loop state
    setIsLooping(false);
    setLoopStartMs(0);
    setLoopEndMs(0);
    loopDelayStartTimeRef.current = null;
    setLoopDelayInfoWithRef(null);

    // Reset practice mode tolerance to default
    setGameSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        noteToleranceMs: instrumentMode === "piano" ? 200 : 100,
      };
    });

    if (isCalibratingRef.current) {
      calibrationAutoplayPendingRef.current = false;
      isCalibratingRef.current = false;
      setIsCalibrating(false);

      // Restore previous metronome mode
      if (previousMetronomeModeRef.current !== null) {
        setMetronomeMode(previousMetronomeModeRef.current);
        previousMetronomeModeRef.current = null;
      }

      // Clean up the loaded calibration song and MIDI states
      setPlaybackNotes([]);
      setCurrentFileName(null);
      setAnalysisResult(null);
      setInitialTimeSignature(DEFAULT_TIME_SIGNATURE);
      setInitialKeySignature(DEFAULT_KEY_SIGNATURE);
      setCurrentTempoBpm(null);
      setTempoEvents([]);
      setSignatureEvents([]);

      setCurrentScreen("settings");
      return;
    }

    if (isLearnModeActiveRef.current) {
      setIsLearnModeActive(false);
      isLearnModeActiveRef.current = false;
      setPlaybackNotes([]);
      setCurrentFileName(null);
      setCurrentScreen("mainMenu");
      return;
    }

    if (wasInFreePlay) {
      sessionStorage.setItem("songSelectionInitialTab", "local");
      setCurrentScreen("songSelection");
      setIsFreePlayMode(false);
      isFreePlayModeRef.current = false;
      // Restore previous view mode
      setViewMode(previousViewModeRef.current);
    } else {
      setCurrentScreen("modeSelection");
    }
  }, [handleStopPlayback, instrumentMode]);

  const handleToggleLoop = useCallback(() => {
    setIsLooping((p) => {
      const next = !p;
      if (next) {
        noteJudgmentsRef.current.clear();
        hitNoteIdsRef.current.clear();
        presatisfiedNoteIdsRef.current.clear();
        perfectCountRef.current = 0;
        setPerfectCount(0);
        greatCountRef.current = 0;
        setGreatCount(0);
        goodCountRef.current = 0;
        setGoodCount(0);
        missCountRef.current = 0;
        setMissCount(0);
        hitCountRef.current = 0;
        setHitCount(0);
        errorCountRef.current = 0;
        setErrorCount(0);
        comboRef.current = 0;
        setCombo(0);
        setLiveAccuracy(100);
        lastLiveAccuracyValRef.current = 100;
      }
      return next;
    });
  }, []);

  const handleSetLoopStart = useCallback(() => {
    let targetTime = currentTimeRef.current;
    if (barLines.length > 0) {
      targetTime = barLines.reduce((prev, curr) =>
        Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev,
      );
    }
    setLoopStartMs(targetTime);
    if (loopEndMs === null || loopEndMs <= targetTime)
      setLoopEndMs(absoluteEndTimeMs);
  }, [loopEndMs, absoluteEndTimeMs, barLines]);

  const handleSetLoopEnd = useCallback(() => {
    let targetTime = currentTimeRef.current;
    if (barLines.length > 0) {
      targetTime = barLines.reduce((prev, curr) =>
        Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev,
      );
    }
    if (loopStartMs !== null && targetTime > loopStartMs)
      setLoopEndMs(targetTime);
  }, [loopStartMs, barLines]);

  const handleClearLoop = useCallback(() => {
    setIsLooping(false);
    setLoopStartMs(null);
    setLoopEndMs(null);
    loopDelayStartTimeRef.current = null;
    setLoopDelayInfoWithRef(null);
  }, []);

  const stopAudioProcessing = useCallback(() => {
    if (pitchDetectionRequestRef.current) {
      cancelAnimationFrame(pitchDetectionRequestRef.current);
      pitchDetectionRequestRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (
      audioContextForInputRef.current &&
      audioContextForInputRef.current.state !== "closed"
    )
      audioContextForInputRef.current.close();
    audioContextForInputRef.current = null;
    acousticPianoServiceRef.current?.destroy();
    acousticPianoServiceRef.current = null;
    analyserRef.current = null;
    audioSourceRef.current = null;
    micActiveNotesRef.current.forEach((midi) => {
      const keyDef = midiNoteToKeyDefMap.get(midi);
      if (keyDef) handleUiKeyReleaseRef.current(keyDef.name, keyDef.midiNote);
    });
    micActiveNotesRef.current.clear();
    noteOffCandidatesRef.current.clear();
  }, [midiNoteToKeyDefMap]);

  useEffect(() => {
    const getAudioDevices = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setIsAudioInputEnabled(false);
        setAudioInputError(
          appLanguage === 'id'
            ? 'Peramban ini tidak mendukung deteksi mikrofon.'
            : appLanguage === 'es'
            ? 'Este navegador no admite detección de micrófono.'
            : 'This browser does not support microphone input.'
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((device) => device.kind === "audioinput");
        setAudioInputs(inputs);
        setAudioInputError(null);
        if (inputs.length > 0) {
          if (!selectedAudioInputId || !inputs.some((d) => d.deviceId === selectedAudioInputId)) {
            setSelectedAudioInputId(inputs[0].deviceId);
          }
        } else {
          setIsAudioInputEnabled(false);
          setAudioInputError(
            appLanguage === 'id'
              ? 'Tidak ada perangkat mikrofon yang terdeteksi.'
              : appLanguage === 'es'
              ? 'No se encontraron micrófonos.'
              : 'No microphone devices found.'
          );
        }
      } catch (err) {
        console.warn("Microphone access error:", err);
        setIsAudioInputEnabled(false);
        setAudioInputError(
          appLanguage === 'id'
            ? 'Izin mikrofon belum diberikan. Silakan izinkan akses mikrofon pada peramban Anda.'
            : appLanguage === 'es'
            ? 'Permiso de micrófono denegado. Conceda acceso al micrófono en el navegador.'
            : 'Microphone permission denied. Please allow microphone access in your browser.'
        );
      }
    };
    if (isAudioInputEnabled) getAudioDevices();
    else {
      stopAudioProcessing();
      setAudioInputs([]);
      setSelectedAudioInputId(null);
      setAudioInputError(null);
    }
    return () => stopAudioProcessing();
  }, [isAudioInputEnabled, stopAudioProcessing]);

  const startAudioProcessing = useCallback(
    async (deviceId: string) => {
      stopAudioProcessing();
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: deviceId ? { ideal: deviceId } : undefined,
              autoGainControl: false,
              echoCancellation: false,
              noiseSuppression: false,
            },
          });
        } catch {
          // Fallback if specific audio constraints are rejected by browser/OS
          stream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { ideal: deviceId } } : true,
          });
        }
        audioStreamRef.current = stream;
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext({
          latencyHint: "interactive",
        });
        if (context.state === 'suspended') {
          await context.resume();
        }
        audioContextForInputRef.current = context;
        const source = context.createMediaStreamSource(stream);
        audioSourceRef.current = source;

        // Create channel splitter for dual-channel processing
        const splitter = context.createChannelSplitter(2);
        source.connect(splitter);

        const analysers: AnalyserNode[] = [];
        const numChannels =
          stream.getAudioTracks()[0]?.getSettings().channelCount || 1;

        // Create an analyser for each channel (up to 2) with 8192 FFT size
        for (let i = 0; i < Math.min(numChannels, 2); i++) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 8192;
          analyser.smoothingTimeConstant = 0.04;
          splitter.connect(analyser, i);
          analysers.push(analyser);
        }

        // Fallback if only 1 channel is available
        if (analysers.length === 0) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 8192;
          analyser.smoothingTimeConstant = 0.04;
          source.connect(analyser);
          analysers.push(analyser);
        }

        analyserRef.current = analysers[0]; // Keep reference to first one for legacy code if any
        acousticPianoServiceRef.current = new AcousticPianoService(
          analysers,
          context,
        );

        const processPitch = () => {
          if (!acousticPianoServiceRef.current) return;

          const detectedNotes = acousticPianoServiceRef.current.detectPitch(
            micThresholdsRef.current,
          );
          const { on, off } =
            acousticPianoServiceRef.current.updateNotes(detectedNotes);

          on.forEach((midi) => {
            const keyDef = midiNoteToKeyDefMap.get(midi);
            if (keyDef)
              handleUiKeyPressRef.current(keyDef.name, keyDef.midiNote);
          });

          off.forEach((midi) => {
            const keyDef = midiNoteToKeyDefMap.get(midi);
            if (keyDef)
              handleUiKeyReleaseRef.current(keyDef.name, keyDef.midiNote);
          });

          pitchDetectionRequestRef.current =
            requestAnimationFrame(processPitch);
        };
        pitchDetectionRequestRef.current = requestAnimationFrame(processPitch);
      } catch (err) {
        setIsAudioInputEnabled(false);
      }
    },
    [stopAudioProcessing, midiNoteToKeyDefMap],
  );

  useEffect(() => {
    if (isAudioInputEnabled && selectedAudioInputId)
      startAudioProcessing(selectedAudioInputId);
    else stopAudioProcessing();
    return () => stopAudioProcessing();
  }, [
    isAudioInputEnabled,
    selectedAudioInputId,
    startAudioProcessing,
    stopAudioProcessing,
  ]);

  const zoomScale = uiZoom / 100;
  const inverseZoomScale = 100 / zoomScale;
  const bgOpacity = themeSettings.backgroundOpacity ?? 0;
  const isImageActive = !!themeSettings.backgroundUrl && bgOpacity > 0;
  const sheetMusicBackgroundColor = isImageActive ? "transparent" : "#ffffff";
  const sheetSceneColor = themeSettings.fallingNotesBackgroundColor || '#ffffff';
  const sheetSceneBrightness = [1, 3, 5].reduce((sum, index, i) => sum + parseInt(sheetSceneColor.slice(index, index + 2), 16) * [.2126, .7152, .0722][i], 0);
  const sheetNotationColor = sheetSceneBrightness < 128 ? '#e2e8f0' : '#1a1816';
  const fallingNotesBackgroundColor =
    bgOpacity === 0
      ? "#000000"
      : isImageActive
        ? "transparent"
        : themeSettings.fallingNotesBackgroundColor;

  return (
    <div
      ref={appRootRef}
      onClickCapture={async (e) => {
        const screenAtClick = currentScreen;
        let t = e.target as HTMLElement | null,
          isI = false;
        while (t && t !== appRootRef.current) {
          if (
            t.matches?.(
              'button, a, [role="button"], input, select, textarea, label',
            ) ||
            t.classList?.contains("cursor-pointer") ||
            window.getComputedStyle(t).cursor === "pointer"
          ) {
            isI = true;
            break;
          }
          t = t.parentElement;
        }
        const isInteractionNeeded = await initializeAudioContext();
        if (screenAtClick === "inGame" || screenAtClick === "midiEditor") {
          if (isPlayingRef.current && isInteractionNeeded) {
            if (audioRef.current && audioRef.current.paused)
              safePlayAudio(true);
            if (youtubePlayerRef.current) safePlayYoutube(true);
          }
          return;
        } // Skip click sounds in editor
        if (!isI || !(await initializeAudioContext())) return;
        const now = performance.now();
        if (now - lastUiClickTimeRef.current < 25) return;
        if (now - lastUiClickTimeRef.current > 500)
          uiClickComboIndexRef.current = 0;
        playSound(
          UI_CLICK_SOUND_SEQUENCE_MIDI[uiClickComboIndexRef.current],
          INTERACTIVE_NOTE_DURATION_MS,
          0.4,
          undefined,
          true,
        );
        uiClickComboIndexRef.current =
          (uiClickComboIndexRef.current + 1) %
          UI_CLICK_SOUND_SEQUENCE_MIDI.length;
        lastUiClickTimeRef.current = now;
      }}
      className="text-white w-full h-full flex flex-col font-sans overflow-hidden"
      style={{
        zoom: zoomScale,
      }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <BackgroundDisplay
          themeSettings={themeSettings}
          viewMode={viewMode}
          isFreePlayMode={isFreePlayMode}
          instrumentMode={instrumentMode}
          songBackgroundUrl={currentSongBackgroundUrl}
        />
      </div>
      {(gameSettings?.backingTrack?.type === "mp3" ||
        gameSettings?.backingTrack?.type === "link") &&
        gameSettings.backingTrack.url && (
          <audio
            key={gameSettings.backingTrack.url}
            ref={setBackingAudioElement}
            src={gameSettings.backingTrack.url}
            preload="auto"
            onLoadedMetadata={(e) => {
              connectBackingAudio(e.currentTarget);
              applyAudioPlaybackRate(e.currentTarget, playbackTempoMultiplierRef.current);
              if (!isPlayingRef.current) {
                const targetSec = getAudioStartTime(
                  currentTimeRef.current / 1000,
                  gameSettings?.backingTrack?.type,
                  gameSettings?.backingTrack?.offsetMs || 0,
                );
                if (Math.abs(e.currentTarget.currentTime - targetSec) > 0.05) {
                  try { e.currentTarget.currentTime = targetSec; } catch (err) {}
                }
              }
            }}
            onCanPlay={(e) => {
              applyAudioPlaybackRate(e.currentTarget, playbackTempoMultiplierRef.current);
              if (!isPlayingRef.current) {
                const targetSec = getAudioStartTime(
                  currentTimeRef.current / 1000,
                  gameSettings?.backingTrack?.type,
                  gameSettings?.backingTrack?.offsetMs || 0,
                );
                if (Math.abs(e.currentTarget.currentTime - targetSec) > 0.05) {
                  try { e.currentTarget.currentTime = targetSec; } catch (err) {}
                }
              }
            }}
            onPlay={(e) => {
              connectBackingAudio(e.currentTarget);
              applyAudioPlaybackRate(e.currentTarget, playbackTempoMultiplierRef.current);
              if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
            }}
            onPlaying={(e) => {
              applyAudioPlaybackRate(e.currentTarget, playbackTempoMultiplierRef.current);
              if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
            }}
            onRateChange={(e) => {
              const audio = e.currentTarget;
              const target = desiredBackingRateRef.current;
              if (Math.abs(audio.playbackRate - target) > 0.08) {
                applyAudioPlaybackRate(audio, target);
              }
            }}
            onWaiting={() => {
              if (gameSettings?.backingTrack?.type === 'link' && backingTrackStatus !== 'stalled' && backingTrackStatus !== 'error') {
                setBackingTrackStatus('stalled');
              }
            }}
            onStalled={() => {
              if (gameSettings?.backingTrack?.type === 'link' && backingTrackStatus !== 'stalled' && backingTrackStatus !== 'error') {
                setBackingTrackStatus('stalled');
              }
            }}
            onPause={() => {
              if (!isPlayingRef.current && backingTrackStatus !== 'error') setBackingTrackStatus('idle');
            }}
            onError={() => {
              if (gameSettings?.backingTrack?.type === 'link') {
                setBackingTrackStatus('error');
                setBackingTrackError('Failed to load YouTube / online MP3 audio.');
                setIsBackingTrackOverlayDismissed(false);
              }
            }}
          />
        )}
      <div ref={youtubeContainerRef} style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none", visibility: (gameSettings?.backingTrack?.type === "youtube" || gameSettings?.backingTrack?.type === "link" || (currentScreen === "modeSelection" && !!currentMidiLink)) ? "visible" : "hidden" }} />
      {currentScreen === "settings" &&
        isSettingsPreviewActiveRef.current &&
        playbackNotes.length > 0 && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-0">
              <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
                {playbackNotes.length > 0 && (
                  <div className="w-full pointer-events-auto">
                    <ProgressBar
                      currentTimeMs={musicalCurrentTimeMs}
                      totalDurationMs={absoluteEndTimeMs}
                      width={baseCalculatedPianoWidth}
                      height={PROGRESS_BAR_HEIGHT_PX}
                      onSeek={handleProgressBarSeek}
                      isPlaybackActive={isPlaying}
                      isSeekingDisabled={waitMode === "retical"}
                      loopStartMs={isLooping ? loopStartMs : null}
                      loopEndMs={isLooping ? loopEndMs : null}
                      barLines={barLines}
                    />
                  </div>
                )}
              </div>
              <div className="absolute top-0 left-0 right-0 z-50 flex flex-col pointer-events-none pt-[14px]">
                <div className="w-full pointer-events-auto">
                  {(() => {
                    const accuracyLevel = gameSettings?.accuracyLevel ?? 5;
                    const perfectWindow = 100 + (5 - accuracyLevel) * 20;
                    const greatWindow = perfectWindow * 1.5;
                    const goodWindow = perfectWindow * 2;

                    return (
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
                        onCycleMetronomeMode={() => {
                          if (isCalibrating) return; // Cannot cycle metronome mode during calibration
                          setMetronomeMode((p) =>
                            p === "off" ? "beat" : p === "beat" ? "bar" : "off",
                          );
                        }}
                        isMetronomeAvailable={isMetronomeAvailable}
                        liveAccuracy={liveAccuracy}
                        liveSpeed={liveSpeed}
                        perfectCount={perfectCount}
                        greatCount={greatCount}
                        goodCount={goodCount}
                        missCount={missCount}
                        isNonStop={gameSettings?.isNonStop ?? false}
                        totalNoteCount={totalNoteCountForGame}
                        currentTimeMs={
                          musicalCurrentTimeMs / playbackTempoMultiplier
                        }
                        totalDurationMs={
                          absoluteEndTimeMs / playbackTempoMultiplier
                        }
                        viewMode={viewMode}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        onNoteSpeedMultiplierChange={setNoteSpeedMultiplier}
                        sheetMusicZoom={sheetMusicZoom}
                        onSheetMusicZoomChange={setSheetMusicZoom}
                        analysisResult={analysisResult}
                        metronomeBeat={metronomeBeat}
                        totalWaitTimeMs={totalWaitTimeMs}
                        isFreePlayMode={isFreePlayMode}
                        isMicEnabled={isAudioInputEnabled}
                        isRecording={isRecording}
                        onToggleRecording={handleToggleRecording}
                        onSaveRecording={handleSaveRecording}
                        showSaveButton={showSaveButton}
                        isLooping={isLooping}
                        onToggleLoop={handleToggleLoop}
                        loopStartMs={loopStartMs}
                        loopEndMs={loopEndMs}
                        onSetLoopStart={handleSetLoopStart}
                        onSetLoopEnd={handleSetLoopEnd}
                        onClearLoop={handleClearLoop}
                        barLines={barLines}
                        isTopBarVisible={isTopBarVisible}
                        onToggleVisibility={() =>
                          setIsTopBarVisible(!isTopBarVisible)
                        }
                        instrumentMode={instrumentMode}
                        lastHitOffset={lastHitOffset}
                        perfectWindow={perfectWindow}
                        greatWindow={greatWindow}
                        goodWindow={goodWindow}
                        combo={combo}
                        lastJudgment={lastJudgment}
                        userAudioSyncOffset={userAudioSyncOffset}
                        onUserAudioSyncOffsetChange={setUserAudioSyncOffset}
                        isCalibrationMode={gameSettings?.isCalibrationMode}
                        userAverageOffset={userAverageOffset}
                        hp={hp}
                        appLanguage={appLanguage}
                      />
                    );
                  })()}
                </div>
              </div>
              <div
                ref={contentAreaRef}
                className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden"
              >
                <div
                  className="flex flex-col justify-end relative"
                  style={{
                    width: `${baseCalculatedPianoWidth}px`,
                    height: "100%",
                  }}
                >
                  <AnimatePresence>
                    {displayJudgment && (displayJudgment.type !== 'perfect' || showPerfectJudgment) && (
                      <div
                        key={displayJudgment.id}
                        className="absolute left-0 right-0 z-[70] pointer-events-none text-center select-none"
                        style={{ top: "68px" }}
                      >
                        <span className={`text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] filter ${displayJudgment.type === 'perfect' ? 'text-yellow-400 font-black' :
                            displayJudgment.type === 'great' ? 'text-emerald-400 font-black' :
                              displayJudgment.type === 'good' ? 'text-blue-400 font-black' :
                                'text-rose-500 font-black'
                          }`}>
                          {displayJudgment.type}
                        </span>
                      </div>
                    )}
                  </AnimatePresence>
                  <div className="relative flex-grow w-full">
                    {instrumentMode === "drum" && viewMode === "falling" ? (
                      <DrumView
                        currentTimeMs={musicalCurrentTimeMs}
                        playbackData={notesForGame}
                        activePlaybackNotes={activePlaybackNotesInfo}
                        userActiveKeys={userActiveMidiNotes}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        drumInputMode={drumInputMode}
                        onPadDown={handleDrumPadDown}
                        onPadUp={handleDrumPadUp}
                        themeSettings={themeSettings}
                        zoomDirection={zoomDirection}
                        zoomScale={zoomScale}
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        drumTyperPadOpacity={drumTyperPadOpacity}
                        waitMode={waitMode}
                        resolutionScale={resolutionScale}
                        showDynamics={showDynamics}
                      />
                    ) : instrumentMode === "drum" && viewMode === "drum_mania" ? (
                      <DrumManiaView
                        currentTimeMs={musicalCurrentTimeMs}
                        playbackData={notesForGame}
                        activePlaybackNotes={activePlaybackNotesInfo}
                        userActiveKeys={userActiveMidiNotes}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        drumInputMode={drumInputMode}
                        onPadDown={handleDrumPadDown}
                        onPadUp={handleDrumPadUp}
                        themeSettings={themeSettings}
                        zoomScale={zoomScale}
                        barLines={barLines}
                        pixelsPerMillisecond={
                          BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * zoomScale * 2
                        }
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        waitMode={waitMode}
                        resolutionScale={resolutionScale}
                        showDynamics={showDynamics}
                      />
                    ) : viewMode === "qwerty_mania" ? (
                      <QwertyManiaView
                        currentTimeMs={musicalCurrentTimeMs}
                        playbackData={notesForGame}
                        visualDurationByNoteId={majorVisualDurationByNoteId}
                        activePlaybackNotes={activePlaybackNotesInfo}
                        userActiveKeys={userActiveMidiNotes}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        themeSettings={themeSettings}
                        zoomScale={zoomScale}
                        zoomDirection={zoomDirection}
                        drumTyperPadOpacity={drumTyperPadOpacity}
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        activeKeySignature={getActiveKeySignature(
                          musicalCurrentTimeMs,
                          signatureEvents,
                          initialKeySignature,
                        )}
                        activeBpm={activeBpmForDisplay}
                        majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                        showOnlyMajorNotes={showOnlyMajorNotes}
                        resolutionScale={resolutionScale}
                        waitMode={waitMode}
                        showDynamics={showDynamics}
                      />
                    ) : viewMode === "falling" ? (
                      <FallingNotesArea
                        key={`falling-${viewMode}`}
                        notes={notesForFallingView}
                        visualDurationByNoteId={majorVisualDurationByNoteId}
                        currentTimeMs={musicalCurrentTimeMs}
                        keyPositions={keyPositionsMap}
                        activeMidiNotesInfo={activePlaybackNotesInfo}
                        width={baseCalculatedPianoWidth}
                        actualHeight={contentAreaHeight}
                        pixelsPerMillisecond={
                          BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier
                        }
                        barLines={barLines}
                        noteLabelType={noteLabelType}
                        rightHandColor={themeSettings.rightHandColor}
                        leftHandColor={themeSettings.leftHandColor}
                        hitNoteColor={themeSettings.hitNoteColor}
                        backgroundColor={fallingNotesBackgroundColor}
                        activeKeySignature={getActiveKeySignature(
                          musicalCurrentTimeMs,
                          signatureEvents,
                          initialKeySignature,
                        )}
                        activeTempoBpm={activeBpmForDisplay}
                        majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                        showOnlyMajorNotes={showOnlyMajorNotes}
                        instrumentMode={instrumentMode}
                        showPianoTilesBackground={showPianoTilesBackground}
                        pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        resolutionScale={resolutionScale}
                        showDynamics={showDynamics}
                      />
                    ) : (viewMode === "sheet-roll" ||
                      viewMode === "sheet-qwerty") &&
                      vexFlowData ? (
                      <HorizontalNotesView
                        currentTimeMs={musicalCurrentTimeMs}
                        visualDurationByNoteId={majorVisualDurationByNoteId}
                        width={baseCalculatedPianoWidth}
                        height={contentAreaHeight}
                        pixelsPerMillisecond={
                          BASE_PIXELS_PER_MILLISECOND *
                          noteSpeedMultiplier *
                          1.5
                        }
                        activePlaybackNotesInfo={activePlaybackNotesInfo}
                        rightHandColor={themeSettings.rightHandColor}
                        leftHandColor={themeSettings.leftHandColor}
                        hitNoteColor={themeSettings.hitNoteColor}
                        backgroundColor={sheetMusicBackgroundColor}
                        vexFlowData={vexFlowData}
                        showOnlyMajorNotes={showOnlyMajorNotes}
                        noteLabelType={
                          viewMode === "sheet-qwerty" ? "qwerty" : noteLabelType
                        }
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        activeKeySignature={getActiveKeySignature(
                          musicalCurrentTimeMs,
                          signatureEvents,
                          initialKeySignature,
                        )}
                        activeBpmForDisplay={activeBpmForDisplay}
                        majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        isQwertyView={viewMode === "sheet-qwerty"}
                        instrumentMode={instrumentMode}
                        lowDetailMode={lowDetailMode}
                        resolutionScale={resolutionScale}
                        showDynamics={showDynamics}
                        tempoEvents={tempoEvents}
                        playbackTempoMultiplier={playbackTempoMultiplier}
                      />
                    ) : viewMode === "sheet" && vexFlowData ? (
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
                        barLines={barLines}
                        rightHandColor={themeSettings.rightHandColor}
                        leftHandColor={themeSettings.leftHandColor}
                        hitNoteColor={themeSettings.hitNoteColor}
                        signatureEvents={signatureEvents}
                        onLayoutRendered={setRenderedLayoutId}
                        tempoEvents={tempoEvents}
                        playbackTempoMultiplier={playbackTempoMultiplier}
                        backgroundColor="transparent"
                        notationColor={sheetNotationColor}
                        instrumentMode={instrumentMode}
                        resolutionScale={resolutionScale}
                        noteLabelType={noteLabelType}
                        showDynamics={showDynamics}
                        showOnlyMajorNotes={instrumentMode === "drum" ? true : showOnlyMajorNotes}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <p className="text-slate-400 animate-pulse">
                          Loading preview...
                        </p>
                      </div>
                    )}
                  </div>
                  {instrumentMode !== "drum" && (viewMode === "falling" || !hidePianoKeyboardNonFalling) ? (
                    <div
                      className="relative flex-shrink-0"
                      style={{
                        width: "100%",
                        height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px`,
                      }}
                    >
                      <PianoKeyboard
                        keyPositions={keyPositionsArray}
                        userSustainedKeys={userSustainedKeys}
                        userActiveKeys={userActiveKeys}
                        activeMidiNotesInfo={activeMidiNotesInfoForKeyboard}
                        onUiKeyPress={handleUiKeyPress}
                        onUiKeyRelease={handleUiKeyRelease}
                        rightHandColor={themeSettings.rightHandColor}
                        leftHandColor={themeSettings.leftHandColor}
                        hitNoteColor={themeSettings.hitNoteColor}
                        showQwertyShortcuts={showQwertyShortcuts}
                        qwertyCurrentOctaveShift={
                          qwertyLayout === "mirp" ? 0 : qwertyCurrentOctaveShift
                        }
                        width={baseCalculatedPianoWidth}
                        layoutConfig={layoutConfig}
                        qwertyLayout={qwertyLayout}
                        mirpTranspose={mirpTranspose}
                        isInteractive={viewMode !== "sheet-qwerty"}
                        lowDetailMode={true}
                        gameplayStyle={gameplayStyle}
                        waitMode={waitMode}
                        resolutionScale={resolutionScale}
                      />
                      {showHand3D && noteLabelType === 'fingering' && !isFreePlayMode && <HandFingering3D notes={fingeringHandNotes} poses={handPoses} timeMs={musicalCurrentTimeMs} handSize={fingeringPreferences.handSize} leftHandColor={themeSettings.leftHandColor} rightHandColor={themeSettings.rightHandColor} overlay={{ keyPositions: keyPositionsArray, width: baseCalculatedPianoWidth, whiteKeyHeight: layoutConfig.whiteKeyHeight, blackKeyHeight: layoutConfig.blackKeyHeight }} />}
                      <div className="absolute bottom-4 left-0 right-0 w-full flex justify-center z-50 pointer-events-none">
                        <OffsetIndicator
                          midiHitTiming={lastHitOffset}
                          midiHitTimingOffset={noteOffsetMs}
                          onMidiHitTimingOffsetChange={setNoteOffsetMs}
                          mp3Offset={userAudioSyncOffset}
                          onMp3OffsetChange={setUserAudioSyncOffset}
                          metronomePianoOffset={metronomePianoOffsetMs}
                          onMetronomePianoOffsetChange={setMetronomePianoOffsetMs}
                          perfectWindow={100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20}
                          greatWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 1.5}
                          goodWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 2}
                        />
                      </div>
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
                  ) : (
                    <div className="absolute bottom-0 left-0 right-0 h-0 z-50 pointer-events-none">
                      <div className="absolute bottom-4 left-0 right-0 w-full flex justify-center pointer-events-auto">
                        <OffsetIndicator
                          midiHitTiming={lastHitOffset}
                          midiHitTimingOffset={noteOffsetMs}
                          onMidiHitTimingOffsetChange={setNoteOffsetMs}
                          mp3Offset={userAudioSyncOffset}
                          onMp3OffsetChange={setUserAudioSyncOffset}
                          metronomePianoOffset={metronomePianoOffsetMs}
                          onMetronomePianoOffsetChange={setMetronomePianoOffsetMs}
                          perfectWindow={100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20}
                          greatWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 1.5}
                          goodWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      {currentScreen === "mainMenu" && (
        <MainMenu
          onPlay={() => setCurrentScreen("songSelection")}
          onLearnMode={() => {
            setIsLearnModeActive(true);
            isLearnModeActiveRef.current = true;
            setCurrentScreen("learnMode");
          }}
          onSettings={() => {
            setSettingsScrollTarget(undefined);
            setCurrentScreen("settings");
          }}
          onSocial={() => setCurrentScreen("leaderboard")}
          onOpenLoginModal={() => setIsAuthModalOpen(true)}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          onNavigate={setCurrentScreen}
          instrumentMode={instrumentMode}
          onInstrumentModeChange={handleInstrumentModeChange}
          appLanguage={appLanguage}
        />
      )}
      {currentScreen === "leaderboard" && (
        <Leaderboard
          onBack={() => setCurrentScreen("mainMenu")}
          onGoToOnlineSong={(s) => {
            setSelectedOnlineSongIdForNavigation(s);
            setCurrentScreen("songSelection");
          }}
          instrumentMode={instrumentMode}
        />
      )}
      {currentScreen === "songSelection" && (
        <SongSelection
          onFileLoaded={loadFile}
          onSongSelected={() => setCurrentScreen("modeSelection")}
          onBack={() => {
            setCurrentScreen("mainMenu");
            setSelectedOnlineSongIdForNavigation(null);
            setCurrentFileName(null);
            setPlaybackNotes([]);
            setAnalysisResult(null);
            setCurrentSongBackgroundUrl(null);
          }}
          loadedSongName={currentFileName}
          analysisResult={analysisResult}
          isLoading={isLoadingFile || isPreloading}
          fingeringWarnings={fingeringWarnings}
          fingeringError={fingeringError}
          loadingMessage={isLoadingFile ? fingeringLoadingMessage : 'Preparing audio...'}
          onCancelLoading={isLoadingFile ? () => {
            fingeringLoadController.current?.abort();
            audioPreloadJobRef.current++;
            setIsLoadingFile(false);
            setIsPreloading(false);
            setFingeringLoadingMessage('');
            setCurrentFileName(null);
            setPlaybackNotes([]);
          } : undefined}
          selectedOnlineSongIdForNavigation={selectedOnlineSongIdForNavigation}
          onGoToOnlineSong={(s) => {
            setSelectedOnlineSongIdForNavigation(s);
          }}
          onStartFreePlay={handleStartFreePlay}
          onNavigateToEditor={(file) => {
            setEditorMidiFile(file);
            setCurrentScreen("midiEditor");
          }}
          instrumentMode={instrumentMode}
          appLanguage={appLanguage}
        />
      )}
      {currentScreen === "modeSelection" && (
        <ModeSelection
          onStartGame={handleStartGame}
          onBack={() => setCurrentScreen(isLearnModeActiveRef.current ? "learnMode" : "songSelection")}
          onOpenSettings={() => {
            setSettingsScrollTarget("note-offset-section");
            setCurrentScreen("settings");
          }}
          analysisResult={analysisResult}
          analysisResultForPreview={previewAnalysisResult}
          fileName={currentFileName}
          initialTempoBpm={currentTempoBpm}
          initialPlaybackTempoMultiplier={previewPlaybackTempoMultiplier}
          onPlaybackTempoMultiplierChange={onPlaybackTempoMultiplierChange}
          backingTrackFile={backingTrackFile}
          onBackingTrackFileChange={setBackingTrackFile}
          backingTrackOffset={backingTrackOffset}
          onBackingTrackOffsetChange={setBackingTrackOffset}
          isAudioInputEnabled={isAudioInputEnabled}
          midiLink={currentMidiLink}
          midiOffset={currentMidiOffset}
          instrumentMode={instrumentMode}
          onInstrumentModeChange={handleInstrumentModeChange}
          currentSongAccuracyLevel={currentSongAccuracyLevel}
          userAverageOffset={userAverageOffset}
          userAudioSyncOffset={userAudioSyncOffset}
          onUserAudioSyncOffsetChange={setUserAudioSyncOffset}
          appLanguage={appLanguage}
        />
      )}
      {currentScreen === "settings" && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-40 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setCurrentScreen("mainMenu")
          }
        >
          <Settings
            appLanguage={appLanguage}
            onLanguageChange={handleLanguageChange}
            previewStatus={settingsPreviewError || (!settingsPreviewReady ? 'Preparing test MIDI…' : isPlaying ? (isLoadingFile ? 'Test MIDI playing · calculating finger numbers…' : 'Test MIDI playing · changes appear immediately') : 'Test MIDI ready · select Restart preview to start audio')}
            onRestartPreview={handleRestartSettingsPreview}
            fingeringPreferences={fingeringPreferences}
            onFingeringPreferencesChange={setFingeringPreferences}
            showHand3D={showHand3D}
            onShowHand3DChange={setShowHand3D}
            onBack={() => setCurrentScreen("mainMenu")}
            onStartCalibration={handleStartCalibration}
            initialScrollTarget={settingsScrollTarget}
            midiAccessStatus={midiAccessStatus}
            midiInputs={midiInputs}
            selectedMidiInputId={selectedMidiInputId}
            onSelectMidiInput={setSelectedMidiInputId}
            midiOutputs={midiOutputs}
            selectedMidiOutputId={selectedMidiOutputId}
            onSelectMidiOutput={setSelectedMidiOutputId}
            connectMidi={connectMidi}
            isAudioInputEnabled={isAudioInputEnabled}
            onIsAudioInputEnabledChange={setIsAudioInputEnabled}
            audioInputs={audioInputs}
            selectedAudioInputId={selectedAudioInputId}
            onSelectedAudioInputIdChange={setSelectedAudioInputId}
            audioInputError={audioInputError}
            micThresholds={micThresholds}
            onMicThresholdsChange={setMicThresholds}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            gameplayStyle={gameplayStyle}
            onGameplayStyleChange={setGameplayStyle}
            noteLabelType={noteLabelType}
            onNoteLabelTypeChange={setNoteLabelType}
            showOnlyMajorNotes={showOnlyMajorNotes}
            onShowOnlyMajorNotesChange={setShowOnlyMajorNotes}
            showQwertyShortcuts={showQwertyShortcuts}
            onShowQwertyShortcutsChange={setShowQwertyShortcuts}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
            metronomeVolume={metronomeVolume}
            onMetronomeVolumeChange={setMetronomeVolume}
            metronomeOffsetMs={noteOffsetMs}
            onMetronomeOffsetChange={setNoteOffsetMs}
            metronomePianoOffsetMs={metronomePianoOffsetMs}
            onMetronomePianoOffsetChange={setMetronomePianoOffsetMs}
            userAudioSyncOffset={userAudioSyncOffset}
            onUserAudioSyncOffsetChange={setUserAudioSyncOffset}
            detectedLatencyMs={detectedHardwareLatencyMs}
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
            showPerfectJudgment={showPerfectJudgment}
            onShowPerfectJudgmentChange={setShowPerfectJudgment}
            uiZoom={uiZoom}
            onUiZoomChange={setUiZoom}
            uiZoomAuto={uiZoomAuto}
            onUiZoomAutoChange={setUiZoomAuto}
            mp3Volume={mp3Volume}
            onMp3VolumeChange={setMp3Volume}
            drumTyperPadOpacity={drumTyperPadOpacity}
            onDrumTyperPadOpacityChange={setDrumTyperPadOpacity}
            drumInputMode={drumInputMode}
            onDrumInputModeChange={setDrumInputMode}
            lowDetailMode={lowDetailMode}
            onLowDetailModeChange={setLowDetailMode}
            resolutionScale={resolutionScale}
            onResolutionScaleChange={setResolutionScale}
            instrumentMode={instrumentMode}
            onResetSettings={resetSettings}
            zoomDirection={zoomDirection}
            onZoomDirectionChange={setZoomDirection}
            antiDoubleTriggerEnabled={antiDoubleTriggerEnabled}
            onAntiDoubleTriggerEnabledChange={setAntiDoubleTriggerEnabled}
            antiDoubleTriggerInterval={antiDoubleTriggerInterval}
            onAntiDoubleTriggerIntervalChange={setAntiDoubleTriggerInterval}
            drumMapping={drumMapping}
            onDrumMappingChange={setDrumMapping}
            metronomeBuffers={metronomeBuffersRef.current}
            audioContext={audioContextRef.current}
            hidePianoKeyboardNonFalling={hidePianoKeyboardNonFalling}
            onHidePianoKeyboardNonFallingChange={setHidePianoKeyboardNonFalling}
            showDynamics={showDynamics}
            onShowDynamicsChange={setShowDynamics}
          />
        </div>
      )}
      {currentScreen === "about" && (
        <AboutUs onBack={() => setCurrentScreen("mainMenu")} onNavigate={setCurrentScreen} appLanguage={appLanguage} />
      )}
      {currentScreen === "finetune" && (
        user?.id === ADMIN_UUID ? (
          <FineTunePanel
            onBack={() => setCurrentScreen("mainMenu")}
            instrumentMode={instrumentMode}
          />
        ) : (
          <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-slate-900 p-8 rounded-2xl border border-red-500/30 text-center max-w-md w-full">
              <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
              <p className="text-slate-400 mb-6">You must be logged in as an administrator to access the Calibration Workbench.</p>
              <button
                onClick={() => setCurrentScreen("mainMenu")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-6 rounded-lg font-bold border border-slate-600 transition-colors"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        )
      )}
      {currentScreen === "contact" && (
        <ContactPage onBack={() => setCurrentScreen("mainMenu")} onNavigate={setCurrentScreen} appLanguage={appLanguage} />
      )}
      {currentScreen === "privacy" && (
        <PrivacyPolicy onBack={() => setCurrentScreen("mainMenu")} onNavigate={setCurrentScreen} appLanguage={appLanguage} />
      )}
      {currentScreen === "disclaimer" && (
        <Disclaimer onBack={() => setCurrentScreen("mainMenu")} onNavigate={setCurrentScreen} appLanguage={appLanguage} />
      )}
      {currentScreen === "howToConnect" && (
        <HowToConnect onBack={() => setCurrentScreen("mainMenu")} onNavigate={setCurrentScreen} appLanguage={appLanguage} />
      )}
      {currentScreen === "midiEditor" && (
        <MidiEditor
          initialMidiFile={editorMidiFile}
          initialBackingTrackOffset={currentMidiOffset || 0}
          onOpenSettings={() => {
            setSettingsScrollTarget("note-offset-section");
            setCurrentScreen("settings");
          }}
          onClose={() => {
            setEditorMidiFile(null);
            sessionStorage.setItem("songSelectionInitialTab", "local"); // Go back to local tab
            setCurrentScreen("songSelection");
          }}
          instrumentMode={instrumentMode}
          zoomScale={zoomScale}
          userAudioSyncOffset={userAudioSyncOffset}
          onUserAudioSyncOffsetChange={setUserAudioSyncOffset}
        />
      )}
      {currentScreen === "learnMode" && (
        <div className="flex-grow w-full h-full relative z-10 flex flex-col overflow-hidden min-h-0">
          <LearnArticleView
            onBackToMainMenu={() => {
              setIsLearnModeActive(false);
              isLearnModeActiveRef.current = false;
              setCurrentScreen("mainMenu");
            }}
            onLaunchInGamePractice={(lessonId, subMode) => {
              void handleStartLearnMode(lessonId, subMode);
            }}
            onLaunchCustomExercise={(key, typeId, typeName) => {
              void handleStartLearnExercise(key, typeId, typeName);
            }}
            onOpenMidiEditor={() => {
              setIsLearnModeActive(false);
              isLearnModeActiveRef.current = false;
              setEditorMidiFile(null);
              setCurrentScreen("midiEditor");
            }}
            appLanguage={appLanguage}
          />
        </div>
      )}
      {currentScreen === "inGame" && (
        <div className="flex-grow relative overflow-hidden">
          <LoopCountdownOverlay
            loopDelayInfo={loopDelayInfo}
            countInInfo={beatCountdownInfo}
            currentMusicalTimeMs={musicalCurrentTimeMs}
            getCurrentTimeMs={() => currentTimeRef.current}
          />
          <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
            {notesForGame.length > 0 && (
              <div className="w-full pointer-events-auto">
                <ProgressBar
                  currentTimeMs={musicalCurrentTimeMs}
                  totalDurationMs={absoluteEndTimeMs}
                  width={baseCalculatedPianoWidth}
                  height={PROGRESS_BAR_HEIGHT_PX}
                  onSeek={handleProgressBarSeek}
                  isPlaybackActive={isPlaying}
                  isSeekingDisabled={waitMode === "retical"}
                  loopStartMs={isLooping ? loopStartMs : null}
                  loopEndMs={isLooping ? loopEndMs : null}
                  barLines={barLines}
                />
              </div>
            )}
            <AnimatePresence>
              {!!gameSettings?.backingTrack &&
                (gameSettings.backingTrack.type === 'youtube' || gameSettings.backingTrack.type === 'link') &&
                !!gameSettings.backingTrack.url &&
                !isBackingTrackOverlayDismissed &&
                (backingTrackStatus === 'error' ||
                  !!backingTrackError ||
                  (isPlaying &&
                    (backingTrackStatus === 'stalled' ||
                      (backingTrackStatus === 'loading' && musicalCurrentTimeMs > INITIAL_PLAYBACK_DELAY_MS + 200)))) && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: -20, x: "-50%" }}
                    onClick={() => {
                      setBackingTrackError(null);
                      setBackingTrackStatus('loading');
                      backingPlayAttemptTimeRef.current = performance.now();
                      if (gameSettings?.backingTrack?.type === 'youtube') {
                        if (youtubePlayerRef.current) {
                          triggerBackingTrackPlay(currentTimeRef.current);
                        } else if (gameSettings.backingTrack.url) {
                          initializeYoutubePlayer(gameSettings.backingTrack.url);
                        }
                      } else if (audioRef.current) {
                        triggerBackingTrackPlay(currentTimeRef.current);
                      }
                    }}
                    className={`absolute top-[80px] left-1/2 z-[70] bg-slate-950/95 border ${
                      backingTrackStatus === 'error' || !!backingTrackError
                        ? 'border-red-500/60 shadow-red-950/50'
                        : 'border-cyan-500/30'
                    } rounded-full px-5 py-2.5 flex items-center gap-3 shadow-2xl pointer-events-auto cursor-pointer hover:bg-slate-900 transition-colors`}
                  >
                    {backingTrackStatus === 'error' || !!backingTrackError ? (
                      <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-400 flex-shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    ) : (
                      <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                        backingTrackStatus === 'stalled'
                          ? 'border-amber-500/20 border-t-amber-500 animate-spin'
                          : 'border-cyan-500/20 border-t-cyan-500 animate-spin'
                      }`} />
                    )}
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-[0.18em] leading-none ${
                        backingTrackStatus === 'error' || !!backingTrackError
                          ? 'text-red-400'
                          : (backingTrackStatus === 'stalled' || backingTrackStatus === 'loading')
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}>
                        {backingTrackStatus === 'error' || !!backingTrackError
                          ? 'FAILED TO LOAD YOUTUBE MP3 AUDIO'
                          : 'BACKING TRACK LOADING'}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                        {backingTrackStatus === 'error' || !!backingTrackError
                          ? (backingTrackError || 'Audio failed to play • Click to retry or restart')
                          : 'Try to pause or restart'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBackingTrackOverlayDismissed(true);
                        setBackingTrackError(null);
                      }}
                      className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white pointer-events-auto"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
          <div className="absolute top-0 left-0 right-0 z-50 flex flex-col pointer-events-none pt-[14px]">
            <div className="w-full pointer-events-auto">
              {(() => {
                const accuracyLevel = gameSettings?.accuracyLevel ?? 5;
                const perfectWindow = 100 + (5 - accuracyLevel) * 20;
                const greatWindow = perfectWindow * 1.5;
                const goodWindow = perfectWindow * 2;

                return (
                  <TopBar
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onStop={() => handleStopPlayback(!isFreePlayMode)}
                    onExit={handleExitGame}
                    isPlaying={isPlaying}
                    isFileLoaded={playbackNotes.length > 0 || isFreePlayMode}
                    fileName={isFreePlayMode ? "Free Play" : currentFileName}
                    waitMode={waitMode}
                    metronomeMode={
                      isFreePlayMode ? freePlayMetronomeMode : metronomeMode
                    }
                    onCycleMetronomeMode={() => {
                      if (isCalibrating) return; // Cannot cycle metronome mode during calibration
                      if (isFreePlayMode)
                        setFreePlayMetronomeMode((p) =>
                          p === "off" ? "beat" : p === "beat" ? "bar" : "off",
                        );
                      else
                        setMetronomeMode((p) =>
                          p === "off" ? "beat" : p === "beat" ? "bar" : "off",
                        );
                    }}
                    isMetronomeAvailable={isMetronomeAvailable}
                    liveAccuracy={liveAccuracy}
                    liveSpeed={liveSpeed}
                    perfectCount={perfectCount}
                    greatCount={greatCount}
                    goodCount={goodCount}
                    missCount={missCount}
                    isNonStop={gameSettings?.isNonStop ?? false}
                    totalNoteCount={totalNoteCountForGame}
                    currentTimeMs={
                      (isFreePlayMode
                        ? freePlayElapsedTime
                        : musicalCurrentTimeMs) /
                      (isFreePlayMode ? 1 : playbackTempoMultiplier)
                    }
                    totalDurationMs={
                      isFreePlayMode
                        ? Infinity
                        : absoluteEndTimeMs / playbackTempoMultiplier
                    }
                    viewMode={viewMode}
                    noteSpeedMultiplier={noteSpeedMultiplier}
                    onNoteSpeedMultiplierChange={setNoteSpeedMultiplier}
                    sheetMusicZoom={sheetMusicZoom}
                    onSheetMusicZoomChange={setSheetMusicZoom}
                    analysisResult={analysisResult}
                    metronomeBeat={metronomeBeat}
                    totalWaitTimeMs={totalWaitTimeMs}
                    isFreePlayMode={isFreePlayMode}
                    isMicEnabled={isAudioInputEnabled}
                    isRecording={isRecording}
                    onToggleRecording={handleToggleRecording}
                    onSaveRecording={handleSaveRecording}
                    showSaveButton={showSaveButton}
                    isLooping={isLooping}
                    onToggleLoop={handleToggleLoop}
                    loopStartMs={loopStartMs}
                    loopEndMs={loopEndMs}
                    onSetLoopStart={handleSetLoopStart}
                    onSetLoopEnd={handleSetLoopEnd}
                    onClearLoop={handleClearLoop}
                    barLines={barLines}
                    freePlayBpm={freePlayBpm}
                    onFreePlayBpmChange={setFreePlayBpm}
                    freePlayTimeSignature={freePlayTimeSignature}
                    onFreePlayTimeSignatureChange={setFreePlayTimeSignature}
                    isTopBarVisible={isTopBarVisible}
                    onToggleVisibility={() =>
                      setIsTopBarVisible(!isTopBarVisible)
                    }
                    instrumentMode={instrumentMode}
                    lastHitOffset={lastHitOffset}
                    perfectWindow={perfectWindow}
                    greatWindow={greatWindow}
                    goodWindow={goodWindow}
                    combo={combo}
                    lastJudgment={lastJudgment}
                    userAudioSyncOffset={userAudioSyncOffset}
                    onUserAudioSyncOffsetChange={handleUserAudioSyncOffsetChange}
                    isCalibrationMode={gameSettings?.isCalibrationMode}
                    userAverageOffset={userAverageOffset}
                    hp={hp}
                    appLanguage={appLanguage}
                  />
                );
              })()}
            </div>
          </div>
          {backingTrackError &&
            (gameSettings?.backingTrack?.type === 'youtube' || gameSettings?.backingTrack?.type === 'link') &&
            isBackingTrackOverlayDismissed && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-600/90 text-white px-4 py-3 rounded-lg shadow-lg border border-red-400 flex items-center gap-3 animate-bounce-in">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
              <span>{backingTrackError}</span>
              <button
                onClick={() => setBackingTrackError(null)}
                className="ml-2 text-red-200 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>
          )}
          <div
            ref={contentAreaRef}
            className="w-full h-full flex flex-col justify-end items-center relative overflow-hidden"
          >
            {/* TopBar overlay trigger removed, now handled by TopBar component internally */}
            <>
              <div
                className="flex flex-col justify-end relative"
                style={{
                  width: `${baseCalculatedPianoWidth}px`,
                  height: "100%",
                }}
              >
                <AnimatePresence>
                  {displayJudgment && (displayJudgment.type !== 'perfect' || showPerfectJudgment) && (
                    <div
                      key={displayJudgment.id}
                      className="absolute left-0 right-0 z-[70] pointer-events-none text-center select-none"
                      style={{ top: "68px" }}
                    >
                      <span className={`text-2xl md:text-3xl font-extrabold italic uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] filter ${displayJudgment.type === 'perfect' ? 'text-yellow-400 font-black' :
                          displayJudgment.type === 'great' ? 'text-emerald-400 font-black' :
                            displayJudgment.type === 'good' ? 'text-blue-400 font-black' :
                              'text-rose-500 font-black'
                        }`}>
                        {displayJudgment.type}
                      </span>
                    </div>
                  )}
                </AnimatePresence>
                <div className="relative flex-grow w-full">
                  {isFreePlayMode &&
                    instrumentMode === "drum" &&
                    viewMode === "drum_mania" ? (
                    <DrumManiaView
                      key="freeplay-drum-mania"
                      currentTimeMs={freePlayElapsedTime}
                      playbackData={recordedNotes}
                      liveNotes={freePlayLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      drumInputMode={drumInputMode}
                      onPadDown={handleDrumPadDown}
                      onPadUp={handleDrumPadUp}
                      themeSettings={themeSettings}
                      zoomScale={zoomScale}
                      barLines={barLines}
                      pixelsPerMillisecond={
                        BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * zoomScale * 2
                      }
                      isPaused={!isFreePlayMode} // Freeplay is always playing, but we can pass false
                      onSeek={() => { }}
                      showPianoTilesBackground={showPianoTilesBackground}
                      pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                      waitMode={waitMode}
                      resolutionScale={resolutionScale}
                    />
                  ) : isFreePlayMode &&
                    instrumentMode === "drum" &&
                    viewMode === "falling" ? (
                    <DrumView
                      key="freeplay-drum-falling"
                      currentTimeMs={freePlayElapsedTime}
                      playbackData={recordedNotes}
                      liveNotes={freePlayLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      drumInputMode={drumInputMode}
                      onPadDown={handleDrumPadDown}
                      onPadUp={handleDrumPadUp}
                      themeSettings={themeSettings}
                      zoomDirection={zoomDirection}
                      zoomScale={zoomScale}
                      isPaused={!isFreePlayMode}
                      onSeek={() => { }}
                      drumTyperPadOpacity={drumTyperPadOpacity}
                      waitMode={waitMode}
                      resolutionScale={resolutionScale}
                    />
                  ) : isFreePlayMode && viewMode === "qwerty_mania" ? (
                    <QwertyManiaView
                      key="freeplay-qwerty-mania"
                      currentTimeMs={freePlayElapsedTime}
                      playbackData={recordedNotes}
                      liveNotes={freePlayLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      themeSettings={themeSettings}
                      zoomScale={zoomScale}
                      zoomDirection={zoomDirection}
                      drumTyperPadOpacity={drumTyperPadOpacity}
                      isPaused={!isFreePlayMode}
                      onSeek={() => { }}
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      activeKeySignature={initialKeySignature}
                      activeBpm={currentTempoBpm || 120}
                      majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                      showOnlyMajorNotes={showOnlyMajorNotes}
                      resolutionScale={resolutionScale}
                      waitMode={waitMode}
                    />
                  ) : isFreePlayMode && viewMode === "falling" ? (
                    <div
                      className="relative w-full h-full"
                      style={{ backgroundColor: fallingNotesBackgroundColor }}
                    >
                      <div className="absolute inset-0 z-0">
                        <ChordDisplay chord={detectedChord} />
                      </div>
                      <FallingNotesArea
                        isRising={true}
                        notes={[]}
                        liveNotes={freePlayLiveNotes}
                        currentTimeMs={freePlayElapsedTime}
                        keyPositions={keyPositionsMap}
                        activeMidiNotesInfo={new Map()}
                        width={baseCalculatedPianoWidth}
                        actualHeight={contentAreaHeight}
                        pixelsPerMillisecond={
                          BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier
                        }
                        barLines={freePlayBarLines}
                        noteLabelType={noteLabelType}
                        rightHandColor={themeSettings.rightHandColor}
                        leftHandColor={themeSettings.leftHandColor}
                        hitNoteColor={themeSettings.hitNoteColor}
                        backgroundColor="transparent"
                        activeKeySignature="C"
                        activeTempoBpm={freePlayBpm}
                        showOnlyMajorNotes={false}
                        showPianoTilesBackground={showPianoTilesBackground}
                        pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        lowDetailMode={lowDetailMode}
                        resolutionScale={resolutionScale}
                      />
                    </div>
                  ) : instrumentMode === "drum" && viewMode === "falling" ? (
                    <DrumView
                      key="game-drum-falling"
                      currentTimeMs={musicalCurrentTimeMs}
                      playbackData={notesForGame}
                      liveNotes={gameLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      drumInputMode={drumInputMode}
                      onPadDown={handleDrumPadDown}
                      onPadUp={handleDrumPadUp}
                      themeSettings={themeSettings}
                      zoomDirection={zoomDirection}
                      zoomScale={zoomScale}
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                      drumTyperPadOpacity={drumTyperPadOpacity}
                      waitMode={waitMode}
                      resolutionScale={resolutionScale}
                      showDynamics={showDynamics}
                    />
                  ) : instrumentMode === "drum" && viewMode === "drum_mania" ? (
                    <DrumManiaView
                      key="game-drum-mania"
                      currentTimeMs={musicalCurrentTimeMs}
                      playbackData={notesForGame}
                      liveNotes={gameLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      drumInputMode={drumInputMode}
                      onPadDown={handleDrumPadDown}
                      onPadUp={handleDrumPadUp}
                      themeSettings={themeSettings}
                      zoomScale={zoomScale}
                      barLines={barLines}
                      pixelsPerMillisecond={
                        BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * zoomScale * 2
                      }
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                      showPianoTilesBackground={showPianoTilesBackground}
                      pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                      waitMode={waitMode}
                      resolutionScale={resolutionScale}
                    />
                  ) : viewMode === "qwerty_mania" ? (
                    <QwertyManiaView
                      key="game-qwerty-mania"
                      currentTimeMs={musicalCurrentTimeMs}
                      playbackData={notesForGame}
                      visualDurationByNoteId={majorVisualDurationByNoteId}
                      liveNotes={gameLiveNotes}
                      activePlaybackNotes={activePlaybackNotesInfo}
                      userActiveKeys={userActiveMidiNotes}
                      noteSpeedMultiplier={noteSpeedMultiplier}
                      themeSettings={themeSettings}
                      zoomScale={zoomScale}
                      zoomDirection={zoomDirection}
                      drumTyperPadOpacity={drumTyperPadOpacity}
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      activeKeySignature={getActiveKeySignature(
                        musicalCurrentTimeMs,
                        signatureEvents,
                        initialKeySignature,
                      )}
                      activeBpm={activeBpmForDisplay}
                      majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                      showOnlyMajorNotes={showOnlyMajorNotes}
                      resolutionScale={resolutionScale}
                      waitMode={waitMode}
                      showDynamics={showDynamics}
                    />
                  ) : viewMode === "falling" ? (
                    <FallingNotesArea
                      key={`falling-freeplay-${viewMode}`}
                      notes={notesForFallingView}
                      visualDurationByNoteId={majorVisualDurationByNoteId}
                      currentTimeMs={musicalCurrentTimeMs}
                      keyPositions={keyPositionsMap}
                      activeMidiNotesInfo={activePlaybackNotesInfo}
                      width={baseCalculatedPianoWidth}
                      actualHeight={contentAreaHeight}
                      pixelsPerMillisecond={
                        BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier
                      }
                      barLines={barLines}
                      noteLabelType={noteLabelType}
                      rightHandColor={themeSettings.rightHandColor}
                      leftHandColor={themeSettings.leftHandColor}
                      hitNoteColor={themeSettings.hitNoteColor}
                      backgroundColor={fallingNotesBackgroundColor}
                      activeKeySignature={getActiveKeySignature(
                        musicalCurrentTimeMs,
                        signatureEvents,
                        initialKeySignature,
                      )}
                      activeTempoBpm={activeBpmForDisplay}
                      majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                      showOnlyMajorNotes={showOnlyMajorNotes}
                      instrumentMode={instrumentMode}
                      showPianoTilesBackground={showPianoTilesBackground}
                      pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                      lowDetailMode={lowDetailMode}
                      resolutionScale={resolutionScale}
                      showDynamics={showDynamics}
                    />
                  ) : (viewMode === "sheet-roll" ||
                    viewMode === "sheet-qwerty") &&
                    vexFlowData ? (
                    <HorizontalNotesView
                      currentTimeMs={musicalCurrentTimeMs}
                      visualDurationByNoteId={majorVisualDurationByNoteId}
                      width={baseCalculatedPianoWidth}
                      height={contentAreaHeight}
                      pixelsPerMillisecond={
                        BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * 1.5
                      }
                      activePlaybackNotesInfo={activePlaybackNotesInfo}
                      rightHandColor={themeSettings.rightHandColor}
                      leftHandColor={themeSettings.leftHandColor}
                      hitNoteColor={themeSettings.hitNoteColor}
                      backgroundColor={sheetMusicBackgroundColor}
                      vexFlowData={vexFlowData}
                      showOnlyMajorNotes={showOnlyMajorNotes}
                      noteLabelType={
                        viewMode === "sheet-qwerty" ? "qwerty" : noteLabelType
                      }
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                      activeKeySignature={getActiveKeySignature(
                        musicalCurrentTimeMs,
                        signatureEvents,
                        initialKeySignature,
                      )}
                      activeBpmForDisplay={activeBpmForDisplay}
                      majorNoteVisualDurationMs={activeMajorNoteVisualDurationMs}
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      isQwertyView={viewMode === "sheet-qwerty"}
                      instrumentMode={instrumentMode}
                      resolutionScale={resolutionScale}
                      showDynamics={showDynamics}
                      tempoEvents={tempoEvents}
                      playbackTempoMultiplier={playbackTempoMultiplier}
                    />
                  ) : viewMode === "sheet" && vexFlowData ? (
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
                      barLines={barLines}
                      rightHandColor={themeSettings.rightHandColor}
                      leftHandColor={themeSettings.leftHandColor}
                      hitNoteColor={themeSettings.hitNoteColor}
                      signatureEvents={signatureEvents}
                      onLayoutRendered={setRenderedLayoutId}
                      tempoEvents={tempoEvents}
                      playbackTempoMultiplier={playbackTempoMultiplier}
                      backgroundColor="transparent"
                      notationColor={sheetNotationColor}
                      instrumentMode={instrumentMode}
                      lowDetailMode={lowDetailMode}
                      resolutionScale={resolutionScale}
                      noteLabelType={noteLabelType}
                      showDynamics={showDynamics}
                      showOnlyMajorNotes={instrumentMode === "drum" ? true : showOnlyMajorNotes}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                      <p className="text-slate-400 animate-pulse">
                        Loading music...
                      </p>
                    </div>
                  )}
                </div>
                {instrumentMode !== "drum" && (viewMode === "falling" || !hidePianoKeyboardNonFalling) ? (
                  <div
                    className="relative flex-shrink-0"
                    style={{
                      width: "100%",
                      height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px`,
                    }}
                  >
                    <PianoKeyboard
                      keyPositions={keyPositionsArray}
                      userSustainedKeys={userSustainedKeys}
                      userActiveKeys={userActiveKeys}
                      activeMidiNotesInfo={activeMidiNotesInfoForKeyboard}
                      onUiKeyPress={handleUiKeyPress}
                      onUiKeyRelease={handleUiKeyRelease}
                      rightHandColor={themeSettings.rightHandColor}
                      leftHandColor={themeSettings.leftHandColor}
                      hitNoteColor={themeSettings.hitNoteColor}
                      showQwertyShortcuts={showQwertyShortcuts}
                      qwertyCurrentOctaveShift={
                        qwertyLayout === "mirp" ? 0 : qwertyCurrentOctaveShift
                      }
                      width={baseCalculatedPianoWidth}
                      layoutConfig={layoutConfig}
                      qwertyLayout={qwertyLayout}
                      mirpTranspose={mirpTranspose}
                      isInteractive={viewMode !== "sheet-qwerty"}
                      lowDetailMode={lowDetailMode}
                      gameplayStyle={gameplayStyle}
                      waitMode={waitMode}
                      resolutionScale={resolutionScale}
                    />
                    {showHand3D && noteLabelType === 'fingering' && !isFreePlayMode && <HandFingering3D notes={fingeringHandNotes} poses={handPoses} timeMs={musicalCurrentTimeMs} handSize={fingeringPreferences.handSize} leftHandColor={themeSettings.leftHandColor} rightHandColor={themeSettings.rightHandColor} overlay={{ keyPositions: keyPositionsArray, width: baseCalculatedPianoWidth, whiteKeyHeight: layoutConfig.whiteKeyHeight, blackKeyHeight: layoutConfig.blackKeyHeight }} />}
                    <div className="absolute bottom-4 left-0 right-0 w-full flex justify-center z-50 pointer-events-none">
                      <OffsetIndicator
                        midiHitTiming={lastHitOffset}
                        midiHitTimingOffset={noteOffsetMs}
                        onMidiHitTimingOffsetChange={setNoteOffsetMs}
                        mp3Offset={userAudioSyncOffset}
                        onMp3OffsetChange={setUserAudioSyncOffset}
                        metronomePianoOffset={metronomePianoOffsetMs}
                        onMetronomePianoOffsetChange={setMetronomePianoOffsetMs}
                        perfectWindow={100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20}
                        greatWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 1.5}
                        goodWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 2}
                      />
                    </div>
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
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 h-0 z-50 pointer-events-none">
                    <div className="absolute bottom-4 left-0 right-0 w-full flex justify-center pointer-events-auto">
                      <OffsetIndicator
                        midiHitTiming={lastHitOffset}
                        midiHitTimingOffset={noteOffsetMs}
                        onMidiHitTimingOffsetChange={setNoteOffsetMs}
                        mp3Offset={userAudioSyncOffset}
                        onMp3OffsetChange={setUserAudioSyncOffset}
                        metronomePianoOffset={metronomePianoOffsetMs}
                        onMetronomePianoOffsetChange={setMetronomePianoOffsetMs}
                        perfectWindow={100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20}
                        greatWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 1.5}
                        goodWindow={(100 + (5 - (gameSettings?.accuracyLevel ?? 5)) * 20) * 2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
            {isLoadingContent && (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-30">
                <div className="flex items-center space-x-3 p-4 text-sky-300 font-semibold text-lg">
                  <svg
                    className="animate-spin h-6 w-6 text-sky-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <div className="flex flex-col">
                    <span>
                      {isPreloading && gameSettings?.backingTrack && gameSettings.backingTrack.type !== 'none' && gameSettings.backingTrack.url
                        ? "Downloading Backing Track..."
                        : "Loading Game..."}
                    </span>
                    {isPreloading && gameSettings?.backingTrack && gameSettings.backingTrack.type !== 'none' && gameSettings.backingTrack.url && (
                      <span className="text-xs text-slate-400 font-normal mt-1 max-w-xs leading-relaxed">
                        Downloading audio to browser memory for latency-free offline gameplay. Please wait...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <PerformanceSummaryModal
            isVisible={!!performanceSummary}
            summary={performanceSummary}
            appLanguage={appLanguage}
            onClose={() => {
              handleStopPlayback();
              uploadSessionStats();
              setPerformanceSummary(null);
              stopEndGameSfx();
            }}
          />
          <GameOverModal
            isVisible={!!isGameOver}
            reason={gameOverReason}
            appLanguage={appLanguage}
            onClose={handleCloseGameOverModal}
            onRetry={handleRetryGameOver}
            isLooping={isLooping}
            loopStartMs={loopStartMs}
            loopEndMs={loopEndMs}
          />
        </div>
      )}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onGoToOnlineSong={(s) => {
          setSelectedOnlineSongIdForNavigation(s);
          setCurrentScreen("songSelection");
        }}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
      />
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onNavigateToCalibration={() => {
          setIsAdminModalOpen(false);
          setCurrentScreen("finetune");
        }}
      />
      <LearnGuideModal
        isOpen={isLearnGuideOpen}
        onClose={() => setIsLearnGuideOpen(false)}
        appLanguage={appLanguage}
        onOpenMidiEditor={() => {
          setIsLearnGuideOpen(false);
          setIsLearnModeActive(false);
          isLearnModeActiveRef.current = false;
          setEditorMidiFile(null);
          setCurrentScreen("midiEditor");
        }}
        onSelectSubMode={(mode, lessonId) => {
          handleSwitchLearnSubMode(mode);
          if (lessonId) {
            handleStartLearnMode(lessonId);
          }
        }}
      />
      {showCalibrationTutorial && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              </div>
              <h3 className="text-lg font-bold tracking-tight">Latency Calibration Guide</h3>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                To get a highly precise and accurate calibration result:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-300 pl-1">
                <li>
                  You must consistently <strong className="text-amber-400 font-semibold">click or press the piano keys in sync with the metronome ticks</strong>.
                </li>
                <li>
                  Your currently active <strong className="text-emerald-400 font-semibold">MIDI Hit Timing Offset</strong> will be preserved and used during calibration.
                </li>
                <li>
                  The HP (*Health Points*) mechanic is <strong className="text-emerald-400 font-semibold">disabled</strong> during calibration so you can adjust your latency calmly without worrying about failing mid-song.
                </li>
              </ul>
              <p className="text-slate-400 text-xs italic">
                After the song finishes, your average input offset will be saved automatically for all subsequent plays.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="cancel-calibration-tutorial"
                onClick={() => setShowCalibrationTutorial(false)}
                className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg font-medium transition text-sm cursor-pointer border border-slate-700"
              >
                Cancel
              </button>
              <button
                id="start-calibration-button"
                onClick={() => {
                  setShowCalibrationTutorial(false);
                  executeCalibrationStart();
                }}
                className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-semibold transition text-sm cursor-pointer shadow-lg shadow-amber-500/10"
              >
                Start Calibration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
