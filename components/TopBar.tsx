
import React from 'react';
import { ViewMode, WaitMode, MetronomeMode, ExtendedResult, TimeSignatureInfo } from '../types';
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
  // NEW: Recording props
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onSaveRecording?: () => void;
  showSaveButton?: boolean;
  // NEW: Loop props
  isLooping: boolean;
  onToggleLoop: () => void;
  loopStartMs: number | null;
  loopEndMs: number | null;
  onSetLoopStart: () => void;
  onSetLoopEnd: () => void;
  onClearLoop: () => void;
  // NEW: Free Play props
  freePlayBpm?: number;
  onFreePlayBpmChange?: (bpm: number) => void;
  freePlayTimeSignature?: TimeSignatureInfo;
  onFreePlayTimeSignatureChange?: (ts: TimeSignatureInfo) => void;
}

const TopBar: React.FC<TopBarProps> = (props) => {
  const {
    onPlay, onPause, onStop, onExit, isPlaying, isFileLoaded, fileName,
    waitMode, metronomeMode, onCycleMetronomeMode, isMetronomeAvailable,
    hitCount, errorCount, liveAccuracy, liveSpeed, totalNoteCount, currentTimeMs, totalDurationMs,
    viewMode, noteSpeedMultiplier, onNoteSpeedMultiplierChange, sheetMusicZoom,
    onSheetMusicZoomChange, analysisResult, metronomeBeat, totalWaitTimeMs,
    isFreePlayMode, isRecording, onToggleRecording, onSaveRecording, showSaveButton,
    isLooping, onToggleLoop, loopStartMs, loopEndMs, onSetLoopStart, onSetLoopEnd, onClearLoop,
    freePlayBpm, onFreePlayBpmChange, freePlayTimeSignature, onFreePlayTimeSignatureChange,
  }
  = props;

  const hudContainerStyle = `text-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-white/10 min-h-[64px] flex flex-wrap items-center justify-between gap-4 no-select relative z-50 bg-slate-900`;
  const iconButtonStyles = "p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95";
  const primaryButtonStyles = "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]";
  const secondaryButtonStyles = "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500";
  const activeToggleButtonStyles = "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_10px_rgba(124,58,237,0.5)] border border-violet-400"; 
  const recordingActiveButtonStyle = "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)] animate-pulse";
  
  const formatTime = (ms: number | null) => {
    if (ms === null || isNaN(ms) || ms < 0) return '00:00';
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

  const adjustZoom = (isSpeedControl: boolean, increment: boolean) => {
      const current = isSpeedControl ? noteSpeedMultiplier : sheetMusicZoom;
      const setter = isSpeedControl ? onNoteSpeedMultiplierChange : onSheetMusicZoomChange;
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
          
          <div className="flex items-center gap-2">
              {!isPlaying ? (
                  <button onClick={onPlay} className={`${iconButtonStyles} ${primaryButtonStyles} w-10 h-10`} aria-label="Play" title="Play">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                  </button>
              ) : (
                  <button onClick={onPause} className={`${iconButtonStyles} ${primaryButtonStyles} w-10 h-10`} aria-label="Pause" title="Pause">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1H5zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1h-1z" clipRule="evenodd"></path></svg>
                  </button>
              )}
          </div>

          <div className="text-xl font-bold text-cyan-400 tracking-wider uppercase ml-2">
            Free Play
          </div>
          
          <div className="h-8 w-px bg-white/10 mx-1"></div>

          <button
            onClick={onCycleMetronomeMode}
            className={`${iconButtonStyles} ${metronomeMode !== 'off' ? activeToggleButtonStyles : secondaryButtonStyles}`}
            title={`Metronome: ${metronomeMode === 'off' ? 'Off' : metronomeMode === 'beat' ? 'Beat' : 'Bar'}. Click to cycle.`}
          >
            <VisualMetronome
                beatState={metronomeMode !== 'off' ? metronomeBeat : null}
                metronomeMode={metronomeMode}
            />
          </button>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">BPM</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" 
                            min="40" 
                            max="240" 
                            value={freePlayBpm || 120} 
                            onChange={(e) => onFreePlayBpmChange?.(parseInt(e.target.value))}
                            className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-black text-yellow-400 tabular-nums w-8">{freePlayBpm}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Time Sig</span>
                    <select 
                        value={`${freePlayTimeSignature?.numerator}/${freePlayTimeSignature?.denominator}`}
                        onChange={(e) => {
                            const [n, d] = e.target.value.split('/').map(Number);
                            onFreePlayTimeSignatureChange?.({ numerator: n, denominator: d });
                        }}
                        className="bg-slate-800 text-xs font-bold text-white border-none rounded p-1 outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        <option value="4/4">4/4</option>
                        <option value="3/4">3/4</option>
                        <option value="2/4">2/4</option>
                        <option value="6/8">6/8</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                <button
                    onClick={onToggleRecording}
                    className={`${iconButtonStyles} ${isRecording ? recordingActiveButtonStyle : secondaryButtonStyles} h-10 px-4 gap-2`}
                    title={isRecording ? "Stop Recording" : "Start MIDI Recording"}
                >
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-rose-500'}`} />
                    <span className="text-xs font-bold uppercase">{isRecording ? 'Stop' : 'Record'}</span>
                </button>
                
                {showSaveButton && onSaveRecording && (
                    <button
                        onClick={onSaveRecording}
                        className={`${iconButtonStyles} bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4 gap-2 shadow-emerald-500/20`}
                        title="Download Recording as MIDI"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span className="text-xs font-bold uppercase">Save MIDI</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700" title="Adjust Zoom">
                <button onClick={() => adjustZoom(true, false)} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`}>−</button>
                <div className="flex flex-col items-center justify-center w-12">
                    <span className="text-[9px] font-bold uppercase text-slate-400 leading-tight">ZOOM</span>
                    <span className="text-xs font-bold tabular-nums text-slate-200 leading-tight">
                        {Math.round(noteSpeedMultiplier * 100)}%
                    </span>
                </div>
                <button onClick={() => adjustZoom(true, true)} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`}>+</button>
            </div>
        </div>
      </div>
    );
  }

  const isPracticeMode = waitMode === 'strict' || waitMode === 'rhythm';

  const ZoomControls = () => {
    const isSpeedControl = viewMode === 'falling' || viewMode === 'sheet-roll';
    const value = isSpeedControl ? noteSpeedMultiplier : sheetMusicZoom;
    const titleText = isPlaying ? "Pause to adjust zoom" : (isSpeedControl ? "Adjust Note Speed" : "Adjust Sheet Zoom");

    return (
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700" title={titleText}>
            <button onClick={() => adjustZoom(isSpeedControl, false)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Decrease zoom">−</button>
            <div className="flex flex-col items-center justify-center w-12">
                <span className="text-[9px] font-bold uppercase text-slate-400 leading-tight">ZOOM</span>
                <span className="text-xs font-bold tabular-nums text-slate-200 leading-tight">
                    {Math.round(value * 100)}%
                </span>
            </div>
            <button onClick={() => adjustZoom(isSpeedControl, true)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Increase zoom">+</button>
        </div>
    );
  };

  const StatBox: React.FC<{ label: string; value: string | number; color: string; subValue?: string }> = ({ label, value, color, subValue }) => (
    <div className="flex flex-col items-center justify-center min-w-[50px]">
        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">{label}</div>
        <div className={`text-sm font-black leading-none tabular-nums ${color} drop-shadow-md`}>{value}</div>
        {subValue && <div className="text-[8px] font-mono text-slate-400 mt-0">{subValue}</div>}
    </div>
  );

  return (
    <div className={hudContainerStyle}>
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
        
        {isPracticeMode && (
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                <button onClick={onToggleLoop} className={`${iconButtonStyles} ${isLooping ? activeToggleButtonStyles : secondaryButtonStyles}`} title="Toggle Loop Section">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                </button>
                {isLooping && (
                <div className="flex items-center gap-2 text-xs pr-2">
                    <button onClick={onSetLoopStart} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Set Loop Start to Current Time">[A]</button>
                    <span className="font-mono text-slate-300 w-10 text-center">{formatTime(loopStartMs)}</span>
                    <span className="text-slate-500">-</span>
                    <span className="font-mono text-slate-300 w-10 text-center">{formatTime(loopEndMs)}</span>
                    <button onClick={onSetLoopEnd} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Set Loop End to Current Time">[B]</button>
                    <button onClick={onClearLoop} className="p-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Clear Loop">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                )}
            </div>
        )}
      </div>

      <div className="flex-grow flex justify-center">
        <div className={`hidden md:flex items-center gap-4 rounded-xl px-4 py-1 border border-white/5 shadow-inner bg-black/40`}>
            <StatBox label="Accuracy" value={`${liveAccuracy.toFixed(1)}%`} color="text-cyan-400" />
            <div className="h-6 w-px bg-white/10"></div>
            <StatBox label="Speed" value={`${liveSpeed.toFixed(0)}%`} color="text-yellow-400" />
            <div className="h-6 w-px bg-white/10"></div>
            <div className="flex gap-4">
                <StatBox label="Hits" value={hitCount} color="text-emerald-400" />
                <StatBox label="Miss" value={errorCount} color="text-rose-400" />
            </div>
            {totalWaitTimeMs !== undefined && (
            <>
                <div className="h-6 w-px bg-white/10"></div>
                <StatBox label="Delay" value={formatWaitTime(totalWaitTimeMs)} color="text-rose-300" />
            </>
            )}
        </div>
        <div className="md:hidden text-center">
             {fileName && <p className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{fileName}</p>}
             {isFileLoaded && <p className="text-xs font-mono text-cyan-500">{formatTime(currentTimeMs)}</p>}
        </div>
      </div>

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
