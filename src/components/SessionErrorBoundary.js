import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const SessionErrorBoundary = ({ error, onRetry, onSignOut }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      // Clear local storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Session Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            There was a problem with your session. This usually happens when:
          </p>
          <ul className="mt-4 text-sm text-gray-600 text-left space-y-1">
            <li>• Your session has expired</li>
            <li>• You've been inactive for too long</li>
            <li>• There's a network connectivity issue</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">
              <strong>Error Details:</strong> {error}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign Out and Start Fresh
          </button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            If this problem persists, try clearing your browser cache or using incognito mode.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionErrorBoundary;
