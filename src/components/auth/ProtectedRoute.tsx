import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'merchant_admin' | 'platform_admin' | 'staff';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/merchant/login',
}) => {
  const { authUser, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center animate-pulse shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium animate-pulse">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check specific role requirement
  if (requiredRole && authUser.role !== requiredRole) {
    // platform_admin can access merchant routes too
    if (requiredRole === 'merchant_admin' && authUser.role === 'platform_admin') {
      return <>{children}</>;
    }
    // Wrong role — redirect appropriately
    if (authUser.role === 'platform_admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/merchant" replace />;
  }

  return <>{children}</>;
};
