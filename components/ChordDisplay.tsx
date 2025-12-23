
import React from 'react';

interface ChordDisplayProps {
  chord: string | null;
}

const ChordDisplay: React.FC<ChordDisplayProps> = ({ chord }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent p-8 pointer-events-none">
      <div className="text-center">
        {chord ? (
          <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 opacity-60">Detected Chord</span>
              <h1 className="text-9xl font-black text-cyan-300 transition-all duration-200 ease-in-out drop-shadow-[0_0_25px_rgba(103,232,249,0.5)]">
                {chord}
              </h1>
          </div>
        ) : (
          <p className="text-2xl text-slate-600 font-medium italic opacity-40">
            Play notes to detect harmony.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChordDisplay;