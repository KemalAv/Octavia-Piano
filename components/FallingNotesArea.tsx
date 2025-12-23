import React from 'react';
import { MidiNotePlaybackItem, KeyPosition, ActiveMidiNoteInfo, NoteLabelType, QwertyLayout, FreePlayLiveNote } from '../types';
import Note from './Note';
import { PLAY_LINE_THICKNESS_PX, USER_PLAY_COLOR, VISUAL_NOTE_CAP_MS } from '../constants';
import { darkenHex, formatKeySignatureForDisplay, hexToRgba } from '../utils';

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
  backgroundColor: string;
  activeKeySignature: string; // NEW: Added activeKeySignature prop
  activeTempoBpm: number; // NEW: For displaying current BPM
  showOnlyMajorNotes: boolean;
  showPianoTilesBackground: boolean; // NEW: Show Piano Tiles Background Prop
  // NEW: Props for QWERTY labels
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
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
  backgroundColor,
  activeKeySignature, // Destructure the new prop
  activeTempoBpm,
  showOnlyMajorNotes,
  showPianoTilesBackground,
  qwertyLayout = 'default',
  qwertyCurrentOctaveShift = 0,
  mirpTranspose = 0,
}) => {

  const VIEWABLE_DURATION_MS = actualHeight > 0 && pixelsPerMillisecond > 0
    ? actualHeight / pixelsPerMillisecond
    : 0;

  const visibleNotes = React.useMemo(() => {
    if (actualHeight <= 0 || pixelsPerMillisecond <= 0 || isRising) return [];
    return notes.filter(note => {
        const duration = showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs;
        const noteStartTimeVisible = note.timeMs < currentTimeMs + VIEWABLE_DURATION_MS;
        const noteEndTimeVisible = note.timeMs + duration > currentTimeMs;
        return noteStartTimeVisible && noteEndTimeVisible;
    });
  }, [notes, actualHeight, pixelsPerMillisecond, currentTimeMs, VIEWABLE_DURATION_MS, showOnlyMajorNotes, isRising]);

  // NEW: Piano Tiles Background Rendering
  const pianoTilesBackground = React.useMemo(() => {
    if (!showPianoTilesBackground || actualHeight <= 0) return null;
    const whiteTiles: React.JSX.Element[] = [];
    const blackTiles: React.JSX.Element[] = [];

    keyPositions.forEach((kp) => {
        const style: React.CSSProperties = {
            left: `${kp.x}px`,
            width: `${kp.width}px`,
            height: '100%',
            backgroundColor: kp.type === 'white' 
                ? 'rgba(255, 255, 255, 0.05)' // Subtle grid
                : 'rgba(0, 0, 0, 0.2)',     // Darker tracks for black keys
            zIndex: kp.type === 'white' ? 0 : 1
        };
        const tile = <div key={`bg-tile-${kp.name}`} className="absolute top-0 border-r border-white/5" style={style} />;
        
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
  }, [keyPositions, actualHeight, showPianoTilesBackground]);


  const whiteKeyGridLines = React.useMemo(() => {
    if (actualHeight <= 0) return null;
    const lines: React.JSX.Element[] = [];
    keyPositions.forEach((keyPos) => {
      if (keyPos.type === 'white') {
        lines.push(
          <div
            key={`grid-line-start-${keyPos.name}`}
            className="absolute top-0 bottom-0 w-px bg-white opacity-10"
            style={{ left: `${keyPos.x}px`, zIndex: 2 }} 
          />
        );
      }
    });
    if (width > 0) {
       lines.push(
          <div
            key={`grid-line-end`}
            className="absolute top-0 bottom-0 w-px bg-white opacity-10"
            style={{ left: `${width -1}px`, zIndex: 2 }}
          />
        );
    }
    return lines;
  }, [keyPositions, width, actualHeight]);

  const renderedBarLines = React.useMemo(() => {
    if (!barLines || actualHeight <= 0 || pixelsPerMillisecond <= 0 || isRising) return null;

    return barLines
      .map(barTimeMs => {
        const yPositionPx = actualHeight + (currentTimeMs - barTimeMs) * pixelsPerMillisecond;
        if (yPositionPx < -1 || yPositionPx > actualHeight + 1) {
          return null;
        }
        return (
          <div
            key={`bar-line-${barTimeMs}`}
            className="absolute left-0 w-full border-t border-slate-500 opacity-50 shadow-[0_0_5px_rgba(255,255,255,0.3)]"
            style={{ top: `${yPositionPx}px`, zIndex: 5 }} // Ensure bar lines are visible
            aria-hidden="true"
          />
        );
      })
      .filter(Boolean);
  }, [barLines, currentTimeMs, actualHeight, pixelsPerMillisecond, isRising]);

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
      className="relative shadow-2xl overflow-hidden no-select"
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
                    // Note is being held: Grow upwards from the play-line (bottom 0).
                    bottomPx = 0;
                    heightPx = (currentTimeMs - note.startTime) * pixelsPerMillisecond;
                } else {
                    // Note is released: Scroll the entire note upwards.
                    heightPx = (note.endTime - note.startTime) * pixelsPerMillisecond;
                    bottomPx = (currentTimeMs - note.endTime) * pixelsPerMillisecond;
                }
                
                // Ensure note has at least some visibility
                heightPx = Math.max(4, heightPx);
                
                let baseColor = note.hand === 'left' ? leftHandColor : rightHandColor;
                if (keyPos.type === 'black') {
                  baseColor = darkenHex(baseColor, 25);
                }

                // Don't render if it's way off-screen (top)
                if (bottomPx > actualHeight + 50) {
                    return null;
                }

                const isHeld = note.endTime === null;

                let borderStyle: React.CSSProperties;
                let boxShadow: string;

                if (isHeld) {
                    // Gold border and glow for held notes
                    borderStyle = { border: `2px solid ${USER_PLAY_COLOR}` };
                    boxShadow = `0 0 15px ${USER_PLAY_COLOR}, inset 0 0 10px ${hexToRgba(USER_PLAY_COLOR, 0.3)}`;
                } else {
                    // Default style for released notes
                    borderStyle = {
                        borderTop: '1px solid rgba(255,255,255,0.6)',
                        borderLeft: '1px solid rgba(255,255,255,0.4)',
                        borderRight: '1px solid rgba(0,0,0,0.3)',
                        borderBottom: '1px solid rgba(0,0,0,0.5)',
                    };
                    boxShadow = `0 0 10px ${baseColor}80, inset 0 0 10px rgba(0,0,0,0.2)`;
                }

                return (
                    <div
                        key={note.id}
                        className="absolute rounded-sm flex items-end justify-center pb-1 text-white font-bold text-xs overflow-hidden"
                        style={{
                            left: `${keyPos.type === 'black' ? keyPos.x + (keyPos.width * 0.1) : keyPos.x + 1}px`,
                            bottom: `${bottomPx}px`,
                            width: `${keyPos.type === 'black' ? keyPos.width * 0.8 : keyPos.width - 2}px`,
                            height: `${Math.max(1, heightPx - 2)}px`,
                            backgroundColor: baseColor,
                            ...borderStyle,
                            boxShadow,
                            zIndex: isHeld ? 20 : 15,
                            willChange: 'height, bottom'
                        }}
                    >
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

                let yPositionPxCalc = -note.timeMs * pixelsPerMillisecond - noteHeightPx;

                if (currentStatus === 'waiting') {
                    yPositionPxCalc = - (PLAY_LINE_THICKNESS_PX / 2) - noteHeightPx - note.timeMs * pixelsPerMillisecond;
                }
                
                return (
                    <Note
                    key={note.noteId}
                    noteItem={note}
                    keyPosition={keyPos}
                    yPositionPx={yPositionPxCalc}
                    heightPx={noteHeightPx}
                    status={currentStatus}
                    noteLabelType={noteLabelType}
                    rightHandColor={rightHandColor}
                    leftHandColor={leftHandColor}
                    activeKeySignature={activeKeySignature}
                    qwertyLayout={qwertyLayout}
                    qwertyCurrentOctaveShift={qwertyCurrentOctaveShift}
                    mirpTranspose={mirpTranspose}
                    />
                );
            })}
        </div>
      )}

      {!isRising && (
          <div
            className="absolute bottom-2 left-2 text-white px-3 py-2 rounded-lg text-sm font-mono tabular-nums shadow-lg space-y-1 border border-white/10"
            style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', zIndex: 20 }}
            aria-hidden="true"
          >
            <div className="flex justify-between"><span>Key:</span> <span className="text-cyan-400 font-bold">{formatKeySignatureForDisplay(activeKeySignature)}</span></div>
            <div className="flex justify-between"><span>BPM:</span> <span className="text-yellow-400 font-bold">{Math.round(activeTempoBpm)}</span></div>
          </div>
      )}

      {/* Hit Line / Judgment Line */}
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{ 
            height: `${PLAY_LINE_THICKNESS_PX}px`, 
            zIndex: 20,
            backgroundColor: isRising ? 'rgba(255, 255, 255, 0.1)' : 'rgba(34,211,238,0.8)', // Subtler line in Free Play
            boxShadow: isRising ? 'none' : '0 0 10px rgba(34, 211, 238, 0.5)'
        }}
      ></div>
    </div>
  );
});