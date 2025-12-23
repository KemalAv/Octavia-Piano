import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode; // Made optional to fix 'missing in type {}' error in strict mode
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRendered: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state property for TypeScript
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    isRendered: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.handleReturnToMainMenu = this.handleReturnToMainMenu.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
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
      // Fallback UI
      return (
        <div className={`fixed inset-0 bg-red-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${this.state.isRendered ? 'bg-opacity-90' : 'bg-opacity-0'}`}>
          <div className={`bg-slate-800 p-8 md:p-12 rounded-xl shadow-2xl text-center max-w-lg w-full ring-2 ring-red-500 transform transition-all duration-300 ease-in-out ${this.state.isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <h1 className="text-5xl font-extrabold text-red-400 mb-4 animate-bounce">Oops!</h1>
            <p className="text-xl text-slate-200 mb-6">
              An unexpected error occurred.
            </p>
            <p className="text-lg text-red-200 mb-8 italic">
              "Oops, there's a bug because the dev is too lazy to fix it." 
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