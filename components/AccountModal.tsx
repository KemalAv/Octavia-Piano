

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { Score, Profile, PerformanceSummary, LeaderboardEntry } from '../types'; // Import PerformanceSummary type
import PerformanceSummaryModal from './PerformanceSummaryModal'; // Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary } from '../utils'; // Import utility for score conversion
import { ADMIN_UUID } from '../constants';


interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToOnlineSong: (songId: string) => void; // NEW: Callback to navigate to online song browser
}

// Set a very long expiration time for avatar signed URLs (approx. 1000 years)
// This makes the avatar URLs effectively permanent without making the bucket public.
const AVATAR_SIGNED_URL_EXPIRY_SECONDS = 1000 * 365.25 * 24 * 60 * 60; // ~3.15e10 seconds

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onGoToOnlineSong }) => {
  const { user, session } = useAuth(); // Also get session for created_at, last_sign_in_at
  const [isRendered, setIsRendered] = useState(false);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topScores, setTopScores] = useState<Score[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  const [selectedPerformanceSummary, setSelectedPerformanceSummary] = useState<PerformanceSummary | null>(null); // NEW

  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);

  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);


  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  const fetchProfileAndScores = useCallback(async () => {
    if (!user) return;
    
    setLoadingScores(true);

    // Fetch profile (only username and avatar_url are needed for display in this modal)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url, last_nickname_change, bio, total_playtime_ms, total_notes_hit')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError);
    } else if (profileData) {
      setProfile(profileData as Profile);
      setUsername(profileData.username || user.email?.split('@')[0] || '');
      setAvatarUrl(profileData.avatar_url);
      setBio(profileData.bio || '');
    } else {
      setUsername(user.email?.split('@')[0] || '');
      setAvatarUrl(null);
      setBio('');
    }

    // Fetch scores, only for ranked songs
    const { data: scoresData, error: scoresError } = await supabase
      .from('scores')
      // Use !inner to ensure only scores related to ranked songs are returned
      // And include is_ranked in the songs selection to confirm the filter
      .select('*, songs!inner(title, artist, is_ranked)')
      .eq('user_id', user.id)
      // Apply the filter on the joined 'songs' table
      .eq('songs.is_ranked', true) 
      .order('final_score', { ascending: false });

      
    if (scoresError) {
      console.error("Error fetching top scores:", scoresError);
      setMessage({ type: 'error', text: 'Could not load top performances.' });
      setTotalScore(0);
      setTopScores([]);
    } else if (scoresData) {
      // Process scoresData to get the highest score for each unique song
      const highestScoresMap = new Map<string, Score>();
      for (const score of scoresData) {
        // No need for client-side filtering here, as the Supabase query already filters by is_ranked=true
        const existingHighestScore = highestScoresMap.get(score.song_id);
        if (!existingHighestScore || score.final_score > existingHighestScore.final_score) {
          highestScoresMap.set(score.song_id, score as Score);
        }
      }
      
      // Convert map values back to an array and sort by final_score descending
      const uniqueHighestScores = Array.from(highestScoresMap.values()).sort((a, b) => b.final_score - a.final_score);
      setTopScores(uniqueHighestScores);

      // NEW: Calculate Total Score with the new formula
      const newTotalScore = uniqueHighestScores.reduce((acc, score, index) => {
        return acc + score.final_score * Math.pow(0.98, index);
      }, 0);
      setTotalScore(newTotalScore);
    }
     // Fetch leaderboard data for rank only
    try {
        const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_leaderboard');
        if (leaderboardError) throw leaderboardError;

        const userEntry = (leaderboardData as LeaderboardEntry[]).find(entry => entry.user_id === user.id);
        if (userEntry) {
            const userRank = (leaderboardData as LeaderboardEntry[]).indexOf(userEntry) + 1;
            setGlobalRank(userRank);
        } else {
            setGlobalRank(null);
        }
    } catch (err) {
        console.error("Error fetching global rank:", err);
        // Don't set a message, it's not a critical failure
    }
    setLoadingScores(false);

  }, [user]);

  useEffect(() => {
    if (user && isOpen) {
      fetchProfileAndScores();
    }
    if (!isOpen) {
      setIsEditingUsername(false);
      setMessage(null);
      setTopScores([]);
      setSelectedPerformanceSummary(null); // NEW: Clear selected performance summary
    }
  }, [user, isOpen, fetchProfileAndScores]);

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      setMessage({ type: 'error', text: 'Username cannot be empty.' });
      return;
    }
    if (username.length > 20) {
      setMessage({ type: 'error', text: 'Username cannot be longer than 20 characters.' });
      return;
    }
    if (!user) {
      setMessage({ type: 'error', text: 'User not logged in.' });
      return;
    }

    setLoadingUsername(true);
    setMessage(null);

    // Nickname cooldown check
    if (user.id !== ADMIN_UUID) {
        if (profile?.last_nickname_change) {
            const lastChangeDate = new Date(profile.last_nickname_change);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            if (lastChangeDate > thirtyDaysAgo) {
                const daysRemaining = 30 - Math.ceil((Date.now() - lastChangeDate.getTime()) / (24 * 60 * 60 * 1000));
                setMessage({ type: 'error', text: `You can change your nickname again in ${daysRemaining} day(s).` });
                setLoadingUsername(false);
                return;
            }
        }
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        username: username,
        last_nickname_change: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (upsertError) {
      setMessage({ type: 'error', text: upsertError.message || 'Username may already be taken.' });
    } else {
      setMessage({ type: 'success', text: 'Username updated successfully!' });
      setIsEditingUsername(false);
      fetchProfileAndScores(); // Re-fetch profile to get latest data
    }
    setLoadingUsername(false);
  };

  const handleUpdateBio = async () => {
    if (!user) {
        setMessage({ type: 'error', text: 'User not logged in.' });
        return;
    }

    setLoadingBio(true);
    setMessage(null);

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            bio: bio,
        }, { onConflict: 'id' });
    
    if (error) {
        setMessage({ type: 'error', text: error.message || 'Failed to update bio.' });
    } else {
        setMessage({ type: 'success', text: 'Bio updated successfully!' });
        setIsEditingBio(false);
        fetchProfileAndScores(); // Refresh profile
    }
    setLoadingBio(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setMessage(null);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async (readerEvent) => {
      if (readerEvent.target?.result) {
        const img = new Image();
        img.src = readerEvent.target.result as string;

        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            setMessage({ type: 'error', text: 'Canvas context not available for image processing.' });
            setUploadingAvatar(false);
            return;
          }

          let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
          const imgAspectRatio = img.width / img.height;
          const canvasAspectRatio = MAX_SIZE / MAX_SIZE;

          if (imgAspectRatio > canvasAspectRatio) {
            sHeight = img.height;
            sWidth = img.height * canvasAspectRatio;
            sx = (img.width - sWidth) / 2;
          } else if (imgAspectRatio < canvasAspectRatio) {
            sWidth = img.width;
            sHeight = img.width / canvasAspectRatio;
            sy = (img.height - sHeight) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, MAX_SIZE, MAX_SIZE);

          // Force use of JPEG for consistency and to ensure upsert replaces the file correctly.
          const fileExt = 'jpg';

          canvas.toBlob(async (blob) => {
            if (!blob) {
              setMessage({ type: 'error', text: 'Failed to resize image.' });
              setUploadingAvatar(false);
              return;
            }
            const resizedFile = new File([blob], `avatar.${fileExt}`, { type: `image/jpeg` });
            
            try {
              // 1. CLEANUP: Delete any existing avatars for this user first
              // This handles cases where previous avatar was .png and new is .jpg (or vice versa)
              const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
              if (existingFiles && existingFiles.length > 0) {
                  const filesToRemove = existingFiles.map(f => `${user.id}/${f.name}`);
                  const { error: removeError } = await supabase.storage.from('avatars').remove(filesToRemove);
                  if (removeError) {
                      console.warn("Failed to clean up old avatars:", removeError);
                      // Continue anyway, upsert might handle it if name matches, or we just leave a ghost file
                  }
              }

              // 2. UPLOAD: New Avatar
              const filePath = `${user.id}/avatar.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                  .from('avatars')
                  .upload(filePath, resizedFile, { upsert: true });

              if (uploadError) throw uploadError;

              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('avatars')
                .createSignedUrl(filePath, AVATAR_SIGNED_URL_EXPIRY_SECONDS);
              
              if (signedUrlError) throw signedUrlError;

              if (signedUrlData) {
                const newAvatarUrl = signedUrlData.signedUrl;
                const { error: dbError } = await supabase
                  .from('profiles')
                  .upsert({ id: user.id, avatar_url: newAvatarUrl }, { onConflict: 'id' });

                if (dbError) throw dbError;
                setAvatarUrl(newAvatarUrl);
                setMessage({ type: 'success', text: 'Avatar updated successfully!' });
              } else {
                 throw new Error("Could not retrieve signed URL for avatar.");
              }
            } catch (err: unknown) {
              setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to upload avatar.' });
            } finally {
              setUploadingAvatar(false);
            }
          }, `image/jpeg`, 0.9); // Quality 90%, Force JPEG
        };

        img.onerror = () => {
            setMessage({ type: 'error', text: 'Could not load image file.' });
            setUploadingAvatar(false);
        };
      }
    };
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const PlaceholderAvatar = () => (
    <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );
  
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

  const formatPlaytime = (ms: number) => {
    if (!ms || ms < 0) return '0h 0m';
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // NEW: Handler to open performance summary
  const handleOpenPerformanceSummary = (score: Score) => {
    setSelectedPerformanceSummary(convertScoreToPerformanceSummary(score, `${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`));
  };

  // NEW: Handler to close performance summary
  const handleClosePerformanceSummary = () => {
    setSelectedPerformanceSummary(null);
  };
  
  const handleGoToSongClick = (songId: string) => {
    onClose(); // Close the account modal first
    onGoToOnlineSong(songId); // Then navigate to the song in OnlineSongBrowser
  };


  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl max-w-2xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h2 id="account-modal-title" className="text-3xl font-bold text-cyan-400">My Account</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        
        {message && message.text && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.text}
          </div>
        )}

        {user && (
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 flex-shrink-0">
                    <div className="relative w-32 h-32 flex-shrink-0">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="User avatar" className="w-full h-full rounded-full object-cover ring-2 ring-slate-600" />
                        ) : (
                            <PlaceholderAvatar />
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/png, image/jpeg" className="hidden" id="avatar-upload-input" />
                        <label htmlFor="avatar-upload-input" className="absolute bottom-0 right-0 w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-violet-700 transition-colors">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
                        </label>
                    </div>

                    <div className="text-center sm:text-left">
                        {isEditingUsername ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)} 
                                        className="p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500 flex-grow" 
                                        disabled={loadingUsername}
                                        maxLength={20}
                                    />
                                    <button onClick={handleUpdateUsername} className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled={loadingUsername || username.length > 20 || !username.trim()}>{loadingUsername ? '...' : 'Save'}</button>
                                    <button onClick={() => { setIsEditingUsername(false); setUsername(profile?.username || ''); }} className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded" disabled={loadingUsername}>X</button>
                                </div>
                                <div className={`text-xs text-right pr-1 ${username.length > 20 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {username.length} / 20
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <p className="text-white text-3xl font-bold">{username}</p>
                                <button onClick={() => setIsEditingUsername(true)} className="text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg></button>
                            </div>
                        )}
                        <p className="text-slate-400 text-sm mt-1">{user.email}</p>
                        
                        <div className="mt-2 text-slate-300 text-sm">
                          {isEditingBio ? (
                              <div className="space-y-2">
                                  <textarea
                                      value={bio}
                                      onChange={(e) => setBio(e.target.value)}
                                      maxLength={100}
                                      className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500 h-20 resize-none"
                                      placeholder="Tell us about yourself..."
                                      disabled={loadingBio}
                                  />
                                  <div className="flex justify-between items-center">
                                      <span className={`text-xs ${bio.length > 100 ? 'text-red-400' : 'text-slate-400'}`}>{bio.length}/100</span>
                                      <div className="flex gap-2">
                                          <button onClick={handleUpdateBio} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs" disabled={loadingBio}>{loadingBio ? '...' : 'Save'}</button>
                                          <button onClick={() => { setIsEditingBio(false); setBio(profile?.bio || ''); }} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs" disabled={loadingBio}>Cancel</button>
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div className="flex items-start gap-2 group">
                                  <p className="italic whitespace-pre-wrap break-words">
                                      {bio || <span className="text-slate-500">No bio yet.</span>}
                                  </p>
                                  <button onClick={() => setIsEditingBio(true)} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
                                  </button>
                              </div>
                          )}
                        </div>
                        
                         {(globalRank !== null || totalScore !== null || profile?.total_playtime_ms !== undefined) ? (
                            <div className="flex items-baseline gap-4 mt-2 text-slate-300 flex-wrap justify-center sm:justify-start">
                                <div>
                                    <span className="text-sm">Global Rank</span>
                                    <p className="text-2xl font-bold text-white">#{globalRank ? globalRank.toLocaleString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-sm">Total Score</span>
                                    <p className="text-2xl font-bold text-white">{totalScore !== null ? Math.round(totalScore).toLocaleString() : '...'}</p>
                                </div>
                                <div>
                                    <span className="text-sm">Playtime</span>
                                    <p className="text-2xl font-bold text-white">{formatPlaytime(profile?.total_playtime_ms || 0)}</p>
                                </div>
                                <div>
                                    <span className="text-sm">Notes Hit</span>
                                    <p className="text-2xl font-bold text-white">{(profile?.total_notes_hit || 0).toLocaleString()}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 h-12"> {/* Placeholder to prevent layout shift */}
                                {loadingScores && <div className="text-sm text-slate-400 animate-pulse">Loading rank...</div>}
                            </div>
                        )}
                    </div>
                </div>

                {topScores.length > 0 && (
                    <div className="flex-grow flex flex-col min-h-0 mt-4">
                        <h3 className="text-xl font-semibold text-violet-400 mb-2 flex-shrink-0">My Top Ranked Performances</h3>
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
                                {topScores.map(score => (
                                    <tr key={score.id} className="border-b border-slate-700">
                                        <td 
                                            className="p-2 text-sm text-white truncate cursor-pointer hover:text-cyan-300 hover:underline"
                                            title={`Play MIDI: ${score.songs?.title}`}
                                            onClick={() => handleGoToSongClick(score.song_id)}
                                        >
                                            {score.songs?.title || 'Unknown MIDI'}
                                        </td>
                                        <td className="p-2 text-xs text-slate-400 whitespace-nowrap">{formatScoreDate(score.created_at)}</td>
                                        <td 
                                            className="p-2 font-mono text-cyan-300 text-right cursor-pointer hover:underline"
                                            onClick={() => handleOpenPerformanceSummary(score)}
                                        >
                                            {Math.round(score.final_score).toLocaleString()}
                                        </td>
                                        <td 
                                            className="p-2 font-bold text-lg text-center cursor-pointer"
                                            onClick={() => handleOpenPerformanceSummary(score)}
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
                {loadingScores && <div className="text-center p-4 text-slate-300 animate-pulse">Loading scores...</div>}
                {!loadingScores && topScores.length === 0 && (
                    <div className="text-slate-400 text-center p-4">You have no scores on ranked MIDIs yet.</div>
                )}


                <div className="mt-6 flex-shrink-0">
                    <button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-base transition-colors">Sign Out</button>
                </div>
            </div>
        )}
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

export default AccountModal;
