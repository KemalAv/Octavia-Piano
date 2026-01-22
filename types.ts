
import { Session, User } from '@supabase/supabase-js';

// ========================================
// PIANO KEY & VISUAL DATA TYPES (v8.9)
// ========================================

export type PianoKeyType = 'white' | 'black';

// @FIX: Add 'phone' and 'custom' to DevicePreset to match options in the UI and fix type comparison errors.
export type DevicePreset = 'desktop' | 'tablet' | 'phone' | 'custom';

export type QwertyLayout = 'default' | 'mirp'; // NEW: Added layout option

export interface LayoutDimensions {
  whiteKeyHeight: number;
  blackKeyHeight: number;
  keyLabelHeight: number;
  minWhiteKeyWidth: number;
}

export interface PianoKeyDefinition {
  name: string;
  displayName: string;
  type: PianoKeyType;
  midiNote: number;
  id: string;
}

export interface KeyPosition {
  x: number;
  width: number;
  type: PianoKeyType;
  name: string;
}

// ========================================
// QWERTY MINI KEYBOARD MAPPING
// ========================================

export interface QwertyKeyMapEntry {
  qwertyKey: string;
  midiBase: number;
}

// NEW: MIRP Layout Entry
export interface MirpKeyMapEntry {
  code: string;
  shift: boolean;
  midi: number;
  label: string;
}

// ========================================
// NOTE DATA STRUCTURES
// ========================================

export interface MidiNotePlaybackItem {
  noteId: string;
  midi: number;
  timeMs: number;
  durationMs: number;
  name: string;
  pitchClass: string;
  velocity: number;
  hand: 'left' | 'right';
  originalTrackSourceInfo: string;
  finger?: 1 | 2 | 3 | 4 | 5;
  ticks?: number;
  durationTicks?: number;
  isRepeatStart?: boolean;
  isRepeatEnd?: boolean;
}

/**
 * Represents a note being played in Free Play mode for visual rendering.
 */
export interface FreePlayLiveNote {
  id: string;
  midi: number;
  name: string;
  startTime: number;
  endTime: number | null;
  pitchClass: string;
  hand: 'left' | 'right';
}

/**
 * Represents a segment of a MidiNotePlaybackItem for rendering purposes,
 * particularly for VexFlow where notes are clipped to measure boundaries.
 * For highlighting, it still refers to the original full note.
 */
export interface NoteFragment extends MidiNotePlaybackItem {
  fragmentId: string;
  originalNoteId: string;
}

export interface ActiveMidiNoteInfo {
  noteId: string;
  name: string;
  timeMs: number;
  midi: number;
  pitchClass: string;
  status: 'playing' | 'waiting' | 'user_played';
  hand?: 'left' | 'right';
  finger?: 1 | 2 | 3 | 4 | 5;
}

// ========================================
// WEB MIDI API TYPES
// ========================================

export interface MIDIMessageEvent extends Event {
  data: Uint8Array;
  receivedTime: number;
}

export type MIDIInputMap = Map<string, MIDIInput>;
export type MIDIOutputMap = Map<string, MIDIOutput>;

