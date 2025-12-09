import React, { useState, useEffect } from 'react';
import { PerformanceSummary } from '../types';

interface PerformanceSummaryProps {
  isVisible: boolean;
  summary: PerformanceSummary | null;
  onClose: () => void;
}

const PerformanceSummaryModal: React.FC<PerformanceSummaryProps> = ({ isVisible, summary, onClose }) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isVisible]);

  if (!isVisible || !summary) {
    return null;
  }

  const getRankColorClass = (rank: string) => {
    switch (rank) {
      case 'S': return 'text-purple-400';
      case 'A': return 'text-lime-400';
      case 'B': return 'text-cyan-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };
  
  const StatRow: React.FC<{label: string; value: string | number; valueColor: string;}> = ({label, value, valueColor}) => (
      <div className="flex justify-between items-baseline">
        <span className="text-slate-300">{label}:</span>
        <span className={`font-bold text-xl ${valueColor}`}>{value}</span>
      </div>
  );

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="performance-summary-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl text-center max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        <h2 id="performance-summary-title" className="text-4xl sm:text-5xl font-extrabold text-cyan-400 mb-6 tracking-tight">
          Performance Summary
        </h2>

        <div className="space-y-6 mb-8 text-lg text-slate-200 font-semibold tabular-nums">
          <div className="bg-slate-900/50 p-4 rounded-lg space-y-3 ring-1 ring-slate-700">
             <StatRow label="Notes Hit" value={`${summary.hitCount} / ${summary.totalNoteCount}`} valueColor="text-lime-400" />
             <StatRow label="Errors" value={summary.errorCount} valueColor="text-red-400" />
             <StatRow label="Accuracy" value={`${summary.accuracy}%`} valueColor="text-cyan-300" />
             <StatRow label="Speed Efficiency" value={`${summary.speed}%`} valueColor="text-yellow-300" />
             <StatRow label="Tempo" value={`${Math.round(summary.playbackTempoMultiplier * 100)}%`} valueColor="text-purple-300" />
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg space-y-4 ring-1 ring-slate-700">
              <div className="flex justify-between items-baseline">
                <span className="text-white text-lg">Final Score:</span>
                <span className="text-cyan-400 font-bold text-3xl">{summary.finalScore}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-white text-xl">Rank:</span>
                <span className={`font-extrabold text-5xl ${getRankColorClass(summary.rank)}`}>{summary.rank}</span>
              </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 shadow-lg"
          aria-label="Close performance summary"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PerformanceSummaryModal;