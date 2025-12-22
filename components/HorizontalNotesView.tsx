
import React, { useMemo, useEffect, useRef } from 'react';
import { ActiveMidiNoteInfo, VexFlowRenderData, VexFlowNoteInfo, NoteFragment, NoteLabelType, QwertyLayout } from '../types';
import { USER_PLAY_COLOR, PLAY_LINE_THICKNESS_PX, VISUAL_NOTE_CAP_MS, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { Renderer, Stave, StaveConnector } from 'vexflow';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, getActiveTimeSignature, getActiveKeySignature } from '../utils';

// --- Constants ---
const HORIZONTAL_PADDING = 30;
const SIDEBAR_WIDTH = 200; // Increased from 140
const STAFF_LINE_SPACING = 10;
const STEP_HEIGHT = STAFF_LINE_SPACING / 2;
const NOTE_HEAD_WIDTH = 17.5;
const STEM_WIDTH = 1.5;
const STEM_HEIGHT = 31.25;
const ACCIDENTAL_FONT_SIZE = 25;
const ACCIDENTAL_OFFSET_X = -12.5;

interface HorizontalNotesViewProps {
  currentTimeMs: number;
  width: number;
  height: number;
  pixelsPerMillisecond: number;
  activePlaybackNotesInfo: Map<string, ActiveMidiNoteInfo>;
  rightHandColor: string;
  leftHandColor: string;
  backgroundColor: string;
  vexFlowData: VexFlowRenderData | null;
  showOnlyMajorNotes: boolean;
  noteLabelType: NoteLabelType;
  activeKeySignature: string;
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
}

const StickyStaffHeader: React.FC<{ 
  vexFlowData: VexFlowRenderData; 
  currentTimeMs: number;
  height: number;
}> = React.memo(({ vexFlowData, currentTimeMs, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Find current effective signatures and clefs
  const currentMeasure = useMemo(() => {
    return vexFlowData.measures.find(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs) || vexFlowData.measures[0];
  }, [vexFlowData, currentTimeMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !vexFlowData || !currentMeasure) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SIDEBAR_WIDTH, height);
    const ctx = renderer.getContext();

    const { topStaveYOffset, keySignature, timeSignature, verticalSpacing } = vexFlowData;
    
    // Draw the tiny "static" staves
    const treble = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5);
    const bass = new Stave(0, topStaveYOffset + verticalSpacing, SIDEBAR_WIDTH - 5);

    // Use currently active signatures from the measure
    const activeKey = currentMeasure.activeKeySignature || keySignature;
    const activeTime = currentMeasure.effectiveTimeSignature || timeSignature;

    treble.addClef(currentMeasure.effectiveClefRH || 'treble');
    treble.addKeySignature(activeKey);
    treble.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);
          
    bass.addClef(currentMeasure.effectiveClefLH || 'bass');
    bass.addKeySignature(activeKey);
    bass.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);

    treble.setContext(ctx);
    treble.draw();
    bass.setContext(ctx);
    bass.draw();
    
    new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
    new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();

  }, [vexFlowData, currentMeasure, height]);

  return (
    <div 
      className="absolute top-0 left-0 h-full z-30 pointer-events-none"
      style={{ 
        width: `${SIDEBAR_WIDTH}px`, 
        backgroundColor: 'rgba(247, 245, 237, 0.95)',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
        borderRight: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      <div ref={containerRef} />
    </div>
  );
});

const SheetMusicBackground: React.FC<{ vexFlowData: VexFlowRenderData; totalWidth: number; height: number; }> = React.memo(({ vexFlowData, totalWidth, height }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || !vexFlowData || totalWidth <= 0 || height <= 0) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(totalWidth, height);
    const ctx = renderer.getContext();

    let currentX = HORIZONTAL_PADDING;
    const { topStaveYOffset, measures, tempoMarkings, verticalSpacing } = vexFlowData;

    measures.forEach((measure) => {
      const treble = new Stave(currentX, topStaveYOffset, measure.width);
      const bass = new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
      
      treble.setContext(ctx).draw();
      bass.setContext(ctx).draw();
      currentX += measure.width;
    });

    tempoMarkings.forEach(mark => {
      ctx.setFont('Arial', 14, 'bold').fillText(`♩ = ${mark.bpm}`, mark.x, topStaveYOffset - 15);
    });
  }, [vexFlowData, totalWidth, height]);

  return <div ref={svgContainerRef} className="absolute inset-0" style={{ zIndex: 1 }} />;
});

