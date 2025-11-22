// ========================================
// PIANO KEY & VISUAL DATA TYPES (v8.9)
// ========================================

export type PianoKeyType = 'white' | 'black';

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

export type MetronomeMode = 'off' | 'beat' | 'bar';
export type WaitMode = 'off' | 'strict' | 'rhythm' | 'retical';
export type ViewMode = 'falling' | 'sheet';
export type Screen =
  | 'mainMenu'
  | 'songSelection'
  | 'modeSelection'
  | 'settings'
  | 'inGame';
export type PracticeHand = 'left' | 'right' | 'both';
export type NoteLabelType = 'none' | 'fingering' | 'noteName';

export interface GameSettings {
  waitMode: WaitMode;
  playbackTempoMultiplier: number;
  practiceHand: PracticeHand;
  hideBarNavigationButtons?: boolean;
}

export interface ThemeSettings {
  rightHandColor: string;
  leftHandColor: string;
  fallingNotesBackgroundColor: string;
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
}

// ========================================
// MUSIC METADATA
// ========================================

export interface TimeSignatureInfo {
  numerator: number;
  denominator: number;
}

export enum FileType {
  MIDI = 'midi',
  MUSICXML = 'musicxml',
  UNKNOWN = 'unknown',
}

// ========================================
// VEXFLOW RENDER TYPES
// ========================================

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
  starts8vbLH: boolean;
  ends8vbLH: boolean;
  is8vaActiveRH: boolean;
  is8vbActiveLH: boolean;
  effectiveTimeSignature: TimeSignatureInfo; // ADDED
  hasDottedBeamableNotes: boolean; // ADDED
}

export interface OctaveLineInfo {
  type: '8va' | '8vb';
  hand: 'right' | 'left';
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export interface VexFlowRenderData {
  measures: VexFlowMeasureData[];
  octaveLines: OctaveLineInfo[];
  topStaveYOffset: number;
  fragments: NoteFragment[];
  noteIdToFragmentsMap: Map<string, NoteFragment[]>;
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
    arpJumpLarge: number;
    arpJumpWeight: number;
    arpZigzagWeight: number;
    arpSpeedWeight: number;
    arpRangeWeight: number;
    arpJumpZigzagWeight: number;
    arpConsistencyWeight: number;
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
    /** Kompleksitas pola permainan (interval & ritmik) */
    patternComplexity: number;
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
    /** Power gabungan chord × speed */
    chordPower: number;
    /** Indeks kekuatan chord (0–1) */
    chordPowerIndex: number;
    /** Bonus efek chord power dinamis */
    chordPowerBonus?: number;
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