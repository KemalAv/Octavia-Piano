import React, { useState, useEffect, useRef, memo } from 'react';
import { ExtendedResult, WaitMode, GameSettings, PracticeHand, AppLanguage } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';
import { normalizeYoutubeUrl } from '../utils';
import { translations } from '../translations';

type Mode = 'practice_lenient' | 'practice_strict' | 'autoplay' | 'retical';
type BackingType = 'none' | 'mp3' | 'online';

interface ModeSelectionProps {
    onStartGame: (settings: GameSettings) => void;
    onBack: () => void;
    onOpenSettings?: () => void;
    analysisResult: ExtendedResult | null;
    analysisResultForPreview: ExtendedResult | null;
    fileName: string | null;
    initialTempoBpm: number | null;
    initialPlaybackTempoMultiplier: number;
    onPlaybackTempoMultiplierChange: (multiplier: number) => void;
    backingTrackFile: File | null;
    onBackingTrackFileChange: (file: File | null) => void;
    backingTrackOffset: number;
    onBackingTrackOffsetChange: (offset: number) => void;
    isAudioInputEnabled: boolean;
    midiLink: string | null;
    midiOffset: number | null;
    instrumentMode: 'piano' | 'drum';
    onInstrumentModeChange: (mode: 'piano' | 'drum') => void;
    currentSongAccuracyLevel?: number | null;
    userAverageOffset: number;
    userAudioSyncOffset: number;
    onUserAudioSyncOffsetChange: (offset: number) => void;
    appLanguage?: AppLanguage;
}

