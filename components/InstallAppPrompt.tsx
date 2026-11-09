import React, { useState, useEffect } from 'react';
import { AppLanguage } from '../types';
import { translations } from '../translations';

interface InstallAppPromptProps {
  appLanguage?: AppLanguage;
}

export const InstallAppPrompt: React.FC<InstallAppPromptProps> = ({ appLanguage = 'id' }) => {
  const t = translations[appLanguage] || translations.id;
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode or saved in localStorage
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true);

    const isMarkedInstalled = typeof localStorage !== 'undefined' && localStorage.getItem('octavia_app_installed') === 'true';

    if (isStandalone || isMarkedInstalled) {
      setIsInstalled(true);
      return;
    }

    // Check with browser API if PWA is already installed on the system (Chrome / Edge / Android)
    if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          setIsInstalled(true);
          setIsVisible(false);
          try {
            localStorage.setItem('octavia_app_installed', 'true');
          } catch {}
        }
      }).catch(() => {});
    }

    // 2. Check if dismissed in this browser session or persistently
    const isDismissed =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('octavia_install_dismissed') === 'true') ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('octavia_install_dismissed') === 'true');

    if (isDismissed) {
      return;
    }

    // 3. Detect iOS device
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 4. Capture native beforeinstallprompt event for Android Chrome, Edge, Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt if app is not marked installed and not dismissed
      const currentlyInstalled = localStorage.getItem('octavia_app_installed') === 'true';
      const currentlyDismissed = sessionStorage.getItem('octavia_install_dismissed') === 'true';
      if (!currentlyInstalled && !currentlyDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Detect app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('octavia_app_installed', 'true');
      } catch {}
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Only for iOS Safari (which doesn't support beforeinstallprompt), show manual guide gently
    let timer: any = null;
    if (isIosDevice && !isDismissed) {
      timer = setTimeout(() => {
        const stillInstalled = localStorage.getItem('octavia_app_installed') === 'true';
        if (!stillInstalled) {
          setIsVisible(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide((prev) => !prev);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsVisible(false);
          setIsInstalled(true);
          setDeferredPrompt(null);
          try {
            localStorage.setItem('octavia_app_installed', 'true');
          } catch {}
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // Fallback: If beforeinstallprompt hasn't fired or is unavailable, show browser menu guidance
      setShowIosGuide((prev) => !prev);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('octavia_install_dismissed', 'true');
      localStorage.setItem('octavia_install_dismissed', 'true');
    } catch {}
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-label={t.installAppTitle}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999] pointer-events-auto select-none animate-fadeIn transition-all duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 p-4 shadow-[0_10px_35px_rgba(6,182,212,0.3)] ring-1 ring-white/10">
        {/* Glow ambient accent */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
          title={t.installAppLater}
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content Header */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="relative flex-shrink-0">
            <img
              src="/logo.png"
              alt="Octavia Logo"
              className="w-12 h-12 rounded-xl object-contain bg-slate-950 p-1 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.4)]"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide truncate">
                {t.installAppTitle}
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                PWA
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {t.installAppDesc}
            </p>
          </div>
        </div>

        {/* iOS / Fallback Guide */}
        {showIosGuide && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-xs text-cyan-200 flex flex-col gap-1.5 animate-fadeIn">
            {isIOS ? (
              <>
                <div className="flex items-center gap-2 font-semibold text-cyan-300">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{t.installAppIosTitle}</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                  <li>{t.installAppIosStep1}</li>
                  <li>{t.installAppIosStep2}</li>
                </ol>
              </>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span>{t.installAppBrowserGuide}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t.installAppBtn}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium text-xs transition-colors"
          >
            {t.installAppLater}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppPrompt;

