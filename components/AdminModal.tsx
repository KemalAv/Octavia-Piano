
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { analyzeMidi } from '../midiAnalysis';
import { parseFileForAnalysis } from '../midiParser';
import { PIANO_KEYS_CONFIG } from '../constants';
import { OnlineSong } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowDetailMode?: boolean;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, lowDetailMode = false }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
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
        const { data: songs, error: fetchError } = await supabase.from('songs').select('id, title, file_path');
        if (fetchError) throw fetchError;
        
        setTotal(songs.length);
        addLog(`Found ${songs.length} songs.`);

        let completed = 0;
        for (const song of songs as OnlineSong[]) {
            try {
                addLog(`Processing: ${song.title}`);
                const { data: blob, error: dlError } = await supabase.storage.from('midi-files').download(song.file_path);
                if (dlError) throw dlError;

                const file = new File([blob!], 'temp.mid');
                const analysisData = await parseFileForAnalysis(file, midiNoteToNameMap);
                if (!analysisData) throw new Error("Parse failed");

                const result = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs, undefined, analysisData.originalTotalMusicalDurationMs);
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

        // Debugging Baris Pertama
        addLog("DEBUG: Inspecting first entry structure...");
        addLog(`DEBUG DATA: ${JSON.stringify(rawScores[0]).substring(0, 150)}...`);

        let completed = 0;
        for (const entry of rawScores as any[]) {
            try {
                // Mencari Performance Score dengan berbagai kemungkinan struktur join Supabase
                let basePS = 0;
                if (entry.songs) {
                    basePS = Array.isArray(entry.songs) ? (entry.songs[0]?.performance_score || 0) : (entry.songs.performance_score || 0);
                }

                // Jika join gagal, coba fetch manual sebagai fallback (lambat tapi pasti)
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

                // Rumus Pure Curve
                const gameplayPS = (entry.accuracy + entry.speed) / 2;
                const p = Math.max(0, Math.min(1, gameplayPS / 100));
                const factor = (gameplayPS >= 100) ? 1 : Math.pow(p, 3.5) * (0.5 + 0.5 * Math.pow(p, 8));
                const newFinalScore = parseFloat((basePS * factor).toFixed(2));

                // Hitung Rank
                let rank = 'D';
                if (gameplayPS >= 100) rank = 'X';
                else if (gameplayPS >= 97.5) rank = 'SS';
                else if (gameplayPS >= 95) rank = 'S';
                else if (gameplayPS >= 91.25) rank = 'A';
                else if (gameplayPS >= 87.5) rank = 'B';
                else if (gameplayPS >= 75) rank = 'C';

                // UPDATE
                const { error: upError } = await supabase
                    .from('scores')
                    .update({ final_score: newFinalScore, rank: rank })
                    .eq('id', entry.id);

                if (upError) throw upError;

                // VERIFIKASI (Opsional untuk testing, ambil data lagi untuk memastikan update 'ngefek')
                const { data: verifyData } = await supabase.from('scores').select('final_score').eq('id', entry.id).single();
                const isVerified = verifyData?.final_score === newFinalScore;

                addLog(` -> Score ${entry.id.substring(0,8)}: ${entry.final_score} -> ${newFinalScore} (${isVerified ? 'VERIFIED' : 'FAILED TO WRITE'})`);
                
                if (!isVerified) throw new Error("Database did not accept the new value. Check RLS Policies.");

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

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`} onClick={onClose}>
      <div className={`p-8 rounded-xl shadow-2xl max-w-2xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh] transition-all duration-300 bg-slate-800 ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-cyan-400">Admin Migration Tools</h2>
            <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-white text-3xl">&times;</button>
        </div>
        
        <div className="space-y-4 mb-6">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-red-500/30">
                <h3 className="text-lg font-bold text-red-400 mb-1">Step 1: Update Song Metadata</h3>
                <p className="text-xs text-slate-400 mb-3">Re-analyzes MIDI files to set new base Performance Scores in 'songs' table.</p>
                <button onClick={handleReanalyze} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-bold disabled:opacity-50">Run Song Analysis</button>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-orange-500/30">
                <h3 className="text-lg font-bold text-orange-400 mb-1">Step 2: Recalculate Player Scores</h3>
                <p className="text-xs text-slate-400 mb-3">Updates 'scores' table using the new base PS from 'songs'.</p>
                <button onClick={handleRecalculatePlayerScores} disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 py-2 rounded font-bold disabled:opacity-50">Run Score Recalculation</button>
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
