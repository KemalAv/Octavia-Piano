import React, { useState, useEffect } from 'react';
import { ExtendedResult } from '../types';

interface DifficultyAnalysisProps {
  analysisResult: ExtendedResult;
}

const DifficultyAnalysis: React.FC<DifficultyAnalysisProps> = ({ analysisResult }) => {
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

  const StatItem = ({ label, value, unit = '' }: { label: string; value: string | number | undefined; unit?: string }) => (
    <div className="flex justify-between text-xs py-1 border-b border-slate-700/50">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">
        {value !== undefined ? value : 'N/A'}
        {value !== undefined && unit ? <span className="text-slate-500 ml-1">{unit}</span> : ''}
      </span>
    </div>
  );

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)} 
        className="group relative flex items-center gap-2 cursor-pointer" 
        title="Click for Detailed Analysis"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
      >
        <div className={`px-2 py-0.5 rounded-md text-xs font-bold ${difficultyColorClass}`}>
          {difficultyLabel} {difficultyLevel.toFixed(1)}
        </div>
        <div className="text-sm font-semibold text-sky-300 tabular-nums">
          PS: {performanceScore.toLocaleString()}
        </div>
      </div>

      {isModalOpen && (
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
              {/* Full width row for meta stats */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-2 mt-4">Meta Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1">
                    <StatItem label="Total Notes" value={meta.totalNotes} />
                    <StatItem label="Duration" value={meta.durationSec.toFixed(1)} unit="s" />
                    <StatItem label="Total NPS" value={parameters.totalNps.toFixed(2)} unit="n/s" />
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500 mt-8 text-center">
              The scoring system isn’t perfectly accurate. It’s just for fun, so please don’t rely on it.
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