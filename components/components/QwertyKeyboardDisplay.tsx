

import React from 'react';
import { KEY_CODES_TO_DISPLAY } from '../constants';

interface QwertyKeyboardDisplayProps {
  activeKeys: Set<string>;
  octaveShift: number;
}

// Based on "MAPPING 2" from user request
const MAPPING_2_LAYOUT = {
  row1: ['tab', 'digit1', 'keyq', 'digit2', 'keyw', 'keye', 'digit4', 'keyr', 'digit5', 'keyt', 'digit6', 'keyy'],
  row2: ['keyu', 'digit8', 'keyi', 'digit9', 'keyo', 'keyp', 'minus', 'bracketleft', 'equal', 'bracketright', 'backspace', 'backslash', 'enter'],
};

const MAPPING_1_LAYOUT = {
  row1: ['shiftleft', 'keya', 'keyz', 'keys', 'keyx', 'keyc', 'keyf', 'keyv', 'keyg', 'keyb', 'keyh', 'keyn'],
  row2: ['keym', 'keyk', 'comma', 'keyl', 'period', 'slash', 'quote', 'shiftright'],
};



const QwertyKey: React.FC<{
  qwertyKey: string;
  isActive: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ qwertyKey, isActive, className = '', children }) => (
  <div 
    className={`qwerty-key ${isActive ? 'active' : ''} ${className}`}
    style={{ flexGrow: 1, minWidth: '28px', padding: '0 4px' }}
  >
    {children || (KEY_CODES_TO_DISPLAY[qwertyKey] || qwertyKey).toUpperCase()}
  </div>
);

const QwertyKeyboardDisplay: React.FC<QwertyKeyboardDisplayProps> = ({ activeKeys, octaveShift }) => {
  return (
    <div className="qwerty-keyboard-display space-y-2">
      {/* Mapping 2 */}
      <div className="qwerty-row">
        {MAPPING_2_LAYOUT.row1.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
      </div>
      <div className="qwerty-row">
        {MAPPING_2_LAYOUT.row2.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
      </div>
       {/* Mapping 1 */}
      <div className="qwerty-row">
        {MAPPING_1_LAYOUT.row1.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
      </div>
      <div className="qwerty-row">
        {MAPPING_1_LAYOUT.row2.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
      </div>
      {/* Octave Controls */}
      <div className="qwerty-row pt-1 border-t border-slate-700">
         <QwertyKey qwertyKey="arrowdown" isActive={activeKeys.has('arrowdown')} className="octave-key">↓ Down</QwertyKey>
         <QwertyKey qwertyKey="arrowup" isActive={activeKeys.has('arrowup')} className="octave-key">↑ Up</QwertyKey>
      </div>
      <div className="qwerty-octave-display">
        Octave Shift: {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
      </div>
    </div>
  );
};

export default React.memo(QwertyKeyboardDisplay);