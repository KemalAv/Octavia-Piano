import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { OnlineSong, ExtendedResult, Score, PerformanceSummary, AppLanguage } from '../types';
import { translations } from '../translations';
import { useAuth } from '../AuthContext';
import { parseFileForAnalysis } from '../midiParser'; // Reusable parser for analysis
import { analyzeMidi } from '../midiAnalysis'; // For analyzing uploaded files
import DifficultyAnalysis from './DifficultyAnalysis'; // For displaying difficulty
import { PIANO_KEYS_CONFIG, DRUM_MIDI_TO_NAME_MAP } from '../constants'; // Import PIANO_KEYS_CONFIG and DRUM_MIDI_TO_NAME_MAP
import LeaderboardModal from './LeaderboardModal';
import PerformanceSummaryModal from './PerformanceSummaryModal'; // NEW: Import PerformanceSummaryModal
import { convertScoreToPerformanceSummary } from '../utils'; // NEW: Import utility for score conversion

// Temporary cache for user usernames to avoid redundant Supabase calls
const userUsernameCache = new Map<string, string>();

interface OnlineSongBrowserProps {
  onSongLoaded: (file: File, onlineSongId: string, isRanked: boolean, midiLink: string | null, midiOffset: number | null, backgroundUrl?: string | null, accuracyLevel?: number | null) => Promise<void>;
  isLoading: boolean;
  setLoadingState: (loading: boolean) => void;
  onGoToOnlineSong: (songId: string) => void;
  instrumentMode: 'piano' | 'drum';
  appLanguage?: AppLanguage;
}

// Admin UUID - IMPORTANT: Replace with the actual UUID of your admin user in Supabase
// You can find your user's UUID in the Supabase Auth -> Users table.
// Example: const ADMIN_UUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const ADMIN_UUID = '9701e6dc-05de-40f3-81e7-54da7b9d8b9a'; // Corrected UUID based on constants.ts, assuming it's the correct one 
const UPLOAD_LIMIT = 5;
const PAGE_SIZE = 20;

type SortOrder = 'newest_desc' | 'newest_asc' | 'difficulty_desc' | 'difficulty_asc' | 'alphabetical_asc' | 'alphabetical_desc' | 'mostLiked_desc' | 'mostLiked_asc';

