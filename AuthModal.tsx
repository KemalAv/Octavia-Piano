import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowDetailMode?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { session, user, authError, clearAuthError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (authError) {
      setErrorMessage(authError);
    }
  }, [authError]);

  // Tutup modal otomatis jika sudah login
  useEffect(() => {
    if (isOpen && (session || user)) {
      setLoading(false);
      const timer = setTimeout(() => {
        onClose();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, session, user, onClose]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (clearAuthError) clearAuthError();
    setErrorMessage(null);
    setLoading(true);

    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://octaviapiano.com';

      // Panggil signInWithOAuth agar Supabase menyimpan PKCE code_verifier di localStorage
      // dan menyertakan prompt=select_account agar pengguna dapat memilih akun Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        if (isInIframe) {
          // Buka di tab baru jika dalam iframe agar tidak diblokir X-Frame-Options oleh Google
          const newWindow = window.open(data.url, '_blank');
          if (!newWindow) {
            window.location.href = data.url;
          }
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error('Failed to get the sign-in link from Supabase.');
      }
    } catch (err: any) {
      console.error('[Auth] Error signing in with Google:', err);
      setErrorMessage(err?.message || 'Failed to start Google sign-in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-sm bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl p-6 text-center text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup Silang */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold mb-2">Sign In</h2>
        <p className="text-sm text-slate-400 mb-6">
          Choose your Google account to save scores and your player profile.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-rose-950/70 border border-rose-500/50 text-rose-200 text-left">
            {errorMessage}
          </div>
        )}

        {/* 1 TOMBOL LANGSUNG LOGIN */}
        <button
          id="btn-google-login"
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-75 text-slate-900 font-bold py-3.5 px-4 rounded-xl text-base shadow-lg transition-all duration-150 transform active:scale-95 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-600 rounded-full animate-spin flex-shrink-0" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          )}
          <span>{loading ? 'Opening Google...' : 'Sign in with Google'}</span>
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
