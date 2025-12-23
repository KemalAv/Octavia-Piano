import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
  useState,
} from 'react';
import {
  Accidental,
  Barline,
  Beam,
  BoundingBox,
  Dot,
  Formatter,
  Renderer,
  Stave,
  StaveConnector,
  StaveNote,
  Voice,
} from 'vexflow';
// Added VexFlowRenderData to imports to fix "Cannot find name 'VexFlowRenderData'" error on line 77
import {
  MidiNotePlaybackItem,
  TimeSignatureInfo,
  ActiveMidiNoteInfo,
  VexFlowMeasureData,
  VexFlowNoteInfo,
  OctaveLineInfo,
  NoteFragment,
  TempoEvent,
  VexFlowRenderData,
} from '../types';
import { getVexFlowRenderData } from '../vexflow-helper';
import { SYSTEM_PLAY_COLOR, USER_PLAY_COLOR } from '../constants'; 

const HORIZONTAL_PADDING = 0; // Set to 0 to remove initial padding
const SIDEBAR_WIDTH = 200; // Increased from 140

interface HighlightInfo {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface SignatureEvent {
  timeMs: number;
  key?: string;
  time?: TimeSignatureInfo;
}

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
  signatureEvents: SignatureEvent[];
  onLayoutRendered: (layoutId: number) => void;
  tempoEvents: TempoEvent[];
  playbackTempoMultiplier: number;
}

const StickySignaturePanel: React.FC<{
  vexFlowData: VexFlowRenderData;
  currentTimeMs: number;
  height: number;
}> = React.memo(({ vexFlowData, currentTimeMs, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
  }, [vexFlowData, currentMeasure, height]);

  return (
    <div 
      className="absolute top-0 left-0 h-full z-30 pointer-events-none"
      style={{ 
        width: `${SIDEBAR_WIDTH}px`, 
        backgroundColor: 'rgba(247, 245, 237, 0.95)',
        backdropFilter: 'blur(4px)',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '4px 0 12px rgba(0,0,0,0.08)'
      }}
    >
      <div ref={containerRef} />
    </div>
  );
});

