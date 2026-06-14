
import * as React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let isFirestoreError = false;
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center space-y-6 border border-gray-100 dark:border-slate-800">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Oops!</h1>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-left">
              <p className="text-sm font-bold text-red-600 dark:text-red-400 break-words">
                {errorMessage}
              </p>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {isFirestoreError 
                ? "This might be due to missing permissions or a configuration issue. Please contact support if this persists."
                : "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
