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
  TempoEvent,
} from '../types';
import { getVexFlowRenderData } from '../vexflow-helper';
// Removed: import { SYSTEM_PLAY_COLOR, USER_PLAY_COLOR } from '../constants'; // Import from constants

// --- Constants ---
const GRAND_STAFF_VERTICAL_SPACING = 125;
const HORIZONTAL_PADDING = 30;
const CURSOR_FIXED_POSITION_X = 0.25;

// --- Colors ---
// Removed: SYSTEM_PLAY_COLOR = '#8B5CF6'; // A slightly brighter violet-500 for system playback
// Removed: USER_PLAY_COLOR = '#F59E0B';   // A richer amber-500 for user playback
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
  tempoEvents: TempoEvent[];
  playbackTempoMultiplier: number;
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
  tempoEvents,
  playbackTempoMultiplier,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  // FIX: Changed ref type from SVGSVGElement to HTMLDivElement for VexFlow Renderer.
  const vexflowRenderDivRef = useRef<HTMLDivElement>(null); 

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
        showOnlyMajorRests,
        tempoEvents,
        playbackTempoMultiplier
      );
    } catch (e) {
      console.error("Error generating VexFlow data:", e);
      return null;
    }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, showOnlyMajorRests, tempoEvents, playbackTempoMultiplier]);

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
      let newCursorX = targetX - newScroll; // Adjust cursorX relative to the wrapper's new scroll

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
    // FIX: Use the new HTMLDivElement ref for VexFlow rendering.
    const renderContainer = vexflowRenderDivRef.current; 
    
    // Guard against invalid state or dimensions
    if (!renderContainer || !vexFlowData) {
      if (renderContainer) {
        // NEW: Clear children of the div directly
        while (renderContainer.lastChild) {
          renderContainer.removeChild(renderContainer.lastChild);
        }
      }
      notePositionsRef.current.clear(); 
      return;
    }
    
    // Explicitly check width/height again before VexFlow init
    if (width == null || width <= 0 || !Number.isFinite(width) ||
        height == null || height <= 0 || !Number.isFinite(height)) {
      console.warn("VexFlow: Invalid dimensions for rendering, clearing container.", {width, height});
      while (renderContainer.lastChild) {
        renderContainer.removeChild(renderContainer.lastChild);
      }
      notePositionsRef.current.clear();
      return;
    }

    // Clear previous render - NEW: Clear div children
    while (renderContainer.lastChild) {
      renderContainer.removeChild(renderContainer.lastChild);
    }
    const newNotePositions = new Map<string, BoundingBox>();

    try {
      const { measures, topStaveYOffset, octaveLines, tempoMarkings } = vexFlowData;
      
      // Ensure dimensions are positive for VexFlow resizing
      const renderWidth = Math.max(1, totalContentWidth);
      const renderHeight = Math.max(1, height);

      // FIX: Initialize Renderer with the HTMLDivElement. VexFlow will create an SVG inside it.
      const renderer = new Renderer(renderContainer, Renderer.Backends.SVG);
      renderer.resize(renderWidth, renderHeight);
      const ctx = renderer.getContext();
      let currentX = 0;

      measures.forEach((measure) => {
        const treble = new Stave(currentX, topStaveYOffset, measure.width);
        const bass = new Stave(currentX, topStaveYOffset + GRAND_STAFF_VERTICAL_SPACING, measure.width);
        
        if (measure.newClefRH) treble.addClef(measure.newClefRH);
        if (measure.newClefLH) bass.addClef(measure.newClefLH);

        // Use measure.effectiveTimeSignature for displaying time signature
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
        
        const beamableVexDurations = ['8', '16', '32', '64'];
        const isNote = (n: StaveNote) => !n.isRest();

        // Custom beaming logic based on time signature and dotted notes
        const groupForBeaming = (notes: StaveNote[], measureTimeSignature: TimeSignatureInfo, hasDottedBeamableNotesInMeasure: boolean) => {
            const beams: Beam[] = [];
            let currentBeamGroup: StaveNote[] = [];
            
            let maxGroupSize = 4; // Default for 4/4
            if (measureTimeSignature.numerator === 4 && measureTimeSignature.denominator === 4) {
               if (hasDottedBeamableNotesInMeasure) {
                  maxGroupSize = 3;
               } else {
                  maxGroupSize = 4;
               }
            }
            // For other time signatures, default to some standard or 4 if no specific rule.
            // For now, only 4/4 is specified.

            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const vexDur = note.getDuration();
                const isBeamable = isNote(note) && beamableVexDurations.includes(vexDur);

                if (isBeamable) {
                    currentBeamGroup.push(note);
                    
                    const nextNote = notes[i + 1];
                    const nextNoteIsBeamable = nextNote ? (isNote(nextNote) && beamableVexDurations.includes(nextNote.getDuration())) : false;

                    // Finalize group if it's full OR if the sequence of beamable notes ends here
                    const isGroupFull = currentBeamGroup.length === maxGroupSize;
                    const isEndOfSequence = (i === notes.length - 1) || !nextNoteIsBeamable;

                    if (isGroupFull || isEndOfSequence) {
                        if (currentBeamGroup.length > 1) { // Only beam if more than one note
                            beams.push(new Beam(currentBeamGroup));
                        }
                        currentBeamGroup = []; // Start a new group
                    }
                } else {
                    // Non-beamable note encountered, finalize current group if any
                    if (currentBeamGroup.length > 1) {
                        beams.push(new Beam(currentBeamGroup));
                    }
                    currentBeamGroup = [];
                }
            }
            return beams;
        };
        
        const rightBeams = groupForBeaming(rightStaveNotes, measure.effectiveTimeSignature, measure.hasDottedBeamableNotes);
        const leftBeams = groupForBeaming(leftStaveNotes, measure.effectiveTimeSignature, measure.hasDottedBeamableNotes);

        const voices: Voice[] = [];
        if (rightStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(rightStaveNotes));
        if (leftStaveNotes.length) voices.push(new Voice({ numBeats: measure.effectiveTimeSignature.numerator, beatValue: measure.effectiveTimeSignature.denominator }).setStrict(false).addTickables(leftStaveNotes));
        
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
          const svgContext = (ctx as any).svg;
          if (svgContext && svgContext.appendChild) {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineEl.setAttribute('x1', `${lineInfo.startX}`);
            lineEl.setAttribute('y1', `${lineInfo.startY}`);
            lineEl.setAttribute('x2', `${lineInfo.endX}`);
            lineEl.setAttribute('y2', `${lineInfo.startY}`);
            lineEl.setAttribute('style', 'stroke:#333; stroke-width:1.5; stroke-dasharray: 4, 3;');
            const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', `${lineInfo.startX + 5}`);
            textEl.setAttribute('y', `${lineInfo.type === '8va' ? lineInfo.startY - 8 : lineInfo.startY + 18}`);
            textEl.setAttribute('style', 'fill:#333; font-size:16px; font-style:italic; font-family: "Times New Roman", serif;');
            textEl.textContent = lineInfo.type;
            const tickEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tickEl.setAttribute('x1', `${lineInfo.endX}`);
            tickEl.setAttribute('y1', `${lineInfo.startY}`);
            const tickY2 = lineInfo.type === '8va' ? lineInfo.startY + 12 : lineInfo.startY - 12;
            tickEl.setAttribute('x2', `${lineInfo.endX}`);
            tickEl.setAttribute('y2', `${tickY2}`);
            tickEl.setAttribute('style', 'stroke:#333; stroke-width:1.5;');
            group.appendChild(lineEl);
            group.appendChild(textEl);
            group.appendChild(tickEl);
            svgContext.appendChild(group);
          }
      });

      tempoMarkings.forEach(mark => {
          const svgContext = (ctx as any).svg;
          if (svgContext && svgContext.appendChild) {
              const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              textEl.setAttribute('x', `${mark.x + 5}`);
              textEl.setAttribute('y', `${mark.y}`);
              textEl.setAttribute('style', 'fill:#333; font-size:18px; font-weight:bold; font-family: "Times New Roman", serif;');
              textEl.textContent = `♩ = ${Math.round(mark.bpm)}`;
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
      // NEW: Clear div children on error as well
      while (renderContainer.lastChild) {
        renderContainer.removeChild(renderContainer.lastChild);
      }
      notePositionsRef.current.clear(); 
    }

    return () => {
      if (renderContainer) {
        // NEW: Cleanup on unmount - clear div children
        while (renderContainer.lastChild) {
          renderContainer.removeChild(renderContainer.lastChild);
        }
      }
      notePositionsRef.current.clear(); 
    };
  }, [vexFlowData, width, height, totalContentWidth, keySignature, timeSignature, onLayoutRendered, rightHandColor, leftHandColor, playbackTempoMultiplier]);


  // === Calculate Highlights (HTML Overlay) ===
  useEffect(() => {
    if (!vexFlowData) {
        if(highlights.length > 0) setHighlights([]);
        return;
    }

    const newHighlights: HighlightInfo[] = [];
    
    activePlaybackNotesInfo.forEach(activeInfo => {
        let highlightColor: string = DEFAULT_NOTE_COLOR; // Fallback

        // Determine base color based on hand
        const baseHandColor = activeInfo.hand === 'left' ? leftHandColor : rightHandColor;

        // Apply status-specific logic
        if (activeInfo.status === 'user_played') {
            highlightColor = baseHandColor; // User played, use hand color
        } else if (activeInfo.status === 'playing' || activeInfo.status === 'waiting') {
            highlightColor = baseHandColor; // System playing or waiting, use hand color
        }
        
        // Find fragments for this note and apply highlight
        const fragmentsForNote = vexFlowData.noteIdToFragmentsMap.get(activeInfo.noteId);
        if (fragmentsForNote) {
            fragmentsForNote.forEach(fragment => {
                const position = notePositionsRef.current.get(fragment.fragmentId);
                if (position) {
                    newHighlights.push({
                        key: fragment.fragmentId,
                        x: position.getX(),
                        y: position.getY(),
                        w: position.getW(),
                        h: position.getH(),
                        color: highlightColor, // Use the determined highlightColor
                    });
                }
            });
        }
    });

    setHighlights(newHighlights);

  }, [activePlaybackNotesInfo, vexFlowData, renderedLayoutId, rightHandColor, leftHandColor]);


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
        {/* FIX: Changed the VexFlow rendering target to a div element. */}
        {/* VexFlow's Renderer will now create and manage its own SVG element inside this div. */}
        <div ref={vexflowRenderDivRef} style={{ width: totalContentWidth, height: height }}></div>
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
                    opacity: 0.5, // Slightly more transparent to see note head better
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