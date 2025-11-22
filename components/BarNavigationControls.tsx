
import React from 'react';
import { WaitMode } from '../types';

interface BarNavigationControlsProps {
  onNavigate: (direction: 'forward' | 'backward') => void;
  isFileLoaded: boolean;
  waitMode: WaitMode;
  hideControls?: boolean;
}

const BarNavigationControls: React.FC<BarNavigationControlsProps> = ({ onNavigate, isFileLoaded, waitMode, hideControls }) => {
  if (!isFileLoaded || waitMode === 'retical' || hideControls) {
    return null;
  }

  return (
    <>
      {/* Backward Button */}
      <button
        className="bar-nav-button left-button"
        onClick={() => onNavigate('backward')}
        aria-label="Previous Bar"
        title="Previous Bar (←)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Forward Button */}
      <button
        className="bar-nav-button right-button"
        onClick={() => onNavigate('forward')}
        aria-label="Next Bar"
        title="Next Bar (→)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
};

export default BarNavigationControls;
