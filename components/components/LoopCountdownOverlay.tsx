import React, { useEffect, useState, useRef } from "react";
import { Repeat, Play } from "lucide-react";

export interface LoopDelayInfo {
  startTime: number;
  duration: number; // in milliseconds, e.g. 2000
  targetTimeMs: number;
}

export interface BeatCountdownInfo {
  type: 'intro' | 'loop';
  startTimeMs: number;
  targetTimeMs: number;
  beatsInBar: number;
}

interface LoopCountdownOverlayProps {
  loopDelayInfo?: LoopDelayInfo | null;
  countInInfo?: BeatCountdownInfo | null;
  currentMusicalTimeMs?: number;
  getCurrentTimeMs?: () => number;
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
  loopDelayInfo = null,
  countInInfo = null,
  currentMusicalTimeMs = 0,
  getCurrentTimeMs,
}) => {
  const [active, setActive] = useState<boolean>(false);
  const [isEndingState, setIsEndingState] = useState<boolean>(false);

  const timeTextRef = useRef<HTMLSpanElement | null>(null);
  const sublabelRef = useRef<HTMLSpanElement | null>(null);
  const circleRef = useRef<SVGCircleElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const countInInfoRef = useRef(countInInfo);
  countInInfoRef.current = countInInfo;
  const getCurrentTimeMsRef = useRef(getCurrentTimeMs);
  getCurrentTimeMsRef.current = getCurrentTimeMs;
  const currentMusicalTimeMsRef = useRef(currentMusicalTimeMs);
  currentMusicalTimeMsRef.current = currentMusicalTimeMs;

  // Ultra-smooth RAF tick loop for countInInfo (seconds and milliseconds, 60-144fps without stutter)
  useEffect(() => {
    if (!countInInfo) {
      setActive(false);
      setIsEndingState(false);
      return;
    }

    setActive(true);
    setIsEndingState(false);

    let rafId: number;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    const tick = () => {
      const info = countInInfoRef.current;
      if (!info) {
        setActive(false);
        return;
      }

      const nowTime = getCurrentTimeMsRef.current
        ? getCurrentTimeMsRef.current()
        : currentMusicalTimeMsRef.current;

      const { startTimeMs, targetTimeMs } = info;
      const totalDuration = Math.max(1, targetTimeMs - startTimeMs);
      const elapsed = Math.max(0, nowTime - startTimeMs);
      const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
      const remainingMs = Math.max(0, targetTimeMs - nowTime);

      // Outside count-in range by 450ms -> hide
      if (nowTime < startTimeMs - 200 || nowTime > targetTimeMs + 450) {
        setActive(false);
        return;
      }

      const isEnding = nowTime >= targetTimeMs;
      setIsEndingState(isEnding);

      // Smooth direct DOM updates for seconds & milliseconds (60-144fps, zero dropped frames)
      if (timeTextRef.current) {
        if (isEnding) {
          timeTextRef.current.innerText = "GO!";
          timeTextRef.current.className =
            "text-xl font-black text-emerald-300 animate-pulse tracking-wider drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]";
        } else {
          timeTextRef.current.innerText = `${(remainingMs / 1000).toFixed(2)}s`;
          timeTextRef.current.className =
            "text-base font-black text-cyan-200 font-mono tracking-tight tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]";
        }
      }

      if (sublabelRef.current) {
        if (isEnding) {
          sublabelRef.current.innerText = "PLAY!";
          sublabelRef.current.className = "text-[9px] font-black uppercase tracking-wider text-emerald-400 -mt-0.5";
        } else {
          sublabelRef.current.innerText = "READY";
          sublabelRef.current.className = "text-[9px] font-bold uppercase tracking-wider text-cyan-400/80 -mt-0.5";
        }
      }

      if (circleRef.current) {
        const offset = circumference * (1 - progress);
        circleRef.current.style.strokeDashoffset = `${offset}`;
        circleRef.current.style.stroke = isEnding ? "#34d399" : "#22d3ee";
      }

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
        progressBarRef.current.className = `h-full rounded-full ${
          isEnding
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : "bg-gradient-to-r from-cyan-500 to-teal-400"
        }`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [countInInfo]);

  // Legacy loopDelayInfo state if countInInfo is not active
  const [legacyRemainingMs, setLegacyRemainingMs] = useState<number>(0);
  const [legacyProgressRatio, setLegacyProgressRatio] = useState<number>(1);

  useEffect(() => {
    if (!loopDelayInfo || countInInfo) return;

    let rafId: number;

    const update = () => {
      const now = performance.now();
      const elapsed = now - loopDelayInfo.startTime;
      const remaining = Math.max(0, loopDelayInfo.duration - elapsed);
      const ratio = Math.max(0, Math.min(1, remaining / loopDelayInfo.duration));

      setLegacyRemainingMs(remaining);
      setLegacyProgressRatio(ratio);

      if (remaining > 0) {
        rafId = requestAnimationFrame(update);
      }
    };

    update();
    return () => cancelAnimationFrame(rafId);
  }, [loopDelayInfo, countInInfo]);

  // 1. Render Beat/Seconds & Milliseconds Count-in Overlay
  if (countInInfo && active) {
    const { targetTimeMs, type } = countInInfo;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    return (
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={`relative flex items-center gap-4 px-6 py-3 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-150 ${
            isEndingState
              ? "bg-emerald-950/90 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)] scale-105"
              : "bg-slate-900/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
          }`}
        >
          {/* Progress Ring with Seconds and Milliseconds Number */}
          <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-slate-700/60"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                ref={circleRef}
                cx="40"
                cy="40"
                r={radius}
                className={`transition-colors duration-150 ${
                  isEndingState ? "stroke-emerald-400" : "stroke-cyan-400"
                }`}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono select-none">
              <span
                ref={timeTextRef}
                className="text-base font-black text-cyan-200 font-mono tracking-tight tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"
              >
                0.00s
              </span>
              <span
                ref={sublabelRef}
                className="text-[9px] font-bold uppercase tracking-wider text-cyan-400/80 -mt-0.5"
              >
                READY
              </span>
            </div>
          </div>

          {/* Text Details */}
          <div className="flex flex-col pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              {type === "loop" ? (
                <>
                  <Repeat className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Loop Count-In
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 font-mono">
                    Point A: {formatDisplayTime(targetTimeMs)}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                    Song Count-In
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 font-mono">
                    Start: {formatDisplayTime(targetTimeMs)}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              {isEndingState
                ? "Start playing now!"
                : type === "loop"
                  ? "Empty bar • Get ready to play..."
                  : "Lead-in • Get ready to play..."}
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-700/50">
              <div
                ref={progressBarRef}
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
                style={{ width: "0%" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fallback for legacy loopDelayInfo
  if (!loopDelayInfo) return null;

  const secondsDisplay = (legacyRemainingMs / 1000).toFixed(2);
  const isEnding = legacyRemainingMs <= 150;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - legacyProgressRatio);

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
              <span className="text-base font-black text-cyan-200 font-mono tabular-nums">
                {secondsDisplay}s
              </span>
            )}
          </div>
        </div>

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
              style={{ width: `${legacyProgressRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoopCountdownOverlay;
