import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { Alert, AppState } from 'react-native';

const API_BASE = 'http://192.168.1.12:8000';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [firebaseToken, setFirebaseToken] = useState(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState(null);

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
        setUserInfo(userData);
        setBackendAvailable(true);
        
        // If user is approved, also fetch full dashboard data
        if (userData.is_approved) {
          console.log('User is approved, fetching dashboard data...');
          try {
            const dashboardRes = await fetch(`${API_BASE}/user/dashboard`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (dashboardRes.ok) {
              const dashboardData = await dashboardRes.json();
              console.log('Dashboard data received:', dashboardData);
              // Merge dashboard data with user data
              setUserInfo({ ...userData, ...dashboardData });
            }
          } catch (dashboardError) {
            console.warn('Failed to fetch dashboard data:', dashboardError);
            // Dashboard fetch failed, but we still have basic user info
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
      const token = await firebaseUser.getIdToken();
      await fetch(`${API_BASE}/user/online`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('User set as online in backend');
    } catch (err) {
      console.warn('Failed to set user online:', err);
    }
  };

  // Heartbeat function to keep user online
  const sendHeartbeat = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      await fetch(`${API_BASE}/user/ping`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Heartbeat sent');
    } catch (err) {
      console.warn('Failed to send heartbeat:', err);
    }
  };

  // Start heartbeat interval
  const startHeartbeat = (firebaseUser) => {
    // Clear any existing interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Send initial heartbeat
    sendHeartbeat(firebaseUser);
    
    // Set up periodic heartbeat (every 30 seconds)
    const interval = setInterval(() => {
      sendHeartbeat(firebaseUser);
    }, 30000); // 30 seconds
    
    setHeartbeatInterval(interval);
    console.log('Heartbeat started');
  };

  // Stop heartbeat interval
  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      setHeartbeatInterval(null);
      console.log('Heartbeat stopped');
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      setUser(firebaseUser);
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setFirebaseToken(token);
        const userData = await fetchUserInfo(firebaseUser);
        if (userData?.is_approved) {
          await setUserOnline(firebaseUser);
          startHeartbeat(firebaseUser);
        }
      } else {
        stopHeartbeat();
        setFirebaseToken(null);
        setUserInfo(null);
        setBackendAvailable(true);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && user && userInfo?.is_approved) {
        // App came to foreground, restart heartbeat
        console.log('App came to foreground, restarting heartbeat');
        startHeartbeat(user);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background, stop heartbeat
        console.log('App went to background, stopping heartbeat');
        stopHeartbeat();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user, userInfo]);

  // Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, []);

  // Email/password login
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      setFirebaseToken(token);
      return { success: true, user: userCredential.user };
    } catch (err) {
      Alert.alert('Login Error', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Phone/OTP login (placeholder, as RecaptchaVerifier is not supported in Expo Go)
  const loginWithPhone = async (phone, appVerifier) => {
    setLoading(true);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);
      return confirmationResult;
    } catch (err) {
      Alert.alert('OTP Error', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    stopHeartbeat(); // Stop heartbeat before logout
    if (user) {
      await setUserOffline(user); // Set offline in backend before logout
    }
    await signOut(auth);
    setUser(null);
    setUserInfo(null);
    setFirebaseToken(null);
  };

  const refreshUserInfo = async () => {
    if (user) {
      await fetchUserInfo(user);
    }
  };

  const value = {
    user,
    userInfo,
    loading,
    firebaseToken,
    backendAvailable,
    loginWithEmail,
    loginWithPhone,
    logout,
    refreshUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 