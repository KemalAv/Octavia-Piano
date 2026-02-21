

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext'; // Import useAuth hook
import { Screen } from '../types';

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
  onSocial: () => void;
  onOpenLoginModal: () => void;
  onOpenAccountModal: () => void;
  onNavigate: (screen: Screen) => void;
  instrumentMode: 'piano' | 'drum';
  onInstrumentModeChange: (mode: 'piano' | 'drum') => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
  onPlay, 
  onSettings, 
  onSocial, 
  onOpenLoginModal, 
  onOpenAccountModal, 
  onNavigate,
  instrumentMode,
  onInstrumentModeChange
}) => {
  const { session, loading } = useAuth(); // Use the auth hook
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Don't animate if auth is still loading
    if (!loading) {
        const timer = setTimeout(() => setIsRendered(true), 10);
        return () => clearTimeout(timer);
    }
  }, [loading]);

  const buttonBaseStyle = "w-full font-bold py-4 px-6 rounded-xl text-xl transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg border-2 border-transparent relative overflow-hidden group";
  
  const primaryButtonStyle = "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/30 shadow-cyan-500/20";
  const secondaryButtonStyle = "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500 shadow-black/30";
  const leaderboardButtonStyle = "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-emerald-500/20";
  const accountButtonStyle = "bg-orange-600 hover:bg-orange-500 text-white border-orange-400/30 shadow-orange-500/20"; 
  

  const handleAccountClick = () => {
    if (session) {
      onOpenAccountModal();
    } else {
      onOpenLoginModal();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
        <div className="flex items-center space-x-3 p-4 bg-slate-900 rounded-lg shadow-[0_0_20px_rgba(56,189,248,0.3)] border border-cyan-500/30 text-cyan-400 font-semibold text-lg animate-pulse">
          <svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>System Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-slate-950/60 flex flex-col items-center justify-center z-50 p-4 transition-opacity duration-500 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
      
      <div 
        className={`relative z-10 p-8 md:p-12 rounded-2xl shadow-2xl text-center max-w-md w-full border border-white/10 max-h-[85vh] overflow-y-auto custom-scrollbar transform transition-all duration-500 ease-in-out bg-slate-900/80 ${isRendered ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        style={{
          boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)'
        }}
      >
        <div className="mb-10 relative">
            <div className="absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full opacity-50 animate-pulse"></div>
            <img 
            src="/octavia.png" 
            alt="Octavia" 
            className="relative mx-auto h-40 w-auto object-contain mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
            />
            <h1 className="text-6xl font-black text-cyan-400 mb-2 tracking-tighter filter drop-shadow-lg">
            OCTAVIA
            </h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase font-semibold">
              {instrumentMode === 'piano' ? 'Piano Rhythm Game' : 'Drum Rhythm Game'}
            </p>
        </div>

        <div className="space-y-4">
          {/* Instrument Mode Selector */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-white/5 mb-4">
            <button 
              onClick={() => onInstrumentModeChange('piano')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${instrumentMode === 'piano' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              PIANO
            </button>
            <button 
              onClick={() => onInstrumentModeChange('drum')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${instrumentMode === 'drum' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              DRUM (BETA)
            </button>
          </div>

          <button onClick={onPlay} className={`${buttonBaseStyle} ${primaryButtonStyle}`}>
            <span className="relative z-10">PLAY NOW</span>
          </button>
          
          <button onClick={onSocial} className={`${buttonBaseStyle} ${leaderboardButtonStyle}`}>
            <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                SOCIAL
            </span>
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={onSettings} className={`${buttonBaseStyle} ${secondaryButtonStyle} text-base py-3`}>
                SETTINGS
            </button>
            <button onClick={handleAccountClick} className={`${buttonBaseStyle} ${accountButtonStyle} text-base py-3`}>
                {session ? 'PROFILE' : 'LOGIN'}
            </button>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 mb-2">v1.0.6 &bull; Created by Kemal Av</p>
            <div className="flex justify-center gap-4 text-xs text-slate-400 flex-wrap">
                <button onClick={() => onNavigate('howToConnect')} className="hover:text-cyan-400 transition-colors">How to Connect</button>
                <button onClick={() => onNavigate('about')} className="hover:text-cyan-400 transition-colors">About</button>
                <button onClick={() => onNavigate('contact')} className="hover:text-cyan-400 transition-colors">Contact</button>
                <button onClick={() => onNavigate('privacy')} className="hover:text-cyan-400 transition-colors">Privacy</button>
                <button onClick={() => onNavigate('disclaimer')} className="hover:text-cyan-400 transition-colors">Disclaimer</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;