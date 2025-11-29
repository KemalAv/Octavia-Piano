

import React from 'react';
import { PianoKeyDefinition, ActiveMidiNoteInfo } from '../types';
import { 
  USER_GLOW_SHADOW,
  USER_PLAY_COLOR // Import new constant
} from '../constants';

// --- Color Utility Functions ---
const hexToRgba = (hex: string, alpha: number): string => {
    let r = 0, g = 0, b = 0;
    if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const lightenHex = (hex: string, percent: number): string => {
    if (!hex || typeof hex !== 'string') return '#FFFFFF';
    const f=parseInt(hex.slice(1),16),t=255,p=percent/100,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
};
// --- End Color Utility Functions ---


interface PianoKeyProps {
  keyDef: PianoKeyDefinition;
  activeSystemNoteInfo: ActiveMidiNoteInfo | null;
  isUserPlaying: boolean; 
  xPosition: number;
  width: number;
  height: number; // New prop for dynamic height
  onPress: () => void; 
  onRelease: () => void;
  rightHandColor: string;
  leftHandColor: string;
  showQwertyShortcut: boolean;
  qwertyKey: string | undefined;
}

const PianoKey: React.FC<PianoKeyProps> = ({ 
  keyDef, 
  activeSystemNoteInfo, 
  isUserPlaying, 
  xPosition, 
  width,
  height,
  onPress,
  onRelease,
  rightHandColor,
  leftHandColor,
  showQwertyShortcut,
  qwertyKey,
}) => {
  const [isPressedByThisInteraction, setIsPressedByThisInteraction] = React.useState(false);
  
  const isWhiteKey = keyDef.type === 'white';
  let dynamicStyle: React.CSSProperties = {};
  let keyClass = '';

  const baseWhiteStyle = 'border-gray-500 border absolute top-0 transition-all duration-75 ease-out no-select cursor-pointer';
  const baseBlackStyle = 'border-black border absolute top-0 z-10 transition-all duration-75 ease-out no-select cursor-pointer';
  
  // Inactive styles remain Tailwind classes
  const inactiveWhiteStyle = 'bg-white hover:bg-gray-100';
  const inactiveBlackStyle = 'bg-black hover:bg-gray-800';

  if (isUserPlaying) { 
    // New: User pressed keys are golden yellow
    const baseUserPlayColor = USER_PLAY_COLOR;
    dynamicStyle = {
      backgroundColor: isWhiteKey ? lightenHex(baseUserPlayColor, 30) : baseUserPlayColor,
      boxShadow: USER_GLOW_SHADOW,
    };
  } else if (activeSystemNoteInfo) {
    const { status, hand } = activeSystemNoteInfo;
    const baseColor = hand === 'left' ? leftHandColor : rightHandColor; // Base color for hand

    if (status === 'waiting') {
        // New: Waiting notes match hand color
        const waitingGlow = `0 0 16px 4px ${hexToRgba(baseColor, 0.6)}`;
        dynamicStyle = {
            backgroundColor: isWhiteKey ? lightenHex(baseColor, 40) : baseColor, // Lighter for white, base for black
            boxShadow: waitingGlow,
        };
    } else if (status === 'playing' || status === 'user_played') {
        const bgColor = isWhiteKey ? lightenHex(baseColor, 40) : baseColor;
        const glow = `0 0 16px 5px ${hexToRgba(baseColor, 0.7)}`;
        dynamicStyle = { backgroundColor: bgColor, boxShadow: glow };
    } else {
        keyClass = isWhiteKey ? inactiveWhiteStyle : inactiveBlackStyle;
    }
  } else { 
    keyClass = isWhiteKey ? inactiveWhiteStyle : inactiveBlackStyle;
  }

  const handleInteractionPress = () => {
    if (!isPressedByThisInteraction) {
      setIsPressedByThisInteraction(true);
      onPress();
    }
  };

  const handleInteractionRelease = () => {
    if (isPressedByThisInteraction) {
      setIsPressedByThisInteraction(false);
      onRelease();
    }
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    event.preventDefault();
    handleInteractionPress();
  };
  
  const keyStyle: React.CSSProperties = {
    left: `${xPosition}px`,
    width: `${width}px`,
    height: `${height}px`, // Use passed height prop
    ...dynamicStyle,
  };
  
  const baseKeyClasses = isWhiteKey ? baseWhiteStyle : baseBlackStyle;

  return (
    <div
      className={`${baseKeyClasses} ${keyClass}`}
      style={keyStyle}
      aria-label={`Piano key ${keyDef.name} (${keyDef.displayName})${qwertyKey ? ` QWERTY shortcut: ${qwertyKey}` : ''}`}
      onMouseDown={handleInteractionPress}
      onTouchStart={handleTouchStart}
      onMouseUp={handleInteractionRelease}
      onTouchEnd={handleInteractionRelease}
      onMouseLeave={handleInteractionRelease}
      onTouchCancel={handleInteractionRelease}
      role="button"
      tabIndex={-1} // Remove from tab order to avoid focus conflicts
    >
      {showQwertyShortcut && qwertyKey && (
        <span 
          className={`absolute text-xs font-semibold select-none z-20 pointer-events-none 
                      ${isWhiteKey ? 'bottom-1 text-gray-800' : 'bottom-1 left-1/2 -translate-x-1/2 text-gray-200'}`}
          style={{ textShadow: isWhiteKey ? '0 0 2px rgba(255,255,255,0.8)' : '0 0 2px rgba(0,0,0,0.8)'}}
        >
          {qwertyKey}
        </span>
      )}
    </div>
  );
};

export default React.memo(PianoKey);