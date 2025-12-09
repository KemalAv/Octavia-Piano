import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext'; // Import useAuth hook

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onSocial: () => void;
  onOpenLoginModal: () => void;
  onOpenAccountModal: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onSettings, onSocial, onOpenLoginModal, onOpenAccountModal }) => {
  const { session, loading } = useAuth(); // Use the auth hook
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Don't animate if auth is still loading
    if (!loading) {
        const timer = setTimeout(() => setIsRendered(true), 10);
        return () => clearTimeout(timer);
    }
  }, [loading]);

  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg";
  const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
  const secondaryButtonStyle = "bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-400";
  const leaderboardButtonStyle = "bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400";
  const accountButtonStyle = "bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400"; // New style for Account button
  

  const handleAccountClick = () => {
    if (session) {
      onOpenAccountModal();
    } else {
      onOpenLoginModal();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
        <div className="flex items-center space-x-3 p-4 bg-slate-800 rounded-lg shadow-xl text-sky-400 font-semibold text-lg animate-pulse">
          <svg className="animate-spin h-6 w-6 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4 transition-opacity duration-500 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-all duration-500 ease-in-out ${isRendered ? 'scale-100' : 'scale-95'}`}
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
          Piano Rythem Game
        </p>

        <div className="space-y-4">
          <button onClick={onPlay} className={`${buttonBaseStyle} ${primaryButtonStyle}`}>Play</button>
          <button onClick={onSocial} className={`${buttonBaseStyle} ${leaderboardButtonStyle}`}>Social</button>
          <button onClick={onSettings} className={`${buttonBaseStyle} ${secondaryButtonStyle}`}>Settings</button>
          <button onClick={handleAccountClick} className={`${buttonBaseStyle} ${accountButtonStyle}`}>
            {session ? 'My Account' : 'Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;