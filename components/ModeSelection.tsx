import React, { useState, useEffect, useRef } from 'react';
import { ExtendedResult, WaitMode, GameSettings, PracticeHand } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';

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
}

const tutorials = [
    { title: 'Sheet Music', url: 'https://youtu.be/yltCkCy1DeM' },
    { title: 'Music Theory', url: 'https://youtu.be/_VvKeiwddPI' },
    { title: 'Scales', url: 'https://youtu.be/1OPWJ4WOuLU' },
    { title: 'Chord', url: 'https://youtu.be/EMj0LrMQDKs' },
    { title: 'Hand Placement', url: 'https://youtu.be/dQECPiWpULE?si=kFkWWS6exkVpbSOU' },
    { title: 'Only for Nerds', url: 'https://youtu.be/Yv-W4ezHvH0' },
    { title: 'Computer Keyboard', url: 'https://youtu.be/LM-aAcYtKg4?si=OPPsWYQvFbTYt3ww' },
];

const ModeSelection: React.FC<ModeSelectionProps> = ({
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
}) => {
    const [selectedMode, setSelectedMode] = useState<Mode>('practice_lenient');
    const [practiceHand, setPracticeHand] = useState<PracticeHand>('both');
    const [accuracyLevel, setAccuracyLevel] = useState<number>(currentSongAccuracyLevel || 5);
    const [noteToleranceMs, setNoteToleranceMs] = useState(150);
    const [isRendered, setIsRendered] = useState(false);
    const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
    const [isTutorialModalRendered, setIsTutorialModalRendered] = useState(false);
    const [isNonStop, setIsNonStop] = useState(false);

    const [isEditingOffset, setIsEditingOffset] = useState(false);

    const [backingType, setBackingType] = useState<BackingType>('none');
    const mp3InputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (backingTrackFile) {
            setBackingType('mp3');
        } else if (midiLink) {
            setBackingType('online');
        }
    }, [backingTrackFile, midiLink]);

    useEffect(() => {
        const timer = setTimeout(() => setIsRendered(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isTutorialModalOpen) {
            const timer = setTimeout(() => setIsTutorialModalRendered(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsTutorialModalRendered(false);
        }
    }, [isTutorialModalOpen]);

    const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg";
    const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
    const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";

    const modeButtonBase = "p-4 rounded-lg border-2 transition-all cursor-pointer h-full flex flex-col";
    const modeButtonUnselected = "bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500";

    const minTempoPercentage = selectedMode === 'retical' ? 75 : 10;
    const maxTempoPercentage = selectedMode === 'retical' ? 150 : 400;

    useEffect(() => {
        if (selectedMode === 'retical') {
            const currentMultiplier = initialPlaybackTempoMultiplier;
            const minAllowed = minTempoPercentage / 100;
            const maxAllowed = maxTempoPercentage / 100;

            if (currentMultiplier < minAllowed || currentMultiplier > maxAllowed) {
                const newMultiplier = Math.max(minAllowed, Math.min(maxAllowed, currentMultiplier));
                if (newMultiplier !== currentMultiplier) {
                    onPlaybackTempoMultiplierChange(newMultiplier);
                }
            }
        }
    }, [selectedMode, initialPlaybackTempoMultiplier, onPlaybackTempoMultiplierChange, minTempoPercentage, maxTempoPercentage]);

    const handleModeSelect = (mode: Mode) => {
        if (mode === 'retical' && isAudioInputEnabled) return;
        setSelectedMode(mode);
        
        // Reset accuracy level to song default when switching modes, 
        // especially to ensure Retical mode uses the song's preset
        if (mode === 'retical') {
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
        let tolerance: number;

        switch (selectedMode) {
            case 'practice_lenient':
                waitMode = 'rhythm';
                tolerance = noteToleranceMs;
                break;
            case 'practice_strict':
                waitMode = 'strict';
                tolerance = noteToleranceMs;
                break;
            case 'autoplay':
                waitMode = 'off';
                // Auto mode tolerance: 200ms for piano, 100ms for drum (matching retical mode)
                tolerance = instrumentMode === 'drum' ? 100 : 200;
                break;
            case 'retical':
                waitMode = 'retical';
                tolerance = noteToleranceMs;
                break;
            default:
                waitMode = 'strict';
                tolerance = 30;
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

        const finalAccuracyLevel = (selectedMode === 'practice_lenient' || selectedMode === 'practice_strict') 
            ? accuracyLevel 
            : (currentSongAccuracyLevel || 5);

        const perfectWindow = 100 + (5 - finalAccuracyLevel) * 20;
        const goodWindow = perfectWindow * 2;

        onStartGame({
            waitMode,
            playbackTempoMultiplier: initialPlaybackTempoMultiplier,
            practiceHand: (selectedMode === 'practice_lenient' || selectedMode === 'practice_strict') ? practiceHand : 'both',
            noteToleranceMs: selectedMode === 'practice_strict' ? 30 : goodWindow,
            accuracyLevel: finalAccuracyLevel as any,
            isNonStop: selectedMode === 'retical' ? true : (selectedMode === 'practice_lenient' ? isNonStop : false),
            backingTrack: backingConfig,
            instrumentMode, // NEW
        });
    };

    const displayedBpm = initialTempoBpm ? Math.round(initialTempoBpm * initialPlaybackTempoMultiplier) : 'N/A';
    const displayedPlaybackPercentage = Math.round(initialPlaybackTempoMultiplier * 100);
    const isPractice = selectedMode === 'practice_lenient' || selectedMode === 'practice_strict';

    const handleOffsetInputBlur = (value: string) => {
        const val = parseInt(value, 10);
        if (!isNaN(val)) {
            onBackingTrackOffsetChange(val + (midiOffset || 0));
        }
        setIsEditingOffset(false);
    };

    const getYoutubeId = (url: string) => {
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        return '';
    };

    return (
        <>
            <div className={`fixed inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-40 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute top-4 left-4" style={{ zIndex: 9999 }}>
                    <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to MIDIs</button>
                </div>
                <div className={`bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl max-w-5xl w-full ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-in-out ${isRendered ? 'scale-100' : 'scale-95'}`}>
                    <div className="text-center mb-6">
                        <h2 className="text-4xl font-bold text-cyan-400 mb-2">Game Mode</h2>
                        {fileName && <p className="text-lg text-slate-300 truncate">{fileName}</p>}
                        {analysisResultForPreview && <div className="mt-2 flex justify-center"><DifficultyAnalysis analysisResult={analysisResultForPreview} /></div>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div
                            onClick={() => handleModeSelect('practice_lenient')}
                            className={`${modeButtonBase} ${selectedMode === 'practice_lenient' ? 'bg-emerald-600/80 border-emerald-400 shadow-lg scale-105 ring-2 ring-emerald-400' : modeButtonUnselected}`}
                        >
                            <h3 className="font-bold text-xl mb-1 text-emerald-300">Lenient Practice</h3>
                            <p className="text-sm text-slate-300 flex-grow">The song plays continuously, but will pause if you don't play a key.</p>
                        </div>

                        <div
                            onClick={() => handleModeSelect('practice_strict')}
                            className={`${modeButtonBase} ${selectedMode === 'practice_strict' ? 'bg-rose-600/80 border-rose-400 shadow-lg scale-105 ring-2 ring-rose-400' : modeButtonUnselected}`}
                        >
                            <h3 className="font-bold text-xl mb-1 text-rose-300">Strict Practice</h3>
                            <p className="text-sm text-slate-300 flex-grow">The song pauses and waits for you to play the correct notes.</p>
                        </div>

                        <div
                            onClick={() => handleModeSelect('autoplay')}
                            className={`${modeButtonBase} ${selectedMode === 'autoplay' ? 'bg-sky-600/80 border-sky-400 shadow-lg scale-105 ring-2 ring-sky-400' : modeButtonUnselected}`}
                        >
                            <h3 className="font-bold text-xl mb-1 text-sky-300">Autoplay</h3>
                            <p className="text-sm text-slate-300 flex-grow">Sit back and listen. The song will play itself automatically.</p>
                        </div>

                        <div
                            onClick={() => handleModeSelect('retical')}
                            className={`${modeButtonBase} ${isAudioInputEnabled
                                ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-700'
                                : selectedMode === 'retical'
                                    ? 'bg-amber-600/80 border-amber-400 shadow-lg scale-105 ring-2 ring-amber-400'
                                    : modeButtonUnselected
                                }`}
                        >
                            <h3 className={`font-bold text-xl mb-1 ${isAudioInputEnabled ? 'text-slate-500' : 'text-amber-300'}`}>Retical Mode</h3>
                            <p className="text-sm text-slate-300 flex-grow">Scores are recorded on the leaderboard only when the MIDI is in Ranked status.</p>
                            {isAudioInputEnabled && (
                                <p className="text-xs text-red-400 mt-2 font-bold">
                                    Disabled when Microphone Input is active.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-lg mb-6 ring-1 ring-slate-700">
                        <h4 className="font-semibold text-lg mb-4 text-slate-200">Backing Track (Audio)</h4>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="backing" checked={backingType === 'none'} onChange={() => { setBackingType('none'); onBackingTrackFileChange(null); }} className="form-radio text-cyan-500" />
                                    <span className="ml-2 text-slate-300">None</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="backing" checked={backingType === 'mp3'} onChange={() => setBackingType('mp3')} className="form-radio text-cyan-500" />
                                    <span className="ml-2 text-slate-300">Upload MP3</span>
                                </label>
                                {midiLink && (
                                    <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="backing" checked={backingType === 'online'} onChange={() => setBackingType('online')} className="form-radio text-cyan-500" />
                                        <span className="ml-2 text-slate-300">Online Link (Auto)</span>
                                    </label>
                                )}
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200 leading-tight">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    IMPORTANT:
                                </p>
                                <div className="space-y-2">
                                    <p>Warning: For YouTube backing tracks, please use the preset speeds (0.5x, 0.75x, 1x, etc.) to avoid audio sync issues. Custom speeds may cause drift.</p>
                                    <p>Please refresh the browser if the YouTube/MP3 audio does not appear when switching between the Game and the Editor.</p>
                                    <p>
                                        If your MIDI controller feels delayed, consider adjusting the note offset in settings. Click the icon to go directly to the note offset settings, where you can calibrate it automatically by pressing a note in sync with the metronome beat.
                                        {onOpenSettings && (
                                            <button onClick={onOpenSettings} className="inline-flex items-center justify-center ml-1 text-cyan-400 hover:text-cyan-300 transition-colors" title="Open Settings">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            </button>
                                        )}
                                    </p>
                                    <p>If the MP3 feels out of sync, try pausing and playing it again, or stop and restart the track.</p>
                                    <p>If the MP3 is still out of sync, try adjusting the Sync Offset (Audio vs MIDI) by ±100 ms from the original offset.</p>
                                </div>
                            </div>

                            {backingType === 'mp3' && (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="file"
                                        accept="audio/mp3,audio/wav,audio/*"
                                        onChange={handleMp3Upload}
                                        ref={mp3InputRef}
                                        className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                                    />
                                    {backingTrackFile && <p className="text-xs text-green-400">Selected: {backingTrackFile.name}</p>}
                                    <p className="text-xs text-slate-500 mt-1 italic">For now, we only support local import due storage issue.</p>
                                </div>
                            )}

                            {backingType !== 'none' && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm text-slate-400">Sync Offset (Audio vs MIDI)</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Default: {(midiOffset || 0)}ms</span>
                                            <div className="flex flex-col items-end">
                                                {isEditingOffset ? (
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        className="bg-slate-700 text-cyan-300 border border-cyan-500 rounded px-1 text-sm font-mono w-20 text-center"
                                                        defaultValue={backingTrackOffset - (midiOffset || 0)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleOffsetInputBlur(e.currentTarget.value); }}
                                                        onBlur={(e) => handleOffsetInputBlur(e.currentTarget.value)}
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() => setIsEditingOffset(true)}
                                                        className="text-sm font-mono text-cyan-300 cursor-pointer hover:text-white"
                                                    >
                                                        User: {(backingTrackOffset - (midiOffset || 0)) > 0 ? `+${backingTrackOffset - (midiOffset || 0)}` : (backingTrackOffset - (midiOffset || 0))}ms
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-500 mt-1">
                                                    User Input: {userAverageOffset > 0 ? `+${Math.round(userAverageOffset)}` : Math.round(userAverageOffset)}ms
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => onBackingTrackOffsetChange(backingTrackOffset - 25)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">-25ms</button>
                                        <button onClick={() => onBackingTrackOffsetChange(backingTrackOffset + 25)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded">+25ms</button>
                                    </div>
                                    <input
                                        type="range"
                                        min="-5000"
                                        max="5000"
                                        step="10"
                                        value={backingTrackOffset - (midiOffset || 0)}
                                        onChange={(e) => onBackingTrackOffsetChange(parseInt(e.target.value) + (midiOffset || 0))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                        <span>Audio Delayed</span>
                                        <span>0ms (Recommended)</span>
                                        <span>Audio Ahead</span>
                                    </div>
                                </div>
                            )}

                            {(midiLink || midiOffset != null) && (
                                <div className="mt-3 p-3 rounded bg-black/30 border border-white/5 text-xs text-slate-400 space-y-1">
                                    {midiLink && (
                                        <div className="flex items-start gap-2">
                                            <span className="font-bold text-slate-300 whitespace-nowrap">Default Source:</span>
                                            <a href={midiLink} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">{midiLink}</a>
                                        </div>
                                    )}
                                    {midiOffset != null && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-300">Default Offset:</span>
                                            <span className="text-cyan-300 font-mono">{midiOffset > 0 ? `+${midiOffset}` : midiOffset}ms</span>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2 pt-1 mt-1 border-t border-white/10">
                                        {(midiLink && (midiLink.includes('youtube.com') || midiLink.includes('youtu.be'))) ? null : (
                                            <>
                                                <span className="font-bold text-slate-300 whitespace-nowrap">Download MP3 via:</span>
                                                <div className="flex flex-col items-start">
                                                    <a href="https://ezmp3.nl/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ezmp3.nl</a>
                                                    <a href="https://ytmp3.gg/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">ytmp3.gg</a>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {(isPractice || selectedMode === 'retical') && (
                        <div className="bg-slate-900/50 p-6 rounded-lg mb-6 space-y-6 ring-1 ring-slate-700">
                            <div>
                                <h4 className="font-semibold text-lg text-center mb-3 text-slate-200">
                                    Accuracy Level {selectedMode === 'retical' && <span className="text-amber-400 text-sm ml-2">(Locked to Song Default)</span>}
                                </h4>
                                <div className="flex flex-col items-center gap-4 px-4">
                                    <div className="flex items-center w-full gap-4">
                                        <input
                                            id="accuracy-level-slider"
                                            type="range"
                                            min="3"
                                            max="7"
                                            step="1"
                                            disabled={selectedMode === 'retical'}
                                            value={selectedMode === 'retical' ? (currentSongAccuracyLevel || 5) : accuracyLevel}
                                            onChange={e => setAccuracyLevel(parseInt(e.target.value, 10))}
                                            className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer ${selectedMode === 'retical' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        <span className="font-mono text-cyan-400 text-2xl w-12 text-center tabular-nums">
                                            {selectedMode === 'retical' ? (currentSongAccuracyLevel || 5) : accuracyLevel}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 w-full text-center">
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded">
                                            <div className="text-emerald-400 text-[10px] uppercase font-bold">Perfect</div>
                                            <div className="text-white font-mono text-sm">±{100 + (5 - (selectedMode === 'retical' ? (currentSongAccuracyLevel || 5) : accuracyLevel)) * 20}ms</div>
                                        </div>
                                        <div className="bg-sky-500/10 border border-sky-500/30 p-2 rounded">
                                            <div className="text-sky-400 text-[10px] uppercase font-bold">Great</div>
                                            <div className="text-white font-mono text-sm">±{(100 + (5 - (selectedMode === 'retical' ? (currentSongAccuracyLevel || 5) : accuracyLevel)) * 20) * 1.5}ms</div>
                                        </div>
                                        <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded">
                                            <div className="text-amber-400 text-[10px] uppercase font-bold">Good</div>
                                            <div className="text-white font-mono text-sm">±{(100 + (5 - (selectedMode === 'retical' ? (currentSongAccuracyLevel || 5) : accuracyLevel)) * 20) * 2}ms</div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 text-center mt-4">
                                    Lower levels are more lenient. Higher levels require more precision.
                                    {selectedMode === 'retical' ? " Ranked mode uses the original accuracy level set by the song arranger." : " Practice mode allows you to customize this to match your skill level."}
                                </p>
                            </div>
                            
                            {isPractice && (
                                <>
                                    <div className="border-t border-slate-700/50"></div>
                                    <div>
                                        <h4 className="font-semibold text-lg text-center mb-3 text-slate-200">Hand Selection</h4>
                                        <div className="flex justify-center gap-3">
                                            {(['left', 'right', 'both'] as PracticeHand[]).map(hand => (
                                                <button key={hand} onClick={() => setPracticeHand(hand)} className={`px-4 py-2 text-sm rounded-md font-semibold transition ${practiceHand === hand ? 'bg-cyan-500 text-white shadow-md' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                                    {hand.charAt(0).toUpperCase() + hand.slice(1)} Hand{hand === 'both' ? 's' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {selectedMode === 'practice_lenient' && (
                        <div className="bg-slate-900/50 p-6 rounded-lg mb-6 ring-1 ring-slate-700">
                            <label htmlFor="non-stop-toggle" className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="text-lg font-medium text-slate-300">Non-Stop Mode</span>
                                    <p className="text-xs text-slate-400 font-normal mt-1">Music continues playing even if you miss notes, like Autoplay.</p>
                                </div>
                                <div className="relative inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        id="non-stop-toggle"
                                        checked={isNonStop}
                                        onChange={e => setIsNonStop(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                </div>
                            </label>
                        </div>
                    )}

                    {selectedMode === 'retical' && (
                        <div className="bg-cyan-900/20 p-6 rounded-lg mb-6 ring-1 ring-cyan-500/50 border border-cyan-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-lg font-medium text-cyan-300">Non-Stop Mode (Forced)</span>
                                    <p className="text-xs text-cyan-400/80 font-normal mt-1">In Retical mode, the music never stops. Survival is key!</p>
                                </div>
                                <div className="flex items-center gap-2 text-cyan-500">
                                    <span className="text-xs font-bold uppercase tracking-wider">Always On</span>
                                    <div className="w-11 h-6 bg-cyan-600 rounded-full relative">
                                        <div className="absolute top-[2px] right-[2px] bg-white rounded-full h-5 after:w-5 w-5"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-900/50 p-4 rounded-lg mb-8 ring-1 ring-slate-700">
                        <label htmlFor="bpm-slider" className="block text-center text-lg font-medium text-slate-300 mb-3">
                            Tempo: <span className="font-bold text-white tabular-nums">{displayedPlaybackPercentage}%</span>
                            {initialTempoBpm && <span className="text-slate-400 tabular-nums"> ({displayedBpm} BPM)</span>}
                        </label>

                        {/* Presets */}
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => {
                                const isAllowed = rate * 100 >= minTempoPercentage && rate * 100 <= maxTempoPercentage;
                                return (
                                    <button
                                        key={rate}
                                        onClick={() => isAllowed && onPlaybackTempoMultiplierChange(rate)}
                                        disabled={!isAllowed}
                                        className={`px-3 py-1 rounded text-sm font-bold transition-colors ${initialPlaybackTempoMultiplier === rate
                                            ? 'bg-cyan-600 text-white shadow-md'
                                            : isAllowed
                                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                            }`}
                                    >
                                        {rate}x
                                    </button>
                                );
                            })}
                        </div>

                        <input
                            id="bpm-slider"
                            type="range"
                            min={minTempoPercentage}
                            max={maxTempoPercentage}
                            step="1"
                            value={Math.max(minTempoPercentage, Math.min(maxTempoPercentage, displayedPlaybackPercentage))}
                            onChange={(e) => onPlaybackTempoMultiplierChange(parseInt(e.target.value, 10) / 100)}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-4"
                        />

                        {/* Advanced Tempo Input */}
                        <div className="flex justify-center items-center gap-2">
                            <span className="text-xs text-slate-400 uppercase font-bold">Advanced:</span>
                            <div className="flex items-center">
                                <input
                                    type="number"
                                    min={minTempoPercentage / 100}
                                    max={maxTempoPercentage / 100}
                                    step="0.01"
                                    value={initialPlaybackTempoMultiplier}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            const clamped = Math.max(minTempoPercentage / 100, Math.min(maxTempoPercentage / 100, val));
                                            onPlaybackTempoMultiplierChange(clamped);
                                        }
                                    }}
                                    className="bg-slate-800 border border-slate-600 text-white text-sm rounded px-2 py-1 w-20 text-center focus:border-cyan-500 focus:outline-none"
                                />
                                <span className="ml-2 text-xs text-slate-500">
                                    (Range: {minTempoPercentage / 100} - {maxTempoPercentage / 100})
                                </span>
                            </div>
                        </div>

                        {selectedMode === 'retical' && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Tempo restricted to {minTempoPercentage}% - {maxTempoPercentage}% in Retical Mode.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <button onClick={handleStart} className={`${buttonBaseStyle} ${primaryButtonStyle} col-span-4`}>
                            Start Game
                        </button>
                        <button onClick={() => setIsTutorialModalOpen(true)} className={`${buttonBaseStyle} bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400 col-span-1`}>
                            Learn More
                        </button>
                    </div>

                </div>
            </div>
            {isTutorialModalOpen && (
                <div
                    className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isTutorialModalRendered ? 'bg-opacity-75' : 'bg-opacity-0'}`}
                    onClick={() => setIsTutorialModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tutorial-title"
                >
                    <div
                        className={`bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar transform transition-all duration-300 ease-in-out ${isTutorialModalRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4 border-b border-slate-600 pb-3">
                            <h2 id="tutorial-title" className="text-2xl font-bold text-sky-300">Tutorials & Learn More</h2>
                            <button
                                onClick={() => setIsTutorialModalOpen(false)}
                                className="text-3xl font-light text-slate-400 hover:text-white leading-none"
                                aria-label="Close tutorial modal"
                            >&times;</button>
                        </div>
                        <p className="text-slate-300 mb-6 text-sm italic">
                            Remember, this is not a piano learning app, it’s a piano rhythm game. If your foundation is weak, it’s recommended that you watch tutorials or get a teacher to improve your skills.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tutorials.map((tutorial, index) => {
                                const vid = getYoutubeId(tutorial.url);
                                return (
                                    <a
                                        key={index}
                                        href={tutorial.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex flex-col bg-slate-700 hover:bg-slate-600 rounded-xl overflow-hidden transition-all hover:scale-[1.02] shadow-lg"
                                    >
                                        <div className="aspect-video relative overflow-hidden bg-black">
                                            {vid ? (
                                                <img
                                                    src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                                                    alt={tutorial.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                                                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4.516 3.917c.54-.341 1.253-.306 1.76.101l8.5 6.75a1 1 0 010 1.564l-8.5 6.75a1 1 0 01-1.604-.812V4.73c0-.317.153-.615.416-.813z"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 flex items-center justify-between">
                                            <span className="text-white font-bold text-sm truncate pr-2">{tutorial.title}</span>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setIsTutorialModalOpen(false)}
                                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-lg"
                            >Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModeSelection;
