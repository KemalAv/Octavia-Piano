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
import { SYSTEM_PLAY_COLOR, USER_PLAY_COLOR } from '../constants'; // Import from constants

// --- Constants ---
const GRAND_STAFF_VERTICAL_SPACING = 125;
const HORIZONTAL_PADDING = 30;
// --- Colors ---
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
  const cursorRef = useRef<HTMLDivElement>(null);
  const vexflowRenderDivRef = useRef<HTMLDivElement>(null); 

  const [highlights, setHighlights] = useState<HighlightInfo[]>([]);
  const notePositionsRef = useRef<Map<string, BoundingBox>>(new Map());
  const [renderedLayoutId, setRenderedLayoutId] = useState(0);

  // Pagination and Centering State
  const [currentPage, setCurrentPage] = useState(0);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  // === Memoized render data ===
  const vexFlowData = useMemo(() => {
    if (!notes.length || !timeSignature || initialTempoBpm <= 0) return null;
    if (width == null || width <= 0 || !Number.isFinite(width) || height == null || height <= 0 || !Number.isFinite(height)) {
      return null;
    }
    try {
      return getVexFlowRenderData(
        notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom,
        barLines, signatureEvents, width, height, showOnlyMajorRests,
        tempoEvents, playbackTempoMultiplier
      );
    } catch (e) {
      console.error("Error generating VexFlow data:", e);
      return null;
    }
  }, [notes, timeSignature, initialTempoBpm, keySignature, sheetMusicZoom, barLines, signatureEvents, width, height, showOnlyMajorRests, tempoEvents, playbackTempoMultiplier]);

  const pages = useMemo(() => {
    if (!vexFlowData) return [];
    const newPages: VexFlowMeasureData[][] = [];
    let currentPageMeasures: VexFlowMeasureData[] = [];
    let currentWidth = 0;
    const pagePadding = HORIZONTAL_PADDING * 2;
    const availableWidth = width - pagePadding;

    vexFlowData.measures.forEach(measure => {
      if (currentWidth + measure.width > availableWidth && currentPageMeasures.length > 0) {
        newPages.push(currentPageMeasures);
        currentPageMeasures = [];
        currentWidth = 0;
      }
      currentPageMeasures.push(measure);
      currentWidth += measure.width;
    });

    if (currentPageMeasures.length > 0) {
      newPages.push(currentPageMeasures);
    }
    return newPages;
  }, [vexFlowData, width]);
  
  const absoluteStartXOfCurrentPage = useMemo(() => {
    if (!pages.length || currentPage < 0) return 0;
    let startX = 0;
    for (let i = 0; i < currentPage; i++) {
        // Sum widths of all measures in previous pages
        startX += pages[i].reduce((sum, m) => sum + m.width, 0);
    }
    return startX;
  }, [pages, currentPage]);

  // === Auto-paging and Seek-paging Logic ===
  useEffect(() => {
    if (!pages.length) return;

    let pageIndex = pages.findIndex(pageMeasures => {
      if (!pageMeasures || pageMeasures.length === 0) return false;
      const pageStartTime = pageMeasures[0].startTimeMs;
      const pageEndTime = pageMeasures[pageMeasures.length - 1].endTimeMs;
      return currentTimeMs >= pageStartTime && currentTimeMs < pageEndTime;
    });

    if (pageIndex === -1 && currentTimeMs >= totalDurationMs) {
      pageIndex = pages.length - 1;
    }

    if (pageIndex === -1 && pages.length > 0 && currentTimeMs < pages[0][0].startTimeMs) {
      pageIndex = 0;
    }


    if (pageIndex !== -1 && pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
    }
  }, [currentTimeMs, pages, totalDurationMs, currentPage]);

  const updateCursorPosition = useCallback((timeToDisplay: number) => {
    if (!pages.length || !cursorRef.current || width <= 0) return;
    
    const measuresOnPage = pages[currentPage];
    if (!measuresOnPage || !measuresOnPage.length) return;

    const cursor = cursorRef.current;
    
    let measureIndex = measuresOnPage.findIndex(
      (m) => timeToDisplay >= m.startTimeMs && timeToDisplay < m.endTimeMs
    );

    if (measureIndex === -1) {
      if (timeToDisplay < measuresOnPage[0].startTimeMs) measureIndex = 0;
      else measureIndex = measuresOnPage.length - 1;
    }

    const currentMeasure = measuresOnPage[measureIndex];
    const startX = HORIZONTAL_PADDING + measuresOnPage.slice(0, measureIndex).reduce((sum, m) => sum + m.width, 0);
    const measureDuration = Math.max(1, currentMeasure.durationMs);
    const progress = Math.min(1, Math.max(0, (timeToDisplay - currentMeasure.startTimeMs) / measureDuration));
    let targetX = startX + progress * currentMeasure.width;
    
    cursor.style.transform = `translateX(${targetX + horizontalOffset}px)`;
  }, [pages, currentPage, width, horizontalOffset]);

  // === Main Render Effect for VexFlow ===
  useLayoutEffect(() => {
    const renderContainer = vexflowRenderDivRef.current;
    if (!renderContainer || !vexFlowData || !pages.length || !pages[currentPage]) {
      if(renderContainer) while(renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
      notePositionsRef.current.clear();
      setHorizontalOffset(0);
      return;
    }

    if (width <= 0 || height <= 0) return;

    while(renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
    const newNotePositions = new Map<string, BoundingBox>();

    try {
      const { topStaveYOffset } = vexFlowData;
      const measuresToRender = pages[currentPage];
      const pageContentWidth = measuresToRender.reduce((sum, m) => sum + m.width, 0) + HORIZONTAL_PADDING * 2;
      
      const newOffset = Math.max(0, (width - pageContentWidth) / 2);
      setHorizontalOffset(newOffset);

      const renderer = new Renderer(renderContainer, Renderer.Backends.SVG);
      renderer.resize(pageContentWidth, height);
      const ctx = renderer.getContext();
      let currentX = HORIZONTAL_PADDING;

      measuresToRender.forEach((measure) => {
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
        } else if (measure.endTimeMs >= totalDurationMs) { // Use total duration to detect end
            treble.setEndBarType(Barline.type.END);
            bass.setEndBarType(Barline.type.END);
        }

        treble.setContext(ctx).draw();
        bass.setContext(ctx).draw();

        if (measure.startTimeMs === vexFlowData.measures[0].startTimeMs) {
            new StaveConnector(treble, bass).setType(StaveConnector.type.BRACE).setContext(ctx).draw();
            new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        new StaveConnector(treble, bass).setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
        
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

        const groupForBeaming = (notes: StaveNote[], measureTimeSignature: TimeSignatureInfo, hasDottedBeamableNotesInMeasure: boolean) => {
            const beams: Beam[] = [];
            let currentBeamGroup: StaveNote[] = [];
            let maxGroupSize = measureTimeSignature.numerator === 4 && measureTimeSignature.denominator === 4 ? (hasDottedBeamableNotesInMeasure ? 3 : 4) : 4;
            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const isBeamable = isNote(note) && beamableVexDurations.includes(note.getDuration());
                if (isBeamable) {
                    currentBeamGroup.push(note);
                    const nextNoteIsBeamable = i + 1 < notes.length && isNote(notes[i+1]) && beamableVexDurations.includes(notes[i+1].getDuration());
                    if (currentBeamGroup.length === maxGroupSize || !nextNoteIsBeamable) {
                        if (currentBeamGroup.length > 1) beams.push(new Beam(currentBeamGroup));
                        currentBeamGroup = [];
                    }
                } else {
                    if (currentBeamGroup.length > 1) beams.push(new Beam(currentBeamGroup));
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
          new Formatter().joinVoices(voices).format(voices, measure.width - (HORIZONTAL_PADDING / 2));
          if (rightStaveNotes.length) voices[0].draw(ctx, treble);
          if (leftStaveNotes.length) (rightStaveNotes.length > 0 ? voices[1] : voices[0]).draw(ctx, bass);
          rightBeams.forEach(b => b.setContext(ctx).draw());
          leftBeams.forEach(b => b.setContext(ctx).draw());
        }

        const capturePositions = (staveNotes: StaveNote[], infoMap: Map<string, VexFlowNoteInfo>) => {
            staveNotes.forEach(staveNote => {
                if (staveNote.isRest()) return;
                const vexId = staveNote.getAttribute('id');
                const noteInfo = infoMap.get(vexId);
                if (noteInfo && noteInfo.fragmentMapping) {
                    staveNote.noteHeads.forEach((noteHead, headIndex) => {
                        const mapping = noteInfo.fragmentMapping.find(m => m.keyIndex === headIndex);
                        if (mapping) {
                            const bb = noteHead.getBoundingBox();
                            if (bb) newNotePositions.set(mapping.fragmentId, bb);
                        }
                    });
                }
            });
        };
        capturePositions(rightStaveNotes, rightVexNotesInfoMap);
        capturePositions(leftStaveNotes, leftVexNotesInfoMap);

        currentX += measure.width;
      });

      notePositionsRef.current = newNotePositions;
      setRenderedLayoutId(prev => { 
        const newId = prev + 1;
        onLayoutRendered(newId); 
        return newId;
      });
    } catch (error) {
      console.error("VexFlow Rendering Error:", error);
      while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
      notePositionsRef.current.clear(); 
    }

    return () => {
      if (renderContainer) {
        while (renderContainer.lastChild) renderContainer.removeChild(renderContainer.lastChild);
      }
      notePositionsRef.current.clear(); 
    };
  }, [vexFlowData, pages, currentPage, width, height, keySignature, timeSignature, onLayoutRendered, totalDurationMs]);

  // === Update Highlights ===
  useEffect(() => {
    if (!vexFlowData) {
      setHighlights([]);
      return;
    }

    const newHighlights: HighlightInfo[] = [];
    activePlaybackNotesInfo.forEach(activeInfo => {
      let color: string | null = null;
      if (activeInfo.status === 'user_played') color = USER_PLAY_COLOR;
      else if (activeInfo.status === 'playing' || activeInfo.status === 'waiting') {
        color = activeInfo.hand === 'left' ? leftHandColor : (activeInfo.hand === 'right' ? rightHandColor : SYSTEM_PLAY_COLOR);
      }

      if (color) {
        const fragmentsForNote = vexFlowData.noteIdToFragmentsMap.get(activeInfo.noteId);
        if (fragmentsForNote) {
          fragmentsForNote.forEach(fragment => {
            const position = notePositionsRef.current.get(fragment.fragmentId);
            if (position) {
              newHighlights.push({
                key: fragment.fragmentId, x: position.getX(), y: position.getY(), w: position.getW(), h: position.getH(), color: color,
              });
            }
          });
        }
      }
    });
    setHighlights(newHighlights);
  }, [activePlaybackNotesInfo, vexFlowData, renderedLayoutId, leftHandColor, rightHandColor]);

  // === Animate Cursor ===
  useEffect(() => {
    // The parent component drives updates via the `currentTimeMs` prop on each animation frame.
    // We just need to update the cursor's position whenever that prop changes.
    updateCursorPosition(currentTimeMs);
  }, [currentTimeMs, updateCursorPosition]);

  // === Handle Seek by Click ===
  const handleClickToSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !pages.length || !pages[currentPage] || totalDurationMs <= 0) return;
    const measuresOnPage = pages[currentPage];
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - horizontalOffset;
    
    let accumulatedWidth = HORIZONTAL_PADDING;
    for(const measure of measuresOnPage) {
      if (clickX >= accumulatedWidth && clickX < accumulatedWidth + measure.width) {
        const progressInMeasure = (clickX - accumulatedWidth) / measure.width;
        const timeInMeasure = progressInMeasure * measure.durationMs;
        onSeek(measure.startTimeMs + timeInMeasure);
        return;
      }
      accumulatedWidth += measure.width;
    }
  }, [onSeek, totalDurationMs, pages, currentPage, horizontalOffset]);

  return (
    <div className="sheet-container no-select" style={{ width: `${width}px`, height: `${height}px` }}>
      <div ref={containerRef} className="sheet-content-wrapper" onClick={handleClickToSeek}>
        <div
            key={currentPage}
            ref={vexflowRenderDivRef}
            style={{ position: 'absolute', left: `${horizontalOffset}px`, top: '0px' }}
        >
          {/* Vexflow SVG will be rendered here */}
        </div>

        {/* SVG OVERLAY for octave lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
          {vexFlowData && vexFlowData.octaveLines.map((line, index) => {
            const measuresOnPage = pages[currentPage];
            if (!measuresOnPage || measuresOnPage.length === 0) return null;

            const pageContentWidth = measuresOnPage.reduce((sum, m) => sum + m.width, 0);
            
            // The coordinate space of lines includes the initial padding.
            const pageAbsStartWithPadding = absoluteStartXOfCurrentPage + HORIZONTAL_PADDING;
            const pageAbsEndWithPadding = pageAbsStartWithPadding + pageContentWidth;

            const lineStartAbsolute = line.startX;
            const lineEndAbsolute = line.endX;

            // Check if the line is visible on this page
            if (lineEndAbsolute <= pageAbsStartWithPadding || lineStartAbsolute >= pageAbsEndWithPadding) {
                return null;
            }

            // Clip coordinates to page boundaries
            const x1_clipped_abs = Math.max(lineStartAbsolute, pageAbsStartWithPadding);
            const x2_clipped_abs = Math.min(lineEndAbsolute, pageAbsEndWithPadding);

            // Convert to coordinates relative to the page's SVG container, which is shifted by horizontalOffset.
            // The content within the SVG starts at HORIZONTAL_PADDING.
            const x1_render = (x1_clipped_abs - pageAbsStartWithPadding) + horizontalOffset + HORIZONTAL_PADDING;
            const x2_render = (x2_clipped_abs - pageAbsStartWithPadding) + horizontalOffset + HORIZONTAL_PADDING;

            const y = line.startY;
            const text = line.type;

            const textX = (lineStartAbsolute - pageAbsStartWithPadding) + horizontalOffset + HORIZONTAL_PADDING;
            
            // Only draw text if the original start of the line is on this page
            const shouldDrawText = lineStartAbsolute >= pageAbsStartWithPadding && lineStartAbsolute < pageAbsEndWithPadding;

            return (
                <g key={`octave-${index}`} fill="#000" stroke="#000" strokeWidth="1.5">
                    {shouldDrawText && <text x={textX} y={y} fontSize="16" fontStyle="italic" fontWeight="bold">{text}</text>}
                    <path 
                        d={`M ${shouldDrawText ? textX + (text.length * 10) : x1_render} ${y + 4} L ${x2_render} ${y + 4}`} 
                        strokeDasharray="4,3" 
                        fill="none" 
                    />
                    <path d={`M ${x2_render} ${y + 4} L ${x2_render} ${y + 14}`} fill="none" />
                </g>
            );
          })}
        </svg>

        {highlights.map(h => (
          <div key={h.key} style={{
            position: 'absolute', left: `${h.x + horizontalOffset}px`, top: `${h.y}px`, width: `${h.w}px`, height: `${h.h}px`,
            backgroundColor: h.color, borderRadius: '50%', opacity: 0.5, pointerEvents: 'none', zIndex: 5,
          }}/>
        ))}
        <div ref={cursorRef} className="cursor-line" style={{ willChange: 'transform' }} />
        {!vexFlowData && notes.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <p className="text-slate-600 font-medium animate-pulse">Rendering Sheet Music...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VexFlowSheetMusicView;
