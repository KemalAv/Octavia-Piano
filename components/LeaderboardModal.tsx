import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { OnlineSong, Score, PerformanceSummary } from '../types';
import ViewProfileModal from './ViewProfileModal'; // Import the new ViewProfileModal
import PerformanceSummaryModal from './PerformanceSummaryModal'; // Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary } from '../utils'; // NEW: Import utility for score conversion

interface LeaderboardModalProps {
  song: OnlineSong | null;
  onClose: () => void;
  onGoToOnlineSong: (songId: string) => void; 
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ song, onClose, onGoToOnlineSong }) => {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  const [selectedPerformanceSummary, setSelectedPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [selectedPlayerProfileId, setSelectedPlayerProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (song) {
        const timer = setTimeout(() => setIsRendered(true), 10);
        return () => clearTimeout(timer);
    } else {
        setIsRendered(false);
    }
  }, [song]);

  const fetchScores = useCallback(async () => {
    if (!song) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch scores and songs
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*, songs(title, artist)')
        .eq('song_id', song.id)
        .order('final_score', { ascending: false })
        .limit(50);
        
      if (scoresError) {
        console.error("Supabase error (scores):", scoresError);
        throw scoresError;
      }

      const scores = scoresData as Score[];
      
      // 2. Fetch profiles separately
      const userIds = [...new Set(scores.map(s => s.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, created_at')
          .in('id', userIds);
          
        if (profilesError) {
          console.error("Supabase error (profiles):", profilesError);
          // Don't throw, just log and continue without profiles
        } else {
          profiles = profilesData || [];
        }
      }

      // 3. Merge profiles into scores
      const scoresWithProfiles = scores.map(s => ({
        ...s,
        profiles: profiles.find(p => p.id === s.user_id) || null
      }));

      setScores(scoresWithProfiles);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Detailed error:", err);
      setError(`Failed to load leaderboard: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [song]);

  useEffect(() => {
    if (song) {
      fetchScores();
    } else {
        setScores([]); // Clear scores when modal closes
        setSelectedPerformanceSummary(null); // NEW: Clear summary on close
        setSelectedPlayerProfileId(null); // NEW: Clear profile on close
    }
  }, [song, fetchScores]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
  };

  const handleOpenPerformanceSummary = (score: Score) => {
    // FIX: Access 'artist' property from 'score.songs' with optional chaining.
    setSelectedPerformanceSummary(convertScoreToPerformanceSummary(score, `${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`));
  };

  const handleClosePerformanceSummary = () => {
    setSelectedPerformanceSummary(null);
  };

  const handleOpenProfile = (userId: string) => {
    setSelectedPlayerProfileId(userId);
  };

  const handleCloseProfile = () => {
    setSelectedPlayerProfileId(null);
  };

  const handleGoToSongClick = () => {
    if (song) {
        onClose(); // Close the leaderboard modal
        onGoToOnlineSong(song.id); // Navigate to the song in OnlineSongBrowser
    }
  };


  if (!song) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-2xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
                <h2 
                    id="leaderboard-modal-title" 
                    className="text-2xl font-bold text-cyan-400 truncate cursor-pointer hover:text-cyan-300 hover:underline" 
                    title={`View & Play MIDI: ${song.title}`}
                    onClick={handleGoToSongClick}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoToSongClick(); }}
                    tabIndex={0}
                    role="button"
                >
                    Leaderboard: {song.title}
                </h2>
                <button onClick={onClose} className="text-3xl text-slate-400 hover:text-white" aria-label="Close leaderboard">&times;</button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
          {loading && <div className="text-center p-8 text-slate-300 animate-pulse">Loading Scores...</div>}
          {error && <div className="text-center p-8 text-red-400">{error}</div>}
          {!loading && !error && scores.length === 0 && (
            <div className="text-center p-8 text-slate-400">No scores have been submitted for this MIDI yet.</div>
          )}
          {!loading && !error && scores.length > 0 && (
            <table className="w-full text-left table-auto">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  <th className="p-2 text-sm font-semibold text-slate-400 w-16">#</th>
                  <th className="p-2 text-sm font-semibold text-slate-400">Player</th>
                  <th className="p-2 text-sm font-semibold text-slate-400">Date</th>
                  <th className="p-2 text-sm font-semibold text-slate-400 text-right">Score</th>
                  <th className="p-2 text-sm font-semibold text-slate-400 text-right w-16">Rank</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => (
                  <tr key={score.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-2 font-bold text-slate-300 text-center">{index + 1}</td>
                    <td 
                        className="p-2 font-semibold text-white truncate cursor-pointer hover:text-cyan-300"
                        onClick={() => handleOpenProfile(score.user_id)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View profile of ${score.profiles?.username || 'Anonymous'}`}
                    >
                        {score.profiles?.username || 'Anonymous'}
                    </td>
                    <td className="p-2 text-xs text-slate-400 whitespace-nowrap">{formatDate(score.created_at)}</td>
                    <td 
                        className="p-2 font-mono text-cyan-300 text-right cursor-pointer hover:underline"
                        onClick={() => handleOpenPerformanceSummary(score)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View performance summary for score ${Math.round(score.final_score).toLocaleString()}`}
                    >
                        {Math.round(score.final_score).toLocaleString()}
                    </td>
                    <td 
                        className="p-2 font-bold text-lg text-right cursor-pointer hover:underline"
                        onClick={() => handleOpenPerformanceSummary(score)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View performance summary for rank ${score.rank}`}
                    >
                        {score.rank}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedPerformanceSummary && (
        <PerformanceSummaryModal 
            isVisible={!!selectedPerformanceSummary} 
            summary={selectedPerformanceSummary} 
            onClose={handleClosePerformanceSummary}
        />
      )}
      {selectedPlayerProfileId && (
        <ViewProfileModal 
            isOpen={!!selectedPlayerProfileId} 
            userId={selectedPlayerProfileId} 
            onClose={handleCloseProfile} 
            onGoToOnlineSong={onGoToOnlineSong}
        />
      )}
    </div>
  );
};

export default LeaderboardModal;
