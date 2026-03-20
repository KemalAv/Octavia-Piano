
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  liveAccuracy: number;
  liveSpeed: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  isNonStop: boolean;
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
  isMicEnabled?: boolean;
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
  barLines: number[];
  isTopBarVisible: boolean;
  onToggleVisibility: () => void;
  instrumentMode: 'piano' | 'drum';
  lastHitOffset: number;
  perfectWindow: number;
  greatWindow: number;
  goodWindow: number;
  combo: number;
  lastJudgment: 'perfect' | 'great' | 'good' | 'miss' | null;
  // NEW: Free Play props
  freePlayBpm?: number;
  onFreePlayBpmChange?: (bpm: number) => void;
  freePlayTimeSignature?: TimeSignatureInfo;
  onFreePlayTimeSignatureChange?: (ts: TimeSignatureInfo) => void;
}

const OffsetMeter = ({ offset, perfectWindow, greatWindow, goodWindow }: { offset: number, perfectWindow: number, greatWindow: number, goodWindow: number }) => {
  const maxDisplayOffset = 500; // Fixed max display range for the entire bar
  const clampedOffset = Math.max(-maxDisplayOffset, Math.min(maxDisplayOffset, offset));
  
  // Adjusted indicator logic: Positive offset (Early) moves Left, Negative offset (Late) moves Right
  // To match user request: Early (Positive) should be labeled +, Late (Negative) should be labeled -
  const indicatorPercentage = 50 - (clampedOffset / maxDisplayOffset) * 50;
  
  // Widths of the zones (as percentage of the total bar width)
  const pW = (perfectWindow / maxDisplayOffset) * 50;
  const grW = ((greatWindow - perfectWindow) / maxDisplayOffset) * 50;
  const goW = ((goodWindow - greatWindow) / maxDisplayOffset) * 50;
  const miW = 50 - (goodWindow / maxDisplayOffset) * 50;

  return (
    <div className="flex flex-col items-center justify-center min-w-[180px] px-2 relative pt-1 pb-5">
      <div className="relative w-full h-2.5 flex items-center rounded-full overflow-hidden bg-slate-800">
        {/* Left Miss zone */}
        <div className="h-full bg-rose-600" style={{ width: `${miW}%` }}></div>
        {/* Left Good zone */}
        <div className="h-full bg-blue-500" style={{ width: `${goW}%` }}></div>
        {/* Left Great zone */}
        <div className="h-full bg-emerald-500" style={{ width: `${grW}%` }}></div>
        
        {/* Center Perfect zone */}
        <div className="h-full bg-yellow-400" style={{ width: `${pW * 2}%` }}></div>
        
        {/* Right Great zone */}
        <div className="h-full bg-emerald-500" style={{ width: `${grW}%` }}></div>
        {/* Right Good zone */}
        <div className="h-full bg-blue-500" style={{ width: `${goW}%` }}></div>
        {/* Right Miss zone */}
        <div className="h-full bg-rose-600" style={{ width: `${miW}%` }}></div>
        
        {/* White line indicator */}
        <div 
          className="absolute w-1.5 h-6 bg-white rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-75 z-10 border border-slate-900 shadow-sm"
          style={{ left: `${indicatorPercentage}%` }}
        ></div>
      </div>
      
      {/* Labels: Early (+) on Left, Late (-) on Right as per request */}
      <div className="absolute top-5 left-0 right-0 h-4 pointer-events-none flex justify-between px-1">
        <span className="text-[8px] font-bold text-slate-500">+{maxDisplayOffset}ms</span>
        <span className="text-[8px] font-bold text-slate-400">0ms</span>
        <span className="text-[8px] font-bold text-slate-500">-{maxDisplayOffset}ms</span>
      </div>
    </div>
  );
};

