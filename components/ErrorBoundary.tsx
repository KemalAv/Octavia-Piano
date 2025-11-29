import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You could also log error messages to an error reporting service here
  }

  private handleReturnToMainMenu = () => {
    // Reload the page to reset the application state and return to the main menu
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="fixed inset-0 bg-red-950 bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full ring-2 ring-red-500">
            <h1 className="text-5xl font-extrabold text-red-400 mb-4 animate-bounce">Oops!</h1>
            <p className="text-xl text-slate-200 mb-6">
              An unexpected error occurred.
            </p>
            <p className="text-lg text-red-200 mb-8 italic">
              "Opps, theres bug that if you change screen size etc it will be error because dev very lazy to fix it."
            </p>
            <button
              onClick={this.handleReturnToMainMenu}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-opacity-50 shadow-lg"
              aria-label="Return to Main Menu"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
