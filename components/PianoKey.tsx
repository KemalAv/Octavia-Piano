

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
  rightHandColor,
  leftHandColor,
  showQwertyShortcut,
  qwertyKey,
}) => {
  const isWhiteKey = keyDef.type === 'white';
  let dynamicStyle: React.CSSProperties = {};
  let keyClass = '';

  // Base styles: Removed heavy borders for a cleaner look
  // z-0 for white, z-10 for black
  const baseWhiteStyle = 'border-l border-b border-r border-slate-300 rounded-b-md absolute top-0 transition-all duration-50 ease-out no-select cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.3)] z-0';
  const baseBlackStyle = 'bg-slate-900 border-l border-b border-r border-black rounded-b-md absolute top-0 z-10 transition-all duration-50 ease-out no-select cursor-pointer shadow-[0_4px_8px_rgba(0,0,0,0.6)]';
  
  // Inactive states
  const inactiveWhiteStyle = 'bg-slate-100 hover:bg-white active:scale-y-95 origin-top';
  const inactiveBlackStyle = 'bg-black hover:bg-slate-900 active:scale-y-95 origin-top';

  if (isUserPlaying) { 
    // User Press: Gold/Yellow Blast
    const baseUserPlayColor = USER_PLAY_COLOR;
    dynamicStyle = {
      backgroundColor: baseUserPlayColor,
      boxShadow: `0 0 20px ${baseUserPlayColor}, 0 0 40px ${baseUserPlayColor}`, // Intense glow
      transform: 'scaleY(0.96)',
      transformOrigin: 'top',
      // Determine Z-Index: 
      // Active White = 5 (Above normal white, below normal black)
      // Active Black = 20 (Above everything)
      zIndex: isWhiteKey ? 5 : 20, 
      borderColor: '#fff',
    };
  } else if (activeSystemNoteInfo) {
    const { status, hand } = activeSystemNoteInfo;
    const baseColor = hand === 'left' ? leftHandColor : rightHandColor; // Base color for hand

    if (status === 'waiting') {
        // Waiting: Pulsing hand color
        const waitingGlow = `0 0 15px ${hexToRgba(baseColor, 0.8)}`;
        dynamicStyle = {
            backgroundColor: isWhiteKey ? lightenHex(baseColor, 60) : baseColor, 
            boxShadow: waitingGlow,
            borderColor: baseColor,
            zIndex: isWhiteKey ? 5 : 20,
        };
    } else if (status === 'playing' || status === 'user_played') {
        // System Hit: Flash hand color
        const bgColor = isWhiteKey ? lightenHex(baseColor, 40) : baseColor;
        const glow = `0 0 20px ${hexToRgba(baseColor, 0.9)}`;
        dynamicStyle = { 
            backgroundColor: bgColor, 
            boxShadow: glow,
            transform: 'scaleY(0.98)',
            transformOrigin: 'top',
            zIndex: isWhiteKey ? 5 : 20,
            borderColor: '#fff'
        };
    } else {
        keyClass = isWhiteKey ? inactiveWhiteStyle : inactiveBlackStyle;
    }
  } else { 
    keyClass = isWhiteKey ? inactiveWhiteStyle : inactiveBlackStyle;
  }
  
  const keyStyle: React.CSSProperties = {
    left: `${xPosition}px`,
    width: `${width}px`,
    height: `${height}px`, // Use passed height prop
    ...dynamicStyle,
  };
  
  const baseKeyClasses = isWhiteKey ? baseWhiteStyle : baseBlackStyle;

  return (
    <div
      data-key-name={keyDef.name}
      className={`${baseKeyClasses} ${keyClass}`}
      style={keyStyle}
      aria-label={`Piano key ${keyDef.name} (${keyDef.displayName})${qwertyKey ? ` QWERTY shortcut: ${qwertyKey}` : ''}`}
      role="button"
      tabIndex={-1} 
    >
      {showQwertyShortcut && qwertyKey && (
        <span 
          className={`absolute text-[10px] font-bold select-none pointer-events-none w-full text-center
                      ${isWhiteKey ? 'bottom-2 text-slate-500' : 'bottom-2 text-slate-400'}`}
          style={{ 
              textShadow: isWhiteKey ? 'none' : '0 1px 2px rgba(0,0,0,0.8)',
              color: isUserPlaying || activeSystemNoteInfo ? 'white' : undefined 
          }}
        >
          {qwertyKey}
        </span>
      )}
    </div>
  );
};

export default React.memo(PianoKey);