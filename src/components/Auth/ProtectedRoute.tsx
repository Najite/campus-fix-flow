import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, redirect to appropriate login page
  if (!user) {
    const roleFromPath = location.pathname.split('/')[1]; // Extract role from path like '/student'
    const loginPath = ['student', 'admin', 'maintenance'].includes(roleFromPath) 
      ? `/login/${roleFromPath}` 
      : '/login/student';
    
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If user is authenticated but profile is still loading, show loading
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Check if user has the required role
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their appropriate dashboard based on their actual role
    return <Navigate to={`/${profile.role}`} replace />;
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;