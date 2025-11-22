
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
}

const TopBar: React.FC<TopBarProps> = (props) => {
  const {
    onPlay, onPause, onStop, onExit, isPlaying, isFileLoaded, fileName,
    waitMode, metronomeMode, onCycleMetronomeMode, isMetronomeAvailable,
    hitCount, errorCount, totalNoteCount, currentTimeMs, totalDurationMs,
    viewMode, noteSpeedMultiplier, onNoteSpeedMultiplierChange, sheetMusicZoom,
    onSheetMusicZoomChange, analysisResult, metronomeBeat
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
            <span className="text-xs font-medium text-slate-300 hidden sm:inline">{isFalling ? 'Speed' : 'Zoom'}</span>
            <button onClick={() => adjustZoom(isFalling, false)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} ${secondaryButtonStyles} w-7 h-7`} aria-label="Decrease zoom">−</button>
            <span className="text-sm font-semibold w-12 text-center tabular-nums text-white">
              {Math.round(value * 100)}%
            </span>
            <button onClick={() => adjustZoom(isFalling, true)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} ${secondaryButtonStyles} w-7 h-7`} aria-label="Increase zoom">+</button>
        </div>
    );
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm text-white p-2 shadow-lg min-h-[60px] flex flex-wrap items-center justify-between gap-4 flex-shrink-0 no-select ring-1 ring-slate-700">
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
          <div className="text-sm font-mono text-slate-200 tabular-nums">
            {formatTime(currentTimeMs)} / {formatTime(totalDurationMs)}
          </div>
        )}
      </div>

      {/* Right Group */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col items-end text-xs">
          <span className="font-semibold text-slate-200">{waitModeLabel} Mode</span>
          {waitMode !== 'off' && (
            <div className="flex gap-2 tabular-nums">
              <span className="text-lime-400">Hits: {hitCount}</span>
              <span className="text-red-400">Errors: {errorCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
            <ZoomControls />
            <div className="w-px h-6 bg-slate-600 self-center"></div>
            <div className="flex items-center gap-2">
              <button onClick={onStop} disabled={!isFileLoaded} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Stop" title="Stop">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd"></path><path d="M5 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"></path></svg>
              </button>
              <button onClick={isPlaying ? onPause : onPlay} disabled={!isFileLoaded} className={`${iconButtonStyles} ${primaryButtonStyles}`} aria-label={isPlaying ? "Pause" : "Play"} title={isPlaying ? "Pause" : "Play"}>
                {isPlaying 
                  ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" clipRule="evenodd"></path></svg>
                  : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 4.31A1 1 0 018 5.2v9.6a1 1 0 01-1.7.71l-5-4.8a1 1 0 010-1.42l5-4.8z"></path></svg>
                }
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