const OnlineSongBrowser: React.FC<OnlineSongBrowserProps> = ({ onSongLoaded, isLoading, setLoadingState, onGoToOnlineSong, instrumentMode, appLanguage = 'en' }) => {
  const t = translations[appLanguage] || translations.en;
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
  const [editMidiLink, setEditMidiLink] = useState('');
  const [editMidiOffset, setEditMidiOffset] = useState('');
  const [editBackgroundUrl, setEditBackgroundUrl] = useState(''); // NEW: Background URL
  const [editAccuracyLevel, setEditAccuracyLevel] = useState<number>(5); // NEW: Accuracy Level
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null); // NEW: For replacing MIDI file
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const isFilterChange = useRef(true);

  useEffect(() => {
    isFilterChange.current = true;
  }, [sortOrder, rankedFilter, searchQuery, instrumentMode]);


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
  const [uploadMidiLink, setUploadMidiLink] = useState('');
  const [uploadMidiOffset, setUploadMidiOffset] = useState('');
  const [uploadBackgroundUrl, setUploadBackgroundUrl] = useState(''); // NEW: Background URL
  const [uploadAccuracyLevel, setUploadAccuracyLevel] = useState<number>(5); // NEW: Accuracy Level
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize midiNoteToNameMap for parsing, consistent with App.tsx
  const midiNoteToNameMap = useMemo(() => {
    const map = new Map<number, string>();
    PIANO_KEYS_CONFIG.forEach(key => map.set(key.midiNote, key.name));
    if (instrumentMode === 'drum') {
      Object.entries(DRUM_MIDI_TO_NAME_MAP).forEach(([midi, name]) => map.set(parseInt(midi), name));
    }
    return map;
  }, [instrumentMode]);

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

      // Check if instrument_mode column exists in songs table
      const { data: testSongData, error: testSongError } = await supabase.from('songs').select('instrument_mode').limit(1);
      const hasSongInstrumentMode = !testSongError || testSongError.code !== '42703';

      let query = supabase
        .from('songs')
        .select('*, difficulty_level, performance_score, total_notes, duration_sec, total_nps, is_ranked, like_count, dislike_count, arranger, description, midi_link, midi_offset');
      
      if (hasSongInstrumentMode) {
        query = query.eq('instrument_mode', instrumentMode);
      }

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
        const trimmedQuery = searchQuery.trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedQuery);
        if (isUuid) {
          // Re-create the query cleanly to bypass other filters when directly searching for a specific MIDI ID
          query = supabase
            .from('songs')
            .select('*, difficulty_level, performance_score, total_notes, duration_sec, total_nps, is_ranked, like_count, dislike_count, arranger, description, midi_link, midi_offset')
            .eq('id', trimmedQuery);
        } else {
          // Escape double quotes and wrap the search term in quotes to handle commas correctly in .or() filter.
          const safeSearchQuery = searchQuery.replace(/"/g, '\\"');
          query = query.or(`title.ilike."%${safeSearchQuery}%",artist.ilike."%${safeSearchQuery}%"`);
        }
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

  const handleDownloadMidi = async (song: OnlineSong) => {
    try {
      const { data, error } = await supabase.storage
        .from('midi-files')
        .download(song.file_path);

      if (error) throw error;
      if (!data) throw new Error("No data received");

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = song.title + '.mid';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Error downloading MIDI:", err);
      alert(`Failed to download MIDI: ${(err instanceof Error ? err.message : String(err))}`);
    }
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
      const file = new File([data], song.title + '.mid', { type: data?.type || 'audio/midi' });
      await onSongLoaded(file, song.id, song.is_ranked, song.midi_link || null, song.midi_offset || null, song.background_url || null, song.accuracy_level || null); // Pass is_ranked status and extra metadata
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
    if (uploadMidiLink.length > 300) {
      setUploadMessage({ type: 'error', text: 'MIDI Link cannot exceed 300 characters.' });
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

    const uploadExt = uploadFile.name.toLowerCase().split('.').pop();
    if (uploadExt !== 'mid' && uploadExt !== 'midi') {
      setUploadMessage({ type: 'error', text: 'Please upload a MIDI file (.mid, .midi).' });
      setIsUploading(false);
      return;
    }

    try {
      const analysisData = await parseFileForAnalysis(uploadFile, midiNoteToNameMap);
      if (analysisData && analysisData.notes.length > 0) {
        // Correctly pass originalTotalMusicalDurationMs for consistent imitation logic
        const analysisResult = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs, undefined, analysisData.originalTotalMusicalDurationMs, instrumentMode);
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

      // Check if instrument_mode column exists in songs table
      const { data: testSongData, error: testSongError } = await supabase.from('songs').select('instrument_mode').limit(1);
      const hasSongInstrumentMode = !testSongError || testSongError.code !== '42703';

      const songData: any = {
        title: uploadTitle,
        artist: uploadArtist,
        arranger: uploadArranger.trim() || null,
        description: uploadDescription.trim() || null,
        midi_link: uploadMidiLink.trim() || null,
        midi_offset: uploadMidiOffset ? parseInt(uploadMidiOffset, 10) : null,
        background_url: uploadBackgroundUrl.trim() || null,
        accuracy_level: uploadAccuracyLevel,
        file_path: filePath,
        uploader_id: session.user.id,
        difficulty_level: difficultyLevel,
        performance_score: performanceScore,
        total_notes: totalNotes,
        duration_sec: durationSec,
        total_nps: totalNps,
        is_ranked: false,
      };

      if (hasSongInstrumentMode) {
        songData.instrument_mode = instrumentMode;
      }

      const { error: dbError } = await supabase
        .from('songs')
        .insert(songData);

      if (dbError) throw dbError;

      setUploadMessage({ type: 'success', text: 'MIDI uploaded successfully!' });

      setUploadTitle('');
      setUploadArtist('');
      setUploadArranger('');
      setUploadDescription('');
      setUploadMidiLink('');
      setUploadMidiOffset('');
      setUploadBackgroundUrl('');
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
    setEditMidiLink(song.midi_link || '');
    setEditMidiOffset(song.midi_offset?.toString() ?? '');
    setEditBackgroundUrl(song.background_url || ''); // NEW: Set Background URL
    setEditAccuracyLevel(song.accuracy_level ?? 5); // NEW: Set Accuracy Level
    setEditFile(null); // Reset replace file
    if (editFileInputRef.current) editFileInputRef.current.value = '';
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
    // ... rest of validation ...
    if (editArtist.length > 25) { setEditMessage({ type: 'error', text: 'Artist cannot exceed 25 characters.' }); return; }
    if (editArranger.length > 25) { setEditMessage({ type: 'error', text: 'Arranger cannot exceed 25 characters.' }); return; }
    if (editDescription.length > 100) { setEditMessage({ type: 'error', text: 'Description cannot exceed 100 characters.' }); return; }
    if (editMidiLink.length > 300) { setEditMessage({ type: 'error', text: 'MIDI Link cannot exceed 300 characters.' }); return; }

    setIsEditing(true);
    setEditMessage(null);
    setDeleteError(null);

    try {
      // Check if instrument_mode column exists in songs table
      const { data: testSongData, error: testSongError } = await supabase.from('songs').select('instrument_mode').limit(1);
      const hasSongInstrumentMode = !testSongError || testSongError.code !== '42703';

      let updateData: any = {
        title: editTitle,
        artist: editArtist,
        arranger: editArranger.trim() || null,
        description: editDescription.trim() || null,
        midi_link: editMidiLink.trim() || null,
        midi_offset: editMidiOffset ? parseInt(editMidiOffset, 10) : null,
        background_url: editBackgroundUrl.trim() || null,
        accuracy_level: editAccuracyLevel,
      };

      if (hasSongInstrumentMode) {
        updateData.instrument_mode = instrumentMode;
      }

      // If file is being replaced
      if (editFile) {
        const editExt = editFile.name.toLowerCase().split('.').pop();
        if (editExt !== 'mid' && editExt !== 'midi') {
          setEditMessage({ type: 'error', text: 'Please upload a MIDI file (.mid, .midi).' });
          setIsEditing(false);
          return;
        }

        // 1. Re-analyze the new file
        const analysisData = await parseFileForAnalysis(editFile, midiNoteToNameMap);
        if (analysisData && analysisData.notes.length > 0) {
          const analysisResult = analyzeMidi(analysisData.notes, analysisData.originalTotalMusicalDurationMs, undefined, analysisData.originalTotalMusicalDurationMs, instrumentMode);
          if (analysisResult) {
            updateData.difficulty_level = analysisResult.difficultyLevel;
            updateData.performance_score = analysisResult.performanceScore;
            updateData.total_notes = analysisResult.meta.totalNotes;
            updateData.duration_sec = analysisResult.meta.durationSec;
            updateData.total_nps = analysisResult.parameters.totalNps;
          }
        }

        // 2. Upload the new file (overwriting existing is safer by using a new name and deleting old or just overwriting)
        // Let's use the same path if possible, or delete old and upload new.
        // Storage folder is usually uploaderId/filename
        const { error: uploadError } = await supabase.storage
          .from('midi-files')
          .upload(songToEdit.file_path, editFile, {
            upsert: true
          });

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase
        .from('songs')
        .update(updateData)
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US');

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
      {/* Search and Upload Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <div className="relative w-full sm:flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none text-sm shadow-inner transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                const event = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
                handleSearch(event);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={handleUploadClick}
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-cyan-500/20 whitespace-nowrap text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>{t.uploadMidiBtn}</span>
        </button>
      </div>

      {/* Sorting and Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-slate-900/80 rounded-2xl border border-white/10 text-xs">
        {/* Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">{t.sortByLabel}</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => handleSortChange('newest')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                sortOrder.startsWith('newest') 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{sortOrder.startsWith('newest') && sortOrder.endsWith('asc') ? t.sortOldest : t.sortNewest}</span>
            </button>
            <button
              onClick={() => handleSortChange('difficulty')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                sortOrder.startsWith('difficulty') 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>{sortOrder.startsWith('difficulty') && sortOrder.endsWith('asc') ? t.sortEasiest : t.sortHardest}</span>
            </button>
            <button
              onClick={() => handleSortChange('alphabetical')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                sortOrder.startsWith('alphabetical') 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h7M4 12h5M4 18h3M15 15l3 3 3-3M18 6v12"/></svg>
              <span>{sortOrder.startsWith('alphabetical') && sortOrder.endsWith('desc') ? t.sortZA : t.sortAZ}</span>
            </button>
            <button
              onClick={() => handleSortChange('mostLiked')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                sortOrder.startsWith('mostLiked') 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>{sortOrder.startsWith('mostLiked') && sortOrder.endsWith('asc') ? t.sortLeastLiked : t.sortMostLiked}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">{t.filterLabel}</span>
          <div className="flex bg-slate-950/60 p-0.5 rounded-xl border border-white/5 gap-1">
            <button
              onClick={() => setRankedFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                rankedFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.filterAll}
            </button>
            <button
              onClick={() => setRankedFilter('ranked')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                rankedFilter === 'ranked' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
              <span>{t.filterRanked}</span>
            </button>
            <button
              onClick={() => setRankedFilter('nonRanked')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                rankedFilter === 'nonRanked' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.filterNonRanked}
            </button>
            <button
              onClick={() => user && setRankedFilter('liked')}
              disabled={!user}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                !user 
                  ? 'opacity-40 cursor-not-allowed text-slate-500' 
                  : rankedFilter === 'liked' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>{t.filterLiked}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Song Grid List */}
      <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-950/40 rounded-2xl p-2 border border-white/5">
        {fetchError && (
          <div className="text-red-400 text-center p-4 bg-red-950/20 rounded-xl border border-red-500/30 text-sm mb-3">
            <span className="mr-1.5 inline-block">!</span>{fetchError}
          </div>
        )}
        {deleteError && (
          <div className="text-red-400 text-center p-4 bg-red-950/20 rounded-xl border border-red-500/30 text-sm mb-3">
            <span className="mr-1.5 inline-block">!</span>{deleteError}
          </div>
        )}

        {!isLoading && songs.length === 0 && !fetchError && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-base font-bold text-slate-300 mb-1">
              {t.noSongsFoundTitle}
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              {t.noSongsFoundDesc}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {songs.map((song) => {
            const personalBestScore = personalBests.get(song.id);
            const userLikeStatus = userLikes.get(song.id);
            const netScore = (song.like_count ?? 0) - (song.dislike_count ?? 0);
            return (
              <div
                key={song.id}
                className="bg-slate-900/80 hover:bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/50 shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Title & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 
                      className="text-base font-black text-white group-hover:text-cyan-300 transition-colors truncate" 
                      title={song.title}
                    >
                      {song.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {song.is_ranked && (
                        <span 
                          className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                          <span>RANKED</span>
                        </span>
                      )}
                      {song.midi_link && (
                        <span 
                          className="px-2 py-0.5 text-[10px] font-black rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                          <span>BACKING</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Artist & Arranger */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300 truncate max-w-[200px]" title={song.artist}>
                      {song.artist || 'Unknown Artist'}
                    </span>
                    {song.arranger && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 truncate max-w-[150px]" title={`Arr. by ${song.arranger}`}>
                          Arr. {song.arranger}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Description if present */}
                  {song.description && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border-l-2 border-cyan-500/50 mb-2 line-clamp-2">
                      {song.description}
                    </p>
                  )}

                  {/* Difficulty & Personal Best */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {personalBestScore && (
                      <div
                        className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 rounded-lg px-2.5 py-1 flex items-center gap-1.5 cursor-pointer hover:bg-amber-900/40 transition-colors shadow-sm"
                        onClick={() => handleOpenPerformanceSummary(personalBestScore)}
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5z"/></svg>
                        <span>{t.personalBestLabel}</span>
                        <strong className="font-mono text-white">{Math.round(personalBestScore.final_score).toLocaleString('en-US')}</strong>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(song.id);
                        const btn = e.currentTarget;
                        const oldText = btn.innerHTML;
                        btn.innerHTML = `<span class="text-green-400 font-bold">${t.copiedBadge}</span>`;
                        setTimeout(() => btn.innerHTML = oldText, 2000);
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 font-medium bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 py-1 px-2 rounded-lg transition-all"
                      title={t.copyIdTooltip}
                    >
                      {t.copyIdTooltip}
                    </button>
                  </div>

                  {/* Difficulty Analysis Bar */}
                  {(song.difficulty_level != null && song.performance_score != null) && (
                    <div className="mb-2">
                      <DifficultyAnalysis
                        analysisResult={{
                          difficultyLevel: song.difficulty_level,
                          performanceScore: song.performance_score,
                          parameters: {
                            starLevel: Math.round(song.difficulty_level),
                            density: 0,
                            intervalComplexity: 0,
                            physicalEffort: 0,
                            chordMobility: 0,
                            arpeggioVirtuosity: 0,
                            arpeggioRepetition: 0,
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

                  {song.uploader_id && (
                    <p className="text-[10px] text-slate-500">
                      {t.uploadedBy} {userUsernameCache.get(song.uploader_id) || song.uploader_id.substring(0, 8)} • {formatDate(song.created_at)}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap justify-between items-center gap-2">
                  {/* Left: Reaction score */}
                  <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => handleLikeDislike(song, 'like')} 
                      disabled={!user} 
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        userLikeStatus === 1 
                          ? 'bg-emerald-600 text-white' 
                          : 'hover:bg-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30'
                      }`} 
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <span className={`text-xs font-mono font-bold px-1 tabular-nums ${
                      netScore > 0 ? 'text-emerald-400' : netScore < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {netScore}
                    </span>
                    <button 
                      onClick={() => handleLikeDislike(song, 'dislike')} 
                      disabled={!user} 
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        userLikeStatus === -1 
                          ? 'bg-rose-600 text-white' 
                          : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-30'
                      }`} 
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>

                  {/* Right: Management & Play */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(currentUserIsUploader(song.uploader_id) || isAdmin) && (
                      <>
                        <button 
                          onClick={() => openEditModal(song)} 
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors" 
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDownloadMidi(song)} 
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors" 
                          title="Download"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteSong(song.id)} 
                          className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-2.5 py-1.5 rounded-lg transition-colors" 
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleToggleRanked(song.id, !!song.is_ranked)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                          song.is_ranked 
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {song.is_ranked ? 'Unrank' : 'Rank'}
                      </button>
                    )}

                    {song.is_ranked && (
                      <button 
                        onClick={() => setLeaderboardSong(song)} 
                        className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors" 
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                        <span className="hidden sm:inline">Leaderboard</span>
                      </button>
                    )}

                    <button
                      onClick={() => handlePlaySong(song)}
                      className="text-xs md:text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-1.5 rounded-xl shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <span>{t.selectSongBtn}</span>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {hasMore && !isLoading && songs.length > 0 && (
          <div className="mt-6 flex justify-center pb-4">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-white/10 shadow-md transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {isLoadingMore ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t.loadingMore}</span>
                </>
              ) : (
                <>
                  <span>{t.loadMoreSongs}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                </>
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
          <div className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600 flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0">
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
            </div>

            <form onSubmit={handleUploadSubmit} className="flex-grow flex flex-col min-h-0 mt-4">
              <div className="flex-grow overflow-y-auto custom-scrollbar -mr-4 pr-4 space-y-4">
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">MP3 Link (Optional)</label>
                  <input
                    type="text"
                    value={uploadMidiLink}
                    onChange={e => setUploadMidiLink(e.target.value)}
                    placeholder="Youtube/Source Link"
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={300}
                  />
                  <div className={`text-xs text-right mt-1 ${uploadMidiLink.length > 300 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadMidiLink.length} / 300
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">MP3 Offset (Optional)</label>
                  <input
                    type="number"
                    value={uploadMidiOffset}
                    onChange={e => { if (e.target.value.length <= 7) setUploadMidiOffset(e.target.value) }}
                    placeholder="Offset in ms (e.g. 2000)"
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={7}
                  />
                  <div className={`text-xs text-right mt-1 ${uploadMidiOffset.length > 7 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadMidiOffset.length} / 7
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Background URL (Optional)</label>
                  <input
                    type="text"
                    value={uploadBackgroundUrl}
                    onChange={e => setUploadBackgroundUrl(e.target.value)}
                    placeholder="URL for custom background"
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    maxLength={300}
                  />
                  <div className={`text-xs text-right mt-1 ${uploadBackgroundUrl.length > 300 ? 'text-red-400' : 'text-slate-400'}`}>
                    {uploadBackgroundUrl.length} / 300
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Song File (MIDI)</label>
                  <input
                    type="file"
                    required
                    ref={fileInputRef}
                    accept=".mid,.midi,audio/mid,audio/midi"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                  />
                  <p className="text-xs text-yellow-400 mt-2 text-left font-bold">
                    You need to edit midi in Local Import before submitting new midi, like snyc the midi with mp3, etc so the midi will be playable and fun.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700 flex-shrink-0">
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
                  disabled={isUploading || !uploadTitle.trim() || uploadTitle.length > 50 || !uploadArtist.trim() || uploadArtist.length > 25 || uploadArranger.length > 25 || uploadDescription.length > 100 || uploadMidiLink.length > 300 || uploadMidiOffset.length > 7 || !uploadFile}
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
          <div className={`bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full ring-1 ring-slate-600 flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} onClick={e => e.stopPropagation()}>
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-white mb-2">Edit MIDI</h2>
              {editMessage && (
                <div className={`p-3 my-4 rounded text-sm ${editMessage.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                  {editMessage.text}
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateSong} className="flex-grow flex flex-col min-h-0 mt-4">
              <div className="flex-grow overflow-y-auto custom-scrollbar -mr-4 pr-4 space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">MP3 Link (Optional)</label>
                  <input
                    type="text"
                    value={editMidiLink}
                    onChange={e => setEditMidiLink(e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    disabled={isEditing}
                    placeholder="Youtube/Source Link"
                    maxLength={300}
                  />
                  <div className={`text-xs text-right mt-1 ${editMidiLink.length > 300 ? 'text-red-400' : 'text-slate-400'}`}>
                    {editMidiLink.length} / 300
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">MP3 Offset (Optional)</label>
                  <input
                    type="number"
                    value={editMidiOffset}
                    onChange={e => { if (e.target.value.length <= 7) setEditMidiOffset(e.target.value) }}
                    className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                    disabled={isEditing}
                    placeholder="Offset in ms"
                    maxLength={7}
                  />
                  <div className={`text-xs text-right mt-1 ${editMidiOffset.length > 7 ? 'text-red-400' : 'text-slate-400'}`}>
                    {editMidiOffset.length} / 7
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Background URL (Optional)</label>
                    <input
                      type="text"
                      value={editBackgroundUrl}
                      onChange={e => setEditBackgroundUrl(e.target.value)}
                      className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white focus:ring-cyan-500"
                      disabled={isEditing}
                      placeholder="URL for custom background"
                      maxLength={300}
                    />
                    <div className={`text-xs text-right mt-1 ${editBackgroundUrl.length > 300 ? 'text-red-400' : 'text-slate-400'}`}>
                      {editBackgroundUrl.length} / 300
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Replace Song File (Optional, MIDI only)</label>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept=".mid,.midi,audio/mid,audio/midi"
                      onChange={e => setEditFile(e.target.files?.[0] || null)}
                      className="w-full text-slate-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                      disabled={isEditing}
                    />
                    <p className="text-[10px] text-amber-400 mt-1 italic">Selecting a file will replace the current MIDI file on the server.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700 flex-shrink-0">
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
                  disabled={isEditing || !editTitle.trim() || editTitle.length > 50 || !editArtist.trim() || editArtist.length > 25 || editArranger.length > 25 || editDescription.length > 100 || editMidiLink.length > 300 || editMidiOffset.length > 7 || editBackgroundUrl.length > 300}
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
