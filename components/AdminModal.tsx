
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { analyzeMidi } from '../midiAnalysis';
import { parseFileForAnalysis } from '../midiParser';
import { PIANO_KEYS_CONFIG, DRUM_MIDI_TO_NAME_MAP } from '../constants';
import { OnlineSong } from '../types';
import { calculateScoreMultiplier } from '../utils';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowDetailMode?: boolean;
  onNavigateToCalibration?: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, lowDetailMode = false, onNavigateToCalibration }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
    Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) => map.set(parseInt(midi), name));
    return map;
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleReanalyze = useCallback(async () => {
    if (!window.confirm("Step 1: Re-analyze all songs. This will update the base Performance Score in 'songs' table. Proceed?")) return;

    setIsLoading(true);
    setLogs([]);
    setProgress(0);
    setErrorCount(0);

    try {
        addLog("Fetching songs...");
        const { data: songs, error: fetchError } = await supabase.from('songs').select('id, title, file_path, instrument_mode');
        if (fetchError) throw fetchError;
        
        setTotal(songs.length);
        addLog(`Found ${songs.length} songs.`);

        let completed = 0;
        for (const song of songs as any[]) {
            try {
                addLog(`Processing: ${song.title}`);
                const { data: blob, error: dlError } = await supabase.storage.from('midi-files').download(song.file_path);
                if (dlError) throw dlError;

                const file = new File([blob!], 'temp.mid');
                const isDrum = (song as any).instrument_mode === 'drum';
                const currentMidiNoteToNameMap = new Map<number, string>();
                PIANO_KEYS_CONFIG.forEach(key => currentMidiNoteToNameMap.set(key.midiNote, key.name));
                if (isDrum) {
                    Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) => currentMidiNoteToNameMap.set(parseInt(midi), name));
                }

                const analysisData = await parseFileForAnalysis(file, currentMidiNoteToNameMap);
                if (!analysisData) throw new Error("Parse failed");

                const result = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs, undefined, analysisData.originalTotalMusicalDurationMs, (song as any).instrument_mode);
                const newPS = result?.performanceScore || 0;

                const { error: upError } = await supabase.from('songs').update({
                    performance_score: newPS,
                    difficulty_level: result?.difficultyLevel,
                    total_notes: result?.meta.totalNotes,
                    duration_sec: result?.meta.durationSec
                }).eq('id', song.id);

                if (upError) throw upError;
                addLog(` -> Updated Base PS to ${newPS}`);
            } catch (e: any) {
                addLog(` -> ERROR: ${e.message}`);
                setErrorCount(prev => prev + 1);
            } finally {
                completed++;
                setProgress(completed);
            }
        }
        addLog("Step 1 Finished.");
    } catch (err: any) {
        addLog(`FATAL: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [midiNoteToNameMap]);

const handleRecalculatePlayerScores = useCallback(async () => {
  if (!window.confirm("Step 2: Recalculate all player final scores using new Base PS. Proceed?")) return;

  setIsLoading(true);
  setLogs([]);
  setProgress(0);
  setErrorCount(0);

  try {
      addLog("Fetching player scores...");
      const { data: rawScores, error: fetchError } = await supabase
          .from('scores')
          .select('*, songs(performance_score)');

      if (fetchError) throw fetchError;
      if (!rawScores || rawScores.length === 0) {
          addLog("No scores found to recalculate.");
          return;
      }

      setTotal(rawScores.length);
      addLog(`Found ${rawScores.length} entries.`);

      let completed = 0;
      for (const entry of rawScores as any[]) {
          try {
              // Ambil base Performance Score
              let basePS = 0;
              if (entry.songs) {
                  basePS = Array.isArray(entry.songs) ? (entry.songs[0]?.performance_score || 0) : (entry.songs.performance_score || 0);
              }

              // Fallback jika join gagal
              if (!basePS) {
                  const { data: songData } = await supabase.from('songs').select('performance_score').eq('id', entry.song_id).single();
                  basePS = songData?.performance_score || 0;
              }

              if (!basePS) {
                  addLog(` -> Score ${entry.id.substring(0,8)}: SKIPPED (Base PS is 0 or Song not found)`);
                  completed++;
                  setProgress(completed);
                  continue;
              }

              const totalNotes = (entry.perfect_count || 0) + (entry.great_count || 0) + (entry.good_count || 0) + (entry.miss_count || 0);
              const effectiveTotal = (entry.total_notes || 0) > 0 ? entry.total_notes : totalNotes;

              // Hitung akurasi % (Non-Stop mode style)
              const score = ((entry.perfect_count || 0) * 1.0) + ((entry.great_count || 0) * 0.3333333333) + ((entry.good_count || 0) * 0.1666666667);
              const accuracy = effectiveTotal > 0 ? (score / effectiveTotal) * 100 : 100;

              // Match App.tsx: caps speedEff at 100. Since we don't have duration/wait data, we assume no waiting.
              const speedEff = 100; 
              const gameplayPS = (accuracy + speedEff) / 2;

              let rank = "D";
              if (gameplayPS >= 100) rank = "X";
              else if (gameplayPS >= 97.5) rank = "SS";
              else if (gameplayPS >= 95) rank = "S";
              else if (gameplayPS >= 92.5) rank = "A";
              else if (gameplayPS >= 90) rank = "B";
              else if (gameplayPS >= 87.5) rank = "C";
              else rank = "D";

              const multiplier = calculateScoreMultiplier(gameplayPS);
              const calculatedFinalScore = basePS * multiplier;

              const newFinalScore = Math.round(calculatedFinalScore);

              if (isNaN(newFinalScore)) {
                  addLog(` -> Score ${entry.id.substring(0,8)}: SKIPPED (Calculated score is NaN)`);
                  completed++;
                  setProgress(completed);
                  continue;
              }

              // UPDATE
              const { error: upError } = await supabase
                  .from('scores')
                  .update({ final_score: newFinalScore, rank, accuracy: parseFloat(accuracy.toFixed(2)) })
                  .eq('id', entry.id);

              if (upError) throw upError;

              addLog(` -> Score ${entry.id.substring(0,8)}: Updated to ${newFinalScore} (Rank ${rank})`);

          } catch (e: any) {
              addLog(` -> ERROR on ${entry.id.substring(0,8)}: ${e.message}`);
              setErrorCount(prev => prev + 1);
          } finally {
              completed++;
              setProgress(completed);
              if (completed % 15 === 0) await new Promise(r => setTimeout(r, 100));
          }
      }

      addLog("Step 2 Finished.");
  } catch (err: any) {
      addLog(`FATAL: ${err.message}`);
  } finally {
      setIsLoading(false);
  }
}, []);

const handleCleanDuplicateScores = useCallback(async () => {
  if (!window.confirm("Step 3: Clean up all duplicate scores in Supabase, keeping ONLY the highest score per user per song? Proceed?")) return;

  setIsLoading(true);
  setLogs([]);
  setProgress(0);
  setErrorCount(0);

  try {
      addLog("Fetching all scores to check for duplicates...");
      const { data: allScores, error: fetchError } = await supabase
          .from('scores')
          .select('id, user_id, song_id, instrument_mode, final_score, created_at')
          .order('final_score', { ascending: false });

      if (fetchError) throw fetchError;
      if (!allScores || allScores.length === 0) {
          addLog("No scores found in database.");
          return;
      }

      addLog(`Analyzing ${allScores.length} total score records...`);

      // Group scores by unique key: userId + songId + (instrument_mode || 'piano')
      const groups = new Map<string, any[]>();
      for (const score of allScores) {
          const key = `${score.user_id}_${score.song_id}_${score.instrument_mode || 'piano'}`;
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)!.push(score);
      }

      const duplicateIdsToDelete: string[] = [];
      let duplicateGroupsCount = 0;

      for (const [, groupScores] of groups.entries()) {
          if (groupScores.length > 1) {
              duplicateGroupsCount++;
              // Since allScores was sorted by final_score DESC, index 0 is the highest score
              const toDelete = groupScores.slice(1).map(s => s.id);
              duplicateIdsToDelete.push(...toDelete);
          }
      }

      if (duplicateIdsToDelete.length === 0) {
          addLog("No duplicate scores found! Database is already clean.");
          return;
      }

      addLog(`Found ${duplicateIdsToDelete.length} duplicate/lower scores across ${duplicateGroupsCount} entries.`);
      setTotal(duplicateIdsToDelete.length);

      // Delete in batches of 50
      const BATCH_SIZE = 50;
      let deletedCount = 0;
      for (let i = 0; i < duplicateIdsToDelete.length; i += BATCH_SIZE) {
          const batch = duplicateIdsToDelete.slice(i, i + BATCH_SIZE);
          const { error: delError } = await supabase
              .from('scores')
              .delete()
              .in('id', batch);

          if (delError) {
              addLog(` -> ERROR deleting batch: ${delError.message}`);
              setErrorCount(prev => prev + batch.length);
          } else {
              deletedCount += batch.length;
              addLog(` -> Deleted ${deletedCount}/${duplicateIdsToDelete.length} duplicate scores...`);
          }
          setProgress(deletedCount);
          await new Promise(r => setTimeout(r, 100));
      }

      addLog(`Cleanup Finished! Successfully removed ${deletedCount} duplicate scores.`);
  } catch (err: any) {
      addLog(`FATAL: ${err.message}`);
  } finally {
      setIsLoading(false);
  }
}, []);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`} onClick={onClose}>
      <div className={`p-8 rounded-xl shadow-2xl max-w-2xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh] transition-all duration-300 bg-slate-800 ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-cyan-400">Admin Migration Tools</h2>
            <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-white text-3xl">&times;</button>
        </div>
        
        <div className="space-y-4 mb-6">
            {onNavigateToCalibration && (
              <div className="bg-slate-900/50 p-4 rounded-lg border border-yellow-500/30">
                  <h3 className="text-lg font-bold text-yellow-400 mb-1">🎹 Calibration Workbench</h3>
                  <p className="text-xs text-slate-400 mb-3">Fine-tune the complexity analysis weights, calculate real-time performance scores, and export calibration results.</p>
                  <button 
                    onClick={() => {
                      onNavigateToCalibration();
                    }} 
                    disabled={isLoading} 
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-slate-950 py-2 rounded font-bold transition disabled:opacity-50"
                  >
                    Open Calibration Panel
                  </button>
              </div>
            )}

            <div className="bg-slate-900/50 p-4 rounded-lg border border-red-500/30">
                <h3 className="text-lg font-bold text-red-400 mb-1">Step 1: Update Song Metadata (Piano & Drum)</h3>
                <p className="text-xs text-slate-400 mb-3">Re-analyzes MIDI files for both Piano and Drum modes to set new base Performance Scores.</p>
                <button onClick={handleReanalyze} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-bold disabled:opacity-50">Run Song Analysis</button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-orange-500/30">
                <h3 className="text-lg font-bold text-orange-400 mb-1">Step 2: Recalculate Player Scores</h3>
                <p className="text-xs text-slate-400 mb-3">Recalculate Player Scores match new system</p>
                <button onClick={handleRecalculatePlayerScores} disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded font-bold disabled:opacity-50">Run Score Recalculation</button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-400 mb-1">Step 3: Clean Duplicate Scores</h3>
                <p className="text-xs text-slate-400 mb-3">Scan and remove all older/lower duplicate scores, keeping only each player's highest score per MIDI.</p>
                <button onClick={handleCleanDuplicateScores} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded font-bold disabled:opacity-50">Clean Duplicate Scores Now</button>
            </div>
        </div>

        {total > 0 && (
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Progress: {progress}/{total}</span>
                    <span className="text-red-400">{errorCount} Errors</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${(progress/total)*100}%` }}></div>
                </div>
            </div>
        )}

        <div className="flex-grow flex flex-col min-h-0">
            <label className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Diagnostic Logs</label>
            <textarea
                readOnly
                value={logs.join('\n')}
                className="w-full flex-grow bg-black/50 text-emerald-400 text-[10px] font-mono p-3 rounded border border-slate-700 custom-scrollbar resize-none"
                placeholder="Waiting for process..."
            />
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
