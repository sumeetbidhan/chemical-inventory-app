import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import styles from './LoginPage.module.scss';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebase_token', token);
      
      // Step 2: Check user status with backend
      const response = await fetch(`${API_BASE}/user/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }
      
      const userData = await response.json();
      console.log('Login successful:', userData);
      
      // Check if user is approved
      if (userData.is_approved) {
        // User is approved, navigate to dashboard
        navigate('/dashboard');
      } else {
        // User needs approval
        setError('Your account is pending admin approval. Please wait for approval before accessing the system.');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.headerBar}>
        <div className={styles.branding}>
          <img src="/company_icon.png" alt="Company Icon" className={styles.companyIcon} />
          <span className={styles.companyTitle}>Blossoms Aroma</span>
        </div>
        <button onClick={toggleTheme} className={styles.themeBtn} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Moon /> : <Sun />}
        </button>
      </div>
      
      <div className={styles.loginContent}>
        <h2 style={{ color: 'var(--primary-text)' }}>Chemical Inventory Login</h2>
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
            placeholder="Enter your email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={styles.input}
            placeholder="Enter your password"
            required
          />
          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        {error && <div className={styles.errorMsg}>{error}</div>}
        
        <div className={styles.registerLink}>
          <p>Don't have an account? <button onClick={() => navigate('/register')} className={styles.linkButton}>Register here</button></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 