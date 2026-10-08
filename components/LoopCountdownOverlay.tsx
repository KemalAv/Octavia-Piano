import React, { useEffect, useState } from "react";
import { Repeat } from "lucide-react";

export interface LoopDelayInfo {
  startTime: number;
  duration: number; // in milliseconds, e.g. 2000
  targetTimeMs: number;
}

interface LoopCountdownOverlayProps {
  loopDelayInfo: LoopDelayInfo | null;
}

const formatDisplayTime = (ms: number | null) => {
  if (ms === null || isNaN(ms) || ms < 0) return "00:00.0";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  const formattedSeconds = Number(seconds) < 10 ? `0${seconds}` : seconds;
  return `${String(minutes).padStart(2, "0")}:${formattedSeconds}`;
};

export const LoopCountdownOverlay: React.FC<LoopCountdownOverlayProps> = ({
  loopDelayInfo,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [progressRatio, setProgressRatio] = useState<number>(1);

  useEffect(() => {
    if (!loopDelayInfo) return;

    let rafId: number;

    const update = () => {
      const now = performance.now();
      const elapsed = now - loopDelayInfo.startTime;
      const remaining = Math.max(0, loopDelayInfo.duration - elapsed);
      const ratio = Math.max(0, Math.min(1, remaining / loopDelayInfo.duration));

      setRemainingMs(remaining);
      setProgressRatio(ratio);

      if (remaining > 0) {
        rafId = requestAnimationFrame(update);
      }
    };

    update();
    return () => cancelAnimationFrame(rafId);
  }, [loopDelayInfo]);

  if (!loopDelayInfo) return null;

  const secondsDisplay = (remainingMs / 1000).toFixed(1);
  const isEnding = remainingMs <= 300;

  // Circular stroke calculation for radius 32 (circumference = 2 * PI * 32 ~ 201)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div
      className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex flex-col items-center"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`relative flex items-center gap-4 px-6 py-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-200 ${
          isEnding
            ? "bg-cyan-950/90 border-cyan-400 shadow-[0_0_35px_rgba(34,211,238,0.6)] scale-105"
            : "bg-slate-900/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
        }`}
      >
        {/* Progress Ring with Countdown Number */}
        <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 76 76">
            <circle
              cx="38"
              cy="38"
              r={radius}
              className="stroke-slate-700/60"
              strokeWidth="5"
              fill="transparent"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              className={`transition-all duration-75 ${
                isEnding ? "stroke-cyan-300" : "stroke-cyan-400"
              }`}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
            {isEnding ? (
              <span className="text-sm font-black text-cyan-300 animate-pulse tracking-wider">
                GO!
              </span>
            ) : (
              <span className="text-base font-black text-cyan-200">
                {secondsDisplay}s
              </span>
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="flex flex-col pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <Repeat className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Repeat Loop
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
              Point A: {formatDisplayTime(loopDelayInfo.targetTimeMs)}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {isEnding ? "Start playing now!" : "Get ready to play..."}
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-75 rounded-full"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoopCountdownOverlay;
