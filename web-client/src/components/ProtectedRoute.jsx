import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [], fallbackPath = '/dashboard' }) => {
  const { user, userInfo, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // If no specific roles are required, allow access
  if (allowedRoles.length === 0) {
    return children;
  }
  
  // Check if user has required role
  const userRole = userInfo?.role?.name || userInfo?.role;
  const userRoleId = userInfo?.role_id;
  
  // Check both role name and role_id
  const hasAccess = allowedRoles.some(role => {
    if (typeof role === 'string') {
      return userRole === role || userRole?.toLowerCase() === role.toLowerCase();
    } else if (typeof role === 'number') {
      return userRoleId === role;
    }
    return false;
  });
  
  if (!hasAccess) {
    console.log('Access denied:', {
      userRole,
      userRoleId,
      allowedRoles,
      fallbackPath
    });
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
};

export default ProtectedRoute;
