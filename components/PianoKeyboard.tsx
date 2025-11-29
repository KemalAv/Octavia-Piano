import React from 'react';
import { PianoKeyDefinition, KeyPosition, ActiveMidiNoteInfo, LayoutDimensions } from '../types';
import { PIANO_KEYS_CONFIG, QWERTY_MINI_KEYBOARD_MAPPING } from '../constants';
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
  qwertyCurrentOctaveShift: number;
  width: number;
  layoutConfig: LayoutDimensions; // New Prop for dynamic sizing
}

const KEY_CODES_TO_DISPLAY: { [key: string]: string } = {
  'tab': '⇥', 'digit1': '1', 'keyq': 'Q', 'digit2': '2', 'keyw': 'W', 'keye': 'E', 'digit4': '4', 'keyr': 'R', 'digit5': '5', 'keyt': 'T', 'digit6': '6', 'keyy': 'Y',
  'keyu': 'U', 'digit8': '8', 'keyi': 'I', 'digit9': '9', 'keyo': 'O', 'keyp': 'P', 'minus': '-', 'bracketleft': '[', 'equal': '=', 'bracketright': ']', 'backspace': '⌫', 'backslash': '\\', 'enter': '⏎',
  'shiftleft': '⇧', 'keya': 'A', 'keyz': 'Z', 'keys': 'S', 'keyx': 'X', 'keyc': 'C', 'keyf': 'F', 'keyv': 'V', 'keyg': 'G', 'keyb': 'B', 'keyh': 'H', 'keyn': 'N',
  'keym': 'M', 'keyk': 'K', 'comma': ',', 'keyl': 'L', 'period': '.', 'slash': '/', 'quote': "'", 'shiftright': '⇧',
};

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
  qwertyCurrentOctaveShift,
  width,
  layoutConfig,
}) => {
  const keyDefMap = React.useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  const whiteKeysPos = keyPositions.filter(kp => kp.type === 'white');
  const blackKeysPos = keyPositions.filter(kp => kp.type === 'black');
  
  const pianoDisplayWidth = width;
  const totalHeight = layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight;

  if (keyPositions.length === 0 || pianoDisplayWidth === 0) {
    return null; 
  }

  const renderPianoKey = (keyPos: KeyPosition) => {
    const keyDef = keyDefMap.get(keyPos.name);
    if (!keyDef) return null;
    const activeSystemNoteInfo = activeMidiNotesInfo.get(keyDef.name) || null;
    const isUserPlaying = userSustainedKeys.has(keyDef.name) || userActiveKeys.has(keyDef.name);
    
    // Calculate what MIDI note on the *base* QWERTY map would produce this physical key's MIDI note
    const baseMidiNoteForQwertyLookup = keyDef.midiNote - (qwertyCurrentOctaveShift * 12);
    
    // Find all QWERTY keys that map to this base MIDI note
    const matchingEntries = QWERTY_MINI_KEYBOARD_MAPPING.filter(
      entry => entry.midiBase === baseMidiNoteForQwertyLookup
    );

    // Create a display string with all matching shortcuts
    const qwertyKeyForDisplay = matchingEntries
      .map(entry => KEY_CODES_TO_DISPLAY[entry.qwertyKey] || entry.qwertyKey)
      .join('');

    return (
      <PianoKey
        key={keyPos.name}
        keyDef={keyDef}
        activeSystemNoteInfo={activeSystemNoteInfo}
        isUserPlaying={isUserPlaying}
        xPosition={keyPos.x}
        width={keyPos.width} 
        height={keyDef.type === 'white' ? layoutConfig.whiteKeyHeight : layoutConfig.blackKeyHeight} // Pass dynamic height
        onPress={() => onUiKeyPress(keyDef.name, keyDef.midiNote)}
        onRelease={() => onUiKeyRelease(keyDef.name, keyDef.midiNote)}
        rightHandColor={rightHandColor}
        leftHandColor={leftHandColor}
        showQwertyShortcut={showQwertyShortcuts}
        qwertyKey={qwertyKeyForDisplay}
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
      <div className="relative" style={{ width: `${pianoDisplayWidth}px`, height: `${layoutConfig.whiteKeyHeight}px`}}>
        {whiteKeysPos.map(renderPianoKey)}
        {blackKeysPos.map(renderPianoKey)}
      </div>

      <div 
        className="absolute bottom-0 left-0 w-full bg-gray-100 border-t border-gray-300"
        style={{ height: `${layoutConfig.keyLabelHeight}px` }}
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
                height: `${layoutConfig.keyLabelHeight}px`,
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