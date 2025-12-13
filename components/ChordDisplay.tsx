import React from 'react';

interface ChordDisplayProps {
  chord: string | null;
}

const ChordDisplay: React.FC<ChordDisplayProps> = ({ chord }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent p-8">
      <div className="text-center">
        {chord ? (
          <h1 className="text-8xl font-bold text-cyan-300 transition-opacity duration-200 ease-in-out">
            {chord}
          </h1>
        ) : (
          <p className="text-3xl text-slate-500">
            Play three or more notes to detect a chord.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChordDisplay;
