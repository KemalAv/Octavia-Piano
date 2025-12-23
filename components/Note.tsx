import React from 'react';
import { KeyPosition, MidiNotePlaybackItem, ActiveMidiNoteInfo, NoteLabelType, QwertyLayout } from '../types';
import { SHARP_KEYS, FLAT_KEYS, NEUTRAL_KEYS, ENHARMONIC_MAP_TO_SHARP, ENHARMONIC_MAP_TO_FLAT, darkenHex, hexToRgba, lightenHex } from '../utils'; // Import enharmonic constants and color utils
import { QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY, USER_PLAY_COLOR } from '../constants'; // Import USER_PLAY_COLOR

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
  // NEW: QWERTY Label Props
  qwertyLayout?: QwertyLayout;
  qwertyCurrentOctaveShift?: number;
  mirpTranspose?: number;
}

const Note: React.FC<NoteProps> = ({ 
  noteItem, 
  keyPosition, 
  yPositionPx, 
  heightPx, 
  status, 
  noteLabelType, 
  rightHandColor, 
  leftHandColor, 
  activeKeySignature,
  qwertyLayout = 'default',
  qwertyCurrentOctaveShift = 0,
  mirpTranspose = 0,
}) => {
  const isWhiteKey = keyPosition.type === 'white';
  let bgStyle: React.CSSProperties = {};
  let baseColor = noteItem.hand === 'left' ? leftHandColor : rightHandColor;

  let glow = `0 0 10px ${baseColor}80, inset 0 0 10px rgba(0,0,0,0.2)`;
  let borderStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.6)',
    borderLeft: '1px solid rgba(255,255,255,0.4)',
    borderRight: '1px solid rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(0,0,0,0.5)',
  };

  if (status === 'playing') {
    // White border for system-played notes
    borderStyle = {
      border: '2px solid rgba(255, 255, 255, 0.9)',
    };
    glow = `0 0 10px ${baseColor}80, inset 0 0 10px rgba(0,0,0,0.2), 0 0 8px white`;
  } else if (status === 'user_played') {
    // Gold border and glow for user-played notes
    borderStyle = {
      border: `2px solid ${USER_PLAY_COLOR}`
    };
    glow = `0 0 20px ${USER_PLAY_COLOR}`;
  } else if (status === 'waiting') {
    // Waiting notes have a white border and glow, but retain original hand color.
    borderStyle = {
      border: '2px solid white',
    };
    glow = '0 0 15px white';
  }

  // Always darken black keys unless they are waiting for input (for better visibility)
  if (keyPosition.type === 'black' && status !== 'waiting') {
    baseColor = darkenHex(baseColor, 25);
  }
  
  bgStyle = {
    backgroundColor: baseColor,
    boxShadow: glow,
    ...borderStyle,
  };
  
  const visualWidth = keyPosition.type === 'black' ? keyPosition.width * 0.8 : keyPosition.width - 2; // Slightly narrower for spacing
  const visualX = keyPosition.type === 'black' ? keyPosition.x + (keyPosition.width * 0.1) : keyPosition.x + 1;

  let displayedLabel = '';

  if (noteLabelType === 'noteName') {
    let displayedPitchClass = noteItem.pitchClass;
    // Apply enharmonic correction if note labels are 'noteName'
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
    displayedLabel = displayedPitchClass;
  } else if (noteLabelType === 'fingering') {
    if (noteItem.finger) {
      displayedLabel = String(noteItem.finger);
    }
  } else if (noteLabelType === 'qwerty') {
    // Calculate which key triggers this note
    if (qwertyLayout === 'mirp') {
      // For MIRP: Played Note = Base Key Midi + Transpose
      // So Base Key Midi = Played Note - Transpose
      const targetBaseMidi = noteItem.midi - mirpTranspose;
      const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === targetBaseMidi);
      if (match) {
        displayedLabel = match.label;
      }
    } else {
      // For Default: Played Note = Base Key Midi + (Shift * 12)
      // So Base Key Midi = Played Note - (Shift * 12)
      const targetBaseMidi = noteItem.midi - (qwertyCurrentOctaveShift * 12);
      const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === targetBaseMidi);
      if (match) {
        // Use the display mapping if available, otherwise capitalize key code
        displayedLabel = KEY_CODES_TO_DISPLAY[match.qwertyKey] || match.qwertyKey.replace('key', '').toUpperCase();
      }
    }
  }

  return (
    <div
      className={`absolute rounded-sm flex items-end justify-center pb-1 text-white font-bold text-xs overflow-hidden z-10 transition-transform duration-75`}
      style={{
        left: `${visualX}px`,
        top: `${yPositionPx}px`,
        width: `${visualWidth}px`,
        height: `${Math.max(1, heightPx - 2)}px`,
        ...bgStyle,
      }}
      aria-hidden="true" 
    >
      {displayedLabel && (
        <span className="select-none pointer-events-none drop-shadow-md z-20 relative">{displayedLabel}</span>
      )}
    </div>
  );
};

export default React.memo(Note);