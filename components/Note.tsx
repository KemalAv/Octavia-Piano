import React from 'react';
import { KeyPosition, MidiNotePlaybackItem, ActiveMidiNoteInfo, NoteLabelType } from '../types';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT } from '../utils'; // Import enharmonic constants

interface NoteProps {
  noteItem: MidiNotePlaybackItem;
  keyPosition: KeyPosition;
  yPositionPx: number;
  heightPx: number; // Receive height directly
  status: ActiveMidiNoteInfo['status'] | null; // Current playback status of this note
  noteLabelType: NoteLabelType;
  rightHandColor: string;
  leftHandColor: string;
  activeKeySignature: string; // NEW: Added activeKeySignature prop
}

const Note: React.FC<NoteProps> = ({ noteItem, keyPosition, yPositionPx, heightPx, status, noteLabelType, rightHandColor, leftHandColor, activeKeySignature }) => {
  // Use the passed height directly
  
  let bgStyle: React.CSSProperties = {};

  // For playing, user_played, or default states, use the dynamic color from props
  bgStyle = {
    backgroundColor: noteItem.hand === 'left' ? leftHandColor : rightHandColor,
  };

  // If status is waiting, the background color is already set by the above logic.
  // The original WAITING_NOTE_BG_COLOR (purple) is no longer directly applied via bgColorClass.
  
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
      className={`absolute rounded flex items-center justify-center shadow-md text-white font-bold text-sm`}
      style={{
        left: `${visualX}px`,
        top: `${yPositionPx}px`,
        width: `${visualWidth}px`,
        height: `${heightPx}px`,
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