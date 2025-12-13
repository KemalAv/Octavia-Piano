

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ExtendedResult, OnlineSong } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';
import OnlineSongBrowser from './OnlineSongBrowser';
import { supabase } from '../supabaseClient'; // Import supabase client

interface SongSelectionProps {
  onFileLoaded: (file: File | null, onlineSongId: string | null, isRanked: boolean | null) => Promise<void>;
  onSongSelected: () => void;
  onBack: () => void;
  loadedSongName: string | null;
  analysisResult: ExtendedResult | null;
  isLoading: boolean;
  selectedOnlineSongIdForNavigation: string | null; // NEW: Prop to indicate a song was selected for direct navigation
  onGoToOnlineSong: (songId: string) => void; // NEW: Callback to navigate to online song browser
  onStartFreePlay: () => void;
}

const SongSelection: React.FC<SongSelectionProps> = ({
  onFileLoaded,
  onSongSelected,
  onBack,
  loadedSongName,
  analysisResult,
  isLoading,
  selectedOnlineSongIdForNavigation, // Destructure new prop
  onGoToOnlineSong, // Destructure new prop
  onStartFreePlay,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('online'); // Changed default to 'online'
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Effect to handle direct navigation to an online song
  useEffect(() => {
    const loadAndSelectOnlineSong = async (songId: string) => {
      setIsOnlineLoading(true); // Indicate loading of online song
      try {
        // Fetch song metadata first
        const { data: songMetadata, error: metadataError } = await supabase
          .from('songs')
          .select('id, title, file_path, is_ranked') // Fetch is_ranked status
          .eq('id', songId)
          .single();

        if (metadataError) throw metadataError;
        if (!songMetadata) throw new Error("Online song not found.");

        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('midi-files')
          .download(songMetadata.file_path);

        if (downloadError) throw downloadError;
        if (!fileData) throw new Error("No file data received for online song.");

        // Convert Blob to File object for onFileLoaded
        const file = new File([fileData], songMetadata.title + '.mid', { type: fileData.type });
        await onFileLoaded(file, songMetadata.id, songMetadata.is_ranked); // Pass online song ID and is_ranked
        setActiveTab('online'); // Ensure the online tab is active
        // After successful loading, the parent (App.tsx) should clear selectedOnlineSongIdForNavigation
      } catch (err: unknown) {
        console.error("Error loading pre-selected online MIDI:", err);
        alert(`Failed to load online MIDI: ${(err instanceof Error ? err.message : String(err))}`);
        onFileLoaded(null, null, null); // Clear any potentially partial state in App.tsx, pass null for isRanked
      } finally {
        setIsOnlineLoading(false);
      }
    };

    if (selectedOnlineSongIdForNavigation && !isLoading && !isOnlineLoading && !loadedSongName) {
      loadAndSelectOnlineSong(selectedOnlineSongIdForNavigation);
    }
  }, [selectedOnlineSongIdForNavigation, isLoading, isOnlineLoading, loadedSongName, onFileLoaded]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // FIX: Provide `null` for `onlineSongId` and `isRanked` as it's a local file.
      onFileLoaded(file, null, null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg";
  const primaryButtonStyle = "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20";
  const secondaryButtonStyle = "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600";
  const tertiaryButtonStyle = "bg-slate-800 hover:bg-slate-700 text-slate-300";
  
  const tabStyle = "flex-1 py-4 text-center font-bold text-lg cursor-pointer transition-all duration-200 border-b-4 relative overflow-hidden";
  const activeTabStyle = "border-cyan-500 text-white bg-slate-800/50 shadow-[inset_0_-10px_20px_rgba(6,182,212,0.1)]";
  const inactiveTabStyle = "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30";

  // When an online song is loaded, we treat it like a file load
  const handleOnlineSongLoaded = async (file: File, onlineSongId: string, isRanked: boolean) => {
    await onFileLoaded(file, onlineSongId, isRanked);
  };

  const showLoading = isLoading || isOnlineLoading;

  return (
    <div className={`fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-40 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
       
       <div className="absolute top-4 left-4">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-full border border-white/10 hover:border-white/30 backdrop-blur-sm">
                <span>&larr;</span> <span>Back</span>
            </button>
       </div>

      <div className={`bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${isRendered ? 'scale-100' : 'scale-95'}`}>
        
        {/* Header / Tabs */}
        <div className="flex border-b border-white/5 bg-black/20">
            {/* Swapped order: Online / Ranked first */}
            <div 
                className={`${tabStyle} ${activeTab === 'online' ? activeTabStyle : inactiveTabStyle}`}
                onClick={() => setActiveTab('online')}
            >
                Community Library
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
                {activeTab === 'online' ? 'Select a Track' : 'Upload Your File'}
            </h2>

            {/* Shared Loaded State Area (Top) */}
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
                        <span className="text-cyan-300 font-medium text-lg animate-pulse">{isOnlineLoading ? 'Fetching Track Data...' : 'Preparing Audio Engine...'}</span>
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
                        
                        <div className="mt-6">
                            <button 
                                onClick={onSongSelected}
                                className={`${buttonBaseStyle} ${primaryButtonStyle} max-w-sm mx-auto animate-bounce-slight shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]`}
                            >
                                START GAME
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-xl text-slate-300 font-light">
                            {activeTab === 'online' 
                                ? "Choose a track from the global database below."
                                : "Drag & drop a MIDI file or browse your device."}
                        </p>
                    </div>
                )}
            </div>
            
            {/* Tab Content */}
            <div className="flex-grow flex flex-col min-h-[400px]">
                {activeTab === 'online' ? (
                    <div className="flex-grow">
                        <OnlineSongBrowser 
                            onSongLoaded={handleOnlineSongLoaded} 
                            isLoading={isOnlineLoading}
                            setLoadingState={setIsOnlineLoading}
                            onGoToOnlineSong={onGoToOnlineSong}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/20">
                        <input
                            type="file"
                            accept="audio/midi,.mid,.midi,application/vnd.recordare.musicxml+xml,.musicxml,.xml,.mxl"
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
                        
                        <div className="text-center space-y-2">
                            <p className="text-slate-400">or</p>
                            <button onClick={onStartFreePlay} className="text-violet-400 hover:text-violet-300 font-semibold underline decoration-2 underline-offset-4 hover:decoration-violet-300 transition-colors">
                                Enter Free Play Mode
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 mt-4 max-w-xs text-center">
                            Supports .mid, .midi, .xml, .musicxml. <br/>Best results with quantized MIDI files.
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SongSelection;