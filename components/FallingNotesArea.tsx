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
        // Calculate y-position for the bar line. This corresponds to a point in time.
        // It's `actualHeight` (the bottom/play-line) plus an offset based on time.
        const yPositionPx = actualHeight + (currentTimeMs - barTimeMs) * pixelsPerMillisecond;

        // Only render if it's within the visible area to avoid unnecessary DOM elements
        if (yPositionPx < -1 || yPositionPx > actualHeight + 1) { // Add 1px buffer
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
      .filter(Boolean); // Remove null entries from the array
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

      {visibleNotes.map(note => {
        const keyPos = keyPositions.get(note.name);
        if (!keyPos) return null;

        const noteHeightPx = Math.max(3, note.durationMs * pixelsPerMillisecond);
        
        // Determine current status of the note for styling and positioning
        const activeInfo = activeMidiNotesInfo.get(note.noteId);
        const currentStatus = activeInfo ? activeInfo.status : null;

        let yPositionPxCalc =
          (actualHeight - noteHeightPx) +
          (currentTimeMs - note.timeMs) * pixelsPerMillisecond;

        if (currentStatus === 'waiting') {
          // Adjust yPosition for waiting notes so their bottom edge is centered in the thicker play line.
          // The play line's top is at (actualHeight - PLAY_LINE_THICKNESS_PX).
          // The play line's bottom is at actualHeight.
          // The center of the play line is at actualHeight - (PLAY_LINE_THICKNESS_PX / 2).
          // The note's top (yPositionPxCalc) should be (center of play line) - noteHeightPx.
          yPositionPxCalc = actualHeight - (PLAY_LINE_THICKNESS_PX / 2) - noteHeightPx;
        }

        // Final check if the note is visible after potential adjustments
        if (yPositionPxCalc > actualHeight || yPositionPxCalc + noteHeightPx < 0) {
          return null; // Note is completely out of view
        }
        
        return (
          <Note
            key={note.noteId}
            noteItem={note}
            keyPosition={keyPos}
            yPositionPx={yPositionPxCalc}
            status={currentStatus}
            pixelsPerMillisecond={pixelsPerMillisecond}
            noteLabelType={noteLabelType}
            rightHandColor={rightHandColor}
            leftHandColor={leftHandColor}
            activeKeySignature={activeKeySignature} // Pass the active key signature to Note
          />
        );
      })}
      <div
        className="absolute bottom-0 left-0 w-full bg-sky-300 opacity-75"
        style={{ height: `${PLAY_LINE_THICKNESS_PX}px` }}
      ></div>
    </div>
  );
});