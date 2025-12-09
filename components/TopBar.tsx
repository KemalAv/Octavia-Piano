
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
}

const TopBar: React.FC<TopBarProps> = (props) => {
  const {
    onPlay, onPause, onStop, onExit, isPlaying, isFileLoaded, fileName,
    waitMode, metronomeMode, onCycleMetronomeMode, isMetronomeAvailable,
    hitCount, errorCount, totalNoteCount, currentTimeMs, totalDurationMs,
    viewMode, noteSpeedMultiplier, onNoteSpeedMultiplierChange, sheetMusicZoom,
    onSheetMusicZoomChange, analysisResult, metronomeBeat, totalWaitTimeMs
  } = props;

  const iconButtonStyles = "p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-opacity-75 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonStyles = "bg-cyan-500 hover:bg-cyan-600 text-white";
  const secondaryButtonStyles = "bg-slate-600 hover:bg-slate-700 text-slate-100";
  const activeToggleButtonStyles = "bg-violet-500 hover:bg-violet-600 text-white"; 
  
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

  const waitModeLabel = waitMode === 'off' ? 'Autoplay' : waitMode === 'retical' ? 'Retical' : 'Practice';

  const ZoomControls = () => {
    const isFalling = viewMode === 'falling';
    const value = isFalling ? noteSpeedMultiplier : sheetMusicZoom;
    return (
        <div className="flex items-center gap-2" title={isPlaying ? "Pause to adjust zoom" : (isFalling ? "Note Falling Speed" : "Sheet Music Zoom")}>
            <span className="text-xs font-medium text-slate-300 hidden sm:inline">{isFalling ? 'Zoom' : 'Zoom'}</span>
            <button onClick={() => adjustZoom(isFalling, false)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} ${secondaryButtonStyles} w-7 h-7`} aria-label="Decrease zoom">−</button>
            <span className="text-sm font-semibold w-12 text-center tabular-nums text-white">
              {Math.round(value * 100)}%
            </span>
            <button onClick={() => adjustZoom(isFalling, true)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} ${secondaryButtonStyles} w-7 h-7`} aria-label="Increase zoom">+</button>
        </div>
    );
  };

  return (
    <div className="bg-slate-800 text-white p-2 shadow-lg min-h-[60px] flex flex-wrap items-center justify-between gap-4 no-select ring-1 ring-slate-700">
      {/* Left Group */}
      <div className="flex items-center gap-2">
        <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Exit to song selection" title="Exit">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <button
          onClick={onCycleMetronomeMode}
          disabled={!isMetronomeAvailable}
          className={`${iconButtonStyles} ${metronomeMode !== 'off' ? activeToggleButtonStyles : secondaryButtonStyles}`}
          title={`Metronome: ${metronomeMode}. Click to cycle.`}
        >
         <VisualMetronome beatState={metronomeMode !== 'off' ? metronomeBeat : null} />
        </button>
      </div>

      {/* Center Group: Info */}
      <div className="flex-grow text-center px-2 flex flex-col items-center justify-center gap-1 min-w-0">
        {fileName && <p className="text-sm font-semibold truncate max-w-full" title={fileName}>{fileName}</p>}
        {isFileLoaded && (
          <div className="text-sm font-mono text-slate-200 tabular-nums flex items-center gap-2 justify-center">
            <span>{formatTime(currentTimeMs)} / {formatTime(totalDurationMs)}</span>
            {waitMode === 'retical' && totalWaitTimeMs !== undefined && (
              <span className="text-red-400 font-bold ml-1" title="Total Pause Duration">
                {formatWaitTime(totalWaitTimeMs)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Group */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end text-xs font-mono tabular-nums">
            <span className="text-lime-400">Hits: {hitCount}</span>
            <span className="text-red-400">Errors: {errorCount}</span>
        </div>
        
        <ZoomControls />
        
        <div className="flex items-center gap-2">
            {!isPlaying ? (
                <button onClick={onPlay} disabled={!isFileLoaded || waitMode === 'retical'} className={`${iconButtonStyles} ${primaryButtonStyles}`} aria-label="Play" title="Play">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                </button>
            ) : (
                <button onClick={onPause} disabled={!isFileLoaded || waitMode === 'retical'} className={`${iconButtonStyles} ${primaryButtonStyles}`} aria-label="Pause" title="Pause">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1H5zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1h-1z" clipRule="evenodd"></path></svg>
                </button>
            )}
            <button onClick={onStop} disabled={!isFileLoaded} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Stop playback and reset" title="Stop">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z"></path></svg>
            </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;