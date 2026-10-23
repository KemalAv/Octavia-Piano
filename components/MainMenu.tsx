import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import { Screen, AppLanguage } from '../types';
import { translations } from '../translations';

interface MainMenuProps {
  onPlay: () => void;
  onLearnMode: () => void;
  onSettings: () => void;
  onSocial: () => void;
  onOpenLoginModal: () => void;
  onOpenAccountModal: () => void;
  onNavigate: (screen: Screen) => void;
  instrumentMode: 'piano' | 'drum';
  onInstrumentModeChange: (mode: 'piano' | 'drum') => void;
  appLanguage?: AppLanguage;
}

const MainMenu: React.FC<MainMenuProps> = memo(({
  onPlay,
  onLearnMode,
  onSettings,
  onSocial,
  onOpenLoginModal,
  onOpenAccountModal,
  onNavigate,
  instrumentMode,
  onInstrumentModeChange,
  appLanguage = 'en'
}) => {
  const t = translations[appLanguage] || translations.en;
  const { session, user, loading } = useAuth();
  const [isRendered, setIsRendered] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfileUsername(null);
      return;
    }

    let isMounted = true;
    const fetchUsername = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (isMounted && data?.username) {
          setProfileUsername(data.username);
        }
      } catch (err) {
        console.warn('Failed to fetch profile username for MainMenu:', err);
      }
    };

    fetchUsername();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const displayName = profileUsername ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email?.split('@')[0] ||
    t.profile;

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsRendered(true), 20);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleAccountClick = () => {
    if (session) {
      onOpenAccountModal();
    } else {
      onOpenLoginModal();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4">
        <div className="flex items-center space-x-3 px-6 py-4 bg-slate-900/90 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.2)] border border-cyan-500/30 text-cyan-400 font-semibold text-lg animate-pulse backdrop-blur-md">
          <svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t.systemLoading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/85 to-slate-950/95 flex flex-col justify-between z-50 p-4 md:p-8 overflow-y-auto custom-scrollbar transition-opacity duration-500 ease-in-out backdrop-blur-sm ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 py-2 border-b border-white/10 pb-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => onNavigate('mainMenu')}>
            <img 
              src="/octavia.png" 
              alt="Octavia" 
              className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-transform group-hover:scale-105" 
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-cyan-400 tracking-wider">
              OCTAVIA
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {instrumentMode === 'piano' ? t.pianoRhythmGame : t.drumRhythmGame}
            </p>
          </div>
        </div>

        {/* Center: Instrument Switcher with SVGs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner">
          <button 
            onClick={() => onInstrumentModeChange('piano')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              instrumentMode === 'piano' 
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {/* Piano Keys SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              <path d="M6 4v9a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4"/>
              <path d="M10 4v9a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4"/>
              <path d="M15 4v9a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V4"/>
            </svg>
            <span>PIANO</span>
          </button>
          <button 
            onClick={() => onInstrumentModeChange('drum')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
              instrumentMode === 'drum' 
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {/* Drum Kit SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="9" rx="8" ry="4"/>
              <path d="M4 9v6c0 2.21 3.58 4 8 4s8-1.79 8-4V9"/>
              <path d="M6 4l4 4"/>
              <path d="M18 4l-4 4"/>
            </svg>
            <span>DRUM</span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-extrabold border border-amber-400/30">
              BETA
            </span>
          </button>
        </div>

        {/* Right: Info, Settings, and User Profile */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('about')}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all shadow-md active:scale-95"
            title={t.about}
          >
            {/* Info Circle SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>

          <button 
            onClick={onSettings}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-all shadow-md active:scale-95"
            title={t.settings}
          >
            {/* Settings Gear SVG */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button 
            onClick={handleAccountClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all shadow-md active:scale-95 ${
              session 
                ? 'bg-slate-800/90 text-slate-200 border-white/10 hover:border-cyan-400/50' 
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border-orange-400/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
            }`}
          >
            {/* User Avatar / Key SVG */}
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {session ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-1.5 1.5L14 9l-3 3-3-3 2-2 1.5-1.5L13 4l4-2z"/>
                  <circle cx="7.5" cy="16.5" r="4.5"/>
                </svg>
              )}
            </div>
            <span>{session ? displayName : t.login}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Hero & Navigation Cards */}
      <main className="max-w-6xl w-full mx-auto my-auto py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            {instrumentMode === 'piano' ? t.pianoRhythmGame : t.drumRhythmGame}
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            {instrumentMode === 'piano' ? t.heroDescPiano : t.heroDescDrum}
          </p>
        </div>

        {/* 4 Cards Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Play Songs (Featured) */}
          <div 
            role="button"
            onClick={onPlay}
            className="group relative bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-900/90 p-6 rounded-3xl border border-cyan-500/30 hover:border-cyan-400 shadow-xl hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-5 group-hover:scale-110 transition-transform">
                {/* Music Note SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {t.featuredBadge}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors mb-2">
                {t.playNow}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t.playCardDesc}
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-cyan-400 font-bold text-sm">
              <span>{t.browseSongsBtn}</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </div>
          </div>

          {/* Card 2: Learn Mode */}
          {instrumentMode === 'drum' ? (
            <div 
              className="relative bg-slate-900/50 p-6 rounded-3xl border border-white/5 opacity-60 cursor-not-allowed flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-5">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {t.comingSoon}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-400 mb-2">
                  {t.learnMode}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t.learnCardDrumDesc}
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 text-slate-600 font-bold text-sm">
                <span>{t.comingSoon}</span>
              </div>
            </div>
          ) : (
            <div 
              role="button"
              onClick={onLearnMode}
              className="group relative bg-gradient-to-b from-violet-950/40 via-slate-900/90 to-slate-900/90 p-6 rounded-3xl border border-violet-500/30 hover:border-violet-400 shadow-xl hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 mb-5 group-hover:scale-110 transition-transform">
                  {/* Book Open SVG */}
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {t.lessonBadge}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white group-hover:text-violet-300 transition-colors mb-2">
                  {t.learnMode}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  {t.learnCardDesc}
                </p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-violet-400 font-bold text-sm">
                <span>{t.startLearningBtn}</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Card 3: Leaderboard & Social */}
          <div 
            role="button"
            onClick={onSocial}
            className="group relative bg-gradient-to-b from-emerald-950/40 via-slate-900/90 to-slate-900/90 p-6 rounded-3xl border border-emerald-500/30 hover:border-emerald-400 shadow-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mb-5 group-hover:scale-110 transition-transform">
                {/* Trophy SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7"/>
                  <path d="M14 14.66V17c0 .55.45 1 1 1h2"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t.rankedBadge}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition-colors mb-2">
                {t.social}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t.socialCardDesc}
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-emerald-400 font-bold text-sm">
              <span>{t.viewLeaderboardBtn}</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </div>
          </div>

          {/* Card 4: Hardware Setup Guide */}
          <div 
            role="button"
            onClick={() => onNavigate('howToConnect')}
            className="group relative bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-900/90 p-6 rounded-3xl border border-amber-500/30 hover:border-amber-400 shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-5 group-hover:scale-110 transition-transform">
                {/* Cable / USB Plug SVG */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v6"/>
                  <path d="M9 2h6"/>
                  <rect x="7" y="8" width="10" height="8" rx="2"/>
                  <path d="M12 16v6"/>
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t.setupBadge}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white group-hover:text-amber-300 transition-colors mb-2">
                {t.howToConnect}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t.howToConnectDesc}
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-amber-400 font-bold text-sm">
              <span>{t.openGuideBtn}</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </div>
          </div>

        </div>

      </main>



    </div>
  );
});

export default MainMenu;
