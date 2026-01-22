
import React, { useState, useEffect } from 'react';

interface GameOverModalProps {
  isVisible: boolean;
  reason: string;
  onClose: () => void;
  lowDetailMode?: boolean;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ isVisible, reason, onClose, lowDetailMode = false }) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div
        className={`p-8 md:p-10 rounded-xl shadow-2xl text-center max-w-md w-full ring-2 ring-red-500 transform transition-all duration-300 ease-in-out ${lowDetailMode ? 'bg-slate-800' : 'bg-slate-800/80 backdrop-blur-sm'} ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={e => e.stopPropagation()}
        role="document"
      >
        <h2 id="game-over-title" className="text-5xl font-extrabold text-red-400 mb-4 animate-bounce">
          Game Over
        </h2>

        <p className="text-lg text-slate-200 mb-6">
          Your performance in Retical mode was not sufficient to continue. The score will not be saved.
        </p>
        <p className="text-xl text-yellow-300 mb-8 italic">
          {reason}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 shadow-lg"
          aria-label="Close game over message"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