const TopBar: React.FC<TopBarProps> = (props) => {
  const {
    onPlay, onPause, onStop, onExit, isPlaying, isFileLoaded, fileName,
    waitMode, metronomeMode, onCycleMetronomeMode, isMetronomeAvailable,
    liveAccuracy, liveSpeed, isNonStop, totalNoteCount, currentTimeMs, totalDurationMs,
    perfectCount, greatCount, goodCount, missCount,
    viewMode, noteSpeedMultiplier, onNoteSpeedMultiplierChange, sheetMusicZoom,
    onSheetMusicZoomChange, analysisResult, metronomeBeat, totalWaitTimeMs,
    isFreePlayMode, isMicEnabled, isRecording, onToggleRecording, onSaveRecording, showSaveButton,
    isLooping, onToggleLoop, loopStartMs, loopEndMs, onSetLoopStart, onSetLoopEnd, onClearLoop,
    barLines, isTopBarVisible, onToggleVisibility, instrumentMode,
    lastHitOffset, perfectWindow, greatWindow, goodWindow,
    combo, lastJudgment,
    freePlayBpm, onFreePlayBpmChange, freePlayTimeSignature, onFreePlayTimeSignatureChange,
  }
  = props;

  const [displayJudgment, setDisplayJudgment] = useState<{ id: number; type: 'perfect' | 'great' | 'good' | 'miss' } | null>(null);

  useEffect(() => {
    if (lastJudgment) {
      setDisplayJudgment({ id: Date.now(), type: lastJudgment });
      const timer = setTimeout(() => setDisplayJudgment(null), 800);
      return () => clearTimeout(timer);
    }
  }, [lastJudgment, combo]); // Also trigger on combo change to refresh the animation for same judgments

  const hudContainerStyle = `text-white p-1 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-b border-white/10 min-h-[52px] flex flex-wrap items-center justify-between gap-2 no-select relative z-50 bg-slate-900 transition-all duration-300 ease-in-out`;
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

  const getBarNumber = (ms: number | null) => {
    if (ms === null || barLines.length === 0) return '-';
    const idx = barLines.findIndex(b => Math.abs(b - ms) < 10);
    return idx !== -1 ? idx + 1 : '-';
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
      <div className="relative z-50">
        {/* MINIMAL OVERLAY (Visible when TopBar is hidden) */}
        <div className={`absolute top-0 right-8 flex flex-col items-center pointer-events-none transition-opacity duration-300 ${!isTopBarVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-b-xl border-x border-b border-white/10 pointer-events-auto shadow-lg">
            <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles} w-8 h-8`} aria-label="Exit" title="Exit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            
            <div className="flex items-center gap-2">
                {!isPlaying ? (
                    <button onClick={onPlay} className={`${iconButtonStyles} ${primaryButtonStyles} w-8 h-8`} aria-label="Play" title="Play">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                    </button>
                ) : (
                    <button onClick={onPause} className={`${iconButtonStyles} ${primaryButtonStyles} w-8 h-8`} aria-label="Pause" title="Pause">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1H5zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1h-1z" clipRule="evenodd"></path></svg>
                    </button>
                )}
                <button onClick={onStop} className={`${iconButtonStyles} ${secondaryButtonStyles} w-8 h-8`} aria-label="Stop" title="Stop">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path></svg>
                </button>
            </div>
            
            <div className="text-sm font-bold text-cyan-400 tracking-wider uppercase">Free Play</div>

            <button onClick={onToggleVisibility} className="text-slate-400 hover:text-white transition-colors" title="Show Full Menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          </div>
        </div>

        {/* FULL TOP BAR */}
        <div className={`${hudContainerStyle} ${!isTopBarVisible ? '-translate-y-full' : 'translate-y-0'}`}>
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
                <button onClick={onStop} className={`${iconButtonStyles} ${secondaryButtonStyles} w-10 h-10`} aria-label="Stop" title="Stop">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path></svg>
                </button>
            </div>

            <div className="text-xl font-bold text-cyan-400 tracking-wider uppercase ml-2">
              Free Play
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-1"></div>

            <button
              onClick={onCycleMetronomeMode}
              className={`${iconButtonStyles} ${metronomeMode !== 'off' ? activeToggleButtonStyles : secondaryButtonStyles}`}
              title={`Metronome: ${metronomeMode === 'off' ? 'Off' : metronomeMode === 'beat' ? 'Beat' : metronomeMode === 'bar' ? 'Bar' : 'Drum'}. Click to cycle.`}
            >
              <VisualMetronome
                  beatState={metronomeMode !== 'off' ? metronomeBeat : null}
                  metronomeMode={metronomeMode}
              />
            </button>
          </div>

          <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 bg-black/40 px-3 py-2 rounded-xl border border-white/5 relative">
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
                  
                  <button onClick={onToggleVisibility} className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-slate-500 hover:text-white transition-colors" title="Hide Full Menu">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                  </button>
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
                          {instrumentMode === 'drum' ? noteSpeedMultiplier.toFixed(1) : `${Math.round(noteSpeedMultiplier * 100)}%`}
                      </span>
                  </div>
                  <button onClick={() => adjustZoom(true, true)} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`}>+</button>
              </div>
          </div>
        </div>
      </div>
    );
  }

  const isPracticeMode = waitMode === 'strict' || waitMode === 'rhythm';

  const ZoomControls = () => {
    const isSpeedControl = viewMode === 'falling' || viewMode === 'sheet-roll' || (instrumentMode === 'drum' && viewMode !== 'sheet');
    const value = isSpeedControl ? noteSpeedMultiplier : sheetMusicZoom;
    const titleText = isPlaying ? "Pause to adjust zoom" : (isSpeedControl ? "Adjust Note Speed" : "Adjust Sheet Zoom");

    return (
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700" title={titleText}>
            <button onClick={() => adjustZoom(isSpeedControl, false)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Decrease zoom">−</button>
            <div className="flex flex-col items-center justify-center w-12">
                <span className="text-[9px] font-bold uppercase text-slate-400 leading-tight">ZOOM</span>
                <span className="text-xs font-bold tabular-nums text-slate-200 leading-tight">
                    {isSpeedControl ? (instrumentMode === 'drum' ? value.toFixed(1) : `${Math.round(value * 100)}%`) : `${Math.round(value * 100)}%`}
                </span>
            </div>
            <button onClick={() => adjustZoom(isSpeedControl, true)} disabled={!isFileLoaded || isPlaying} className={`${iconButtonStyles} w-7 h-7 bg-transparent hover:bg-slate-700 text-slate-400 hover:text-white`} aria-label="Increase zoom">+</button>
        </div>
    );
  };

  const StatBox: React.FC<{ label: string; value: string | number; color: string; subValue?: string }> = ({ label, value, color, subValue }) => (
    <div className="flex flex-col items-center justify-center min-w-[44px]">
        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">{label}</div>
        <div className={`text-sm font-black leading-none tabular-nums ${color} drop-shadow-md`}>{value}</div>
        {subValue && <div className="text-[8px] font-mono text-slate-400 mt-0">{subValue}</div>}
    </div>
  );

  const JudgmentDisplay = () => (
    <div className="flex items-center justify-center min-w-[100px] h-10 relative">
      {displayJudgment && (
        <motion.div
          key={displayJudgment.id}
          initial={{ scale: 0.8, opacity: 1, y: 5 }}
          animate={{ scale: 1.2, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 10 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className={`text-xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] ${
            displayJudgment.type === 'perfect' ? 'text-yellow-400' :
            displayJudgment.type === 'great' ? 'text-emerald-400' :
            displayJudgment.type === 'good' ? 'text-blue-400' :
            'text-rose-500'
          }`}>
            {displayJudgment.type}
          </span>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="relative z-50">
      {/* MINIMAL OVERLAY (Visible when TopBar is hidden) */}
      <div className={`absolute top-0 left-0 right-0 flex flex-col items-center pointer-events-none transition-opacity duration-300 ${!isTopBarVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-sm px-4 py-1 rounded-b-xl border-x border-b border-white/10 pointer-events-auto shadow-lg">
          <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles} w-8 h-8`} aria-label="Exit" title="Exit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          <div className="flex items-center gap-4">
            <OffsetMeter offset={lastHitOffset} perfectWindow={perfectWindow} greatWindow={greatWindow} goodWindow={goodWindow} />
            <StatBox label="Accuracy" value={`${liveAccuracy.toFixed(1)}%`} color="text-cyan-300" />
            <StatBox label="Combo" value={combo} color="text-white" />
            <JudgmentDisplay />
            {!isNonStop && waitMode !== 'off' && totalWaitTimeMs !== undefined && (
              <StatBox label="Wait Time" value={formatWaitTime(totalWaitTimeMs)} color="text-rose-300" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button onClick={onPlay} disabled={!isFileLoaded} className={`${iconButtonStyles} ${primaryButtonStyles} w-8 h-8`} aria-label="Play" title="Play">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
              </button>
            ) : (
              <button onClick={onPause} disabled={!isFileLoaded || waitMode === 'retical'} className={`${iconButtonStyles} ${primaryButtonStyles} w-8 h-8`} aria-label="Pause" title="Pause">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1H5zM12 4a1 1 0 00-1 1v10a1 1 0 001 1h1a1 1 0 001-1V5a1 1 0 00-1-1h-1z" clipRule="evenodd"></path></svg>
              </button>
            )}
            <button onClick={onStop} disabled={!isFileLoaded} className={`${iconButtonStyles} ${secondaryButtonStyles} w-8 h-8`} aria-label="Stop" title="Stop">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path></svg>
            </button>
          </div>

          <button onClick={onToggleVisibility} className="text-slate-400 hover:text-white transition-colors" title="Show Full Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>
      </div>

      {/* FULL TOP BAR */}
      <div className={`${hudContainerStyle} ${!isTopBarVisible ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex items-center gap-3 pl-2">
          <button onClick={onExit} className={`${iconButtonStyles} ${secondaryButtonStyles}`} aria-label="Exit to song selection" title="Exit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          <div className="h-8 w-px bg-white/10 mx-1"></div>

          <button
            onClick={onCycleMetronomeMode}
            disabled={!isMetronomeAvailable}
            className={`${iconButtonStyles} ${metronomeMode !== 'off' ? activeToggleButtonStyles : secondaryButtonStyles}`}
            title={`Metronome: ${metronomeMode === 'off' ? 'Off' : metronomeMode === 'beat' ? 'Beat' : metronomeMode === 'bar' ? 'Bar' : 'Drum'}. Click to cycle.`}
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
                      <button onClick={onSetLoopStart} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Set Loop Start to Current Bar">[A]</button>
                      <span className="font-mono text-slate-300 w-14 text-center">Bar {getBarNumber(loopStartMs)}</span>
                      <span className="text-slate-500">-</span>
                      <span className="font-mono text-slate-300 w-14 text-center">Bar {getBarNumber(loopEndMs)}</span>
                      <button onClick={onSetLoopEnd} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Set Loop End to Current Bar">[B]</button>
                      <button onClick={onClearLoop} className="p-1 bg-slate-700 hover:bg-slate-600 rounded font-bold" title="Clear Loop">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>
                  )}
              </div>
          )}
        </div>

        <div className="flex-grow flex flex-col items-center justify-center relative">
          <div className={`hidden md:flex items-center gap-4 rounded-xl px-4 py-1 border border-white/5 shadow-inner bg-black/40`}>
              <OffsetMeter offset={lastHitOffset} perfectWindow={perfectWindow} greatWindow={greatWindow} goodWindow={goodWindow} />
              <div className="h-6 w-px bg-white/10"></div>
              <StatBox label="Accuracy" value={`${liveAccuracy.toFixed(1)}%`} color="text-cyan-300" />
              <div className="h-6 w-px bg-white/10"></div>
              <StatBox label="Combo" value={combo} color="text-white" />
              <div className="h-6 w-px bg-white/10"></div>
              <JudgmentDisplay />
              
              {!isNonStop && waitMode !== 'off' && totalWaitTimeMs !== undefined && (
              <>
                  <div className="h-6 w-px bg-white/10"></div>
                  <StatBox label="Wait Time" value={formatWaitTime(totalWaitTimeMs)} color="text-rose-300" />
              </>
              )}
          </div>
          <button onClick={onToggleVisibility} className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-slate-500 hover:text-white transition-colors" title="Hide Full Menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
          </button>
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
    </div>
  );
};

export default TopBar;
