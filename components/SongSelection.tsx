
import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { ExtendedResult, OnlineSong } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';
import OnlineSongBrowser from './OnlineSongBrowser';
import { supabase } from '../supabaseClient'; 
import { generateExercise, EXERCISE_CATEGORIES, ALL_KEYS, ExerciseType } from '../musicTheoryGenerator'; 

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
  // NEW Prop for editor navigation
  onNavigateToEditor: (file: File | null) => void;
  instrumentMode: 'piano' | 'drum';
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
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'online' | 'practice'>('online'); 
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);

  // Practice Mode State
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [selectedCategory, setSelectedCategory] = useState<string>('scales');

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
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const requestedTab = sessionStorage.getItem('songSelectionInitialTab');
    if (requestedTab === 'local' || requestedTab === 'online' || requestedTab === 'practice') {
        setActiveTab(requestedTab as 'local' | 'online' | 'practice');
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
        const file = new File([fileData], `${songMetadata.title}.${onlineExt}`, { type: fileData?.type || (onlineExt === 'mid' ? 'audio/midi' : 'application/octet-stream') });
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
      
      // Pre-fill title from filename
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
      alert('File not supported. Please upload a MIDI file (.mid, .midi).');
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

  const handlePracticeSelection = async (typeId: string, typeName: string) => {
    const exercise = generateExercise(selectedKey, typeId as ExerciseType);
    
    const jsonContent = JSON.stringify(exercise);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const file = new File([blob], `${selectedKey} ${typeName}.json`, { type: 'application/json' });
    
    onFileLoaded(file, null, null, null, null);
  };

  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-md";
  const primaryButtonStyle = "bg-cyan-600 hover:bg-cyan-500 text-white";
  
  const tabStyle = "flex-1 py-4 text-center font-bold text-lg cursor-pointer transition-all duration-200 border-b-4 relative overflow-hidden";
  const activeTabStyle = "border-cyan-500 text-white bg-slate-800/50";
  const inactiveTabStyle = "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30";

  const showLoading = isLoading || isOnlineLoading;

  return (
    <div className={`fixed inset-0 bg-slate-950/40 flex flex-col items-center justify-center z-40 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
       
       <div className="absolute top-4 left-4" style={{ zIndex: 9999 }}>
            <button onClick={onBack} className={`flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-4 py-2 rounded-full border border-white/10 bg-slate-800/80`}>
                <span>&larr;</span> <span>Back</span>
            </button>
       </div>

      <div className={`border border-white/10 rounded-2xl shadow-xl text-center max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out bg-slate-900/90 ${isRendered ? 'scale-100' : 'scale-95'}`}>
        
        <div className="flex border-b border-white/5 bg-black/20">
            <div 
                className={`${tabStyle} ${activeTab === 'online' ? activeTabStyle : inactiveTabStyle}`}
                onClick={() => setActiveTab('online')}
            >
                Community Library
            </div>
            <div 
                className={`${tabStyle} ${activeTab === 'practice' ? activeTabStyle : inactiveTabStyle} ${instrumentMode === 'drum' ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => instrumentMode !== 'drum' && setActiveTab('practice')}
            >
                {instrumentMode === 'drum' ? 'Coming Soon' : 'Practice Exercises'}
            </div>
            <div 
                className={`${tabStyle} ${activeTab === 'local' ? activeTabStyle : inactiveTabStyle}`}
                onClick={() => setActiveTab('local')}
            >
                Local Import
            </div>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-grow flex flex-col">
            <h2 className="text-3xl font-black text-cyan-400 mb-8 tracking-tight uppercase">
                {activeTab === 'online' ? 'Select a Track' : activeTab === 'practice' ? 'Technical Drills' : 'Upload Your File'}
            </h2>

            {fingeringError && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-200">{fingeringError}</div>}
            <div className="bg-slate-800/40 p-6 rounded-xl mb-8 min-h-[120px] flex flex-col items-center justify-center border border-white/5 shadow-inner flex-shrink-0 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {showLoading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <span className="text-cyan-300 font-medium text-lg animate-pulse">{loadingMessage || (isOnlineLoading ? 'Fetching Track Data...' : 'Preparing Audio Engine...')}</span>
                        {onCancelLoading && <button type="button" onClick={onCancelLoading} className="text-slate-300 underline">Cancel</button>}
                    </div>
                ) : loadedSongName ? (
                    <div className="text-center w-full">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 uppercase tracking-wide">Ready</span>
                        </div>
                        <p className="text-2xl font-bold text-white truncate max-w-2xl mx-auto drop-shadow-md">{loadedSongName}</p>
                        
                        <div className="my-4">
                            {analysisResult && <DifficultyAnalysis analysisResult={analysisResult} />}
                        </div>
                        
                        <div className="mt-6 flex gap-4 justify-center">
                            <button 
                                onClick={onSongSelected}
                                className={`${buttonBaseStyle} ${primaryButtonStyle} max-w-sm`}
                            >
                                START GAME
                            </button>
                            {/* Edit MIDI Button if viewing Local tab and file is loaded */}
                            {activeTab === 'local' && selectedLocalFile && (
                                <button
                                    onClick={() => onNavigateToEditor(selectedLocalFile)}
                                    className={`${buttonBaseStyle} bg-orange-600 hover:bg-orange-500 text-white max-w-[150px] shadow-orange-500/20`}
                                >
                                    EDIT MIDI
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xl text-slate-300 font-light">
                            {activeTab === 'online' 
                                ? "Choose a track from the global database below."
                                : activeTab === 'practice'
                                ? "Select a key and exercise type to generate a drill."
                                : "Drag & drop a MIDI file or browse your device."}
                        </p>
                    </div>
                )}
            </div>
            
            <div className="flex-grow flex flex-col min-h-[400px]">
                {activeTab === 'online' ? (
                    <div className="flex-grow">
                        <OnlineSongBrowser 
                            onSongLoaded={(file, id, ranked, mLink, mOffset, bgUrl) => onFileLoaded(file, id, ranked, mLink, mOffset, bgUrl)} 
                            isLoading={isOnlineLoading}
                            setLoadingState={setIsOnlineLoading}
                            onGoToOnlineSong={onGoToOnlineSong}
                            instrumentMode={instrumentMode}
                        />
                    </div>
                ) : activeTab === 'practice' ? (
                    <div className="flex flex-col gap-6 h-full">
                        <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5">
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-3 text-left">Select Key</h3>
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                                {ALL_KEYS.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedKey(key)}
                                        className={`py-2 rounded-lg text-sm font-bold transition-all ${
                                            selectedKey === key 
                                            ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)] scale-105' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                            {EXERCISE_CATEGORIES.map(category => (
                                <div key={category.id} className="bg-slate-800/50 rounded-xl border border-white/5 overflow-hidden flex flex-col">
                                    <div className="bg-slate-800 p-3 border-b border-white/5">
                                        <h4 className="text-cyan-400 font-bold uppercase tracking-wide text-sm">{category.name}</h4>
                                    </div>
                                    <div className="p-2 space-y-1 flex-grow overflow-y-auto custom-scrollbar max-h-[300px]">
                                        {category.types.map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => handlePracticeSelection(type.id, type.name)}
                                                className="w-full text-left px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex flex-col gap-1 group"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-bold">{type.name}</span>
                                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                </div>
                                                {(type as any).description && (
                                                    <span className="text-[11px] text-slate-500 group-hover:text-slate-400 leading-snug">
                                                        {(type as any).description}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
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
                        className={`flex flex-col items-center justify-center h-full gap-6 p-8 border-2 border-dashed rounded-xl transition-all ${
                            isDraggingOver 
                                ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]' 
                                : 'border-slate-700 bg-slate-900/20'
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
                        
                        <div className="bg-slate-800 p-6 rounded-full">
                            <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                        </div>

                        <label
                            htmlFor="song-selection-file-input"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1"
                            role="button"
                        >
                            Select Local File
                        </label>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => onNavigateToEditor(null)} 
                                className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg hover:shadow-violet-500/30 hover:-translate-y-1 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Create New MIDI
                            </button>
                        </div>

                        <div className="text-center space-y-2 mt-2">
                            <p className="text-slate-400">or</p>
                            <button onClick={onStartFreePlay} className="text-violet-400 hover:text-violet-300 font-semibold underline decoration-2 underline-offset-4 hover:decoration-violet-300 transition-colors">
                                Enter Free Play Mode
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 mt-4 max-w-sm text-center">
                            Supports MIDI (.mid, .midi).
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Local Import Modal */}
      {isLocalImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-2xl font-bold text-white">Local Song Import</h2>
              <button onClick={() => setIsLocalImportModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleLocalImportSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={localImportTitle}
                    onChange={e => setLocalImportTitle(e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Artist (Optional)</label>
                  <input
                    type="text"
                    value={localImportArtist}
                    onChange={e => setLocalImportArtist(e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={25}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Arranger (Optional)</label>
                  <input
                    type="text"
                    value={localImportArranger}
                    onChange={e => setLocalImportArranger(e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={25}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">YouTube Link (Optional)</label>
                  <input
                    type="url"
                    value={localImportMidiLink}
                    onChange={e => setLocalImportMidiLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={300}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Audio Offset (ms) (Optional)</label>
                  <input
                    type="number"
                    value={localImportMidiOffset}
                    onChange={e => setLocalImportMidiOffset(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={7}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Background URL (Optional)</label>
                  <input
                    type="url"
                    value={localImportBackgroundUrl}
                    onChange={e => setLocalImportBackgroundUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={300}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={localImportDescription}
                  onChange={e => setLocalImportDescription(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500 h-20 resize-none"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Accuracy Level (3-7)
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">
                    3 = Very Lenient, 5 = Normal, 7 = Very Strict
                  </span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="7"
                  step="1"
                  value={localImportAccuracyLevel}
                  onChange={e => setLocalImportAccuracyLevel(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="text-center mt-2 space-y-1">
                  <div className="text-cyan-400 font-bold">
                    Level {localImportAccuracyLevel}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-1 bg-slate-700/50 rounded border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Perfect</span>
                      <span className="text-xs text-white font-mono">±{100 + (5 - localImportAccuracyLevel) * 20}ms</span>
                    </div>
                    <div className="flex flex-col items-center p-1 bg-slate-700/50 rounded border border-sky-500/30">
                      <span className="text-[10px] text-sky-400 font-bold uppercase">Great</span>
                      <span className="text-xs text-white font-mono">±{Math.round((100 + (5 - localImportAccuracyLevel) * 20) * 1.5)}ms</span>
                    </div>
                    <div className="flex flex-col items-center p-1 bg-slate-700/50 rounded border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 font-bold uppercase">Good</span>
                      <span className="text-xs text-white font-mono">±{(100 + (5 - localImportAccuracyLevel) * 20) * 2}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLocalImportModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Load MIDI
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
