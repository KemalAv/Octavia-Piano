
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { LeaderboardEntry, Profile, FriendWithProfile } from '../types';
import ViewProfileModal from './ViewProfileModal';

interface LeaderboardProps {
  onBack: () => void;
  onGoToOnlineSong: (songId: string) => void;
  instrumentMode: 'piano' | 'drum';
}

const PlaceholderAvatar: React.FC = () => (
    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
);

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, onGoToOnlineSong, instrumentMode: initialInstrumentMode }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'search' | 'friends' | 'requests' | 'community'>('leaderboard');
    const [instrumentMode, setInstrumentMode] = useState<'piano' | 'drum'>(initialInstrumentMode);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    }, []);

    // Leaderboard State
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Friends & Requests State
    const [friends, setFriends] = useState<FriendWithProfile[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendWithProfile[]>([]);
    const [relationships, setRelationships] = useState<Map<string, { status: 'accepted' | 'pending_sent' | 'pending_received' }>>(new Map());

    const [selectedProfileData, setSelectedProfileData] = useState<{ userId: string; rank: number; } | null>(null);

    const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";
    const tabStyle = "flex-1 py-3 text-center font-bold text-lg cursor-pointer transition-colors border-b-2 relative";
    const activeTabStyle = "border-cyan-400 text-cyan-400 bg-slate-700/50";
    const inactiveTabStyle = "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30";

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            // Check if instrument_mode column exists in scores table
            const { data: testData, error: testError } = await supabase.from('scores').select('instrument_mode').limit(1);
            const hasInstrumentMode = !testError || testError.code !== '42703';

            const rpcParams = hasInstrumentMode ? { p_instrument_mode: instrumentMode } : {};
            const { data, error } = await supabase.rpc('get_leaderboard', rpcParams);
            
            if (error) {
                // If RPC fails with the parameter, try without it as a fallback
                if (hasInstrumentMode) {
                    const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_leaderboard');
                    if (fallbackError) throw fallbackError;
                    setLeaderboardData(fallbackData as LeaderboardEntry[]);
                } else {
                    throw error;
                }
            } else {
                setLeaderboardData(data as LeaderboardEntry[]);
            }
        } catch (err: any) {
            console.error("Leaderboard fetch failed:", err);
            setMessage({ type: 'error', text: `Failed to load leaderboard: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }, [instrumentMode]);

    const fetchRelationships = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setMessage(null);
        try {
            const { data: relationshipsData, error } = await supabase
                .from('friends')
                .select('user_id, friend_id, status, created_at')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            
            if (error) throw error;
            if (!relationshipsData) return;

            const otherUserIds = new Set<string>();
            relationshipsData.forEach(rel => {
                if (rel.user_id === user.id) {
                    otherUserIds.add(rel.friend_id);
                } else {
                    otherUserIds.add(rel.user_id);
                }
            });

            if (otherUserIds.size === 0) {
                setFriends([]);
                setFriendRequests([]);
                setRelationships(new Map());
                setLoading(false);
                return;
            }

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', Array.from(otherUserIds));
            
            if (profilesError) throw profilesError;

            const profilesMap = new Map<string, Profile>();
            (profilesData as Profile[]).forEach(p => profilesMap.set(p.id, p));

            const newFriends: FriendWithProfile[] = [];
            const newFriendRequests: FriendWithProfile[] = [];
            const newRelationshipsMap = new Map<string, { status: 'accepted' | 'pending_sent' | 'pending_received' }>();

            for (const rel of relationshipsData) {
                const otherUserId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
                const profile = profilesMap.get(otherUserId);
                if (!profile) continue;

                if (rel.status === 'accepted') {
                    newFriends.push({ ...rel, friend_profile: profile });
                    newRelationshipsMap.set(otherUserId, { status: 'accepted' });
                } else if (rel.status === 'pending') {
                    if (rel.friend_id === user.id) { // I am the receiver
                        newFriendRequests.push({ ...rel, friend_profile: profile });
                        newRelationshipsMap.set(otherUserId, { status: 'pending_received' });
                    } else { // I am the sender
                        newRelationshipsMap.set(otherUserId, { status: 'pending_sent' });
                    }
                }
            }
            
            setFriends(newFriends);
            setFriendRequests(newFriendRequests);
            setRelationships(newRelationshipsMap);

        } catch (err: any) {
            setMessage({ type: 'error', text: `Failed to load social data: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
        if (user && (activeTab === 'friends' || activeTab === 'requests')) {
            fetchRelationships();
        }
    }, [activeTab, fetchLeaderboard, fetchRelationships, user]);

    // Pre-fetch relationships for search tab button states
    useEffect(() => {
        if (user && activeTab === 'search') {
            fetchRelationships();
        }
    }, [user, activeTab, fetchRelationships]);


    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        setMessage(null);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('username', `%${query}%`)
                .limit(20);
            if (error) throw error;
            setSearchResults(data as Profile[]);
        } catch (err: any) {
            setMessage({ type: 'error', text: `Search failed: ${err.message}` });
        } finally {
            setIsSearching(false);
        }
    }, []);
    
    const debouncedSearch = useMemo(() => {
        // Fix: Changed NodeJS.Timeout to ReturnType<typeof setTimeout> for browser compatibility.
        let timeoutId: ReturnType<typeof setTimeout>;
        return (query: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handleSearch(query), 300);
        };
    }, [handleSearch]);

    const handleAddFriend = async (friendId: string) => {
        if (!user) return;
        if (relationships.has(friendId)) {
            setMessage({ type: 'error', text: 'You already have a connection with this user.'});
            return;
        }
        if (friends.length >= 50) {
            setMessage({ type: 'error', text: 'You have reached the maximum of 50 friends.'});
            return;
        }
        setMessage(null);
        try {
            const { error } = await supabase.from('friends').insert({ user_id: user.id, friend_id: friendId, status: 'pending' });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Friend request sent!' });
            fetchRelationships(); // Refresh relationships
        } catch(err: any) {
             setMessage({ type: 'error', text: 'Could not send friend request.'});
        }
    };
    
    const handleRemoveFriend = async (friendId: string) => {
        if (!user) return;
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        
        setMessage(null);
        try {
            const { error } = await supabase
                .from('friends')
                .delete()
                .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
                .eq('status', 'accepted');

            if (error) throw error;
            setMessage({ type: 'success', text: 'Friend removed.' });
            fetchRelationships(); // Refresh relationships
        } catch (err: any) {
             setMessage({ type: 'error', text: `Could not remove friend: ${err.message}`});
        }
    };

    const handleAcceptRequest = async (requesterId: string) => {
        if (!user) return;
        setMessage(null);
        try {
            const { error } = await supabase
                .from('friends')
                .update({ status: 'accepted' })
                .match({ user_id: requesterId, friend_id: user.id, status: 'pending' });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Friend request accepted!' });
            fetchRelationships();
        } catch (err: any) {
             setMessage({ type: 'error', text: `Could not accept request: ${err.message}`});
        }
    };

    const handleDeclineRequest = async (requesterId: string) => {
        if (!user) return;
        if (!window.confirm("Are you sure you want to decline this request?")) return;
        
        setMessage(null);
        try {
            const { error } = await supabase
                .from('friends')
                .delete()
                .match({ user_id: requesterId, friend_id: user.id, status: 'pending' });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Request declined.' });
            fetchRelationships();
        } catch (err: any) {
             setMessage({ type: 'error', text: `Could not decline request: ${err.message}`});
        }
    };

    const renderList = (children: React.ReactNode) => (
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-lg p-2 ring-1 ring-slate-700/50">
            {loading ? <div className="text-center p-8 text-slate-300 animate-pulse">Loading...</div> : children}
        </div>
    );
    
    const getFriendButton = (profile: Profile) => {
        if (!user || user.id === profile.id) return null;
        const rel = relationships.get(profile.id);

        if (rel?.status === 'accepted') {
            return <button onClick={() => handleRemoveFriend(profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-red-600 hover:bg-red-700 text-white">Remove Friend</button>;
        }
        if (rel?.status === 'pending_sent') {
            return <button disabled className="px-4 py-2 text-sm rounded-lg font-semibold bg-slate-600 cursor-not-allowed">Request Sent</button>;
        }
        if (rel?.status === 'pending_received') {
            return <button onClick={() => handleAcceptRequest(profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white">Accept Request</button>;
        }
        return <button onClick={() => handleAddFriend(profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-violet-600 hover:bg-violet-700 text-white">Add Friend</button>;
    };

    return (
        <div className={`fixed inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-40 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute top-4 left-4" style={{ zIndex: 9999 }}>
                <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to Menu</button>
            </div>
            <div className={`bg-slate-800/50 backdrop-blur-sm p-0 rounded-xl shadow-2xl text-center max-w-4xl w-full ring-1 ring-slate-700 max-h-[90vh] flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${isRendered ? 'scale-100' : 'scale-95'}`}>
                <div className="flex border-b border-slate-700 bg-slate-800/80">
                    <div className={`${tabStyle} ${activeTab === 'leaderboard' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</div>
                    <div className={`${tabStyle} ${activeTab === 'search' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('search')}>Search</div>
                    <div className={`${tabStyle} ${activeTab === 'friends' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('friends')}>My Friends</div>
                    <div className={`${tabStyle} ${activeTab === 'requests' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('requests')}>
                        Requests
                        {friendRequests.length > 0 && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                                {friendRequests.length}
                            </span>
                        )}
                    </div>
                    <div className={`${tabStyle} ${activeTab === 'community' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('community')}>Community</div>
                </div>

                <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-grow flex flex-col">
                    {message && <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}

                    {activeTab === 'leaderboard' && (
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                <div className="text-left">
                                    <h2 className="text-3xl font-bold text-cyan-400 mb-1">{instrumentMode === 'drum' ? 'Drum' : 'Piano'} Global Leaderboard</h2>
                                    <p className="text-sm text-slate-400">Top performers across the globe</p>
                                </div>
                                <div className="flex bg-slate-700 rounded-lg p-1">
                                    <button 
                                        onClick={() => setInstrumentMode('piano')}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${instrumentMode === 'piano' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Piano
                                    </button>
                                    <button 
                                        onClick={() => setInstrumentMode('drum')}
                                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${instrumentMode === 'drum' ? 'bg-violet-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Drum
                                    </button>
                                </div>
                            </div>
                            {renderList(
                                <table className="w-full text-left table-fixed">
                                    <thead>
                                        <tr className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                                            <th className="p-3 text-sm font-semibold text-slate-400 w-16 text-center">Rank</th>
                                            <th className="p-3 text-sm font-semibold text-slate-400">Player</th>
                                            <th className="p-3 text-sm font-semibold text-slate-400 text-right">Total Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboardData.map((entry, index) => (
                                            <tr key={entry.user_id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                <td className="p-3 font-bold text-slate-300 text-center">{index + 1}</td>
                                                <td className="p-3 flex items-center gap-4 cursor-pointer" onClick={() => setSelectedProfileData({ userId: entry.user_id, rank: index + 1 })}>
                                                    {entry.avatar_url ? <img src={entry.avatar_url} alt={entry.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                                    <span className="font-semibold text-white truncate">{entry.username}</span>
                                                </td>
                                                <td className="p-3 font-mono text-cyan-300 text-right">{Math.round(entry.total_score).toLocaleString('en-US')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="flex flex-col h-full">
                            <input
                                type="text"
                                placeholder="Search by nickname..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); debouncedSearch(e.target.value); }}
                                className="w-full p-3 mb-4 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-violet-500 focus:border-violet-500"
                            />
                            {renderList(
                                isSearching ? <div className="text-center p-8 text-slate-300 animate-pulse">Searching...</div> :
                                searchResults.length === 0 && searchQuery ? <div className="text-center p-8 text-slate-400">No users found.</div> :
                                <div className="space-y-2">
                                    {searchResults.map(profile => (
                                        <div key={profile.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                            <div className="flex items-center gap-4 cursor-pointer flex-grow min-w-0" onClick={() => setSelectedProfileData({ userId: profile.id, rank: 0 })}>
                                                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                                <span className="font-semibold text-white truncate">{profile.username}</span>
                                            </div>
                                            <div className="flex-shrink-0">{getFriendButton(profile)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'friends' && renderList(
                        !user ? <div className="text-center p-8 text-slate-400">Please log in to see your friends.</div> :
                        friends.length === 0 ? <div className="text-center p-8 text-slate-400">You haven't added any friends yet.</div> :
                        <div className="space-y-2">
                             {friends.map(friend => (
                                <div key={friend.friend_profile.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedProfileData({ userId: friend.friend_profile.id, rank: 0 })}>
                                        {friend.friend_profile.avatar_url ? <img src={friend.friend_profile.avatar_url} alt={friend.friend_profile.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                        <span className="font-semibold text-white">{friend.friend_profile.username}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFriend(friend.friend_profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-red-600 hover:bg-red-700 text-white">
                                        Remove
                                    </button>
                                </div>
                             ))}
                        </div>
                    )}

                    {activeTab === 'requests' && renderList(
                        !user ? <div className="text-center p-8 text-slate-400">Please log in to see friend requests.</div> :
                        friendRequests.length === 0 ? <div className="text-center p-8 text-slate-400">No pending friend requests.</div> :
                        <div className="space-y-2">
                            {friendRequests.map(request => (
                                <div key={request.friend_profile.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedProfileData({ userId: request.friend_profile.id, rank: 0 })}>
                                        {request.friend_profile.avatar_url ? <img src={request.friend_profile.avatar_url} alt={request.friend_profile.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                        <span className="font-semibold text-white">{request.friend_profile.username}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptRequest(request.friend_profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white">Accept</button>
                                        <button onClick={() => handleDeclineRequest(request.friend_profile.id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-slate-600 hover:bg-slate-500 text-white">Decline</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'community' && (
                        <div className="p-8 text-center flex-grow flex flex-col items-center justify-center">
                            <h3 className="text-2xl font-bold text-white mb-6">Join the Community</h3>
                            <div className="space-y-4 max-w-sm w-full">
                                <a 
                                    href="https://discord.gg/Ms8d6guHf2" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-400 flex items-center justify-center gap-3"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.36981C18.879 3.65681 17.311 3.11181 15.654 2.76481C15.604 2.88081 15.541 3.00881 15.479 3.13681C13.896 2.84281 12.234 2.84281 10.513 3.13681C10.459 3.00881 10.395 2.88081 10.345 2.76481C8.688 3.11181 7.12 3.65681 5.683 4.36981C2.515 8.64781 1.766 12.6178 2.214 16.5518C4.004 17.7438 5.683 18.3978 7.332 18.8578C7.479 18.5908 7.614 18.3098 7.737 18.0288C7.12 17.8468 6.531 17.6258 5.964 17.3688C6.037 17.2958 6.11 17.2228 6.183 17.1488C10.159 19.0148 13.831 19.0148 17.817 17.1488C17.881 17.2228 17.953 17.2958 18.026 17.3688C17.459 17.6258 16.87 17.8468 16.263 18.0288C16.386 18.3098 16.521 18.5908 16.668 18.8578C18.317 18.3978 19.996 17.7438 21.786 16.5518C22.284 12.2988 21.365 8.42781 20.317 4.36981ZM8.021 13.9188C7.307 13.9188 6.727 13.2798 6.727 12.4998C6.727 11.7198 7.295 11.0808 8.021 11.0808C8.747 11.0808 9.327 11.7198 9.315 12.4998C9.315 13.2798 8.747 13.9188 8.021 13.9188ZM15.979 13.9188C15.265 13.9188 14.685 13.2798 14.685 12.4998C14.685 11.7198 15.253 11.0808 15.979 11.0808C16.705 11.0808 17.285 11.7198 17.273 12.4998C17.273 13.2798 16.705 13.9188 15.979 13.9188Z"></path></svg>
                                    Join our Discord
                                </a>
                                <a 
                                    href="https://sociabuzz.com/kemalavicennafaza/tribe" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg bg-pink-500 hover:bg-pink-600 text-white focus:ring-pink-400 flex items-center justify-center gap-3"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.5 6h-11V5h11v4z"></path></svg>
                                    Donate Link
                                </a>
                            </div>
                             <p className="text-slate-400 mt-8 text-sm">
                                Your support helps keep Octavia running and evolving. Thank you!
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {selectedProfileData && (
                <ViewProfileModal 
                    isOpen={!!selectedProfileData} 
                    userId={selectedProfileData.userId} 
                    globalRank={selectedProfileData.rank > 0 ? selectedProfileData.rank : undefined}
                    onClose={() => setSelectedProfileData(null)} 
                    onGoToOnlineSong={onGoToOnlineSong} 
                />
            )}
        </div>
    );
};

export default Leaderboard;