const ScrollingSheetNote: React.FC<{
    note: NoteFragment;
    vexNoteInfo: VexFlowNoteInfo;
    noteIndexInChord: number;
    yOnStave: number;
    x: number;
    y: number;
    width: number;
    color: string;
    glow: boolean;
    label: string;
}> = ({ note, vexNoteInfo, noteIndexInChord, yOnStave, x, y, width, color, glow, label }) => {
    
    const noteAccidental = useMemo(() => {
        if (!vexNoteInfo.accidentals || !vexNoteInfo.originalNotes) return null;
        const currentNoteIndexInChord = vexNoteInfo.originalNotes.findIndex(n => n.fragmentId === note.fragmentId);
        if (currentNoteIndexInChord === -1) return null;
        const accidentalData = vexNoteInfo.accidentals.find(acc => acc.index === currentNoteIndexInChord);
        if (!accidentalData) return null;
        return accidentalData.type === '#' ? '♯' : accidentalData.type === 'b' ? '♭' : accidentalData.type === 'n' ? '♮' : null;
    }, [vexNoteInfo, note.fragmentId]);

    const referenceMidi = note.hand === 'right' ? 71 : 50; 
    const stemDirection = vexNoteInfo.midiValue >= referenceMidi ? -1 : 1; 
    const noteheadY = NOTE_HEAD_WIDTH / 2;

    const LedgerLines = useMemo(() => {
        if (!vexNoteInfo.vexNoteKeyProps || !vexNoteInfo.vexNoteKeyProps[noteIndexInChord]) return null;
        const { line } = vexNoteInfo.vexNoteKeyProps[noteIndexInChord];
        const lines: React.JSX.Element[] = [], LW = NOTE_HEAD_WIDTH + 8, LX = (NOTE_HEAD_WIDTH - LW) / 2;
        const V_OFF = 8 * STEP_HEIGHT; 
        if (line > 5) { for (let l = 6; l <= Math.ceil(line); l++) if (l <= line + 0.4) lines.push(<rect key={`ll-a-${l}`} x={LX} y={noteheadY + (5 - l) * STAFF_LINE_SPACING - yOnStave + V_OFF} width={LW} height="1.5" fill="#000" />); }
        else if (line < 1) { for (let l = 0; l >= Math.floor(line); l--) if (l >= line - 0.4) lines.push(<rect key={`ll-b-${l}`} x={LX} y={noteheadY + (1 - l) * STAFF_LINE_SPACING + (STAFF_LINE_SPACING * 4) - yOnStave + V_OFF} width={LW} height="1.5" fill="#000" />); }
        return lines;
    }, [yOnStave, noteheadY, vexNoteInfo, noteIndexInChord]);

    const style: React.CSSProperties = { position: 'absolute', left: `${x}px`, top: `${y - noteheadY}px`, width: `${width}px`, height: `${NOTE_HEAD_WIDTH}px`, zIndex: 10, overflow: 'visible' };

    return (
        <div style={style}>
            <svg width={width} height={NOTE_HEAD_WIDTH} style={{ overflow: 'visible' }}>
                {glow && <ellipse cx={NOTE_HEAD_WIDTH / 2} cy={noteheadY} rx={NOTE_HEAD_WIDTH} ry={NOTE_HEAD_WIDTH * 0.8} fill={color} filter="url(#glow)" />}
                {LedgerLines}
                {noteAccidental && <text x={ACCIDENTAL_OFFSET_X} y={noteheadY + ACCIDENTAL_FONT_SIZE / 3} fontSize={ACCIDENTAL_FONT_SIZE} fill="#000" fontWeight="bold">{noteAccidental}</text>}
                <ellipse cx={NOTE_HEAD_WIDTH / 2} cy={noteheadY} rx={NOTE_HEAD_WIDTH / 2} ry={NOTE_HEAD_WIDTH / 2.5} fill={color} stroke="#000" strokeWidth="1" transform={`rotate(-20 ${NOTE_HEAD_WIDTH/2} ${noteheadY})`} />
                <rect x={stemDirection === 1 ? NOTE_HEAD_WIDTH - STEM_WIDTH : 0} y={stemDirection === 1 ? noteheadY : noteheadY - STEM_HEIGHT} width={STEM_WIDTH} height={STEM_HEIGHT} fill={color} />
                {label && <text x={NOTE_HEAD_WIDTH / 2} y={noteheadY + 4} fontSize="10" fill="white" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>{label}</text>}
            </svg>
        </div>
    );
};

