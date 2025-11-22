
import React from 'react';
import { PianoKeyDefinition, KeyPosition, ActiveMidiNoteInfo, QwertyKeyMapEntry } from '../types';
import { PIANO_KEYS_CONFIG, WHITE_KEY_HEIGHT_PX, KEY_LABEL_AREA_HEIGHT_PX, QWERTY_MINI_KEYBOARD_MAPPING } from '../constants';
import PianoKey from './PianoKey';

interface PianoKeyboardProps {
  keyPositions: KeyPosition[];
  userSustainedKeys: Set<string>; // Keys actively held by UI
  userActiveKeys: Set<string>; // Keys with timed highlight (e.g., MIDI)
  activeMidiNotesInfo: Map<string, ActiveMidiNoteInfo>;
  onUiKeyPress: (keyName: string, midiNote: number) => void;
  onUiKeyRelease: (keyName: string, midiNote: number) => void;
  rightHandColor: string;
  leftHandColor: string;
  showQwertyShortcuts: boolean;
  qwertyCurrentOctaveShift: number; // NEW: Added octave shift prop
  width: number; // NEW: Accept width as a prop
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ 
  keyPositions, 
  userSustainedKeys,
  userActiveKeys, 
  activeMidiNotesInfo, 
  onUiKeyPress,
  onUiKeyRelease,
  rightHandColor,
  leftHandColor,
  showQwertyShortcuts,
  qwertyCurrentOctaveShift, // NEW: Destructure octave shift prop
  width, // NEW: Destructure width prop
}) => {
  const keyDefMap = React.useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  // NEW: Create an inverse map from midiBase to qwertyKey for efficient lookup
  const midiBaseToQwertyKeyMap = React.useMemo(() => {
    const map = new Map<number, string>();
    QWERTY_MINI_KEYBOARD_MAPPING.forEach(entry => {
        map.set(entry.midiBase, entry.qwertyKey);
    });
    return map;
  }, []);

  const whiteKeysPos = keyPositions.filter(kp => kp.type === 'white');
  const blackKeysPos = keyPositions.filter(kp => kp.type === 'black');
  
  // Use the width prop directly, keyPositions.x/width already reflect scaling
  const pianoDisplayWidth = width;
  const totalHeight = WHITE_KEY_HEIGHT_PX + KEY_LABEL_AREA_HEIGHT_PX;

  if (keyPositions.length === 0 || pianoDisplayWidth === 0) {
    return null; 
  }

  const renderPianoKey = (keyPos: KeyPosition) => {
    const keyDef = keyDefMap.get(keyPos.name);
    if (!keyDef) return null;
    const activeSystemNoteInfo = activeMidiNotesInfo.get(keyDef.name) || null;
    const isUserPlaying = userSustainedKeys.has(keyDef.name) || userActiveKeys.has(keyDef.name);
    
    // NEW: Determine QWERTY key for display based on original midiBase (after applying octave shift)
    // Calculate what MIDI note on the *base* QWERTY map would produce this physical key's MIDI note
    // with the current octave shift.
    const baseMidiNoteForQwertyLookup = keyDef.midiNote - (qwertyCurrentOctaveShift * 12);
    const qwertyKeyForDisplay = midiBaseToQwertyKeyMap.get(baseMidiNoteForQwertyLookup);

    return (
      <PianoKey
        key={keyPos.name}
        keyDef={keyDef}
        activeSystemNoteInfo={activeSystemNoteInfo}
        isUserPlaying={isUserPlaying}
        xPosition={keyPos.x}
        width={keyPos.width} 
        onPress={() => onUiKeyPress(keyDef.name, keyDef.midiNote)}
        onRelease={() => onUiKeyRelease(keyDef.name, keyDef.midiNote)}
        rightHandColor={rightHandColor}
        leftHandColor={leftHandColor}
        showQwertyShortcut={showQwertyShortcuts}
        qwertyKey={qwertyKeyForDisplay} // Pass the dynamically determined QWERTY key
      />
    );
  };


  return (
    <div 
      className="relative bg-slate-800 shadow-lg no-select" 
      style={{ 
        width: `${pianoDisplayWidth}px`, 
        height: `${totalHeight}px`,
        // Centering and offset are now handled by the parent div in App.tsx
      }}
      role="application"
      aria-label="Interactive Piano Keyboard"
    >
      <div className="relative" style={{ width: `${pianoDisplayWidth}px`, height: `${WHITE_KEY_HEIGHT_PX}px`}}>
        {whiteKeysPos.map(renderPianoKey)}
        {blackKeysPos.map(renderPianoKey)}
      </div>

      <div 
        className="absolute bottom-0 left-0 w-full bg-gray-100 border-t border-gray-300"
        style={{ height: `${KEY_LABEL_AREA_HEIGHT_PX}px` }}
      >
        {whiteKeysPos.map((keyPos) => {
          const keyDef = keyDefMap.get(keyPos.name);
          if (!keyDef) return null;
          return (
            <div
              key={`label-${keyPos.name}`}
              className="absolute text-black text-xs font-medium flex items-center justify-center select-none overflow-hidden"
              style={{
                left: `${keyPos.x}px`,
                width: `${keyPos.width}px`, 
                height: `${KEY_LABEL_AREA_HEIGHT_PX}px`,
                bottom: `0px`, 
              }}
            >
              {keyDef.name === 'C4' ? keyDef.name : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PianoKeyboard;