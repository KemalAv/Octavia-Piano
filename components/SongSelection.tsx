
import React, { useRef } from 'react';
import { ExtendedResult } from '../types';
import DifficultyAnalysis from './DifficultyAnalysis';

interface SongSelectionProps {
  onFileLoaded: (file: File) => void;
  onSongSelected: () => void;
  onBack: () => void;
  loadedSongName: string | null;
  analysisResult: ExtendedResult | null;
  isLoading: boolean;
}

const SongSelection: React.FC<SongSelectionProps> = ({
  onFileLoaded,
  onSongSelected,
  onBack,
  loadedSongName,
  analysisResult,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoaded(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const buttonBaseStyle = "w-full font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg";
  const primaryButtonStyle = "bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-400";
  const secondaryButtonStyle = "bg-violet-500 hover:bg-violet-600 text-white focus:ring-violet-400";
  const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-40 p-4">
       <div className="absolute top-4 left-4">
            <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to Menu</button>
       </div>

      <div className="bg-slate-800/50 backdrop-blur-sm p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-2xl w-full ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <h2 className="text-4xl font-bold text-cyan-400 mb-6">Select a Song</h2>

        <div className="bg-slate-900/50 p-6 rounded-lg mb-6 min-h-[120px] flex flex-col items-center justify-center ring-1 ring-slate-700">
            {isLoading ? (
                <div className="flex items-center space-x-3 p-4 text-cyan-300 font-semibold text-lg">
                    <svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading & Analyzing...</span>
                </div>
            ) : loadedSongName ? (
                <div className="text-center">
                    <p className="text-2xl font-semibold text-white truncate mb-2">{loadedSongName}</p>
                    {analysisResult && <DifficultyAnalysis analysisResult={analysisResult} />}
                </div>
            ) : (
                <p className="text-xl text-slate-400">Import a MIDI or MusicXML file to begin.</p>
            )}
        </div>
        
        <div className="space-y-4">
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
              className={`${buttonBaseStyle} ${secondaryButtonStyle} cursor-pointer`}
              role="button"
            >
             Import Song
            </label>

             <button 
                onClick={onSongSelected}
                disabled={!loadedSongName || isLoading}
                className={`${buttonBaseStyle} ${primaryButtonStyle}`}
             >
                Next &rarr;
            </button>
        </div>
      </div>
    </div>
  );
};

export default SongSelection;
