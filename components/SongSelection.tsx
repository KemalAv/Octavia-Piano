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
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('online'); // Changed default to 'online'
  const [isOnlineLoading, setIsOnlineLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
  const secondaryButtonStyle = "bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-400";
  const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";
  
  const tabStyle = "flex-1 py-3 text-center font-bold text-lg cursor-pointer transition-colors border-b-2";
  const activeTabStyle = "border-cyan-400 text-cyan-400 bg-slate-700/50";
  const inactiveTabStyle = "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30";

  // When an online song is loaded, we treat it like a file load
  const handleOnlineSongLoaded = async (file: File, onlineSongId: string, isRanked: boolean) => {
    await onFileLoaded(file, onlineSongId, isRanked);
  };

  const showLoading = isLoading || isOnlineLoading;

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-40 p-4">
       <div className="absolute top-4 left-4">
            <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to Menu</button>
       </div>

      <div className="bg-slate-800/50 backdrop-blur-sm p-0 rounded-xl shadow-2xl text-center max-w-4xl w-full ring-1 ring-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header / Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/80">
            {/* Swapped order: Online / Ranked first */}
            <div 
                className={`${tabStyle} ${activeTab === 'online' ? activeTabStyle : inactiveTabStyle}`}
                onClick={() => setActiveTab('online')}
            >
                Online / Ranked
            </div>
            <div 
                className={`${tabStyle} ${activeTab === 'local' ? activeTabStyle : inactiveTabStyle}`}
                onClick={() => setActiveTab('local')}
            >
                Offline / Local
            </div>
        </div>

        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-grow flex flex-col">
            <h2 className="text-4xl font-bold text-cyan-400 mb-6">
                {activeTab === 'online' ? 'Community MIDIs' : 'Import a MIDI'}
            </h2>

            {/* Shared Loaded State Area (Top) */}
            <div className="bg-slate-900/50 p-6 rounded-lg mb-6 min-h-[120px] flex flex-col items-center justify-center ring-1 ring-slate-700 flex-shrink-0">
                {showLoading ? (
                    <div className="flex items-center space-x-3 p-4 text-cyan-300 font-semibold text-lg">
                        <svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{isOnlineLoading ? 'Loading MIDI data...' : 'Analyzing and preloading audio...'}</span>
                    </div>
                ) : loadedSongName ? (
                    <div className="text-center w-full">
                        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4 mb-4">
                            <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Ready to Play</span>
                            <p className="text-2xl font-semibold text-white truncate mt-1">{loadedSongName}</p>
                        </div>
                        {analysisResult && <DifficultyAnalysis analysisResult={analysisResult} />}
                        
                        <div className="mt-6">
                            <button 
                                onClick={onSongSelected}
                                className={`${buttonBaseStyle} ${primaryButtonStyle} max-w-sm mx-auto animate-pulse`}
                            >
                                Start Game &rarr;
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl text-slate-400">
                        {activeTab === 'online' 
                            ? "Browse and play MIDIs uploaded by the community."
                            : "Select a MIDI file from your device."}
                    </p>
                )}
            </div>
            
            {/* Tab Content */}
            <div className="flex-grow flex flex-col">
                {activeTab === 'online' ? (
                    <div className="flex-grow min-h-[400px]">
                        <OnlineSongBrowser 
                            onSongLoaded={handleOnlineSongLoaded} 
                            isLoading={isOnlineLoading}
                            setLoadingState={setIsOnlineLoading}
                            onGoToOnlineSong={onGoToOnlineSong}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 max-w-sm mx-auto w-full mt-4">
                        <input
                            type="file"
                            accept="audio/midi,.mid,.midi,application/vnd.recordare.musicxml+xml,.musicxml,.xml,.mxl"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                            id="song-selection-file-input"
                        />
                        <label
                            htmlFor="song-selection-file-input"
                            className={`${buttonBaseStyle} ${secondaryButtonStyle} cursor-pointer block text-center`}
                            role="button"
                        >
                            Browse Local Files
                        </label>
                        <p className="text-sm text-slate-500 text-center mt-2">
                            Supported: MIDI (.mid). For best accuracy, MIDI files should be converted from MusicXML.
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
