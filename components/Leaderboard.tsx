
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { LeaderboardEntry, Profile, FriendWithProfile } from '../types';
import ViewProfileModal from './ViewProfileModal';

interface LeaderboardProps {
  onBack: () => void;
  onGoToOnlineSong: (songId: string) => void; // FIX: Changed prop type from `(file: File, onlineSongId: string) => Promise<void>` to `(songId: string) => void`
}

const PlaceholderAvatar: React.FC = () => (
    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
);

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, onGoToOnlineSong }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'search' | 'friends'>('leaderboard');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Leaderboard State
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Friends State
    const [friends, setFriends] = useState<FriendWithProfile[]>([]);
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

    const [selectedPlayerProfileId, setSelectedPlayerProfileId] = useState<string | null>(null);

    const tertiaryButtonStyle = "bg-slate-600 hover:bg-slate-700 text-slate-200 focus:ring-slate-500";
    const tabStyle = "flex-1 py-3 text-center font-bold text-lg cursor-pointer transition-colors border-b-2";
    const activeTabStyle = "border-cyan-400 text-cyan-400 bg-slate-700/50";
    const inactiveTabStyle = "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30";

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('get_leaderboard');
            if (error) throw error;
            setLeaderboardData(data as LeaderboardEntry[]);
        } catch (err: any) {
            setMessage({ type: 'error', text: `Failed to load leaderboard: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setMessage(null);
        try {
            // Step 1: Fetch raw friend relationships (user_id and friend_id)
            const { data: rawFriendsData, error: friendsError } = await supabase
                .from('friends')
                .select('user_id, friend_id, created_at')
                .eq('user_id', user.id);

            if (friendsError) throw friendsError;

            if (!rawFriendsData || rawFriendsData.length === 0) {
                setFriends([]);
                setFriendIds(new Set());
                setLoading(false);
                return;
            }

            const uniqueFriendIds = Array.from(new Set(rawFriendsData.map(f => f.friend_id)));

            // Step 2: Fetch profiles for all unique friend IDs
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, created_at, last_nickname_change')
                .in('id', uniqueFriendIds);

            if (profilesError) throw profilesError;

            const profilesMap = new Map<string, Profile>();
            (profilesData as Profile[]).forEach(profile => profilesMap.set(profile.id, profile));

            // Step 3: Combine raw friends data with fetched profile data
            const friendDataWithProfiles: FriendWithProfile[] = rawFriendsData.map(f => ({
                user_id: f.user_id,
                friend_id: f.friend_id,
                created_at: f.created_at,
                friend_profile: profilesMap.get(f.friend_id) || {
                    id: f.friend_id,
                    username: 'Unknown User', // Fallback
                    avatar_url: null,
                    created_at: null,
                    last_nickname_change: null,
                }
            }));

            setFriends(friendDataWithProfiles);
            setFriendIds(new Set(friendDataWithProfiles.map(f => f.friend_id)));

        } catch (err: any) {
            setMessage({ type: 'error', text: `Failed to load friends: ${err.message}` });
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
        if (activeTab === 'friends') {
            fetchFriends();
        }
        if (user) {
            // Also fetch friend IDs in background for search results
            fetchFriends();
        }
    }, [activeTab, fetchLeaderboard, fetchFriends, user]);

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
        let timeoutId: NodeJS.Timeout;
        return (query: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handleSearch(query), 300);
        };
    }, [handleSearch]);

    const handleAddFriend = async (friendId: string) => {
        if (!user) return;
        if (friends.length >= 50) {
            setMessage({ type: 'error', text: 'You have reached the maximum of 50 friends.'});
            return;
        }
        setMessage(null);
        try {
            const { error } = await supabase.from('friends').insert({ user_id: user.id, friend_id: friendId });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Friend added!' });
            fetchFriends(); // Refresh friends list
        } catch(err: any) {
             setMessage({ type: 'error', text: 'Could not add friend. They may already be on your list.'});
        }
    };
    
    const handleRemoveFriend = async (friendId: string) => {
        if (!user) return;
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        
        setMessage(null);
        try {
            const { error } = await supabase.from('friends').delete().match({ user_id: user.id, friend_id: friendId });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Friend removed.' });
            fetchFriends(); // Refresh friends list
        } catch (err: any) {
             setMessage({ type: 'error', text: `Could not remove friend: ${err.message}`});
        }
    };

    const renderList = (children: React.ReactNode) => (
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-lg p-2 ring-1 ring-slate-700/50">
            {loading ? <div className="text-center p-8 text-slate-300 animate-pulse">Loading...</div> : children}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-40 p-4">
            <div className="absolute top-4 left-4">
                <button onClick={onBack} className={`${tertiaryButtonStyle} py-2 px-4 text-base shadow-md`}>&larr; Back to Menu</button>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm p-0 rounded-xl shadow-2xl text-center max-w-4xl w-full ring-1 ring-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex border-b border-slate-700 bg-slate-800/80">
                    <div className={`${tabStyle} ${activeTab === 'leaderboard' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</div>
                    <div className={`${tabStyle} ${activeTab === 'search' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('search')}>Search</div>
                    <div className={`${tabStyle} ${activeTab === 'friends' ? activeTabStyle : inactiveTabStyle}`} onClick={() => setActiveTab('friends')}>My Friends</div>
                </div>

                <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-grow flex flex-col">
                    {message && <div className={`p-3 mb-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}

                    {activeTab === 'leaderboard' && renderList(
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
                                        <td className="p-3 flex items-center gap-4 cursor-pointer" onClick={() => setSelectedPlayerProfileId(entry.user_id)}>
                                            {entry.avatar_url ? <img src={entry.avatar_url} alt={entry.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                            <span className="font-semibold text-white truncate">{entry.username}</span>
                                        </td>
                                        <td className="p-3 font-mono text-cyan-300 text-right">{Math.round(entry.total_score).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedPlayerProfileId(profile.id)}>
                                                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                                <span className="font-semibold text-white">{profile.username}</span>
                                            </div>
                                            {user && user.id !== profile.id && (
                                                <button 
                                                    onClick={() => handleAddFriend(profile.id)} 
                                                    disabled={friendIds.has(profile.id)}
                                                    className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-violet-600 hover:bg-violet-700 text-white disabled:bg-slate-600 disabled:cursor-not-allowed"
                                                >
                                                    {friendIds.has(profile.id) ? 'Friend' : 'Add Friend'}
                                                </button>
                                            )}
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
                                <div key={friend.friend_id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedPlayerProfileId(friend.friend_id)}>
                                        {friend.friend_profile.avatar_url ? <img src={friend.friend_profile.avatar_url} alt={friend.friend_profile.username} className="w-12 h-12 rounded-full object-cover" /> : <PlaceholderAvatar />}
                                        <span className="font-semibold text-white">{friend.friend_profile.username}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFriend(friend.friend_id)} className="px-4 py-2 text-sm rounded-lg font-semibold transition bg-red-600 hover:bg-red-700 text-white">
                                        Remove
                                    </button>
                                </div>
                             ))}
                        </div>
                    )}
                </div>
            </div>
            {/* FIX: Pass 'onGoToOnlineSong' prop to ViewProfileModal */}
            {selectedPlayerProfileId && <ViewProfileModal isOpen={!!selectedPlayerProfileId} userId={selectedPlayerProfileId} onClose={() => setSelectedPlayerProfileId(null)} onGoToOnlineSong={onGoToOnlineSong} />}
        </div>
    );
};

export default Leaderboard;