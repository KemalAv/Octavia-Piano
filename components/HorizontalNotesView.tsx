
import React, { useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { Renderer, Stave, StaveConnector, Glyph, Accidental } from 'vexflow';
import { ActiveMidiNoteInfo, VexFlowRenderData, VexFlowNoteInfo, NoteFragment, NoteLabelType, QwertyLayout } from '../types';
import { USER_PLAY_COLOR, PLAY_LINE_THICKNESS_PX, VISUAL_NOTE_CAP_MS, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, formatKeySignatureForDisplay, darkenHex } from '../utils';

// --- Constants ---
const HORIZONTAL_PADDING = 30;
const SIDEBAR_WIDTH = 200; // Matched to VexFlowSheetMusicView
const STAFF_LINE_SPACING = 10;
const STEP_HEIGHT = STAFF_LINE_SPACING / 2;
const NOTE_HEAD_WIDTH = 12.5;
const STEM_WIDTH = 1.5;
const STEM_HEIGHT = 31.25;

interface HorizontalNotesViewProps {
  currentTimeMs: number;
  width: number;
  height: number;
  pixelsPerMillisecond: number;
  activePlaybackNotesInfo: Map<string, ActiveMidiNoteInfo>;
  rightHandColor: string;
  leftHandColor: string;
  hitNoteColor: string;
  backgroundColor: string;
  vexFlowData: VexFlowRenderData | null;
  showOnlyMajorNotes: boolean;
  noteLabelType: NoteLabelType;
  activeKeySignature: string;
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
  isQwertyView?: boolean;
  isMixedHandView?: boolean;
  activeBpmForDisplay?: number;
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
  isPaused?: boolean;
  onSeek?: (timeMs: number) => void;
  resolutionScale?: number;
}

// Binary search helper to find the starting fragment index in O(log N) time
function findFragmentStartIndex(
  fragments: NoteFragment[],
  targetMinTimeMs: number
): number {
  let low = 0;
  let high = fragments.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const frag = fragments[mid];
    const duration = frag.durationMs || 0;
    if (frag.timeMs + duration >= targetMinTimeMs) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

function getStaffLineForNote(
  midi: number,
  hand: 'right' | 'left',
  pitchClass: string,
  keySignature: string,
  isDrum: boolean,
  vexKeyProps?: { line: number }
): number {
  if (isDrum) {
    if ([35, 36].includes(midi)) return 1.5; // Bass drum (f/4)
    if ([38, 40].includes(midi)) return 3.5; // Snare (c/5)
    if ([41, 43].includes(midi)) return 2.5; // Floor Tom (a/4)
    if ([45, 47].includes(midi)) return 3.0; // Low Tom (b/4)
    if (midi === 48) return 4.0; // Hi-Mid Tom (d/5)
    if (midi === 50) return 4.5; // High Tom (e/5)
    if ([42, 46].includes(midi)) return 5.5; // Hi-hat (g/5)
    if (midi === 44) return 0.5; // Pedal Hi-Hat (d/4)
    if ([49, 57, 55, 52].includes(midi)) return 6.0; // Crash/Splash (a/5 - ledger line)
    if ([51, 59, 53].includes(midi)) return 5.0; // Ride (f/5)
    return 3.0;
  }

  if (vexKeyProps && typeof vexKeyProps.line === 'number') {
    return vexKeyProps.line;
  }

  const octave = Math.floor(midi / 12) - 1;
  const pc = pitchClass.charAt(0).toUpperCase();
  const stepInOctave: { [key: string]: number } = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };
  const diatonicStep = octave * 7 + (stepInOctave[pc] ?? 0);

  if (hand === 'right') {
    return 1 + (diatonicStep - 30) / 2;
  } else {
    return 1 + (diatonicStep - 18) / 2;
  }
}

interface SidebarSignaturePanelProps {
  vexFlowData: VexFlowRenderData | null;
  currentTimeMs: number;
  height: number;
  activeKeySignature: string;
  timeSignature?: { numerator: number; denominator: number };
  isDrum: boolean;
  backgroundColor: string;
  lowDetailMode?: boolean;
  isQwertyView?: boolean;
  isMixedHandView?: boolean;
  resolutionScale?: number;
}

const SidebarSignaturePanel: React.FC<SidebarSignaturePanelProps> = React.memo(({
  vexFlowData,
  currentTimeMs,
  height,
  activeKeySignature,
  timeSignature,
  isDrum,
  backgroundColor,
  lowDetailMode = false,
  isQwertyView = false,
  isMixedHandView = false,
  resolutionScale = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentMeasure = useMemo(() => {
    if (!vexFlowData || !vexFlowData.measures || vexFlowData.measures.length === 0) return null;
    return vexFlowData.measures.find(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs) || vexFlowData.measures[0];
  }, [vexFlowData, currentTimeMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (canvasCtx) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (!vexFlowData) return;

    const topStaveYOffset = Math.floor(vexFlowData.topStaveYOffset);
    const verticalSpacing = Math.floor(vexFlowData.verticalSpacing);
    const effectiveStaffLineSpacing = (isQwertyView || isMixedHandView) ? 14 : STAFF_LINE_SPACING;

    const dpr = (window.devicePixelRatio || 1) * (resolutionScale || 1.0);
    canvas.width = Math.floor(SIDEBAR_WIDTH * dpr);
    canvas.height = Math.floor(height * dpr);

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(SIDEBAR_WIDTH * dpr, height * dpr);
    
    // Crucial fix: Reset inline CSS dimensions so they are not stretched by devicePixelRatio (especially on UI zoom change)
    canvas.style.width = `${SIDEBAR_WIDTH}px`;
    canvas.style.height = `${height}px`;

    const vexCtx = renderer.getContext();
    vexCtx.scale(dpr, dpr);
    (vexCtx as any).setFillStyle = function(style: string) { this.fillStyle = style; };

    if (isDrum || isQwertyView || isMixedHandView) {
      const mainStave = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5, {
        spacing_between_lines_px: effectiveStaffLineSpacing,
        space_above_staff_ln: 0
      });
      mainStave.addClef(isDrum ? 'percussion' : 'treble');
      const activeTime = currentMeasure?.effectiveTimeSignature || timeSignature;
      if (activeTime) {
        mainStave.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);
      }
      if (isQwertyView || isMixedHandView) {
        const activeKey = currentMeasure?.activeKeySignature || activeKeySignature || 'C';
        if (activeKey) mainStave.addKeySignature(activeKey);
      }
      mainStave.setContext(vexCtx).draw();
    } else {
      const treble = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5, {
        spacing_between_lines_px: effectiveStaffLineSpacing,
        space_above_staff_ln: 0
      });
      const bass = new Stave(0, topStaveYOffset + verticalSpacing, SIDEBAR_WIDTH - 5, {
        spacing_between_lines_px: effectiveStaffLineSpacing,
        space_above_staff_ln: 0
      });

      const activeKey = currentMeasure?.activeKeySignature || activeKeySignature || 'C';
      const activeTime = currentMeasure?.effectiveTimeSignature || timeSignature;

      treble.addClef(currentMeasure?.effectiveClefRH || 'treble');
      if (activeKey) treble.addKeySignature(activeKey);
      if (activeTime) treble.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);

      bass.addClef(currentMeasure?.effectiveClefLH || 'bass');
      if (activeKey) bass.addKeySignature(activeKey);
      if (activeTime) bass.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);

      treble.setContext(vexCtx).draw();
      bass.setContext(vexCtx).draw();

      new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(vexCtx).draw();
      new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(vexCtx).draw();
    }
  }, [vexFlowData, currentMeasure, height, activeKeySignature, timeSignature, isDrum, isQwertyView, isMixedHandView]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 z-30 pointer-events-none"
      style={{
        width: SIDEBAR_WIDTH,
        height: height,
        backgroundColor: backgroundColor === 'transparent' ? 'transparent' : backgroundColor,
        backdropFilter: (backgroundColor === 'transparent' || lowDetailMode) ? 'none' : 'blur(4px)',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        boxShadow: backgroundColor === 'transparent' ? 'none' : '4px 0 12px rgba(0,0,0,0.08)'
      }}
    />
  );
});

