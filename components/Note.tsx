
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
  lowDetailMode?: boolean;
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
  lowDetailMode = false,
}) => {
  const isWhiteKey = keyPosition.type === 'white';
  let dynamicStyle: React.CSSProperties = {};
  let baseColor = noteItem.hand === 'left' ? leftHandColor : rightHandColor;

  let borderStyle: React.CSSProperties = lowDetailMode ? {} : {
    borderTop: '1px solid rgba(255,255,255,0.6)',
    borderLeft: '1px solid rgba(255,255,255,0.4)',
    borderRight: '1px solid rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(0,0,0,0.5)',
  };

  if (status === 'playing') {
    borderStyle = {};
  } else if (status === 'user_played') {
    borderStyle = {
      border: `2px solid ${USER_PLAY_COLOR}`
    };
  } else if (status === 'waiting') {
    dynamicStyle = {
        backgroundColor: isWhiteKey ? lightenHex(baseColor, 60) : baseColor, 
        borderColor: baseColor,
        zIndex: isWhiteKey ? 5 : 20,
    };
  }

  if (keyPosition.type === 'black' && status !== 'waiting') {
    baseColor = darkenHex(baseColor, 25);
  }
  
  let bgStyle: React.CSSProperties;
  if (Object.keys(dynamicStyle).length > 0) {
      bgStyle = dynamicStyle;
  } else {
      bgStyle = {
        backgroundColor: baseColor,
        ...borderStyle,
      };
  }
  
  const visualWidth = keyPosition.type === 'black' ? keyPosition.width * 0.8 : keyPosition.width - 2;
  const visualX = keyPosition.type === 'black' ? keyPosition.x + (keyPosition.width * 0.1) : keyPosition.x + 1;

  let displayedLabel = '';

  if (noteLabelType === 'noteName') {
    let displayedPitchClass = noteItem.pitchClass;
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
    if (qwertyLayout === 'mirp') {
      const targetBaseMidi = noteItem.midi - mirpTranspose;
      const match = MIRP_KEYBOARD_MAPPING.find(m => m.midi === targetBaseMidi);
      if (match) {
        displayedLabel = match.label;
      }
    } else {
      const targetBaseMidi = noteItem.midi - (qwertyCurrentOctaveShift * 12);
      const match = QWERTY_MINI_KEYBOARD_MAPPING.find(m => m.midiBase === targetBaseMidi);
      if (match) {
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
