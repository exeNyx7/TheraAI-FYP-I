/**
 * Protected Route Component
 * Handles authentication-based route protection
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from './Loading/Loading';

// Loading component
const LoadingScreen = ({ message = "Checking authentication..." }) => (
  <Loading fullScreen={true} message={message} size="large" />
);

/**
 * ProtectedRoute - Protects routes that require authentication
 */
export function ProtectedRoute({ children, roles = null }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (roles && user) {
    const hasRequiredRole = Array.isArray(roles) 
      ? roles.includes(user.role)
      : user.role === roles;
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

/**
 * PublicRoute - Protects routes that should only be accessible when not authenticated
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
}

/**
 * RoleBasedRoute - Route component that renders different content based on user role
 */
export function RoleBasedRoute({ patientComponent, psychiatristComponent, adminComponent, fallbackComponent = null }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'patient':
      return patientComponent || fallbackComponent || <div>Access Denied</div>;
    case 'psychiatrist':
      return psychiatristComponent || fallbackComponent || <div>Access Denied</div>;
    case 'admin':
      return adminComponent || fallbackComponent || <div>Access Denied</div>;
    default:
      return fallbackComponent || <div>Invalid Role</div>;
  }
}

export default ProtectedRoute;