// Helper to measure signature block width
const getSignatureBlockWidth = (
  clef?: 'treble' | 'bass' | 'percussion',
  key?: string,
  time?: { numerator: number; denominator: number },
  spacing = 10,
  cancelKey?: string
): number => {
  try {
    const s = new Stave(0, 0, 400, {
      spacing_between_lines_px: spacing,
      space_above_staff_ln: 0
    });
    s.setBegBarType(0);
    s.setEndBarType(0);
    s.options.num_lines = 0;
    s.options.left_bar = false;
    s.options.right_bar = false;
    if (clef && clef !== 'percussion') s.addClef(clef);
    if (key) s.addKeySignature(key, cancelKey);
    if (time) s.addTimeSignature(`${time.numerator}/${time.denominator}`);
    return Math.max(30, Math.round(s.getNoteStartX()));
  } catch (e) {
    return 35;
  }
};

const drawSignatureChange = (
  ctx: CanvasRenderingContext2D,
  x: number,
  staffTopY: number,
  spacing: number,
  clefType?: 'treble' | 'bass' | 'percussion',
  keySignature?: string,
  timeSignature?: { numerator: number; denominator: number },
  cancelKeySignature?: string
) => {
  // If nothing to draw, return
  if (!clefType && !keySignature && !timeSignature) return;
  if (clefType === 'percussion' && !keySignature && !timeSignature) return;

  ctx.save();
  try {
    const stave = new Stave(x | 0, staffTopY | 0, 400, {
      spacing_between_lines_px: spacing,
      space_above_staff_ln: 0
    });
    stave.setBegBarType(0);
    stave.setEndBarType(0);
    stave.options.num_lines = 0;
    stave.options.left_bar = false;
    stave.options.right_bar = false;

    if (clefType && clefType !== 'percussion') {
      stave.addClef(clefType, 'default');
    } else if (clefType) {
      stave.setClef(clefType);
    }
    if (keySignature) {
      stave.addKeySignature(keySignature, cancelKeySignature);
    }
    if (timeSignature) {
      stave.addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
    }

    const canvasCtx = ctx as any;
    const originalFill = canvasCtx.fill;
    canvasCtx.fill = function() {
      canvasCtx.strokeStyle = '#ffffff';
      canvasCtx.lineWidth = 3.5;
      canvasCtx.stroke();
      canvasCtx.fillStyle = '#0f172a';
      originalFill.apply(this, arguments);
    };

    const vexCtx: any = {
      clear: () => {},
      setStrokeStyle: (s: string) => { ctx.strokeStyle = s; },
      setFillStyle: (s: string) => { ctx.fillStyle = s; },
      setLineWidth: (w: number) => { ctx.lineWidth = w; },
      beginPath: () => ctx.beginPath(),
      moveTo: (x: number, y: number) => ctx.moveTo(x, y),
      lineTo: (x: number, y: number) => ctx.lineTo(x, y),
      bezierCurveTo: (a: number, b: number, c: number, d: number, e: number, f: number) => ctx.bezierCurveTo(a, b, c, d, e, f),
      quadraticCurveTo: (a: number, b: number, c: number, d: number) => ctx.quadraticCurveTo(a, b, c, d),
      arc: (x: number, y: number, r: number, sa: number, ea: number, ac: boolean) => ctx.arc(x, y, r, sa, ea, ac),
      fill: () => ctx.fill(),
      stroke: () => ctx.stroke(),
      fillRect: (x: number, y: number, w: number, h: number) => ctx.fillRect(x, y, w, h),
      clearRect: (x: number, y: number, w: number, h: number) => ctx.clearRect(x, y, w, h),
      save: () => ctx.save(),
      restore: () => ctx.restore(),
      fillText: (t: string, x: number, y: number) => ctx.fillText(t, x, y),
      measureText: (t: string) => ctx.measureText(t),
      scale: (x: number, y: number) => ctx.scale(x, y),
      rect: (x: number, y: number, w: number, h: number) => ctx.rect(x, y, w, h),
      closePath: () => ctx.closePath(),
      setFont: () => {},
      setLineDash: () => {},
      openGroup: () => {},
      closeGroup: () => {}
    };

    stave.setContext(vexCtx);
    stave.draw();

    canvasCtx.fill = originalFill;
  } catch (e) {
    // Fallback: simple text rendering if needed
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.round(spacing * 3.2)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (clefType && clefType !== 'percussion') {
      ctx.fillText(clefType === 'treble' ? '𝄞' : '𝄢', x + 12, staffTopY + 2 * spacing);
    }
  }
  ctx.restore();
};

