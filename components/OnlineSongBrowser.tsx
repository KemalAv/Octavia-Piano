import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { OnlineSong, ExtendedResult, Score, PerformanceSummary } from '../types';
import { useAuth } from '../AuthContext';
import { parseFileForAnalysis } from '../midiParser'; // Reusable parser for analysis
import { analyzeMidi } from '../midiAnalysis'; // For analyzing uploaded files
import DifficultyAnalysis from './DifficultyAnalysis'; // For displaying difficulty
import { PIANO_KEYS_CONFIG } from '../constants'; // Import PIANO_KEYS_CONFIG
import LeaderboardModal from './LeaderboardModal';
import PerformanceSummaryModal from './PerformanceSummaryModal'; // NEW: Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary } from '../utils'; // NEW: Import utility for score conversion


// Temporary cache for user usernames to avoid redundant Supabase calls
const userUsernameCache = new Map<string, string>();

interface OnlineSongBrowserProps {
  onSongLoaded: (file: File, onlineSongId: string, isRanked: boolean) => Promise<void>;
  isLoading: boolean;
  setLoadingState: (loading: boolean) => void;
  onGoToOnlineSong: (songId: string) => void;
}

// Admin UUID - IMPORTANT: Replace with the actual UUID of your admin user in Supabase
// You can find your user's UUID in the Supabase Auth -> Users table.
// Example: const ADMIN_UUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const ADMIN_UUID = '9701e6dc-05de-40f3-81e7-54da7b9d8b9a'; // Corrected UUID based on constants.ts, assuming it's the correct one 
const UPLOAD_LIMIT = 5;

type SortOrder = 'newest_desc' | 'newest_asc' | 'difficulty_desc' | 'difficulty_asc' | 'alphabetical_asc' | 'alphabetical_desc' | 'mostLiked_desc' | 'mostLiked_asc';

