
import React, { useCallback, useRef } from 'react';
import { PianoKeyDefinition, KeyPosition, ActiveMidiNoteInfo, LayoutDimensions, QwertyLayout } from '../types';
import { PIANO_KEYS_CONFIG, QWERTY_MINI_KEYBOARD_MAPPING, MIRP_KEYBOARD_MAPPING, KEY_CODES_TO_DISPLAY } from '../constants';
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
  qwertyLayout?: QwertyLayout; // NEW: Optional prop for layout type
  mirpTranspose?: number; // NEW: Optional prop for MIRP transpose
  // FIX: Add isInteractive prop to fix TypeScript error and disable UI interaction
  isInteractive?: boolean;
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
  qwertyCurrentOctaveShift,
  width,
  layoutConfig,
  qwertyLayout = 'default',
  mirpTranspose = 0,
  // FIX: Destructure isInteractive prop with a default value
  isInteractive = true,
}) => {
  const keyDefMap = React.useMemo(() => {
    const map = new Map<string, PianoKeyDefinition>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.name, key));
    return map;
  }, []);

  const activeTouches = useRef<Map<number, string>>(new Map()); // <touch identifier, keyName>
  
  // NEW: Mouse handling refs
  const isMouseDownRef = useRef(false);
  const activeMouseKeyRef = useRef<string | null>(null);

  const getKeyFromClientCoords = useCallback((clientX: number, clientY: number): PianoKeyDefinition | null => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element) return null;
    const keyName = element.getAttribute('data-key-name');
    if (keyName) {
      return keyDefMap.get(keyName) || null;
    }
    // Check parent if the click was on a label inside the key
    if (element.parentElement) {
        const parentKeyName = element.parentElement.getAttribute('data-key-name');
        if(parentKeyName) {
            return keyDefMap.get(parentKeyName) || null;
        }
    }
    return null;
  }, [keyDefMap]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Fix: Explicitly type 'touch' as 'Touch'
    for (const touch of Array.from(e.changedTouches) as Touch[]) { 
      const keyDef = getKeyFromClientCoords(touch.clientX, touch.clientY);
      if (keyDef && !activeTouches.current.has(touch.identifier)) {
        onUiKeyPress(keyDef.name, keyDef.midiNote);
        activeTouches.current.set(touch.identifier, keyDef.name);
      }
    }
  }, [getKeyFromClientCoords, onUiKeyPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Fix: Explicitly type 'touch' as 'Touch'
    for (const touch of Array.from(e.changedTouches) as Touch[]) { 
        const newKeyDef = getKeyFromClientCoords(touch.clientX, touch.clientY);
        const oldKeyName = activeTouches.current.get(touch.identifier);
        const newKeyName = newKeyDef ? newKeyDef.name : null;

        if (oldKeyName !== newKeyName) {
            if (oldKeyName) {
                const oldKeyDef = keyDefMap.get(oldKeyName);
                if (oldKeyDef) {
                    onUiKeyRelease(oldKeyDef.name, oldKeyDef.midiNote);
                }
            }
            if (newKeyDef) {
                onUiKeyPress(newKeyDef.name, newKeyDef.midiNote);
                activeTouches.current.set(touch.identifier, newKeyDef.name);
            } else {
                activeTouches.current.delete(touch.identifier);
            }
        }
    }
  }, [getKeyFromClientCoords, onUiKeyPress, onUiKeyRelease, keyDefMap]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Fix: Explicitly type 'touch' as 'Touch'
    for (const touch of Array.from(e.changedTouches) as Touch[]) { 
      const keyName = activeTouches.current.get(touch.identifier);
      if (keyName) {
        const keyDef = keyDefMap.get(keyName);
        if (keyDef) {
          onUiKeyRelease(keyDef.name, keyDef.midiNote);
        }
        activeTouches.current.delete(touch.identifier);
      }
    }
  }, [onUiKeyRelease, keyDefMap]);
  
  // NEW: Mouse handlers for glissando
  const handleMouseUpGlobal = useCallback(() => {
    isMouseDownRef.current = false;
    const keyName = activeMouseKeyRef.current;
    if (keyName) {
      const keyDef = keyDefMap.get(keyName);
      if (keyDef) {
        onUiKeyRelease(keyDef.name, keyDef.midiNote);
      }
      activeMouseKeyRef.current = null;
    }
    window.removeEventListener('mouseup', handleMouseUpGlobal);
    window.removeEventListener('mousemove', handleMouseMoveGlobal);
  }, [onUiKeyRelease, keyDefMap]);

  const handleMouseMoveGlobal = useCallback((e: MouseEvent) => {
    if (!isMouseDownRef.current) return;
    
    e.preventDefault();
    const newKeyDef = getKeyFromClientCoords(e.clientX, e.clientY);
    const oldKeyName = activeMouseKeyRef.current;
    const newKeyName = newKeyDef ? newKeyDef.name : null;

    if (oldKeyName !== newKeyName) {
      if (oldKeyName) {
        const oldKeyDef = keyDefMap.get(oldKeyName);
        if (oldKeyDef) {
          onUiKeyRelease(oldKeyDef.name, oldKeyDef.midiNote);
        }
      }
      if (newKeyDef) {
        onUiKeyPress(newKeyDef.name, newKeyDef.midiNote);
        activeMouseKeyRef.current = newKeyDef.name;
      } else {
        activeMouseKeyRef.current = null;
      }
    }
  }, [getKeyFromClientCoords, onUiKeyPress, onUiKeyRelease, keyDefMap]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isMouseDownRef.current = true;
    const keyDef = getKeyFromClientCoords(e.clientX, e.clientY);
    if (keyDef) {
      onUiKeyPress(keyDef.name, keyDef.midiNote);
      activeMouseKeyRef.current = keyDef.name;
    }
    window.addEventListener('mouseup', handleMouseUpGlobal);
    window.addEventListener('mousemove', handleMouseMoveGlobal);
  }, [getKeyFromClientCoords, onUiKeyPress, handleMouseUpGlobal, handleMouseMoveGlobal]);


  const pianoDisplayWidth = width;
  const totalHeight = layoutConfig.whiteKeyHeight + layoutConfig.keyLabelHeight;

  // Memoize white and black key positions
  const whiteKeysPos = React.useMemo(() => keyPositions.filter(kp => kp.type === 'white'), [keyPositions]);
  const blackKeysPos = React.useMemo(() => keyPositions.filter(kp => kp.type === 'black'), [keyPositions]);

  if (keyPositions.length === 0 || pianoDisplayWidth === 0) {
    return null; 
  }

  const renderPianoKey = (keyPos: KeyPosition) => {
    const keyDef = keyDefMap.get(keyPos.name);
    if (!keyDef) return null;
    const activeSystemNoteInfo = activeMidiNotesInfo.get(keyDef.name) || null;
    const isUserPlaying = userSustainedKeys.has(keyDef.name) || userActiveKeys.has(keyDef.name);
    
    let qwertyKeyForDisplay = '';

    if (showQwertyShortcuts) {
        if (qwertyLayout === 'mirp') {
            // MIRP Layout Logic
            const targetBaseMidi = keyDef.midiNote - mirpTranspose;
            // Find the key mapping that produces this note
            const matchingEntries = MIRP_KEYBOARD_MAPPING.filter(m => m.midi === targetBaseMidi);
            if (matchingEntries.length > 0) {
                // Use the label from the mapping (e.g., '1' or '!')
                qwertyKeyForDisplay = matchingEntries[0].label;
            }
        } else {
            // Default Layout Logic
            const matchingMappings = QWERTY_MINI_KEYBOARD_MAPPING.filter(m => {
              const mappedMidi = m.midiBase + (qwertyCurrentOctaveShift * 12);
              return mappedMidi === keyDef.midiNote;
            });

            if (matchingMappings.length > 0) {
                qwertyKeyForDisplay = matchingMappings.map(m => KEY_CODES_TO_DISPLAY[m.qwertyKey] || m.qwertyKey.replace('key', '').toUpperCase()).join(' | ');
            }
        }
    }

    return (
      <PianoKey
        key={keyDef.name}
        keyDef={keyDef}
        activeSystemNoteInfo={activeSystemNoteInfo}
        isUserPlaying={isUserPlaying}
        xPosition={keyPos.x}
        width={keyPos.width}
        height={keyDef.type === 'white' ? layoutConfig.whiteKeyHeight : layoutConfig.blackKeyHeight}
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
      // FIX: Conditionally apply event handlers based on isInteractive prop
      onTouchStart={isInteractive ? handleTouchStart : undefined}
      onTouchMove={isInteractive ? handleTouchMove : undefined}
      onTouchEnd={isInteractive ? handleTouchEnd : undefined}
      onTouchCancel={isInteractive ? handleTouchEnd : undefined}
      onMouseDown={isInteractive ? handleMouseDown : undefined}
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
