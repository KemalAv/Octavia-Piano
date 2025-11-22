
import React, { useState, useEffect } from 'react';

interface VisualMetronomeProps {
  beatState: 'strong' | 'weak' | null;
}

const VisualMetronome: React.FC<VisualMetronomeProps> = ({ beatState }) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (beatState) {
      setAnimationClass(beatState === 'strong' ? 'metronome-pulse-strong' : 'metronome-pulse-weak');
      const timer = setTimeout(() => setAnimationClass(''), 500); // Duration of animation
      return () => clearTimeout(timer);
    }
  }, [beatState]);

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`w-4 h-4 rounded-full bg-cyan-400 transition-all duration-150 ${animationClass}`}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-slate-200 hidden sm:inline">Metronome</span>
    </div>
  );
};

export default VisualMetronome;
