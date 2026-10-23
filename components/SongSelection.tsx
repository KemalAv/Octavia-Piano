import React, { useRef, useState, useEffect, memo } from 'react';
import { ExtendedResult, AppLanguage } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';
import OnlineSongBrowser from './OnlineSongBrowser';
import { supabase } from '../supabaseClient'; 
import { translations } from '../translations';

interface SongSelectionProps {
  onFileLoaded: (file: File | null, onlineSongId: string | null, isRanked: boolean | null, midiLink: string | null, midiOffset: number | null, backgroundUrl?: string | null, accuracyLevel?: number | null) => Promise<void>;
  onSongSelected: () => void;
  onBack: () => void;
  loadedSongName: string | null;
  analysisResult: ExtendedResult | null;
  isLoading: boolean;
  loadingMessage?: string;
  fingeringError?: string;
  fingeringWarnings?: string[];
  onCancelLoading?: () => void;
  selectedOnlineSongIdForNavigation: string | null;
  onGoToOnlineSong: (songId: string) => void;
  onStartFreePlay: () => void;
  onNavigateToEditor: (file: File | null) => void;
  instrumentMode: 'piano' | 'drum';
  appLanguage?: AppLanguage;
}

const SongSelection: React.FC<SongSelectionProps> = memo(({
  onFileLoaded,
  onSongSelected,
  onBack,
  loadedSongName,
  analysisResult,
  isLoading,
  loadingMessage,
  fingeringError,
  fingeringWarnings,
  onCancelLoading,
  selectedOnlineSongIdForNavigation,
  onGoToOnlineSong,
  onStartFreePlay,
  onNavigateToEditor,
  instrumentMode,
  appLanguage = 'en',
}) => {
  const t = translations[appLanguage] || translations.en;
  const [activeTab, setActiveTab] = useState<'online' | 'local' | 'freeplay'>('online'); 
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);

  // Local Import Modal State
  const [isLocalImportModalOpen, setIsLocalImportModalOpen] = useState(false);
  const [localImportFile, setLocalImportFile] = useState<File | null>(null);
  const [localImportTitle, setLocalImportTitle] = useState('');
  const [localImportArtist, setLocalImportArtist] = useState('');
  const [localImportArranger, setLocalImportArranger] = useState('');
  const [localImportDescription, setLocalImportDescription] = useState('');
  const [localImportMidiLink, setLocalImportMidiLink] = useState('');
  const [localImportMidiOffset, setLocalImportMidiOffset] = useState('');
  const [localImportBackgroundUrl, setLocalImportBackgroundUrl] = useState('');
  const [localImportAccuracyLevel, setLocalImportAccuracyLevel] = useState<number>(5);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 20);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const requestedTab = sessionStorage.getItem('songSelectionInitialTab');
    if (requestedTab === 'local' || requestedTab === 'online') {
      setActiveTab(requestedTab);
      sessionStorage.removeItem('songSelectionInitialTab');
    }
  }, []);

  useEffect(() => {
    const loadAndSelectOnlineSong = async (songId: string) => {
      setIsOnlineLoading(true); 
      try {
        const { data: songMetadata, error: metadataError } = await supabase
          .from('songs')
          .select('id, title, file_path, is_ranked, midi_link, midi_offset, background_url') 
          .eq('id', songId)
          .single();

        if (metadataError) throw metadataError;
        if (!songMetadata) throw new Error("Online song not found.");

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('midi-files')
          .download(songMetadata.file_path);

        if (downloadError) throw downloadError;
        if (!fileData) throw new Error("No file data received for online song.");

        const onlineExt = songMetadata.file_path.split('.').pop() || 'mid';
        const file = new File(
          [fileData], 
          `${songMetadata.title}.${onlineExt}`, 
          { type: fileData?.type || (onlineExt === 'mid' ? 'audio/midi' : 'application/octet-stream') }
        );
        await onFileLoaded(file, songMetadata.id, songMetadata.is_ranked, songMetadata.midi_link, songMetadata.midi_offset, songMetadata.background_url); 
        setActiveTab('online'); 
      } catch (err: unknown) {
        console.error("Error loading pre-selected online MIDI:", err);
        alert(`Failed to load online MIDI: ${(err instanceof Error ? err.message : String(err))}`);
        onFileLoaded(null, null, null, null, null, null); 
      } finally {
        setIsOnlineLoading(false);
      }
    };

    if (selectedOnlineSongIdForNavigation && !isLoading && !isOnlineLoading && !loadedSongName) {
      loadAndSelectOnlineSong(selectedOnlineSongIdForNavigation);
    }
  }, [selectedOnlineSongIdForNavigation, isLoading, isOnlineLoading, loadedSongName, onFileLoaded]);

  const processSelectedFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isMidi = fileName.endsWith('.mid') || fileName.endsWith('.midi');

    if (isMidi) {
      setLocalImportFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setLocalImportTitle(nameWithoutExt.substring(0, 50));
      setLocalImportArtist('');
      setLocalImportArranger('');
      setLocalImportDescription('');
      setLocalImportMidiLink('');
      setLocalImportMidiOffset('');
      setLocalImportBackgroundUrl('');
      setLocalImportAccuracyLevel(5);
      setIsLocalImportModalOpen(true);
    } else {
      alert(t.fileNotSupported);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLocalImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localImportFile) return;

    let finalFile = localImportFile;
    if (localImportTitle || localImportArtist) {
      const ext = localImportFile.name.split('.').pop() || 'mid';
      const newName = `${localImportTitle || 'Unknown'}${localImportArtist ? ` - ${localImportArtist}` : ''}.${ext}`;
      finalFile = new File([localImportFile], newName, { type: localImportFile.type });
    }

    setSelectedLocalFile(finalFile);
    onFileLoaded(
      finalFile, 
      null, 
      null, 
      localImportMidiLink.trim() || null, 
      localImportMidiOffset ? parseInt(localImportMidiOffset, 10) : null, 
      localImportBackgroundUrl.trim() || null,
      localImportAccuracyLevel
    );
    setIsLocalImportModalOpen(false);
  };

  const showLoading = isLoading || isOnlineLoading;

  return (
    <div className={`fixed inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col z-40 p-3 md:p-6 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Top Header & Navigation Bar */}
      <header className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
        
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-all px-4 py-2 rounded-xl border border-white/10 bg-slate-900/90 hover:bg-slate-800 shadow-md active:scale-95 text-sm font-semibold"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>{t.backBtn}</span>
          </button>
          
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {t.songLibraryTitle}
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
              {instrumentMode === 'piano' ? (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M6 4v8h2V4M11 4v8h2V4M16 4v8h2V4"/></svg>
                  <span>Piano</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="9" rx="8" ry="4"/><path d="M4 9v6c0 2.21 3.58 4 8 4s8-1.79 8-4V9"/></svg>
                  <span>Drum</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Center: Segmented Navigation Pills with SVGs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 ${
              activeTab === 'online'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Globe SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>{t.communityLibrary}</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 ${
              activeTab === 'local'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Folder SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{t.localImport}</span>
          </button>

          <button
            onClick={() => setActiveTab('freeplay')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl font-bold text-xs md:text-sm transition-all duration-200 ${
              activeTab === 'freeplay'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* Piano Keys SVG */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              <path d="M6 4v8h2V4M11 4v8h2V4M16 4v8h2V4"/>
            </svg>
            <span>{t.freePlayTab}</span>
          </button>
        </div>

      </header>

      {/* Error alert banner */}
      {fingeringError && (
        <div role="alert" className="max-w-7xl w-full mx-auto mt-3 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-red-200 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>{fingeringError}</span>
        </div>
      )}

      {/* Main Tab Content Area */}
      <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col overflow-hidden my-3 min-h-0 relative">
        
        {/* Loading Overlay */}
        {showLoading && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-cyan-300 font-bold text-lg mb-2">
              {loadingMessage || (isOnlineLoading ? t.fetchingTrackData : t.preparingAudioEngine)}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {t.parsingMidiSub}
            </p>
            {onCancelLoading && (
              <button 
                type="button" 
                onClick={onCancelLoading} 
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
              >
                {t.cancel}
              </button>
            )}
          </div>
        )}

        {/* Tab 1: Online Community Songs */}
        {activeTab === 'online' && (
          <div className="flex-grow flex flex-col min-h-0">
            <OnlineSongBrowser 
              onSongLoaded={(file, id, ranked, mLink, mOffset, bgUrl) => onFileLoaded(file, id, ranked, mLink, mOffset, bgUrl)} 
              isLoading={isOnlineLoading}
              setLoadingState={setIsOnlineLoading}
              onGoToOnlineSong={onGoToOnlineSong}
              instrumentMode={instrumentMode}
              appLanguage={appLanguage}
            />
          </div>
        )}

        {/* Tab 2: Local File Import */}
        {activeTab === 'local' && (
          <div className="flex-grow flex flex-col justify-center items-center p-6 overflow-y-auto custom-scrollbar">
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processSelectedFile(file);
              }}
              className={`max-w-xl w-full p-8 md:p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center transition-all ${
                isDraggingOver 
                  ? 'border-cyan-400 bg-cyan-950/30 scale-[1.02]' 
                  : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <input
                type="file"
                accept=".mid,.midi,audio/mid,audio/midi,audio/x-midi,application/x-midi"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                id="song-selection-file-input"
              />

              {/* Upload Cloud / Sheet Music SVG */}
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 shadow-inner">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                  <path d="M12 12v9"/>
                  <path d="m16 16-4-4-4 4"/>
                </svg>
              </div>

              <h3 className="text-2xl font-black text-white mb-2">
                {t.importLocalTitle}
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md">
                {t.importLocalDesc}
              </p>

              <label
                htmlFor="song-selection-file-input"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-2xl cursor-pointer transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95 text-base flex items-center gap-2 mb-4"
                role="button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>{t.selectLocalFile}</span>
              </label>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-white/5 w-full">
                <button 
                  onClick={() => onNavigateToEditor(null)} 
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <span>{t.newMidiEditor}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Free Play Card */}
        {activeTab === 'freeplay' && (
          <div className="flex-grow flex flex-col justify-center items-center p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-xl w-full p-8 md:p-12 rounded-3xl bg-gradient-to-b from-violet-950/40 via-slate-900/90 to-slate-900/90 border border-violet-500/30 text-center shadow-2xl">
              <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6 mx-auto shadow-inner">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                  <path d="M6 4v8h2V4M11 4v8h2V4M16 4v8h2V4"/>
                </svg>
              </div>

              <h3 className="text-3xl font-black text-white mb-3">
                {t.freePlayTitle}
              </h3>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
                {t.freePlayDesc}
              </p>

              <button
                onClick={onStartFreePlay}
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-95 text-lg inline-flex items-center gap-2"
              >
                <span>{t.launchFreePlay}</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Floating / Sticky Ready Song Bar */}
      {loadedSongName && !showLoading && (
        <aside aria-label="Loaded Song" className="max-w-7xl w-full mx-auto mt-2 p-3 md:p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md flex-shrink-0 animate-fadeIn">
          
          {/* Song Info */}
          <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="min-w-0 flex-grow">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t.readyStatus}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">• {t.readyToPlay}</span>
              </div>
              <p className="text-base font-black text-white truncate drop-shadow-sm" title={loadedSongName}>
                {loadedSongName}
              </p>
            </div>
          </div>

          {/* Difficulty preview */}
          {analysisResult && (
            <div className="hidden lg:flex items-center">
              <DifficultyAnalysis analysisResult={analysisResult} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {activeTab === 'local' && selectedLocalFile && (
              <button
                onClick={() => onNavigateToEditor(selectedLocalFile)}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap"
              >
                {t.editMidi}
              </button>
            )}

            <button
              onClick={onSongSelected}
              className="flex-grow md:flex-initial bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95 text-sm flex items-center justify-center gap-2"
            >
              <span>{t.selectAndPlay}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>

        </aside>
      )}

      {/* Local Import Modal */}
      {isLocalImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-700">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/70">
              <div className="flex items-center gap-2 text-cyan-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                <h3 className="text-xl font-bold text-white">
                  {t.localImportModalTitle}
                </h3>
              </div>
              <button 
                onClick={() => setIsLocalImportModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleLocalImportSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.title} ({t.optionalLabel})
                  </label>
                  <input
                    type="text"
                    value={localImportTitle}
                    onChange={e => setLocalImportTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.artist} ({t.optionalLabel})
                  </label>
                  <input
                    type="text"
                    value={localImportArtist}
                    onChange={e => setLocalImportArtist(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={25}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.arranger} ({t.optionalLabel})
                  </label>
                  <input
                    type="text"
                    value={localImportArranger}
                    onChange={e => setLocalImportArranger(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={25}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.youtubeBackingLabel} ({t.optionalLabel})
                  </label>
                  <input
                    type="url"
                    value={localImportMidiLink}
                    onChange={e => setLocalImportMidiLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={300}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.audioOffsetLabel} ({t.optionalLabel})
                  </label>
                  <input
                    type="number"
                    value={localImportMidiOffset}
                    onChange={e => setLocalImportMidiOffset(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={7}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.backgroundUrlLabel} ({t.optionalLabel})
                  </label>
                  <input
                    type="url"
                    value={localImportBackgroundUrl}
                    onChange={e => setLocalImportBackgroundUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                    maxLength={300}
                  />
                </div>
              </div>



              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLocalImportModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-md shadow-cyan-500/20 transition-all text-sm"
                >
                  {t.loadThisMidi}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
});

export default SongSelection;
