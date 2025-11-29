
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Score, OnlineSong, PerformanceSummary } from '../types'; // Import PerformanceSummary type
import PerformanceSummaryModal from './PerformanceSummaryModal'; // Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary } from '../utils'; // Import utility for score conversion


interface ViewProfileModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onGoToOnlineSong: (songId: string) => void; // FIX: Changed prop type from `(file: File, onlineSongId: string) => Promise<void>` to `(songId: string) => void`
}

const ViewProfileModal: React.FC<ViewProfileModalProps> = ({ isOpen, userId, onClose, onGoToOnlineSong }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTopScores, setUserTopScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPerformanceSummary, setSelectedPerformanceSummary] = useState<PerformanceSummary | null>(null); // NEW


  const fetchProfileData = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setUserTopScores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at') // Fetch created_at from profiles table
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setProfile(profileData || null);

      // Fetch user's top scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*, songs(title, artist)') // Fetch song title and artist for context
        .eq('user_id', userId)
        .order('final_score', { ascending: false })
        .limit(5); // Show top 5 scores

      if (scoresError) throw scoresError;
      setUserTopScores(scoresData as Score[]);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load profile: ${errorMessage}`);
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchProfileData();
    } else {
        // Reset state when modal is closed
        setProfile(null);
        setUserTopScores([]);
        setLoading(true);
        setError(null);
        setSelectedPerformanceSummary(null); // NEW: Clear summary on close
    }
  }, [isOpen, fetchProfileData]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (e) {
        console.error("Error formatting date:", e, dateString);
        return 'Invalid Date';
    }
  };

  const PlaceholderAvatar = () => (
    <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );

  // NEW: Handler to open performance summary
  const handleOpenPerformanceSummary = (score: Score) => {
    setSelectedPerformanceSummary(convertScoreToPerformanceSummary(score, `${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`));
  };

  // NEW: Handler to close performance summary
  const handleClosePerformanceSummary = () => {
    setSelectedPerformanceSummary(null);
  };

  const handleGoToSongClick = (songId: string) => {
    onClose(); // Close the profile modal first
    onGoToOnlineSong(songId); // Then navigate to the song in OnlineSongBrowser
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950 bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-profile-modal-title"
    >
      <div
        className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 id="view-profile-modal-title" className="text-2xl font-bold text-cyan-400">
            Player Profile
          </h2>
          <button onClick={onClose} className="text-3xl text-slate-400 hover:text-white" aria-label="Close profile">&times;</button>
        </div>

        {loading ? (
          <div className="text-center p-8 text-slate-300 animate-pulse">Loading profile...</div>
        ) : error ? (
          <div className="text-center p-8 text-red-400">{error}</div>
        ) : profile ? (
          <>
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 flex-shrink-0">
              <div className="w-24 h-24 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.username}'s Avatar`} className="w-full h-full rounded-full object-cover ring-2 ring-slate-600" />
                ) : (
                  <PlaceholderAvatar />
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-white text-3xl font-bold">{profile.username}</p>
                <p className="text-slate-400 text-sm mt-1">Member since: {formatDate(profile.created_at)}</p>
              </div>
            </div>

            {userTopScores.length > 0 && (
              <div className="flex-grow flex flex-col min-h-0 mt-4">
                <h3 className="text-xl font-semibold text-violet-400 mb-2 flex-shrink-0">Top Scores</h3>
                <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-lg p-2 ring-1 ring-slate-700/50">
                  <table className="w-full text-left table-auto">
                    <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                      <tr>
                        <th className="p-2 text-xs font-semibold text-slate-400">Song</th>
                        <th className="p-2 text-xs font-semibold text-slate-400 text-right">Score</th>
                        <th className="p-2 text-xs font-semibold text-slate-400 text-center">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userTopScores.map((score) => (
                        <tr key={score.id} className="border-b border-slate-700">
                          <td 
                            className="p-2 text-sm text-white truncate cursor-pointer hover:text-cyan-300 hover:underline" 
                            title={`View & Play: ${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`}
                            onClick={() => handleGoToSongClick(score.song_id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoToSongClick(score.song_id); }}
                            tabIndex={0}
                            role="button"
                          >
                            {score.songs?.artist || 'Unknown Artist'} - {score.songs?.title || 'Unknown MIDI'}
                          </td>
                          <td 
                              className="p-2 font-mono text-cyan-300 text-right cursor-pointer hover:underline"
                              onClick={() => handleOpenPerformanceSummary(score)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenPerformanceSummary(score); }}
                              tabIndex={0}
                              role="button"
                          >
                            {Math.round(score.final_score).toLocaleString()}
                          </td>
                          <td 
                              className="p-2 font-bold text-lg text-center cursor-pointer hover:underline"
                              onClick={() => handleOpenPerformanceSummary(score)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenPerformanceSummary(score); }}
                              tabIndex={0}
                              role="button"
                          >
                            {score.rank}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!loading && userTopScores.length === 0 && (
                <div className="text-slate-400 text-center p-4">No ranked scores yet.</div>
            )}
          </>
        ) : (
          <div className="text-center p-8 text-slate-400">Profile not found.</div>
        )}
        
        <div className="mt-6 flex-shrink-0">
          <button onClick={onClose} className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg text-base transition-colors">Close</button>
        </div>
      </div>

      {/* NEW: Performance Summary Modal */}
      {selectedPerformanceSummary && (
        <PerformanceSummaryModal 
            isVisible={!!selectedPerformanceSummary} 
            summary={selectedPerformanceSummary} 
            onClose={handleClosePerformanceSummary}
        />
      )}
    </div>
  );
};

export default ViewProfileModal;