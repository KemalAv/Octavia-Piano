
import React from 'react';
import { MidiNotePlaybackItem, KeyPosition, ActiveMidiNoteInfo, NoteLabelType, QwertyLayout, FreePlayLiveNote } from '../types';
import { PLAY_LINE_THICKNESS_PX, USER_PLAY_COLOR, VISUAL_NOTE_CAP_MS, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
import { darkenHex, lightenHex, formatKeySignatureForDisplay, SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT } from '../utils';

interface FallingNotesAreaProps {
  notes: MidiNotePlaybackItem[];
  liveNotes?: FreePlayLiveNote[]; // NEW: Added for live rendering
  isRising?: boolean; // NEW: Added for Free Play rising effect
  currentTimeMs: number;
  keyPositions: Map<string, KeyPosition>;
  activeMidiNotesInfo: Map<string, ActiveMidiNoteInfo>; // Key is now noteId
  width: number;
  actualHeight: number; // Dynamic height passed from parent
  pixelsPerMillisecond: number; // Current speed/density factor
  barLines: number[]; // Timestamps for each bar line
  noteLabelType: NoteLabelType;
  rightHandColor: string;
  leftHandColor: string;
  hitNoteColor: string;
  backgroundColor: string;
  activeKeySignature: string; // NEW: Added activeKeySignature prop
  activeTempoBpm: number; // NEW: For displaying current BPM
  showOnlyMajorNotes: boolean;
  showPianoTilesBackground: boolean;
  pianoTilesOpacity?: number; // NEW
  isPaused?: boolean;
  onSeek?: (timeMs: number) => void; // NEW: For interaction
  // NEW: Props for QWERTY labels
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
  lowDetailMode?: boolean;
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
  activeKeySignature, // Destructure the new prop
  activeTempoBpm,
  showOnlyMajorNotes,
  showPianoTilesBackground,
  pianoTilesOpacity = 50,
  isPaused = false,
  onSeek,
  qwertyLayout = 'default',
  qwertyCurrentOctaveShift = 0,
  mirpTranspose = 0,
  lowDetailMode = false,
}) => {

  const alphaMultiplier = pianoTilesOpacity / 100;

  const VIEWABLE_DURATION_MS = actualHeight > 0 && pixelsPerMillisecond > 0
    ? actualHeight / pixelsPerMillisecond
    : 0;

  const isLightBackground = React.useMemo(() => {
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

  const visibleNotes = React.useMemo(() => {
    if (actualHeight <= 0 || pixelsPerMillisecond <= 0) return [];
    
    // Efficiently find visible notes using the sorted property of notes
    const minTime = currentTimeMs - 5000; // Stay visible for 5s after passing to ensure they fall off screen
    const maxTime = currentTimeMs + VIEWABLE_DURATION_MS + 100;

    let startIndex = 0;
    // Linear search for start index is fine for most songs, but we could use binary search if needed
    while (startIndex < notes.length && notes[startIndex].timeMs < minTime) {
        startIndex++;
    }

    const result: MidiNotePlaybackItem[] = [];
    for (let i = startIndex; i < notes.length; i++) {
        const note = notes[i];
        if (note.timeMs > maxTime) break;
        
        const duration = showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs;
        const noteEndTimeVisible = note.timeMs + duration > currentTimeMs - 5000;
        
        if (noteEndTimeVisible) {
            result.push(note);
        }
    }
    return result;
  }, [notes, actualHeight, pixelsPerMillisecond, currentTimeMs, VIEWABLE_DURATION_MS, showOnlyMajorNotes]);

  const pianoTilesBackground = React.useMemo(() => {
    if (!showPianoTilesBackground || actualHeight <= 0) return null;
    const whiteTiles: React.JSX.Element[] = [];
    const blackTiles: React.JSX.Element[] = [];

    keyPositions.forEach((kp) => {
        const whiteTileAlpha = (isLightBackground ? 0.1 : 0.15) * alphaMultiplier;
        const blackTileAlpha = alphaMultiplier;
        
        const whiteTileColor = isLightBackground ? `rgba(0, 0, 0, ${whiteTileAlpha})` : `rgba(255, 255, 255, ${whiteTileAlpha})`;
        const blackTileColor = `rgba(0, 0, 0, ${blackTileAlpha})`;
        
        const style: React.CSSProperties = {
            left: `${kp.x}px`,
            width: `${kp.width}px`,
            height: '100%',
            backgroundColor: kp.type === 'white' ? whiteTileColor : blackTileColor,
            zIndex: kp.type === 'white' ? 0 : 1
        };
        const tile = <div key={`bg-tile-${kp.name}`} className={`absolute top-0 border-r ${isLightBackground ? 'border-black/5' : 'border-white/5'}`} style={style} />;
        
        if (kp.type === 'white') {
            whiteTiles.push(tile);
        } else {
            blackTiles.push(tile);
        }
    });

    return (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {whiteTiles}
            {blackTiles}
        </div>
    );
  }, [keyPositions, actualHeight, showPianoTilesBackground, isLightBackground]);


  const whiteKeyGridLines = React.useMemo(() => {
    if (actualHeight <= 0) return null;
    const lines: React.JSX.Element[] = [];
    keyPositions.forEach((keyPos) => {
      if (keyPos.type === 'white') {
        lines.push(
          <div
            key={`grid-line-start-${keyPos.name}`}
            className={`absolute top-0 bottom-0 w-px ${isLightBackground ? 'bg-black opacity-10' : 'bg-white opacity-10'}`}
            style={{ left: `${keyPos.x}px`, zIndex: 2 }} 
          />
        );
      }
    });
    if (width > 0) {
       lines.push(
          <div
            key={`grid-line-end`}
            className={`absolute top-0 bottom-0 w-px ${isLightBackground ? 'bg-black opacity-10' : 'bg-white opacity-10'}`}
            style={{ left: `${width -1}px`, zIndex: 2 }}
          />
        );
    }
    return lines;
  }, [keyPositions, width, actualHeight, isLightBackground]);

  const renderedBarLines = React.useMemo(() => {
    if (!barLines || actualHeight <= 0 || pixelsPerMillisecond <= 0) return null;

    const bufferMs = 50 / pixelsPerMillisecond;
    const minTime = isRising ? currentTimeMs - VIEWABLE_DURATION_MS - bufferMs : currentTimeMs - bufferMs;
    const maxTime = isRising ? currentTimeMs + bufferMs : currentTimeMs + VIEWABLE_DURATION_MS + bufferMs;

    return barLines.reduce((acc, barTimeMs, index) => {
      if (barTimeMs >= minTime && barTimeMs <= maxTime) {
        let yPositionPx: number;
        if (isRising) {
            yPositionPx = actualHeight - (currentTimeMs - barTimeMs) * pixelsPerMillisecond - PLAY_LINE_THICKNESS_PX;
        } else {
            yPositionPx = actualHeight + (currentTimeMs - barTimeMs) * pixelsPerMillisecond - PLAY_LINE_THICKNESS_PX;
        }
        
        acc.push(
          <div
            key={`bar-line-container-${barTimeMs}`}
            className="absolute left-0 w-full pointer-events-none"
            style={{ top: `${yPositionPx}px`, zIndex: 5 }}
            aria-hidden="true"
          >
            <div
              className={`w-full border-t opacity-50 ${isLightBackground ? 'border-slate-400' : 'border-slate-500 shadow-[0_0_5px_rgba(255,255,255,0.3)]'}`}
            />
            <span
              className={`absolute left-2 text-[10px] font-mono ${isRising ? '-top-3' : '-top-2.5'}`}
              style={{
                color: isLightBackground ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
              }}
            >
              {index + 1}
            </span>
          </div>
        );
      }
      return acc;
    }, [] as React.JSX.Element[]);
  }, [barLines, currentTimeMs, actualHeight, pixelsPerMillisecond, isRising, isLightBackground, VIEWABLE_DURATION_MS]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ isDragging: boolean; startY: number; startTime: number } | null>(null);

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
      {pianoTilesBackground}
      {whiteKeyGridLines}
      {renderedBarLines}

      {isRising ? (
        <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 10 }}>
            {liveNotes.map(note => {
                const keyPos = keyPositions.get(note.name);
                if (!keyPos) return null;
                
                let heightPx: number, bottomPx: number;

                if (note.endTime === null) {
                    bottomPx = 0;
                    heightPx = (currentTimeMs - note.startTime) * pixelsPerMillisecond;
                } else {
                    heightPx = (note.endTime - note.startTime) * pixelsPerMillisecond;
                    bottomPx = (currentTimeMs - note.endTime) * pixelsPerMillisecond;
                }
                
                heightPx = Math.max(4, heightPx);
                
                let baseColorValue = note.hand === 'left' ? leftHandColor : rightHandColor;
                if (keyPos.type === 'black') {
                  baseColorValue = lightenHex(baseColorValue, 20);
                }

                if (bottomPx > actualHeight + 50) {
                    return null;
                }

                const isHeld = note.endTime === null;

                let borderStyle: React.CSSProperties = {}; // Always simple
                const boxShadow = 'none'; // Always use low detail mode style for free play

                if (isHeld) {
                    borderStyle = { border: `2px solid ${USER_PLAY_COLOR}` };
                }
                
                let displayedLabel = '';
                if (noteLabelType === 'noteName') {
                    let displayedPitchClass = note.pitchClass;
                    const isSharpContext = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
                    const isFlatContext = FLAT_KEYS.includes(activeKeySignature);

                    if (isSharpContext) {
                        const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[note.pitchClass];
                        if (sharpEquivalent) displayedPitchClass = sharpEquivalent;
                    } else if (isFlatContext) {
                        const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[note.pitchClass];
                        if (flatEquivalent) displayedPitchClass = flatEquivalent;
                    }
                    displayedLabel = displayedPitchClass;
                } else if (noteLabelType === 'qwerty') {
                    if (qwertyLayout === 'mirp') {
                        const targetBaseMidi = note.midi - (mirpTranspose || 0);
                        const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === targetBaseMidi);
                        if (match) displayedLabel = match.label;
                    } else {
                        const targetBaseMidi = note.midi - ((qwertyCurrentOctaveShift || 0) * 12);
                        const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === targetBaseMidi);
                        if (match) displayedLabel = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
                    }
                }

                return (
                    <div
                        key={note.id}
                        className="absolute rounded-none flex items-end justify-center pb-1 text-white font-bold text-xs overflow-hidden"
                        style={{
                            left: `${keyPos.type === 'black' ? keyPos.x + (keyPos.width * 0.1) : keyPos.x + 1}px`,
                            bottom: `${bottomPx}px`,
                            width: `${keyPos.type === 'black' ? keyPos.width * 0.8 : keyPos.width - 2}px`,
                            height: `${Math.max(1, heightPx - 2)}px`,
                            backgroundColor: baseColorValue,
                            ...borderStyle,
                            boxShadow,
                            zIndex: isHeld ? 20 : 15,
                            willChange: 'height, bottom'
                        }}
                    >
                        {displayedLabel && (
                            <span className="select-none pointer-events-none drop-shadow-md z-20 relative">{displayedLabel}</span>
                        )}
                    </div>
                );
            })}
        </div>
      ) : (
        <div
            className="absolute top-0 left-0"
            style={{
            transform: `translateY(${actualHeight + currentTimeMs * pixelsPerMillisecond}px)`,
            willChange: 'transform',
            zIndex: 10
            }}
        >
            {visibleNotes.map(note => {
                const keyPos = keyPositions.get(note.name);
                if (!keyPos) return null;

                const durationForHeight = showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs;
                const noteHeightPx = Math.max(3, durationForHeight * pixelsPerMillisecond);
                
                const activeInfo = activeMidiNotesInfo.get(note.noteId);
                const currentStatus = activeInfo ? activeInfo.status : null;

                const timePast = currentTimeMs - note.timeMs;
                const opacity = timePast > 0 ? Math.max(0, 1 - timePast / 500) : 1;

                let yPositionPxCalc = -note.timeMs * pixelsPerMillisecond - noteHeightPx - PLAY_LINE_THICKNESS_PX;

                if (currentStatus === 'waiting') {
                    yPositionPxCalc = - PLAY_LINE_THICKNESS_PX - noteHeightPx - note.timeMs * pixelsPerMillisecond;
                }
                
                let baseColorStandard = note.hand === 'left' ? leftHandColor : rightHandColor;
                if (keyPos.type === 'black') {
                  baseColorStandard = lightenHex(baseColorStandard, 20);
                }

                let borderStyle: React.CSSProperties = {};
                const boxShadow = 'none';

                if (currentStatus === 'user_played') {
                    borderStyle = { border: `2px solid ${hitNoteColor}` };
                } else if (currentStatus === 'playing') {
                    borderStyle = { border: `2px solid rgba(255, 255, 255, 0.9)` };
                } else if (currentStatus === 'waiting') {
                    borderStyle = { border: `2px solid #FFFFFF` };
                }
                
                let displayedLabel = '';
                if (noteLabelType === 'noteName') {
                    let displayedPitchClass = note.pitchClass;
                    const isSharpContext = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
                    const isFlatContext = FLAT_KEYS.includes(activeKeySignature);

                    if (isSharpContext) {
                        const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[note.pitchClass];
                        if (sharpEquivalent) displayedPitchClass = sharpEquivalent;
                    } else if (isFlatContext) {
                        const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[note.pitchClass];
                        if (flatEquivalent) displayedPitchClass = flatEquivalent;
                    }
                    displayedLabel = displayedPitchClass;
                } else if (noteLabelType === 'fingering') {
                    if (note.finger) {
                        displayedLabel = String(note.finger);
                    }
                } else if (noteLabelType === 'qwerty') {
                    if (qwertyLayout === 'mirp') {
                        const targetBaseMidi = note.midi - (mirpTranspose || 0);
                        const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === targetBaseMidi);
                        if (match) displayedLabel = match.label;
                    } else {
                        const targetBaseMidi = note.midi - ((qwertyCurrentOctaveShift || 0) * 12);
                        const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === targetBaseMidi);
                        if (match) displayedLabel = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
                    }
                }

                return (
                  <div
                    key={note.noteId}
                    className="absolute rounded-none flex items-end justify-center pb-1 text-white font-bold text-xs overflow-hidden"
                    style={{
                        left: `${keyPos.type === 'black' ? keyPos.x + (keyPos.width * 0.1) : keyPos.x + 1}px`,
                        top: `${yPositionPxCalc}px`,
                        width: `${keyPos.type === 'black' ? keyPos.width * 0.8 : keyPos.width - 2}px`,
                        height: `${Math.max(1, noteHeightPx - 2)}px`,
                        backgroundColor: baseColorStandard,
                        ...borderStyle,
                        boxShadow,
                        zIndex: currentStatus ? 20 : 15,
                        willChange: 'top'
                    }}
                  >
                    {displayedLabel && (
                        <span className="select-none pointer-events-none drop-shadow-md z-20 relative">{displayedLabel}</span>
                    )}
                  </div>
                );
            })}
        </div>
      )}

      <div
        className="absolute bottom-2 left-2 text-white px-3 py-2 rounded-lg text-sm font-mono tabular-nums shadow-lg space-y-1 border border-white/10"
        style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: lowDetailMode ? 'none' : 'blur(4px)', zIndex: 20 }}
        aria-hidden="true"
      >
        <div className="flex justify-between gap-4"><span>Key:</span> <span className="text-cyan-400 font-bold">{formatKeySignatureForDisplay(activeKeySignature)}</span></div>
        <div className="flex justify-between gap-4"><span>BPM:</span> <span className="text-yellow-400 font-bold">{Math.round(activeTempoBpm)}</span></div>
      </div>

      <div
        className="absolute bottom-0 left-0 w-full"
        style={{ 
            height: `${PLAY_LINE_THICKNESS_PX}px`, 
            zIndex: 20,
            backgroundColor: isRising ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34,211,238,0.8)',
            boxShadow: isRising || lowDetailMode ? 'none' : '0 0 10px rgba(34, 211, 238, 0.5)'
        }}
      ></div>
    </div>
  );
});
