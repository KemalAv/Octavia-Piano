import React, { useState, useEffect } from 'react';
import { ExtendedResult, WaitMode, GameSettings, PracticeHand } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';

interface ModeSelectionProps {
  onStartGame: (settings: GameSettings) => void;
  onBack: () => void;
  analysisResult: ExtendedResult | null;
  analysisResultForPreview: ExtendedResult | null;
  fileName: string | null;
  initialTempoBpm: number | null;
  initialPlaybackTempoMultiplier: number;
  onPlaybackTempoMultiplierChange: (multiplier: number) => void;
  currentHideBarNavigationButtons: boolean;
  onHideBarNavigationButtonsChange: (value: boolean) => void;
}

type Mode = 'practice' | 'autoplay' | 'retical';

const ModeSelection: React.FC<ModeSelectionProps> = ({
  onStartGame,
  onBack,
  analysisResult,
  analysisResultForPreview,
  fileName,
  initialTempoBpm,
  initialPlaybackTempoMultiplier,
  onPlaybackTempoMultiplierChange,
  currentHideBarNavigationButtons,
  onHideBarNavigationButtonsChange,
}) => {
  const [selectedMode, setSelectedMode] = useState<Mode>('practice');
  const [practiceHand, setPracticeHand] = useState<PracticeHand>('both');
  const [practiceWaitMode, setPracticeWaitMode] = useState<Extract<WaitMode, 'strict' | 'lenient'>>('strict');
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg";
  const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
  const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";
  const modeButtonBase = "p-4 rounded-lg border-2 transition-all cursor-pointer h-full flex flex-col";
  const modeButtonSelected = "bg-violet-500/80 border-violet-400 shadow-lg scale-105 ring-2 ring-violet-400";
  const modeButtonUnselected = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500";
  
  // Define tempo range based on selected mode
  const minTempoPercentage = selectedMode === 'retical' ? 75 : 25;
  const maxTempoPercentage = selectedMode === 'retical' ? 150 : 200;

  // Clamp initialPlaybackTempoMultiplier if mode changes to retical and it's out of bounds
  useEffect(() => {
      if (selectedMode === 'retical') {
          const currentMultiplier = initialPlaybackTempoMultiplier;
          const minAllowed = minTempoPercentage / 100;
          const maxAllowed = maxTempoPercentage / 100;

          if (currentMultiplier < minAllowed || currentMultiplier > maxAllowed) {
              const newMultiplier = Math.max(minAllowed, Math.min(maxAllowed, currentMultiplier));
              if (newMultiplier !== currentMultiplier) {
                  onPlaybackTempoMultiplierChange(newMultiplier);
              }
          }
      }
  }, [selectedMode, initialPlaybackTempoMultiplier, onPlaybackTempoMultiplierChange, minTempoPercentage, maxTempoPercentage]);

  const handleStart = () => {
    let waitMode: WaitMode;

    switch (selectedMode) {
      case 'practice':
        waitMode = practiceWaitMode;
        break;
      case 'autoplay':
        waitMode = 'off';
        break;
      case 'retical':
        waitMode = 'retical';
        break;
      default:
        waitMode = 'strict';
    }
    
    onStartGame({
        waitMode,
        playbackTempoMultiplier: initialPlaybackTempoMultiplier,
        practiceHand: selectedMode === 'practice' ? practiceHand : 'both',
        hideBarNavigationButtons: selectedMode === 'retical' ? true : currentHideBarNavigationButtons,
    });
  };

  const displayedBpm = initialTempoBpm ? Math.round(initialTempoBpm * initialPlaybackTempoMultiplier) : 'N/A';
  const displayedPlaybackPercentage = Math.round(initialPlaybackTempoMultiplier * 100);

  return (
     <div className={`fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-40 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
       <div className="absolute top-4 left-4">
            <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to MIDIs</button>
       </div>
      <div className={`bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl max-w-4xl w-full ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-in-out ${isRendered ? 'scale-100' : 'scale-95'}`}>
        <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-cyan-400 mb-2">Game Mode</h2>
            {fileName && <p className="text-lg text-slate-300 truncate">{fileName}</p>}
            {analysisResultForPreview && <div className="mt-2 flex justify-center"><DifficultyAnalysis analysisResult={analysisResultForPreview} /></div>}
        </div>
        
        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div onClick={() => setSelectedMode('practice')} className={`${modeButtonBase} ${selectedMode === 'practice' ? modeButtonSelected : modeButtonUnselected}`}>
                <h3 className="font-bold text-xl mb-1 text-violet-300">Practice Mode</h3>
                <p className="text-sm text-slate-300 flex-grow">Learn at your own pace. The song waits for you to play the correct notes.</p>
            </div>
            <div onClick={() => setSelectedMode('autoplay')} className={`${modeButtonBase} ${selectedMode === 'autoplay' ? modeButtonSelected : modeButtonUnselected}`}>
                <h3 className="font-bold text-xl mb-1 text-violet-300">Autoplay Mode</h3>
                <p className="text-sm text-slate-300 flex-grow">Sit back and listen. The song will play itself automatically.</p>
            </div>
            <div onClick={() => setSelectedMode('retical')} className={`${modeButtonBase} ${selectedMode === 'retical' ? modeButtonSelected : modeButtonUnselected}`}>
                <h3 className="font-bold text-xl mb-1 text-violet-300">Retical Mode</h3>
                <p className="text-sm text-slate-300 flex-grow">Scores are recorded on the leaderboard only when the MIDI is in Ranked status.</p>
            </div>
        </div>

        {/* Practice Mode Options */}
        {selectedMode === 'practice' && (
            <div className="bg-slate-900/50 p-6 rounded-lg mb-6 space-y-6 ring-1 ring-slate-700">
                <div>
                    <h4 className="font-semibold text-lg text-center mb-3 text-slate-200">Practice Type</h4>
                    <div className="flex justify-center gap-4">
                        {(['strict', 'lenient'] as const).map(mode => (
                            <button key={mode} onClick={() => setPracticeWaitMode(mode)} className={`px-4 py-2 text-sm rounded-md font-semibold transition w-32 ${practiceWaitMode === mode ? 'bg-violet-500 text-white shadow-md' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-3 h-8 flex items-center justify-center">
                        {practiceWaitMode === 'strict'
                            ? 'The song pauses and waits for you to play the correct notes.'
                            : "The song plays continuously, but will pause if you don't play a key."}
                    </p>
                </div>
                <div className="border-t border-slate-700/50"></div>
                <div>
                     <h4 className="font-semibold text-lg text-center mb-3 text-slate-200">Hand Selection</h4>
                     <div className="flex justify-center gap-3">
                        {(['left', 'right', 'both'] as PracticeHand[]).map(hand => (
                            <button key={hand} onClick={() => setPracticeHand(hand)} className={`px-4 py-2 text-sm rounded-md font-semibold transition ${practiceHand === hand ? 'bg-cyan-500 text-white shadow-md' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                {hand.charAt(0).toUpperCase() + hand.slice(1)} Hand{hand === 'both' ? 's' : ''}
                            </button>
                        ))}
                     </div>
                </div>
            </div>
        )}

        {/* BPM Setting */}
        <div className="bg-slate-900/50 p-4 rounded-lg mb-8 ring-1 ring-slate-700">
             <label htmlFor="bpm-slider" className="block text-center text-lg font-medium text-slate-300 mb-3">
                Tempo: <span className="font-bold text-white tabular-nums">{displayedPlaybackPercentage}%</span>
                {initialTempoBpm && <span className="text-slate-400 tabular-nums"> ({displayedBpm} BPM)</span>}
             </label>
             <input
                id="bpm-slider"
                type="range"
                min={minTempoPercentage}
                max={maxTempoPercentage}
                step="1"
                value={Math.max(minTempoPercentage, Math.min(maxTempoPercentage, displayedPlaybackPercentage))}
                onChange={(e) => onPlaybackTempoMultiplierChange(parseInt(e.target.value, 10) / 100)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
             />
             {selectedMode === 'retical' && (
                <p className="text-xs text-slate-500 text-center mt-2">
                    Tempo restricted to {minTempoPercentage}% - {maxTempoPercentage}% in Retical Mode.
                </p>
             )}
        </div>

        <button onClick={handleStart} className={`${buttonBaseStyle} ${primaryButtonStyle}`}>
            Start
        </button>

      </div>
    </div>
  );
};

export default ModeSelection;