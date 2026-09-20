import React from "react";
import { Zap } from "lucide-react";

export interface OffsetIndicatorProps {
  // 1. MIDI Hit Timing (Real-time player tap timing vs notes)
  midiHitTiming: number;
  midiHitTimingOffset?: number; // Hitbox calibration shift (noteOffsetMs)
  onMidiHitTimingOffsetChange?: (offset: number) => void;

  // 2. MP3 Offset (Audio backing track sync - kept in props for compatibility)
  mp3Offset?: number;
  onMp3OffsetChange?: (offset: number) => void;

  // 3. Metronome Offset (Metronome click playback offset - kept in props for compatibility)
  metronomePianoOffset?: number;
  onMetronomePianoOffsetChange?: (offset: number) => void;

  // Timing Windows
  perfectWindow: number;
  greatWindow: number;
  goodWindow: number;

  className?: string;
}

export const OffsetIndicator: React.FC<OffsetIndicatorProps> = ({
  midiHitTiming,
  perfectWindow,
  greatWindow,
  goodWindow,
  className = "",
}) => {
  const maxDisplayOffset = 500; // 500ms scale range as requested

  // Position calculations (0% = +500ms Early, 50% = 0ms, 100% = -500ms Late)
  const calcIndicatorPct = (val: number) => {
    const clamped = Math.max(-maxDisplayOffset, Math.min(maxDisplayOffset, val));
    return 50 - (clamped / maxDisplayOffset) * 50;
  };

  const midiPct = calcIndicatorPct(midiHitTiming);

  // Widths of judgment zones
  const pW = (perfectWindow / maxDisplayOffset) * 50;
  const grW = ((greatWindow - perfectWindow) / maxDisplayOffset) * 50;
  const goW = ((goodWindow - greatWindow) / maxDisplayOffset) * 50;
  const miW = 50 - (goodWindow / maxDisplayOffset) * 50;

  const getJudgmentColor = (val: number) => {
    const abs = Math.abs(val);
    if (abs <= perfectWindow) return "text-yellow-400";
    if (abs <= greatWindow) return "text-emerald-400";
    if (abs <= goodWindow) return "text-blue-400";
    return "text-rose-500";
  };

  const getJudgmentText = (val: number) => {
    const abs = Math.abs(val);
    if (abs <= perfectWindow) return "PERFECT";
    if (abs <= greatWindow) return "GREAT";
    if (abs <= goodWindow) return "GOOD";
    return "MISS";
  };

  const displayMs = Math.round(midiHitTiming);

  return (
    <div
      className={`relative z-30 flex flex-col items-center select-none ${className}`}
      role="region"
      aria-label="Player Timing Offset Meter"
    >
      <div className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-md shadow-xl flex flex-col items-center gap-1 w-[220px]">
        {/* Slim Header: Centered Offset Number */}
        <div className="w-full flex justify-center">
          <span className={`font-mono font-black text-[11px] ${getJudgmentColor(midiHitTiming)} drop-shadow-[0_0_8px_currentColor] tracking-wide`}>
            {displayMs > 0 ? `+${displayMs}` : displayMs}ms
          </span>
        </div>

        {/* Slim Timing Bar Gauge */}
        <div className="relative w-full h-1.5 flex items-center rounded-full overflow-hidden bg-black/40 shadow-inner">
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

          {/* Timing Needle */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] -translate-x-1/2 transition-all duration-75 z-20"
            style={{ left: `${midiPct}%` }}
          >
            <div className="absolute -top-0.5 -bottom-0.5 left-1/2 -translate-x-1/2 w-1 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Slim Legend with +500 and -500ms */}
        <div className="w-full flex justify-between text-[7px] font-black text-white uppercase tracking-widest px-0.5">
          <span className="text-white">+500ms</span>
          <span className="text-white">-500ms</span>
        </div>
      </div>
    </div>
  );
};

export default OffsetIndicator;