const ModeSelection: React.FC<ModeSelectionProps> = memo(({
    onStartGame,
    onBack,
    onOpenSettings,
    analysisResult,
    analysisResultForPreview,
    fileName,
    initialTempoBpm,
    initialPlaybackTempoMultiplier,
    onPlaybackTempoMultiplierChange,
    backingTrackFile,
    onBackingTrackFileChange,
    backingTrackOffset,
    onBackingTrackOffsetChange,
    isAudioInputEnabled,
    midiLink,
    midiOffset,
    instrumentMode,
    onInstrumentModeChange,
    currentSongAccuracyLevel,
    userAverageOffset,
    userAudioSyncOffset,
    onUserAudioSyncOffsetChange,
    appLanguage = 'en',
}) => {
    const t = translations[appLanguage] || translations.en;
    const [selectedMode, setSelectedMode] = useState<Mode>('practice_lenient');
    const [practiceHand, setPracticeHand] = useState<PracticeHand>('both');
    const [accuracyLevel, setAccuracyLevel] = useState<number>(currentSongAccuracyLevel || 5);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        setAccuracyLevel(currentSongAccuracyLevel || 5);
    }, [currentSongAccuracyLevel]);

    const [isNonStop, setIsNonStop] = useState(false);
    const [isHpEnabled, setIsHpEnabled] = useState(true);
    const [backingType, setBackingType] = useState<BackingType>('none');
    const mp3InputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (backingTrackFile) {
            setBackingType('mp3');
        } else if (midiLink) {
            setBackingType('online');
        } else {
            setBackingType('none');
        }
    }, [backingTrackFile, midiLink]);

    useEffect(() => {
        const timer = setTimeout(() => setIsRendered(true), 20);
        return () => clearTimeout(timer);
    }, []);

    const RANKED_TEMPOS = [0.75, 1, 1.25, 1.5];
    const minTempoPercentage = selectedMode === 'retical' ? 75 : 10;
    const maxTempoPercentage = selectedMode === 'retical' ? 150 : 400;

    useEffect(() => {
        if (selectedMode === 'retical') {
            const currentMultiplier = initialPlaybackTempoMultiplier;
            const isRankedValid = RANKED_TEMPOS.some(rate => Math.abs(rate - currentMultiplier) < 0.001);
            if (!isRankedValid) {
                const closest = RANKED_TEMPOS.reduce((prev, curr) =>
                    Math.abs(curr - currentMultiplier) < Math.abs(prev - currentMultiplier) ? curr : prev
                , 1);
                onPlaybackTempoMultiplierChange(closest);
            }
        }
    }, [selectedMode, initialPlaybackTempoMultiplier, onPlaybackTempoMultiplierChange]);

    const handleModeSelect = (mode: Mode) => {
        if (mode === 'retical' && isAudioInputEnabled) return;
        setSelectedMode(mode);
        if (mode === 'retical' || mode === 'autoplay') {
            setAccuracyLevel(currentSongAccuracyLevel || 5);
            setIsNonStop(true);
        } else if (mode === 'practice_lenient' || mode === 'practice_strict') {
            setIsNonStop(false);
        }
    };

    const handleMp3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onBackingTrackFileChange(e.target.files[0]);
        } else {
            onBackingTrackFileChange(null);
        }
    };

    const handleStart = () => {
        let waitMode: WaitMode;
        let noteToleranceMs: number;

        const isEffectivelyNonStop = selectedMode === 'retical' || selectedMode === 'autoplay' || (selectedMode === 'practice_lenient' && isNonStop);
        const finalAccuracyLevel = 5;

        const perfectWindow = 100 + (5 - finalAccuracyLevel) * 20;
        const goodWindow = perfectWindow * 2;

        switch (selectedMode) {
            case 'practice_lenient':
                waitMode = 'rhythm';
                noteToleranceMs = goodWindow;
                break;
            case 'practice_strict':
                waitMode = 'strict';
                noteToleranceMs = 30;
                break;
            case 'autoplay':
                waitMode = 'off';
                noteToleranceMs = goodWindow;
                break;
            case 'retical':
                waitMode = 'retical';
                noteToleranceMs = goodWindow;
                break;
            default:
                waitMode = 'strict';
                noteToleranceMs = 30;
        }

        let backingConfig = undefined;
        if (backingType === 'mp3' && backingTrackFile) {
            backingConfig = {
                type: 'mp3' as const,
                url: URL.createObjectURL(backingTrackFile),
                offsetMs: backingTrackOffset
            };
        } else if (backingType === 'online' && midiLink) {
            const isYoutube = midiLink.includes('youtube.com') || midiLink.includes('youtu.be');
            backingConfig = {
                type: isYoutube ? 'youtube' as const : 'link' as const,
                url: midiLink,
                offsetMs: backingTrackOffset
            };
        }

        onStartGame({
            waitMode,
            playbackTempoMultiplier: initialPlaybackTempoMultiplier,
            practiceHand: (selectedMode === 'practice_lenient' || selectedMode === 'practice_strict') ? practiceHand : 'both',
            noteToleranceMs,
            accuracyLevel: finalAccuracyLevel as any,
            isNonStop: (selectedMode === 'retical' || selectedMode === 'autoplay') ? true : (selectedMode === 'practice_lenient' ? isNonStop : false),
            isHpEnabled: (selectedMode === 'practice_lenient' || selectedMode === 'practice_strict') ? isHpEnabled : true,
            backingTrack: backingConfig,
            instrumentMode,
            isAutoplay: selectedMode === 'autoplay',
        });
    };

    const displayedBpm = initialTempoBpm ? Math.round(initialTempoBpm * initialPlaybackTempoMultiplier) : 'N/A';
    const displayedPlaybackPercentage = Math.round(initialPlaybackTempoMultiplier * 100);
    const isPractice = selectedMode === 'practice_lenient' || selectedMode === 'practice_strict';

    return (
        <div className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col z-40 p-3 md:p-6 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Header Navigation */}
            <header className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-all px-4 py-2 rounded-xl border border-white/10 bg-slate-900/90 hover:bg-slate-800 shadow-md active:scale-95 text-sm font-semibold"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        <span>{t.changeSongBtn}</span>
                    </button>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            {t.gameMode}
                        </h2>
                        {fileName && (
                            <p className="text-xs text-cyan-400 font-semibold truncate max-w-sm md:max-w-md flex items-center gap-1.5 mt-0.5">
                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                                <span>{fileName}</span>
                            </p>
                        )}
                    </div>
                </div>

                {analysisResultForPreview && (
                    <div className="flex items-center">
                        <DifficultyAnalysis analysisResult={analysisResultForPreview} />
                    </div>
                )}
            </header>

            {/* Main Scrollable Configuration Area */}
            <main className="max-w-7xl w-full mx-auto flex-grow overflow-y-auto custom-scrollbar my-4 pr-1 space-y-6 pb-24">
                
                {/* Step 1: Mode Selection Cards */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">1</span>
                        <h3 className="text-lg font-bold text-white tracking-wide">
                            {t.step1Title}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* Mode 1: Lenient Practice */}
                        <div
                            onClick={() => handleModeSelect('practice_lenient')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                selectedMode === 'practice_lenient'
                                    ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
                                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    {/* Sprout / Learning SVG */}
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 20h10"/>
                                            <path d="M10 20c0-4.5 1.5-7 6-8"/>
                                            <path d="M16 12c-4.5 0-7-1.5-8-6 4.5 0 7 1.5 8 6z"/>
                                        </svg>
                                    </div>
                                    {selectedMode === 'practice_lenient' && (
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            {t.activeBadge}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-black text-lg text-emerald-300 mb-1">
                                    {t.lenientPracticeTitle}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    {t.lenientPracticeDesc}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-white/5 text-[11px] font-semibold text-emerald-400/80">
                                {t.lenientBadgeDesc}
                            </div>
                        </div>

                        {/* Mode 2: Strict Practice */}
                        <div
                            onClick={() => handleModeSelect('practice_strict')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                selectedMode === 'practice_strict'
                                    ? 'bg-gradient-to-b from-rose-950/60 to-slate-900/90 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-[1.02]'
                                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    {/* Target / Precision SVG */}
                                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <circle cx="12" cy="12" r="6"/>
                                            <circle cx="12" cy="12" r="2"/>
                                        </svg>
                                    </div>
                                    {selectedMode === 'practice_strict' && (
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                            {t.activeBadge}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-black text-lg text-rose-300 mb-1">
                                    {t.strictPracticeTitle}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    {t.strictPracticeDesc}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-white/5 text-[11px] font-semibold text-rose-400/80">
                                {t.strictBadgeDesc}
                            </div>
                        </div>

                        {/* Mode 3: Ranked Retical */}
                        <div
                            onClick={() => handleModeSelect('retical')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                isAudioInputEnabled 
                                    ? 'opacity-50 cursor-not-allowed bg-slate-900/40 border-slate-800'
                                    : selectedMode === 'retical'
                                        ? 'bg-gradient-to-b from-amber-950/60 to-slate-900/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]'
                                        : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    {/* Trophy SVG */}
                                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                            <path d="M4 22h16"/>
                                            <path d="M10 14.66V17c0 .55-.45 1-1 1H7"/>
                                            <path d="M14 14.66V17c0 .55.45 1 1 1h2"/>
                                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                                        </svg>
                                    </div>
                                    {selectedMode === 'retical' && (
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {t.activeBadge}
                                        </span>
                                    )}
                                </div>
                                <h4 className={`font-black text-lg mb-1 ${isAudioInputEnabled ? 'text-slate-500' : 'text-amber-300'}`}>
                                    {t.reticalModeTitle}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    {t.reticalModeDesc}
                                </p>
                                {isAudioInputEnabled && (
                                    <p className="text-[10px] text-red-400 font-bold">
                                        {t.reticalDisabledMic}
                                    </p>
                                )}
                            </div>
                            <div className="pt-3 border-t border-white/5 text-[11px] font-semibold text-amber-400/80">
                                {t.rankedBadgeDesc}
                            </div>
                        </div>

                        {/* Mode 4: Autoplay Demo */}
                        <div
                            onClick={() => handleModeSelect('autoplay')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                selectedMode === 'autoplay'
                                    ? 'bg-gradient-to-b from-sky-950/60 to-slate-900/90 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.02]'
                                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    {/* Headphones SVG */}
                                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-300">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                                        </svg>
                                    </div>
                                    {selectedMode === 'autoplay' && (
                                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                            {t.activeBadge}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-black text-lg text-sky-300 mb-1">
                                    {t.autoplayTitle}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                    {t.autoplayDesc}
                                </p>
                            </div>
                            <div className="pt-3 border-t border-white/5 text-[11px] font-semibold text-sky-400/80">
                                {t.autoplayBadgeDesc}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Step 2: Streamlined Options */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">2</span>
                        <h3 className="text-lg font-bold text-white tracking-wide">
                            {t.step2Title}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Panel A: Tempo & Hand Selection */}
                        <div className="bg-slate-900/70 p-6 rounded-3xl border border-white/10 space-y-6">
                            
                            {/* Tempo Control */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                        </svg>
                                        <label className="text-sm font-bold text-white">
                                            {t.tempo}
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono">
                                        <span className="text-xl font-black text-cyan-400">
                                            {displayedPlaybackPercentage}%
                                        </span>
                                        {initialTempoBpm && (
                                            <span className="text-xs text-slate-400">
                                                ({displayedBpm} BPM)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {selectedMode === 'retical' ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {RANKED_TEMPOS.map(rate => (
                                                <button
                                                    key={rate}
                                                    onClick={() => onPlaybackTempoMultiplierChange(rate)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                        Math.abs(initialPlaybackTempoMultiplier - rate) < 0.001
                                                            ? 'bg-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20 ring-2 ring-amber-300'
                                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                                    }`}
                                                >
                                                    {rate}x
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-amber-400/90 font-medium">
                                            {t.rankedTempoNotice}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => {
                                                const isAllowed = rate * 100 >= minTempoPercentage && rate * 100 <= maxTempoPercentage;
                                                return (
                                                    <button
                                                        key={rate}
                                                        onClick={() => isAllowed && onPlaybackTempoMultiplierChange(rate)}
                                                        disabled={!isAllowed}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                            initialPlaybackTempoMultiplier === rate
                                                                ? 'bg-cyan-600 text-white shadow-md'
                                                                : isAllowed
                                                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                                    : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {rate}x
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <input
                                            type="range"
                                            min={minTempoPercentage}
                                            max={maxTempoPercentage}
                                            step="1"
                                            value={displayedPlaybackPercentage}
                                            onChange={(e) => onPlaybackTempoMultiplierChange(parseInt(e.target.value, 10) / 100)}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Hand Selection (Only for Practice) */}
                            {isPractice && (
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-3 text-cyan-400">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
                                            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
                                            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
                                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
                                        </svg>
                                        <label className="text-sm font-bold text-white">
                                            {t.handSelection}
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['left', 'right', 'both'] as PracticeHand[]).map(hand => (
                                            <button
                                                key={hand}
                                                onClick={() => setPracticeHand(hand)}
                                                className={`py-2 px-3 text-xs rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                    practiceHand === hand
                                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                }`}
                                            >
                                                <span>{hand === 'left' ? t.leftHand : hand === 'right' ? t.rightHand : t.bothHands}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Assists / Toggles */}
                            {isPractice && (
                                <div className="pt-4 border-t border-white/5 space-y-3">
                                    {selectedMode === 'practice_lenient' && (
                                        <div 
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setIsNonStop(!isNonStop)}
                                            onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setIsNonStop(!isNonStop)}
                                            className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors select-none"
                                        >
                                            <div className="pointer-events-none">
                                                <span className="text-xs font-bold text-slate-200">{t.nonStopMode}</span>
                                                <p className="text-[10px] text-slate-400">{t.nonStopDesc}</p>
                                            </div>
                                            <div className="flex items-center pointer-events-none">
                                                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${isNonStop ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isNonStop ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div 
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsHpEnabled(!isHpEnabled)}
                                        onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setIsHpEnabled(!isHpEnabled)}
                                        className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors select-none"
                                    >
                                        <div className="pointer-events-none">
                                            <span className="text-xs font-bold text-slate-200">{t.enableHp}</span>
                                            <p className="text-[10px] text-slate-400">{t.enableHpDesc}</p>
                                        </div>
                                        <div className="flex items-center pointer-events-none">
                                            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${isHpEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isHpEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Panel B: Backing Track & Sync */}
                        <div className="bg-slate-900/70 p-6 rounded-3xl border border-white/10 space-y-6">
                            
                            {/* Backing Track Selection */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-cyan-400">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18V5l12-2v13"/>
                                        <circle cx="6" cy="18" r="3"/>
                                        <circle cx="18" cy="16" r="3"/>
                                    </svg>
                                    <label className="text-sm font-bold text-white">
                                        {t.backingTrackHeader}
                                    </label>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setBackingType('none')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                            backingType === 'none'
                                                ? 'bg-cyan-600 text-white shadow-md'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {t.backingNone}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBackingType('mp3')}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                            backingType === 'mp3'
                                                ? 'bg-cyan-600 text-white shadow-md'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {t.backingMp3}
                                    </button>
                                    {midiLink && (
                                        <button
                                            type="button"
                                            onClick={() => setBackingType('online')}
                                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                                backingType === 'online'
                                                    ? 'bg-cyan-600 text-white shadow-md'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                        >
                                            {t.backingOnline}
                                        </button>
                                    )}
                                </div>

                                {backingType === 'mp3' && (
                                    <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                                        <input
                                            type="file"
                                            accept="audio/mp3,audio/wav,audio/*"
                                            onChange={handleMp3Upload}
                                            ref={mp3InputRef}
                                            className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                                        />
                                        {backingTrackFile && (
                                            <p className="text-[11px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                                <span>File: {backingTrackFile.name}</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {backingType === 'online' && midiLink && (
                                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                                        <span className="font-semibold text-cyan-400 block mb-1">Streaming Link:</span>
                                        <span className="text-slate-400 truncate block text-[11px]">{normalizeYoutubeUrl(midiLink)}</span>
                                    </div>
                                )}
                            </div>

                            {/* IMPORTANT Notice Box */}
                            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-xs text-amber-200 leading-relaxed space-y-2">
                                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    <span>IMPORTANT:</span>
                                </div>
                                <p>
                                    If your MIDI controller feels delayed, consider adjusting the note offset in settings. Click the icon to go directly to the note offset settings, where you can calibrate it automatically by playing the calibration song. {onOpenSettings && (
                                        <button 
                                            type="button"
                                            onClick={onOpenSettings} 
                                            className="inline-flex items-center justify-center ml-1 p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/40 text-cyan-300 hover:text-white transition-colors align-middle" 
                                            title="Open Settings"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        </button>
                                    )}
                                </p>
                                <p>
                                    If the MP3 is still out of sync, try adjusting the USER MS (Audio Sync) by ±10 ms from the original offset; the goal is to match the backing track with the metronome.{" "}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            let backingConfig = undefined;
                                            if (backingType === 'mp3' && backingTrackFile) {
                                                backingConfig = {
                                                    type: 'mp3' as const,
                                                    url: URL.createObjectURL(backingTrackFile),
                                                    offsetMs: backingTrackOffset
                                                };
                                            } else if (backingType === 'online' && midiLink) {
                                                const isYoutube = midiLink.includes('youtube.com') || midiLink.includes('youtu.be');
                                                backingConfig = {
                                                    type: isYoutube ? 'youtube' as const : 'link' as const,
                                                    url: midiLink,
                                                    offsetMs: backingTrackOffset
                                                };
                                            }
                                            onStartGame({
                                                waitMode: 'off',
                                                playbackTempoMultiplier: initialPlaybackTempoMultiplier,
                                                practiceHand: 'both',
                                                noteToleranceMs: 200,
                                                accuracyLevel: 5,
                                                isNonStop: true,
                                                backingTrack: backingConfig,
                                                instrumentMode,
                                                isCalibrationMode: true
                                            });
                                        }}
                                        className="text-cyan-400 hover:text-white underline font-bold cursor-pointer inline transition-colors"
                                    >
                                        Sync Tuner (STU)
                                    </button>
                                </p>
                            </div>

                            {/* Audio Sync Tuner */}
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-cyan-400">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <label className="text-sm font-bold text-white">
                                            USER MS (Audio Sync)
                                        </label>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono text-cyan-400 font-black text-base tabular-nums">
                                            {userAudioSyncOffset > 0 ? `+${userAudioSyncOffset}` : userAudioSyncOffset}ms
                                        </span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                                            Avg Input: {-userAverageOffset > 0 ? `+${Math.round(-userAverageOffset)}` : Math.round(-userAverageOffset)}ms
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-2">
                                    <button 
                                        type="button"
                                        onClick={() => onUserAudioSyncOffsetChange(userAudioSyncOffset - 10)} 
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                                    >
                                        -10ms
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => onUserAudioSyncOffsetChange(userAudioSyncOffset + 10)} 
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                                    >
                                        +10ms
                                    </button>
                                    {Math.abs(userAverageOffset) < 1000 && (
                                        <button 
                                            type="button"
                                            onClick={() => onUserAudioSyncOffsetChange(Math.round(userAudioSyncOffset - userAverageOffset))} 
                                            className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs px-3 py-1.5 rounded-lg font-semibold ml-auto border border-cyan-500/30 transition-colors"
                                        >
                                            Apply Avg
                                        </button>
                                    )}
                                </div>

                                <input
                                    type="range"
                                    min="-500"
                                    max="500"
                                    step="5"
                                    value={Math.max(-500, Math.min(500, userAudioSyncOffset))}
                                    onChange={(e) => onUserAudioSyncOffsetChange(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />

                                {(midiLink || midiOffset != null) && (
                                    <div className="mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-400 space-y-1">
                                        {midiLink && (
                                            <div className="flex items-start gap-2">
                                                <span className="font-bold text-slate-300 whitespace-nowrap">Default Source:</span>
                                                <a href={midiLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">{normalizeYoutubeUrl(midiLink)}</a>
                                            </div>
                                        )}
                                        {midiOffset != null && (
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-300">Default Offset:</span>
                                                <span className="text-cyan-300 font-mono">{midiOffset > 0 ? `+${midiOffset}` : midiOffset}ms</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>
                </div>

            </main>

            {/* Sticky Bottom Action Bar */}
            <footer className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-cyan-500/30 p-3 md:p-4 backdrop-blur-md shadow-2xl">
                <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
                    
                    {/* Selected Mode Summary */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                            {selectedMode === 'practice_lenient' ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 20h10M10 20c0-4.5 1.5-7 6-8M16 12c-4.5 0-7-1.5-8-6 4.5 0 7 1.5 8 6z"/></svg>
                            ) : selectedMode === 'practice_strict' ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                            ) : selectedMode === 'retical' ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                            )}
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 font-medium">{t.modeReadyLabel}</div>
                            <div className="text-sm md:text-base font-black text-white">
                                {selectedMode === 'practice_lenient' 
                                    ? t.lenientPracticeTitle 
                                    : selectedMode === 'practice_strict' 
                                        ? t.strictPracticeTitle 
                                        : selectedMode === 'retical' 
                                            ? t.reticalModeTitle 
                                            : t.autoplayTitle}
                                <span className="text-xs text-cyan-400 ml-2 font-mono">({displayedPlaybackPercentage}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={handleStart}
                        className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black py-3.5 px-8 md:px-12 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all hover:scale-105 active:scale-95 text-base md:text-lg flex items-center gap-3"
                    >
                        <span>{t.startGameAction}</span>
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                    </button>

                </div>
            </footer>

        </div>
    );
});

export default ModeSelection;
