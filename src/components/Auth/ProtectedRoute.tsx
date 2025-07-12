
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const currentUser = getCurrentUser();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login/student" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
