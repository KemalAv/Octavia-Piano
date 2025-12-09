import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
    // On success, Supabase redirects. If it doesn't redirect (e.g., popup flow), 
    // the onAuthStateChange listener will handle closing the modal.
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${isRendered ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`bg-slate-800/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl text-center max-w-md w-full ring-1 ring-slate-700 transform transition-all duration-300 ease-in-out ${isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <h2 id="auth-modal-title" className="text-3xl font-bold text-cyan-400 mb-6">
          Login / Sign Up
        </h2>

        {message && message.text && (
          <div
            className={`p-3 mb-4 rounded-lg text-sm ${
              message.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
            }`}
            role={message.type === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </div>
        )}

        <p className="text-slate-300 mb-6">
          Continue with your Google account to save scores and participate in leaderboards.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-opacity-50 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default AuthModal;