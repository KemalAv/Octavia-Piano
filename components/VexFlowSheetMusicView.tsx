
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

const HORIZONTAL_PADDING = 30; // Set to 30 to match HorizontalNotesView
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentMeasure = useMemo(() => {
    return vexFlowData.measures.find(m => currentTimeMs >= m.startTimeMs && currentTimeMs < m.endTimeMs) || vexFlowData.measures[0];
  }, [vexFlowData, currentTimeMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vexFlowData || !currentMeasure) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(SIDEBAR_WIDTH, height);
    const vexCtx = renderer.getContext();
    (vexCtx as any).setFillStyle = function(style: string) { this.fillStyle = style; };

    const topStaveYOffset = Math.floor(vexFlowData.topStaveYOffset);
    const verticalSpacing = Math.floor(vexFlowData.verticalSpacing);
    const { keySignature, timeSignature, instrumentMode } = vexFlowData;
    const isDrum = instrumentMode === 'drum';

    if (isDrum) {
        const drumStave = new Stave(0, topStaveYOffset, SIDEBAR_WIDTH - 5);
        const activeTime = currentMeasure.effectiveTimeSignature || timeSignature;
        drumStave.addClef('percussion');
        drumStave.addTimeSignature(`${activeTime.numerator}/${activeTime.denominator}`);
        drumStave.setContext(vexCtx).draw();
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

        treble.setContext(vexCtx).draw();
        bass.setContext(vexCtx).draw();
        new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(vexCtx).draw();
        new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(vexCtx).draw();
    }
  }, [vexFlowData, currentMeasure, height]);

  return (
    <div 
      className="absolute top-0 left-0 z-30 pointer-events-none"
      style={{ 
        width: `${SIDEBAR_WIDTH}px`,
        height: `${height}px`,
        backgroundColor: backgroundColor === 'transparent' 
            ? (lowDetailMode ? 'rgba(247, 245, 237, 0.8)' : 'rgba(247, 245, 237, 0.95)')
            : (backgroundColor === 'transparent' ? '#f7f5ed' : backgroundColor),
        backdropFilter: lowDetailMode ? 'none' : 'blur(4px)',
        borderRight: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '4px 0 12px rgba(0,0,0,0.08)'
      }}
    >
      <canvas ref={canvasRef} style={{ width: `${SIDEBAR_WIDTH}px`, height: `${height}px`, imageRendering: 'pixelated' }}/>
    </div>
  );
});

