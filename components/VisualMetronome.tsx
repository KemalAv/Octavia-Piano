

import React, { useState, useEffect } from 'react';
import { MetronomeMode } from '../types'; // Import MetronomeMode

interface VisualMetronomeProps {
  beatState: 'strong' | 'weak' | null;
  metronomeMode: MetronomeMode; // New prop
}

const VisualMetronome: React.FC<VisualMetronomeProps> = ({ beatState, metronomeMode }) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (beatState) {
      setAnimationClass(beatState === 'strong' ? 'metronome-pulse-strong' : 'metronome-pulse-weak');
      const timer = setTimeout(() => setAnimationClass(''), 500); // Duration of animation
      return () => clearTimeout(timer);
    }
  }, [beatState]);

  const getModeDisplayName = (mode: MetronomeMode) => {
    switch (mode) {
      case 'off': return 'Off';
      case 'beat': return 'Beat'; // NEW: Display name for 'beat' mode
      case 'bar': return 'Bar';
      case 'drum': return 'Drum';
      default: return ''; // Should not happen with MetronomeMode type
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full bg-cyan-400 transition-all duration-150 ${animationClass}`}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-slate-200 hidden sm:inline">Metronome: {getModeDisplayName(metronomeMode)}</span>
    </div>
  );
};

export default VisualMetronome;