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
      const res = await fetch(`${API_BASE}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
        setBackendAvailable(true);
        return data;
      } else {
        console.warn('Backend returned error:', res.status, res.statusText);
        setBackendAvailable(false);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      setBackendAvailable(false);
      // Create a basic user info object from Firebase user
      const basicUserInfo = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: 'all_users', // Default role
        is_approved: true, // Assume approved for now
        id: firebaseUser.uid
      };
      setUserInfo(basicUserInfo);
      return basicUserInfo;
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