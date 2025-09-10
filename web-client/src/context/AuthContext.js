import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const heartbeatIntervalRef = useRef(null);

  const sendHeartbeat = async () => {
    if (!user || !userInfo?.is_approved) {
      console.log('Heartbeat skipped:', { 
        user: !!user, 
        userInfo: !!userInfo, 
        isApproved: userInfo?.is_approved,
        userEmail: userInfo?.email 
      });
      return;
    }
    
    try {
      const token = await user.getIdToken();
      console.log('Sending heartbeat for user:', userInfo.email);
      
      const response = await fetch(`${API_BASE}/user/ping`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Heartbeat sent successfully:', data);
      } else {
        console.warn('Heartbeat failed with status:', response.status);
        const errorText = await response.text();
        console.warn('Heartbeat error:', errorText);
      }
    } catch (error) {
      console.warn('Heartbeat failed:', error);
    }
  };

  const startHeartbeat = () => {
    console.log('Starting heartbeat for user:', userInfo?.email);
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Send heartbeat every 2 minutes
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 2 * 60 * 1000);
    
    // Send initial heartbeat immediately
    sendHeartbeat();
  };

  const stopHeartbeat = () => {
    console.log('Stopping heartbeat');
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const fetchUserInfo = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      console.log('Fetching user info for:', firebaseUser.email);
      
      // First try to get user status (works for both approved and pending users)
      const statusRes = await fetch(`${API_BASE}/user/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statusRes.ok) {
        const userData = await statusRes.json();
        console.log('User status received:', userData);
        console.log('User role:', userData.role);
        console.log('User role type:', typeof userData.role);
        setUserInfo(userData);
        setBackendAvailable(true);
        
        // If user is approved, also fetch full user data
        if (userData.is_approved) {
          console.log('User is approved, fetching full user data...');
          try {
            const userRes = await fetch(`${API_BASE}/user/me`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) {
              const fullUserData = await userRes.json();
              console.log('Full user data received:', fullUserData);
              // Merge full user data with status data
              setUserInfo({ ...userData, ...fullUserData });
            }
          } catch (userError) {
            console.warn('Failed to fetch full user data:', userError);
            // User fetch failed, but we still have basic user info
          }
        } else {
          console.log('User is not approved yet');
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

  // Set user online in backend
  const setUserOnline = async (firebaseUser) => {
    try {
      // Force refresh the token to get a fresh one
      const token = await firebaseUser.getIdToken(true);
      const response = await fetch(`${API_BASE}/user/online`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.warn('Failed to set user online:', response.status, response.statusText);
        return;
      }
      
      console.log('User set as online in backend');
    } catch (err) {
      console.warn('Failed to set user online:', err);
    }
  };

  // Set user offline in backend
  const setUserOffline = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      await fetch(`${API_BASE}/user/offline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('User set as offline in backend');
    } catch (err) {
      console.warn('Failed to set user offline:', err);
    }
  };

  // Effect to handle heartbeat and online status when userInfo changes
  useEffect(() => {
    if (user && userInfo?.is_approved) {
      console.log('User is approved, starting heartbeat for:', userInfo.email);
      setUserOnline(user); // Set online in backend
      startHeartbeat();
    } else {
      console.log('User not approved or logged out, stopping heartbeat');
      stopHeartbeat();
    }
  }, [user, userInfo?.is_approved]);

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
        stopHeartbeat();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, []);

  const logout = async () => {
    stopHeartbeat();
    if (user) {
      await setUserOffline(user); // Set offline in backend before logout
    }
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

  // Manual heartbeat trigger for testing
  const triggerHeartbeat = async () => {
    console.log('Manual heartbeat trigger called');
    await sendHeartbeat();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userInfo, 
      loading, 
      logout, 
      refreshUserInfo,
      backendAvailable,
      triggerHeartbeat // Expose for testing
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 