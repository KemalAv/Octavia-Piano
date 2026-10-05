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
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
  Tuplet,
  Fraction,
  FretHandFinger,
  Modifier,
  Annotation,
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
const VIRTUAL_DRUM_SYSTEM_HEIGHT = 160;
const SYSTEM_SPACING = 16;
const SYSTEM_PADDING_X = 20;

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
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
  resolutionScale?: number;
  noteLabelType?: NoteLabelType;
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
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const systemDivRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [renderedLayoutId, setRenderedLayoutId] = useState(0);
  const [notePositions, setNotePositions] = useState<Map<string, NotePosInfo>>(new Map());
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
        true,
        tempoEvents,
        playbackTempoMultiplier,
        false,
        instrumentMode
      );
    } catch (e) {
      console.error('Error generating VexFlow render data:', e);
      return null;
    }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, tempoEvents, playbackTempoMultiplier, instrumentMode]);

  // Dynamic system wrapping:
  // Packs measures cleanly. If a measure would exceed the line width, it wraps to the line below
  // so bars are never squashed or cut off halfway, guaranteed across all screen widths.
  const systems = useMemo<SystemLayout[]>(() => {
    if (!vexFlowData || vexFlowData.measures.length === 0) return [];

    const isDrum = instrumentMode === 'drum';
    const systemDisplayWidth = Math.max(280, Math.floor(width - SYSTEM_PADDING_X * 2));
    const virtualSystemWidth = Math.floor(systemDisplayWidth / NOTATION_SCALE);
    const virtualSystemHeight = isDrum ? VIRTUAL_DRUM_SYSTEM_HEIGHT : VIRTUAL_SYSTEM_HEIGHT;
    const systemDisplayHeight = Math.floor(virtualSystemHeight * NOTATION_SCALE);

    // Responsive limit on max measures per line to ensure no measure is ever crushed or cut off
    let maxMeasuresPerLine = 4;
    if (virtualSystemWidth < 550) maxMeasuresPerLine = 1;
    else if (virtualSystemWidth < 850) maxMeasuresPerLine = 2;
    else if (virtualSystemWidth < 1200) maxMeasuresPerLine = 3;
    else maxMeasuresPerLine = 4;

    const allMeasures = vexFlowData.measures;
    const result: SystemLayout[] = [];

    let currentSystemMeasures: { measure: VexFlowMeasureData; globalIndex: number }[] = [];
    let currentSystemIndex = 0;
    let accumulatedWidth = 0;

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
      
      // Calculate realistic required width based on note count so notes never overflow
      const noteCount = Math.max(m.rightHand.length, m.leftHand.length, 1);
      const minContentWidth = Math.max(120, noteCount * 26);
      const mReqWidth = Math.max(minContentWidth, m.width) + extraLead;

      const wouldExceed = accumulatedWidth + mReqWidth > virtualSystemWidth;
      const hasAtLeastOneMeasure = currentSystemMeasures.length >= 1;
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
        const totalBaseWidth = currentSystemMeasures.reduce((sum, item) => sum + Math.max(80, item.measure.width), 0);
        const availableForContent = Math.max(100, virtualSystemWidth - lineExtraLead);

        let curX = 0;
        const measureLayouts: SystemMeasureLayout[] = currentSystemMeasures.map((item, mIdx) => {
          const isFirst = mIdx === 0;
          const isLast = mIdx === currentSystemMeasures.length - 1;
          const prop = Math.max(80, item.measure.width) / totalBaseWidth;
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

        result.push({
          systemIndex: currentSystemIndex,
          measures: measureLayouts,
          width: systemDisplayWidth,
          height: systemDisplayHeight,
          virtualWidth: virtualSystemWidth,
          virtualHeight: virtualSystemHeight,
          startY: 32 + currentSystemIndex * (systemDisplayHeight + SYSTEM_SPACING),
          firstMeasureIndex: firstIdx,
          lastMeasureIndex: lastIdx,
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
      const totalBaseWidth = currentSystemMeasures.reduce((sum, item) => sum + Math.max(80, item.measure.width), 0);
      const availableForContent = Math.max(100, virtualSystemWidth - lineExtraLead);

      let curX = 0;
      const shouldJustify = currentSystemIndex === 0 || currentSystemMeasures.length >= 3;

      const measureLayouts: SystemMeasureLayout[] = currentSystemMeasures.map((item, mIdx) => {
        const isFirst = mIdx === 0;
        const isLast = mIdx === currentSystemMeasures.length - 1;
        const prop = Math.max(80, item.measure.width) / totalBaseWidth;
        const contentW = shouldJustify ? prop * availableForContent : Math.max(120, item.measure.width * 1.15);
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

      result.push({
        systemIndex: currentSystemIndex,
        measures: measureLayouts,
        width: systemDisplayWidth,
        height: systemDisplayHeight,
        virtualWidth: virtualSystemWidth,
        virtualHeight: virtualSystemHeight,
        startY: 32 + currentSystemIndex * (systemDisplayHeight + SYSTEM_SPACING),
        firstMeasureIndex: firstIdx,
        lastMeasureIndex: lastIdx,
      });
    }

    return result;
  }, [vexFlowData, width, instrumentMode]);

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
      setRenderedLayoutId(prev => prev + 1);
      return;
    }

    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1) * (resolutionScale || 1.0);
    const newPositions = new Map<string, NotePosInfo>();
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

      // Scale context directly by (DPR * NOTATION_SCALE)
      // Note: Do NOT call renderer.resize() as it applies window.devicePixelRatio a second time
      ctx.scale(dpr * NOTATION_SCALE, dpr * NOTATION_SCALE);

      const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
      const vexCtx = renderer.getContext();
      (vexCtx as any).setFillStyle = function (style: string) {
        this.fillStyle = style;
      };

      system.measures.forEach((mLayout) => {
        const { measure, isFirstInSystem, isLastInSystem, globalIndex } = mLayout;
        const curX = mLayout.x;
        const curW = mLayout.width;
        const activeMeasureKey = measure.activeKeySignature || vexFlowData.keySignature || 'C';

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

          const direction = onOrAboveCount > belowCount
            ? StaveNote.STEM_DOWN
            : belowCount > onOrAboveCount
              ? StaveNote.STEM_UP
              : farthestLine >= 2 ? StaveNote.STEM_DOWN : StaveNote.STEM_UP;

          n.setStemDirection(direction);
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

        const rightStaveNotes: StaveNote[] = [];
        const rightInfoMap = new Map<string, VexFlowNoteInfo>();
        measure.rightHand.forEach(info => {
          const isDup = rightStaveNotes.some(sn => {
            const rh = rightInfoMap.get(sn.getAttribute('id'));
            return rh && Math.abs(rh.timeMs - info.timeMs) < 1 && rh.midiValue === info.midiValue;
          });
          if (!isDup) {
            const sn = createStaveNote(info);
            rightStaveNotes.push(sn);
            rightInfoMap.set(info.vexNoteId, info);
          }
        });

        const leftStaveNotes: StaveNote[] = [];
        const leftInfoMap = new Map<string, VexFlowNoteInfo>();
        measure.leftHand.forEach(info => {
          const isDupInt = leftStaveNotes.some(sn => {
            const lh = leftInfoMap.get(sn.getAttribute('id'));
            return lh && Math.abs(lh.timeMs - info.timeMs) < 1 && lh.midiValue === info.midiValue;
          });
          const isDupAcross = rightStaveNotes.some(sn => {
            const rh = rightInfoMap.get(sn.getAttribute('id'));
            return rh && Math.abs(rh.timeMs - info.timeMs) < 1 && rh.midiValue === info.midiValue;
          });
          if (!isDupInt && !isDupAcross) {
            const sn = createStaveNote(info);
            leftStaveNotes.push(sn);
            leftInfoMap.set(info.vexNoteId, info);
          }
        });

        // Beams
        const buildBeams = (notesArr: StaveNote[], ts: TimeSignatureInfo, tupletGroups: VexFlowTupletGroup[]) => {
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
                beams.push(b);
                tNotes.forEach(n => beamedNoteIds.add(n.getAttribute('id')));
              } catch (e) {
                console.warn('Could not beam tuplet:', e);
              }
            }
          });

          // 2. Determine beaming groups for remaining notes based on time signature
          let groups = [new Fraction(1, 4)]; // Default: beam by quarter note
          if (ts.numerator === 6 && ts.denominator === 8) groups = [new Fraction(3, 8)];
          else if (ts.numerator === 9 && ts.denominator === 8) groups = [new Fraction(3, 8)];
          else if (ts.numerator === 12 && ts.denominator === 8) groups = [new Fraction(3, 8)];
          else if (ts.denominator === 2) groups = [new Fraction(1, 2)];
          
          // Split notes into contiguous runs of beamable notes to prevent VexFlow's generateBeams
          // from failing or dropping beams when non-beamable notes (quarter/half/whole notes or rests) are in the measure
          const runs: StaveNote[][] = [];
          let currentRun: StaveNote[] = [];

          for (const n of notesArr) {
            if (!n.isRest() && BEAMABLE_DURATIONS.has(n.getDuration()) && !beamedNoteIds.has(n.getAttribute('id'))) {
              currentRun.push(n);
            } else {
              if (currentRun.length > 1) {
                runs.push(currentRun);
              }
              currentRun = [];
            }
          }
          if (currentRun.length > 1) {
            runs.push(currentRun);
          }

          runs.forEach(run => {
            try {
              const autoBeams = Beam.generateBeams(run, {
                groups: groups,
                beam_middle_only: false,
                beam_rests: false,
                maintain_stem_directions: false,
              });
              if (autoBeams && autoBeams.length > 0) {
                autoBeams.forEach(ab => beams.push(ab));
              } else if (run.length > 1) {
                beams.push(new Beam(run, true));
              }
            } catch {
              try {
                beams.push(new Beam(run, true));
              } catch (e) {
                console.warn('Could not beam run:', e);
              }
            }
          });

          return beams;
        };

        const effTime = measure.effectiveTimeSignature || vexFlowData.timeSignature;
        const rightBeams = buildBeams(rightStaveNotes, effTime, measure.rightHandTuplets || []);
        const leftBeams = buildBeams(leftStaveNotes, effTime, measure.leftHandTuplets || []);

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

        if (rightStaveNotes.length > 0) {
          voices.push(new Voice({ num_beats: effTime.numerator, beat_value: effTime.denominator }).setStrict(false).addTickables(rightStaveNotes));
        }
        if (leftStaveNotes.length > 0) {
          voices.push(new Voice({ num_beats: effTime.numerator, beat_value: effTime.denominator }).setStrict(false).addTickables(leftStaveNotes));
        }

        if (voices.length > 0) {
          const noteStartX = Math.max(treble.getNoteStartX(), bass ? bass.getNoteStartX() : curX);
          const availableVoiceWidth = Math.max(40, curW - (noteStartX - curX) - 16);

          new Formatter().joinVoices(voices).format(voices, availableVoiceWidth);

          if (rightStaveNotes.length > 0) {
            voices[0].draw(vexCtx, treble);
          }
          if (leftStaveNotes.length > 0) {
            const lhVoice = rightStaveNotes.length > 0 ? voices[1] : voices[0];
            lhVoice.draw(vexCtx, isDrum ? treble : (bass as Stave));
          }

          rightBeams.forEach(b => b.setContext(vexCtx).draw());
          leftBeams.forEach(b => b.setContext(vexCtx).draw());
          rhTupletObjs.forEach(t => t.setContext(vexCtx).draw());
          lhTupletObjs.forEach(t => t.setContext(vexCtx).draw());
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

              if (info.fragmentMapping) {
                const m = info.fragmentMapping.find(xm => xm.keyIndex === hi);
                if (m) {
                  newPositions.set(m.fragmentId, posData);
                  const raw = m.fragmentId.replace(/-\d+$/, '');
                  if (raw) newPositions.set(raw, posData);
                }
              }

              if (info.originalNotes && info.originalNotes[hi]) {
                const on = info.originalNotes[hi];
                if (on.noteId) newPositions.set(on.noteId, posData);
                if (on.originalNoteId) newPositions.set(on.originalNoteId, posData);
                if (on.fragmentId) newPositions.set(on.fragmentId, posData);
              }

              newPositions.set(`${info.vexNoteId}-${hi}`, posData);
            });
          });
        };

        capture(rightStaveNotes, rightInfoMap);
        capture(leftStaveNotes, leftInfoMap);
      });
    });

    setNotePositions(newPositions);
    setRenderedLayoutId(prev => prev + 1);
  }, [vexFlowData, systems, width, height, instrumentMode, resolutionScale]);

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
        // (with a clean 40px clearance) so it doesn't drop too low, keeping
        // both the active line and the upcoming line below it clearly visible above the piano keys.
        const desiredTopOffset = 40;

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
        backgroundColor: backgroundColor || '#f7f5ed',
        color: '#1a1816',
      }}
    >
      {/* Vertically Scrollable Sheet Music Area */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden relative"
        style={{
          paddingTop: '20px',
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
                className="relative mb-3"
                style={{
                  width: `${system.width}px`,
                  height: `${system.height}px`,
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
                          fill="#262320"
                        >
                          {measureNum}
                        </text>
                      </g>
                    );
                  })}

                  {/* Octave Markings: Positioned safely over the measure notes without clef collision */}
                  {system.measures.map((mLayout) => {
                    const m = mLayout.measure;
                    const is15ma = m.is15maActiveRH;
                    const is8va = m.is8vaActiveRH;
                    const is15mb = m.is15mbActiveLH;
                    const is8vb = m.is8vbActiveLH;
                    const show8vaGroup = is8va || is15ma;
                    const show8vbGroup = is8vb || is15mb;
                    
                    const startX = mLayout.x + (mLayout.isFirstInSystem ? mLayout.noteStartX + 4 : 4);
                    const endX = mLayout.x + mLayout.width - 4;
                    const textX = startX;

                    return (
                      <g key={`octave-measure-${mLayout.globalIndex}`} fill="#262320" stroke="#262320" strokeWidth="0.8">
                        {show8vaGroup && (
                          <>
                            <text x={textX} y={TOP_STAVE_Y - 14} fontSize="11" fontStyle="italic" fontWeight="bold" stroke="none">
                              {is15ma ? '15ma' : '8va'}
                            </text>
                            <line 
                              x1={textX + (is15ma ? 28 : 22)} 
                              y1={TOP_STAVE_Y - 18} 
                              x2={endX} 
                              y2={TOP_STAVE_Y - 18} 
                              strokeDasharray="3,3" 
                            />
                            {mLayout.isLastInSystem && (
                               <line x1={endX} y1={TOP_STAVE_Y - 18} x2={endX} y2={TOP_STAVE_Y - 12} />
                            )}
                          </>
                        )}
                        {show8vbGroup && (
                          <>
                            <text x={textX} y={TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 104} fontSize="11" fontStyle="italic" fontWeight="bold" stroke="none">
                              {is15mb ? '15mb' : '8vb'}
                            </text>
                            <line 
                              x1={textX + (is15mb ? 28 : 22)} 
                              y1={TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 100} 
                              x2={endX} 
                              y2={TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 100} 
                              strokeDasharray="3,3" 
                            />
                            {mLayout.isLastInSystem && (
                               <line x1={endX} y1={TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 100} x2={endX} y2={TOP_STAVE_Y + VERTICAL_STAFF_SPACING + 56} />
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* Tempo Markings on Measure 1 or Tempo changes */}
                  {vexFlowData?.tempoMarkings.map((mark, index) => {
                    if (sysIdx === 0 && index === 0) {
                      return (
                        <text
                          key={`tempo-${index}`}
                          x={system.measures[0]?.noteStartX || 20}
                          y={TOP_STAVE_Y - 10}
                          fontSize="13"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          fill="#000"
                        >
                          ♩ = {mark.bpm}
                        </text>
                      );
                    }
                    return null;
                  })}

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
                    const pos = notePositions.get(noteId) || notePositions.get(`${noteId}-0`);
                    if (!pos || pos.systemIndex !== sysIdx) return null;

                    const isWaiting = info.status === 'waiting';
                    const highlightColor = isWaiting ? '#f59e0b' : (hitNoteColor || '#10b981');
                    const cx = pos.x + pos.w / 2;
                    const cy = pos.y + pos.h / 2;

                    return (
                      <g key={`hit-${noteId}`} transform={`rotate(-20, ${cx}, ${cy})`}>
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
                  })}
                </svg>

                {/* Clickable Measure Hitboxes for Seeking */}
                {system.measures.map((mLayout) => (
                  <div
                    key={`hitbox-${mLayout.globalIndex}`}
                    className="absolute cursor-pointer hover:bg-black/[0.03] transition-colors rounded"
                    style={{
                      left: `${Math.round(mLayout.x * NOTATION_SCALE)}px`,
                      top: 0,
                      width: `${Math.round(mLayout.width * NOTATION_SCALE)}px`,
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
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30">
          <p className="text-slate-600 font-medium animate-pulse">
            Rendering Sheet Music...
          </p>
        </div>
      )}
    </div>
  );
});

export default VexFlowSheetMusicView;