export interface MIDIPort extends EventTarget {
  id: string;
  manufacturer?: string;
  name?: string;
  type: 'input' | 'output';
  version?: string;
  state: 'disconnected' | 'connected';
  connection: 'open' | 'closed' | 'pending';
  onstatechange: ((event: MIDIConnectionEvent) => void) | null;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

export interface MIDIInput extends MIDIPort {
  type: 'input';
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

export interface MIDIOutput extends MIDIPort {
  type: 'output';
  send(data: number[] | Uint8Array, timestamp?: number): void;
  clear(): void;
}

export interface MIDIConnectionEvent extends Event {
  port: MIDIPort;
}

export interface MIDIAccess extends EventTarget {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  sysexEnabled: boolean;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null;
}

declare global {
  interface Navigator {
    requestMIDIAccess(options?: { sysex: boolean }): Promise<MIDIAccess>;
  }
}

// ========================================
// APP SETTINGS & UI
// ========================================

export type MidiAccessStatus =
  | 'uninitialized'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type MetronomeMode = 'off' | 'beat' | 'bar'; // UPDATED: Added 'beat' mode
// @FIX: 'lenient' and 'strict' modes are merged into a single practice mode with adjustable tolerance.
export type WaitMode = 'off' | 'strict' | 'rhythm' | 'retical';
export type ViewMode = 'falling' | 'sheet' | 'sheet-roll' | 'sheet-qwerty';
export type Screen =
  | 'mainMenu'
  | 'songSelection'
  | 'modeSelection'
  | 'settings'
  | 'inGame'
  | 'finetune'
  | 'leaderboard'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'disclaimer'
  | 'midiEditor'; // NEW: Added midiEditor
  
export type PracticeHand = 'left' | 'right' | 'both';
export type NoteLabelType = 'none' | 'fingering' | 'noteName' | 'qwerty';

export interface MicThresholds {
    subBass: number;
    bass: number;
    mid: number;
    treble: number;
    highTreble: number;
}

export interface BackingTrackConfig {
  type: 'none' | 'mp3';
  url?: string; // Blob URL for MP3
  offsetMs: number;
}

export interface GameSettings {
  waitMode: WaitMode;
  playbackTempoMultiplier: number;
  practiceHand: PracticeHand;
  hideBarNavigationButtons?: boolean;
  noteToleranceMs?: number;
  isNonStop?: boolean;
  backingTrack?: BackingTrackConfig; // NEW: Backing track configuration
}

export interface ThemeSettings {
  rightHandColor: string;
  leftHandColor: string;
  fallingNotesBackgroundColor: string;
  backgroundUrl?: string;
  backgroundOpacity?: number;
}

export interface MetronomeAudioNode {
  oscillator?: OscillatorNode;
  source?: AudioBufferSourceNode;
  gainNode: GainNode;
}

export interface PerformanceSummary {
  accuracy: number;
  speed: number;
  gameplayPercentage: number;
  baseMidiScore: number;
  finalScore: number;
  rank: string;
  hitCount: number;
  errorCount: number;
  totalNoteCount: number;
  playbackTempoMultiplier: number;
  totalWaitTimeMs: number;
  gameplayStyle?: 'piano' | 'computer';
}

// FIX: Add UserSession type for Supabase integration.
export interface UserSession {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

// @FIX: Add Score interface for Supabase integration, used in AccountModal and LeaderboardModal.
export interface Score {
  id: string;
  created_at: string;
  user_id: string;
  song_id: string;
  final_score: number;
  accuracy: number;
  speed: number;
  rank: string;
  notes_hit: number;
  errors: number;
  total_notes: number;
  mode: string;
  tempo_multiplier?: number;
  total_wait_time_ms?: number;
  gameplay_style?: 'piano' | 'computer';
  // FIX: Add 'artist' to songs object to match Supabase query in AccountModal.tsx.
  songs?: { title: string; artist: string; } | null;
  profiles?: { username: string; avatar_url: string | null; created_at: string | null; } | null; // Added avatar_url and created_at
}

// NEW: Profile interface for viewing other users' profiles
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string | null; // When the profile record was created (proxy for join date)
  last_nickname_change?: string | null;
  bio?: string | null;
  total_playtime_ms?: number;
  total_notes_hit?: number;
}

// @FIX: Add UserLike interface for Supabase integration to resolve import error in OnlineSongBrowser.
export interface UserLike {
  id: number;
  created_at: string;
  user_id: string;
  song_id: string;
  like_type: 1 | -1;
}

// FIX: Add OnlineSong type for Supabase integration.
export interface OnlineSong {
  id: string;
  created_at: string;
  title: string;
  artist: string;
  arranger?: string;
  description?: string;
  file_path: string;
  uploader_id: string;
  difficulty_level: number | null;
  performance_score: number | null;
  total_notes: number | null;
  duration_sec: number | null;
  total_nps: number | null;
  is_ranked: boolean; // NEW: Added is_ranked property
  // @FIX: Add optional like_count and dislike_count to resolve property access errors in OnlineSongBrowser.
  like_count?: number;
  dislike_count?: number;
  midi_link?: string;
  midi_offset?: number;
}

export interface FriendWithProfile {
    user_id: string;
    friend_id: string;
    created_at: string;
    friend_profile: Profile; // Updated to match the alias `friend_profile` in the Supabase query
}

export interface LeaderboardEntry {
    user_id: string;
    username: string;
    avatar_url: string | null;
    total_score: number;
}

// ========================================
// MUSIC METADATA
// ========================================

// FIX: Add TempoEvent type for tracking tempo changes.
export interface TempoEvent {
  timeMs: number;
  bpm: number;
}

export interface TimeSignatureInfo {
  numerator: number;
  denominator: number;
}

// FIX: Corrected FileType enum to include UNKNOWN and proper values
export enum FileType {
  MIDI = 'midi',
  MUSICXML = 'musicxml',
  UNKNOWN = 'unknown',
}

// NEW: Interface for calculated beat times
export interface BeatInfo {
  timeMs: number;
  isStrong: boolean;
}

// ========================================
// VEXFLOW RENDER TYPES
// ========================================

// FIX: Add TempoMarkingInfo type for displaying tempo on sheet music.
export interface TempoMarkingInfo {
  bpm: number;
  x: number;
  y: number;
}

export interface VexFlowNoteInfo {
  vexNoteId: string;
  hand: 'left' | 'right';
  vexNote: {
    keys: string[];
    duration: string;
    dots: number;
    clef: 'treble' | 'bass';
  };
  midiValue: number;
  accidentals?: { index: number; type: string }[];
  fragmentMapping?: { fragmentId: string; keyIndex: number }[];
  // FIX: Added missing properties for tie rendering logic.
  originalNoteIds?: string[];
  isTieStart?: boolean[];
  isTieEnd?: boolean[];
  // NEW: Add timing info for scrolling views
  timeMs?: number;
  durationMs?: number;
  originalNotes?: NoteFragment[]; // For rendering chords in sheet-roll
  vexNoteYPositions?: number[];
  vexNoteKeyProps?: { line: number }[];
  isTriplet?: boolean; // NEW: Flag for triplet notes
}

// NEW: Interface for tuplet grouping
export interface VexFlowTupletGroup {
  hand: 'left' | 'right';
  indices: number[]; // Indices into the measure's hand array (rightHand/leftHand)
}

export interface VexFlowMeasureData {
  rightHand: VexFlowNoteInfo[];
  leftHand: VexFlowNoteInfo[];
  startTimeMs: number;
  endTimeMs: number;
  width: number;
  durationMs: number;
  keySignature?: string;
  startsRepeat?: boolean;
  endsRepeat?: boolean;
  newKeySignature?: string;
  newTimeSignature?: TimeSignatureInfo;
  activeKeySignature: string;
  effectiveClefRH: 'treble' | 'bass';
  effectiveClefLH: 'treble' | 'bass';
  newClefRH?: 'treble' | 'bass';
  newClefLH?: 'treble' | 'bass';
  starts8vaRH: boolean;
  ends8vaRH: boolean;
  starts15maRH: boolean; // NEW: 15ma support
  ends15maRH: boolean;   // NEW: 15ma support
  starts8vbLH: boolean;
  ends8vbLH: boolean;
  starts15mbLH: boolean; // NEW: 15mb support
  ends15mbLH: boolean;   // NEW: 15mb support
  is8vaActiveRH: boolean; 
  is15maActiveRH: boolean; // NEW: 15ma support
  is8vbActiveLH: boolean;
  is15mbActiveLH: boolean; // NEW: 15mb support
  newTempoBpm?: number;
  effectiveTimeSignature: TimeSignatureInfo;
  hasDottedBeamableNotes: boolean;
  rightHandTuplets: VexFlowTupletGroup[]; // NEW
  leftHandTuplets: VexFlowTupletGroup[];  // NEW
}

export interface OctaveLineInfo {
  type: '8va' | '8vb' | '15ma' | '15mb'; // Updated
  hand: 'right' | 'left';
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export interface VexFlowRenderData {
  measures: VexFlowMeasureData[];
  octaveLines: OctaveLineInfo[];
  tempoMarkings: TempoMarkingInfo[];
  topStaveYOffset: number;
  fragments: NoteFragment[];
  noteIdToFragmentsMap: Map<string, NoteFragment[]>;
  keySignature: string;
  timeSignature: TimeSignatureInfo;
  verticalSpacing: number; // NEW: Pass vertical spacing information
}

// ========================================
// ANALYSIS RESULTS (v8.9 - Chord Power Buff Edition)
// ========================================

export interface AnalysisConfig {
    densityWindowMs: number;
    densityStepMs: number;
    densityMinNorm: number;
    densityMaxNorm: number;
    awkwardIntervalMin: number;
    awkwardIntervalMax: number;
    awkwardGapMin: number;
    awkwardGapMax: number;
    awkwardWeightMax: number;
    zigzagGapMin: number;
    zigzagGapMax: number;
    zigzagWeightMax: number;
    repetitionWindow: number;
    repetitionWeightMin: number;
    repetitionWeightMax: number;
    abstractnessWeightMax: number;
    timingVarianceMax: number;
    complexityAwkwardWeight: number;
    complexityZigzagWeight: number;
    complexityAbstractWeight: number;
    complexityTimingWeight: number;
    complexityFinalMin: number;
    complexityFinalMax: number;
    tightIntervalMax: number;
    tightIntervalDtMax: number;
    tightIntervalMinNorm: number;
    tightIntervalMaxNorm: number;
    chordMobilityMinInterval: number;
    chordMobilityMinNorm: number;
    chordMobilityMaxNorm: number;
    effortWindow: number;
    effortStep: number;
    effortNormMin: number;
    effortNormMax: number;
    effortConsistencyDiscount: number;
    rangeWindow: number;
    rangeStep: number;
    rangeNormMin: number;
    rangeNormMax: number;
    arpNpsMin: number;
    arpNpsMax: number;
    arpRangeMin: number;
    arpRangeMax: number;
    arpJumpSmall: number;
    arpJumpSmallWeight: number;
    arpJumpLarge: number;
    arpJumpLargeWeight: number;
    arpJumpWeight: number;
    arpZigzagWeight: number;
    arpSpeedWeight: number;
    arpRangeWeight: number;
    arpJumpZigzagWeight: number;
    arpConsistencyWeight: number;
    trillRatio: number;
    trillMaxInterval: number;
    trillMaxGap: number;
    trillNormMin: number;
    trillNormMax: number;
    npsNormMin: number;
    npsNormMax: number;
    weightSpeedNps: number;
    weightSpeedDensity: number;
    weightSpeedEffort: number;
    polyphonyNormMin: number;
    polyphonyNormMax: number;
    weightCompPolyphony: number;
    weightCompAbstract: number;
    weightCompInterval: number;
    weightCompChordMobility: number;
    weightCompRange: number;
    durationNormMin: number;
    durationNormMax: number;
    finalWeightSpeed: number;
    finalWeightComplexity: number;
    finalWeightArpeggio: number;
    penaltyRepetition: number;
    penaltyTrill: number;
    bonusStamina: number;
    expFactor: number;
    scale: number;
    base: number;
}

export interface AnalysisResult {
  /** Nilai kesulitan global (1–15, bisa >15 untuk ekstrem) */
  difficultyLevel: number;