const VexFlowSheetMusicView: React.FC<Props> = React.memo(({
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
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]); 
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

  const chunks = useMemo(() => {
    if (!vexFlowData) return [];
    const CHUNK_SIZE = 16;
    const result: { chunkIndex: number; measures: VexFlowMeasureData[]; startX: number; width: number; globalStartIndex: number }[] = [];
    let currentChunkMeasures: VexFlowMeasureData[] = [];
    let currentChunkWidth = 0;
    let currentStartX = 0;
    let globalStartIndex = 0;

    vexFlowData.measures.forEach((m, idx) => {
      if (currentChunkMeasures.length === 0) {
        globalStartIndex = idx;
      }
      currentChunkMeasures.push(m);
      currentChunkWidth += m.width;

      const isLast = idx === vexFlowData.measures.length - 1;

      if (currentChunkMeasures.length >= CHUNK_SIZE || isLast) {
        const chunkIndex = result.length;
        const isFirst = chunkIndex === 0;
        const paddingLeft = isFirst ? HORIZONTAL_PADDING : 0;
        const paddingRight = isLast ? HORIZONTAL_PADDING : 0;
        const chunkWidth = currentChunkWidth + paddingLeft + paddingRight;

        result.push({
          chunkIndex,
          measures: currentChunkMeasures,
          startX: currentStartX,
          width: chunkWidth,
          globalStartIndex
        });
        currentStartX += chunkWidth;
        currentChunkMeasures = [];
        currentChunkWidth = 0;
      }
    });
    return result;
  }, [vexFlowData]);

  const totalMusicWidth = useMemo(() => {
    if (!vexFlowData) return width;
    return chunks.reduce((sum, c) => sum + c.width, 0);
  }, [vexFlowData, chunks, width]);

  useLayoutEffect(() => {
    if (!vexFlowData || width <= 0 || height <= 0) {
      canvasRefs.current.forEach(canvas => {
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      notePositionsRef.current.clear();
      setRenderedLayoutId(prev => { onLayoutRendered(prev + 1); return prev + 1; });
      return;
    }

    canvasRefs.current.forEach(canvas => {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    const newNotePositions = new Map<string, BoundingBox>();

    try {
      const topStaveYOffset = Math.floor(vexFlowData.topStaveYOffset);
      const verticalSpacing = Math.floor(vexFlowData.verticalSpacing);
      const { instrumentMode } = vexFlowData;
      const isDrum = instrumentMode === 'drum';

      chunks.forEach((chunk, chunkIdx) => {
        const canvas = canvasRefs.current[chunkIdx];
        if (!canvas) return;

        const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
        renderer.resize(chunk.width, height);
        const ctx = renderer.getContext();
        (ctx as any).setFillStyle = function(style: string) { this.fillStyle = style; };

        let currentX = chunk.chunkIndex === 0 ? HORIZONTAL_PADDING : 0;

        chunk.measures.forEach((measure, mIdx) => {
          const globalMeasureIdx = chunk.globalStartIndex + mIdx;
          const treble = new Stave(currentX, topStaveYOffset, measure.width);
          const bass = isDrum ? null : new Stave(currentX, topStaveYOffset + verticalSpacing, measure.width);
          
          treble.setMeasure(globalMeasureIdx + 1);

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
                  if (p.line <= 2) onOrAboveCount++;
                  else belowCount++;
              });

              let direction: number;
              if (onOrAboveCount > belowCount) {
                  direction = StaveNote.STEM_UP;
              } else if (belowCount > onOrAboveCount) {
                  direction = StaveNote.STEM_DOWN;
              } else {
                  direction = farthestLine <= 2 ? StaveNote.STEM_UP : StaveNote.STEM_DOWN;
              }
              
              n.setStemDirection(direction);
              return n; 
          };
          const rightStaveNotes: StaveNote[] = [];
          const rightInfoMap = new Map<string, VexFlowNoteInfo>();
          measure.rightHand.forEach(info => {
              const isDuplicate = rightStaveNotes.some(n => {
                  const rhInfo = rightInfoMap.get(n.getAttribute('id'));
                  return rhInfo && Math.abs(rhInfo.timeMs - info.timeMs) < 1 && rhInfo.midiValue === info.midiValue;
              });
              if (!isDuplicate) {
                  const n = createNote(info, false);
                  rightStaveNotes.push(n);
                  rightInfoMap.set(info.vexNoteId, info);
              }
          });

          const leftStaveNotes: StaveNote[] = [];
          const leftInfoMap = new Map<string, VexFlowNoteInfo>();
          measure.leftHand.forEach(info => {
              const isDuplicateInternal = leftStaveNotes.some(n => {
                  const lhInfo = leftInfoMap.get(n.getAttribute('id'));
                  return lhInfo && Math.abs(lhInfo.timeMs - info.timeMs) < 1 && lhInfo.midiValue === info.midiValue;
              });
              
              const isDuplicateAcross = rightStaveNotes.some(n => {
                  const rhInfo = rightInfoMap.get(n.getAttribute('id'));
                  return rhInfo && Math.abs(rhInfo.timeMs - info.timeMs) < 1 && rhInfo.midiValue === info.midiValue;
              });
              
              if (!isDuplicateInternal && !isDuplicateAcross) {
                  const n = createNote(info, true);
                  leftStaveNotes.push(n);
                  leftInfoMap.set(info.vexNoteId, info);
              }
          });
          
          const groupBeams = (notes: StaveNote[], timeSig: TimeSignatureInfo, tuplets: VexFlowTupletGroup[]) => {
              const beams: Beam[] = []; 
              let current: StaveNote[] = [];
              const { numerator, denominator } = timeSig;

              const applyStemDirectionToGroup = (group: StaveNote[]) => {
                  if (group.length === 0) return;
                  
                  let maxDist = -1;
                  let farthestLine = 2;
                  let onOrAboveCount = 0;
                  let belowCount = 0;

                  group.forEach(n => {
                      const props = n.getKeyProps();
                      props.forEach(p => {
                          const dist = Math.abs(p.line - 2);
                          if (dist > maxDist) {
                              maxDist = dist;
                              farthestLine = p.line;
                          }
                          if (p.line <= 2) onOrAboveCount++;
                          else belowCount++;
                      });
                  });
                  
                  let direction: number;
                  if (onOrAboveCount > belowCount) {
                      direction = StaveNote.STEM_UP;
                  } else if (belowCount > onOrAboveCount) {
                      direction = StaveNote.STEM_DOWN;
                  } else {
                      direction = farthestLine <= 2 ? StaveNote.STEM_UP : StaveNote.STEM_DOWN;
                  }
                  
                  group.forEach(n => n.setStemDirection(direction));
              };

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
              
              if (rightStaveNotes.length) {
                  voices[0].draw(ctx, treble); 
              }
              
              if (leftStaveNotes.length) {
                  const lhVoice = rightStaveNotes.length > 0 ? voices[1] : voices[0];
                  lhVoice.draw(ctx, isDrum ? treble : (bass as Stave)); 
              }
              
              rightBeams.forEach(b => b.setContext(ctx).draw()); 
              leftBeams.forEach(b => b.setContext(ctx).draw()); 
              rhTupletObjs.forEach(t => t.setContext(ctx).draw());
              lhTupletObjs.forEach(t => t.setContext(ctx).draw());
          }

          const capture = (notes: StaveNote[], map: Map<string, VexFlowNoteInfo>) => notes.forEach(sn => { 
              if (sn.isRest()) return; 
              const info = map.get(sn.getAttribute('id')); 
              if (info?.fragmentMapping) {
                  sn.noteHeads.forEach((nh, hi) => { 
                      const m = info.fragmentMapping!.find(x => x.keyIndex === hi); 
                      if (m) { 
                          const bb = nh.getBoundingBox(); 
                          if (bb) {
                              const absoluteX = chunk.startX + bb.getX();
                              const adjustedBox = {
                                  getX: () => absoluteX,
                                  getY: () => bb.getY(),
                                  getW: () => bb.getW(),
                                  getH: () => bb.getH(),
                              };
                              newNotePositions.set(m.fragmentId, adjustedBox as BoundingBox); 
                          }
                      } 
                  }); 
              }
          });
          capture(rightStaveNotes, rightInfoMap); 
          capture(leftStaveNotes, leftInfoMap);

          currentX += measure.width;
        });
      });

      notePositionsRef.current = newNotePositions; 
      setRenderedLayoutId(prev => prev + 1);
    } catch (e) { 
        console.error("VexFlow Rendering Error:", e);
        canvasRefs.current.forEach(canvas => {
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
        notePositionsRef.current.clear();
        setRenderedLayoutId(prev => prev + 1);
    }
  }, [vexFlowData, chunks, width, height, keySignature, timeSignature, totalDurationMs, onLayoutRendered]);

  useEffect(() => {
    setHighlights([]);
  }, [vexFlowData]);

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
          {chunks.map((chunk, chunkIdx) => (
            <canvas
              key={`chunk-${chunkIdx}`}
              ref={el => { canvasRefs.current[chunkIdx] = el; }}
              style={{
                position: 'absolute',
                top: 0,
                left: `${chunk.startX - (chunk.chunkIndex === 0 ? 0 : 0)}px`,
                width: `${chunk.width}px`,
                height: `${height}px`,
                imageRendering: 'pixelated'
              }}
            />
          ))}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: totalMusicWidth, height: '100%', pointerEvents: 'none', zIndex: 15 }}>
            {/* Active hit notehead highlights */}
            {Array.from(activePlaybackNotesInfo.entries()).map(([noteId, info]) => {
              if (info.status !== 'user_played') return null;
              const pos = notePositionsRef.current.get(`${noteId}-0`);
              if (!pos) return null;
              const x = pos.getX();
              const y = pos.getY();
              const w = pos.getW();
              const h = pos.getH();
              return (
                <ellipse
                  key={`highlight-${noteId}`}
                  cx={x + w / 2}
                  cy={y + h / 2}
                  rx={w * 0.85}
                  ry={h * 1.25}
                  fill={hitNoteColor || '#10b981'}
                  opacity={0.5}
                />
              );
            })}
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
            {vexFlowData?.tempoMarkings.map((mark, index) => (
              <text key={`tempo-${index}`} x={mark.x} y={mark.y} fontSize="14" fontWeight="bold" fill="#000">♩ = {mark.bpm}</text>
            ))}
          </svg>
        </div>
      </div>
      <div ref={cursorRef} className="cursor-line" style={{ left: `${PLAY_LINE_X}px` }} />
      {!vexFlowData && notes.length > 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><p className="text-slate-600 font-medium animate-pulse">Rendering Sheet Music...</p></div>}
    </div>
  );
});

export default VexFlowSheetMusicView;
