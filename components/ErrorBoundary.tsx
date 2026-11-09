import React, { ErrorInfo, ReactNode } from 'react';
import { AppLanguage } from '../types';
import { translations } from '../translations';

interface ErrorBoundaryProps {
  children?: ReactNode; // Made optional to fix 'missing in type {}' error in strict mode
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRendered: boolean;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRendered: false,
    };
    this.handleReturnToMainMenu = this.handleReturnToMainMenu.bind(this);
  }

  // Update state so the next render will show the fallback UI.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, isRendered: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You could also log error messages to an error reporting service here
  }
  
  componentDidUpdate(_: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    if (this.state.hasError && !prevState.hasError) {
        setTimeout(() => this.setState({ isRendered: true }), 10);
    }
  }

  handleReturnToMainMenu() {
    // Reload the page to reset the application state and return to the main menu
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const savedLang = typeof localStorage !== 'undefined' ? (localStorage.getItem('octavia_language') as AppLanguage) : null;
      const lang: AppLanguage = savedLang === 'en' || savedLang === 'es' || savedLang === 'id' ? savedLang : 'id';
      const t = translations[lang] || translations.id;

      // Fallback UI
      return (
        <div className={`fixed inset-0 bg-red-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${this.state.isRendered ? 'bg-opacity-90' : 'bg-opacity-0'}`}>
          <div className={`bg-slate-800 p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full ring-2 ring-red-500 transform transition-all duration-300 ease-in-out ${this.state.isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <h1 className="text-5xl font-extrabold text-red-400 mb-4 animate-bounce">{t.errorBoundaryTitle}</h1>
            <p className="text-xl text-slate-200 mb-6">
              {t.errorBoundaryDesc}
            </p>
            {this.state.error && (
              <div className="bg-slate-900 border border-red-500/50 p-4 rounded-lg text-left text-xs font-mono text-red-300 mb-6 max-h-48 overflow-auto whitespace-pre-wrap select-text">
                <div className="font-bold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</div>
                <div className="text-slate-400 text-[10px]">{this.state.error.stack}</div>
              </div>
            )}
            <p className="text-base text-red-200 mb-8 italic">
              "{t.errorBoundaryQuote}"
            </p>
            <button
              onClick={this.handleReturnToMainMenu}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 shadow-lg"
              aria-label={t.errorBoundaryReturnBtn}
            >
              {t.errorBoundaryReturnBtn}
            </button>
          </div>
        </div>
      );
    }

    // Explicitly returning this.props.children which is inherited from Component
    return this.props.children;
  }
}

export default ErrorBoundary;