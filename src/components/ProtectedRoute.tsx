import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccessControl } from '../contexts/AccessControlContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  userRole: UserRole;
  menuId: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, userRole, menuId }) => {
  const { canAccess, loading } = useAccessControl();

  if (loading) return <div>Loading...</div>;

  if (!canAccess(userRole, menuId)) {
    // Redirect to a 403 or Dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
