import React from 'react';
import { KeyPosition, MidiNotePlaybackItem, ActiveMidiNoteInfo, NoteLabelType } from '../types';
import { WAITING_NOTE_BG_COLOR } from '../constants';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT } from '../utils'; // Import enharmonic constants

interface NoteProps {
  noteItem: MidiNotePlaybackItem;
  keyPosition: KeyPosition;
  yPositionPx: number;
  status: ActiveMidiNoteInfo['status'] | null; // Current playback status of this note
  pixelsPerMillisecond: number; // Pass this down for accurate height calculation
  noteLabelType: NoteLabelType;
  rightHandColor: string;
  leftHandColor: string;
  activeKeySignature: string; // NEW: Added activeKeySignature prop
}

const Note: React.FC<NoteProps> = ({ noteItem, keyPosition, yPositionPx, status, pixelsPerMillisecond, noteLabelType, rightHandColor, leftHandColor, activeKeySignature }) => {
  const noteHeightPx = Math.max(3, noteItem.durationMs * pixelsPerMillisecond); // Min height of 3px for better visibility

  let bgColorClass = '';
  let bgStyle = {};

  if (status === 'waiting') {
    bgColorClass = WAITING_NOTE_BG_COLOR;
  } else {
    // For playing, user_played, or default states, use the dynamic color from props
    bgStyle = {
      backgroundColor: noteItem.hand === 'left' ? leftHandColor : rightHandColor,
    };
  }
  
  const visualWidth = keyPosition.type === 'black' ? keyPosition.width * 0.8 : keyPosition.width - 1; 
  const visualX = keyPosition.type === 'black' ? keyPosition.x + (keyPosition.width * 0.1) : keyPosition.x + 0.5;

  let displayedPitchClass = noteItem.pitchClass;

  // Apply enharmonic correction if note labels are 'noteName'
  if (noteLabelType === 'noteName') {
    const isSharpContext = SHARP_KEYS.includes(activeKeySignature) || NEUTRAL_KEYS.includes(activeKeySignature);
    const isFlatContext = FLAT_KEYS.includes(activeKeySignature);

    if (isSharpContext) {
        const sharpEquivalent = ENHARMONIC_MAP_TO_SHARP[noteItem.pitchClass];
        if (sharpEquivalent) {
            displayedPitchClass = sharpEquivalent;
        }
    } else if (isFlatContext) {
        const flatEquivalent = ENHARMONIC_MAP_TO_FLAT[noteItem.pitchClass];
        if (flatEquivalent) {
            displayedPitchClass = flatEquivalent;
        }
    }
  }

  return (
    <div
      className={`absolute rounded ${bgColorClass} flex items-center justify-center shadow-md text-white font-bold text-sm`}
      style={{
        left: `${visualX}px`,
        top: `${yPositionPx}px`,
        width: `${visualWidth}px`,
        height: `${noteHeightPx}px`,
        ...bgStyle,
      }}
      aria-hidden="true" 
    >
      {noteLabelType === 'fingering' && noteItem.finger && (
        <span>{noteItem.finger}</span>
      )}
      {noteLabelType === 'noteName' && (
        <span>{displayedPitchClass}</span>
      )}
    </div>
  );
};

export default React.memo(Note);