  /** Skor performa eksponensial berbasis parameter gabungan */
  performanceScore: number;

  parameters: {
    /** Note density / kepadatan not per detik */
    density: number;
    /** Intensitas fisik dan stamina lokal */
    physicalEffort: number;
    /** Rentang nada aktif */
    rangeIntensity: number;
    /** Kompleksitas interval ketat / gerak jari cepat */
    chordMobility: number;
    /** Kecepatan arpeggio & keahlian */
    arpeggioVirtuosity: number;
    /** Pola trill atau tremolo */
    trillRatio: number;
    /** Stabilitas pola arpeggio */
    arpeggioRepetition: number;
    /** Note per second global */
    totalNps: number;
    /** Jumlah rata-rata nada simultan */
    polyphony: number;
    /** Tingkat kesulitan visual (1–15) */
    starLevel: number;
    /** Note density × polyphony */
    chordNps: number;
    /** Penalti repetitif */
    patternRepPenalty: number;
    /** Kompleksitas interval lokal */
    intervalComplexity?: number;
    /** Faktor stamina (durasi × effort) */
    staminaFactor?: number;
    /** Laju perpindahan chord cepat */
    chordMovementRate?: number;
    /** Puncak kepadatan lokal */
    peakDensity?: number;
  };
}

export interface ExtendedResult extends AnalysisResult {
  meta: {
    durationSec: number;
    totalNotes: number;
    highestNote: number;
    lowestNote: number;
    avgGapMs: number;
    gapVariance: number;
    irregularityIndex: number;
    tempoDeviation?: number;
    burstSections?: number;
    arpeggioRate?: number;
    peakSpeedNps?: number;
    avgVirtuosityIndex?: number;
  };
}
