import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  Accidental,
  Barline,
  Beam,
  ClefNote,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  StemmableNote,
  Voice,
  Tuplet,
  Fraction,
  FretHandFinger,
  Modifier,
  Annotation,
  StaveTie,
} from 'vexflow';
import {
  MidiNotePlaybackItem,
  TimeSignatureInfo,
  ActiveMidiNoteInfo,
  VexFlowMeasureData,
  VexFlowNoteInfo,
  TempoEvent,
  VexFlowTupletGroup,
  NoteLabelType,
} from '../types';
import { getVexFlowRenderData } from '../vexflow-helper';
import { getDynamicFromVelocity } from '../utils';

// Notation scaling factor to scale down bars & engraving slightly (diperkecil sedikit ~14%)
const NOTATION_SCALE = 0.86;

// Vertical spacing configuration:
// - TOP_STAVE_Y: 32 (room above for measure numbers and tempo)
// - VERTICAL_STAFF_SPACING: 94 (clean distance between treble and bass staves)
// - VIRTUAL_SYSTEM_HEIGHT: 280 (leaves ample space below line 4 of bass clef so low notes C1-C2,
//   ledger lines, down stems, and barlines are never cut off)
const TOP_STAVE_Y = 55; // Increased further to give more room for high RH fingering
const VERTICAL_STAFF_SPACING = 125; // Increased further to give room for LH fingering above bass staff
const VIRTUAL_SYSTEM_HEIGHT = 350; // Increased to accommodate more vertical space
const VIRTUAL_DRUM_SYSTEM_HEIGHT = 190;
const SYSTEM_SPACING = 16;
const DRUM_SYSTEM_SPACING = 38;
const SYSTEM_PADDING_X = 20;
const SHEET_TOP_PADDING_PX = 72; // Clearance to prevent sheet music bars from being covered by top HUD bar