const HorizontalNotesView: React.FC<HorizontalNotesViewProps> = React.memo(({
  currentTimeMs, width, height, pixelsPerMillisecond, activePlaybackNotesInfo, rightHandColor, leftHandColor, backgroundColor, vexFlowData, showOnlyMajorNotes, noteLabelType, activeKeySignature, qwertyLayout, qwertyCurrentOctaveShift, mirpTranspose
}) => {
  const PLAY_LINE_X = SIDEBAR_WIDTH;
  const originalNoteToVexMap = useMemo(() => {
    const map = new Map<string, VexFlowNoteInfo>(); if (!vexFlowData) return map;
    vexFlowData.measures.flatMap(m => [...m.rightHand, ...m.leftHand]).forEach(vn => { vn.originalNotes?.forEach(on => { if (!map.has(on.originalNoteId)) map.set(on.originalNoteId, vn); }); });
    return map;
  }, [vexFlowData]);

  const totalMusicWidth = useMemo(() => vexFlowData ? vexFlowData.measures.reduce((sum, m) => sum + m.width, 0) + (HORIZONTAL_PADDING * 2) : width, [vexFlowData, width]);
  const firstMeasureStartTime = vexFlowData?.measures[0]?.startTimeMs ?? 0;
  const visibleNotes = useMemo(() => {
    if (!vexFlowData || pixelsPerMillisecond <= 0) return [];
    const relT = currentTimeMs - firstMeasureStartTime, curPx = relT * pixelsPerMillisecond, startPx = curPx - PLAY_LINE_X - 50, endPx = startPx + width + 50;
    return vexFlowData.fragments.filter(n => {
      const sp = (n.timeMs - firstMeasureStartTime) * pixelsPerMillisecond, ep = sp + (n.durationMs * pixelsPerMillisecond);
      return ep > startPx && sp < endPx;
    });
  }, [vexFlowData, currentTimeMs, pixelsPerMillisecond, width, PLAY_LINE_X, firstMeasureStartTime]);

  const renderedBarLines = useMemo(() => {
    if (!vexFlowData) return null; let acc = HORIZONTAL_PADDING;
    return vexFlowData.measures.map(m => {
      const left = acc; acc += m.width;
      return <div key={`bar-line-${m.startTimeMs}`} className="absolute top-0 bottom-0 border-r border-slate-400" style={{ left: `${left}px`, top: `${vexFlowData.topStaveYOffset}px`, height: `${(STAFF_LINE_SPACING * 8) + vexFlowData.verticalSpacing}px`, zIndex: 5 }} aria-hidden="true" />;
    });
  }, [vexFlowData]);

  const scrollOffset = (currentTimeMs - firstMeasureStartTime) * pixelsPerMillisecond;
  const containerTransform = `translateX(${PLAY_LINE_X - HORIZONTAL_PADDING - scrollOffset}px)`;

  return (
    <div className="relative overflow-hidden no-select" style={{ width, height, backgroundColor }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}><defs><filter id="glow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs></svg>
      
      {/* Sticky Header Panel */}
      {vexFlowData && (
        <StickyStaffHeader 
          vexFlowData={vexFlowData} 
          currentTimeMs={currentTimeMs} 
          height={height} 
        />
      )}

      <div style={{ transform: containerTransform, willChange: 'transform', width: totalMusicWidth, height }}>
        {vexFlowData && <SheetMusicBackground vexFlowData={vexFlowData} totalWidth={totalMusicWidth} height={height} />}
        {renderedBarLines}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: totalMusicWidth, height, pointerEvents: 'none', zIndex: 15 }}>
          {vexFlowData?.octaveLines.map((line, index) => (
            <g key={`octave-${index}`} fill="#000" stroke="#000" strokeWidth="1.5">
                <text x={line.startX} y={line.startY} fontSize="16" fontStyle="italic" fontWeight="bold">{line.type}</text>
                <path d={`M ${line.startX + (line.type.length * 10)} ${line.startY + 4} L ${line.endX} ${line.startY + 4}`} strokeDasharray="4,3" fill="none" />
                <path d={`M ${line.endX} ${line.startY + 4} L ${line.endX} ${line.startY + 14}`} fill="none" />
            </g>
          ))}
        </svg>
        {visibleNotes.map(note => {
            const vn = originalNoteToVexMap.get(note.originalNoteId); if (!vn?.vexNoteYPositions) return null;
            const idx = vn.originalNotes?.findIndex(n => n.fragmentId === note.fragmentId) ?? -1; if (idx === -1) return null;
            const active = activePlaybackNotesInfo.get(note.noteId), status = active?.status || null;
            const baseC = note.hand === 'left' ? leftHandColor : rightHandColor;
            
            let label = '';
            if (noteLabelType === 'noteName') {
                label = note.pitchClass;
                const isS = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
                if (isS) label = ENHARMONIC_MAP_TO_SHARP[label] || label;
                else if (FLAT_KEYS.includes(activeKeySignature)) label = ENHARMONIC_MAP_TO_FLAT[label] || label;
            } else if (noteLabelType === 'fingering' && note.finger) label = String(note.finger);
            else if (noteLabelType === 'qwerty') {
                if (qwertyLayout === 'mirp') { const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === note.midi - (mirpTranspose || 0)); if (match) label = match.label; }
                else { const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === note.midi - ((qwertyCurrentOctaveShift || 0) * 12)); if (match) label = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase(); }
            }

            return <ScrollingSheetNote key={note.fragmentId} note={note} vexNoteInfo={vn} noteIndexInChord={idx} yOnStave={vn.vexNoteYPositions[idx]} x={((note.timeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING} y={(note.hand === 'right' ? vexFlowData!.topStaveYOffset : vexFlowData!.topStaveYOffset + vexFlowData!.verticalSpacing) + vn.vexNoteYPositions[idx]} width={Math.max(NOTE_HEAD_WIDTH, (showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs) * pixelsPerMillisecond)} color={status === 'user_played' ? USER_PLAY_COLOR : baseC} glow={!!status} label={label} />;
        })}
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${PLAY_LINE_X}px`, width: `${PLAY_LINE_THICKNESS_PX}px`, backgroundColor: 'rgba(239, 68, 68, 0.8)', boxShadow: '0 0 15px 3px rgba(239, 68, 68, 0.5)', zIndex: 20 }} />
    </div>
  );
});

export default HorizontalNotesView;