const HorizontalNotesView: React.FC<HorizontalNotesViewProps> = React.memo(({
  currentTimeMs,
  width,
  height,
  pixelsPerMillisecond,
  activePlaybackNotesInfo,
  rightHandColor,
  leftHandColor,
  hitNoteColor,
  backgroundColor,
  vexFlowData,
  showOnlyMajorNotes,
  noteLabelType,
  activeKeySignature,
  qwertyLayout,
  qwertyCurrentOctaveShift = 0,
  mirpTranspose = 0,
  isQwertyView = false,
  isMixedHandView = false,
  activeBpmForDisplay,
  lowDetailMode = false,
  instrumentMode = 'piano',
  isPaused = false,
  onSeek,
  resolutionScale = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startTime: number } | null>(null);

  // Background Caching Effect
  useEffect(() => {
    if (width <= 0 || height <= 0 || !vexFlowData) return;
    
    const dpr = (typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1) * (resolutionScale || 1.0);
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = Math.floor(width * dpr);
    bgCanvas.height = Math.floor(height * dpr);
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    
    bgCtx.scale(dpr, dpr);
    
    // Fill Background
    if (backgroundColor !== 'transparent') {
      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, width | 0, height | 0);
    }
    
    backgroundCanvasRef.current = bgCanvas;
  }, [width, height, backgroundColor, !!vexFlowData, resolutionScale]);

  const PLAY_LINE_X = SIDEBAR_WIDTH + (width > SIDEBAR_WIDTH ? (width - SIDEBAR_WIDTH) * 0.1 : 0);

  const originalNoteToVexMap = useMemo(() => {
    const map = new Map<string, VexFlowNoteInfo>();
    if (!vexFlowData) return map;
    vexFlowData.measures.flatMap(m => [...m.rightHand, ...m.leftHand]).forEach(vn => {
      vn.originalNotes?.forEach(on => {
        if (!map.has(on.originalNoteId)) map.set(on.originalNoteId, vn);
      });
    });
    return map;
  }, [vexFlowData]);

  const firstMeasureStartTime = vexFlowData?.measures[0]?.startTimeMs ?? 0;
  const totalMusicWidth = useMemo(() => vexFlowData ? vexFlowData.measures.reduce((sum, m) => sum + m.width, 0) + (HORIZONTAL_PADDING * 2) : width, [vexFlowData, width]);

  const isDrum = instrumentMode === 'drum';
  const effectiveShowOnlyMajorNotes = isDrum ? true : showOnlyMajorNotes;
  const bpm = vexFlowData?.tempoMarkings[0]?.bpm || activeBpmForDisplay || 120;
  const thirtySecondNoteMs = (60000 / bpm) / 8;
  const noteCap = isDrum ? thirtySecondNoteMs : VISUAL_NOTE_CAP_MS;

  const visibleNotes = useMemo(() => {
    if (!vexFlowData || pixelsPerMillisecond <= 0 || !vexFlowData.fragments || vexFlowData.fragments.length === 0) return [];
    const relT = currentTimeMs - firstMeasureStartTime;
    const curPx = relT * pixelsPerMillisecond;
    const startPx = curPx - PLAY_LINE_X - 100;
    const endPx = startPx + width + 200;

    const fragments = vexFlowData.fragments;
    
    // Using binary search to find starting index of visible fragments
    const targetMinTimeMs = currentTimeMs - (PLAY_LINE_X + 100) / pixelsPerMillisecond;
    const startIdx = findFragmentStartIndex(fragments, targetMinTimeMs);
    const maxTimeMs = currentTimeMs + (width - PLAY_LINE_X + 100) / pixelsPerMillisecond;

    const result: NoteFragment[] = [];

    for (let i = startIdx; i < fragments.length; i++) {
      const n = fragments[i];
      if (n.timeMs > maxTimeMs) break;

      const sp = (n.timeMs - firstMeasureStartTime) * pixelsPerMillisecond;
      const duration = effectiveShowOnlyMajorNotes ? Math.min(n.durationMs, noteCap) : n.durationMs;
      const ep = sp + (duration * pixelsPerMillisecond);
      if (ep > startPx && sp < endPx) {
        result.push(n);
      }
    }
    
    return result;
  }, [vexFlowData, currentTimeMs, pixelsPerMillisecond, width, PLAY_LINE_X, firstMeasureStartTime, isDrum, effectiveShowOnlyMajorNotes, noteCap]);

  const notesGroupedByTimeAndHand = useMemo(() => {
    if (!isQwertyView && !isMixedHandView) return null;
    const groups = new Map<string, NoteFragment[]>();
    for (let i = 0; i < visibleNotes.length; i++) {
      const note = visibleNotes[i];
      const key = `${note.timeMs}-${note.hand}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(note);
    }
    groups.forEach(group => group.sort((a, b) => b.midi - a.midi));
    return groups;
  }, [visibleNotes, isQwertyView, isMixedHandView]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = (window.devicePixelRatio || 1) * (resolutionScale || 1.0);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const isBlackKey = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Use Cached Background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0, width, height);
    } else {
      // 1. Fill Background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width | 0, height | 0);
      }
    }

    if (!vexFlowData) {
      ctx.restore();
      return;
    }

    const topStaveYOffset = Math.floor(vexFlowData.topStaveYOffset);
    const verticalSpacing = Math.floor(vexFlowData.verticalSpacing);
    const scrollOffset = (currentTimeMs - firstMeasureStartTime) * pixelsPerMillisecond;
    const contentStartX = (PLAY_LINE_X - HORIZONTAL_PADDING - scrollOffset) | 0;

    // 2. Draw Scrolling Content Area (Clipped to right of sidebar)
    ctx.save();
    ctx.beginPath();
    ctx.rect(SIDEBAR_WIDTH | 0, 0, (width - SIDEBAR_WIDTH) | 0, height | 0);
    ctx.clip();

    ctx.save();
    ctx.translate(contentStartX, 0);

    // 2a. Draw Staff Lines & Barlines
    const effectiveStaffLineSpacing = (isQwertyView || isMixedHandView) ? 14 : STAFF_LINE_SPACING;
    const staffHeight = (effectiveStaffLineSpacing * 4);
    const trebleTop = topStaveYOffset | 0;
    const trebleBottom = (trebleTop + staffHeight) | 0;
    const bassTop = (topStaveYOffset + verticalSpacing) | 0;
    const bassBottom = (bassTop + staffHeight) | 0;
    const barTop = trebleTop;
    const barBottom = (isDrum || isQwertyView || isMixedHandView) ? (isDrum ? trebleBottom : bassBottom) : bassBottom;

    if (vexFlowData.measures.length > 0) {
      const firstM = vexFlowData.measures[0];
      const lastM = vexFlowData.measures[vexFlowData.measures.length - 1];
      const startStaffX = Math.min(
        SIDEBAR_WIDTH - contentStartX - 5,
        ((firstM.startTimeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING
      ) | 0;
      const endStaffX = (((lastM.endTimeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING + 200) | 0;

      ctx.fillStyle = '#999999';
      for (let l = 0; l < 5; l++) {
        const y = Math.floor(trebleTop + l * effectiveStaffLineSpacing) | 0;
        ctx.fillRect(startStaffX, y, endStaffX - startStaffX, 1);
      }
      
      if (!isDrum) {
        for (let l = 0; l < 5; l++) {
          const y = Math.floor(bassTop + l * effectiveStaffLineSpacing) | 0;
          ctx.fillRect(startStaffX, y, endStaffX - startStaffX, 1);
        }
      }
    }

      const measures = vexFlowData.measures;
      for (let idx = 0; idx < measures.length; idx++) {
        const measure = measures[idx];
        const measureLeft = (((measure.startTimeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;
        const measureRight = (((measure.endTimeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${idx + 1}`, measureLeft + 2, trebleTop - 4);

        const drawVerticalLine = (x: number, y1: number, y2: number, w: number) => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(Math.floor(x) | 0, Math.floor(y1) | 0, w | 0, (Math.floor(y2 - y1) + 1) | 0);
        };

        const drawRepeatDots = (x: number) => {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(x | 0, (trebleTop + 1.5 * effectiveStaffLineSpacing) | 0, 2.5, 0, Math.PI * 2);
          ctx.arc(x | 0, (trebleTop + 2.5 * effectiveStaffLineSpacing) | 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
          if (!isDrum && !isMixedHandView) {
            ctx.beginPath();
            ctx.arc(x | 0, (bassTop + 1.5 * effectiveStaffLineSpacing) | 0, 2.5, 0, Math.PI * 2);
            ctx.arc(x | 0, (bassTop + 2.5 * effectiveStaffLineSpacing) | 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        if (measure.startsRepeat) {
          drawVerticalLine(measureLeft, barTop, barBottom, 3);
          drawVerticalLine(measureLeft + 4, barTop, barBottom, 1);
          drawRepeatDots(measureLeft + 9);
        } else if (idx === 0) {
          drawVerticalLine(measureLeft, barTop, barBottom, 1);
        }

        const isLastMeasure = idx === measures.length - 1;
        const lastMeasureEndTime = measures[measures.length - 1].endTimeMs;
        const isEndOfSong = measure.endTimeMs >= lastMeasureEndTime - 50;

        if (measure.endsRepeat) {
          drawRepeatDots(measureRight - 9);
          drawVerticalLine(measureRight - 4, barTop, barBottom, 1);
          drawVerticalLine(measureRight, barTop, barBottom, 3);
        } else if (isLastMeasure || isEndOfSong) {
          drawVerticalLine(measureRight - 4, barTop, barBottom, 1);
          drawVerticalLine(measureRight, barTop, barBottom, 3);
        } else {
          drawVerticalLine(measureRight, barTop, barBottom, 1);
        }

        // Signature changes: Full-size clef, key signature, and time signature changes right before new notes start (matching left bar)
        if (!isDrum && idx > 0) {
          const hasChangeRH = measure.isClefChangeRH || measure.isKeySigChange || measure.isTimeSigChange;
          const hasChangeLH = (!isMixedHandView && !isQwertyView) && (measure.isClefChangeLH || measure.isKeySigChange || measure.isTimeSigChange);

          if (hasChangeRH) {
            const rhFragments = vexFlowData.fragments.filter(f => f.hand === 'right' && f.timeMs >= measure.startTimeMs && f.timeMs < measure.endTimeMs);
            const firstRhTime = rhFragments.length > 0 
              ? Math.min(...rhFragments.map(f => f.timeMs)) 
              : measure.startTimeMs;
            const firstRhX = (((firstRhTime - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;
            const blockWidth = getSignatureBlockWidth(
              measure.isClefChangeRH ? measure.newClefRH : undefined,
              measure.isKeySigChange ? measure.activeKeySignature : undefined,
              measure.isTimeSigChange ? measure.effectiveTimeSignature : undefined,
              effectiveStaffLineSpacing,
              measure.isKeySigChange ? measure.previousKeySignature : undefined
            );
            const sigPadding = 14; // Standard spacing between signature changes and the first note
            const sigX = Math.max(measureLeft + 4, firstRhX - blockWidth - sigPadding);
            drawSignatureChange(
              ctx,
              sigX,
              trebleTop,
              effectiveStaffLineSpacing,
              measure.isClefChangeRH ? measure.newClefRH : undefined,
              measure.isKeySigChange ? measure.activeKeySignature : undefined,
              measure.isTimeSigChange ? measure.effectiveTimeSignature : undefined,
              measure.isKeySigChange ? measure.previousKeySignature : undefined
            );
          }

          if (hasChangeLH) {
            const lhFragments = vexFlowData.fragments.filter(f => f.hand === 'left' && f.timeMs >= measure.startTimeMs && f.timeMs < measure.endTimeMs);
            const firstLhTime = lhFragments.length > 0 
              ? Math.min(...lhFragments.map(f => f.timeMs)) 
              : measure.startTimeMs;
            const firstLhX = (((firstLhTime - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;
            const blockWidth = getSignatureBlockWidth(
              measure.isClefChangeLH ? measure.newClefLH : undefined,
              measure.isKeySigChange ? measure.activeKeySignature : undefined,
              measure.isTimeSigChange ? measure.effectiveTimeSignature : undefined,
              effectiveStaffLineSpacing,
              measure.isKeySigChange ? measure.previousKeySignature : undefined
            );
            const sigPadding = 14; // Standard spacing between signature changes and the first note
            const sigX = Math.max(measureLeft + 4, firstLhX - blockWidth - sigPadding);
            drawSignatureChange(
              ctx,
              sigX,
              bassTop,
              effectiveStaffLineSpacing,
              measure.isClefChangeLH ? measure.newClefLH : undefined,
              measure.isKeySigChange ? measure.activeKeySignature : undefined,
              measure.isTimeSigChange ? measure.effectiveTimeSignature : undefined,
              measure.isKeySigChange ? measure.previousKeySignature : undefined
            );
          }
        }
      }

      // 2b. Draw Tempo Markings
      const tempoMarkings = vexFlowData.tempoMarkings;
      for (let i = 0; i < tempoMarkings.length; i++) {
        const mark = tempoMarkings[i];
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`♩ = ${mark.bpm}`, mark.x | 0, topStaveYOffset - 15);
      }

      // 2c. Draw Octave Lines (8va / 15ma)
      const octaveLines = vexFlowData.octaveLines;
      for (let i = 0; i < octaveLines.length; i++) {
        const line = octaveLines[i];
        const y = line.startY;
        const text = line.type;
        const isAbove = line.type === '8va' || line.type === '15ma';
        const lineY = (isAbove ? y + 4 : y + 16) | 0;
        const hookEndY = (isAbove ? lineY + 10 : lineY - 10) | 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'italic bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(text, line.startX | 0, y | 0);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo((line.startX + text.length * 10) | 0, lineY);
        ctx.lineTo(line.endX | 0, lineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(line.endX | 0, lineY);
        ctx.lineTo(line.endX | 0, hookEndY);
        ctx.stroke();
      }

      if (!isQwertyView && !isMixedHandView) {
        // Draw Scrolling Notes (Standard View)
        for (let i = 0; i < visibleNotes.length; i++) {
          const note = visibleNotes[i];
          const vn = originalNoteToVexMap.get(note.originalNoteId);
          const idx = vn?.originalNotes?.findIndex(n => n.fragmentId === note.fragmentId) ?? -1;
          const vexKeyProps = (vn && idx !== -1 && vn.vexNoteKeyProps) ? vn.vexNoteKeyProps[idx] : undefined;

          const line = getStaffLineForNote(note.midi, note.hand, note.pitchClass, activeKeySignature, isDrum, vexKeyProps);

          const staffTopY = (isDrum 
            ? topStaveYOffset 
            : (note.hand === 'left' ? topStaveYOffset + verticalSpacing : topStaveYOffset)) | 0;

          const yPos = (staffTopY + (5 - line) * effectiveStaffLineSpacing) | 0;

          const active = activePlaybackNotesInfo.get(note.noteId);
          const status = active?.status || null;
          let baseC = isDrum ? leftHandColor : (note.hand === 'left' ? leftHandColor : rightHandColor);
          
          if (!isDrum && isBlackKey(note.midi)) {
            baseC = darkenHex(baseC, 25);
          }
          
          const noteColor = status === 'user_played' ? hitNoteColor : baseC;

          let label = '';
          if (noteLabelType === 'qwerty') {
            if (qwertyLayout === 'mirp') {
              const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === note.midi - mirpTranspose);
              if (match) {
                const physicalKey = KEY_CODES_TO_DISPLAY[match.code.toLowerCase()] || match.code.replace('Key', '').replace('Digit', '');
                label = match.shift ? `⇧${physicalKey}` : physicalKey;
              } else {
                label = note.pitchClass + Math.floor(note.midi/12 - 1);
              }
            } else {
              const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === note.midi - (qwertyCurrentOctaveShift * 12));
              if (match) label = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
              else label = note.pitchClass + Math.floor(note.midi/12 - 1);
            }
          } else if (noteLabelType === 'noteName') {
            label = note.pitchClass;
            const isS = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
            if (isS) label = ENHARMONIC_MAP_TO_SHARP[label] || label;
            else if (FLAT_KEYS.includes(activeKeySignature)) label = ENHARMONIC_MAP_TO_FLAT[label] || label;
          } else if (noteLabelType === 'fingering' && note.finger) {
            label = String(note.finger);
          }

          const xPos = (((note.timeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;
          const durationForHeight = effectiveShowOnlyMajorNotes ? Math.min(note.durationMs, noteCap) : note.durationMs;
          const noteWidth = Math.max(28, durationForHeight * pixelsPerMillisecond) | 0;

          ctx.save();

          const barHeight = 10;
          const barY = (yPos - barHeight / 2) | 0;

          if (status && !lowDetailMode) {
            ctx.shadowColor = noteColor;
            ctx.shadowBlur = 6;
          }

          // 1. Ledger lines
          if (!isDrum) {
            const LW = noteWidth + 8;
            const LX = (xPos - 4) | 0;
            ctx.fillStyle = '#475569';
            if (line > 5) {
              for (let l = 6; l <= Math.floor(line); l++) {
                const ly = (staffTopY + (5 - l) * effectiveStaffLineSpacing) | 0;
                ctx.fillRect(LX, ly - 0.75, LW, 1.5);
              }
            } else if (line < 1) {
              for (let l = 0; l >= Math.ceil(line); l--) {
                const ly = (staffTopY + (5 - l) * effectiveStaffLineSpacing) | 0;
                ctx.fillRect(LX, ly - 0.75, LW, 1.5);
              }
            }
          }

          // 2. Accidentals
          if (!isDrum) {
            if (vn && idx !== -1 && vn.accidentals) {
              const accData = vn.accidentals.find(acc => acc.index === idx);
              if (accData) {
                const glyphCode = accData.type === '#' ? 'accidentalSharp' : accData.type === 'b' ? 'accidentalFlat' : 'accidentalNatural';
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#0f172a';
                try {
                  if (Glyph && typeof (Glyph as any).renderGlyph === 'function') {
                    const canvasCtx = ctx as any;
                    const originalFill = canvasCtx.fill;
                    canvasCtx.fill = function() {
                      canvasCtx.strokeStyle = '#ffffff';
                      canvasCtx.lineWidth = 2.5;
                      canvasCtx.stroke();
                      canvasCtx.fillStyle = '#0f172a';
                      originalFill.apply(this, arguments);
                    };
                    // Standard Bravura musical font symbols align their vertical origin perfectly with the center of the note head (yPos).
                    (Glyph as any).renderGlyph(ctx, (xPos - 12) | 0, yPos | 0, 38, glyphCode);
                    canvasCtx.fill = originalFill;
                  } else {
                    const txt = accData.type === '#' ? '♯' : accData.type === 'b' ? '♭' : '♮';
                    ctx.font = '32px sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 4;
                    ctx.strokeText(txt, (xPos - 10) | 0, yPos);
                    ctx.fillText(txt, (xPos - 10) | 0, yPos);
                  }
                } catch (e) {
                  const txt = accData.type === '#' ? '♯' : accData.type === 'b' ? '♭' : '♮';
                  ctx.font = '32px sans-serif';
                  ctx.textAlign = 'right';
                  ctx.textBaseline = 'middle';
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 4;
                  ctx.strokeText(txt, (xPos - 10) | 0, yPos);
                  ctx.fillText(txt, (xPos - 10) | 0, yPos);
                }
              }
            }
          }

          // 3. Balok (Block / Bar) Note Body
          const isXHead = isDrum && [42, 46, 44, 49, 57, 51, 59, 53, 55, 52].includes(note.midi);
          const isOpenHiHat = isDrum && note.midi === 46;

          if (isXHead) {
            const headCenterX = (xPos + 12) | 0;
            ctx.strokeStyle = status === 'user_played' ? hitNoteColor : '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo((headCenterX - 5) | 0, (yPos - 5) | 0);
            ctx.lineTo((headCenterX + 5) | 0, (yPos + 5) | 0);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo((headCenterX + 5) | 0, (yPos - 5) | 0);
            ctx.lineTo((headCenterX - 5) | 0, (yPos + 5) | 0);
            ctx.stroke();
            ctx.lineWidth = 1;
            if (isOpenHiHat) {
              ctx.beginPath();
              ctx.arc(headCenterX, yPos, 6, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = status === 'user_played' ? hitNoteColor : baseC;
            ctx.beginPath();
            ctx.roundRect(xPos, barY, noteWidth, barHeight, 4);
            ctx.fill();

            ctx.strokeStyle = (isBlackKey(note.midi) ? '#020617' : '#0f172a');
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // 4. Label inside or on the Balok Note
          if (label) {
            ctx.fillStyle = status === 'user_played' ? '#000000' : '#ffffff';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, (xPos + noteWidth / 2) | 0, yPos);
          }

          ctx.restore();
        }
      } else if (notesGroupedByTimeAndHand) {
        // Draw Stacked Notes (QWERTY / Roll Views)
        // Group by Time only, ignore hand for stacking calculation IF isMixedHandView
        // BUT user said "sheet music qwerty jarak antara reight hadn dan left hand itu sama semuanya jadinya jangan dicampur jadinya right hadn dan left hand jaraknya sama semua jadinya beda idiot"
        // This means separate staves for RH and LH even in QWERTY, but the STACKING within that hand should be standardized.
        
        const entries = Array.from(notesGroupedByTimeAndHand.entries());
        for (let g = 0; g < entries.length; g++) {
          const [key, group] = entries[g];
          const [timeMsStr, hand] = key.split('-');
          const timeMs = parseFloat(timeMsStr);
          const xPos = (((timeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING) | 0;

          // If isQwertyView, we still use the two staves logic, but we center the stack in each.
          // IF isMixedHandView, we might stack everything in one? (The user didn't explicitly complain about roll view, mostly QWERTY).
          
          const staffTopY = (isMixedHandView 
            ? topStaveYOffset 
            : (hand === 'left' ? topStaveYOffset + verticalSpacing : topStaveYOffset)) | 0;
            
          const staffCenterY = (staffTopY + (2 * effectiveStaffLineSpacing)) | 0;

          for (let j = 0; j < group.length; j++) {
            const note = group[j];
            const durationForHeight = effectiveShowOnlyMajorNotes ? Math.min(note.durationMs, noteCap) : note.durationMs;
            const noteWidth = Math.max(NOTE_HEAD_WIDTH, durationForHeight * pixelsPerMillisecond) | 0;
            
            // Equal spacing stacking
            const yPos = (staffCenterY + (j - (group.length - 1) / 2) * 36) | 0;

            const active = activePlaybackNotesInfo.get(note.noteId);
            const status = active?.status || null;
            let baseC = hand === 'left' ? leftHandColor : rightHandColor;
            if (isBlackKey(note.midi)) baseC = darkenHex(baseC, 25);
            const noteColor = status === 'user_played' ? hitNoteColor : baseC;

            let label = '';
            if (noteLabelType === 'qwerty') {
              if (qwertyLayout === 'mirp') {
                const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === note.midi - mirpTranspose);
                if (match) {
                  const physicalKey = KEY_CODES_TO_DISPLAY[match.code.toLowerCase()] || match.code.replace('Key', '').replace('Digit', '');
                  label = match.shift ? `⇧${physicalKey}` : physicalKey;
                } else {
                  label = note.pitchClass + Math.floor(note.midi/12 - 1);
                }
              } else {
                const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === note.midi - (qwertyCurrentOctaveShift * 12));
                if (match) label = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
                else label = note.pitchClass + Math.floor(note.midi/12 - 1);
              }
            } else if (noteLabelType === 'noteName') {
              label = note.pitchClass;
              const isS = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
              if (isS) label = ENHARMONIC_MAP_TO_SHARP[label] || label;
              else if (FLAT_KEYS.includes(activeKeySignature)) label = ENHARMONIC_MAP_TO_FLAT[label] || label;
            } else if (noteLabelType === 'fingering' && note.finger) {
              label = String(note.finger);
            }

            ctx.save();
            const barHeight = 20;
            const barY = (yPos - barHeight / 2) | 0;

            if (status && !lowDetailMode) {
              ctx.shadowColor = noteColor;
              ctx.shadowBlur = 4;
            }
            ctx.fillStyle = status ? noteColor : (noteColor.length === 7 ? noteColor + 'c0' : noteColor);
            ctx.beginPath();
            ctx.roundRect(xPos, barY, noteWidth + 12, barHeight, 4);
            ctx.fill();

            if (label) {
              ctx.fillStyle = '#ffffff';
              ctx.font = '13px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, (xPos + (noteWidth + 12) / 2) | 0, yPos);
            }
            ctx.restore();
          }
        }
      }

    ctx.restore(); // Restore scrolling offset
    ctx.restore(); // Restore clipping rectangle

    // 3. Draw Sticky Sidebar on Left
    ctx.save();
    // Use the same light-themed sidebar background for both views
    ctx.fillStyle = '#f7f5ed';
    ctx.fillRect(0, 0, SIDEBAR_WIDTH | 0, height | 0);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SIDEBAR_WIDTH | 0, 0);
    ctx.lineTo(SIDEBAR_WIDTH | 0, height | 0);
    ctx.stroke();

    if (isQwertyView || isMixedHandView) {
      const bpmText = activeBpmForDisplay !== undefined ? Math.round(activeBpmForDisplay) : (vexFlowData?.tempoMarkings[0]?.bpm || '120');

      ctx.textAlign = 'center';
      
      // KEY (Simplified for QWERTY/Roll sidebar)
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('KEY', (SIDEBAR_WIDTH / 2) | 0, (height * 0.15) | 0);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(formatKeySignatureForDisplay(activeKeySignature || ''), (SIDEBAR_WIDTH / 2) | 0, (height * 0.22) | 0);

      // BPM
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('BPM', (SIDEBAR_WIDTH / 2) | 0, (height * 0.35) | 0);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${bpmText}`, (SIDEBAR_WIDTH / 2) | 0, (height * 0.42) | 0);

      if (isQwertyView) {
        // QWERTY LAYOUT
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('QWERTY LAYOUT', (SIDEBAR_WIDTH / 2) | 0, (height * 0.75) | 0);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(qwertyLayout === 'mirp' ? 'Roblox' : 'Standard', (SIDEBAR_WIDTH / 2) | 0, (height * 0.81) | 0);

        ctx.fillStyle = '#475569';
        ctx.font = '11px monospace';
        if (qwertyLayout === 'mirp') {
          ctx.fillText(`Transpose: ${mirpTranspose} (↑/↓)`, (SIDEBAR_WIDTH / 2) | 0, (height * 0.86) | 0);
        } else {
          ctx.fillText(`Octave Shift: ${qwertyCurrentOctaveShift} (↑/↓)`, (SIDEBAR_WIDTH / 2) | 0, (height * 0.86) | 0);
        }
      }
    }
    ctx.restore();

    // 4. Draw Play Line Cursor
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    if (!lowDetailMode) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 4;
    }
    ctx.beginPath();
    ctx.moveTo(PLAY_LINE_X | 0, 0);
    ctx.lineTo(PLAY_LINE_X | 0, height | 0);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [
    currentTimeMs,
    width,
    height,
    pixelsPerMillisecond,
    activePlaybackNotesInfo,
    rightHandColor,
    leftHandColor,
    hitNoteColor,
    backgroundColor,
    vexFlowData,
    showOnlyMajorNotes,
    noteLabelType,
    activeKeySignature,
    qwertyLayout,
    qwertyCurrentOctaveShift,
    mirpTranspose,
    isQwertyView,
    activeBpmForDisplay,
    lowDetailMode,
    instrumentMode,
    visibleNotes,
    notesGroupedByTimeAndHand,
    PLAY_LINE_X,
    firstMeasureStartTime,
    isDrum,
    originalNoteToVexMap
  ]);

  // Interactivity for seeking
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPaused) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startTime: currentTimeMs
    };
  }, [isPaused, currentTimeMs]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || !onSeek) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaTime = -deltaX / pixelsPerMillisecond;
    onSeek(dragRef.current.startTime + deltaTime);
  }, [onSeek, pixelsPerMillisecond]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) dragRef.current.isDragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isPaused || !onSeek) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const deltaTime = delta / pixelsPerMillisecond * 2;
    onSeek(currentTimeMs + deltaTime);
  }, [isPaused, onSeek, pixelsPerMillisecond, currentTimeMs]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isPaused) return;
    dragRef.current = {
      isDragging: true,
      startX: e.touches[0].clientX,
      startTime: currentTimeMs
    };
  }, [isPaused, currentTimeMs]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || !onSeek) return;
    const deltaX = e.touches[0].clientX - dragRef.current.startX;
    const deltaTime = -deltaX / pixelsPerMillisecond;
    onSeek(dragRef.current.startTime + deltaTime);
  }, [onSeek, pixelsPerMillisecond]);

  const handleTouchEnd = useCallback(() => {
    if (dragRef.current) dragRef.current.isDragging = false;
  }, []);

  return (
    <div
      className={`relative overflow-hidden no-select ${isPaused ? 'cursor-ew-resize' : ''}`}
      style={{ width, height, backgroundColor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
        }}
      />
      {!isQwertyView && (
        <SidebarSignaturePanel
          vexFlowData={vexFlowData}
          currentTimeMs={currentTimeMs}
          height={height}
          activeKeySignature={activeKeySignature}
          timeSignature={vexFlowData?.timeSignature}
          isDrum={isDrum}
          backgroundColor={backgroundColor}
          lowDetailMode={lowDetailMode}
          isQwertyView={isQwertyView}
          isMixedHandView={isMixedHandView}
          resolutionScale={resolutionScale}
        />
      )}
    </div>
  );
});

// Helper check for accidentals
function vexNoteInfoAccidentalCheck(vn: VexFlowNoteInfo, fragmentId: string): boolean {
  if (!vn.accidentals || !vn.originalNotes) return false;
  const idx = vn.originalNotes.findIndex(n => n.fragmentId === fragmentId);
  if (idx === -1) return false;
  return vn.accidentals.some(acc => acc.index === idx);
}

export default HorizontalNotesView;

