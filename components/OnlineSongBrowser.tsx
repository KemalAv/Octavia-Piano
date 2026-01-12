

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
import AdBanner from './AdBanner'; // Import AdBanner

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
const PAGE_SIZE = 20;

type SortOrder = 'newest_desc' | 'newest_asc' | 'difficulty_desc' | 'difficulty_asc' | 'alphabetical_asc' | 'alphabetical_desc' | 'mostLiked_desc' | 'mostLiked_asc';

const OnlineSongBrowser: React.FC<OnlineSongBrowserProps> = ({ onSongLoaded, isLoading, setLoadingState, onGoToOnlineSong }) => {
  const { session, user } = useAuth();
  const [songs, setSongs] = useState<OnlineSong[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoginReminderModalOpen, setIsLoginReminderModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null); // NEW: State for deletion errors
  // FIX: Corrected state initialization for personalBests
  const [personalBests, setPersonalBests] = useState<Map<string, Score>>(() => new Map()); // NEW: For personal bests
  const [leaderboardSong, setLeaderboardSong] = useState<OnlineSong | null>(null); // NEW: For leaderboard modal
  // FIX: Corrected useState initialization for userLikes to be a Map
  const [userLikes, setUserLikes] = useState<Map<string, 1 | -1>>(() => new Map());
  const [userUploadCount, setUserUploadCount] = useState(0); // NEW: To track user's uploads
  const [isRendered, setIsRendered] = useState(false); // For modal animations

  // NEW: State for sorting, filtering, and pagination
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest_desc'); // Default to newest_desc
  const [rankedFilter, setRankedFilter] = useState<'all' | 'ranked' | 'nonRanked' | 'liked'>('ranked'); // Default to ranked only
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // NEW: State for performance summary modal
  const [selectedPerformanceSummary, setSelectedPerformanceSummary] = useState<PerformanceSummary | null>(null);

  // Fix: The 'isEditModalOpen' variable was used before its declaration.
  // Moved the 'Edit State' block before the useEffect hook that uses it.
  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [songToEdit, setSongToEdit] = useState<OnlineSong | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editArranger, setEditArranger] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const isFilterChange = useRef(true);

  useEffect(() => {
    isFilterChange.current = true;
  }, [sortOrder, rankedFilter, searchQuery]);


  useEffect(() => {
    if (isUploadModalOpen || isLoginReminderModalOpen || isEditModalOpen) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isUploadModalOpen, isLoginReminderModalOpen, isEditModalOpen]);

  useEffect(() => {
    if (!user && rankedFilter === 'liked') {
        setRankedFilter('ranked'); // Revert to a default filter if user logs out
    }
  }, [user, rankedFilter]);


  // Upload State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadArranger, setUploadArranger] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize midiNoteToNameMap for parsing, consistent with App.tsx
  const midiNoteToNameMap = useMemo(() => {
    // FIX: The key for this map should be a number (MIDI note), not a string.
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

  const fetchSongsAndInteractions = useCallback(async (isLoadMore = false) => {
      if (isLoadMore) {
          setIsLoadingMore(true);
      } else {
          setLoadingState(true);
          setSongs([]); // Clear songs only on initial load/filter change
      }
      setFetchError(null);
      setDeleteError(null);
  
      try {
          // Pagination Logic
          const currentPage = isLoadMore ? page + 1 : 0;
          const from = currentPage * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          let query = supabase
              .from('songs')
              .select('*, difficulty_level, performance_score, total_notes, duration_sec, total_nps, is_ranked, like_count, dislike_count, arranger, description');
          
          // Apply filters
          if (user && rankedFilter === 'liked') {
              const { data: likedSongIds, error: likedSongsError } = await supabase
                  .from('song_likes')
                  .select('song_id')
                  .eq('user_id', user.id)
                  .eq('like_type', 1);

              if (likedSongsError) throw likedSongsError;

              const songIds = likedSongIds.map(s => s.song_id);
              if (songIds.length === 0) {
                  if (!isLoadMore) setSongs([]);
                  setHasMore(false);
                  setLoadingState(false);
                  setIsLoadingMore(false);
                  return;
              }
              query = query.in('id', songIds);
          } else if (rankedFilter === 'ranked') {
              query = query.eq('is_ranked', true);
          } else if (rankedFilter === 'nonRanked') {
              query = query.eq('is_ranked', false);
          }

          // Apply search query
          if (searchQuery) {
              // Escape double quotes and wrap the search term in quotes to handle commas correctly in .or() filter.
              const safeSearchQuery = searchQuery.replace(/"/g, '\\"');
              query = query.or(`title.ilike."%${safeSearchQuery}%",artist.ilike."%${safeSearchQuery}%"`);
          }
  
          // Apply sorting
          switch (sortOrder) {
            case 'newest_desc':
              query = query.order('created_at', { ascending: false });
              break;
            case 'newest_asc':
              query = query.order('created_at', { ascending: true });
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

          // Apply Pagination Range
          query = query.range(from, to);

          const { data: songsData, error: songsError } = await query;
          if (songsError) throw songsError;
  
          const safeSongsData = (songsData || []) as unknown as OnlineSong[];

          // Update Pagination State
          if (safeSongsData.length < PAGE_SIZE) {
              setHasMore(false);
          } else {
              setHasMore(true);
          }
  
          // Fetch personal interactions if user is logged in
          if (user && safeSongsData.length > 0) {
              const fetchedSongIds = safeSongsData.map(s => s.id);

              // Fetch personal bests
              const { data: scoresData, error: scoresError } = await supabase
                  .from('scores')
                  .select('*, songs!inner(title, artist)') // Select all score fields and related song info
                  .eq('user_id', user.id)
                  .in('song_id', fetchedSongIds);
  
              if (scoresError) {
                  console.error("Error fetching personal bests:", scoresError);
              } else if (scoresData) {
                  setPersonalBests(prev => {
                      const newMap = new Map<string, Score>(prev);
                      const data = scoresData as unknown as Score[];
                      for (const score of data) {
                          const existing = newMap.get(score.song_id);
                          if (!existing || score.final_score > existing.final_score) {
                              newMap.set(score.song_id, score);
                          }
                      }
                      return newMap;
                  });
              }

              // Fetch user likes
              const { data: likesData, error: likesError } = await supabase
                  .from('song_likes')
                  .select('song_id, like_type')
                  .eq('user_id', user.id)
                  .in('song_id', fetchedSongIds);
              
              if (likesError) {
                  console.error("Error fetching user likes:", likesError);
              } else if (likesData) {
                  setUserLikes(prev => {
                      const newMap = new Map(prev);
                      for (const like of likesData) {
                          newMap.set(like.song_id, like.like_type as (1 | -1));
                      }
                      return newMap;
                  });
              }
          }
  
          // Fetch usernames for the new batch
          const uniqueUploaderIds = Array.from(new Set(safeSongsData.map(s => s.uploader_id)));
          await Promise.all(uniqueUploaderIds.map(id => fetchUsername(id)));
  
          if (isLoadMore) {
              setSongs(prev => [...prev, ...safeSongsData]);
              setPage(currentPage);
          } else {
              setSongs(safeSongsData);
              setPage(0);
          }

      } catch (error: unknown) {
          console.error('Error fetching data:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setFetchError(`Failed to load online library: ${errorMessage}`);
      } finally {
          setLoadingState(false);
          setIsLoadingMore(false);
      }
  }, [setLoadingState, user, fetchUsername, sortOrder, rankedFilter, searchQuery, page, setUserLikes]);
  
  // Initial fetch and re-fetch on filter change
  useEffect(() => {
    if (isFilterChange.current) {
      fetchSongsAndInteractions(false);
      isFilterChange.current = false;
    }
  }, [sortOrder, rankedFilter, searchQuery, fetchSongsAndInteractions]);


  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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
        setIsLoginReminderModalOpen(true);
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
    
    if (uploadTitle.length > 50) {
      setUploadMessage({ type: 'error', text: 'Title cannot exceed 50 characters.' });
      return;
    }
    if (uploadArtist.length > 25) {
      setUploadMessage({ type: 'error', text: 'Artist cannot exceed 25 characters.' });
      return;
    }
    if (uploadArranger.length > 25) {
      setUploadMessage({ type: 'error', text: 'Arranger cannot exceed 25 characters.' });
      return;
    }
    if (uploadDescription.length > 100) {
      setUploadMessage({ type: 'error', text: 'Description cannot exceed 100 characters.' });
      return;
    }

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
        // Correctly pass originalTotalMusicalDurationMs for consistent imitation logic
        const analysisResult = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs, undefined, analysisData.originalTotalMusicalDurationMs);
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
          arranger: uploadArranger.trim() || null,
          description: uploadDescription.trim() || null,
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
      setUploadArranger('');
      setUploadDescription('');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchSongsAndInteractions(false);
      
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
    setEditArranger(song.arranger || '');
    setEditDescription(song.description || '');
    setEditMessage(null);
    setDeleteError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songToEdit || !session) return;

    if (editTitle.length > 50) {
      setEditMessage({ type: 'error', text: 'Title cannot exceed 50 characters.' });
      return;
    }
    if (editArtist.length > 25) {
      setEditMessage({ type: 'error', text: 'Artist cannot exceed 25 characters.' });
      return;
    }
    if (editArranger.length > 25) {
      setEditMessage({ type: 'error', text: 'Arranger cannot exceed 25 characters.' });
      return;
    }
    if (editDescription.length > 100) {
      setEditMessage({ type: 'error', text: 'Description cannot exceed 100 characters.' });
      return;
    }

    setIsEditing(true);
    setEditMessage(null);
    setDeleteError(null);

    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: editTitle,
          artist: editArtist,
          arranger: editArranger.trim() || null,
          description: editDescription.trim() || null,
        })
        .eq('id', songToEdit.id);

      if (error) throw error;

      setEditMessage({ type: 'success', text: 'MIDI updated successfully!' });
      fetchSongsAndInteractions(false);
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

      fetchSongsAndInteractions(false);
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

      // 1. DELETE FROM STORAGE
      const { error: deleteStorageError } = await supabase.storage
        .from('midi-files')
        .remove([songData.file_path]);

      if (deleteStorageError) {
        console.error("Storage delete error:", deleteStorageError);
        // Throw error to stop DB deletion if storage deletion fails
        throw new Error(`Failed to delete file from storage: ${deleteStorageError.message}`);
      }

      // 2. DELETE FROM DATABASE (Only if storage delete succeeds)
      const { error: dbError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (dbError) throw dbError;

      setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
      setFetchError(null);
      // No need to fetch all, just removed from local state
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
                // FIX: Corrected typo 'updated.song_id' to 'updatedSong.dislike_count' to correctly decrement dislikes.
                updatedSong.dislike_count = currentDislikes - 1;
            } else {
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

  const handleOpenPerformanceSummary = (score: Score) => {
    setSelectedPerformanceSummary(convertScoreToPerformanceSummary(score, `${score.songs?.artist || 'Unknown Artist'} - ${score.songs?.title || 'Unknown MIDI'}`));
  };

  const handleClosePerformanceSummary = () => {
    setSelectedPerformanceSummary(null);
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

  const handleLoadMore = () => {
      fetchSongsAndInteractions(true);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Show AdBanner only if there are songs listed (i.e. content is present) */}
      {!isLoading && songs.length > 0 && <AdBanner />}

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

      {/* Sorting and Filtering Controls */}
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
            <div className="flex gap-2 flex-wrap">
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
                <label className={`flex items-center ${!user ? 'cursor-not-allowed' : ''}`}>
                    <input
                        type="radio"
                        name="rankedFilter"
                        value="liked"
                        checked={rankedFilter === 'liked'}
                        onChange={() => setRankedFilter('liked')}
                        className="form-radio text-violet-500 focus:ring-violet-400 disabled:opacity-50"
                        disabled={!user}
                    />
                    <span className={`ml-1 text-sm ${!user ? 'text-slate-500' : 'text-slate-300'}`}>Liked by Me</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
          {songs.map((song) => { 
            const personalBestScore = personalBests.get(song.id);
            const userLikeStatus = userLikes.get(song.id);
            const netScore = (song.like_count ?? 0) - (song.dislike_count ?? 0);
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
                  {song.arranger && (
                    <p className="text-xs text-slate-400 mt-1" title={`Arranged by ${song.arranger}`}>Arr. by {song.arranger}</p>
                  )}
                  {song.description && (
                    <p className="text-xs text-slate-400 mt-2 italic border-l-2 border-slate-600 pl-2 leading-tight">
                        {song.description}
                    </p>
                  )}
                  {song.uploader_id && (
                      <p className="text-xs text-slate-500 mt-1">
                          Uploaded by {userUsernameCache.get(song.uploader_id) || song.uploader_id.substring(0, 8)} on {formatDate(song.created_at)}
                      </p>
                  )}
                  
                  {personalBestScore && (
                    <div 
                        className="mt-2 text-sm text-yellow-300 bg-yellow-900/30 border border-yellow-700/50 rounded-md px-2 py-1 inline-block cursor-pointer hover:bg-yellow-800/50"
                        onClick={() => handleOpenPerformanceSummary(personalBestScore)}
                    >
                        <strong>Best:</strong> {Math.round(personalBestScore.final_score).toLocaleString()}
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
                                      density: 0,
// FIX: The property 'patternComplexity' does not exist on the 'parameters' type. Renamed to 'intervalComplexity' and removed obsolete properties to match the type definition.
                                      intervalComplexity: 0,
                                      physicalEffort: 0,
                                      rangeIntensity: 0,
                                      chordMobility: 0,
                                      arpeggioRepetition: 0,
                                      arpeggioVirtuosity: 0,
                                      totalNps: song.total_nps || 0,
                                      polyphony: 0,
                                      chordNps: 0,
                                      patternRepPenalty: 0,
                                      trillRatio: 0,
                                  },
                                  meta: {
                                      durationSec: song.duration_sec || 0,
                                      totalNotes: song.total_notes || 0,
                                      highestNote: 0, lowestNote: 0,
                                      avgGapMs: 0, gapVariance: 0, irregularityIndex: 0,
                                  }
                              }}
                              isInteractive={false}
                          />
                      </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleLikeDislike(song, 'like')} disabled={!user} className={`flex items-center justify-center text-xs px-2 py-1 rounded-lg transition-colors ${userLikeStatus === 1 ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'}`} title="Like MIDI">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                    </button>
                    <span className={`text-sm font-bold w-8 text-center tabular-nums ${netScore > 0 ? 'text-green-400' : netScore < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {netScore}
                    </span>
                    <button onClick={() => handleLikeDislike(song, 'dislike')} disabled={!user} className={`flex items-center justify-center text-xs px-2 py-1 rounded-lg transition-colors ${userLikeStatus === -1 ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'}`} title="Dislike MIDI">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.642a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-2.8a4 4 0 00.8-2.4z"></path></svg>
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
        
        {/* Load More Button */}
        {hasMore && !isLoading && songs.length > 0 && (
            <div className="mt-4 flex justify-center pb-2">
                <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoadingMore ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                        </>
                    ) : (
                        'Load More'
                    )}
                </button>
            </div>
        )}
      </div>

      {isLoginReminderModalOpen && (
        <div
          className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
          onClick={() => setIsLoginReminderModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-reminder-title"
        >
          <div
            className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-sm w-full ring-1 ring-slate-600 text-center transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <h2 id="login-reminder-title" className="text-2xl font-bold text-cyan-400 mb-4">
              Login Required
            </h2>
            <p className="text-slate-300 mb-6">
              Please log in to upload MIDIs and share them with the community.
            </p>
            <button
              onClick={() => setIsLoginReminderModalOpen(false)}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FIX: Pass 'onGoToOnlineSong' prop to LeaderboardModal */}
      {leaderboardSong && <LeaderboardModal song={leaderboardSong} onClose={() => setLeaderboardSong(null)} onGoToOnlineSong={onGoToOnlineSong} />}

      {isUploadModalOpen && (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`} onClick={() => setIsUploadModalOpen(false)}>
          <div className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
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
                  maxLength={50}
                />
                <div className={`text-xs text-right mt-1 ${uploadTitle.length > 50 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadTitle.length} / 50
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Artist</label>
                <input
                  type="text"
                  required
                  value={uploadArtist}
                  onChange={e => setUploadArtist(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                  maxLength={25}
                />
                 <div className={`text-xs text-right mt-1 ${uploadArtist.length > 25 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadArtist.length} / 25
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Arrangement by (Optional)</label>
                <input
                  type="text"
                  value={uploadArranger}
                  onChange={e => setUploadArranger(e.target.value)}
                  placeholder="Your name or alias"
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                  maxLength={25}
                />
                <div className={`text-xs text-right mt-1 ${uploadArranger.length > 25 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadArranger.length} / 25
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="A short description of the MIDI or arrangement."
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500 h-20 resize-none"
                  maxLength={100}
                />
                <div className={`text-xs text-right mt-1 ${uploadDescription.length > 100 ? 'text-red-400' : 'text-slate-400'}`}>
                  {uploadDescription.length} / 100
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">MIDI File</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".mid,.midi"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                />
                <p className="text-xs text-slate-500 mt-2 text-left">
                  Only MIDI files (.mid) are supported. For best results, use MIDI files (.mid) that have been converted from MusicXML files.
                </p>
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
                  disabled={isUploading || !uploadTitle.trim() || uploadTitle.length > 50 || !uploadArtist.trim() || uploadArtist.length > 25 || uploadArranger.length > 25 || uploadDescription.length > 100 || !uploadFile}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && songToEdit && (
        <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`} onClick={() => setIsEditModalOpen(false)}>
          <div className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
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
                  maxLength={50}
                />
                 <div className={`text-xs text-right mt-1 ${editTitle.length > 50 ? 'text-red-400' : 'text-slate-400'}`}>
                    {editTitle.length} / 50
                </div>
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
                  maxLength={25}
                />
                 <div className={`text-xs text-right mt-1 ${editArtist.length > 25 ? 'text-red-400' : 'text-slate-400'}`}>
                    {editArtist.length} / 25
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Arrangement by (Optional)</label>
                <input
                  type="text"
                  value={editArranger}
                  onChange={e => setEditArranger(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                  disabled={isEditing}
                  placeholder="Arranger's name or alias"
                  maxLength={25}
                />
                <div className={`text-xs text-right mt-1 ${editArranger.length > 25 ? 'text-red-400' : 'text-slate-400'}`}>
                    {editArranger.length} / 25
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500 h-20 resize-none"
                  disabled={isEditing}
                  placeholder="A short description of the MIDI or arrangement."
                  maxLength={100}
                />
                <div className={`text-xs text-right mt-1 ${editDescription.length > 100 ? 'text-red-400' : 'text-slate-400'}`}>
                  {editDescription.length} / 100
                </div>
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
                  disabled={isEditing || !editTitle.trim() || editTitle.length > 50 || !editArtist.trim() || editArtist.length > 25 || editArranger.length > 25 || editDescription.length > 100}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default OnlineSongBrowser;