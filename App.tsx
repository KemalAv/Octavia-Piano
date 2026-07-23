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
import { Settings } from "./components/Settings";
import AuthModal from "./AuthModal";
import AccountModal from "./components/AccountModal";
import JSZip, { JSZipObject } from "jszip";
import { assignFingering } from "./fingering";
import { analyzeMidi } from "./midiAnalysis";
import VexFlowSheetMusicView from "./components/VexFlowSheetMusicView";
import HorizontalNotesView from "./components/HorizontalNotesView";
import PerformanceSummaryModal from "./components/PerformanceSummaryModal";
import { FallingNotesArea } from "./components/FallingNotesArea";
import { DrumView } from "./components/DrumView"; // NEW
import { DrumManiaView } from "./components/DrumManiaView";
import { AcousticPianoService } from "./AcousticPianoService";
import {
  getActiveKeySignature,
  getActiveTimeSignature,
  SignatureEvent,
  getActiveTempoBpmAtOriginalTime,
  getBeatTimesInWindow,
  frequencyToMidi,
  midiToFrequency,
  preloadAudioUrl,
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

const BackgroundDisplay: React.FC<{
  themeSettings: ThemeSettings;
  viewMode: ViewMode;
  isFreePlayMode: boolean;
  instrumentMode?: "piano" | "drum";
  songBackgroundUrl?: string | null;
}> = ({
  themeSettings,
  viewMode,
  isFreePlayMode,
  instrumentMode,
  songBackgroundUrl,
}) => {
  const { backgroundUrl: globalBackgroundUrl, backgroundOpacity } =
    themeSettings;
  const backgroundUrl = songBackgroundUrl || globalBackgroundUrl;

  const isSheetMode =
    viewMode === "sheet" ||
    viewMode === "sheet-roll" ||
    viewMode === "sheet-qwerty";
  const backingLayerClass =
    viewMode === "falling" ||
    isFreePlayMode ||
    (instrumentMode === "drum" && !isSheetMode)
      ? "bg-black"
      : "bg-white";

  // Aligned with Piano Mode: Respect fallingNotesBackgroundColor if media is clear
  const customBgColor = themeSettings.fallingNotesBackgroundColor;
  const backingLayerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: customBgColor || (backingLayerClass === "bg-black" ? "#000000" : "#ffffff"),
  };

  if (!backgroundUrl) {
    return <div style={backingLayerStyle} />;
  }

  const isVideo = useMemo(
    () =>
      backgroundUrl.startsWith("data:video/") ||
      backgroundUrl.toLowerCase().endsWith(".mp4") ||
      backgroundUrl.toLowerCase().endsWith(".webm"),
    [backgroundUrl],
  );
  const opacity = backgroundOpacity ?? 0.25;
  const commonStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: opacity,
    transition: "opacity 300ms ease-in-out",
  };

  return (
    <>
      <div style={backingLayerStyle} />
      {isVideo ? (
        <video
          key={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          style={{ ...commonStyle, objectFit: "cover" }}
          src={backgroundUrl}
        />
      ) : (
        <div
          style={{
            ...commonStyle,
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
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

const SCREEN_TO_HASH: Record<Screen, string> = {
  mainMenu: "#/",
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
};

const parseHash = (hash: string): { screen: Screen; songId: string | null } => {
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

  const sessionPlaytimeMs = useRef<number>(0);
  const playtimeStartRef = useRef<number | null>(null);
  const sessionTotalPlaytimeMs = useRef<number>(0);
  const sessionTotalNotesHit = useRef<number>(0);
  const audioCtxStartTimeRef = useRef<number>(0); // New ref

  const [isFreePlayMode, setIsFreePlayMode] = useState(false);
  const isFreePlayModeRef = useRef(false);
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
    const baseHash = SCREEN_TO_HASH[currentScreen] || "#/";
    let targetHash = baseHash;
    
    if (selectedOnlineSongIdForNavigation && (currentScreen === "songSelection" || currentScreen === "modeSelection" || currentScreen === "inGame")) {
      if (baseHash.endsWith("/")) {
        targetHash = `${baseHash}${selectedOnlineSongIdForNavigation}`;
      } else {
        targetHash = `${baseHash}/${selectedOnlineSongIdForNavigation}`;
      }
    }
    
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [currentScreen, selectedOnlineSongIdForNavigation]);

  const [isRewinding, setIsRewinding] = useState(false);
  const isRewindingRef = useRef(false);

  const [isSustainPedalActive, setIsSustainPedalActive] = useState(false);
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

  const [isBackingTrackOverlayDismissed, setIsBackingTrackOverlayDismissed] = useState(false);

  const getAudioStartTime = (baseTimeSec: number, backingType: string | undefined, offsetMs: number = 0) => {
    const hiddenOffsetMs = -INITIAL_PLAYBACK_DELAY_MS;
    const userOffsetMs = userAudioSyncOffsetRef.current;
    const defaultOffsetMs = offsetMs;

    const totalOffsetMs = hiddenOffsetMs + defaultOffsetMs + userOffsetMs;
    const clMs = baseTimeSec * 1000;

    if (totalOffsetMs < 0) {
      const absDelayMs = Math.abs(totalOffsetMs);
      if (clMs < absDelayMs) {
        return 0;
      } else {
        return (clMs - absDelayMs) / 1000;
      }
    } else {
      return (clMs + totalOffsetMs) / 1000;
    }
  };

  const triggerBackingTrackPlay = useCallback((clMs: number) => {
    const backing = gameSettingsRef.current?.backingTrack;
    if (!backing || backing.type === "none") {
      setBackingTrackStatus("playing");
      hasAudioStartedThisStretchRef.current = true;
      return;
    }

    const defaultOffset = backing.offsetMs || 0;
    const userMs = userAudioSyncOffsetRef.current;
    
    // totalOffsetMs defines where 0s of audio is relative to clMs=0.
    // Since notes have a +2000ms offset (INITIAL_PLAYBACK_DELAY_MS),
    // an audio track with 0 offset should start when clMs reaches 2000ms.
    const TOTAL_START_DELAY_MS = INITIAL_PLAYBACK_DELAY_MS; // 2000
    const totalOffsetMs = -TOTAL_START_DELAY_MS + defaultOffset + userMs;
    const currentMultiplier = Math.max(0.1, playbackTempoMultiplierRef.current);

    const playDirect = (startPlayheadSec: number) => {
      // Clear any pending timeout just in case (though we're moving away from it)
      if (audioStartTimeoutRef.current) {
        clearTimeout(audioStartTimeoutRef.current);
        audioStartTimeoutRef.current = null;
      }

      hasAudioStartedThisStretchRef.current = true;
      if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
        const audio = audioRef.current;
        audio.volume = mp3VolumeRef.current;
        audio.playbackRate = currentMultiplier;

        const setTimeAndPlay = () => {
          // Re-calculate the start playhead based on the latest estimated musical time
          // to account for any delay in loading metadata or browser scheduling.
          const currentRealTime = performance.now();
          const realTimeElapsed = currentRealTime - performanceStartTimeRef.current;
          const latestClMs = pausedMusicalTimeRef.current + realTimeElapsed * currentMultiplier;
          
          const TOTAL_START_DELAY_MS = INITIAL_PLAYBACK_DELAY_MS;
          const dynamicTotalOffsetMs = -TOTAL_START_DELAY_MS + (gameSettingsRef.current?.backingTrack?.offsetMs || 0) + userAudioSyncOffsetRef.current;
          
          let dynamicStartPlayheadSec = 0;
          if (dynamicTotalOffsetMs < 0) {
            dynamicStartPlayheadSec = Math.max(0, latestClMs - Math.abs(dynamicTotalOffsetMs)) / 1000;
          } else {
            dynamicStartPlayheadSec = (latestClMs + dynamicTotalOffsetMs) / 1000;
          }

          audio.currentTime = Math.max(0, dynamicStartPlayheadSec);
          audio.play().then(() => setBackingTrackStatus("playing")).catch((e) => {
            console.error("Audio trigger play error:", e.name, e.message);
            if (e.name !== 'AbortError') setBackingTrackStatus("error");
          });
        };

        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
          setTimeAndPlay();
        } else {
          const onCanPlay = () => {
            setTimeAndPlay();
            audio.removeEventListener('canplay', onCanPlay);
          };
          audio.addEventListener('canplay', onCanPlay);
        }
      } else if (backing.type === "youtube" && youtubePlayerRef.current) {
        try {
          if (typeof youtubePlayerRef.current.setVolume === "function") {
            youtubePlayerRef.current.setVolume(mp3VolumeRef.current * 100);
          }
          if (typeof youtubePlayerRef.current.setPlaybackRate === "function") {
            youtubePlayerRef.current.setPlaybackRate(currentMultiplier);
          }
          youtubePlayerRef.current.seekTo(Math.max(0, startPlayheadSec), true);
          safePlayYoutube(true);
          setBackingTrackStatus("playing");
        } catch (e) {
          console.error("YouTube trigger play error:", e);
          setBackingTrackStatus("error");
        }
      }
    };

    if (totalOffsetMs < 0) {
      const absDelayMs = Math.abs(totalOffsetMs);
      if (clMs < absDelayMs) {
        // High-precision approach: don't set a timeout.
        // Let the playbackLoop call us every frame until clMs >= absDelayMs.
        // This ensures audio starts exactly when the visual head reaches it.
        setBackingTrackStatus("loading");
        
        // Reset player to start while waiting
        if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
          if (audioRef.current.currentTime !== 0) audioRef.current.currentTime = 0;
          if (!audioRef.current.paused) audioRef.current.pause();
        } else if (backing.type === "youtube" && youtubePlayerRef.current) {
          try {
            // Only seek if not already at 0 to avoid constant API calls
            if (youtubePlayerRef.current.getCurrentTime() > 0.1) youtubePlayerRef.current.seekTo(0, true);
            safePauseYoutube();
          } catch(e) {}
        }
        
        // Don't set hasAudioStartedThisStretchRef = true here so we stay in the check-loop
        return;
      } else {
        const startPlayheadSec = (clMs - absDelayMs) / 1000;
        playDirect(startPlayheadSec);
      }
    } else {
      const startPlayheadSec = (clMs + totalOffsetMs) / 1000;
      playDirect(startPlayheadSec);
    }
  }, []); 

  const [backingTrackStatus, setBackingTrackStatus] = useState<"idle" | "loading" | "playing" | "stalled" | "error">("idle");
  const audioStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const audioPlayPromiseRef = useRef<Promise<void> | null>(null); // NEW: Track audio play promise
  const hasAudioStartedThisStretchRef = useRef(false);
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

  // Cleanup YouTube player when leaving inGame
  useEffect(() => {
    if (currentScreen !== "inGame" && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        console.warn("Failed to destroy YouTube player", e);
      }
      youtubePlayerRef.current = null;
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
  const [playbackTempoMultiplier, setPlaybackTempoMultiplier] =
    useState<number>(1);
  const playbackTempoMultiplierRef = useRef(playbackTempoMultiplier);

  const [previewPlaybackTempoMultiplier, setPlaybackTempoMultiplierForPreview] =
    useState<number>(1);
  const [musicalCurrentTimeMs, setMusicalCurrentTimeMs] = useState<number>(0);

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
  const originalMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME);
  const prevMasterVolumeRef = useRef(DEFAULT_MASTER_VOLUME); // New ref to store volume before mic/midi mute
  const lastSeekTimeRef = useRef<number>(0);
  const loopDelayStartTimeRef = useRef<number | null>(null);

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
    if (gameSettings.practiceHand === "both") return playbackNotes;
    return playbackNotes.filter(
      (note) => note.hand === gameSettings.practiceHand,
    );
  }, [playbackNotes, gameSettings?.practiceHand, isFreePlayMode]);

  const originalTotalMusicalDurationMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    const endTime = notesForGame.reduce(
      (max, note) => Math.max(max, note.timeMs + note.durationMs),
      0,
    );
    return endTime;
  }, [notesForGame]);

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

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (instrumentMode === "piano") {
      setLastPianoViewMode(newMode);
    } else {
      setLastDrumViewMode(newMode);
    }
    setIsLoadingContent(true);
    setRenderedLayoutId(0);
    setActivePlaybackNotesInfo(new Map());
  };
  const handleInstrumentModeChange = (newMode: "piano" | "drum") => {
    setInstrumentMode(newMode);
    setActivePlaybackNotesInfo(new Map());
    setRenderedLayoutId(0);
    
    // Switch to the last used view mode for the new instrument mode
    if (newMode === "piano") {
      setViewMode(lastPianoViewMode);
    } else {
      setViewMode(lastDrumViewMode);
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
        pausedMusicalTimeRef.current +
        realTimeElapsed * playbackTempoMultiplierRef.current;

      // Re-anchor time
      pausedMusicalTimeRef.current = currentMusicalTime;
      performanceStartTimeRef.current = currentRealTime;
    }
    // Update ref to new multiplier
    playbackTempoMultiplierRef.current = playbackTempoMultiplier;

    // Update audio playback rate immediately
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackTempoMultiplier;
      audioRef.current.defaultPlaybackRate = playbackTempoMultiplier;
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
  }, [playbackTempoMultiplier]);

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
    localStorage.setItem("game_user_audio_sync_ms", userAudioSyncOffset.toString());
  }, [userAudioSyncOffset]);
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
  const [showQwertyShortcuts, setShowQwertyShortcuts] = useState<boolean>(
    DEFAULT_SHOW_QWERTY_SHORTCUTS,
  );
  const [showPianoTilesBackground, setShowPianoTilesBackground] =
    useState<boolean>(DEFAULT_SHOW_PIANO_TILES_BACKGROUND);
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
  const activeMirpNotesRef = useRef<Map<string, number>>(new Map());

  const SETTINGS_KEY = "octavia_settings_v1";

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.masterVolume !== undefined) setMasterVolume(s.masterVolume);
        if (s.metronomeVolume !== undefined)
          setMetronomeVolume(s.metronomeVolume);
        if (s.mp3Volume !== undefined) setMp3Volume(s.mp3Volume);
        if (s.viewMode !== undefined) setViewMode(s.viewMode);
        if (s.noteLabelType !== undefined) setNoteLabelType(s.noteLabelType);
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
        if (s.instrumentMode !== undefined) setInstrumentMode(s.instrumentMode);
        if (s.lastPianoViewMode !== undefined) setLastPianoViewMode(s.lastPianoViewMode);
        if (s.lastDrumViewMode !== undefined) setLastDrumViewMode(s.lastDrumViewMode);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
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
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [
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
  ]);

  const resetSettings = useCallback(() => {
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
    localStorage.removeItem(SETTINGS_KEY);
  }, []);

  const recentNotesBufferRef = useRef<Map<number, number>>(new Map());
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState("");
  const badStretchStartTimeRef = useRef<number | null>(null);
  const lastChunkCheckedRef = useRef<number>(-1);

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
      audioRef.current.playbackRate = playbackTempoMultiplier;
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
  }, [playbackTempoMultiplier, isPlaying]); // Update when multiplier OR playing status changes
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
    userActiveKeys.forEach((name) => {
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
  }, [userActiveKeys, noteNameToKeyDefMap]);

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

  const baseCalculatedPianoWidth = useMemo(() => {
    if (!keyPositionsMap || keyPositionsMap.size === 0) return containerWidth;
    return Array.from(keyPositionsMap.values())
      .filter((kp: KeyPosition) => kp.type === "white")
      .reduce(
        (max: number, kp: KeyPosition) => Math.max(max, kp.x + kp.width),
        0,
      );
  }, [keyPositionsMap, containerWidth]);

  const waitMode: WaitMode = isFreePlayMode
    ? "off"
    : gameSettings?.waitMode || "strict";
  const isMetronomeAvailable = useMemo(
    () => (notesForGame.length > 0 && tempoEvents.length > 0) || isFreePlayMode,
    [notesForGame.length, tempoEvents.length, isFreePlayMode],
  );
  const absoluteEndTimeMs = useMemo(() => {
    if (!notesForGame || notesForGame.length === 0) return 0;
    return notesForGame.reduce(
      (max, note) => Math.max(max, note.timeMs + note.durationMs),
      0,
    );
  }, [notesForGame]);
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
        const actualHeightForDynamicView = Math.max(
          0,
          totalAvailableContentHeight -
            (layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight),
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
  }, [notesForGame.length, currentScreen, layoutConfig, isFreePlayMode]);

  useEffect(() => {
    isFreePlayModeRef.current = isFreePlayMode;
  }, [isFreePlayMode]);

  const initializeAudioContext = useCallback(
    async (shouldResume: boolean = true) => {
      let context = audioContextRef.current;
      if (!context) {
        try {
          const AudioContextConstructor =
            window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextConstructor) return false;
          context = new (AudioContextConstructor as { new (): AudioContext })();
          audioContextRef.current = context;
          masterGainRef.current = context.createGain();
          masterGainRef.current.connect(context.destination);
          metronomeGainRef.current = context.createGain();
          metronomeGainRef.current.connect(context.destination);
        } catch (e) {
          return false;
        }
      }
      if (shouldResume && context.state === "suspended") {
        try {
          await context.resume();
        } catch (e) {
          return false;
        }
      }
      // Also resume on EVERY call if it's not running
      if (shouldResume && context.state !== "running") {
        try {
          await context.resume();
        } catch (e) {}
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
      audioRef.current.playbackRate = playbackTempoMultiplier;
      // Force a re-apply after a short delay because some browsers reset it when playback starts or src changes
      const timer = setTimeout(() => {
        if (audioRef.current)
          audioRef.current.playbackRate = playbackTempoMultiplier;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [playbackTempoMultiplier, gameSettings?.backingTrack?.url, isPlaying]);
  useEffect(() => {
    const backing = gameSettings?.backingTrack;
    if (
      backing?.type === "youtube" &&
      backing.url &&
      !youtubePlayerRef.current &&
      currentScreen === "inGame"
    ) {
      const hasYTApi = (window as any).YT && (window as any).YT.Player;
      if (hasYTApi) {
        initializeYoutubePlayer(backing.url!);
      } else if (!(window as any).onYouTubeIframeAPIReady) {
        (window as any).onYouTubeIframeAPIReady = () => {
          initializeYoutubePlayer(backing.url!);
        };
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      } else {
        const originalOnReady = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (originalOnReady) {
            try {
              originalOnReady();
            } catch (e) {}
          }
          initializeYoutubePlayer(backing.url!);
        };
      }
    }
    return () => {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {}
        youtubePlayerRef.current = null;
      }
    };
  }, [
    gameSettings?.backingTrack?.url,
    gameSettings?.backingTrack?.type,
    instrumentMode,
    currentScreen,
  ]);

  const initializeYoutubePlayer = (url: string) => {
    const videoId = getYoutubeId(url);
    if (!videoId) return;
    if (youtubeContainerRef.current) {
      youtubeContainerRef.current.innerHTML = '<div id="youtube-player"></div>';
    }
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
      },
      events: {
        onReady: (event: any) => {
          console.log("YouTube Player Ready");
          event.target.setVolume(mp3VolumeRef.current * 100);
          if (isPlayingRef.current) {
            const backing = gameSettingsRef.current?.backingTrack;
            if (backing && backing.type === "youtube") {
              triggerBackingTrackPlay(currentTimeRef.current);
            }
          }
        },
        onStateChange: (event: any) => {
          // YT.PlayerState.PLAYING = 1, BUFFERING = 3
          if (event.data === 1) {
            if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
          } else if (event.data === 3) {
            if (backingTrackStatus !== 'loading' && backingTrackStatus !== 'stalled') {
              setBackingTrackStatus('stalled');
            }
          }
        },
        onError: (el: any) => {
          console.error("YouTube Player Error:", el);
          setBackingTrackError("Failed to load YouTube audio.");
          setBackingTrackStatus("error");
        },
      },
    });
  };

  const getYoutubeId = (url: string) => {
    if (url.includes("youtu.be/"))
      return url.split("youtu.be/")[1].split("?")[0];
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
      } catch (e) {}
    }
  };

  const safePauseYoutube = async () => {
    if (
      youtubePlayerRef.current &&
      typeof youtubePlayerRef.current.pauseVideo === "function"
    ) {
      try {
        youtubePlayerRef.current.pauseVideo();
      } catch (e) {}
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
          response = await fetch(`/sounds/drum/${drumFile}`);
        } else {
          const noteName = midiNoteToNameMap.get(midiNote);
          if (!noteName) return null;
          response = await fetch(`/sounds/piano/${noteName}.mp3`);
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
      const audioContextReady = await initializeAudioContext();
      if (!audioContextReady) return;
      setIsPreloading(true);
      const uniqueMidiNotes =
        notes.length > 0 ? [...new Set(notes.map((note) => note.midi))] : [];
      const promises = uniqueMidiNotes.map((midiNote) =>
        getAudioBuffer(midiNote),
      );
      const loadGeneric = async (path: string) => {
        if (!audioContextRef.current) return null;
        const res = await fetch(path);
        const ab = await res.arrayBuffer();
        return audioContextRef.current.decodeAudioData(ab);
      };
      const p1 = loadGeneric("/sounds/metronome/strong_beat.mp3");
      const p2 = loadGeneric("/sounds/metronome/weak_beat.mp3");
      promises.push(p1 as any, p2 as any);
      try {
        await Promise.all(promises);
        metronomeBuffersRef.current.strong = (await p1) as AudioBuffer;
        metronomeBuffersRef.current.weak = (await p2) as AudioBuffer;
      } catch (e) {
      } finally {
        setIsPreloading(false);
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
    (midiNote: number, musicalDurationMs: number, velocity: number = 0.75) => {
      const selectedOutput = selectedMidiOutputId
        ? midiOutputs.get(selectedMidiOutputId)
        : null;
      const realDurationMs = musicalDurationMs / playbackTempoMultiplier;
      if (selectedOutput) {
        selectedOutput.send([0x90, midiNote, Math.round(velocity * 127)]);
        setTimeout(() => {
          selectedOutput.send([0x80, midiNote, 0]);
        }, realDurationMs);
        return;
      }
      if (!audioContextRef.current || !masterGainRef.current) return;
      const audioCtx = audioContextRef.current;
      const isDrumMode = instrumentMode === "drum";
      const cacheKey = isDrumMode ? `drum_${midiNote}` : midiNote;
      const audioBuffer = audioBufferCacheRef.current.get(cacheKey);
      if (!audioBuffer) return;
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gainNode.gain.setValueAtTime(velocity * 1.6, now);
      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);
      source.start(now);
      if (isDrumMode) {
        // Drum sounds play to completion without premature stop
        return;
      }
      const releaseTimeSec = 0.4,
        noteEndTimeSec = now + realDurationMs / 1000;
      gainNode.gain.setValueAtTime(velocity * 1.6, noteEndTimeSec);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        noteEndTimeSec + releaseTimeSec,
      );
      source.stop(noteEndTimeSec + releaseTimeSec + 0.1);
    },
    [
      playbackTempoMultiplier,
      selectedMidiOutputId,
      midiOutputs,
      instrumentMode,
    ],
  );

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
          try {
            audioNode.source.stop(audioContextRef.current.currentTime);
          } catch (e) {}
        }
        activeAudioNodesRef.current.delete(keyName);
      }
      const audioCtx = audioContextRef.current;
      const playBufferedNote = (buffer: AudioBuffer) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = false;
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(velocity * 1.6, audioCtx.currentTime);
        source.connect(gainNode);
        gainNode.connect(masterGainRef.current!);
        source.start(0);
        activeAudioNodesRef.current.set(keyName, { source, gainNode });
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
          releaseTime = 0.5;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
        source.stop(now + releaseTime + 0.1);
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
        } catch (e) {}
      });
    }
    scheduledMetronomeAudioNodesRef.current = [];
  }, []);

  const clearScheduledNotes = useCallback(() => {
    scheduledNoteTimeoutsRef.current.forEach(clearTimeout);
    scheduledNoteTimeoutsRef.current.clear();
    activeNoteInstancesRef.current.clear();
    setActivePlaybackNotesInfo(new Map());
  }, []);

  // Robust Audio Playback Helper
  const safePlayAudio = useCallback(async (isDirect: boolean = false) => {
    if (audioRef.current) {
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
        }).catch((err) => {
          if (audioPlayPromiseRef.current === p)
            audioPlayPromiseRef.current = null;
          // Set error status if blocked (e.g. NotAllowedError)
          if (err.name === "NotAllowedError") {
            setBackingTrackStatus("error");
          }
        });
      } catch (e: any) {
        audioPlayPromiseRef.current = null;
        if (e.name === "NotAllowedError") {
          setBackingTrackStatus("error");
        }
        if (e.name !== "AbortError") {
          console.error("Audio play error:", e);
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
        } catch (e) {}
        audioPlayPromiseRef.current = null;
      }
      try {
        audioRef.current.pause();
      } catch (e) {}
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
      audioContextRef.current.resume().catch(() => {});
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
    async (exitFreePlay: boolean = true, shouldRewind: boolean = true) => {
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
      if (isSettingsPreviewActiveRef.current) {
        isSettingsPreviewActiveRef.current = false;
      }
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
        
        // Stop audio immediately even if we are rewinding visually
        if (audioRef.current) {
          await safePauseAudio();
          audioRef.current.currentTime = 0;
        }
        if (youtubePlayerRef.current) {
          await safePauseYoutube();
          try {
            youtubePlayerRef.current.seekTo(0, true);
          } catch (e) {}
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
      setMusicalCurrentTimeMs(0);
      currentTimeRef.current = 0;
      pausedMusicalTimeRef.current = 0;
      nextNoteIndexRef.current = 0;
      missedNoteIndexRef.current = 0;
      noteJudgmentsRef.current.clear();
      clearScheduledNotes();
      clearScheduledMetronomeSounds();
      updateNotesCurrentlyWaitingFor(new Set<number>());
      notesCurrentlyWaitingForIdsRef.current = new Set<string>();
      waitingBlockTimeRef.current = null;
      resumeIndexRef.current = null;
      presatisfiedNoteIdsRef.current = new Set<string>();
      setActivePlaybackNotesInfo(new Map());
      nextBarIndexRef.current = 0;
      hitsAtLastCheckRef.current = 0;
      totalNotesAtLastCheckRef.current = 0;
      lastBarCheckedRef.current = 0;
      if (chordDetectionTimeoutRef.current) {
        clearTimeout(chordDetectionTimeoutRef.current);
        chordDetectionTimeoutRef.current = null;
      }
      loopDelayStartTimeRef.current = null;
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
      setLiveSpeed(100);
      gameRealStartTimeRef.current = null;
      setTotalWaitTimeMs(0);
      accumulatedWaitTimeRef.current = 0;
      waitStartTimeRef.current = null;
      accumulatedPauseTimeRef.current = 0;
      pauseStartTimeRef.current = null;
      accumulatedSeekTimeRef.current = 0;

      if (audioRef.current) {
        await safePauseAudio();
        audioRef.current.currentTime = 0;
      }
      if (youtubePlayerRef.current) {
        await safePauseYoutube();
        try {
          youtubePlayerRef.current.seekTo(0, true);
        } catch (e) {}
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
    ],
  );

  /**
   * Effect to handle the visual rewind animation
   * Triggered when handleStopPlayback sets isRewinding to true
   */
  useEffect(() => {
    if (!isRewinding) return;

    const startValue = currentTimeRef.current;
    
    // Target is behind 0 to create an "overshoot" effect
    const overshootAmount = 1500; 
    const targetValue = -overshootAmount;

    // Proportional duration: faster for short distances, but with a minimum for the overshoot
    const distance = Math.abs(startValue - targetValue);
    const duration = Math.min(800, Math.max(400, distance / 15));
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
        // Final full reset to 0 once overshoot animation is complete
        handleStopPlayback(false, false);
      }
    };

    rafId = requestAnimationFrame(animateRewind);
    return () => cancelAnimationFrame(rafId);
  }, [isRewinding, handleStopPlayback]);

  const handleCloseGameOverModal = useCallback(() => {
    setIsGameOver(false);
    setGameOverReason("");
    handleStopPlayback();
  }, [handleStopPlayback]);

  const satisfyUpcomingNote = useCallback(
    (noteDef: MidiNotePlaybackItem) => {
      presatisfiedNoteIdsRef.current.add(noteDef.noteId);
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
      const highlightDurationMs =
        Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) /
        playbackTempoMultiplier;
      scheduledNoteTimeoutsRef.current.set(
        noteDef.noteId,
        window.setTimeout(
          () => {
            setActivePlaybackNotesInfo((prev) => {
              const nm = new Map(prev);
              nm.delete(noteDef.noteId);
              return nm;
            });
            scheduledNoteTimeoutsRef.current.delete(noteDef.noteId);
          },
          Math.max(
            0,
            noteDef.timeMs +
              Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) -
              currentTimeRef.current,
          ) / playbackTempoMultiplier,
        ),
      );
    },
    [playbackTempoMultiplier],
  );

  const visuallySatisfyNote = useCallback(
    (noteDef: MidiNotePlaybackItem) => {
      const noteId = noteDef.noteId;
      activeNoteInstancesRef.current.set(noteId, noteDef);
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
      if (scheduledNoteTimeoutsRef.current.has(noteId))
        clearTimeout(scheduledNoteTimeoutsRef.current.get(noteId)!);
      scheduledNoteTimeoutsRef.current.set(
        noteId,
        window.setTimeout(
          () => {
            activeNoteInstancesRef.current.delete(noteId);
            scheduledNoteTimeoutsRef.current.delete(noteId);
            setActivePlaybackNotesInfo((prev) => {
              const nm = new Map(prev);
              nm.delete(noteId);
              return nm;
            });
          },
          Math.min(noteDef.durationMs, VISUAL_NOTE_CAP_MS) /
            playbackTempoMultiplier,
        ),
      );
    },
    [playbackTempoMultiplier],
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

  // Fallback Effect: Force 'playing' status if audio is objectively moving
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const backing = gameSettingsRef.current?.backingTrack;
      if (!backing || backing.type === 'none') return;
      
      if (backing.type === 'mp3' || backing.type === 'link') {
        const audio = audioRef.current;
        if (audio && !audio.paused && audio.currentTime > 0) {
          if (backingTrackStatus !== 'playing') {
            setBackingTrackStatus('playing');
          }
        }
      } else if (backing.type === 'youtube' && youtubePlayerRef.current) {
        if (typeof youtubePlayerRef.current.getPlayerState === 'function') {
          if (youtubePlayerRef.current.getPlayerState() === 1) { // 1 = YT.PlayerState.PLAYING
            if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
          }
        }
      }
    }, 500); // Check every 500ms
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
      const scaledCl = cl / currentPlaybackTempoMultiplier;
      const startIndex = allBeatTimesRef.current.findIndex(
        (b) => b.timeMs >= scaledCl,
      );
      nextBeatToScheduleIndexRef.current =
        startIndex !== -1 ? startIndex : allBeatTimesRef.current.length;
      prevConceptualTimeRef.current = cl;
      if (waitMode === "off") {
        const b = notesForGame.filter((n) => n.timeMs < cl);
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
        const isNonStop = gameSettingsRef.current?.isNonStop ?? false;
        if (isNonStop) {
          notesForGame.forEach((n) => {
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
          for (let i = 0; i < notesForGame.length; i++) {
            const n = notesForGame[i];
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
              const n = notesForGame.find((x) => x.noteId === id);
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
      setBackingTrackStatus("loading"); // Force "loading" until audio catches up
      let ni = 0;
      while (ni < notesForGame.length && notesForGame[ni].timeMs < cl) ni++;
      nextNoteIndexRef.current = ni;
      missedNoteIndexRef.current = ni;
      if (isPlayingRef.current) {
        performanceStartTimeRef.current = performance.now();
        audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
        isUserPausedRef.current = false;
      }
      lastSeekTimeRef.current = performance.now();
      loopDelayStartTimeRef.current = null;
      const backing = gameSettingsRef.current?.backingTrack;
      if (backing && backing.type !== "none") {
        if (isPlayingRef.current) {
          triggerBackingTrackPlay(cl);
        } else {
          // Paused seeking
          const defaultOffset = backing.offsetMs || 0;
          const userMs = userAudioSyncOffsetRef.current;
          const totalOffsetMs = -INITIAL_PLAYBACK_DELAY_MS + defaultOffset + userMs;
          let clampedTime = 0;
          if (totalOffsetMs < 0) {
            const absDelayMs = Math.abs(totalOffsetMs);
            clampedTime = Math.max(0, cl - absDelayMs) / 1000;
          } else {
            clampedTime = (cl + totalOffsetMs) / 1000;
          }
          if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
              if (audioRef.current.readyState >= 1) {
                  audioRef.current.currentTime = clampedTime;
              }
          } else if (backing.type === "youtube" && youtubePlayerRef.current) {
              try { youtubePlayerRef.current.seekTo(clampedTime, true); } catch(e) {}
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

  const playbackLoop = useCallback(async () => {
    try {
      const currentPlaybackTempoMultiplier = Math.max(0.1, playbackTempoMultiplierRef.current);
      const isNonStop =
        (gameSettingsRef.current?.isNonStop ?? false) ||
        waitMode === "retical" ||
        waitMode === "off";
      
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
        waitMode === "strict" ||
        waitMode === "rhythm" ||
        waitMode === "retical";
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

      // Handle loop delay (2 seconds)
      if (loopDelayStartTimeRef.current !== null) {
        const elapsed = currentRealTime - loopDelayStartTimeRef.current;
        if (elapsed < 2000) {
          const remaining = (2000 - elapsed) / 1000;
          setMusicalCurrentTimeMs(loopStartMsRef.current!);
          playbackRequestRef.current = requestAnimationFrame(playbackLoop);
          return;
        } else {
          loopDelayStartTimeRef.current = null;
          performanceStartTimeRef.current = performance.now();
          audioCtxStartTimeRef.current = audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000);
          pausedMusicalTimeRef.current = loopStartMsRef.current!;
          
          if (!isNoneBacking && backing) {
            triggerBackingTrackPlay(loopStartMsRef.current!);
          }
        }
      }

      const realTimeElapsedSinceStartOrPause = ( (audioContextRef.current ? audioContextRef.current.currentTime : (performance.now() / 1000)) - audioCtxStartTimeRef.current ) * 1000;
      const conceptualMusicalTimeNoFreeze = pausedMusicalTimeRef.current + realTimeElapsedSinceStartOrPause * currentPlaybackTempoMultiplier;
      
      const conceptualMusicalTime = conceptualMusicalTimeNoFreeze;

      // Initial sync (No more nudging)

      // Looping logic
      if (
        isLoopingRef.current &&
        loopStartMsRef.current !== null &&
        loopEndMsRef.current !== null &&
        loopEndMsRef.current > loopStartMsRef.current &&
        conceptualMusicalTime >= loopEndMsRef.current &&
        (conceptualMusicalTime >= 100 || loopEndMsRef.current >= 100)
      ) {
        handleSeek(loopStartMsRef.current, true);
        loopDelayStartTimeRef.current = performance.now();
        if (audioRef.current) safePauseAudio();
        if (youtubePlayerRef.current) safePauseYoutube();
        playbackRequestRef.current = requestAnimationFrame(playbackLoop);
        return;
      }
      
      // Unified Backing Track Sync Check (Periodic Auto-Sync)
      // Be more resilient: For MP3/Link, sync as long as it's not paused, even if the status is still 'loading'
      const isAudioActuallyPlaying = (backing?.type === "mp3" || backing?.type === "link") 
        ? (audioRef.current && !audioRef.current.paused)
        : (backingTrackStatus === "playing");

      if (isPlayingRef.current && !isInWaitState && backing && backing.type !== "none" && isAudioActuallyPlaying) {
        let audioCurrentTimeSec = -1;
        if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
          audioCurrentTimeSec = audioRef.current.currentTime;
        } else if (backing.type === "youtube" && youtubePlayerRef.current) {
          if (typeof youtubePlayerRef.current.getCurrentTime === "function") {
            audioCurrentTimeSec = youtubePlayerRef.current.getCurrentTime();
          }
        }

        if (audioCurrentTimeSec >= 0) {
          const defaultOffset = backing.offsetMs || 0;
          const userMs = userAudioSyncOffsetRef.current;
          const totalOffsetMs = -INITIAL_PLAYBACK_DELAY_MS + defaultOffset + userMs;
          
          let expectedAudioTimeSec = 0;
          if (totalOffsetMs < 0) {
            expectedAudioTimeSec = Math.max(0, conceptualMusicalTime - Math.abs(totalOffsetMs)) / 1000;
          } else {
            expectedAudioTimeSec = (conceptualMusicalTime + totalOffsetMs) / 1000;
          }

          const driftSec = Math.abs(audioCurrentTimeSec - expectedAudioTimeSec);
          // Apply auto-sync if drift exceeds 150ms (shorter threshold for better rhythm feel)
          // Also force-sync if the audio is at 0 but we expect it to be much further along (typical startup glitch)
          if (driftSec > 0.15 || (audioCurrentTimeSec < 0.1 && expectedAudioTimeSec > 0.5)) {
            if ((backing.type === "mp3" || backing.type === "link") && audioRef.current) {
               audioRef.current.currentTime = expectedAudioTimeSec;
            } else if (backing.type === "youtube" && youtubePlayerRef.current) {
               try { youtubePlayerRef.current.seekTo(expectedAudioTimeSec, true); } catch(e) {}
            }
          }
        }
      }

      // removed backing track sync logic and wait mode handle

      let actualMusicalTimeForGameLogic: number;
      if (isInWaitState) {
        actualMusicalTimeForGameLogic = waitingBlockTimeRef.current!;
        if (waitStartTimeRef.current === null) {
          waitStartTimeRef.current = performance.now();
          if (audioRef.current && !audioRef.current.paused) safePauseAudio();
          if (youtubePlayerRef.current) {
            try {
              if (
                typeof youtubePlayerRef.current.getPlayerState === "function" &&
                youtubePlayerRef.current.getPlayerState() === 1
              ) {
                safePauseYoutube();
              }
            } catch (e) {}
          }
        }
        setTotalWaitTimeMs(
          accumulatedWaitTimeRef.current +
            (performance.now() - waitStartTimeRef.current),
        );
      } else {
        actualMusicalTimeForGameLogic = conceptualMusicalTime;
        setMusicalCurrentTimeMs(conceptualMusicalTime);
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
        setLiveSpeed(calculatedLiveSpeed);
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
            
            // Scheduling logic: Use a high-precision target time.
            const targetAudioContextTime =
              audioCtx.currentTime + timeUntilBeatPlaysRealMs / 1000;

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
          if (waitMode === "off") {
            const noteId = note.noteId;
            if (!activeNoteInstancesRef.current.has(noteId)) {
              const soundVelocity = isSettingsPreviewActiveRef.current
                ? note.velocity * 0.25
                : note.velocity;
              playSound(note.midi, note.durationMs, soundVelocity);
              activeNoteInstancesRef.current.set(noteId, note);

              if (!hitNoteIdsRef.current.has(noteId)) {
                // In Autoplay (waitMode === 'off'), notes are automatically hit as "Perfect"
                setPerfectCount((prev) => prev + 1);
                perfectCountRef.current += 1;
                setHitCount((prev) => prev + 1);
                hitCountRef.current += 1;
                hitNoteIdsRef.current.add(noteId);

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
              setActivePlaybackNotesInfo((prev) =>
                new Map(prev).set(noteId, {
                  noteId,
                  name: note.name,
                  timeMs: note.timeMs,
                  hand: note.hand,
                  midi: note.midi,
                  pitchClass: note.pitchClass,
                  status: "playing",
                  finger: note.finger,
                }),
              );
              const hd =
                Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) /
                playbackTempoMultiplier;
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
        while (lookaheadIndex < notesForGame.length) {
          const n = notesForGame[lookaheadIndex];
          if (n.timeMs - blockStartTime < chordWindowMs) {
            if (!presatisfiedNoteIdsRef.current.has(n.noteId))
              chordBlock.push(n);
            lookaheadIndex++;
          } else break;
        }
        if (chordBlock.length > 0) {
          waitingBlockTimeRef.current = blockStartTime;
          resumeIndexRef.current = lookaheadIndex;
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
          waitMode === "retical" ||
          waitMode === "off";
        if (isNonStop) {
          let mi = missedNoteIndexRef.current;
          const goodWindow =
            gameSettingsRef.current?.noteToleranceMs ??
            (instrumentMode === "piano" ? 200 : 100);
          while (mi < notesForGame.length) {
            const note = notesForGame[mi];
            if (currentTimeRef.current > note.timeMs + goodWindow) {
              if (!hitNoteIdsRef.current.has(note.noteId)) {
                setMissCount((p) => p + 1);
                missCountRef.current += 1;
                setCombo(0);
                comboRef.current = 0;
                setLastJudgment("miss");
                lastJudgmentRef.current = "miss";
                hitNoteIdsRef.current.add(note.noteId);
                noteJudgmentsRef.current.set(note.noteId, "miss");
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
        } else {
          const currentHits = hitCountRef.current;
          const currentErrors = isAudioInputEnabledRef.current
            ? 0
            : errorCountRef.current;
          
          // Old formula for non-stop disabled: hit / (hit + error)
          const totalAttempts = currentHits + currentErrors;
          calculatedLiveAccuracy =
            totalAttempts > 0 ? (currentHits / totalAttempts) * 100 : 100;
        }
        if (waitMode === "off") {
          calculatedLiveAccuracy = 100;
          calculatedLiveSpeed = 100;
        }
        setLiveAccuracy(calculatedLiveAccuracy);
        setLiveSpeed(calculatedLiveSpeed);
      }

      // 5-second chunk / 2.5s bad performance check for Retical mode
      if (waitMode === "retical" && isPlayingRef.current) {
        const currentAcc = calculatedLiveAccuracy;
        const currentSpd = calculatedLiveSpeed;
        
        // If either accuracy or speed efficiency is below 50%
        if (currentAcc < 50 || currentSpd < 50) {
          if (badStretchStartTimeRef.current === null) {
            badStretchStartTimeRef.current = performance.now();
          } else {
            const badDuration = performance.now() - badStretchStartTimeRef.current;
            // If the failure lasts for more than 2.5 seconds
            if (badDuration >= 2500) {
              setIsPlaying(false);
              isPlayingRef.current = false;
              if (playbackRequestRef.current) {
                cancelAnimationFrame(playbackRequestRef.current);
                playbackRequestRef.current = null;
              }
              setGameOverReason(
                `Game Over: Your ${currentAcc < 50 ? "accuracy" : "speed efficiency"} was below 50% for 2.5 seconds.`
              );
              setIsGameOver(true);
              badStretchStartTimeRef.current = null; // Reset
              return;
            }
          }
        } else {
          // Performance recovered, reset the timer
          badStretchStartTimeRef.current = null;
        }
      }

      if (
        actualMusicalTimeForGameLogic >= totalDurationWithEndDelayMs &&
        absoluteEndTimeMs > 0
      ) {
        if (isSettingsPreviewActiveRef.current) {
          handleSeek(0);
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
          const finalHitCount = hitCountRef.current,
            finalErrorCount = errorCountRef.current,
            totalNotes = notesForGame.length;
          let finalPerfectCount = perfectCountRef.current;
          let finalGreatCount = greatCountRef.current;
          let finalGoodCount = goodCountRef.current;
          let finalMissCount =
            totalNotes - (finalPerfectCount + finalGreatCount + finalGoodCount);

          let isAutoPlay = waitMode === "off";

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
            waitMode === "retical" ||
            waitMode === "off";

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

          let multiplier = Math.pow(Math.max(0, (gameplayPS - 75) / 25), 4);
          if (gameplayPS >= 97.5) {
            multiplier += (1 - multiplier) * 0.55;
          } else if (gameplayPS >= 95) {
            multiplier += (1 - multiplier) * 0.45;
          } else if (gameplayPS >= 92.5) {
            multiplier += (1 - multiplier) * 0.25;
          } else if (gameplayPS >= 90) {
            multiplier += (1 - multiplier) * 0.10;
          } else if (gameplayPS >= 87.5) {
            multiplier += (1 - multiplier) * 0.05;
          }

          const finalScore = baseMidiScore * multiplier;

          let gameplayStyle = "";
          if (instrumentMode === "drum") {
            gameplayStyle =
              selectedMidiInputId !== null
                ? "Drum MIDI"
                : "Keyboard/Touchscreen";
          } else {
            gameplayStyle =
              viewMode === "sheet-qwerty" ? "Computer Keyboard" : "Piano";
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
            isAutoplay: waitMode === "off",
          });
          clearScheduledNotes();
          clearScheduledMetronomeSounds();
          updateNotesCurrentlyWaitingFor(new Set<number>());
          setMusicalCurrentTimeMs(totalDurationWithEndDelayMs);
          return;
        }
      }
      playbackRequestRef.current = requestAnimationFrame(playbackLoop);
    } catch (e: any) {
      console.error("Playback loop error:", e);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [
    handleSeek,
    isPlayingRef,
    notesForGame,
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
    selectedMidiInputId,
    backingTrackStatus,
    isBackingTrackOverlayDismissed,
  ]);

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
                audioCtx.currentTime + timeUntilBeatMs / 1000;
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

    // Preload backing track if it's an online link or YouTube to ensure smooth playback
    if (finalSettings.backingTrack?.url && 
        (finalSettings.backingTrack.type === 'link' || finalSettings.backingTrack.type === 'mp3' || finalSettings.backingTrack.type === 'youtube')) {
      const originalUrl = finalSettings.backingTrack.url;
      if (!originalUrl.startsWith('blob:') && !originalUrl.startsWith('data:')) {
        setIsPreloading(true);
        setIsLoadingContent(true);
        try {
          const blobUrl = await preloadAudioUrl(originalUrl);
          if (blobUrl !== originalUrl) {
            // Success: Switch to 'mp3' type so it uses the Audio element instead of YouTube IFrame
            // This fixes syncing issues as the Audio element is more reliable in this environment.
            finalSettings.backingTrack = { 
              ...finalSettings.backingTrack, 
              url: blobUrl,
              type: 'mp3' 
            };
          }
        } catch (e) {
          console.error("Backing track preload failed:", e);
        } finally {
          setIsPreloading(false);
        }
      }
    }

    setGameSettings(finalSettings);
    gameSettingsRef.current = finalSettings;
    setPlaybackTempoMultiplier(finalSettings.playbackTempoMultiplier);
    playbackTempoMultiplierRef.current = finalSettings.playbackTempoMultiplier;
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
  };

  const handleStartFreePlay = async () => {
    handleStopPlayback();
    setCurrentSongBackgroundUrl(null);
    previousViewModeRef.current = viewMode;
    setIsFreePlayMode(true);
    isFreePlayModeRef.current = true;
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

    // Force view mode based on instrument
    setViewMode("falling");

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

  const handlePlay = useCallback(async () => {
    // Attempt to resume audio context, but don't hard-block the entire function
    // if it returns false (maybe it's still initializing).
    await initializeAudioContext();

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

    setIsPlaying(true);
    isPlayingRef.current = true;
    isUserPausedRef.current = false;
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

    playbackRequestRef.current = requestAnimationFrame(playbackLoop);
  }, [
    notesForGame.length,
    initializeAudioContext,
    playbackLoop,
    freePlayLoop,
    isFreePlayMode,
    freePlayElapsedTime,
    playbackTempoMultiplier,
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
      if (waitMode === "off") return;
      
      const inputTime = getPreciseMusicalTime();
      if (isPlayingRef.current)
        lastPlayerInputRealTimeRef.current = performance.now();

      const isW =
        notesCurrentlyWaitingForRef.current.size > 0 &&
        waitingBlockTimeRef.current !== null;

      // In Wait Mode, we don't strictly use the offset for hit detection validity in the same way
      // because the game is paused waiting for the specific note.
      // However, visual feedback logic or scoring (if added later for wait mode) might use it.
      if (isW) {
        const wn = notesForGame.filter((n) =>
          notesCurrentlyWaitingForIdsRef.current.has(n.noteId),
        );

        let m: MidiNotePlaybackItem | undefined;
        if (gameSettingsRef.current?.instrumentMode === "drum") {
          const inputPadId = midiToDrumPadIdMap.get(midi);
          m = wn.find((n) => {
            const targetPadId = midiToDrumPadIdMap.get(n.midi);
            if (targetPadId === undefined || targetPadId !== inputPadId)
              return false;
            if (hitNoteIdsRef.current.has(n.noteId)) return false;

            return true;
          });
        } else if (isAudioInputEnabledRef.current) {
          // v2 scoring: octave-insensitive
          const inputPitchClass = midi % 12;
          m = wn.find(
            (n) =>
              n.midi % 12 === inputPitchClass &&
              !hitNoteIdsRef.current.has(n.noteId),
          );
        } else {
          // v1 scoring: octave-sensitive
          m = wn.find(
            (n) => n.midi === midi && !hitNoteIdsRef.current.has(n.noteId),
          );
        }

        if (waitMode === "strict") {
          // If the note being pressed is wrong or already hit, simply ignore
          if (m) {
            setPerfectCount((p) => p + 1);
            perfectCountRef.current += 1;
            setHitCount((p) => p + 1);
            hitCountRef.current += 1;
            hitNoteIdsRef.current.add(m.noteId);
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
            wn.forEach(n => {
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
        const search = notesForGame.slice(
          Math.max(0, nextNoteIndexRef.current - 20),
          Math.min(notesForGame.length, nextNoteIndexRef.current + 80),
        );
        let best: MidiNotePlaybackItem | null = null,
          min = Infinity,
          bestOffset = 0;

        for (const n of search) {
          // Adjust judgment calculation: 
          // Use the precise sub-frame inputTime calculated above.
          const adjustedNoteTime = n.timeMs - noteOffsetMs; 

          // Optimization: Skip notes way out of range
          if (
            adjustedNoteTime < inputTime - 2500 ||
            adjustedNoteTime > inputTime + 2500
          )
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
            // Rule: HIT if |inputTime - adjustedNoteTime| <= hitWindow (implied logic via closest search)
            const offset = adjustedNoteTime - inputTime; // positive if early, negative if late
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
              
              // NEW: Update session average offset
              totalSessionOffsetSumRef.current += bestOffset;
              totalSessionHitCountForOffsetRef.current += 1;
              const newAvg = totalSessionOffsetSumRef.current / totalSessionHitCountForOffsetRef.current;
              setUserAverageOffset(newAvg);

              hitNoteIdsRef.current.add(best.noteId);
              satisfyUpcomingNote(best);
            }
          } else {
            // min > goodWindow - Check if it's within 500ms for a 'miss' judgment or just an error
            if (min <= 500) {
              if (!hitNoteIdsRef.current.has(best.noteId)) {
                setMissCount((p) => p + 1);
                missCountRef.current += 1;
                setLastHitOffset(bestOffset);
                
                // NEW: Update session average offset (even for misses that were within 500ms)
                totalSessionOffsetSumRef.current += bestOffset;
                totalSessionHitCountForOffsetRef.current += 1;
                const newAvg = totalSessionOffsetSumRef.current / totalSessionHitCountForOffsetRef.current;
                setUserAverageOffset(newAvg);

                setCombo(0);
                comboRef.current = 0;
                setLastJudgment("miss");
                lastJudgmentRef.current = "miss";
                hitNoteIdsRef.current.add(best.noteId);
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
      if (isSustainPedalActive) sustainedByPedalKeysRef.current.set(k, m);
      else stopSustainedSound(k, m);
      if (isFreePlayMode) handleFreePlayKeyRelease(m);
    },
    [
      stopSustainedSound,
      isFreePlayMode,
      handleFreePlayKeyRelease,
      isSustainPedalActive,
    ],
  );

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
      fileRef.current = f;
      setIsLoadingFile(true);
      handleStopPlayback();
      setPlaybackNotes([]);
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
        let res: any;
        if (f.type === "application/json") {
          const text = await f.text();
          res = JSON.parse(text);
          setCurrentFileType(FileType.UNKNOWN);
        } else if (ext === "mid" || ext === "midi")
          res = await parseMidiData(await f.arrayBuffer(), midiNoteToNameMap);
        else if (ext === "xml" || ext === "musicxml")
          res = await parseMusicXmlData(await f.text(), midiNoteToNameMap);
        else if (ext === "mxl") {
          const zip = await new JSZip().loadAsync(await f.arrayBuffer());
          let xml = await zip.file("META-INF/container.xml")?.async("string");
          if (xml) {
            const p = new DOMParser().parseFromString(xml, "application/xml");
            const path = p
              .getElementsByTagName("rootfile")[0]
              ?.getAttribute("full-path");
            if (path) xml = await zip.file(path)?.async("string");
          }
          if (!xml) {
            for (const obj of Object.values(zip.files)) {
              const z = obj as JSZipObject;
              if (
                !z.dir &&
                (z.name.endsWith(".xml") || z.name.endsWith(".musicxml"))
              ) {
                xml = await z.async("string");
                break;
              }
            }
          }
          if (!xml) throw new Error();
          res = await parseMusicXmlData(xml, midiNoteToNameMap);
        } else throw new Error();
        const notesWithF = assignFingering(res.notes);
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
        console.error(e);
        alert("Error processing file.");
      } finally {
        setIsLoadingFile(false);
        setSelectedOnlineSongIdForNavigation(null);
      }
    },
    [handleStopPlayback, preloadSamplesForSong, midiNoteToNameMap],
  );

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

      // Prime YouTube player if it exists
      if (
        youtubePlayerRef.current &&
        typeof youtubePlayerRef.current.playVideo === "function"
      ) {
        try {
          youtubePlayerRef.current.playVideo();
          setTimeout(() => {
            try {
              youtubePlayerRef.current.pauseVideo();
            } catch (e) {}
          }, 200);
        } catch (e) {}
      }

      // Prime MP3 audio if it exists
      if (audioRef.current) {
        try {
          const p = audioRef.current.play();
          if (p instanceof Promise) {
            p.then(() => {
              setTimeout(() => {
                audioRef.current?.pause();
              }, 200);
            }).catch(() => {});
          }
        } catch (e) {}
      }

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
      const gameplayStyle = viewMode === "sheet-qwerty" ? "computer" : "piano";
      if (gameplayStyle === "computer") return;

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
        if (isSustainPedalActive)
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
      isSustainPedalActive,
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
    const ai = selectedMidiInputId ? midiInputs.get(selectedMidiInputId) : null;
    if (activeMidiInputDeviceRef.current)
      activeMidiInputDeviceRef.current.onmidimessage = null;
    if (ai) {
      ai.onmidimessage = handleMidiMessage;
      activeMidiInputDeviceRef.current = ai;
    }
    return () => {
      if (activeMidiInputDeviceRef.current)
        activeMidiInputDeviceRef.current.onmidimessage = null;
    };
  }, [selectedMidiInputId, midiInputs, handleMidiMessage]);

  const activeMidiNotesInfoForKeyboard = useMemo(() => {
    const notePerKey = new Map<string, ActiveMidiNoteInfo>();
    if (isFreePlayMode) return notePerKey;
    for (const info of activePlaybackNotesInfo.values())
      if (info.status === "user_played") notePerKey.set(info.name, info);
    for (const n of notesForGame)
      if (
        musicalCurrentTimeMs >= n.timeMs &&
        musicalCurrentTimeMs <
          n.timeMs + Math.min(n.durationMs, VISUAL_NOTE_CAP_MS)
      )
        if (!notePerKey.has(n.name))
          notePerKey.set(n.name, {
            ...n,
            status: activePlaybackNotesInfo.get(n.noteId)?.status || "playing",
          });
    return notePerKey;
  }, [
    activePlaybackNotesInfo,
    musicalCurrentTimeMs,
    notesForGame,
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

      // Drum Mode Non-MIDI restriction: If in drum mode and input mode is midi, ignore keyboard
      if (instrumentMode === "drum" && drumInputMode === "midi") return;

      const gameplayStyle = viewMode === "sheet-qwerty" ? "computer" : "piano";
      if (gameplayStyle === "piano" && instrumentMode !== "drum") return;

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

      const gameplayStyle = viewMode === "sheet-qwerty" ? "computer" : "piano";
      if (gameplayStyle === "piano" && instrumentMode !== "drum") return;

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
        try {
          const currentMode = "retical";

          // Check if instrument_mode column exists
          const { data: testData, error: testError } = await supabase
            .from("scores")
            .select("instrument_mode")
            .limit(1);
          const hasInstrumentMode = !testError || testError.code !== "42703";

          let query = supabase
            .from("scores")
            .select("final_score")
            .eq("user_id", session.user.id)
            .eq("song_id", currentOnlineSongId);
          if (hasInstrumentMode) {
            query = query.eq(
              "instrument_mode",
              performanceSummary.instrumentMode,
            );
          }
          const { data: b } = await query
            .order("final_score", { ascending: false })
            .limit(1);

          if (performanceSummary.finalScore > (b?.[0]?.final_score ?? -1)) {
            let delQuery = supabase
              .from("scores")
              .delete()
              .eq("user_id", session.user.id)
              .eq("song_id", currentOnlineSongId);
            if (hasInstrumentMode) {
              delQuery = delQuery.eq(
                "instrument_mode",
                performanceSummary.instrumentMode,
              );
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
    if (activeMidiInputDeviceRef.current) {
      activeMidiInputDeviceRef.current.onmidimessage = handleMidiMessage;
    }
  }, [handleMidiMessage]);

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
        showOnlyMajorNotes,
        tempoEvents,
        playbackTempoMultiplier,
        viewMode === "sheet-roll" || viewMode === "sheet-qwerty",
        instrumentMode,
      );
    } catch (e) {
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

  const handleExitSettingsPreview = useCallback(() => {
    if (!isSettingsPreviewActiveRef.current) return;
    handleStopPlayback();
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
    setIsTopBarVisible(true);
    setGameSettings({
      waitMode: "off",
      practiceHand: "both",
      playbackTempoMultiplier: 1,
      zoomDirection,
      drumTyperPadOpacity,
    });
    setIsLoadingFile(true);
    try {
      const response = await fetch("/sounds/test.mid");
      if (!response.ok) throw new Error("Failed to fetch preview MIDI");
      const blob = await response.blob();
      const file = new File([blob], "Settings Preview.mid", {
        type: "audio/midi",
      });
      const res = await parseMidiData(
        await file.arrayBuffer(),
        midiNoteToNameMap,
      );
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
      handleExitSettingsPreview();
    } finally {
      setIsLoadingFile(false);
    }
  }, [
    currentFileName,
    midiNoteToNameMap,
    preloadSamplesForSong,
    handleExitSettingsPreview,
  ]);

  const prevScreenRef = useRef<Screen | undefined>(undefined);
  useEffect(() => {
    const previousScreen = prevScreenRef.current;
    if (previousScreen === "settings" && currentScreen !== "settings")
      handleExitSettingsPreview();
    else if (currentScreen === "settings" && previousScreen !== "settings")
      handleEnterSettingsPreview();
    prevScreenRef.current = currentScreen;
  }, [currentScreen, handleEnterSettingsPreview, handleExitSettingsPreview]);
  useEffect(() => {
    if (
      isSettingsPreviewActiveRef.current &&
      playbackNotes.length > 0 &&
      !isPlayingRef.current
    )
      handlePlay();
  }, [playbackNotes, handlePlay]);
  const handleExitGame = useCallback(() => {
    const wasInFreePlay = isFreePlayModeRef.current;
    handleStopPlayback(true, false); // exitFreePlay: true, shouldRewind: false

    // Reset loop state
    setIsLooping(false);
    setLoopStartMs(0);
    setLoopEndMs(0);

    // Reset practice mode tolerance to default
    setGameSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        noteToleranceMs: instrumentMode === "piano" ? 200 : 100,
      };
    });

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
  const handleToggleLoop = useCallback(() => setIsLooping((p) => !p), []);
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
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        /* FIX: Removed redundant 'mediaDevices' property */ const devices =
          await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((device) => device.kind === "audioinput");
        setAudioInputs(inputs);
        if (inputs.length > 0 && !selectedAudioInputId)
          setSelectedAudioInputId(inputs[0].deviceId);
        if (inputs.length === 0) setIsAudioInputEnabled(false);
      } catch (err) {
        setIsAudioInputEnabled(false);
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: deviceId },
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            channelCount: 2, // Request stereo for dual-channel processing
          },
        });
        audioStreamRef.current = stream;
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext({ sampleRate: 44100 });
        audioContextForInputRef.current = context;
        const source = context.createMediaStreamSource(stream);
        audioSourceRef.current = source;

        // Create channel splitter for dual-channel processing
        const splitter = context.createChannelSplitter(2);
        source.connect(splitter);

        const analysers: AnalyserNode[] = [];
        const numChannels =
          stream.getAudioTracks()[0].getSettings().channelCount || 1;

        // Create an analyser for each channel (up to 2)
        for (let i = 0; i < Math.min(numChannels, 2); i++) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 16384;
          analyser.smoothingTimeConstant = 0.05;
          splitter.connect(analyser, i);
          analysers.push(analyser);
        }

        // Fallback if only 1 channel is available
        if (analysers.length === 0) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 16384;
          analyser.smoothingTimeConstant = 0.05;
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
  const fallingNotesBackgroundColor =
    bgOpacity === 0
      ? "#000000"
      : isImageActive
        ? "transparent"
        : themeSettings.fallingNotesBackgroundColor;

  return (
    <div
      ref={appRootRef}
      onClick={async (e) => {
        const isInteractionNeeded = await initializeAudioContext();
        if (currentScreen === "inGame" || currentScreen === "midiEditor") {
          if (isPlayingRef.current && isInteractionNeeded) {
            if (audioRef.current && audioRef.current.paused)
              safePlayAudio(true);
            if (youtubePlayerRef.current) safePlayYoutube(true);
          }
          return;
        } // Skip click sounds in editor
        let t = e.target as HTMLElement | null,
          isI = false;
        while (t && t !== appRootRef.current) {
          if (
            t.matches(
              'button, a, [role="button"], input, select, textarea, label',
            ) ||
            window.getComputedStyle(t).cursor === "pointer"
          ) {
            isI = true;
            break;
          }
          t = t.parentElement;
        }
        if (!isI || !(await initializeAudioContext())) return;
        const now = performance.now();
        if (now - lastUiClickTimeRef.current > 500)
          uiClickComboIndexRef.current = 0;
        playSound(
          UI_CLICK_SOUND_SEQUENCE_MIDI[uiClickComboIndexRef.current],
          INTERACTIVE_NOTE_DURATION_MS,
          0.4,
        );
        uiClickComboIndexRef.current =
          (uiClickComboIndexRef.current + 1) %
          UI_CLICK_SOUND_SEQUENCE_MIDI.length;
        lastUiClickTimeRef.current = now;
      }}
      className="text-white min-h-screen flex flex-col font-sans"
      style={{
        width: `${inverseZoomScale}%`,
        height: `${inverseZoomScale}%`,
        transform: `scale(${zoomScale})`,
        transformOrigin: "top left",
        position: "absolute",
        overflow: "auto",
        minHeight: "unset",
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
            ref={audioRef}
            src={gameSettings.backingTrack.url}
            preload="auto"
            onPlay={() => {
              if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
            }}
            onPlaying={() => {
              if (backingTrackStatus !== 'playing') setBackingTrackStatus('playing');
            }}
            onWaiting={() => {
              if (backingTrackStatus !== 'stalled') setBackingTrackStatus('stalled');
            }}
            onStalled={() => {
              if (backingTrackStatus !== 'stalled') setBackingTrackStatus('stalled');
            }}
            onPause={() => {
               // Only set to idle if the game is also paused or we are in wait state
               if (!isPlayingRef.current) setBackingTrackStatus('idle');
            }}
            onError={() => {
              setBackingTrackStatus('error');
            }}
          />
        )}
      <div ref={youtubeContainerRef} className="hidden" />
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
                      onCycleMetronomeMode={() =>
                        setMetronomeMode((p) =>
                          p === "off" ? "beat" : p === "beat" ? "bar" : "off",
                        )
                      }
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
                  className="flex flex-col justify-end"
                  style={{
                    width: `${baseCalculatedPianoWidth}px`,
                    height: "100%",
                  }}
                >
                  <div className="relative flex-grow w-full">
                    {instrumentMode === "drum" && viewMode === "falling" ? (
                      <DrumView
                        currentTimeMs={musicalCurrentTimeMs}
                        playbackData={notesForGame}
                        activePlaybackNotes={activePlaybackNotesInfo}
                        userActiveKeys={userActiveMidiNotes}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        drumInputMode={drumInputMode}
                        themeSettings={themeSettings}
                        zoomDirection={zoomDirection}
                        zoomScale={zoomScale}
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                        drumTyperPadOpacity={drumTyperPadOpacity}
                      />
                    ) : instrumentMode === "drum" &&
                      viewMode === "drum_mania" ? (
                      <DrumManiaView
                        currentTimeMs={musicalCurrentTimeMs}
                        playbackData={notesForGame}
                        activePlaybackNotes={activePlaybackNotesInfo}
                        userActiveKeys={userActiveMidiNotes}
                        noteSpeedMultiplier={noteSpeedMultiplier}
                        drumInputMode={drumInputMode}
                        themeSettings={themeSettings}
                        zoomScale={zoomScale}
                        barLines={barLines}
                        pixelsPerMillisecond={
                          BASE_PIXELS_PER_MILLISECOND * noteSpeedMultiplier * zoomScale * 2
                        }
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                      />
                    ) : viewMode === "falling" ? (
                      <FallingNotesArea
                        key={`falling-${viewMode}`}
                        notes={notesForFallingView}
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
                        showOnlyMajorNotes={showOnlyMajorNotes}
                        showPianoTilesBackground={showPianoTilesBackground}
                        pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        isPaused={!isPlaying}
                        onSeek={handleSeek}
                      />
                    ) : (viewMode === "sheet-roll" ||
                        viewMode === "sheet-qwerty") &&
                      vexFlowData ? (
                      <HorizontalNotesView
                        currentTimeMs={musicalCurrentTimeMs}
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
                        qwertyLayout={qwertyLayout}
                        qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                        mirpTranspose={mirpTranspose}
                        isQwertyView={viewMode === "sheet-qwerty"}
                        instrumentMode={instrumentMode}
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
                        backgroundColor={sheetMusicBackgroundColor}
                        instrumentMode={instrumentMode}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <p className="text-slate-400 animate-pulse">
                          Loading preview...
                        </p>
                      </div>
                    )}
                  </div>
                  <div
                    className="relative flex-shrink-0"
                    style={{
                      width: "100%",
                      height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px`,
                      display: instrumentMode === "drum" ? "none" : "block",
                    }}
                  >
                    <PianoKeyboard
                      keyPositions={Array.from(keyPositionsMap.values())}
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
          </div>
        )}
      {currentScreen === "mainMenu" && (
        <MainMenu
          onPlay={() => setCurrentScreen("songSelection")}
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
        />
      )}
      {currentScreen === "modeSelection" && (
          <ModeSelection
            onStartGame={handleStartGame}
            onBack={() => setCurrentScreen("songSelection")}
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
          />
      )}
      {currentScreen === "settings" && (
        <div
          className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-40 p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setCurrentScreen("mainMenu")
          }
        >
          <Settings
            onBack={() => setCurrentScreen("mainMenu")}
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
            uiZoomAuto={uiZoomAuto}
            onUiZoomAutoChange={setUiZoomAuto}
            mp3Volume={mp3Volume}
            onMp3VolumeChange={setMp3Volume}
            drumTyperPadOpacity={drumTyperPadOpacity}
            onDrumTyperPadOpacityChange={setDrumTyperPadOpacity}
            drumInputMode={drumInputMode}
            onDrumInputModeChange={setDrumInputMode}
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
          />
        </div>
      )}
      {currentScreen === "about" && (
        <AboutUs onBack={() => setCurrentScreen("mainMenu")} />
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
        <ContactPage onBack={() => setCurrentScreen("mainMenu")} />
      )}
      {currentScreen === "privacy" && (
        <PrivacyPolicy onBack={() => setCurrentScreen("mainMenu")} />
      )}
      {currentScreen === "disclaimer" && (
        <Disclaimer onBack={() => setCurrentScreen("mainMenu")} />
      )}
      {currentScreen === "howToConnect" && (
        <HowToConnect onBack={() => setCurrentScreen("mainMenu")} />
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
      {currentScreen === "inGame" && (
        <div className="flex-grow relative overflow-hidden">
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
              {isPlaying && 
               gameSettings?.backingTrack?.type !== 'none' && 
               !isBackingTrackOverlayDismissed && 
               (backingTrackStatus === 'error' || backingTrackStatus === 'stalled' || (backingTrackStatus === 'loading' && musicalCurrentTimeMs > INITIAL_PLAYBACK_DELAY_MS + 200)) && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, y: -20, x: "-50%" }}
                  onClick={() => {
                    // Manual Unblock Action
                    if (gameSettings.backingTrack.type === 'youtube') safePlayYoutube();
                    else if (audioRef.current) safePlayAudio();
                    setIsBackingTrackOverlayDismissed(true); // Hide it after attempt
                  }}
                  className={`absolute top-[80px] left-1/2 z-[70] bg-slate-900/95 border border-cyan-500/30 rounded-full px-5 py-2 flex items-center gap-3 backdrop-blur-md shadow-2xl pointer-events-auto cursor-pointer hover:bg-slate-800 transition-colors`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                    backingTrackStatus === 'error' ? 'border-red-500 bg-red-500/20' : 
                    backingTrackStatus === 'stalled' ? 'border-amber-500/20 border-t-amber-500 animate-spin' : 
                    'border-cyan-500/20 border-t-cyan-500 animate-spin'
                  }`} />
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none ${
                        backingTrackStatus === 'error' ? 'text-red-400' : 
                        (backingTrackStatus === 'stalled' || backingTrackStatus === 'loading') ? 'text-amber-400' : 'text-cyan-400'
                    }`}>
                      BACKING TRACK LOADING
                    </span>
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight">
                      Try to pause or restart
                    </span>
                  </div>
                  {(
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBackingTrackOverlayDismissed(true);
                      }}
                      className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white pointer-events-auto"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
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
                />
              );
            })()}
            </div>
          </div>
          {backingTrackError && (
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
                className="flex flex-col justify-end"
                style={{
                  width: `${baseCalculatedPianoWidth}px`,
                  height: "100%",
                }}
              >
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
                        onSeek={() => {}}
                        showPianoTilesBackground={showPianoTilesBackground}
                        pianoTilesOpacity={themeSettings.pianoTilesOpacity}
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
                      onSeek={() => {}}
                      drumTyperPadOpacity={drumTyperPadOpacity}
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
                      />
                    </div>
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
                    />
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
                    />
                  ) : viewMode === "falling" ? (
                    <FallingNotesArea
                      key={`falling-freeplay-${viewMode}`}
                      notes={notesForFallingView}
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
                      showOnlyMajorNotes={showOnlyMajorNotes}
                      showPianoTilesBackground={showPianoTilesBackground}
                      pianoTilesOpacity={themeSettings.pianoTilesOpacity}
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      isPaused={!isPlaying}
                      onSeek={handleSeek}
                    />
                  ) : (viewMode === "sheet-roll" ||
                      viewMode === "sheet-qwerty") &&
                    vexFlowData ? (
                    <HorizontalNotesView
                      currentTimeMs={musicalCurrentTimeMs}
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
                      qwertyLayout={qwertyLayout}
                      qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                      mirpTranspose={mirpTranspose}
                      isQwertyView={viewMode === "sheet-qwerty"}
                      instrumentMode={instrumentMode}
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
                      backgroundColor={sheetMusicBackgroundColor}
                      instrumentMode={instrumentMode}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                      <p className="text-slate-400 animate-pulse">
                        Loading music...
                      </p>
                    </div>
                  )}
                </div>
                <div
                  className="relative flex-shrink-0"
                  style={{
                    width: "100%",
                    height: `${layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight}px`,
                    display: instrumentMode === "drum" ? "none" : "block",
                  }}
                >
                  <PianoKeyboard
                    keyPositions={Array.from(keyPositionsMap.values())}
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
                    <span>{isPreloading ? "Downloading Backing Track..." : "Loading Game..."}</span>
                    {isPreloading && (
                      <span className="text-xs text-slate-400 font-normal mt-1 max-w-xs leading-relaxed">
                        Downloading YouTube audio to browser memory for 100% latency-free offline gameplay. Please wait...
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
            onClose={() => {
              handleStopPlayback();
              uploadSessionStats();
              setPerformanceSummary(null);
            }}
          />
          <GameOverModal
            isVisible={!!isGameOver}
            reason={gameOverReason}
            onClose={handleCloseGameOverModal}
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
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;