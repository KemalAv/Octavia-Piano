

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ProgressBarProps {
  currentTimeMs: number;
  totalDurationMs: number;
  width: number;
  height: number;
  onSeek: (newTimeMs: number) => void;
  isPlaybackActive: boolean;
  isSeekingDisabled?: boolean;
  loopStartMs: number | null;
  loopEndMs: number | null;
  barLines?: number[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTimeMs,
  totalDurationMs,
  width,
  height,
  onSeek,
  isPlaybackActive,
  isSeekingDisabled,
  loopStartMs,
  loopEndMs,
  barLines = [],
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs to always access the latest props/callbacks within stable event handlers
  const onSeekRef = useRef(onSeek);
  const totalDurationMsRef = useRef(totalDurationMs);
  const currentTimeMsRef = useRef(currentTimeMs);

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  useEffect(() => {
    totalDurationMsRef.current = totalDurationMs;
  }, [totalDurationMs]);

  useEffect(() => {
    currentTimeMsRef.current = currentTimeMs;
  }, [currentTimeMs]);


  const progressPercent = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const loopStartPercent = totalDurationMs > 0 && loopStartMs != null ? (loopStartMs / totalDurationMs) * 100 : 0;
  const loopEndPercent = totalDurationMs > 0 && loopEndMs != null ? (loopEndMs / totalDurationMs) * 100 : 0;
  const loopWidthPercent = (loopStartMs != null && loopEndMs != null && loopEndPercent > loopStartPercent) ? loopEndPercent - loopStartPercent : 0;

  const calculateTimeFromClientX = useCallback((clientX: number): number => {
    if (!progressBarRef.current || totalDurationMsRef.current <= 0) return currentTimeMsRef.current;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const progressRatio = Math.max(0, Math.min(1, clickX / rect.width));
    return progressRatio * totalDurationMsRef.current;
  }, []); // Empty dependencies: this callback is stable

  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []); // Empty dependencies: this callback is stable

  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    event.preventDefault(); // Prevent text selection etc.
    onSeekRef.current(calculateTimeFromClientX(event.clientX));
  }, [calculateTimeFromClientX]); // calculateTimeFromClientX is stable due to its own empty deps

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (totalDurationMsRef.current <= 0 || isSeekingDisabled) return;
    event.preventDefault(); // Prevent default browser behavior (e.g., text selection)
    setIsDragging(true);
    onSeekRef.current(calculateTimeFromClientX(event.clientX));
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [calculateTimeFromClientX, isSeekingDisabled, handleGlobalMouseMove, handleGlobalMouseUp]); // Depend on stable handlers and isSeekingDisabled

  const handleGlobalTouchEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    document.removeEventListener('touchend', handleGlobalTouchEnd);
    document.removeEventListener('touchcancel', handleGlobalTouchEnd);
  }, []); // Empty dependencies: this callback is stable

  const handleGlobalTouchMove = useCallback((event: TouchEvent) => {
    if (event.touches.length === 0) return;
    event.preventDefault(); // Prevent scrolling
    onSeekRef.current(calculateTimeFromClientX(event.touches[0].clientX));
  }, [calculateTimeFromClientX]); // calculateTimeFromClientX is stable due to its own empty deps

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (totalDurationMsRef.current <= 0 || event.touches.length === 0 || isSeekingDisabled) return;
    event.preventDefault(); // Prevent scrolling
    setIsDragging(true);
    onSeekRef.current(calculateTimeFromClientX(event.touches[0].clientX));
    
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);
    document.addEventListener('touchcancel', handleGlobalTouchEnd); // Handle touch interruption
  }, [calculateTimeFromClientX, isSeekingDisabled, handleGlobalTouchMove, handleGlobalTouchEnd]); // Depend on stable handlers and isSeekingDisabled

  // Cleanup global listeners if component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp, handleGlobalTouchMove, handleGlobalTouchEnd]); // Depend on stable handlers for cleanup

  const barStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    margin: '0 auto',
    cursor: !isSeekingDisabled && totalDurationMs > 0 ? (isDragging ? 'grabbing' : 'pointer') : 'default',
  };

  const fillStyle: React.CSSProperties = {
    width: `${clampedProgress}%`,
    // If playing or dragging, make it instant. Otherwise, a small transition for non-playing seeks.
    transition: (isPlaybackActive || isDragging) ? 'none' : 'width 0.1s ease-out',
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (totalDurationMs <= 0 || isSeekingDisabled) return;
    let newTime = currentTimeMs;
    const jumpAmountSmall = totalDurationMs * 0.01; // 1% jump for fine control
    const jumpAmountLarge = totalDurationMs * 0.05; // 5% jump

    let jumpAmount = e.shiftKey ? jumpAmountLarge : jumpAmountSmall;

    let seeked = true;
    if (e.key === 'ArrowLeft') {
      newTime = Math.max(0, currentTimeMs - jumpAmount);
    } else if (e.key === 'ArrowRight') {
      newTime = Math.min(totalDurationMs, currentTimeMs + jumpAmount);
    } else if (e.key === 'Home') {
      newTime = 0;
    } else if (e.key === 'End') {
      newTime = totalDurationMs;
    } else {
      seeked = false;
    }
    if(seeked){
        e.preventDefault();
        onSeekRef.current(newTime); // Use ref for onSeek
    }
  };

  const barMarkers = React.useMemo(() => {
    if (totalDurationMs <= 0 || !barLines.length) return null;
    return barLines.map((barTimeMs, index) => {
      const barPercent = (barTimeMs / totalDurationMs) * 100;
      if (barPercent < 0 || barPercent > 100) return null;
      return (
        <div
          key={`bar-${index}`}
          className="absolute top-0 w-[1px] h-full bg-white/40 pointer-events-none"
          style={{ left: `${barPercent}%` }}
        />
      );
    });
  }, [barLines, totalDurationMs]);

  return (
    <div
      ref={progressBarRef}
      className="bg-slate-700 relative touch-none" // Added touch-none to prevent scrolling on touch devices during drag
      style={barStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-valuenow={currentTimeMs}
      aria-valuemin={0}
      aria-valuemax={totalDurationMs}
      aria-orientation="horizontal"
      aria-label={`MIDI playback progress. ${isSeekingDisabled ? 'Seeking is disabled in this mode.' : ''}`}
      tabIndex={!isSeekingDisabled && totalDurationMs > 0 ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      {loopWidthPercent > 0 && (
        <div
            className="absolute top-0 h-full bg-cyan-500/30"
            style={{
                left: `${loopStartPercent}%`,
                width: `${loopWidthPercent}%`,
            }}
            aria-hidden="true"
        />
      )}
      <div
        className="bg-lime-500 absolute top-0 left-0 h-full"
        style={fillStyle}
      />
      {barMarkers}
    </div>
  );
};

export default React.memo(ProgressBar);