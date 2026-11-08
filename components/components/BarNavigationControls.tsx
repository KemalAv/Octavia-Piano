

import React from 'react';
import { WaitMode, MetronomeMode } from '../types';

interface BarNavigationControlsProps {
  onNavigate: (direction: 'forward' | 'backward') => void;
  isFileLoaded: boolean;
  waitMode: WaitMode;
  hideControls?: boolean;
  barNavigationMode: MetronomeMode;
}

const BarNavigationControls: React.FC<BarNavigationControlsProps> = ({ onNavigate, isFileLoaded, waitMode, hideControls, barNavigationMode }) => {
  if (!isFileLoaded || waitMode === 'retical' || hideControls) {
    return null;
  }

  const navUnit = barNavigationMode === 'bar' ? 'Bar' : 'Beat';

  return (
    <>
      {/* Backward Button */}
      <button
        className="bar-nav-button left-button z-20"
        onClick={() => onNavigate('backward')}
        aria-label={`Previous ${navUnit}`}
        title={`Previous ${navUnit} (←)`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Forward Button */}
      <button
        className="bar-nav-button right-button z-20"
        onClick={() => onNavigate('forward')}
        aria-label={`Next ${navUnit}`}
        title={`Next ${navUnit} (→)`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
};

export default BarNavigationControls;