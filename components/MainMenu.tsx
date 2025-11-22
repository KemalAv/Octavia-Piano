
import React from 'react';

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onQuit: () => void;
  quitMessageVisible: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onSettings, onQuit, quitMessageVisible }) => {
  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg";
  const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
  const secondaryButtonStyle = "bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-400";
  const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500 text-base py-2";

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div 
        className="bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{
          boxShadow: '0 0 40px rgba(34, 211, 238, 0.2), 0 0 80px rgba(139, 92, 246, 0.15)'
        }}
      >
        <img 
          src="/octavia.png" 
          alt="Octavia logo or character" 
          className="mx-auto h-48 w-auto object-contain mb-6" 
        />
        <h1 className="text-5xl sm:text-6xl font-extrabold text-cyan-400 mb-3 tracking-tight"
          style={{ textShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}
        >
          Octavia
        </h1>
        <p className="text-lg text-slate-300 mb-10">
          Your Interactive Piano Companion
        </p>

        {!quitMessageVisible ? (
          <div className="space-y-5">
            <button
              onClick={onPlay}
              className={`${buttonBaseStyle} ${primaryButtonStyle}`}
              aria-label="Play and start the application"
            >
              Play
            </button>
             <button
              onClick={onSettings}
              className={`${buttonBaseStyle} ${secondaryButtonStyle}`}
              aria-label="Open settings menu"
            >
              Settings
            </button>
            <button
              onClick={onQuit}
              className={`${buttonBaseStyle} ${tertiaryButtonStyle}`}
              aria-label="Show quit message"
            >
              Quit
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xl text-slate-200 mb-6">
              Thanks for playing Octavia!
              <br />
              You can close this browser tab.
            </p>
             <button
              onClick={onPlay}
              disabled 
              className="w-full bg-cyan-800 text-slate-500 font-bold py-3 px-6 rounded-lg text-xl cursor-not-allowed"
              aria-label="Play button (disabled)"
            >
              Play
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
