import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const fetchUserInfo = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      
      // First try to get user status (works for both approved and pending users)
      const statusRes = await fetch(`${API_BASE}/user/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statusRes.ok) {
        const userData = await statusRes.json();
        setUserInfo(userData);
        setBackendAvailable(true);
        
        // If user is approved, also fetch full dashboard data
        if (userData.is_approved) {
          try {
            const dashboardRes = await fetch(`${API_BASE}/user/dashboard`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (dashboardRes.ok) {
              const dashboardData = await dashboardRes.json();
              // Merge dashboard data with user data
              setUserInfo({ ...userData, ...dashboardData });
            }
          } catch (dashboardError) {
            console.warn('Failed to fetch dashboard data:', dashboardError);
            // Dashboard fetch failed, but we still have basic user info
          }
        }
        
        return userData;
      } else {
        console.warn('Backend returned error:', statusRes.status, statusRes.statusText);
        setBackendAvailable(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      setBackendAvailable(false);
      setUserInfo(null);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('firebase_token', token);
        await fetchUserInfo(firebaseUser);
      } else {
        localStorage.removeItem('firebase_token');
        setUserInfo(null);
        setBackendAvailable(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserInfo(null);
    localStorage.removeItem('firebase_token');
  };

  const refreshUserInfo = async () => {
    if (user) {
      await fetchUserInfo(user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userInfo, 
      loading, 
      logout, 
      refreshUserInfo,
      backendAvailable
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 