const NATURAL_PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const KEY_ACCIDENTALS: Record<string, Record<string, string>> = {
  // Major keys
  'C': {},
  'G': { F: '#' },
  'D': { F: '#', C: '#' },
  'A': { F: '#', C: '#', G: '#' },
  'E': { F: '#', C: '#', G: '#', D: '#' },
  'B': { F: '#', C: '#', G: '#', D: '#', A: '#' },
  'F#': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#' },
  'C#': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#', B: '#' },
  'F': { B: 'b' },
  'Bb': { B: 'b', E: 'b' },
  'Eb': { B: 'b', E: 'b', A: 'b' },
  'Ab': { B: 'b', E: 'b', A: 'b', D: 'b' },
  'Db': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b' },
  'Gb': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b' },
  'Cb': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b', F: 'b' },
  // Minor keys
  'Am': {},
  'Em': { F: '#' },
  'Bm': { F: '#', C: '#' },
  'F#m': { F: '#', C: '#', G: '#' },
  'C#m': { F: '#', C: '#', G: '#', D: '#' },
  'G#m': { F: '#', C: '#', G: '#', D: '#', A: '#' },
  'D#m': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#' },
  'A#m': { F: '#', C: '#', G: '#', D: '#', A: '#', E: '#', B: '#' },
  'Dm': { B: 'b' },
  'Gm': { B: 'b', E: 'b' },
  'Cm': { B: 'b', E: 'b', A: 'b' },
  'Fm': { B: 'b', E: 'b', A: 'b', D: 'b' },
  'Bbm': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b' },
  'Ebm': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b' },
  'Abm': { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b', C: 'b', F: 'b' },
};

const getNoteNameForDisplay = (
  keyStr: string,
  idx: number,
  info: VexFlowNoteInfo,
  activeKey: string
): string => {
  const keyWithoutOctave = keyStr.split('/')[0];
  const baseLetter = keyWithoutOctave.charAt(0).toUpperCase();

  // If the key already has an explicit modifier (e.g. "c#", "eb")
  if (keyWithoutOctave.length > 1) {
    const rawAcc = keyWithoutOctave.slice(1);
    return `${baseLetter}${rawAcc}`;
  }

  // 1. Try to compute from original note MIDI pitch
  const orig = info.originalNotes?.[idx];
  const midi = orig?.midi ?? (info.vexNote.keys.length === 1 && info.midiValue >= 0 ? info.midiValue : undefined);

  if (midi !== undefined && NATURAL_PITCH_CLASS[baseLetter] !== undefined) {
    const naturalPitch = NATURAL_PITCH_CLASS[baseLetter];
    const actualPitch = ((midi % 12) + 12) % 12;
    const diff = (actualPitch - naturalPitch + 12) % 12;
    if (diff === 0) return baseLetter;
    if (diff === 1) return `${baseLetter}#`;
    if (diff === 2) return `${baseLetter}##`;
    if (diff === 11) return `${baseLetter}b`;
    if (diff === 10) return `${baseLetter}bb`;
  }

  // 2. Check explicit accidental attached to this note in VexFlow
  const explicitAcc = info.accidentals?.find(a => a && a.index === idx);
  if (explicitAcc && explicitAcc.type) {
    if (explicitAcc.type === '#') return `${baseLetter}#`;
    if (explicitAcc.type === 'b') return `${baseLetter}b`;
    if (explicitAcc.type === 'n') return baseLetter;
    if (explicitAcc.type === '##') return `${baseLetter}##`;
    if (explicitAcc.type === 'bb') return `${baseLetter}bb`;
  }

  // 3. Fall back to Key Signature accidental
  const keyAcc = KEY_ACCIDENTALS[activeKey]?.[baseLetter];
  if (keyAcc) {
    return `${baseLetter}${keyAcc}`;
  }

  return baseLetter;
};

interface Props {
  notes: MidiNotePlaybackItem[];
  timeSignature: TimeSignatureInfo;
  keySignature: string;
  initialTempoBpm: number;
  width: number;
  height: number;
  currentTimeMs: number;
  totalDurationMs: number;
  activePlaybackNotesInfo: Map<string, ActiveMidiNoteInfo>;
  onSeek: (timeMs: number) => void;
  isPlaying: boolean;
  sheetMusicZoom: number;
  barLines: number[];
  rightHandColor: string;
  leftHandColor: string;
  hitNoteColor: string;
  signatureEvents: { timeMs: number; key?: string; time?: TimeSignatureInfo }[];
  onLayoutRendered: (layoutId: number) => void;
  tempoEvents: TempoEvent[];
  playbackTempoMultiplier: number;
  backgroundColor?: string;
  notationColor?: string;
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
  resolutionScale?: number;
  noteLabelType?: NoteLabelType;
  showDynamics?: boolean;
  showOnlyMajorNotes?: boolean;
}

interface NotePosInfo {
  x: number;
  y: number;
  w: number;
  h: number;
  systemIndex: number;
  measureIndex: number;
  timeMs: number;
}

interface SystemMeasureLayout {
  measure: VexFlowMeasureData;
  globalIndex: number;
  systemIndex: number;
  x: number;
  width: number;
  isFirstInSystem: boolean;
  isLastInSystem: boolean;
  noteStartX: number;
}

interface SystemLayout {
  systemIndex: number;
  measures: SystemMeasureLayout[];
  width: number;
  height: number;
  virtualWidth: number;
  virtualHeight: number;
  startY: number;
  firstMeasureIndex: number;
  lastMeasureIndex: number;
  scale: number;
}

/**
 * Calculates lead width required for clefs, key signatures, and time signatures.
 */
function getSystemLeadWidth(
  isFirstSystem: boolean,
  keySignature: string,
  timeSignature?: TimeSignatureInfo,
  isTimeSigChange?: boolean
): number {
  let lead = 36; // Clef + initial left margin
  const keyAccidentals: Record<string, number> = {
    'C': 0, 'Am': 0,
    'G': 1, 'Em': 1, 'F': 1, 'Dm': 1,
    'D': 2, 'Bm': 2, 'Bb': 2, 'Gm': 2,
    'A': 3, 'F#m': 3, 'Eb': 3, 'Cm': 3,
    'E': 4, 'C#m': 4, 'Ab': 4, 'Fm': 4,
    'B': 5, 'G#m': 5, 'Db': 5, 'Bbm': 5,
    'F#': 6, 'D#m': 6, 'Gb': 6, 'Ebm': 6,
    'C#': 7, 'A#m': 7, 'Cb': 7, 'Abm': 7,
  };
  const accCount = keyAccidentals[keySignature] ?? 0;
  if (accCount > 0) {
    lead += accCount * 11 + 6;
  }
  if (isFirstSystem || isTimeSigChange) {
    lead += 30;
  }
  return Math.ceil(lead + 10);
}

export const VexFlowSheetMusicView: React.FC<Props> = React.memo(({
  notes,
  timeSignature,
  keySignature,
  initialTempoBpm,
  width,
  height,
  currentTimeMs,
  totalDurationMs,
  activePlaybackNotesInfo,
  onSeek,
  isPlaying,
  sheetMusicZoom,
  barLines,
  rightHandColor,
  leftHandColor,
  hitNoteColor,
  signatureEvents,
  onLayoutRendered,
  tempoEvents,
  playbackTempoMultiplier,
  backgroundColor = '#f7f5ed',
  lowDetailMode = false,
  instrumentMode = 'piano',
  resolutionScale = 1.0,
  noteLabelType = 'none',
  showDynamics = false,
  showOnlyMajorNotes = false,
  notationColor: foregroundColor,
}) => {
  const isDrum = instrumentMode === 'drum';
  const effectiveShowOnlyMajorNotes = isDrum ? true : showOnlyMajorNotes;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const notationColor = foregroundColor || (!backgroundColor || backgroundColor === 'transparent' ? '#e2e8f0' : '#1a1816');
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const systemDivRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [renderedLayoutId, setRenderedLayoutId] = useState(0);
  const [notePositions, setNotePositions] = useState<Map<string, NotePosInfo>>(new Map());
  const [notePositionsByNoteId, setNotePositionsByNoteId] = useState<Map<string, NotePosInfo[]>>(new Map());
  const lastActiveSystemRef = useRef<number>(-1);

  // Compute base VexFlow render data with sheetMusicZoom
  const vexFlowData = useMemo(() => {
    if (!notes.length || !timeSignature || initialTempoBpm <= 0) return null;
    if (width == null || width <= 0 || !Number.isFinite(width) || height == null || height <= 0 || !Number.isFinite(height)) return null;
    try {
      return getVexFlowRenderData(
        notes,
        timeSignature,
        initialTempoBpm,
        keySignature,
        sheetMusicZoom,
        barLines,
        signatureEvents,
        width,
        height,
        effectiveShowOnlyMajorNotes,
        tempoEvents,
        playbackTempoMultiplier,
        false,
        instrumentMode
      );
    } catch (e) {
      console.error('Error generating VexFlow render data:', e);
      return null;
    }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, effectiveShowOnlyMajorNotes, tempoEvents, playbackTempoMultiplier, instrumentMode]);

  // Dynamic system wrapping:
  // Packs measures cleanly. If a measure would exceed the line width, it wraps to the line below
  // so bars are never squashed or cut off halfway, guaranteed across all screen widths.
  const systems = useMemo<SystemLayout[]>(() => {
    if (!vexFlowData || vexFlowData.measures.length === 0) return [];

    const isDrum = instrumentMode === 'drum';
    const zoom = Math.max(0.4, Math.min(2.5, sheetMusicZoom || 1));
    const effectiveScale = NOTATION_SCALE * zoom;
    const systemDisplayWidth = Math.max(280, Math.floor(width - SYSTEM_PADDING_X * 2));
    const virtualSystemWidth = Math.floor(systemDisplayWidth / effectiveScale);
    const virtualSystemHeight = isDrum ? VIRTUAL_DRUM_SYSTEM_HEIGHT : VIRTUAL_SYSTEM_HEIGHT;
    const systemDisplayHeight = Math.floor(virtualSystemHeight * effectiveScale);

    // Responsive limit on max measures per line adjusted by virtual width
    let maxMeasuresPerLine = 4;
    if (virtualSystemWidth < 500) maxMeasuresPerLine = 2;
    else if (virtualSystemWidth < 800) maxMeasuresPerLine = 3;
    else if (virtualSystemWidth < 1200) maxMeasuresPerLine = 4;
    else if (virtualSystemWidth < 1600) maxMeasuresPerLine = 5;
    else maxMeasuresPerLine = 6;

    const allMeasures = vexFlowData.measures;
    const result: SystemLayout[] = [];

    let currentSystemMeasures: { measure: VexFlowMeasureData; globalIndex: number }[] = [];
    let currentSystemIndex = 0;
    let accumulatedWidth = 0;

    // Helper to calculate required width strictly based on note count, accidentals, and zoom,
    // ensuring measures with dense notes/accidentals get adequate room and don't crowd/cross barlines!
    const getItemRequiredWidth = (item: { measure: VexFlowMeasureData }) => {
      const nCount = Math.max(item.measure.rightHand.length, item.measure.leftHand.length, 1);

      let totalAccidentals = 0;
      let maxChordNotes = 1;
      item.measure.rightHand.forEach(n => {
        if (n.accidentals) totalAccidentals += n.accidentals.length;
        if (n.vexNote && n.vexNote.keys) maxChordNotes = Math.max(maxChordNotes, n.vexNote.keys.length);
      });
      item.measure.leftHand.forEach(n => {
        if (n.accidentals) totalAccidentals += n.accidentals.length;
        if (n.vexNote && n.vexNote.keys) maxChordNotes = Math.max(maxChordNotes, n.vexNote.keys.length);
      });

      // Realistic physical width per note in VexFlow:
      // Single note without accidental: 24px
      // Note with accidental: 34px
      // Chord with multiple accidentals (e.g. Chopin Etudes): 42-46px
      let perNoteWidth = 24;
      if (totalAccidentals > 0) {
        perNoteWidth = maxChordNotes > 1 ? 42 : 34;
        if (totalAccidentals >= nCount) {
          perNoteWidth += 4; // heavily chromatic piece with accidentals on almost every note
        }
      } else if (maxChordNotes > 1) {
        perNoteWidth = 30;
      }

      const accidentalExtra = (item.measure.isClefChangeRH || item.measure.isClefChangeLH ? 35 : 0) +
        (item.measure.isKeySigChange ? 30 : 0) +
        (item.measure.isTimeSigChange ? 30 : 0);
      return Math.max(80, nCount * perNoteWidth + accidentalExtra + 24);
    };

    for (let i = 0; i < allMeasures.length; i++) {
      const m = allMeasures[i];
      const isFirstInSystem = currentSystemMeasures.length === 0;
      const lead = getSystemLeadWidth(
        currentSystemIndex === 0 && isFirstInSystem,
        m.activeKeySignature || vexFlowData.keySignature,
        m.effectiveTimeSignature || vexFlowData.timeSignature,
        m.isTimeSigChange
      );
      const extraLead = isFirstInSystem ? lead : 0;
      const mReqWidth = getItemRequiredWidth({ measure: m }) + extraLead;

      const wouldExceed = accumulatedWidth + mReqWidth > virtualSystemWidth;
      const hasAtLeastOneMeasure = currentSystemMeasures.length >= 1;

      // Measures wrap naturally when required width exceeds the line width (wouldExceed).
      // maxMeasuresPerLine provides a clean responsive upper bound based on screen width/zoom.
      const isMaxMeasures = currentSystemMeasures.length >= maxMeasuresPerLine;

      // Wrap immediately to the next row if adding this measure would exceed the line width
      if ((wouldExceed && hasAtLeastOneMeasure) || isMaxMeasures) {
        const firstIdx = currentSystemMeasures[0].globalIndex;
        const lastIdx = currentSystemMeasures[currentSystemMeasures.length - 1].globalIndex;
        const firstMeasure = currentSystemMeasures[0].measure;
        const lineExtraLead = getSystemLeadWidth(
          currentSystemIndex === 0,
          firstMeasure.activeKeySignature || vexFlowData.keySignature,
          firstMeasure.effectiveTimeSignature || vexFlowData.timeSignature,
          firstMeasure.isTimeSigChange
        );
        const totalBaseWidth = currentSystemMeasures.reduce((sum, item) => sum + getItemRequiredWidth(item), 0);
        const availableForContent = Math.max(100, virtualSystemWidth - lineExtraLead);

        let curX = 0;
        const measureLayouts: SystemMeasureLayout[] = currentSystemMeasures.map((item, mIdx) => {
          const isFirst = mIdx === 0;
          const isLast = mIdx === currentSystemMeasures.length - 1;
          const prop = getItemRequiredWidth(item) / totalBaseWidth;
          const contentW = prop * availableForContent;
          const actualW = isFirst ? contentW + lineExtraLead : contentW;

          const layout: SystemMeasureLayout = {
            measure: item.measure,
            globalIndex: item.globalIndex,
            systemIndex: currentSystemIndex,
            x: curX,
            width: actualW,
            isFirstInSystem: isFirst,
            isLastInSystem: isLast,
            noteStartX: isFirst ? lineExtraLead : 0,
          };
          curX += actualW;
          return layout;
        });

        // Snap last measure to right margin
        if (measureLayouts.length > 0) {
          const actualTotalX = measureLayouts[measureLayouts.length - 1].x + measureLayouts[measureLayouts.length - 1].width;
          const diff = virtualSystemWidth - actualTotalX;
          measureLayouts[measureLayouts.length - 1].width += diff;
        }

        const effectiveSpacing = isDrum ? DRUM_SYSTEM_SPACING : SYSTEM_SPACING;
        result.push({
          systemIndex: currentSystemIndex,
          measures: measureLayouts,
          width: systemDisplayWidth,
          height: systemDisplayHeight,
          virtualWidth: virtualSystemWidth,
          virtualHeight: virtualSystemHeight,
          startY: 32 + currentSystemIndex * (systemDisplayHeight + effectiveSpacing),
          firstMeasureIndex: firstIdx,
          lastMeasureIndex: lastIdx,
          scale: effectiveScale,
        });

        currentSystemIndex++;
        currentSystemMeasures = [];
        accumulatedWidth = 0;
      }

      currentSystemMeasures.push({ measure: m, globalIndex: i });
      accumulatedWidth += mReqWidth;
    }

    // Process remaining measures in the last line
    if (currentSystemMeasures.length > 0) {
      const firstIdx = currentSystemMeasures[0].globalIndex;
      const lastIdx = currentSystemMeasures[currentSystemMeasures.length - 1].globalIndex;
      const firstMeasure = currentSystemMeasures[0].measure;
      const lineExtraLead = getSystemLeadWidth(
        currentSystemIndex === 0,
        firstMeasure.activeKeySignature || vexFlowData.keySignature,
        firstMeasure.effectiveTimeSignature || vexFlowData.timeSignature,
        firstMeasure.isTimeSigChange
      );
      const totalBaseWidth = currentSystemMeasures.reduce((sum, item) => sum + getItemRequiredWidth(item), 0);
      const availableForContent = Math.max(100, virtualSystemWidth - lineExtraLead);

      let curX = 0;
      const shouldJustify = currentSystemMeasures.length >= 3;

      const measureLayouts: SystemMeasureLayout[] = currentSystemMeasures.map((item, mIdx) => {
        const isFirst = mIdx === 0;
        const isLast = mIdx === currentSystemMeasures.length - 1;
        const prop = getItemRequiredWidth(item) / totalBaseWidth;
        const contentW = shouldJustify ? prop * availableForContent : Math.min(prop * availableForContent, Math.max(80, getItemRequiredWidth(item) * 1.05));
        const actualW = isFirst ? contentW + lineExtraLead : contentW;

        const layout: SystemMeasureLayout = {
          measure: item.measure,
          globalIndex: item.globalIndex,
          systemIndex: currentSystemIndex,
          x: curX,
          width: actualW,
          isFirstInSystem: isFirst,
          isLastInSystem: isLast,
          noteStartX: isFirst ? lineExtraLead : 0,
        };
        curX += actualW;
        return layout;
      });

      if (shouldJustify && measureLayouts.length > 0) {
        const actualTotalX = measureLayouts[measureLayouts.length - 1].x + measureLayouts[measureLayouts.length - 1].width;
        const diff = virtualSystemWidth - actualTotalX;
        measureLayouts[measureLayouts.length - 1].width += diff;
      }

      const effectiveSpacing = isDrum ? DRUM_SYSTEM_SPACING : SYSTEM_SPACING;
      result.push({
        systemIndex: currentSystemIndex,
        measures: measureLayouts,
        width: systemDisplayWidth,
        height: systemDisplayHeight,
        virtualWidth: virtualSystemWidth,
        virtualHeight: virtualSystemHeight,
        startY: SHEET_TOP_PADDING_PX + currentSystemIndex * (systemDisplayHeight + effectiveSpacing),
        firstMeasureIndex: firstIdx,
        lastMeasureIndex: lastIdx,
        scale: effectiveScale,
      });
    }

    return result;
  }, [vexFlowData, width, instrumentMode, sheetMusicZoom]);

  // Notify parent of layout render
  useEffect(() => {
    if (renderedLayoutId > 0) {
      onLayoutRendered(renderedLayoutId);
    }
  }, [renderedLayoutId, onLayoutRendered]);

  // Render VexFlow score onto canvases with high-DPI scaling and compact notation
  useLayoutEffect(() => {
    if (!vexFlowData || systems.length === 0 || width <= 0 || height <= 0) {
      canvasRefs.current.forEach(canvas => {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      setNotePositions(new Map());
      setNotePositionsByNoteId(new Map());
      setRenderedLayoutId(prev => prev + 1);
      return;
    }

    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1) * (resolutionScale || 1.0);
    const newPositions = new Map<string, NotePosInfo>();
    const newPositionsByNoteId = new Map<string, NotePosInfo[]>();
    const isDrum = instrumentMode === 'drum';

    systems.forEach((system, sysIdx) => {
      const canvas = canvasRefs.current[sysIdx];
      if (!canvas) return;

      canvas.width = Math.floor(system.width * dpr);
      canvas.height = Math.floor(system.height * dpr);
      canvas.style.width = `${system.width}px`;
      canvas.style.height = `${system.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale context directly by (DPR * system.scale)
      // Note: Do NOT call renderer.resize() as it applies window.devicePixelRatio a second time
      ctx.scale(dpr * system.scale, dpr * system.scale);

      const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
      const vexCtx = renderer.getContext();
      const originalFill = vexCtx.setFillStyle.bind(vexCtx);
      vexCtx.setFillStyle = (style: string) => originalFill(/^(black|#000(?:000)?|#444(?:444)?)$/i.test(style) ? notationColor : style);

      const originalStroke = vexCtx.setStrokeStyle.bind(vexCtx);
      vexCtx.setStrokeStyle = (style: string) => originalStroke(/^(black|#000(?:000)?|#444(?:444)?)$/i.test(style) ? notationColor : style);
      vexCtx.setFillStyle(notationColor);
      vexCtx.setStrokeStyle(notationColor);

      const systemMeasureNotes: {
        measureIndex: number;
        rightNotes: StaveNote[];
        rightInfoMap: Map<string, VexFlowNoteInfo>;
        leftNotes: StaveNote[];
        leftInfoMap: Map<string, VexFlowNoteInfo>;
      }[] = [];

      system.measures.forEach((mLayout) => {
        const { measure, isFirstInSystem, isLastInSystem, globalIndex } = mLayout;
        const curX = mLayout.x;
        const activeMeasureKey = measure.activeKeySignature || vexFlowData.keySignature || 'C';

        // Stave width strictly matches measure layout width to prevent barline overlap or desync
        const curW = mLayout.width;

        const treble = new Stave(curX, TOP_STAVE_Y, curW);
        const bass = isDrum ? null : new Stave(curX, TOP_STAVE_Y + VERTICAL_STAFF_SPACING, curW);

        // Clefs & signatures on system starts
        if (isFirstInSystem) {
          treble.addClef(measure.effectiveClefRH || 'treble');
          if (bass) bass.addClef(measure.effectiveClefLH || 'bass');

          // Key signature (if not C major / Am)
          const activeKey = activeMeasureKey;
          if (activeKey && activeKey !== 'C' && activeKey !== 'Am') {
            treble.addKeySignature(activeKey);
            if (bass) bass.addKeySignature(activeKey);
          }

          // Time signature on system 0 or on change
          if (sysIdx === 0 || measure.isTimeSigChange) {
            const ts = measure.effectiveTimeSignature || vexFlowData.timeSignature;
            const tsStr = (ts.numerator === 4 && ts.denominator === 4) ? 'C' : `${ts.numerator}/${ts.denominator}`;
            treble.addTimeSignature(tsStr);
            if (bass) bass.addTimeSignature(tsStr);
          }
        } else {
          // Mid-system clef, key, or time signature changes
          if (measure.isClefChangeRH && measure.effectiveClefRH) {
            treble.addClef(measure.effectiveClefRH);
          }
          if (bass && measure.isClefChangeLH && measure.effectiveClefLH) {
            bass.addClef(measure.effectiveClefLH);
          }
          if (measure.isKeySigChange && measure.activeKeySignature) {
            treble.addKeySignature(measure.activeKeySignature);
            if (bass) bass.addKeySignature(measure.activeKeySignature);
          }
          if (measure.isTimeSigChange && measure.effectiveTimeSignature) {
            const ts = measure.effectiveTimeSignature;
            const tsStr = `${ts.numerator}/${ts.denominator}`;
            treble.addTimeSignature(tsStr);
            if (bass) bass.addTimeSignature(tsStr);
          }
        }

        // Barlines: Repeat begin / end / standard barline / final end
        if (measure.startsRepeat) {
          treble.setBegBarType(Barline.type.REPEAT_BEGIN);
          if (bass) bass.setBegBarType(Barline.type.REPEAT_BEGIN);
        }
        if (measure.endsRepeat) {
          treble.setEndBarType(Barline.type.REPEAT_END);
          if (bass) bass.setEndBarType(Barline.type.REPEAT_END);
        } else if (globalIndex === vexFlowData.measures.length - 1) {
          treble.setEndBarType(Barline.type.END);
          if (bass) bass.setEndBarType(Barline.type.END);
        } else {
          // Explicit end barline on EVERY measure
          treble.setEndBarType(Barline.type.SINGLE);
          if (bass) bass.setEndBarType(Barline.type.SINGLE);
        }

        // Draw staves
        treble.setContext(vexCtx).draw();
        if (bass) bass.setContext(vexCtx).draw();

        // Connectors across Grand Staff:
        // 1. Initial brace and bracket on first measure of system
        if (isFirstInSystem && bass) {
          new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(vexCtx).draw();
          new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(vexCtx).draw();
        }

        if (bass && !isFirstInSystem) {
          new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(vexCtx).draw();
        }

        // 2. Continuous vertical end barline connecting treble and bass at the end of EVERY measure!
        if (bass) {
          if (globalIndex === vexFlowData.measures.length - 1) {
            new StaveConnector(treble, bass).setType(StaveConnector.type.BOLD_DOUBLE_RIGHT).setContext(vexCtx).draw();
          } else {
            new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(vexCtx).draw();
          }
        }

        // Create StaveNotes
        const createStaveNote = (info: VexFlowNoteInfo) => {
          const n = new StaveNote({ ...info.vexNote });
          if (info.vexNote.dots) {
            for (let d = 0; d < info.vexNote.dots; d++) n.addModifier(new Dot());
          }
          if (info.accidentals) {
            info.accidentals.forEach(acc => {
              if (acc && acc.type) {
                n.addModifier(new Accidental(acc.type), acc.index);
              }
            });
          }
          n.setAttribute('id', info.vexNoteId);

          const props = n.getKeyProps();
          let onOrAboveCount = 0;
          let belowCount = 0;
          let maxDist = -1;
          let farthestLine = 2;

          props.forEach(p => {
            const dist = Math.abs(p.line - 2);
            if (dist > maxDist) {
              maxDist = dist;
              farthestLine = p.line;
            }
            // In VexFlow, line 0 is bottom stave line, line 2 is middle stave line, line 4 is top stave line.
            // Notes on or above middle line (line >= 2) standardly have stem pointing DOWN.
            // Notes below middle line (line < 2) standardly have stem pointing UP.
            if (p.line >= 2) onOrAboveCount++;
            else belowCount++;
          });

          if (instrumentMode === 'drum') {
            // Two-Voice drum notation:
            // Voice 1 (hand === 'right' / Hands: Cymbals, Snare, Toms) -> STEM_UP
            // Voice 2 (hand === 'left' / Feet: Kick, Pedal Hi-Hat) -> STEM_DOWN
            const isFeetVoice = info.hand === 'left';
            n.setStemDirection(isFeetVoice ? StaveNote.STEM_DOWN : StaveNote.STEM_UP);
          } else {
            const direction = onOrAboveCount > belowCount
              ? StaveNote.STEM_DOWN
              : belowCount > onOrAboveCount
                ? StaveNote.STEM_UP
                : farthestLine >= 2 ? StaveNote.STEM_DOWN : StaveNote.STEM_UP;

            n.setStemDirection(direction);
          }
          if (noteLabelType === 'fingering' && info.fingering && info.fingering.length > 0) {
            info.fingering.forEach((f, idx) => {
              if (f !== undefined && f !== null && f > 0) {
                const finger = new FretHandFinger(String(f));
                // Match the bold, visible style of the reference image
                finger.setFont({ family: 'Arial, sans-serif', size: 11, weight: 'bold' });
                // Always place fingering ABOVE the notes/beams for both hands
                finger.setPosition(Modifier.Position.ABOVE);
                // Increased shift to move them significantly higher as requested
                finger.setYShift(-30);
                n.addModifier(finger, idx);
              }
            });
          }

          // Add Note Names as Annotations above the note
          if (noteLabelType === 'noteName' && info.vexNote.keys && info.vexNote.keys.length > 0) {
            info.vexNote.keys.forEach((k, idx) => {
              const noteName = getNoteNameForDisplay(k, idx, info, activeMeasureKey);
              const annotation = new Annotation(noteName);
              annotation.setFont({ family: 'Arial, sans-serif', size: 10, weight: 'bold' });
              annotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
              // Shift note name slightly to be clearly visible
              annotation.setYShift(-20);
              n.addModifier(annotation, idx);
            });
          }

          return n;
        };

        const rightTickables: (StaveNote | ClefNote)[] = [];
        const rightStaveNotes: StaveNote[] = [];
        const rightInfoMap = new Map<string, VexFlowNoteInfo>();
        let curClefRH = measure.effectiveClefRH || 'treble';

        measure.rightHand.forEach(info => {
          const isDup = rightStaveNotes.some(sn => {
            const rh = rightInfoMap.get(sn.getAttribute('id'));
            return rh && Math.abs(rh.timeMs - info.timeMs) < 1 && rh.midiValue === info.midiValue;
          });
          if (!isDup) {
            // Mid-measure clef change per beat (hanya jika ada nada sebelumnya dalam birama):
            const noteClef = info.vexNote.clef || 'treble';
            if (!isDrum && noteClef !== curClefRH) {
              if (rightStaveNotes.length > 0) {
                const cn = new ClefNote(noteClef, 'small');
                rightTickables.push(cn);
              }
              curClefRH = noteClef;
            }
            const sn = createStaveNote(info);
            rightStaveNotes.push(sn);
            rightTickables.push(sn);
            rightInfoMap.set(info.vexNoteId, info);
          }
        });

        const leftTickables: (StaveNote | ClefNote)[] = [];
        const leftStaveNotes: StaveNote[] = [];
        const leftInfoMap = new Map<string, VexFlowNoteInfo>();
        let curClefLH = measure.effectiveClefLH || 'bass';

        measure.leftHand.forEach(info => {
          const isDupInt = leftStaveNotes.some(sn => {
            const lh = leftInfoMap.get(sn.getAttribute('id'));
            return lh && Math.abs(lh.timeMs - info.timeMs) < 1 && lh.midiValue === info.midiValue;
          });
          const isDupAcross = !isDrum && rightStaveNotes.some(sn => {
            const rh = rightInfoMap.get(sn.getAttribute('id'));
            return rh && Math.abs(rh.timeMs - info.timeMs) < 1 && rh.midiValue === info.midiValue;
          });
          if (!isDupInt && !isDupAcross) {
            // Mid-measure clef change per beat (hanya jika ada nada sebelumnya dalam birama):
            const noteClef = info.vexNote.clef || 'bass';
            if (!isDrum && noteClef !== curClefLH) {
              if (leftStaveNotes.length > 0) {
                const cn = new ClefNote(noteClef, 'small');
                leftTickables.push(cn);
              }
              curClefLH = noteClef;
            }
            const sn = createStaveNote(info);
            leftStaveNotes.push(sn);
            leftTickables.push(sn);
            leftInfoMap.set(info.vexNoteId, info);
          }
        });

        // Beams
        const buildBeams = (notesArr: StaveNote[], ts: TimeSignatureInfo, tupletGroups: VexFlowTupletGroup[], hand: 'right' | 'left') => {
          if (notesArr.length === 0) return [];

          const beams: Beam[] = [];
          const beamedNoteIds = new Set<string>();

          // 1. Manually beam tuplets only if they are composed of beamable notes
          // (Notes shorter than a quarter note: 8th, 16th, 32nd, 64th, 128th).
          // Quarter-note triplets and half-note triplets use tuplet brackets, not beams.
          const BEAMABLE_DURATIONS = new Set(['8', '16', '32', '64', '128']);
          tupletGroups.forEach(tg => {
            const tNotes = tg.indices
              .map(idx => notesArr[idx])
              .filter(n => n && !n.isRest());

            const isAllBeamable = tNotes.length > 1 && tNotes.every(n => BEAMABLE_DURATIONS.has(n.getDuration()));
            if (isAllBeamable) {
              try {
                // Pass true for auto_stem to harmonize stem directions across all notes in the tuplet beam
                const b = new Beam(tNotes, true);
                if (isDrum) b.render_options.flat_beams = true;
                beams.push(b);
                tNotes.forEach(n => beamedNoteIds.add(n.getAttribute('id')));
              } catch (e) {
                console.warn('Could not beam tuplet:', e);
              }
            }
          });

          // Build lookup for note timing info to detect gaps/rests between notes
          const noteInfoMap = new Map<string, VexFlowNoteInfo>();
          const handNoteList = hand === 'right' ? measure.rightHand : measure.leftHand;
          handNoteList.forEach(n => noteInfoMap.set(n.vexNoteId, n));

          const hasTemporalGap = (n1: StaveNote, n2: StaveNote): boolean => {
            const i1 = noteInfoMap.get(n1.getAttribute('id'));
            const i2 = noteInfoMap.get(n2.getAttribute('id'));
            if (!i1 || !i2) return false;
            // If the start of next note is noticeably after the end of the previous note,
            // there is an empty rest/gap between them - they must NOT be beamed together!
            return (i2.timeMs - (i1.timeMs + i1.durationMs)) > 25;
          };

          // 2. Identify rapid arpeggio / flourish notes ('32', '64', '128')
          // When consecutive rapid notes occur, beam them in beat-sized chunks (e.g. 4 notes per 8th beat in 3/8)!
          // They should NEVER be joined with preceding/following slower notes (e.g. dotted 8th notes).
          // For RH / treble clef, stems point UP and beams sit neatly at the top.
          const isRapidNote = (n: StemmableNote | StaveNote) => ['32', '64', '128'].includes(n.getDuration());

          let currentRapidRun: StaveNote[] = [];
          const rapidRuns: StaveNote[][] = [];

          for (let i = 0; i < notesArr.length; i++) {
            const n = notesArr[i];
            const prevN = i > 0 ? notesArr[i - 1] : null;
            const gap = prevN && currentRapidRun.length > 0 ? hasTemporalGap(prevN, n) : false;

            if (!n.isRest() && isRapidNote(n) && !beamedNoteIds.has(n.getAttribute('id')) && !gap) {
              currentRapidRun.push(n);
            } else {
              if (currentRapidRun.length > 1) {
                rapidRuns.push(currentRapidRun);
              }
              currentRapidRun = [];
              if (!n.isRest() && isRapidNote(n) && !beamedNoteIds.has(n.getAttribute('id'))) {
                currentRapidRun.push(n);
              }
            }
          }
          if (currentRapidRun.length > 1) {
            rapidRuns.push(currentRapidRun);
          }

          // Beam rapid notes in clean beat chunks (max 4 notes per beam chunk in 3/8 or rapid runs)
          // so we never get an 11-note monster beam like in Beethoven Fur Elise measure 54!
          const maxRapidChunk = (ts.numerator === 3 && ts.denominator === 8) ? 4 : 4;
          rapidRuns.forEach(rRun => {
            for (let i = 0; i < rRun.length; i += maxRapidChunk) {
              const chunk = rRun.slice(i, i + maxRapidChunk);
              if (chunk.length > 1) {
                try {
                  if (hand === 'right' || (isDrum && hand !== 'left')) {
                    chunk.forEach(n => n.setStemDirection(StaveNote.STEM_UP));
                  } else if (isDrum && hand === 'left') {
                    chunk.forEach(n => n.setStemDirection(StaveNote.STEM_DOWN));
                  }
                  const b = new Beam(chunk, true);
                  if (isDrum) b.render_options.flat_beams = true;
                  beams.push(b);
                  chunk.forEach(n => beamedNoteIds.add(n.getAttribute('id')));
                } catch (e) {
                  console.warn('Could not beam rapid run chunk:', e);
                }
              }
            }
          });

          // Helper to check if a note has dots
          const noteHasDots = (sn: StaveNote) => {
            const info = noteInfoMap.get(sn.getAttribute('id'));
            return (info?.vexNote?.dots ?? 0) > 0;
          };

          // 3. Split remaining beamable notes into contiguous runs (breaking on rests and temporal gaps)
          const runs: StaveNote[][] = [];
          let currentRun: StaveNote[] = [];

          for (let i = 0; i < notesArr.length; i++) {
            const n = notesArr[i];
            const prevN = i > 0 ? notesArr[i - 1] : null;
            const gap = prevN && currentRun.length > 0 ? hasTemporalGap(prevN, n) : false;

            if (!n.isRest() && BEAMABLE_DURATIONS.has(n.getDuration()) && !beamedNoteIds.has(n.getAttribute('id')) && !gap) {
              currentRun.push(n);
            } else {
              if (currentRun.length > 1) {
                runs.push(currentRun);
              }
              currentRun = [];
              if (!n.isRest() && BEAMABLE_DURATIONS.has(n.getDuration()) && !beamedNoteIds.has(n.getAttribute('id'))) {
                currentRun.push(n);
              }
            }
          }
          if (currentRun.length > 1) {
            runs.push(currentRun);
          }

          // 4. Determine beaming groups per run based on time signature and the run's note durations
          runs.forEach(run => {
            const runHasSubdivisions = run.some(n => ['16', '32', '64', '128'].includes(n.getDuration()));
            const runHasDots = run.some(n => noteHasDots(n));
            let runGroups = [new Fraction(1, 4)]; // Default: beam by quarter note

            if (ts.numerator === 4 && ts.denominator === 4) {
              // 4/4:
              // - Runs of 8th notes only OR runs containing dotted notes (e.g. dotted 8th + 16th + 8th): beam by half note (Fraction(1, 2))
              // - Runs of 16th notes or faster without dots: beam by quarter note (Fraction(1, 4))
              runGroups = (runHasSubdivisions && !runHasDots) ? [new Fraction(1, 4)] : [new Fraction(1, 2)];
            } else if (ts.numerator === 3 && ts.denominator === 4) {
              // 3/4:
              runGroups = (runHasSubdivisions && !runHasDots) ? [new Fraction(3, 8)] : [new Fraction(3, 4)];
            } else if (ts.numerator === 3 && ts.denominator === 8) {
              // 3/8: Full measure beam for 16th notes (6 notes) or 8th notes (3 notes)
              runGroups = [new Fraction(3, 8)];
            } else if (ts.numerator === 6 && ts.denominator === 4) {
              // 6/4:
              // - 8th notes: 6 notes per beam (Fraction(3, 4))
              // - 16th notes: 6 notes per beam (Fraction(3, 8))
              runGroups = (runHasSubdivisions && !runHasDots) ? [new Fraction(3, 8)] : [new Fraction(3, 4)];
            } else if (ts.numerator === 2 && ts.denominator === 4) {
              // 2/4:
              // - 8th notes: full measure (Fraction(2, 4))
              // - 16th notes: per quarter note (Fraction(1, 4))
              runGroups = (runHasSubdivisions && !runHasDots) ? [new Fraction(1, 4)] : [new Fraction(2, 4)];
            } else if (ts.denominator === 8) {
              // Compound meters (6/8, 9/8, 12/8): beam by dotted quarter note
              runGroups = [new Fraction(3, 8)];
            } else if (ts.denominator === 2) {
              runGroups = [new Fraction(1, 2)];
            }

            // Enforce maximum beam length based on metric beat boundaries:
            // - In 3/4, 3/8, 6/4, or compound meters (6/8, 9/8, 12/8): max 6 notes per beam.
            // - In simple meters (4/4, 2/4): max 4 notes per beam.
            const addBeamWithMeterConstraint = (b: Beam) => {
              if (isDrum) b.render_options.flat_beams = true;
              const is6NoteMeter = (ts.numerator === 3 && ts.denominator === 4) ||
                (ts.numerator === 3 && ts.denominator === 8) ||
                (ts.numerator === 6 && ts.denominator === 4) ||
                (ts.denominator === 8);
              const maxBeamNotes = is6NoteMeter ? 6 : 4;
              if (b.notes.length > maxBeamNotes) {
                for (let i = 0; i < b.notes.length; i += maxBeamNotes) {
                  const chunk = b.notes.slice(i, i + maxBeamNotes);
                  if (chunk.length > 1) {
                    try {
                      const splitB = new Beam(chunk, true);
                      if (isDrum) splitB.render_options.flat_beams = true;
                      beams.push(splitB);
                    } catch (e) {
                      console.warn('Could not beam split chunk:', e);
                    }
                  }
                }
              } else {
                beams.push(b);
              }
            };

            // In 4/4:
            // When notes are uniform 8th notes (duration '8') without dots, ALWAYS beam up to 4 notes together per beam
            // (half measure / 4 notes per beam), NEVER split into 2-2!
            if (ts.numerator === 4 && ts.denominator === 4 && !runHasSubdivisions) {
              const isUniform8ths = run.every(n => n.getDuration() === '8' && !noteHasDots(n));
              if (isUniform8ths) {
                for (let i = 0; i < run.length; i += 4) {
                  const chunk = run.slice(i, i + 4);
                  if (chunk.length > 1) {
                    try {
                      const b = new Beam(chunk, true);
                      if (isDrum) b.render_options.flat_beams = true;
                      beams.push(b);
                    } catch (e) {
                      console.warn('Could not beam 4-note chunk in 4/4:', e);
                    }
                  }
                }
                return;
              }
            }

            // In 3/4:
            // - When notes are uniform 8th notes (duration '8') without dots: beam up to 6 notes together in 1 continuous beam (full measure), NEVER split into 4-2!
            // - When notes are uniform 16th notes (duration '16') without dots: beam up to 6 notes per beam (3/8 half measure / max 6 notes)!
            if (ts.numerator === 3 && ts.denominator === 4) {
              const isUniform = run.every(n => n.getDuration() === run[0].getDuration() && !noteHasDots(n));
              if (isUniform && (run[0].getDuration() === '8' || run[0].getDuration() === '16')) {
                for (let i = 0; i < run.length; i += 6) {
                  const chunk = run.slice(i, i + 6);
                  if (chunk.length > 1) {
                    try {
                      const b = new Beam(chunk, true);
                      if (isDrum) b.render_options.flat_beams = true;
                      beams.push(b);
                    } catch (e) {
                      console.warn('Could not beam 6-note chunk in 3/4:', e);
                    }
                  }
                }
                return;
              }
            }

            // In 3/8 (e.g. Für Elise bass):
            // Beam up to 6 uniform notes (full measure of 16th notes or 8th notes without dots) in one continuous beam,
            // exactly as it was originally, NEVER split into 2-2-2!
            if (ts.numerator === 3 && ts.denominator === 8) {
              const isUniform = run.every(n => n.getDuration() === run[0].getDuration() && !noteHasDots(n));
              if (isUniform) {
                for (let i = 0; i < run.length; i += 6) {
                  const chunk = run.slice(i, i + 6);
                  if (chunk.length > 1) {
                    try {
                      const b = new Beam(chunk, true);
                      if (isDrum) b.render_options.flat_beams = true;
                      beams.push(b);
                    } catch (e) {
                      console.warn('Could not beam 6-note chunk in 3/8:', e);
                    }
                  }
                }
                return;
              }
            }

            try {
              const autoBeams = Beam.generateBeams(run, {
                groups: runGroups,
                beam_middle_only: false,
                beam_rests: false,
                maintain_stem_directions: false,
                flat_beams: isDrum,
              });
              if (autoBeams && autoBeams.length > 0) {
                autoBeams.forEach(ab => addBeamWithMeterConstraint(ab));
              } else if (run.length > 1) {
                const b = new Beam(run, true);
                if (isDrum) b.render_options.flat_beams = true;
                addBeamWithMeterConstraint(b);
              }
            } catch {
              try {
                const b = new Beam(run, true);
                if (isDrum) b.render_options.flat_beams = true;
                addBeamWithMeterConstraint(b);
              } catch (e) {
                console.warn('Could not beam run:', e);
              }
            }
          });

          // Harmonize and unify stem direction for ALL notes across each beam:
          // In standard music engraving (Gould, "Behind Bars"), all notes connected by a beam
          // MUST share the exact same stem direction.
          // For drum sheet music, standard notation requires all stems to point UP to clean
          // horizontal (flat) beams sitting neatly at the top of the staff above the cymbals.
          beams.forEach(b => {
            if (!b.notes || b.notes.length === 0) return;

            let unifiedDir: number;

            if (isDrum) {
              b.render_options.flat_beams = true;
              unifiedDir = hand === 'left' ? StaveNote.STEM_DOWN : StaveNote.STEM_UP;
            } else if (hand === 'right') {
              // Right Hand in piano grand staff: default stems UP so beams float cleanly above the treble staff,
              // never dropping down to collide with the bass staff
              unifiedDir = StaveNote.STEM_UP;
            } else {
              // Left Hand in piano grand staff: default stems DOWN so beams stay below the bass staff,
              // keeping the space between staves clean
              unifiedDir = StaveNote.STEM_DOWN;
            }

            b.notes.forEach(note => {
              if (!note.isRest()) {
                note.setStemDirection(unifiedDir);
                const stem = note.getStem();
                if (stem) stem.setDirection(unifiedDir);
              }
              // CRUCIAL: In VexFlow, note.setStemDirection(...) resets note.beam = undefined and builds a flag glyph!
              // Calling note.setBeam(b) re-attaches the beam to the note so shouldDrawFlag() returns false,
              // preventing rogue flag tails from rendering on beamed notes.
              note.setBeam(b);
              (note as any).flag = undefined;
            });
            (b as any).stem_direction = unifiedDir;
            (b as any).postFormatted = false;
          });

          return beams;
        };

        const effTime = measure.effectiveTimeSignature || vexFlowData.timeSignature;
        const rightBeams = buildBeams(rightStaveNotes, effTime, measure.rightHandTuplets || [], 'right');
        const leftBeams = buildBeams(leftStaveNotes, effTime, measure.leftHandTuplets || [], 'left');

        const rightTies: any[] = []; // Removed tie logic
        const leftTies: any[] = [];

        // Tuplets
        const createTupletObjects = (tuplets: VexFlowTupletGroup[], staveNotes: StaveNote[]) => {
          return tuplets.map(g => {
            const tNotes = g.indices.map(idx => staveNotes[idx]).filter(Boolean);
            if (tNotes.length === 0) return new Tuplet([]);

            const isBeamed = tNotes.some(n => n.hasBeam());
            const stemDir = tNotes[0].getStemDirection();
            // In standard music engraving (as shown in reference image):
            // - If stems point UP, the beam is at the top -> place tuplet number ABOVE the beam (LOCATION_TOP)
            // - If stems point DOWN, the beam is at the bottom -> place tuplet number BELOW the beam (LOCATION_BOTTOM)
            const location = stemDir === StaveNote.STEM_UP ? Tuplet.LOCATION_TOP : Tuplet.LOCATION_BOTTOM;
            const yOffset = isBeamed ? (location === Tuplet.LOCATION_TOP ? -4 : 6) : 0;

            const tuplet = new Tuplet(tNotes, {
              location: location,
              bracketed: !isBeamed,
              y_offset: yOffset,
            });

            tuplet.setTupletLocation(location);
            tuplet.setBracketed(!isBeamed);

            return tuplet;
          });
        };

        const rhTupletObjs = createTupletObjects(measure.rightHandTuplets || [], rightStaveNotes);
        const lhTupletObjs = createTupletObjects(measure.leftHandTuplets || [], leftStaveNotes);

        // Format and draw voices
        const voices: Voice[] = [];

        if (rightTickables.length > 0) {
          voices.push(new Voice({ num_beats: effTime.numerator, beat_value: effTime.denominator }).setStrict(false).addTickables(rightTickables));
        }
        if (leftTickables.length > 0) {
          voices.push(new Voice({ num_beats: effTime.numerator, beat_value: effTime.denominator }).setStrict(false).addTickables(leftTickables));
        }

        if (voices.length > 0) {
          const noteStartX = Math.max(treble.getNoteStartX(), bass ? bass.getNoteStartX() : curX);
          // Format notes across the full available measure space so notes fit cleanly between start of stave
          // and end barline without leaving huge gaps or ever poking through the barline
          const availableVoiceWidth = Math.max(25, curW - (noteStartX - curX) - 14);
          const formatter = new Formatter().joinVoices(voices);
          formatter.format(voices, availableVoiceWidth);

          try {
            if (rightTickables.length > 0) {
              voices[0].draw(vexCtx, treble);
            }
            if (leftTickables.length > 0) {
              const lhVoice = rightTickables.length > 0 ? voices[1] : voices[0];
              lhVoice.draw(vexCtx, isDrum ? treble : (bass as Stave));
            }
          } catch (err) {
            console.warn('Error drawing stave voices in measure', globalIndex, err);
          }

          try {
            rightBeams.forEach(b => b.setContext(vexCtx).draw());
            leftBeams.forEach(b => b.setContext(vexCtx).draw());
            rhTupletObjs.forEach(t => t.setContext(vexCtx).draw());
            lhTupletObjs.forEach(t => t.setContext(vexCtx).draw());
          } catch (err) {
            console.warn('Error drawing beams/tuplets in measure', globalIndex, err);
          }
        }

        // Capture notehead positions directly using exact VexFlow notehead stave line coordinates!
        // sn.getNoteHeadBeginX() provides the horizontal origin of the notehead.
        // glyphW / 2 centers the highlight directly on the notehead ellipse.
        // sn.getYs()[hi] provides the exact center Y coordinate of that notehead on the stave!
        const capture = (notesArr: StaveNote[], map: Map<string, VexFlowNoteInfo>) => {
          notesArr.forEach(sn => {
            if (sn.isRest()) return;
            const info = map.get(sn.getAttribute('id'));
            if (!info) return;

            const beginX = typeof sn.getNoteHeadBeginX === 'function' ? sn.getNoteHeadBeginX() : sn.getAbsoluteX();
            const glyphW = typeof (sn as any).getGlyphWidth === 'function' ? (sn as any).getGlyphWidth() : 11;
            const noteYs = typeof sn.getYs === 'function' ? sn.getYs() : [];

            sn.noteHeads.forEach((nh, hi) => {
              const isDisplaced = typeof (nh as any).isDisplaced === 'function'
                ? (nh as any).isDisplaced()
                : Boolean((nh as any).displaced);
              const shift = isDisplaced ? (sn.getStemDirection() === -1 ? -glyphW : glyphW) : 0;
              const headCenterX = beginX + glyphW / 2 + shift;
              const headCenterY = noteYs[hi] !== undefined
                ? noteYs[hi]
                : (typeof nh.getY === 'function' ? nh.getY() : TOP_STAVE_Y + 20);

              const w = 12;
              const h = 10;
              const x = headCenterX - w / 2;
              const y = headCenterY - h / 2;

              const posData: NotePosInfo = {
                x,
                y,
                w,
                h,
                systemIndex: sysIdx,
                measureIndex: globalIndex,
                timeMs: info.timeMs || measure.startTimeMs,
              };

              const addPos = (key: string, pos: NotePosInfo) => {
                if (!newPositions.has(key)) {
                  newPositions.set(key, pos);
                }
                let list = newPositionsByNoteId.get(key);
                if (!list) {
                  list = [];
                  newPositionsByNoteId.set(key, list);
                }
                if (!list.some(p => Math.abs(p.x - pos.x) < 1 && Math.abs(p.y - pos.y) < 1 && p.systemIndex === pos.systemIndex)) {
                  list.push(pos);
                }
              };

              if (info.fragmentMapping) {
                const m = info.fragmentMapping.find(xm => xm.keyIndex === hi);
                if (m) {
                  addPos(m.fragmentId, posData);
                  const raw = m.fragmentId.replace(/-\d+$/, '');
                  if (raw) addPos(raw, posData);
                }
              }

              if (info.originalNotes && info.originalNotes[hi]) {
                const on = info.originalNotes[hi];
                if (on.noteId) addPos(on.noteId, posData);
                if (on.originalNoteId) addPos(on.originalNoteId, posData);
                if (on.fragmentId) addPos(on.fragmentId, posData);
              }

              addPos(`${info.vexNoteId}-${hi}`, posData);
            });
          });
        };

        capture(rightStaveNotes, rightInfoMap);
        capture(leftStaveNotes, leftInfoMap);

        systemMeasureNotes.push({
          measureIndex: globalIndex,
          rightNotes: rightStaveNotes,
          rightInfoMap: rightInfoMap,
          leftNotes: leftStaveNotes,
          leftInfoMap: leftInfoMap,
        });
      });

      // Draw ties for this system
      const drawTiesForHand = (hand: 'right' | 'left') => {
        if (effectiveShowOnlyMajorNotes) return;
        systemMeasureNotes.forEach((mNotes, mIdx) => {
          const staveNotes = hand === 'right' ? mNotes.rightNotes : mNotes.leftNotes;
          const infoMap = hand === 'right' ? mNotes.rightInfoMap : mNotes.leftInfoMap;

          // Helper to match tie indices pitch-to-pitch (same note to same note)
          const getMatchedTieIndices = (info1: VexFlowNoteInfo, info2: VexFlowNoteInfo) => {
            const firstIdxs: number[] = [];
            const lastIdxs: number[] = [];
            const usedLast = new Set<number>();

            const k1 = info1.vexNote?.keys || [];
            const k2 = info2.vexNote?.keys || [];

            for (let idx1 = 0; idx1 < k1.length; idx1++) {
              if (!info1.isTieStart || !info1.isTieStart[idx1]) continue;

              const orig1 = info1.originalNotes && info1.originalNotes[idx1];
              const origId1 = orig1 ? orig1.originalNoteId : (info1.originalNoteIds && info1.originalNoteIds[idx1]);
              const midi1 = orig1 ? orig1.midi : info1.midiValue;
              const keyStr1 = k1[idx1].toLowerCase();

              let matchedIdx2 = -1;

              for (let idx2 = 0; idx2 < k2.length; idx2++) {
                if (usedLast.has(idx2)) continue;
                if (!info2.isTieEnd || !info2.isTieEnd[idx2]) continue;

                const orig2 = info2.originalNotes && info2.originalNotes[idx2];
                const origId2 = orig2 ? orig2.originalNoteId : (info2.originalNoteIds && info2.originalNoteIds[idx2]);
                const midi2 = orig2 ? orig2.midi : info2.midiValue;
                const keyStr2 = k2[idx2].toLowerCase();

                // Match condition: priority 1 = same originalNoteId, priority 2 = same midi, priority 3 = same key string
                if (origId1 && origId2 && origId1 === origId2) {
                  matchedIdx2 = idx2;
                  break;
                }
                if (midi1 !== undefined && midi2 !== undefined && midi1 === midi2) {
                  matchedIdx2 = idx2;
                  break;
                }
                if (keyStr1 === keyStr2) {
                  matchedIdx2 = idx2;
                  break;
                }
              }

              if (matchedIdx2 !== -1) {
                firstIdxs.push(idx1);
                lastIdxs.push(matchedIdx2);
                usedLast.add(matchedIdx2);
              }
            }

            return { firstIndices: firstIdxs, lastIndices: lastIdxs };
          };

          // 1. Intra-measure ties
          for (let k = 0; k < staveNotes.length - 1; k++) {
            const sn1 = staveNotes[k];
            const sn2 = staveNotes[k + 1];
            const i1 = infoMap.get(sn1.getAttribute('id'));
            const i2 = infoMap.get(sn2.getAttribute('id'));
            if (i1 && i2 && i1.isTieStart && i1.isTieStart.some(Boolean) && i2.isTieEnd && i2.isTieEnd.some(Boolean)) {
              const { firstIndices, lastIndices } = getMatchedTieIndices(i1, i2);
              if (firstIndices.length > 0) {
                try {
                  const tie = new StaveTie({
                    first_note: sn1,
                    last_note: sn2,
                    first_indices: firstIndices,
                    last_indices: lastIndices,
                  });
                  tie.setContext(vexCtx).draw();
                } catch (e) {
                  console.warn('Could not draw intra-measure tie:', e);
                }
              }
            }
          }

          // 2. Inter-measure ties within the same system
          if (mIdx < systemMeasureNotes.length - 1) {
            const nextMNotes = systemMeasureNotes[mIdx + 1];
            const nextStaveNotes = hand === 'right' ? nextMNotes.rightNotes : nextMNotes.leftNotes;
            const nextInfoMap = hand === 'right' ? nextMNotes.rightInfoMap : nextMNotes.leftInfoMap;

            staveNotes.forEach(sn1 => {
              const i1 = infoMap.get(sn1.getAttribute('id'));
              if (!i1 || !i1.isTieStart || !i1.isTieStart.some(Boolean)) return;

              const sn2 = nextStaveNotes.find(candidate => {
                const i2 = nextInfoMap.get(candidate.getAttribute('id'));
                if (!i2 || !i2.isTieEnd || !i2.isTieEnd.some(Boolean)) return false;
                const { firstIndices } = getMatchedTieIndices(i1, i2);
                return firstIndices.length > 0;
              });

              if (sn2) {
                const i2 = nextInfoMap.get(sn2.getAttribute('id'))!;
                const { firstIndices, lastIndices } = getMatchedTieIndices(i1, i2);
                if (firstIndices.length > 0) {
                  try {
                    const tie = new StaveTie({
                      first_note: sn1,
                      last_note: sn2,
                      first_indices: firstIndices,
                      last_indices: lastIndices,
                    });
                    tie.setContext(vexCtx).draw();
                  } catch (e) {
                    console.warn('Could not draw inter-measure tie:', e);
                  }
                }
              }
            });
          }

          // 3. Cross-system ties (system boundary)
          if (mIdx === systemMeasureNotes.length - 1 && sysIdx < systems.length - 1) {
            staveNotes.forEach(sn1 => {
              const i1 = infoMap.get(sn1.getAttribute('id'));
              if (i1 && i1.isTieStart && i1.isTieStart.some(Boolean)) {
                const firstIndices = i1.isTieStart.map((v, idx) => v ? idx : -1).filter(idx => idx !== -1);
                if (firstIndices.length > 0) {
                  try {
                    const tie = new StaveTie({
                      first_note: sn1,
                      first_indices: firstIndices,
                    });
                    tie.setContext(vexCtx).draw();
                  } catch (e) {
                    console.warn('Could not draw tie-out at system end:', e);
                  }
                }
              }
            });
          }

          if (mIdx === 0 && sysIdx > 0) {
            staveNotes.forEach(sn2 => {
              const i2 = infoMap.get(sn2.getAttribute('id'));
              if (i2 && i2.isTieEnd && i2.isTieEnd.some(Boolean)) {
                const lastIndices = i2.isTieEnd.map((v, idx) => v ? idx : -1).filter(idx => idx !== -1);
                if (lastIndices.length > 0) {
                  try {
                    const tie = new StaveTie({
                      last_note: sn2,
                      last_indices: lastIndices,
                    });
                    tie.setContext(vexCtx).draw();
                  } catch (e) {
                    console.warn('Could not draw tie-in at system start:', e);
                  }
                }
              }
            });
          }
        });
      };

      drawTiesForHand('right');
      if (!isDrum) drawTiesForHand('left');
    });

    setNotePositions(newPositions);
    setNotePositionsByNoteId(newPositionsByNoteId);
    setRenderedLayoutId(prev => prev + 1);
  }, [vexFlowData, systems, width, height, instrumentMode, resolutionScale, noteLabelType, notationColor, sheetMusicZoom]);

  // Find currently active measure and system based on currentTimeMs
  const activeMeasureInfo = useMemo(() => {
    if (!vexFlowData || vexFlowData.measures.length === 0) return null;
    let mIdx = vexFlowData.measures.findIndex(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs);
    if (mIdx === -1) {
      if (currentTimeMs >= (vexFlowData.measures[vexFlowData.measures.length - 1]?.endTimeMs || 0)) {
        mIdx = vexFlowData.measures.length - 1;
      } else {
        mIdx = 0;
      }
    }

    const measure = vexFlowData.measures[mIdx];
    const system = systems.find(s => mIdx >= s.firstMeasureIndex && mIdx <= s.lastMeasureIndex);
    const systemMeasure = system?.measures.find(m => m.globalIndex === mIdx);

    return {
      measureIndex: mIdx,
      measure,
      system,
      systemMeasure,
    };
  }, [vexFlowData, systems, currentTimeMs]);

  // Traditional Sheet Music Dynamic Markings (p, mp, mf, f, ff, etc.) per Beat:
  // Dynamically tracked per beat whenever dynamic changes (cukup per BEAT saja agar tidak lag)!
  const dynamicEvents = useMemo(() => {
    const sourceNotes = notes && notes.length > 0 ? notes : (vexFlowData?.fragments || []);
    if (!sourceNotes || sourceNotes.length === 0) return [];
    const notesWithVelocity: { timeMs: number; velocity: number; noteId: string }[] = [];

    sourceNotes.forEach(on => {
      if (on.velocity !== undefined && on.velocity !== null && on.velocity > 0) {
        notesWithVelocity.push({
          timeMs: on.timeMs,
          velocity: on.velocity,
          noteId: (on as any).noteId || (on as any).fragmentId || '',
        });
      }
    });

    notesWithVelocity.sort((a, b) => a.timeMs - b.timeMs);

    const msPerBeat = 60000 / Math.max(30, initialTempoBpm || 120);
    const events: { timeMs: number; dynamicMark: string; noteId: string }[] = [];
    let lastDynamic = '';
    let lastTimeMs = -Infinity;

    for (const item of notesWithVelocity) {
      const dyn = getDynamicFromVelocity(item.velocity);
      // Cukup per BEAT saja jika dinamika berubah nyata (minimal interval 1 beat)
      if (!lastDynamic || (dyn !== lastDynamic && item.timeMs - lastTimeMs >= msPerBeat * 0.9)) {
        events.push({
          timeMs: item.timeMs,
          dynamicMark: dyn,
          noteId: item.noteId,
        });
        lastDynamic = dyn;
        lastTimeMs = item.timeMs;
      }
    }

    return events;
  }, [notes, vexFlowData, initialTempoBpm]);

  // Tempo Events per Beat:
  // Tracked at exact beat / timeMs across the score whenever tempo changes (cukup per BEAT saja)!
  const effectiveTempoEvents = useMemo(() => {
    const events: { timeMs: number; bpm: number }[] = [];
    const sorted = [...(tempoEvents || [])].sort((a, b) => a.timeMs - b.timeMs);
    let lastBpm = -1;
    let lastTimeMs = -Infinity;

    const startBpm = Math.round((initialTempoBpm || 120) * playbackTempoMultiplier);
    if (sorted.length === 0 || sorted[0].timeMs > 0) {
      events.push({ timeMs: 0, bpm: startBpm });
      lastBpm = startBpm;
      lastTimeMs = 0;
    }

    const msPerBeat = 60000 / Math.max(30, startBpm);
    for (const te of sorted) {
      const effectiveBpm = Math.round(te.bpm * playbackTempoMultiplier);
      // Cukup per beat saja jika tempo berubah nyata (>= 2 BPM)
      if (Math.abs(effectiveBpm - lastBpm) >= 2 && (te.timeMs - lastTimeMs >= msPerBeat * 0.9)) {
        events.push({ timeMs: te.timeMs, bpm: effectiveBpm });
        lastBpm = effectiveBpm;
        lastTimeMs = te.timeMs;
      }
    }

    return events;
  }, [tempoEvents, initialTempoBpm, playbackTempoMultiplier]);

  // Precompute tempo markings and dynamic markings per system layout ONCE
  // so rendering frames at 60-120fps does zero linear searches over notePositions!
  const systemOverlayData = useMemo(() => {
    const tempoBySystem = new Map<number, Array<{ key: string; textX: number; bpm: number }>>();
    const dynamicsBySystem = new Map<number, Array<{ key: string; textX: number; textY: number; mark: string }>>();
    const octavesBySystem = new Map<number, Array<{
      key: string;
      type: '8va' | '15ma' | '8vb' | '15mb';
      startX: number;
      endX: number;
      textY: number;
      lineY: number;
      hookY: number;
    }>>();
    const isDrum = instrumentMode === 'drum';
    const textY = isDrum ? (TOP_STAVE_Y + 68) : (TOP_STAVE_Y + 88);

    systems.forEach((system, sysIdx) => {
      const systemFirstMeasure = system.measures[0]?.measure;
      const systemLastMeasure = system.measures[system.measures.length - 1]?.measure;
      const systemStartTime = systemFirstMeasure ? systemFirstMeasure.startTimeMs : 0;
      const systemEndTime = systemLastMeasure ? systemLastMeasure.endTimeMs : Infinity;

      // Tempo
      const tItems: Array<{ key: string; textX: number; bpm: number }> = [];
      let lastTempoX = -999;
      effectiveTempoEvents
        .filter(te => (sysIdx === 0 && te.timeMs < systemStartTime) || (te.timeMs >= systemStartTime && te.timeMs < systemEndTime))
        .forEach((te, idx) => {
          let targetX: number | null = null;
          for (const [_, pos] of notePositions) {
            if (pos.systemIndex === sysIdx && Math.abs(pos.timeMs - te.timeMs) < 25) {
              targetX = pos.x;
              break;
            }
          }
          const mLayout = system.measures.find(m => te.timeMs >= m.measure.startTimeMs && te.timeMs < m.measure.endTimeMs) || system.measures[0];
          if (targetX === null && mLayout) {
            const mStartX = mLayout.x + (mLayout.isFirstInSystem ? mLayout.noteStartX : 0);
            const mWidth = mLayout.width - (mLayout.isFirstInSystem ? mLayout.noteStartX : 0);
            const mDuration = Math.max(1, mLayout.measure.endTimeMs - mLayout.measure.startTimeMs);
            const progress = Math.max(0, Math.min(1, (te.timeMs - mLayout.measure.startTimeMs) / mDuration));
            targetX = mStartX + progress * Math.max(10, mWidth - 16);
          }
          const textX = Math.max(mLayout ? mLayout.x + 4 : 4, targetX ?? 20);
          // Dedup tempo labels horizontally (min 65px distance) to prevent overlapping text
          if (textX - lastTempoX >= 65) {
            tItems.push({ key: `tempo-${sysIdx}-${idx}-${te.timeMs}`, textX, bpm: te.bpm });
            lastTempoX = textX;
          }
        });
      tempoBySystem.set(sysIdx, tItems);

      // Dynamics
      const dItems: Array<{ key: string; textX: number; textY: number; mark: string }> = [];
      if (showDynamics) {
        dynamicEvents
          .filter(de => (sysIdx === 0 && de.timeMs < systemStartTime) || (de.timeMs >= systemStartTime && de.timeMs < systemEndTime))
          .forEach((de, idx) => {
            let targetX: number | null = null;
            const pos = notePositions.get(de.noteId) || notePositions.get(`${de.noteId}-0`);
            if (pos && pos.systemIndex === sysIdx) {
              targetX = pos.x;
            } else {
              for (const [_, p] of notePositions) {
                if (p.systemIndex === sysIdx && Math.abs(p.timeMs - de.timeMs) < 25) {
                  targetX = p.x;
                  break;
                }
              }
            }
            const mLayout = system.measures.find(m => de.timeMs >= m.measure.startTimeMs && de.timeMs < m.measure.endTimeMs) || system.measures[0];
            if (targetX === null && mLayout) {
              const mStartX = mLayout.x + (mLayout.isFirstInSystem ? mLayout.noteStartX : 0);
              const mWidth = mLayout.width - (mLayout.isFirstInSystem ? mLayout.noteStartX : 0);
              const mDuration = Math.max(1, mLayout.measure.endTimeMs - mLayout.measure.startTimeMs);
              const progress = Math.max(0, Math.min(1, (de.timeMs - mLayout.measure.startTimeMs) / mDuration));
              targetX = mStartX + progress * Math.max(10, mWidth - 16);
            }
            const textX = Math.max(mLayout ? mLayout.x + 4 : 4, targetX ?? 20);
            dItems.push({ key: `dynamic-${sysIdx}-${idx}-${de.timeMs}`, textX, textY, mark: de.dynamicMark });
          });
      }
      dynamicsBySystem.set(sysIdx, dItems);

      // Octaves per Bar (Measure)
      const octItems: Array<{
        key: string;
        type: '8va' | '15ma' | '8vb' | '15mb';
        startX: number;
        endX: number;
        textY: number;
        lineY: number;
        hookY: number;
      }> = [];

      const buildMeasureOctaveSpans = (isRightHand: boolean) => {
        let currentMeasures: SystemMeasureLayout[] = [];
        let currentType: '8va' | '15ma' | '8vb' | '15mb' | undefined = undefined;

        const flushMeasureGroup = () => {
          if (currentMeasures.length === 0 || !currentType) return;
          const firstM = currentMeasures[0];
          const lastM = currentMeasures[currentMeasures.length - 1];
          const sX = Math.max(4, firstM.x + (firstM.isFirstInSystem ? firstM.noteStartX : 8));
          const eX = Math.max(sX + 24, lastM.x + lastM.width - 6);

          if (isRightHand) {
            octItems.push({
              key: `oct-rh-${sysIdx}-bar-${firstM.globalIndex}`,
              type: currentType,
              startX: sX,
              endX: eX,
              textY: TOP_STAVE_Y - 14,
              lineY: TOP_STAVE_Y - 18,
              hookY: TOP_STAVE_Y - 12,
            });
          } else {
            octItems.push({
              key: `oct-lh-${sysIdx}-bar-${firstM.globalIndex}`,
              type: currentType,
              startX: sX,
              endX: eX,
              textY: TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 104,
              lineY: TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 100,
              hookY: TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 94,
            });
          }
          currentMeasures = [];
          currentType = undefined;
        };

        system.measures.forEach(mLayout => {
          const shiftType: '8va' | '15ma' | '8vb' | '15mb' | undefined = isRightHand
            ? (mLayout.measure.is15maActiveRH ? '15ma' : mLayout.measure.is8vaActiveRH ? '8va' : undefined)
            : (mLayout.measure.is15mbActiveLH ? '15mb' : mLayout.measure.is8vbActiveLH ? '8vb' : undefined);

          if (shiftType) {
            if (!currentType) {
              currentType = shiftType;
              currentMeasures.push(mLayout);
            } else if (currentType === shiftType) {
              currentMeasures.push(mLayout);
            } else {
              flushMeasureGroup();
              currentType = shiftType;
              currentMeasures.push(mLayout);
            }
          } else {
            flushMeasureGroup();
          }
        });
        flushMeasureGroup();
      };

      if (!isDrum) {
        buildMeasureOctaveSpans(true);
        buildMeasureOctaveSpans(false);
      }
      octavesBySystem.set(sysIdx, octItems);
    });

    return { tempoBySystem, dynamicsBySystem, octavesBySystem };
  }, [systems, effectiveTempoEvents, dynamicEvents, notePositions, showDynamics, instrumentMode]);

  // Compute smooth playhead X coordinate within active measure:
  // Monotonically interpolates from note to note within the active measure
  const playheadHighlightInfo = useMemo(() => {
    if (!activeMeasureInfo || !activeMeasureInfo.system || !activeMeasureInfo.systemMeasure) return null;
    const { system, systemMeasure, measure } = activeMeasureInfo;
    const isDrum = instrumentMode === 'drum';

    // 1. If there are notes currently waiting in activePlaybackNotesInfo, lock playhead directly to that notehead
    const waitingEntry = Array.from(activePlaybackNotesInfo.entries()).find(([_, info]) => info.status === 'waiting');
    if (waitingEntry) {
      const noteId = waitingEntry[0];
      const pos = notePositions.get(noteId) || notePositions.get(`${noteId}-0`);
      if (pos && pos.systemIndex === system.systemIndex) {
        return {
          systemIndex: system.systemIndex,
          x: pos.x + pos.w / 2,
          y: TOP_STAVE_Y - 4,
          w: 2,
          h: isDrum ? 86 : (VERTICAL_STAFF_SPACING + 72),
        };
      }
    }

    // 2. Interpolate within active measure's note anchors
    const measureStartX = systemMeasure.x + (systemMeasure.isFirstInSystem ? systemMeasure.noteStartX : 15);
    const measureEndX = systemMeasure.x + systemMeasure.width;

    const measureNotePositions = Array.from(notePositions.values())
      .filter(np => np.systemIndex === system.systemIndex && np.measureIndex === activeMeasureInfo.measureIndex);

    const timeToXMap = new Map<number, number[]>();
    measureNotePositions.forEach(np => {
      if (!timeToXMap.has(np.timeMs)) timeToXMap.set(np.timeMs, []);
      timeToXMap.get(np.timeMs)!.push(np.x + np.w / 2);
    });

    const measureAnchors: { timeMs: number; x: number }[] = [];
    measureAnchors.push({ timeMs: measure.startTimeMs, x: measureStartX });

    Array.from(timeToXMap.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([t, xs]) => {
        const avgX = xs.reduce((sum, v) => sum + v, 0) / xs.length;
        if (t > measure.startTimeMs && t < measure.endTimeMs) {
          measureAnchors.push({ timeMs: t, x: avgX });
        }
      });

    measureAnchors.push({ timeMs: measure.endTimeMs, x: measureEndX });

    let currentX = measureStartX;
    if (currentTimeMs <= measureAnchors[0].timeMs) {
      currentX = measureAnchors[0].x;
    } else if (currentTimeMs >= measureAnchors[measureAnchors.length - 1].timeMs) {
      currentX = measureAnchors[measureAnchors.length - 1].x;
    } else {
      const nextIdx = measureAnchors.findIndex(pt => pt.timeMs > currentTimeMs);
      if (nextIdx > 0) {
        const prev = measureAnchors[nextIdx - 1];
        const next = measureAnchors[nextIdx];
        const span = next.timeMs - prev.timeMs;
        const ratio = span > 0 ? (currentTimeMs - prev.timeMs) / span : 0;
        currentX = prev.x + (next.x - prev.x) * ratio;
      }
    }

    return {
      systemIndex: system.systemIndex,
      x: currentX,
      y: TOP_STAVE_Y - 4,
      w: 2,
      h: isDrum ? 86 : (VERTICAL_STAFF_SPACING + 72),
    };
  }, [activeMeasureInfo, notePositions, activePlaybackNotesInfo, currentTimeMs, instrumentMode]);

  // Reset to Bar 1 at top when entering in-game or when currentTimeMs === 0
  useEffect(() => {
    if (currentTimeMs === 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      lastActiveSystemRef.current = -1;
    }
  }, [currentTimeMs]);

  useEffect(() => {
    lastActiveSystemRef.current = -1;
  }, [sheetMusicZoom]);

  useEffect(() => {
    if (renderedLayoutId > 0 && currentTimeMs === 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      lastActiveSystemRef.current = -1;
    }
  }, [renderedLayoutId, currentTimeMs]);

  const isPlayingPrevRef = useRef(isPlaying);
  useEffect(() => {
    if (isPlaying && !isPlayingPrevRef.current) {
      // Force re-centering on active system when user starts playing
      lastActiveSystemRef.current = -1;
    }
    isPlayingPrevRef.current = isPlaying;
  }, [isPlaying]);

  // Smooth vertical auto-scroll: Keep active system row comfortably in view below the top HUD
  useEffect(() => {
    if (!activeMeasureInfo?.system || !scrollContainerRef.current) return;
    const activeSysIdx = activeMeasureInfo.system.systemIndex;

    if (activeSysIdx !== lastActiveSystemRef.current) {
      lastActiveSystemRef.current = activeSysIdx;

      const container = scrollContainerRef.current;
      if (activeSysIdx === 0) {
        container.scrollTo({
          top: 0,
          behavior: isPlaying ? 'smooth' : 'auto',
        });
        return;
      }

      const targetEl = systemDivRefs.current[activeSysIdx];
      if (targetEl && container) {
        // Measure element's absolute offset from the top of the container content
        let elementAbsoluteTop = targetEl.offsetTop;
        let parent = targetEl.offsetParent as HTMLElement | null;
        while (parent && parent !== container) {
          elementAbsoluteTop += parent.offsetTop;
          parent = parent.offsetParent as HTMLElement | null;
        }

        const targetHeight = targetEl.offsetHeight || activeMeasureInfo.system.height;
        const containerHeight = container.clientHeight;

        // Position active system comfortably near the top of the viewing area
        // with sufficient clearance so it stays well below the top HUD bar and never gets covered.
        const desiredTopOffset = SHEET_TOP_PADDING_PX;

        const targetTop = Math.max(0, Math.round(elementAbsoluteTop - desiredTopOffset));

        container.scrollTo({
          top: targetTop,
          behavior: isPlaying ? 'smooth' : 'auto',
        });
      }
    }
  }, [activeMeasureInfo, isPlaying]);

  // Click on a measure in the sheet music to seek to its start time
  const handleMeasureClick = useCallback((measureStartTimeMs: number) => {
    lastActiveSystemRef.current = -1;
    onSeek(measureStartTimeMs);
  }, [onSeek]);

  return (
    <div
      className="sheet-container relative select-none overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: backgroundColor || 'transparent',
        color: notationColor,
      }}
    >
      {/* Vertically Scrollable Sheet Music Area */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden relative"
        style={{
          paddingTop: `${SHEET_TOP_PADDING_PX}px`,
          paddingBottom: `${Math.max(200, height * 0.5)}px`,
        }}
      >
        <div
          className="mx-auto flex flex-col items-center"
          style={{
            paddingLeft: `${SYSTEM_PADDING_X}px`,
            paddingRight: `${SYSTEM_PADDING_X}px`,
            maxWidth: `${width}px`,
          }}
        >
          {systems.map((system, sysIdx) => {
            const isSystemActive = playheadHighlightInfo?.systemIndex === sysIdx;

            return (
              <div
                key={`system-${sysIdx}`}
                ref={el => { systemDivRefs.current[sysIdx] = el; }}
                className="relative"
                style={{
                  width: `${system.width}px`,
                  height: `${system.height}px`,
                  marginBottom: `${isDrum ? DRUM_SYSTEM_SPACING : 12}px`,
                  borderRadius: '6px',
                }}
              >
                {/* VexFlow System Canvas */}
                <canvas
                  ref={el => { canvasRefs.current[sysIdx] = el; }}
                  className="absolute top-0 left-0"
                  style={{
                    width: `${system.width}px`,
                    height: `${system.height}px`,
                  }}
                />

                {/* SVG Overlay: Playhead cursor, Measure numbers, Octaves, Tempo, Notehead Highlights.
                    preserveAspectRatio="none" ensures exact pixel-perfect 1:1 match with canvas! */}
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: `${system.width}px`,
                    height: `${system.height}px`,
                    zIndex: 10,
                  }}
                  viewBox={`0 0 ${system.virtualWidth} ${system.virtualHeight}`}
                  preserveAspectRatio="none"
                >
                  {/* Measure Numbers */}
                  {system.measures.map((mLayout) => {
                    const measureNum = mLayout.globalIndex + 1;
                    const textX = mLayout.x + (mLayout.isFirstInSystem ? mLayout.noteStartX - 28 : 2);
                    const isSystemFirst = mLayout.isFirstInSystem;

                    return (
                      <g key={`measure-header-${mLayout.globalIndex}`}>
                        <text
                          x={Math.max(2, textX)}
                          y={TOP_STAVE_Y - 8}
                          fontFamily="'Times New Roman', Cambria, Georgia, serif"
                          fontSize={isSystemFirst ? '14' : '12'}
                          fontWeight={isSystemFirst ? 'bold' : 'normal'}
                          fill={notationColor}
                        >
                          {measureNum}
                        </text>
                      </g>
                    );
                  })}

                  {/* Octave Markings: Rendered per beat directly from precalculated overlay data */}
                  {(systemOverlayData.octavesBySystem?.get(sysIdx) || []).map(oItem => (
                    <g key={oItem.key} fill={notationColor} stroke={notationColor} strokeWidth="0.8">
                      <text x={oItem.startX} y={oItem.textY} fontSize="11" fontStyle="italic" fontWeight="bold" stroke="none">
                        {oItem.type}
                      </text>
                      <line
                        x1={oItem.startX + (oItem.type.startsWith('15') ? 28 : 22)}
                        y1={oItem.lineY}
                        x2={oItem.endX}
                        y2={oItem.lineY}
                        strokeDasharray="3,3"
                      />
                      <line x1={oItem.endX} y1={oItem.lineY} x2={oItem.endX} y2={oItem.hookY} />
                    </g>
                  ))}

                  {/* Tempo Markings: Rendered per beat directly from precalculated overlay data */}
                  {(systemOverlayData.tempoBySystem.get(sysIdx) || []).map(tItem => (
                    <text
                      key={tItem.key}
                      x={tItem.textX}
                      y={TOP_STAVE_Y - 10}
                      fontSize="13"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      fill={notationColor}
                    >
                      ♩ = {tItem.bpm}
                    </text>
                  ))}

                  {/* Traditional Sheet Music Dynamics per Beat: Centered between staves from precalculated overlay data */}
                  {showDynamics && (systemOverlayData.dynamicsBySystem.get(sysIdx) || []).map(dItem => (
                    <g key={dItem.key}>
                      <text
                        x={dItem.textX}
                        y={dItem.textY}
                        fontFamily="'Times New Roman', Cambria, Georgia, serif"
                        fontSize="22"
                        fontStyle="italic"
                        fontWeight="900"
                        dominantBaseline="central"
                        fill={notationColor}
                      >
                        {dItem.mark}
                      </text>
                    </g>
                  ))}

                  {/* Sleek Playhead Indicator Line: slender cursor across staves */}
                  {isSystemActive && playheadHighlightInfo && (
                    <g key={`playhead-${sysIdx}`}>
                      <line
                        x1={playheadHighlightInfo.x}
                        y1={playheadHighlightInfo.y}
                        x2={playheadHighlightInfo.x}
                        y2={playheadHighlightInfo.y + playheadHighlightInfo.h}
                        stroke="rgba(239, 68, 68, 0.9)"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                      <polygon
                        points={`
                          ${playheadHighlightInfo.x - 4},${playheadHighlightInfo.y}
                          ${playheadHighlightInfo.x + 4},${playheadHighlightInfo.y}
                          ${playheadHighlightInfo.x},${playheadHighlightInfo.y + 6}
                        `}
                        fill="rgba(239, 68, 68, 0.95)"
                      />
                    </g>
                  )}

                  {/* User Note Glow Highlights: ONLY for user notes (played or waiting).
                      No left/right hand color distinction. Perfectly tailored to notehead ellipse tilted at -20 deg */}
                  {Array.from(activePlaybackNotesInfo.entries()).map(([noteId, info]) => {
                    if (info.status !== 'user_played' && info.status !== 'waiting') return null;
                    const positions = notePositionsByNoteId.get(noteId)
                      || notePositionsByNoteId.get(`${noteId}-0`)
                      || (notePositions.get(noteId) ? [notePositions.get(noteId)!] : (notePositions.get(`${noteId}-0`) ? [notePositions.get(`${noteId}-0`)!] : []));
                    if (!positions || positions.length === 0) return null;

                    const isWaiting = info.status === 'waiting';
                    const highlightColor = isWaiting ? '#f59e0b' : (hitNoteColor || '#10b981');

                    return positions.map((pos, pIdx) => {
                      if (!pos || pos.systemIndex !== sysIdx) return null;
                      const cx = pos.x + pos.w / 2;
                      const cy = pos.y + pos.h / 2;

                      return (
                        <g key={`hit-${noteId}-${pIdx}`} transform={`rotate(-20, ${cx}, ${cy})`}>
                          {/* Soft ambient glow */}
                          <ellipse
                            cx={cx}
                            cy={cy}
                            rx={9}
                            ry={6}
                            fill={highlightColor}
                            opacity={isWaiting ? 0.35 : 0.4}
                          />
                          {/* Notehead highlight matching note shape */}
                          <ellipse
                            cx={cx}
                            cy={cy}
                            rx={6.8}
                            ry={4.5}
                            fill={highlightColor}
                            opacity={isWaiting ? 0.8 : 0.9}
                            stroke={isWaiting ? '#fbbf24' : '#34d399'}
                            strokeWidth={1}
                          />
                        </g>
                      );
                    });
                  })}
                </svg>

                {/* Clickable Measure Hitboxes for Seeking */}
                {system.measures.map((mLayout) => (
                  <div
                    key={`hitbox-${mLayout.globalIndex}`}
                    className="absolute cursor-pointer hover:bg-black/[0.03] transition-colors rounded"
                    style={{
                      left: `${Math.round(mLayout.x * system.scale)}px`,
                      top: 0,
                      width: `${Math.round(mLayout.width * system.scale)}px`,
                      height: `${system.height}px`,
                      zIndex: 20,
                    }}
                    onClick={() => handleMeasureClick(mLayout.measure.startTimeMs)}
                    title={`Measure ${mLayout.globalIndex + 1} - Click to seek`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading state indicator */}
      {!vexFlowData && notes.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
          <p className="text-slate-300 font-medium animate-pulse">
            Rendering Sheet Music...
          </p>
        </div>
      )}
    </div>
  );
});

export default VexFlowSheetMusicView;
