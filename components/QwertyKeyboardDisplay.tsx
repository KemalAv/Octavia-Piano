
import React from 'react';

interface QwertyKeyboardDisplayProps {
  activeKeys: Set<string>;
  octaveShift: number;
}

const QWERTY_LAYOUT = {
  black: ['1', '2', '4', '5', '6', '8', '9', 'a', 's', 'd', 'g', 'h', 'k', 'l', ';'],
  white_top: ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '='],
  white_bottom: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  octave: ['f', 'j'],
};

const KEY_DISPLAY_NAMES: { [key: string]: string } = {
  'tab': 'TAB', ',': '<', '.': '>', '/': '?', ';': ':', '=': '+'
};

// FIX: Added 'children' to props to allow custom labels for keys.
const QwertyKey: React.FC<{
  qwertyKey: string;
  isActive: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ qwertyKey, isActive, className = '', children }) => (
  <div 
    className={`qwerty-key ${isActive ? 'active' : ''} ${className}`}
  >
    {children || (KEY_DISPLAY_NAMES[qwertyKey] || qwertyKey).toUpperCase()}
  </div>
);

const QwertyKeyboardDisplay: React.FC<QwertyKeyboardDisplayProps> = ({ activeKeys, octaveShift }) => {
  return (
    <div className="qwerty-keyboard-display">
      <div className="qwerty-row">
        {QWERTY_LAYOUT.black.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="black-map" />)}
      </div>
      <div className="qwerty-row">
        {QWERTY_LAYOUT.white_top.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
      </div>
      <div className="qwerty-row">
        <QwertyKey qwertyKey="f" isActive={activeKeys.has('f')} className="octave-key"> F (🔻) </QwertyKey>
        {QWERTY_LAYOUT.white_bottom.map(k => <QwertyKey key={k} qwertyKey={k} isActive={activeKeys.has(k)} className="white-map" />)}
        <QwertyKey qwertyKey="j" isActive={activeKeys.has('j')} className="octave-key"> J (🔺) </QwertyKey>
      </div>
      <div className="qwerty-octave-display">
        Octave Shift: {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
      </div>
    </div>
  );
};

export default React.memo(QwertyKeyboardDisplay);