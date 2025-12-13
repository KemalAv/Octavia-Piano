

import React from 'react';
import { ViewMode, WaitMode, MetronomeMode, ExtendedResult } from '../types';
import VisualMetronome from './VisualMetronome';

interface TopBarProps {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onExit: () => void;
  isPlaying: boolean;
  isFileLoaded: boolean;
  fileName: string | null;
  waitMode: WaitMode;
  metronomeMode: MetronomeMode;
  onCycleMetronomeMode: () => void;
  isMetronomeAvailable: boolean;
  hitCount: number;
  errorCount: number;
  liveAccuracy: number;
  liveSpeed: number;
  totalNoteCount: number;
  currentTimeMs: number;
  totalDurationMs: number;
  viewMode: ViewMode;
  noteSpeedMultiplier: number;
  onNoteSpeedMultiplierChange: (multiplier: number) => void;
  sheetMusicZoom: number;
  onSheetMusicZoomChange: (zoom: number) => void;
  analysisResult: ExtendedResult | null;
  metronomeBeat: 'strong' | 'weak' | null; // New prop for visual metronome
  totalWaitTimeMs?: number; // New prop for Retical mode wait timer
  isFreePlayMode?: boolean;
}

const TopBar: React.FC<TopBarProps> = (props) => {
  const {
    onPlay, onPause, onStop, onExit, isPlaying, isFileLoaded, fileName,
    waitMode, metronomeMode, onCycleMetronomeMode, isMetronomeAvailable,
    hitCount, errorCount, liveAccuracy, liveSpeed, totalNoteCount, currentTimeMs, totalDurationMs,
    viewMode, noteSpeedMultiplier, onNoteSpeedMultiplierChange, sheetMusicZoom,
    onSheetMusicZoomChange, analysisResult, metronomeBeat, totalWaitTimeMs,
    isFreePlayMode
  }
  = props;

  // New HUD Styles
  const hudContainerStyle = "bg-slate-900/90 backdrop-blur-md text-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-white/10 min-h-[64px] flex flex-wrap items-center justify-between gap-4 no-select relative z-50";
  const iconButtonStyles = "p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95";
  const primaryButtonStyles = "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]";
  const secondaryButtonStyles = "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500";
  const activeToggleButtonStyles = "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_10px_rgba(124,58,237,0.5)] border border-violet-400"; 
  
  const formatTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatWaitTime = (ms: number) => {
    if (isNaN(ms) || ms <= 0) return '+0.000';
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `+${seconds}.${String(milliseconds).padStart(3, '0')}`;
  };

  const adjustZoom = (isFalling: boolean, increment: boolean) => {
      const current = isFalling ? noteSpeedMultiplier : sheetMusicZoom;
      const setter = isFalling ? onNoteSpeedMultiplierChange : onSheetMusicZoomChange;
      const step = 0.1;
      let newValue = increment ? current + step : current - step;
      newValue = Math.round(newValue * 10) / 10;
      newValue = Math.max(0.1, Math.min(4.0, newValue));
      setter(newValue);
  };

  if (isFreePlayMode) {
    return (
      <div className={hudContainerStyle}>
        <div className="flex items-center gap-3">
          <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Exit Free Play" title="Exit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div className="text-xl font-bold text-cyan-400 tracking-wider uppercase">
            Free Play
          </div>
        </div>
      </div>
    );
  }

  const waitModeLabel = waitMode === 'off' ? 'Autoplay' : waitMode === 'retical' ? 'Retical' : 'Practice';

  const ZoomControls = () => {
    const isFalling = viewMode === 'falling';
    const value = isFalling ? noteSpeedMultiplier : sheetMusicZoom;
    return (
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700" title={isPlaying ? "Pause to adjust zoom" : (isFalling ? "Note Falling Speed" : "Sheet Music Zoom")}>
            <button onClick={() => adjustZoom(isFalling, false)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Decrease zoom">−</button>
            <span className="text-xs font-bold w-10 text-center tabular-nums text-slate-200">
              {Math.round(value * 100)}%
            </span>
            <button onClick={() => adjustZoom(isFalling, true)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Increase zoom">+</button>
        </div>
    );
  };

  const StatBox: React.FC<{ label: string; value: string | number; color: string; subValue?: string }> = ({ label, value, color, subValue }) => (
    <div className="flex flex-col items-center justify-center min-w-[70px]">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</div>
        <div className={`text-lg font-black leading-none tabular-nums ${color} drop-shadow-md`}>{value}</div>
        {subValue && <div className="text-[10px] font-mono text-slate-400 mt-0.5">{subValue}</div>}
    </div>
  );

  return (
    <div className={hudContainerStyle}>
      {/* Left Group: Controls */}
      <div className="flex items-center gap-3 pl-2">
        <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Exit to song selection" title="Exit">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        
        <div className="h-8 w-px bg-white/10 mx-1"></div>

        <button
          onClick={onCycleMetronomeMode}
          disabled={!isMetronomeAvailable}
          className={`${iconButtonStyles} ${metronomeMode !== 'off' ? activeToggleButtonStyles : secondaryButtonStyles}`}
          title={`Metronome: ${metronomeMode === 'off' ? 'Off' : metronomeMode === 'beat' ? 'Beat' : 'Bar'}. Click to cycle.`}
        >
         <VisualMetronome
             beatState={metronomeMode !== 'off' ? metronomeBeat : null}
             metronomeMode={metronomeMode}
         />
        </button>
      </div>

      {/* Center Group: Stats HUD */}
      <div className="flex-grow flex justify-center">
        <div className="hidden md:flex items-center gap-6 bg-black/40 rounded-xl px-6 py-2 border border-white/5 backdrop-blur-sm shadow-inner">
            <StatBox label="Accuracy" value={`${liveAccuracy.toFixed(1)}%`} color="text-cyan-400" />
            <div className="h-8 w-px bg-white/10"></div>
            <StatBox label="Speed" value={`${liveSpeed.toFixed(0)}%`} color="text-yellow-400" />
            <div className="h-8 w-px bg-white/10"></div>
            <div className="flex gap-4">
                <StatBox label="Hits" value={hitCount} color="text-emerald-400" />
                <StatBox label="Miss" value={errorCount} color="text-rose-400" />
            </div>
            {totalWaitTimeMs !== undefined && (
            <>
                <div className="h-8 w-px bg-white/10"></div>
                <StatBox label="Delay" value={formatWaitTime(totalWaitTimeMs)} color="text-rose-300" />
            </>
            )}
        </div>
        {/* Mobile View Title */}
        <div className="md:hidden text-center">
             {fileName && <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{fileName}</p>}
             {isFileLoaded && <p className="text-xs font-mono text-cyan-500">{formatTime(currentTimeMs)}</p>}
        </div>
      </div>

      {/* Right Group: Playback & Zoom */}
      <div className="flex items-center gap-4 pr-2">
        <div className="hidden md:flex flex-col items-end mr-2">
             {fileName && <p className="text-xs font-bold text-slate-300 truncate max-w-[200px]" title={fileName}>{fileName}</p>}
             {isFileLoaded && (
               <div className="text-xs font-mono text-cyan-500 tabular-nums">
                 <span>{formatTime(currentTimeMs)}</span> <span className="text-slate-600">/</span> <span className="text-slate-500">{formatTime(totalDurationMs)}</span>
               </div>
             )}
        </div>

        <ZoomControls />
        
        <div className="flex items-center gap-2">
            {!isPlaying ? (
                <button onClick={onPlay} disabled={!isFileLoaded} className={`${iconButtonStyles} ${primaryButtonStyles} w-10 h-10`} aria-label="Play" title="Play">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                </button>
            ) : (
                <button onClick={onPause} disabled={!isFileLoaded || waitMode === 'retical'} className={`${iconButtonStyles} ${primaryButtonStyles} w-10 h-10`} aria-label="Pause" title="Pause">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1H5zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1h-1z" clipRule="evenodd"></path></svg>
                </button>
            )}
            <button onClick={onStop} disabled={!isFileLoaded} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Stop playback and reset" title="Stop">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z"></path></svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;