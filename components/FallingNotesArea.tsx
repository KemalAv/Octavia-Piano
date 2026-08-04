import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MidiNotePlaybackItem, KeyPosition, ActiveMidiNoteInfo, NoteLabelType, QwertyLayout, FreePlayLiveNote } from '../types';
import { PLAY_LINE_THICKNESS_PX, USER_PLAY_COLOR, VISUAL_NOTE_CAP_MS, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { darkenHex, formatKeySignatureForDisplay, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT } from '../utils';

interface FallingNotesAreaProps {
  notes: MidiNotePlaybackItem[];
  liveNotes?: FreePlayLiveNote[];
  isRising?: boolean;
  currentTimeMs: number;
  keyPositions: Map<string, KeyPosition>;
  activeMidiNotesInfo: Map<string, ActiveMidiNoteInfo>;
  width: number;
  actualHeight: number;
  pixelsPerMillisecond: number;
  barLines: number[];
  noteLabelType: NoteLabelType;
  rightHandColor: string;
  leftHandColor: string;
  hitNoteColor: string;
  backgroundColor: string;
  activeKeySignature: string;
  activeTempoBpm: number;
  showOnlyMajorNotes: boolean;
  instrumentMode?: 'piano' | 'drum';
  showPianoTilesBackground: boolean;
  pianoTilesOpacity?: number;
  isPaused?: boolean;
  onSeek?: (timeMs: number) => void;
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
  lowDetailMode?: boolean;
}

// Binary search helper to find starting note index in O(log N) time
function findNoteStartIndex<T extends { timeMs: number; durationMs?: number }>(
  noteList: T[],
  targetMinTimeMs: number
): number {
  let low = 0;
  let high = noteList.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const note = noteList[mid];
    const duration = note.durationMs || 0;
    if (note.timeMs + duration >= targetMinTimeMs) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

export const FallingNotesArea: React.FC<FallingNotesAreaProps> = React.memo(({
  notes,
  liveNotes = [],
  isRising = false,
  currentTimeMs,
  keyPositions,
  activeMidiNotesInfo,
  width,
  actualHeight,
  pixelsPerMillisecond,
  barLines,
  noteLabelType,
  rightHandColor,
  leftHandColor,
  hitNoteColor,
  backgroundColor,
  activeKeySignature,
  activeTempoBpm,
  showOnlyMajorNotes,
  instrumentMode = 'piano',
  showPianoTilesBackground,
  pianoTilesOpacity = 50,
  isPaused = false,
  onSeek,
  qwertyLayout = 'default',
  qwertyCurrentOctaveShift = 0,
  mirpTranspose = 0,
  lowDetailMode = false,
}) => {
  const [statsVisible, setStatsVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ isDragging: boolean; startY: number; startTime: number } | null>(null);

  const alphaMultiplier = pianoTilesOpacity / 100;

  const VIEWABLE_DURATION_MS = actualHeight > 0 && pixelsPerMillisecond > 0
    ? actualHeight / pixelsPerMillisecond
    : 0;

  const isLightBackground = useMemo(() => {
    if (!backgroundColor || backgroundColor === 'transparent') return false;
    const color = backgroundColor.toLowerCase();
    if (color === '#ffffff' || color === 'white') return true;
    try {
      const hex = color.replace('#', '');
      if (hex.length !== 6) return false;
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
    } catch { return false; }
  }, [backgroundColor]);

  const isDrum = instrumentMode === 'drum';
  const effectiveShowOnlyMajorNotes = isDrum ? true : showOnlyMajorNotes;
  const bpm = activeTempoBpm || 120;
  const thirtySecondNoteMs = (60000 / bpm) / 8;
  const noteCap = isDrum ? thirtySecondNoteMs : VISUAL_NOTE_CAP_MS;

  const visibleNotes = useMemo(() => {
    if (actualHeight <= 0 || pixelsPerMillisecond <= 0 || notes.length === 0) return [];

    const minTime = currentTimeMs - 5000;
    const maxTime = currentTimeMs + VIEWABLE_DURATION_MS + 100;
    const startIdx = findNoteStartIndex(notes, minTime);

    const result: MidiNotePlaybackItem[] = [];
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      if (note.timeMs > maxTime) break;

      const duration = effectiveShowOnlyMajorNotes ? Math.min(note.durationMs, noteCap) : note.durationMs;
      const noteEndTime = note.timeMs + duration;

      if (noteEndTime >= minTime) {
        result.push(note);
      }
    }
    return result;
  }, [notes, actualHeight, pixelsPerMillisecond, currentTimeMs, VIEWABLE_DURATION_MS, effectiveShowOnlyMajorNotes, noteCap]);

  // Background Caching Effect
  useEffect(() => {
    if (width <= 0 || actualHeight <= 0) return;
    
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = Math.floor(width * dpr);
    bgCanvas.height = Math.floor(actualHeight * dpr);
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    
    bgCtx.scale(dpr, dpr);
    
    // 1. Background
    if (backgroundColor && backgroundColor !== 'transparent') {
      bgCtx.fillStyle = backgroundColor;
      bgCtx.fillRect(0, 0, width | 0, actualHeight | 0);
    }

    // 2. Piano Tiles Background
    if (showPianoTilesBackground) {
      const whiteTileAlpha = (isLightBackground ? 0.1 : 0.15) * alphaMultiplier;
      const blackTileAlpha = alphaMultiplier;
      const whiteTileColor = isLightBackground ? `rgba(0, 0, 0, ${whiteTileAlpha})` : `rgba(255, 255, 255, ${whiteTileAlpha})`;
      const blackTileColor = `rgba(0, 0, 0, ${blackTileAlpha})`;
      const tileBorderColor = isLightBackground ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

      // White tiles
      keyPositions.forEach((kp) => {
        if (kp.type === 'white') {
          bgCtx.fillStyle = whiteTileColor;
          bgCtx.fillRect(kp.x | 0, 0, kp.width | 0, actualHeight | 0);
          bgCtx.strokeStyle = tileBorderColor;
          bgCtx.lineWidth = 1;
          bgCtx.beginPath();
          bgCtx.moveTo((kp.x + kp.width - 0.5) | 0, 0);
          bgCtx.lineTo((kp.x + kp.width - 0.5) | 0, actualHeight | 0);
          bgCtx.stroke();
        }
      });

      // Black tiles
      keyPositions.forEach((kp) => {
        if (kp.type === 'black') {
          bgCtx.fillStyle = blackTileColor;
          bgCtx.fillRect(kp.x | 0, 0, kp.width | 0, actualHeight | 0);
        }
      });
    }

    // 3. Grid Lines for White Keys
    const gridLineColor = isLightBackground ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    keyPositions.forEach((keyPos) => {
      if (keyPos.type === 'white') {
        bgCtx.strokeStyle = gridLineColor;
        bgCtx.lineWidth = 1;
        bgCtx.beginPath();
        bgCtx.moveTo((keyPos.x + 0.5) | 0, 0);
        bgCtx.lineTo((keyPos.x + 0.5) | 0, actualHeight | 0);
        bgCtx.stroke();
      }
    });
    if (width > 0) {
      bgCtx.strokeStyle = gridLineColor;
      bgCtx.lineWidth = 1;
      bgCtx.beginPath();
      bgCtx.moveTo((width - 0.5) | 0, 0);
      bgCtx.lineTo((width - 0.5) | 0, actualHeight | 0);
      bgCtx.stroke();
    }
    
    backgroundCanvasRef.current = bgCanvas;
  }, [width, actualHeight, backgroundColor, showPianoTilesBackground, keyPositions, isLightBackground, alphaMultiplier]);

  // Main Canvas Render Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || actualHeight <= 0 || width <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(actualHeight * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(actualHeight * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, actualHeight);

    // Use Cached Background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0, width, actualHeight);
    } else {
      // Fallback
      if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width | 0, actualHeight | 0);
      }
    }

    // 4. Bar Lines
    if (barLines && barLines.length > 0 && pixelsPerMillisecond > 0) {
      const bufferMs = 50 / pixelsPerMillisecond;
      const minTime = isRising ? currentTimeMs - VIEWABLE_DURATION_MS - bufferMs : currentTimeMs - bufferMs;
      const maxTime = isRising ? currentTimeMs + bufferMs : currentTimeMs + VIEWABLE_DURATION_MS + bufferMs;

      const barLineColor = isLightBackground ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)';
      const textColor = isLightBackground ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';

      barLines.forEach((barTimeMs, index) => {
        if (barTimeMs >= minTime && barTimeMs <= maxTime) {
          let yPositionPx: number;
          if (isRising) {
            yPositionPx = actualHeight - (currentTimeMs - barTimeMs) * pixelsPerMillisecond - PLAY_LINE_THICKNESS_PX;
          } else {
            yPositionPx = actualHeight + (currentTimeMs - barTimeMs) * pixelsPerMillisecond - PLAY_LINE_THICKNESS_PX;
          }

          ctx.strokeStyle = barLineColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, (Math.floor(yPositionPx) + 0.5) | 0);
          ctx.lineTo(width | 0, (Math.floor(yPositionPx) + 0.5) | 0);
          ctx.stroke();

          ctx.fillStyle = textColor;
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = isRising ? 'bottom' : 'top';
          ctx.fillText(String(index + 1), 8, yPositionPx + (isRising ? -2 : 2));
        }
      });
    }

    // Helper for labels
    const getNoteLabel = (
      noteMidi: number,
      notePitchClass: string,
      noteFinger?: number
    ) => {
      if (noteLabelType === 'noteName') {
        let displayedPitchClass = notePitchClass;
        const isSharpContext = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
        const isFlatContext = FLAT_KEYS.includes(activeKeySignature);

        if (isSharpContext) {
          const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[notePitchClass];
          if (sharpEquivalent) displayedPitchClass = sharpEquivalent;
        } else if (isFlatContext) {
          const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[notePitchClass];
          if (flatEquivalent) displayedPitchClass = flatEquivalent;
        }
        return displayedPitchClass;
      } else if (noteLabelType === 'fingering') {
        if (noteFinger) return String(noteFinger);
      } else if (noteLabelType === 'qwerty') {
        if (qwertyLayout === 'mirp') {
          const targetBaseMidi = noteMidi - (mirpTranspose || 0);
          const match = MIRP_KEYBOARD_MAPPING.find((m) => m.midi === targetBaseMidi);
          if (match) return match.label;
        } else {
          const targetBaseMidi = noteMidi - ((qwertyCurrentOctaveShift || 0) * 12);
          const match = QWERTY_MINI_KEYBOARD_MAPPING.find((m) => m.midiBase === targetBaseMidi);
          if (match) return KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
        }
      }
      return '';
    };

    // 5. Notes (Optimized with primitive for loop, culling, and integer coordinate drawing | 0)
    let maxWindowMs = actualHeight / pixelsPerMillisecond;

    if (isRising) {
      for (let i = 0; i < liveNotes.length; i++) {
        const note = liveNotes[i];
        const keyPos = keyPositions.get(note.name);
        if (!keyPos) continue;

        let heightPx: number, bottomPx: number;
        if (note.endTime === null) {
          bottomPx = 0;
          heightPx = (currentTimeMs - note.startTime) * pixelsPerMillisecond;
        } else {
          heightPx = (note.endTime - note.startTime) * pixelsPerMillisecond;
          bottomPx = (currentTimeMs - note.endTime) * pixelsPerMillisecond;
        }

        heightPx = Math.max(4, heightPx);
        if (bottomPx > actualHeight + 50) continue;

        const isHeld = note.endTime === null;
        let baseColorValue = note.hand === 'left' ? leftHandColor : rightHandColor;
        if (keyPos.type === 'black') {
          baseColorValue = darkenHex(baseColorValue, 25);
        }

        const x = (keyPos.type === 'black' ? keyPos.x + keyPos.width * 0.1 : keyPos.x + 1) | 0;
        const w = (keyPos.type === 'black' ? keyPos.width * 0.8 : keyPos.width - 2) | 0;
        const h = Math.max(1, heightPx - 2) | 0;
        const y = (actualHeight - bottomPx - h) | 0;

        ctx.fillStyle = baseColorValue;
        ctx.fillRect(x, y, w, h);

        if (isHeld) {
          ctx.strokeStyle = USER_PLAY_COLOR;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        }

        const displayedLabel = getNoteLabel(note.midi, note.pitchClass);
        if (displayedLabel) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          if (!lowDetailMode) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
          }
          ctx.fillText(displayedLabel, (x + w / 2) | 0, (y + h - 2) | 0);
          if (!lowDetailMode) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
        }
      }
    } else {
      const minVisibleTime = currentTimeMs - 5000;
      const startIdx = findNoteStartIndex(notes, minVisibleTime);
      for (let i = startIdx; i < notes.length; i++) {
        const note = notes[i];
        const timeDelta = note.timeMs - currentTimeMs;
        const durationForHeight = effectiveShowOnlyMajorNotes ? Math.min(note.durationMs, noteCap) : note.durationMs;
        const noteHeightPx = Math.max(3, durationForHeight * pixelsPerMillisecond);

        // High-speed element culling (Mandate B)
        if (timeDelta > maxWindowMs + 500) break;
        if (timeDelta < -durationForHeight - 500) continue;

        const keyPos = keyPositions.get(note.name);
        if (!keyPos) continue;

        const activeInfo = activeMidiNotesInfo.get(note.noteId);
        const currentStatus = activeInfo ? activeInfo.status : null;

        let yPositionPxCalc = -note.timeMs * pixelsPerMillisecond - noteHeightPx - PLAY_LINE_THICKNESS_PX;
        if (currentStatus === 'waiting') {
          yPositionPxCalc = -PLAY_LINE_THICKNESS_PX - noteHeightPx - note.timeMs * pixelsPerMillisecond;
        }

        const y = (actualHeight + currentTimeMs * pixelsPerMillisecond + yPositionPxCalc) | 0;
        const x = (keyPos.type === 'black' ? keyPos.x + keyPos.width * 0.1 : keyPos.x + 1) | 0;
        const w = (keyPos.type === 'black' ? keyPos.width * 0.8 : keyPos.width - 2) | 0;
        const h = Math.max(1, noteHeightPx - 2) | 0;

        let baseColorStandard = note.hand === 'left' ? leftHandColor : rightHandColor;
        if (keyPos.type === 'black') {
          baseColorStandard = darkenHex(baseColorStandard, 25);
        }

        ctx.fillStyle = baseColorStandard;
        ctx.fillRect(x, y, w, h);

        let strokeColor: string | null = null;
        if (currentStatus === 'user_played') {
          strokeColor = hitNoteColor;
        } else if (currentStatus === 'playing') {
          strokeColor = 'rgba(255, 255, 255, 0.9)';
        } else if (currentStatus === 'waiting') {
          strokeColor = '#FFFFFF';
        }

        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
        }

        const displayedLabel = getNoteLabel(note.midi, note.pitchClass, note.finger);
        if (displayedLabel) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          if (!lowDetailMode) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
          }
          ctx.fillText(displayedLabel, (x + w / 2) | 0, (y + h - 2) | 0);
          if (!lowDetailMode) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // 6. Play Line
    const playLineHeight = PLAY_LINE_THICKNESS_PX;
    const playLineY = (actualHeight - playLineHeight) | 0;
    ctx.fillStyle = isRising ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34, 211, 238, 0.8)';
    ctx.fillRect(0, playLineY, width | 0, playLineHeight | 0);

    if (!isRising && !lowDetailMode) {
      ctx.shadowColor = 'rgba(34, 211, 238, 0.5)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.fillRect(0, playLineY, width | 0, playLineHeight | 0);
      ctx.shadowColor = 'transparent';
    }

    ctx.restore();
  }, [
    notes,
    liveNotes,
    isRising,
    currentTimeMs,
    keyPositions,
    activeMidiNotesInfo,
    width,
    actualHeight,
    pixelsPerMillisecond,
    barLines,
    noteLabelType,
    rightHandColor,
    leftHandColor,
    hitNoteColor,
    backgroundColor,
    activeKeySignature,
    showOnlyMajorNotes,
    showPianoTilesBackground,
    pianoTilesOpacity,
    qwertyLayout,
    qwertyCurrentOctaveShift,
    mirpTranspose,
    lowDetailMode,
    isLightBackground,
    alphaMultiplier,
    VIEWABLE_DURATION_MS
  ]);

  const getScale = () => {
    if (!containerRef.current) return 1;
    const rect = containerRef.current.getBoundingClientRect();
    return rect.height / containerRef.current.offsetHeight;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPaused || isRising) return;
    dragRef.current = {
      isDragging: true,
      startY: e.clientY,
      startTime: currentTimeMs
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging) return;
    const scale = getScale();
    const deltaY = (e.clientY - dragRef.current.startY) / scale;
    const deltaTime = deltaY / pixelsPerMillisecond;
    onSeek?.(dragRef.current.startTime + deltaTime);
  };

  const handleMouseUp = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isPaused || isRising) return;
    const deltaTime = -e.deltaY / pixelsPerMillisecond;
    onSeek?.(currentTimeMs + deltaTime);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isPaused || isRising) return;
    dragRef.current = {
      isDragging: true,
      startY: e.touches[0].clientY,
      startTime: currentTimeMs
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !dragRef.current.isDragging) return;
    const scale = getScale();
    const deltaY = (e.touches[0].clientY - dragRef.current.startY) / scale;
    const deltaTime = deltaY / pixelsPerMillisecond;
    onSeek?.(dragRef.current.startTime + deltaTime);
  };

  const handleTouchEnd = () => {
    if (dragRef.current) dragRef.current.isDragging = false;
  };

  if (actualHeight <= 0 || pixelsPerMillisecond <= 0) {
    return (
      <div
        className="relative shadow-2xl overflow-hidden no-select"
        style={{ width: `${width}px`, height: `${actualHeight}px`, margin: '0 auto', backgroundColor: backgroundColor }}
        aria-hidden="true"
      >
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{ height: `${PLAY_LINE_THICKNESS_PX * 2}px`, backgroundColor: 'rgba(34,211,238,0.2)' }}
        ></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative shadow-2xl overflow-hidden no-select ${isPaused && !isRising ? 'cursor-ns-resize' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: `${width}px`,
        height: `${actualHeight}px`,
        margin: '0 auto',
        backgroundColor: backgroundColor,
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: `${width}px`, height: `${actualHeight}px` }}
      />

      <div
        className="absolute bottom-2 left-2 text-white px-2 py-1.5 rounded-lg text-sm font-mono tabular-nums shadow-xl border border-white/10 flex flex-col gap-1 transition-all duration-300"
        style={{ 
          background: 'rgba(15, 23, 42, 0.85)', 
          backdropFilter: lowDetailMode ? 'none' : 'blur(8px)', 
          zIndex: 30,
          minWidth: statsVisible ? '120px' : '36px'
        }}
        aria-hidden="true"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStatsVisible(!statsVisible);
          }}
          className="flex items-center justify-center hover:bg-white/10 rounded transition-colors self-end w-full"
          title={statsVisible ? "Hide details" : "Show details"}
        >
          {statsVisible ? <ChevronDown size={14} className="opacity-70" /> : <ChevronUp size={14} className="opacity-70" />}
        </button>
        
        {statsVisible && (
          <div className="space-y-1 px-1 pb-1">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-1">
              <span className="opacity-60 text-[10px] uppercase font-sans tracking-tight">Key</span>
              <span className="text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                {formatKeySignatureForDisplay(activeKeySignature)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="opacity-60 text-[10px] uppercase font-sans tracking-tight">BPM</span>
              <span className="text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">
                {Math.round(activeTempoBpm)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
