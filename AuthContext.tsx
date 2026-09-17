import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { UserSession } from './types';

// Create the AuthContext
const AuthContext = createContext<UserSession | undefined>(undefined);

// Module-level cache to guarantee single-execution across React StrictMode remounts
let cachedSession: Session | null = null;
let authInitPromise: Promise<Session | null> | null = null;
const authSubscribers = new Set<(session: Session | null) => void>();

const notifySubscribers = (newSession: Session | null) => {
  cachedSession = newSession;
  authSubscribers.forEach((cb) => {
    try {
      cb(newSession);
    } catch (e) {
      console.warn('Error notifying auth subscriber:', e);
    }
  });
};

const extractHashParams = (hash: string): URLSearchParams | null => {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!raw) return null;
  try {
    return new URLSearchParams(raw);
  } catch {
    return null;
  }
};

const executeAuthInitialization = async (): Promise<Session | null> => {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check for OAuth errors in search or hash
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = extractHashParams(window.location.hash);

    const errorDesc =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams?.get('error_description') ||
      hashParams?.get('error');

    if (errorDesc) {
      console.warn('OAuth redirect error detected:', errorDesc);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_code');
      cleanUrl.searchParams.delete('error_description');
      cleanUrl.hash = '';
      window.history.replaceState(window.history.state, document.title, cleanUrl.pathname + cleanUrl.search);
      return null;
    }

    // 2. Check for tokens in the hash (Google OAuth implicit flow redirect)
    if (hashParams) {
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken) {
        console.log('[Auth] Google OAuth tokens found in URL. Establishing session...');
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('[Auth] Failed to setSession from tokens:', error);
          } else if (data?.session) {
            console.log('[Auth] Successfully authenticated with Google!');
            notifySubscribers(data.session);

            // Clean the tokens from the URL hash immediately so user gets clean https://octaviapiano.com/
            const cleanUrl = new URL(window.location.href);
            cleanUrl.hash = '';
            window.history.replaceState(window.history.state, document.title, cleanUrl.pathname + cleanUrl.search);

            // Broadcast to other tabs & opener
            if (typeof BroadcastChannel !== 'undefined') {
              try {
                const ch = new BroadcastChannel('octavia_auth_channel');
                ch.postMessage({ type: 'OCTAVIA_AUTH_CALLBACK', session: data.session });
                ch.close();
              } catch {}
            }
            try {
              localStorage.setItem('octavia_auth_notify', Date.now().toString());
            } catch {}

            if (typeof window !== 'undefined') {
              if (window.opener) {
                try {
                  window.opener.postMessage({ type: 'OCTAVIA_AUTH_CALLBACK', session: data.session }, '*');
                } catch {}
              }
              // If this window was an auth popup, close it smoothly after login
              if (window.name === 'octavia_auth_popup' || (window.opener && window.opener !== window)) {
                setTimeout(() => {
                  try {
                    window.close();
                  } catch {}
                }, 800);
              }
            }

            return data.session;
          }
        } catch (setErr) {
          console.error('[Auth] Exception in setSession:', setErr);
        }
      }
    }

    // 3. Check for PKCE authorization code in query parameters
    const code = searchParams.get('code');
    if (code) {
      console.log('[Auth] Authorization code found in query. Exchanging for session...');
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[Auth] Failed code exchange:', error);
        } else if (data?.session) {
          console.log('[Auth] Code exchange successful!');
          notifySubscribers(data.session);

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('code');
          cleanUrl.searchParams.delete('state');
          window.history.replaceState(window.history.state, document.title, cleanUrl.pathname + cleanUrl.search);

          // Broadcast to other tabs & opener
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const ch = new BroadcastChannel('octavia_auth_channel');
              ch.postMessage({ type: 'OCTAVIA_AUTH_CALLBACK', session: data.session });
              ch.close();
            } catch {}
          }
          try {
            localStorage.setItem('octavia_auth_notify', Date.now().toString());
          } catch {}

          if (typeof window !== 'undefined') {
            if (window.opener) {
              try {
                window.opener.postMessage({ type: 'OCTAVIA_AUTH_CALLBACK', session: data.session }, '*');
              } catch {}
            }
            // If this window was an auth popup, close it smoothly after login
            if (window.name === 'octavia_auth_popup' || (window.opener && window.opener !== window)) {
              setTimeout(() => {
                try {
                  window.close();
                } catch {}
              }, 800);
            }
          }

          return data.session;
        }
      } catch (exErr) {
        console.error('[Auth] Exception during code exchange:', exErr);
      }
    }

    // 4. Fallback: Recover existing persisted session from localStorage
    const { data: { session: existingSession }, error: getErr } = await supabase.auth.getSession();
    if (getErr) {
      console.warn('[Auth] getSession warning:', getErr);
    }
    if (existingSession) {
      notifySubscribers(existingSession);
      return existingSession;
    }

    return null;
  } catch (err) {
    console.error('[Auth] Unexpected error during initialization:', err);
    return null;
  }
};

const getOrInitAuth = (): Promise<Session | null> => {
  if (!authInitPromise) {
    authInitPromise = executeAuthInitialization();
  }
  return authInitPromise;
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [user, setUser] = useState<User | null>(cachedSession?.user || null);
  const [loading, setLoading] = useState<boolean>(!cachedSession);
  const [authError, setAuthError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    mountedRef.current = true;

    // Check if error is in URL for error message state
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = extractHashParams(window.location.hash);
      const errorDesc =
        searchParams.get('error_description') ||
        searchParams.get('error') ||
        hashParams?.get('error_description') ||
        hashParams?.get('error');

      if (errorDesc && mountedRef.current) {
        setAuthError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
      }
    }

    // Subscribe this component instance to the module-level session notifier
    const subscriber = (newSession: Session | null) => {
      if (mountedRef.current) {
        setSession(newSession);
        setUser(newSession?.user || null);
        setLoading(false);
        if (newSession) {
          setAuthError(null);
        }
      }
    };
    authSubscribers.add(subscriber);

    // Run or await the initialization promise
    getOrInitAuth().then((resolvedSession) => {
      if (mountedRef.current) {
        setSession(resolvedSession);
        setUser(resolvedSession?.user || null);
        setLoading(false);
      }
    });

    // Supabase auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] State changed:', event, newSession ? 'User authenticated' : 'No session');
      if (newSession) {
        notifySubscribers(newSession);
      } else if (event === 'SIGNED_OUT') {
        notifySubscribers(null);
      }
    });

    // Cross-tab synchronization via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('octavia_auth_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'OCTAVIA_AUTH_CALLBACK' && event.data.session) {
            notifySubscribers(event.data.session);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Cross-tab synchronization via storage events
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'octavia_auth_notify' ||
        (event.key && event.key.startsWith('sb-') && event.key.endsWith('-auth-token'))
      ) {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession) {
            notifySubscribers(currentSession);
          }
        });
      }
    };
    window.addEventListener('storage', handleStorage);

    // Cross-window synchronization via postMessage (e.g. from auth popup)
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OCTAVIA_AUTH_CALLBACK' && event.data.session) {
        notifySubscribers(event.data.session);
      }
    };
    window.addEventListener('message', handleWindowMessage);

    return () => {
      mountedRef.current = false;
      authSubscribers.delete(subscriber);
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('message', handleWindowMessage);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, []);

  const value: UserSession = {
    session,
    user,
    loading,
    authError,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