const VexFlowSheetMusicView: React.FC<Props> = ({
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
  signatureEvents,
  onLayoutRendered,
  tempoEvents,
  playbackTempoMultiplier,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const vexFlowRenderRef = useRef<HTMLDivElement>(null); // New ref for VexFlow rendering
  const scrollOffsetRef = useRef(0);

  const [highlights, setHighlights] = useState<HighlightInfo[]>([]);
  const notePositionsRef = useRef<Map<string, BoundingBox>>(new Map());
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);

  const vexFlowData = useMemo(() => {
    if (!notes.length || !timeSignature || initialTempoBpm <= 0) return null;
    if (width == null || width <= 0 || !Number.isFinite(width) || height == null || height <= 0 || !Number.isFinite(height)) return null;
    try {
      return getVexFlowRenderData(
        notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom,
        barLines, signatureEvents, width, height, true, // Enabled showOnlyMajorRests
        tempoEvents, playbackTempoMultiplier, false 
      );
    } catch (e) { return null; }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, tempoEvents, playbackTempoMultiplier]);

  const PLAY_LINE_X = SIDEBAR_WIDTH + (width > SIDEBAR_WIDTH ? (width - SIDEBAR_WIDTH) * 0.1 : 0);

  const totalMusicWidth = useMemo(() => {
    if (!vexFlowData) return width;
    return vexFlowData.measures.reduce((sum, m) => sum + m.width, 0) + (HORIZONTAL_PADDING * 2);
  }, [vexFlowData, width]);

  useLayoutEffect(() => {
    const renderContainer = vexFlowRenderRef.current;
    if (!renderContainer || !vexFlowData || width <= 0 || height <= 0) { 
        if(renderContainer) while(renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
        notePositionsRef.current.clear(); 
        return; 
    }
    while(renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
    const newNotePositions = new Map<string, BoundingBox>();
    try {
      const { topStaveYOffset, verticalSpacing } = vexFlowData;
      const measuresToRender = vexFlowData.measures;
      const renderer = new Renderer(renderContainer, Renderer.Backends.SVG);
      renderer.resize(totalMusicWidth, height);
      const ctx = renderer.getContext();
      let currentX = HORIZONTAL_PADDING;
      measuresToRender.forEach((measure) => {
        const treble = new Stave(currentX, topStaveYOffset, measure.width), bass = new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
        
        if (measure.startsRepeat) { treble.setBegBarType(Barline.type.REPEAT_BEGIN); bass.setBegBarType(Barline.type.REPEAT_BEGIN); }
        if (measure.endsRepeat) treble.setEndBarType(Barline.type.REPEAT_END); else if (measure.endTimeMs >= totalDurationMs) { treble.setEndBarType(Barline.type.END); bass.setEndBarType(Barline.type.END); }
        
        treble.setContext(ctx).draw(); bass.setContext(ctx).draw();
        
        new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        
        const createNote = (info: VexFlowNoteInfo) => { const n = new StaveNote({ ...info.vexNote }); if (info.vexNote.dots) { for (let i = 0; i < info.vexNote.dots; i++) n.addModifier(new Dot()); } if (info.accidentals) info.accidentals.forEach(acc => n.addModifier(new Accidental(acc.type), acc.index)); n.setAttribute('id', info.vexNoteId); return n; };
        const rightInfoMap = new Map<string, VexFlowNoteInfo>(), rightStaveNotes: StaveNote[] = measure.rightHand.map(info => { const n = createNote(info); rightInfoMap.set(info.vexNoteId, info); return n; });
        const leftInfoMap = new Map<string, VexFlowNoteInfo>(), leftStaveNotes: StaveNote[] = measure.leftHand.map(info => { const n = createNote(info); leftInfoMap.set(info.vexNoteId, info); return n; });
        const groupBeams = (notes: StaveNote[]) => {
            const beams: Beam[] = []; let current: StaveNote[] = [];
            for (let i = 0; i < notes.length; i++) {
                const isB = !notes[i].isRest() && ['8', '16', '32', '64'].includes(notes[i].getDuration());
                if (isB) { current.push(notes[i]); const nextB = i + 1 < notes.length && !notes[i+1].isRest() && ['8', '16', '32', '64'].includes(notes[i+1].getDuration()); if (current.length === 4 || !nextB) { if (current.length > 1) beams.push(new Beam(current)); current = []; } } else { if (current.length > 1) beams.push(new Beam(current)); current = []; }
            }
            return beams;
        };
        const rightBeams = groupBeams(rightStaveNotes), leftBeams = groupBeams(leftStaveNotes), voices: Voice[] = [];
        if (rightStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(rightStaveNotes));
        if (leftStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(leftStaveNotes));
        if (voices.length) { new Formatter().joinVoices(voices).format(voices, measure.width - 15); if (rightStaveNotes.length) voices[0].draw(ctx, treble); if (leftStaveNotes.length) (rightStaveNotes.length > 0 ? voices[1] : voices[0]).draw(ctx, bass); rightBeams.forEach(b => b.setContext(ctx).draw()); leftBeams.forEach(b => b.setContext(ctx).draw()); }
        const capture = (notes: StaveNote[], map: Map<string, VexFlowNoteInfo>) => notes.forEach(sn => { if (sn.isRest()) return; const info = map.get(sn.getAttribute('id')); if (info?.fragmentMapping) sn.noteHeads.forEach((nh, hi) => { const m = info.fragmentMapping!.find(x => x.keyIndex === hi); if (m) { const bb = nh.getBoundingBox(); if (bb) newNotePositions.set(m.fragmentId, bb); } }); });
        capture(rightStaveNotes, rightInfoMap); capture(leftStaveNotes, leftInfoMap); currentX += measure.width;
      });

      // Render tempo markings
      vexFlowData.tempoMarkings.forEach(mark => {
        ctx.setFont('Arial', 14, 'bold').fillText(`♩ = ${mark.bpm}`, mark.x, mark.y);
      });

      notePositionsRef.current = newNotePositions; setRenderedLayoutId(prev => { onLayoutRendered(prev + 1); return prev + 1; });
    } catch (e) { if(renderContainer) while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild); notePositionsRef.current.clear(); }
    return () => { if (renderContainer) while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild); notePositionsRef.current.clear(); };
  }, [vexFlowData, width, height, keySignature, timeSignature, totalDurationMs, onLayoutRendered]);

  useEffect(() => {
    if (!vexFlowData) { setHighlights([]); return; }
    const newHighlights: HighlightInfo[] = [];
    activePlaybackNotesInfo.forEach(activeInfo => {
      let color: string | null = activeInfo.status === 'user_played' ? USER_PLAY_COLOR : (['playing', 'waiting'].includes(activeInfo.status) ? (activeInfo.hand === 'left' ? leftHandColor : (activeInfo.hand === 'right' ? rightHandColor : SYSTEM_PLAY_COLOR)) : null);
      if (color) {
        vexFlowData.noteIdToFragmentsMap.get(activeInfo.noteId)?.forEach(fragment => {
          const position = notePositionsRef.current.get(fragment.fragmentId);
          if (position) newHighlights.push({ key: fragment.fragmentId, x: position.getX(), y: position.getY(), w: position.getW(), h: position.getH(), color: color });
        });
      }
    });
    setHighlights(newHighlights);
  }, [activePlaybackNotesInfo, vexFlowData, renderedLayoutId, leftHandColor, rightHandColor]);

  useEffect(() => {
    if (!vexFlowData || !scrollContainerRef.current || width <= 0) return;

    const measures = vexFlowData.measures;
    if (!measures.length) return;

    let currentMeasureIndex = measures.findIndex(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs);
    if (currentMeasureIndex === -1) {
        if (currentTimeMs < measures[0].startTimeMs) {
            currentMeasureIndex = 0;
        } else {
            currentMeasureIndex = measures.length - 1;
        }
    }
    
    const currentMeasure = measures[currentMeasureIndex];
    const measureStartX = HORIZONTAL_PADDING + measures.slice(0, currentMeasureIndex).reduce((sum, m) => sum + m.width, 0);
    const progress = Math.min(1, Math.max(0, (currentTimeMs - currentMeasure.startTimeMs) / Math.max(1, currentMeasure.durationMs)));
    const absoluteCursorX = measureStartX + progress * currentMeasure.width;
    
    const newScrollOffset = (PLAY_LINE_X - SIDEBAR_WIDTH) - absoluteCursorX;
    scrollOffsetRef.current = newScrollOffset;

    scrollContainerRef.current.style.transform = `translateX(${newScrollOffset}px)`;
  }, [currentTimeMs, vexFlowData, width, PLAY_LINE_X]);

  return (
    <div className="sheet-container no-select" style={{ width: `${width}px`, height: `${height}px` }}>
      {vexFlowData && (
        <StickySignaturePanel 
          vexFlowData={vexFlowData} 
          currentTimeMs={currentTimeMs} 
          height={height} 
        />
      )}
      <div 
        ref={containerRef} 
        className="sheet-content-wrapper" 
        style={{ left: `${SIDEBAR_WIDTH}px`, width: `calc(100% - ${SIDEBAR_WIDTH}px)`}}
        onClick={(e) => {
          if (!containerRef.current || !vexFlowData || totalDurationMs <= 0) return;
          const rect = containerRef.current.getBoundingClientRect();
          const clickXInContainer = e.clientX - rect.left;
          const clickXInContent = clickXInContainer - scrollOffsetRef.current;
          
          let accumulatedWidth = HORIZONTAL_PADDING;
          for(const measure of vexFlowData.measures) {
              if (clickXInContent >= accumulatedWidth && clickXInContent < accumulatedWidth + measure.width) {
                  const progress = (clickXInContent - accumulatedWidth) / measure.width;
                  onSeek(measure.startTimeMs + progress * measure.durationMs); 
                  return; 
              }
              accumulatedWidth += measure.width;
          }
        }}
      >
        <div ref={scrollContainerRef} style={{ position: 'relative', width: totalMusicWidth, height, willChange: 'transform' }}>
          <div ref={vexFlowRenderRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
          <svg style={{ position: 'absolute', top: 0, left: 0, width: totalMusicWidth, height: '100%', pointerEvents: 'none', zIndex: 15 }}>
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
          {highlights.map(h => <div key={h.key} style={{ position: 'absolute', left: `${h.x}px`, top: `${h.y}px`, width: `${h.w}px`, height: `${h.h}px`, backgroundColor: h.color, borderRadius: '50%', opacity: 0.5, pointerEvents: 'none', zIndex: 5 }}/>)}
        </div>
      </div>
      <div ref={cursorRef} className="cursor-line" style={{ left: `${PLAY_LINE_X}px` }} />
      {!vexFlowData && notes.length > 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><p className="text-slate-600 font-medium animate-pulse">Rendering Sheet Music...</p></div>}
    </div>
  );
};

export default VexFlowSheetMusicView;
