
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
import {
  MidiNotePlaybackItem,
  TimeSignatureInfo,
  ActiveMidiNoteInfo,
  VexFlowMeasureData,
  VexFlowNoteInfo,
  OctaveLineInfo,
} from '../types';
import { getVexFlowRenderData } from '../vexflow-helper';

// --- Constants ---
const GRAND_STAFF_VERTICAL_SPACING = 130;
const HORIZONTAL_PADDING = 30;
const CURSOR_FIXED_POSITION_X = 0.2; // Shifted slightly right from 0.1

// --- Colors ---
const SYSTEM_PLAY_COLOR = '#C084FC'; // Purple for system play/wait
const USER_PLAY_COLOR = '#FFD400';   // Yellow for user play
const DEFAULT_NOTE_COLOR = '#000000'; // Black for default

// --- Helper Types ---
interface HighlightInfo {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// --- Helper Functions ---
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
  showOnlyMajorRests: boolean;
  onLayoutRendered: (layoutId: number) => void;
}

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
  showOnlyMajorRests,
  onLayoutRendered,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [highlights, setHighlights] = useState<HighlightInfo[]>([]);
  const notePositionsRef = useRef<Map<string, BoundingBox>>(new Map());
  const scrollPosRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const currentTimeMsRef = useRef(currentTimeMs);
  const [renderedLayoutId, setRenderedLayoutId] = useState(0); 

  // === Memoized render data ===
  const vexFlowData = useMemo(() => {
    if (!notes.length || !timeSignature || initialTempoBpm <= 0) return null;
    
    // CRITICAL FIX: Guard against invalid dimensions to prevent VexFlow crashes
    // Ensure dimensions are positive and finite numbers
    if (width == null || width <= 0 || !Number.isFinite(width) ||
        height == null || height <= 0 || !Number.isFinite(height)) {
      console.warn("VexFlow: Invalid dimensions, skipping vexFlowData generation.", {width, height});
      return null;
    }

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
        showOnlyMajorRests
      );
    } catch (e) {
      console.error("Error generating VexFlow data:", e);
      return null;
    }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, showOnlyMajorRests]);

  const totalContentWidth = useMemo(() => {
    if (!vexFlowData) return 0;
    return (
      HORIZONTAL_PADDING * 2 +
      vexFlowData.measures.reduce((sum, m) => sum + m.width, 0)
    );
  }, [vexFlowData]);

  // Memoized version of updatePosition
  const updatePosition = useCallback((timeToDisplay: number, smoothTransition: boolean, measures: VexFlowMeasureData[], currentTotalContentWidth: number, currentViewWidth: number) => {
    if (!measures.length || !contentWrapperRef.current || !cursorRef.current || currentViewWidth <= 0) return;

    const wrapper = contentWrapperRef.current;
    const cursor = cursorRef.current;

    let barIndex = measures.findIndex(
      (m) => timeToDisplay >= m.startTimeMs && timeToDisplay < m.endTimeMs
    );
    
    // Handle cases where time is before first bar or after last bar
    if (barIndex === -1) {
      barIndex = timeToDisplay < measures[0].startTimeMs ? 0 : measures.length - 1;
    }

    const currentBar = measures[barIndex];
    if (currentBar) {
      const startX = HORIZONTAL_PADDING + measures.slice(0, barIndex).reduce((sum, m) => sum + m.width, 0);
      const barDuration = Math.max(1, currentBar.durationMs);
      const progress = Math.min(1, Math.max(0, (timeToDisplay - currentBar.startTimeMs) / barDuration));
      const targetX = startX + progress * currentBar.width;
      
      const cursorFixedX = currentViewWidth * CURSOR_FIXED_POSITION_X;
      const targetScroll = Math.max(0, Math.min(currentTotalContentWidth - currentViewWidth, targetX - cursorFixedX));

      let currentScroll = scrollPosRef.current;
      // Use computed style for more accurate current position, defaulting to 0 if failing
      let currentCursorX = 0;
      try {
          const transform = cursor.style.transform || '';
          // More robust regex to catch translateX value
          const match = transform.match(/translateX\(([^)]+)(?:px)?\)/);
          if (match && match[1] !== undefined) {
             const parsed = parseFloat(match[1]);
             if (isFinite(parsed)) {
                currentCursorX = parsed;
             }
          }
      } catch(e) {
         // Ignore parsing error, currentCursorX remains 0
         console.warn("Error parsing cursor transform:", e);
      }

      let newScroll = targetScroll;
      let newCursorX = targetX - targetScroll;

      if (smoothTransition) {
          newScroll = lerp(currentScroll, targetScroll, 0.2);
          newCursorX = lerp(currentCursorX, targetX - newScroll, 0.2);
      }
      
      // Avoid NaN propagation
      if (!Number.isFinite(newScroll)) newScroll = 0;
      if (!Number.isFinite(newCursorX)) newCursorX = 0;

      // Apply updates
      scrollPosRef.current = newScroll;
      wrapper.style.transform = `translateX(${-newScroll}px)`;
      cursor.style.transform = `translateX(${newCursorX}px)`;
    }
  }, [contentWrapperRef, cursorRef, scrollPosRef]);


  // This effect keeps the ref updated with the latest time from props
  // and triggers static updates when seeking while paused.
  useEffect(() => {
    currentTimeMsRef.current = currentTimeMs;
    // If not playing AND we have layout data, update position immediately
    if (!isPlaying && vexFlowData && contentWrapperRef.current && cursorRef.current) {
        updatePosition(currentTimeMs, false, vexFlowData.measures, totalContentWidth, width);
    }
  }, [currentTimeMs, isPlaying, vexFlowData, totalContentWidth, width, updatePosition]);


  // === Render Sheet Music & Capture Note Positions ===
  useLayoutEffect(() => {
    const wrapper = contentWrapperRef.current;
    
    // Guard against invalid state or dimensions
    if (!wrapper || !vexFlowData) {
      if (wrapper) wrapper.innerHTML = '';
      notePositionsRef.current.clear(); 
      return;
    }
    
    // Explicitly check width/height again before VexFlow init
    if (width == null || width <= 0 || !Number.isFinite(width) ||
        height == null || height <= 0 || !Number.isFinite(height)) {
      console.warn("VexFlow: Invalid dimensions for rendering, clearing wrapper.", {width, height});
      wrapper.innerHTML = '';
      notePositionsRef.current.clear();
      return;
    }

    // Clear previous render
    wrapper.innerHTML = '';
    const newNotePositions = new Map<string, BoundingBox>();

    try {
      const { measures, topStaveYOffset, octaveLines } = vexFlowData;
      
      // Ensure dimensions are positive for VexFlow resizing
      const renderWidth = Math.max(1, totalContentWidth);
      const renderHeight = Math.max(1, height);

      const renderer = new Renderer(wrapper, Renderer.Backends.SVG);
      renderer.resize(renderWidth, renderHeight);
      const ctx = renderer.getContext();
      let currentX = 0;

      measures.forEach((measure) => {
        const treble = new Stave(currentX, topStaveYOffset, measure.width);
        const bass = new Stave(currentX, topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING, measure.width);
        
        if (measure.newClefRH) treble.addClef(measure.newClefRH);
        if (measure.newClefLH) bass.addClef(measure.newClefLH);

        if (measure.startTimeMs === vexFlowData.measures[0].startTimeMs) {
          treble.addKeySignature(keySignature).addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
          bass.addKeySignature(keySignature).addTimeSignature(`${timeSignature.numerator}/${timeSignature.denominator}`);
        } else {
          if (measure.newKeySignature) {
            treble.addKeySignature(measure.newKeySignature);
            bass.addClef(measure.newClefLH || 'bass').addKeySignature(measure.newKeySignature);
          }
          if (measure.newTimeSignature) {
            const ts = `${measure.newTimeSignature.numerator}/${measure.newTimeSignature.denominator}`;
            treble.addTimeSignature(ts);
            bass.addTimeSignature(ts);
          }
        }
        
        if (measure.startsRepeat) {
          treble.setBegBarType(Barline.type.REPEAT_BEGIN);
          bass.setBegBarType(Barline.type.REPEAT_BEGIN);
        }
        if (measure.endsRepeat) {
          treble.setEndBarType(Barline.type.REPEAT_END);
          bass.setEndBarType(Barline.type.REPEAT_END);
        } else if (measure.endTimeMs === vexFlowData.measures[vexFlowData.measures.length - 1].endTimeMs) {
          treble.setEndBarType(Barline.type.END);
          bass.setEndBarType(Barline.type.END);
        }

        treble.setContext(ctx).draw();
        bass.setContext(ctx).draw();

        if (measure.startTimeMs === vexFlowData.measures[0].startTimeMs) {
          new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
          new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        if (measure.endTimeMs < vexFlowData.measures[vexFlowData.measures.length - 1].endTimeMs) {
           new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        }
        
        const createNote = (info: VexFlowNoteInfo) => {
          const n = new StaveNote({ ...info.vexNote });
          if (info.vexNote.dots) {
            for (let i = 0; i < info.vexNote.dots; i++) n.addModifier(new Dot());
          }
          if (info.accidentals) {
            info.accidentals.forEach(acc => n.addModifier(new Accidental(acc.type), acc.index));
          }
          n.setAttribute('id', info.vexNoteId);
          return n;
        };

        const rightVexNotesInfoMap = new Map<string, VexFlowNoteInfo>();
        const rightStaveNotes: StaveNote[] = measure.rightHand.map(info => {
          const n = createNote(info);
          rightVexNotesInfoMap.set(info.vexNoteId, info);
          return n;
        });
        
        const leftVexNotesInfoMap = new Map<string, VexFlowNoteInfo>();
        const leftStaveNotes: StaveNote[] = measure.leftHand.map(info => {
          const n = createNote(info);
          leftVexNotesInfoMap.set(info.vexNoteId, info);
          return n;
        });
        
        const beamableDurations = ['8', '16', '32', '64'];
        const isNote = (n: StaveNote) => !n.isRest();
        const groupForBeaming = (notes: StaveNote[]) => {
          const groups: StaveNote[][] = [];
          let currentGroup: StaveNote[] = [];
          for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            const dur = n.getDuration();
            const isBeamable = isNote(n) && beamableDurations.includes(dur);
            if (isBeamable) {
              currentGroup.push(n);
            } else {
              if (currentGroup.length > 1) groups.push(currentGroup);
              currentGroup = [];
            }
          }
          if (currentGroup.length > 1) groups.push(currentGroup);
          return groups.map(g => new Beam(g));
        };
        
        const rightBeams = groupForBeaming(rightStaveNotes);
        const leftBeams = groupForBeaming(leftStaveNotes);

        const voices: Voice[] = [];
        if (rightStaveNotes.length) voices.push(new Voice({ numBeats: measure.newTimeSignature ? measure.newTimeSignature.numerator : timeSignature.numerator, beatValue: measure.newTimeSignature ? measure.newTimeSignature.denominator : timeSignature.denominator }).setStrict(false).addTickables(rightStaveNotes));
        if (leftStaveNotes.length) voices.push(new Voice({ numBeats: measure.newTimeSignature ? measure.newTimeSignature.numerator : timeSignature.numerator, beatValue: measure.newTimeSignature ? measure.newTimeSignature.denominator : timeSignature.denominator }).setStrict(false).addTickables(leftStaveNotes));
        
        if (voices.length) {
          new Formatter().joinVoices(voices).format(voices, Math.max(1, measure.width - 40));
          
          if (rightStaveNotes.length) voices[0].draw(ctx, treble);
          if (leftStaveNotes.length) {
            const lhVoice = rightStaveNotes.length > 0 ? voices[voices.length - 1] : voices[0];
            lhVoice.draw(ctx, bass);
          }
          
          rightBeams.forEach(b => b.setContext(ctx).draw());
          leftBeams.forEach(b => b.setContext(ctx).draw());
        }
        
        // Capture positions after drawing
        const capturePositions = (staveNotes: StaveNote[], infoMap: Map<string, VexFlowNoteInfo>) => {
          staveNotes.forEach(staveNote => {
              if (staveNote.isRest()) return;
              const vexId = staveNote.getAttribute('id');
              const noteInfo = infoMap.get(vexId);
              if (!noteInfo || !noteInfo.fragmentMapping) return;

              staveNote.noteHeads.forEach((noteHead, headIndex) => {
                  const mapping = noteInfo.fragmentMapping.find(m => m.keyIndex === headIndex);
                  if (mapping) {
                      const bb = noteHead.getBoundingBox();
                      if (bb) { 
                        newNotePositions.set(mapping.fragmentId, bb);
                      }
                  }
              });
          });
        };
        capturePositions(rightStaveNotes, rightVexNotesInfoMap);
        capturePositions(leftStaveNotes, leftVexNotesInfoMap);

        currentX += measure.width;
      });
      
      octaveLines.forEach(lineInfo => {
          // Check if context has svg element before trying to append
          const svgContext = (ctx as any).svg;
          if (svgContext && svgContext.appendChild) { // Ensure svgContext and appendChild exist
            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', `${lineInfo.startX}`);
            lineEl.setAttribute('y1', `${lineInfo.startY}`);
            lineEl.setAttribute('x2', `${lineInfo.endX}`);
            lineEl.setAttribute('y2', `${lineInfo.endY}`);
            lineEl.setAttribute('style', 'stroke:#555; stroke-width:1.5');
            
            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', `${lineInfo.startX + 5}`);
            textEl.setAttribute('y', `${lineInfo.type === '8va' ? lineInfo.startY - 8 : lineInfo.startY + 18}`);
            textEl.setAttribute('style', 'fill:#555; font-size:14px; font-style:italic;');
            textEl.textContent = lineInfo.type;
            
            svgContext.appendChild(lineEl);
            svgContext.appendChild(textEl);
          }
      });

      notePositionsRef.current = newNotePositions;
      setRenderedLayoutId(prev => { 
        const newId = prev + 1;
        onLayoutRendered(newId); 
        return newId;
      });

    } catch (error) {
      console.error("VexFlow Rendering Error:", error);
      if (wrapper) wrapper.innerHTML = '';
      notePositionsRef.current.clear();
    }

    return () => {
      if (wrapper) wrapper.innerHTML = '';
      notePositionsRef.current.clear(); 
    };
  }, [vexFlowData, width, height, totalContentWidth, keySignature, timeSignature, onLayoutRendered]);


  // === Calculate Highlights (HTML Overlay) ===
  useEffect(() => {
    if (!vexFlowData) {
        if(highlights.length > 0) setHighlights([]);
        return;
    }

    const newHighlights: HighlightInfo[] = [];
    const colorPriority = { [USER_PLAY_COLOR]: 2, [SYSTEM_PLAY_COLOR]: 1 };
    
    const chordTimeMap = new Map<number, { notes: ActiveMidiNoteInfo[], highestPriority: number, color: string }>();
    activePlaybackNotesInfo.forEach(activeInfo => {
        const time = activeInfo.timeMs;
        if (!chordTimeMap.has(time)) {
            chordTimeMap.set(time, { notes: [], highestPriority: 0, color: '' });
        }
        chordTimeMap.get(time)!.notes.push(activeInfo);
    });

    chordTimeMap.forEach(group => {
        group.notes.forEach(note => {
            let priority = 0;
            let color = '';
            if (note.status === 'user_played') {
                priority = colorPriority[USER_PLAY_COLOR];
                color = USER_PLAY_COLOR;
            } else if (note.status === 'playing' || note.status === 'waiting') {
                priority = colorPriority[SYSTEM_PLAY_COLOR];
                color = SYSTEM_PLAY_COLOR;
            }
            if (priority > group.highestPriority) {
                group.highestPriority = priority;
                group.color = color;
            }
        });
    });

    vexFlowData.fragments.forEach(fragment => {
        const activeInfo = activePlaybackNotesInfo.get(fragment.originalNoteId);
        if (activeInfo) {
            const chordGroup = chordTimeMap.get(activeInfo.timeMs);
            if (chordGroup && chordGroup.color) {
                const position = notePositionsRef.current.get(fragment.fragmentId);
                if (position) {
                    newHighlights.push({
                        key: fragment.fragmentId,
                        x: position.getX(),
                        y: position.getY(),
                        w: position.getW(),
                        h: position.getH(),
                        color: chordGroup.color,
                    });
                }
            }
        }
    });

    setHighlights(newHighlights);

  }, [activePlaybackNotesInfo, vexFlowData, renderedLayoutId]);


  // === Auto Scroll & Cursor ===
  useEffect(() => {
    if (!vexFlowData || !contentWrapperRef.current || !cursorRef.current) {
      return;
    }
    const measures = vexFlowData.measures;
    const currentTotalContentWidth = totalContentWidth; 
    const currentViewWidth = width; 

    const animationLoop = () => {
      // This loop always uses the latest currentTimeMsRef.current
      updatePosition(currentTimeMsRef.current, true, measures, currentTotalContentWidth, currentViewWidth);
      animFrameRef.current = requestAnimationFrame(animationLoop);
    };

    if (isPlaying) {
      if (animFrameRef.current === null) { 
        animFrameRef.current = requestAnimationFrame(animationLoop);
      }
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // If not playing, ensure cursor is updated without smooth transition on seeking
      updatePosition(currentTimeMsRef.current, false, measures, currentTotalContentWidth, currentViewWidth);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [vexFlowData, width, totalContentWidth, isPlaying, updatePosition]);


  const handleClickToSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || totalDurationMs <= 0 || totalContentWidth <= 0)
        return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollPosRef.current;
      const progress = Math.max(0, Math.min(1, clickX / totalContentWidth));
      onSeek(progress * totalDurationMs);
    },
    [onSeek, totalDurationMs, totalContentWidth]
  );

  return (
    <div
      ref={containerRef}
      className="sheet-scroll-container no-select"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={handleClickToSeek}
    >
      <div
        ref={contentWrapperRef}
        className="sheet-content-wrapper"
        style={{ width: `${totalContentWidth}px`, willChange: 'transform' }}
      >
        {highlights.map(h => (
            <div
                key={h.key}
                style={{
                    position: 'absolute',
                    left: `${h.x}px`,
                    top: `${h.y}px`,
                    width: `${h.w}px`,
                    height: `${h.h}px`,
                    backgroundColor: h.color,
                    borderRadius: '50%',
                    opacity: 0.6,
                    pointerEvents: 'none',
                    zIndex: 5,
                }}
            />
        ))}
      </div>
      <div
        ref={cursorRef}
        className="cursor-line"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {!vexFlowData && notes.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <p className="text-slate-600 font-medium animate-pulse">
            Rendering Sheet Music...
          </p>
        </div>
      )}
    </div>
  );
};

export default VexFlowSheetMusicView;
