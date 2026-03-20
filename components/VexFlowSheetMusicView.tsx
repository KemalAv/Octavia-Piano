
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
  hitNoteColor: string;
  signatureEvents: SignatureEvent[];
  onLayoutRendered: (layoutId: number) => void;
  tempoEvents: TempoEvent[];
  playbackTempoMultiplier: number;
  backgroundColor?: string;
  lowDetailMode?: boolean;
  instrumentMode?: 'piano' | 'drum';
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

    const { topStaveYOffset, keySignature, timeSignature, verticalSpacing, instrumentMode } = vexFlowData;
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
  hitNoteColor,
  signatureEvents,
  onLayoutRendered,
  tempoEvents,
  playbackTempoMultiplier,
  backgroundColor = '#f7f5ed',
  lowDetailMode = false,
  instrumentMode = 'piano',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const vexFlowRenderRef = useRef<HTMLDivElement>(null); 
  const scrollOffsetRef = useRef(0);

  const [highlights, setHighlights] = useState<HighlightInfo[]>([]);
  const notePositionsRef = useRef<Map<string, BoundingBox>>(new Map());
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startTime: number } | null>(null);

  useEffect(() => {
    if (renderedLayoutId > 0) {
      onLayoutRendered(renderedLayoutId);
    }
  }, [renderedLayoutId, onLayoutRendered]);

  const vexFlowData = useMemo(() => {
    if (!notes.length || !timeSignature || initialTempoBpm <= 0) return null;
    if (width == null || width <= 0 || !Number.isFinite(width) || height == null || height <= 0 || !Number.isFinite(height)) return null;
    try {
      return getVexFlowRenderData(
        notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom,
        barLines, signatureEvents, width, height, true, 
        tempoEvents, playbackTempoMultiplier, false, instrumentMode
      );
    } catch (e) { return null; }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, tempoEvents, playbackTempoMultiplier, instrumentMode]);

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
      const { topStaveYOffset, verticalSpacing, instrumentMode } = vexFlowData;
      const isDrum = instrumentMode === 'drum';
      const measuresToRender = vexFlowData.measures;
      const renderer = new Renderer(renderContainer, Renderer.Backends.SVG);
      renderer.resize(totalMusicWidth, height);
      const ctx = renderer.getContext();
      let currentX = HORIZONTAL_PADDING;

      const DRUM_MIDI_MAPPING: { [key: number]: { key: string, noteHead?: string } } = {
        35: { key: 'f/4' }, // Bass Drum 2
        36: { key: 'f/4' }, // Bass Drum 1
        38: { key: 'c/5' }, // Snare Drum 1
        40: { key: 'c/5' }, // Snare Drum 2
        41: { key: 'a/4' }, // Low Floor Tom
        43: { key: 'a/4' }, // High Floor Tom
        45: { key: 'b/4' }, // Low Tom
        47: { key: 'b/4' }, // Low-Mid Tom
        48: { key: 'd/5' }, // Hi-Mid Tom
        50: { key: 'd/5' }, // High Tom
        42: { key: 'g/5', noteHead: 'x' }, // Closed Hi-Hat
        46: { key: 'g/5', noteHead: 'x' }, // Open Hi-Hat
        44: { key: 'd/4', noteHead: 'x' }, // Pedal Hi-Hat
        49: { key: 'a/5', noteHead: 'x' }, // Crash Cymbal 1
        57: { key: 'a/5', noteHead: 'x' }, // Crash Cymbal 2
        51: { key: 'f/5', noteHead: 'x' }, // Ride Cymbal 1
        59: { key: 'f/5', noteHead: 'x' }, // Ride Cymbal 2
        53: { key: 'f/5', noteHead: 'x' }, // Ride Bell
        55: { key: 'a/5', noteHead: 'x' }, // Splash Cymbal
        52: { key: 'a/5', noteHead: 'x' }, // Chinese Cymbal
      };

      measuresToRender.forEach((measure, i) => {
        const treble = new Stave(currentX, topStaveYOffset, measure.width);
        const bass = isDrum ? null : new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
        
        treble.setMeasure(i + 1);

        if (measure.startsRepeat) { 
            treble.setBegBarType(Barline.type.REPEAT_BEGIN); 
            if (bass) bass.setBegBarType(Barline.type.REPEAT_BEGIN); 
        }
        if (measure.endsRepeat) {
            treble.setEndBarType(Barline.type.REPEAT_END);
            if (bass) bass.setEndBarType(Barline.type.REPEAT_END);
        } else if (measure.endTimeMs >= totalDurationMs) { 
            treble.setEndBarType(Barline.type.END); 
            if (bass) bass.setEndBarType(Barline.type.END); 
        }
        
        treble.setContext(ctx).draw(); 
        if (bass) bass.setContext(ctx).draw();
        
        if (bass) new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        
        const createNote = (info: VexFlowNoteInfo, isLeftHand: boolean) => { 
            const n = new StaveNote({ ...info.vexNote }); 
            if (info.vexNote.dots) { for (let i = 0; i < info.vexNote.dots; i++) n.addModifier(new Dot()); } 
            if (info.accidentals) info.accidentals.forEach(acc => n.addModifier(new Accidental(acc.type), acc.index)); 
            
            n.setAttribute('id', info.vexNoteId); 
            
            // Middle line rule for single notes (will be overridden for beamed groups)
            const props = n.getKeyProps();
            let totalLine = 0;
            props.forEach(p => totalLine += p.line);
            const avgLine = totalLine / props.length;
            const direction = avgLine >= 3 ? StaveNote.STEM_DOWN : StaveNote.STEM_UP;
            
            n.setStemDirection(direction);
            return n; 
        };
        const rightInfoMap = new Map<string, VexFlowNoteInfo>(), rightStaveNotes: StaveNote[] = measure.rightHand.map(info => { const n = createNote(info, false); rightInfoMap.set(info.vexNoteId, info); return n; });
        const leftInfoMap = new Map<string, VexFlowNoteInfo>(), leftStaveNotes: StaveNote[] = measure.leftHand.map(info => { const n = createNote(info, true); leftInfoMap.set(info.vexNoteId, info); return n; });
        
        const groupBeams = (notes: StaveNote[], timeSig: TimeSignatureInfo, tuplets: VexFlowTupletGroup[]) => {
            const beams: Beam[] = []; 
            let current: StaveNote[] = [];
            const { numerator, denominator } = timeSig;

            const applyStemDirectionToGroup = (group: StaveNote[]) => {
                if (group.length === 0) return;
                
                // Calculate average line position
                let totalLine = 0;
                let noteCount = 0;
                group.forEach(n => {
                    const props = n.getKeyProps();
                    props.forEach(p => {
                        totalLine += p.line;
                        noteCount++;
                    });
                });
                
                const avgLine = totalLine / noteCount;
                // Middle line is 3. If avgLine > 3 (higher), stems go DOWN. If avgLine < 3 (lower), stems go UP.
                const direction = avgLine >= 3 ? StaveNote.STEM_DOWN : StaveNote.STEM_UP;
                
                group.forEach(n => n.setStemDirection(direction));
            };

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
                        if (current.length > 1) {
                            applyStemDirectionToGroup(current);
                            beams.push(new Beam(current));
                        }
                        current = [];
                    }
                } else {
                    if (current.length > 1) {
                        applyStemDirectionToGroup(current);
                        beams.push(new Beam(current));
                    }
                    current = [];
                }
            }
            if (current.length > 1) {
                applyStemDirectionToGroup(current);
                beams.push(new Beam(current));
            }

            // Explicitly add beams for tuplets to ensure they are separated per group
            tuplets.forEach(t => {
                const tupletNotes = t.indices.map(idx => notes[idx]);
                const beamableTupletNotes = tupletNotes.filter(n => !n.isRest());
                
                if (beamableTupletNotes.length > 1) {
                    const allNotesBeamable = beamableTupletNotes.every(n => {
                        const dur = n.getDuration();
                        return ['8', '16', '32', '64'].some(d => dur.includes(d));
                    });
                    
                    if (allNotesBeamable) {
                        applyStemDirectionToGroup(beamableTupletNotes);
                        beams.push(new Beam(beamableTupletNotes));
                    }
                }
            });

            return beams;
        };

        const rightBeams = groupBeams(rightStaveNotes, measure.effectiveTimeSignature, measure.rightHandTuplets);
        const leftBeams = groupBeams(leftStaveNotes, measure.effectiveTimeSignature, measure.leftHandTuplets);
        
        // --- TUPLET RENDERING ---
        const rhTupletObjs = measure.rightHandTuplets.map(g => {
            const tupletNotes = g.indices.map(idx => rightStaveNotes[idx]);
            const tuplet = new Tuplet(tupletNotes);
            if (tupletNotes.length > 0) {
                const direction = tupletNotes[0].getStemDirection();
                tuplet.setTupletLocation(direction === StaveNote.STEM_UP ? Tuplet.LOCATION_TOP : Tuplet.LOCATION_BOTTOM);
            }
            return tuplet;
        });
        const lhTupletObjs = measure.leftHandTuplets.map(g => {
            const tupletNotes = g.indices.map(idx => leftStaveNotes[idx]);
            const tuplet = new Tuplet(tupletNotes);
            if (tupletNotes.length > 0) {
                const direction = tupletNotes[0].getStemDirection();
                tuplet.setTupletLocation(direction === StaveNote.STEM_UP ? Tuplet.LOCATION_TOP : Tuplet.LOCATION_BOTTOM);
            }
            return tuplet;
        });

        const voices: Voice[] = [];
        if (rightStaveNotes.length) voices.push(new Voice({ num_beats: measure.effectiveTimeSignature.numerator, beat_value: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(rightStaveNotes));
        if (leftStaveNotes.length) voices.push(new Voice({ num_beats: measure.effectiveTimeSignature.numerator, beat_value: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(leftStaveNotes));
        
        if (voices.length) { 
            new Formatter().joinVoices(voices).format(voices, measure.width - 15); 
            if (rightStaveNotes.length) voices[0].draw(ctx, treble); 
            if (leftStaveNotes.length) (rightStaveNotes.length > 0 ? voices[1] : voices[0]).draw(ctx, isDrum ? treble : bass); 
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
      setRenderedLayoutId(prev => prev + 1);
    } catch (e) { 
        console.error("VexFlow Rendering Error:", e);
        if(renderContainer) while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild); 
        notePositionsRef.current.clear();
        // IMPORTANT: Signal that rendering "finished" (even if failed) so loading spinner stops
        setRenderedLayoutId(prev => prev + 1);
    }
    return () => { if (renderContainer) while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild); notePositionsRef.current.clear(); };
  }, [vexFlowData, width, height, keySignature, timeSignature, totalDurationMs, onLayoutRendered]);

  useEffect(() => {
    if (!vexFlowData) { setHighlights([]); return; }
    const newHighlights: HighlightInfo[] = [];
    activePlaybackNotesInfo.forEach(activeInfo => {
      let color: string | null = activeInfo.status === 'user_played' ? hitNoteColor : (['playing', 'waiting'].includes(activeInfo.status) ? (instrumentMode === 'drum' ? leftHandColor : (activeInfo.hand === 'left' ? leftHandColor : (activeInfo.hand === 'right' ? rightHandColor : SYSTEM_PLAY_COLOR))) : null);
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
    
    const anchorPoints: { timeMs: number, x: number }[] = [];
    let accumulatedWidth = HORIZONTAL_PADDING;
    
    vexFlowData.measures.forEach(measure => {
        const measureStartX = accumulatedWidth;
        
        const notesInMeasure = vexFlowData.fragments.filter(n => n.timeMs >= measure.startTimeMs && n.timeMs < measure.endTimeMs);
        const rhNotes = notesInMeasure.filter(n => n.hand === 'right');
        const lhNotes = notesInMeasure.filter(n => n.hand === 'left');
        
        let selectedNotes = [...rhNotes, ...lhNotes];
        selectedNotes.sort((a, b) => a.timeMs - b.timeMs);
        
        // Add measure start
        anchorPoints.push({ timeMs: measure.startTimeMs, x: measureStartX });
        
        selectedNotes.forEach(note => {
            const pos = notePositionsRef.current.get(note.fragmentId);
            if (pos) {
                anchorPoints.push({ timeMs: note.timeMs, x: pos.getX() });
            }
        });
        
        accumulatedWidth += measure.width;
    });
    
    if (vexFlowData.measures.length > 0) {
        const lastMeasure = vexFlowData.measures[vexFlowData.measures.length - 1];
        anchorPoints.push({ timeMs: lastMeasure.endTimeMs, x: accumulatedWidth });
    }
    
    anchorPoints.sort((a, b) => a.timeMs - b.timeMs);
    
    const uniqueAnchors: { timeMs: number, x: number }[] = [];
    for (const pt of anchorPoints) {
        if (uniqueAnchors.length === 0) {
            uniqueAnchors.push(pt);
        } else {
            const last = uniqueAnchors[uniqueAnchors.length - 1];
            if (pt.timeMs === last.timeMs) {
                last.x = (last.x + pt.x) / 2;
            } else {
                uniqueAnchors.push(pt);
            }
        }
    }
    
    let absoluteCursorX = HORIZONTAL_PADDING;
    if (uniqueAnchors.length > 0) {
        let nextIdx = uniqueAnchors.findIndex(pt => pt.timeMs > currentTimeMs);
        if (nextIdx === -1) {
            absoluteCursorX = uniqueAnchors[uniqueAnchors.length - 1].x;
        } else if (nextIdx === 0) {
            absoluteCursorX = uniqueAnchors[0].x;
        } else {
            const prev = uniqueAnchors[nextIdx - 1];
            const next = uniqueAnchors[nextIdx];
            const progress = (currentTimeMs - prev.timeMs) / (next.timeMs - prev.timeMs);
            absoluteCursorX = prev.x + (next.x - prev.x) * progress;
        }
    }

    const newScrollOffset = (PLAY_LINE_X - SIDEBAR_WIDTH) - absoluteCursorX;
    scrollOffsetRef.current = newScrollOffset;
    scrollContainerRef.current.style.transform = `translateX(${newScrollOffset}px)`;
  }, [currentTimeMs, vexFlowData, width, PLAY_LINE_X]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPlaying || totalDurationMs <= 0) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startTime: currentTimeMs
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || totalMusicWidth <= 0) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const msPerPixel = totalDurationMs / totalMusicWidth;
    const deltaTime = -deltaX * msPerPixel;
    onSeek(Math.max(0, Math.min(totalDurationMs, dragRef.current.startTime + deltaTime)));
  };

  const handleMouseUp = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isPlaying || totalDurationMs <= 0) return;
    const msPerPixel = totalDurationMs / totalMusicWidth;
    // deltaY is vertical scroll, but we want it to scroll horizontally
    // or if the user uses horizontal scroll (deltaX)
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const deltaTime = delta * msPerPixel * 2; // multiply by 2 for faster scrolling
    onSeek(Math.max(0, Math.min(totalDurationMs, currentTimeMs + deltaTime)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPlaying || totalDurationMs <= 0) return;
    dragRef.current = {
      isDragging: true,
      startX: e.touches[0].clientX,
      startTime: currentTimeMs
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging || totalMusicWidth <= 0) return;
    const deltaX = e.touches[0].clientX - dragRef.current.startX;
    const msPerPixel = totalDurationMs / totalMusicWidth;
    const deltaTime = -deltaX * msPerPixel;
    onSeek(Math.max(0, Math.min(totalDurationMs, dragRef.current.startTime + deltaTime)));
  };

  const handleTouchEnd = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

  return (
    <div 
      className={`sheet-container no-select ${!isPlaying ? 'cursor-ew-resize' : ''}`} 
      style={{ width: `${width}px`, height: `${height}px`, backgroundColor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
