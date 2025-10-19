import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute: Current state:', { user: !!user, loading });

  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal isOpen={true} onClose={() => {}} />;
  }

  return children;
};

export default ProtectedRoute;