const OnlineSongBrowser: React.FC<OnlineSongBrowserProps> = ({ onSongLoaded, isLoading, setLoadingState, onGoToOnlineSong }) => {
  const { session, user } = useAuth();
  const [songs, setSongs] = useState<OnlineSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null); // NEW: State for deletion errors
  // FIX: Corrected state initialization for personalBests
  const [personalBests, setPersonalBests] = useState<Map<string, number>>(() => new Map()); // NEW: For personal bests
  const [leaderboardSong, setLeaderboardSong] = useState<OnlineSong | null>(null); // NEW: For leaderboard modal
  const [userLikes, setUserLikes] = useState<Map<string, 1 | -1>>(new Map());
  const [userUploadCount, setUserUploadCount] = useState(0); // NEW: To track user's uploads

  // NEW: State for sorting and filtering
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest_desc'); // Default to newest_desc
  const [rankedFilter, setRankedFilter] = useState<'all' | 'ranked' | 'nonRanked'>('ranked'); // Default to ranked only


  // Upload State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [songToEdit, setSongToEdit] = useState<OnlineSong | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Memoize midiNoteToNameMap for parsing, consistent with App.tsx
  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
    return map;
  }, []);

  const fetchUsername = useCallback(async (userId: string): Promise<string> => {
    if (userUsernameCache.has(userId)) {
      return userUsernameCache.get(userId)!;
    }

    const { data, error } = await supabase
      .from('profiles') // Assuming you have a 'profiles' table with user data
      .select('username')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      // FIX: Safely access error message for console output.
      console.warn(`Error fetching username for user ${userId}:`, (error instanceof Error ? error.message : String(error)));
    }

    const username = data?.username || userId.substring(0, 8); // Fallback
    userUsernameCache.set(userId, username);
    return username;
  }, []);

  const fetchSongsAndInteractions = useCallback(async () => {
      setLoadingState(true);
      setFetchError(null);
      setDeleteError(null);
  
      try {
          let query = supabase
              .from('songs')
              .select('*, difficulty_level, performance_score, total_notes, duration_sec, total_nps, is_ranked, like_count, dislike_count');
          
          // Apply filters
          if (rankedFilter === 'ranked') {
              query = query.eq('is_ranked', true);
          } else if (rankedFilter === 'nonRanked') {
              query = query.eq('is_ranked', false);
          }

          // Apply search query
          if (searchQuery) {
              query = query.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`);
          }
  
          // Apply sorting
          switch (sortOrder) {
            case 'newest_desc':
              query = query.order('created_at', { ascending: true });
              break;
            case 'newest_asc':
              query = query.order('created_at', { ascending: false });
              break;
            case 'difficulty_desc':
              query = query.order('performance_score', { ascending: false });
              break;
            case 'difficulty_asc':
              query = query.order('performance_score', { ascending: true });
              break;
            case 'alphabetical_asc':
              query = query.order('title', { ascending: true });
              break;
            case 'alphabetical_desc':
              query = query.order('title', { ascending: false });
              break;
            case 'mostLiked_desc':
              query = query.order('like_count', { ascending: false });
              break;
            case 'mostLiked_asc':
              query = query.order('like_count', { ascending: true });
              break;
            default:
              query = query.order('created_at', { ascending: false }); // Default fallback
              break;
          }

          const { data: songsData, error: songsError } = await query;
          if (songsError) throw songsError;
  
          const safeSongsData = (songsData || []) as unknown as OnlineSong[];
  
          // Fetch personal interactions if user is logged in
          if (user) {
              // Fetch personal bests
              const { data: scoresData, error: scoresError } = await supabase
                  .from('scores')
                  .select('song_id, final_score')
                  .eq('user_id', user.id);
  
              if (scoresError) {
                  console.error("Error fetching personal bests:", scoresError);
              } else if (scoresData) {
                  const bestsMap = new Map<string, number>();
                  for (const score of scoresData) {
                      const existing = bestsMap.get(score.song_id);
                      if (!existing || score.final_score > existing) {
                          bestsMap.set(score.song_id, score.final_score);
                      }
                  }
                  setPersonalBests(bestsMap); // Correct usage of setPersonalBests
              }

              // Fetch user likes
              const { data: likesData, error: likesError } = await supabase
                  .from('song_likes')
                  .select('song_id, like_type')
                  .eq('user_id', user.id);
              
              if (likesError) {
                  console.error("Error fetching user likes:", likesError);
              } else if (likesData) {
                  const likesMap = new Map<string, 1 | -1>();
                  for (const like of likesData) {
                      likesMap.set(like.song_id, like.like_type as (1 | -1));
                  }
                  setUserLikes(likesMap);
              }
          }
  
          // Fetch usernames
          const uniqueUploaderIds = Array.from(new Set(safeSongsData.map(s => s.uploader_id)));
          await Promise.all(uniqueUploaderIds.map(id => fetchUsername(id)));
  
          setSongs(safeSongsData);
      } catch (error: unknown) {
          console.error('Error fetching data:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setFetchError(`Failed to load online library: ${errorMessage}`);
      } finally {
          setLoadingState(false);
      }
  }, [setLoadingState, user, fetchUsername, sortOrder, rankedFilter, searchQuery]);
  
  useEffect(() => {
    fetchSongsAndInteractions();
  }, [fetchSongsAndInteractions]);


  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filtered songs are now handled directly by fetchSongsAndInteractions due to searchQuery dependency
  // const filteredSongs = songs.filter(song => 
  //   song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
  //   song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  // );

  const handlePlaySong = async (song: OnlineSong) => {
    setLoadingState(true);
    setDeleteError(null); // Clear delete error before playing
    try {
      const { data, error } = await supabase.storage
        .from('midi-files')
        .download(song.file_path);

      if (error) throw error;
      if (!data) throw new Error("No data received");

      // Convert Blob to File
      const file = new File([data], song.title + '.mid', { type: data.type });
      await onSongLoaded(file, song.id, song.is_ranked); // Pass is_ranked status
    } catch (err: unknown) {
      console.error("Error downloading or processing MIDI:", err);
      alert(`Failed to load MIDI: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setLoadingState(false);
    }
  };
  
  const handleUploadClick = async () => {
    if (!session || !user) {
        alert("Please log in to upload MIDIs.");
        return;
    }

    // Admin bypasses the limit check
    if (user.id === ADMIN_UUID) {
        setIsUploadModalOpen(true);
        return;
    }

    setLoadingState(true);
    setFetchError(null);
    try {
        const { count, error } = await supabase
            .from('songs')
            .select('*', { count: 'exact', head: true })
            .eq('uploader_id', user.id);

        if (error) throw error;

        const currentCount = count ?? 0;
        setUserUploadCount(currentCount);

        if (currentCount >= UPLOAD_LIMIT) {
            alert(`You have reached your upload limit of ${UPLOAD_LIMIT} MIDIs. Please delete an existing MIDI to upload a new one.`);
        } else {
            setIsUploadModalOpen(true);
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setFetchError(`Could not check your upload limit: ${errorMessage}`);
        console.error(err);
    } finally {
        setLoadingState(false);
    }
  };


  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !session) return;
    
    setIsUploading(true);
    setUploadMessage(null);
    setDeleteError(null);

    let difficultyLevel: number | null = null;
    let performanceScore: number | null = null;
    let totalNotes: number | null = null;
    let durationSec: number | null = null;
    let totalNps: number | null = null;

    try {
      const analysisData = await parseFileForAnalysis(uploadFile, midiNoteToNameMap);
      if (analysisData && analysisData.notes.length > 0) {
        const analysisResult = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs);
        if (analysisResult) {
          difficultyLevel = analysisResult.difficultyLevel;
          performanceScore = analysisResult.performanceScore;
          totalNotes = analysisResult.meta.totalNotes;
          durationSec = analysisResult.meta.durationSec;
          totalNps = analysisResult.parameters.totalNps;
        }
      } else {
        console.warn("Could not analyze file for difficulty. Proceeding with upload without scores.");
      }

      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('midi-files')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('songs')
        .insert({
          title: uploadTitle,
          artist: uploadArtist,
          file_path: filePath,
          uploader_id: session.user.id,
          difficulty_level: difficultyLevel,
          performance_score: performanceScore,
          total_notes: totalNotes,
          duration_sec: durationSec,
          total_nps: totalNps,
          is_ranked: false,
        });

      if (dbError) throw dbError;

      setUploadMessage({ type: 'success', text: 'MIDI uploaded successfully!' });
      
      setUploadTitle('');
      setUploadArtist('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchSongsAndInteractions();
      
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadMessage(null);
      }, 1500);

    } catch (err: unknown) {
      console.error("Upload error:", err);
      setUploadMessage({ type: 'error', text: (err instanceof Error ? err.message : String(err)) || 'MIDI upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (song: OnlineSong) => {
    setSongToEdit(song);
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setEditMessage(null);
    setDeleteError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songToEdit || !session) return;

    setIsEditing(true);
    setEditMessage(null);
    setDeleteError(null);

    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: editTitle,
          artist: editArtist,
        })
        .eq('id', songToEdit.id);

      if (error) throw error;

      setEditMessage({ type: 'success', text: 'MIDI updated successfully!' });
      fetchSongsAndInteractions();
      setTimeout(() => setIsEditModalOpen(false), 1500);
    } catch (err: unknown) {
      console.error("Update error:", err);
      setEditMessage({ type: 'error', text: (err instanceof Error ? err.message : String(err)) || 'Failed to update MIDI.' });
    } finally {
      setIsEditing(false);
    }
  };

  const handleToggleRanked = async (songId: string, currentRankedState: boolean) => {
    if (!user || user.id !== ADMIN_UUID) {
      alert("You are not authorized to change MIDI ranked status.");
      return;
    }

    setLoadingState(true);
    try {
      const { error } = await supabase
        .from('songs')
        .update({ is_ranked: !currentRankedState })
        .eq('id', songId);

      if (error) throw error;

      fetchSongsAndInteractions();
    } catch (err: unknown) {
      console.error("Error toggling ranked status:", err);
      alert(`Failed to update ranked status: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setLoadingState(false);
    }
  };


  const handleDeleteSong = async (songId: string) => {
    if (!session) {
      alert("You must be logged in to delete MIDIs.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this MIDI? This action cannot be undone.")) {
      return;
    }

    setLoadingState(true);
    setDeleteError(null);
    try {
      const { data: songData, error: fetchError } = await supabase
        .from('songs')
        .select('file_path')
        .eq('id', songId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!songData?.file_path) throw new Error("File path not found for MIDI.");

      const { error: deleteStorageError } = await supabase.storage
        .from('midi-files')
        .remove([songData.file_path]);

      if (deleteStorageError) {
        console.warn("Could not delete file from storage (might not exist or RLS issue):", String(deleteStorageError.message));
      }

      const { error: dbError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (dbError) throw dbError;

      setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
      setFetchError(null);
      fetchSongsAndInteractions();
    } catch (err: unknown) {
      console.error("Delete error:", err);
      setDeleteError(`Failed to delete MIDI: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setLoadingState(false);
    }
  };

  const handleLikeDislike = async (song: OnlineSong, action: 'like' | 'dislike') => {
    if (!user) {
        alert("Please log in to rate MIDIs.");
        return;
    }

    const newLikeType = action === 'like' ? 1 : -1;
    const currentLikeStatus = userLikes.get(song.id);

    const previousSongs = [...songs];
    const previousLikes = new Map(userLikes);

    const newSongs = songs.map(s => {
        if (s.id !== song.id) return s;
        const updatedSong = { ...s };
        let currentLikes = updatedSong.like_count ?? 0;
        let currentDislikes = updatedSong.dislike_count ?? 0;

        if (currentLikeStatus === undefined) {
            if (newLikeType === 1) updatedSong.like_count = currentLikes + 1;
            else updatedSong.dislike_count = currentDislikes + 1;
        } else if (currentLikeStatus === newLikeType) {
            if (newLikeType === 1) updatedSong.like_count = currentLikes - 1;
            else updatedSong.dislike_count = currentDislikes - 1;
        } else {
            if (newLikeType === 1) {
                updatedSong.like_count = currentLikes + 1;
                updatedSong.dislike_count = currentDislikes - 1;
            } else {
                // FIX: Corrected typo 'updated.song_id' to 'updatedSong.like_count' to correctly decrement likes.
                updatedSong.like_count = currentLikes - 1;
                updatedSong.dislike_count = currentDislikes + 1;
            }
        }
        return updatedSong;
    });

    const newLikes = new Map(userLikes);
    if (currentLikeStatus === newLikeType) {
        newLikes.delete(song.id);
    } else {
        newLikes.set(song.id, newLikeType);
    }
    
    setSongs(newSongs);
    setUserLikes(newLikes);

    try {
        if (currentLikeStatus === undefined) {
            const { error } = await supabase.from('song_likes').insert({ user_id: user.id, song_id: song.id, like_type: newLikeType });
            if (error) throw error;
        } else if (currentLikeStatus === newLikeType) {
            const { error } = await supabase.from('song_likes').delete().match({ user_id: user.id, song_id: song.id });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('song_likes').update({ like_type: newLikeType }).match({ user_id: user.id, song_id: song.id });
            if (error) throw error;
        }
    } catch (err) {
        console.error("Failed to update like status:", err);
        alert("Failed to update like status. Please try again.");
        setSongs(previousSongs);
        setUserLikes(previousLikes);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const currentUserIsUploader = (uploaderId: string) => session?.user?.id === uploaderId;
  const isAdmin = user?.id === ADMIN_UUID;

  const handleSortChange = (category: 'newest' | 'difficulty' | 'alphabetical' | 'mostLiked') => {
    setSortOrder(prevSortOrder => {
        if (prevSortOrder.startsWith(category)) {
            // Toggle direction if same category
            if (category === 'newest') return prevSortOrder === 'newest_desc' ? 'newest_asc' : 'newest_desc';
            if (category === 'difficulty') return prevSortOrder === 'difficulty_desc' ? 'difficulty_asc' : 'difficulty_desc';
            if (category === 'alphabetical') return prevSortOrder === 'alphabetical_asc' ? 'alphabetical_desc' : 'alphabetical_asc';
            if (category === 'mostLiked') return prevSortOrder === 'mostLiked_desc' ? 'mostLiked_asc' : 'mostLiked_desc';
        } else {
            // Set to default direction for new category
            if (category === 'newest') return 'newest_desc';
            if (category === 'difficulty') return 'difficulty_desc';
            if (category === 'alphabetical') return 'alphabetical_asc'; // Default alphabetical is A-Z
            if (category === 'mostLiked') return 'mostLiked_desc';
        }
        return prevSortOrder; // Should not happen
    });
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="Search MIDI or artist..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full sm:w-2/3 p-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-violet-500 focus:border-violet-500"
        />
        <button
          onClick={handleUploadClick}
          className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg whitespace-nowrap"
        >
          Upload MIDI
        </button>
      </div>

      {/* NEW: Sorting and Filtering Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-800/50 rounded-lg ring-1 ring-slate-700">
        {/* Sort By */}
        <div className="flex items-center gap-2">
            <span className="text-slate-300 text-sm font-semibold">Sort By:</span>
            <div className="flex gap-2">
                <button
                    onClick={() => handleSortChange('newest')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortOrder.startsWith('newest') ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {sortOrder.startsWith('newest') && sortOrder.endsWith('asc') ? 'Oldest' : 'Newest'}
                </button>
                <button
                    onClick={() => handleSortChange('difficulty')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortOrder.startsWith('difficulty') ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {sortOrder.startsWith('difficulty') && sortOrder.endsWith('asc') ? 'Easiest' : 'Hardest'}
                </button>
                <button
                    onClick={() => handleSortChange('alphabetical')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortOrder.startsWith('alphabetical') ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {sortOrder.startsWith('alphabetical') && sortOrder.endsWith('desc') ? 'Z-A' : 'A-Z'}
                </button>
                <button
                    onClick={() => handleSortChange('mostLiked')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${sortOrder.startsWith('mostLiked') ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                    {sortOrder.startsWith('mostLiked') && sortOrder.endsWith('asc') ? 'Least Liked' : 'Most Liked'}
                </button>
            </div>
        </div>

        {/* Filter By */}
        <div className="flex items-center gap-2 ml-auto">
            <span className="text-slate-300 text-sm font-semibold">Show:</span>
            <div className="flex gap-2">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="rankedFilter"
                        value="all"
                        checked={rankedFilter === 'all'}
                        onChange={() => setRankedFilter('all')}
                        className="form-radio text-violet-500 focus:ring-violet-400"
                    />
                    <span className="ml-1 text-slate-300 text-sm">All</span>
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="rankedFilter"
                        value="ranked"
                        checked={rankedFilter === 'ranked'}
                        onChange={() => setRankedFilter('ranked')}
                        className="form-radio text-violet-500 focus:ring-violet-400"
                    />
                    <span className="ml-1 text-slate-300 text-sm">Ranked Only</span>
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="rankedFilter"
                        value="nonRanked"
                        checked={rankedFilter === 'nonRanked'}
                                                onChange={() => setRankedFilter('nonRanked')}
                        className="form-radio text-violet-500 focus:ring-violet-400"
                    />
                    <span className="ml-1 text-slate-300 text-sm">Non-Ranked Only</span>
                </label>
            </div>
        </div>
      </div>


      <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-lg p-2 ring-1 ring-slate-700/50">
        {fetchError && <div className="text-red-400 text-center p-4">{fetchError}</div>}
        {deleteError && <div className="text-red-400 text-center p-4">{deleteError}</div>}
        
        {!isLoading && songs.length === 0 && !fetchError && (
            <div className="text-slate-400 text-center p-8">No MIDIs found matching your criteria.</div>
        )}

        <div className="flex flex-col gap-4"> {/* Changed to flex-col for full-width rows */}
          {songs.map((song) => { {/* Changed from filteredSongs to songs */}
            const personalBest = personalBests.get(song.id);
            const userLikeStatus = userLikes.get(song.id);
            return (
              <div 
                  key={song.id} 
                  className="bg-slate-800 p-4 rounded-lg shadow-md border border-slate-700 hover:border-violet-500 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 truncate" title={song.title}>{song.title}</h3>
                    {song.is_ranked && (
                        <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-500 text-yellow-900" title="This is a ranked MIDI">RANKED</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate" title={song.artist}>{song.artist}</p>
                  {song.uploader_id && (
                      <p className="text-xs text-slate-500 mt-1">
                          by {userUsernameCache.get(song.uploader_id) || song.uploader_id.substring(0, 8)} on {formatDate(song.created_at)}
                      </p>
                  )}
                  
                  {personalBest && (
                    <div className="mt-2 text-sm text-yellow-300 bg-yellow-900/30 border border-yellow-700/50 rounded-md px-2 py-1 inline-block">
                        <strong>Best:</strong> {Math.round(personalBest).toLocaleString()}
                    </div>
                  )}

                  {(song.difficulty_level != null && song.performance_score != null) && (
                      <div className="mt-2">
                          <DifficultyAnalysis 
                              analysisResult={{
                                  difficultyLevel: song.difficulty_level,
                                  performanceScore: song.performance_score,
                                  parameters: {
                                      starLevel: Math.round(song.difficulty_level),
                                      density: 0, patternComplexity: 0, physicalEffort: 0, rangeIntensity: 0,
                                      chordMobility: 0, arpeggioRepetition: 0, arpeggioVirtuosity: 0,
                                      totalNps: song.total_nps || 0,
                                      polyphony: 0, chordNps: 0, chordPower: 0,
                                      chordPowerIndex: 0, patternRepPenalty: 0, trillRatio: 0,
                                  },
                                  meta: {
                                      durationSec: song.duration_sec || 0,
                                      totalNotes: song.total_notes || 0,
                                      highestNote: 0, lowestNote: 0,
                                      avgGapMs: 0, gapVariance: 0, irregularityIndex: 0,
                                  }
                              }} 
                          />
                      </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 items-center">
                  <div className="flex gap-3">
                    <button onClick={() => handleLikeDislike(song, 'like')} disabled={!user} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${userLikeStatus === 1 ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'}`} title="Like MIDI">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                      <span>{song.like_count ?? 0}</span>
                    </button>
                    <button onClick={() => handleLikeDislike(song, 'dislike')} disabled={!user} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${userLikeStatus === -1 ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'}`} title="Dislike MIDI">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-2.8a4 4 0 00.8-2.4z"></path></svg>
                      <span>{song.dislike_count ?? 0}</span>
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    {currentUserIsUploader(song.uploader_id) && (
                        <button onClick={() => openEditModal(song)} className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg" title="Edit MIDI details">Edit</button>
                    )}
                    {(currentUserIsUploader(song.uploader_id) || isAdmin) && (
                        <button onClick={() => handleDeleteSong(song.id)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg" title="Delete MIDI">Delete</button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => handleToggleRanked(song.id, !!song.is_ranked)}
                            className={`text-xs px-3 py-1 rounded-lg ${
                                song.is_ranked ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            title={song.is_ranked ? 'Mark as Unranked MIDI' : 'Mark as Ranked MIDI'}
                        >
                            {song.is_ranked ? 'Unrank' : 'Rank'}
                        </button>
                    )}
                    {song.is_ranked && <button onClick={() => setLeaderboardSong(song)} className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg" title="View Leaderboard for MIDI">Leaderboard</button>}
                    <button
                        onClick={() => handlePlaySong(song)}
                        className="text-sm bg-slate-700 text-slate-300 px-4 py-2 rounded-lg group-hover:bg-violet-600 group-hover:text-white transition-colors"
                        title="Play MIDI"
                    >
                        Play
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FIX: Pass 'onGoToOnlineSong' prop to LeaderboardModal */}
      {leaderboardSong && <LeaderboardModal song={leaderboardSong} onClose={() => setLeaderboardSong(null)} onGoToOnlineSong={onGoToOnlineSong} />}

      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsUploadModalOpen(false)}>
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-2">Upload MIDI</h2>
            {user && user.id !== ADMIN_UUID && (
                <p className="text-sm text-slate-400 mb-4">
                    Your uploads: {userUploadCount} / {UPLOAD_LIMIT}
                </p>
            )}
            
            {uploadMessage && (
              <div className={`p-3 mb-4 rounded text-sm ${uploadMessage.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                {uploadMessage.text}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MIDI Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Artist</label>
                <input
                  type="text"
                  required
                  value={uploadArtist}
                  onChange={e => setUploadArtist(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MIDI/XML File</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".mid,.midi,.xml,.musicxml,.mxl"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadTitle.trim() || !uploadArtist.trim() || !uploadFile}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && songToEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Edit MIDI</h2>
            
            {editMessage && (
              <div className={`p-3 mb-4 rounded text-sm ${editMessage.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                {editMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateSong} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MIDI Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                  disabled={isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Artist</label>
                <input
                  type="text"
                  required
                  value={editArtist}
                  onChange={e => setEditArtist(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                  disabled={isEditing}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                  disabled={isEditing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing || !editTitle.trim() || !editArtist.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineSongBrowser;
