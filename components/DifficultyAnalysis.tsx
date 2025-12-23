import React, { useState, useEffect } from 'react';
import { ExtendedResult } from '../types';

interface DifficultyAnalysisProps {
  analysisResult: ExtendedResult;
  isInteractive?: boolean;
}

// Utility to convert MIDI number to note name
const midiToNoteName = (midi: number): string | undefined => {
  if (midi <= 0) return undefined;
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
};


const DifficultyAnalysis: React.FC<DifficultyAnalysisProps> = ({ analysisResult, isInteractive = true }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const { difficultyLevel, performanceScore, parameters, meta } = analysisResult;

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isModalOpen]);

  const getDifficultyColor = (level: number) => {
    if (level < 3) return 'bg-blue-400 text-blue-900'; // Novice
    if (level < 4) return 'bg-green-400 text-green-900'; // Beginner
    if (level < 6) return 'bg-yellow-400 text-yellow-900'; // Intermediate
    if (level < 8) return 'bg-red-500 text-red-100'; // Advanced
    if (level < 10) return 'bg-purple-600 text-purple-100'; // Virtuoso
    return 'bg-fuchsia-900 text-fuchsia-100'; // Legendary
  };

  const getDifficultyLabel = (level: number) => {
    if (level < 3) return 'Novice';
    if (level < 4) return 'Beginner';
    if (level < 6) return 'Intermediate';
    if (level < 8) return 'Advanced';
    if (level < 10) return 'Virtuoso';
    return 'Legendary';
  };

  const difficultyColorClass = getDifficultyColor(difficultyLevel);
  const difficultyLabel = getDifficultyLabel(difficultyLevel);

  const StatItem = ({ label, value, unit = '' }: { label: string; value: string | number | undefined; unit?: string }) => {
    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
      return null;
    }
  
    return (
      <div className="flex justify-between text-xs py-1 border-b border-slate-700/50">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-200">
          {value}
          {unit ? <span className="text-slate-500 ml-1">{unit}</span> : ''}
        </span>
      </div>
    );
  };

  const handleInteraction = () => {
    if (isInteractive) {
      setIsModalOpen(true);
    }
  };
  
  const lowNoteName = midiToNoteName(meta.lowestNote);
  const highNoteName = midiToNoteName(meta.highestNote);
  const noteRangeDisplay = lowNoteName && highNoteName ? `${lowNoteName} - ${highNoteName}` : undefined;

  return (
    <>
      <div 
        className="group relative flex items-center gap-2"
      >
        <div 
            onClick={handleInteraction} 
            className={`flex items-center gap-2 ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
            title={isInteractive ? "Click for Detailed Analysis" : undefined}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : -1}
            onKeyDown={(e) => { if (isInteractive && (e.key === 'Enter' || e.key === ' ')) handleInteraction(); }}
        >
            <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${difficultyColorClass}`}>
            {difficultyLabel} {difficultyLevel.toFixed(1)}
            </div>
            <div className="text-sm font-semibold text-sky-300 tabular-nums">
            PS: {performanceScore.toLocaleString()}
            </div>
        </div>
        {isInteractive && (
          <button 
              onClick={handleInteraction} 
              className="ml-1 text-slate-400 hover:text-white transition-colors"
              aria-label="See a full difficulty & PS breakdown"
              title="See a full difficulty & PS breakdown"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
          </button>
        )}
      </div>

      {isInteractive && isModalOpen && (
        <div 
          className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-75' : 'bg-opacity-0'}`}
          onClick={() => setIsModalOpen(false)} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="analysis-title"
        >
          <div 
            className={`bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-3">
              <h2 id="analysis-title" className="text-2xl font-bold text-sky-300">Detailed Performance Analysis</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-3xl font-light text-slate-400 hover:text-white leading-none"
                aria-label="Close analysis modal"
              >&times;</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-2">Core Components</h3>
                    <StatItem label="Density / Speed" value={parameters.density?.toFixed(2)} />
                    <StatItem label="Pattern Complexity" value={parameters.patternComplexity?.toFixed(2)} />
                    <StatItem label="Interval Complexity" value={parameters.intervalComplexity?.toFixed(2)} />
                    <StatItem label="Physical Effort" value={parameters.physicalEffort?.toFixed(2)} />
                    <StatItem label="Stamina Factor" value={parameters.staminaFactor?.toFixed(2)} />
                    <StatItem label="Range Intensity" value={parameters.rangeIntensity?.toFixed(2)} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-2">Technical Components</h3>
                    <StatItem label="Chord Power" value={parameters.chordPower?.toFixed(2)} />
                    <StatItem label="Chord Power Index" value={parameters.chordPowerIndex?.toFixed(2)} />
                    <StatItem label="Chord Mobility" value={parameters.chordMobility?.toFixed(2)} />
                    <StatItem label="Chord Movement Rate" value={parameters.chordMovementRate?.toFixed(2)} />
                    <StatItem label="Arpeggio Virtuosity" value={parameters.arpeggioVirtuosity?.toFixed(2)} />
                    <StatItem label="Trill / Tremolo Ratio" value={parameters.trillRatio?.toFixed(2)} />
                    <StatItem label="Repetition Penalty" value={parameters.patternRepPenalty?.toFixed(2)} />
                </div>
                {/* Full width row for meta stats */}
                <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-2 mt-4">Meta Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
                    <StatItem label="Total Notes" value={meta.totalNotes} />
                    <StatItem label="Duration" value={meta.durationSec?.toFixed(1)} unit="s" />
                    <StatItem label="Note Range" value={noteRangeDisplay} />
                    <StatItem label="Avg Notes/Sec" value={parameters.totalNps?.toFixed(2)} unit="n/s" />
                    <StatItem label="Peak Notes/Sec" value={meta.peakSpeedNps?.toFixed(2)} unit="n/s" />
                    <StatItem label="Avg Polyphony" value={parameters.polyphony?.toFixed(2)} />
                    <StatItem label="Chord NPS" value={parameters.chordNps?.toFixed(2)} />
                    <StatItem label="Avg. Note Gap" value={meta.avgGapMs?.toFixed(0)} unit="ms" />
                    <StatItem label="Rhythm Variance" value={meta.gapVariance?.toFixed(2)} />
                    <StatItem label="Rhythm Irregularity" value={meta.irregularityIndex?.toFixed(2)} />
                    <StatItem label="Burst Sections" value={meta.burstSections} />
                    <StatItem label="Arpeggio Rate" value={meta.arpeggioRate?.toFixed(2)} />
                </div>
                </div>
            </div>

            <p className="text-sm text-slate-500 mt-8 text-center">
              This scoring system is only a calculation based on MIDI data and is not accurate at all. It is made purely for fun and simplicity, so the results can be wrong and do not reflect any real or precise evaluation. Because of that, the score should not be relied on as a serious or correct measurement.
            </p>

            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DifficultyAnalysis;
