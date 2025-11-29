
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { Score, Profile, PerformanceSummary } from '../types'; // Import PerformanceSummary type
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

  const fetchProfileAndScores = useCallback(async () => {
    if (!user) return;
    
    // Fetch profile (only username and avatar_url are needed for display in this modal)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, avatar_url, last_nickname_change')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching profile:", profileError);
    } else if (profileData) {
      setProfile(profileData as Profile);
      setUsername(profileData.username || user.email?.split('@')[0] || '');
      setAvatarUrl(profileData.avatar_url);
    } else {
      setUsername(user.email?.split('@')[0] || '');
      setAvatarUrl(null);
    }

    // Fetch scores, only for ranked songs
    setLoadingScores(true);
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

          canvas.toBlob(async (blob) => {
            if (!blob) {
              setMessage({ type: 'error', text: 'Failed to resize image.' });
              setUploadingAvatar(false);
              return;
            }

            const targetBucketName = 'avatars';
            const filePath = `${user.id}/${Math.random().toString(36).substring(2, 10)}.jpeg`;

            if (avatarUrl) {
              const pathSegments = avatarUrl.split(`${targetBucketName}/`);
              let oldFilePathInStorage: string | null = null;
              if (pathSegments.length > 1) {
                oldFilePathInStorage = pathSegments[1].split('?')[0];
              }

              if (oldFilePathInStorage) {
                const { error: deleteError } = await supabase.storage.from(targetBucketName).remove([oldFilePathInStorage]);
                if (deleteError) console.warn("Failed to delete old avatar:", String(deleteError.message));
              }
            }

            const { error: uploadError } = await supabase.storage
              .from(targetBucketName)
              .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

            if (uploadError) {
              setMessage({ type: 'error', text: `Upload failed: ${uploadError.message || 'Unknown avatar upload error'}` });
              setUploadingAvatar(false);
              return;
            }

            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from(targetBucketName)
              .createSignedUrl(filePath, AVATAR_SIGNED_URL_EXPIRY_SECONDS);
            
            if (signedUrlError) {
              setMessage({ type: 'error', text: `Failed to create signed URL: ${signedUrlError.message || 'Unknown signed URL error'}` });
              setUploadingAvatar(false);
              return;
            }
              
            if (!signedUrlData || !signedUrlData.signedUrl) {
              setMessage({ type: 'error', text: 'Could not retrieve avatar signed URL.' });
              setUploadingAvatar(false);
              return;
            }
              
            const { error: updateError } = await supabase
              .from('profiles')
              .upsert({ id: user.id, avatar_url: signedUrlData.signedUrl }, { onConflict: 'id' });

            if (updateError) {
              setMessage({ type: 'error', text: `Failed to update profile: ${updateError.message || 'Unknown profile update error'}` });
            } else {
              setMessage({ type: 'success', text: 'Avatar updated successfully!' });
              // Re-fetch profile data to ensure UI is updated, even though avatarUrl is set locally
              await fetchProfileAndScores(); 
            }

            setUploadingAvatar(false);
          }, 'image/jpeg', 0.8);
        };

        img.onerror = () => {
          setMessage({ type: 'error', text: 'Failed to load image for processing.' });
          setUploadingAvatar(false);
        };
      }
    };

    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Failed to read file.' });
      setUploadingAvatar(false);
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
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
    // FIX: Access 'artist' property from 'score.songs' with optional chaining.
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
      className="fixed inset-0 bg-slate-950 bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div
        className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-2xl w-full ring-1 ring-slate-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex-shrink-0">
            <h2 id="account-modal-title" className="text-3xl font-bold text-cyan-400 text-center mb-4">
            My Profile
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
                {/* Avatar Section */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="User Avatar" className="w-full h-full rounded-full object-cover ring-2 ring-slate-600" />
                    ) : (
                        <PlaceholderAvatar />
                    )}
                    <label 
                        htmlFor="avatar-upload" 
                        className="absolute bottom-0 right-0 bg-violet-500 hover:bg-violet-600 rounded-full p-2 cursor-pointer transition-transform transform hover:scale-110"
                        title="Upload new avatar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </label>
                    <input id="avatar-upload" ref={fileInputRef} type="file" accept="image/png, image/jpeg" onChange={handleAvatarUpload} hidden disabled={uploadingAvatar} />
                    {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        </div>
                    )}
                </div>
                {/* Username Section */}
                <div className="w-full text-center sm:text-left">
                    {isEditingUsername ? (
                        <div className="flex items-center gap-2">
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-grow p-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-violet-500 focus:border-violet-500" placeholder="Enter username" disabled={loadingUsername}/>
                            <button onClick={handleUpdateUsername} disabled={loadingUsername || !username.trim()} className="bg-green-500 hover:bg-green-600 text-white font-bold p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                                {loadingUsername ? '...' : 'Save'}
                            </button>
                            <button onClick={() => { setIsEditingUsername(false); fetchProfileAndScores(); }} disabled={loadingUsername} className="bg-slate-600 hover:bg-slate-500 text-white font-bold p-2 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <p className="text-white text-2xl font-bold truncate">{username || 'Not set'}</p>
                            <button onClick={() => setIsEditingUsername(true)} className="text-violet-400 hover:underline text-sm font-semibold">Edit</button>
                        </div>
                    )}
                    <p className="text-slate-400 mt-1 truncate">{user?.email}</p>
                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                      <p>Member since: {formatDate(session?.user?.created_at)}</p>
                      <p>Last Online: {formatDate(session?.user?.last_sign_in_at)}</p>
                    </div>
                </div>
            </div>
            {message && <div className={`p-3 mb-4 rounded-lg text-sm w-full ${message.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
        </div>

        {/* Top Performances Section */}
        <div className="mt-4 flex-grow flex flex-col min-h-0">
            <h3 className="text-xl font-semibold text-violet-400 mb-2 text-left flex-shrink-0">Top Performances (Highest Score per Ranked Song)</h3>
            <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-lg p-2 ring-1 ring-slate-700/50">
                {loadingScores && <div className="text-slate-400 text-center p-4 animate-pulse">Loading scores...</div>}
                {!loadingScores && topScores.length === 0 && <div className="text-slate-500 text-center p-4">No ranked scores yet. Play a ranked song in Retical mode!</div>}
                {!loadingScores && topScores.length > 0 && (
                    <table className="w-full text-left table-auto">
                        <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                            <tr>
                                <th className="p-2 text-xs font-semibold text-slate-400">#</th>
                                <th className="p-2 text-xs font-semibold text-slate-400">MIDI</th>
                                <th className="p-2 text-xs font-semibold text-slate-400 text-right">Score</th>
                                <th className="p-2 text-xs font-semibold text-slate-400 text-center">Rank</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topScores.map((score, index) => (
                                <tr key={score.song_id} className="border-b border-slate-700">
                                    <td className="p-2 text-sm text-slate-400">{index + 1}</td>
                                    {/* Make the song title clickable */}
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
                )}
            </div>
        </div>
        
        <div className="w-full space-y-3 mt-6 flex-shrink-0">
          <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-lg transition-all">Logout</button>
          <button onClick={onClose} className="w-full bg-slate-600 hover:bg-slate-700 text-slate-200 font-bold py-2 px-6 rounded-lg text-base transition-colors">Close</button>
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

export default AccountModal;
