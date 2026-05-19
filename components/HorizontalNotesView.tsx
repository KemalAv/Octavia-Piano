
import React, { useMemo, useEffect, useRef } from 'react';
import { ActiveMidiNoteInfo, VexFlowRenderData, VexFlowNoteInfo, NoteFragment, NoteLabelType, QwertyLayout } from '../types';
import { USER_PLAY_COLOR, PLAY_LINE_THICKNESS_PX, VISUAL_NOTE_CAP_MS, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { Renderer, Stave, StaveConnector, TimeSignature } from 'vexflow';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, getActiveTimeSignature, getActiveKeySignature, formatKeySignatureForDisplay } from '../utils';

// --- Constants ---
const HORIZONTAL_PADDING = 30;
const SIDEBAR_WIDTH = 200; // Increased from 140
const STAFF_LINE_SPACING = 10;
const STEP_HEIGHT = STAFF_LINE_SPACING / 2;
const NOTE_HEAD_WIDTH = 12.5;
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
  activeBpmForDisplay?: number;
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
  isPaused?: boolean;
  onSeek?: (timeMs: number) => void;
}

const StickyStaffHeader: React.FC<{ 
  vexFlowData: VexFlowRenderData; 
  currentTimeMs: number;
  height: number;
  isQwertyView?: boolean;
  activeKeySignature?: string;
  activeBpmForDisplay?: number;
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
  backgroundColor: string;
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
}> = React.memo(({ vexFlowData, currentTimeMs, height, isQwertyView, activeKeySignature, activeBpmForDisplay, qwertyLayout, qwertyCurrentOctaveShift, mirpTranspose, backgroundColor, lowDetailMode = false, instrumentMode = 'piano' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const currentMeasure = useMemo(() => {
    return vexFlowData.measures.find(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs) || vexFlowData.measures[0];
  }, [vexFlowData, currentTimeMs]);

  useEffect(() => {
    if (isQwertyView) {
      const container = containerRef.current;
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      return;
    }

    const container = containerRef.current;
    if (!container || !vexFlowData || !currentMeasure) return;
    while (container.firstChild) container.removeChild(container.firstChild);

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SIDEBAR_WIDTH, height);
    const ctx = renderer.getContext();

    const { topStaveYOffset, keySignature, timeSignature, verticalSpacing } = vexFlowData;
    const isDrum = instrumentMode === 'drum';

    if (isDrum) {
        const drumStave = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5);
        const activeTime = currentMeasure.effectiveTimeSignature || timeSignature;
        drumStave.addClef('percussion');
        drumStave.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);
        drumStave.setContext(ctx).draw();
    } else {
        const treble = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5);
        const bass = new Stave(0, topStaveYOffset + verticalSpacing, SIDEBAR_WIDTH - 5);

        const activeKey = currentMeasure.activeKeySignature || keySignature;
        const activeTime = currentMeasure.effectiveTimeSignature || timeSignature;

        treble.addClef(currentMeasure.effectiveClefRH || 'treble');
        treble.addKeySignature(activeKey);
        treble.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);
              
        bass.addClef(currentMeasure.effectiveClefLH || 'bass');
        bass.addKeySignature(activeKey);
        bass.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);

        treble.setContext(ctx).draw();
        bass.setContext(ctx).draw();
        
        new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
        new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    }

  }, [vexFlowData, currentMeasure, height, isQwertyView]);

  if (isQwertyView) {
    const keySignatureText = formatKeySignatureForDisplay(activeKeySignature || '');
    const bpmText = activeBpmForDisplay !== undefined ? Math.round(activeBpmForDisplay) : 'N/A';

    return (
        <div
            className="absolute top-0 left-0 h-full z-30 pointer-events-none flex items-center justify-center"
            style={{
                width: `${SIDEBAR_WIDTH}px`,
                backgroundColor: lowDetailMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.5)',
                backdropFilter: lowDetailMode ? 'none' : 'blur(4px)',
                boxShadow: '4px 0 10px rgba(0,0,0,0.2)',
                borderRight: '1px solid rgba(255,255,255,0.05)'
            }}
        >
            <div className="text-center text-white font-sans space-y-6">
                <div>
                    <div className="text-sm font-bold uppercase text-slate-400 tracking-wider">Key</div>
                    <div className="text-2xl font-bold">{keySignatureText}</div>
                </div>
                <div>
                    <div className="text-sm font-bold uppercase text-slate-400 tracking-wider">BPM</div>
                    <div className="text-4xl font-mono font-bold">{bpmText}</div>
                </div>
                <div>
                    <div className="text-sm font-bold uppercase text-slate-400 tracking-wider">QWERTY Layout</div>
                    <div className="text-xl font-bold">{qwertyLayout === 'mirp' ? 'Roblox' : 'Standard'}</div>
                    <div className="text-sm font-mono font-bold text-slate-300">
                        {qwertyLayout === 'mirp' ? (
                            <>
                                <div>Transpose: {mirpTranspose} (↑/↓)</div>
                                <div className="text-xs text-slate-400 mt-1">Shift = Black Key</div>
                            </>
                        ) : (
                            `Octave Shift: ${qwertyCurrentOctaveShift} (↑/↓)`
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div 
      className="absolute top-0 left-0 h-full z-30 pointer-events-none"
      style={{ 
        width: `${SIDEBAR_WIDTH}px`, 
        backgroundColor: backgroundColor === 'transparent' ? 'rgba(247, 245, 237, 0.95)' : 'rgba(247, 245, 237, 1)',
        backdropFilter: lowDetailMode ? 'none' : 'blur(4px)',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
        borderRight: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      <div ref={containerRef} />
    </div>
  );
});

const SheetMusicBackground: React.FC<{ vexFlowData: VexFlowRenderData; totalWidth: number; height: number; instrumentMode?: 'piano' | 'drum'; }> = React.memo(({ vexFlowData, totalWidth, height, instrumentMode = 'piano' }) => {
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
    const isDrum = instrumentMode === 'drum';

    measures.forEach((measure, i) => {
      const treble = new Stave(currentX, topStaveYOffset, measure.width);
      const bass = isDrum ? null : new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
      
      treble.setMeasure(i + 1);

      treble.setContext(ctx).draw();
      if (bass) bass.setContext(ctx).draw();
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
    isQwertyView?: boolean;
    lowDetailMode?: boolean;
    instrumentMode?: 'piano' | 'drum';
    xShift?: number;
}> = ({ note, vexNoteInfo, noteIndexInChord, yOnStave, x, y, width, color, glow, label, isQwertyView, lowDetailMode = false, instrumentMode = 'piano', xShift = 0 }) => {
    
    if (isQwertyView) {
        const qwertyStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${x + xShift}px`,
            top: `${y}px`,
            transform: 'translateY(-50%)',
            zIndex: 10,
            color: '#000000',
            backgroundColor: glow ? color : 'transparent',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            boxShadow: glow && !lowDetailMode ? `0 0 10px ${color}` : 'none',
            transition: 'color 100ms, background-color 100ms, box-shadow 100ms',
            whiteSpace: 'nowrap',
        };

        if (!label) return null;

        return (
            <div style={qwertyStyle}>
                {label}
            </div>
        );
    }

    const noteAccidental = useMemo(() => {
        if (instrumentMode === 'drum') return null;
        if (!vexNoteInfo.accidentals || !vexNoteInfo.originalNotes) return null;
        const currentNoteIndexInChord = vexNoteInfo.originalNotes.findIndex(n => n.fragmentId === note.fragmentId);
        if (currentNoteIndexInChord === -1) return null;
        const accidentalData = vexNoteInfo.accidentals.find(acc => acc.index === currentNoteIndexInChord);
        if (!accidentalData) return null;
        return accidentalData.type === '#' ? '♯' : accidentalData.type === 'b' ? '♭' : accidentalData.type === 'n' ? '♮' : null;
    }, [vexNoteInfo, note.fragmentId, instrumentMode]);

    const DRUM_MIDI_MAPPING: { [key: number]: { key: string, noteHead?: string } } = {
        35: { key: 'f/4' }, 36: { key: 'f/4' }, 38: { key: 'c/5' }, 40: { key: 'c/5' },
        41: { key: 'a/4' }, 43: { key: 'a/4' }, 45: { key: 'b/4' }, 47: { key: 'b/4' },
        48: { key: 'd/5' }, 50: { key: 'd/5' }, 42: { key: 'g/5', noteHead: 'x' },
        46: { key: 'g/5', noteHead: 'x' }, 44: { key: 'd/4', noteHead: 'x' },
        49: { key: 'a/5', noteHead: 'x' }, 57: { key: 'a/5', noteHead: 'x' },
        51: { key: 'f/5', noteHead: 'x' }, 59: { key: 'f/5', noteHead: 'x' },
        53: { key: 'f/5', noteHead: 'x' }, 55: { key: 'a/5', noteHead: 'x' },
        52: { key: 'a/5', noteHead: 'x' },
    };

    const isRightHand = note.hand === 'right';
    const isDrum = instrumentMode === 'drum';
    const noteheadY = NOTE_HEAD_WIDTH / 2;
    // Stem Up (Right Hand/Drum): Stem on right side (x = NOTE_HEAD_WIDTH - STEM_WIDTH)
    // Stem Down (Left Hand): Stem on left side (x = 0)
    const isStemUp = isDrum || isRightHand;
    const stemX = isStemUp ? NOTE_HEAD_WIDTH - STEM_WIDTH : 0;
    const stemY = isStemUp ? noteheadY - STEM_HEIGHT : noteheadY;

    const LedgerLines = useMemo(() => {
        if (isDrum) return null;
        if (!vexNoteInfo.vexNoteKeyProps || !vexNoteInfo.vexNoteKeyProps[noteIndexInChord]) return null;
        const { line } = vexNoteInfo.vexNoteKeyProps[noteIndexInChord];
        const lines: React.JSX.Element[] = [], LW = NOTE_HEAD_WIDTH + 8, LX = (NOTE_HEAD_WIDTH - LW) / 2;
        const V_OFF = 8 * STEP_HEIGHT; 
        if (line > 5) { for (let l = 6; l <= Math.ceil(line); l++) if (l <= line + 0.4) lines.push(<rect key={`ll-a-${l}`} x={LX} y={noteheadY + (5 - l) * STAFF_LINE_SPACING - yOnStave + V_OFF} width={LW} height="1.5" fill="#000" />); }
        else if (line < 1) { for (let l = 0; l >= Math.floor(line); l--) if (l >= line - 0.4) lines.push(<rect key={`ll-b-${l}`} x={LX} y={noteheadY + (1 - l) * STAFF_LINE_SPACING + (STAFF_LINE_SPACING * 4) - yOnStave + V_OFF} width={LW} height="1.5" fill="#000" />); }
        return lines;
    }, [yOnStave, noteheadY, vexNoteInfo, noteIndexInChord, isDrum]);

    const style: React.CSSProperties = { position: 'absolute', left: `${x}px`, top: `${y - noteheadY}px`, width: `${width + Math.abs(xShift)}px`, height: `${NOTE_HEAD_WIDTH}px`, zIndex: 10, overflow: 'visible' };
    
    const noteFillColor = glow ? color : '#000000';
    const noteStrokeColor = '#000000';

    const drumMap = isDrum ? DRUM_MIDI_MAPPING[note.midi] : null;
    const isXNoteHead = drumMap?.noteHead === 'x';

    return (
        <div style={style}>
            <svg width={width + Math.abs(xShift)} height={NOTE_HEAD_WIDTH} style={{ overflow: 'visible' }}>
                <g transform={`translate(${xShift}, 0)`}>
                    {glow && !lowDetailMode && <ellipse cx={NOTE_HEAD_WIDTH / 2} cy={noteheadY} rx={NOTE_HEAD_WIDTH} ry={NOTE_HEAD_WIDTH * 0.8} fill={color} filter="url(#glow)" />}
                    {LedgerLines}
                    {noteAccidental && <text x={ACCIDENTAL_OFFSET_X} y={noteheadY} fontSize={ACCIDENTAL_FONT_SIZE} fill="#000" fontWeight="bold" dominantBaseline="central">{noteAccidental}</text>}
                    {isXNoteHead ? (
                        <g transform={`translate(${NOTE_HEAD_WIDTH/2 - 4}, ${noteheadY - 4})`}>
                            <line x1="0" y1="0" x2="8" y2="8" stroke={noteFillColor} strokeWidth="2" />
                            <line x1="8" y1="0" x2="0" y2="8" stroke={noteFillColor} strokeWidth="2" />
                        </g>
                    ) : (
                        <ellipse cx={NOTE_HEAD_WIDTH / 2} cy={noteheadY} rx={NOTE_HEAD_WIDTH / 2} ry={NOTE_HEAD_WIDTH / 2.5} fill={noteFillColor} stroke={noteStrokeColor} strokeWidth="1" transform={`rotate(-20 ${NOTE_HEAD_WIDTH/2} ${noteheadY})`} />
                    )}
                    {label && <text x={NOTE_HEAD_WIDTH / 2} y={noteheadY + 4} fontSize="10" fill="white" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>{label}</text>}
                </g>
                <rect x={stemX} y={stemY} width={STEM_WIDTH} height={STEM_HEIGHT} fill={noteFillColor} />
            </svg>
        </div>
    );
};

const HorizontalNotesView: React.FC<HorizontalNotesViewProps> = React.memo(({
  currentTimeMs, width, height, pixelsPerMillisecond, activePlaybackNotesInfo, rightHandColor, leftHandColor, hitNoteColor, backgroundColor, vexFlowData, showOnlyMajorNotes, noteLabelType, activeKeySignature, qwertyLayout, qwertyCurrentOctaveShift, mirpTranspose, isQwertyView, activeBpmForDisplay, lowDetailMode = false, instrumentMode = 'piano', isPaused = false, onSeek
}) => {
  const dragRef = useRef<{ isDragging: boolean; startX: number; startTime: number } | null>(null);
  const PLAY_LINE_X = SIDEBAR_WIDTH + (width > SIDEBAR_WIDTH ? (width - SIDEBAR_WIDTH) * 0.1 : 0);
  const originalNoteToVexMap = useMemo(() => {
    const map = new Map<string, VexFlowNoteInfo>(); if (!vexFlowData) return map;
    vexFlowData.measures.flatMap(m => [...m.rightHand, ...m.leftHand]).forEach(vn => { vn.originalNotes?.forEach(on => { if (!map.has(on.originalNoteId)) map.set(on.originalNoteId, vn); }); });
    return map;
  }, [vexFlowData]);

  const totalMusicWidth = useMemo(() => vexFlowData ? vexFlowData.measures.reduce((sum, m) => sum + m.width, 0) + (HORIZONTAL_PADDING * 2) : width, [vexFlowData, width]);
  const firstMeasureStartTime = vexFlowData?.measures[0]?.startTimeMs ?? 0;
  const isDrum = instrumentMode === 'drum';
  const visibleNotes = useMemo(() => {
    if (!vexFlowData || pixelsPerMillisecond <= 0) return [];
    const relT = currentTimeMs - firstMeasureStartTime, curPx = relT * pixelsPerMillisecond, startPx = curPx - PLAY_LINE_X - 50, endPx = startPx + width + 50;
    return vexFlowData.fragments.filter(n => {
      const sp = (n.timeMs - firstMeasureStartTime) * pixelsPerMillisecond, ep = sp + (n.durationMs * pixelsPerMillisecond);
      return ep > startPx && sp < endPx;
    });
  }, [vexFlowData, currentTimeMs, pixelsPerMillisecond, width, PLAY_LINE_X, firstMeasureStartTime]);

    const notesGroupedByTime = useMemo(() => {
        if (!isQwertyView) return null;
        const groups = new Map<number, NoteFragment[]>();
        visibleNotes.forEach(note => {
            const time = note.timeMs;
            if (!groups.has(time)) groups.set(time, []);
            groups.get(time)!.push(note);
        });
        groups.forEach(group => group.sort((a, b) => b.midi - a.midi));
        return groups;
    }, [visibleNotes, isQwertyView]);

  const renderedBarLines = useMemo(() => {
    if (!vexFlowData) return null;
    let acc = HORIZONTAL_PADDING;
    return vexFlowData.measures.map((m, index) => {
      const left = acc; acc += m.width;

      if (isQwertyView) {
        return (
          <div key={`bar-line-${m.startTimeMs}`} className="absolute top-0 bottom-0" style={{ left: `${left}px`, zIndex: 5 }} aria-hidden="true">
            <div className="w-px h-full bg-slate-600" />
            <span className="absolute top-[25%] -translate-y-1/2 -translate-x-1/2 text-slate-800 text-sm font-mono">
              {index + 1}
            </span>
          </div>
        );
      }
      
      return <div key={`bar-line-${m.startTimeMs}`} className="absolute border-r border-slate-400" style={{ left: `${left}px`, top: `${vexFlowData.topStaveYOffset}px`, height: `${(STAFF_LINE_SPACING * 8) + vexFlowData.verticalSpacing}px`, zIndex: 5 }} aria-hidden="true" />;
    });
  }, [vexFlowData, isQwertyView]);

  const scrollOffset = (currentTimeMs - firstMeasureStartTime) * pixelsPerMillisecond;
  const containerTransform = `translateX(${PLAY_LINE_X - HORIZONTAL_PADDING - scrollOffset}px)`;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPaused) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startTime: currentTimeMs
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || !onSeek) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaTime = -deltaX / pixelsPerMillisecond;
    onSeek(dragRef.current.startTime + deltaTime);
  };

  const handleMouseUp = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isPaused || !onSeek) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const deltaTime = delta / pixelsPerMillisecond * 2;
    onSeek(currentTimeMs + deltaTime);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPaused) return;
    dragRef.current = {
      isDragging: true,
      startX: e.touches[0].clientX,
      startTime: currentTimeMs
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || !onSeek) return;
    const deltaX = e.touches[0].clientX - dragRef.current.startX;
    const deltaTime = -deltaX / pixelsPerMillisecond;
    onSeek(dragRef.current.startTime + deltaTime);
  };

  const handleTouchEnd = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

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
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        {!lowDetailMode && <defs><filter id="glow"><feGaussianBlur stdDeviation="3.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>}
      </svg>
      
      {vexFlowData && (
        <StickyStaffHeader 
          vexFlowData={vexFlowData} 
          currentTimeMs={currentTimeMs} 
          height={height} 
          isQwertyView={isQwertyView}
          activeKeySignature={activeKeySignature}
          activeBpmForDisplay={activeBpmForDisplay}
          qwertyLayout={qwertyLayout}
          qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
          mirpTranspose={mirpTranspose}
          backgroundColor={backgroundColor}
          lowDetailMode={lowDetailMode}
          instrumentMode={instrumentMode}
        />
      )}

      <div style={{ transform: containerTransform, willChange: 'transform', width: totalMusicWidth, height }}>
        {vexFlowData && !isQwertyView && <SheetMusicBackground vexFlowData={vexFlowData} totalWidth={totalMusicWidth} height={height} instrumentMode={instrumentMode} />}
        {renderedBarLines}
        {!isQwertyView && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: totalMusicWidth, height, pointerEvents: 'none', zIndex: 15 }}>
            {vexFlowData?.octaveLines.map((line, index) => {
              const y = line.startY;
              const text = line.type;
              const isAbove = line.type === '8va' || line.type === '15ma';
              const textY = y;
              const lineY = isAbove ? y + 4 : y + 16;
              const hookEndY = isAbove ? lineY + 10 : lineY - 10;

              return (
                  <g key={`octave-${index}`} fill="#000" stroke="#000" strokeWidth="1.5">
                      <text x={line.startX} y={textY} fontSize="16" fontStyle="italic" fontWeight="bold">{text}</text>
                      <path d={`M ${line.startX + (text.length * 10)} ${lineY} L ${line.endX} ${lineY}`} strokeDasharray="4,3" fill="none" />
                      <path d={`M ${line.endX} ${lineY} L ${line.endX} ${hookEndY}`} fill="none" />
                  </g>
              );
            })}
          </svg>
        )}
        {isQwertyView && notesGroupedByTime ? (
            Array.from(notesGroupedByTime.entries()).map(([timeMs, group]) => {
                const xPos = ((timeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING;
                return group.map((note, indexInGroup) => {
                    const vn = originalNoteToVexMap.get(note.originalNoteId);
                    if (!vn) return null;

                    const noteWidth = Math.max(NOTE_HEAD_WIDTH, (showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs) * pixelsPerMillisecond);
                    const yPos = (height / 2) + (indexInGroup - (group.length - 1) / 2) * 20;

                    const active = activePlaybackNotesInfo.get(note.noteId);
                    const status = active?.status || null;
                    const baseC = instrumentMode === 'drum' ? leftHandColor : (note.hand === 'left' ? leftHandColor : rightHandColor);

                    let label = '';
                    if (noteLabelType === 'qwerty') {
                        if (qwertyLayout === 'mirp') { const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === note.midi - (mirpTranspose || 0)); if (match) label = match.label; }
                        else { const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === note.midi - ((qwertyCurrentOctaveShift || 0) * 12)); if (match) label = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase(); }
                    }

                    return <ScrollingSheetNote 
                        key={note.fragmentId} note={note} vexNoteInfo={vn} noteIndexInChord={0} 
                        yOnStave={0} x={xPos} y={yPos} width={noteWidth}
                        color={status === 'user_played' ? hitNoteColor : baseC} glow={!!status}
                        label={label} isQwertyView={true} lowDetailMode={lowDetailMode}
                    />;
                });
            })
        ) : (
            visibleNotes.map(note => {
                const vn = originalNoteToVexMap.get(note.originalNoteId);
                if (!vn || !vn.vexNoteYPositions) return null;
                const idx = vn.originalNotes?.findIndex(n => n.fragmentId === note.fragmentId) ?? -1; 
                if (idx === -1) return null;
                
                const active = activePlaybackNotesInfo.get(note.noteId), status = active?.status || null;
                const baseC = instrumentMode === 'drum' ? leftHandColor : (note.hand === 'left' ? leftHandColor : rightHandColor);
                
                let label = '';
                if (noteLabelType === 'noteName') {
                    label = note.pitchClass;
                    const isS = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
                    if (isS) label = ENHARMONIC_MAP_TO_SHARP[label] || label;
                    else if (FLAT_KEYS.includes(activeKeySignature)) label = ENHARMONIC_MAP_TO_FLAT[label] || label;
                } else if (noteLabelType === 'fingering' && note.finger) label = String(note.finger);

                const yPos = (isDrum ? vexFlowData!.topStaveYOffset : (note.hand === 'right' ? vexFlowData!.topStaveYOffset : vexFlowData!.topStaveYOffset + vexFlowData!.verticalSpacing)) + vn.vexNoteYPositions![idx];
                
                let xShift = 0;
                if (vn.vexNoteYPositions && vn.vexNoteYPositions.length > 1) {
                    const isStemUp = isDrum || note.hand === 'right';
                    let currentShift = false;
                    if (isStemUp) {
                        for (let i = 1; i <= idx; i++) {
                            if (Math.abs(vn.vexNoteYPositions[i] - vn.vexNoteYPositions[i - 1]) <= 6) {
                                currentShift = !currentShift;
                            } else {
                                currentShift = false;
                            }
                        }
                        if (currentShift) xShift = NOTE_HEAD_WIDTH;
                    } else {
                        for (let i = vn.vexNoteYPositions.length - 2; i >= idx; i--) {
                            if (Math.abs(vn.vexNoteYPositions[i] - vn.vexNoteYPositions[i + 1]) <= 6) {
                                currentShift = !currentShift;
                            } else {
                                currentShift = false;
                            }
                        }
                        if (currentShift) xShift = -NOTE_HEAD_WIDTH;
                    }
                }

                const xPos = ((note.timeMs - firstMeasureStartTime) * pixelsPerMillisecond) + HORIZONTAL_PADDING;
                const noteWidth = Math.max(NOTE_HEAD_WIDTH, (showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs) * pixelsPerMillisecond);

                return <ScrollingSheetNote 
                    key={note.fragmentId} note={note} vexNoteInfo={vn} noteIndexInChord={idx} yOnStave={vn.vexNoteYPositions ? vn.vexNoteYPositions[idx] : 0} 
                    x={xPos} y={yPos} width={noteWidth} color={status === 'user_played' ? hitNoteColor : baseC} 
                    glow={!!status} label={label} isQwertyView={isQwertyView} lowDetailMode={lowDetailMode} instrumentMode={instrumentMode} xShift={xShift}
                />;
            })
        )}
      </div>
      <div className="cursor-line" style={{ left: `${PLAY_LINE_X}px`, zIndex: 20 }} />
    </div>
  );
});

export default HorizontalNotesView;
