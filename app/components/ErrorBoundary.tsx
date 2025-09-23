"use client";

import React from "react";
import { isClientDevEnvironment } from "@/app/lib/urlUtils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    const errorMessage = `Error: ${error?.message}\nStack: ${error?.stack}\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errorMessage).then(() => {
      alert("Error message copied to clipboard!");
    });
  };

  render() {
    if (this.state.hasError) {
      const isLocalhost = isClientDevEnvironment();

      if (isLocalhost) {
        // Let Next.js handle the error in development
        throw this.state.error;
      }

      const { error, errorInfo } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try again later.
            </p>

            <div className="mb-4">
              <pre className="bg-gray-100 p-3 rounded text-sm text-gray-800 overflow-auto">
                {error?.toString()}
                {"\n"}
                {errorInfo?.componentStack}
              </pre>
            </div>

            <button
              onClick={this.copyErrorToClipboard}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors mb-4"
            >
              Copy Error Message
            </button>

            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
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
