
import React, { useState, useEffect } from 'react';
import { PerformanceSummary } from '../types';
import { getRankColorClass } from '../utils';

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
  
  const formatDelayTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '0.000s';
    const seconds = (ms / 1000).toFixed(3);
    return `${seconds}s`;
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
      aria-labelledby="summary-modal-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl max-w-lg w-full ring-2 ring-violet-500/50 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        <div className="text-center mb-6">
          <h2 id="summary-modal-title" className="text-4xl font-bold text-cyan-400 mb-2">Performance Summary</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8">
            <div className="col-span-2 text-center mb-4">
                <span className="text-sm text-slate-400">Rank</span>
                <p className={`text-9xl font-black ${getRankColorClass(summary.rank)}`}>{summary.rank}</p>
            </div>
            <div className="col-span-2 mb-4 p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <StatRow 
                    label="Gameplay Style" 
                    value={summary.gameplayStyle || 'N/A'} 
                    valueColor="text-cyan-300" 
                />
            </div>
            
            {summary.isNonStop || summary.isAutoplay ? (
                <>
                    <StatRow label="Accuracy" value={`${summary.accuracy.toFixed(2)}%`} valueColor="text-cyan-300" />
                    <StatRow label="Perfect" value={summary.perfectCount} valueColor="text-yellow-400" />
                    <StatRow label="Great" value={summary.greatCount} valueColor="text-emerald-400" />
                    <StatRow label="Good" value={summary.goodCount} valueColor="text-blue-400" />
                    <StatRow label="Miss" value={summary.missCount} valueColor="text-rose-400" />
                    <StatRow label="Max Combo" value={summary.maxCombo || 0} valueColor="text-orange-400" />
                    <StatRow label="Tempo" value={`${Math.round(summary.playbackTempoMultiplier * 100)}%`} valueColor="text-slate-300" />
                    <StatRow label="Performance Score" value={Math.round(summary.finalScore).toLocaleString('en-US')} valueColor="text-white" />
                </>
            ) : (
                <>
                    <StatRow label="Performance Score" value={Math.round(summary.finalScore).toLocaleString('en-US')} valueColor="text-white" />
                    <StatRow label="Accuracy" value={`${summary.accuracy.toFixed(2)}%`} valueColor="text-cyan-300" />
                    <StatRow label="Max Combo" value={summary.maxCombo || 0} valueColor="text-orange-400" />
                    <StatRow label="Speed Efficiency" value={`${(summary.speed || 0).toFixed(2)}%`} valueColor="text-cyan-300" />
                    <StatRow label="Gameplay %" value={`${(summary.gameplayPercentage || 0).toFixed(2)}%`} valueColor="text-cyan-300" />
                    <StatRow label="Hits" value={summary.hitCount || 0} valueColor="text-yellow-400" />
                    <StatRow label="Error" value={summary.errorCount || 0} valueColor="text-rose-400" />
                    <StatRow label="Wait Time" value={formatDelayTime(summary.totalWaitTimeMs || 0)} valueColor="text-slate-300" />
                    <StatRow label="Tempo" value={`${Math.round(summary.playbackTempoMultiplier * 100)}%`} valueColor="text-slate-300" />
                </>
            )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition-all shadow-lg hover:shadow-cyan-500/30"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default PerformanceSummaryModal;
