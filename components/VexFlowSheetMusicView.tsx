
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
  Tuplet,
} from 'vexflow';
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
  VexFlowTupletGroup,
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
  backgroundColor?: string;
  lowDetailMode?: boolean;
}

interface StickySignaturePanelProps {
  vexFlowData: VexFlowRenderData;
  currentTimeMs: number;
  height: number;
  backgroundColor: string;
  lowDetailMode?: boolean;
}

const StickySignaturePanel: React.FC<StickySignaturePanelProps> = React.memo(({ vexFlowData, currentTimeMs, height, backgroundColor, lowDetailMode = false }) => {
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
        backgroundColor: backgroundColor === 'transparent' 
            ? (lowDetailMode ? 'rgba(247, 245, 237, 0.8)' : 'rgba(247, 245, 237, 0.95)')
            : 'rgba(247, 245, 237, 1)',
        backdropFilter: lowDetailMode ? 'none' : 'blur(4px)',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '4px 0 12px rgba(0,0,0,0.08)'
      }}
    >
      <div ref={containerRef} style={{ width: `${SIDEBAR_WIDTH}px` }}/>
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
  backgroundColor = '#f7f5ed',
  lowDetailMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const vexFlowRenderRef = useRef<HTMLDivElement>(null); 
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
        barLines, signatureEvents, width, height, true, 
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
        // Even if we don't render, signal that we are "done" to avoid hanging loading screens if data is invalid
        setRenderedLayoutId(prev => { onLayoutRendered(prev + 1); return prev + 1; });
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
      measuresToRender.forEach((measure, i) => {
        const treble = new Stave(currentX, topStaveYOffset, measure.width), bass = new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
        
        treble.setMeasure(i + 1);

        if (measure.startsRepeat) { treble.setBegBarType(Barline.type.REPEAT_BEGIN); bass.setBegBarType(Barline.type.REPEAT_BEGIN); }
        if (measure.endsRepeat) treble.setEndBarType(Barline.type.REPEAT_END); else if (measure.endTimeMs >= totalDurationMs) { treble.setEndBarType(Barline.type.END); bass.setEndBarType(Barline.type.END); }
        
        treble.setContext(ctx).draw(); bass.setContext(ctx).draw();
        
        new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        
        const createNote = (info: VexFlowNoteInfo) => { const n = new StaveNote({ ...info.vexNote }); if (info.vexNote.dots) { for (let i = 0; i < info.vexNote.dots; i++) n.addModifier(new Dot()); } if (info.accidentals) info.accidentals.forEach(acc => n.addModifier(new Accidental(acc.type), acc.index)); n.setAttribute('id', info.vexNoteId); return n; };
        const rightInfoMap = new Map<string, VexFlowNoteInfo>(), rightStaveNotes: StaveNote[] = measure.rightHand.map(info => { const n = createNote(info); rightInfoMap.set(info.vexNoteId, info); return n; });
        const leftInfoMap = new Map<string, VexFlowNoteInfo>(), leftStaveNotes: StaveNote[] = measure.leftHand.map(info => { const n = createNote(info); leftInfoMap.set(info.vexNoteId, info); return n; });
        
        const groupBeams = (notes: StaveNote[], timeSig: TimeSignatureInfo, tuplets: VexFlowTupletGroup[]) => {
            const beams: Beam[] = []; 
            let current: StaveNote[] = [];
            const { numerator, denominator } = timeSig;

            // Identify indices that are part of tuplets
            const tupletIndices = new Set<number>();
            tuplets.forEach(t => t.indices.forEach(idx => tupletIndices.add(idx)));

            const isQuadOrCut = (numerator === 4 && denominator === 4) || (numerator === 2 && denominator === 2);
            const isTripleOrCompound = (numerator === 3 && denominator === 4) ||
                                       (numerator === 6 && denominator === 8) ||
                                       (numerator === 12 && denominator === 8) ||
                                       (numerator === 3 && denominator === 8);

            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const duration = note.getDuration();
                const isBeamableDuration = ['8', '16', '32', '64'].some(d => duration.includes(d)); 
                const isRest = note.isRest();
                const isInTuplet = tupletIndices.has(i);

                // We break beams if:
                // 1. Current note is not beamable or is a rest.
                // 2. Current note is in a tuplet (handled separately).
                if (!isRest && isBeamableDuration && !isInTuplet) {
                    current.push(note);
                    const hasDotted = current.some(n => n.getModifiers().some(m => m instanceof Dot));
                    let limit = 4; 
                    if (isQuadOrCut) { limit = hasDotted ? 3 : 4; } else if (isTripleOrCompound) { limit = hasDotted ? 4 : 3; }
                    
                    const nextNote = notes[i + 1];
                    const nextDuration = nextNote ? nextNote.getDuration() : '';
                    const nextIsBeamable = nextNote && !nextNote.isRest() && ['8', '16', '32', '64'].some(d => nextDuration.includes(d));
                    const nextIsInTuplet = nextNote && tupletIndices.has(i + 1);

                    if (current.length >= limit || !nextIsBeamable || nextIsInTuplet) {
                        if (current.length > 1) beams.push(new Beam(current));
                        current = [];
                    }
                } else {
                    if (current.length > 1) beams.push(new Beam(current));
                    current = [];
                }
            }
            if (current.length > 1) beams.push(new Beam(current));

            // Explicitly add beams for tuplets to ensure they are separated per group
            tuplets.forEach(t => {
                const tupletNotes = t.indices.map(idx => notes[idx]);
                // Filter out tuplets that consist only of rests (though unlikely to be tupleted)
                const beamableTupletNotes = tupletNotes.filter(n => !n.isRest());
                
                if (beamableTupletNotes.length > 1) {
                    // Check if all notes in the tuplet are actually beamable (8th, 16th, 32nd, 64th)
                    // VexFlow throws if attempting to beam quarter notes (duration '4' or 'q'), 'h', 'w'.
                    const allNotesBeamable = beamableTupletNotes.every(n => {
                        const dur = n.getDuration();
                        return ['8', '16', '32', '64'].some(d => dur.includes(d));
                    });
                    
                    if (allNotesBeamable) {
                        beams.push(new Beam(beamableTupletNotes));
                    }
                }
            });

            return beams;
        };

        const rightBeams = groupBeams(rightStaveNotes, measure.effectiveTimeSignature, measure.rightHandTuplets);
        const leftBeams = groupBeams(leftStaveNotes, measure.effectiveTimeSignature, measure.leftHandTuplets);
        
        // --- TUPLET RENDERING ---
        const rhTupletObjs = measure.rightHandTuplets.map(g => new Tuplet(g.indices.map(idx => rightStaveNotes[idx])));
        const lhTupletObjs = measure.leftHandTuplets.map(g => new Tuplet(g.indices.map(idx => leftStaveNotes[idx])));

        const voices: Voice[] = [];
        if (rightStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(rightStaveNotes));
        if (leftStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(leftStaveNotes));
        
        if (voices.length) { 
            new Formatter().joinVoices(voices).format(voices, measure.width - 15); 
            if (rightStaveNotes.length) voices[0].draw(ctx, treble); 
            if (leftStaveNotes.length) (rightStaveNotes.length > 0 ? voices[1] : voices[0]).draw(ctx, bass); 
            rightBeams.forEach(b => b.setContext(ctx).draw()); 
            leftBeams.forEach(b => b.setContext(ctx).draw()); 
            rhTupletObjs.forEach(t => t.setContext(ctx).draw());
            lhTupletObjs.forEach(t => t.setContext(ctx).draw());
        }

        const capture = (notes: StaveNote[], map: Map<string, VexFlowNoteInfo>) => notes.forEach(sn => { if (sn.isRest()) return; const info = map.get(sn.getAttribute('id')); if (info?.fragmentMapping) sn.noteHeads.forEach((nh, hi) => { const m = info.fragmentMapping!.find(x => x.keyIndex === hi); if (m) { const bb = nh.getBoundingBox(); if (bb) newNotePositions.set(m.fragmentId, bb); } }); });
        capture(rightStaveNotes, rightInfoMap); capture(leftStaveNotes, leftInfoMap); currentX += measure.width;
      });

      vexFlowData.tempoMarkings.forEach(mark => {
        ctx.setFont('Arial', 14, 'bold').fillText(`♩ = ${mark.bpm}`, mark.x, mark.y);
      });

      notePositionsRef.current = newNotePositions; 
      setRenderedLayoutId(prev => { onLayoutRendered(prev + 1); return prev + 1; });
    } catch (e) { 
        console.error("VexFlow Rendering Error:", e);
        if(renderContainer) while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild); 
        notePositionsRef.current.clear();
        // IMPORTANT: Signal that rendering "finished" (even if failed) so loading spinner stops
        setRenderedLayoutId(prev => { onLayoutRendered(prev + 1); return prev + 1; });
    }
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
    const allNotesSorted = vexFlowData.fragments.sort((a, b) => a.timeMs - b.timeMs);
    const rightHandNotesSorted = allNotesSorted.filter(note => note.hand === 'right');
    const notesForScrolling = rightHandNotesSorted.length > 0 ? rightHandNotesSorted : allNotesSorted;
    if (!measures.length || !notesForScrolling.length) return;
    let nextNoteIndex = notesForScrolling.findIndex(note => note.timeMs > currentTimeMs);
    if (nextNoteIndex === -1) { nextNoteIndex = notesForScrolling.length - 1; }
    const prevNoteIndex = Math.max(0, nextNoteIndex - 1);
    const prevNote = notesForScrolling[prevNoteIndex];
    const nextNote = notesForScrolling[nextNoteIndex];
    const prevNotePos = notePositionsRef.current.get(prevNote.fragmentId);
    const nextNotePos = notePositionsRef.current.get(nextNote.fragmentId);
    let absoluteCursorX;
    if (prevNotePos && nextNotePos && prevNote !== nextNote) {
        const timeBetweenNotes = nextNote.timeMs - prevNote.timeMs;
        const timeIntoInterval = currentTimeMs - prevNote.timeMs;
        const progress = (timeBetweenNotes > 0) ? Math.max(0, Math.min(1, timeIntoInterval / timeBetweenNotes)) : 0;
        const prevX = prevNotePos.getX();
        const nextX = nextNotePos.getX();
        absoluteCursorX = prevX + (nextX - prevX) * progress;
    } else {
        let currentMeasureIndex = measures.findIndex(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs);
        if (currentMeasureIndex === -1) { currentMeasureIndex = currentTimeMs < measures[0].startTimeMs ? 0 : measures.length - 1; }
        const currentMeasure = measures[currentMeasureIndex];
        const measureStartX = HORIZONTAL_PADDING + measures.slice(0, currentMeasureIndex).reduce((sum, m) => sum + m.width, 0);
        const progress = Math.min(1, Math.max(0, (currentTimeMs - currentMeasure.startTimeMs) / Math.max(1, currentMeasure.durationMs)));
        absoluteCursorX = measureStartX + progress * currentMeasure.width;
    }
    const newScrollOffset = (PLAY_LINE_X - SIDEBAR_WIDTH) - absoluteCursorX;
    scrollOffsetRef.current = newScrollOffset;
    scrollContainerRef.current.style.transform = `translateX(${newScrollOffset}px)`;
  }, [currentTimeMs, vexFlowData, width, PLAY_LINE_X]);

  return (
    <div className="sheet-container no-select" style={{ width: `${width}px`, height: `${height}px`, backgroundColor }}>
      {vexFlowData && (
        <StickySignaturePanel 
          vexFlowData={vexFlowData} 
          currentTimeMs={currentTimeMs} 
          height={height} 
          backgroundColor={backgroundColor}
          lowDetailMode={lowDetailMode}
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
          {highlights.map(h => <div key={h.key} style={{ position: 'absolute', left: `${h.x}px`, top: `${h.y}px`, width: `${h.w}px`, height: `${h.h}px`, backgroundColor: h.color, borderRadius: '50%', opacity: lowDetailMode ? 0.7 : 0.5, pointerEvents: 'none', zIndex: 5 }}/>)}
        </div>
      </div>
      <div ref={cursorRef} className="cursor-line" style={{ left: `${PLAY_LINE_X}px` }} />
      {!vexFlowData && notes.length > 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><p className="text-slate-600 font-medium animate-pulse">Rendering Sheet Music...</p></div>}
    </div>
  );
};

export default VexFlowSheetMusicView;
