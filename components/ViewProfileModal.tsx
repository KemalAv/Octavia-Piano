
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, Score, OnlineSong, PerformanceSummary, LeaderboardEntry } from '../types'; // Import PerformanceSummary type
import PerformanceSummaryModal from './PerformanceSummaryModal'; // Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary, getRankColorClass } from '../utils'; // Import utility for score conversion


interface ViewProfileModalProps {
  isOpen: boolean;
  userId: string | null;
  onClose: () => void;
  onGoToOnlineSong: (songId: string) => void; 
  globalRank?: number;
}

const ViewProfileModal: React.FC<ViewProfileModalProps> = ({ isOpen, userId, onClose, onGoToOnlineSong, globalRank }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userTopScores, setUserTopScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [instrumentTab, setInstrumentTab] = useState<'piano' | 'drum'>('piano');

  const [profileRank, setProfileRank] = useState<number | null>(null);
  const [profileTotalScore, setProfileTotalScore] = useState<number | null>(null);

  const [selectedPerformanceSummary, setSelectedPerformanceSummary] = useState<PerformanceSummary | null>(null); // NEW

  useEffect(() => {
    if (isOpen) {
        const timer = setTimeout(() => setIsRendered(true), 10);
        return () => clearTimeout(timer);
    } else {
        setIsRendered(false);
    }
  }, [isOpen]);

  const formatPlaytime = (ms: number) => {
    if (!ms || ms < 0) return '0h 0m';
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

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
        .select('id, username, avatar_url, created_at, bio, total_playtime_ms, total_notes_hit')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setProfile(profileData || null);

      // Fetch user's top scores
      let scoresQuery = supabase
        .from('scores')
        .select('*, songs!inner(title, artist, is_ranked)') // Fetch song title and artist for context
        .eq('user_id', userId)
        .eq('songs.is_ranked', true)
        .order('final_score', { ascending: false });

      // Filter by gameplay_style groups instead of instrument_mode
      if (instrumentTab === 'piano') {
        scoresQuery = scoresQuery.in('gameplay_style', ['Piano', 'Computer Keyboard']);
      } else {
        scoresQuery = scoresQuery.in('gameplay_style', ['Keyboard/Touchscreen', 'Drum MIDI']);
      }

      const { data: scoresData, error: scoresError } = await scoresQuery;

      if (scoresError) throw scoresError;
      
      const highestScoresMap = new Map<string, Score>();
      for (const score of scoresData) {
        if (score.songs?.is_ranked === true) { 
          const existingHighestScore = highestScoresMap.get(score.song_id);
          if (!existingHighestScore || score.final_score > existingHighestScore.final_score) {
            highestScoresMap.set(score.song_id, score as Score);
          }
        }
      }
      
      const uniqueHighestScores = Array.from(highestScoresMap.values()).sort((a, b) => b.final_score - a.final_score);
      setUserTopScores(uniqueHighestScores);
      
      // Fetch rank and total score from the authoritative RPC function
      try {
        // Check if instrument_mode column exists in scores table
        const { data: testData, error: testError } = await supabase.from('scores').select('instrument_mode').limit(1);
        const hasInstrumentMode = !testError || testError.code !== '42703';

        const rpcParams = hasInstrumentMode ? { p_instrument_mode: instrumentTab } : {};
        const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_leaderboard', rpcParams);
        if (leaderboardError) throw leaderboardError;
        
        const userEntry = (leaderboardData as LeaderboardEntry[]).find(entry => entry.user_id === userId);
        if (userEntry) {
            const userRank = (leaderboardData as LeaderboardEntry[]).indexOf(userEntry) + 1;
            setProfileRank(userRank);
            setProfileTotalScore(userEntry.total_score);
        } else {
            setProfileRank(null);
            setProfileTotalScore(0);
        }
      } catch (err) {
          console.error("Error fetching profile rank/score:", err);
          setProfileRank(null);
          setProfileTotalScore(0);
      }

    } catch (err: unknown) {
      // Supabase errors are objects with a `message` property, not instances of Error.
      const errorMessage = (err && typeof err === 'object' && 'message' in err)
        ? (err as { message: string }).message
        : String(err);
      setError(`Failed to load profile: ${errorMessage}`);
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, globalRank, instrumentTab]);

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
        setProfileRank(null);
        setProfileTotalScore(null);
    }
  }, [isOpen, fetchProfileData, instrumentTab]);

  const formatScoreDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return 'Invalid';
    }
  };

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
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-profile-modal-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
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
                {profile.bio && (
                    <p className="text-slate-300 text-sm mt-2 italic border-l-2 border-slate-600 pl-3">
                        {profile.bio}
                    </p>
                )}
                {profile?.total_playtime_ms !== undefined && (
                    <div className="flex items-baseline gap-4 mt-2 text-slate-300 flex-wrap justify-center sm:justify-start">
                        <div>
                            <span className="text-sm">Total Playtime</span>
                            <p className="text-2xl font-bold text-white">{formatPlaytime(profile?.total_playtime_ms || 0)}</p>
                        </div>
                        <div>
                            <span className="text-sm">Total Notes Hit</span>
                            <p className="text-2xl font-bold text-white">{(profile?.total_notes_hit || 0).toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>
          </div>

              <div className="flex-grow flex flex-col min-h-0 mt-4 overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-semibold text-violet-400">Ranked Performances</h3>
                        <div className="flex items-baseline gap-4 mt-1">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">Global Rank</span>
                                <p className="text-lg font-bold text-white">#{profileRank ? profileRank.toLocaleString() : 'N/A'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">Total Score</span>
                                <p className="text-lg font-bold text-white">{profileTotalScore !== null ? Math.round(profileTotalScore).toLocaleString() : '...'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex bg-slate-700 rounded-lg p-1">
                        <button 
                            onClick={() => setInstrumentTab('piano')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${instrumentTab === 'piano' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Piano
                        </button>
                        <button 
                            onClick={() => setInstrumentTab('drum')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${instrumentTab === 'drum' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Drum
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-grow flex items-center justify-center p-8 text-slate-400 animate-pulse bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
                        Loading performances...
                    </div>
                ) : userTopScores.length > 0 ? (
                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-lg p-2 ring-1 ring-slate-700/50">
                        <table className="w-full text-left table-auto">
                            <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2 text-xs font-semibold text-slate-400">Song</th>
                                    <th className="p-2 text-xs font-semibold text-slate-400">Date</th>
                                    <th className="p-2 text-xs font-semibold text-slate-400 text-right">Score</th>
                                    <th className="p-2 text-xs font-semibold text-slate-400 text-center">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userTopScores.map((score) => (
                                    <tr key={score.id} className="border-b border-slate-700 hover:bg-slate-800/30 transition-colors">
                                        <td 
                                            className="p-2 text-sm text-white truncate cursor-pointer hover:text-cyan-300 hover:underline" 
                                            title={`View & Play: ${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`}
                                            onClick={() => handleGoToSongClick(score.song_id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleGoToSongClick(score.song_id); }}
                                            tabIndex={0}
                                            role="button"
                                        >
                                            <div className="font-medium truncate max-w-[120px] sm:max-w-[200px]">{score.songs?.artist || 'Unknown Artist'} - {score.songs?.title || 'Unknown MIDI'}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{score.gameplay_style}</div>
                                        </td>
                                        <td className="p-2 text-xs text-slate-400 whitespace-nowrap">{formatScoreDate(score.created_at)}</td>
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
                                            <span className={getRankColorClass(score.rank)}>
                                                {score.rank}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center p-8 text-slate-400 text-center bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
                        No ranked scores for this instrument yet.
                    </div>
                )}
              </div>
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
