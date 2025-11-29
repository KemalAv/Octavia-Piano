import React from 'react';
import { MidiNotePlaybackItem, KeyPosition, ActiveMidiNoteInfo, NoteLabelType } from '../types';
import Note from './Note';
import { PLAY_LINE_THICKNESS_PX } from '../constants';

interface FallingNotesAreaProps {
  notes: MidiNotePlaybackItem[];
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
  showOnlyMajorNotes: boolean; // NEW: Added showOnlyMajorNotes prop
  activeTempoBpm: number; // NEW: For displaying current BPM
}

export const FallingNotesArea: React.FC<FallingNotesAreaProps> = React.memo(({
  notes,
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
  showOnlyMajorNotes, // Destructure the new prop
  activeTempoBpm,
}) => {

  const VIEWABLE_DURATION_MS = actualHeight > 0 && pixelsPerMillisecond > 0
    ? actualHeight / pixelsPerMillisecond
    : 0;

  const visibleNotes = notes.filter(note => {
    if (actualHeight <=0 || pixelsPerMillisecond <= 0) return false;
    const noteStartTimeVisible = note.timeMs < currentTimeMs + VIEWABLE_DURATION_MS;
    const noteEndTimeVisible = note.timeMs + note.durationMs > currentTimeMs;
    return noteStartTimeVisible && noteEndTimeVisible;
  });

  const whiteKeyGridLines = React.useMemo(() => {
    if (actualHeight <= 0) return null;
    const lines: React.JSX.Element[] = [];
    keyPositions.forEach((keyPos) => {
      if (keyPos.type === 'white') {
        lines.push(
          <div
            key={`grid-line-start-${keyPos.name}`}
            className="absolute top-0 bottom-0 w-px bg-slate-700 opacity-60"
            style={{ left: `${keyPos.x}px` }}
          />
        );
      }
    });
    if (width > 0) {
       lines.push(
          <div
            key={`grid-line-end`}
            className="absolute top-0 bottom-0 w-px bg-slate-700 opacity-60"
            style={{ left: `${width -1}px` }}
          />
        );
    }
    return lines;
  }, [keyPositions, width, actualHeight]);

  const renderedBarLines = React.useMemo(() => {
    if (!barLines || actualHeight <= 0 || pixelsPerMillisecond <= 0) return null;

    return barLines
      .map(barTimeMs => {
        const yPositionPx = actualHeight + (currentTimeMs - barTimeMs) * pixelsPerMillisecond;
        if (yPositionPx < -1 || yPositionPx > actualHeight + 1) {
          return null;
        }
        return (
          <div
            key={`bar-line-${barTimeMs}`}
            className="absolute left-0 w-full border-t border-dashed border-slate-600 opacity-75"
            style={{ top: `${yPositionPx}px` }}
            aria-hidden="true"
          />
        );
      })
      .filter(Boolean);
  }, [barLines, currentTimeMs, actualHeight, pixelsPerMillisecond]);

  if (actualHeight <= 0 || pixelsPerMillisecond <= 0) {
    return (
        <div
            className="relative shadow-inner overflow-hidden no-select"
            style={{ width: `${width}px`, height: `${actualHeight}px`, margin: '0 auto', backgroundColor: backgroundColor }}
            aria-hidden="true"
        >
             <div
                className="absolute bottom-0 left-0 w-full bg-sky-300 opacity-75"
                style={{ height: `${PLAY_LINE_THICKNESS_PX}px` }}
            ></div>
        </div>
    );
  }

  const VISUAL_NOTE_CAP_MS = 200; // Cap duration for visual "major note" style
  const containerTransform = `translateY(${actualHeight + currentTimeMs * pixelsPerMillisecond}px)`;

  return (
    <div
      className="relative shadow-inner overflow-hidden no-select"
      style={{
        width: `${width}px`,
        height: `${actualHeight}px`,
        margin: '0 auto',
        backgroundColor: backgroundColor,
      }}
      aria-hidden="true"
    >
      {whiteKeyGridLines}
      {renderedBarLines}

      <div
        className="absolute top-0 left-0"
        style={{
          transform: containerTransform,
          willChange: 'transform',
        }}
      >
        {visibleNotes.map(note => {
          const keyPos = keyPositions.get(note.name);
          if (!keyPos) return null;

          const visualDurationMs = showOnlyMajorNotes ? Math.min(note.durationMs, VISUAL_NOTE_CAP_MS) : note.durationMs;
          const noteHeightPx = Math.max(3, visualDurationMs * pixelsPerMillisecond);
          
          const activeInfo = activeMidiNotesInfo.get(note.noteId);
          const currentStatus = activeInfo ? activeInfo.status : null;

          let yPositionPxCalc = -note.timeMs * pixelsPerMillisecond - noteHeightPx;

          if (currentStatus === 'waiting') {
            // Adjust yPosition for waiting notes to align them precisely with the play line,
            // accounting for the container's transform.
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
            />
          );
        })}
      </div>

      <div
        className="absolute bottom-2 left-2 bg-slate-900/70 text-white px-3 py-2 rounded-md text-sm font-mono tabular-nums shadow-lg space-y-1"
        style={{ backdropFilter: 'blur(2px)' }}
        aria-hidden="true"
      >
        <div>Key: {activeKeySignature}</div>
        <div>BPM: {Math.round(activeTempoBpm)}</div>
      </div>

      <div
        className="absolute bottom-0 left-0 w-full bg-sky-300 opacity-75"
        style={{ height: `${PLAY_LINE_THICKNESS_PX}px` }}
      ></div>
    </div>
  );
});